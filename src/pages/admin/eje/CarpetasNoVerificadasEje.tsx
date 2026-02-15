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
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasEjeService, CausaEje } from "api/causasEje";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, TickCircle, CloseSquare, Warning2 } from "iconsax-react";

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

// Helper para extraer ID
const getId = (id: string | { $oid: string }): string => {
	return typeof id === "string" ? id : id.$oid;
};

const CarpetasNoVerificadasEje = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [causas, setCausas] = useState<CausaEje[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [sourceFilter, setSourceFilter] = useState<string>("todos");

	// Filtros de búsqueda
	const [searchNumero, setSearchNumero] = useState<string>("");
	const [searchAnio, setSearchAnio] = useState<string>("");
	const [searchCuij, setSearchCuij] = useState<string>("");
	const [searchCaratula, setSearchCaratula] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Cargar causas no verificadas
	const fetchCausas = async (
		currentPage: number,
		limit: number,
		numero?: string,
		anio?: string,
		cuij?: string,
		caratula?: string,
		sortByParam?: string,
		sortOrderParam?: "asc" | "desc",
		source?: string,
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

			if (source !== "todos") {
				params.source = source;
			}

			const response = await CausasEjeService.getNonVerifiedCausas(params);

			if (response.success) {
				setCausas(Array.isArray(response.data) ? response.data : [response.data]);
				setTotalCount(response.count || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas no verificadas EJE", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Efecto inicial
	useEffect(() => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, sourceFilter);
	}, []);

	// Efecto para cambios de filtros
	useEffect(() => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, sourceFilter);
	}, [page, rowsPerPage, sortBy, sortOrder, sourceFilter]);

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
		fetchCausas(0, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, sourceFilter);
	};

	const handleClearSearch = () => {
		setSearchNumero("");
		setSearchAnio("");
		setSearchCuij("");
		setSearchCaratula("");
		setSourceFilter("todos");
		setPage(0);
		fetchCausas(0, rowsPerPage, "", "", "", "", sortBy, sortOrder, "todos");
	};

	const handleRefresh = () => {
		fetchCausas(page, rowsPerPage, searchNumero, searchAnio, searchCuij, searchCaratula, sortBy, sortOrder, sourceFilter);
	};

	return (
		<MainCard title="Carpetas No Verificadas EJE (App)">
			{/* Header: Resultados */}
			<Box sx={{ mb: 2 }}>
				<Grid container spacing={2} alignItems="center">
					<Grid item xs={12} md={4}>
						<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
							<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Stack direction="row" alignItems="center" spacing={1}>
										<Warning2 size={20} color={theme.palette.warning.main} />
										<Typography variant="body2" color="text.secondary">
											Pendientes de Verificación
										</Typography>
									</Stack>
									<Typography variant="h4" color="warning.main" fontWeight="bold">
										{totalCount.toLocaleString()}
									</Typography>
								</Stack>
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
						<Grid item xs={12} md={6} lg={3}>
							<TextField
								fullWidth
								label="Carátula"
								value={searchCaratula}
								onChange={(e) => setSearchCaratula(e.target.value)}
								size="small"
								placeholder="Buscar en carátula..."
							/>
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
					</Grid>
				</Grid>

				{/* Ordenamiento */}
				<Grid item xs={12}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={4} lg={3}>
							<FormControl fullWidth>
								<InputLabel>Ordenar por</InputLabel>
								<Select value={sortBy} onChange={handleSortChange} label="Ordenar por" size="small">
									<MenuItem value="createdAt">Fecha Creación</MenuItem>
									<MenuItem value="anio">Año</MenuItem>
									<MenuItem value="numero">Número</MenuItem>
									<MenuItem value="caratula">Carátula</MenuItem>
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
						<Alert severity="success">No hay carpetas pendientes de verificación</Alert>
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
											<TableCell>Fecha Creación</TableCell>
											<TableCell align="center">Verificado</TableCell>
											<TableCell align="center">Válido</TableCell>
											<TableCell align="center">Errores</TableCell>
											<TableCell>Último Error</TableCell>
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
												<TableCell sx={{ maxWidth: 300 }}>
													<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.caratula || "Sin carátula"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption">{formatDate(causa.createdAt)}</Typography>
												</TableCell>
												<TableCell align="center">
													{causa.verified ? (
														<TickCircle size={20} color={theme.palette.success.dark} variant="Bold" />
													) : (
														<CloseSquare size={20} color={theme.palette.error.main} variant="Bold" />
													)}
												</TableCell>
												<TableCell align="center">
													{causa.isValid ? (
														<TickCircle size={20} color={theme.palette.success.dark} variant="Bold" />
													) : (
														<CloseSquare size={20} color={theme.palette.error.main} variant="Bold" />
													)}
												</TableCell>
												<TableCell align="center">
													{causa.errorCount > 0 ? (
														<Chip
															label={causa.errorCount}
															size="small"
															color="error"
														/>
													) : (
														<Typography variant="caption" color="text.secondary">0</Typography>
													)}
												</TableCell>
												<TableCell sx={{ maxWidth: 200 }}>
													<Typography variant="caption" color="error.main" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
														{causa.lastError || "—"}
													</Typography>
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
		</MainCard>
	);
};

export default CarpetasNoVerificadasEje;
