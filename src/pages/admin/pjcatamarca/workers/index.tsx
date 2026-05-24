/**
 * PJ Catamarca Workers Configuration Page
 * Comprehensive dashboard for managing PJ Catamarca workers with separate tabs for each worker type
 */
import React, { useState, useEffect, useCallback } from "react";
import {
	Grid,
	Box,
	Typography,
	Card,
	CardContent,
	CardHeader,
	Chip,
	Switch,
	IconButton,
	Tooltip,
	LinearProgress,
	Alert,
	Stack,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Tab,
	Button,
	TextField,
	CircularProgress,
	Snackbar,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	InputAdornment,
} from "@mui/material";
import {
	Refresh,
	Play,
	Pause,
	Warning2,
	TickCircle,
	CloseCircle,
	Cpu,
	DocumentText1,
	Chart,
	Edit2,
	SearchNormal1,
	Briefcase,
	Book1,
} from "iconsax-react";
import MainCard from "components/MainCard";
import CronSelector, { getCronLabel } from "components/admin/CronSelector";
import { useTheme, alpha } from "@mui/material/styles";
import DocumentationTabs from "./DocumentationTabs";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, LIVE_PULSE_KEYFRAMES } from "themes/dashboardTokens";
import configPjCatamarca, {
	IAllWorkersResponse,
	IManagerWorkerConfig,
	IWorkerStatusDetail,
	IDailyWorkerStats,
	IAlert,
	IEffectiveSchedule,
	IWorkerSchedule,
} from "api/configPjCatamarca";

// ========== INTERFACES ==========

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

interface WorkerCardProps {
	workerType: "verifier" | "updater" | "stuck";
	config: IManagerWorkerConfig;
	status: IWorkerStatusDetail;
	effectiveSchedule?: IEffectiveSchedule;
	onToggle: () => void;
	onEdit: () => void;
	loading?: boolean;
}

interface EditDialogProps {
	open: boolean;
	workerType: "verifier" | "updater" | "stuck" | null;
	config: IManagerWorkerConfig | null;
	onClose: () => void;
	onSave: (updates: Partial<IManagerWorkerConfig>) => void;
	loading?: boolean;
}

// ========== HELPER COMPONENTS ==========

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} id={`eje-tabpanel-${index}`} aria-labelledby={`eje-tab-${index}`} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

// Helper function to format days
const formatWorkDays = (days: number[] = []): string => {
	const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
	if (days.length === 7) return "Todos los días";
	if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Lun-Vie";
	return days.map((d) => dayNames[d]).join(", ");
};

// Worker Card Component
const WorkerCard: React.FC<WorkerCardProps> = ({ workerType, config, status, effectiveSchedule, onToggle, onEdit, loading }) => {
	const theme = useTheme();

	const workerLabels: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
	verifier: {
			name: "Verificación",
			description: "Verifica que los expedientes existen en el sistema PJ Catamarca",
			icon: <SearchNormal1 size={24} />,
		},
	updater: {
			name: "Actualización",
			description: "Actualiza expedientes verificados con nuevos movimientos",
			icon: <Refresh size={24} />,
		},
		stuck: {
			name: "Recuperación",
			description: "Recupera expedientes que quedaron trabados",
			icon: <Briefcase size={24} />,
		},
	};

	const label = workerLabels[workerType];

	return (
		<Card
			variant="outlined"
			sx={{
				borderColor: config?.enabled ? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.5 : 0.4) : theme.palette.divider,
				borderWidth: config?.enabled ? 1.5 : 1,
				borderRadius: 1.5,
				boxShadow: "none",
				bgcolor: config?.enabled ? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.04 : 0.02) : "background.paper",
				transition: "border-color 200ms ease, background-color 200ms ease",
			}}
		>
			<CardHeader
				avatar={
					<Box
						sx={{
							p: 1,
							borderRadius: 2,
							bgcolor: config?.enabled ? alpha(LIVE_GREEN, 0.12) : alpha(theme.palette.grey[500], 0.1),
							color: config?.enabled ? LIVE_GREEN : theme.palette.grey[500],
						}}
					>
						{label.icon}
					</Box>
				}
				title={
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6" sx={{ fontWeight: 600 }}>
							{label.name}
						</Typography>
						<Chip
							size="small"
							label={config?.enabled ? "Activo" : "Inactivo"}
							sx={{
								height: 22,
								fontWeight: 600,
								fontSize: "0.7rem",
								letterSpacing: "0.02em",
								bgcolor: config?.enabled
									? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.18 : 0.12)
									: alpha(theme.palette.grey[500], 0.12),
								color: config?.enabled ? LIVE_GREEN : "text.secondary",
								border: 1,
								borderColor: config?.enabled
									? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.42 : 0.28)
									: "divider",
							}}
						/>
					</Stack>
				}
				subheader={label.description}
				action={
					<Stack direction="row" spacing={1}>
						<Tooltip title="Editar configuración">
							<IconButton onClick={onEdit} disabled={loading}>
								<Edit2 size={18} />
							</IconButton>
						</Tooltip>
						<Tooltip title={config?.enabled ? "Desactivar" : "Activar"}>
							<Switch checked={config?.enabled || false} onChange={onToggle} disabled={loading} color="success" />
						</Tooltip>
					</Stack>
				}
			/>
			<CardContent>
				<Grid container spacing={2}>
					{/* Status */}
					<Grid item xs={12} sm={6}>
						<Stack spacing={1}>
							<Typography variant="subtitle2" color="text.secondary">
								Estado Actual
							</Typography>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Instancias activas:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{status?.activeInstances || 0}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Documentos pendientes:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{status?.pendingDocuments || 0}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Instancias óptimas:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{status?.optimalInstances || 0}
								</Typography>
							</Box>
						</Stack>
					</Grid>

					{/* Config */}
					<Grid item xs={12} sm={6}>
						<Stack spacing={1}>
							<Typography variant="subtitle2" color="text.secondary">
								Configuración
							</Typography>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Workers:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{config?.minWorkers || 0} - {config?.maxWorkers || 0}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Batch size:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{config?.batchSize || 0}
								</Typography>
							</Box>
							{workerType === "updater" && (
								<Box sx={{ display: "flex", justifyContent: "space-between" }}>
									<Typography variant="body2">Re-actualizar cada:</Typography>
									<Typography variant="body2" fontWeight="bold">
										{config?.updateThresholdHours || 24}h
									</Typography>
								</Box>
							)}
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="body2">Horario:</Typography>
								<Typography variant="body2" fontWeight="bold">
									{effectiveSchedule ? (
										effectiveSchedule.useGlobalSchedule ? (
											<Chip label="Global" size="small" variant="outlined" />
										) : (
											`${effectiveSchedule.workStartHour}:00-${effectiveSchedule.workEndHour}:00`
										)
									) : (
										"-"
									)}
								</Typography>
							</Box>
						</Stack>
					</Grid>

					{/* Recent Activity */}
					<Grid item xs={12}>
						<Divider sx={{ my: 1 }} />
						<Stack direction="row" spacing={2} justifyContent="space-between">
							<Box>
								<Typography variant="caption" color="text.secondary">
									Procesados este ciclo
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{status?.processedThisCycle || 0}
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">
									Errores este ciclo
								</Typography>
								<Typography variant="body2" fontWeight="bold" color="error.main">
									{status?.errorsThisCycle || 0}
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">
									Último procesamiento
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{status?.lastProcessedAt ? new Date(status.lastProcessedAt).toLocaleTimeString("es-AR") : "-"}
								</Typography>
							</Box>
						</Stack>
					</Grid>
				</Grid>
			</CardContent>
		</Card>
	);
};

