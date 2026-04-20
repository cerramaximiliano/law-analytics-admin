import { useState, useEffect, useCallback } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Typography,
	useTheme,
} from "@mui/material";
import { Refresh, TickCircle, Warning2, CloseCircle, Magicpen, Data2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { Link } from "react-router-dom";
import logsService, { HealthReport } from "api/logs";

const SCORE_CONFIG: Record<string, { color: "success" | "warning" | "error" | "default"; label: string; icon: any }> = {
	green: { color: "success", label: "OK", icon: TickCircle },
	yellow: { color: "warning", label: "Atención", icon: Warning2 },
	red: { color: "error", label: "Crítico", icon: CloseCircle },
	unknown: { color: "default", label: "—", icon: Warning2 },
};

const SEVERITY_COLORS: Record<string, "success" | "warning" | "error"> = {
	low: "success",
	medium: "warning",
	high: "error",
};

function percentChange(current: number, baseline: number): { value: number; direction: "up" | "down" | "flat" } {
	if (baseline === 0) return { value: 0, direction: "flat" };
	const pct = ((current - baseline) / baseline) * 100;
	const direction = Math.abs(pct) < 10 ? "flat" : pct > 0 ? "up" : "down";
	return { value: Math.round(pct), direction };
}

function ReportDetailDialog({ report, open, onClose }: { report: HealthReport | null; open: boolean; onClose: () => void }) {
	const theme = useTheme();
	if (!report) return null;

	const cfg = SCORE_CONFIG[report.healthScore] || SCORE_CONFIG.unknown;
	const Icon = cfg.icon;

	const volumeChange = percentChange(report.metrics.logCount24h, report.metrics.logCount7dAvg);
	const errorChange = percentChange(report.metrics.errorCount24h, report.metrics.errorCount7dAvg);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" spacing={1} alignItems="center">
					<Icon size={22} color={cfg.color === "default" ? theme.palette.text.disabled : theme.palette[cfg.color].main} />
					<Typography variant="h6" fontWeight={700}>
						{report.service}{" "}
						<Typography component="span" variant="body2" color="text.secondary">
							@ {report.host}
						</Typography>
					</Typography>
					<Chip label={cfg.label} size="small" color={cfg.color === "default" ? undefined : cfg.color} sx={{ ml: 1 }} />
				</Stack>
				<Typography variant="caption" color="text.secondary">
					Report del {new Date(report.date).toLocaleDateString("es-AR")} · generado {new Date(report.createdAt).toLocaleString("es-AR")} ·{" "}
					{report.generatedBy === "cron" ? "automático" : "manual"}
				</Typography>
			</DialogTitle>

			<DialogContent dividers>
				<Stack spacing={2}>
					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="caption" fontWeight={700} color="text.secondary">
							Resumen
						</Typography>
						<Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
							{report.summary || "(sin resumen)"}
						</Typography>
					</Paper>

					<Paper variant="outlined" sx={{ p: 1.5 }}>
						<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
							Métricas 24h vs baseline 7d
						</Typography>
						<Grid container spacing={1.5}>
							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="text.disabled">
									Logs 24h
								</Typography>
								<Typography variant="h5" fontWeight={700}>
									{report.metrics.logCount24h.toLocaleString()}
								</Typography>
								<Typography
									variant="caption"
									color={
										volumeChange.direction === "up" ? "warning.main" : volumeChange.direction === "down" ? "info.main" : "text.secondary"
									}
								>
									{volumeChange.direction === "flat" ? "≈" : volumeChange.direction === "up" ? "↑" : "↓"} {Math.abs(volumeChange.value)}% vs{" "}
									{report.metrics.logCount7dAvg.toLocaleString()}/día
								</Typography>
							</Grid>
							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="text.disabled">
									Errores 24h
								</Typography>
								<Typography variant="h5" fontWeight={700} color={report.metrics.errorCount24h > 0 ? "error.main" : "text.primary"}>
									{report.metrics.errorCount24h.toLocaleString()}
								</Typography>
								<Typography variant="caption" color={errorChange.direction === "up" ? "error.main" : "text.secondary"}>
									{errorChange.direction === "flat" ? "≈" : errorChange.direction === "up" ? "↑" : "↓"} {Math.abs(errorChange.value)}% vs{" "}
									{report.metrics.errorCount7dAvg.toLocaleString()}/día
								</Typography>
							</Grid>
							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="text.disabled">
									Error rate 24h
								</Typography>
								<Typography variant="h5" fontWeight={700}>
									{(report.metrics.errorRate24h * 100).toFixed(2)}%
								</Typography>
								<Typography variant="caption" color="text.secondary">
									baseline: {(report.metrics.errorRate7dAvg * 100).toFixed(2)}%
								</Typography>
							</Grid>
							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="text.disabled">
									Breakdown
								</Typography>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
									{Object.entries(report.metrics.levelBreakdown).map(([lv, n]) => (
										<Chip key={lv} label={`${lv}: ${n}`} size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
									))}
								</Stack>
							</Grid>
						</Grid>
					</Paper>

					{report.alerts.length > 0 && (
						<Box>
							<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Alertas
							</Typography>
							<Stack spacing={1}>
								{report.alerts.map((a, i) => (
									<Alert
										key={i}
										severity={report.healthScore === "red" ? "error" : "warning"}
										icon={<Warning2 size={16} />}
										sx={{ fontSize: "0.85rem" }}
									>
										{a}
									</Alert>
								))}
							</Stack>
						</Box>
					)}

					{report.topIssues.length > 0 && (
						<Box>
							<Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Top issues
							</Typography>
							<Stack spacing={1}>
								{report.topIssues.map((issue, i) => (
									<Paper
										key={i}
										variant="outlined"
										sx={{ p: 1.5, borderLeft: 4, borderLeftColor: `${SEVERITY_COLORS[issue.severity]}.main` }}
									>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
											<Chip label={issue.count} size="small" sx={{ fontWeight: 700 }} />
											<Chip
												label={issue.severity}
												size="small"
												color={SEVERITY_COLORS[issue.severity]}
												sx={{ fontSize: "0.65rem", height: 20 }}
											/>
											<Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
												{issue.title}
											</Typography>
										</Stack>
										<Typography variant="caption" color="text.secondary" fontWeight={700}>
											Causa raíz
										</Typography>
										<Typography variant="body2" sx={{ mb: 0.5 }}>
											{issue.rootCause}
										</Typography>
										{issue.fix && (
											<>
												<Typography variant="caption" color="success.main" fontWeight={700}>
													Fix sugerido
												</Typography>
												<Typography variant="body2">{issue.fix}</Typography>
											</>
										)}
									</Paper>
								))}
							</Stack>
						</Box>
					)}

					<Divider />
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="caption" color="text.disabled">
							{report.aiModel} · {report.aiTokensUsed} tokens · {(report.generationDurationMs / 1000).toFixed(1)}s
						</Typography>
						<Button
							component={Link}
							to={`/admin/logs?service=${encodeURIComponent(report.service)}&host=${encodeURIComponent(report.host)}`}
							size="small"
							variant="outlined"
						>
							Ver logs del servicio
						</Button>
					</Stack>
				</Stack>
			</DialogContent>
		</Dialog>
	);
}

