import { useState, useEffect, SyntheticEvent } from "react";
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
	List,
	ListItem,
	ListItemText,
	Divider,
	Tab,
	Tabs,
} from "@mui/material";
import { useSnackbar } from "notistack";
import DocumentosTab from "./components/DocumentosTab";
import MainCard from "components/MainCard";
import {
	Refresh,
	SearchNormal1,
	CloseCircle,
	ArrowUp,
	ArrowDown,
	Book,
	Edit,
	Trash,
	MessageText,
	Add,
	Eye,
	DocumentText,
	Link,
} from "iconsax-react";
import legalAxios from "utils/legalAxios";

// Tipos
interface Tribunal {
	nombre: string;
	sala?: string;
	tipo?: string;
}

interface Comentario {
	_id?: string;
	texto: string;
	autor: string;
	fecha?: string;
}

interface Fallo {
	_id: string;
	elDialId: string;
	codigoCita: string;
	titulo: string;
	tituloCorto?: string;
	fechaPublicacion: string;
	tribunal: Tribunal;
	jurisdiccion: string;
	fuero: string;
	estado: string;
	comentarios?: Comentario[];
	introTexto?: string;
	contenidoCompleto?: string;
	partes?: any;
	expediente?: any;
	clasificacion?: any;
	urlPdf?: string;
}

interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

interface FallosResponse {
	success: boolean;
	data: Fallo[];
	pagination: PaginationInfo;
}

// Mapeo de colores por estado
const ESTADO_COLORS: Record<string, "default" | "primary" | "success" | "warning" | "error"> = {
	procesado: "success",
	pendiente: "warning",
	error: "error",
	default: "default",
};

// Mapeo de colores por jurisdicción
const JURISDICCION_COLORS: Record<string, "primary" | "success" | "info" | "warning"> = {
	Nacional: "primary",
	Provincial: "success",
	Federal: "info",
	default: "warning",
};

// TabPanel component
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} id={`jurisprudencia-tabpanel-${index}`} aria-labelledby={`jurisprudencia-tab-${index}`} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

function a11yProps(index: number) {
	return {
		id: `jurisprudencia-tab-${index}`,
		"aria-controls": `jurisprudencia-tabpanel-${index}`,
	};
}

