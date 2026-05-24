import { useState, useEffect } from "react";
import {
	Box,
	Card,
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
	useTheme,
	alpha,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasMEVService, CausaMEV } from "api/causasMEV";
import { JudicialMovementsService, JudicialMovement } from "api/judicialMovements";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Notification } from "iconsax-react";
import CausaDetalleModal from "../causas/CausaDetalleModal";
import JudicialMovementsModal from "../causas/JudicialMovementsModal";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

const CarpetasMEVNoVerificadas = () => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	// Estados
	const [causas, setCausas] = useState<CausaMEV[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros de búsqueda
	const [searchNumber, setSearchNumber] = useState<string>("");
	const [searchYear, setSearchYear] = useState<string>("");
	const [searchObjeto, setSearchObjeto] = useState<string>("");
	const [searchCaratula, setSearchCaratula] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("year");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Modal de detalles
	const [selectedCausa, setSelectedCausa] = useState<CausaMEV | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Modal de movimientos judiciales
	const [judicialMovements, setJudicialMovements] = useState<JudicialMovement[]>([]);
	const [movementsModalOpen, setMovementsModalOpen] = useState(false);
	const [loadingMovements, setLoadingMovements] = useState(false);
	const [movementsError, setMovementsError] = useState<string>("");

	// Cargar causas MEV no verificadas
	const fetchCausas = async (
		currentPage: number,
		limit: number,
		number?: string,
		year?: string,
		objeto?: string,
		caratula?: string,
		sortByParam?: string,
		sortOrderParam?: "asc" | "desc",
	) => {
		try {
			setLoading(true);

			const params: any = {
				page: currentPage + 1, // Backend usa base 1
				limit,
			};

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

			// Agregar parámetros de ordenamiento
			if (sortByParam) {
				params.sortBy = sortByParam;
			}

			if (sortOrderParam) {
				params.sortOrder = sortOrderParam;
			}

			console.log("🔍 Parámetros enviados a API (MEV No Verificadas):", params);

			const response = await CausasMEVService.getNonVerifiedCausas(params);

			if (response.success) {
				setCausas(response.data);
				setTotalCount(response.count || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas MEV no verificadas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Efecto para cargar causas cuando cambian los filtros, paginación u ordenamiento
	useEffect(() => {
		fetchCausas(page, rowsPerPage, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	}, [page, rowsPerPage, sortBy, sortOrder]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Handler de refresh
	const handleRefresh = () => {
		fetchCausas(page, rowsPerPage, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	};

	// Handler de búsqueda
	const handleSearch = () => {
		setPage(0); // Resetear a página 1
		fetchCausas(0, rowsPerPage, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	};

	// Handler de limpiar búsqueda
	const handleClearSearch = () => {
		setSearchNumber("");
		setSearchYear("");
		setSearchObjeto("");
		setSearchCaratula("");
		setPage(0);
		fetchCausas(0, rowsPerPage, "", "", "", "", sortBy, sortOrder);
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
	const handleVerDetalles = async (causa: CausaMEV) => {
		try {
			setLoadingDetail(true);
			const causaId = getId(causa._id);

			// Obtener causa completa con movimientos
			const response = await CausasMEVService.getCausaById(causaId);

			if (response.success && response.data) {
				// response.data puede ser un array o un objeto único
				const causaCompleta = Array.isArray(response.data) ? response.data[0] : response.data;
				setSelectedCausa(causaCompleta);
				setDetailModalOpen(true);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar los detalles de la causa MEV", {
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
	const handleVerificarNotificaciones = async (causa: CausaMEV) => {
		try {
			setLoadingMovements(true);
			setMovementsError("");
			const causaId = getId(causa._id);

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

	// Handler para cerrar modal de movimientos
	const handleCloseMovementsModal = () => {
		setMovementsModalOpen(false);
		setJudicialMovements([]);
		setMovementsError("");
	};

	return (
		<MainCard title="Carpetas MEV No Verificadas (App)">
			<Grid container spacing={3}>
				{/* Filtros */}
				<Grid item xs={12}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6} lg={3}>
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
						<Grid item xs={12} md={6} lg={3}>
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
						<Grid item xs={12} md={6} lg={3}>
							<TextField
								fullWidth
								label="Objeto"
								value={searchObjeto}
								onChange={(e) => setSearchObjeto(e.target.value)}
								size="small"
								placeholder="Ej: daños"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={3}>
							<TextField
								fullWidth
								label="Carátula"
								value={searchCaratula}
								onChange={(e) => setSearchCaratula(e.target.value)}
								size="small"
								placeholder="Ej: Pérez"
							/>
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
									<IconButton
										onClick={handleRefresh}
										disabled={loading}
										size="small"
										sx={{
											transition: "background-color 200ms ease, transform 200ms ease",
											"&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12), transform: "translateY(-1px)" },
										}}
									>
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
						<Alert severity="info">No se encontraron carpetas MEV no verificadas con los filtros seleccionados</Alert>
					) : (
						<Card
							elevation={0}
							sx={{
								border: `1px solid ${headerBorder(isDark)}`,
								borderRadius: 2,
							}}
						>
							<TableContainer sx={{ maxHeight: "calc(100dvh - 360px)" }}>
								<Table stickyHeader size="small">
									<TableHead>
										<TableRow
											sx={{
												"& .MuiTableCell-head": {
													bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04),
													borderBottom: `1px solid ${headerBorder(isDark)}`,
													fontSize: "0.72rem",
													fontWeight: 600,
													textTransform: "uppercase",
													letterSpacing: "0.04em",
													color: "text.secondary",
												},
											}}
										>
											<TableCell>Número</TableCell>
											<TableCell>Año</TableCell>
											<TableCell>Carátula</TableCell>
											<TableCell>Juzgado</TableCell>
											<TableCell>Objeto</TableCell>
											<TableCell align="center">Movimientos</TableCell>
											<TableCell>Última Act.</TableCell>
											<TableCell>Fecha Últ. Mov.</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{causas.map((causa) => (
											<TableRow
												key={getId(causa._id)}
												hover
												sx={{
													transition: "background-color 150ms ease",
													"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) },
												}}
											>
												<TableCell>
													<Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
														{causa.number}
													</Typography>
												</TableCell>
												<TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>{causa.year}</TableCell>
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
													<Chip
														label={causa.movimientosCount || 0}
														size="small"
														variant="outlined"
														sx={{ fontVariantNumeric: "tabular-nums", minWidth: 44 }}
													/>
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
													<Stack direction="row" spacing={0.5} justifyContent="center">
														<Tooltip title="Ver detalles">
															<IconButton
																size="small"
																color="primary"
																onClick={() => handleVerDetalles(causa)}
																disabled={loadingDetail}
																sx={{
																	transition: "background-color 200ms ease, transform 200ms ease",
																	"&:hover": { bgcolor: alpha(BRAND_BLUE, 0.12), transform: "translateY(-1px)" },
																}}
															>
																<Eye size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Verificar notificaciones">
															<IconButton
																size="small"
																color={datesMatchUTC(causa.lastUpdate, causa.fechaUltimoMovimiento) ? "success" : "warning"}
																onClick={() => handleVerificarNotificaciones(causa)}
																disabled={loadingMovements}
																sx={{
																	transition: "background-color 200ms ease, transform 200ms ease",
																	"&:hover": { transform: "translateY(-1px)" },
																}}
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

			{/* Modal de detalles */}
			<CausaDetalleModal
				open={detailModalOpen}
				onClose={handleCloseModal}
				causa={selectedCausa}
				onCausaUpdated={handleRefresh}
				apiService="mev"
			/>

			{/* Modal de movimientos judiciales */}
			<JudicialMovementsModal
				open={movementsModalOpen}
				onClose={handleCloseMovementsModal}
				movements={judicialMovements}
				loading={loadingMovements}
				error={movementsError}
			/>
		</MainCard>
	);
};

export default CarpetasMEVNoVerificadas;
