import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import {
	Box,
	Card,
	CardContent,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	TextField,
	Button,
	Checkbox,
	FormControlLabel,
	LinearProgress,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasEjeService, CausaEje, WorkerStatsResponse, EligibilityStatsResponse } from "api/causasEje";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, TickCircle, CloseSquare, Lock1, Repeat } from "iconsax-react";
import CausaDetalleModalEje from "./CausaDetalleModalEje";

// Helper para formatear fechas
const formatDate = (date: { $date: string } | string | undefined): string => {
	if (!date) return "N/A";
	const dateStr = typeof date === "string" ? date : date.$date;
	const d = new Date(dateStr);
	return d.toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Helper para formatear montos
const formatMonto = (monto: number | undefined, moneda: string = "ARS"): string => {
	if (!monto) return "N/A";
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: moneda,
	}).format(monto);
};

// Helper para obtener fecha en Argentina (UTC-3)
const getArgentinaDate = (): string => {
	const now = new Date();
	const argentinaOffset = -3 * 60;
	const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
	const argentinaMinutes = utcMinutes + argentinaOffset;
	let dayOffset = 0;
	if (argentinaMinutes < 0) {
		dayOffset = -1;
	} else if (argentinaMinutes >= 24 * 60) {
		dayOffset = 1;
	}
	const argentinaDate = new Date(now);
	argentinaDate.setUTCDate(argentinaDate.getUTCDate() + dayOffset);
	const year = argentinaDate.getUTCFullYear();
	const month = String(argentinaDate.getUTCMonth() + 1).padStart(2, "0");
	const day = String(argentinaDate.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

// Helper para obtener información de actualización del día
const getTodayUpdateInfo = (causa: CausaEje): { isToday: boolean; count: number; hours: number[] } => {
	const stats = causa.updateStats?.today;
	if (!stats || !stats.date) {
		return { isToday: false, count: 0, hours: [] };
	}
	const today = getArgentinaDate();
	const isToday = stats.date === today;
	return {
		isToday,
		count: isToday ? (stats.count || 0) : 0,
		hours: isToday ? (stats.hours || []) : [],
	};
};

// Helper para formatear tooltip de horas
const formatHoursTooltip = (hours: number[]): string => {
	if (hours.length === 0) return "";
	const sortedHours = [...hours].sort((a, b) => a - b);
	const formatted = sortedHours.map((h) => `${h.toString().padStart(2, "0")}:00`);
	return `Actualizado a las ${formatted.join(", ")}`;
};

// Helper para extraer ID
const getId = (id: string | { $oid: string }): string => {
	return typeof id === "string" ? id : id.$oid;
};

const CarpetasVerificadasEje = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [causas, setCausas] = useState<CausaEje[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);
	const [totalInDatabase, setTotalInDatabase] = useState(0);

	// Filtros
	const [privadaFilter, setPrivadaFilter] = useState<string>("todos");
	const [sourceFilter, setSourceFilter] = useState<string>("todos");
	const [updateFilter, setUpdateFilter] = useState<string>("todos");
	const [detailsLoadedFilter, setDetailsLoadedFilter] = useState<string>("todos");

	// Filtros de búsqueda
	const [searchNumero, setSearchNumero] = useState<string>("");
	const [searchAnio, setSearchAnio] = useState<string>("");
	const [searchCuij, setSearchCuij] = useState<string>("");
	const [searchCaratula, setSearchCaratula] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("anio");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Estadísticas de workers
	const [workerStats, setWorkerStats] = useState<WorkerStatsResponse["data"] | null>(null);
	const [loadingStats, setLoadingStats] = useState(false);

	// Estadísticas de elegibilidad
	const [eligibilityStats, setEligibilityStats] = useState<EligibilityStatsResponse["data"] | null>(null);
	const [loadingEligibility, setLoadingEligibility] = useState(false);

	// Filtros de elegibilidad
	const [soloElegibles, setSoloElegibles] = useState(false);
	const [estadoActualizacion, setEstadoActualizacion] = useState<string>("todos");

	// Modal de detalles
	const [selectedCausa, setSelectedCausa] = useState<CausaEje | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Cargar causas verificadas
	const fetchCausas = async (
		currentPage: number,
		limit: number,
		numero?: string,
		anio?: string,
		cuij?: string,
		caratula?: string,
		sortByParam?: string,
		sortOrderParam?: "asc" | "desc",
		isPrivate?: string,
		update?: string,
		source?: string,
		detailsLoaded?: string,
	) => {
		try {
			setLoading(true);

			const params: any = {
				page: currentPage + 1,
				limit,
			};

			if (numero && numero.trim() !== "") {
				params.numero = parseInt(numero);
			}

			if (anio && anio.trim() !== "") {
				params.anio = parseInt(anio);
			}

			if (cuij && cuij.trim() !== "") {
				params.cuij = cuij.trim();
			}

			if (caratula && caratula.trim() !== "") {
				params.caratula = caratula.trim();
			}

			if (sortByParam) {
				params.sortBy = sortByParam;
			}

			if (sortOrderParam) {
				params.sortOrder = sortOrderParam;
			}

			// Filtros booleanos
			if (isPrivate !== "todos") {
				params.isPrivate = isPrivate === "true";
			}

			if (update !== "todos") {
				params.update = update === "true";
			}

			if (source !== "todos") {
				params.source = source;
			}

			if (detailsLoaded !== "todos") {
				params.detailsLoaded = detailsLoaded === "true";
			}

			console.log("Params enviados a API:", params);

			const response = await CausasEjeService.getVerifiedCausas(params);

			if (response.success) {
				setCausas(Array.isArray(response.data) ? response.data : [response.data]);
				setTotalCount(response.count || 0);
				setTotalInDatabase(response.totalInDatabase || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas verificadas EJE", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Cargar estadísticas de workers
	const fetchWorkerStats = async () => {
		try {
			setLoadingStats(true);
			const response = await CausasEjeService.getWorkerStats();
			if (response.success) {
				setWorkerStats(response.data);
			}
		} catch (error) {
			console.error("Error al cargar estadísticas:", error);
		} finally {
			setLoadingStats(false);
		}
	};

	// Cargar estadísticas de elegibilidad
	const fetchEligibilityStats = async () => {
		try {
			setLoadingEligibility(true);
			const response = await CausasEjeService.getEligibilityStats();
			if (response.success) {
				setEligibilityStats(response.data);
			}
		} catch (error) {
			console.error("Error al cargar estadísticas de elegibilidad:", error);
		} finally {
			setLoadingEligibility(false);
		}
	};

	// Efecto inicial
	useEffect(() => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, privadaFilter, updateFilter, sourceFilter, detailsLoadedFilter);
		fetchWorkerStats();
		fetchEligibilityStats();
	}, []);

	// Efecto para cambios de filtros que disparan fetch automático
	useEffect(() => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, privadaFilter, updateFilter, sourceFilter, detailsLoadedFilter);
	}, [page, rowsPerPage, sortBy, sortOrder, privadaFilter, updateFilter, sourceFilter, detailsLoadedFilter]);

	// Handlers
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSortChange = (event: any) => {
		setSortBy(event.target.value);
		setPage(0);
	};

	const handleSortOrderChange = () => {
		setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		setPage(0);
	};

	const handleSearch = () => {
		setPage(0);
		fetchCausas(0, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, privadaFilter, updateFilter, sourceFilter, detailsLoadedFilter);
	};

	const handleClearSearch = () => {
		setSearchNumero("");
		setSearchAnio("");
		setSearchCuij("");
		setSearchCaratula("");
		setPrivadaFilter("todos");
		setUpdateFilter("todos");
		setSourceFilter("todos");
		setDetailsLoadedFilter("todos");
		setPage(0);
		fetchCausas(0, rowsPerPage, "", "", "", "", sortBy, sortOrder, "todos", "todos", "todos", "todos");
	};

	const handleRefresh = () => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, privadaFilter, updateFilter, sourceFilter, detailsLoadedFilter);
		fetchWorkerStats();
		fetchEligibilityStats();
	};

	// Handler para checkbox "Solo elegibles"
	const handleSoloElegiblesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const checked = event.target.checked;
		setSoloElegibles(checked);
		if (checked) {
			// Cuando se activa, forzar filtros de elegibilidad
			setUpdateFilter("true");
			setPrivadaFilter("false");
		} else {
			// Cuando se desactiva, restaurar filtros a "todos"
			setUpdateFilter("todos");
			setPrivadaFilter("todos");
			setEstadoActualizacion("todos");
		}
		setPage(0);
	};

	// Handler para select de estado de actualización
	const handleEstadoActualizacionChange = (event: any) => {
		setEstadoActualizacion(event.target.value);
		setPage(0);
	};

	// Handler para ver detalles
	const handleVerDetalles = async (causa: CausaEje) => {
		try {
			setLoadingDetail(true);
			const causaId = getId(causa._id);

			const response = await CausasEjeService.getCausaById(causaId);

			if (response.success && response.data) {
				const causaCompleta = Array.isArray(response.data) ? response.data[0] : response.data;
				setSelectedCausa(causaCompleta);
				setDetailModalOpen(true);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar los detalles de la causa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleCloseModal = () => {
		setDetailModalOpen(false);
		setSelectedCausa(null);
	};

	return (
		<MainCard title="Carpetas Verificadas EJE (App)">
			{/* Header: Resultados + Estadísticas */}
			<Box sx={{ mb: 2 }}>
				<Grid container spacing={2} alignItems="center">
					{/* Resultados */}
					<Grid item xs={12} md={4}>
						<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
							<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="body2" color="text.secondary">
										Resultados
									</Typography>
									<Typography variant="h4" color="primary.main" fontWeight="bold">
										{totalCount.toLocaleString()}
										<Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
											/ {totalInDatabase.toLocaleString()}
										</Typography>
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>

					{/* Estadísticas de Workers */}
					<Grid item xs={12} md={8}>
						<Card sx={{ border: 1, borderColor: "divider" }}>
							<CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
								{loadingStats ? (
									<Box display="flex" justifyContent="center" py={1}>
										<CircularProgress size={20} />
									</Box>
								) : workerStats ? (
									<Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
										<Tooltip title="Verificación completada">
											<Chip
												icon={<TickCircle size={14} variant="Bold" />}
												label={`${workerStats.verification.rate}% verificados`}
												size="small"
												color="success"
												sx={{ height: 24 }}
											/>
										</Tooltip>
										<Tooltip title="Detalles cargados">
											<Chip
												icon={<TickCircle size={14} variant="Bold" />}
												label={`${workerStats.details.rate}% con detalles`}
												size="small"
												color="info"
												sx={{ height: 24 }}
											/>
										</Tooltip>
										<Tooltip title="Expedientes privados">
											<Chip
												icon={<Lock1 size={14} />}
												label={`${workerStats.status.private} privados`}
												size="small"
												color="warning"
												sx={{ height: 24 }}
											/>
										</Tooltip>
										<Tooltip title="Con errores">
											<Chip
												icon={<CloseSquare size={14} variant="Bold" />}
												label={`${workerStats.errors.total} errores`}
												size="small"
												color="error"
												sx={{ height: 24 }}
											/>
										</Tooltip>
										<Chip
											label={`${workerStats.total} total`}
											size="small"
											variant="outlined"
											sx={{ height: 24 }}
										/>
									</Stack>
								) : (
									<Typography variant="caption" color="text.secondary" textAlign="center">
										Error cargando estadísticas
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</Box>

			<Grid container spacing={3}>
				{/* Filtros principales */}
				<Grid item xs={12}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Número"
								value={searchNumero}
								onChange={(e) => setSearchNumero(e.target.value)}
								size="small"
								placeholder="Ej: 15050"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Año"
								value={searchAnio}
								onChange={(e) => setSearchAnio(e.target.value)}
								size="small"
								placeholder="Ej: 2021"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={3}>
							<TextField
								fullWidth
								label="CUIJ"
								value={searchCuij}
								onChange={(e) => setSearchCuij(e.target.value)}
								size="small"
								placeholder="Ej: J-01-00015050-5/2021-0"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={5}>
							<TextField
								fullWidth
								label="Carátula"
								value={searchCaratula}
								onChange={(e) => setSearchCaratula(e.target.value)}
								size="small"
								placeholder="Buscar en carátula..."
							/>
						</Grid>
					</Grid>
				</Grid>

				{/* Filtros secundarios */}
				<Grid item xs={12}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Privado</InputLabel>
								<Select
									value={privadaFilter}
									onChange={(e) => {
										setPrivadaFilter(e.target.value);
										setPage(0);
									}}
									label="Privado"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Sí</MenuItem>
									<MenuItem value="false">No</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Actualizable</InputLabel>
								<Select
									value={updateFilter}
									onChange={(e) => {
										setUpdateFilter(e.target.value);
										setPage(0);
									}}
									label="Actualizable"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Sí</MenuItem>
									<MenuItem value="false">No</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Source</InputLabel>
								<Select
									value={sourceFilter}
									onChange={(e) => {
										setSourceFilter(e.target.value);
										setPage(0);
									}}
									label="Source"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="app">App</MenuItem>
									<MenuItem value="import">Import</MenuItem>
									<MenuItem value="scraping">Scraping</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Detalles</InputLabel>
								<Select
									value={detailsLoadedFilter}
									onChange={(e) => {
										setDetailsLoadedFilter(e.target.value);
										setPage(0);
									}}
									label="Detalles"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Cargados</MenuItem>
									<MenuItem value="false">Pendientes</MenuItem>
								</Select>
							</FormControl>
						</Grid>
					</Grid>
				</Grid>

				{/* Filtros de elegibilidad y barra de progreso */}
				<Grid item xs={12}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={3} lg={2}>
							<FormControlLabel
								control={
									<Checkbox
										checked={soloElegibles}
										onChange={handleSoloElegiblesChange}
										size="small"
									/>
								}
								label={
									<Typography variant="body2">
										Solo elegibles para actualización
									</Typography>
								}
							/>
						</Grid>
						<Grid item xs={12} md={3} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado Actualización</InputLabel>
								<Select
									value={estadoActualizacion}
									onChange={handleEstadoActualizacionChange}
									label="Estado Actualización"
									disabled={!soloElegibles}
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="actualizados">Actualizados hoy</MenuItem>
									<MenuItem value="pendientes">Pendientes</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						{/* Barra de progreso de elegibilidad */}
						<Grid item xs={12} md={6} lg={8}>
							{loadingEligibility ? (
								<Box display="flex" alignItems="center" gap={1}>
									<CircularProgress size={16} />
									<Typography variant="caption" color="text.secondary">
										Cargando estadísticas...
									</Typography>
								</Box>
							) : eligibilityStats ? (
								<Box>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Repeat size={16} color={theme.palette.info.main} />
											<Typography variant="caption" fontWeight="bold">
												Cobertura de actualización:
											</Typography>
										</Stack>
										<Stack direction="row" spacing={2}>
											<Tooltip title="Documentos elegibles actualizados hoy">
												<Chip
													label={`${eligibilityStats.actualizadosHoy} actualizados`}
													size="small"
													color="success"
													variant="outlined"
													sx={{ height: 20, fontSize: '0.7rem' }}
												/>
											</Tooltip>
											<Tooltip title="Documentos elegibles pendientes de actualizar hoy">
												<Chip
													label={`${eligibilityStats.pendientesHoy} pendientes`}
													size="small"
													color="warning"
													variant="outlined"
													sx={{ height: 20, fontSize: '0.7rem' }}
												/>
											</Tooltip>
											<Tooltip title={`Umbral de actualización: ${eligibilityStats.thresholdHours}h`}>
												<Chip
													label={`${eligibilityStats.totalElegibles} elegibles`}
													size="small"
													variant="outlined"
													sx={{ height: 20, fontSize: '0.7rem' }}
												/>
											</Tooltip>
										</Stack>
									</Stack>
									<Tooltip title={`${eligibilityStats.coveragePercent.toFixed(1)}% de documentos elegibles actualizados hoy`}>
										<LinearProgress
											variant="determinate"
											value={eligibilityStats.coveragePercent}
											sx={{
												height: 8,
												borderRadius: 4,
												backgroundColor: theme.palette.action.hover,
												'& .MuiLinearProgress-bar': {
													borderRadius: 4,
													backgroundColor: eligibilityStats.coveragePercent >= 80
														? theme.palette.success.dark
														: eligibilityStats.coveragePercent >= 50
															? theme.palette.warning.main
															: theme.palette.error.main,
												},
											}}
										/>
									</Tooltip>
									<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
										{eligibilityStats.coveragePercent.toFixed(1)}% cobertura
									</Typography>
								</Box>
							) : (
								<Typography variant="caption" color="text.secondary">
									No hay estadísticas de elegibilidad disponibles
								</Typography>
							)}
						</Grid>
					</Grid>
				</Grid>

				{/* Ordenamiento */}
				<Grid item xs={12}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={4} lg={3}>
							<FormControl fullWidth>
								<InputLabel>Ordenar por</InputLabel>
								<Select value={sortBy} onChange={handleSortChange} label="Ordenar por" size="small">
									<MenuItem value="anio">Año</MenuItem>
									<MenuItem value="numero">Número</MenuItem>
									<MenuItem value="caratula">Carátula</MenuItem>
									<MenuItem value="juzgado">Juzgado</MenuItem>
									<MenuItem value="movimientosCount">Movimientos</MenuItem>
									<MenuItem value="createdAt">Fecha Creación</MenuItem>
									<MenuItem value="lastUpdate">Última Act.</MenuItem>
									<MenuItem value="ultimoMovimiento">Fecha Últ. Mov.</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={2} lg={2}>
							<Button
								fullWidth
								variant="outlined"
								startIcon={sortOrder === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
								onClick={handleSortOrderChange}
								disabled={loading}
								size="small"
							>
								{sortOrder === "asc" ? "Ascendente" : "Descendente"}
							</Button>
						</Grid>
						<Grid item xs={12} md={6} lg={7}>
							<Stack direction="row" spacing={1}>
								<Button variant="contained" startIcon={<SearchNormal1 size={18} />} onClick={handleSearch} disabled={loading} size="small">
									Buscar
								</Button>
								<Button
									variant="outlined"
									startIcon={<CloseCircle size={18} />}
									onClick={handleClearSearch}
									disabled={loading}
									size="small"
								>
									Limpiar
								</Button>
								<Tooltip title="Actualizar">
									<IconButton onClick={handleRefresh} disabled={loading} size="small">
										<Refresh />
									</IconButton>
								</Tooltip>
							</Stack>
						</Grid>
					</Grid>
				</Grid>

				{/* Tabla */}
				<Grid item xs={12}>
					{loading ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
							<CircularProgress />
						</Box>
					) : causas.length === 0 ? (
						<Alert severity="info">No se encontraron carpetas verificadas EJE con los filtros seleccionados</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>Expediente</TableCell>
											<TableCell>CUIJ</TableCell>
											<TableCell>Source</TableCell>
											<TableCell>Carátula</TableCell>
											<TableCell>Juzgado</TableCell>
											<TableCell>Objeto</TableCell>
											<TableCell align="right">Monto</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell align="center">Movs.</TableCell>
											<TableCell>Fecha Creación</TableCell>
											<TableCell>Última Act.</TableCell>
											<TableCell>Últ. Movimiento</TableCell>
											<TableCell align="center">Actualizable</TableCell>
											<TableCell align="center">Privado</TableCell>
											<TableCell align="center">Detalles</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{causas.map((causa) => (
											<TableRow key={getId(causa._id)} hover>
												<TableCell>
													<Typography variant="body2" fontWeight="bold">
														{causa.numero}/{causa.anio}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
														{causa.cuij}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip
														label={causa.source || "N/A"}
														size="small"
														variant="outlined"
														color={causa.source === "app" ? "primary" : causa.source === "import" ? "secondary" : "default"}
													/>
												</TableCell>
												<TableCell sx={{ maxWidth: 250 }}>
													<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.caratula || "Sin carátula"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
														{causa.juzgado || "N/A"}
													</Typography>
												</TableCell>
												<TableCell sx={{ maxWidth: 150 }}>
													<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.objeto || "N/A"}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2">
														{formatMonto(causa.monto, causa.montoMoneda)}
													</Typography>
												</TableCell>
												<TableCell>
													{causa.estado && (
														<Chip
															label={causa.estado}
															size="small"
															color="info"
															variant="outlined"
														/>
													)}
												</TableCell>
												<TableCell align="center">
													<Chip label={causa.movimientosCount || 0} size="small" variant="outlined" />
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(causa.createdAt)}</Typography>
												</TableCell>
												<TableCell>
													{(() => {
														const updateInfo = getTodayUpdateInfo(causa);
														return (
															<Stack direction="row" spacing={0.5} alignItems="center">
																<Typography variant="caption">{formatDate(causa.lastUpdate)}</Typography>
																{updateInfo.isToday && updateInfo.count > 0 && (
																	<Tooltip title={formatHoursTooltip(updateInfo.hours)}>
																		<Chip
																			icon={<Repeat size={12} />}
																			label={updateInfo.count}
																			size="small"
																			color="success"
																			sx={{
																				height: 18,
																				fontSize: '0.65rem',
																				'& .MuiChip-icon': { fontSize: '0.75rem' },
																				'& .MuiChip-label': { px: 0.5 }
																			}}
																		/>
																	</Tooltip>
																)}
															</Stack>
														);
													})()}
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(causa.ultimoMovimiento)}</Typography>
												</TableCell>
												<TableCell align="center">
													{causa.update ? (
														<TickCircle size={20} color={theme.palette.success.dark} variant="Bold" />
													) : (
														<CloseSquare size={20} color={theme.palette.error.main} variant="Bold" />
													)}
												</TableCell>
												<TableCell align="center">
													{causa.isPrivate ? (
														<Lock1 size={20} color={theme.palette.warning.main} variant="Bold" />
													) : (
														<Typography variant="caption" color="text.secondary">—</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													{causa.detailsLoaded ? (
														<TickCircle size={20} color={theme.palette.success.dark} variant="Bold" />
													) : (
														<CloseSquare size={20} color={theme.palette.error.main} variant="Bold" />
													)}
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Ver detalles">
														<IconButton size="small" color="primary" onClick={() => handleVerDetalles(causa)} disabled={loadingDetail}>
															<Eye size={18} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<EnhancedTablePagination
								rowsPerPageOptions={[10, 25, 50, 100]}
								count={totalCount}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
							/>
						</Card>
					)}
				</Grid>
			</Grid>

			{/* Modal de detalles EJE */}
			<CausaDetalleModalEje
				open={detailModalOpen}
				onClose={handleCloseModal}
				causa={selectedCausa}
				onCausaUpdated={handleRefresh}
			/>
		</MainCard>
	);
};

export default CarpetasVerificadasEje;
