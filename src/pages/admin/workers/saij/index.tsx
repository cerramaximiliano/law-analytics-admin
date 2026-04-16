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
import { CloseCircle, Refresh, Setting2, DocumentText, TickCircle, Warning2, Calendar, ArrowRight2, Pause, Play, TextBlock } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import {
	EnrichStatsResponse,
	SaijWorkerConfig,
	getSaijEnrichStats,
	getSaijWorkerConfigs,
	getSaijWorkerHistory,
	enableSaijWorker,
	disableSaijWorker,
	pauseSaijWorker,
	resumeSaijWorker,
	resetSaijCursor,
	updateSaijScrapingConfig,
	updateSaijNotificationConfig,
} from "api/saij";

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
	return (
		<Box
			sx={{
				p: 2,
				borderRadius: 2,
				bgcolor: color ? alpha(color, 0.08) : alpha(theme.palette.primary.main, 0.06),
				border: `1px solid ${color ? alpha(color, 0.2) : alpha(theme.palette.primary.main, 0.15)}`,
				textAlign: "center",
				minWidth: 110,
			}}
		>
			<Typography variant="h5" fontWeight={700} color={color || "primary.main"}>
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

	const handleTabChange = (_: React.SyntheticEvent, newVal: number) => {
		setTab(newVal);
		if (newVal === 2 && history.length === 0) loadHistory();
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
							bgcolor: (theme) => alpha(theme.palette.info.main, 0.1),
							color: "info.main",
							fontSize: "0.6rem",
							fontWeight: 500,
							fontFamily: "monospace",
						}}
					>
						100.111.73.56
					</Box>
					<Tooltip title="Recargar">
						<IconButton size="small" onClick={fetchConfigs} disabled={loading}>
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			}
		>
			<Grid container spacing={2}>
				{/* Worker selector */}
				<Grid item xs={12} md={3}>
					<Paper variant="outlined" sx={{ p: 1 }}>
						<Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
							Workers de scraping
						</Typography>
						{configs.map((cfg) => (
							<Box
								key={cfg.worker_id}
								onClick={() => { selectWorker(cfg); handleSideTabChange("scraping"); }}
								sx={{
									p: 1.5,
									borderRadius: 1,
									cursor: "pointer",
									bgcolor: sideTab === "scraping" && selected?.worker_id === cfg.worker_id ? alpha(theme.palette.primary.main, 0.1) : "transparent",
									"&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
								}}
							>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Typography variant="body2" fontWeight={sideTab === "scraping" && selected?.worker_id === cfg.worker_id ? 600 : 400}>
										{cfg.worker_id}
									</Typography>
									<Chip
										size="small"
										label={cfg.enabled ? "ON" : "OFF"}
										color={cfg.enabled ? "success" : "default"}
										sx={{ fontSize: 10, height: 18 }}
									/>
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
															<Typography variant="caption" fontFamily="monospace">{r.numeroSumario || "—"}</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="caption" color="text.secondary">{r.texto?.length ?? 0}</Typography>
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
									El worker corre como proceso PM2 <strong>worker_SAIJ_enrich</strong> (id: 539) en worker_01.
									Procesa un sumario cada ~5s con delay configurable via <code>ENRICH_DELAY_MS</code>.
									Cuando no hay pendientes duerme 30 min y reintenta.
								</Alert>
							</Stack>
						)}

						{!enrichStats && !enrichLoading && (
							<Alert severity="info">Hacé click en recargar para ver el estado del worker.</Alert>
						)}
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
							<Button size="small" startIcon={<Calendar size={14} />} onClick={() => setCursorDialogOpen(true)} variant="outlined" disabled={actionLoading}>
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
										<Chip
											label={`${s.scraping.currentYear} / ${MONTH_NAMES[s.scraping.currentMonth - 1]}`}
											size="small"
											color="primary"
										/>
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
											<Button size="small" onClick={() => { setScrapingEdit(false); setScrapingForm(s.scraping); }}>
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
											{ key: "batchSize", label: "Batch size", type: "number" },
											{ key: "delayBetweenRequests", label: "Delay entre requests (ms)", type: "number" },
											{ key: "rateLimit", label: "Rate limit", type: "number" },
											{ key: "pageTimeout", label: "Timeout de página (ms)", type: "number" },
											{ key: "maxRetries", label: "Max reintentos", type: "number" },
											{ key: "yearFrom", label: "Año desde", type: "number" },
										] as { key: keyof SaijWorkerConfig["scraping"]; label: string; type: string }[]
									).map(({ key, label, type }) => (
										<Grid item xs={12} sm={6} md={4} key={key}>
											<TextField
												fullWidth
												size="small"
												label={label}
												type={type}
												value={scrapingForm[key] ?? ""}
												disabled={!scrapingEdit}
												onChange={(e) => setScrapingForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
											/>
										</Grid>
									))}
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
