import React from "react";
import { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Alert,
	Stack,
	Chip,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Divider,
	useTheme,
	alpha,
	Switch,
	Button,
	Skeleton,
	TextField,
	FormControlLabel,
	Checkbox,
	IconButton,
	Tooltip,
	LinearProgress,
	InputAdornment,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Pagination,
	CircularProgress,
} from "@mui/material";
import { Setting2, InfoCircle, Chart, MessageQuestion, TickCircle, CloseCircle, DocumentText, Refresh, People, Edit2, SearchNormal1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import ExtraInfoConfigService, {
	ExtraInfoConfig,
	ExtraInfoStatus,
	ExtraInfoStatsSummary,
	UsersWithSyncResponse,
	EligibleCountResponse,
	IntervinientesStatsResponse,
	AllUsersResponse,
	UserWithSync,
} from "api/extraInfoConfig";

// Interfaz para tabs laterales
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`intervinientes-tabpanel-${index}`}
			aria-labelledby={`intervinientes-tab-${index}`}
			style={{ width: "100%" }}
			{...other}
		>
			{value === index && <Box sx={{ pl: { xs: 0, md: 3 }, pt: { xs: 2, md: 0 } }}>{children}</Box>}
		</div>
	);
}

// Helper para formatear fecha
const formatDate = (dateStr?: string): string => {
	if (!dateStr) return "N/A";
	return new Date(dateStr).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Helper para nombres de días
const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const IntervinientesWorker = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Estados de datos
	const [config, setConfig] = useState<ExtraInfoConfig | null>(null);
	const [status, setStatus] = useState<ExtraInfoStatus | null>(null);
	const [stats, setStats] = useState<ExtraInfoStatsSummary | null>(null);
	const [usersWithSync, setUsersWithSync] = useState<UsersWithSyncResponse | null>(null);
	const [eligibleCount, setEligibleCount] = useState<EligibleCountResponse | null>(null);
	const [intervinientesStats, setIntervinientesStats] = useState<IntervinientesStatsResponse | null>(null);

	// Estado de edición
	const [editing, setEditing] = useState(false);
	const [editValues, setEditValues] = useState<Partial<ExtraInfoConfig>>({});

	// Estados para gestión de usuarios
	const [allUsers, setAllUsers] = useState<AllUsersResponse | null>(null);
	const [usersLoading, setUsersLoading] = useState(false);
	const [usersPage, setUsersPage] = useState(1);
	const [usersSearch, setUsersSearch] = useState("");
	const [usersFilter, setUsersFilter] = useState<"all" | "enabled" | "disabled">("all");
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
	const [bulkUpdating, setBulkUpdating] = useState(false);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Cargar datos
	const fetchData = async (showRefreshing = false) => {
		try {
			if (showRefreshing) setRefreshing(true);
			else setLoading(true);

			const [configRes, statusRes, statsRes] = await Promise.all([
				ExtraInfoConfigService.getConfig(),
				ExtraInfoConfigService.getStatus(),
				ExtraInfoConfigService.getStats(),
			]);

			if (configRes.success) setConfig(configRes.data);
			if (statusRes.success) setStatus(statusRes.data);
			if (statsRes.success) setStats(statsRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar datos", { variant: "error" });
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	// Cargar datos de estadísticas (tab específico)
	const fetchStatsData = async () => {
		try {
			const [usersRes, eligibleRes, intervRes] = await Promise.all([
				ExtraInfoConfigService.getUsersWithSync(),
				ExtraInfoConfigService.getEligibleCount(),
				ExtraInfoConfigService.getIntervinientesStats(),
			]);

			if (usersRes.success) setUsersWithSync(usersRes.data);
			if (eligibleRes.success) setEligibleCount(eligibleRes.data);
			if (intervRes.success) setIntervinientesStats(intervRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar estadísticas", { variant: "error" });
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	// Cargar estadísticas cuando se selecciona el tab
	useEffect(() => {
		if (activeTab === 2 && !usersWithSync) {
			fetchStatsData();
		}
	}, [activeTab]);

	// Cargar usuarios cuando se selecciona el tab de usuarios
	useEffect(() => {
		if (activeTab === 4) {
			fetchUsers();
		}
	}, [activeTab, usersPage, usersFilter]);

	// Debounce para búsqueda
	useEffect(() => {
		if (activeTab === 4) {
			const timer = setTimeout(() => {
				setUsersPage(1);
				fetchUsers();
			}, 500);
			return () => clearTimeout(timer);
		}
	}, [usersSearch]);

	// Cargar usuarios
	const fetchUsers = async () => {
		try {
			setUsersLoading(true);
			const response = await ExtraInfoConfigService.getAllUsers({
				page: usersPage,
				limit: 15,
				search: usersSearch,
				filterSync: usersFilter,
			});
			if (response.success) {
				setAllUsers(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar usuarios", { variant: "error" });
		} finally {
			setUsersLoading(false);
		}
	};

	// Actualizar preferencia de un usuario
	const handleUpdateUserSync = async (userId: string, syncEnabled: boolean) => {
		try {
			setUpdatingUserId(userId);
			const response = await ExtraInfoConfigService.updateUserSyncPreference(userId, syncEnabled);
			if (response.success) {
				enqueueSnackbar(`Sincronización ${syncEnabled ? "habilitada" : "deshabilitada"} para el usuario`, { variant: "success" });
				// Actualizar estado local
				if (allUsers) {
					setAllUsers({
						...allUsers,
						users: allUsers.users.map((u) => (u._id === userId ? { ...u, syncEnabled } : u)),
						summary: {
							...allUsers.summary,
							usersWithSyncEnabled: allUsers.summary.usersWithSyncEnabled + (syncEnabled ? 1 : -1),
							usersWithSyncDisabled: allUsers.summary.usersWithSyncDisabled + (syncEnabled ? -1 : 1),
						},
					});
				}
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar", { variant: "error" });
		} finally {
			setUpdatingUserId(null);
		}
	};

	// Actualización masiva
	const handleBulkUpdate = async (syncEnabled: boolean) => {
		if (selectedUsers.length === 0) {
			enqueueSnackbar("Seleccione al menos un usuario", { variant: "warning" });
			return;
		}
		try {
			setBulkUpdating(true);
			const response = await ExtraInfoConfigService.bulkUpdateUserSyncPreference(selectedUsers, syncEnabled);
			if (response.success) {
				enqueueSnackbar(`Sincronización ${syncEnabled ? "habilitada" : "deshabilitada"} para ${response.data.modified} usuarios`, {
					variant: "success",
				});
				setSelectedUsers([]);
				fetchUsers();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error en actualización masiva", { variant: "error" });
		} finally {
			setBulkUpdating(false);
		}
	};

	// Seleccionar/deseleccionar usuario
	const handleSelectUser = (userId: string) => {
		setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
	};

	// Seleccionar todos los usuarios de la página actual
	const handleSelectAll = () => {
		if (!allUsers) return;
		const pageUserIds = allUsers.users.map((u) => u._id);
		const allSelected = pageUserIds.every((id) => selectedUsers.includes(id));
		if (allSelected) {
			setSelectedUsers((prev) => prev.filter((id) => !pageUserIds.includes(id)));
		} else {
			setSelectedUsers((prev) => [...new Set([...prev, ...pageUserIds])]);
		}
	};

	// Toggle enabled
	const handleToggleEnabled = async () => {
		try {
			const response = await ExtraInfoConfigService.toggleEnabled();
			if (response.success) {
				enqueueSnackbar(`Worker ${response.data.enabled ? "habilitado" : "deshabilitado"}`, { variant: "success" });
				fetchData(true);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar estado", { variant: "error" });
		}
	};

	// Guardar configuración
	const handleSaveConfig = async () => {
		try {
			const response = await ExtraInfoConfigService.updateConfig(editValues);
			if (response.success) {
				enqueueSnackbar("Configuración actualizada", { variant: "success" });
				setEditing(false);
				setEditValues({});
				fetchData(true);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar", { variant: "error" });
		}
	};

	// Resetear estadísticas
	const handleResetStats = async () => {
		try {
			const response = await ExtraInfoConfigService.resetStats();
			if (response.success) {
				enqueueSnackbar("Estadísticas reseteadas", { variant: "success" });
				fetchData(true);
				fetchStatsData();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear", { variant: "error" });
		}
	};

	// Criterios de elegibilidad
	const eligibilityCriteria = [
		{ field: "verified", condition: "=== true", description: "Documento verificado en PJN", active: config?.eligibility?.requireVerified },
		{ field: "isValid", condition: "=== true", description: "Expediente existe y es accesible", active: config?.eligibility?.requireValid },
		{ field: "isPrivate", condition: "!== true", description: "No es documento privado", active: config?.eligibility?.excludePrivate },
		{ field: "lastUpdate", condition: "exists", description: "Tiene actualización registrada", active: config?.eligibility?.requireLastUpdate },
		{ field: "detailsLoaded", condition: "false/null/undefined", description: "No procesado por extra-info", active: true },
	];

	// Flujo del worker
	const workerFlow = [
		{
			phase: "1. Extracción",
			description: "Siempre se ejecuta",
			steps: [
				"Busca documentos elegibles según criterios",
				"Navega al expediente en PJN (Puppeteer)",
				"Resuelve captcha (reCAPTCHA o PJN custom)",
				"Click en pestaña 'Intervinientes'",
				"Extrae PARTES: tipo, nombre, tomo/folio, IEJ",
				"Extrae LETRADOS: tipo, nombre, matrícula, estado IEJ",
				"Guarda en colección 'intervinientes'",
			],
			color: theme.palette.info.main,
		},
		{
			phase: "2. Sincronización",
			description: "Condicional (opt-in)",
			steps: [
				"Busca folders vinculados a la causa",
				"Para cada usuario verifica preferencia:",
				"  → preferences.pjn.syncContactsFromIntervinientes",
				"  → Solo si === true sincroniza contactos",
				"Obtiene límites de suscripción del usuario",
				"Crea/actualiza contactos respetando límites",
				"Actualiza folder.contactsCount",
			],
			color: theme.palette.warning.main,
		},
		{
			phase: "3. Finalización",
			description: "Marca documento procesado",
			steps: ["Actualiza detailsLoaded = true", "Actualiza detailsLastUpdate = new Date()"],
			color: theme.palette.success.main,
		},
	];

	// Contenido del tab de Información/Configuración
	const ConfigContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Estado actual */}
			<Card variant="outlined" sx={{ backgroundColor: alpha(status?.isRunning ? theme.palette.success.main : theme.palette.grey[500], 0.05) }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Stack direction="row" spacing={2} alignItems="center">
							<Box
								sx={{
									width: 12,
									height: 12,
									borderRadius: "50%",
									backgroundColor: status?.isRunning ? theme.palette.success.main : theme.palette.grey[400],
									animation: status?.isRunning ? "pulse 2s infinite" : "none",
									"@keyframes pulse": {
										"0%": { opacity: 1 },
										"50%": { opacity: 0.5 },
										"100%": { opacity: 1 },
									},
								}}
							/>
							<Box>
								<Typography variant="subtitle1" fontWeight="bold">
									Estado del Worker
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{status?.isRunning ? "Ejecutando" : "Detenido"} • Ciclos: {status?.cycleCount || 0}
								</Typography>
							</Box>
						</Stack>
						<Stack direction="row" spacing={1} alignItems="center">
							<FormControlLabel
								control={<Switch checked={config?.enabled || false} onChange={handleToggleEnabled} color="primary" />}
								label={config?.enabled ? "Habilitado" : "Deshabilitado"}
							/>
							<Tooltip title="Actualizar">
								<IconButton size="small" onClick={() => fetchData(true)} disabled={refreshing}>
									<Refresh size={18} className={refreshing ? "spin" : ""} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>
					{status?.lastCycleAt && (
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
							Último ciclo: {formatDate(status.lastCycleAt)}
						</Typography>
					)}
					{status?.lastError && (
						<Alert severity="error" sx={{ mt: 1 }}>
							<Typography variant="body2">
								<strong>Último error:</strong> {status.lastError.message}
							</Typography>
							<Typography variant="caption">{formatDate(status.lastError.timestamp)}</Typography>
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Configuración del worker */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							Configuración del Worker
						</Typography>
						{!editing ? (
							<Button size="small" startIcon={<Edit2 size={16} />} onClick={() => setEditing(true)}>
								Editar
							</Button>
						) : (
							<Stack direction="row" spacing={1}>
								<Button size="small" variant="contained" onClick={handleSaveConfig}>
									Guardar
								</Button>
								<Button
									size="small"
									onClick={() => {
										setEditing(false);
										setEditValues({});
									}}
								>
									Cancelar
								</Button>
							</Stack>
						)}
					</Stack>

					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Cron Schedule
								</Typography>
								{editing ? (
									<TextField
										size="small"
										value={editValues.schedule?.cronExpression ?? config?.schedule?.cronExpression ?? ""}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, cronExpression: e.target.value } as any,
											})
										}
									/>
								) : (
									<>
										<Chip label={config?.schedule?.cronExpression || "*/30 * * * *"} size="small" sx={{ fontFamily: "monospace" }} />
										<Typography variant="caption" color="text.secondary">
											Cada 30 minutos
										</Typography>
									</>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Batch Size
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.batch_size ?? config?.batch_size ?? 5}
										onChange={(e) => setEditValues({ ...editValues, batch_size: parseInt(e.target.value) })}
										inputProps={{ min: 1, max: 20 }}
									/>
								) : (
									<>
										<Chip label={config?.batch_size || 5} size="small" color="primary" />
										<Typography variant="caption" color="text.secondary">
											Documentos por ciclo
										</Typography>
									</>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Modo de procesamiento
								</Typography>
								<Chip label={config?.processing_mode || "all"} size="small" variant="outlined" />
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Sync Contactos
								</Typography>
								<Chip
									label={config?.syncContactsEnabled ? "Habilitado" : "Deshabilitado"}
									size="small"
									color={config?.syncContactsEnabled ? "success" : "default"}
								/>
							</Stack>
						</Grid>
					</Grid>

					<Divider sx={{ my: 2 }} />

					{/* Horario de trabajo */}
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Horario de Trabajo
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Hora inicio
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.schedule?.workStartHour ?? config?.schedule?.workStartHour ?? 8}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, workStartHour: parseInt(e.target.value) } as any,
											})
										}
										inputProps={{ min: 0, max: 23 }}
									/>
								) : (
									<Typography variant="body2">{config?.schedule?.workStartHour || 8}:00</Typography>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Hora fin
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.schedule?.workEndHour ?? config?.schedule?.workEndHour ?? 22}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, workEndHour: parseInt(e.target.value) } as any,
											})
										}
										inputProps={{ min: 0, max: 24 }}
									/>
								) : (
									<Typography variant="body2">{config?.schedule?.workEndHour || 22}:00</Typography>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Días de trabajo
								</Typography>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
									{(config?.schedule?.workDays || [1, 2, 3, 4, 5]).map((day) => (
										<Chip key={day} label={dayNames[day]} size="small" variant="outlined" />
									))}
								</Stack>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Zona horaria
								</Typography>
								<Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
									{config?.schedule?.timezone || "America/Argentina/Buenos_Aires"}
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Criterios de elegibilidad */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Criterios de Elegibilidad
					</Typography>
					<Typography variant="body2" color="text.secondary" paragraph>
						Un documento debe cumplir <strong>todos</strong> estos criterios para ser procesado:
					</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Campo</TableCell>
									<TableCell>Condición</TableCell>
									<TableCell>Descripción</TableCell>
									<TableCell align="center">Activo</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{eligibilityCriteria.map((criteria, index) => (
									<TableRow key={index}>
										<TableCell>
											<Chip label={criteria.field} size="small" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} />
										</TableCell>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
												{criteria.condition}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2">{criteria.description}</Typography>
										</TableCell>
										<TableCell align="center">
											{criteria.active ? (
												<TickCircle size={18} color={theme.palette.success.main} />
											) : (
												<CloseCircle size={18} color={theme.palette.grey[400]} />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>

					{config?.eligibility?.testMode?.enabled && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							<Typography variant="body2">
								<strong>Modo de prueba activo:</strong> Solo se procesan causas de{" "}
								{config.eligibility.testMode.testUserIds?.length || 0} usuario(s) de prueba.
							</Typography>
						</Alert>
					)}
				</CardContent>
			</Card>
		</Stack>
	);

	// Contenido del tab de Flujo
	const FlowContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Flujo del Worker
					</Typography>

					{workerFlow.map((phase, phaseIndex) => (
						<Box key={phaseIndex} sx={{ mb: 3 }}>
							<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
								<Box
									sx={{
										width: 32,
										height: 32,
										borderRadius: "50%",
										backgroundColor: alpha(phase.color, 0.1),
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<Typography variant="body2" fontWeight="bold" sx={{ color: phase.color }}>
										{phaseIndex + 1}
									</Typography>
								</Box>
								<Box>
									<Typography variant="subtitle2" fontWeight="bold">
										{phase.phase}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{phase.description}
									</Typography>
								</Box>
							</Stack>

							<Box sx={{ ml: 2, pl: 3, borderLeft: `2px solid ${alpha(phase.color, 0.3)}` }}>
								{phase.steps.map((step, stepIndex) => (
									<Stack key={stepIndex} direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 0.75 }}>
										<Box
											sx={{
												width: 6,
												height: 6,
												borderRadius: "50%",
												backgroundColor: phase.color,
												mt: 0.75,
												flexShrink: 0,
											}}
										/>
										<Typography variant="body2" sx={{ fontFamily: step.startsWith("  →") ? "monospace" : "inherit" }}>
											{step}
										</Typography>
									</Stack>
								))}
							</Box>

							{phaseIndex < workerFlow.length - 1 && <Divider sx={{ mt: 2 }} />}
						</Box>
					))}
				</CardContent>
			</Card>

			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					<strong>Importante:</strong> La extracción de intervinientes <strong>siempre ocurre</strong>. Solo la sincronización a
					contactos está condicionada a <code>preferences.pjn.syncContactsFromIntervinientes === true</code>.
				</Typography>
			</Alert>
		</Stack>
	);

	// Contenido del tab de Estadísticas
	const StatsContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Estadísticas globales */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Docs Procesados
							</Typography>
							<Typography variant="h5">{stats?.global?.documentsProcessed?.toLocaleString() || 0}</Typography>
							<LinearProgress
								variant="determinate"
								value={
									stats?.global?.documentsProcessed && stats?.global?.documentsSuccess
										? (stats.global.documentsSuccess / stats.global.documentsProcessed) * 100
										: 0
								}
								color="success"
								sx={{ mt: 1, height: 4, borderRadius: 2 }}
							/>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Intervinientes Extraídos
							</Typography>
							<Typography variant="h5" color="info.main">
								{intervinientesStats?.totalIntervinientes?.toLocaleString() || 0}
							</Typography>
							<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
								<Chip label={`P: ${intervinientesStats?.byTipo?.PARTE || 0}`} size="small" variant="outlined" />
								<Chip label={`L: ${intervinientesStats?.byTipo?.LETRADO || 0}`} size="small" variant="outlined" />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Contactos Sincronizados
							</Typography>
							<Typography variant="h5" color="success.main">
								{stats?.global?.contactsSynced?.toLocaleString() || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Errores
							</Typography>
							<Typography variant="h5" color="error.main">
								{stats?.global?.documentsError?.toLocaleString() || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Usuarios con sync */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<People size={20} />
							<Typography variant="subtitle1" fontWeight="bold">
								Usuarios con Sincronización Habilitada
							</Typography>
						</Stack>
						<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchStatsData}>
							Actualizar
						</Button>
					</Stack>

					{usersWithSync ? (
						<>
							<Grid container spacing={2} sx={{ mb: 2 }}>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Total Usuarios
									</Typography>
									<Typography variant="h6">{usersWithSync.totalUsers}</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Con Sync Habilitado
									</Typography>
									<Typography variant="h6" color="success.main">
										{usersWithSync.usersWithSyncEnabled}
									</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Porcentaje
									</Typography>
									<Typography variant="h6">{usersWithSync.percentage}%</Typography>
								</Grid>
							</Grid>

							{usersWithSync.users.length > 0 && (
								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Email</TableCell>
												<TableCell>Nombre</TableCell>
												<TableCell align="center">Sync</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{usersWithSync.users.slice(0, 10).map((user) => (
												<TableRow key={user._id}>
													<TableCell>{user.email}</TableCell>
													<TableCell>{user.name || "-"}</TableCell>
													<TableCell align="center">
														<TickCircle size={16} color={theme.palette.success.main} />
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							)}
						</>
					) : (
						<Skeleton variant="rectangular" height={100} />
					)}
				</CardContent>
			</Card>

			{/* Documentos elegibles */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Documentos Elegibles para Procesar
					</Typography>

					{eligibleCount ? (
						<Grid container spacing={2}>
							<Grid item xs={12} sm={3}>
								<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
									<CardContent sx={{ py: 1.5 }}>
										<Typography variant="caption" color="text.secondary">
											Total Elegibles
										</Typography>
										<Typography variant="h4" color="primary.main">
											{eligibleCount.total.toLocaleString()}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							{Object.entries(eligibleCount.byFuero || {}).map(([fuero, count]) => (
								<Grid item xs={6} sm={2.25} key={fuero}>
									<Card variant="outlined">
										<CardContent sx={{ py: 1.5 }}>
											<Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
												{fuero}
											</Typography>
											<Typography variant="h6">{(count as number)?.toLocaleString() || 0}</Typography>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					) : (
						<Skeleton variant="rectangular" height={80} />
					)}

					{eligibleCount?.testMode && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							Modo de prueba: {eligibleCount.testUserCausasCount} causas de usuarios de prueba
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Botón reset stats */}
			<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
				<Button variant="outlined" color="warning" onClick={handleResetStats}>
					Resetear Estadísticas
				</Button>
			</Box>
		</Stack>
	);

	// Contenido del tab de Ayuda
	const HelpContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<InfoCircle size={20} color="#1890ff" />
						<Typography variant="h6">Guía del Extra-Info Worker</Typography>
					</Stack>

					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Archivos Principales
						</Typography>
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Archivo</TableCell>
										<TableCell>Función</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{[
										["extra-info-worker.js", "Worker principal, orquesta el proceso"],
										["extra-info-navigation.js", "Navegación a PJN y resolución de captcha"],
										["extra-info-extraction.js", "Extracción de datos de la tabla"],
										["intervinientes-contact-sync.js", "Sincronización a contactos"],
										["nombre-normalization.js", "Normalización para deduplicación"],
									].map(([file, desc]) => (
										<TableRow key={file}>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{file}
												</Typography>
											</TableCell>
											<TableCell>{desc}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Box>

					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Preferencia del Usuario
						</Typography>
						<Alert severity="info" sx={{ mb: 2 }}>
							Los usuarios deben habilitar explícitamente la sincronización de contactos.
						</Alert>
						<Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.grey[500], 0.05) }}>
							<Typography variant="body2" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
								{`// Ubicación: User.preferences.pjn
{
  pjn: {
    syncContactsFromIntervinientes: true  // default: false
  }
}`}
							</Typography>
						</Paper>
					</Box>

					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Ejecución Manual
						</Typography>
						<Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.grey[500], 0.05) }}>
							<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
								SINGLE_RUN=true node src/tasks/extra-info-worker.js
							</Typography>
						</Paper>
					</Box>

					<Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
						<Typography variant="body2" color="text.secondary">
							Documentación completa: <code>pjn-workers/docs/SINCRONIZACION_INTERVINIENTES_CONTACTOS.md</code>
						</Typography>
					</Box>
				</CardContent>
			</Card>
		</Stack>
	);

	// Contenido del tab de Usuarios
	const UsersContent = () => {
		const allPageSelected = allUsers ? allUsers.users.every((u) => selectedUsers.includes(u._id)) : false;
		const someSelected = selectedUsers.length > 0;

		return (
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Resumen */}
				<Grid container spacing={2}>
					<Grid item xs={6} sm={4}>
						<Card variant="outlined">
							<CardContent sx={{ py: 1.5 }}>
								<Typography variant="caption" color="text.secondary">
									Total Usuarios
								</Typography>
								<Typography variant="h5">{allUsers?.summary?.totalUsersInSystem?.toLocaleString() || 0}</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={4}>
						<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.success.main, 0.05) }}>
							<CardContent sx={{ py: 1.5 }}>
								<Typography variant="caption" color="text.secondary">
									Sync Habilitado
								</Typography>
								<Typography variant="h5" color="success.main">
									{allUsers?.summary?.usersWithSyncEnabled?.toLocaleString() || 0}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={4}>
						<Card variant="outlined">
							<CardContent sx={{ py: 1.5 }}>
								<Typography variant="caption" color="text.secondary">
									Sync Deshabilitado
								</Typography>
								<Typography variant="h5" color="text.secondary">
									{allUsers?.summary?.usersWithSyncDisabled?.toLocaleString() || 0}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Filtros y búsqueda */}
				<Card variant="outlined">
					<CardContent>
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
							<Stack direction={{ xs: "column", sm: "row" }} spacing={2} flex={1}>
								<TextField
									size="small"
									placeholder="Buscar por email o nombre..."
									value={usersSearch}
									onChange={(e) => setUsersSearch(e.target.value)}
									sx={{ minWidth: 250 }}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<SearchNormal1 size={18} />
											</InputAdornment>
										),
									}}
								/>
								<FormControl size="small" sx={{ minWidth: 180 }}>
									<InputLabel>Filtrar por estado</InputLabel>
									<Select
										value={usersFilter}
										label="Filtrar por estado"
										onChange={(e) => {
											setUsersFilter(e.target.value as any);
											setUsersPage(1);
										}}
									>
										<MenuItem value="all">Todos</MenuItem>
										<MenuItem value="enabled">Sync Habilitado</MenuItem>
										<MenuItem value="disabled">Sync Deshabilitado</MenuItem>
									</Select>
								</FormControl>
							</Stack>
							<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchUsers} disabled={usersLoading}>
								Actualizar
							</Button>
						</Stack>

						{/* Acciones masivas */}
						{someSelected && (
							<Box sx={{ mt: 2, p: 1.5, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
								<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
									<Typography variant="body2">
										<strong>{selectedUsers.length}</strong> usuario(s) seleccionado(s)
									</Typography>
									<Stack direction="row" spacing={1}>
										<Button
											size="small"
											variant="contained"
											color="success"
											onClick={() => handleBulkUpdate(true)}
											disabled={bulkUpdating}
											startIcon={bulkUpdating ? <CircularProgress size={14} /> : <TickCircle size={16} />}
										>
											Habilitar Sync
										</Button>
										<Button
											size="small"
											variant="outlined"
											color="error"
											onClick={() => handleBulkUpdate(false)}
											disabled={bulkUpdating}
											startIcon={bulkUpdating ? <CircularProgress size={14} /> : <CloseCircle size={16} />}
										>
											Deshabilitar Sync
										</Button>
										<Button size="small" onClick={() => setSelectedUsers([])}>
											Limpiar selección
										</Button>
									</Stack>
								</Stack>
							</Box>
						)}
					</CardContent>
				</Card>

				{/* Tabla de usuarios */}
				<Card variant="outlined">
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell padding="checkbox">
										<Checkbox
											checked={allPageSelected && allUsers?.users && allUsers.users.length > 0}
											indeterminate={someSelected && !allPageSelected}
											onChange={handleSelectAll}
											disabled={!allUsers?.users?.length}
										/>
									</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Nombre</TableCell>
									<TableCell align="center">Sync Contactos</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{usersLoading ? (
									<TableRow>
										<TableCell colSpan={5} align="center" sx={{ py: 4 }}>
											<CircularProgress size={24} />
											<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
												Cargando usuarios...
											</Typography>
										</TableCell>
									</TableRow>
								) : allUsers?.users && allUsers.users.length > 0 ? (
									allUsers.users.map((user) => (
										<TableRow key={user._id} hover selected={selectedUsers.includes(user._id)}>
											<TableCell padding="checkbox">
												<Checkbox checked={selectedUsers.includes(user._id)} onChange={() => handleSelectUser(user._id)} />
											</TableCell>
											<TableCell>
												<Typography variant="body2">{user.email}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" color="text.secondary">
													{user.name || "-"}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={user.syncEnabled ? "Habilitado" : "Deshabilitado"}
													size="small"
													color={user.syncEnabled ? "success" : "default"}
													variant={user.syncEnabled ? "filled" : "outlined"}
												/>
											</TableCell>
											<TableCell align="center">
												{updatingUserId === user._id ? (
													<CircularProgress size={20} />
												) : (
													<Switch
														size="small"
														checked={user.syncEnabled}
														onChange={(e) => handleUpdateUserSync(user._id, e.target.checked)}
														color="success"
													/>
												)}
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={5} align="center" sx={{ py: 4 }}>
											<Typography variant="body2" color="text.secondary">
												No se encontraron usuarios
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>

					{/* Paginación */}
					{allUsers?.pagination && allUsers.pagination.totalPages > 1 && (
						<Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
							<Pagination
								count={allUsers.pagination.totalPages}
								page={usersPage}
								onChange={(e, page) => setUsersPage(page)}
								color="primary"
								size="small"
							/>
						</Box>
					)}
				</Card>

				{/* Info */}
				<Alert severity="info" variant="outlined">
					<Typography variant="body2">
						<strong>Nota:</strong> Solo los usuarios con sincronización habilitada tendrán sus intervinientes sincronizados como contactos
						en sus carpetas. La extracción de intervinientes siempre ocurre para todos los documentos elegibles.
					</Typography>
				</Alert>
			</Stack>
		);
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={60} />
				<Skeleton variant="rectangular" height={200} />
				<Skeleton variant="rectangular" height={150} />
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Worker de Intervinientes (Extra-Info)</Typography>
				<Stack direction="row" spacing={1}>
					<Chip
						label={status?.isWithinWorkingHours ? "En horario" : "Fuera de horario"}
						size="small"
						color={status?.isWithinWorkingHours ? "success" : "default"}
					/>
					<Chip label={config?.enabled ? "Habilitado" : "Deshabilitado"} size="small" color={config?.enabled ? "primary" : "default"} />
				</Stack>
			</Box>

			{/* Info alert */}
			<Alert severity="info" variant="outlined" sx={{ py: 1 }}>
				<Typography variant="body2">
					Este worker extrae los intervinientes (partes y letrados) de las causas judiciales desde el sitio web del PJN y opcionalmente
					los sincroniza como contactos en los folders de los usuarios.
				</Typography>
			</Alert>

			{/* Layout con tabs */}
			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: { md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
						minWidth: { md: 200 },
						"& .MuiTab-root": { alignItems: "flex-start", textAlign: "left", minHeight: 60, px: 2 },
					}}
				>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Setting2 size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Configuración
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Estado y ajustes
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<DocumentText size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Flujo
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Proceso del worker
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Chart size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Estadísticas
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Métricas y usuarios
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<MessageQuestion size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Ayuda
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Guía y archivos
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<People size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Usuarios
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Gestión de sync
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
				</Tabs>

				<TabPanel value={activeTab} index={0}>
					<ConfigContent />
				</TabPanel>
				<TabPanel value={activeTab} index={1}>
					<FlowContent />
				</TabPanel>
				<TabPanel value={activeTab} index={2}>
					<StatsContent />
				</TabPanel>
				<TabPanel value={activeTab} index={3}>
					<HelpContent />
				</TabPanel>
				<TabPanel value={activeTab} index={4}>
					<UsersContent />
				</TabPanel>
			</Box>
		</Stack>
	);
};

export default IntervinientesWorker;