const ServiceHealthDashboard = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [reports, setReports] = useState<HealthReport[]>([]);
	const [loading, setLoading] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [scoreFilter, setScoreFilter] = useState("");
	const [selectedReport, setSelectedReport] = useState<HealthReport | null>(null);

	const fetchReports = useCallback(async () => {
		setLoading(true);
		try {
			const res = await logsService.listHealthReports({ score: scoreFilter || undefined });
			setReports(res.data);
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al cargar reports", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [scoreFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchReports();
	}, [fetchReports]);

	const handleGenerateAll = async () => {
		if (!window.confirm("¿Regenerar reports para todos los servicios activos? Toma ~5-10 min en background.")) return;
		setGenerating(true);
		try {
			await logsService.generateHealthReport({ all: true });
			enqueueSnackbar("Generación disparada — refrescá en unos minutos", { variant: "info" });
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error", { variant: "error" });
		} finally {
			setGenerating(false);
		}
	};

	const counts = reports.reduce(
		(acc, r) => {
			acc[r.healthScore] = (acc[r.healthScore] || 0) + 1;
			return acc;
		},
		{ green: 0, yellow: 0, red: 0, unknown: 0 } as Record<string, number>,
	);

	return (
		<MainCard>
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Typography variant="h3">Estado diario de servicios</Typography>
							<Chip
								icon={<Data2 size={13} color="#00ED64" />}
								label="AI · daily scan"
								size="small"
								variant="outlined"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.7rem",
									"& .MuiChip-icon": { marginLeft: "6px", color: "#00ED64" },
								}}
							/>
						</Stack>
					</Grid>
					<Grid item>
						<Stack direction="row" spacing={1}>
							<Button
								variant="outlined"
								color="secondary"
								startIcon={generating ? <CircularProgress size={14} color="inherit" /> : <Magicpen size={16} />}
								onClick={handleGenerateAll}
								disabled={generating}
								sx={{ textTransform: "none" }}
							>
								Regenerar todos
							</Button>
							<Button
								variant="outlined"
								startIcon={<Refresh size={16} />}
								onClick={fetchReports}
								disabled={loading}
								sx={{ textTransform: "none" }}
							>
								Refrescar
							</Button>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			{/* Summary bar */}
			<Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
				<Grid container spacing={2} alignItems="center">
					<Grid item xs={12} sm={6}>
						<Stack direction="row" spacing={1.5}>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<TickCircle size={18} color={theme.palette.success.main} />
								<Typography variant="h6" fontWeight={700}>
									{counts.green}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									OK
								</Typography>
							</Stack>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Warning2 size={18} color={theme.palette.warning.main} />
								<Typography variant="h6" fontWeight={700}>
									{counts.yellow}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Atención
								</Typography>
							</Stack>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<CloseCircle size={18} color={theme.palette.error.main} />
								<Typography variant="h6" fontWeight={700}>
									{counts.red}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Crítico
								</Typography>
							</Stack>
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Typography variant="h6" fontWeight={700} color="text.disabled">
									{counts.unknown}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Sin data
								</Typography>
							</Stack>
						</Stack>
					</Grid>
					<Grid item xs={12} sm={6} sx={{ textAlign: { sm: "right" } }}>
						<FormControl size="small" sx={{ minWidth: 180 }}>
							<InputLabel>Filtro</InputLabel>
							<Select value={scoreFilter} label="Filtro" onChange={(e) => setScoreFilter(e.target.value)}>
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="red">Solo crítico 🔴</MenuItem>
								<MenuItem value="yellow">Solo atención 🟡</MenuItem>
								<MenuItem value="green">Solo OK 🟢</MenuItem>
							</Select>
						</FormControl>
					</Grid>
				</Grid>
			</Paper>

			{/* Grid */}
			{loading ? (
				<Box sx={{ textAlign: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : reports.length === 0 ? (
				<Paper variant="outlined" sx={{ p: 6, textAlign: "center", borderStyle: "dashed" }}>
					<Typography variant="body2" color="text.secondary" gutterBottom>
						No hay reports {scoreFilter && `con score "${scoreFilter}"`}
					</Typography>
					<Typography variant="caption" color="text.disabled">
						El cron diario corre a las 6am ARG. También podés disparar uno ahora con "Regenerar todos".
					</Typography>
				</Paper>
			) : (
				<Grid container spacing={1.5}>
					{reports.map((report) => {
						const cfg = SCORE_CONFIG[report.healthScore] || SCORE_CONFIG.unknown;
						const Icon = cfg.icon;
						return (
							<Grid key={report._id} item xs={12} sm={6} md={4} lg={3}>
								<Card
									variant="outlined"
									sx={{
										cursor: "pointer",
										height: "100%",
										borderLeft: 4,
										borderLeftColor: cfg.color === "default" ? "divider" : `${cfg.color}.main`,
										transition: "all 0.15s",
										"&:hover": { boxShadow: 2 },
									}}
									onClick={() => setSelectedReport(report)}
								>
									<CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
											<Icon size={18} color={cfg.color === "default" ? theme.palette.text.disabled : theme.palette[cfg.color].main} />
											<Typography
												variant="subtitle2"
												fontWeight={700}
												sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
											>
												{report.service}
											</Typography>
										</Stack>
										<Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 1 }}>
											{report.host}
										</Typography>
										<Typography
											variant="body2"
											sx={{
												fontSize: "0.8rem",
												mb: 1,
												minHeight: 40,
												display: "-webkit-box",
												WebkitLineClamp: 2,
												WebkitBoxOrient: "vertical",
												overflow: "hidden",
											}}
										>
											{report.summary}
										</Typography>
										<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
											<Chip
												label={`${report.metrics.logCount24h} logs`}
												size="small"
												variant="outlined"
												sx={{ fontSize: "0.6rem", height: 18 }}
											/>
											{report.metrics.errorCount24h > 0 && (
												<Chip
													label={`${report.metrics.errorCount24h} err`}
													size="small"
													color="error"
													sx={{ fontSize: "0.6rem", height: 18 }}
												/>
											)}
											{report.alerts.length > 0 && (
												<Chip
													label={`${report.alerts.length} alertas`}
													size="small"
													color="warning"
													sx={{ fontSize: "0.6rem", height: 18 }}
												/>
											)}
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						);
					})}
				</Grid>
			)}

			<ReportDetailDialog report={selectedReport} open={!!selectedReport} onClose={() => setSelectedReport(null)} />
		</MainCard>
	);
};

export default ServiceHealthDashboard;
