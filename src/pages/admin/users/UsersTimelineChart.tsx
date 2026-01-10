import React, { useEffect, useState, useCallback } from "react";
import {
	Box,
	Typography,
	Paper,
	Grid,
	Skeleton,
	ToggleButton,
	ToggleButtonGroup,
	useTheme,
	alpha,
	Stack,
} from "@mui/material";
import { Calendar, TrendUp, UserAdd, Chart1 } from "iconsax-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	Legend,
	Area,
	AreaChart,
} from "recharts";
import adminAxios from "utils/adminAxios";

// Color palette matching the project style
const COLORS = {
	primary: {
		main: "#4F46E5",
		light: "#6366F1",
	},
	success: {
		main: "#10B981",
		light: "#34D399",
	},
	neutral: {
		main: "#64748B",
		light: "#94A3B8",
		text: "#475569",
	},
};

interface TimelineDataPoint {
	date: string;
	count: number;
	cumulative: number;
}

interface TimelineSummary {
	totalInPeriod: number;
	totalUsers: number;
	avgPerPeriod: number;
	bestPeriod: { date: string; count: number } | null;
	granularity: string;
	dateRange: {
		from: string;
		to: string;
	};
}

interface TimelineResponse {
	success: boolean;
	data: {
		timeline: TimelineDataPoint[];
		summary: TimelineSummary;
	};
}

type Granularity = "day" | "week" | "month";

