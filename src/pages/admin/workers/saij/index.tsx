import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	LinearProgress,
	Paper,
	Stack,
	Switch,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import {
	CloseCircle,
	Refresh,
	Setting2,
	DocumentText,
	TickCircle,
	Warning2,
	Calendar,
	ArrowRight2,
	Pause,
	Play,
	TextBlock,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import {
	EnrichStatsResponse,
	SaijPipelineConfig,
	SaijSentencia,
	SaijWorkerConfig,
	SentenciaListParams,
	SentenciaStatsResponse,
	getSaijEnrichStats,
	getSaijSentencias,
	getSaijSentenciaStats,
	getSaijWorkerConfigs,
	getSaijWorkerHistory,
	enableSaijWorker,
	disableSaijWorker,
	pauseSaijWorker,
	resumeSaijWorker,
	resetSaijCursor,
	updateSaijScrapingConfig,
	updateSaijNotificationConfig,
	updateSaijPipelineConfig,
} from "api/saij";
import { BRAND_BLUE, LIVE_GREEN, LIVE_PULSE_KEYFRAMES, headerBorder } from "themes/dashboardTokens";

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtNum(n?: number) {
	return n != null ? n.toLocaleString("es-AR") : "—";
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
	const theme = useTheme();
	const accent = color || BRAND_BLUE;
	return (
		<Box
			sx={{
				p: 2,
				borderRadius: 2,
				bgcolor: alpha(accent, theme.palette.mode === "dark" ? 0.12 : 0.08),
				border: `1px solid ${alpha(accent, theme.palette.mode === "dark" ? 0.3 : 0.2)}`,
				textAlign: "center",
				minWidth: 110,
				transition: "transform 240ms ease, border-color 240ms ease",
				"&:hover": { transform: "translateY(-1px)", borderColor: alpha(accent, 0.45) },
			}}
		>
			<Typography
				variant="h5"
				fontWeight={700}
				sx={{
					color: accent,
					letterSpacing: "-0.02em",
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{value}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Box>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function SaijWorkerPage() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [configs, setConfigs] = useState<SaijWorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<SaijWorkerConfig | null>(null);
	const [tab, setTab] = useState(0);
	const [actionLoading, setActionLoading] = useState(false);

	// History
	const [history, setHistory] = useState<SaijWorkerConfig["history"]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);

	// Dialogs
	const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
	const [pauseReason, setPauseReason] = useState("");
	const [pauseResumeAt, setPauseResumeAt] = useState("");
	const [cursorDialogOpen, setCursorDialogOpen] = useState(false);
	const [cursorYear, setCursorYear] = useState("");
	const [cursorMonth, setCursorMonth] = useState("");

	// Scraping config edit
	const [scrapingEdit, setScrapingEdit] = useState(false);
	const [scrapingForm, setScrapingForm] = useState<Partial<SaijWorkerConfig["scraping"]>>({});

	// Enrich worker
	const [enrichStats, setEnrichStats] = useState<EnrichStatsResponse["data"] | null>(null);
	const [enrichLoading, setEnrichLoading] = useState(false);
	const [sideTab, setSideTab] = useState<"scraping" | "enrich">("scraping");

	// Pipeline view (tab 3)
	const [pipelineStats, setPipelineStats] = useState<SentenciaStatsResponse["data"] | null>(null);
	const [pipelineStatsLoading, setPipelineStatsLoading] = useState(false);
	const [pipelineSentencias, setPipelineSentencias] = useState<SaijSentencia[]>([]);
	const [pipelineSentenciasLoading, setPipelineSentenciasLoading] = useState(false);
	const [pipelinePage, setPipelinePage] = useState(1);
	const [pipelineTotal, setPipelineTotal] = useState(0);
	const [pipelineFilters, setPipelineFilters] = useState<Partial<SentenciaListParams>>({
		saijType: "jurisprudencia",
		linked: undefined,
		pipelineStatus: undefined,
		expedienteSource: undefined,
		fuero: undefined,
	});

	useEffect(() => {
		fetchConfigs();
	}, []);

	const loadEnrichStats = async () => {
		setEnrichLoading(true);
		try {
			const res = await getSaijEnrichStats();
			setEnrichStats(res.data);
		} catch {
			enqueueSnackbar("Error cargando stats de enriquecimiento", { variant: "error" });
		} finally {
			setEnrichLoading(false);
		}
	};

	const handleSideTabChange = (val: "scraping" | "enrich") => {
		setSideTab(val);
		if (val === "enrich" && !enrichStats) loadEnrichStats();
	};

	const fetchConfigs = async () => {
		try {
			setLoading(true);
			const res = await getSaijWorkerConfigs();
			setConfigs(res.data);
			if (res.data.length > 0) {
				setSelected(res.data[0]);
				setScrapingForm(res.data[0].scraping);
			}
		} catch {
			enqueueSnackbar("Error cargando configuración de workers SAIJ", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const loadHistory = async () => {
		if (!selected) return;
		setHistoryLoading(true);
		try {
			const res = await getSaijWorkerHistory(selected.worker_id);
			setHistory(res.data);
		} catch {
			enqueueSnackbar("Error cargando historial", { variant: "error" });
		} finally {
			setHistoryLoading(false);
		}
	};

	const loadPipelineStats = async () => {
		setPipelineStatsLoading(true);
		try {
			const res = await getSaijSentenciaStats();
			setPipelineStats(res.data);
		} catch {
			enqueueSnackbar("Error cargando stats del pipeline", { variant: "error" });
		} finally {
			setPipelineStatsLoading(false);
		}
	};

	const loadPipelineSentencias = async (page = pipelinePage, filters = pipelineFilters) => {
		setPipelineSentenciasLoading(true);
		try {
			const params: SentenciaListParams = { page, limit: 25, ...filters };
			Object.keys(params).forEach((k) => params[k as keyof SentenciaListParams] === undefined && delete params[k as keyof SentenciaListParams]);
			const res = await getSaijSentencias(params);
			setPipelineSentencias(res.data);
			setPipelineTotal(res.pagination.total);
			setPipelinePage(page);
		} catch {
			enqueueSnackbar("Error cargando listado del pipeline", { variant: "error" });
		} finally {
			setPipelineSentenciasLoading(false);
		}
	};

	const handleTabChange = (_: React.SyntheticEvent, newVal: number) => {
		setTab(newVal);
		if (newVal === 2 && history.length === 0) loadHistory();
		if (newVal === 3) {
			if (!pipelineStats) loadPipelineStats();
			if (pipelineSentencias.length === 0) loadPipelineSentencias(1, pipelineFilters);
		}
	};

	const selectWorker = (cfg: SaijWorkerConfig) => {
		setSelected(cfg);
		setScrapingForm(cfg.scraping);
		setHistory([]);
		setTab(0);
	};

	const handleToggleEnabled = async () => {
		if (!selected) return;
		setActionLoading(true);
		try {
			if (selected.enabled) {
				await disableSaijWorker(selected.worker_id);
				enqueueSnackbar("Worker deshabilitado", { variant: "success" });
			} else {
				await enableSaijWorker(selected.worker_id);
				enqueueSnackbar("Worker habilitado", { variant: "success" });
			}
			await fetchConfigs();
		} catch {
			enqueueSnackbar("Error cambiando estado", { variant: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handlePause = async () => {
		if (!selected || !pauseReason.trim()) return;
		setActionLoading(true);
		try {
			await pauseSaijWorker(selected.worker_id, pauseReason, pauseResumeAt || undefined);
			enqueueSnackbar("Worker pausado", { variant: "success" });
			setPauseDialogOpen(false);
			setPauseReason("");
			setPauseResumeAt("");
			await fetchConfigs();
		} catch {
			enqueueSnackbar("Error pausando worker", { variant: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handleResume = async () => {
		if (!selected) return;
		setActionLoading(true);
		try {
			await resumeSaijWorker(selected.worker_id);
			enqueueSnackbar("Worker reanudado", { variant: "success" });
			await fetchConfigs();
		} catch {
			enqueueSnackbar("Error reanudando worker", { variant: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handleResetCursor = async () => {
		if (!selected || !cursorYear || !cursorMonth) return;
		setActionLoading(true);
		try {
			await resetSaijCursor(selected.worker_id, parseInt(cursorYear), parseInt(cursorMonth));
			enqueueSnackbar(`Cursor movido a ${cursorYear}/${cursorMonth}`, { variant: "success" });
			setCursorDialogOpen(false);
			setCursorYear("");
			setCursorMonth("");
			await fetchConfigs();
		} catch {
			enqueueSnackbar("Error actualizando cursor", { variant: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handleSaveScraping = async () => {
		if (!selected) return;
		setActionLoading(true);
		try {
			await updateSaijScrapingConfig(selected.worker_id, scrapingForm);
			enqueueSnackbar("Configuración de scraping actualizada", { variant: "success" });
			setScrapingEdit(false);
			await fetchConfigs();
		} catch {
			enqueueSnackbar("Error guardando configuración", { variant: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	if (loading) {
		return (
			<MainCard title="Workers SAIJ">
				<Box display="flex" justifyContent="center" py={6}>
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	if (configs.length === 0) {
		return (
			<MainCard title="Workers SAIJ">
				<Alert severity="info">No hay workers SAIJ configurados. Ejecutá el script local-config en el servidor.</Alert>
			</MainCard>
		);
	}

	const s = selected;

	return (
		<MainCard
			title="Workers SAIJ"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<Box
						component="span"
						sx={{
							display: "inline-flex",
							alignItems: "center",
							px: 1,
							py: 0.25,
							borderRadius: 1,
							bgcolor: (theme) => theme.palette.grey[800],
							color: "common.white",
							fontSize: "0.65rem",
							fontWeight: 500,
							fontFamily: "monospace",
							letterSpacing: "0.5px",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						worker_01
					</Box>
					<Box
						component="span"
						sx={{
							display: "inline-flex",
							alignItems: "center",
							px: 0.75,
							py: 0.25,
							borderRadius: 1,
							bgcolor: alpha(BRAND_BLUE, 0.1),
							color: BRAND_BLUE,
							fontSize: "0.6rem",
							fontWeight: 500,
							fontFamily: "monospace",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						100.111.73.56
					</Box>
					<Tooltip title="Recargar">
						<IconButton
							size="small"
							onClick={fetchConfigs}
							disabled={loading}
							sx={{ transition: "transform 240ms ease", "&:hover": { transform: "rotate(60deg)" } }}
						>
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
			<Grid container spacing={2} sx={{ ...LIVE_PULSE_KEYFRAMES }}>
				{/* Worker selector */}
				<Grid item xs={12} md={3}>
					<Paper
						variant="outlined"
						sx={{ p: 1, borderRadius: 2, borderColor: headerBorder(theme.palette.mode === "dark") }}
					>
						<Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
							Workers de scraping
						</Typography>
						{configs.map((cfg) => (
							<Box
								key={cfg.worker_id}
								onClick={() => {
									selectWorker(cfg);
									handleSideTabChange("scraping");
								}}
								sx={{
									p: 1.5,
									borderRadius: 1,
									cursor: "pointer",
									bgcolor:
										sideTab === "scraping" && selected?.worker_id === cfg.worker_id
											? alpha(theme.palette.primary.main, 0.1)
											: "transparent",
									"&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
								}}
							>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="body2" fontWeight={sideTab === "scraping" && selected?.worker_id === cfg.worker_id ? 600 : 400}>
										{cfg.worker_id}
									</Typography>
									<Stack direction="row" spacing={0.5} alignItems="center">
										{cfg.enabled && (
											<Box
												component="span"
												aria-hidden
												sx={{
													position: "relative",
													width: 6,
													height: 6,
													borderRadius: "50%",
													bgcolor: LIVE_GREEN,
													"&::after": {
														content: '""',
														position: "absolute",
														inset: 0,
														borderRadius: "50%",
														bgcolor: LIVE_GREEN,
														animation: "la-live-pulse 2.4s ease-out infinite",
													},
												}}
											/>
										)}
										<Chip
											size="small"
											label={cfg.enabled ? "ON" : "OFF"}
											color={cfg.enabled ? "success" : "default"}
											sx={{ fontSize: 10, height: 18 }}
										/>
									</Stack>
								</Stack>
								<Typography variant="caption" color="text.secondary">
									{cfg.scraping.currentYear}/{String(cfg.scraping.currentMonth).padStart(2, "0")} · offset {cfg.scraping.currentOffset}
								</Typography>
							</Box>
						))}

						<Divider sx={{ my: 1 }} />
						<Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
							Workers de enriquecimiento
						</Typography>
						<Box
							onClick={() => handleSideTabChange("enrich")}
							sx={{
								p: 1.5,
								borderRadius: 1,
								cursor: "pointer",
								bgcolor: sideTab === "enrich" ? alpha(theme.palette.secondary.main, 0.1) : "transparent",
								"&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.06) },
							}}
						>
							<Stack direction="row" alignItems="center" justifyContent="space-between">
								<Stack direction="row" alignItems="center" spacing={0.5}>
									<TextBlock size={14} />
									<Typography variant="body2" fontWeight={sideTab === "enrich" ? 600 : 400}>
										worker_SAIJ_enrich
									</Typography>
								</Stack>
								<Chip size="small" label="PM2" color="info" sx={{ fontSize: 10, height: 18 }} />
							</Stack>
							<Typography variant="caption" color="text.secondary">
								Texto completo de sumarios
							</Typography>
						</Box>
					</Paper>
				</Grid>

				{/* ── Enrich worker panel ── */}
				{sideTab === "enrich" && (
					<Grid item xs={12} md={9}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
							<Typography variant="h6">worker_SAIJ_enrich</Typography>
							<Tooltip title="Recargar">
								<IconButton size="small" onClick={loadEnrichStats} disabled={enrichLoading}>
									<Refresh size={18} />
								</IconButton>
							</Tooltip>
						</Stack>

						{enrichLoading && <LinearProgress sx={{ mb: 2 }} />}

						{enrichStats && (
							<Stack spacing={2}>
								{/* Progress */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
										<Typography variant="subtitle2">Progreso de enriquecimiento</Typography>
										<Typography variant="body2" color="text.secondary">
											{enrichStats.enriched} / {enrichStats.total} sumarios
										</Typography>
									</Stack>
									<LinearProgress
										variant="determinate"
										value={enrichStats.total > 0 ? (enrichStats.enriched / enrichStats.total) * 100 : 0}
										sx={{ height: 8, borderRadius: 4 }}
									/>
									<Stack direction="row" spacing={2} mt={1.5} flexWrap="wrap">
										<StatBox label="Total sumarios" value={fmtNum(enrichStats.total)} />
										<StatBox label="Enriquecidos" value={fmtNum(enrichStats.enriched)} color={theme.palette.success.main} />
										<StatBox label="Pendientes" value={fmtNum(enrichStats.pendingWithUrl)} color={theme.palette.warning.main} />
										<StatBox label="Sin URL" value={fmtNum(enrichStats.noUrl)} color={theme.palette.text.disabled} />
									</Stack>
								</Paper>

								{/* Últimos procesados */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Typography variant="subtitle2" mb={1}>
										Últimos sumarios enriquecidos
									</Typography>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Número</TableCell>
													<TableCell>Chars antes</TableCell>
													<TableCell>Chars después</TableCell>
													<TableCell>Actualizado</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{enrichStats.recent.map((r) => (
													<TableRow key={r._id} hover>
														<TableCell>
															<Typography variant="caption" fontFamily="monospace">
																{r.numeroSumario || "—"}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="caption" color="text.secondary">
																{r.texto?.length ?? 0}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="caption" color="success.main" fontWeight={600}>
																{r.textoCompleto?.length ?? 0}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="caption">{fmtDate(r.updatedAt)}</Typography>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Paper>

								<Alert severity="info" variant="outlined">
									El worker corre como proceso PM2 <strong>worker_SAIJ_enrich</strong> (id: 539) en worker_01. Procesa un sumario cada ~5s
									con delay configurable via <code>ENRICH_DELAY_MS</code>. Cuando no hay pendientes duerme 30 min y reintenta.
								</Alert>
							</Stack>
						)}

						{!enrichStats && !enrichLoading && <Alert severity="info">Hacé click en recargar para ver el estado del worker.</Alert>}
					</Grid>
				)}

				{/* Detail panel */}
				{sideTab === "scraping" && s && (
					<Grid item xs={12} md={9}>
						{/* Actions bar */}
						<Stack direction="row" spacing={1.5} alignItems="center" mb={2} flexWrap="wrap">
							<Stack direction="row" alignItems="center" spacing={1}>
								<Typography variant="body2">{s.enabled ? "Habilitado" : "Deshabilitado"}</Typography>
								<Switch checked={s.enabled} onChange={handleToggleEnabled} disabled={actionLoading} size="small" color="success" />
							</Stack>
							<Divider orientation="vertical" flexItem />
							{s.pause.isPaused ? (
								<Button size="small" startIcon={<Play size={14} />} onClick={handleResume} disabled={actionLoading} color="success">
									Reanudar
								</Button>
							) : (
								<Button size="small" startIcon={<Pause size={14} />} onClick={() => setPauseDialogOpen(true)} disabled={actionLoading}>
									Pausar
								</Button>
							)}
							<Button
								size="small"
								startIcon={<Calendar size={14} />}
								onClick={() => setCursorDialogOpen(true)}
								variant="outlined"
								disabled={actionLoading}
							>
								Mover cursor
							</Button>
						</Stack>

						{/* Pause alert */}
						{s.pause.isPaused && (
							<Alert severity="warning" sx={{ mb: 2 }}>
								<strong>Worker pausado</strong> — {s.pause.pauseReason || "Pausa manual"}
								{s.pause.resumeAt && ` · Reanuda: ${fmtDate(s.pause.resumeAt)}`}
							</Alert>
						)}

						{/* Tabs */}
						<Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
							<Tab label="Estado" />
							<Tab label="Configuración" />
							<Tab label="Historial" />
							<Tab label="Pipeline" />
						</Tabs>

						{/* ── Tab 0: Estado ── */}
						{tab === 0 && (
							<Stack spacing={2}>
								<Stack direction="row" spacing={1.5} flexWrap="wrap">
									<StatBox label="Procesados" value={fmtNum(s.stats?.totalProcessed)} />
									<StatBox label="Exitosos" value={fmtNum(s.stats?.totalSuccess)} color={theme.palette.success.main} />
									<StatBox label="Errores" value={fmtNum(s.stats?.totalErrors)} color={theme.palette.error.main} />
									<StatBox label="Errores consec." value={s.pause?.consecutiveErrors ?? 0} color={theme.palette.warning.main} />
								</Stack>
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Typography variant="subtitle2" mb={1}>
										Cursor de scraping
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center">
										<Chip label={`Desde ${s.scraping.yearFrom}`} size="small" variant="outlined" />
										<ArrowRight2 size={14} />
										<Chip label={`${s.scraping.currentYear} / ${MONTH_NAMES[s.scraping.currentMonth - 1]}`} size="small" color="primary" />
										<Typography variant="caption" color="text.secondary">
											offset {s.scraping.currentOffset}
										</Typography>
									</Stack>
								</Paper>
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Typography variant="subtitle2" mb={1}>
										Última actividad
									</Typography>
									<Grid container spacing={1}>
										{[
											{ label: "Último ciclo", val: fmtDate(s.stats?.lastRunAt) },
											{ label: "Último éxito", val: fmtDate(s.stats?.lastSuccessAt) },
											{ label: "Último error", val: fmtDate(s.stats?.lastErrorAt) },
										].map((r) => (
											<Grid item xs={12} sm={4} key={r.label}>
												<Typography variant="caption" color="text.secondary">
													{r.label}
												</Typography>
												<Typography variant="body2">{r.val}</Typography>
											</Grid>
										))}
										{s.stats?.lastErrorMessage && (
											<Grid item xs={12}>
												<Alert severity="error" sx={{ mt: 1 }}>
													{s.stats.lastErrorMessage}
												</Alert>
											</Grid>
										)}
									</Grid>
								</Paper>
							</Stack>
						)}

						{/* ── Tab 1: Configuración ── */}
						{tab === 1 && (
							<Stack spacing={2}>
								<Stack direction="row" justifyContent="flex-end">
									{scrapingEdit ? (
										<Stack direction="row" spacing={1}>
											<Button
												size="small"
												onClick={() => {
													setScrapingEdit(false);
													setScrapingForm(s.scraping);
												}}
											>
												Cancelar
											</Button>
											<Button size="small" variant="contained" onClick={handleSaveScraping} disabled={actionLoading}>
												Guardar
											</Button>
										</Stack>
									) : (
										<Button size="small" startIcon={<Setting2 size={14} />} onClick={() => setScrapingEdit(true)}>
											Editar
										</Button>
									)}
								</Stack>
								<Grid container spacing={2}>
									{(
										[
											{
												key: "cronPattern",
												label: "Cron pattern (5 campos)",
												type: "text",
												help: "Sintaxis node-cron. Default '*/3 * * * *'. Requiere restart del worker para aplicarse.",
												fullWidth: true,
											},
											{ key: "batchSize", label: "Batch size", type: "number" },
											{ key: "pageSize", label: "Page size", type: "number" },
											{ key: "delayBetweenRequests", label: "Delay entre requests (ms)", type: "number" },
											{ key: "rateLimit", label: "Rate limit (reqs/min, 0=sin límite)", type: "number" },
											{ key: "pageTimeout", label: "Timeout de página (ms)", type: "number" },
											{ key: "maxRetries", label: "Max reintentos", type: "number" },
											{ key: "yearFrom", label: "Año desde", type: "number" },
										] as { key: keyof SaijWorkerConfig["scraping"]; label: string; type: string; help?: string; fullWidth?: boolean }[]
									).map(({ key, label, type, help, fullWidth }) => {
										const val = scrapingForm[key];
										// Validación liviana del cron pattern: 5 tokens separados por espacios
										const cronInvalid =
											key === "cronPattern" && typeof val === "string" && val.length > 0 && val.trim().split(/\s+/).length !== 5;
										return (
											<Grid item xs={12} sm={fullWidth ? 12 : 6} md={fullWidth ? 6 : 4} key={key}>
												<TextField
													fullWidth
													size="small"
													label={label}
													type={type}
													value={val ?? ""}
													disabled={!scrapingEdit}
													error={cronInvalid}
													helperText={cronInvalid ? "Debe tener 5 tokens (min hora dom mes dow)" : help}
													onChange={(e) =>
														setScrapingForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))
													}
												/>
											</Grid>
										);
									})}
								</Grid>
								<Divider />
								<Typography variant="subtitle2">Notificaciones</Typography>
								<Grid container spacing={2}>
									{(["errorEmail", "startupEmail", "dailyReport"] as const).map((k) => (
										<Grid item xs={12} sm={4} key={k}>
											<Stack direction="row" alignItems="center" spacing={1}>
												<Switch
													size="small"
													checked={!!s.notification[k]}
													disabled={actionLoading}
													onChange={async (e) => {
														await updateSaijNotificationConfig(s.worker_id, { [k]: e.target.checked });
														fetchConfigs();
													}}
												/>
												<Typography variant="body2">
													{{ errorEmail: "Email de error", startupEmail: "Email inicio", dailyReport: "Reporte diario" }[k]}
												</Typography>
											</Stack>
										</Grid>
									))}
									<Grid item xs={12} sm={6}>
										<TextField fullWidth size="small" label="Email destinatario" value={s.notification.recipientEmail || ""} disabled />
									</Grid>
								</Grid>

								<Divider />
								<Stack direction="row" alignItems="center" spacing={1}>
									<Typography variant="subtitle2">Pipeline downstream</Typography>
									<Tooltip title="Cuando el worker captura una sentencia, ejecuta estos pasos: vincular con causa PJN → marcarla como SAIJ → agregar movimiento → bajar PDF → crear SentenciaCapturada (entrada al pipeline de embeddings). Cada toggle controla un paso. Cambios se aplican en el próximo tick del cron, sin restart.">
										<Box component="span" sx={{ display: "inline-flex" }}>
											<Warning2 size={14} />
										</Box>
									</Tooltip>
								</Stack>
								<Grid container spacing={2}>
									{(
										[
											{ key: "enabled", label: "Activo (master)", help: "Si está off no se ejecuta ningún paso downstream — el worker sólo guarda saij-sentencias." },
											{ key: "linkToCausa", label: "Vincular causa", help: "Lookup en pjn-api por (fuero, número, año). Sin esto los siguientes pasos no corren." },
											{ key: "markCausa", label: "Marcar causa SAIJ", help: "PATCH /api/causas/:fuero/:id/saij — setea sub-doc saij en la causa PJN." },
											{ key: "addMovimiento", label: "Agregar movimiento", help: "Push movimiento tipo 'SENTENCIA SAIJ' al array movimiento[] de la causa." },
											{ key: "downloadPdf", label: "Descargar PDF", help: "Baja el PDF del fallo (Puppeteer + pdf-parse). Paso costoso — apagar si hay problemas de bandwidth." },
											{ key: "createSentenciaCapturada", label: "Crear SentenciaCapturada", help: "Upsert en sentencias-capturadas (Atlas) con el texto + sumarios. Entrada al worker de embeddings." },
											{ key: "createMissingCausas", label: "Crear causas faltantes (Fase 3)", help: "⚠️ EXPERIMENTAL — Si la causa no existe en URLDB_LOCAL, crearla automáticamente con verified:false para que verify-worker la procese. Activar solo después del análisis del backfill report.", warning: true },
										] as { key: keyof SaijPipelineConfig; label: string; help: string; warning?: boolean }[]
									).map(({ key, label, help, warning }) => (
										<Grid item xs={12} sm={6} md={4} key={key}>
											<Stack direction="row" alignItems="center" spacing={1}>
												<Switch
													size="small"
													checked={!!s.pipeline?.[key]}
													disabled={actionLoading}
													color={warning ? "warning" : "primary"}
													onChange={async (e) => {
														try {
															await updateSaijPipelineConfig(s.worker_id, { [key]: e.target.checked });
															enqueueSnackbar(`${label}: ${e.target.checked ? "ON" : "OFF"}`, { variant: "success" });
															fetchConfigs();
														} catch {
															enqueueSnackbar(`Error actualizando ${label}`, { variant: "error" });
														}
													}}
												/>
												<Tooltip title={help}>
													<Typography variant="body2" sx={warning ? { color: "warning.main", fontWeight: 500 } : undefined}>
														{label}
													</Typography>
												</Tooltip>
											</Stack>
										</Grid>
									))}
								</Grid>
							</Stack>
						)}

						{/* ── Tab 3: Pipeline (estado de SC y embeddings) ── */}
						{tab === 3 && (
							<Stack spacing={2}>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="subtitle2">Estado del pipeline downstream</Typography>
									<Button size="small" startIcon={<Refresh size={14} />} onClick={() => { loadPipelineStats(); loadPipelineSentencias(1, pipelineFilters); }} disabled={pipelineStatsLoading}>
										Recargar
									</Button>
								</Stack>

								{pipelineStatsLoading && (
									<Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
								)}

								{pipelineStats && (
									<>
										{/* Stats globales SAIJ */}
										<Paper variant="outlined" sx={{ p: 2 }}>
											<Typography variant="overline" color="text.secondary">SAIJ Sentencias (universo)</Typography>
											<Stack direction="row" spacing={1.5} flexWrap="wrap" mt={1}>
												<StatBox label="Total" value={fmtNum(pipelineStats.total)} />
												<StatBox label="Con expediente" value={fmtNum(pipelineStats.withExpediente)} color={theme.palette.info.main} />
												<StatBox label="Vía PDF" value={fmtNum(pipelineStats.withExpedientePdf)} color={theme.palette.info.dark} />
												<StatBox label="Causa vinculada" value={fmtNum(pipelineStats.withCausaRef)} color={theme.palette.success.main} />
											</Stack>
											{pipelineStats.total > 0 && (
												<Box mt={1.5}>
													<Stack direction="row" justifyContent="space-between" mb={0.5}>
														<Typography variant="caption" color="text.secondary">Expediente parseado</Typography>
														<Typography variant="caption" color="text.secondary">
															{((pipelineStats.withExpediente / pipelineStats.total) * 100).toFixed(1)}%
														</Typography>
													</Stack>
													<LinearProgress
														variant="determinate"
														value={(pipelineStats.withExpediente / pipelineStats.total) * 100}
														sx={{ height: 6, borderRadius: 1 }}
													/>
												</Box>
											)}
										</Paper>

										{/* Pipeline downstream */}
										<Paper variant="outlined" sx={{ p: 2 }}>
											<Typography variant="overline" color="text.secondary">pipelineStatus (SaijSentencia)</Typography>
											<Stack direction="row" spacing={1.5} flexWrap="wrap" mt={1}>
												{pipelineStats.byPipelineStatus.map((g) => {
													const colorMap: Record<string, string> = {
														sc_created: theme.palette.success.main,
														sc_updated: theme.palette.success.light,
														movement_added: theme.palette.info.main,
														linked: theme.palette.info.light,
														skipped: theme.palette.text.disabled,
														failed: theme.palette.error.main,
														pending: theme.palette.warning.main,
													};
													return (
														<StatBox
															key={String(g._id ?? "none")}
															label={g._id ?? "(sin estado)"}
															value={fmtNum(g.count)}
															color={colorMap[g._id ?? ""] || undefined}
														/>
													);
												})}
											</Stack>
										</Paper>

										{/* SentenciaCapturada — entrada al embeddings worker */}
										<Paper variant="outlined" sx={{ p: 2 }}>
											<Typography variant="overline" color="text.secondary">
												SentenciaCapturada (source=saij) — entrada al pipeline de embeddings
											</Typography>
											<Stack direction="row" spacing={1.5} flexWrap="wrap" mt={1}>
												<StatBox label="SC creados" value={fmtNum(pipelineStats.sentenciasCapturadas.total)} color={theme.palette.primary.main} />
												{pipelineStats.sentenciasCapturadas.byProcessingStatus.map((g) => (
													<StatBox
														key={"p-" + g._id}
														label={`proc: ${g._id}`}
														value={fmtNum(g.count)}
														color={g._id === "error" ? theme.palette.error.main : g._id === "processed" ? theme.palette.success.main : undefined}
													/>
												))}
												{pipelineStats.sentenciasCapturadas.byEmbeddingStatus.map((g) => (
													<StatBox
														key={"e-" + g._id}
														label={`emb: ${g._id}`}
														value={fmtNum(g.count)}
														color={
															g._id === "completed" ? theme.palette.success.main :
															g._id === "error" ? theme.palette.error.main :
															g._id === "pending" ? theme.palette.warning.main : undefined
														}
													/>
												))}
											</Stack>
											{pipelineStats.sentenciasCapturadas.total > 0 && (() => {
												const completed = pipelineStats.sentenciasCapturadas.byEmbeddingStatus.find((g) => g._id === "completed")?.count ?? 0;
												const pct = (completed / pipelineStats.sentenciasCapturadas.total) * 100;
												return (
													<Box mt={1.5}>
														<Stack direction="row" justifyContent="space-between" mb={0.5}>
															<Typography variant="caption" color="text.secondary">Embeddings completados</Typography>
															<Typography variant="caption" color="text.secondary">
																{completed} / {pipelineStats.sentenciasCapturadas.total} ({pct.toFixed(1)}%)
															</Typography>
														</Stack>
														<LinearProgress variant="determinate" value={pct} color="success" sx={{ height: 6, borderRadius: 1 }} />
													</Box>
												);
											})()}
										</Paper>

										{/* Top fueros */}
										<Paper variant="outlined" sx={{ p: 2 }}>
											<Typography variant="overline" color="text.secondary">Top fueros (SAIJ)</Typography>
											<Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
												{pipelineStats.byFuero.slice(0, 10).map((g) => (
													<Chip
														key={g._id}
														label={`${g._id || "(sin fuero)"}: ${fmtNum(g.count)}`}
														size="small"
														variant="outlined"
														onClick={() => {
															const next = { ...pipelineFilters, fuero: g._id || undefined };
															setPipelineFilters(next);
															loadPipelineSentencias(1, next);
														}}
													/>
												))}
											</Stack>
										</Paper>
									</>
								)}

								{/* Filtros + tabla */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" mb={1.5}>
										<Typography variant="subtitle2">Documentos</Typography>
										<TextField
											select
											SelectProps={{ native: true }}
											size="small"
											value={pipelineFilters.pipelineStatus || ""}
											onChange={(e) => {
												const next = { ...pipelineFilters, pipelineStatus: e.target.value || undefined };
												setPipelineFilters(next);
												loadPipelineSentencias(1, next);
											}}
											sx={{ minWidth: 160 }}
											label="pipelineStatus"
											InputLabelProps={{ shrink: true }}
										>
											<option value="">(todos)</option>
											<option value="pending">pending</option>
											<option value="linked">linked</option>
											<option value="movement_added">movement_added</option>
											<option value="sc_created">sc_created</option>
											<option value="sc_updated">sc_updated</option>
											<option value="failed">failed</option>
											<option value="skipped">skipped</option>
										</TextField>
										<TextField
											select
											SelectProps={{ native: true }}
											size="small"
											value={pipelineFilters.linked || ""}
											onChange={(e) => {
												const next = { ...pipelineFilters, linked: (e.target.value || undefined) as "true" | "false" | undefined };
												setPipelineFilters(next);
												loadPipelineSentencias(1, next);
											}}
											sx={{ minWidth: 140 }}
											label="Vinculado"
											InputLabelProps={{ shrink: true }}
										>
											<option value="">(todos)</option>
											<option value="true">con causa</option>
											<option value="false">sin causa</option>
										</TextField>
										<TextField
											select
											SelectProps={{ native: true }}
											size="small"
											value={pipelineFilters.expedienteSource || ""}
											onChange={(e) => {
												const next = { ...pipelineFilters, expedienteSource: (e.target.value || undefined) as "pdf" | "metadata" | "url" | undefined };
												setPipelineFilters(next);
												loadPipelineSentencias(1, next);
											}}
											sx={{ minWidth: 140 }}
											label="Fuente expediente"
											InputLabelProps={{ shrink: true }}
										>
											<option value="">(todos)</option>
											<option value="pdf">pdf</option>
											<option value="metadata">metadata</option>
											<option value="url">url</option>
										</TextField>
										{pipelineFilters.fuero && (
											<Chip
												label={`fuero: ${pipelineFilters.fuero}`}
												size="small"
												onDelete={() => {
													const next = { ...pipelineFilters, fuero: undefined };
													setPipelineFilters(next);
													loadPipelineSentencias(1, next);
												}}
											/>
										)}
										<Box flex={1} />
										<Typography variant="caption" color="text.secondary">
											{fmtNum(pipelineTotal)} resultados
										</Typography>
									</Stack>

									{pipelineSentenciasLoading ? (
										<Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
									) : pipelineSentencias.length === 0 ? (
										<Alert severity="info">Sin resultados.</Alert>
									) : (
										<TableContainer>
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Tipo</TableCell>
														<TableCell>Fuero</TableCell>
														<TableCell>Expediente</TableCell>
														<TableCell>Causa</TableCell>
														<TableCell>pipelineStatus</TableCell>
														<TableCell>SC</TableCell>
														<TableCell>Embedding</TableCell>
														<TableCell>Fecha</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{pipelineSentencias.map((d) => {
														const exp = d.expediente;
														const sc = d.sentenciaCapturada;
														const psColor: Record<string, string> = {
															sc_created: theme.palette.success.main,
															sc_updated: theme.palette.success.light,
															movement_added: theme.palette.info.main,
															linked: theme.palette.info.light,
															failed: theme.palette.error.main,
															skipped: theme.palette.text.disabled,
														};
														return (
															<TableRow key={d._id} hover>
																<TableCell>
																	<Chip label={d.saijType?.slice(0, 4) || "-"} size="small" variant="outlined" />
																</TableCell>
																<TableCell>{d.fuero || "-"}</TableCell>
																<TableCell>
																	{exp?.numero ? (
																		<Tooltip title={`${exp.source || "?"} · ${exp.confidence || "?"}${exp.instancia ? " · " + exp.instancia : ""}`}>
																			<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
																				{exp.numero}/{exp.año}
																				{exp.source === "pdf" && <span style={{ color: theme.palette.info.main }}> 📄</span>}
																			</Typography>
																		</Tooltip>
																	) : "-"}
																</TableCell>
																<TableCell>
																	{d.causaRefs?.length > 0 ? (
																		<Tooltip title={d.causaRefs[0].caratula || ""}>
																			<TickCircle size={14} color={theme.palette.success.main} />
																		</Tooltip>
																	) : (
																		<CloseCircle size={14} color={theme.palette.text.disabled} />
																	)}
																</TableCell>
																<TableCell>
																	<Chip
																		label={d.pipelineStatus || "-"}
																		size="small"
																		sx={{
																			bgcolor: alpha(psColor[d.pipelineStatus || ""] || theme.palette.text.disabled, 0.15),
																			color: psColor[d.pipelineStatus || ""] || "text.primary",
																			height: 20,
																			fontSize: "0.7rem",
																		}}
																	/>
																</TableCell>
																<TableCell>
																	{sc ? (
																		<Tooltip title={`proc: ${sc.processingStatus} · ${sc.embeddingChunksCount || 0} chunks`}>
																			<Chip label={sc.processingStatus || "?"} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
																		</Tooltip>
																	) : "-"}
																</TableCell>
																<TableCell>
																	{sc?.embeddingStatus ? (
																		<Chip
																			label={sc.embeddingStatus}
																			size="small"
																			color={
																				sc.embeddingStatus === "completed" ? "success" :
																				sc.embeddingStatus === "error" ? "error" :
																				sc.embeddingStatus === "pending" ? "warning" : "default"
																			}
																			sx={{ height: 20, fontSize: "0.7rem" }}
																		/>
																	) : "-"}
																</TableCell>
																<TableCell>
																	<Typography variant="caption" color="text.secondary">
																		{d.fecha ? new Date(d.fecha).toLocaleDateString("es-AR") : "-"}
																	</Typography>
																</TableCell>
															</TableRow>
														);
													})}
												</TableBody>
											</Table>
										</TableContainer>
									)}

									{pipelineTotal > 25 && (
										<Stack direction="row" justifyContent="center" spacing={1} mt={2}>
											<Button size="small" disabled={pipelinePage <= 1 || pipelineSentenciasLoading} onClick={() => loadPipelineSentencias(pipelinePage - 1)}>
												Anterior
											</Button>
											<Typography variant="caption" alignSelf="center">
												{pipelinePage} / {Math.ceil(pipelineTotal / 25)}
											</Typography>
											<Button size="small" disabled={pipelinePage * 25 >= pipelineTotal || pipelineSentenciasLoading} onClick={() => loadPipelineSentencias(pipelinePage + 1)}>
												Siguiente
											</Button>
										</Stack>
									)}
								</Paper>
							</Stack>
						)}

						{/* ── Tab 2: Historial ── */}
						{tab === 2 && (
							<Box>
								{historyLoading ? (
									<Box display="flex" justifyContent="center" py={4}>
										<CircularProgress size={28} />
									</Box>
								) : history.length === 0 ? (
									<Alert severity="info">Sin historial disponible aún.</Alert>
								) : (
									<TableContainer component={Paper} variant="outlined">
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Año</TableCell>
													<TableCell>Mes</TableCell>
													<TableCell align="right">Documentos</TableCell>
													<TableCell>Completado</TableCell>
													<TableCell>Fecha</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{history.map((h, i) => (
													<TableRow key={i} hover>
														<TableCell>{h.year}</TableCell>
														<TableCell>{MONTH_NAMES[(h.month ?? 1) - 1]}</TableCell>
														<TableCell align="right">{fmtNum(h.totalDocuments)}</TableCell>
														<TableCell>
															{h.completed ? (
																<TickCircle size={16} color={theme.palette.success.main} />
															) : (
																<Warning2 size={16} color={theme.palette.warning.main} />
															)}
														</TableCell>
														<TableCell>{fmtDate(h.completedAt)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								)}
							</Box>
						)}
					</Grid>
				)}
			</Grid>

			{/* ── Dialog: Pausar ── */}
			<Dialog open={pauseDialogOpen} onClose={() => setPauseDialogOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Pausar worker</DialogTitle>
				<DialogContent>
					<Stack spacing={2} mt={1}>
						<TextField
							label="Razón"
							fullWidth
							size="small"
							value={pauseReason}
							onChange={(e) => setPauseReason(e.target.value)}
							placeholder="Ej: Mantenimiento programado"
						/>
						<TextField
							label="Reanudar en (opcional)"
							fullWidth
							size="small"
							type="datetime-local"
							value={pauseResumeAt}
							onChange={(e) => setPauseResumeAt(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPauseDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handlePause} disabled={!pauseReason.trim() || actionLoading}>
						Pausar
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Dialog: Mover cursor ── */}
			<Dialog open={cursorDialogOpen} onClose={() => setCursorDialogOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Mover cursor de scraping</DialogTitle>
				<DialogContent>
					<Stack direction="row" spacing={2} mt={1}>
						<TextField
							label="Año"
							size="small"
							type="number"
							value={cursorYear}
							onChange={(e) => setCursorYear(e.target.value)}
							InputProps={{ inputProps: { min: 1990, max: 2100 } }}
						/>
						<TextField
							label="Mes"
							size="small"
							type="number"
							value={cursorMonth}
							onChange={(e) => setCursorMonth(e.target.value)}
							InputProps={{ inputProps: { min: 1, max: 12 } }}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCursorDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleResetCursor} disabled={!cursorYear || !cursorMonth || actionLoading}>
						Aplicar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
}
