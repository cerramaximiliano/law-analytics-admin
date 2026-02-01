import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Grid,
	Card,
	CardContent,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	CircularProgress,
	Alert,
	IconButton,
	Tooltip,
	Button,
	Collapse,
	Skeleton,
	useTheme,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	alpha,
	Divider,
	Badge,
	ToggleButton,
	ToggleButtonGroup,
	Tabs,
	Tab,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import {
	Refresh2,
	Warning2,
	TickCircle,
	CloseCircle,
	InfoCircle,
	ArrowDown2,
	ArrowUp2,
	Clock,
	Document,
	Activity,
	Chart,
	Calendar,
	Calendar2,
	CalendarTick,
	Timer1,
	TrendUp,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	WorkersService,
	WorkerStatsTodayResponse,
	WorkerStatsRangeResponse,
	WorkerStatsByDateResponse,
	WorkerDailyStats,
	WorkerDailyStatsError,
	WorkerAlertsResponse,
	WorkerAvailableDate,
} from "api/workers";
import HourlyStatsPanel from "./HourlyStatsPanel";
import DailySummaryPanel from "./DailySummaryPanel";
import CapacityStatsWidget from "../../dashboard/CapacityStatsWidget";

// Fueros disponibles
const FUEROS = ["CIV", "COM", "CNT", "CSS", "CAF", "CCF", "CNE", "CPE", "CFP", "CCC", "CSJ"];

// Nombres completos de fueros
const FUERO_NAMES: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CNT: "Trabajo",
	CSS: "Seguridad Social",
	CAF: "Contencioso Administrativo Federal",
	CCF: "Civil y Comercial Federal",
	CNE: "Electoral",
	CPE: "Penal Económico",
	CFP: "Criminal y Correccional Federal",
	CCC: "Criminal y Correccional",
	CSJ: "Corte Suprema",
};

