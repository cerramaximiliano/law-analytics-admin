import { Alert, Box, Chip, Divider, Grid, IconButton, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableRow, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { Refresh } from "iconsax-react";
import { FullDoc, WorkerHeartbeat } from "api/liquidacionWorkerConfig";

interface Props {
	doc: FullDoc | null;
	loading: boolean;
	onRefresh: () => void;
}

function relativeFromNow(iso?: string): string {
	if (!iso) return "—";
	const ms = Date.now() - new Date(iso).getTime();
	if (ms < 0) return "—";
	const s = Math.floor(ms / 1000);
	if (s < 60) return `hace ${s}s`;
	const m = Math.floor(s / 60);
	if (m < 60) return `hace ${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `hace ${h}h`;
	return `hace ${Math.floor(h / 24)}d`;
}

function formatNumber(n: number | undefined): string {
	if (n === undefined || n === null) return "—";
	return n.toLocaleString("es-AR");
}

function workerHealthColor(theme: any, hb: WorkerHeartbeat | undefined): { bg: string; fg: string; label: string } {
	if (!hb) return { bg: alpha(theme.palette.grey[500], 0.15), fg: theme.palette.grey[600], label: "sin reporte" };
	const ms = hb.lastHeartbeatAt ? Date.now() - new Date(hb.lastHeartbeatAt).getTime() : Infinity;
	if (!hb.isRunning) return { bg: alpha(theme.palette.error.main, 0.15), fg: theme.palette.error.main, label: "stopped" };
	if (ms > 120_000) return { bg: alpha(theme.palette.warning.main, 0.15), fg: theme.palette.warning.main, label: "stale" };
	return { bg: alpha(theme.palette.success.main, 0.15), fg: theme.palette.success.main, label: "online" };
}

const WORKER_NAMES = ["pjn-liq-manager", "pjn-liq-url-extractor", "pjn-liq-pdf-processor"];

export default function StatusTab({ doc, loading, onRefresh }: Props) {
	const theme = useTheme();

	if (loading && !doc) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rounded" height={120} />
				<Skeleton variant="rounded" height={120} />
				<Skeleton variant="rounded" height={120} />
			</Stack>
		);
	}

	if (!doc) return <Alert severity="warning">No hay datos.</Alert>;

	const workers = doc.currentState?.workers || {};
	const collection = doc.currentState?.collectionStats || ({} as any);
	const queues = doc.currentState?.queueStats || ({} as any);
	const lastRun = doc.currentState?.lastUrlExtractRun || ({} as any);
	const dailyProcessed = doc.currentState?.dailyProcessed;
	const dailyLimit = doc.config?.pdfProcessor?.dailyLimit ?? 0;
	const byStatus = collection.byStatus || {};
	const byCategory = collection.byCategory || {};
	const todayDate = new Date().toISOString().slice(0, 10);
	const todayCount = dailyProcessed?.date === todayDate ? dailyProcessed.count : 0;
	const dailyPct = dailyLimit > 0 ? Math.min(100, (todayCount / dailyLimit) * 100) : 0;

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="body2" color="text.secondary">
					Última actualización del doc: <strong>{relativeFromNow(doc.lastUpdate)}</strong> · auto-refresh cada 15s
				</Typography>
				<Tooltip title="Refrescar ahora">
					<IconButton onClick={onRefresh} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* === Daily counter === */}
			{(dailyLimit > 0 || todayCount > 0) && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Box>
							<Typography variant="subtitle2">Procesados hoy ({todayDate})</Typography>
							<Typography variant="h4" sx={{ mt: 0.5 }}>
								{formatNumber(todayCount)}
								{dailyLimit > 0 && (
									<Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
										/ {formatNumber(dailyLimit)} ({dailyPct.toFixed(0)}%)
									</Typography>
								)}
							</Typography>
						</Box>
						{dailyLimit > 0 && (
							<Box sx={{ minWidth: 200 }}>
								<Box
									sx={{
										height: 8,
										borderRadius: 4,
										bgcolor: alpha(theme.palette.grey[500], 0.2),
										overflow: "hidden",
									}}
								>
									<Box
										sx={{
											height: "100%",
											width: `${dailyPct}%`,
											bgcolor: dailyPct >= 95 ? theme.palette.error.main : dailyPct >= 80 ? theme.palette.warning.main : theme.palette.success.main,
											transition: "width 0.3s",
										}}
									/>
								</Box>
								<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
									{dailyPct >= 100 ? "Cap alcanzado — worker espera rollover de medianoche" : "Reinicia automáticamente a medianoche local"}
								</Typography>
							</Box>
						)}
					</Stack>
				</Paper>
			)}

			{/* === Workers heartbeats === */}
			<Typography variant="h6">Procesos PM2</Typography>
			<Grid container spacing={2}>
				{WORKER_NAMES.map((name) => {
					const hb = workers[name];
					const c = workerHealthColor(theme, hb);
					return (
						<Grid item xs={12} md={4} key={name}>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Stack spacing={1}>
									<Stack direction="row" justifyContent="space-between" alignItems="center">
										<Typography variant="subtitle2" sx={{ fontFamily: "monospace" }}>
											{name}
										</Typography>
										<Chip label={c.label} size="small" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: 600 }} />
									</Stack>
									<Divider />
									<Box>
										<Typography variant="caption" color="text.secondary">
											last heartbeat
										</Typography>
										<Typography variant="body2">{relativeFromNow(hb?.lastHeartbeatAt)}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">
											instance
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.72rem", wordBreak: "break-all" }}>
											{hb?.instanceId || "—"}
										</Typography>
									</Box>
									{hb?.metrics && Object.keys(hb.metrics).length > 0 && (
										<Box>
											<Typography variant="caption" color="text.secondary">
												metrics
											</Typography>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}>
												{Object.entries(hb.metrics)
													.map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
													.join(" · ")}
											</Typography>
										</Box>
									)}
								</Stack>
							</Paper>
						</Grid>
					);
				})}
			</Grid>

			{/* === Colas BullMQ === */}
			<Typography variant="h6" sx={{ mt: 2 }}>
				Colas BullMQ
			</Typography>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ fontFamily: "monospace", mb: 1 }}>
							liq-process (PDF processor)
						</Typography>
						<Table size="small">
							<TableBody>
								<TableRow>
									<TableCell>waiting</TableCell>
									<TableCell align="right">{formatNumber(queues.liqProcess?.waiting)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>active</TableCell>
									<TableCell align="right">{formatNumber(queues.liqProcess?.active)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>delayed</TableCell>
									<TableCell align="right">{formatNumber(queues.liqProcess?.delayed)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>completed</TableCell>
									<TableCell align="right">{formatNumber(queues.liqProcess?.completed)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>failed</TableCell>
									<TableCell align="right" sx={{ color: queues.liqProcess?.failed > 0 ? theme.palette.error.main : undefined }}>
										{formatNumber(queues.liqProcess?.failed)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</Paper>
				</Grid>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ fontFamily: "monospace", mb: 1 }}>
							liq-url-extract
						</Typography>
						<Table size="small">
							<TableBody>
								<TableRow>
									<TableCell>waiting</TableCell>
									<TableCell align="right">{formatNumber(queues.liqUrlExtract?.waiting)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>active</TableCell>
									<TableCell align="right">{formatNumber(queues.liqUrlExtract?.active)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>completed</TableCell>
									<TableCell align="right">{formatNumber(queues.liqUrlExtract?.completed)}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>failed</TableCell>
									<TableCell align="right" sx={{ color: queues.liqUrlExtract?.failed > 0 ? theme.palette.error.main : undefined }}>
										{formatNumber(queues.liqUrlExtract?.failed)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</Paper>
				</Grid>
			</Grid>

			{/* === Colección stats === */}
			<Typography variant="h6" sx={{ mt: 2 }}>
				Colección <code>previsional-liquidacion-urls</code>
			</Typography>
			<Grid container spacing={2}>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Por pdfStatus
						</Typography>
						<Stack spacing={0.5}>
							<Stack direction="row" justifyContent="space-between">
								<Typography variant="body2" fontWeight={600}>
									Total
								</Typography>
								<Typography variant="body2" fontWeight={600}>
									{formatNumber(collection.total)}
								</Typography>
							</Stack>
							<Divider />
							{Object.entries(byStatus).map(([k, v]) => (
								<Stack key={k} direction="row" justifyContent="space-between">
									<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
										{k}
									</Typography>
									<Typography variant="body2">{formatNumber(v as number)}</Typography>
								</Stack>
							))}
						</Stack>
					</Paper>
				</Grid>
				<Grid item xs={12} md={6}>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Por categoría
						</Typography>
						<Stack spacing={0.5}>
							{Object.entries(byCategory)
								.sort((a, b) => (b[1] as number) - (a[1] as number))
								.slice(0, 12)
								.map(([k, v]) => (
									<Stack key={k} direction="row" justifyContent="space-between">
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{k}
										</Typography>
										<Typography variant="body2">{formatNumber(v as number)}</Typography>
									</Stack>
								))}
						</Stack>
					</Paper>
				</Grid>
			</Grid>

			{/* === Last URL extract run === */}
			<Typography variant="h6" sx={{ mt: 2 }}>
				Última corrida del URL Extractor
			</Typography>
			<Paper variant="outlined" sx={{ p: 2 }}>
				{lastRun?.startedAt ? (
					<Grid container spacing={2}>
						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="text.secondary">
								startedAt
							</Typography>
							<Typography variant="body2">{relativeFromNow(lastRun.startedAt)}</Typography>
						</Grid>
						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="text.secondary">
								duración
							</Typography>
							<Typography variant="body2">{lastRun.elapsedMs ? `${(lastRun.elapsedMs / 1000).toFixed(1)}s` : "—"}</Typography>
						</Grid>
						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="text.secondary">
								added
							</Typography>
							<Typography variant="body2">{formatNumber(lastRun.added)}</Typography>
						</Grid>
						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="text.secondary">
								enqueued
							</Typography>
							<Typography variant="body2">{formatNumber(lastRun.enqueued)}</Typography>
						</Grid>
						{lastRun.error && (
							<Grid item xs={12}>
								<Alert severity="error" sx={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
									{lastRun.error}
								</Alert>
							</Grid>
						)}
					</Grid>
				) : (
					<Typography variant="body2" color="text.secondary">
						Aún sin corridas registradas.
					</Typography>
				)}
			</Paper>
		</Stack>
	);
}
