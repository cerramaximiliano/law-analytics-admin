import { useEffect, useState, useCallback } from "react";
import {
	Grid,
	Typography,
	Box,
	Chip,
	Stack,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Alert,
	LinearProgress,
	CircularProgress,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Refresh, Data, DocumentText, Cpu, Box1 } from "iconsax-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from "recharts";
import MainCard from "components/MainCard";
import { MonitoringService, MonitoringSnapshot, HistoryPoint } from "api/monitoring";
import { LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ── Helpers ──
function fmtBytes(b: number | null | undefined): string {
	if (b == null) return "—";
	const u = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	let n = b;
	while (n >= 1024 && i < u.length - 1) {
		n /= 1024;
		i++;
	}
	return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function fmtNum(n: number | null | undefined): string {
	return n == null ? "—" : n.toLocaleString("es-AR");
}
function fmtDate(v: string | null | undefined): string {
	if (!v) return "N/A";
	return new Date(v).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Argentina/Buenos_Aires",
	});
}
function diskColor(pct: number): "success" | "warning" | "error" {
	if (pct < 70) return "success";
	if (pct < 85) return "warning";
	return "error";
}

// ── Card de métrica ──
function MetricCard({ icon, title, value, sub }: { icon: React.ReactNode; title: string; value: string; sub?: React.ReactNode }) {
	const theme = useTheme();
	return (
		<MainCard contentSX={{ p: 2.5 }}>
			<Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
				<Box sx={{ color: theme.palette.primary.main, display: "flex" }}>{icon}</Box>
				<Typography variant="subtitle2" color="textSecondary">
					{title}
				</Typography>
			</Stack>
			<Typography variant="h4">{value}</Typography>
			{sub && <Box sx={{ mt: 1 }}>{sub}</Box>}
		</MainCard>
	);
}

