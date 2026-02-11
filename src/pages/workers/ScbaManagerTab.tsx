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
	ScbaManagerCurrentState,
	ScbaAlert,
	ScbaDailyStats,
} from "api/scbaManager";

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

	const updateWorkerField = (workerType: "verification" | "update", field: string, value: any) => {
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

	const getVal = <T,>(field: keyof ScbaManagerSettings, fallback: T): T => {
		if ((editConfig as any)[field] !== undefined) return (editConfig as any)[field];
		if (config?.config) return (config.config as any)[field] ?? fallback;
		return fallback;
	};

	const getWorkerVal = <T,>(workerType: "verification" | "update", field: keyof ScbaWorkerConfig, fallback: T): T => {
		const editWorker = (editConfig.workers as any)?.[workerType];
		if (editWorker?.[field] !== undefined) return editWorker[field];
		if (config?.config?.workers?.[workerType]) return (config.config.workers[workerType] as any)[field] ?? fallback;
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
									{alerts.length > 0 && (
										<Chip size="small" label={alerts.length} color="error" sx={{ height: 20, fontSize: "0.7rem" }} />
									)}
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
											value={getVal(
												"maintenanceMessage",
												"El servicio de sincronización SCBA se encuentra en configuración inicial.",
											)}
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
						{(["verification", "update"] as const).map((workerType) => {
							const label = workerType === "verification" ? "Verificación" : "Actualización";
							const wState = state?.workers?.[workerType];
							return (
								<Card key={workerType} variant="outlined">
									<CardContent>
										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
											<Stack direction="row" spacing={1.5} alignItems="center">
												<Typography variant="subtitle1" fontWeight={600}>
													Worker de {label}
												</Typography>
												<Chip
													size="small"
													label={getWorkerVal(workerType, "enabled", true) ? "Habilitado" : "Deshabilitado"}
													color={getWorkerVal(workerType, "enabled", true) ? "success" : "default"}
												/>
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
													<Box
														sx={{
															textAlign: "center",
															p: 1,
															bgcolor: alpha(theme.palette.warning.main, 0.08),
															borderRadius: 1,
														}}
													>
														<Typography variant="caption" color="text.secondary">
															Docs pendientes
														</Typography>
														<Typography variant="h6">{wState.pendingDocuments}</Typography>
													</Box>
												</Grid>
												<Grid item xs={4}>
													<Box
														sx={{
															textAlign: "center",
															p: 1,
															bgcolor: alpha(theme.palette.success.main, 0.08),
															borderRadius: 1,
														}}
													>
														<Typography variant="caption" color="text.secondary">
															Procesados (ciclo)
														</Typography>
														<Typography variant="h6">{wState.processedThisCycle}</Typography>
													</Box>
												</Grid>
											</Grid>
										)}

										<Divider sx={{ my: 1.5 }} />

										{/* Config fields */}
										<Grid container spacing={2}>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Min Workers"
													value={getWorkerVal(workerType, "minWorkers", 1)}
													onChange={(e) => updateWorkerField(workerType, "minWorkers", parseInt(e.target.value) || 1)}
													inputProps={{ min: 0, max: 20 }}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Max Workers"
													value={getWorkerVal(workerType, "maxWorkers", 3)}
													onChange={(e) => updateWorkerField(workerType, "maxWorkers", parseInt(e.target.value) || 3)}
													inputProps={{ min: 0, max: 20 }}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Batch Size"
													value={getWorkerVal(workerType, "batchSize", 10)}
													onChange={(e) => updateWorkerField(workerType, "batchSize", parseInt(e.target.value) || 10)}
													inputProps={{ min: 1, max: 100 }}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Delay (ms)"
													value={getWorkerVal(workerType, "delayBetweenRequests", 2000)}
													onChange={(e) =>
														updateWorkerField(workerType, "delayBetweenRequests", parseInt(e.target.value) || 2000)
													}
													inputProps={{ min: 500 }}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Scale Up Threshold"
													value={getWorkerVal(workerType, "scaleUpThreshold", 100)}
													onChange={(e) =>
														updateWorkerField(workerType, "scaleUpThreshold", parseInt(e.target.value) || 100)
													}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Scale Down Threshold"
													value={getWorkerVal(workerType, "scaleDownThreshold", 10)}
													onChange={(e) =>
														updateWorkerField(workerType, "scaleDownThreshold", parseInt(e.target.value) || 10)
													}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													type="number"
													label="Max Retries"
													value={getWorkerVal(workerType, "maxRetries", 3)}
													onChange={(e) => updateWorkerField(workerType, "maxRetries", parseInt(e.target.value) || 3)}
													inputProps={{ min: 0, max: 10 }}
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													fullWidth
													size="small"
													label="Cron Expression"
													value={getWorkerVal(workerType, "cronExpression", "*/2 * * * *")}
													onChange={(e) => updateWorkerField(workerType, "cronExpression", e.target.value)}
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
														color={
															alert.type.includes("high") || alert.type.includes("error") ? "error" : "warning"
														}
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
											<TableCell align="center" colSpan={3} sx={{ borderLeft: 1, borderColor: "divider" }}>
												Verificación
											</TableCell>
											<TableCell align="center" colSpan={4} sx={{ borderLeft: 1, borderColor: "divider" }}>
												Actualización
											</TableCell>
											<TableCell align="center" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Ciclos
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell />
											<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Proc
											</TableCell>
											<TableCell align="right">OK</TableCell>
											<TableCell align="right">Err</TableCell>
											<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Proc
											</TableCell>
											<TableCell align="right">OK</TableCell>
											<TableCell align="right">Err</TableCell>
											<TableCell align="right">Movs</TableCell>
											<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
												Total
											</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{stats.map((day) => (
											<TableRow key={day.date}>
												<TableCell>{day.date}</TableCell>
												<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
													{day.byWorker.verification.processed}
												</TableCell>
												<TableCell align="right">{day.byWorker.verification.success}</TableCell>
												<TableCell
													align="right"
													sx={{ color: day.byWorker.verification.errors > 0 ? "error.main" : "inherit" }}
												>
													{day.byWorker.verification.errors}
												</TableCell>
												<TableCell align="right" sx={{ borderLeft: 1, borderColor: "divider" }}>
													{day.byWorker.update.processed}
												</TableCell>
												<TableCell align="right">{day.byWorker.update.success}</TableCell>
												<TableCell
													align="right"
													sx={{ color: day.byWorker.update.errors > 0 ? "error.main" : "inherit" }}
												>
													{day.byWorker.update.errors}
												</TableCell>
												<TableCell align="right">{day.byWorker.update.movimientosFound}</TableCell>
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
								(notificaciones.scba.gov.ar) con la base de datos de causas MEV.
							</Typography>
						</Alert>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Workers
								</Typography>
								<Stack spacing={1}>
									<Box>
										<Typography variant="subtitle2" color="primary.main">
											Verification Worker
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Se conecta con las credenciales SCBA del usuario, navega a "Mis Causas", extrae todos los expedientes,
											mapea jurisdicción/organismo a MEV, deduplica contra causas existentes, y crea o vincula documentos.
											Extrae también todos los trámites/movimientos de cada causa.
										</Typography>
									</Box>
									<Divider />
									<Box>
										<Typography variant="subtitle2" color="primary.main">
											Update Worker
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Busca causas que ya tienen scbaData y necesitan actualización de trámites. Navega a la página de
											trámites de cada causa y extrae los movimientos nuevos.
										</Typography>
									</Box>
								</Stack>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Flujo de Datos
								</Typography>
								<Typography variant="body2" component="div">
									<ol style={{ margin: 0, paddingLeft: 20 }}>
										<li>
											<strong>Login</strong>: POST a Login.aspx/VerificarPass con credenciales encriptadas (AES-256-CBC)
										</li>
										<li>
											<strong>Búsqueda</strong>: AJAX POST a vercausas.aspx/buscar, retorna HTML con causas paginadas
										</li>
										<li>
											<strong>Parseo</strong>: Cheerio extrae número, carátula, juzgado, IDs de cada causa
										</li>
										<li>
											<strong>Mapeo</strong>: Jurisdicción (departamento → código MEV), Organismo (búsqueda flexible en
											navigation-codes), Juzgados de Paz (búsqueda especial con extracción de jurisdicción real)
										</li>
										<li>
											<strong>Deduplicación</strong>: 3 niveles (exacto → número+jurisdicción → solo número)
										</li>
										<li>
											<strong>Trámites</strong>: Navega a vertramites.aspx, extrae DataTable con paginación (100/página)
										</li>
									</ol>
								</Typography>
							</CardContent>
						</Card>

						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle1" fontWeight={600} gutterBottom>
									Update History Types
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
												["sync-create", "scba-verification", "Causa nueva creada desde SCBA"],
												["sync-dedup-match", "scba-verification", "Match encontrado con causa existente (trazabilidad)"],
												["sync-link", "scba-verification", "Primera vez que se vincula scbaData a causa existente"],
												["sync-refresh", "scba-verification", "Causa ya sincronizada, actualización de fecha"],
												["update-tramites", "scba-update", "Trámites actualizados exitosamente"],
												["update-error", "scba-update", "Error durante actualización de trámites"],
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
						¿Estás seguro de que quieres resetear toda la configuración SCBA a los valores por defecto? Esta acción no se puede
						deshacer.
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
