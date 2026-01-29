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
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import FoldersService, { Folder, FolderStats } from "api/folders";
import { Refresh, Eye, SearchNormal1, CloseCircle, ArrowUp, ArrowDown, TickCircle, CloseSquare, Folder2, Archive, Edit2 } from "iconsax-react";
import CausaDetalleModal from "../causas/CausaDetalleModal";
import FolderEditModal from "./FolderEditModal";

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
	Civil: "Civil",
	Comercial: "Comercial",
	"Seguridad Social": "Seguridad Social",
	Trabajo: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
	Civil: "primary",
	Comercial: "success",
	"Seguridad Social": "warning",
	Trabajo: "error",
};

// Mapeo de colores por status
const STATUS_COLORS: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
	Nueva: "primary",
	"En Proceso": "warning",
	Cerrada: "success",
	Pendiente: "error",
};

const FoldersPage = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [folders, setFolders] = useState<Folder[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [totalCount, setTotalCount] = useState(0);
	const [stats, setStats] = useState<FolderStats | null>(null);

	// Filtros
	const [searchText, setSearchText] = useState<string>("");
	const [statusFilter, setStatusFilter] = useState<string>("todos");
	const [archivedFilter, setArchivedFilter] = useState<string>("todos");
	const [typeFilter, setTypeFilter] = useState<string>("todos");
	const [fueroFilter, setFueroFilter] = useState<string>("todos");

	// Ordenamiento
	const [sortBy, setSortBy] = useState<string>("updatedAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Modal de causa
	const [selectedCausa, setSelectedCausa] = useState<any>(null);
	const [causaModalOpen, setCausaModalOpen] = useState(false);
	const [loadingCausa, setLoadingCausa] = useState(false);

	// Modal de edición de folder
	const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);

	// Cargar carpetas
	const fetchFolders = async () => {
		try {
			setLoading(true);

			const filters: any = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy,
				sortOrder,
			};

			if (searchText.trim()) {
				filters.search = searchText.trim();
			}

			if (statusFilter !== "todos") {
				filters.status = statusFilter;
			}

			if (archivedFilter !== "todos") {
				filters.archived = archivedFilter === "true";
			}

			if (typeFilter === "pjn") {
				filters.pjn = true;
			} else if (typeFilter === "mev") {
				filters.mev = true;
			}

			if (fueroFilter !== "todos") {
				filters.fuero = fueroFilter;
			}

			const response = await FoldersService.getFolders(filters);

			if (response.success) {
				setFolders(response.data);
				setTotalCount(response.pagination.total);
				setStats(response.stats);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las carpetas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Cargar estadísticas globales
	const fetchStats = async () => {
		try {
			const response = await FoldersService.getFoldersStats();
			if (response.success) {
				setStats(response.data);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	};

	// Efecto para cargar datos
	useEffect(() => {
		fetchFolders();
	}, [page, rowsPerPage, sortBy, sortOrder, statusFilter, archivedFilter, typeFilter, fueroFilter]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Handler de búsqueda
	const handleSearch = () => {
		setPage(0);
		fetchFolders();
	};

	// Handler de limpiar búsqueda
	const handleClearSearch = () => {
		setSearchText("");
		setStatusFilter("todos");
		setArchivedFilter("todos");
		setTypeFilter("todos");
		setFueroFilter("todos");
		setPage(0);
	};

	// Handler de cambio de ordenamiento
	const handleSortChange = (event: any) => {
		setSortBy(event.target.value);
		setPage(0);
	};

	const handleSortOrderChange = () => {
		setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		setPage(0);
	};

	// Handler de refresh
	const handleRefresh = () => {
		fetchFolders();
	};

	// Formatear fecha
	const formatDate = (date: string | undefined): string => {
		if (!date) return "N/A";
		return new Date(date).toLocaleDateString("es-AR");
	};

	// Ver causa vinculada
	const handleViewCausa = async (folder: Folder) => {
		if (!folder.causaId) {
			enqueueSnackbar("Esta carpeta no tiene una causa vinculada", {
				variant: "info",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setLoadingCausa(true);
			const response = await FoldersService.getFolderCausa(folder._id);

			if (response.success && response.data) {
				setSelectedCausa(response.data);
				setCausaModalOpen(true);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar los detalles de la causa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoadingCausa(false);
		}
	};

	// Cerrar modal de causa
	const handleCloseCausaModal = () => {
		setCausaModalOpen(false);
		setSelectedCausa(null);
	};

	// Abrir modal de edición
	const handleEditFolder = (folder: Folder) => {
		setSelectedFolder(folder);
		setEditModalOpen(true);
	};

	// Cerrar modal de edición
	const handleCloseEditModal = () => {
		setEditModalOpen(false);
		setSelectedFolder(null);
	};

	// Obtener tipo de sistema (PJN, MEV, Manual)
	const getSystemType = (folder: Folder): { label: string; color: "primary" | "secondary" | "default" } => {
		if (folder.pjn) return { label: "PJN", color: "primary" };
		if (folder.mev) return { label: "MEV", color: "secondary" };
		return { label: "Manual", color: "default" };
	};

	// Obtener API service para el modal de causa
	const getCausaApiService = (folder: Folder): "pjn" | "mev" | "workers" => {
		if (folder.mev) return "mev";
		return "pjn";
	};

	return (
		<MainCard title="Carpetas (App)">
			{/* Estadísticas */}
			{stats && (
				<Box sx={{ mb: 3 }}>
					<Grid container spacing={2}>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										Total
									</Typography>
									<Typography variant="h5" color="primary.main" fontWeight="bold">
										{stats.total}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										Activas
									</Typography>
									<Typography variant="h5" color="success.main" fontWeight="bold">
										{stats.active}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										PJN
									</Typography>
									<Typography variant="h5" color="warning.main" fontWeight="bold">
										{stats.pjn}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "secondary.lighter", border: 1, borderColor: "secondary.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										MEV
									</Typography>
									<Typography variant="h5" color="secondary.main" fontWeight="bold">
										{stats.mev}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "info.lighter", border: 1, borderColor: "info.main" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										Con Causa
									</Typography>
									<Typography variant="h5" color="info.main" fontWeight="bold">
										{stats.withCausa}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<Card sx={{ backgroundColor: "grey.100", border: 1, borderColor: "grey.300" }}>
								<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
									<Typography variant="caption" color="text.secondary">
										Archivadas
									</Typography>
									<Typography variant="h5" color="text.secondary" fontWeight="bold">
										{stats.archived}
									</Typography>
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</Box>
			)}

			<Grid container spacing={3}>
				{/* Filtros */}
				<Grid item xs={12}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={4} lg={3}>
							<TextField
								fullWidth
								label="Buscar"
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								size="small"
								placeholder="Nombre, materia, expediente..."
								onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							/>
						</Grid>
						<Grid item xs={6} md={2} lg={1.5}>
							<FormControl fullWidth>
								<InputLabel>Estado</InputLabel>
								<Select
									value={statusFilter}
									onChange={(e) => {
										setStatusFilter(e.target.value);
										setPage(0);
									}}
									label="Estado"
									size="small"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="Nueva">Nueva</MenuItem>
									<MenuItem value="En Proceso">En Proceso</MenuItem>
									<MenuItem value="Cerrada">Cerrada</MenuItem>
									<MenuItem value="Pendiente">Pendiente</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={2} lg={1.5}>
							<FormControl fullWidth>
								<InputLabel>Archivada</InputLabel>
								<Select
									value={archivedFilter}
									onChange={(e) => {
										setArchivedFilter(e.target.value);
										setPage(0);
									}}
									label="Archivada"
									size="small"
								>
									<MenuItem value="todos">Todas</MenuItem>
									<MenuItem value="false">Activas</MenuItem>
									<MenuItem value="true">Archivadas</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={2} lg={1.5}>
							<FormControl fullWidth>
								<InputLabel>Sistema</InputLabel>
								<Select
									value={typeFilter}
									onChange={(e) => {
										setTypeFilter(e.target.value);
										setPage(0);
									}}
									label="Sistema"
									size="small"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="pjn">PJN</MenuItem>
									<MenuItem value="mev">MEV</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={2} lg={1.5}>
							<FormControl fullWidth>
								<InputLabel>Fuero</InputLabel>
								<Select
									value={fueroFilter}
									onChange={(e) => {
										setFueroFilter(e.target.value);
										setPage(0);
									}}
									label="Fuero"
									size="small"
								>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="Civil">Civil</MenuItem>
									<MenuItem value="Comercial">Comercial</MenuItem>
									<MenuItem value="Trabajo">Trabajo</MenuItem>
									<MenuItem value="Seguridad Social">Seg. Social</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={4} lg={3}>
							<FormControl fullWidth>
								<InputLabel>Ordenar por</InputLabel>
								<Select value={sortBy} onChange={handleSortChange} label="Ordenar por" size="small">
									<MenuItem value="updatedAt">Última actualización</MenuItem>
									<MenuItem value="createdAt">Fecha de creación</MenuItem>
									<MenuItem value="folderName">Nombre</MenuItem>
									<MenuItem value="materia">Materia</MenuItem>
									<MenuItem value="status">Estado</MenuItem>
								</Select>
							</FormControl>
						</Grid>
					</Grid>
				</Grid>

				{/* Acciones */}
				<Grid item xs={12}>
					<Stack direction="row" spacing={1}>
						<Button variant="outlined" startIcon={sortOrder === "asc" ? <ArrowUp size={18} /> : <ArrowDown size={18} />} onClick={handleSortOrderChange} disabled={loading} size="small">
							{sortOrder === "asc" ? "Ascendente" : "Descendente"}
						</Button>
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

				{/* Tabla */}
				<Grid item xs={12}>
					{loading ? (
						<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
							<CircularProgress />
						</Box>
					) : folders.length === 0 ? (
						<Alert severity="info">No se encontraron carpetas con los filtros seleccionados</Alert>
					) : (
						<Card>
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Nombre</TableCell>
											<TableCell>Usuario</TableCell>
											<TableCell>Materia</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell>Sistema</TableCell>
											<TableCell>Fuero</TableCell>
											<TableCell>Jurisdicción</TableCell>
											<TableCell>Juzgado</TableCell>
											<TableCell>Expediente</TableCell>
											<TableCell align="center">Causa</TableCell>
											<TableCell align="center">Verificada</TableCell>
											<TableCell>Actualización</TableCell>
											<TableCell align="center">Acciones</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{folders.map((folder) => {
											const systemType = getSystemType(folder);
											return (
												<TableRow key={folder._id} hover>
													<TableCell sx={{ maxWidth: 200 }}>
														<Stack direction="row" alignItems="center" spacing={1}>
															{folder.archived && (
																<Tooltip title="Archivada">
																	<Archive size={16} color="#9e9e9e" />
																</Tooltip>
															)}
															<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
																{folder.folderName}
															</Typography>
														</Stack>
													</TableCell>
													<TableCell sx={{ maxWidth: 150 }}>
														<Typography variant="caption" sx={{ wordBreak: "break-all" }}>
															{folder.user?.email || "N/A"}
														</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
															{folder.materia}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip label={folder.status} color={STATUS_COLORS[folder.status] || "default"} size="small" variant="outlined" />
													</TableCell>
													<TableCell>
														<Chip label={systemType.label} color={systemType.color} size="small" />
													</TableCell>
													<TableCell>
														{folder.folderFuero ? (
															<Chip
																label={FUERO_LABELS[folder.folderFuero] || folder.folderFuero}
																color={FUERO_COLORS[folder.folderFuero] || "default"}
																size="small"
																variant="outlined"
															/>
														) : (
															<Typography variant="caption" color="text.secondary">
																-
															</Typography>
														)}
													</TableCell>
													<TableCell>
														<Typography variant="caption">{folder.folderJuris?.label || "-"}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="caption">{folder.judFolder?.courtNumber || folder.judFolder?.statusJudFolder || "-"}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="caption">{folder.judFolder?.numberJudFolder || "-"}</Typography>
													</TableCell>
													<TableCell align="center">
														{folder.causaId ? (
															<Tooltip title="Ver causa vinculada">
																<IconButton size="small" color="primary" onClick={() => handleViewCausa(folder)} disabled={loadingCausa}>
																	<Eye size={18} />
																</IconButton>
															</Tooltip>
														) : (
															<Typography variant="caption" color="text.secondary">
																-
															</Typography>
														)}
													</TableCell>
													<TableCell align="center">
														{folder.causaId ? (
															folder.causaVerified ? (
																<Tooltip title="Causa verificada">
																	<TickCircle size={20} color="#2e7d32" variant="Bold" />
																</Tooltip>
															) : (
																<Tooltip title="Causa no verificada">
																	<CloseSquare size={20} color="#d32f2f" variant="Bold" />
																</Tooltip>
															)
														) : (
															<Typography variant="caption" color="text.secondary">
																-
															</Typography>
														)}
													</TableCell>
													<TableCell>
														<Typography variant="caption">{formatDate(folder.updatedAt)}</Typography>
													</TableCell>
													<TableCell align="center">
														<Tooltip title="Editar carpeta">
															<IconButton
																size="small"
																color="warning"
																onClick={() => handleEditFolder(folder)}
															>
																<Edit2 size={18} />
															</IconButton>
														</Tooltip>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
							<TablePagination
								rowsPerPageOptions={[10, 20, 50, 100]}
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

			{/* Modal de Causa */}
			{selectedCausa && (
				<CausaDetalleModal
					open={causaModalOpen}
					onClose={handleCloseCausaModal}
					causa={selectedCausa}
					onCausaUpdated={handleRefresh}
					apiService={selectedCausa?.fuero ? "pjn" : "pjn"}
				/>
			)}

			{/* Modal de Edición de Folder */}
			<FolderEditModal
				open={editModalOpen}
				onClose={handleCloseEditModal}
				folder={selectedFolder}
				onFolderUpdated={handleRefresh}
			/>
		</MainCard>
	);
};

export default FoldersPage;
