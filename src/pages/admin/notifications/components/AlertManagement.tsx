import React from "react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { dispatch, RootState } from "store";
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
	Tab,
	Tabs,
	TextField,
	Button,
	MenuItem,
	FormControlLabel,
	Switch,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	CircularProgress,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Checkbox,
	InputAdornment,
	TablePagination,
} from "@mui/material";
import {
	Notification,
	People,
	CloseCircle,
	Gift,
	MessageText1,
	Setting2,
	TableDocument,
	TaskSquare,
	CalendarRemove,
	SearchNormal,
} from "iconsax-react";
import { getUsers } from "store/reducers/users";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import notificationMonitoringService from "services/notificationMonitoringService";
import { openSnackbar } from "store/reducers/snackbar";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
}

const avatarIcons = [
	{ value: "Gift", label: "Regalo", icon: Gift },
	{ value: "MessageText1", label: "Mensaje", icon: MessageText1 },
	{ value: "Setting2", label: "Configuración", icon: Setting2 },
	{ value: "TableDocument", label: "Documento", icon: TableDocument },
	{ value: "TaskSquare", label: "Tarea", icon: TaskSquare },
	{ value: "CalendarRemove", label: "Calendario", icon: CalendarRemove },
];

const AlertManagement = () => {
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(false);
	const [resultDialog, setResultDialog] = useState(false);
	const [resultData, setResultData] = useState<any>(null);
	const [userSearchDialog, setUserSearchDialog] = useState(false);
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	const { users, loading: usersLoading } = useSelector((state: RootState) => state.users);

	// Custom Alert Form State
	const [customForm, setCustomForm] = useState({
		userIds: "",
		primaryText: "",
		secondaryText: "",
		actionText: "Ver detalles",
		avatarIcon: "MessageText1",
		expirationDate: null as Date | null,
		deliverImmediately: true,
		campaignName: "",
		campaignType: "notification",
		trackingId: "",
		sourceType: "custom" as "event" | "task" | "movement" | "system" | "marketing" | "custom",
		sourceId: "",
	});

	// Bulk Alert Form State
	const [bulkForm, setBulkForm] = useState({
		filterRole: "",
		filterActive: true,
		filterPlan: "",
		primaryText: "",
		secondaryText: "",
		actionText: "Ver más",
		avatarIcon: "Gift",
		expirationDate: null as Date | null,
		deliverImmediately: true,
		respectPreferences: true,
		testMode: false,
		limit: 100,
		campaignName: "",
		campaignType: "marketing",
		sourceType: "marketing" as "event" | "task" | "movement" | "system" | "marketing" | "custom",
		sourceId: "",
	});

	// Cleanup Form State
	const [cleanupForm, setCleanupForm] = useState({
		daysOld: 30,
		onlyDelivered: true,
		dryRun: true,
	});

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Load users when dialog opens
	useEffect(() => {
		if (userSearchDialog && (!users || users.length === 0)) {
			dispatch(getUsers());
		}
	}, [userSearchDialog, users]);

	const handleOpenUserSearch = () => {
		setUserSearchDialog(true);
	};

	const handleCloseUserSearch = () => {
		setUserSearchDialog(false);
	};

	const handleSelectUser = (userId: string) => {
		if (selectedUsers.includes(userId)) {
			setSelectedUsers(selectedUsers.filter((id) => id !== userId));
		} else {
			setSelectedUsers([...selectedUsers, userId]);
		}
	};

	const handleSelectAllUsers = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.checked) {
			const allUserIds = filteredUsers.map((user: any) => user._id || user.id);
			setSelectedUsers(allUserIds);
		} else {
			setSelectedUsers([]);
		}
	};

	const handleConfirmUserSelection = () => {
		const currentIds = customForm.userIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean);
		const newIds = [...new Set([...currentIds, ...selectedUsers])].join(", ");
		setCustomForm({ ...customForm, userIds: newIds });
		setUserSearchDialog(false);
		setSelectedUsers([]);
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Filter users based on search term
	const filteredUsers =
		users?.filter((user: any) => {
			const searchLower = searchTerm.toLowerCase();
			return (
				user.name?.toLowerCase().includes(searchLower) ||
				user.email?.toLowerCase().includes(searchLower) ||
				user.role?.toLowerCase().includes(searchLower)
			);
		}) || [];

	// Paginated users
	const paginatedUsers = filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

	const handleCreateCustomAlerts = async () => {
		try {
			setLoading(true);
			const userIds = customForm.userIds
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean);

			if (userIds.length === 0) {
				dispatch(
					openSnackbar({
						open: true,
						message: "Debe ingresar al menos un ID de usuario",
						variant: "alert",
						alert: { color: "error" },
						close: true,
					}),
				);
				setLoading(false);
				return;
			}

			const data = {
				userIds,
				alert: {
					primaryText: customForm.primaryText || undefined,
					secondaryText: customForm.secondaryText,
					actionText: customForm.actionText,
					avatarIcon: customForm.avatarIcon,
					expirationDate: customForm.expirationDate?.toISOString(),
					sourceType: customForm.sourceType,
					sourceId: customForm.sourceId || undefined,
				},
				deliverImmediately: customForm.deliverImmediately,
				campaign: customForm.campaignName
					? {
							name: customForm.campaignName,
							type: customForm.campaignType,
							trackingId: customForm.trackingId || undefined,
					  }
					: undefined,
			};

			const result = await notificationMonitoringService.createCustomAlerts(data);
			setResultData(result);
			setResultDialog(true);

			dispatch(
				openSnackbar({
					open: true,
					message: `Alertas creadas: ${result.summary?.created || 0}`,
					variant: "alert",
					alert: { color: "success" },
					close: true,
				}),
			);

			// Reset form
			setCustomForm({
				userIds: "",
				primaryText: "",
				secondaryText: "",
				actionText: "Ver detalles",
				avatarIcon: "MessageText1",
				expirationDate: null,
				deliverImmediately: true,
				campaignName: "",
				campaignType: "notification",
				trackingId: "",
				sourceType: "custom",
				sourceId: "",
			});
		} catch (error) {
			console.error("Error creating custom alerts:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: "Error al crear las alertas",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCreateBulkAlerts = async () => {
		try {
			setLoading(true);

			const filter: any = {};
			if (bulkForm.filterRole) filter.role = bulkForm.filterRole;
			filter.active = bulkForm.filterActive;
			if (bulkForm.filterPlan) filter.subscriptionPlan = bulkForm.filterPlan;

			const data = {
				filter: Object.keys(filter).length > 0 ? filter : undefined,
				template: {
					primaryText: bulkForm.primaryText || undefined,
					secondaryText: bulkForm.secondaryText,
					actionText: bulkForm.actionText,
					avatarIcon: bulkForm.avatarIcon,
					expirationDate: bulkForm.expirationDate?.toISOString(),
					sourceType: bulkForm.sourceType,
					sourceId: bulkForm.sourceId || undefined,
				},
				options: {
					deliverImmediately: bulkForm.deliverImmediately,
					respectNotificationPreferences: bulkForm.respectPreferences,
					testMode: bulkForm.testMode,
					limit: bulkForm.limit,
				},
				campaign: bulkForm.campaignName
					? {
							name: bulkForm.campaignName,
							type: bulkForm.campaignType,
					  }
					: undefined,
			};

			const result = await notificationMonitoringService.createBulkAlerts(data);
			setResultData(result);
			setResultDialog(true);

			dispatch(
				openSnackbar({
					open: true,
					message: `Alertas ${bulkForm.testMode ? "simuladas" : "creadas"}: ${result.summary?.total || 0}`,
					variant: "alert",
					alert: { color: "success" },
					close: true,
				}),
			);
		} catch (error) {
			console.error("Error creating bulk alerts:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: "Error al crear las alertas masivas",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleCleanupAlerts = async () => {
		try {
			setLoading(true);
			const result = await notificationMonitoringService.cleanupAlerts(cleanupForm);

			dispatch(
				openSnackbar({
					open: true,
					message: cleanupForm.dryRun ? `Se eliminarían ${result.count || 0} alertas` : `Se eliminaron ${result.count || 0} alertas`,
					variant: "alert",
					alert: { color: cleanupForm.dryRun ? "info" : "success" },
					close: true,
				}),
			);
		} catch (error) {
			console.error("Error cleaning up alerts:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: "Error al limpiar las alertas",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={activeTab} onChange={handleTabChange}>
					<Tab icon={<Notification size={20} />} iconPosition="start" label="Alertas Personalizadas" />
					<Tab icon={<People size={20} />} iconPosition="start" label="Alertas Masivas" />
					<Tab icon={<CloseCircle size={20} />} iconPosition="start" label="Limpieza" />
				</Tabs>
			</Box>

			{/* Custom Alerts Tab */}
			<TabPanel value={activeTab} index={0}>
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					<Grid item xs={12}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Crear Alertas Personalizadas
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
									Envía alertas específicas a usuarios seleccionados
								</Typography>

								<Grid container spacing={2}>
									<Grid item xs={12}>
										<TextField
											fullWidth
											label="IDs de Usuarios (separados por coma)"
											value={customForm.userIds}
											onChange={(e) => setCustomForm({ ...customForm, userIds: e.target.value })}
											helperText="Ejemplo: 647b7a2b7b6aad33b30b8de7, 647b7a2b7b6aad33b30b8de8"
											InputProps={{
												endAdornment: (
													<InputAdornment position="end">
														<IconButton onClick={handleOpenUserSearch} edge="end" title="Buscar usuarios">
															<SearchNormal size={20} />
														</IconButton>
													</InputAdornment>
												),
											}}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Título Principal (opcional)"
											value={customForm.primaryText}
											onChange={(e) => setCustomForm({ ...customForm, primaryText: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											select
											label="Ícono"
											value={customForm.avatarIcon}
											onChange={(e) => setCustomForm({ ...customForm, avatarIcon: e.target.value })}
										>
											{avatarIcons.map((icon) => (
												<MenuItem key={icon.value} value={icon.value}>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<icon.icon size={20} />
														{icon.label}
													</Box>
												</MenuItem>
											))}
										</TextField>
									</Grid>

									<Grid item xs={12}>
										<TextField
											fullWidth
											label="Mensaje Principal"
											required
											multiline
											rows={2}
											value={customForm.secondaryText}
											onChange={(e) => setCustomForm({ ...customForm, secondaryText: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Texto de Acción"
											required
											value={customForm.actionText}
											onChange={(e) => setCustomForm({ ...customForm, actionText: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<DateTimePicker
											label="Fecha de Expiración"
											value={customForm.expirationDate}
											onChange={(date) => setCustomForm({ ...customForm, expirationDate: date })}
											slotProps={{ textField: { fullWidth: true } }}
										/>
									</Grid>

									<Grid item xs={12}>
										<FormControlLabel
											control={
												<Switch
													checked={customForm.deliverImmediately}
													onChange={(e) => setCustomForm({ ...customForm, deliverImmediately: e.target.checked })}
												/>
											}
											label="Entregar inmediatamente (si el usuario está conectado)"
										/>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom>
											Información de Campaña (opcional)
										</Typography>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											label="Nombre de Campaña"
											value={customForm.campaignName}
											onChange={(e) => setCustomForm({ ...customForm, campaignName: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											select
											label="Tipo de Campaña"
											value={customForm.campaignType}
											onChange={(e) => setCustomForm({ ...customForm, campaignType: e.target.value })}
										>
											<MenuItem value="notification">Notificación</MenuItem>
											<MenuItem value="marketing">Marketing</MenuItem>
											<MenuItem value="system_update">Actualización del Sistema</MenuItem>
											<MenuItem value="feature_announcement">Anuncio de Función</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											label="ID de Tracking"
											value={customForm.trackingId}
											onChange={(e) => setCustomForm({ ...customForm, trackingId: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom>
											Información de Origen
										</Typography>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											select
											label="Tipo de Origen"
											value={customForm.sourceType}
											onChange={(e) => setCustomForm({ ...customForm, sourceType: e.target.value as any })}
										>
											<MenuItem value="event">Evento</MenuItem>
											<MenuItem value="task">Tarea</MenuItem>
											<MenuItem value="movement">Movimiento</MenuItem>
											<MenuItem value="system">Sistema</MenuItem>
											<MenuItem value="marketing">Marketing</MenuItem>
											<MenuItem value="custom">Personalizado</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="ID de Origen"
											value={customForm.sourceId}
											onChange={(e) => setCustomForm({ ...customForm, sourceId: e.target.value })}
											disabled={!["event", "task", "movement"].includes(customForm.sourceType)}
											required={["event", "task", "movement"].includes(customForm.sourceType)}
											error={["event", "task", "movement"].includes(customForm.sourceType) && !customForm.sourceId}
											helperText={
												["event", "task", "movement"].includes(customForm.sourceType)
													? "ID del evento, tarea o movimiento relacionado (requerido)"
													: "No requerido para este tipo de origen"
											}
										/>
									</Grid>

									<Grid item xs={12}>
										<Button
											variant="contained"
											onClick={handleCreateCustomAlerts}
											disabled={
												loading ||
												!customForm.userIds ||
												!customForm.secondaryText ||
												(["event", "task", "movement"].includes(customForm.sourceType) && !customForm.sourceId)
											}
											startIcon={loading ? <CircularProgress size={20} /> : <Notification />}
										>
											{loading ? "Enviando..." : "Enviar Alertas"}
										</Button>
									</Grid>
								</Grid>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</TabPanel>

			{/* Bulk Alerts Tab */}
			<TabPanel value={activeTab} index={1}>
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					<Grid item xs={12}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Crear Alertas Masivas
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
									Envía alertas a grupos de usuarios basados en filtros
								</Typography>

								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom>
											Filtros de Usuario
										</Typography>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											select
											label="Rol"
											value={bulkForm.filterRole}
											onChange={(e) => setBulkForm({ ...bulkForm, filterRole: e.target.value })}
										>
											<MenuItem value="">Todos</MenuItem>
											<MenuItem value="USER_ROLE">Usuario</MenuItem>
											<MenuItem value="ADMIN_ROLE">Administrador</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											select
											label="Estado"
											value={bulkForm.filterActive ? "active" : "inactive"}
											onChange={(e) => setBulkForm({ ...bulkForm, filterActive: e.target.value === "active" })}
										>
											<MenuItem value="active">Activo</MenuItem>
											<MenuItem value="inactive">Inactivo</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} md={4}>
										<TextField
											fullWidth
											select
											label="Plan de Suscripción"
											value={bulkForm.filterPlan}
											onChange={(e) => setBulkForm({ ...bulkForm, filterPlan: e.target.value })}
										>
											<MenuItem value="">Todos</MenuItem>
											<MenuItem value="free">Gratis</MenuItem>
											<MenuItem value="basic">Básico</MenuItem>
											<MenuItem value="premium">Premium</MenuItem>
											<MenuItem value="enterprise">Enterprise</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
											Plantilla de Alerta
										</Typography>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Título Principal (opcional)"
											value={bulkForm.primaryText}
											onChange={(e) => setBulkForm({ ...bulkForm, primaryText: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											select
											label="Ícono"
											value={bulkForm.avatarIcon}
											onChange={(e) => setBulkForm({ ...bulkForm, avatarIcon: e.target.value })}
										>
											{avatarIcons.map((icon) => (
												<MenuItem key={icon.value} value={icon.value}>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<icon.icon size={20} />
														{icon.label}
													</Box>
												</MenuItem>
											))}
										</TextField>
									</Grid>

									<Grid item xs={12}>
										<TextField
											fullWidth
											label="Mensaje Principal"
											required
											multiline
											rows={2}
											value={bulkForm.secondaryText}
											onChange={(e) => setBulkForm({ ...bulkForm, secondaryText: e.target.value })}
											helperText="Puedes usar variables como {{name}}, {{email}}"
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Texto de Acción"
											required
											value={bulkForm.actionText}
											onChange={(e) => setBulkForm({ ...bulkForm, actionText: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<DateTimePicker
											label="Fecha de Expiración"
											value={bulkForm.expirationDate}
											onChange={(date) => setBulkForm({ ...bulkForm, expirationDate: date })}
											slotProps={{ textField: { fullWidth: true } }}
										/>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
											Opciones de Envío
										</Typography>
									</Grid>

									<Grid item xs={12} md={6}>
										<FormControlLabel
											control={
												<Switch
													checked={bulkForm.deliverImmediately}
													onChange={(e) => setBulkForm({ ...bulkForm, deliverImmediately: e.target.checked })}
												/>
											}
											label="Entregar inmediatamente"
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<FormControlLabel
											control={
												<Switch
													checked={bulkForm.respectPreferences}
													onChange={(e) => setBulkForm({ ...bulkForm, respectPreferences: e.target.checked })}
												/>
											}
											label="Respetar preferencias de notificación"
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<FormControlLabel
											control={
												<Switch
													checked={bulkForm.testMode}
													onChange={(e) => setBulkForm({ ...bulkForm, testMode: e.target.checked })}
													color="warning"
												/>
											}
											label="Modo de prueba (simular sin enviar)"
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											type="number"
											label="Límite de usuarios"
											value={bulkForm.limit}
											onChange={(e) => setBulkForm({ ...bulkForm, limit: parseInt(e.target.value) || 100 })}
											InputProps={{ inputProps: { min: 1, max: 10000 } }}
										/>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom>
											Información de Campaña
										</Typography>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Nombre de Campaña"
											value={bulkForm.campaignName}
											onChange={(e) => setBulkForm({ ...bulkForm, campaignName: e.target.value })}
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											select
											label="Tipo de Campaña"
											value={bulkForm.campaignType}
											onChange={(e) => setBulkForm({ ...bulkForm, campaignType: e.target.value })}
										>
											<MenuItem value="marketing">Marketing</MenuItem>
											<MenuItem value="notification">Notificación</MenuItem>
											<MenuItem value="system_update">Actualización del Sistema</MenuItem>
											<MenuItem value="feature_announcement">Anuncio de Función</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" gutterBottom>
											Información de Origen
										</Typography>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											select
											label="Tipo de Origen"
											value={bulkForm.sourceType}
											onChange={(e) => setBulkForm({ ...bulkForm, sourceType: e.target.value as any })}
										>
											<MenuItem value="event">Evento</MenuItem>
											<MenuItem value="task">Tarea</MenuItem>
											<MenuItem value="movement">Movimiento</MenuItem>
											<MenuItem value="system">Sistema</MenuItem>
											<MenuItem value="marketing">Marketing</MenuItem>
											<MenuItem value="custom">Personalizado</MenuItem>
										</TextField>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="ID de Origen"
											value={bulkForm.sourceId}
											onChange={(e) => setBulkForm({ ...bulkForm, sourceId: e.target.value })}
											disabled={!["event", "task", "movement"].includes(bulkForm.sourceType)}
											required={["event", "task", "movement"].includes(bulkForm.sourceType)}
											error={["event", "task", "movement"].includes(bulkForm.sourceType) && !bulkForm.sourceId}
											helperText={
												["event", "task", "movement"].includes(bulkForm.sourceType)
													? "ID del evento, tarea o movimiento relacionado (requerido)"
													: "No requerido para este tipo de origen"
											}
										/>
									</Grid>

									<Grid item xs={12}>
										{bulkForm.testMode && (
											<Alert severity="warning" sx={{ mb: 2 }}>
												Modo de prueba activado: las alertas no se enviarán realmente
											</Alert>
										)}
										<Button
											variant="contained"
											onClick={handleCreateBulkAlerts}
											disabled={
												loading ||
												!bulkForm.secondaryText ||
												(["event", "task", "movement"].includes(bulkForm.sourceType) && !bulkForm.sourceId)
											}
											startIcon={loading ? <CircularProgress size={20} /> : <People />}
											color={bulkForm.testMode ? "warning" : "primary"}
										>
											{loading ? "Procesando..." : bulkForm.testMode ? "Simular Envío" : "Enviar Alertas Masivas"}
										</Button>
									</Grid>
								</Grid>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</TabPanel>

			{/* Cleanup Tab */}
			<TabPanel value={activeTab} index={2}>
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					<Grid item xs={12} md={6}>
						<Card>
							<CardContent>
								<Typography variant="h6" gutterBottom>
									Limpieza de Alertas
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
									Elimina alertas antiguas para mantener la base de datos optimizada
								</Typography>

								<Grid container spacing={2}>
									<Grid item xs={12}>
										<TextField
											fullWidth
											type="number"
											label="Días de antigüedad"
											value={cleanupForm.daysOld}
											onChange={(e) => setCleanupForm({ ...cleanupForm, daysOld: parseInt(e.target.value) || 30 })}
											InputProps={{ inputProps: { min: 1, max: 365 } }}
											helperText="Las alertas más antiguas que estos días serán eliminadas"
										/>
									</Grid>

									<Grid item xs={12}>
										<FormControlLabel
											control={
												<Switch
													checked={cleanupForm.onlyDelivered}
													onChange={(e) => setCleanupForm({ ...cleanupForm, onlyDelivered: e.target.checked })}
												/>
											}
											label="Solo eliminar alertas entregadas"
										/>
									</Grid>

									<Grid item xs={12}>
										<FormControlLabel
											control={
												<Switch
													checked={cleanupForm.dryRun}
													onChange={(e) => setCleanupForm({ ...cleanupForm, dryRun: e.target.checked })}
													color="warning"
												/>
											}
											label="Modo simulación (no eliminar realmente)"
										/>
									</Grid>

									<Grid item xs={12}>
										{cleanupForm.dryRun ? (
											<Alert severity="info" sx={{ mb: 2 }}>
												Modo simulación: verás cuántas alertas se eliminarían sin borrarlas realmente
											</Alert>
										) : (
											<Alert severity="warning" sx={{ mb: 2 }}>
												¡Atención! Las alertas se eliminarán permanentemente
											</Alert>
										)}
										<Button
											variant="contained"
											onClick={handleCleanupAlerts}
											disabled={loading}
											startIcon={loading ? <CircularProgress size={20} /> : <CloseCircle />}
											color={cleanupForm.dryRun ? "info" : "error"}
										>
											{loading ? "Procesando..." : cleanupForm.dryRun ? "Simular Limpieza" : "Ejecutar Limpieza"}
										</Button>
									</Grid>
								</Grid>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</TabPanel>

			{/* Result Dialog */}
			<Dialog open={resultDialog} onClose={() => setResultDialog(false)} maxWidth="md" fullWidth>
				<DialogTitle>Resultado del Envío</DialogTitle>
				<DialogContent>
					{resultData && (
						<Box>
							<Alert severity="info" sx={{ mb: 2 }}>
								<Typography variant="subtitle2">Resumen:</Typography>
								<Typography variant="body2">
									Total: {resultData.summary?.total || 0} | Creadas: {resultData.summary?.created || 0} | Entregadas:{" "}
									{resultData.summary?.delivered || 0} | Pendientes: {resultData.summary?.pending || 0} | Fallidas:{" "}
									{resultData.summary?.failed || 0}
								</Typography>
							</Alert>

							{resultData.details?.created && resultData.details.created.length > 0 && (
								<Box sx={{ mb: 2 }}>
									<Typography variant="subtitle2" gutterBottom>
										Alertas Creadas ({resultData.details.created.length})
									</Typography>
									<List dense>
										{resultData.details.created.slice(0, 5).map((item: any, index: number) => (
											<ListItem key={index}>
												<ListItemText
													primary={item.alert?.primaryText || item.alert?.secondaryText}
													secondary={
														item.alert?.primaryText && item.alert?.secondaryText ? (
															<Typography
																variant="body2"
																color="text.secondary"
																sx={{
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																	display: "-webkit-box",
																	WebkitLineClamp: 2,
																	WebkitBoxOrient: "vertical",
																}}
															>
																{item.alert.secondaryText}
															</Typography>
														) : null
													}
												/>
												<Typography variant="caption" color="text.secondary">
													{item.userId?.name || item.userId}
												</Typography>
											</ListItem>
										))}
										{resultData.details.created.length > 5 && (
											<Typography variant="caption" color="text.secondary" sx={{ pl: 2 }}>
												... y {resultData.details.created.length - 5} más
											</Typography>
										)}
									</List>
								</Box>
							)}

							{resultData.details?.failed && resultData.details.failed.length > 0 && (
								<Box>
									<Typography variant="subtitle2" gutterBottom color="error">
										Alertas Fallidas ({resultData.details.failed.length})
									</Typography>
									<List dense>
										{resultData.details.failed.map((item: any, index: number) => (
											<ListItem key={index}>
												<ListItemText primary={item.userId} secondary={item.error} />
											</ListItem>
										))}
									</List>
								</Box>
							)}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResultDialog(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* User Search Dialog */}
			<Dialog open={userSearchDialog} onClose={handleCloseUserSearch} maxWidth="md" fullWidth>
				<DialogTitle>
					<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
						<Typography variant="h6">Buscar Usuarios</Typography>
						<Typography variant="body2" color="text.secondary">
							{selectedUsers.length} usuario{selectedUsers.length !== 1 ? "s" : ""} seleccionado{selectedUsers.length !== 1 ? "s" : ""}
						</Typography>
					</Box>
				</DialogTitle>
				<DialogContent>
					<Box sx={{ mb: 2 }}>
						<TextField
							fullWidth
							placeholder="Buscar por nombre, email o rol..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchNormal size={20} />
									</InputAdornment>
								),
							}}
						/>
					</Box>

					{usersLoading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell padding="checkbox">
												<Checkbox
													indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
													checked={filteredUsers.length > 0 && selectedUsers.length === filteredUsers.length}
													onChange={handleSelectAllUsers}
												/>
											</TableCell>
											<TableCell>Nombre</TableCell>
											<TableCell>Email</TableCell>
											<TableCell>Rol</TableCell>
											<TableCell>Estado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{paginatedUsers.map((user: any) => {
											const userId = user._id || user.id;
											const isSelected = selectedUsers.includes(userId);
											return (
												<TableRow
													key={userId}
													hover
													onClick={() => handleSelectUser(userId)}
													sx={{ cursor: "pointer" }}
													selected={isSelected}
												>
													<TableCell padding="checkbox">
														<Checkbox checked={isSelected} />
													</TableCell>
													<TableCell>{user.name || "Sin nombre"}</TableCell>
													<TableCell>{user.email || "Sin email"}</TableCell>
													<TableCell>
														<Chip
															label={user.role === "ADMIN_ROLE" ? "Admin" : "Usuario"}
															size="small"
															color={user.role === "ADMIN_ROLE" ? "error" : "primary"}
														/>
													</TableCell>
													<TableCell>
														<Chip
															label={user.status === "active" ? "Activo" : "Inactivo"}
															size="small"
															color={user.status === "active" ? "success" : "default"}
														/>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>

							<TablePagination
								rowsPerPageOptions={[5, 10, 25]}
								component="div"
								count={filteredUsers.length}
								rowsPerPage={rowsPerPage}
								page={page}
								onPageChange={handleChangePage}
								onRowsPerPageChange={handleChangeRowsPerPage}
								labelRowsPerPage="Filas por página:"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseUserSearch}>Cancelar</Button>
					<Button onClick={handleConfirmUserSelection} variant="contained" disabled={selectedUsers.length === 0}>
						Agregar {selectedUsers.length} usuario{selectedUsers.length !== 1 ? "s" : ""}
					</Button>
				</DialogActions>
			</Dialog>
		</LocalizationProvider>
	);
};

export default AlertManagement;