export default function DatabasesMonitoring() {
	const theme = useTheme();
	const [snap, setSnap] = useState<MonitoringSnapshot | null>(null);
	const [history, setHistory] = useState<HistoryPoint[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		try {
			setError(null);
			const [ov, hist] = await Promise.all([MonitoringService.getOverview(), MonitoringService.getHistory(168)]);
			setSnap(ov);
			setHistory(hist);
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "Error cargando monitoreo");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
		const t = setInterval(load, 60000);
		return () => clearInterval(t);
	}, [load]);

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			await MonitoringService.refresh();
			await load();
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "Error en refresh");
		} finally {
			setRefreshing(false);
		}
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
				<CircularProgress />
			</Box>
		);
	}

	const fresh = snap && !snap.stale;
	const disk = snap?.host?.disk;
	const chartData = history.map((h) => ({
		t: fmtDate(h.createdAt),
		vectores: h.qdrant?.totalVectors ?? null,
		discoGB: h.host?.disk?.usedBytes != null ? Math.round((h.host.disk.usedBytes / 1e9) * 10) / 10 : null,
	}));

	return (
		<Stack spacing={2.5}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Box>
					<Typography variant="h3">Bases de datos y vectores</Typography>
					<Typography variant="body2" color="textSecondary">
						Qdrant (worker_01) + MongoDB local y Atlas — monitoreo de tamaño y crecimiento
					</Typography>
				</Box>
				<Stack direction="row" spacing={1.5} alignItems="center">
					{snap && (
						<Chip
							size="small"
							label={`${fresh ? "actualizado" : "snapshot viejo"} · ${fmtDate(snap.createdAt)}`}
							sx={{ bgcolor: alpha(fresh ? LIVE_GREEN : STALE_AMBER, 0.15), color: fresh ? LIVE_GREEN : STALE_AMBER, fontWeight: 600 }}
						/>
					)}
					<Tooltip title="Forzar snapshot (worker_01)">
						<span>
							<IconButton onClick={handleRefresh} disabled={refreshing}>
								<Refresh size={20} className={refreshing ? "spin" : ""} />
							</IconButton>
						</span>
					</Tooltip>
				</Stack>
			</Stack>

			{error && <Alert severity="error">{error}</Alert>}
			{!snap && !error && <Alert severity="info">Sin snapshots todavía. El collector corre en worker_01 cada ~10 min.</Alert>}

			{snap && (
				<>
					{/* Cards resumen */}
					<Grid container spacing={2.5}>
						<Grid item xs={12} sm={6} md={3}>
							<MetricCard
								icon={<Data size={22} />}
								title="Vectores (Qdrant)"
								value={fmtNum(snap.qdrant?.totalVectors)}
								sub={
									<Typography variant="caption" color="textSecondary">
										{snap.qdrant?.collectionsCount ?? 0} colecciones · {snap.qdrant?.healthy ? "healthy" : "OFFLINE"}
									</Typography>
								}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<MetricCard
								icon={<Box1 size={22} />}
								title="Disco worker_01"
								value={disk ? `${disk.usedPct}%` : "—"}
								sub={
									disk ? (
										<>
											<LinearProgress variant="determinate" value={disk.usedPct} color={diskColor(disk.usedPct)} sx={{ height: 6, borderRadius: 1 }} />
											<Typography variant="caption" color="textSecondary">
												{fmtBytes(disk.usedBytes)} / {fmtBytes(disk.totalBytes)} · libre {fmtBytes(disk.freeBytes)}
											</Typography>
										</>
									) : undefined
								}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<MetricCard
								icon={<DocumentText size={22} />}
								title="MongoDB Atlas (cloud)"
								value={fmtBytes(snap.mongoCloud?.totalSize)}
								sub={
									<Typography variant="caption" color="textSecondary">
										{snap.mongoCloud?.collectionsCount ?? "—"} colecciones · {fmtNum(snap.mongoCloud?.objects)} docs
									</Typography>
								}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<MetricCard
								icon={<Cpu size={22} />}
								title="MongoDB local (worker_01)"
								value={fmtBytes(snap.mongoLocal?.totalSize)}
								sub={
									<Typography variant="caption" color="textSecondary">
										{snap.mongoLocal?.collectionsCount ?? "—"} colecciones · {fmtNum(snap.mongoLocal?.objects)} docs
									</Typography>
								}
							/>
						</Grid>
					</Grid>

					{/* Colecciones Qdrant */}
					<MainCard title="Colecciones Qdrant">
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Colección</TableCell>
										<TableCell align="right">Vectores</TableCell>
										<TableCell align="right">Indexados</TableCell>
										<TableCell align="center">Dim</TableCell>
										<TableCell align="center">Cuantización</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell align="right">Disco</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{(snap.qdrant?.collections ?? []).map((c) => (
										<TableRow key={c.name} hover>
											<TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
											<TableCell align="right">{fmtNum(c.points)}</TableCell>
											<TableCell align="right">{fmtNum(c.indexed)}</TableCell>
											<TableCell align="center">{c.dim ?? "—"}</TableCell>
											<TableCell align="center">{c.quantization ?? "—"}</TableCell>
											<TableCell align="center">
												<Chip
													size="small"
													label={c.status}
													color={c.status === "green" ? "success" : c.status === "yellow" ? "warning" : "error"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell align="right">{fmtBytes(c.diskBytes)}</TableCell>
										</TableRow>
									))}
									{(!snap.qdrant?.collections || snap.qdrant.collections.length === 0) && (
										<TableRow>
											<TableCell colSpan={7}>
												<Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
													{snap.qdrant?.healthy === false ? `Qdrant no disponible: ${snap.qdrant?.error}` : "Sin colecciones"}
												</Typography>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</MainCard>

					{/* Tendencia de crecimiento */}
					<MainCard title="Tendencia (últimos 7 días)">
						{chartData.length > 1 ? (
							<ResponsiveContainer width="100%" height={280}>
								<LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
									<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
									<XAxis dataKey="t" tick={{ fontSize: 11 }} minTickGap={40} />
									<YAxis yAxisId="v" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
									<YAxis yAxisId="d" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}GB`} />
									<RTooltip />
									<Line yAxisId="v" type="monotone" dataKey="vectores" name="Vectores" stroke={theme.palette.primary.main} dot={false} strokeWidth={2} />
									<Line yAxisId="d" type="monotone" dataKey="discoGB" name="Disco usado (GB)" stroke={theme.palette.warning.main} dot={false} strokeWidth={2} />
								</LineChart>
							</ResponsiveContainer>
						) : (
							<Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
								Acumulando datos para la tendencia (un snapshot cada ~10 min).
							</Typography>
						)}
					</MainCard>
				</>
			)}
		</Stack>
	);
}
