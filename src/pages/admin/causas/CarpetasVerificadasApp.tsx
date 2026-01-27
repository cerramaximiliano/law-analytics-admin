import { useState, useEffect } from "react";
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
	TablePagination,
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasPjnService, Causa } from "api/causasPjn";
import { JudicialMovementsService, JudicialMovement } from "api/judicialMovements";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Notification, Calendar, TickCircle, CloseSquare, UserSquare } from "iconsax-react";
import CausaDetalleModal from "./CausaDetalleModal";
import JudicialMovementsModal from "./JudicialMovementsModal";
import IntervinientesModal from "./IntervinientesModal";
import { IntervinientesService, Interviniente } from "../../../api/intervinientes";

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

const CarpetasVerificadasApp = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [causas, setCausas] = useState<Causa[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);
	const [totalInDatabase, setTotalInDatabase] = useState(0);
	const [fueroFilter, setFueroFilter] = useState<string>("todos");
	const [actualizableFilter, setActualizableFilter] = useState<string>("todos");

	// Filtros de búsqueda
	const [searchNumber, setSearchNumber] = useState<string>("");
	const [searchYear, setSearchYear] = useState<string>("");
	const [searchObjeto, setSearchObjeto] = useState<string>("");
	const [searchCaratula, setSearchCaratula] = useState<string>("");
	const [searchFechaUltimoMovimiento, setSearchFechaUltimoMovimiento] = useState<Dayjs | null>(null);
	const [searchLastUpdate, setSearchLastUpdate] = useState<Dayjs | null>(null);

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("year");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Modal de detalles
	const [selectedCausa, setSelectedCausa] = useState<Causa | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Modal de movimientos judiciales
	const [judicialMovements, setJudicialMovements] = useState<JudicialMovement[]>([]);
	const [movementsModalOpen, setMovementsModalOpen] = useState(false);
	const [loadingMovements, setLoadingMovements] = useState(false);
	const [movementsError, setMovementsError] = useState<string>("");
	const [selectedExpedienteId, setSelectedExpedienteId] = useState<string>("");

	// Modal de intervinientes
	const [intervinientesModalOpen, setIntervinientesModalOpen] = useState(false);
	const [intervinientes, setIntervinientes] = useState<{
		partes: Interviniente[];
		letrados: Interviniente[];
		all: Interviniente[];
	} | null>(null);
	const [loadingIntervinientes, setLoadingIntervinientes] = useState(false);
	const [intervinientesError, setIntervinientesError] = useState<string>("");
	const [selectedCausaIntervinientes, setSelectedCausaIntervinientes] = useState<Causa | null>(null);

	// Cargar causas verificadas
	const fetchCausas = async (
		currentPage: number,
		limit: number,
		fuero: string,
		number?: string,
		year?: string,
		objeto?: string,
		caratula?: string,
		sortByParam?: string,
		sortOrderParam?: "asc" | "desc",
		fechaUltimoMovimiento?: Dayjs | null,
		lastUpdate?: Dayjs | null,
		actualizable?: string,
	) => {
		try {
			setLoading(true);

			const params: any = {
				page: currentPage + 1, // Backend usa base 1
				limit,
			};

			if (fuero !== "todos") {
				params.fuero = fuero;
			}

			if (number && number.trim() !== "") {
				params.number = parseInt(number);
			}

			if (year && year.trim() !== "") {
				params.year = parseInt(year);
			}

			if (objeto && objeto.trim() !== "") {
				params.objeto = objeto.trim();
			}

			if (caratula && caratula.trim() !== "") {
				params.caratula = caratula.trim();
			}

			if (fechaUltimoMovimiento) {
				// Formatear fecha al formato requerido: "2022-11-29T00:00:00.000+00:00"
				params.fechaUltimoMovimiento = fechaUltimoMovimiento.format("YYYY-MM-DD") + "T00:00:00.000+00:00";
			}

			if (lastUpdate) {
				params.lastUpdate = lastUpdate.format("YYYY-MM-DD") + "T00:00:00.000+00:00";
			}

			if (actualizable && actualizable !== "todos") {
				params.update = actualizable === "true";
			}

			// Agregar parámetros de ordenamiento
			if (sortByParam) {
				params.sortBy = sortByParam;
			}

			if (sortOrderParam) {
				params.sortOrder = sortOrderParam;
			}

			console.log("🔍 Parámetros enviados a API:", params);

			const response = await CausasPjnService.getVerifiedCausas(params);

			if (response.success) {
				setCausas(response.data);
				setTotalCount(response.count || 0);
				setTotalInDatabase(response.totalInDatabase || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas verificadas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Efecto para cargar causas cuando cambian los filtros, paginación u ordenamiento
	// Los filtros de búsqueda (searchNumber, etc.) NO están en las dependencias para evitar
	// búsquedas automáticas mientras el usuario escribe. Se aplican al hacer clic en "Buscar"
	useEffect(() => {
		fetchCausas(
			page,
			rowsPerPage,
			fueroFilter,
			searchNumber,
			searchYear,
			searchObjeto,
			searchCaratula,
			sortBy,
			sortOrder,
			searchFechaUltimoMovimiento,
			searchLastUpdate,
			actualizableFilter,
		);
	}, [page, rowsPerPage, fueroFilter, sortBy, sortOrder, actualizableFilter]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Handler de cambio de fuero
	const handleFueroChange = (event: any) => {
		setFueroFilter(event.target.value);
		setPage(0);
	};

	// Handler de cambio de filtro actualizable
	const handleActualizableChange = (event: any) => {
		setActualizableFilter(event.target.value);
		setPage(0);
	};

	// Handler de refresh
	const handleRefresh = () => {
		fetchCausas(
			page,
			rowsPerPage,
			fueroFilter,
			searchNumber,
			searchYear,
			searchObjeto,
			searchCaratula,
			sortBy,
			sortOrder,
			searchFechaUltimoMovimiento,
			searchLastUpdate,
			actualizableFilter,
		);
	};

	// Handler de búsqueda
	const handleSearch = () => {
		setPage(0); // Resetear a página 1
		fetchCausas(
			0,
			rowsPerPage,
			fueroFilter,
			searchNumber,
			searchYear,
			searchObjeto,
			searchCaratula,
			sortBy,
			sortOrder,
			searchFechaUltimoMovimiento,
			searchLastUpdate,
			actualizableFilter,
		);
	};

	// Handler de limpiar búsqueda
	const handleClearSearch = () => {
		setSearchNumber("");
		setSearchYear("");
		setSearchObjeto("");
		setSearchCaratula("");
		setSearchFechaUltimoMovimiento(null);
		setSearchLastUpdate(null);
		setActualizableFilter("todos");
		setPage(0);
		fetchCausas(0, rowsPerPage, fueroFilter, "", "", "", "", sortBy, sortOrder, null, null, "todos");
	};

	// Handler para establecer fecha de hoy
	const handleSetToday = () => {
		setSearchFechaUltimoMovimiento(dayjs());
	};

	// Handler para establecer fecha de hoy en lastUpdate
	const handleSetTodayLastUpdate = () => {
		setSearchLastUpdate(dayjs());
	};

	// Handler de cambio de ordenamiento
	const handleSortChange = (event: any) => {
		setSortBy(event.target.value);
		setPage(0);
	};

	// Handler de cambio de dirección de ordenamiento
	const handleSortOrderChange = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		setPage(0);
	};

	// Formatear fecha
	const formatDate = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleDateString("es-AR");
	};

	// Formatear fecha UTC sin conversión a hora local
	const formatDateUTC = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		// Usar UTC para evitar conversión de zona horaria
		const day = dateObj.getUTCDate();
		const month = dateObj.getUTCMonth() + 1;
		const year = dateObj.getUTCFullYear();
		return `${day}/${month}/${year}`;
	};

	// Verificar si dos fechas coinciden en día, mes y año (UTC)
	const datesMatchUTC = (date1: { $date: string } | string | undefined, date2: { $date: string } | string | undefined): boolean => {
		if (!date1 || !date2) return false;
		const dateStr1 = typeof date1 === "string" ? date1 : date1.$date;
		const dateStr2 = typeof date2 === "string" ? date2 : date2.$date;
		const dateObj1 = new Date(dateStr1);
		const dateObj2 = new Date(dateStr2);

		return (
			dateObj1.getUTCDate() === dateObj2.getUTCDate() &&
			dateObj1.getUTCMonth() === dateObj2.getUTCMonth() &&
			dateObj1.getUTCFullYear() === dateObj2.getUTCFullYear()
		);
	};

	// Obtener ID como string
	const getId = (id: string | { $oid: string }): string => {
		return typeof id === "string" ? id : id.$oid;
	};

	// Handler para ver detalles
	const handleVerDetalles = async (causa: Causa) => {
		try {
			setLoadingDetail(true);
			const causaId = getId(causa._id);
			const fuero = causa.fuero || "CIV";

			// Obtener causa completa con movimientos
			const response = await CausasPjnService.getCausaById(fuero as any, causaId);

			if (response.success && response.data) {
				// response.data puede ser un array o un objeto único
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

	// Handler para cerrar modal
	const handleCloseModal = () => {
		setDetailModalOpen(false);
		setSelectedCausa(null);
	};

	// Handler para verificar notificaciones
	const handleVerificarNotificaciones = async (causa: Causa) => {
		try {
			setLoadingMovements(true);
			setMovementsError("");
			const causaId = getId(causa._id);
			setSelectedExpedienteId(causaId);

			const response = await JudicialMovementsService.getMovementsByExpedienteId(causaId);

			if (response.success) {
				setJudicialMovements(response.data);
				setMovementsModalOpen(true);
			} else {
				setMovementsError(response.message || "Error al cargar las notificaciones");
				setMovementsModalOpen(true);
			}
		} catch (error) {
			console.error("Error al cargar notificaciones:", error);
			setMovementsError("Error al cargar las notificaciones de movimientos judiciales");
			setMovementsModalOpen(true);
		} finally {
			setLoadingMovements(false);
		}
	};

	// Handler para recargar movimientos después de eliminar
	const handleMovementDeleted = async () => {
		if (!selectedExpedienteId) return;

		try {
			setLoadingMovements(true);
			const response = await JudicialMovementsService.getMovementsByExpedienteId(selectedExpedienteId);
			if (response.success) {
				setJudicialMovements(response.data);
			}
		} catch (error) {
			console.error("Error al recargar movimientos:", error);
		} finally {
			setLoadingMovements(false);
		}
	};

	// Handler para cerrar modal de movimientos
	const handleCloseMovementsModal = () => {
		setMovementsModalOpen(false);
		setJudicialMovements([]);
		setMovementsError("");
	};

	// Handler para ver intervinientes
	const handleVerIntervinientes = async (causa: Causa) => {
		try {
			setLoadingIntervinientes(true);
			setIntervinientesError("");
			setSelectedCausaIntervinientes(causa);
			setIntervinientesModalOpen(true);

			const causaId = getId(causa._id);
			const response = await IntervinientesService.getByCausaId(causaId);

			if (response.success) {
				setIntervinientes(response.data);
			} else {
				setIntervinientesError(response.message || "Error al cargar los intervinientes");
			}
		} catch (error) {
			console.error("Error al cargar intervinientes:", error);
			setIntervinientesError("Error al cargar los intervinientes de la causa");
		} finally {
			setLoadingIntervinientes(false);
		}
	};

	// Handler para cerrar modal de intervinientes
	const handleCloseIntervinientesModal = () => {
		setIntervinientesModalOpen(false);
		setIntervinientes(null);
		setIntervinientesError("");
		setSelectedCausaIntervinientes(null);
	};

	return (
		<MainCard title="Carpetas Verificadas (App)">
			<Box sx={{ mb: 3 }}>
				<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Typography variant="caption" color="text.secondary">
								Resultados encontrados
							</Typography>
							<Typography variant="h4" color="primary.main" fontWeight="bold">
								{totalCount}/{totalInDatabase}
							</Typography>
						</Stack>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
							{totalCount === totalInDatabase
								? "Mostrando todos los resultados"
								: `Mostrando ${((totalCount / totalInDatabase) * 100).toFixed(1)}% del total`}
						</Typography>
					</CardContent>
				</Card>
			</Box>
			<Grid container spacing={3}>
				{/* Filtros */}
				<Grid item xs={12}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth>
								<InputLabel>Fuero</InputLabel>
								<Select value={fueroFilter} onChange={handleFueroChange} label="Fuero" size="small">
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="CIV">Civil</MenuItem>
									<MenuItem value="COM">Comercial</MenuItem>
									<MenuItem value="CSS">Seg. Social</MenuItem>
									<MenuItem value="CNT">Trabajo</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth>
								<InputLabel>Actualizable</InputLabel>
								<Select value={actualizableFilter} onChange={handleActualizableChange} label="Actualizable" size="small">
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Actualizable</MenuItem>
									<MenuItem value="false">No actualizable</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Número"
								type="number"
								value={searchNumber}
								onChange={(e) => setSearchNumber(e.target.value)}
								size="small"
								placeholder="Ej: 12345"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Año"
								type="number"
								value={searchYear}
								onChange={(e) => setSearchYear(e.target.value)}
								size="small"
								placeholder="Ej: 2024"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Objeto"
								value={searchObjeto}
								onChange={(e) => setSearchObjeto(e.target.value)}
								size="small"
								placeholder="Ej: daños"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Carátula"
								value={searchCaratula}
								onChange={(e) => setSearchCaratula(e.target.value)}
								size="small"
								placeholder="Ej: Pérez"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
								<Stack direction="row" spacing={1}>
									<DatePicker
										label="Fecha Últ. Mov."
										value={searchFechaUltimoMovimiento}
										onChange={(newValue) => setSearchFechaUltimoMovimiento(newValue)}
										format="DD/MM/YYYY"
										slotProps={{
											textField: {
												size: "small",
												fullWidth: true,
												placeholder: "Ej: 29/11/2022",
											},
										}}
									/>
									<Tooltip title="Seleccionar fecha de hoy">
										<Button variant="outlined" size="small" onClick={handleSetToday} sx={{ minWidth: "auto", px: 1.5 }}>
											<Calendar size={18} />
										</Button>
									</Tooltip>
								</Stack>
							</LocalizationProvider>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
								<Stack direction="row" spacing={1}>
									<DatePicker
										label="Última Actualización"
										value={searchLastUpdate}
										onChange={(newValue) => setSearchLastUpdate(newValue)}
										format="DD/MM/YYYY"
										slotProps={{
											textField: {
												size: "small",
												fullWidth: true,
												placeholder: "Ej: 29/11/2022",
											},
										}}
									/>
									<Tooltip title="Seleccionar fecha de hoy">
										<Button variant="outlined" size="small" onClick={handleSetTodayLastUpdate} sx={{ minWidth: "auto", px: 1.5 }}>
											<Calendar size={18} />
										</Button>
									</Tooltip>
								</Stack>
							</LocalizationProvider>
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
									<MenuItem value="year">Año</MenuItem>
									<MenuItem value="number">Número</MenuItem>
									<MenuItem value="caratula">Carátula</MenuItem>
									<MenuItem value="juzgado">Juzgado</MenuItem>
									<MenuItem value="objeto">Objeto</MenuItem>
									<MenuItem value="movimientosCount">Movimientos</MenuItem>
									<MenuItem value="lastUpdate">Última Act.</MenuItem>
									<MenuItem value="fechaUltimoMovimiento">Fecha Últ. Mov.</MenuItem>
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
						<Alert severity="info">No se encontraron carpetas verificadas con los filtros seleccionados</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>Fuero</TableCell>
											<TableCell>Número</TableCell>
											<TableCell>Año</TableCell>
											<TableCell>Carátula</TableCell>
											<TableCell>Juzgado</TableCell>
											<TableCell>Objeto</TableCell>
											<TableCell align="center">Movimientos</TableCell>
											<TableCell>Última Act.</TableCell>
											<TableCell>Fecha Últ. Mov.</TableCell>
											<TableCell align="center">Actualizable</TableCell>
											<TableCell align="center">Privada</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{causas.map((causa) => (
											<TableRow key={getId(causa._id)} hover>
												<TableCell>
													<Chip
														label={FUERO_LABELS[causa.fuero || "CIV"]}
														color={FUERO_COLORS[causa.fuero || "CIV"]}
														size="small"
														sx={{
															...(causa.fuero === "CSS" && {
																color: "rgba(0, 0, 0, 0.87)",
															}),
														}}
													/>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight="bold">
														{causa.number}
													</Typography>
												</TableCell>
												<TableCell>{causa.year}</TableCell>
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
												<TableCell sx={{ maxWidth: 200 }}>
													<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.objeto || "Sin objeto"}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Chip label={causa.movimientosCount || 0} size="small" variant="outlined" />
												</TableCell>
												<TableCell>
													<Typography
														variant="caption"
														sx={{
															...(datesMatchUTC(causa.lastUpdate, causa.fechaUltimoMovimiento) && {
																color: "success.main",
																fontWeight: 600,
															}),
														}}
													>
														{formatDate(causa.lastUpdate)}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography
														variant="caption"
														sx={{
															...(datesMatchUTC(causa.lastUpdate, causa.fechaUltimoMovimiento) && {
																color: "success.main",
																fontWeight: 600,
															}),
														}}
													>
														{formatDateUTC(causa.fechaUltimoMovimiento)}
													</Typography>
												</TableCell>
												<TableCell align="center">
													{causa.update ? (
														<TickCircle size={20} color="#2e7d32" variant="Bold" />
													) : (
														<CloseSquare size={20} color="#d32f2f" variant="Bold" />
													)}
												</TableCell>
												<TableCell align="center">
													{causa.isPrivate === true ? (
														<TickCircle size={20} color="#2e7d32" variant="Bold" />
													) : causa.isPrivate === false ? (
														<CloseSquare size={20} color="#d32f2f" variant="Bold" />
													) : (
														<Typography variant="caption" color="text.secondary">—</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Stack direction="row" spacing={0.5} justifyContent="center">
														<Tooltip title="Ver detalles">
															<IconButton size="small" color="primary" onClick={() => handleVerDetalles(causa)} disabled={loadingDetail}>
																<Eye size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Ver intervinientes">
															<IconButton
																size="small"
																color="info"
																onClick={() => handleVerIntervinientes(causa)}
																disabled={loadingIntervinientes}
															>
																<UserSquare size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Verificar notificaciones">
															<IconButton
																size="small"
																color={datesMatchUTC(causa.lastUpdate, causa.fechaUltimoMovimiento) ? "success" : "warning"}
																onClick={() => handleVerificarNotificaciones(causa)}
																disabled={loadingMovements}
															>
																<Notification size={18} />
															</IconButton>
														</Tooltip>
													</Stack>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								rowsPerPageOptions={[10, 25, 50, 100]}
								component="div"
								count={totalCount}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage="Filas por página:"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</Card>
					)}
				</Grid>
			</Grid>

			{/* Modal de detalles */}
			<CausaDetalleModal
				open={detailModalOpen}
				onClose={handleCloseModal}
				causa={selectedCausa}
				onCausaUpdated={handleRefresh}
				apiService="pjn"
			/>

			{/* Modal de movimientos judiciales */}
			<JudicialMovementsModal
				open={movementsModalOpen}
				onClose={handleCloseMovementsModal}
				movements={judicialMovements}
				loading={loadingMovements}
				error={movementsError}
				onMovementDeleted={handleMovementDeleted}
			/>

			{/* Modal de intervinientes */}
			<IntervinientesModal
				open={intervinientesModalOpen}
				onClose={handleCloseIntervinientesModal}
				causa={selectedCausaIntervinientes}
				intervinientes={intervinientes}
				loading={loadingIntervinientes}
				error={intervinientesError}
			/>
		</MainCard>
	);
};

export default CarpetasVerificadasApp;
