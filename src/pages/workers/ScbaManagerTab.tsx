import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Switch,
	TextField,
	Button,
	Stack,
	Alert,
	Chip,
	Tabs,
	Tab,
	Skeleton,
	Divider,
	FormControlLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	CircularProgress,
	Tooltip,
	useTheme,
	alpha,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from "@mui/material";
import {
	Setting2,
	InfoCircle,
	TickCircle,
	CloseCircle,
	Refresh,
	Warning2,
	Timer1,
	People,
	Chart,
	Notification,
	ArrowUp2,
	ArrowDown2,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import ScbaManagerService, {
	ScbaManagerConfig,
	ScbaManagerSettings,
	ScbaWorkerConfig,
	ScbaWorkerType,
	ScbaAlert,
	ScbaDailyStats,
	SCBA_WORKER_TYPES,
	SCBA_WORKER_LABELS,
	SCBA_WORKER_DESCRIPTIONS,
} from "api/scbaManager";

// Días de la semana (locale es-AR, Domingo=0)
const WEEK_DAYS: { value: number; short: string; label: string }[] = [
	{ value: 1, short: "L", label: "Lun" },
	{ value: 2, short: "M", label: "Mar" },
	{ value: 3, short: "X", label: "Mié" },
	{ value: 4, short: "J", label: "Jue" },
	{ value: 5, short: "V", label: "Vie" },
	{ value: 6, short: "S", label: "Sáb" },
	{ value: 0, short: "D", label: "Dom" },
];

// ========== Sub-tab Panel ==========
function SubTabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
	return (
		<div role="tabpanel" hidden={value !== index}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// ========== Helper: format date ==========
function formatDate(date?: string): string {
	if (!date) return "N/A";
	return new Date(date).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
}

function formatElapsed(date?: string): string {
	if (!date) return "";
	const diffMs = Date.now() - new Date(date).getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays > 0) return `hace ${diffDays}d`;
	if (diffHours > 0) return `hace ${diffHours}h`;
	if (diffMinutes > 0) return `hace ${diffMinutes}m`;
	return "ahora";
}

// ========== Main Component ==========
const ScbaManagerTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [config, setConfig] = useState<ScbaManagerConfig | null>(null);
	const [subTab, setSubTab] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Editable state
	const [editConfig, setEditConfig] = useState<Partial<ScbaManagerSettings>>({});
	const [hasChanges, setHasChanges] = useState(false);

	// Alerts
	const [alerts, setAlerts] = useState<ScbaAlert[]>([]);
	const [stats, setStats] = useState<ScbaDailyStats[]>([]);

	// Reset dialog
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [resetting, setResetting] = useState(false);

	const fetchConfig = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await ScbaManagerService.getConfig();
			if (response.success && response.data) {
				setConfig(response.data);
				setEditConfig({});
				setHasChanges(false);
			}
		} catch (err: any) {
			setError(err.message);
			enqueueSnackbar(err.message || "Error al cargar configuración SCBA", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	const fetchAlerts = useCallback(async () => {
		try {
			const response = await ScbaManagerService.getAlerts();
			if (response.success) setAlerts(response.data);
		} catch (_err) {
			/* silent */
		}
	}, []);

	const fetchStats = useCallback(async () => {
		try {
			const response = await ScbaManagerService.getStats(7);
			if (response.success) setStats(response.data);
		} catch (_err) {
			/* silent */
		}
	}, []);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	useEffect(() => {
		if (subTab === 2) fetchAlerts();
		if (subTab === 3) fetchStats();
	}, [subTab, fetchAlerts, fetchStats]);

	// ========== Handlers ==========
	const updateField = (field: string, value: any) => {
		setEditConfig((prev) => ({ ...prev, [field]: value }));
		setHasChanges(true);
	};

	const updateWorkerField = (workerType: ScbaWorkerType, field: string, value: any) => {
		setEditConfig((prev) => ({
			...prev,
			workers: {
				...((prev.workers || {}) as any),
				[workerType]: {
					...((prev.workers as any)?.[workerType] || {}),
					[field]: value,
				},
			},
		}));
		setHasChanges(true);
	};

	const updateWorkerSchedule = (workerType: ScbaWorkerType, field: keyof NonNullable<ScbaWorkerConfig["schedule"]>, value: any) => {
		setEditConfig((prev) => {
			const prevWorkers = (prev.workers || {}) as any;
			const prevWorker = prevWorkers[workerType] || {};
			const prevSchedule =
				prevWorker.schedule !== undefined
					? prevWorker.schedule
					: config?.config?.workers?.[workerType]?.schedule || {};
			return {
				...prev,
				workers: {
					...prevWorkers,
					[workerType]: {
						...prevWorker,
						schedule: { ...prevSchedule, [field]: value },
					},
				},
			};
		});
		setHasChanges(true);
	};

	const getVal = <T,>(field: keyof ScbaManagerSettings, fallback: T): T => {
		if ((editConfig as any)[field] !== undefined) return (editConfig as any)[field];
		if (config?.config) return (config.config as any)[field] ?? fallback;
		return fallback;
	};

	const getWorkerVal = <T,>(workerType: ScbaWorkerType, field: keyof ScbaWorkerConfig, fallback: T): T => {
		const editWorker = (editConfig.workers as any)?.[workerType];
		if (editWorker?.[field] !== undefined) return editWorker[field];
		if (config?.config?.workers?.[workerType]) return (config.config.workers[workerType] as any)[field] ?? fallback;
		return fallback;
	};

	const getWorkerSchedule = (workerType: ScbaWorkerType, field: keyof ScbaWorkerConfig["schedule"], fallback: any): any => {
		const editSchedule = (editConfig.workers as any)?.[workerType]?.schedule;
		if (editSchedule && editSchedule[field] !== undefined) return editSchedule[field];
		const configSchedule = config?.config?.workers?.[workerType]?.schedule;
		if (configSchedule && (configSchedule as any)[field] !== undefined) return (configSchedule as any)[field];
		return fallback;
	};

	const handleSave = async () => {
		if (!hasChanges) return;
		try {
			setSaving(true);
			await ScbaManagerService.updateSettings(editConfig);
			enqueueSnackbar("Configuración SCBA actualizada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchConfig();
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		try {
			setResetting(true);
			await ScbaManagerService.resetToDefaults();
			enqueueSnackbar("Configuración reseteada a valores por defecto", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setResetDialogOpen(false);
			await fetchConfig();
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al resetear", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setResetting(false);
		}
	};

	const handleAcknowledgeAlert = async (index: number) => {
		try {
			await ScbaManagerService.acknowledgeAlert(index);
			enqueueSnackbar("Alerta reconocida", { variant: "success", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			await fetchAlerts();
		} catch (err: any) {
			enqueueSnackbar(err.message, { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		}
	};

	// ========== Loading State ==========
	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={60} />
				<Skeleton variant="rectangular" height={200} />
				<Skeleton variant="rectangular" height={200} />
			</Stack>
		);
	}

	if (error && !config) {
		return (
			<Alert severity="error" action={<Button onClick={fetchConfig}>Reintentar</Button>}>
				{error}
			</Alert>
		);
	}

	const state = config?.currentState;

	// ========== Render ==========
	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración SCBA Manager</Typography>
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
						Actualizar
					</Button>
					{hasChanges && (
						<Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
							{saving ? <CircularProgress size={18} /> : "Guardar Cambios"}
						</Button>
					)}
				</Stack>
			</Box>

			{/* Status cards */}
			<Grid container spacing={2}>
				{/* Service Available */}
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								{getVal("serviceAvailable", false) ? (
									<TickCircle size={20} color={theme.palette.success.main} variant="Bold" />
								) : (
									<CloseCircle size={20} color={theme.palette.error.main} variant="Bold" />
								)}
								<Typography variant="subtitle2">Servicio</Typography>
							</Stack>
							<Chip
								size="small"
								label={getVal("serviceAvailable", false) ? "Disponible" : "No disponible"}
								color={getVal("serviceAvailable", false) ? "success" : "error"}
								sx={{ mt: 0.5 }}
							/>
						</CardContent>
					</Card>
				</Grid>
				{/* Manager running */}
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								{state?.isRunning ? (
									<TickCircle size={20} color={theme.palette.success.main} variant="Bold" />
								) : (
									<Warning2 size={20} color={theme.palette.warning.main} variant="Bold" />
								)}
								<Typography variant="subtitle2">Manager</Typography>
							</Stack>
							<Chip
								size="small"
								label={state?.isRunning ? "Corriendo" : "Detenido"}
								color={state?.isRunning ? "success" : "warning"}
								sx={{ mt: 0.5 }}
							/>
						</CardContent>
					</Card>
				</Grid>
				{/* Cycle count */}
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								<Timer1 size={20} color={theme.palette.info.main} />
								<Typography variant="subtitle2">Ciclos</Typography>
							</Stack>
							<Typography variant="h6" sx={{ mt: 0.5 }}>
								{state?.cycleCount ?? 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				{/* Last cycle */}
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								<Refresh size={20} color={theme.palette.info.main} />
								<Typography variant="subtitle2">Último ciclo</Typography>
							</Stack>
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{state?.lastCycleAt ? formatElapsed(state.lastCycleAt) : "Nunca"}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Sub-tabs */}
			<Paper sx={{ borderRadius: 2 }}>
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={subTab} onChange={(_e, v) => setSubTab(v)} variant="scrollable" scrollButtons="auto">
						<Tab icon={<Setting2 size={18} />} iconPosition="start" label="Configuración" sx={{ textTransform: "none" }} />
						<Tab icon={<People size={18} />} iconPosition="start" label="Workers" sx={{ textTransform: "none" }} />
						<Tab
							icon={<Notification size={18} />}
							iconPosition="start"
							label={
								<Stack direction="row" spacing={0.5} alignItems="center">
									<span>Alertas</span>
									{alerts.length > 0 && <Chip size="small" label={alerts.length} color="error" sx={{ height: 20, fontSize: "0.7rem" }} />}
								</Stack>
							}
							sx={{ textTransform: "none" }}
						/>
						<Tab icon={<Chart size={18} />} iconPosition="start" label="Estadísticas" sx={{ textTransform: "none" }} />
						<Tab icon={<InfoCircle size={18} />} iconPosition="start" label="Info" sx={{ textTransform: "none" }} />
					</Tabs>
				</Box>

				{/* ========== TAB 0: Configuración General ========== */}
				<SubTabPanel value={subTab} index={0}>
					<Stack spacing={3}>
						{/* Servicio */}
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Disponibilidad del Servicio
								</Typography>
								<Grid container spacing={2} alignItems="center">
									<Grid item xs={12} sm={4}>
										<FormControlLabel
											control={
												<Switch
													checked={getVal("serviceAvailable", false)}
													onChange={(e) => updateField("serviceAvailable", e.target.checked)}
													color="success"
												/>
											}
											label={getVal("serviceAvailable", false) ? "Servicio habilitado" : "Servicio deshabilitado"}
										/>
									</Grid>
									<Grid item xs={12} sm={8}>
										<TextField
											fullWidth
											size="small"
											label="Mensaje de mantenimiento"
											value={getVal("maintenanceMessage", "El servicio de sincronización SCBA se encuentra en configuración inicial.")}
											onChange={(e) => updateField("maintenanceMessage", e.target.value)}
											multiline
											rows={2}
										/>
									</Grid>
								</Grid>
							</CardContent>
						</Card>

						{/* Manager Settings */}
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Configuración del Manager
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Check Interval (ms)"
											value={getVal("checkInterval", 60000)}
											onChange={(e) => updateField("checkInterval", parseInt(e.target.value) || 60000)}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Lock Timeout (min)"
											value={getVal("lockTimeoutMinutes", 10)}
											onChange={(e) => updateField("lockTimeoutMinutes", parseInt(e.target.value) || 10)}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="CPU Threshold"
											value={getVal("cpuThreshold", 0.75)}
											onChange={(e) => updateField("cpuThreshold", parseFloat(e.target.value) || 0.75)}
											inputProps={{ step: 0.05, min: 0, max: 1 }}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Memory Threshold"
											value={getVal("memoryThreshold", 0.8)}
											onChange={(e) => updateField("memoryThreshold", parseFloat(e.target.value) || 0.8)}
											inputProps={{ step: 0.05, min: 0, max: 1 }}
										/>
									</Grid>
								</Grid>
							</CardContent>
						</Card>

						{/* Horario global */}
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Horario Global
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Hora inicio"
											value={getVal("workStartHour", 0)}
											onChange={(e) => updateField("workStartHour", parseInt(e.target.value))}
											inputProps={{ min: 0, max: 23 }}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											type="number"
											label="Hora fin"
											value={getVal("workEndHour", 23)}
											onChange={(e) => updateField("workEndHour", parseInt(e.target.value))}
											inputProps={{ min: 0, max: 24 }}
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField
											fullWidth
											size="small"
											label="Timezone"
											value={getVal("timezone", "America/Argentina/Buenos_Aires")}
											onChange={(e) => updateField("timezone", e.target.value)}
										/>
									</Grid>
								</Grid>
							</CardContent>
						</Card>

						{/* Actions */}
						<Stack direction="row" spacing={2} justifyContent="flex-end">
							<Button variant="outlined" color="error" size="small" onClick={() => setResetDialogOpen(true)}>
								Resetear a Defaults
							</Button>
							{hasChanges && (
								<Button variant="contained" onClick={handleSave} disabled={saving}>
									{saving ? <CircularProgress size={20} /> : "Guardar Cambios"}
								</Button>
							)}
						</Stack>
					</Stack>
				</SubTabPanel>

				{/* ========== TAB 1: Workers ========== */}
				<SubTabPanel value={subTab} index={1}>
					<Stack spacing={3}>
						<Alert severity="info" icon={<InfoCircle size={18} />} sx={{ py: 0.5 }}>
							<Typography variant="caption">
								El manager escala instancias <strong>+1 por ciclo</strong> mientras <code>pending &gt; Scale Up Threshold</code> (hasta Max Workers) y las apaga
								<strong> -1 por ciclo</strong> cuando <code>pending ≤ Scale Down Threshold</code> (hasta Min Workers). Si Min = 0 los workers quedan apagados
								cuando no hay trabajo y se levantan bajo demanda. Los in-progress activos cuentan como carga para no cortar procesamientos.
							</Typography>
						</Alert>

						{SCBA_WORKER_TYPES.map((workerType) => {
							const label = SCBA_WORKER_LABELS[workerType];
							const description = SCBA_WORKER_DESCRIPTIONS[workerType];
							const wState = state?.workers?.[workerType];
							const useGlobalSchedule = getWorkerSchedule(workerType, "useGlobalSchedule", true);
							return (
								<Card key={workerType} variant="outlined">
									<CardContent>
										<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
											<Stack spacing={0.5}>
												<Stack direction="row" spacing={1.5} alignItems="center">
													<Typography variant="subtitle1" fontWeight={600}>
														{label}
													</Typography>
													<Chip
														size="small"
														label={getWorkerVal(workerType, "enabled", true) ? "Habilitado" : "Deshabilitado"}
														color={getWorkerVal(workerType, "enabled", true) ? "success" : "default"}
													/>
													<Chip size="small" label={workerType} variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
												</Stack>
												<Typography variant="caption" color="text.secondary" sx={{ maxWidth: 680 }}>
													{description}
												</Typography>
											</Stack>
											<FormControlLabel
												control={
													<Switch
														checked={getWorkerVal(workerType, "enabled", true)}
														onChange={(e) => updateWorkerField(workerType, "enabled", e.target.checked)}
														size="small"
													/>
												}
												label=""
											/>
										</Stack>

										{/* Status */}
										{wState && (
											<Grid container spacing={1} sx={{ mb: 2 }}>
												<Grid item xs={4}>
													<Box sx={{ textAlign: "center", p: 1, bgcolor: alpha(theme.palette.info.main, 0.08), borderRadius: 1 }}>
														<Typography variant="caption" color="text.secondary">
															Instancias activas
														</Typography>
														<Typography variant="h6">{wState.activeInstances}</Typography>
													</Box>
												</Grid>
												<Grid item xs={4}>
													<Box sx={{ textAlign: "center", p: 1, bgcolor: alpha(theme.palette.warning.main, 0.08), borderRadius: 1 }}>
														<Typography variant="caption" color="text.secondary">
															Pendientes
														</Typography>
														<Typography variant="h6">{wState.pendingDocuments}</Typography>
													</Box>
												</Grid>
												<Grid item xs={4}>
													<Box sx={{ textAlign: "center", p: 1, bgcolor: alpha(theme.palette.success.main, 0.08), borderRadius: 1 }}>
														<Typography variant="caption" color="text.secondary">
															Procesados (ciclo)
														</Typography>
														<Typography variant="h6">{wState.processedThisCycle}</Typography>
													</Box>
												</Grid>
											</Grid>
										)}

										<Divider sx={{ my: 1.5 }}>
											<Chip label="Escalado" size="small" variant="outlined" />
										</Divider>

										{/* Escalado */}
										<Grid container spacing={2} sx={{ mb: 1 }}>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Min Workers"
													value={getWorkerVal(workerType, "minWorkers", 0)}
													onChange={(e) => updateWorkerField(workerType, "minWorkers", parseInt(e.target.value) || 0)}
													inputProps={{ min: 0, max: 20 }}
													helperText="Instancias mínimas"
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Max Workers"
													value={getWorkerVal(workerType, "maxWorkers", 15)}
													onChange={(e) => updateWorkerField(workerType, "maxWorkers", parseInt(e.target.value) || 0)}
													inputProps={{ min: 0, max: 50 }}
													helperText="Tope de paralelismo"
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Scale Up Threshold"
													value={getWorkerVal(workerType, "scaleUpThreshold", 0)}
													onChange={(e) => updateWorkerField(workerType, "scaleUpThreshold", parseInt(e.target.value) || 0)}
													helperText="Sube +1 si pending >"
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Scale Down Threshold"
													value={getWorkerVal(workerType, "scaleDownThreshold", 0)}
													onChange={(e) => updateWorkerField(workerType, "scaleDownThreshold", parseInt(e.target.value) || 0)}
													helperText="Baja -1 si pending ≤"
												/>
											</Grid>
										</Grid>

										<Divider sx={{ my: 1.5 }}>
											<Chip label="Ejecución" size="small" variant="outlined" />
										</Divider>

										<Grid container spacing={2} sx={{ mb: 1 }}>
											<Grid item xs={12} sm={4}>
												<TextField
													fullWidth
													size="small"
													label="Cron Expression"
													value={getWorkerVal(workerType, "cronExpression", "*/5 * * * *")}
													onChange={(e) => updateWorkerField(workerType, "cronExpression", e.target.value)}
													helperText="Frecuencia del tick del worker"
												/>
											</Grid>
											<Grid item xs={6} sm={2}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Batch Size"
													value={getWorkerVal(workerType, "batchSize", 10)}
													onChange={(e) => updateWorkerField(workerType, "batchSize", parseInt(e.target.value) || 1)}
													inputProps={{ min: 1, max: 200 }}
													helperText="Docs por ciclo"
												/>
											</Grid>
											<Grid item xs={6} sm={2}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Delay (ms)"
													value={getWorkerVal(workerType, "delayBetweenRequests", 2000)}
													onChange={(e) => updateWorkerField(workerType, "delayBetweenRequests", parseInt(e.target.value) || 500)}
													inputProps={{ min: 0 }}
													helperText="Entre requests"
												/>
											</Grid>
											{workerType === "update" && (
												<Grid item xs={6} sm={2}>
													<TextField
														fullWidth
														size="small"
														type="number"
														label="Update Threshold (h)"
														value={getWorkerVal(workerType, "updateThresholdHours", 2)}
														onChange={(e) => updateWorkerField(workerType, "updateThresholdHours", parseInt(e.target.value) || 0)}
														inputProps={{ min: 0, max: 720 }}
														helperText="No re-procesa antes de X h"
													/>
												</Grid>
											)}
											<Grid item xs={6} sm={2}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Max Retries"
													value={getWorkerVal(workerType, "maxRetries", 3)}
													onChange={(e) => updateWorkerField(workerType, "maxRetries", parseInt(e.target.value) || 0)}
													inputProps={{ min: 0, max: 10 }}
													helperText="Por doc"
												/>
											</Grid>
										</Grid>

										<Divider sx={{ my: 1.5 }}>
											<Chip label="Horario" size="small" variant="outlined" />
										</Divider>

										{/* Horario */}
										<Stack spacing={1.5}>
											<FormControlLabel
												control={
													<Switch
														size="small"
														checked={useGlobalSchedule}
														onChange={(e) => updateWorkerSchedule(workerType, "useGlobalSchedule", e.target.checked)}
													/>
												}
												label={
													<Typography variant="body2">
														Usar horario global del sistema
														<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
															({getVal("workStartHour", 0)}:00 – {getVal("workEndHour", 23)}:00, días:{" "}
															{(getVal("workDays", [0, 1, 2, 3, 4, 5, 6]) as number[])
																.map((d) => WEEK_DAYS.find((w) => w.value === d)?.short)
																.filter(Boolean)
																.join("")}
															)
														</Typography>
													</Typography>
												}
											/>

											{!useGlobalSchedule && (
												<Box>
													<Grid container spacing={2} sx={{ mb: 1 }}>
														<Grid item xs={6} sm={3}>
															<TextField
																fullWidth
																size="small"
																type="number"
																label="Hora inicio"
																value={getWorkerSchedule(workerType, "workStartHour", 0)}
																onChange={(e) =>
																	updateWorkerSchedule(workerType, "workStartHour", Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))
																}
																inputProps={{ min: 0, max: 23 }}
															/>
														</Grid>
														<Grid item xs={6} sm={3}>
															<TextField
																fullWidth
																size="small"
																type="number"
																label="Hora fin"
																value={getWorkerSchedule(workerType, "workEndHour", 23)}
																onChange={(e) =>
																	updateWorkerSchedule(workerType, "workEndHour", Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))
																}
																inputProps={{ min: 0, max: 23 }}
															/>
														</Grid>
													</Grid>
													<Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
														Días activos
													</Typography>
													<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
														{WEEK_DAYS.map((d) => {
															const activeDays = getWorkerSchedule(workerType, "workDays", [0, 1, 2, 3, 4, 5, 6]) as number[];
															const isActive = activeDays.includes(d.value);
															return (
																<Chip
																	key={d.value}
																	label={d.short}
																	size="small"
																	clickable
																	color={isActive ? "primary" : "default"}
																	variant={isActive ? "filled" : "outlined"}
																	onClick={() => {
																		const current = new Set(activeDays);
																		if (isActive) current.delete(d.value);
																		else current.add(d.value);
																		updateWorkerSchedule(
																			workerType,
																			"workDays",
																			Array.from(current).sort((a, b) => a - b),
																		);
																	}}
																/>
															);
														})}
													</Stack>
												</Box>
											)}
										</Stack>

										<Divider sx={{ my: 1.5 }}>
											<Chip label="Runtime" size="small" variant="outlined" />
										</Divider>

										<Grid container spacing={2}>
											<Grid item xs={12} sm={6}>
												<TextField
													fullWidth
													size="small"
													label="Nombre PM2"
													value={getWorkerVal(workerType, "workerName", "")}
													onChange={(e) => updateWorkerField(workerType, "workerName", e.target.value)}
													InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.85rem" } }}
													helperText="Identificador del proceso en PM2"
												/>
											</Grid>
											<Grid item xs={8} sm={4}>
												<TextField
													fullWidth
													size="small"
													label="Script"
													value={getWorkerVal(workerType, "workerScript", "")}
													onChange={(e) => updateWorkerField(workerType, "workerScript", e.target.value)}
													InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.8rem" } }}
												/>
											</Grid>
											<Grid item xs={4} sm={2}>
												<TextField
													fullWidth
													size="small"
													label="Max Mem"
													value={getWorkerVal(workerType, "maxMemoryRestart", "500M")}
													onChange={(e) => updateWorkerField(workerType, "maxMemoryRestart", e.target.value)}
													helperText="Restart si supera"
												/>
											</Grid>
										</Grid>
									</CardContent>
								</Card>
							);
						})}
						{hasChanges && (
							<Box display="flex" justifyContent="flex-end">
								<Button variant="contained" onClick={handleSave} disabled={saving}>
									{saving ? <CircularProgress size={20} /> : "Guardar Cambios"}
								</Button>
							</Box>
						)}
					</Stack>
				</SubTabPanel>

				{/* ========== TAB 2: Alertas ========== */}
				<SubTabPanel value={subTab} index={2}>
					<Stack spacing={2}>
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Typography variant="subtitle1" fontWeight={600}>
								Alertas Activas
							</Typography>
							<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchAlerts}>
								Actualizar
							</Button>
						</Box>
						{alerts.length === 0 ? (
							<Alert severity="success">No hay alertas activas</Alert>
						) : (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Tipo</TableCell>
											<TableCell>Worker</TableCell>
											<TableCell>Mensaje</TableCell>
											<TableCell>Fecha</TableCell>
											<TableCell align="center">Acción</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{alerts.map((alert, idx) => (
											<TableRow key={idx}>
												<TableCell>
													<Chip
														size="small"
														label={alert.type}
														color={alert.type.includes("high") || alert.type.includes("error") ? "error" : "warning"}
													/>
												</TableCell>
												<TableCell>{alert.workerType || "-"}</TableCell>
												<TableCell>{alert.message}</TableCell>
												<TableCell>{formatDate(alert.timestamp)}</TableCell>
												<TableCell align="center">
													<Button size="small" variant="outlined" onClick={() => handleAcknowledgeAlert(idx)}>
														Reconocer
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Stack>
				</SubTabPanel>

				{/* ========== TAB 3: Estadísticas ========== */}
				<SubTabPanel value={subTab} index={3}>
					<Stack spacing={2}>
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Typography variant="subtitle1" fontWeight={600}>
								Estadísticas Diarias (últimos 7 días)
							</Typography>
							<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchStats}>
								Actualizar
							</Button>
						</Box>
						{stats.length === 0 ? (
							<Alert severity="info">No hay estadísticas disponibles aún. Se generarán cuando el manager empiece a ejecutar ciclos.</Alert>
						) : (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fecha</TableCell>
											{SCBA_WORKER_TYPES.map((t) => {
												const hasMovs = t === "initialScraping" || t === "update";
												const isAudit = t === "listAudit";
												const cols = isAudit ? 4 : hasMovs ? 4 : 3;
												return (
													<TableCell key={t} align="center" colSpan={cols} sx={{ borderLeft: 1, borderColor: "divider" }}>
														{SCBA_WORKER_LABELS[t]}
													</TableCell>
												);
											})}
											<TableCell align="center" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Ciclos
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell />
											{SCBA_WORKER_TYPES.map((t) => {
												const hasMovs = t === "initialScraping" || t === "update";
												const isAudit = t === "listAudit";
												return (
													<React.Fragment key={t}>
														<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
															Proc
														</TableCell>
														<TableCell align="right">OK</TableCell>
														<TableCell align="right">Err</TableCell>
														{hasMovs && <TableCell align="right">Movs</TableCell>}
														{isAudit && <TableCell align="right">Bajas</TableCell>}
													</React.Fragment>
												);
											})}
											<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Total
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{stats.map((day) => (
											<TableRow key={day.date}>
												<TableCell>{day.date}</TableCell>
												{SCBA_WORKER_TYPES.map((t) => {
													const w: any = day.byWorker?.[t] || { processed: 0, success: 0, errors: 0 };
													const hasMovs = t === "initialScraping" || t === "update";
													const isAudit = t === "listAudit";
													return (
														<React.Fragment key={t}>
															<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
																{w.processed ?? 0}
															</TableCell>
															<TableCell align="right">{w.success ?? 0}</TableCell>
															<TableCell align="right" sx={{ color: (w.errors ?? 0) > 0 ? "error.main" : "inherit" }}>
																{w.errors ?? 0}
															</TableCell>
															{hasMovs && <TableCell align="right">{w.movimientosFound ?? 0}</TableCell>}
															{isAudit && <TableCell align="right">{w.causasRemoved ?? 0}</TableCell>}
														</React.Fragment>
													);
												})}
												<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
													{day.cyclesRun}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Stack>
				</SubTabPanel>

				{/* ========== TAB 4: Info ========== */}
				<SubTabPanel value={subTab} index={4}>
					<Stack spacing={2}>
						<Alert severity="info" icon={<InfoCircle size={20} />}>
							<Typography variant="subtitle2" gutterBottom>
								Arquitectura SCBA Workers
							</Typography>
							<Typography variant="body2">
								El sistema SCBA sincroniza expedientes desde el portal de notificaciones de la Suprema Corte de Buenos Aires
								(<code>notificaciones.scba.gov.ar</code>). El trabajo se divide en 4 workers con responsabilidades estancas, orquestados por un
								<strong> manager </strong>que escala instancias +1/ciclo según la cola pendiente (patrón alineado a <code>pjn-mis-causas</code>).
							</Typography>
						</Alert>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Pipeline de los 4 workers
								</Typography>
								<Stack spacing={1.5}>
									{SCBA_WORKER_TYPES.map((t, idx) => (
										<React.Fragment key={t}>
											{idx > 0 && <Divider />}
											<Box>
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
													<Typography variant="subtitle2" color="primary.main">
														{idx + 1}. {SCBA_WORKER_LABELS[t]}
													</Typography>
													<Chip size="small" label={t} variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
												</Stack>
												<Typography variant="body2" color="text.secondary">
													{SCBA_WORKER_DESCRIPTIONS[t]}
												</Typography>
											</Box>
										</React.Fragment>
									))}
								</Stack>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Ciclo de vida de una causa
								</Typography>
								<Typography variant="body2" component="div">
									<ol style={{ margin: 0, paddingLeft: 20 }}>
										<li>
											Usuario crea credencial SCBA → <code>scba-credentials.syncStatus = pending</code>.
										</li>
										<li>
											<strong>Verificación</strong> toma la cred con atomic-take, hace login AES-256-CBC, scrapea “Mis Causas”, upserta
											docs en <code>causas-scba</code> con <code>scrapingProgress.status = pending</code> y crea folders respetando los
											límites del plan del usuario (activo / archivado / pending según slots y storage disponibles).
										</li>
										<li>
											<strong>Extracción Inicial</strong> toma las causas pendientes, navega a <code>vertramites.aspx</code>, extrae la
											tabla de trámites y deja el doc en <code>status = completed</code>.
										</li>
										<li>
											<strong>Actualización</strong> re-procesa causas completed cuando pasaron más de <code>updateThresholdHours</code>
											desde su último save; merge inteligente por (fecha + detalle + verUrl) sin duplicar movimientos.
										</li>
										<li>
											<strong>Auditoría Diaria</strong> compara la lista actual en SCBA contra las causas guardadas: altas se crean como
											pending (reentran al pipeline), bajas se marcan <code>listStatus = removed</code> y se notifica al usuario.
										</li>
									</ol>
								</Typography>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Manejo de credenciales inválidas
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Si cualquier worker detecta login fallido, marca la credencial
									<code> enabled=false, isExpired=true, syncStatus=error, errorNotifiedAt=now</code>, propaga
									<code> update=false </code>a las causas y folders del usuario (sin seguimiento en la UI), y envía un email de
									“credenciales inválidas” una sola vez (controlado por <code>errorNotifiedAt</code>). Cuando el usuario corrige la
									contraseña, el controller marca <code>errorRecoveryPending=true</code>; en el próximo sync exitoso, si no hay folders
									nuevos que dispararían el email regular, se envía un email de “credenciales restablecidas”.
								</Typography>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Tipos de entrada en updateHistory
								</Typography>
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>updateType</TableCell>
												<TableCell>source</TableCell>
												<TableCell>Descripción</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{[
												["sync-create", "scba-verification", "Causa nueva detectada en la lista"],
												["sync-refresh", "scba-verification", "Causa ya existente, refresca fecha de scraping"],
												["initial-scraping", "scba-initial-scraping", "Extracción inicial de trámites completada"],
												["initial-scraping-error", "scba-initial-scraping", "Error al extraer trámites por primera vez"],
												["update-tramites", "scba-update", "Trámites actualizados (merge inteligente, sin duplicados)"],
												["update-error", "scba-update", "Error durante actualización periódica"],
												["list-audit-removed", "scba-list-audit", "Causa ya no aparece en Mis Causas del portal"],
												["list-audit-reactivated", "scba-list-audit", "Causa previamente removida volvió a aparecer"],
											].map(([type, source, desc]) => (
												<TableRow key={type}>
													<TableCell>
														<Chip size="small" label={type} variant="outlined" />
													</TableCell>
													<TableCell>
														<Typography variant="caption" fontFamily="monospace">
															{source}
														</Typography>
													</TableCell>
													<TableCell>{desc}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Emails transaccionales
								</Typography>
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>templateName</TableCell>
												<TableCell>Cuándo se envía</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{[
												["scbaSyncComplete", "Primera sync exitosa — resumen de carpetas creadas (activas / archivadas / pending)"],
												["scbaCausasAdded", "Audit detectó altas en la lista de Mis Causas"],
												["scbaListUpdate", "Audit detectó altas y/o bajas (consolidado en un solo correo)"],
												["scbaCredentialError / scbaCredentialDisabled", "Login fallido (una sola vez por errorNotifiedAt)"],
												["scbaCredentialRestored", "Credencial corregida y sync exitoso sin folders nuevos"],
											].map(([name, desc]) => (
												<TableRow key={name}>
													<TableCell>
														<Typography variant="caption" fontFamily="monospace">
															{name}
														</Typography>
													</TableCell>
													<TableCell>{desc}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</CardContent>
						</Card>

						{/* Config document info */}
						{config && (
							<Card variant="outlined">
								<CardContent>
									<Typography variant="subtitle1" fontWeight={600} gutterBottom>
										Documento de Configuración
									</Typography>
									<Grid container spacing={1}>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">
												ID
											</Typography>
											<Typography variant="body2" fontFamily="monospace">
												{config._id}
											</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">
												Nombre
											</Typography>
											<Typography variant="body2">{config.name}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">
												Creado
											</Typography>
											<Typography variant="body2">{formatDate(config.createdAt)}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">
												Actualizado
											</Typography>
											<Typography variant="body2">{formatDate(config.updatedAt)}</Typography>
										</Grid>
									</Grid>
								</CardContent>
							</Card>
						)}
					</Stack>
				</SubTabPanel>
			</Paper>

			{/* Reset dialog */}
			<Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>Resetear Configuración</DialogTitle>
				<DialogContent>
					<Typography>
						¿Estás seguro de que quieres resetear toda la configuración SCBA a los valores por defecto? Esta acción no se puede deshacer.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" color="error" onClick={handleReset} disabled={resetting}>
						{resetting ? <CircularProgress size={20} /> : "Resetear"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default ScbaManagerTab;
