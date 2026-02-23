import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Switch,
	Chip,
	IconButton,
	Tooltip,
	Slider,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Skeleton,
	Alert,
	useTheme,
	alpha,
	Divider,
} from "@mui/material";
import { Refresh, Play, Pause, Flash } from "iconsax-react";
import { useSnackbar } from "notistack";
import { Edit2 } from "iconsax-react";
import RagWorkersService, { WorkerConfig, AutoIndexSettings, RecoverySettings, ScalingConfig, InstanceScalingConfig, RateLimiter } from "api/ragWorkers";

// Orden segun flujo del pipeline: autoIndex → indexCausa → indexDocument → ocrDocument → generateSummary → recovery
const WORKER_ORDER = ["autoIndex", "indexCausa", "indexDocument", "ocrDocument", "generateSummary", "recovery"];

const WORKER_LABELS: Record<string, { label: string; description: string }> = {
	autoIndex: { label: "Auto Index", description: "1. Escaneo periodico — encola causas que necesitan indexacion" },
	indexCausa: { label: "Index Causa", description: "2. Indexa causa — crea docs RAG y los encola a indexDocument" },
	indexDocument: { label: "Index Document", description: "3. Pipeline por doc — descarga, extraccion, chunks, embeddings, vectores" },
	ocrDocument: { label: "OCR Document", description: "4. OCR — procesa PDFs escaneados y reencola a indexDocument" },
	generateSummary: { label: "Generate Summary", description: "5. Resumenes — genera o actualiza resumenes via LLM" },
	recovery: { label: "Recovery", description: "6. Recuperacion — reintenta documentos fallidos o estancados" },
};

const DEFAULT_RECOVERY: RecoverySettings = {
	intervalMs: 120000,
	batchSize: 30,
	maxQueueLoad: 100,
	docErrorCooldownMs: 900000,
	docMaxRetries: 3,
	stalledThresholdMs: 600000,
	cleanFailedAfterMs: 3600000,
};

const DEFAULT_SCALING: ScalingConfig = {
	enabled: false,
	minConcurrency: 1,
	maxConcurrency: 10,
	scaleUpThreshold: 20,
	scaleDownThreshold: 5,
	scaleUpStep: 2,
	scaleDownStep: 1,
	cooldownMs: 60000,
};

const DEFAULT_INSTANCE_SCALING: InstanceScalingConfig = {
	enabled: false,
	minInstances: 1,
	maxInstances: 3,
	scaleUpThreshold: 50,
	scaleDownThreshold: 5,
	scaleUpStep: 1,
	scaleDownStep: 1,
	cooldownMs: 120000,
};

const WorkerControlTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [workers, setWorkers] = useState<WorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [editWorker, setEditWorker] = useState<WorkerConfig | null>(null);
	const [editConcurrency, setEditConcurrency] = useState(1);
	const [editAutoIndex, setEditAutoIndex] = useState(false);
	const [aiSettings, setAiSettings] = useState<AutoIndexSettings>({ intervalMs: 300000, batchSize: 50, maxConcurrentJobs: 10, errorRetryAfterMs: 3600000, errorMaxRetries: 3 });
	const [editRecovery, setEditRecovery] = useState(false);
	const [rcSettings, setRcSettings] = useState<RecoverySettings>(DEFAULT_RECOVERY);
	const [editScalingWorker, setEditScalingWorker] = useState<WorkerConfig | null>(null);
	const [scSettings, setScSettings] = useState<ScalingConfig>(DEFAULT_SCALING);
	const [editInstScalingWorker, setEditInstScalingWorker] = useState<WorkerConfig | null>(null);
	const [isSettings, setIsSettings] = useState<InstanceScalingConfig>(DEFAULT_INSTANCE_SCALING);
	const [editRateLimiterWorker, setEditRateLimiterWorker] = useState<WorkerConfig | null>(null);
	const [rlSettings, setRlSettings] = useState<RateLimiter>({ max: 1, duration: 60000 });

	const fetchWorkers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getWorkers();
			data.sort((a, b) => {
				const ia = WORKER_ORDER.indexOf(a.workerName);
				const ib = WORKER_ORDER.indexOf(b.workerName);
				return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
			});
			setWorkers(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar workers", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchWorkers();
	}, [fetchWorkers]);

	// ── Handlers ──────────────────────────────────────────────────────────────

	const handleToggleEnabled = async (worker: WorkerConfig) => {
		try {
			const { data, requiresRestart } = await RagWorkersService.updateWorker(worker.workerName, { enabled: !worker.enabled });
			setWorkers((prev) => prev.map((w) => (w.workerName === worker.workerName ? { ...w, ...data } : w)));
			enqueueSnackbar(`Worker ${worker.workerName} ${!worker.enabled ? "habilitado" : "deshabilitado"}`, { variant: "success" });
			if (requiresRestart) {
				enqueueSnackbar("Cambios en rate limiter requieren reinicio", { variant: "warning" });
			}
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar worker", { variant: "error" });
		}
	};

	const handlePauseResume = async (worker: WorkerConfig) => {
		try {
			if (worker.paused) {
				await RagWorkersService.resumeWorker(worker.workerName);
				enqueueSnackbar(`Worker ${worker.workerName} se reanudara en el proximo ciclo`, { variant: "success" });
			} else {
				await RagWorkersService.pauseWorker(worker.workerName);
				enqueueSnackbar(`Worker ${worker.workerName} se pausara en el proximo ciclo`, { variant: "success" });
			}
			fetchWorkers();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al pausar/reanudar worker", { variant: "error" });
		}
	};

	const handleOpenConcurrency = (worker: WorkerConfig) => {
		setEditWorker(worker);
		setEditConcurrency(worker.concurrency);
	};

	const handleSaveConcurrency = async () => {
		if (!editWorker) return;
		try {
			const { data, requiresRestart } = await RagWorkersService.updateWorker(editWorker.workerName, { concurrency: editConcurrency });
			setWorkers((prev) => prev.map((w) => (w.workerName === editWorker.workerName ? { ...w, ...data } : w)));
			enqueueSnackbar(`Concurrency de ${editWorker.workerName} actualizada a ${editConcurrency}`, { variant: "success" });
			if (requiresRestart) enqueueSnackbar("Cambios en rate limiter requieren reinicio", { variant: "warning" });
			setEditWorker(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar concurrency", { variant: "error" });
		}
	};

	const handleTriggerAutoIndex = async () => {
		try {
			await RagWorkersService.triggerAutoIndex();
			enqueueSnackbar("Escaneo de auto-index disparado", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al disparar auto-index", { variant: "error" });
		}
	};

	// Auto-Index settings
	const handleOpenAutoIndexSettings = () => {
		const ai = workers.find((w) => w.workerName === "autoIndex");
		if (ai?.autoIndexSettings) {
			setAiSettings({ ...ai.autoIndexSettings });
		}
		setEditAutoIndex(true);
	};

	const handleSaveAutoIndexSettings = async () => {
		try {
			const { data } = await RagWorkersService.updateWorker("autoIndex", { autoIndexSettings: aiSettings });
			setWorkers((prev) => prev.map((w) => (w.workerName === "autoIndex" ? { ...w, ...data } : w)));
			enqueueSnackbar("Configuracion de Auto-Index actualizada", { variant: "success" });
			setEditAutoIndex(false);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar configuracion", { variant: "error" });
		}
	};

	// Recovery settings
	const handleOpenRecoverySettings = () => {
		const rc = workers.find((w) => w.workerName === "recovery");
		if (rc?.recoverySettings) {
			setRcSettings({ ...rc.recoverySettings });
		} else {
			setRcSettings({ ...DEFAULT_RECOVERY });
		}
		setEditRecovery(true);
	};

	const handleSaveRecoverySettings = async () => {
		try {
			const { data } = await RagWorkersService.updateWorker("recovery", { recoverySettings: rcSettings });
			setWorkers((prev) => prev.map((w) => (w.workerName === "recovery" ? { ...w, ...data } : w)));
			enqueueSnackbar("Configuracion de Recovery actualizada", { variant: "success" });
			setEditRecovery(false);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar configuracion", { variant: "error" });
		}
	};

	// Scaling settings
	const handleOpenScaling = (worker: WorkerConfig) => {
		setEditScalingWorker(worker);
		if (worker.scaling) {
			const { lastScaledConcurrency, lastScaledAt, lastQueueDepth, ...editable } = worker.scaling;
			setScSettings({ ...DEFAULT_SCALING, ...editable });
		} else {
			setScSettings({ ...DEFAULT_SCALING });
		}
	};

	const handleSaveScaling = async () => {
		if (!editScalingWorker) return;
		try {
			const { data } = await RagWorkersService.updateWorker(editScalingWorker.workerName, { scaling: scSettings });
			setWorkers((prev) => prev.map((w) => (w.workerName === editScalingWorker.workerName ? { ...w, ...data } : w)));
			enqueueSnackbar(`Escalado de ${editScalingWorker.workerName} actualizado`, { variant: "success" });
			setEditScalingWorker(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar escalado", { variant: "error" });
		}
	};

	// Instance Scaling settings
	const handleOpenInstScaling = (worker: WorkerConfig) => {
		setEditInstScalingWorker(worker);
		if (worker.instanceScaling) {
			const { lastInstanceCount, lastScaledAt, lastQueueDepth, ...editable } = worker.instanceScaling;
			setIsSettings({ ...DEFAULT_INSTANCE_SCALING, ...editable });
		} else {
			setIsSettings({ ...DEFAULT_INSTANCE_SCALING });
		}
	};

	const handleSaveInstScaling = async () => {
		if (!editInstScalingWorker) return;
		try {
			const { data } = await RagWorkersService.updateWorker(editInstScalingWorker.workerName, { instanceScaling: isSettings });
			setWorkers((prev) => prev.map((w) => (w.workerName === editInstScalingWorker.workerName ? { ...w, ...data } : w)));
			enqueueSnackbar(`Escalado de instancias de ${editInstScalingWorker.workerName} actualizado`, { variant: "success" });
			setEditInstScalingWorker(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar escalado de instancias", { variant: "error" });
		}
	};

	// Rate Limiter settings
	const handleOpenRateLimiter = (worker: WorkerConfig) => {
		setEditRateLimiterWorker(worker);
		setRlSettings({
			max: worker.rateLimiter?.max || 1,
			duration: worker.rateLimiter?.duration || 60000,
		});
	};

	const handleSaveRateLimiter = async () => {
		if (!editRateLimiterWorker) return;
		try {
			const { data, requiresRestart } = await RagWorkersService.updateWorker(editRateLimiterWorker.workerName, { rateLimiter: rlSettings });
			setWorkers((prev) => prev.map((w) => (w.workerName === editRateLimiterWorker.workerName ? { ...w, ...data } : w)));
			enqueueSnackbar(`Rate limiter de ${editRateLimiterWorker.workerName} actualizado`, { variant: "success" });
			if (requiresRestart) enqueueSnackbar("Cambios en rate limiter requieren reinicio del worker via PM2", { variant: "warning" });
			setEditRateLimiterWorker(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al actualizar rate limiter", { variant: "error" });
		}
	};

	// ── Helpers ───────────────────────────────────────────────────────────────

	const getStatusChip = (worker: WorkerConfig) => {
		if (!worker.enabled) return <Chip label="Deshabilitado" size="small" color="default" />;
		if (worker.paused) return <Chip label="Pausado" size="small" color="warning" />;
		return <Chip label="Activo" size="small" color="success" />;
	};

	const getQueueSummary = (counts?: Record<string, number>) => {
		if (!counts) return "-";
		const active = counts.active || 0;
		const waiting = counts.waiting || 0;
		const delayed = counts.delayed || 0;
		const failed = counts.failed || 0;
		const parts = [];
		if (active > 0) parts.push(`${active} activos`);
		if (waiting > 0) parts.push(`${waiting} esperando`);
		if (delayed > 0) parts.push(`${delayed} demorados`);
		if (failed > 0) parts.push(`${failed} fallidos`);
		return parts.length > 0 ? parts.join(", ") : "Sin jobs";
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				{[...Array(6)].map((_, i) => (
					<Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
				))}
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Workers BullMQ</Typography>
				<Stack direction="row" spacing={1}>
					<Tooltip title="Forzar escaneo de auto-index">
						<Button variant="outlined" size="small" startIcon={<Flash size={16} />} onClick={handleTriggerAutoIndex}>
							Trigger Auto-Index
						</Button>
					</Tooltip>
					<Tooltip title="Refrescar">
						<IconButton onClick={fetchWorkers} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Worker</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell>Habilitado</TableCell>
							<TableCell align="center">Concurrency</TableCell>
							<TableCell>Rate Limiter</TableCell>
							<TableCell align="center">Escalado</TableCell>
							<TableCell align="center">Instancias</TableCell>
							<TableCell>Cola</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{workers.map((worker) => {
							const info = WORKER_LABELS[worker.workerName] || { label: worker.workerName, description: "" };
							return (
								<TableRow key={worker.workerName} hover>
									<TableCell>
										<Stack>
											<Typography variant="subtitle2" fontWeight={600}>
												{info.label}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{info.description}
											</Typography>
										</Stack>
									</TableCell>
									<TableCell>{getStatusChip(worker)}</TableCell>
									<TableCell>
										<Switch checked={worker.enabled} onChange={() => handleToggleEnabled(worker)} size="small" />
									</TableCell>
									<TableCell align="center">
										<Chip
											label={worker.concurrency}
											size="small"
											variant="outlined"
											onClick={() => handleOpenConcurrency(worker)}
											sx={{ cursor: "pointer", fontWeight: 600, minWidth: 40 }}
										/>
									</TableCell>
									<TableCell>
										<Chip
											label={`${worker.rateLimiter?.max || "-"}/${((worker.rateLimiter?.duration || 60000) / 1000).toFixed(0)}s`}
											size="small"
											variant="outlined"
											onClick={() => handleOpenRateLimiter(worker)}
											sx={{ cursor: "pointer", fontWeight: 600, fontFamily: "monospace" }}
										/>
									</TableCell>
									<TableCell align="center">
										{worker.scaling ? (
											<Tooltip
												title={
													worker.scaling.enabled
														? `Concurrency: ${worker.scaling.minConcurrency}-${worker.scaling.maxConcurrency} · Scale up: >${worker.scaling.scaleUpThreshold} jobs · Scale down: <${worker.scaling.scaleDownThreshold} jobs` +
															(worker.scaling.lastScaledConcurrency != null ? ` · Ultima: ${worker.scaling.lastScaledConcurrency} conc` : "")
														: "Auto-escalado deshabilitado — click para configurar"
												}
											>
												<Chip
													label={worker.scaling.enabled ? "On" : "Off"}
													size="small"
													variant="outlined"
													color={worker.scaling.enabled ? "primary" : "default"}
													onClick={() => handleOpenScaling(worker)}
													sx={{ cursor: "pointer", fontWeight: 600, minWidth: 40 }}
												/>
											</Tooltip>
										) : (
											<Typography variant="caption" color="text.disabled">—</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										{worker.instanceScaling ? (
											<Tooltip
												title={
													worker.instanceScaling.enabled
														? `Instancias: ${worker.instanceScaling.minInstances}-${worker.instanceScaling.maxInstances} · Scale up: >${worker.instanceScaling.scaleUpThreshold} jobs · Scale down: <${worker.instanceScaling.scaleDownThreshold} jobs` +
															(worker.instanceScaling.lastInstanceCount != null ? ` · Actual: ${worker.instanceScaling.lastInstanceCount}` : "")
														: "Escalado de instancias deshabilitado — click para configurar"
												}
											>
												<Chip
													label={
														worker.instanceScaling.enabled
															? worker.instanceScaling.lastInstanceCount != null
																? String(worker.instanceScaling.lastInstanceCount)
																: "On"
															: "Off"
													}
													size="small"
													variant="outlined"
													color={worker.instanceScaling.enabled ? "secondary" : "default"}
													onClick={() => handleOpenInstScaling(worker)}
													sx={{ cursor: "pointer", fontWeight: 600, minWidth: 40 }}
												/>
											</Tooltip>
										) : (
											<Typography variant="caption" color="text.disabled">—</Typography>
										)}
									</TableCell>
									<TableCell>
										<Typography variant="caption" color="text.secondary">
											{getQueueSummary(worker.queueCounts)}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Tooltip title={worker.paused ? "Reanudar" : "Pausar"}>
											<IconButton size="small" color={worker.paused ? "success" : "warning"} onClick={() => handlePauseResume(worker)} disabled={!worker.enabled}>
												{worker.paused ? <Play size={16} /> : <Pause size={16} />}
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			{/* ── Auto-Index settings info box ────────────────────────────────── */}
			{workers.some((w) => w.workerName === "autoIndex" && w.autoIndexSettings) && (
				<Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04), border: `1px solid ${alpha(theme.palette.info.main, 0.15)}` }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
						<Typography variant="subtitle2">Configuracion Auto-Index</Typography>
						<Tooltip title="Editar configuracion">
							<IconButton size="small" onClick={handleOpenAutoIndexSettings}>
								<Edit2 size={16} />
							</IconButton>
						</Tooltip>
					</Stack>
					{(() => {
						const ai = workers.find((w) => w.workerName === "autoIndex");
						const s = ai?.autoIndexSettings;
						if (!s) return null;
						return (
							<Stack direction="row" spacing={3} flexWrap="wrap">
								<Typography variant="caption">
									Intervalo: <strong>{(s.intervalMs / 60000).toFixed(1)} min</strong>
								</Typography>
								<Typography variant="caption">
									Batch: <strong>{s.batchSize}</strong>
								</Typography>
								<Typography variant="caption">
									Max concurrentes: <strong>{s.maxConcurrentJobs}</strong>
								</Typography>
								<Typography variant="caption">
									Retry errores despues de: <strong>{(s.errorRetryAfterMs / 3600000).toFixed(1)} hs</strong>
								</Typography>
								<Typography variant="caption">
									Max reintentos causa: <strong>{s.errorMaxRetries}</strong>
								</Typography>
							</Stack>
						);
					})()}
				</Box>
			)}

			{/* ── Recovery settings info box ──────────────────────────────────── */}
			{workers.some((w) => w.workerName === "recovery") && (
				<Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.04), border: `1px solid ${alpha(theme.palette.warning.main, 0.15)}` }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
						<Typography variant="subtitle2">Configuracion Recovery</Typography>
						<Tooltip title="Editar configuracion">
							<IconButton size="small" onClick={handleOpenRecoverySettings}>
								<Edit2 size={16} />
							</IconButton>
						</Tooltip>
					</Stack>
					{(() => {
						const rc = workers.find((w) => w.workerName === "recovery");
						const s = rc?.recoverySettings;
						if (!s) return null;
						return (
							<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
								<Typography variant="caption">
									Intervalo: <strong>{(s.intervalMs / 60000).toFixed(1)} min</strong>
								</Typography>
								<Typography variant="caption">
									Batch: <strong>{s.batchSize}</strong>
								</Typography>
								<Typography variant="caption">
									Max carga colas: <strong>{s.maxQueueLoad}</strong>
								</Typography>
								<Typography variant="caption">
									Cooldown errores: <strong>{(s.docErrorCooldownMs / 60000).toFixed(0)} min</strong>
								</Typography>
								<Typography variant="caption">
									Max reintentos: <strong>{s.docMaxRetries}</strong>
								</Typography>
								<Typography variant="caption">
									Umbral stalled: <strong>{(s.stalledThresholdMs / 60000).toFixed(0)} min</strong>
								</Typography>
								<Typography variant="caption">
									Limpiar failed: <strong>{(s.cleanFailedAfterMs / 3600000).toFixed(1)} hs</strong>
								</Typography>
							</Stack>
						);
					})()}
				</Box>
			)}

			{/* ── Concurrency edit dialog ─────────────────────────────────────── */}
			<Dialog open={!!editWorker} onClose={() => setEditWorker(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Concurrency — {editWorker && (WORKER_LABELS[editWorker.workerName]?.label || editWorker.workerName)}</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Cantidad de jobs que procesa en paralelo este worker. Cambios se aplican en el proximo ciclo de polling (30s).
						</Typography>
						<Slider
							value={editConcurrency}
							onChange={(_, val) => setEditConcurrency(val as number)}
							min={1}
							max={20}
							step={1}
							marks={[
								{ value: 1, label: "1" },
								{ value: 5, label: "5" },
								{ value: 10, label: "10" },
								{ value: 15, label: "15" },
								{ value: 20, label: "20" },
							]}
							valueLabelDisplay="on"
						/>
						<Alert severity="info" variant="outlined">
							Valor actual: <strong>{editWorker?.concurrency}</strong> → Nuevo: <strong>{editConcurrency}</strong>
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditWorker(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveConcurrency}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Auto-Index settings edit dialog ─────────────────────────────── */}
			<Dialog open={editAutoIndex} onClose={() => setEditAutoIndex(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Configuracion Auto-Index</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Intervalo de escaneo (minutos)"
							type="number"
							value={Math.round(aiSettings.intervalMs / 60000)}
							onChange={(e) => setAiSettings((prev) => ({ ...prev, intervalMs: Math.max(1, parseInt(e.target.value) || 1) * 60000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Cada cuantos minutos se ejecuta el escaneo automatico"
						/>
						<TextField
							label="Batch size"
							type="number"
							value={aiSettings.batchSize}
							onChange={(e) => setAiSettings((prev) => ({ ...prev, batchSize: Math.max(1, parseInt(e.target.value) || 1) }))}
							inputProps={{ min: 1, max: 200 }}
							size="small"
							fullWidth
							helperText="Cantidad maxima de causas a encolar por ciclo de escaneo"
						/>
						<TextField
							label="Max jobs concurrentes"
							type="number"
							value={aiSettings.maxConcurrentJobs}
							onChange={(e) => setAiSettings((prev) => ({ ...prev, maxConcurrentJobs: Math.max(1, parseInt(e.target.value) || 1) }))}
							inputProps={{ min: 1, max: 50 }}
							size="small"
							fullWidth
							helperText="Tope total de jobs activos + esperando en la cola de indexacion"
						/>
						<TextField
							label="Retry de errores despues de (horas)"
							type="number"
							value={Math.round(aiSettings.errorRetryAfterMs / 3600000)}
							onChange={(e) => setAiSettings((prev) => ({ ...prev, errorRetryAfterMs: Math.max(1, parseInt(e.target.value) || 1) * 3600000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Tiempo de espera antes de reintentar una causa que fallo"
						/>
						<TextField
							label="Max reintentos por causa con error"
							type="number"
							value={aiSettings.errorMaxRetries}
							onChange={(e) => setAiSettings((prev) => ({ ...prev, errorMaxRetries: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
							inputProps={{ min: 1, max: 10 }}
							size="small"
							fullWidth
							helperText="Cantidad maxima de reintentos para causas con error (Tier 3)"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditAutoIndex(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveAutoIndexSettings}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Recovery settings edit dialog ───────────────────────────────── */}
			<Dialog open={editRecovery} onClose={() => setEditRecovery(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Configuracion Recovery</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Intervalo de escaneo (minutos)"
							type="number"
							value={Math.round(rcSettings.intervalMs / 60000)}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, intervalMs: Math.max(1, parseInt(e.target.value) || 1) * 60000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Cada cuantos minutos se ejecuta el escaneo de recovery"
						/>
						<TextField
							label="Batch size"
							type="number"
							value={rcSettings.batchSize}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, batchSize: Math.max(1, parseInt(e.target.value) || 1) }))}
							inputProps={{ min: 1, max: 200 }}
							size="small"
							fullWidth
							helperText="Cantidad maxima de documentos a recuperar por ciclo"
						/>
						<TextField
							label="Max carga de colas"
							type="number"
							value={rcSettings.maxQueueLoad}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, maxQueueLoad: Math.max(1, parseInt(e.target.value) || 1) }))}
							inputProps={{ min: 1, max: 500 }}
							size="small"
							fullWidth
							helperText="Si las colas de documentos superan este valor, el ciclo se omite"
						/>
						<TextField
							label="Cooldown de errores (minutos)"
							type="number"
							value={Math.round(rcSettings.docErrorCooldownMs / 60000)}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, docErrorCooldownMs: Math.max(1, parseInt(e.target.value) || 1) * 60000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Tiempo de espera antes de reintentar un documento con error"
						/>
						<TextField
							label="Max reintentos por documento"
							type="number"
							value={rcSettings.docMaxRetries}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, docMaxRetries: Math.max(1, parseInt(e.target.value) || 1) }))}
							inputProps={{ min: 1, max: 20 }}
							size="small"
							fullWidth
							helperText="Cantidad maxima de intentos de recuperacion por documento"
						/>
						<TextField
							label="Umbral stalled (minutos)"
							type="number"
							value={Math.round(rcSettings.stalledThresholdMs / 60000)}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, stalledThresholdMs: Math.max(1, parseInt(e.target.value) || 1) * 60000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Tiempo en estado intermedio para considerar un documento estancado"
						/>
						<TextField
							label="Limpiar failed jobs despues de (horas)"
							type="number"
							value={Math.round(rcSettings.cleanFailedAfterMs / 3600000)}
							onChange={(e) => setRcSettings((prev) => ({ ...prev, cleanFailedAfterMs: Math.max(1, parseInt(e.target.value) || 1) * 3600000 }))}
							inputProps={{ min: 1 }}
							size="small"
							fullWidth
							helperText="Eliminar jobs fallidos de BullMQ despues de este tiempo"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditRecovery(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveRecoverySettings}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Scaling settings edit dialog ────────────────────────────────── */}
			<Dialog open={!!editScalingWorker} onClose={() => setEditScalingWorker(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Escalado — {editScalingWorker && (WORKER_LABELS[editScalingWorker.workerName]?.label || editScalingWorker.workerName)}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="body2">Auto-escalado habilitado</Typography>
							<Switch checked={scSettings.enabled} onChange={(_, checked) => setScSettings((prev) => ({ ...prev, enabled: checked }))} size="small" />
						</Stack>
						<Divider />
						<Stack direction="row" spacing={2}>
							<TextField
								label="Min concurrency"
								type="number"
								value={scSettings.minConcurrency}
								onChange={(e) => setScSettings((prev) => ({ ...prev, minConcurrency: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 50 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
							/>
							<TextField
								label="Max concurrency"
								type="number"
								value={scSettings.maxConcurrency}
								onChange={(e) => setScSettings((prev) => ({ ...prev, maxConcurrency: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 50 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
							/>
						</Stack>
						<Stack direction="row" spacing={2}>
							<TextField
								label="Umbral scale up"
								type="number"
								value={scSettings.scaleUpThreshold}
								onChange={(e) => setScSettings((prev) => ({ ...prev, scaleUpThreshold: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
								helperText="Jobs en cola para escalar"
							/>
							<TextField
								label="Umbral scale down"
								type="number"
								value={scSettings.scaleDownThreshold}
								onChange={(e) => setScSettings((prev) => ({ ...prev, scaleDownThreshold: Math.max(0, parseInt(e.target.value) || 0) }))}
								inputProps={{ min: 0 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
								helperText="Jobs en cola para reducir"
							/>
						</Stack>
						<Stack direction="row" spacing={2}>
							<TextField
								label="Step up"
								type="number"
								value={scSettings.scaleUpStep}
								onChange={(e) => setScSettings((prev) => ({ ...prev, scaleUpStep: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 10 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
							/>
							<TextField
								label="Step down"
								type="number"
								value={scSettings.scaleDownStep}
								onChange={(e) => setScSettings((prev) => ({ ...prev, scaleDownStep: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 10 }}
								size="small"
								fullWidth
								disabled={!scSettings.enabled}
							/>
						</Stack>
						<TextField
							label="Cooldown (segundos)"
							type="number"
							value={Math.round(scSettings.cooldownMs / 1000)}
							onChange={(e) => setScSettings((prev) => ({ ...prev, cooldownMs: Math.max(10, parseInt(e.target.value) || 10) * 1000 }))}
							inputProps={{ min: 10 }}
							size="small"
							fullWidth
							disabled={!scSettings.enabled}
							helperText="Tiempo minimo entre cambios de escala"
						/>

						{editScalingWorker?.scaling?.lastScaledAt && (
							<>
								<Divider />
								<Alert severity="info" variant="outlined" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
									<Stack spacing={0.5}>
										<Typography variant="caption">
											Ultima escala: <strong>{new Date(editScalingWorker.scaling.lastScaledAt).toLocaleString("es-AR")}</strong>
										</Typography>
										{editScalingWorker.scaling.lastScaledConcurrency != null && (
											<Typography variant="caption">
												Concurrency escalada: <strong>{editScalingWorker.scaling.lastScaledConcurrency}</strong>
											</Typography>
										)}
										{editScalingWorker.scaling.lastQueueDepth != null && (
											<Typography variant="caption">
												Queue depth al escalar: <strong>{editScalingWorker.scaling.lastQueueDepth}</strong>
											</Typography>
										)}
									</Stack>
								</Alert>
							</>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditScalingWorker(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveScaling}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
			{/* ── Instance Scaling settings edit dialog ──────────────────────── */}
			<Dialog open={!!editInstScalingWorker} onClose={() => setEditInstScalingWorker(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Instancias — {editInstScalingWorker && (WORKER_LABELS[editInstScalingWorker.workerName]?.label || editInstScalingWorker.workerName)}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="body2">Escalado de instancias habilitado</Typography>
							<Switch checked={isSettings.enabled} onChange={(_, checked) => setIsSettings((prev) => ({ ...prev, enabled: checked }))} size="small" />
						</Stack>
						<Divider />
						<Stack direction="row" spacing={2}>
							<TextField
								label="Min instancias"
								type="number"
								value={isSettings.minInstances}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, minInstances: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 10 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
							/>
							<TextField
								label="Max instancias"
								type="number"
								value={isSettings.maxInstances}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, maxInstances: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 10 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
							/>
						</Stack>
						<Stack direction="row" spacing={2}>
							<TextField
								label="Umbral scale up"
								type="number"
								value={isSettings.scaleUpThreshold}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, scaleUpThreshold: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
								helperText="Jobs en cola para agregar instancias"
							/>
							<TextField
								label="Umbral scale down"
								type="number"
								value={isSettings.scaleDownThreshold}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, scaleDownThreshold: Math.max(0, parseInt(e.target.value) || 0) }))}
								inputProps={{ min: 0 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
								helperText="Jobs en cola para quitar instancias"
							/>
						</Stack>
						<Stack direction="row" spacing={2}>
							<TextField
								label="Step up"
								type="number"
								value={isSettings.scaleUpStep}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, scaleUpStep: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 5 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
							/>
							<TextField
								label="Step down"
								type="number"
								value={isSettings.scaleDownStep}
								onChange={(e) => setIsSettings((prev) => ({ ...prev, scaleDownStep: Math.max(1, parseInt(e.target.value) || 1) }))}
								inputProps={{ min: 1, max: 5 }}
								size="small"
								fullWidth
								disabled={!isSettings.enabled}
							/>
						</Stack>
						<TextField
							label="Cooldown (segundos)"
							type="number"
							value={Math.round(isSettings.cooldownMs / 1000)}
							onChange={(e) => setIsSettings((prev) => ({ ...prev, cooldownMs: Math.max(10, parseInt(e.target.value) || 10) * 1000 }))}
							inputProps={{ min: 10 }}
							size="small"
							fullWidth
							disabled={!isSettings.enabled}
							helperText="Tiempo minimo entre cambios de escala de instancias"
						/>

						{editInstScalingWorker?.instanceScaling?.lastScaledAt && (
							<>
								<Divider />
								<Alert severity="info" variant="outlined" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
									<Stack spacing={0.5}>
										<Typography variant="caption">
											Ultima escala: <strong>{new Date(editInstScalingWorker.instanceScaling.lastScaledAt).toLocaleString("es-AR")}</strong>
										</Typography>
										{editInstScalingWorker.instanceScaling.lastInstanceCount != null && (
											<Typography variant="caption">
												Instancias actuales: <strong>{editInstScalingWorker.instanceScaling.lastInstanceCount}</strong>
											</Typography>
										)}
										{editInstScalingWorker.instanceScaling.lastQueueDepth != null && (
											<Typography variant="caption">
												Queue depth al escalar: <strong>{editInstScalingWorker.instanceScaling.lastQueueDepth}</strong>
											</Typography>
										)}
									</Stack>
								</Alert>
							</>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditInstScalingWorker(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveInstScaling}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
			{/* ── Rate Limiter edit dialog ───────────────────────────────────── */}
			<Dialog open={!!editRateLimiterWorker} onClose={() => setEditRateLimiterWorker(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Rate Limiter — {editRateLimiterWorker && (WORKER_LABELS[editRateLimiterWorker.workerName]?.label || editRateLimiterWorker.workerName)}</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Max (jobs por periodo)"
							type="number"
							value={rlSettings.max}
							onChange={(e) => setRlSettings((prev) => ({ ...prev, max: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) }))}
							inputProps={{ min: 1, max: 100 }}
							size="small"
							fullWidth
							helperText="Cantidad maxima de jobs permitidos por periodo"
						/>
						<TextField
							label="Duration (segundos)"
							type="number"
							value={Math.round(rlSettings.duration / 1000)}
							onChange={(e) => setRlSettings((prev) => ({ ...prev, duration: Math.min(300, Math.max(1, parseInt(e.target.value) || 1)) * 1000 }))}
							inputProps={{ min: 1, max: 300 }}
							size="small"
							fullWidth
							helperText="Periodo del rate limiter en segundos"
						/>
						<Alert severity="info" variant="outlined">
							Cambios en rate limiter requieren reinicio del worker via PM2
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditRateLimiterWorker(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveRateLimiter}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default WorkerControlTab;
