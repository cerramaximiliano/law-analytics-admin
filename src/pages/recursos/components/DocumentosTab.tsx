import { useState, useEffect, useCallback } from "react";
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
	IconButton,
	TextField,
	Button,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Checkbox,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Refresh, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, Trash, DocumentText, Eye, Link21 } from "iconsax-react";
import legalAxios from "utils/legalAxios";

// Tipos
interface Patron {
	letras: string;
	numeros: string;
}

interface FalloAsociado {
	_id: string;
	titulo: string;
	urlFallo?: string;
}

interface Metadata {
	tiempoRespuesta?: number;
	intentos?: number;
	ultimoIntento?: string;
	notas?: string;
}

interface Codigo {
	codigo: string;
	urlPdf: string;
	estado: "valido" | "invalido" | "error";
	httpStatus?: number;
	tamanoBytes?: number;
	contentType?: string;
	patron: Patron;
	fechaDescubrimiento: string;
	falloAsociado: FalloAsociado | null;
	metadata?: Metadata;
}

interface CodigosResponse {
	success: boolean;
	data: {
		codigos: Codigo[];
		pagination: {
			total: number;
			page: number;
			limit: number;
			pages: number;
		};
	};
}

// Mapeo de colores por estado
const ESTADO_COLORS: Record<string, "success" | "error" | "warning" | "default"> = {
	valido: "success",
	invalido: "error",
	error: "warning",
};

