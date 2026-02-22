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
} from "@mui/material";
import { Refresh, Play, Pause, Setting2, Flash } from "iconsax-react";
import { useSnackbar } from "notistack";
import { Edit2 } from "iconsax-react";
import RagWorkersService, { WorkerConfig, AutoIndexSettings } from "api/ragWorkers";

const WORKER_LABELS: Record<string, { label: string; description: string }> = {
	indexCausa: { label: "Index Causa", description: "Indexa causas completas y crea documentos RAG" },
	indexDocument: { label: "Index Document", description: "Pipeline completo: descarga, extraccion, chunks, embeddings, vectores" },
	generateSummary: { label: "Generate Summary", description: "Genera o actualiza resumenes via LLM" },
	ocrDocument: { label: "OCR Document", description: "Procesamiento OCR para PDFs escaneados" },
	autoIndex: { label: "Auto Index", description: "Escaneo periodico de causas que necesitan indexacion" },
};

const WorkerControlTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [workers, setWorkers] = useState<WorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [editWorker, setEditWorker] = useState<WorkerConfig | null>(null);
	const [editConcurrency, setEditConcurrency] = useState(1);
	const [editAutoIndex, setEditAutoIndex] = useState(false);
	const [aiSettings, setAiSettings] = useState<AutoIndexSettings>({ intervalMs: 300000, batchSize: 50, maxConcurrentJobs: 10, errorRetryAfterMs: 3600000 });

	const fetchWorkers = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getWorkers();
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
				{[...Array(5)].map((_, i) => (
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
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{worker.rateLimiter?.max || "-"}/{((worker.rateLimiter?.duration || 60000) / 1000).toFixed(0)}s
										</Typography>
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
							</Stack>
						);
					})()}
				</Box>
			)}

			{/* Concurrency edit dialog */}
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

			{/* Auto-Index settings edit dialog */}
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
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditAutoIndex(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handleSaveAutoIndexSettings}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default WorkerControlTab;
