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
	Collapse,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { CausasEjeService, CausaEje, CausasEjeResponse } from "api/causasEje";
import {
	Refresh,
	SearchNormal1,
	CloseCircle,
	ArrowUp,
	ArrowDown,
	ArrowDown2,
	ArrowUp2,
	TickCircle,
	Warning2,
	Layer,
	DocumentText,
} from "iconsax-react";

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

// Componente para mostrar las causas vinculadas de un pivot
const LinkedCausasRow = ({
	pivot,
	expanded,
	onSelectCausa,
}: {
	pivot: CausaEje;
	expanded: boolean;
	onSelectCausa: (pivotId: string, causaId: string, causa: CausaEje) => void;
}) => {
	const [linkedCausas, setLinkedCausas] = useState<CausaEje[]>([]);
	const [loading, setLoading] = useState(false);
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (expanded && !loaded) {
			loadLinkedCausas();
		}
	}, [expanded]);

	const loadLinkedCausas = async () => {
		try {
			setLoading(true);
			const response = await CausasEjeService.getPivotLinkedCausas(getId(pivot._id));
			if (response.success) {
				setLinkedCausas(Array.isArray(response.data) ? response.data : [response.data]);
				setLoaded(true);
			}
		} catch (error) {
			console.error("Error loading linked causas:", error);
		} finally {
			setLoading(false);
		}
	};

	if (!expanded) return null;

	return (
		<TableRow>
			<TableCell colSpan={7} sx={{ py: 0, backgroundColor: "grey.50" }}>
				<Collapse in={expanded} timeout="auto" unmountOnExit>
					<Box sx={{ py: 2, px: 3 }}>
						<Typography variant="subtitle2" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Layer size={18} />
							Causas vinculadas ({pivot.pivotCausaIds?.length || 0})
						</Typography>

						{loading ? (
							<Box display="flex" justifyContent="center" py={2}>
								<CircularProgress size={24} />
							</Box>
						) : linkedCausas.length === 0 ? (
							<Alert severity="warning" sx={{ mt: 1 }}>
								No se encontraron causas vinculadas
							</Alert>
						) : (
							<Table size="small" sx={{ mt: 1 }}>
								<TableHead>
									<TableRow>
										<TableCell>CUIJ</TableCell>
										<TableCell>Expediente</TableCell>
										<TableCell>Carátula</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Fecha Inicio</TableCell>
										<TableCell align="center">Acción</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{linkedCausas.map((causa) => (
										<TableRow key={getId(causa._id)} hover>
											<TableCell>
												<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
													{causa.cuij}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontWeight="bold">
													{causa.numero}/{causa.anio}
												</Typography>
											</TableCell>
											<TableCell sx={{ maxWidth: 300 }}>
												<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
													{causa.caratula || "Sin carátula"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={causa.estado || "N/A"} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Typography variant="caption">{formatDate(causa.fechaInicio)}</Typography>
											</TableCell>
											<TableCell align="center">
												<Button
													size="small"
													variant="contained"
													color="primary"
													startIcon={<TickCircle size={16} />}
													onClick={() => onSelectCausa(getId(pivot._id), getId(causa._id), causa)}
												>
													Seleccionar
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</Box>
				</Collapse>
			</TableCell>
		</TableRow>
	);
};

const CarpetasPivotsEje = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [pivots, setPivots] = useState<CausaEje[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Filas expandidas
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	// Filtros
	const [resolvedFilter, setResolvedFilter] = useState<string>("todos");

	// Filtros de búsqueda
	const [searchNumero, setSearchNumero] = useState<string>("");
	const [searchAnio, setSearchAnio] = useState<string>("");
	const [searchTerm, setSearchTerm] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Modal de confirmación
	const [confirmDialog, setConfirmDialog] = useState<{
		open: boolean;
		pivotId: string;
		causaId: string;
		causa: CausaEje | null;
	}>({
		open: false,
		pivotId: "",
		causaId: "",
		causa: null,
	});

	// Cargar pivots
	const fetchPivots = async (
		currentPage: number,
		limit: number,
		numero?: string,
		anio?: string,
		term?: string,
		sortByParam?: string,
		sortOrderParam?: "asc" | "desc",
		resolved?: string
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

			if (term && term.trim() !== "") {
				params.searchTerm = term.trim();
			}

			if (sortByParam) {
				params.sortBy = sortByParam;
			}

			if (sortOrderParam) {
				params.sortOrder = sortOrderParam;
			}

			if (resolved !== "todos") {
				params.resolved = resolved === "true";
			}

			const response = await CausasEjeService.getPivotCausas(params);

			if (response.success) {
				setPivots(Array.isArray(response.data) ? response.data : [response.data]);
				setTotalCount(response.count || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar los pivots EJE", {
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
		fetchPivots(page, rowsPerPage, searchNumero, searchAnio, searchTerm, sortBy, sortOrder, resolvedFilter);
	}, []);

	// Efecto para cambios de filtros
	useEffect(() => {
		fetchPivots(page, rowsPerPage, searchNumero, searchAnio, searchTerm, sortBy, sortOrder, resolvedFilter);
	}, [page, rowsPerPage, sortBy, sortOrder, resolvedFilter]);

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
		fetchPivots(0, rowsPerPage, searchNumero, searchAnio, searchTerm, sortBy, sortOrder, resolvedFilter);
	};

	const handleClearSearch = () => {
		setSearchNumero("");
		setSearchAnio("");
		setSearchTerm("");
		setResolvedFilter("todos");
		setPage(0);
		fetchPivots(0, rowsPerPage, "", "", "", sortBy, sortOrder, "todos");
	};

	const handleRefresh = () => {
		fetchPivots(page, rowsPerPage, searchNumero, searchAnio, searchTerm, sortBy, sortOrder, resolvedFilter);
	};

	const toggleRowExpansion = (id: string) => {
		setExpandedRows((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const handleSelectCausa = (pivotId: string, causaId: string, causa: CausaEje) => {
		setConfirmDialog({
			open: true,
			pivotId,
			causaId,
			causa,
		});
	};

	const handleConfirmSelection = async () => {
		try {
			const response = await CausasEjeService.resolvePivot(confirmDialog.pivotId, confirmDialog.causaId);
			if (response.success) {
				enqueueSnackbar("Pivot resuelto exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				setConfirmDialog({ open: false, pivotId: "", causaId: "", causa: null });
				handleRefresh();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || "Error al resolver el pivot", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	return (
		<MainCard title="Pivots EJE - Múltiples Resultados">
			{/* Header: Resultados */}
			<Box sx={{ mb: 2 }}>
				<Grid container spacing={2} alignItems="center">
					<Grid item xs={12} md={4}>
						<Card sx={{ backgroundColor: "info.lighter", border: 1, borderColor: "info.main" }}>
							<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Stack direction="row" alignItems="center" spacing={1}>
										<Layer size={20} color={theme.palette.info.main} />
										<Typography variant="body2" color="text.secondary">
											Pivots Pendientes
										</Typography>
									</Stack>
									<Typography variant="h4" color="info.main" fontWeight="bold">
										{totalCount.toLocaleString()}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} md={8}>
						<Alert severity="info" icon={<DocumentText size={20} />}>
							Los pivots son búsquedas que encontraron múltiples resultados en EJE. Expande cada fila para ver las opciones y seleccionar la causa
							correcta.
						</Alert>
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
								placeholder="Ej: 162321"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<TextField
								fullWidth
								label="Año"
								value={searchAnio}
								onChange={(e) => setSearchAnio(e.target.value)}
								size="small"
								placeholder="Ej: 2020"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={3}>
							<TextField
								fullWidth
								label="Término de búsqueda"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								size="small"
								placeholder="Ej: 162321/2020"
							/>
						</Grid>
						<Grid item xs={12} md={6} lg={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={resolvedFilter}
									onChange={(e) => {
										setResolvedFilter(e.target.value);
										setPage(0);
									}}
									label="Estado"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="false">Pendientes</MenuItem>
									<MenuItem value="true">Resueltos</MenuItem>
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
								<Button variant="outlined" startIcon={<CloseCircle size={18} />} onClick={handleClearSearch} disabled={loading} size="small">
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
					) : pivots.length === 0 ? (
						<Alert severity="success">No hay pivots pendientes de resolución</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell width={50}></TableCell>
											<TableCell>Búsqueda Original</TableCell>
											<TableCell>Expediente</TableCell>
											<TableCell align="center">Resultados</TableCell>
											<TableCell>Fecha Creación</TableCell>
											<TableCell align="center">Estado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{pivots.map((pivot) => {
											const id = getId(pivot._id);
											const isExpanded = expandedRows.has(id);
											return (
												<>
													<TableRow key={id} hover sx={{ cursor: "pointer" }} onClick={() => toggleRowExpansion(id)}>
														<TableCell>
															<IconButton size="small">
																{isExpanded ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
															</IconButton>
														</TableCell>
														<TableCell>
															<Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
																{pivot.searchTerm || `${pivot.numero}/${pivot.anio}`}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="body2">
																{pivot.numero}/{pivot.anio}
															</Typography>
														</TableCell>
														<TableCell align="center">
															<Chip
																icon={<Layer size={14} />}
																label={`${pivot.pivotCausaIds?.length || 0} opciones`}
																size="small"
																color="info"
																variant="outlined"
															/>
														</TableCell>
														<TableCell>
															<Typography variant="caption">{formatDate(pivot.createdAt)}</Typography>
														</TableCell>
														<TableCell align="center">
															{pivot.resolved ? (
																<Chip label="Resuelto" size="small" color="success" />
															) : (
																<Chip label="Pendiente" size="small" color="warning" />
															)}
														</TableCell>
													</TableRow>
													<LinkedCausasRow pivot={pivot} expanded={isExpanded} onSelectCausa={handleSelectCausa} />
												</>
											);
										})}
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

			{/* Dialog de confirmación */}
			<Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, pivotId: "", causaId: "", causa: null })}>
				<DialogTitle>Confirmar selección</DialogTitle>
				<DialogContent>
					<Typography gutterBottom>¿Estás seguro de seleccionar esta causa?</Typography>
					{confirmDialog.causa && (
						<Box sx={{ mt: 2, p: 2, backgroundColor: "grey.50", borderRadius: 1 }}>
							<Typography variant="body2">
								<strong>CUIJ:</strong> {confirmDialog.causa.cuij}
							</Typography>
							<Typography variant="body2">
								<strong>Expediente:</strong> {confirmDialog.causa.numero}/{confirmDialog.causa.anio}
							</Typography>
							<Typography variant="body2">
								<strong>Carátula:</strong> {confirmDialog.causa.caratula}
							</Typography>
						</Box>
					)}
					<Alert severity="warning" sx={{ mt: 2 }}>
						Esta acción vinculará el folder original a la causa seleccionada y eliminará las demás opciones no utilizadas.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDialog({ open: false, pivotId: "", causaId: "", causa: null })}>Cancelar</Button>
					<Button variant="contained" color="primary" onClick={handleConfirmSelection}>
						Confirmar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default CarpetasPivotsEje;