// Stat Card Component
interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading }) => {
	const theme = useTheme();

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
				<Box
					sx={{
						p: 1,
						borderRadius: 1.5,
						bgcolor: alpha(color, 0.1),
						color: color,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{icon}
				</Box>
				<Box>
					<Typography variant="body2" color="textSecondary" sx={{ mb: 0.25 }}>
						{title}
					</Typography>
					{loading ? (
						<Skeleton variant="text" width={60} height={28} />
					) : (
						<Typography variant="h5" fontWeight="bold" sx={{ color }}>
							{typeof value === "number" ? value.toLocaleString() : value}
						</Typography>
					)}
				</Box>
			</Box>
		</Paper>
	);
};

const UsersTimelineChart: React.FC = () => {
	const theme = useTheme();

	// State
	const [loading, setLoading] = useState(true);
	const [timeline, setTimeline] = useState<TimelineDataPoint[]>([]);
	const [summary, setSummary] = useState<TimelineSummary | null>(null);
	const [granularity, setGranularity] = useState<Granularity>("day");
	const [dateFrom, setDateFrom] = useState<Dayjs>(dayjs().subtract(6, "month"));
	const [dateTo, setDateTo] = useState<Dayjs>(dayjs());

	// Fetch data
	const fetchTimeline = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				granularity,
				dateFrom: dateFrom.toISOString(),
				dateTo: dateTo.toISOString(),
			});

			const response = await adminAxios.get<TimelineResponse>(`/api/dashboard/users/timeline?${params}`);

			if (response.data.success) {
				setTimeline(response.data.data.timeline);
				setSummary(response.data.data.summary);
			}
		} catch (error) {
			console.error("Error fetching users timeline:", error);
		} finally {
			setLoading(false);
		}
	}, [granularity, dateFrom, dateTo]);

	useEffect(() => {
		fetchTimeline();
	}, [fetchTimeline]);

	// Handlers
	const handleGranularityChange = (_event: React.MouseEvent<HTMLElement>, newGranularity: Granularity | null) => {
		if (newGranularity) {
			setGranularity(newGranularity);
		}
	};

	// Format date for display based on granularity
	const formatXAxisDate = (dateStr: string) => {
		if (granularity === "month") {
			const [year, month] = dateStr.split("-");
			const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
			return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
		}
		if (granularity === "week") {
			return dateStr.replace("-W", " S");
		}
		// Day format: show day/month
		const date = dayjs(dateStr);
		return date.format("DD/MM");
	};

	// Get granularity label
	const getGranularityLabel = () => {
		switch (granularity) {
			case "week":
				return "semana";
			case "month":
				return "mes";
			default:
				return "día";
		}
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<Box sx={{ p: 2 }}>
				{/* Controls */}
				<Paper
					elevation={0}
					sx={{
						p: 2,
						mb: 3,
						borderRadius: 2,
						bgcolor: theme.palette.background.paper,
						border: `1px solid ${theme.palette.divider}`,
					}}
				>
					<Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
						{/* Granularity Toggle */}
						<Box>
							<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
								Agrupar por
							</Typography>
							<ToggleButtonGroup
								value={granularity}
								exclusive
								onChange={handleGranularityChange}
								size="small"
							>
								<ToggleButton value="day">Día</ToggleButton>
								<ToggleButton value="week">Semana</ToggleButton>
								<ToggleButton value="month">Mes</ToggleButton>
							</ToggleButtonGroup>
						</Box>

						{/* Date Range */}
						<Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
							<Box>
								<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
									Desde
								</Typography>
								<DatePicker
									value={dateFrom}
									onChange={(newValue) => newValue && setDateFrom(newValue)}
									slotProps={{
										textField: { size: "small", sx: { width: 160 } },
									}}
									maxDate={dateTo}
								/>
							</Box>
							<Box>
								<Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
									Hasta
								</Typography>
								<DatePicker
									value={dateTo}
									onChange={(newValue) => newValue && setDateTo(newValue)}
									slotProps={{
										textField: { size: "small", sx: { width: 160 } },
									}}
									minDate={dateFrom}
									maxDate={dayjs()}
								/>
							</Box>
						</Box>
					</Stack>
				</Paper>

				{/* Summary Stats */}
				<Grid container spacing={2} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard
							title="Nuevos en el período"
							value={summary?.totalInPeriod || 0}
							icon={<UserAdd size={20} />}
							color={COLORS.success.main}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard
							title="Total de usuarios"
							value={summary?.totalUsers || 0}
							icon={<TrendUp size={20} />}
							color={COLORS.primary.main}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard
							title={`Promedio por ${getGranularityLabel()}`}
							value={summary?.avgPerPeriod?.toFixed(1) || "0"}
							icon={<Chart1 size={20} />}
							color={COLORS.neutral.main}
							loading={loading}
						/>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<StatCard
							title="Mejor período"
							value={
								summary?.bestPeriod
									? `${summary.bestPeriod.count} (${formatXAxisDate(summary.bestPeriod.date)})`
									: "-"
							}
							icon={<Calendar size={20} />}
							color={COLORS.success.light}
							loading={loading}
						/>
					</Grid>
				</Grid>

				{/* Chart */}
				<Paper
					elevation={0}
					sx={{
						p: 2.5,
						borderRadius: 2,
						bgcolor: theme.palette.background.paper,
						border: `1px solid ${theme.palette.divider}`,
					}}
				>
					<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
						Evolución de Usuarios Registrados
					</Typography>

					<Box sx={{ height: 400 }}>
						{loading ? (
							<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
						) : timeline.length === 0 ? (
							<Box
								sx={{
									height: "100%",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Typography color="textSecondary">No hay datos para el período seleccionado</Typography>
							</Box>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
									<defs>
										<linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={COLORS.primary.main} stopOpacity={0.3} />
											<stop offset="95%" stopColor={COLORS.primary.main} stopOpacity={0} />
										</linearGradient>
										<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
											<stop offset="5%" stopColor={COLORS.success.main} stopOpacity={0.3} />
											<stop offset="95%" stopColor={COLORS.success.main} stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={alpha(theme.palette.divider, 0.5)}
										vertical={false}
									/>
									<XAxis
										dataKey="date"
										tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
										tickFormatter={formatXAxisDate}
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
											value.toLocaleString(),
											name === "cumulative" ? "Acumulado" : "Nuevos",
										]}
										labelFormatter={(label) => `Fecha: ${formatXAxisDate(label)}`}
									/>
									<Legend
										formatter={(value) => (value === "cumulative" ? "Acumulado" : "Nuevos registros")}
									/>
									<Area
										yAxisId="right"
										type="monotone"
										dataKey="cumulative"
										stroke={COLORS.primary.main}
										strokeWidth={2}
										fill="url(#colorCumulative)"
										name="cumulative"
									/>
									<Area
										yAxisId="left"
										type="monotone"
										dataKey="count"
										stroke={COLORS.success.main}
										strokeWidth={2}
										fill="url(#colorCount)"
										name="count"
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</Box>
				</Paper>
			</Box>
		</LocalizationProvider>
	);
};

export default UsersTimelineChart;