// Edit Dialog Component
const EditWorkerDialog: React.FC<EditDialogProps> = ({ open, workerType, config, onClose, onSave, loading }) => {
	const [formData, setFormData] = useState<Partial<IManagerWorkerConfig> & { schedule?: Partial<IWorkerSchedule> }>({});

	useEffect(() => {
		if (config) {
			setFormData({
				minWorkers: config.minWorkers,
				maxWorkers: config.maxWorkers,
				scaleUpThreshold: config.scaleUpThreshold,
				scaleDownThreshold: config.scaleDownThreshold,
				updateThresholdHours: config.updateThresholdHours,
				batchSize: config.batchSize,
				delayBetweenRequests: config.delayBetweenRequests,
				maxRetries: config.maxRetries,
				cronExpression: config.cronExpression,
				schedule: {
					useGlobalSchedule: config.schedule?.useGlobalSchedule ?? true,
					workStartHour: config.schedule?.workStartHour ?? 0,
					workEndHour: config.schedule?.workEndHour ?? 23,
					workDays: config.schedule?.workDays ?? [0, 1, 2, 3, 4, 5, 6],
				},
			});
		}
	}, [config]);

	const handleChange = (field: keyof IManagerWorkerConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleScheduleChange = (field: keyof IWorkerSchedule) => (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.type === "number" ? Number(e.target.value) : e.target.checked;
		setFormData((prev) => ({
			...prev,
			schedule: { ...prev.schedule, [field]: value },
		}));
	};

	const handleDaysChange = (day: number) => {
		const currentDays = formData.schedule?.workDays || [];
		const newDays = currentDays.includes(day) ? currentDays.filter((d) => d !== day) : [...currentDays, day].sort((a, b) => a - b);
		setFormData((prev) => ({
			...prev,
			schedule: { ...prev.schedule, workDays: newDays },
		}));
	};

	const workerLabels: Record<string, string> = {
		verification: "Verificación",
		update: "Actualización",
		stuck: "Recuperación",
	};

	const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Configurar Worker de {workerType ? workerLabels[workerType] : ""}</DialogTitle>
			<DialogContent>
				<Grid container spacing={2} sx={{ mt: 1 }}>
					{/* Workers */}
					<Grid item xs={6}>
						<TextField
							label="Workers mínimos"
							type="number"
							fullWidth
							size="small"
							value={formData.minWorkers || 0}
							onChange={handleChange("minWorkers")}
							InputProps={{ inputProps: { min: 0, max: 10 } }}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							label="Workers máximos"
							type="number"
							fullWidth
							size="small"
							value={formData.maxWorkers || 0}
							onChange={handleChange("maxWorkers")}
							InputProps={{ inputProps: { min: 1, max: 10 } }}
						/>
					</Grid>

					{/* Scaling thresholds */}
					<Grid item xs={6}>
						<TextField
							label="Umbral escalar UP"
							type="number"
							fullWidth
							size="small"
							value={formData.scaleUpThreshold || 0}
							onChange={handleChange("scaleUpThreshold")}
							helperText="Docs pendientes para escalar"
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							label="Umbral escalar DOWN"
							type="number"
							fullWidth
							size="small"
							value={formData.scaleDownThreshold || 0}
							onChange={handleChange("scaleDownThreshold")}
							helperText="Docs pendientes para reducir"
						/>
					</Grid>

					{/* Update threshold - only for update worker */}
					{workerType === "updater" && (
						<Grid item xs={12}>
							<TextField
								label="Re-actualizar después de"
								type="number"
								fullWidth
								size="small"
								value={formData.updateThresholdHours || 24}
								onChange={handleChange("updateThresholdHours")}
								InputProps={{
									endAdornment: <InputAdornment position="end">horas</InputAdornment>,
									inputProps: { min: 1, max: 168 },
								}}
								helperText="Horas antes de volver a actualizar un expediente"
							/>
						</Grid>
					)}

					{/* Batch and delay */}
					<Grid item xs={6}>
						<TextField
							label="Batch size"
							type="number"
							fullWidth
							size="small"
							value={formData.batchSize || 0}
							onChange={handleChange("batchSize")}
							helperText="Documentos por ciclo"
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							label="Delay entre requests"
							type="number"
							fullWidth
							size="small"
							value={formData.delayBetweenRequests || 0}
							onChange={handleChange("delayBetweenRequests")}
							InputProps={{
								endAdornment: <InputAdornment position="end">ms</InputAdornment>,
							}}
						/>
					</Grid>

					{/* Retries and cron */}
					<Grid item xs={6}>
						<TextField
							label="Reintentos máximos"
							type="number"
							fullWidth
							size="small"
							value={formData.maxRetries || 0}
							onChange={handleChange("maxRetries")}
							InputProps={{ inputProps: { min: 0, max: 10 } }}
						/>
					</Grid>
					<Grid item xs={12}>
						<CronSelector
							label="Frecuencia"
							value={formData.cronExpression || ""}
							onChange={(v) => setFormData((prev) => ({ ...prev, cronExpression: v }))}
							helperText="Cuándo corre el worker — requiere reinicio PM2 para aplicar"
						/>
					</Grid>

					{/* Schedule section */}
					<Grid item xs={12}>
						<Divider sx={{ my: 1 }} />
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Horario de Trabajo
						</Typography>
					</Grid>

					<Grid item xs={12}>
						<Stack direction="row" alignItems="center" justifyContent="space-between">
							<Typography variant="body2">Usar horario global</Typography>
							<Switch
								checked={formData.schedule?.useGlobalSchedule ?? true}
								onChange={(e) =>
									setFormData((prev) => ({
										...prev,
										schedule: { ...prev.schedule, useGlobalSchedule: e.target.checked },
									}))
								}
							/>
						</Stack>
					</Grid>

					{!formData.schedule?.useGlobalSchedule && (
						<>
							<Grid item xs={6}>
								<TextField
									label="Hora inicio"
									type="number"
									fullWidth
									size="small"
									value={formData.schedule?.workStartHour ?? 0}
									onChange={handleScheduleChange("workStartHour")}
									InputProps={{
										endAdornment: <InputAdornment position="end">:00</InputAdornment>,
										inputProps: { min: 0, max: 23 },
									}}
								/>
							</Grid>
							<Grid item xs={6}>
								<TextField
									label="Hora fin"
									type="number"
									fullWidth
									size="small"
									value={formData.schedule?.workEndHour ?? 23}
									onChange={handleScheduleChange("workEndHour")}
									InputProps={{
										endAdornment: <InputAdornment position="end">:00</InputAdornment>,
										inputProps: { min: 0, max: 23 },
									}}
								/>
							</Grid>
							<Grid item xs={12}>
								<Typography variant="body2" sx={{ mb: 1 }}>
									Días de trabajo
								</Typography>
								<Stack direction="row" spacing={1} flexWrap="wrap">
									{dayNames.map((day, i) => (
										<Chip
											key={day}
											label={day}
											onClick={() => handleDaysChange(i)}
											color={formData.schedule?.workDays?.includes(i) ? "primary" : "default"}
											variant={formData.schedule?.workDays?.includes(i) ? "filled" : "outlined"}
											sx={{ cursor: "pointer" }}
										/>
									))}
								</Stack>
							</Grid>
						</>
					)}
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={() => onSave(formData)} disabled={loading}>
					{loading ? <CircularProgress size={20} /> : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ========== MAIN COMPONENT ==========

const PjCatamarcaWorkersConfig: React.FC = () => {
	const theme = useTheme();
	const [tabValue, setTabValue] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({
		open: false,
		message: "",
		severity: "success",
	});

	// Edit dialog state
	const [editDialog, setEditDialog] = useState<{
		open: boolean;
		workerType: "verifier" | "updater" | "stuck" | null;
		config: IManagerWorkerConfig | null;
	}>({
		open: false,
		workerType: null,
		config: null,
	});

	// Manager cron edit dialog
	const [managerCronDialog, setManagerCronDialog] = useState<{ open: boolean; value: string }>({
		open: false,
		value: "",
	});

	// Data states
	const [workersData, setWorkersData] = useState<IAllWorkersResponse | null>(null);
	const [todayStats, setTodayStats] = useState<IDailyWorkerStats[]>([]);
	const [alerts, setAlerts] = useState<IAlert[]>([]);

	// Fetch all data
	const fetchData = useCallback(async () => {
		try {
			const [workersResponse, statsData, alertsData] = await Promise.all([
				configPjCatamarca.getAllWorkersConfig(),
				configPjCatamarca.getTodaySummary(),
				configPjCatamarca.getAlerts(false),
			]);
			setWorkersData(workersResponse);
			setTodayStats(statsData);
			setAlerts(alertsData);
		} catch (error) {
			console.error("Error fetching PJ Catamarca config:", error);
			setSnackbar({
				open: true,
				message: "Error cargando configuración PJ Catamarca",
				severity: "error",
			});
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
		const interval = setInterval(fetchData, 60000);
		return () => clearInterval(interval);
	}, [fetchData]);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchData();
	};

	const handleToggleWorker = async (workerType: "verifier" | "updater" | "stuck") => {
		setActionLoading(true);
		try {
			const result = await configPjCatamarca.toggleWorker(workerType);
			setWorkersData((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					workers: prev.workers.map((w) => (w.workerType === workerType ? { ...w, config: { ...w.config, enabled: result.enabled } } : w)),
				};
			});
			setSnackbar({
				open: true,
				message: `Worker de ${workerType} ${result.enabled ? "activado" : "desactivado"}`,
				severity: "success",
			});
		} catch (error) {
			setSnackbar({
				open: true,
				message: "Error cambiando estado del worker",
				severity: "error",
			});
		} finally {
			setActionLoading(false);
		}
	};

	const handleToggleManager = async () => {
		setActionLoading(true);
		try {
			const result = await configPjCatamarca.toggleManager();
			setWorkersData((prev) =>
				prev
					? {
							...prev,
							managerState: { ...prev.managerState, isRunning: result.isRunning },
					  }
					: null,
			);
			setSnackbar({
				open: true,
				message: `Manager ${result.isRunning ? "iniciado" : "detenido"}`,
				severity: "success",
			});
		} catch (error) {
			setSnackbar({
				open: true,
				message: "Error cambiando estado del manager",
				severity: "error",
			});
		} finally {
			setActionLoading(false);
		}
	};

	const handleEditWorker = (workerType: "verifier" | "updater" | "stuck") => {
		const worker = workersData?.workers.find((w) => w.workerType === workerType);
		setEditDialog({
			open: true,
			workerType,
			config: worker?.config || null,
		});
	};

	const handleSaveManagerCron = async (newCron: string) => {
		setActionLoading(true);
		try {
			await configPjCatamarca.updateGlobalSettings({ managerCron: newCron.trim() });
			setSnackbar({
				open: true,
				message: "Cron del manager actualizado. Reinicio del proceso PM2 requerido para aplicar.",
				severity: "success",
			});
			setManagerCronDialog({ open: false, value: "" });
			fetchData();
		} catch (error) {
			setSnackbar({ open: true, message: "Error actualizando cron del manager", severity: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handleSaveWorkerConfig = async (updates: Partial<IManagerWorkerConfig>) => {
		if (!editDialog.workerType) return;

		setActionLoading(true);
		try {
			await configPjCatamarca.updateWorkerConfig(editDialog.workerType, updates);
			setSnackbar({
				open: true,
				message: "Configuración actualizada",
				severity: "success",
			});
			setEditDialog({ open: false, workerType: null, config: null });
			fetchData();
		} catch (error) {
			setSnackbar({
				open: true,
				message: "Error actualizando configuración",
				severity: "error",
			});
		} finally {
			setActionLoading(false);
		}
	};

	const handleAcknowledgeAlert = async (index: number) => {
		try {
			await configPjCatamarca.acknowledgeAlert(index);
			setAlerts((prev) => prev.filter((_, i) => i !== index));
			setSnackbar({
				open: true,
				message: "Alerta confirmada",
				severity: "success",
			});
		} catch (error) {
			setSnackbar({
				open: true,
				message: "Error confirmando alerta",
				severity: "error",
			});
		}
	};

	// Get worker data by type
	const getWorkerData = (type: "verifier" | "updater" | "stuck") => {
		return workersData?.workers.find((w) => w.workerType === type);
	};

	// Calculate summary stats from today's data
	const summaryStats = todayStats.reduce(
		(acc, stat) => ({
			processed: acc.processed + stat.totalProcessed,
			success: acc.success + stat.totalSuccess,
			errors: acc.errors + stat.totalErrors,
			movimientos: acc.movimientos + stat.totalMovimientosFound,
			runs: acc.runs + stat.runsCompleted,
		}),
		{ processed: 0, success: 0, errors: 0, movimientos: 0, runs: 0 },
	);

	if (loading) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "50vh",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<>
			<Grid container spacing={3}>
				{/* Header Card */}
				<Grid item xs={12}>
					<MainCard
						title="Workers PJ Catamarca"
						secondary={
							<Stack direction="row" spacing={1} alignItems="center">
								<Box
									sx={{
										display: "inline-flex",
										alignItems: "center",
										gap: 0.75,
										px: 1.25,
										py: 0.5,
										borderRadius: 1,
										border: 1,
										borderColor: workersData?.managerState.isRunning
											? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.42 : 0.28)
											: alpha(theme.palette.error.main, 0.32),
										bgcolor: workersData?.managerState.isRunning
											? alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.14 : 0.08)
											: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.14 : 0.06),
										...LIVE_PULSE_KEYFRAMES,
									}}
								>
									<Box
										sx={{
											position: "relative",
											width: 8,
											height: 8,
											borderRadius: "50%",
											bgcolor: workersData?.managerState.isRunning ? LIVE_GREEN : theme.palette.error.main,
											"&::after": workersData?.managerState.isRunning
												? {
														content: '""',
														position: "absolute",
														inset: 0,
														borderRadius: "50%",
														bgcolor: LIVE_GREEN,
														animation: "la-live-pulse 2.4s ease-out infinite",
												  }
												: {},
										}}
									/>
									<Typography
										variant="caption"
										sx={{
											fontWeight: 600,
											letterSpacing: "0.02em",
											color: workersData?.managerState.isRunning ? LIVE_GREEN : theme.palette.error.main,
										}}
									>
										{workersData?.managerState.isRunning ? "Manager activo" : "Manager detenido"}
									</Typography>
								</Box>
								<Tooltip title={workersData?.managerState.isRunning ? "Detener manager" : "Iniciar manager"}>
									<IconButton
										onClick={handleToggleManager}
										disabled={actionLoading}
										sx={{
											transition: "background-color 200ms ease, transform 200ms ease",
											"&:hover": { transform: "scale(1.05)" },
										}}
									>
										{workersData?.managerState.isRunning ? <Pause size={20} /> : <Play size={20} />}
									</IconButton>
								</Tooltip>
								<Tooltip title="Actualizar">
									<IconButton
										onClick={handleRefresh}
										disabled={refreshing}
										sx={{
											animation: refreshing ? "spin 1s linear infinite" : "none",
											"@keyframes spin": {
												"0%": { transform: "rotate(0deg)" },
												"100%": { transform: "rotate(360deg)" },
											},
										}}
									>
										<Refresh size={20} />
									</IconButton>
								</Tooltip>
							</Stack>
						}
					>
						<Stack spacing={1.5}>
							<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
								<Box
									component="span"
									sx={{
										display: "inline-flex",
										alignItems: "center",
										px: 1,
										py: 0.25,
										borderRadius: 1,
										bgcolor: theme.palette.grey[800],
										color: theme.palette.common.white,
										fontSize: "0.65rem",
										fontWeight: 500,
										fontFamily: "monospace",
										letterSpacing: "0.5px",
									}}
								>
									worker_02
								</Box>
								<Box
									component="span"
									sx={{
										display: "inline-flex",
										alignItems: "center",
										px: 0.75,
										py: 0.25,
										borderRadius: 1,
										bgcolor: alpha(theme.palette.info.main, 0.1),
										color: theme.palette.info.main,
										fontSize: "0.6rem",
										fontWeight: 500,
										fontFamily: "monospace",
									}}
								>
									100.98.180.101
								</Box>
								<Tooltip title="4 procesos PM2 en worker_02: manager (fork) · verifier (cluster) · updater (cluster) · stuck (fork)">
									<Chip
										label="PM2: manager · verifier · updater · stuck"
										size="small"
										color="secondary"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
									/>
								</Tooltip>
								<Chip
									label="causas-pjcatamarca · Atlas"
									size="small"
									color="info"
									variant="outlined"
									sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
								/>
								<Tooltip title="API REST en server principal, PM2 process: pjcatamarca-api">
									<Chip
										label="pjsal.lawanalytics.app · API"
										size="small"
										color="default"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
									/>
								</Tooltip>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								Gestión de workers para el sistema PJ Catamarca (portal IOL del Poder Judicial de Salta) — Verificación, actualización y liberación de causas
							</Typography>
						</Stack>
					</MainCard>
				</Grid>

				{/* Quick Stats Cards */}
				<Grid item xs={12} sm={6} md={3}>
					<Card
						sx={{
							border: 1,
							borderColor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.32 : 0.2),
							bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.08 : 0.04),
							boxShadow: "none",
							borderRadius: 1.5,
							transition: "transform 200ms ease, border-color 200ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(BRAND_BLUE, 0.5) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography
										variant="h4"
										sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
									>
										{summaryStats.processed}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Procesados hoy
									</Typography>
								</Box>
								<DocumentText1 size={32} color={BRAND_BLUE} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card
						sx={{
							border: 1,
							borderColor: alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.32 : 0.2),
							bgcolor: alpha(LIVE_GREEN, theme.palette.mode === "dark" ? 0.08 : 0.04),
							boxShadow: "none",
							borderRadius: 1.5,
							transition: "transform 200ms ease, border-color 200ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(LIVE_GREEN, 0.5) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography
										variant="h4"
										sx={{ color: LIVE_GREEN, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
									>
										{summaryStats.success}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Exitosos
									</Typography>
								</Box>
								<TickCircle size={32} color={LIVE_GREEN} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card
						sx={{
							border: 1,
							borderColor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.32 : 0.2),
							bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
							boxShadow: "none",
							borderRadius: 1.5,
							transition: "transform 200ms ease, border-color 200ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(theme.palette.error.main, 0.5) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography
										variant="h4"
										color="error.main"
										sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
									>
										{summaryStats.errors}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Errores
									</Typography>
								</Box>
								<CloseCircle size={32} color={theme.palette.error.main} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card
						sx={{
							border: 1,
							borderColor: alpha(STALE_AMBER, theme.palette.mode === "dark" ? 0.32 : 0.2),
							bgcolor: alpha(STALE_AMBER, theme.palette.mode === "dark" ? 0.08 : 0.04),
							boxShadow: "none",
							borderRadius: 1.5,
							transition: "transform 200ms ease, border-color 200ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(STALE_AMBER, 0.5) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography
										variant="h4"
										sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}
									>
										{(workersData?.managerState.systemResources?.cpuUsage || 0) * 100 < 1
											? "<1"
											: ((workersData?.managerState.systemResources?.cpuUsage || 0) * 100).toFixed(0)}
										%
									</Typography>
									<Typography variant="body2" color="text.secondary">
										CPU / Memoria: {((workersData?.managerState.systemResources?.memoryUsage || 0) * 100).toFixed(0)}%
									</Typography>
								</Box>
								<Cpu size={32} color={STALE_AMBER} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Alerts */}
				{alerts.length > 0 && (
					<Grid item xs={12}>
						<Card variant="outlined" sx={{ borderColor: theme.palette.warning.main }}>
							<CardHeader title="Alertas Activas" avatar={<Warning2 size={20} color={theme.palette.warning.main} />} />
							<CardContent>
								<Stack spacing={1}>
									{alerts.map((alert, index) => (
										<Alert
											key={index}
											severity={alert.type.includes("high") || alert.type === "manager_stopped" ? "warning" : "info"}
											action={
												<Button size="small" onClick={() => handleAcknowledgeAlert(index)}>
													Confirmar
												</Button>
											}
										>
											{alert.message}
										</Alert>
									))}
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				)}

				{/* Main Content with Tabs */}
				<Grid item xs={12}>
					<MainCard>
						<Tabs
							value={tabValue}
							onChange={(_, v) => setTabValue(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 64,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
								},
							}}
						>
							{[
								{ label: "Verificación", icon: <SearchNormal1 size={18} /> },
								{ label: "Actualización", icon: <Refresh size={18} /> },
								{ label: "Sistema", icon: <Cpu size={18} /> },
								{ label: "Estadísticas", icon: <Chart size={18} /> },
								{ label: "Documentación", icon: <Book1 size={18} /> },
							].map((tab, idx) => (
								<Tab
									key={idx}
									label={
										<Stack direction="row" spacing={1.5} alignItems="center">
											<Box sx={{ color: theme.palette.success.main }}>{tab.icon}</Box>
											<Box>
												<Stack direction="row" spacing={0.75} alignItems="center">
													<Typography variant="body2" fontWeight={500}>
														{tab.label}
													</Typography>
													<Box
														component="span"
														sx={{
															display: "inline-flex",
															alignItems: "center",
															px: 1,
															py: 0.25,
															borderRadius: 1,
															bgcolor: theme.palette.grey[800],
															color: theme.palette.common.white,
															fontSize: "0.65rem",
															fontWeight: 500,
															fontFamily: "monospace",
															letterSpacing: "0.5px",
														}}
													>
														worker_02
													</Box>
													<Box
														component="span"
														sx={{
															display: "inline-flex",
															alignItems: "center",
															px: 0.75,
															py: 0.25,
															borderRadius: 1,
															bgcolor: alpha(theme.palette.info.main, 0.1),
															color: theme.palette.info.main,
															fontSize: "0.6rem",
															fontWeight: 500,
															fontFamily: "monospace",
														}}
													>
														100.98.180.101
													</Box>
												</Stack>
											</Box>
										</Stack>
									}
								/>
							))}
						</Tabs>

						{/* Tab 0: Verification Worker */}
						<TabPanel value={tabValue} index={0}>
							<Grid container spacing={3}>
								<Grid item xs={12}>
									<WorkerCard
										workerType="verifier"
										config={getWorkerData("verifier")?.config || ({} as IManagerWorkerConfig)}
										status={getWorkerData("verifier")?.status || ({} as IWorkerStatusDetail)}
										effectiveSchedule={getWorkerData("verifier")?.effectiveSchedule}
										onToggle={() => handleToggleWorker("verifier")}
										onEdit={() => handleEditWorker("verifier")}
										loading={actionLoading}
									/>
								</Grid>

								{/* Verification Stats */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Estadísticas de Hoy - Verificación" />
										<CardContent>
											{todayStats.filter((s) => s.workerType === "verifier").length > 0 ? (
												<Stack spacing={1}>
													{todayStats
														.filter((s) => s.workerType === "verifier")
														.map((stat, i) => (
															<Box key={i}>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Procesados:</Typography>
																	<Typography variant="body2" fontWeight="bold">
																		{stat.totalProcessed}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Exitosos:</Typography>
																	<Typography variant="body2" fontWeight="bold" color="success.main">
																		{stat.totalSuccess}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Errores:</Typography>
																	<Typography variant="body2" fontWeight="bold" color="error.main">
																		{stat.totalErrors}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Runs completados:</Typography>
																	<Typography variant="body2" fontWeight="bold">
																		{stat.runsCompleted}
																	</Typography>
																</Box>
															</Box>
														))}
												</Stack>
											) : (
												<Typography color="text.secondary" textAlign="center">
													Sin estadísticas disponibles
												</Typography>
											)}
										</CardContent>
									</Card>
								</Grid>

								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Configuración Detallada" />
										<CardContent>
											<TableContainer>
												<Table size="small">
													<TableBody>
														<TableRow>
															<TableCell>Proceso PM2</TableCell>
															<TableCell align="right">{getWorkerData("verifier")?.config?.workerName || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Límite de memoria</TableCell>
															<TableCell align="right">{getWorkerData("verifier")?.config?.maxMemoryRestart || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Delay entre requests</TableCell>
															<TableCell align="right">{getWorkerData("verifier")?.config?.delayBetweenRequests || 0} ms</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Reintentos máximos</TableCell>
															<TableCell align="right">{getWorkerData("verifier")?.config?.maxRetries || 0}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Horario</TableCell>
															<TableCell align="right">
																{getWorkerData("verifier")?.effectiveSchedule?.useGlobalSchedule
																	? "Usa horario global"
																	: `${getWorkerData("verifier")?.effectiveSchedule?.workStartHour}:00 - ${
																			getWorkerData("verifier")?.effectiveSchedule?.workEndHour
																	  }:00`}
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Días</TableCell>
															<TableCell align="right">
																{formatWorkDays(getWorkerData("verifier")?.effectiveSchedule?.workDays)}
															</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</TableContainer>
										</CardContent>
									</Card>
								</Grid>
							</Grid>
						</TabPanel>

						{/* Tab 1: Update Worker */}
						<TabPanel value={tabValue} index={1}>
							<Grid container spacing={3}>
								<Grid item xs={12}>
									<WorkerCard
										workerType="updater"
										config={getWorkerData("updater")?.config || ({} as IManagerWorkerConfig)}
										status={getWorkerData("updater")?.status || ({} as IWorkerStatusDetail)}
										effectiveSchedule={getWorkerData("updater")?.effectiveSchedule}
										onToggle={() => handleToggleWorker("updater")}
										onEdit={() => handleEditWorker("updater")}
										loading={actionLoading}
									/>
								</Grid>

								{/* Update Stats */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Estadísticas de Hoy - Actualización" />
										<CardContent>
											{todayStats.filter((s) => s.workerType === "updater").length > 0 ? (
												<Stack spacing={1}>
													{todayStats
														.filter((s) => s.workerType === "updater")
														.map((stat, i) => (
															<Box key={i}>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Procesados:</Typography>
																	<Typography variant="body2" fontWeight="bold">
																		{stat.totalProcessed}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Exitosos:</Typography>
																	<Typography variant="body2" fontWeight="bold" color="success.main">
																		{stat.totalSuccess}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Errores:</Typography>
																	<Typography variant="body2" fontWeight="bold" color="error.main">
																		{stat.totalErrors}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Movimientos encontrados:</Typography>
																	<Typography variant="body2" fontWeight="bold" color="info.main">
																		{stat.totalMovimientosFound}
																	</Typography>
																</Box>
																<Box sx={{ display: "flex", justifyContent: "space-between" }}>
																	<Typography variant="body2">Runs completados:</Typography>
																	<Typography variant="body2" fontWeight="bold">
																		{stat.runsCompleted}
																	</Typography>
																</Box>
															</Box>
														))}
												</Stack>
											) : (
												<Typography color="text.secondary" textAlign="center">
													Sin estadísticas disponibles
												</Typography>
											)}
										</CardContent>
									</Card>
								</Grid>

								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Configuración Detallada" />
										<CardContent>
											<TableContainer>
												<Table size="small">
													<TableBody>
														<TableRow>
															<TableCell>Proceso PM2</TableCell>
															<TableCell align="right">{getWorkerData("updater")?.config?.workerName || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Límite de memoria</TableCell>
															<TableCell align="right">{getWorkerData("updater")?.config?.maxMemoryRestart || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Re-actualizar cada</TableCell>
															<TableCell align="right">{getWorkerData("updater")?.config?.updateThresholdHours || 24} horas</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Delay entre requests</TableCell>
															<TableCell align="right">{getWorkerData("updater")?.config?.delayBetweenRequests || 0} ms</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Reintentos máximos</TableCell>
															<TableCell align="right">{getWorkerData("updater")?.config?.maxRetries || 0}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Horario</TableCell>
															<TableCell align="right">
																{getWorkerData("updater")?.effectiveSchedule?.useGlobalSchedule
																	? "Usa horario global"
																	: `${getWorkerData("updater")?.effectiveSchedule?.workStartHour}:00 - ${
																			getWorkerData("updater")?.effectiveSchedule?.workEndHour
																	  }:00`}
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Días</TableCell>
															<TableCell align="right">{formatWorkDays(getWorkerData("updater")?.effectiveSchedule?.workDays)}</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</TableContainer>
										</CardContent>
									</Card>
								</Grid>
							</Grid>
						</TabPanel>

						{/* Tab 2: System */}
						<TabPanel value={tabValue} index={2}>
							<Grid container spacing={3}>
								{/* Manager Status */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader
											title="Estado del Manager"
											action={
												<Chip
													size="small"
													label={workersData?.managerState.isRunning ? "Activo" : "Detenido"}
													color={workersData?.managerState.isRunning ? "success" : "error"}
												/>
											}
										/>
										<CardContent>
											<Stack spacing={2}>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Ciclos ejecutados:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{workersData?.managerState.cycleCount || 0}
													</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Último ciclo:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{workersData?.managerState.lastCycleAt
															? new Date(workersData.managerState.lastCycleAt).toLocaleString("es-AR")
															: "-"}
													</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Intervalo de chequeo:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{(workersData?.globalSettings?.checkInterval || 60000) / 1000}s
													</Typography>
												</Box>
											</Stack>
										</CardContent>
									</Card>
								</Grid>

								{/* System Resources */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Recursos del Sistema" />
										<CardContent>
											<Stack spacing={2}>
												<Box>
													<Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
														<Typography variant="body2">CPU</Typography>
														<Typography variant="body2">
															{((workersData?.managerState.systemResources?.cpuUsage || 0) * 100).toFixed(1)}%
														</Typography>
													</Box>
													<LinearProgress
														variant="determinate"
														value={(workersData?.managerState.systemResources?.cpuUsage || 0) * 100}
														color={
															(workersData?.managerState.systemResources?.cpuUsage || 0) >
															(workersData?.globalSettings?.cpuThreshold || 0.75)
																? "error"
																: "primary"
														}
													/>
												</Box>
												<Box>
													<Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
														<Typography variant="body2">Memoria</Typography>
														<Typography variant="body2">
															{((workersData?.managerState.systemResources?.memoryUsage || 0) * 100).toFixed(1)}%
														</Typography>
													</Box>
													<LinearProgress
														variant="determinate"
														value={(workersData?.managerState.systemResources?.memoryUsage || 0) * 100}
														color={
															(workersData?.managerState.systemResources?.memoryUsage || 0) >
															(workersData?.globalSettings?.memoryThreshold || 0.8)
																? "error"
																: "primary"
														}
													/>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Memoria libre:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{workersData?.managerState.systemResources?.memoryFree || 0} MB
													</Typography>
												</Box>
											</Stack>
										</CardContent>
									</Card>
								</Grid>

								{/* Global Settings */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Configuración Global" />
										<CardContent>
											<TableContainer>
												<Table size="small">
													<TableBody>
														<TableRow>
															<TableCell>Frecuencia del Manager</TableCell>
															<TableCell align="right">
																<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
																	<Tooltip title={workersData?.globalSettings?.managerCron || "* * * * *"}>
																		<Typography variant="body2">
																			{getCronLabel(workersData?.globalSettings?.managerCron) || "Personalizado"}
																		</Typography>
																	</Tooltip>
																	<Tooltip title="Editar frecuencia del manager (requiere reinicio PM2)">
																		<IconButton
																			size="small"
																			onClick={() =>
																				setManagerCronDialog({
																					open: true,
																					value: workersData?.globalSettings?.managerCron || "* * * * *",
																				})
																			}
																		>
																			<Edit2 size={14} />
																		</IconButton>
																	</Tooltip>
																</Stack>
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Umbral CPU</TableCell>
															<TableCell align="right">{((workersData?.globalSettings?.cpuThreshold || 0.75) * 100).toFixed(0)}%</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Umbral Memoria</TableCell>
															<TableCell align="right">
																{((workersData?.globalSettings?.memoryThreshold || 0.8) * 100).toFixed(0)}%
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Horario de trabajo</TableCell>
															<TableCell align="right">
																{workersData?.globalSettings?.workStartHour || 0}:00 - {workersData?.globalSettings?.workEndHour || 23}:00
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Zona horaria</TableCell>
															<TableCell align="right">
																{workersData?.globalSettings?.timezone || "America/Argentina/Buenos_Aires"}
															</TableCell>
														</TableRow>
													</TableBody>
												</Table>
											</TableContainer>
										</CardContent>
									</Card>
								</Grid>

								{/* Working Days */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Días de Trabajo (Global)" />
										<CardContent>
											<Stack direction="row" spacing={1} justifyContent="center">
												{["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, i) => (
													<Chip
														key={day}
														label={day}
														color={workersData?.globalSettings?.workDays?.includes(i) ? "primary" : "default"}
														variant={workersData?.globalSettings?.workDays?.includes(i) ? "filled" : "outlined"}
													/>
												))}
											</Stack>
										</CardContent>
									</Card>
								</Grid>

								{/* Stuck Worker */}
								<Grid item xs={12}>
									<WorkerCard
										workerType="stuck"
										config={getWorkerData("stuck")?.config || ({} as IManagerWorkerConfig)}
										status={getWorkerData("stuck")?.status || ({} as IWorkerStatusDetail)}
										effectiveSchedule={getWorkerData("stuck")?.effectiveSchedule}
										onToggle={() => handleToggleWorker("stuck")}
										onEdit={() => handleEditWorker("stuck")}
										loading={actionLoading}
									/>
								</Grid>
							</Grid>
						</TabPanel>

						{/* Tab 3: Statistics */}
						<TabPanel value={tabValue} index={3}>
							<Grid container spacing={3}>
								<Grid item xs={12}>
									<Card variant="outlined">
										<CardHeader title="Estadísticas de Hoy por Worker" />
										<CardContent>
											{todayStats.length > 0 ? (
												<TableContainer>
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Worker</TableCell>
																<TableCell align="right">Procesados</TableCell>
																<TableCell align="right">Exitosos</TableCell>
																<TableCell align="right">Errores</TableCell>
																<TableCell align="right">Movimientos</TableCell>
																<TableCell align="right">Runs</TableCell>
																<TableCell align="right">Tiempo Prom.</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{todayStats.map((stat, i) => (
																<TableRow key={i}>
																	<TableCell sx={{ textTransform: "capitalize" }}>{stat.workerType}</TableCell>
																	<TableCell align="right">{stat.totalProcessed}</TableCell>
																	<TableCell align="right">{stat.totalSuccess}</TableCell>
																	<TableCell align="right">{stat.totalErrors}</TableCell>
																	<TableCell align="right">{stat.totalMovimientosFound}</TableCell>
																	<TableCell align="right">{stat.runsCompleted}</TableCell>
																	<TableCell align="right">
																		{stat.avgProcessingTime > 0 ? `${(stat.avgProcessingTime / 1000).toFixed(1)}s` : "-"}
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											) : (
												<Typography color="text.secondary" textAlign="center" py={4}>
													No hay estadísticas disponibles para hoy
												</Typography>
											)}
										</CardContent>
									</Card>
								</Grid>

								{/* Summary */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Resumen del Día" />
										<CardContent>
											<Stack spacing={1}>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Total procesados:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{summaryStats.processed}
													</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Total exitosos:</Typography>
													<Typography variant="body2" fontWeight="bold" color="success.main">
														{summaryStats.success}
													</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Total errores:</Typography>
													<Typography variant="body2" fontWeight="bold" color="error.main">
														{summaryStats.errors}
													</Typography>
												</Box>
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Movimientos encontrados:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{summaryStats.movimientos}
													</Typography>
												</Box>
												<Divider />
												<Box sx={{ display: "flex", justifyContent: "space-between" }}>
													<Typography variant="body2">Tasa de éxito:</Typography>
													<Typography variant="body2" fontWeight="bold">
														{summaryStats.processed > 0 ? ((summaryStats.success / summaryStats.processed) * 100).toFixed(1) : 0}%
													</Typography>
												</Box>
											</Stack>
										</CardContent>
									</Card>
								</Grid>

								{/* Workers Overview */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Estado de Workers" />
										<CardContent>
											<Stack spacing={2}>
												{workersData?.workers.map((worker) => (
													<Box
														key={worker.workerType}
														sx={{
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
														}}
													>
														<Stack direction="row" spacing={1} alignItems="center">
															<Chip
																size="small"
																label={worker.config?.enabled ? "ON" : "OFF"}
																color={worker.config?.enabled ? "success" : "default"}
															/>
															<Typography variant="body2" sx={{ textTransform: "capitalize" }}>
																{worker.workerType}
															</Typography>
														</Stack>
														<Typography variant="body2">
															{worker.status?.activeInstances || 0} activos / {worker.status?.pendingDocuments || 0} pendientes
														</Typography>
													</Box>
												))}
											</Stack>
										</CardContent>
									</Card>
								</Grid>
							</Grid>
						</TabPanel>

						{/* Tab 4: Documentation */}
						<TabPanel value={tabValue} index={4}>
							<DocumentationTabs />
						</TabPanel>
					</MainCard>
				</Grid>
			</Grid>

			{/* Edit Worker Dialog */}
			<EditWorkerDialog
				open={editDialog.open}
				workerType={editDialog.workerType}
				config={editDialog.config}
				onClose={() => setEditDialog({ open: false, workerType: null, config: null })}
				onSave={handleSaveWorkerConfig}
				loading={actionLoading}
			/>

			{/* Manager Cron Edit Dialog */}
			<Dialog open={managerCronDialog.open} onClose={() => setManagerCronDialog({ open: false, value: "" })} maxWidth="sm" fullWidth>
				<DialogTitle>Editar frecuencia del Manager</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ pt: 1 }}>
						<Alert severity="info" variant="outlined">
							El cambio se guarda inmediatamente, pero requiere reiniciar el proceso PM2 <code>pjcatamarca-workers-manager</code> en producción para aplicar.
						</Alert>
						<CronSelector
							label="Frecuencia"
							value={managerCronDialog.value}
							onChange={(v) => setManagerCronDialog({ ...managerCronDialog, value: v })}
							helperText="Cuándo corre el ciclo del manager (escalar workers, capturar recursos, monitoreo)"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setManagerCronDialog({ open: false, value: "" })} disabled={actionLoading}>
						Cancelar
					</Button>
					<Button
						variant="contained"
						onClick={() => handleSaveManagerCron(managerCronDialog.value)}
						disabled={actionLoading || !managerCronDialog.value.trim()}
					>
						{actionLoading ? <CircularProgress size={20} /> : "Guardar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar for notifications */}
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
			>
				<Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
};

export default PjCatamarcaWorkersConfig;