const Jurisprudencia = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Tab state
	const [tabValue, setTabValue] = useState(0);

	const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	// Estados
	const [fallos, setFallos] = useState<Fallo[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [searchText, setSearchText] = useState<string>("");
	const [tribunalFilter, setTribunalFilter] = useState<string>("");
	const [jurisdiccionFilter, setJurisdiccionFilter] = useState<string>("");
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [estadoFilter, setEstadoFilter] = useState<string>("");
	const [fechaDesde, setFechaDesde] = useState<string>("");
	const [fechaHasta, setFechaHasta] = useState<string>("");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("fechaPublicacion");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Opciones únicas para filtros
	const [tribunales, setTribunales] = useState<string[]>([]);
	const [jurisdicciones, setJurisdicciones] = useState<string[]>([]);
	const [fueros, setFueros] = useState<string[]>([]);

	// Estados para modales
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [comentariosModalOpen, setComentariosModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [detallesModalOpen, setDetallesModalOpen] = useState(false);
	const [selectedFallo, setSelectedFallo] = useState<Fallo | null>(null);
	const [editedFallo, setEditedFallo] = useState<Partial<Fallo>>({});
	const [nuevoComentario, setNuevoComentario] = useState<Comentario>({ texto: "", autor: "" });
	const [falloToDelete, setFalloToDelete] = useState<string | null>(null);

	// Cargar fallos
	const fetchFallos = async () => {
		try {
			setLoading(true);

			const params: any = {
				page: page + 1,
				limit: rowsPerPage,
				sort: sortBy,
				order: sortOrder,
			};

			if (searchText.trim() !== "") {
				params.search = searchText.trim();
			}

			if (tribunalFilter) {
				params.tribunal = tribunalFilter;
			}

			if (jurisdiccionFilter) {
				params.jurisdiccion = jurisdiccionFilter;
			}

			if (fueroFilter) {
				params.fuero = fueroFilter;
			}

			if (estadoFilter) {
				params.estado = estadoFilter;
			}

			if (fechaDesde) {
				params.fechaDesde = fechaDesde;
			}

			if (fechaHasta) {
				params.fechaHasta = fechaHasta;
			}

			const response = await legalAxios.get<FallosResponse>("/api/fallos", { params });

			if (response.data.success) {
				setFallos(response.data.data);
				setTotalCount(response.data.pagination.total);

				// Extraer valores únicos para filtros
				const uniqueTribunales = Array.from(new Set(response.data.data.map((f) => f.tribunal.nombre))).filter(Boolean);
				const uniqueJurisdicciones = Array.from(new Set(response.data.data.map((f) => f.jurisdiccion))).filter(Boolean);
				const uniqueFueros = Array.from(new Set(response.data.data.map((f) => f.fuero))).filter(Boolean);

				setTribunales(uniqueTribunales as string[]);
				setJurisdicciones(uniqueJurisdicciones as string[]);
				setFueros(uniqueFueros as string[]);
			}
		} catch (error: any) {
			console.error("Error al cargar fallos:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al cargar los fallos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	// Efectos
	useEffect(() => {
		fetchFallos();
	}, [page, rowsPerPage, sortBy, sortOrder]);

	// Handlers
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSearch = () => {
		setPage(0);
		fetchFallos();
	};

	const handleClearFilters = () => {
		setSearchText("");
		setTribunalFilter("");
		setJurisdiccionFilter("");
		setFueroFilter("");
		setEstadoFilter("");
		setFechaDesde("");
		setFechaHasta("");
		setPage(0);
		setTimeout(() => fetchFallos(), 100);
	};

	const handleSort = (field: string) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortOrder("desc");
		}
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	};

	// Handlers de edición
	const handleOpenEditModal = (fallo: Fallo) => {
		setSelectedFallo(fallo);
		setEditedFallo({
			jurisdiccion: fallo.jurisdiccion,
			fuero: fallo.fuero,
			titulo: fallo.titulo,
			tituloCorto: fallo.tituloCorto,
			estado: fallo.estado,
			introTexto: fallo.introTexto,
			contenidoCompleto: fallo.contenidoCompleto,
		});
		setEditModalOpen(true);
	};

	const handleCloseEditModal = () => {
		setEditModalOpen(false);
		setSelectedFallo(null);
		setEditedFallo({});
	};

	const handleSaveEdit = async () => {
		if (!selectedFallo) return;

		try {
			await legalAxios.put(`/api/fallos/${selectedFallo._id}`, editedFallo);
			enqueueSnackbar("Fallo actualizado correctamente", { variant: "success" });
			handleCloseEditModal();
			fetchFallos();
		} catch (error: any) {
			console.error("Error al actualizar fallo:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al actualizar el fallo", { variant: "error" });
		}
	};

	// Handlers de comentarios
	const handleOpenComentariosModal = (fallo: Fallo) => {
		setSelectedFallo(fallo);
		setComentariosModalOpen(true);
		setNuevoComentario({ texto: "", autor: "" });
	};

	const handleCloseComentariosModal = () => {
		setComentariosModalOpen(false);
		setSelectedFallo(null);
		setNuevoComentario({ texto: "", autor: "" });
	};

	const handleAddComentario = async () => {
		if (!selectedFallo || !nuevoComentario.texto || !nuevoComentario.autor) {
			enqueueSnackbar("Por favor completa todos los campos del comentario", { variant: "warning" });
			return;
		}

		try {
			await legalAxios.post(`/api/fallos/${selectedFallo._id}/comentarios`, nuevoComentario);
			enqueueSnackbar("Comentario agregado correctamente", { variant: "success" });
			setNuevoComentario({ texto: "", autor: "" });
			fetchFallos();
			// Actualizar el fallo seleccionado
			const updatedFallo = fallos.find((f) => f._id === selectedFallo._id);
			if (updatedFallo) {
				setSelectedFallo(updatedFallo);
			}
		} catch (error: any) {
			console.error("Error al agregar comentario:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al agregar el comentario", { variant: "error" });
		}
	};

	// Handlers de eliminación
	const handleOpenDeleteDialog = (falloId: string) => {
		setFalloToDelete(falloId);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setFalloToDelete(null);
	};

	const handleConfirmDelete = async () => {
		if (!falloToDelete) return;

		try {
			await legalAxios.delete(`/api/fallos/${falloToDelete}`);
			enqueueSnackbar("Fallo eliminado correctamente", { variant: "success" });
			handleCloseDeleteDialog();
			fetchFallos();
		} catch (error: any) {
			console.error("Error al eliminar fallo:", error);
			enqueueSnackbar(error?.response?.data?.message || "Error al eliminar el fallo", { variant: "error" });
		}
	};

	// Handlers de detalles
	const handleOpenDetallesModal = (fallo: Fallo) => {
		setSelectedFallo(fallo);
		setDetallesModalOpen(true);
	};

	const handleCloseDetallesModal = () => {
		setDetallesModalOpen(false);
		setSelectedFallo(null);
	};

	return (
		<>
			<MainCard title="Jurisprudencia - El Dial" secondary={<Book size={24} />}>
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={tabValue} onChange={handleTabChange} aria-label="Jurisprudencia tabs">
						<Tab label="Fallos" {...a11yProps(0)} />
						<Tab label="Documentos" {...a11yProps(1)} />
					</Tabs>
				</Box>

				{/* Tab Fallos */}
				<TabPanel value={tabValue} index={0}>
					<Stack spacing={3}>
						{/* Filtros */}
						<Card sx={{ p: 2 }}>
						<Typography variant="h6" gutterBottom>
							Filtros de búsqueda
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6} lg={3}>
								<TextField
									fullWidth
									label="Buscar"
									placeholder="Título, código, contenido..."
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									onKeyPress={(e) => e.key === "Enter" && handleSearch()}
									InputProps={{
										endAdornment: (
											<IconButton size="small" onClick={() => setSearchText("")}>
												<CloseCircle size={16} />
											</IconButton>
										),
									}}
								/>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<FormControl fullWidth>
									<InputLabel>Jurisdicción</InputLabel>
									<Select value={jurisdiccionFilter} onChange={(e) => setJurisdiccionFilter(e.target.value)} label="Jurisdicción">
										<MenuItem value="">Todas</MenuItem>
										{jurisdicciones.map((j) => (
											<MenuItem key={j} value={j}>
												{j}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<FormControl fullWidth>
									<InputLabel>Fuero</InputLabel>
									<Select value={fueroFilter} onChange={(e) => setFueroFilter(e.target.value)} label="Fuero">
										<MenuItem value="">Todos</MenuItem>
										{fueros.map((f) => (
											<MenuItem key={f} value={f}>
												{f}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<FormControl fullWidth>
									<InputLabel>Estado</InputLabel>
									<Select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} label="Estado">
										<MenuItem value="">Todos</MenuItem>
										<MenuItem value="procesado">Procesado</MenuItem>
										<MenuItem value="pendiente">Pendiente</MenuItem>
										<MenuItem value="error">Error</MenuItem>
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<TextField
									fullWidth
									label="Fecha desde"
									type="date"
									value={fechaDesde}
									onChange={(e) => setFechaDesde(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<TextField
									fullWidth
									label="Fecha hasta"
									type="date"
									value={fechaHasta}
									onChange={(e) => setFechaHasta(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<FormControl fullWidth>
									<InputLabel>Tribunal</InputLabel>
									<Select value={tribunalFilter} onChange={(e) => setTribunalFilter(e.target.value)} label="Tribunal">
										<MenuItem value="">Todos</MenuItem>
										{tribunales.map((t) => (
											<MenuItem key={t} value={t}>
												{t}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<Stack direction="row" spacing={1} sx={{ height: "100%" }}>
									<Button
										fullWidth
										variant="contained"
										color="primary"
										startIcon={<SearchNormal1 />}
										onClick={handleSearch}
										sx={{ height: "56px" }}
									>
										Buscar
									</Button>
									<Tooltip title="Limpiar filtros">
										<IconButton onClick={handleClearFilters} sx={{ height: "56px" }}>
											<CloseCircle />
										</IconButton>
									</Tooltip>
									<Tooltip title="Refrescar">
										<IconButton onClick={fetchFallos} sx={{ height: "56px" }}>
											<Refresh />
										</IconButton>
									</Tooltip>
								</Stack>
							</Grid>
						</Grid>
					</Card>

					{/* Tabla */}
					<TableContainer component={Card}>
						{loading ? (
							<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
								<CircularProgress />
							</Box>
						) : fallos.length === 0 ? (
							<Box p={4}>
								<Alert severity="info">No se encontraron fallos con los filtros aplicados.</Alert>
							</Box>
						) : (
							<>
								<Table>
									<TableHead>
										<TableRow>
											<TableCell>
												<Box display="flex" alignItems="center" gap={1}>
													Código Cita
													<IconButton size="small" onClick={() => handleSort("codigoCita")}>
														{sortBy === "codigoCita" && sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
													</IconButton>
												</Box>
											</TableCell>
											<TableCell>Título</TableCell>
											<TableCell>
												<Box display="flex" alignItems="center" gap={1}>
													Fecha Publicación
													<IconButton size="small" onClick={() => handleSort("fechaPublicacion")}>
														{sortBy === "fechaPublicacion" && sortOrder === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
													</IconButton>
												</Box>
											</TableCell>
											<TableCell>Tribunal</TableCell>
											<TableCell align="center">Documento</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{fallos.map((fallo) => (
											<TableRow key={fallo._id} hover>
												<TableCell>
													<Typography variant="body2" fontWeight={600}>
														{fallo.codigoCita}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														ID: {fallo.elDialId}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography
														variant="body2"
														sx={{
															maxWidth: 400,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{fallo.tituloCorto || "-"}
													</Typography>
												</TableCell>
												<TableCell>{formatDate(fallo.fechaPublicacion)}</TableCell>
												<TableCell>
													<Typography variant="body2">{fallo.tribunal.nombre}</Typography>
													{fallo.tribunal.sala && (
														<Typography variant="caption" color="text.secondary">
															Sala: {fallo.tribunal.sala}
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													{fallo.urlPdf ? (
														<Tooltip title="Abrir documento">
															<IconButton
																size="small"
																color="primary"
																component="a"
																href={fallo.urlPdf}
																target="_blank"
																rel="noopener noreferrer"
															>
																<DocumentText size={20} />
															</IconButton>
														</Tooltip>
													) : (
														<Typography variant="caption" color="text.secondary">
															-
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Stack direction="row" spacing={0.5} justifyContent="center">
														<Tooltip title="Ver detalles">
															<IconButton size="small" color="success" onClick={() => handleOpenDetallesModal(fallo)}>
																<Eye size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Editar">
															<IconButton size="small" color="primary" onClick={() => handleOpenEditModal(fallo)}>
																<Edit size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Comentarios">
															<IconButton size="small" color="info" onClick={() => handleOpenComentariosModal(fallo)}>
																<MessageText size={18} />
															</IconButton>
														</Tooltip>
														<Tooltip title="Eliminar">
															<IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(fallo._id)}>
																<Trash size={18} />
															</IconButton>
														</Tooltip>
													</Stack>
												</TableCell>
											</TableRow>
										))}
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
				</TabPanel>

				{/* Tab Documentos */}
				<TabPanel value={tabValue} index={1}>
					<DocumentosTab />
				</TabPanel>
			</MainCard>

			{/* Modal de Edición */}
			<Dialog open={editModalOpen} onClose={handleCloseEditModal} maxWidth="md" fullWidth>
				<DialogTitle>Editar Fallo</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 2 }}>
						<TextField
							fullWidth
							label="Título"
							value={editedFallo.titulo || ""}
							onChange={(e) => setEditedFallo({ ...editedFallo, titulo: e.target.value })}
						/>
						<TextField
							fullWidth
							label="Título Corto"
							value={editedFallo.tituloCorto || ""}
							onChange={(e) => setEditedFallo({ ...editedFallo, tituloCorto: e.target.value })}
						/>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6}>
								<FormControl fullWidth>
									<InputLabel>Jurisdicción</InputLabel>
									<Select
										value={editedFallo.jurisdiccion || ""}
										onChange={(e) => setEditedFallo({ ...editedFallo, jurisdiccion: e.target.value })}
										label="Jurisdicción"
									>
										<MenuItem value="Nacional">Nacional</MenuItem>
										<MenuItem value="Provincial">Provincial</MenuItem>
										<MenuItem value="Federal">Federal</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6}>
								<TextField
									fullWidth
									label="Fuero"
									value={editedFallo.fuero || ""}
									onChange={(e) => setEditedFallo({ ...editedFallo, fuero: e.target.value })}
								/>
							</Grid>
						</Grid>
						<FormControl fullWidth>
							<InputLabel>Estado</InputLabel>
							<Select
								value={editedFallo.estado || ""}
								onChange={(e) => setEditedFallo({ ...editedFallo, estado: e.target.value })}
								label="Estado"
							>
								<MenuItem value="procesado">Procesado</MenuItem>
								<MenuItem value="pendiente">Pendiente</MenuItem>
								<MenuItem value="error">Error</MenuItem>
							</Select>
						</FormControl>
						<TextField
							fullWidth
							label="Intro Texto"
							multiline
							rows={3}
							value={editedFallo.introTexto || ""}
							onChange={(e) => setEditedFallo({ ...editedFallo, introTexto: e.target.value })}
						/>
						<TextField
							fullWidth
							label="Contenido Completo"
							multiline
							rows={6}
							value={editedFallo.contenidoCompleto || ""}
							onChange={(e) => setEditedFallo({ ...editedFallo, contenidoCompleto: e.target.value })}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseEditModal}>Cancelar</Button>
					<Button onClick={handleSaveEdit} variant="contained" color="primary">
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de Comentarios */}
			<Dialog open={comentariosModalOpen} onClose={handleCloseComentariosModal} maxWidth="md" fullWidth>
				<DialogTitle>Comentarios del Fallo</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 1 }}>
						{/* Lista de comentarios existentes */}
						{selectedFallo?.comentarios && selectedFallo.comentarios.length > 0 ? (
							<Box>
								<Typography variant="h6" gutterBottom>
									Comentarios anteriores
								</Typography>
								<List>
									{selectedFallo.comentarios.map((comentario, index) => (
										<Box key={index}>
											<ListItem>
												<ListItemText
													primary={comentario.texto}
													secondary={
														<>
															<Typography component="span" variant="body2" color="text.primary">
																{comentario.autor}
															</Typography>
															{comentario.fecha && ` - ${formatDate(comentario.fecha)}`}
														</>
													}
												/>
											</ListItem>
											{index < (selectedFallo.comentarios?.length || 0) - 1 && <Divider />}
										</Box>
									))}
								</List>
							</Box>
						) : (
							<Alert severity="info">No hay comentarios aún.</Alert>
						)}

						<Divider />

						{/* Formulario para nuevo comentario */}
						<Box>
							<Typography variant="h6" gutterBottom>
								Agregar nuevo comentario
							</Typography>
							<Stack spacing={2}>
								<TextField
									fullWidth
									label="Autor"
									value={nuevoComentario.autor}
									onChange={(e) => setNuevoComentario({ ...nuevoComentario, autor: e.target.value })}
								/>
								<TextField
									fullWidth
									label="Comentario"
									multiline
									rows={4}
									value={nuevoComentario.texto}
									onChange={(e) => setNuevoComentario({ ...nuevoComentario, texto: e.target.value })}
								/>
								<Button variant="contained" color="primary" startIcon={<Add />} onClick={handleAddComentario} fullWidth>
									Agregar Comentario
								</Button>
							</Stack>
						</Box>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseComentariosModal}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación de eliminación */}
			<Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
				<DialogTitle>Confirmar Eliminación</DialogTitle>
				<DialogContent>
					<Typography>¿Estás seguro de que deseas eliminar este fallo? Esta acción no se puede deshacer.</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
					<Button onClick={handleConfirmDelete} variant="contained" color="error">
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de Detalles Completos */}
			<Dialog open={detallesModalOpen} onClose={handleCloseDetallesModal} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Stack direction="row" alignItems="center" gap={1}>
						<Eye size={24} />
						Detalles del Fallo
					</Stack>
				</DialogTitle>
				<DialogContent>
					{selectedFallo && (
						<Stack spacing={3} sx={{ mt: 1 }}>
							{/* Información básica */}
							<Card sx={{ p: 2 }}>
								<Typography variant="h6" gutterBottom>
									Información Básica
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Código Cita
										</Typography>
										<Typography variant="body1" fontWeight={600}>
											{selectedFallo.codigoCita}
										</Typography>
									</Grid>
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											ID El Dial
										</Typography>
										<Typography variant="body1">{selectedFallo.elDialId}</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Título
										</Typography>
										<Typography variant="body1">{selectedFallo.titulo}</Typography>
									</Grid>
									{selectedFallo.tituloCorto && (
										<Grid item xs={12}>
											<Typography variant="caption" color="text.secondary">
												Título Corto
											</Typography>
											<Typography variant="body1">{selectedFallo.tituloCorto}</Typography>
										</Grid>
									)}
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Fecha de Publicación
										</Typography>
										<Typography variant="body1">{formatDate(selectedFallo.fechaPublicacion)}</Typography>
									</Grid>
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Estado
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip
												label={selectedFallo.estado}
												size="small"
												color={ESTADO_COLORS[selectedFallo.estado] || ESTADO_COLORS.default}
											/>
										</Box>
									</Grid>
								</Grid>
							</Card>

							{/* Tribunal y Jurisdicción */}
							<Card sx={{ p: 2 }}>
								<Typography variant="h6" gutterBottom>
									Tribunal y Jurisdicción
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Tribunal
										</Typography>
										<Typography variant="body1">{selectedFallo.tribunal.nombre}</Typography>
									</Grid>
									{selectedFallo.tribunal.sala && (
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Sala
											</Typography>
											<Typography variant="body1">{selectedFallo.tribunal.sala}</Typography>
										</Grid>
									)}
									{selectedFallo.tribunal.tipo && (
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Tipo
											</Typography>
											<Typography variant="body1">{selectedFallo.tribunal.tipo}</Typography>
										</Grid>
									)}
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Jurisdicción
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip
												label={selectedFallo.jurisdiccion}
												size="small"
												color={JURISDICCION_COLORS[selectedFallo.jurisdiccion] || JURISDICCION_COLORS.default}
											/>
										</Box>
									</Grid>
									<Grid item xs={12} md={6}>
										<Typography variant="caption" color="text.secondary">
											Fuero
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip label={selectedFallo.fuero} size="small" variant="outlined" />
										</Box>
									</Grid>
								</Grid>
							</Card>

							{/* Contenido */}
							{(selectedFallo.introTexto || selectedFallo.contenidoCompleto) && (
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Contenido
									</Typography>
									{selectedFallo.introTexto && (
										<Box sx={{ mb: 2 }}>
											<Typography variant="caption" color="text.secondary" gutterBottom>
												Introducción
											</Typography>
											<Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
												{selectedFallo.introTexto}
											</Typography>
										</Box>
									)}
									{selectedFallo.contenidoCompleto && (
										<Box>
											<Typography variant="caption" color="text.secondary" gutterBottom>
												Contenido Completo
											</Typography>
											<Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap" }}>
												{selectedFallo.contenidoCompleto}
											</Typography>
										</Box>
									)}
								</Card>
							)}

							{/* Documento */}
							{selectedFallo.urlPdf && (
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Documento
									</Typography>
									<Button
										variant="outlined"
										startIcon={<Link />}
										component="a"
										href={selectedFallo.urlPdf}
										target="_blank"
										rel="noopener noreferrer"
										fullWidth
									>
										Abrir documento en nueva pestaña
									</Button>
								</Card>
							)}

							{/* Partes, Expediente, Clasificación */}
							{(selectedFallo.partes || selectedFallo.expediente || selectedFallo.clasificacion) && (
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Información Adicional
									</Typography>
									<Stack spacing={2}>
										{selectedFallo.partes && (
											<Box>
												<Typography variant="caption" color="text.secondary">
													Partes
												</Typography>
												<Typography variant="body2" component="pre" sx={{ mt: 0.5 }}>
													{JSON.stringify(selectedFallo.partes, null, 2)}
												</Typography>
											</Box>
										)}
										{selectedFallo.expediente && (
											<Box>
												<Typography variant="caption" color="text.secondary">
													Expediente
												</Typography>
												<Typography variant="body2" component="pre" sx={{ mt: 0.5 }}>
													{JSON.stringify(selectedFallo.expediente, null, 2)}
												</Typography>
											</Box>
										)}
										{selectedFallo.clasificacion && (
											<Box>
												<Typography variant="caption" color="text.secondary">
													Clasificación
												</Typography>
												<Typography variant="body2" component="pre" sx={{ mt: 0.5 }}>
													{JSON.stringify(selectedFallo.clasificacion, null, 2)}
												</Typography>
											</Box>
										)}
									</Stack>
								</Card>
							)}

							{/* Comentarios */}
							{selectedFallo.comentarios && selectedFallo.comentarios.length > 0 && (
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Comentarios
									</Typography>
									<List>
										{selectedFallo.comentarios.map((comentario, index) => (
											<Box key={index}>
												<ListItem>
													<ListItemText
														primary={comentario.texto}
														secondary={
															<>
																<Typography component="span" variant="body2" color="text.primary">
																	{comentario.autor}
																</Typography>
																{comentario.fecha && ` - ${formatDate(comentario.fecha)}`}
															</>
														}
													/>
												</ListItem>
												{index < (selectedFallo.comentarios?.length || 0) - 1 && <Divider />}
											</Box>
										))}
									</List>
								</Card>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDetallesModal}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default Jurisprudencia;
