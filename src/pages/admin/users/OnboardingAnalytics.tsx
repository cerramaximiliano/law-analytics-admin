import React, { useEffect, useState, useCallback } from "react";
import {
	Grid,
	Typography,
	Box,
	Skeleton,
	IconButton,
	Tooltip,
	useTheme,
	alpha,
	Paper,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Tabs,
	Tab,
	LinearProgress,
	Button,
	Stack,
	Divider,
	Alert,
	TextField,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	CircularProgress,
} from "@mui/material";
import { Refresh, People, Activity, Warning2, TickCircle, CloseCircle, SearchNormal1, Trash, Link21 } from "iconsax-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import MainCard from "components/MainCard";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";
import { BRAND_BLUE } from "themes/dashboardTokens";
import OnboardingService from "api/onboarding";
import {
	OnboardingSummaryData,
	OnboardingEvent,
	OnboardingStuckUser,
	OnboardingFunnelData,
	OnboardingTimeToActivationData,
	OnboardingUserSearchItem,
} from "types/onboarding";
import { useSnackbar } from "notistack";

// Event name translations — los 5 primeros son del onboarding viejo (banner +
// 4 cards). Los 4 últimos son del OnboardingChecklist nuevo. Se mantienen
// ambos en el dict para que el tab Eventos no muestre "raw event names".
const EVENT_TRANSLATIONS: Record<string, string> = {
	// Legacy
	onboarding_shown: "Onboarding mostrado",
	onboarding_cta_clicked: "Click en CTA",
	folder_created_from_onboarding: "Carpeta creada",
	onboarding_dismissed: "Descartado",
	onboarding_completed: "Completado",
	// Nuevos (OnboardingChecklist)
	onboarding_step_clicked: "Click en step",
	onboarding_step_completed: "Step completado",
	onboarding_judicial_logo_clicked: "Click logo judicial",
	onboarding_example_folder_used: "Usó carpeta de ejemplo",
};

// Color del chip por evento — visual scan rápido en la tabla de eventos.
const EVENT_COLOR: Record<string, "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error"> = {
	onboarding_shown: "default",
	onboarding_cta_clicked: "primary",
	folder_created_from_onboarding: "success",
	onboarding_dismissed: "warning",
	onboarding_completed: "success",
	onboarding_step_clicked: "primary",
	onboarding_step_completed: "success",
	onboarding_judicial_logo_clicked: "info",
	onboarding_example_folder_used: "secondary",
};

// Traducción de step_id para no exponer enums crudos al admin
const STEP_TRANSLATIONS: Record<string, string> = {
	first_folder: "Primera carpeta",
	judicial_connection: "Conexión judicial",
	first_contact: "Primer contacto",
	first_deadline: "Primer vencimiento",
};

// Tab Panel component
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

// Stat Card component
interface StatCardProps {
	title: string;
	value: number | string;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper
			elevation={0}
			sx={{
				p: 3,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				transition: "transform 200ms ease, box-shadow 200ms ease",
				"&:hover": {
					transform: "translateY(-2px)",
					boxShadow: `0 6px 20px ${alpha(color, 0.12)}`,
				},
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
				<Box>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ letterSpacing: 0.3, textTransform: "uppercase", display: "block", mb: 0.5 }}
					>
						{title}
					</Typography>
					{loading ? (
						<Skeleton width={80} height={40} />
					) : (
						<Typography variant="h3" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
							{value}
						</Typography>
					)}
					{subtitle && (
						<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						width: 44,
						height: 44,
						borderRadius: 1.25,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: alpha(color, 0.1),
						color: color,
					}}
				>
					{icon}
				</Box>
			</Stack>
		</Paper>
	);
};

