import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Grid,
	Card,
	CardContent,
	Chip,
	TextField,
	Button,
	CircularProgress,
	Alert,
	IconButton,
	Tooltip,
	Divider,
	Slider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	useTheme,
	alpha,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Checkbox,
	ListItemText,
	OutlinedInput,
} from "@mui/material";
import {
	Refresh2,
	Warning2,
	TickCircle,
	ArrowRotateRight,
	Cpu,
	Timer,
	People,
	Setting2,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	ManagerConfigService,
	ManagerConfigSettings,
	ManagerStatusResponse,
	ManagerHistoryResponse,
	ManagerAlertsResponse,
} from "api/managerConfig";

// Nombres de los fueros
const FUERO_LABELS: Record<string, string> = {
	civil: "Civil",
	ss: "Seguridad Social",
	trabajo: "Trabajo",
	comercial: "Comercial",
};

// Nombres de los dias
const DAY_LABELS: Record<number, string> = {
	0: "Domingo",
	1: "Lunes",
	2: "Martes",
	3: "Miercoles",
	4: "Jueves",
	5: "Viernes",
	6: "Sabado",
};

const ManagerConfigPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [settings, setSettings] = useState<ManagerConfigSettings | null>(null);
	const [status, setStatus] = useState<ManagerStatusResponse["data"] | null>(null);
	const [history, setHistory] = useState<ManagerHistoryResponse | null>(null);
	const [alerts, setAlerts] = useState<ManagerAlertsResponse | null>(null);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [hoursBack, setHoursBack] = useState(24);

	// Campos editables
	const [editedSettings, setEditedSettings] = useState<Partial<ManagerConfigSettings>>({});

	// Cargar datos
	const fetchData = useCallback(async () => {
		try {
			setLoading(true);

			const [settingsRes, statusRes, historyRes, alertsRes] = await Promise.all([
				ManagerConfigService.getSettings(),
				ManagerConfigService.getCurrentStatus(),
				ManagerConfigService.getHistory(hoursBack),
				ManagerConfigService.getAlerts(),
			]);

			setSettings(settingsRes.data);
			setStatus(statusRes.data);
			setHistory(historyRes);
			setAlerts(alertsRes);
			setEditedSettings({});
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar configuracion del manager", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [hoursBack, enqueueSnackbar]);

	// Cargar datos al montar
	useEffect(() => {
		if (!settings) {
			fetchData();
		}
	}, [settings, fetchData]);

	// Auto-refresh cada 30 segundos
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const statusRes = await ManagerConfigService.getCurrentStatus();
				setStatus(statusRes.data);
			} catch (error) {
				// Silenciar errores de auto-refresh
			}
		}, 30000);

		return () => clearInterval(interval);
	}, []);

	// Guardar cambios
	const handleSave = async () => {
		if (Object.keys(editedSettings).length === 0) {
			enqueueSnackbar("No hay cambios para guardar", {
				variant: "info",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setSaving(true);
			await ManagerConfigService.updateSettings(editedSettings);
			enqueueSnackbar("Configuracion del manager guardada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	// Resetear
	const handleReset = async () => {
		try {
			setSaving(true);
			await ManagerConfigService.resetToDefaults();
			enqueueSnackbar("Configuracion reseteada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setResetDialogOpen(false);
			await fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	// Reconocer alerta
	const handleAcknowledgeAlert = async (index: number) => {
		try {
			await ManagerConfigService.acknowledgeAlert(index);
			enqueueSnackbar("Alerta reconocida", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			const alertsRes = await ManagerConfigService.getAlerts();
			setAlerts(alertsRes);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Manejar cambios en settings
	const handleSettingChange = (key: keyof ManagerConfigSettings, value: any) => {
		setEditedSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	// Obtener valor actual
	const getValue = <K extends keyof ManagerConfigSettings>(key: K): ManagerConfigSettings[K] | undefined => {
		if (editedSettings[key] !== undefined) {
			return editedSettings[key] as ManagerConfigSettings[K];
		}
		return settings?.[key];
	};

	// Formatear porcentaje
	const formatPercent = (value: number) => {
		return `${(value * 100).toFixed(1)}%`;
	};

	const hasChanges = Object.keys(editedSettings).length > 0;

	return (
		<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
			<CardContent>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Setting2 size={20} color={theme.palette.primary.main} />
						<Typography variant="h6">Configuracion del Manager de Workers</Typography>
						{status && (
							<Chip
								label={status.isRunning ? "Activo" : "Detenido"}
								size="small"
								color={status.isRunning ? "success" : "error"}
							/>
						)}
						{alerts && alerts.count > 0 && (
							<Chip
								label={`${alerts.count} alertas`}
								size="small"
								color="warning"
								icon={<Warning2 size={14} />}
							/>
						)}
					</Stack>
					<Tooltip title="Recargar datos">
						<IconButton size="small" onClick={fetchData} disabled={loading}>
							<Refresh2 size={18} />
						</IconButton>
					</Tooltip>
				</Stack>

				{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
							<CircularProgress />
						</Box>
					) : (
						<Stack spacing={3}>
							{/* Alertas */}
							{alerts && alerts.count > 0 && (
								<Alert severity="warning" icon={<Warning2 size={20} />}>
									<Typography variant="subtitle2" gutterBottom>
										{alerts.count} alerta(s) activa(s)
									</Typography>
									<Stack spacing={1} sx={{ mt: 1 }}>
										{alerts.data.map((alert, index) => (
											<Stack key={index} direction="row" alignItems="center" spacing={1}>
												<Typography variant="body2">{alert.message}</Typography>
												<Button size="small" onClick={() => handleAcknowledgeAlert(index)}>
													OK
												</Button>
											</Stack>
										))}
									</Stack>
								</Alert>
							)}

							{/* Estado actual */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
									Estado Actual del Manager
								</Typography>
								<Grid container spacing={2}>
									<Grid item xs={6} sm={3}>
										<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
											<People size={20} color={theme.palette.primary.main} />
											<Typography variant="h5" fontWeight="bold">
												{status?.totalWorkers || 0}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Workers Activos
											</Typography>
										</Stack>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 1 }}>
											<Timer size={20} color={theme.palette.warning.main} />
											<Typography variant="h5" fontWeight="bold">
												{status?.totalPending || 0}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Pendientes
											</Typography>
										</Stack>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1 }}>
											<Cpu size={20} color={theme.palette.info.main} />
											<Typography variant="h5" fontWeight="bold">
												{status?.systemResources ? formatPercent(status.systemResources.cpuUsage) : "-"}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												CPU
											</Typography>
										</Stack>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Stack alignItems="center" sx={{ p: 1.5, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 1 }}>
											<Cpu size={20} color={theme.palette.secondary.main} />
											<Typography variant="h5" fontWeight="bold">
												{status?.systemResources ? formatPercent(status.systemResources.memoryUsage) : "-"}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Memoria
											</Typography>
										</Stack>
									</Grid>
								</Grid>
							</Box>

							{/* Detalle por fuero */}
							{status?.workers && (
								<Box>
									<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
										Estado por Fuero
									</Typography>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Fuero</TableCell>
													<TableCell align="center">Workers</TableCell>
													<TableCell align="center">Pendientes</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{Object.entries(status.workers).map(([fuero, count]) => (
													<TableRow key={fuero}>
														<TableCell>{FUERO_LABELS[fuero] || fuero}</TableCell>
														<TableCell align="center">
															<Chip label={count} size="small" color={count > 0 ? "primary" : "default"} />
														</TableCell>
														<TableCell align="center">
															<Chip
																label={status.pending?.[fuero] || 0}
																size="small"
																color={(status.pending?.[fuero] || 0) > 100 ? "warning" : "default"}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							<Divider />

							{/* Configuracion */}
							<Box>
								<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
									<Typography variant="subtitle2" fontWeight="bold">
										Configuracion
									</Typography>
									<Stack direction="row" spacing={1}>
										<Button
											size="small"
											variant="outlined"
											color="error"
											onClick={() => setResetDialogOpen(true)}
											disabled={saving}
											startIcon={<ArrowRotateRight size={16} />}
										>
											Resetear
										</Button>
										<Button
											size="small"
											variant="contained"
											onClick={handleSave}
											disabled={!hasChanges || saving}
											startIcon={saving ? <CircularProgress size={16} /> : <TickCircle size={16} />}
										>
											Guardar
										</Button>
									</Stack>
								</Stack>

								<Grid container spacing={2}>
									{/* Limites de Workers */}
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											label="Max Workers"
											type="number"
											value={getValue("maxWorkers") || ""}
											onChange={(e) => handleSettingChange("maxWorkers", parseInt(e.target.value))}
											InputProps={{ inputProps: { min: 0, max: 20 } }}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											label="Min Workers"
											type="number"
											value={getValue("minWorkers") || ""}
											onChange={(e) => handleSettingChange("minWorkers", parseInt(e.target.value))}
											InputProps={{ inputProps: { min: 0 } }}
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											label="Umbral Escalado"
											type="number"
											value={getValue("scaleThreshold") || ""}
											onChange={(e) => handleSettingChange("scaleThreshold", parseInt(e.target.value))}
											helperText="Docs para escalar"
										/>
									</Grid>
									<Grid item xs={6} sm={3}>
										<TextField
											fullWidth
											size="small"
											label="Umbral Reduccion"
											type="number"
											value={getValue("scaleDownThreshold") || ""}
											onChange={(e) => handleSettingChange("scaleDownThreshold", parseInt(e.target.value))}
											helperText="Docs para reducir"
										/>
									</Grid>

									{/* Intervalos */}
									<Grid item xs={6} sm={4}>
										<TextField
											fullWidth
											size="small"
											label="Intervalo (ms)"
											type="number"
											value={getValue("checkInterval") || ""}
											onChange={(e) => handleSettingChange("checkInterval", parseInt(e.target.value))}
											helperText="Min 10000"
											InputProps={{ inputProps: { min: 10000 } }}
										/>
									</Grid>
									<Grid item xs={6} sm={4}>
										<TextField
											fullWidth
											size="small"
											label="Horas para Actualizar"
											type="number"
											value={getValue("updateThresholdHours") || ""}
											onChange={(e) => handleSettingChange("updateThresholdHours", parseInt(e.target.value))}
											helperText="Threshold de actualizacion"
										/>
									</Grid>

									{/* Horario */}
									<Grid item xs={6} sm={2}>
										<TextField
											fullWidth
											size="small"
											label="Hora Inicio"
											type="number"
											value={getValue("workStartHour") || ""}
											onChange={(e) => handleSettingChange("workStartHour", parseInt(e.target.value))}
											InputProps={{ inputProps: { min: 0, max: 23 } }}
										/>
									</Grid>
									<Grid item xs={6} sm={2}>
										<TextField
											fullWidth
											size="small"
											label="Hora Fin"
											type="number"
											value={getValue("workEndHour") || ""}
											onChange={(e) => handleSettingChange("workEndHour", parseInt(e.target.value))}
											InputProps={{ inputProps: { min: 0, max: 24 } }}
										/>
									</Grid>

									{/* Dias de trabajo */}
									<Grid item xs={12} sm={6}>
										<FormControl fullWidth size="small">
											<InputLabel>Dias de Trabajo</InputLabel>
											<Select
												multiple
												value={getValue("workDays") || []}
												onChange={(e) => handleSettingChange("workDays", e.target.value as number[])}
												input={<OutlinedInput label="Dias de Trabajo" />}
												renderValue={(selected) => (selected as number[]).map((d) => DAY_LABELS[d]).join(", ")}
											>
												{[0, 1, 2, 3, 4, 5, 6].map((day) => (
													<MenuItem key={day} value={day}>
														<Checkbox checked={(getValue("workDays") || []).indexOf(day) > -1} />
														<ListItemText primary={DAY_LABELS[day]} />
													</MenuItem>
												))}
											</Select>
										</FormControl>
									</Grid>

									{/* Umbrales de recursos */}
									<Grid item xs={12} sm={3}>
										<Typography variant="caption" color="text.secondary">
											Umbral CPU: {((getValue("cpuThreshold") || 0) * 100).toFixed(0)}%
										</Typography>
										<Slider
											size="small"
											value={(getValue("cpuThreshold") || 0) * 100}
											onChange={(_, value) => handleSettingChange("cpuThreshold", (value as number) / 100)}
											min={50}
											max={95}
											valueLabelDisplay="auto"
											valueLabelFormat={(v) => `${v}%`}
										/>
									</Grid>
									<Grid item xs={12} sm={3}>
										<Typography variant="caption" color="text.secondary">
											Umbral Memoria: {((getValue("memoryThreshold") || 0) * 100).toFixed(0)}%
										</Typography>
										<Slider
											size="small"
											value={(getValue("memoryThreshold") || 0) * 100}
											onChange={(_, value) => handleSettingChange("memoryThreshold", (value as number) / 100)}
											min={50}
											max={95}
											valueLabelDisplay="auto"
											valueLabelFormat={(v) => `${v}%`}
										/>
									</Grid>
								</Grid>
							</Box>

							{/* Historial */}
							{history && (
								<Box>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
										<Typography variant="subtitle2" fontWeight="bold">
											Historial ({history.stats.snapshotCount} snapshots)
										</Typography>
										<FormControl size="small" sx={{ minWidth: 100 }}>
											<Select
												value={hoursBack}
												onChange={(e) => setHoursBack(e.target.value as number)}
											>
												<MenuItem value={6}>6h</MenuItem>
												<MenuItem value={12}>12h</MenuItem>
												<MenuItem value={24}>24h</MenuItem>
												<MenuItem value={48}>48h</MenuItem>
											</Select>
										</FormControl>
									</Stack>
									<Grid container spacing={1}>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">Prom. Workers</Typography>
											<Typography variant="body2" fontWeight="bold">{history.stats.avgWorkers}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">Prom. Pendientes</Typography>
											<Typography variant="body2" fontWeight="bold">{history.stats.avgPending}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">Prom. CPU</Typography>
											<Typography variant="body2" fontWeight="bold">{history.stats.avgCpu}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="text.secondary">Prom. Memoria</Typography>
											<Typography variant="body2" fontWeight="bold">{history.stats.avgMemory}</Typography>
										</Grid>
									</Grid>
								</Box>
							)}
						</Stack>
					)}
			</CardContent>

			{/* Dialog de reset */}
			<Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>Resetear Configuracion</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Esta accion reseteara toda la configuracion a los valores por defecto. No se puede deshacer.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
					<Button onClick={handleReset} color="error" variant="contained" disabled={saving}>
						Resetear
					</Button>
				</DialogActions>
			</Dialog>
		</Card>
	);
};

export default ManagerConfigPanel;
