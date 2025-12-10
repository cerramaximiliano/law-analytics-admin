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
} from "@mui/material";
import { Add, CloseCircle, Trash, SearchNormal1, UserAdd, People, UserRemove } from "iconsax-react";
import { useSnackbar } from "notistack";
import discountsService, { TargetUser } from "api/discounts";

interface TargetUsersManagerProps {
	discountId: string;
	discountCode: string;
	isPublic: boolean;
	onUpdate?: () => void;
}

const TargetUsersManager = ({ discountId, discountCode, isPublic, onUpdate }: TargetUsersManagerProps) => {
	const { enqueueSnackbar } = useSnackbar();
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

	useEffect(() => {
		fetchTargetUsers();
	}, [fetchTargetUsers]);

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

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" py={4}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
				<Stack direction="row" spacing={1} alignItems="center">
					<People size={24} />
					<Typography variant="h5">Usuarios Objetivo</Typography>
					<Chip
						label={totalTargetUsers === 0 ? "Todos los usuarios" : `${totalTargetUsers} usuarios`}
						color={totalTargetUsers === 0 ? "default" : "primary"}
						size="small"
					/>
				</Stack>
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

			{/* Info Alert */}
			{totalTargetUsers === 0 ? (
				<Alert severity="info" sx={{ mb: 2 }}>
					Este descuento está disponible para <strong>todos los usuarios</strong>. Agrega usuarios específicos para restringir el
					acceso.
				</Alert>
			) : (
				<Alert severity="warning" sx={{ mb: 2 }}>
					Este descuento está restringido a <strong>{totalTargetUsers} usuario(s) específico(s)</strong>. Solo ellos podrán ver y
					usar el código <strong>{discountCode}</strong>.
				</Alert>
			)}

			{/* Users Table */}
			{targetUsers.length > 0 && (
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
		</Box>
	);
};

export default TargetUsersManager;