// Componente de tarjeta de estadística
interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();

	return (
		<Card
			sx={{
				height: "100%",
				bgcolor: alpha(color, 0.05),
				border: `1px solid ${alpha(color, 0.2)}`,
			}}
		>
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							{title}
						</Typography>
						{loading ? (
							<Skeleton width={80} height={40} />
						) : (
							<Typography variant="h4" fontWeight="bold" color={color}>
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
							p: 1,
							borderRadius: 2,
							bgcolor: alpha(color, 0.1),
							color: color,
						}}
					>
						{icon}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

// Componente para mostrar el estado de salud
const HealthIndicator: React.FC<{ health: string }> = ({ health }) => {
	const theme = useTheme();

	const getHealthConfig = (health: string) => {
		switch (health) {
			case "healthy":
				return { color: theme.palette.success.main, label: "Saludable", icon: <TickCircle size={16} /> };
			case "warning":
				return { color: theme.palette.warning.main, label: "Advertencia", icon: <Warning2 size={16} /> };
			case "critical":
				return { color: theme.palette.error.main, label: "Crítico", icon: <CloseCircle size={16} /> };
			case "idle":
				return { color: theme.palette.grey[500], label: "Inactivo", icon: <Clock size={16} /> };
			default:
				return { color: theme.palette.grey[500], label: "Desconocido", icon: <InfoCircle size={16} /> };
		}
	};

	const config = getHealthConfig(health);

	return (
		<Chip
			icon={config.icon}
			label={config.label}
			size="small"
			sx={{
				bgcolor: alpha(config.color, 0.1),
				color: config.color,
				fontWeight: 500,
				"& .MuiChip-icon": { color: config.color },
			}}
		/>
	);
};

// Tab panel component
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
			id={`stats-tabpanel-${index}`}
			aria-labelledby={`stats-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// Componente principal
const WorkerStatistics: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Tab state
	const [activeTab, setActiveTab] = useState(0);

	// Estados
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [todayStats, setTodayStats] = useState<WorkerStatsTodayResponse | null>(null);
	const [rangeStats, setRangeStats] = useState<WorkerStatsRangeResponse | null>(null);
	const [alerts, setAlerts] = useState<WorkerAlertsResponse | null>(null);
	const [selectedFuero, setSelectedFuero] = useState<string | null>(null);
	const [fueroDetails, setFueroDetails] = useState<any>(null);
	const [fueroErrors, setFueroErrors] = useState<WorkerDailyStatsError[]>([]);
	const [loadingDetails, setLoadingDetails] = useState(false);
	const [expandedFuero, setExpandedFuero] = useState<string | null>(null);

	// Tipo de worker fijo (antes era configurable)
	const workerTypeFilter = "app-update";

	// Tab change handler
	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Estados para filtro de fechas
	const [dateMode, setDateMode] = useState<"today" | "specific" | "range">("today");
	const [specificDate, setSpecificDate] = useState<string>("");
	const [dateFrom, setDateFrom] = useState<Dayjs | null>(dayjs().subtract(7, "day"));
	const [dateTo, setDateTo] = useState<Dayjs | null>(dayjs());
	const [availableDates, setAvailableDates] = useState<WorkerAvailableDate[]>([]);
	const [loadingDates, setLoadingDates] = useState(false);

	// Cargar fechas disponibles
	const fetchAvailableDates = useCallback(async () => {
		try {
			setLoadingDates(true);
			const response = await WorkersService.getWorkerStatsAvailableDates(workerTypeFilter);
			setAvailableDates(response.data || []);
			// Si hay fechas disponibles y no hay fecha seleccionada, seleccionar la más reciente
			if (response.data && response.data.length > 0 && !specificDate) {
				setSpecificDate(response.data[0].date);
			}
		} catch (error: any) {
			console.error("Error cargando fechas disponibles:", error);
		} finally {
			setLoadingDates(false);
		}
	}, [workerTypeFilter, specificDate]);

	// Cargar datos iniciales
	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			setRangeStats(null);

			let statsResponse: WorkerStatsTodayResponse | null = null;
			let rangeResponse: WorkerStatsRangeResponse | null = null;

			if (dateMode === "today") {
				// Obtener estadísticas del día actual
				statsResponse = await WorkersService.getWorkerStatsTodaySummary(workerTypeFilter);
			} else if (dateMode === "specific" && specificDate) {
				// Obtener estadísticas de una fecha específica
				const dateStr = specificDate;
				const response = await WorkersService.getWorkerStatsByDate(dateStr, { workerType: workerTypeFilter });

				// Convertir la respuesta de fecha específica al formato de todayStats
				if (response.success && response.data) {
					const totals = {
						totalToProcess: 0,
						processed: 0,
						successful: 0,
						failed: 0,
						skipped: 0,
						movimientosFound: 0,
						privateCausas: 0,
						publicCausas: 0,
						captchaAttempts: 0,
						captchaSuccessful: 0,
						captchaFailed: 0,
						successRate: "0%",
						captchaSuccessRate: "0%",
					};

					const byFuero: WorkerStatsTodayResponse["byFuero"] = [];

					for (const stat of response.data) {
						if (stat.stats) {
							Object.keys(totals).forEach((key) => {
								if (key !== "successRate" && key !== "captchaSuccessRate" && stat.stats[key as keyof typeof stat.stats]) {
									(totals as any)[key] += stat.stats[key as keyof typeof stat.stats];
								}
							});
						}

						byFuero.push({
							fuero: stat.fuero,
							status: stat.status,
							stats: stat.stats,
							runsCount: stat.runs?.length || 0,
							errorsCount: stat.errors?.length || 0,
							alerts: stat.alerts?.filter((a) => !a.acknowledged) || [],
							lastUpdate: stat.lastUpdate,
						});
					}

					// Calcular tasas de éxito
					totals.successRate = totals.processed > 0 ? `${((totals.successful / totals.processed) * 100).toFixed(1)}%` : "0%";
					totals.captchaSuccessRate =
						totals.captchaAttempts > 0 ? `${((totals.captchaSuccessful / totals.captchaAttempts) * 100).toFixed(1)}%` : "0%";

					statsResponse = {
						success: true,
						message: `Estadísticas del ${dateStr}`,
						date: dateStr,
						totals,
						byFuero,
						fueroCount: byFuero.length,
					};
				}
			} else if (dateMode === "range" && dateFrom && dateTo) {
				// Obtener estadísticas por rango de fechas
				rangeResponse = await WorkersService.getWorkerStatsByRange({
					from: dateFrom.format("YYYY-MM-DD"),
					to: dateTo.format("YYYY-MM-DD"),
					workerType: workerTypeFilter,
				});

				// También calcular totales para las tarjetas de resumen
				if (rangeResponse.success && rangeResponse.data) {
					const totals = {
						totalToProcess: 0,
						processed: 0,
						successful: 0,
						failed: 0,
						skipped: 0,
						movimientosFound: 0,
						privateCausas: 0,
						publicCausas: 0,
						captchaAttempts: 0,
						captchaSuccessful: 0,
						captchaFailed: 0,
						successRate: "0%",
						captchaSuccessRate: "0%",
					};

					for (const stat of rangeResponse.data) {
						if (stat.stats) {
							Object.keys(totals).forEach((key) => {
								if (key !== "successRate" && key !== "captchaSuccessRate" && stat.stats[key as keyof typeof stat.stats]) {
									(totals as any)[key] += stat.stats[key as keyof typeof stat.stats];
								}
							});
						}
					}

					totals.successRate = totals.processed > 0 ? `${((totals.successful / totals.processed) * 100).toFixed(1)}%` : "0%";
					totals.captchaSuccessRate =
						totals.captchaAttempts > 0 ? `${((totals.captchaSuccessful / totals.captchaAttempts) * 100).toFixed(1)}%` : "0%";

					statsResponse = {
						success: true,
						message: `Estadísticas del ${dateFrom.format("YYYY-MM-DD")} al ${dateTo.format("YYYY-MM-DD")}`,
						date: `${dateFrom.format("YYYY-MM-DD")} - ${dateTo.format("YYYY-MM-DD")}`,
						totals,
						byFuero: [],
						fueroCount: 0,
					};

					setRangeStats(rangeResponse);
				}
			}

			const alertsResponse = await WorkersService.getWorkerAlerts();

			setTodayStats(statsResponse);
			setAlerts(alertsResponse);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar estadísticas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [workerTypeFilter, dateMode, specificDate, dateFrom, dateTo, enqueueSnackbar]);

	// Refrescar datos
	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
		enqueueSnackbar("Datos actualizados", {
			variant: "success",
			anchorOrigin: { vertical: "bottom", horizontal: "right" },
		});
	};

	// Cargar detalles de un fuero
	const loadFueroDetails = async (fuero: string) => {
		try {
			setLoadingDetails(true);
			const [statusResponse, errorsResponse] = await Promise.all([
				WorkersService.getWorkerFueroStatus(fuero, workerTypeFilter),
				WorkersService.getWorkerFueroErrors(fuero, { workerType: workerTypeFilter, limit: 20 }),
			]);

			setFueroDetails(statusResponse.data);
			setFueroErrors(errorsResponse.data || []);
		} catch (error: any) {
			enqueueSnackbar(`Error al cargar detalles de ${fuero}`, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoadingDetails(false);
		}
	};

	// Manejar expansión de fuero
	const handleFueroExpand = (fuero: string) => {
		if (expandedFuero === fuero) {
			setExpandedFuero(null);
			setFueroDetails(null);
			setFueroErrors([]);
		} else {
			setExpandedFuero(fuero);
			loadFueroDetails(fuero);
		}
	};

	// Reconocer alerta
	const handleAcknowledgeAlert = async (fuero: string, alertType: string) => {
		try {
			await WorkersService.acknowledgeWorkerAlert(fuero, alertType, workerTypeFilter);
			enqueueSnackbar("Alerta reconocida", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			// Refrescar alertas
			const alertsResponse = await WorkersService.getWorkerAlerts();
			setAlerts(alertsResponse);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al reconocer alerta", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Efecto para cargar fechas disponibles
	useEffect(() => {
		fetchAvailableDates();
	}, [fetchAvailableDates]);

	// Efecto para cargar datos
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Auto-refresh cada 60 segundos
	useEffect(() => {
		const interval = setInterval(() => {
			fetchData();
		}, 60000);

		return () => clearInterval(interval);
	}, [fetchData]);

	// Formatear fecha
	const formatDate = (dateStr: string) => {
		if (!dateStr) return "-";
		const date = new Date(dateStr);
		return date.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Formatear número
	const formatNumber = (num: number) => {
		return new Intl.NumberFormat("es-AR").format(num);
	};

	// Handler para cambio de modo de fecha
	const handleDateModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: "today" | "specific" | "range" | null) => {
		if (newMode !== null) {
			setDateMode(newMode);
		}
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<Stack spacing={3}>
				{/* Header */}
				<Box>
					<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
						<Box>
							<Typography variant="h5" fontWeight="bold">
								Estadísticas de Workers
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Monitoreo del rendimiento de los workers de actualización
							</Typography>
						</Box>
					</Stack>
				</Box>

				{/* Capacity Stats Widget - Simulador de capacidad */}
				<CapacityStatsWidget />

				{/* Tabs Navigation */}
				<Paper sx={{ borderRadius: 2 }}>
					<Tabs
						value={activeTab}
						onChange={handleTabChange}
						variant="scrollable"
						scrollButtons="auto"
						sx={{ borderBottom: 1, borderColor: "divider" }}
					>
						<Tab
							label={
								<Stack direction="row" spacing={1} alignItems="center">
									<Chart size={18} />
									<span>Por Fuero</span>
								</Stack>
							}
							sx={{ textTransform: "none" }}
						/>
						<Tab
							label={
								<Stack direction="row" spacing={1} alignItems="center">
									<Timer1 size={18} />
									<span>Por Hora</span>
								</Stack>
							}
							sx={{ textTransform: "none" }}
						/>
						<Tab
							label={
								<Stack direction="row" spacing={1} alignItems="center">
									<TrendUp size={18} />
									<span>Tendencias</span>
								</Stack>
							}
							sx={{ textTransform: "none" }}
						/>
					</Tabs>
				</Paper>

				{/* Tab: Por Fuero (original content) */}
				<TabPanel value={activeTab} index={0}>
					<Stack spacing={3}>
				{/* Filtro de fechas */}
				<Paper sx={{ p: 2, borderRadius: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
							<Stack direction="row" spacing={1} alignItems="center">
								<Calendar size={20} color={theme.palette.primary.main} />
								<Typography variant="subtitle2" fontWeight="bold">
									Período de consulta
								</Typography>
							</Stack>
							<Tooltip title="Actualizar datos">
								<IconButton onClick={handleRefresh} disabled={refreshing} size="small">
									<Refresh2 size={18} className={refreshing ? "spin" : ""} />
								</IconButton>
							</Tooltip>
						</Stack>
						<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
							<ToggleButtonGroup
								value={dateMode}
								exclusive
								onChange={handleDateModeChange}
								size="small"
								sx={{ flexShrink: 0 }}
							>
								<ToggleButton value="today" sx={{ px: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center">
										<CalendarTick size={16} />
										<span>Hoy</span>
									</Stack>
								</ToggleButton>
								<ToggleButton value="specific" sx={{ px: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Calendar2 size={16} />
										<span>Fecha</span>
									</Stack>
								</ToggleButton>
								<ToggleButton value="range" sx={{ px: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center">
										<Calendar size={16} />
										<span>Rango</span>
									</Stack>
								</ToggleButton>
							</ToggleButtonGroup>

							{dateMode === "specific" && (
								<FormControl size="small" sx={{ minWidth: 200 }}>
									<InputLabel>Fecha</InputLabel>
									<Select
										value={specificDate}
										label="Fecha"
										onChange={(e) => setSpecificDate(e.target.value)}
										disabled={loadingDates}
									>
										{availableDates.map((dateInfo) => (
											<MenuItem key={dateInfo.date} value={dateInfo.date}>
												<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
													<Typography variant="body2">
														{dayjs(dateInfo.date).format("DD/MM/YYYY")}
													</Typography>
													<Stack direction="row" spacing={0.5}>
														<Chip
															label={`${dateInfo.totalProcessed}`}
															size="small"
															sx={{ height: 18, fontSize: "0.7rem" }}
														/>
													</Stack>
												</Stack>
											</MenuItem>
										))}
										{availableDates.length === 0 && (
											<MenuItem disabled>
												<Typography variant="body2" color="text.secondary">
													{loadingDates ? "Cargando..." : "Sin datos disponibles"}
												</Typography>
											</MenuItem>
										)}
									</Select>
								</FormControl>
							)}

							{dateMode === "range" && (
								<Stack direction="row" spacing={1} alignItems="center">
									<DatePicker
										label="Desde"
										value={dateFrom}
										onChange={(newValue) => setDateFrom(newValue)}
										format="DD/MM/YYYY"
										maxDate={dateTo || dayjs()}
										views={["year", "month", "day"]}
										openTo="day"
										slotProps={{
											textField: {
												size: "small",
												sx: { minWidth: 140 },
											},
											actionBar: {
												actions: ["today", "clear"],
											},
										}}
									/>
									<Typography variant="body2" color="text.secondary">
										—
									</Typography>
									<DatePicker
										label="Hasta"
										value={dateTo}
										onChange={(newValue) => setDateTo(newValue)}
										format="DD/MM/YYYY"
										minDate={dateFrom || undefined}
										maxDate={dayjs()}
										views={["year", "month", "day"]}
										openTo="day"
										slotProps={{
											textField: {
												size: "small",
												sx: { minWidth: 140 },
											},
											actionBar: {
												actions: ["today", "clear"],
											},
										}}
									/>
								</Stack>
							)}

							<Button variant="contained" size="small" onClick={fetchData} disabled={loading} sx={{ minWidth: 100 }}>
								Consultar
							</Button>
						</Stack>
					</Stack>
				</Paper>

			{/* Alertas activas */}
			{alerts && alerts.count > 0 && (
				<Alert
					severity="warning"
					icon={<Warning2 size={20} />}
					action={
						<Badge badgeContent={alerts.count} color="warning">
							<Button size="small" color="inherit">
								Ver todas
							</Button>
						</Badge>
					}
				>
					<Typography variant="subtitle2">
						Hay {alerts.count} alerta(s) activa(s) que requieren atención
					</Typography>
				</Alert>
			)}

			{/* Tarjetas de resumen */}
			{loading ? (
				<Grid container spacing={2}>
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<Grid item xs={12} sm={6} md={4} lg={2} key={i}>
							<Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
						</Grid>
					))}
				</Grid>
			) : todayStats ? (
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Procesados"
							value={formatNumber(todayStats.totals.processed)}
							icon={<Document size={24} />}
							color={theme.palette.primary.main}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Exitosos"
							value={formatNumber(todayStats.totals.successful)}
							subtitle={todayStats.totals.successRate}
							icon={<TickCircle size={24} />}
							color={theme.palette.success.main}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Fallidos"
							value={formatNumber(todayStats.totals.failed)}
							icon={<CloseCircle size={24} />}
							color={theme.palette.error.main}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Movimientos"
							value={formatNumber(todayStats.totals.movimientosFound)}
							icon={<Activity size={24} />}
							color={theme.palette.info.main}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Causas Privadas"
							value={formatNumber(todayStats.totals.privateCausas)}
							icon={<InfoCircle size={24} />}
							color={theme.palette.warning.main}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={2}>
						<StatCard
							title="Captchas"
							value={formatNumber(todayStats.totals.captchaAttempts)}
							subtitle={todayStats.totals.captchaSuccessRate}
							icon={<Chart size={24} />}
							color={theme.palette.secondary.main}
						/>
					</Grid>
				</Grid>
			) : (
				<Alert severity="info">No hay datos disponibles para hoy</Alert>
			)}

			{/* Tabla de estadísticas por fuero */}
			<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
				<Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderBottom: 1, borderColor: "divider" }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h6">Estadísticas por Fuero</Typography>
						<Typography variant="body2" color="text.secondary">
							Fecha: {todayStats?.date || "-"}
						</Typography>
					</Stack>
				</Box>

				{loading ? (
					<Box sx={{ p: 3 }}>
						<CircularProgress />
					</Box>
				) : (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell width={50}></TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="right">Procesados</TableCell>
									<TableCell align="right">Exitosos</TableCell>
									<TableCell align="right">Fallidos</TableCell>
									<TableCell align="right">Movimientos</TableCell>
									<TableCell align="right">Runs</TableCell>
									<TableCell align="right">Errores</TableCell>
									<TableCell>Última Actualización</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{todayStats?.byFuero && todayStats.byFuero.length > 0 ? (
									todayStats.byFuero.map((fuero) => (
										<React.Fragment key={fuero.fuero}>
											<TableRow
												hover
												sx={{ cursor: "pointer" }}
												onClick={() => handleFueroExpand(fuero.fuero)}
											>
												<TableCell>
													<IconButton size="small">
														{expandedFuero === fuero.fuero ? (
															<ArrowUp2 size={16} />
														) : (
															<ArrowDown2 size={16} />
														)}
													</IconButton>
												</TableCell>
												<TableCell>
													<Stack>
														<Typography variant="body2" fontWeight="bold">
															{fuero.fuero}
														</Typography>
														<Typography variant="caption" color="text.secondary">
															{FUERO_NAMES[fuero.fuero] || fuero.fuero}
														</Typography>
													</Stack>
												</TableCell>
												<TableCell align="center">
													<Chip
														label={fuero.status === "completed" ? "Completado" : fuero.status === "running" ? "En ejecución" : fuero.status}
														size="small"
														color={
															fuero.status === "completed"
																? "success"
																: fuero.status === "running"
																? "info"
																: fuero.status === "failed"
																? "error"
																: "default"
														}
													/>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2">
														{formatNumber(fuero.stats?.processed || 0)}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" color="success.main">
														{formatNumber(fuero.stats?.successful || 0)}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography
														variant="body2"
														color={fuero.stats?.failed > 0 ? "error.main" : "text.secondary"}
													>
														{formatNumber(fuero.stats?.failed || 0)}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2" color="info.main">
														{formatNumber(fuero.stats?.movimientosFound || 0)}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Chip label={fuero.runsCount} size="small" variant="outlined" />
												</TableCell>
												<TableCell align="right">
													{fuero.errorsCount > 0 ? (
														<Chip
															label={fuero.errorsCount}
															size="small"
															color="error"
															variant="outlined"
														/>
													) : (
														<Typography variant="body2" color="text.secondary">
															0
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<Typography variant="caption" color="text.secondary">
														{formatDate(fuero.lastUpdate)}
													</Typography>
												</TableCell>
											</TableRow>

											{/* Fila expandida con detalles */}
											<TableRow>
												<TableCell colSpan={10} sx={{ p: 0, border: 0 }}>
													<Collapse in={expandedFuero === fuero.fuero} timeout="auto" unmountOnExit>
														<Box sx={{ p: 3, bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
															{loadingDetails ? (
																<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
																	<CircularProgress size={30} />
																</Box>
															) : fueroDetails ? (
																<Grid container spacing={3}>
																	{/* Información general */}
																	<Grid item xs={12} md={4}>
																		<Card variant="outlined">
																			<CardContent>
																				<Typography variant="subtitle2" gutterBottom>
																					Estado de Salud
																				</Typography>
																				<Stack spacing={1}>
																					<HealthIndicator health={fueroDetails.health} />
																					<Typography variant="body2">
																						Tasa de error: {fueroDetails.errorRate}
																					</Typography>
																					<Divider />
																					<Typography variant="caption" color="text.secondary">
																						Última actualización:{" "}
																						{formatDate(fueroDetails.lastUpdate)}
																					</Typography>
																				</Stack>
																			</CardContent>
																		</Card>
																	</Grid>

																	{/* Estadísticas detalladas */}
																	<Grid item xs={12} md={4}>
																		<Card variant="outlined">
																			<CardContent>
																				<Typography variant="subtitle2" gutterBottom>
																					Estadísticas Detalladas
																				</Typography>
																				<Stack spacing={0.5}>
																					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																						<Typography variant="body2" color="text.secondary">
																							Causas públicas:
																						</Typography>
																						<Typography variant="body2">
																							{fueroDetails.stats?.publicCausas || 0}
																						</Typography>
																					</Box>
																					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																						<Typography variant="body2" color="text.secondary">
																							Causas privadas:
																						</Typography>
																						<Typography variant="body2">
																							{fueroDetails.stats?.privateCausas || 0}
																						</Typography>
																					</Box>
																					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																						<Typography variant="body2" color="text.secondary">
																							Omitidos:
																						</Typography>
																						<Typography variant="body2">
																							{fueroDetails.stats?.skipped || 0}
																						</Typography>
																					</Box>
																					<Divider />
																					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																						<Typography variant="body2" color="text.secondary">
																							Captchas intentados:
																						</Typography>
																						<Typography variant="body2">
																							{fueroDetails.stats?.captchaAttempts || 0}
																						</Typography>
																					</Box>
																					<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																						<Typography variant="body2" color="text.secondary">
																							Captchas exitosos:
																						</Typography>
																						<Typography variant="body2" color="success.main">
																							{fueroDetails.stats?.captchaSuccessful || 0}
																						</Typography>
																					</Box>
																				</Stack>
																			</CardContent>
																		</Card>
																	</Grid>

																	{/* Alertas del fuero */}
																	<Grid item xs={12} md={4}>
																		<Card variant="outlined">
																			<CardContent>
																				<Typography variant="subtitle2" gutterBottom>
																					Alertas
																				</Typography>
																				{fueroDetails.alerts && fueroDetails.alerts.length > 0 ? (
																					<Stack spacing={1}>
																						{fueroDetails.alerts.map((alert: any, idx: number) => (
																							<Alert
																								key={idx}
																								severity="warning"
																								sx={{ py: 0.5 }}
																								action={
																									<Button
																										size="small"
																										onClick={() =>
																											handleAcknowledgeAlert(
																												fuero.fuero,
																												alert.type
																											)
																										}
																									>
																										OK
																									</Button>
																								}
																							>
																								<Typography variant="caption">
																									{alert.message}
																								</Typography>
																							</Alert>
																						))}
																					</Stack>
																				) : (
																					<Typography variant="body2" color="text.secondary">
																						Sin alertas activas
																					</Typography>
																				)}
																			</CardContent>
																		</Card>
																	</Grid>

																	{/* Errores recientes */}
																	{fueroErrors.length > 0 && (
																		<Grid item xs={12}>
																			<Card variant="outlined">
																				<CardContent>
																					<Typography variant="subtitle2" gutterBottom>
																						Errores Recientes ({fueroErrors.length})
																					</Typography>
																					<TableContainer sx={{ maxHeight: 300 }}>
																						<Table size="small">
																							<TableHead>
																								<TableRow>
																									<TableCell>Hora</TableCell>
																									<TableCell>Tipo</TableCell>
																									<TableCell>Expediente</TableCell>
																									<TableCell>Mensaje</TableCell>
																								</TableRow>
																							</TableHead>
																							<TableBody>
																								{fueroErrors.slice(0, 10).map((error, idx) => (
																									<TableRow key={idx}>
																										<TableCell>
																											<Typography variant="caption">
																												{formatDate(error.timestamp)}
																											</Typography>
																										</TableCell>
																										<TableCell>
																											<Chip
																												label={error.errorType}
																												size="small"
																												color="error"
																												variant="outlined"
																											/>
																										</TableCell>
																										<TableCell>
																											{error.number && error.year
																												? `${error.number}/${error.year}`
																												: "-"}
																										</TableCell>
																										<TableCell>
																											<Typography
																												variant="caption"
																												sx={{
																													maxWidth: 300,
																													overflow: "hidden",
																													textOverflow: "ellipsis",
																													whiteSpace: "nowrap",
																													display: "block",
																												}}
																											>
																												{error.message}
																											</Typography>
																										</TableCell>
																									</TableRow>
																								))}
																							</TableBody>
																						</Table>
																					</TableContainer>
																				</CardContent>
																			</Card>
																		</Grid>
																	)}
																</Grid>
															) : (
																<Typography color="text.secondary">
																	No hay datos disponibles para este fuero
																</Typography>
															)}
														</Box>
													</Collapse>
												</TableCell>
											</TableRow>
										</React.Fragment>
									))
								) : (
									<TableRow>
										<TableCell colSpan={10} align="center">
											<Typography color="text.secondary" sx={{ py: 3 }}>
												No hay datos de fueros disponibles
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Tabla de resumen por día (solo para modo rango) */}
			{dateMode === "range" && rangeStats && rangeStats.summary && rangeStats.summary.length > 0 && (
				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderBottom: 1, borderColor: "divider" }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Typography variant="h6">Resumen por Día</Typography>
							<Typography variant="body2" color="text.secondary">
								{rangeStats.daysCount} día(s) con datos
							</Typography>
						</Stack>
					</Box>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell align="right">Procesados</TableCell>
									<TableCell align="right">Exitosos</TableCell>
									<TableCell align="right">Fallidos</TableCell>
									<TableCell align="right">Movimientos</TableCell>
									<TableCell align="right">Tasa Éxito</TableCell>
									<TableCell>Fueros</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rangeStats.summary.map((day) => {
									const successRate = day.totalProcessed > 0 ? ((day.totalSuccessful / day.totalProcessed) * 100).toFixed(1) : "0";
									return (
										<TableRow key={day.date} hover>
											<TableCell>
												<Typography variant="body2" fontWeight={500}>
													{dayjs(day.date).format("DD/MM/YYYY")}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2">{formatNumber(day.totalProcessed)}</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" color="success.main">
													{formatNumber(day.totalSuccessful)}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" color={day.totalFailed > 0 ? "error.main" : "text.secondary"}>
													{formatNumber(day.totalFailed)}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" color="info.main">
													{formatNumber(day.totalMovimientos)}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Chip
													label={`${successRate}%`}
													size="small"
													color={Number(successRate) >= 80 ? "success" : Number(successRate) >= 50 ? "warning" : "error"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell>
												<Stack direction="row" spacing={0.5} flexWrap="wrap">
													{day.fueros.map((fuero) => (
														<Chip key={fuero} label={fuero} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
													))}
												</Stack>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			)}

			{/* Información adicional */}
			<Alert severity="info" icon={<InfoCircle size={20} />}>
				<Typography variant="body2">
					{dateMode === "today"
						? "Las estadísticas se actualizan automáticamente cada 60 segundos."
						: "Selecciona una fecha o rango para consultar estadísticas históricas."}
					{" "}Haz clic en una fila de fuero para ver detalles adicionales como errores recientes y alertas.
				</Typography>
			</Alert>
					</Stack>
				</TabPanel>

				{/* Tab: Por Hora (hourly stats) */}
				<TabPanel value={activeTab} index={1}>
					<HourlyStatsPanel workerType={workerTypeFilter} />
				</TabPanel>

				{/* Tab: Tendencias (daily summary) */}
				<TabPanel value={activeTab} index={2}>
					<DailySummaryPanel workerType={workerTypeFilter} />
				</TabPanel>
		</Stack>
		</LocalizationProvider>
	);
};

export default WorkerStatistics;
