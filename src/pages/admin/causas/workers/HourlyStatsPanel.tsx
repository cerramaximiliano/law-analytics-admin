import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Paper,
	Grid,
	Stack,
	Skeleton,
	useTheme,
	alpha,
	ToggleButton,
	ToggleButtonGroup,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Card,
	CardContent,
	IconButton,
	Tooltip,
	Alert,
} from "@mui/material";
import { Clock, Activity, Refresh2, ArrowUp, ArrowDown, Chart, Timer } from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	Legend,
	AreaChart,
	Area,
	ComposedChart,
	Line,
} from "recharts";
import dayjs, { todayInTimezone, currentHourInTimezone, formatInTimezone } from "utils/dayjs-config";
import {
	WorkersService,
	WorkerHourlyCurrentResponse,
	WorkerHourlyDaySummaryResponse,
	WorkerHourlyScalingEventsResponse,
} from "api/workers";

// Color palette
const COLORS = {
	primary: "#4F46E5",
	success: "#10B981",
	error: "#EF4444",
	warning: "#F59E0B",
	info: "#3B82F6",
	neutral: "#64748B",
};

// Stat Card Component
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
			<CardContent sx={{ py: 1.5 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="caption" color="text.secondary">
							{title}
						</Typography>
						{loading ? (
							<Skeleton width={60} height={32} />
						) : (
							<Typography variant="h5" fontWeight="bold" color={color}>
								{typeof value === "number" ? value.toLocaleString("es-AR") : value}
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
							p: 0.75,
							borderRadius: 1.5,
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

interface HourlyStatsPanelProps {
	workerType?: string;
}

const HourlyStatsPanel: React.FC<HourlyStatsPanelProps> = ({ workerType = "app-update" }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [viewMode, setViewMode] = useState<"current" | "today">("today");
	const [currentHourData, setCurrentHourData] = useState<WorkerHourlyCurrentResponse["data"] | null>(null);
	const [todaySummary, setTodaySummary] = useState<WorkerHourlyDaySummaryResponse["data"] | null>(null);
	const [scalingEvents, setScalingEvents] = useState<WorkerHourlyScalingEventsResponse["data"]>([]);

	// Fetch data
	const fetchData = useCallback(async () => {
		try {
			setLoading(true);

			const [currentRes, todayRes, eventsRes] = await Promise.all([
				WorkersService.getWorkerHourlyCurrent(workerType),
				WorkersService.getWorkerHourlyDaySummary(todayInTimezone(), { workerType }),
				WorkersService.getWorkerHourlyScalingEvents({ hours: 24, workerType }),
			]);

			if (currentRes.success) {
				setCurrentHourData(currentRes.data);
			}

			if (todayRes.success) {
				setTodaySummary(todayRes.data);
			}

			if (eventsRes.success) {
				setScalingEvents(eventsRes.data);
			}
		} catch (error: any) {
			console.error("Error fetching hourly stats:", error);
			enqueueSnackbar(error.message || "Error al cargar estadísticas horarias", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [workerType, enqueueSnackbar]);

	// Refresh handler
	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
		enqueueSnackbar("Datos actualizados", {
			variant: "success",
			anchorOrigin: { vertical: "bottom", horizontal: "right" },
		});
	};

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Auto-refresh every 60 seconds
	useEffect(() => {
		const interval = setInterval(fetchData, 60000);
		return () => clearInterval(interval);
	}, [fetchData]);

	// Prepare chart data from hourly summary
	const chartData = todaySummary
		? Object.entries(todaySummary.byHour)
				.map(([hour, stats]) => ({
					hour: parseInt(hour),
					hourLabel: `${hour.padStart(2, "0")}:00`,
					processed: stats.processed,
					successful: stats.successful,
					failed: stats.failed,
					movimientos: stats.movimientosFound,
				}))
				.sort((a, b) => a.hour - b.hour)
		: [];

	// Get current hour stats for display
	const currentHour = currentHourInTimezone();

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box>
				<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
					<Box>
						<Typography variant="h6" fontWeight="bold">
							Estadísticas por Hora
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Rendimiento de los workers en las últimas 24 horas
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center">
						<ToggleButtonGroup
							value={viewMode}
							exclusive
							onChange={(_, v) => v && setViewMode(v)}
							size="small"
						>
							<ToggleButton value="today" sx={{ px: 2 }}>
								<Stack direction="row" spacing={1} alignItems="center">
									<Chart size={16} />
									<span>Hoy</span>
								</Stack>
							</ToggleButton>
							<ToggleButton value="current" sx={{ px: 2 }}>
								<Stack direction="row" spacing={1} alignItems="center">
									<Clock size={16} />
									<span>Hora Actual</span>
								</Stack>
							</ToggleButton>
						</ToggleButtonGroup>
						<Tooltip title="Actualizar datos">
							<IconButton onClick={handleRefresh} disabled={refreshing} size="small">
								<Refresh2 size={18} className={refreshing ? "spin" : ""} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
			</Box>

			{/* Current Hour Stats (if viewMode is "current") */}
			{viewMode === "current" && currentHourData && (
				<Paper sx={{ p: 2, borderRadius: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Clock size={20} color={theme.palette.primary.main} />
							<Typography variant="subtitle1" fontWeight="bold">
								Hora Actual ({currentHourData.hour}:00 - {currentHourData.hour + 1}:00)
							</Typography>
							<Chip label={currentHourData.date} size="small" variant="outlined" />
						</Stack>

						{/* Summary cards */}
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<StatCard
									title="Procesados"
									value={currentHourData.totals.processed}
									icon={<Activity size={18} />}
									color={COLORS.primary}
									loading={loading}
								/>
							</Grid>
							<Grid item xs={6} sm={3}>
								<StatCard
									title="Exitosos"
									value={currentHourData.totals.successful}
									icon={<Activity size={18} />}
									color={COLORS.success}
									loading={loading}
								/>
							</Grid>
							<Grid item xs={6} sm={3}>
								<StatCard
									title="Fallidos"
									value={currentHourData.totals.failed}
									icon={<Activity size={18} />}
									color={COLORS.error}
									loading={loading}
								/>
							</Grid>
							<Grid item xs={6} sm={3}>
								<StatCard
									title="Movimientos"
									value={currentHourData.totals.movimientosFound}
									icon={<Activity size={18} />}
									color={COLORS.info}
									loading={loading}
								/>
							</Grid>
						</Grid>

						{/* By Fuero table */}
						{Object.keys(currentHourData.byFuero).length > 0 && (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fuero</TableCell>
											<TableCell align="right">Procesados</TableCell>
											<TableCell align="right">Exitosos</TableCell>
											<TableCell align="right">Fallidos</TableCell>
											<TableCell align="right">Movimientos</TableCell>
											<TableCell align="right">Workers (avg/max)</TableCell>
											<TableCell align="right">Pendientes</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{Object.entries(currentHourData.byFuero).map(([fuero, stats]) => (
											<TableRow key={fuero}>
												<TableCell>
													<Typography variant="body2" fontWeight="bold">
														{fuero}
													</Typography>
												</TableCell>
												<TableCell align="right">{stats.processed}</TableCell>
												<TableCell align="right">
													<Typography color="success.main">{stats.successful}</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography color={stats.failed > 0 ? "error.main" : "text.secondary"}>
														{stats.failed}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography color="info.main">{stats.movimientosFound}</Typography>
												</TableCell>
												<TableCell align="right">
													{stats.avgWorkers.toFixed(1)} / {stats.maxWorkers}
												</TableCell>
												<TableCell align="right">{stats.pendingAtEnd ?? "-"}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Stack>
				</Paper>
			)}

			{/* Today Summary (if viewMode is "today") */}
			{viewMode === "today" && (
				<>
					{/* Summary Cards */}
					<Grid container spacing={2}>
						<Grid item xs={6} sm={2.4}>
							<StatCard
								title="Procesados Hoy"
								value={todaySummary?.totals.processed || 0}
								icon={<Activity size={18} />}
								color={COLORS.primary}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={6} sm={2.4}>
							<StatCard
								title="Exitosos"
								value={todaySummary?.totals.successful || 0}
								icon={<Activity size={18} />}
								color={COLORS.success}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={6} sm={2.4}>
							<StatCard
								title="Fallidos"
								value={todaySummary?.totals.failed || 0}
								icon={<Activity size={18} />}
								color={COLORS.error}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={6} sm={2.4}>
							<StatCard
								title="Movimientos"
								value={todaySummary?.totals.movimientosFound || 0}
								icon={<Activity size={18} />}
								color={COLORS.info}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={6} sm={2.4}>
							<StatCard
								title="Horas Activas"
								value={todaySummary?.totals.activeHours || 0}
								subtitle={`de ${currentHour + 1} transcurridas`}
								icon={<Timer size={18} />}
								color={COLORS.neutral}
								loading={loading}
							/>
						</Grid>
					</Grid>

					{/* Hourly Chart */}
					<Paper sx={{ p: 2.5, borderRadius: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
							Distribución por Hora
						</Typography>
						<Box sx={{ height: 350 }}>
							{loading ? (
								<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
							) : chartData.length === 0 ? (
								<Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
									<Typography color="text.secondary">No hay datos disponibles para hoy</Typography>
								</Box>
							) : (
								<ResponsiveContainer width="100%" height="100%">
									<ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
										<defs>
											<linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8} />
												<stop offset="95%" stopColor={COLORS.success} stopOpacity={0.3} />
											</linearGradient>
										</defs>
										<CartesianGrid
											strokeDasharray="3 3"
											stroke={alpha(theme.palette.divider, 0.5)}
											vertical={false}
										/>
										<XAxis
											dataKey="hourLabel"
											tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
											interval={0}
											angle={-45}
											textAnchor="end"
											height={50}
										/>
										<YAxis
											yAxisId="left"
											tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											yAxisId="right"
											orientation="right"
											tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
											axisLine={false}
											tickLine={false}
										/>
										<RechartsTooltip
											contentStyle={{
												backgroundColor: theme.palette.background.paper,
												border: `1px solid ${theme.palette.divider}`,
												borderRadius: 8,
											}}
											formatter={(value: number, name: string) => [
												value.toLocaleString("es-AR"),
												name === "successful"
													? "Exitosos"
													: name === "failed"
													? "Fallidos"
													: name === "movimientos"
													? "Movimientos"
													: "Procesados",
											]}
										/>
										<Legend
											formatter={(value) =>
												value === "successful"
													? "Exitosos"
													: value === "failed"
													? "Fallidos"
													: value === "movimientos"
													? "Movimientos"
													: "Procesados"
											}
										/>
										<Bar yAxisId="left" dataKey="successful" fill="url(#colorSuccessful)" radius={[4, 4, 0, 0]} />
										<Bar yAxisId="left" dataKey="failed" fill={COLORS.error} radius={[4, 4, 0, 0]} />
										<Line
											yAxisId="right"
											type="monotone"
											dataKey="movimientos"
											stroke={COLORS.info}
											strokeWidth={2}
											dot={{ r: 3 }}
										/>
									</ComposedChart>
								</ResponsiveContainer>
							)}
						</Box>
					</Paper>
				</>
			)}

			{/* Scaling Events */}
			{scalingEvents.length > 0 && (
				<Paper sx={{ p: 2, borderRadius: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Activity size={20} color={theme.palette.warning.main} />
							<Typography variant="subtitle1" fontWeight="bold">
								Eventos de Escalado (últimas 24h)
							</Typography>
							<Chip label={scalingEvents.length} size="small" color="warning" variant="outlined" />
						</Stack>

						<TableContainer sx={{ maxHeight: 250 }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										<TableCell>Hora</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Workers</TableCell>
										<TableCell>Pendientes</TableCell>
										<TableCell>Razón</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{scalingEvents.slice(0, 10).map((event, idx) => (
										<TableRow key={idx}>
											<TableCell>
												<Typography variant="caption">
													{formatInTimezone(event.timestamp, "HH:mm")}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={event.fuero} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Chip
													icon={event.type === "scale_up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
													label={event.type === "scale_up" ? "Subir" : "Bajar"}
													size="small"
													color={event.type === "scale_up" ? "success" : "warning"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2">
													{event.from} → {event.to}
												</Typography>
											</TableCell>
											<TableCell>{event.pending}</TableCell>
											<TableCell>
												<Typography
													variant="caption"
													sx={{
														maxWidth: 200,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: "nowrap",
														display: "block",
													}}
												>
													{event.reason}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Stack>
				</Paper>
			)}

			{/* Info Alert */}
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					Las estadísticas horarias se actualizan automáticamente cada minuto. Utiliza la vista "Hora Actual" para ver el desglose por fuero en tiempo real.
				</Typography>
			</Alert>
		</Stack>
	);
};

export default HourlyStatsPanel;