const DocumentosTab = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [codigos, setCodigos] = useState<Codigo[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [patronFilter, setPatronFilter] = useState<string>("");
	const [estadoFilter, setEstadoFilter] = useState<string>("");

	// Ordenamiento
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Selección para eliminación masiva
	const [selected, setSelected] = useState<string[]>([]);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
	const [codigoToDelete, setCodigoToDelete] = useState<string | null>(null);

	// Modal de detalles
	const [detallesModalOpen, setDetallesModalOpen] = useState(false);
	const [selectedCodigo, setSelectedCodigo] = useState<Codigo | null>(null);
	const [loadingDetalles, setLoadingDetalles] = useState(false);

	// Cargar códigos
	const fetchCodigos = useCallback(async () => {
		try {
			setLoading(true);

			const params: Record<string, string | number> = {
				page: page + 1,
				limit: rowsPerPage,
				ordenar: sortOrder === "desc" ? "-fechaDescubrimiento" : "fechaDescubrimiento",
			};

			if (patronFilter.trim() !== "") {
				params.patron = patronFilter.trim().toUpperCase();
			}

			if (estadoFilter) {
				params.estado = estadoFilter;
			}

			const response = await legalAxios.get<CodigosResponse>("/api/admin/codigos", { params });

			if (response.data.success) {
				setCodigos(response.data.data.codigos);
				setTotalCount(response.data.data.pagination.total);
			}
		} catch (error: any) {
			console.error("Error al cargar códigos:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al cargar los códigos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, sortOrder, patronFilter, estadoFilter, enqueueSnackbar]);

	// Efectos
	useEffect(() => {
		fetchCodigos();
	}, [fetchCodigos]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSearch = () => {
		setPage(0);
		fetchCodigos();
	};

	const handleClearFilters = () => {
		setPatronFilter("");
		setEstadoFilter("");
		setPage(0);
	};

	const handleSort = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
	};

	// Formatear fecha
	const formatDate = (dateString: string) => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Formatear tamaño
	const formatSize = (bytes?: number) => {
		if (!bytes) return "-";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	};

	// Handlers de selección
	const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.checked) {
			const newSelected = codigos.map((c) => c.codigo);
			setSelected(newSelected);
		} else {
			setSelected([]);
		}
	};

	const handleSelectOne = (codigo: string) => {
		const selectedIndex = selected.indexOf(codigo);
		let newSelected: string[] = [];

		if (selectedIndex === -1) {
			newSelected = [...selected, codigo];
		} else {
			newSelected = selected.filter((c) => c !== codigo);
		}

		setSelected(newSelected);
	};

	const isSelected = (codigo: string) => selected.indexOf(codigo) !== -1;

	// Handlers de eliminación individual
	const handleOpenDeleteDialog = (codigo: string) => {
		setCodigoToDelete(codigo);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setCodigoToDelete(null);
	};

	const handleConfirmDelete = async () => {
		if (!codigoToDelete) return;

		try {
			await legalAxios.delete(`/api/admin/codigos/${codigoToDelete}`);
			enqueueSnackbar("Código eliminado correctamente", { variant: "success" });
			handleCloseDeleteDialog();
			fetchCodigos();
		} catch (error: any) {
			console.error("Error al eliminar código:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al eliminar el código", { variant: "error" });
		}
	};

	// Handlers de eliminación masiva
	const handleOpenBulkDeleteDialog = () => {
		setBulkDeleteDialogOpen(true);
	};

	const handleCloseBulkDeleteDialog = () => {
		setBulkDeleteDialogOpen(false);
	};

	const handleConfirmBulkDelete = async () => {
		if (selected.length === 0) return;

		try {
			await legalAxios.delete("/api/admin/codigos", {
				data: { codigos: selected },
			});
			enqueueSnackbar(`${selected.length} código(s) eliminado(s) correctamente`, { variant: "success" });
			handleCloseBulkDeleteDialog();
			setSelected([]);
			fetchCodigos();
		} catch (error: any) {
			console.error("Error al eliminar códigos:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al eliminar los códigos", { variant: "error" });
		}
	};

	// Eliminar por estado
	const handleDeleteByEstado = async (estado: string) => {
		try {
			const response = await legalAxios.delete("/api/admin/codigos", {
				data: { estado },
			});
			enqueueSnackbar(response.data.message || "Códigos eliminados correctamente", { variant: "success" });
			fetchCodigos();
		} catch (error: any) {
			console.error("Error al eliminar códigos por estado:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al eliminar los códigos", { variant: "error" });
		}
	};

	// Handler de detalles
	const handleOpenDetallesModal = async (codigo: Codigo) => {
		setSelectedCodigo(codigo);
		setDetallesModalOpen(true);
		setLoadingDetalles(true);

		try {
			const response = await legalAxios.get(`/api/admin/codigos/${codigo.codigo}`);
			if (response.data.success) {
				setSelectedCodigo(response.data.data);
			}
		} catch (error: any) {
			console.error("Error al cargar detalles:", error);
		} finally {
			setLoadingDetalles(false);
		}
	};

	const handleCloseDetallesModal = () => {
		setDetallesModalOpen(false);
		setSelectedCodigo(null);
	};

	return (
		<>
			<Stack spacing={3}>
				{/* Filtros */}
				<Card sx={{ p: 2 }}>
					<Typography variant="h6" gutterBottom>
						Filtros de búsqueda
					</Typography>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={4}>
							<TextField
								fullWidth
								label="Patrón (letras)"
								placeholder="Ej: AAEA, BBCD..."
								value={patronFilter}
								onChange={(e) => setPatronFilter(e.target.value.toUpperCase())}
								onKeyPress={(e) => e.key === "Enter" && handleSearch()}
								InputProps={{
									endAdornment: patronFilter && (
										<IconButton size="small" onClick={() => setPatronFilter("")}>
											<CloseCircle size={16} />
										</IconButton>
									),
								}}
							/>
						</Grid>

						<Grid item xs={12} md={4}>
							<FormControl fullWidth>
								<InputLabel>Estado</InputLabel>
								<Select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} label="Estado">
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="valido">Válido</MenuItem>
									<MenuItem value="invalido">Inválido</MenuItem>
									<MenuItem value="error">Error</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						<Grid item xs={12} md={4}>
							<Stack direction="row" spacing={1}>
								<Button fullWidth variant="contained" color="primary" startIcon={<SearchNormal1 />} onClick={handleSearch} sx={{ height: "56px" }}>
									Buscar
								</Button>
								<Tooltip title="Limpiar filtros">
									<IconButton onClick={handleClearFilters} sx={{ height: "56px" }}>
										<CloseCircle />
									</IconButton>
								</Tooltip>
								<Tooltip title="Refrescar">
									<IconButton onClick={fetchCodigos} sx={{ height: "56px" }}>
										<Refresh />
									</IconButton>
								</Tooltip>
							</Stack>
						</Grid>
					</Grid>
				</Card>

				{/* Acciones masivas */}
				{selected.length > 0 && (
					<Card sx={{ p: 2, bgcolor: "primary.lighter" }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="body1">
								{selected.length} código(s) seleccionado(s)
							</Typography>
							<Button variant="contained" color="error" startIcon={<Trash />} onClick={handleOpenBulkDeleteDialog}>
								Eliminar seleccionados
							</Button>
						</Stack>
					</Card>
				)}

				{/* Acciones rápidas por estado */}
				<Card sx={{ p: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Acciones rápidas
					</Typography>
					<Stack direction="row" spacing={2}>
						<Button size="small" variant="outlined" color="error" onClick={() => handleDeleteByEstado("invalido")}>
							Eliminar todos los inválidos
						</Button>
						<Button size="small" variant="outlined" color="warning" onClick={() => handleDeleteByEstado("error")}>
							Eliminar todos con error
						</Button>
					</Stack>
				</Card>

				{/* Tabla */}
				<TableContainer component={Card}>
					{loading ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
							<CircularProgress />
						</Box>
					) : codigos.length === 0 ? (
						<Box p={4}>
							<Alert severity="info">No se encontraron códigos con los filtros aplicados.</Alert>
						</Box>
					) : (
						<>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell padding="checkbox">
											<Checkbox
												indeterminate={selected.length > 0 && selected.length < codigos.length}
												checked={codigos.length > 0 && selected.length === codigos.length}
												onChange={handleSelectAll}
											/>
										</TableCell>
										<TableCell>Código</TableCell>
										<TableCell>Patrón</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Tamaño</TableCell>
										<TableCell>
											<Box display="flex" alignItems="center" gap={1}>
												Fecha Descubrimiento
												<IconButton size="small" onClick={handleSort}>
													{sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
												</IconButton>
											</Box>
										</TableCell>
										<TableCell align="center">PDF</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{codigos.map((codigo) => {
										const isItemSelected = isSelected(codigo.codigo);
										return (
											<TableRow key={codigo.codigo} hover selected={isItemSelected}>
												<TableCell padding="checkbox">
													<Checkbox checked={isItemSelected} onChange={() => handleSelectOne(codigo.codigo)} />
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight={600}>
														{codigo.codigo}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip label={codigo.patron.letras} size="small" variant="outlined" />
													<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
														#{codigo.patron.numeros}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip label={codigo.estado} size="small" color={ESTADO_COLORS[codigo.estado] || "default"} />
													{codigo.httpStatus && (
														<Typography variant="caption" color="text.secondary" display="block">
															HTTP {codigo.httpStatus}
														</Typography>
													)}
												</TableCell>
												<TableCell>{formatSize(codigo.tamanoBytes)}</TableCell>
												<TableCell>{formatDate(codigo.fechaDescubrimiento)}</TableCell>
												<TableCell align="center">
													<Tooltip title="Abrir PDF">
														<IconButton size="small" color="primary" component="a" href={codigo.urlPdf} target="_blank" rel="noopener noreferrer">
															<DocumentText size={20} />
														</IconButton>
													</Tooltip>
												</TableCell>
												<TableCell align="center">
													<Stack direction="row" spacing={0.5} justifyContent="center">
														<Tooltip title="Ver detalles">
															<IconButton size="small" color="info" onClick={() => handleOpenDetallesModal(codigo)}>
																<Eye size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Eliminar">
															<IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(codigo.codigo)}>
																<Trash size={18} />
															</IconButton>
														</Tooltip>
													</Stack>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							<TablePagination
								component="div"
								count={totalCount}
								page={page}
								onPageChange={handleChangePage}
								rowsPerPage={rowsPerPage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								rowsPerPageOptions={[10, 20, 50, 100]}
								labelRowsPerPage="Filas por página:"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</>
					)}
				</TableContainer>
			</Stack>

			{/* Dialog de confirmación de eliminación individual */}
			<Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
				<DialogTitle>Confirmar Eliminación</DialogTitle>
				<DialogContent>
					<Typography>
						¿Estás seguro de que deseas eliminar el código <strong>{codigoToDelete}</strong>? Esta acción no se puede deshacer.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
					<Button onClick={handleConfirmDelete} variant="contained" color="error">
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación de eliminación masiva */}
			<Dialog open={bulkDeleteDialogOpen} onClose={handleCloseBulkDeleteDialog}>
				<DialogTitle>Confirmar Eliminación Masiva</DialogTitle>
				<DialogContent>
					<Typography>
						¿Estás seguro de que deseas eliminar <strong>{selected.length}</strong> código(s)? Esta acción no se puede deshacer.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseBulkDeleteDialog}>Cancelar</Button>
					<Button onClick={handleConfirmBulkDelete} variant="contained" color="error">
						Eliminar {selected.length} código(s)
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de Detalles */}
			<Dialog open={detallesModalOpen} onClose={handleCloseDetallesModal} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" alignItems="center" gap={1}>
						<Eye size={24} />
						Detalles del Código
					</Stack>
				</DialogTitle>
				<DialogContent>
					{loadingDetalles ? (
						<Box display="flex" justifyContent="center" py={4}>
							<CircularProgress />
						</Box>
					) : (
						selectedCodigo && (
							<Stack spacing={3} sx={{ mt: 1 }}>
								{/* Información básica */}
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Información del Código
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Código
											</Typography>
											<Typography variant="body1" fontWeight={600}>
												{selectedCodigo.codigo}
											</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Estado
											</Typography>
											<Box sx={{ mt: 0.5 }}>
												<Chip label={selectedCodigo.estado} size="small" color={ESTADO_COLORS[selectedCodigo.estado] || "default"} />
											</Box>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Patrón
											</Typography>
											<Typography variant="body1">
												{selectedCodigo.patron.letras} - #{selectedCodigo.patron.numeros}
											</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Fecha de Descubrimiento
											</Typography>
											<Typography variant="body1">{formatDate(selectedCodigo.fechaDescubrimiento)}</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												HTTP Status
											</Typography>
											<Typography variant="body1">{selectedCodigo.httpStatus || "-"}</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Tamaño
											</Typography>
											<Typography variant="body1">{formatSize(selectedCodigo.tamanoBytes)}</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="caption" color="text.secondary">
												Content Type
											</Typography>
											<Typography variant="body1">{selectedCodigo.contentType || "-"}</Typography>
										</Grid>
									</Grid>
								</Card>

								{/* URL del PDF */}
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Documento PDF
									</Typography>
									<Button
										variant="outlined"
										startIcon={<Link21 />}
										component="a"
										href={selectedCodigo.urlPdf}
										target="_blank"
										rel="noopener noreferrer"
										fullWidth
									>
										Abrir PDF en nueva pestaña
									</Button>
								</Card>

								{/* Fallo asociado */}
								{selectedCodigo.falloAsociado && (
									<Card sx={{ p: 2 }}>
										<Typography variant="h6" gutterBottom>
											Fallo Asociado
										</Typography>
										<Grid container spacing={2}>
											<Grid item xs={12}>
												<Typography variant="caption" color="text.secondary">
													Título
												</Typography>
												<Typography variant="body1">{selectedCodigo.falloAsociado.titulo}</Typography>
											</Grid>
											{selectedCodigo.falloAsociado.urlFallo && (
												<Grid item xs={12}>
													<Button
														variant="outlined"
														size="small"
														component="a"
														href={selectedCodigo.falloAsociado.urlFallo}
														target="_blank"
														rel="noopener noreferrer"
													>
														Ver fallo
													</Button>
												</Grid>
											)}
										</Grid>
									</Card>
								)}

								{/* Metadata */}
								{selectedCodigo.metadata && (
									<Card sx={{ p: 2 }}>
										<Typography variant="h6" gutterBottom>
											Metadata
										</Typography>
										<Grid container spacing={2}>
											{selectedCodigo.metadata.tiempoRespuesta !== undefined && (
												<Grid item xs={12} md={6}>
													<Typography variant="caption" color="text.secondary">
														Tiempo de Respuesta
													</Typography>
													<Typography variant="body1">{selectedCodigo.metadata.tiempoRespuesta} ms</Typography>
												</Grid>
											)}
											{selectedCodigo.metadata.intentos !== undefined && (
												<Grid item xs={12} md={6}>
													<Typography variant="caption" color="text.secondary">
														Intentos
													</Typography>
													<Typography variant="body1">{selectedCodigo.metadata.intentos}</Typography>
												</Grid>
											)}
											{selectedCodigo.metadata.ultimoIntento && (
												<Grid item xs={12} md={6}>
													<Typography variant="caption" color="text.secondary">
														Último Intento
													</Typography>
													<Typography variant="body1">{formatDate(selectedCodigo.metadata.ultimoIntento)}</Typography>
												</Grid>
											)}
											{selectedCodigo.metadata.notas && (
												<Grid item xs={12}>
													<Typography variant="caption" color="text.secondary">
														Notas
													</Typography>
													<Typography variant="body1">{selectedCodigo.metadata.notas}</Typography>
												</Grid>
											)}
										</Grid>
									</Card>
								)}
							</Stack>
						)
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDetallesModal}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default DocumentosTab;
