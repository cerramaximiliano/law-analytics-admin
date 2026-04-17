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
	TextField,
	Divider,
	Alert,
} from "@mui/material";
import { Refresh2, TickCircle, CloseCircle, DocumentText, Activity, Calendar } from "iconsax-react";
import { useSnackbar } from "notistack";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { ScrapingStatsService, StatsTotals, FueroBreakdown, HourBreakdown, DayBreakdown } from "api/scrapingStats";

// ====== Helpers ======

function fmt(n: number): string {
	return n.toLocaleString("es-AR");
}

function pct(num: number, total: number): string {
	if (!total) return "0%";
	return `${((num / total) * 100).toFixed(1)}%`;
}

function todayStr(): string {
	// Argentina UTC-3 date
	const now = new Date();
	const arg = new Date(now.getTime() - 3 * 60 * 60 * 1000);
	return arg.toISOString().slice(0, 10);
}

function currentMonthStr(): string {
	return todayStr().slice(0, 7);
}

// ====== StatCard ======

interface StatCardProps {
	title: string;
	value: number;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Card sx={{ height: "100%", bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.2)}` }}>
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
								{fmt(value)}
							</Typography>
						)}
						{subtitle && (
							<Typography variant="caption" color="text.secondary">
								{subtitle}
							</Typography>
						)}
					</Box>
					<Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(color, 0.1), color }}>{icon}</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

// ====== FueroTable ======

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	CSS: "Seg. Social",
	CNT: "Trabajo",
	COM: "Comercial",
};

interface FueroTableProps {
	byFuero: FueroBreakdown;
}

const FueroTable: React.FC<FueroTableProps> = ({ byFuero }) => {
	const theme = useTheme();
	const fueros = Object.entries(byFuero).sort((a, b) => b[1].docs.total - a[1].docs.total);
	if (!fueros.length)
		return (
			<Typography color="text.secondary" variant="body2">
				Sin datos por fuero.
			</Typography>
		);

	return (
		<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Fuero</TableCell>
						<TableCell align="right">Captchas OK</TableCell>
						<TableCell align="right">Captchas Fail</TableCell>
						<TableCell align="right">Docs Válidos</TableCell>
						<TableCell align="right">Docs Inválidos</TableCell>
						<TableCell align="right">Docs Error</TableCell>
						<TableCell align="right">Total Docs</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{fueros.map(([fuero, stats]) => (
						<TableRow key={fuero} hover>
							<TableCell>
								<Chip label={FUERO_LABELS[fuero] || fuero} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color="success.main">
									{fmt(stats.captcha.resolved)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color={stats.captcha.failed > 0 ? "error.main" : "text.secondary"}>
									{fmt(stats.captcha.failed)}
								</Typography>
							</TableCell>
							<TableCell align="right">{fmt(stats.docs.valid)}</TableCell>
							<TableCell align="right">{fmt(stats.docs.invalid)}</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color={stats.docs.error > 0 ? "warning.main" : "text.secondary"}>
									{fmt(stats.docs.error)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" fontWeight={600}>
									{fmt(stats.docs.total)}
								</Typography>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

// ====== DayTable ======

interface DayTableProps {
	byDay: DayBreakdown;
}

const DayTable: React.FC<DayTableProps> = ({ byDay }) => {
	const days = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0]));
	if (!days.length)
		return (
			<Typography color="text.secondary" variant="body2">
				Sin datos.
			</Typography>
		);

	return (
		<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 300 }}>
			<Table size="small" stickyHeader>
				<TableHead>
					<TableRow>
						<TableCell>Fecha</TableCell>
						<TableCell align="right">Captchas OK</TableCell>
						<TableCell align="right">Captchas Fail</TableCell>
						<TableCell align="right">Docs Válidos</TableCell>
						<TableCell align="right">Docs Inválidos</TableCell>
						<TableCell align="right">Docs Error</TableCell>
						<TableCell align="right">Total</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{days.map(([date, stats]) => (
						<TableRow key={date} hover>
							<TableCell>
								<Typography variant="body2" fontWeight={500}>
									{date}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color="success.main">
									{fmt(stats.captcha.resolved)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color={stats.captcha.failed > 0 ? "error.main" : "text.secondary"}>
									{fmt(stats.captcha.failed)}
								</Typography>
							</TableCell>
							<TableCell align="right">{fmt(stats.docs.valid)}</TableCell>
							<TableCell align="right">{fmt(stats.docs.invalid)}</TableCell>
							<TableCell align="right">
								<Typography variant="body2" color={stats.docs.error > 0 ? "warning.main" : "text.secondary"}>
									{fmt(stats.docs.error)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="body2" fontWeight={600}>
									{fmt(stats.docs.total)}
								</Typography>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

// ====== Main Component ======

type ViewMode = "today" | "day" | "month";

const ScrapingStatsPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [viewMode, setViewMode] = useState<ViewMode>("today");
	const [selectedDate, setSelectedDate] = useState<string>(todayStr());
	const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr());
	const [loading, setLoading] = useState(true);

	// Data state
	const [totals, setTotals] = useState<StatsTotals | null>(null);
	const [byFuero, setByFuero] = useState<FueroBreakdown>({});
	const [byHour, setByHour] = useState<HourBreakdown | null>(null);
	const [byDay, setByDay] = useState<DayBreakdown | null>(null);
	const [dateLabel, setDateLabel] = useState<string>("");

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			if (viewMode === "today") {
				const res = await ScrapingStatsService.getToday();
				if (res.success) {
					setTotals(res.data.totals);
					setByFuero(res.data.byFuero);
					setByHour(res.data.byHour);
					setByDay(null);
					setDateLabel(`Hoy (${res.data.date})`);
				}
			} else if (viewMode === "day") {
				const res = await ScrapingStatsService.getDay(selectedDate);
				if (res.success) {
					setTotals(res.data.totals);
					setByFuero(res.data.byFuero);
					setByHour(res.data.byHour);
					setByDay(null);
					setDateLabel(res.data.date);
				}
			} else {
				const res = await ScrapingStatsService.getMonth(selectedMonth);
				if (res.success) {
					setTotals(res.data.totals);
					setByFuero({});
					setByHour(null);
					setByDay(res.data.byDay);
					setDateLabel(res.data.month);
				}
			}
		} catch (err: any) {
			const msg = err.response?.data?.message || "Error al cargar estadísticas de scraping";
			enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setLoading(false);
		}
	}, [viewMode, selectedDate, selectedMonth, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Auto-refresh every 2 minutes when viewing today
	useEffect(() => {
		if (viewMode !== "today") return;
		const iv = setInterval(fetchData, 120_000);
		return () => clearInterval(iv);
	}, [fetchData, viewMode]);

	// ---- Hourly chart data ----
	const hourlyChartData = byHour
		? Array.from({ length: 24 }, (_, h) => {
				const s = byHour[h] || { captcha: { resolved: 0, failed: 0 }, docs: { valid: 0, invalid: 0, error: 0, total: 0 } };
				return {
					hour: h,
					label: `${String(h).padStart(2, "0")}:00`,
					captchaOK: s.captcha.resolved,
					captchaFail: s.captcha.failed,
					docsValid: s.docs.valid,
					docsError: s.docs.error,
					docsInvalid: s.docs.invalid,
				};
		  })
		: [];

	// ---- Monthly chart data ----
	const monthlyChartData = byDay
		? Object.entries(byDay)
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([date, stats]) => ({
					label: date.slice(5), // MM-DD
					date,
					captchaOK: stats.captcha.resolved,
					captchaFail: stats.captcha.failed,
					docsValid: stats.docs.valid,
					docsError: stats.docs.error,
					docsInvalid: stats.docs.invalid,
					total: stats.docs.total,
				}))
		: [];

	const chartData = viewMode === "month" ? monthlyChartData : hourlyChartData;
	const captchaTotal = (totals?.captcha.resolved || 0) + (totals?.captcha.failed || 0);
	const captchaSuccessRate = captchaTotal ? pct(totals?.captcha.resolved || 0, captchaTotal) : "—";

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box>
				<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
					<Box>
						<Typography variant="h6" fontWeight="bold">
							Métricas de Scraping
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Captchas y documentos procesados por todos los workers
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} alignItems="center">
						<ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
							<ToggleButton value="today" sx={{ px: 2 }}>
								Hoy
							</ToggleButton>
							<ToggleButton value="day" sx={{ px: 2 }}>
								Día
							</ToggleButton>
							<ToggleButton value="month" sx={{ px: 2 }}>
								Mes
							</ToggleButton>
						</ToggleButtonGroup>

						{viewMode === "day" && (
							<TextField
								type="date"
								size="small"
								value={selectedDate}
								onChange={(e) => setSelectedDate(e.target.value)}
								InputLabelProps={{ shrink: true }}
								sx={{ width: 160 }}
							/>
						)}
						{viewMode === "month" && (
							<TextField
								type="month"
								size="small"
								value={selectedMonth}
								onChange={(e) => setSelectedMonth(e.target.value)}
								InputLabelProps={{ shrink: true }}
								sx={{ width: 160 }}
							/>
						)}

						<Tooltip title="Actualizar datos">
							<IconButton onClick={fetchData} disabled={loading} size="small">
								<Refresh2 size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
				{dateLabel && (
					<Chip icon={<Calendar size={14} />} label={dateLabel} size="small" variant="outlined" sx={{ mt: 0.5, fontSize: "0.7rem" }} />
				)}
			</Box>

			{/* Summary Cards */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Captchas OK"
						value={totals?.captcha.resolved || 0}
						subtitle={`Tasa: ${captchaSuccessRate}`}
						icon={<TickCircle size={18} />}
						color={theme.palette.success.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Captchas Fallidos"
						value={totals?.captcha.failed || 0}
						icon={<CloseCircle size={18} />}
						color={theme.palette.error.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Docs Válidos"
						value={totals?.docs.valid || 0}
						subtitle={pct(totals?.docs.valid || 0, totals?.docs.total || 0)}
						icon={<DocumentText size={18} />}
						color={theme.palette.primary.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Docs Inválidos"
						value={totals?.docs.invalid || 0}
						subtitle={pct(totals?.docs.invalid || 0, totals?.docs.total || 0)}
						icon={<DocumentText size={18} />}
						color={theme.palette.warning.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Docs Error"
						value={totals?.docs.error || 0}
						subtitle={pct(totals?.docs.error || 0, totals?.docs.total || 0)}
						icon={<Activity size={18} />}
						color={theme.palette.error.light}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} sm={4} md={2}>
					<StatCard
						title="Total Docs"
						value={totals?.docs.total || 0}
						icon={<Activity size={18} />}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

			{/* Chart */}
			<Paper sx={{ p: 2.5, borderRadius: 2 }}>
				<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
					{viewMode === "month" ? "Distribución por Día" : "Distribución por Hora"}
				</Typography>
				<Box sx={{ height: 320 }}>
					{loading ? (
						<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
					) : chartData.length === 0 || (totals?.docs.total === 0 && totals?.captcha.resolved === 0) ? (
						<Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
							<Typography color="text.secondary">Sin datos para el período seleccionado</Typography>
						</Box>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
								<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
								<XAxis
									dataKey="label"
									tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
									interval={viewMode === "month" ? 0 : 1}
									angle={-45}
									textAnchor="end"
									height={50}
								/>
								<YAxis tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} axisLine={false} tickLine={false} />
								<RechartsTooltip
									contentStyle={{
										backgroundColor: theme.palette.background.paper,
										border: `1px solid ${theme.palette.divider}`,
										borderRadius: 8,
									}}
									formatter={(value: number, name: string) => {
										const labels: Record<string, string> = {
											captchaOK: "Captchas OK",
											captchaFail: "Captchas Fail",
											docsValid: "Docs Válidos",
											docsError: "Docs Error",
											docsInvalid: "Docs Inválidos",
										};
										return [value.toLocaleString("es-AR"), labels[name] || name];
									}}
								/>
								<Legend
									formatter={(value) => {
										const labels: Record<string, string> = {
											captchaOK: "Captchas OK",
											captchaFail: "Captchas Fail",
											docsValid: "Docs Válidos",
											docsError: "Docs Error",
										};
										return labels[value] || value;
									}}
								/>
								<Bar dataKey="captchaOK" stackId="captcha" fill={theme.palette.success.main} radius={[0, 0, 0, 0]} />
								<Bar dataKey="captchaFail" stackId="captcha" fill={theme.palette.error.main} radius={[4, 4, 0, 0]} />
								<Bar dataKey="docsValid" stackId="docs" fill={theme.palette.primary.main} radius={[0, 0, 0, 0]} />
								<Bar dataKey="docsError" stackId="docs" fill={theme.palette.warning.main} radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					)}
				</Box>
			</Paper>

			{/* Breakdown Table */}
			<Box>
				<Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
					{viewMode === "month" ? "Detalle por Día" : "Detalle por Fuero"}
				</Typography>
				{loading ? (
					<Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
				) : viewMode === "month" && byDay ? (
					<DayTable byDay={byDay} />
				) : (
					<FueroTable byFuero={byFuero} />
				)}
			</Box>
		</Stack>
	);
};

export default ScrapingStatsPanel;
