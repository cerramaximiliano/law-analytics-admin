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
	LinearProgress,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
} from "@mui/material";
import {
	Chart,
	Activity,
	Refresh2,
	TrendUp,
	TrendDown,
	Calendar,
	Timer,
	TickCircle,
	CloseCircle,
	ArrowSwapHorizontal,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	Legend,
	ComposedChart,
	Line,
	Bar,
	BarChart,
} from "recharts";
import {
	WorkersService,
	WorkerDailySummaryData,
	WorkerDailySummaryChartResponse,
	WorkerDailySummaryCompareResponse,
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
	trend?: { value: number; isPositive: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading, trend }) => {
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
							<Stack direction="row" spacing={1} alignItems="baseline">
								<Typography variant="h5" fontWeight="bold" color={color}>
									{typeof value === "number" ? value.toLocaleString("es-AR") : value}
								</Typography>
								{trend && (
									<Chip
										icon={trend.isPositive ? <TrendUp size={12} /> : <TrendDown size={12} />}
										label={`${trend.value > 0 ? "+" : ""}${trend.value}%`}
										size="small"
										color={trend.isPositive ? "success" : "error"}
										sx={{ height: 20, fontSize: "0.7rem" }}
									/>
								)}
							</Stack>
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

interface DailySummaryPanelProps {
	workerType?: string;
}

const DailySummaryPanel: React.FC<DailySummaryPanelProps> = ({ workerType = "app-update" }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [chartDays, setChartDays] = useState<number>(30);
	const [todaySummary, setTodaySummary] = useState<WorkerDailySummaryData | null>(null);
	const [chartData, setChartData] = useState<WorkerDailySummaryChartResponse["data"]>([]);
	const [comparison, setComparison] = useState<WorkerDailySummaryCompareResponse["data"] | null>(null);

	// Comparison dates
	const [compareDate1, setCompareDate1] = useState<Dayjs | null>(dayjs().subtract(1, "day"));
	const [compareDate2, setCompareDate2] = useState<Dayjs | null>(dayjs());
	const [showComparison, setShowComparison] = useState(false);

	// Fetch data
	const fetchData = useCallback(async () => {
		try {
			setLoading(true);

			const [summaryRes, chartRes] = await Promise.all([
				WorkersService.getWorkerDailySummaryToday(workerType),
				WorkersService.getWorkerDailySummaryChart({ days: chartDays, workerType }),
			]);

			if (summaryRes.success) {
				setTodaySummary(summaryRes.data);
			}

			if (chartRes.success) {
				setChartData(chartRes.data);
			}
		} catch (error: any) {
			console.error("Error fetching daily summary:", error);
			enqueueSnackbar(error.message || "Error al cargar resumen diario", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [workerType, chartDays, enqueueSnackbar]);

	// Fetch comparison
	const fetchComparison = useCallback(async () => {
		if (!compareDate1 || !compareDate2) return;

		try {
			const res = await WorkersService.getWorkerDailySummaryCompare(
				compareDate1.format("YYYY-MM-DD"),
				compareDate2.format("YYYY-MM-DD"),
				workerType
			);

			if (res.success) {
				setComparison(res.data);
			}
		} catch (error: any) {
			console.error("Error fetching comparison:", error);
			enqueueSnackbar(error.message || "Error al comparar días", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	}, [compareDate1, compareDate2, workerType, enqueueSnackbar]);

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

	useEffect(() => {
		if (showComparison) {
			fetchComparison();
		}
	}, [showComparison, fetchComparison]);

	// Format chart data for display
	const formattedChartData = chartData.map((d) => ({
		...d,
		dateLabel: dayjs(d.date).format("DD/MM"),
		successRateNum: parseFloat(String(d.successRate)) || 0,
	}));

	// Calculate trends
	const getTrend = (current: number, comparison: number): { value: number; isPositive: boolean } | undefined => {
		if (!todaySummary?.comparison) return undefined;
		if (comparison === 0) return undefined;
		const diff = Math.round(((current - comparison) / comparison) * 100);
		return { value: diff, isPositive: diff >= 0 };
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<Stack spacing={3}>
				{/* Header */}
				<Box>
					<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
						<Box>
							<Typography variant="h6" fontWeight="bold">
								Resumen Diario
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Tendencias de rendimiento en los últimos {chartDays} días
							</Typography>
						</Box>
						<Stack direction="row" spacing={1} alignItems="center">
							<FormControl size="small" sx={{ minWidth: 100 }}>
								<InputLabel>Días</InputLabel>
								<Select
									value={chartDays}
									label="Días"
									onChange={(e) => setChartDays(Number(e.target.value))}
								>
									<MenuItem value={7}>7 días</MenuItem>
									<MenuItem value={14}>14 días</MenuItem>
									<MenuItem value={30}>30 días</MenuItem>
									<MenuItem value={60}>60 días</MenuItem>
									<MenuItem value={90}>90 días</MenuItem>
								</Select>
							</FormControl>
							<Tooltip title="Actualizar datos">
								<IconButton onClick={handleRefresh} disabled={refreshing} size="small">
									<Refresh2 size={18} className={refreshing ? "spin" : ""} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>
				</Box>

				{/* Today Summary Cards */}
				<Grid container spacing={2}>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Procesados Hoy"
							value={todaySummary?.totals.processed || 0}
							icon={<Activity size={18} />}
							color={COLORS.primary}
							loading={loading}
							trend={todaySummary?.comparison ? getTrend(todaySummary.totals.processed, todaySummary.totals.processed - (todaySummary.comparison.processed || 0)) : undefined}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Exitosos"
							value={todaySummary?.totals.successful || 0}
							icon={<TickCircle size={18} />}
							color={COLORS.success}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Fallidos"
							value={todaySummary?.totals.failed || 0}
							icon={<CloseCircle size={18} />}
							color={COLORS.error}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Tasa Éxito"
							value={`${(todaySummary?.totals.successRate || 0).toFixed(1)}%`}
							icon={<Chart size={18} />}
							color={COLORS.info}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Movimientos"
							value={todaySummary?.totals.movimientosFound || 0}
							icon={<Activity size={18} />}
							color={COLORS.warning}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={6} sm={4} md={2}>
						<StatCard
							title="Escalados"
							value={todaySummary?.totals.totalScalingEvents || 0}
							icon={<TrendUp size={18} />}
							color={COLORS.neutral}
							loading={loading}
						/>
					</Grid>
				</Grid>

				{/* Main Chart - Trend over time */}
				<Paper sx={{ p: 2.5, borderRadius: 2 }}>
					<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
						Tendencia de Procesamiento
					</Typography>
					<Box sx={{ height: 350 }}>
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : formattedChartData.length === 0 ? (
							<Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
								<Typography color="text.secondary">No hay datos disponibles</Typography>
							</Box>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<ComposedChart data={formattedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
									<defs>
										<linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
											<stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
										</linearGradient>
										<linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
											<stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={alpha(theme.palette.divider, 0.5)}
										vertical={false}
									/>
									<XAxis
										dataKey="dateLabel"
										tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
										interval="preserveStartEnd"
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
										domain={[0, 100]}
										tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
										axisLine={false}
										tickLine={false}
										tickFormatter={(v) => `${v}%`}
									/>
									<RechartsTooltip
										contentStyle={{
											backgroundColor: theme.palette.background.paper,
											border: `1px solid ${theme.palette.divider}`,
											borderRadius: 8,
										}}
										formatter={(value: number, name: string) => {
											if (name === "successRateNum") return [`${value.toFixed(1)}%`, "Tasa Éxito"];
											return [value.toLocaleString("es-AR"),
												name === "processed" ? "Procesados" :
												name === "successful" ? "Exitosos" :
												name === "failed" ? "Fallidos" :
												name === "movimientosFound" ? "Movimientos" : name
											];
										}}
										labelFormatter={(label) => `Fecha: ${label}`}
									/>
									<Legend
										formatter={(value) =>
											value === "processed" ? "Procesados" :
											value === "successful" ? "Exitosos" :
											value === "failed" ? "Fallidos" :
											value === "movimientosFound" ? "Movimientos" :
											value === "successRateNum" ? "Tasa Éxito" : value
										}
									/>
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="processed"
										stroke={COLORS.primary}
										strokeWidth={2}
										fill="url(#colorProcessed)"
									/>
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="successful"
										stroke={COLORS.success}
										strokeWidth={2}
										fill="url(#colorSuccess)"
									/>
									<Line
										yAxisId="right"
										type="monotone"
										dataKey="successRateNum"
										stroke={COLORS.info}
										strokeWidth={2}
										dot={false}
									/>
								</ComposedChart>
							</ResponsiveContainer>
						)}
					</Box>
				</Paper>

				{/* By Fuero Table */}
				{todaySummary?.byFuero && Object.keys(todaySummary.byFuero).length > 0 && (
					<Paper sx={{ p: 2, borderRadius: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
							Rendimiento por Fuero (Hoy)
						</Typography>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fuero</TableCell>
										<TableCell align="right">Procesados</TableCell>
										<TableCell align="right">Exitosos</TableCell>
										<TableCell align="right">Fallidos</TableCell>
										<TableCell align="right">Movimientos</TableCell>
										<TableCell align="right">Tasa Éxito</TableCell>
										<TableCell align="right">Tiempo Prom.</TableCell>
										<TableCell align="right">Hora Pico</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{Object.entries(todaySummary.byFuero)
										.sort(([, a], [, b]) => b.processed - a.processed)
										.map(([fuero, stats]) => (
											<TableRow key={fuero}>
												<TableCell>
													<Typography variant="body2" fontWeight="bold">
														{fuero}
													</Typography>
												</TableCell>
												<TableCell align="right">{stats.processed.toLocaleString("es-AR")}</TableCell>
												<TableCell align="right">
													<Typography color="success.main">{stats.successful.toLocaleString("es-AR")}</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography color={stats.failed > 0 ? "error.main" : "text.secondary"}>
														{stats.failed.toLocaleString("es-AR")}
													</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography color="info.main">{stats.movimientosFound.toLocaleString("es-AR")}</Typography>
												</TableCell>
												<TableCell align="right">
													<LinearProgress
														variant="determinate"
														value={stats.successRate}
														color={stats.successRate > 90 ? "success" : stats.successRate > 70 ? "warning" : "error"}
														sx={{ height: 6, borderRadius: 3, width: 60, display: "inline-block", mr: 1 }}
													/>
													<Typography variant="caption">{stats.successRate.toFixed(1)}%</Typography>
												</TableCell>
												<TableCell align="right">
													<Typography variant="body2">
														{stats.avgProcessingTime ? `${(stats.avgProcessingTime / 1000).toFixed(1)}s` : "-"}
													</Typography>
												</TableCell>
												<TableCell align="right">
													{stats.peakHour !== undefined ? (
														<Chip
															label={`${String(stats.peakHour).padStart(2, "0")}:00`}
															size="small"
															variant="outlined"
														/>
													) : (
														"-"
													)}
												</TableCell>
											</TableRow>
										))}
								</TableBody>
							</Table>
						</TableContainer>
					</Paper>
				)}

				{/* Day Comparison Section */}
				<Paper sx={{ p: 2, borderRadius: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
							<Stack direction="row" spacing={1} alignItems="center">
								<ArrowSwapHorizontal size={20} color={theme.palette.primary.main} />
								<Typography variant="subtitle1" fontWeight="bold">
									Comparar Días
								</Typography>
							</Stack>
							<Button
								variant={showComparison ? "contained" : "outlined"}
								size="small"
								onClick={() => setShowComparison(!showComparison)}
							>
								{showComparison ? "Ocultar" : "Mostrar"}
							</Button>
						</Stack>

						{showComparison && (
							<>
								<Stack direction="row" spacing={2} alignItems="center">
									<DatePicker
										label="Fecha 1"
										value={compareDate1}
										onChange={(v) => setCompareDate1(v)}
										format="DD/MM/YYYY"
										maxDate={dayjs()}
										slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
									/>
									<Typography color="text.secondary">vs</Typography>
									<DatePicker
										label="Fecha 2"
										value={compareDate2}
										onChange={(v) => setCompareDate2(v)}
										format="DD/MM/YYYY"
										maxDate={dayjs()}
										slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
									/>
									<Button variant="contained" size="small" onClick={fetchComparison}>
										Comparar
									</Button>
								</Stack>

								{comparison && (
									<Grid container spacing={2}>
										<Grid item xs={12} md={5}>
											<Card variant="outlined">
												<CardContent>
													<Typography variant="subtitle2" gutterBottom>
														{comparison.date1.date}
													</Typography>
													<Stack spacing={0.5}>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Procesados:</Typography>
															<Typography variant="body2">{comparison.date1.totals.processed.toLocaleString("es-AR")}</Typography>
														</Box>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Exitosos:</Typography>
															<Typography variant="body2" color="success.main">{comparison.date1.totals.successful.toLocaleString("es-AR")}</Typography>
														</Box>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Tasa éxito:</Typography>
															<Typography variant="body2">{comparison.date1.totals.successRate?.toFixed(1)}%</Typography>
														</Box>
													</Stack>
												</CardContent>
											</Card>
										</Grid>
										<Grid item xs={12} md={2} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
											<Stack alignItems="center" spacing={0.5}>
												<Chip
													icon={comparison.differences.processed >= 0 ? <TrendUp size={14} /> : <TrendDown size={14} />}
													label={`${comparison.percentageChanges.processed > 0 ? "+" : ""}${comparison.percentageChanges.processed}%`}
													color={comparison.differences.processed >= 0 ? "success" : "error"}
													size="small"
												/>
												<Typography variant="caption" color="text.secondary">
													procesados
												</Typography>
											</Stack>
										</Grid>
										<Grid item xs={12} md={5}>
											<Card variant="outlined">
												<CardContent>
													<Typography variant="subtitle2" gutterBottom>
														{comparison.date2.date}
													</Typography>
													<Stack spacing={0.5}>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Procesados:</Typography>
															<Typography variant="body2">{comparison.date2.totals.processed.toLocaleString("es-AR")}</Typography>
														</Box>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Exitosos:</Typography>
															<Typography variant="body2" color="success.main">{comparison.date2.totals.successful.toLocaleString("es-AR")}</Typography>
														</Box>
														<Box sx={{ display: "flex", justifyContent: "space-between" }}>
															<Typography variant="body2" color="text.secondary">Tasa éxito:</Typography>
															<Typography variant="body2">{comparison.date2.totals.successRate?.toFixed(1)}%</Typography>
														</Box>
													</Stack>
												</CardContent>
											</Card>
										</Grid>
									</Grid>
								)}
							</>
						)}
					</Stack>
				</Paper>

				{/* Info Alert */}
				<Alert severity="info" variant="outlined">
					<Typography variant="body2">
						Los resúmenes diarios se generan automáticamente al finalizar cada día. Utiliza la función de comparación para analizar el rendimiento entre fechas específicas.
					</Typography>
				</Alert>
			</Stack>
		</LocalizationProvider>
	);
};

export default DailySummaryPanel;
