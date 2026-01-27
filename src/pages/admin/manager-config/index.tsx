import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Grid,
	Card,
	CardContent,
	CardHeader,
	Chip,
	TextField,
	Button,
	CircularProgress,
	Alert,
	IconButton,
	Tooltip,
	Divider,
	Slider,
	Switch,
	FormControlLabel,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
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
	CloseCircle,
	Setting2,
	Clock,
	Cpu,
	Data,
	Activity,
	ArrowRotateRight,
	InfoCircle,
	Timer,
	People,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	ManagerConfigService,
	ManagerConfigSettings,
	ManagerStatusResponse,
	ManagerHistoryResponse,
	ManagerAlertsResponse,
	ManagerStateSnapshot,
	ManagerAlert,
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

// Componente de tarjeta de estado
interface StatusCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	return (
		<Card
			sx={{
				height: "100%",
				bgcolor: alpha(color, 0.05),
				border: `1px solid ${alpha(color, 0.2)}`,
			}}
		>
			<CardContent>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
					<Box>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							{title}
						</Typography>
						{loading ? (
							<Skeleton width={60} height={36} />
						) : (
							<Typography variant="h4" fontWeight="bold" color={color}>
								{value}
							</Typography>
						)}
						{subtitle && (
							<Typography variant="caption" color="text.secondary">
								{subtitle}
							</Typography>
						)}
					</Box>
					<Box
						sx={{
							p: 1,
							borderRadius: 2,
							bgcolor: alpha(color, 0.1),
							color: color,
						}}
					>
						{icon}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

// Componente principal
const ManagerConfigPage: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [settings, setSettings] = useState<ManagerConfigSettings | null>(null);
	const [status, setStatus] = useState<ManagerStatusResponse["data"] | null>(null);
	const [history, setHistory] = useState<ManagerHistoryResponse | null>(null);
	const [alerts, setAlerts] = useState<ManagerAlertsResponse | null>(null);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const [hoursBack, setHoursBack] = useState(24);

	// Campos editables
	const [editedSettings, setEditedSettings] = useState<Partial<ManagerConfigSettings>>({});

	// Cargar datos iniciales
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
			enqueueSnackbar(error.message || "Error al cargar configuracion", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	}, [hoursBack, enqueueSnackbar]);

	// Refrescar datos
	const handleRefresh = async () => {
		setRefreshing(true);
		await fetchData();
		setRefreshing(false);
		enqueueSnackbar("Datos actualizados", {
			variant: "success",
			anchorOrigin: { vertical: "bottom", horizontal: "right" },
		});
	};

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
			enqueueSnackbar("Configuracion guardada exitosamente", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar configuracion", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	// Resetear a valores por defecto
	const handleReset = async () => {
		try {
			setSaving(true);
			await ManagerConfigService.resetToDefaults();
			enqueueSnackbar("Configuracion reseteada a valores por defecto", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setResetDialogOpen(false);
			await fetchData();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear configuracion", {
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
			// Refrescar alertas
			const alertsRes = await ManagerConfigService.getAlerts();
			setAlerts(alertsRes);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al reconocer alerta", {
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

	// Obtener valor actual (editado o original)
	const getValue = <K extends keyof ManagerConfigSettings>(key: K): ManagerConfigSettings[K] | undefined => {
		if (editedSettings[key] !== undefined) {
			return editedSettings[key] as ManagerConfigSettings[K];
		}
		return settings?.[key];
	};

	// Efecto para cargar datos
	useEffect(() => {
		fetchData();
	}, [fetchData]);

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

	// Formatear fecha
	const formatDate = (dateStr: string) => {
		if (!dateStr) return "-";
		const date = new Date(dateStr);
		return date.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	// Formatear porcentaje
	const formatPercent = (value: number) => {
		return `${(value * 100).toFixed(1)}%`;
	};

	const hasChanges = Object.keys(editedSettings).length > 0;

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box>
				<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
					<Box>
						<Typography variant="h5" fontWeight="bold">
							Configuracion del Manager
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Gestiona la configuracion del App Update Manager y monitorea su estado
						</Typography>
					</Box>
					<Stack direction="row" spacing={2} alignItems="center">
						<Tooltip title="Actualizar datos">
							<IconButton onClick={handleRefresh} disabled={refreshing}>
								<Refresh2 size={20} className={refreshing ? "spin" : ""} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
			</Box>

			{/* Alertas activas */}
			{alerts && alerts.count > 0 && (
				<Alert
					severity="warning"
					icon={<Warning2 size={20} />}
					sx={{ mb: 2 }}
				>
					<Typography variant="subtitle2" gutterBottom>
						{alerts.count} alerta(s) activa(s)
					</Typography>
					<Stack spacing={1} sx={{ mt: 1 }}>
						{alerts.data.map((alert, index) => (
							<Stack key={index} direction="row" alignItems="center" spacing={1}>
								<Typography variant="body2">{alert.message}</Typography>
								<Button size="small" onClick={() => handleAcknowledgeAlert(index)}>
									Reconocer
								</Button>
							</Stack>
						))}
					</Stack>
				</Alert>
			)}

			{/* Estado actual */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<StatusCard
						title="Estado"
						value={status?.isRunning ? "Activo" : "Detenido"}
						subtitle={status?.lastUpdateAgo ? `Actualizado hace ${status.lastUpdateAgo}` : undefined}
						icon={status?.isRunning ? <TickCircle size={24} /> : <CloseCircle size={24} />}
						color={status?.isRunning ? theme.palette.success.main : theme.palette.error.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatusCard
						title="Workers Activos"
						value={status?.totalWorkers || 0}
						subtitle={status?.isWithinWorkingHours ? "En horario laboral" : "Fuera de horario"}
						icon={<People size={24} />}
						color={theme.palette.primary.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatusCard
						title="Pendientes"
						value={status?.totalPending || 0}
						icon={<Timer size={24} />}
						color={theme.palette.warning.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatusCard
						title="CPU / Memoria"
						value={
							status?.systemResources
								? `${formatPercent(status.systemResources.cpuUsage)} / ${formatPercent(status.systemResources.memoryUsage)}`
								: "-"
						}
						subtitle={status?.systemResources ? `${status.systemResources.freeMemoryMB} MB libres` : undefined}
						icon={<Cpu size={24} />}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

			{/* Detalle por fuero */}
			{status?.workers && (
				<Card>
					<CardHeader title="Estado por Fuero" />
					<CardContent>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fuero</TableCell>
										<TableCell align="center">Workers Activos</TableCell>
										<TableCell align="center">Pendientes</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{Object.entries(status.workers).map(([fuero, count]) => (
										<TableRow key={fuero}>
											<TableCell>
												<Typography variant="body2" fontWeight="medium">
													{FUERO_LABELS[fuero] || fuero}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={count}
													size="small"
													color={count > 0 ? "primary" : "default"}
												/>
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
					</CardContent>
				</Card>
			)}

			{/* Configuracion */}
			<Card>
				<CardHeader
					title="Configuracion"
					action={
						<Stack direction="row" spacing={1}>
							<Button
								variant="outlined"
								color="error"
								onClick={() => setResetDialogOpen(true)}
								disabled={saving}
								startIcon={<ArrowRotateRight size={18} />}
							>
								Resetear
							</Button>
							<Button
								variant="contained"
								onClick={handleSave}
								disabled={!hasChanges || saving}
								startIcon={saving ? <CircularProgress size={18} /> : <TickCircle size={18} />}
							>
								{saving ? "Guardando..." : "Guardar Cambios"}
							</Button>
						</Stack>
					}
				/>
				<CardContent>
					{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
							<CircularProgress />
						</Box>
					) : (
						<Grid container spacing={3}>
							{/* Limites de Workers */}
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Limites de Workers
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Max Workers"
									type="number"
									value={getValue("maxWorkers") || ""}
									onChange={(e) => handleSettingChange("maxWorkers", parseInt(e.target.value))}
									helperText="Maximo de workers por fuero (0-20)"
									InputProps={{ inputProps: { min: 0, max: 20 } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Min Workers"
									type="number"
									value={getValue("minWorkers") || ""}
									onChange={(e) => handleSettingChange("minWorkers", parseInt(e.target.value))}
									helperText="Minimo de workers por fuero"
									InputProps={{ inputProps: { min: 0 } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Umbral de Escalado"
									type="number"
									value={getValue("scaleThreshold") || ""}
									onChange={(e) => handleSettingChange("scaleThreshold", parseInt(e.target.value))}
									helperText="Documentos pendientes para escalar"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Umbral de Reduccion"
									type="number"
									value={getValue("scaleDownThreshold") || ""}
									onChange={(e) => handleSettingChange("scaleDownThreshold", parseInt(e.target.value))}
									helperText="Documentos pendientes para reducir"
								/>
							</Grid>

							{/* Intervalos */}
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
									Intervalos y Umbrales
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Intervalo de Verificacion (ms)"
									type="number"
									value={getValue("checkInterval") || ""}
									onChange={(e) => handleSettingChange("checkInterval", parseInt(e.target.value))}
									helperText="Minimo 10000ms (10 segundos)"
									InputProps={{ inputProps: { min: 10000 } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Horas para Actualizar"
									type="number"
									value={getValue("updateThresholdHours") || ""}
									onChange={(e) => handleSettingChange("updateThresholdHours", parseInt(e.target.value))}
									helperText="Horas sin actualizar para marcar pendiente"
								/>
							</Grid>

							{/* Recursos */}
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
									Limites de Recursos
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>
							<Grid item xs={12} sm={6}>
								<Typography gutterBottom>
									Umbral de CPU: {((getValue("cpuThreshold") || 0) * 100).toFixed(0)}%
								</Typography>
								<Slider
									value={(getValue("cpuThreshold") || 0) * 100}
									onChange={(_, value) => handleSettingChange("cpuThreshold", (value as number) / 100)}
									min={50}
									max={95}
									valueLabelDisplay="auto"
									valueLabelFormat={(v) => `${v}%`}
								/>
							</Grid>
							<Grid item xs={12} sm={6}>
								<Typography gutterBottom>
									Umbral de Memoria: {((getValue("memoryThreshold") || 0) * 100).toFixed(0)}%
								</Typography>
								<Slider
									value={(getValue("memoryThreshold") || 0) * 100}
									onChange={(_, value) => handleSettingChange("memoryThreshold", (value as number) / 100)}
									min={50}
									max={95}
									valueLabelDisplay="auto"
									valueLabelFormat={(v) => `${v}%`}
								/>
							</Grid>

							{/* Horario */}
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
									Horario de Trabajo
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>
							<Grid item xs={12} sm={4}>
								<TextField
									fullWidth
									label="Hora de Inicio"
									type="number"
									value={getValue("workStartHour") || ""}
									onChange={(e) => handleSettingChange("workStartHour", parseInt(e.target.value))}
									helperText="Hora de inicio (0-23)"
									InputProps={{ inputProps: { min: 0, max: 23 } }}
								/>
							</Grid>
							<Grid item xs={12} sm={4}>
								<TextField
									fullWidth
									label="Hora de Fin"
									type="number"
									value={getValue("workEndHour") || ""}
									onChange={(e) => handleSettingChange("workEndHour", parseInt(e.target.value))}
									helperText="Hora de fin (0-24)"
									InputProps={{ inputProps: { min: 0, max: 24 } }}
								/>
							</Grid>
							<Grid item xs={12} sm={4}>
								<FormControl fullWidth>
									<InputLabel>Dias de Trabajo</InputLabel>
									<Select
										multiple
										value={getValue("workDays") || []}
										onChange={(e) => handleSettingChange("workDays", e.target.value as number[])}
										input={<OutlinedInput label="Dias de Trabajo" />}
										renderValue={(selected) =>
											(selected as number[]).map((d) => DAY_LABELS[d]).join(", ")
										}
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
						</Grid>
					)}
				</CardContent>
			</Card>

			{/* Historial */}
			<Card>
				<CardHeader
					title="Historial"
					action={
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Periodo</InputLabel>
							<Select
								value={hoursBack}
								label="Periodo"
								onChange={(e) => setHoursBack(e.target.value as number)}
							>
								<MenuItem value={6}>6 horas</MenuItem>
								<MenuItem value={12}>12 horas</MenuItem>
								<MenuItem value={24}>24 horas</MenuItem>
								<MenuItem value={48}>48 horas</MenuItem>
								<MenuItem value={72}>72 horas</MenuItem>
							</Select>
						</FormControl>
					}
				/>
				<CardContent>
					{history && (
						<>
							<Grid container spacing={2} sx={{ mb: 3 }}>
								<Grid item xs={6} sm={3}>
									<Typography variant="body2" color="text.secondary">
										Promedio Workers
									</Typography>
									<Typography variant="h6">{history.stats.avgWorkers}</Typography>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="body2" color="text.secondary">
										Promedio Pendientes
									</Typography>
									<Typography variant="h6">{history.stats.avgPending}</Typography>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="body2" color="text.secondary">
										Promedio CPU
									</Typography>
									<Typography variant="h6">{history.stats.avgCpu}</Typography>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="body2" color="text.secondary">
										Promedio Memoria
									</Typography>
									<Typography variant="h6">{history.stats.avgMemory}</Typography>
								</Grid>
							</Grid>

							<Typography variant="body2" color="text.secondary">
								{history.stats.snapshotCount} snapshots en las ultimas {hoursBack} horas
							</Typography>
						</>
					)}
				</CardContent>
			</Card>

			{/* Dialogo de confirmacion de reset */}
			<Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>Resetear Configuracion</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Esta a punto de resetear toda la configuracion a los valores por defecto. Esta accion no se puede deshacer.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
					<Button onClick={handleReset} color="error" variant="contained" disabled={saving}>
						{saving ? "Reseteando..." : "Resetear"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Info */}
			<Alert severity="info" icon={<InfoCircle size={20} />}>
				<Typography variant="body2">
					Los cambios en la configuracion se aplicaran en el proximo ciclo del manager.
					El estado se actualiza automaticamente cada 30 segundos.
				</Typography>
			</Alert>
		</Stack>
	);
};

export default ManagerConfigPage;
