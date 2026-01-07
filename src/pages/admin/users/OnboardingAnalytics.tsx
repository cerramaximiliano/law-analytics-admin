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
} from "@mui/material";
import { Refresh, Chart, People, Activity, Timer1, Warning2, TickCircle, CloseCircle, ArrowDown } from "iconsax-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie } from "recharts";
import MainCard from "components/MainCard";
import OnboardingService from "api/onboarding";
import {
	OnboardingSummaryData,
	OnboardingEvent,
	OnboardingStuckUser,
	OnboardingFunnelData,
	OnboardingTimeToActivationData,
} from "types/onboarding";
import { useSnackbar } from "notistack";

// Event name translations
const EVENT_TRANSLATIONS: Record<string, string> = {
	onboarding_shown: "Onboarding mostrado",
	onboarding_cta_clicked: "Click en CTA",
	folder_created_from_onboarding: "Carpeta creada",
	onboarding_dismissed: "Descartado",
	onboarding_completed: "Completado",
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
			}}
		>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
				<Box>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						{title}
					</Typography>
					{loading ? (
						<Skeleton width={80} height={40} />
					) : (
						<Typography variant="h3" fontWeight={600}>
							{value}
						</Typography>
					)}
					{subtitle && (
						<Typography variant="caption" color="text.secondary">
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						width: 48,
						height: 48,
						borderRadius: 2,
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

	// Funnel chart colors
	const FUNNEL_COLORS = [
		theme.palette.primary.main,
		theme.palette.info.main,
		theme.palette.warning.main,
		theme.palette.success.main,
	];

	// Time distribution colors
	const TIME_COLORS = [
		theme.palette.success.main,
		theme.palette.success.light,
		theme.palette.info.main,
		theme.palette.warning.main,
		theme.palette.error.main,
	];

	return (
		<MainCard title="Analytics de Onboarding" content={false}>
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
				<Tabs value={tabValue} onChange={handleTabChange}>
					<Tab label="Resumen" />
					<Tab label="Eventos" />
					<Tab label="Usuarios Estancados" />
				</Tabs>
			</Box>

			{/* Tab: Summary */}
			<TabPanel value={tabValue} index={0}>
				<Box sx={{ px: 3, pb: 3 }}>
					{/* Summary Cards */}
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Usuarios con Onboarding"
								value={summaryData?.summary.totalUsersWithOnboarding || 0}
								icon={<People size={24} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Crearon Carpeta"
								value={summaryData?.summary.usersCreatedFolder || 0}
								subtitle={`${summaryData?.rates.activationRate || 0}% tasa de activacion`}
								icon={<TickCircle size={24} />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<StatCard
								title="Completaron Onboarding"
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
								title="Usuarios Estancados"
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
									Funnel de Conversion
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={300} />
								) : funnelData ? (
									<ResponsiveContainer width="100%" height={320}>
										<BarChart
											data={funnelData.funnel}
											layout="vertical"
											margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
										>
											<CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
											<XAxis type="number" />
											<YAxis type="category" dataKey="step" tick={{ fontSize: 12 }} width={90} />
											<RechartsTooltip
												formatter={(value: number, _name: string, props: any) => [
													`${value} usuarios (${props.payload.rate}%)`,
													"",
												]}
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
										<Chip
											label={`Tasa de conversion: ${funnelData.conversionRate}%`}
											color="success"
											variant="outlined"
										/>
									</Box>
								)}
							</Paper>
						</Grid>

						{/* Time to Activation */}
						<Grid item xs={12} md={6}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 400 }}>
								<Typography variant="h6" gutterBottom>
									Tiempo hasta Activacion
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
													data={timeData.distribution}
													dataKey="count"
													nameKey="range"
													cx="50%"
													cy="50%"
													outerRadius={80}
													label={({ range, count }) => `${range}: ${count}`}
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
									Distribucion por Sesiones
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
													color={
														event.event === "folder_created_from_onboarding"
															? "success"
															: event.event === "onboarding_dismissed"
															? "warning"
															: event.event === "onboarding_completed"
															? "info"
															: "default"
													}
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
												{event.metadata?.timeToComplete && (
													<Chip label={event.metadata.timeToComplete} size="small" variant="outlined" />
												)}
												{event.metadata?.source && (
													<Chip label={event.metadata.source} size="small" variant="outlined" sx={{ ml: 0.5 }} />
												)}
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
								</TableRow>
							</TableHead>
							<TableBody>
								{stuckUsers.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} align="center">
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
													color={
														user.daysSinceRegistration > 14
															? "error"
															: user.daysSinceRegistration > 7
															? "warning"
															: "default"
													}
												/>
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
		</MainCard>
	);
};

export default OnboardingAnalytics;