// Main component
const OnboardingAnalytics: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State
	const [tabValue, setTabValue] = useState(0);
	const [loading, setLoading] = useState(true);
	const [summaryData, setSummaryData] = useState<OnboardingSummaryData | null>(null);
	const [funnelData, setFunnelData] = useState<OnboardingFunnelData | null>(null);
	const [timeData, setTimeData] = useState<OnboardingTimeToActivationData | null>(null);
	const [events, setEvents] = useState<OnboardingEvent[]>([]);
	const [stuckUsers, setStuckUsers] = useState<OnboardingStuckUser[]>([]);
	const [eventsPage, setEventsPage] = useState(0);
	const [eventsTotal, setEventsTotal] = useState(0);
	const [stuckPage, setStuckPage] = useState(0);
	const [stuckTotal, setStuckTotal] = useState(0);
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	// Reset-user tool state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState<OnboardingUserSearchItem[]>([]);
	const [searching, setSearching] = useState(false);
	const [resettingUserId, setResettingUserId] = useState<string | null>(null);
	const [purgeEventsOnReset, setPurgeEventsOnReset] = useState(false);

	// Confirm dialog state — reemplaza el window.confirm para que la UX matchee
	// con el resto de las acciones destructivas del admin (mismo patrón que
	// DeleteUserDialog: ResponsiveDialog + icono coloreado + datos del user +
	// Cancelar/Confirmar con loading state).
	const [resetConfirmUser, setResetConfirmUser] = useState<OnboardingUserSearchItem | null>(null);

	// Fetch all data
	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = {
				...(dateFrom && { dateFrom }),
				...(dateTo && { dateTo }),
			};

			const [summaryRes, funnelRes, timeRes] = await Promise.all([
				OnboardingService.getSummary(params),
				OnboardingService.getFunnel(params),
				OnboardingService.getTimeToActivation(params),
			]);

			if (summaryRes.success) setSummaryData(summaryRes.data);
			if (funnelRes.success) setFunnelData(funnelRes.data);
			if (timeRes.success) setTimeData(timeRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar datos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [dateFrom, dateTo, enqueueSnackbar]);

	// Fetch events
	const fetchEvents = useCallback(async () => {
		try {
			const res = await OnboardingService.getEvents({
				page: eventsPage + 1,
				limit: 10,
				...(dateFrom && { dateFrom }),
				...(dateTo && { dateTo }),
			});
			if (res.success) {
				setEvents(res.data);
				setEventsTotal(res.pagination.total);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar eventos", { variant: "error" });
		}
	}, [eventsPage, dateFrom, dateTo, enqueueSnackbar]);

	// Fetch stuck users
	const fetchStuckUsers = useCallback(async () => {
		try {
			const res = await OnboardingService.getStuckUsers({
				page: stuckPage + 1,
				limit: 10,
			});
			if (res.success) {
				setStuckUsers(res.data);
				setStuckTotal(res.pagination.total);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar usuarios estancados", { variant: "error" });
		}
	}, [stuckPage, enqueueSnackbar]);

	// Initial load
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Load tab-specific data
	useEffect(() => {
		if (tabValue === 1) {
			fetchEvents();
		} else if (tabValue === 2) {
			fetchStuckUsers();
		}
	}, [tabValue, fetchEvents, fetchStuckUsers]);

	// Handle tab change
	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	// Reset-user tool: búsqueda con debounce simple (350ms)
	useEffect(() => {
		if (tabValue !== 3 || searchQuery.trim().length < 2) {
			setSearchResults([]);
			return;
		}
		const handle = setTimeout(async () => {
			try {
				setSearching(true);
				const res = await OnboardingService.searchUsers(searchQuery.trim());
				if (res.success) setSearchResults(res.data);
			} catch (error: any) {
				enqueueSnackbar(error.message || "Error al buscar usuarios", { variant: "error" });
			} finally {
				setSearching(false);
			}
		}, 350);
		return () => clearTimeout(handle);
	}, [searchQuery, tabValue, enqueueSnackbar]);

	// Reset-user tool: abre el dialog de confirmación. Los datos del user
	// quedan en `resetConfirmUser` hasta que el dialog confirma o cancela.
	const openResetDialog = useCallback((user: OnboardingUserSearchItem) => {
		setResetConfirmUser(user);
	}, []);

	// Ejecuta el reset una vez que el dialog confirmó. Actualiza el estado
	// local del search (chip de estado actualizado in-place) y muestra
	// snackbar de éxito/error.
	const confirmResetUser = useCallback(async () => {
		if (!resetConfirmUser) return;
		const user = resetConfirmUser;
		const label = user.firstName || user.email;

		try {
			setResettingUserId(user._id);
			const res = await OnboardingService.resetUserOnboarding(user._id, purgeEventsOnReset);
			if (res.success) {
				enqueueSnackbar(`Onboarding reseteado para ${label}${res.purgedEvents ? ` (${res.purgedEvents} eventos eliminados)` : ""}`, {
					variant: "success",
				});
				setSearchResults((prev) => prev.map((u) => (u._id === user._id ? { ...u, onboarding: res.user.onboarding } : u)));
				setResetConfirmUser(null);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear onboarding", { variant: "error" });
		} finally {
			setResettingUserId(null);
		}
	}, [resetConfirmUser, purgeEventsOnReset, enqueueSnackbar]);

	// Helper para renderizar el estado del onboarding como chip
	const renderOnboardingStateChip = (u: OnboardingUserSearchItem) => {
		const ob = u.onboarding;
		if (!ob) return <Chip label="Sin estado" size="small" variant="outlined" />;
		if (ob.onboardingComplete) return <Chip label="Completado" size="small" color="success" />;
		if (ob.dismissed) return <Chip label="Descartado" size="small" color="warning" />;
		if (ob.completedSteps?.length) {
			return (
				<Chip
					label={`${ob.completedSteps.length}/4 pasos · ${ob.onboardingSessionsCount || 0} sesiones`}
					size="small"
					color="info"
					variant="outlined"
				/>
			);
		}
		return <Chip label={`${ob.onboardingSessionsCount || 0} sesiones`} size="small" variant="outlined" />;
	};

	// Funnel chart colors
	const FUNNEL_COLORS = [BRAND_BLUE, theme.palette.info.main, theme.palette.warning.main, theme.palette.success.main];

	// Time distribution colors
	const TIME_COLORS = [
		theme.palette.success.main,
		theme.palette.success.light,
		theme.palette.info.main,
		theme.palette.warning.main,
		theme.palette.error.main,
	];

	return (
		<MainCard title="Analytics de onboarding" content={false}>
			{/* Header with filters and refresh */}
			<Box sx={{ p: 3, pb: 0 }}>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
					<Stack direction="row" spacing={2} alignItems="center">
						<TextField
							type="date"
							size="small"
							label="Desde"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						<TextField
							type="date"
							size="small"
							label="Hasta"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						<Button variant="contained" size="small" onClick={fetchData} disabled={loading}>
							Aplicar
						</Button>
						{(dateFrom || dateTo) && (
							<Button
								variant="outlined"
								size="small"
								onClick={() => {
									setDateFrom("");
									setDateTo("");
								}}
							>
								Limpiar
							</Button>
						)}
					</Stack>
					<Tooltip title="Actualizar datos">
						<IconButton onClick={fetchData} disabled={loading}>
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Box>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 2 }}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					TabIndicatorProps={{ sx: { height: 2.5, backgroundColor: BRAND_BLUE } }}
					sx={{
						"& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.875rem" },
						"& .Mui-selected": { fontWeight: 600, color: BRAND_BLUE + " !important" },
					}}
				>
					<Tab label="Resumen" />
					<Tab label="Eventos" />
					<Tab label="Usuarios estancados" />
					<Tab label="Reset por usuario" icon={<SearchNormal1 size={14} />} iconPosition="start" />
				</Tabs>
			</Box>

			{/* Tab: Summary */}
			<TabPanel value={tabValue} index={0}>
				<Box sx={{ px: 3, pb: 3 }}>
					{/* Summary Cards */}
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Usuarios con onboarding"
								value={summaryData?.summary.totalUsersWithOnboarding || 0}
								icon={<People size={24} />}
								color={BRAND_BLUE}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Crearon carpeta"
								value={summaryData?.summary.usersCreatedFolder || 0}
								subtitle={`${summaryData?.rates.activationRate || 0}% tasa de activación`}
								icon={<TickCircle size={24} />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Completaron onboarding"
								value={summaryData?.summary.usersCompletedOnboarding || 0}
								icon={<Activity size={24} />}
								color={theme.palette.info.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Descartaron"
								value={summaryData?.summary.usersDismissedOnboarding || 0}
								subtitle={`${summaryData?.rates.dismissRate || 0}% tasa de descarte`}
								icon={<CloseCircle size={24} />}
								color={theme.palette.warning.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Usuarios estancados"
								value={summaryData?.summary.stuckUsers || 0}
								subtitle={`${summaryData?.rates.stuckRate || 0}% del total`}
								icon={<Warning2 size={24} />}
								color={theme.palette.error.main}
								loading={loading}
							/>
						</Grid>
					</Grid>

					{/* Charts Row */}
					<Grid container spacing={3}>
						{/* Funnel Chart */}
						<Grid item xs={12} md={6}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
								<Typography variant="h6" gutterBottom>
									Funnel de conversión
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={300} />
								) : funnelData ? (
									<ResponsiveContainer width="100%" height={320}>
										<BarChart data={funnelData.funnel} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
											<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
											<XAxis type="number" />
											<YAxis type="category" dataKey="step" tick={{ fontSize: 12 }} width={90} />
											<RechartsTooltip
												formatter={(value: number, _name: string, props: any) => [`${value} usuarios (${props.payload.rate}%)`, ""]}
											/>
											<Bar dataKey="count" radius={[0, 4, 4, 0]}>
												{funnelData.funnel.map((_entry, index) => (
													<Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								) : (
									<Alert severity="info">No hay datos disponibles</Alert>
								)}
								{funnelData && (
									<Box sx={{ mt: 2, textAlign: "center" }}>
										<Chip label={`Tasa de conversion: ${funnelData.conversionRate}%`} color="success" variant="outlined" />
									</Box>
								)}
							</Paper>
						</Grid>

						{/* Time to Activation */}
						<Grid item xs={12} md={6}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
								<Typography variant="h6" gutterBottom>
									Tiempo hasta activación
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={300} />
								) : timeData && timeData.totalCompletions > 0 ? (
									<>
										<Stack direction="row" spacing={4} sx={{ mb: 3 }}>
											<Box>
												<Typography variant="body2" color="text.secondary">
													Tiempo promedio
												</Typography>
												<Typography variant="h4" color="primary">
													{timeData.averageTimeFormatted}
												</Typography>
											</Box>
											<Box>
												<Typography variant="body2" color="text.secondary">
													Tiempo mediano
												</Typography>
												<Typography variant="h4" color="info.main">
													{timeData.medianTimeFormatted}
												</Typography>
											</Box>
											<Box>
												<Typography variant="body2" color="text.secondary">
													Sesiones promedio
												</Typography>
												<Typography variant="h4" color="warning.main">
													{timeData.averageSessions}
												</Typography>
											</Box>
										</Stack>
										<ResponsiveContainer width="100%" height={200}>
											<PieChart>
												<Pie
													data={timeData.distribution as any[]}
													dataKey="count"
													nameKey="range"
													cx="50%"
													cy="50%"
													outerRadius={80}
													label={({ name, value }) => `${name}: ${value}`}
												>
													{timeData.distribution.map((_entry, index) => (
														<Cell key={`cell-${index}`} fill={TIME_COLORS[index % TIME_COLORS.length]} />
													))}
												</Pie>
												<RechartsTooltip />
											</PieChart>
										</ResponsiveContainer>
									</>
								) : (
									<Alert severity="info">No hay datos de tiempo disponibles</Alert>
								)}
							</Paper>
						</Grid>

						{/* Session Distribution */}
						<Grid item xs={12}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
								<Typography variant="h6" gutterBottom>
									Distribución por sesiones
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={200} />
								) : summaryData?.sessionDistribution && summaryData.sessionDistribution.length > 0 ? (
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Sesiones</TableCell>
													<TableCell align="right">Usuarios</TableCell>
													<TableCell align="right">Crearon Carpeta</TableCell>
													<TableCell align="right">Tasa de Conversion</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{summaryData.sessionDistribution.map((row) => (
													<TableRow key={row._id}>
														<TableCell>{row._id}</TableCell>
														<TableCell align="right">{row.count}</TableCell>
														<TableCell align="right">{row.createdFolder}</TableCell>
														<TableCell align="right">
															<Chip
																label={`${row.count > 0 ? ((row.createdFolder / row.count) * 100).toFixed(1) : 0}%`}
																size="small"
																color={
																	row.count > 0 && (row.createdFolder / row.count) * 100 > 50
																		? "success"
																		: row.count > 0 && (row.createdFolder / row.count) * 100 > 25
																		? "warning"
																		: "default"
																}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								) : (
									<Alert severity="info">No hay datos de distribucion disponibles</Alert>
								)}
							</Paper>
						</Grid>
					</Grid>
				</Box>
			</TabPanel>

			{/* Tab: Events */}
			<TabPanel value={tabValue} index={1}>
				<Box sx={{ px: 3, pb: 3 }}>
					<TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Evento</TableCell>
									<TableCell>Usuario</TableCell>
									<TableCell>Sesiones</TableCell>
									<TableCell>Fecha</TableCell>
									<TableCell>Metadata</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{events.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} align="center">
											<Typography color="text.secondary">No hay eventos</Typography>
										</TableCell>
									</TableRow>
								) : (
									events.map((event) => (
										<TableRow key={event._id} hover>
											<TableCell>
												<Chip
													label={EVENT_TRANSLATIONS[event.event] || event.event}
													size="small"
													color={EVENT_COLOR[event.event] || "default"}
												/>
											</TableCell>
											<TableCell>
												{event.userId ? (
													<Stack>
														<Typography variant="body2">{event.userId.name || "Sin nombre"}</Typography>
														<Typography variant="caption" color="text.secondary">
															{event.userId.email}
														</Typography>
													</Stack>
												) : (
													<Typography variant="body2" color="text.secondary">
														Usuario no disponible
													</Typography>
												)}
											</TableCell>
											<TableCell>{event.sessionsCount}</TableCell>
											<TableCell>
												<Typography variant="body2">{new Date(event.createdAt).toLocaleDateString()}</Typography>
												<Typography variant="caption" color="text.secondary">
													{new Date(event.createdAt).toLocaleTimeString()}
												</Typography>
											</TableCell>
											<TableCell>
												<Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
													{event.metadata?.step_id && (
														<Chip
															label={STEP_TRANSLATIONS[event.metadata.step_id] || event.metadata.step_id}
															size="small"
															variant="outlined"
														/>
													)}
													{event.metadata?.jurisdiction && (
														<Chip
															icon={<Link21 size={12} />}
															label={`${event.metadata.jurisdiction}${event.metadata.mode ? ` · ${event.metadata.mode}` : ""}`}
															size="small"
															variant="outlined"
															color="info"
														/>
													)}
													{event.metadata?.completed_count !== undefined && event.metadata?.total_steps !== undefined && (
														<Chip
															label={`${event.metadata.completed_count}/${event.metadata.total_steps}`}
															size="small"
															variant="outlined"
														/>
													)}
													{event.metadata?.timeToComplete && <Chip label={event.metadata.timeToComplete} size="small" variant="outlined" />}
													{event.metadata?.source && <Chip label={event.metadata.source} size="small" variant="outlined" />}
												</Stack>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
						<TablePagination
							component="div"
							count={eventsTotal}
							page={eventsPage}
							onPageChange={(_e, newPage) => setEventsPage(newPage)}
							rowsPerPage={10}
							rowsPerPageOptions={[10]}
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</TableContainer>
				</Box>
			</TabPanel>

			{/* Tab: Stuck Users */}
			<TabPanel value={tabValue} index={2}>
				<Box sx={{ px: 3, pb: 3 }}>
					<Alert severity="warning" sx={{ mb: 3 }}>
						Usuarios con 4 o mas sesiones de onboarding que aun no han creado su primera carpeta
					</Alert>
					<TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell align="center">Sesiones</TableCell>
									<TableCell>Ultima Sesion</TableCell>
									<TableCell>Registrado</TableCell>
									<TableCell align="center">Dias sin Activacion</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{stuckUsers.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<Typography color="text.secondary">No hay usuarios estancados</Typography>
										</TableCell>
									</TableRow>
								) : (
									stuckUsers.map((user) => (
										<TableRow key={user._id} hover>
											<TableCell>
												<Stack>
													<Typography variant="body2">{user.name || "Sin nombre"}</Typography>
													<Typography variant="caption" color="text.secondary">
														{user.email}
													</Typography>
												</Stack>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={user.sessionsCount}
													size="small"
													color={user.sessionsCount >= 6 ? "error" : user.sessionsCount >= 5 ? "warning" : "default"}
												/>
											</TableCell>
											<TableCell>
												{user.lastSessionAt ? (
													new Date(user.lastSessionAt).toLocaleDateString()
												) : (
													<Typography variant="body2" color="text.secondary">
														N/A
													</Typography>
												)}
											</TableCell>
											<TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
											<TableCell align="center">
												<Chip
													label={`${user.daysSinceRegistration} dias`}
													size="small"
													color={user.daysSinceRegistration > 14 ? "error" : user.daysSinceRegistration > 7 ? "warning" : "default"}
												/>
											</TableCell>
											<TableCell align="center">
												<Tooltip title="Resetear onboarding (vuelve a ver el checklist)" arrow>
													<span>
														<Button
															size="small"
															variant="outlined"
															color="primary"
															startIcon={<Refresh size={14} />}
															disabled={resettingUserId === user._id}
															onClick={() =>
																openResetDialog({
																	_id: user._id,
																	email: user.email,
																	firstName: user.name,
																	role: "USER_ROLE",
																	createdAt: user.createdAt,
																})
															}
															sx={{ textTransform: "none", fontSize: "0.75rem", py: 0.25 }}
														>
															{resettingUserId === user._id ? "..." : "Reset"}
														</Button>
													</span>
												</Tooltip>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
						<TablePagination
							component="div"
							count={stuckTotal}
							page={stuckPage}
							onPageChange={(_e, newPage) => setStuckPage(newPage)}
							rowsPerPage={10}
							rowsPerPageOptions={[10]}
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</TableContainer>
				</Box>
			</TabPanel>

			{/* Tab: Reset por usuario (QA/admin tool) */}
			<TabPanel value={tabValue} index={3}>
				<Box sx={{ px: 3, pb: 3 }}>
					<Alert severity="info" sx={{ mb: 3 }}>
						Buscá un usuario por email o nombre. El reset deja sus flags de onboarding en cero — el checklist vuelve a aparecer la próxima
						vez que entre al dashboard. Los recursos del usuario (carpetas, contactos, vencimientos) no se tocan. Si el usuario ya tiene
						carpetas, el paso 1 va a aparecer marcado automáticamente.
					</Alert>

					<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mb: 3 }}>
						<TextField
							fullWidth
							size="small"
							placeholder="Buscar por email o nombre (mín. 2 caracteres)..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							InputProps={{
								startAdornment: <SearchNormal1 size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
							}}
							sx={{ maxWidth: { sm: 500 } }}
						/>
						<Tooltip
							title="Si está activado, también borra los eventos históricos del usuario (deja la colección OnboardingEvent limpia para empezar de cero)"
							arrow
						>
							<Button
								variant={purgeEventsOnReset ? "contained" : "outlined"}
								color={purgeEventsOnReset ? "warning" : "primary"}
								startIcon={<Trash size={14} />}
								size="small"
								onClick={() => setPurgeEventsOnReset((v) => !v)}
								sx={{ textTransform: "none", whiteSpace: "nowrap" }}
							>
								Purgar eventos: {purgeEventsOnReset ? "SÍ" : "NO"}
							</Button>
						</Tooltip>
					</Stack>

					{searching && <LinearProgress sx={{ mb: 2 }} />}

					{searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 ? (
						<Alert severity="warning">No se encontraron usuarios con "{searchQuery}".</Alert>
					) : searchResults.length > 0 ? (
						<TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Usuario</TableCell>
										<TableCell>Rol</TableCell>
										<TableCell>Estado del onboarding</TableCell>
										<TableCell>Registrado</TableCell>
										<TableCell align="right">Acción</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{searchResults.map((u) => (
										<TableRow key={u._id} hover>
											<TableCell>
												<Stack>
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														{u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Sin nombre"}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{u.email}
													</Typography>
												</Stack>
											</TableCell>
											<TableCell>
												<Chip label={u.role} size="small" variant="outlined" color={u.role === "ADMIN_ROLE" ? "primary" : "default"} />
											</TableCell>
											<TableCell>{renderOnboardingStateChip(u)}</TableCell>
											<TableCell>
												<Typography variant="caption" color="text.secondary">
													{new Date(u.createdAt).toLocaleDateString()}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Button
													variant="contained"
													size="small"
													color="primary"
													startIcon={<Refresh size={14} />}
													disabled={resettingUserId === u._id}
													onClick={() => openResetDialog(u)}
													sx={{ textTransform: "none", fontSize: "0.78rem" }}
												>
													{resettingUserId === u._id ? "Reseteando..." : "Reset"}
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					) : searchQuery.trim().length < 2 ? (
						<Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
							Empezá a tipear para buscar usuarios.
						</Typography>
					) : null}

					<Divider sx={{ my: 3 }} />

					<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
						Nota: después del reset, el usuario tiene que limpiar su sessionStorage (clave <code>onboarding_data_&lt;userId&gt;</code>) o
						abrir una sesión nueva (incógnito) para que el frontend pida el estado fresco. Es un cache del lado del browser que el reset del
						backend no toca.
					</Typography>
				</Box>
			</TabPanel>

			{/* Dialog de confirmación del reset — patrón consistente con el resto
			    del admin (ver DeleteUserDialog). ResponsiveDialog + icono + datos
			    del user + botón Reset con loading state. Bloquea cierre durante
			    la operación. */}
			<ResponsiveDialog
				open={!!resetConfirmUser}
				onClose={resettingUserId ? undefined : () => setResetConfirmUser(null)}
				maxWidth="sm"
				disableEscapeKeyDown={!!resettingUserId}
			>
				<DialogTitle sx={{ pb: 1.5 }}>
					<Stack direction="row" spacing={1.25} alignItems="center">
						<Box
							sx={{
								width: 36,
								height: 36,
								borderRadius: 1.25,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								bgcolor: alpha(theme.palette.warning.main, 0.1),
								color: "warning.main",
							}}
						>
							<Refresh size={20} variant="Bold" />
						</Box>
						<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
							Resetear onboarding
						</Typography>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Resetear el onboarding del usuario{" "}
						<Typography component="span" fontWeight={600}>
							{resetConfirmUser?.firstName || resetConfirmUser?.lastName
								? `${resetConfirmUser?.firstName || ""} ${resetConfirmUser?.lastName || ""}`.trim()
								: "(sin nombre)"}
						</Typography>
						?
					</DialogContentText>
					<DialogContentText sx={{ mt: 2 }}>
						Email:{" "}
						<Typography component="span" fontWeight={600}>
							{resetConfirmUser?.email}
						</Typography>
					</DialogContentText>
					<DialogContentText sx={{ mt: 1 }}>
						Acciones:
						<Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
							<li>
								Se ponen en cero los flags de <code>User.onboarding</code> (createdFirstFolder, completedSteps, dismissed, etc).
							</li>
							<li>
								Las carpetas, contactos y vencimientos del usuario <strong>no se tocan</strong>.
							</li>
							{purgeEventsOnReset && (
								<li>
									<Typography component="span" sx={{ color: "warning.dark", fontWeight: 600 }}>
										También se borran sus eventos históricos de la colección OnboardingEvent.
									</Typography>
								</li>
							)}
						</Box>
					</DialogContentText>
					<DialogContentText sx={{ mt: 2, fontSize: "0.78rem", fontStyle: "italic" }}>
						El usuario tiene que limpiar su sessionStorage del browser (clave <code>onboarding_data_&lt;userId&gt;</code>) o abrir una
						sesión nueva para que el frontend pida el estado fresco.
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setResetConfirmUser(null)} color="secondary" disabled={!!resettingUserId}>
						Cancelar
					</Button>
					<Button
						onClick={confirmResetUser}
						color="primary"
						variant="contained"
						disableElevation
						disabled={!!resettingUserId}
						startIcon={resettingUserId ? <CircularProgress size={16} color="inherit" /> : <Refresh size={16} />}
						sx={{
							transition: "transform 160ms ease",
							"&:hover": { transform: "translateY(-1px)" },
							"&:active": { transform: "scale(0.98)" },
						}}
					>
						{resettingUserId ? "Reseteando..." : "Resetear"}
					</Button>
				</DialogActions>
			</ResponsiveDialog>
		</MainCard>
	);
};

export default OnboardingAnalytics;
