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
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasPjnService, Causa } from "api/causasPjn";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown } from "iconsax-react";
import CausaDetalleModal from "./CausaDetalleModal";

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
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [totalCount, setTotalCount] = useState(0);
	const [fueroFilter, setFueroFilter] = useState<string>("todos");

	// Filtros de búsqueda
	const [searchNumber, setSearchNumber] = useState<string>("");
	const [searchYear, setSearchYear] = useState<string>("");
	const [searchObjeto, setSearchObjeto] = useState<string>("");
	const [searchCaratula, setSearchCaratula] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("year");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Modal de detalles
	const [selectedCausa, setSelectedCausa] = useState<Causa | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);
	const [loadingDetail, setLoadingDetail] = useState(false);

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
		fetchCausas(page, rowsPerPage, fueroFilter, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	}, [page, rowsPerPage, fueroFilter, sortBy, sortOrder]);

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

	// Handler de refresh
	const handleRefresh = () => {
		fetchCausas(page, rowsPerPage, fueroFilter, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	};

	// Handler de búsqueda
	const handleSearch = () => {
		setPage(0); // Resetear a página 1
		fetchCausas(0, rowsPerPage, fueroFilter, searchNumber, searchYear, searchObjeto, searchCaratula, sortBy, sortOrder);
	};

	// Handler de limpiar búsqueda
	const handleClearSearch = () => {
		setSearchNumber("");
		setSearchYear("");
		setSearchObjeto("");
		setSearchCaratula("");
		setPage(0);
		fetchCausas(0, rowsPerPage, fueroFilter, "", "", "", "", sortBy, sortOrder);
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

	return (
		<MainCard title="Carpetas Verificadas (App)">
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
								<Button
									variant="contained"
									startIcon={<SearchNormal1 size={18} />}
									onClick={handleSearch}
									disabled={loading}
									size="small"
								>
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
													<Typography variant="caption">{formatDate(causa.lastUpdate)}</Typography>
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
			<CausaDetalleModal open={detailModalOpen} onClose={handleCloseModal} causa={selectedCausa} onCausaUpdated={handleRefresh} apiService="pjn" />
		</MainCard>
	);
};

export default CarpetasVerificadasApp;
