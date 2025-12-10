import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	InputAdornment,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	Alert,
	Autocomplete,
	Tabs,
	Tab,
} from "@mui/material";
import { Add, CloseCircle, Trash, SearchNormal1, UserAdd, People, UserRemove, Category2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import discountsService, { TargetUser, TargetSegment } from "api/discounts";
import { SegmentService } from "store/reducers/segments";
import { Segment } from "types/segment";

interface TargetUsersManagerProps {
	discountId: string;
	discountCode: string;
	isPublic: boolean;
	onUpdate?: () => void;
}

const TargetUsersManager = ({ discountId, discountCode, isPublic, onUpdate }: TargetUsersManagerProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [targetUsers, setTargetUsers] = useState<TargetUser[]>([]);
	const [totalTargetUsers, setTotalTargetUsers] = useState(0);
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [addByEmailDialogOpen, setAddByEmailDialogOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<TargetUser[]>([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<TargetUser[]>([]);
	const [emailsToAdd, setEmailsToAdd] = useState("");
	const [addLoading, setAddLoading] = useState(false);
	const [removeLoading, setRemoveLoading] = useState<string | null>(null);

	// Segments state
	const [targetSegments, setTargetSegments] = useState<TargetSegment[]>([]);
	const [totalTargetSegments, setTotalTargetSegments] = useState(0);
	const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
	const [loadingSegments, setLoadingSegments] = useState(false);
	const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
	const [selectedSegments, setSelectedSegments] = useState<Segment[]>([]);
	const [savingSegments, setSavingSegments] = useState(false);

	const fetchTargetUsers = useCallback(async () => {
		try {
			setLoading(true);
			const response = await discountsService.getTargetUsers(discountId);
			setTargetUsers(response.data.targetUsers);
			setTotalTargetUsers(response.data.totalTargetUsers);
		} catch (error: any) {
			console.error("Error fetching target users:", error);
			enqueueSnackbar(error.message || "Error al cargar usuarios objetivo", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [discountId, enqueueSnackbar]);

	// Fetch target segments
	const fetchTargetSegments = useCallback(async () => {
		try {
			const response = await discountsService.getTargetSegments(discountId);
			setTargetSegments(response.data.targetSegments);
			setTotalTargetSegments(response.data.totalTargetSegments);
		} catch (error: any) {
			console.error("Error fetching target segments:", error);
		}
	}, [discountId]);

	// Load available segments from marketing API
	const loadAvailableSegments = useCallback(async () => {
		try {
			setLoadingSegments(true);
			const response = await SegmentService.getSegments(1, 100, "name", "asc", { isActive: true });
			if (response.success && response.data) {
				setAvailableSegments(response.data);
			}
		} catch (error) {
			console.error("Error loading segments:", error);
		} finally {
			setLoadingSegments(false);
		}
	}, []);

	useEffect(() => {
		fetchTargetUsers();
		fetchTargetSegments();
	}, [fetchTargetUsers, fetchTargetSegments]);

	// Search users with debounce
	useEffect(() => {
		if (searchQuery.length < 2) {
			setSearchResults([]);
			return;
		}

		const debounceTimer = setTimeout(async () => {
			setSearchLoading(true);
			try {
				const response = await discountsService.searchUsers(searchQuery, 20);
				// Filter out users that are already in targetUsers
				const existingIds = targetUsers.map((u) => u._id);
				const filteredResults = response.data.filter((u) => !existingIds.includes(u._id));
				setSearchResults(filteredResults);
			} catch (error: any) {
				console.error("Error searching users:", error);
			} finally {
				setSearchLoading(false);
			}
		}, 300);

		return () => clearTimeout(debounceTimer);
	}, [searchQuery, targetUsers]);

	const handleAddUsers = async () => {
		if (selectedUsers.length === 0) return;

		setAddLoading(true);
		try {
			const userIds = selectedUsers.map((u) => u._id);
			const response = await discountsService.addTargetUsers(discountId, { userIds });
			enqueueSnackbar(response.message, { variant: "success" });
			setSelectedUsers([]);
			setSearchQuery("");
			setAddDialogOpen(false);
			fetchTargetUsers();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al agregar usuarios", { variant: "error" });
		} finally {
			setAddLoading(false);
		}
	};

	const handleAddByEmails = async () => {
		const emails = emailsToAdd
			.split(/[,\n]/)
			.map((e) => e.trim().toLowerCase())
			.filter((e) => e.length > 0 && e.includes("@"));

		if (emails.length === 0) {
			enqueueSnackbar("No se encontraron emails válidos", { variant: "warning" });
			return;
		}

		setAddLoading(true);
		try {
			const response = await discountsService.addTargetUsers(discountId, { emails });
			let message = response.message;
			if (response.data.notFoundEmails && response.data.notFoundEmails.length > 0) {
				message += ` (${response.data.notFoundEmails.length} emails no encontrados)`;
			}
			enqueueSnackbar(message, {
				variant: response.data.added > 0 ? "success" : "warning",
			});
			setEmailsToAdd("");
			setAddByEmailDialogOpen(false);
			fetchTargetUsers();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al agregar usuarios", { variant: "error" });
		} finally {
			setAddLoading(false);
		}
	};

	const handleRemoveUser = async (user: TargetUser) => {
		setRemoveLoading(user._id);
		try {
			const response = await discountsService.removeTargetUsers(discountId, { userIds: [user._id] });
			enqueueSnackbar(response.message, { variant: "success" });
			fetchTargetUsers();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al eliminar usuario", { variant: "error" });
		} finally {
			setRemoveLoading(null);
		}
	};

	const handleClearAllUsers = async () => {
		if (!window.confirm("¿Estás seguro de eliminar todos los usuarios objetivo? El descuento quedará disponible para todos.")) {
			return;
		}

		setAddLoading(true);
		try {
			const response = await discountsService.setTargetUsers(discountId, { userIds: [] });
			enqueueSnackbar(response.message, { variant: "success" });
			fetchTargetUsers();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al limpiar usuarios", { variant: "error" });
		} finally {
			setAddLoading(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Segment handlers
	const handleOpenSegmentDialog = async () => {
		setSegmentDialogOpen(true);
		await loadAvailableSegments();
		// Pre-select current segments
		const currentIds = targetSegments.map((s) => s._id);
		const preSelected = availableSegments.filter((s) => s._id && currentIds.includes(s._id));
		setSelectedSegments(preSelected);
	};

	const handleSaveSegments = async () => {
		setSavingSegments(true);
		try {
			const segmentIds = selectedSegments.map((s) => s._id!).filter(Boolean);
			const response = await discountsService.setTargetSegments(discountId, segmentIds);
			enqueueSnackbar(response.message, { variant: "success" });
			setSegmentDialogOpen(false);
			fetchTargetSegments();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar segmentos", { variant: "error" });
		} finally {
			setSavingSegments(false);
		}
	};

	const handleRemoveSegment = async (segmentId: string) => {
		setSavingSegments(true);
		try {
			const newSegmentIds = targetSegments.filter((s) => s._id !== segmentId).map((s) => s._id);
			const response = await discountsService.setTargetSegments(discountId, newSegmentIds);
			enqueueSnackbar(response.message, { variant: "success" });
			fetchTargetSegments();
			onUpdate?.();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al eliminar segmento", { variant: "error" });
		} finally {
			setSavingSegments(false);
		}
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" py={4}>
				<CircularProgress />
			</Box>
		);
	}

	// Check if discount has any targeting configured
	const hasTargeting = totalTargetUsers > 0 || totalTargetSegments > 0;

	return (
		<Box>
			{/* Summary Alert */}
			{!hasTargeting ? (
				<Alert severity="info" sx={{ mb: 2 }}>
					Este descuento está disponible para <strong>todos los usuarios</strong>. Agrega usuarios específicos o segmentos para restringir el acceso.
				</Alert>
			) : (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Este descuento está restringido a{" "}
					{totalTargetUsers > 0 && <strong>{totalTargetUsers} usuario(s)</strong>}
					{totalTargetUsers > 0 && totalTargetSegments > 0 && " y "}
					{totalTargetSegments > 0 && <strong>{totalTargetSegments} segmento(s)</strong>}
					. Solo los usuarios que cumplan alguna de estas condiciones podrán ver el código <strong>{discountCode}</strong>.
				</Alert>
			)}

			{/* Tabs */}
			<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
				<Tab
					label={
						<Stack direction="row" spacing={1} alignItems="center">
							<People size={18} />
							<span>Usuarios</span>
							{totalTargetUsers > 0 && <Chip label={totalTargetUsers} size="small" color="primary" />}
						</Stack>
					}
				/>
				<Tab
					label={
						<Stack direction="row" spacing={1} alignItems="center">
							<Category2 size={18} />
							<span>Segmentos</span>
							{totalTargetSegments > 0 && <Chip label={totalTargetSegments} size="small" color="secondary" />}
						</Stack>
					}
				/>
			</Tabs>

			{/* Users Tab */}
			{activeTab === 0 && (
				<Box>
					{/* Users Header */}
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" color="text.secondary">
							Usuarios específicos que pueden ver este descuento
						</Typography>
						<Stack direction="row" spacing={1}>
							<Button variant="outlined" size="small" startIcon={<UserAdd size={18} />} onClick={() => setAddDialogOpen(true)}>
								Buscar Usuario
							</Button>
							<Button variant="outlined" size="small" startIcon={<Add size={18} />} onClick={() => setAddByEmailDialogOpen(true)}>
								Agregar por Email
							</Button>
							{totalTargetUsers > 0 && (
								<Button
									variant="outlined"
									size="small"
									color="warning"
									startIcon={<UserRemove size={18} />}
									onClick={handleClearAllUsers}
									disabled={addLoading}
								>
									Limpiar Todos
								</Button>
							)}
						</Stack>
					</Stack>

					{/* Users Table */}
					{targetUsers.length > 0 ? (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Email</TableCell>
										<TableCell>Nombre</TableCell>
										<TableCell align="center">Registrado</TableCell>
										<TableCell align="center" width={80}>
											Acciones
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{targetUsers.map((user) => (
										<TableRow key={user._id} hover>
											<TableCell>
												<Typography variant="body2">{user.email}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2">{user.fullName || "-"}</Typography>
											</TableCell>
											<TableCell align="center">
												<Typography variant="caption">{formatDate(user.createdAt)}</Typography>
											</TableCell>
											<TableCell align="center">
												<Tooltip title="Quitar del descuento">
													<IconButton
														size="small"
														color="error"
														onClick={() => handleRemoveUser(user)}
														disabled={removeLoading === user._id}
													>
														{removeLoading === user._id ? <CircularProgress size={18} /> : <Trash size={18} />}
													</IconButton>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
							<Typography color="text.secondary">No hay usuarios específicos configurados</Typography>
						</Paper>
					)}
				</Box>
			)}

			{/* Segments Tab */}
			{activeTab === 1 && (
				<Box>
					{/* Segments Header */}
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" color="text.secondary">
							Segmentos de contactos cuyos usuarios pueden ver este descuento
						</Typography>
						<Button variant="outlined" size="small" startIcon={<Add size={18} />} onClick={handleOpenSegmentDialog}>
							Gestionar Segmentos
						</Button>
					</Stack>

					{/* Segments List */}
					{targetSegments.length > 0 ? (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Nombre</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell align="center">Contactos Est.</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell align="center" width={80}>
											Acciones
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{targetSegments.map((segment) => (
										<TableRow key={segment._id} hover>
											<TableCell>
												<Typography variant="body2">{segment.name}</Typography>
												{segment.description && (
													<Typography variant="caption" color="text.secondary">
														{segment.description}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Chip
													label={segment.type === "static" ? "Estático" : "Dinámico"}
													size="small"
													color={segment.type === "static" ? "primary" : "secondary"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell align="center">
												<Typography variant="body2">{segment.estimatedCount}</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={segment.isActive ? "Activo" : "Inactivo"}
													size="small"
													color={segment.isActive ? "success" : "default"}
												/>
											</TableCell>
											<TableCell align="center">
												<Tooltip title="Quitar segmento">
													<IconButton
														size="small"
														color="error"
														onClick={() => handleRemoveSegment(segment._id)}
														disabled={savingSegments}
													>
														{savingSegments ? <CircularProgress size={18} /> : <Trash size={18} />}
													</IconButton>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					) : (
						<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
							<Typography color="text.secondary">No hay segmentos configurados</Typography>
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
								Agrega segmentos para que los usuarios pertenecientes a ellos puedan ver el descuento
							</Typography>
						</Paper>
					)}
				</Box>
			)}

			{/* Add Users Dialog - Search */}
			<Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Buscar y Agregar Usuarios</Typography>
						<IconButton size="small" onClick={() => setAddDialogOpen(false)}>
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					<Autocomplete
						multiple
						options={searchResults}
						value={selectedUsers}
						onChange={(_, newValue) => setSelectedUsers(newValue)}
						getOptionLabel={(option) => `${option.email} (${option.fullName || "Sin nombre"})`}
						isOptionEqualToValue={(option, value) => option._id === value._id}
						loading={searchLoading}
						inputValue={searchQuery}
						onInputChange={(_, value) => setSearchQuery(value)}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Buscar por email o nombre"
								placeholder="Escribe al menos 2 caracteres..."
								InputProps={{
									...params.InputProps,
									startAdornment: (
										<>
											<InputAdornment position="start">
												<SearchNormal1 size={20} />
											</InputAdornment>
											{params.InputProps.startAdornment}
										</>
									),
									endAdornment: (
										<>
											{searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
											{params.InputProps.endAdornment}
										</>
									),
								}}
							/>
						)}
						renderOption={(props, option) => (
							<li {...props} key={option._id}>
								<Stack>
									<Typography variant="body2">{option.email}</Typography>
									<Typography variant="caption" color="textSecondary">
										{option.fullName || "Sin nombre"}
									</Typography>
								</Stack>
							</li>
						)}
						renderTags={(value, getTagProps) =>
							value.map((option, index) => (
								<Chip {...getTagProps({ index })} key={option._id} label={option.email} size="small" />
							))
						}
						noOptionsText={searchQuery.length < 2 ? "Escribe para buscar..." : "No se encontraron usuarios"}
					/>

					{selectedUsers.length > 0 && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="subtitle2" gutterBottom>
								Usuarios seleccionados: {selectedUsers.length}
							</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleAddUsers}
						disabled={selectedUsers.length === 0 || addLoading}
						startIcon={addLoading ? <CircularProgress size={18} /> : <UserAdd size={18} />}
					>
						Agregar {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ""}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Add Users Dialog - By Email */}
			<Dialog open={addByEmailDialogOpen} onClose={() => setAddByEmailDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Agregar Usuarios por Email</Typography>
						<IconButton size="small" onClick={() => setAddByEmailDialogOpen(false)}>
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
						Ingresa los emails de los usuarios que deseas agregar, separados por comas o en líneas separadas. Solo se agregarán
						usuarios que ya existan en el sistema.
					</Typography>
					<TextField
						fullWidth
						multiline
						rows={6}
						label="Emails"
						placeholder="usuario1@email.com, usuario2@email.com&#10;o uno por línea..."
						value={emailsToAdd}
						onChange={(e) => setEmailsToAdd(e.target.value)}
					/>
					{emailsToAdd && (
						<Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
							{
								emailsToAdd
									.split(/[,\n]/)
									.map((e) => e.trim())
									.filter((e) => e.includes("@")).length
							}{" "}
							email(s) detectados
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddByEmailDialogOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleAddByEmails}
						disabled={!emailsToAdd.includes("@") || addLoading}
						startIcon={addLoading ? <CircularProgress size={18} /> : <Add size={18} />}
					>
						Agregar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Segments Dialog */}
			<Dialog open={segmentDialogOpen} onClose={() => setSegmentDialogOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Gestionar Segmentos</Typography>
						<IconButton size="small" onClick={() => setSegmentDialogOpen(false)}>
							<CloseCircle size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent dividers>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
						Selecciona los segmentos de contactos. Los usuarios cuyo email coincida con un contacto de estos segmentos podrán ver
						el descuento.
					</Typography>
					<Autocomplete
						multiple
						options={availableSegments.filter((s) => s._id)}
						value={selectedSegments}
						onChange={(_, newValue) => setSelectedSegments(newValue)}
						getOptionLabel={(option) =>
							`${option.name} (${option.type === "static" ? "Estático" : "Dinámico"} - ${option.estimatedCount} contactos)`
						}
						isOptionEqualToValue={(option, value) => option._id === value._id}
						loading={loadingSegments}
						renderInput={(params) => (
							<TextField
								{...params}
								label="Segmentos"
								placeholder={selectedSegments.length === 0 ? "Seleccionar segmentos..." : ""}
								InputProps={{
									...params.InputProps,
									endAdornment: (
										<>
											{loadingSegments ? <CircularProgress color="inherit" size={20} /> : null}
											{params.InputProps.endAdornment}
										</>
									),
								}}
							/>
						)}
						renderTags={(value, getTagProps) =>
							value.map((option, index) => (
								<Chip
									{...getTagProps({ index })}
									key={option._id || index}
									label={option.name}
									size="small"
									color={option.type === "static" ? "primary" : "secondary"}
								/>
							))
						}
						noOptionsText={loadingSegments ? "Cargando..." : "No hay segmentos disponibles"}
					/>
					{selectedSegments.length > 0 && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="subtitle2" gutterBottom>
								Segmentos seleccionados: {selectedSegments.length}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Total estimado: {selectedSegments.reduce((acc, s) => acc + s.estimatedCount, 0)} contactos
							</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setSegmentDialogOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleSaveSegments}
						disabled={savingSegments}
						startIcon={savingSegments ? <CircularProgress size={18} /> : <Category2 size={18} />}
					>
						Guardar Segmentos
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default TargetUsersManager;
