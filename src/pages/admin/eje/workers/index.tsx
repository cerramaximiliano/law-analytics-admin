/**
 * EJE Workers Configuration Page
 * Comprehensive dashboard for managing EJE workers with separate tabs for each worker type
 */
import React, { useState, useEffect, useCallback } from "react";
import { useTabIndexParam } from "hooks/useTabParam";
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
	MenuItem,
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
import CronSelector from "components/admin/CronSelector";
import CrossViewPair from "components/admin/CrossViewLink";
import { useTheme, alpha } from "@mui/material/styles";
import DocumentationTabs from "./DocumentationTabs";
import configEje, {
	IAllWorkersResponse,
	IManagerWorkerConfig,
	IWorkerStatusDetail,
	EngineMode,
	IEngineStats,
	IDailyWorkerStats,
	IAlert,
	IEffectiveSchedule,
	IWorkerSchedule,
} from "api/configEje";

// ========== INTERFACES ==========

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

interface WorkerCardProps {
	workerType: "verification" | "update" | "stuck";
	config: IManagerWorkerConfig;
	status: IWorkerStatusDetail;
	effectiveSchedule?: IEffectiveSchedule;
	/** Umbral global (config.updateThresholdHours) — solo aplica al update worker. */
	updateThresholdHours?: number;
	onToggle: () => void;
	onEdit: () => void;
	loading?: boolean;
}

interface EditDialogProps {
	open: boolean;
	workerType: "verification" | "update" | "stuck" | null;
	config: IManagerWorkerConfig | null;
	onClose: () => void;
	/** Umbral global, editable desde el diálogo del update worker. */
	globalThresholdHours?: number;
	onSave: (updates: Partial<IManagerWorkerConfig> & { updateThresholdHours?: number }) => void;
	loading?: boolean;
}

// ========== HELPER COMPONENTS ==========

// Slugs del tab principal en la URL (?worker=...). El orden fija el índice de cada <Tab>.
const WORKER_SLUGS = ["verificacion", "actualizacion", "sistema", "estadisticas", "documentacion"] as const;
// Al cambiar de tab se limpia `tab`: el sub-tab del anterior no aplica al nuevo.
const WORKER_RESETS = ["tab"] as const;

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
// Motor de datos: modo configurado vs. lo que el worker usó de verdad
// (currentState.workers.X.engine, reportado al cierre de cada ciclo).
const ENGINE_LABEL: Record<string, string> = { auto: "Auto", api: "Solo API", scraper: "Solo scraping" };
const EngineBadge = ({ configured, stats }: { configured?: EngineMode; stats?: IEngineStats }) => {
	const mode = configured || "auto";
	const apiOk = stats?.apiOk || 0;
	const fallbacks = stats?.fallbacks || 0;
	const scraperCalls = stats?.scraperCalls || 0;
	const total = apiOk + fallbacks + scraperCalls;
	const degraded = mode === "auto" && fallbacks > 0;
	const fmt = (d?: string) => (d ? new Date(d).toLocaleString("es-AR") : "-");
	const tooltip = stats?.reportedAt
		? `Desde ${stats.since ? fmt(stats.since) : "el arranque"}: ${apiOk} por API · ${fallbacks} fallback${fallbacks === 1 ? "" : "s"} a scraping · ${scraperCalls} por scraping` +
		  (stats.lastFallbackAt ? `\nÚltimo fallback ${fmt(stats.lastFallbackAt)}: ${stats.lastFallbackReason || "-"}` : "") +
		  `\nReportado ${fmt(stats.reportedAt)}`
		: "El worker todavía no reportó estadísticas del motor (se informan al cierre de cada ciclo)";
	const usedLabel = !stats?.reportedAt
		? "sin datos"
		: total === 0
		? "sin llamadas"
		: stats?.lastEngineUsed === "scraper"
		? "usando scraping"
		: fallbacks > 0
		? `API · ${fallbacks} fallback${fallbacks === 1 ? "" : "s"}`
		: "usando API";
	const color: "default" | "success" | "warning" = !stats?.reportedAt ? "default" : degraded || stats?.lastEngineUsed === "scraper" ? "warning" : "success";
	return (
		<Tooltip title={<span style={{ whiteSpace: "pre-line" }}>{tooltip}</span>}>
			<Stack direction="row" spacing={0.5} alignItems="center">
				<Chip label={ENGINE_LABEL[mode] || mode} size="small" variant="outlined" />
				<Chip label={usedLabel} size="small" color={color} />
			</Stack>
		</Tooltip>
	);
};

const WorkerCard: React.FC<WorkerCardProps> = ({ workerType, config, status, effectiveSchedule, updateThresholdHours, onToggle, onEdit, loading }) => {
	const theme = useTheme();

	const workerLabels: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
		verification: {
			name: "Verificación",
			description: "Verifica que los expedientes existen en el sistema EJE",
			icon: <SearchNormal1 size={24} />,
		},
		update: {
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
				borderColor: config?.enabled ? theme.palette.success.main : theme.palette.grey[300],
				borderWidth: config?.enabled ? 2 : 1,
			}}
		>
			<CardHeader
				avatar={
					<Box
						sx={{
							p: 1,
							borderRadius: 2,
							bgcolor: config?.enabled ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.grey[500], 0.1),
							color: config?.enabled ? theme.palette.success.main : theme.palette.grey[500],
						}}
					>
						{label.icon}
					</Box>
				}
				title={
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6" sx={{ fontWeight: 600, letterSpacing: -0.2 }}>
							{label.name}
						</Typography>
						<Chip
							size="small"
							label={config?.enabled ? "Activo" : "Inactivo"}
							color={config?.enabled ? "success" : "default"}
							sx={{ fontWeight: 600, letterSpacing: 0.3 }}
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
							{(workerType === "verification" || workerType === "update") && (
								<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<Typography variant="body2">Motor de datos:</Typography>
									<EngineBadge configured={config?.engine} stats={status?.engine} />
								</Box>
							)}
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
							{workerType === "update" && (
								<Box sx={{ display: "flex", justifyContent: "space-between" }}>
									<Typography variant="body2">Re-actualizar cada:</Typography>
									<Typography variant="body2" fontWeight="bold">
										{updateThresholdHours || 24}h
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
const EditWorkerDialog: React.FC<EditDialogProps> = ({ open, workerType, config, globalThresholdHours, onClose, onSave, loading }) => {
	const [formData, setFormData] = useState<
		Partial<IManagerWorkerConfig> & { schedule?: Partial<IWorkerSchedule>; updateThresholdHours?: number }
	>({});

	useEffect(() => {
		if (config) {
			setFormData({
				minWorkers: config.minWorkers,
				maxWorkers: config.maxWorkers,
				scaleUpThreshold: config.scaleUpThreshold,
				scaleDownThreshold: config.scaleDownThreshold,
				updateThresholdHours: globalThresholdHours,
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

	const handleChange = (field: keyof IManagerWorkerConfig | "updateThresholdHours") => (e: React.ChangeEvent<HTMLInputElement>) => {
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
					{workerType === "update" && (
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
								helperText="Horas antes de volver a actualizar un expediente (ajuste global del manager)"
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
					{(workerType === "verification" || workerType === "update") && (
						<Grid item xs={12}>
							<TextField
								select
								label="Motor de datos"
								fullWidth
								size="small"
								value={formData.engine || "auto"}
								onChange={(e) => setFormData((prev) => ({ ...prev, engine: e.target.value as EngineMode }))}
								helperText="Se aplica en el próximo ciclo, sin reinicio. Auto = API pública del portal con fallback a scraping (Puppeteer) si falla."
							>
								<MenuItem value="auto">Auto — API con fallback a scraping</MenuItem>
								<MenuItem value="api">Solo API (sin fallback)</MenuItem>
								<MenuItem value="scraper">Solo scraping (Puppeteer)</MenuItem>
							</TextField>
						</Grid>
					)}
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

const EjeWorkersConfig: React.FC = () => {
	const theme = useTheme();
	const [tabValue, setTabValue] = useTabIndexParam("worker", WORKER_SLUGS, { resets: WORKER_RESETS });
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
		workerType: "verification" | "update" | "stuck" | null;
		config: IManagerWorkerConfig | null;
	}>({
		open: false,
		workerType: null,
		config: null,
	});

	// Data states
	const [workersData, setWorkersData] = useState<IAllWorkersResponse | null>(null);
	const [todayStats, setTodayStats] = useState<IDailyWorkerStats[]>([]);
	const [alerts, setAlerts] = useState<IAlert[]>([]);
	const [mostrarAlertasViejas, setMostrarAlertasViejas] = useState(false);

	// Fetch all data
	const fetchData = useCallback(async () => {
		try {
			const [workersResponse, statsData, alertsData] = await Promise.all([
				configEje.getAllWorkersConfig(),
				configEje.getTodaySummary(),
				configEje.getAlerts(false),
			]);
			setWorkersData(workersResponse);
			setTodayStats(statsData);
			setAlerts(alertsData);
		} catch (error) {
			console.error("Error fetching EJE config:", error);
			setSnackbar({
				open: true,
				message: "Error cargando configuración EJE",
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

	const handleToggleWorker = async (workerType: "verification" | "update" | "stuck") => {
		setActionLoading(true);
		try {
			const result = await configEje.toggleWorker(workerType);
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
			const result = await configEje.toggleManager();
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

	const handleEditWorker = (workerType: "verification" | "update" | "stuck") => {
		const worker = workersData?.workers.find((w) => w.workerType === workerType);
		setEditDialog({
			open: true,
			workerType,
			config: worker?.config || null,
		});
	};

	const handleSaveWorkerConfig = async (updates: Partial<IManagerWorkerConfig> & { updateThresholdHours?: number }) => {
		if (!editDialog.workerType) return;

		setActionLoading(true);
		try {
			// El umbral vive a nivel manager (config.updateThresholdHours), no por worker:
			// se guarda por su propio endpoint. Ver docs del ajuste 2026-08-28.
			const { updateThresholdHours, ...workerUpdates } = updates;
			await configEje.updateWorkerConfig(editDialog.workerType, workerUpdates);
			if (updateThresholdHours !== undefined && editDialog.workerType === "update") {
				await configEje.updateGlobalSettings({ updateThresholdHours });
			}
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

	// "Alertas sin confirmar" ≠ "alertas activas ahora": nada las vence, así que
	// un incidente ya resuelto sigue apilado meses. Separar las últimas 24 h de
	// las anteriores y mostrar la antigüedad evita leer historia como presente.
	const VENTANA_ALERTA_RECIENTE_H = 24;
	const esAlertaReciente = (ts?: string) =>
		!!ts && Date.now() - new Date(ts).getTime() < VENTANA_ALERTA_RECIENTE_H * 3600 * 1000;
	const alertasRecientes = alerts.filter((a) => esAlertaReciente(a.timestamp));
	const alertasViejas = alerts.filter((a) => !esAlertaReciente(a.timestamp));

	const antiguedadAlerta = (ts?: string) => {
		if (!ts) return "sin fecha";
		const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
		if (min < 1) return "recién";
		if (min < 60) return `hace ${min} min`;
		const h = Math.floor(min / 60);
		if (h < 24) return `hace ${h} h`;
		const d = Math.floor(h / 24);
		return d === 1 ? "hace 1 día" : `hace ${d} días`;
	};

	const handleAcknowledgeAllAlerts = async () => {
		setActionLoading(true);
		try {
			const r = await configEje.acknowledgeAllAlerts();
			setAlerts([]);
			setMostrarAlertasViejas(false);
			setSnackbar({
				open: true,
				message: `${r.acknowledged} alerta(s) confirmada(s)`,
				severity: "success",
			});
		} catch (error) {
			setSnackbar({ open: true, message: "Error confirmando las alertas", severity: "error" });
		} finally {
			setActionLoading(false);
		}
	};

	const handleAcknowledgeAlert = async (alertId: string) => {
		try {
			await configEje.acknowledgeAlert(alertId);
			setAlerts((prev) => prev.filter((a) => (a._id ?? a.timestamp) !== alertId));
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
	const getWorkerData = (type: "verification" | "update" | "stuck") => {
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
						title="Workers EJE"
						secondary={
							<Stack direction="row" spacing={1} alignItems="center">
								<CrossViewPair side="worker" to="/admin/eje/verified-app" />
								<Chip
									label={workersData?.managerState.isRunning ? "Manager Activo" : "Manager Detenido"}
									color={workersData?.managerState.isRunning ? "success" : "error"}
									size="small"
								/>
								<Tooltip title={workersData?.managerState.isRunning ? "Detener Manager" : "Iniciar Manager"}>
									<IconButton onClick={handleToggleManager} disabled={actionLoading}>
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
									worker-cloud-01
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
									100.90.187.124
								</Box>
								<Tooltip title="5 procesos PM2 en worker-cloud-01: manager · verification · update · stuck · pending-selection-flusher">
									<Chip
										label="PM2: manager · verification · update · stuck · flusher"
										size="small"
										color="secondary"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
									/>
								</Tooltip>
								<Chip
									label="causas-eje · Atlas"
									size="small"
									color="info"
									variant="outlined"
									sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
								/>
								<Tooltip title="API REST en server principal, PM2 process: eje/api">
									<Chip
										label="eje.lawanalytics.app · API"
										size="small"
										color="default"
										variant="outlined"
										sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
									/>
								</Tooltip>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								Gestión de workers para el sistema EJE (Expediente Judicial Electrónico) - Verificación y Actualización de expedientes
							</Typography>
						</Stack>
					</MainCard>
				</Grid>

				{/* Quick Stats Cards */}
				<Grid item xs={12} sm={6} md={3}>
					<Card
						variant="outlined"
						sx={{
							borderColor: alpha(theme.palette.primary.main, 0.22),
							bgcolor: alpha(theme.palette.primary.main, 0.04),
							transition: "transform 220ms ease, border-color 220ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(theme.palette.primary.main, 0.36) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="h4" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "primary.main" }}>
										{summaryStats.processed}
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 0.2 }}>
										Procesados Hoy
									</Typography>
								</Box>
								<DocumentText1 size={32} color={theme.palette.primary.main} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card
						variant="outlined"
						sx={{
							borderColor: alpha(theme.palette.success.main, 0.22),
							bgcolor: alpha(theme.palette.success.main, 0.04),
							transition: "transform 220ms ease, border-color 220ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(theme.palette.success.main, 0.36) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="h4" sx={{ color: "success.main", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
										{summaryStats.success}
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 0.2 }}>
										Exitosos
									</Typography>
								</Box>
								<TickCircle size={32} color={theme.palette.success.main} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card
						variant="outlined"
						sx={{
							borderColor: alpha(theme.palette.error.main, 0.22),
							bgcolor: alpha(theme.palette.error.main, 0.04),
							transition: "transform 220ms ease, border-color 220ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(theme.palette.error.main, 0.36) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="h4" sx={{ color: "error.main", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
										{summaryStats.errors}
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 0.2 }}>
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
						variant="outlined"
						sx={{
							borderColor: alpha(theme.palette.info.main, 0.22),
							bgcolor: alpha(theme.palette.info.main, 0.04),
							transition: "transform 220ms ease, border-color 220ms ease",
							"&:hover": { transform: "translateY(-1px)", borderColor: alpha(theme.palette.info.main, 0.36) },
						}}
					>
						<CardContent>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="h4" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "info.main" }}>
										{(workersData?.managerState.systemResources?.cpuUsage || 0) * 100 < 1
											? "<1"
											: ((workersData?.managerState.systemResources?.cpuUsage || 0) * 100).toFixed(0)}
										%
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 0.2, fontVariantNumeric: "tabular-nums" }}>
										CPU / Memoria: {((workersData?.managerState.systemResources?.memoryUsage || 0) * 100).toFixed(0)}%
									</Typography>
								</Box>
								<Cpu size={32} color={theme.palette.info.main} />
							</Stack>
						</CardContent>
					</Card>
				</Grid>

				{/* Alerts */}
				{alerts.length > 0 && (
					<Grid item xs={12}>
						<Card
							variant="outlined"
							sx={{ borderColor: alertasRecientes.length > 0 ? theme.palette.warning.main : theme.palette.divider }}
						>
							<CardHeader
								title="Alertas sin confirmar"
								subheader={
									alertasRecientes.length > 0
										? `${alertasRecientes.length} en las últimas 24 h · ${alertasViejas.length} anteriores`
										: `Ninguna en las últimas 24 h · ${alertasViejas.length} anteriores`
								}
								avatar={
									<Warning2
										size={20}
										color={alertasRecientes.length > 0 ? theme.palette.warning.main : theme.palette.text.disabled}
									/>
								}
								action={
									<Button size="small" onClick={handleAcknowledgeAllAlerts} disabled={actionLoading}>
										Confirmar todas
									</Button>
								}
							/>
							<CardContent>
								<Stack spacing={1}>
									{(mostrarAlertasViejas ? alerts : alertasRecientes).map((alert, index) => (
										<Alert
											key={alert._id ?? alert.timestamp ?? index}
											severity={alert.type?.includes("high") || alert.type === "manager_stopped" ? "warning" : "info"}
											action={
												<Button size="small" onClick={() => handleAcknowledgeAlert(alert._id ?? alert.timestamp)}>
													Confirmar
												</Button>
											}
										>
											{alert.message}
											<Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
												· {antiguedadAlerta(alert.timestamp)}
											</Typography>
										</Alert>
									))}
									{alertasViejas.length > 0 && (
										<Button
											size="small"
											color="inherit"
											onClick={() => setMostrarAlertasViejas((v) => !v)}
											sx={{ alignSelf: "flex-start" }}
										>
											{mostrarAlertasViejas ? "Ocultar anteriores" : `Ver ${alertasViejas.length} anteriores`}
										</Button>
									)}
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
														worker-cloud-01
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
														100.90.187.124
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
										workerType="verification"
										config={getWorkerData("verification")?.config || ({} as IManagerWorkerConfig)}
										status={getWorkerData("verification")?.status || ({} as IWorkerStatusDetail)}
										effectiveSchedule={getWorkerData("verification")?.effectiveSchedule}
										updateThresholdHours={workersData?.globalSettings?.updateThresholdHours}
										onToggle={() => handleToggleWorker("verification")}
										onEdit={() => handleEditWorker("verification")}
										loading={actionLoading}
									/>
								</Grid>

								{/* Verification Stats */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Estadísticas de Hoy - Verificación" />
										<CardContent>
											{todayStats.filter((s) => s.workerType === "verification").length > 0 ? (
												<Stack spacing={1}>
													{todayStats
														.filter((s) => s.workerType === "verification")
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
															<TableCell align="right">{getWorkerData("verification")?.config?.workerName || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Límite de memoria</TableCell>
															<TableCell align="right">{getWorkerData("verification")?.config?.maxMemoryRestart || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Delay entre requests</TableCell>
															<TableCell align="right">{getWorkerData("verification")?.config?.delayBetweenRequests || 0} ms</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Reintentos máximos</TableCell>
															<TableCell align="right">{getWorkerData("verification")?.config?.maxRetries || 0}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Horario</TableCell>
															<TableCell align="right">
																{getWorkerData("verification")?.effectiveSchedule?.useGlobalSchedule
																	? "Usa horario global"
																	: `${getWorkerData("verification")?.effectiveSchedule?.workStartHour}:00 - ${
																			getWorkerData("verification")?.effectiveSchedule?.workEndHour
																	  }:00`}
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Días</TableCell>
															<TableCell align="right">
																{formatWorkDays(getWorkerData("verification")?.effectiveSchedule?.workDays)}
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
										workerType="update"
										config={getWorkerData("update")?.config || ({} as IManagerWorkerConfig)}
										status={getWorkerData("update")?.status || ({} as IWorkerStatusDetail)}
										effectiveSchedule={getWorkerData("update")?.effectiveSchedule}
										updateThresholdHours={workersData?.globalSettings?.updateThresholdHours}
										onToggle={() => handleToggleWorker("update")}
										onEdit={() => handleEditWorker("update")}
										loading={actionLoading}
									/>
								</Grid>

								{/* Update Stats */}
								<Grid item xs={12} md={6}>
									<Card variant="outlined">
										<CardHeader title="Estadísticas de Hoy - Actualización" />
										<CardContent>
											{todayStats.filter((s) => s.workerType === "update").length > 0 ? (
												<Stack spacing={1}>
													{todayStats
														.filter((s) => s.workerType === "update")
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
															<TableCell align="right">{getWorkerData("update")?.config?.workerName || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Límite de memoria</TableCell>
															<TableCell align="right">{getWorkerData("update")?.config?.maxMemoryRestart || "-"}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Re-actualizar cada</TableCell>
															<TableCell align="right">{workersData?.globalSettings?.updateThresholdHours || 24} horas</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Delay entre requests</TableCell>
															<TableCell align="right">{getWorkerData("update")?.config?.delayBetweenRequests || 0} ms</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Reintentos máximos</TableCell>
															<TableCell align="right">{getWorkerData("update")?.config?.maxRetries || 0}</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Horario</TableCell>
															<TableCell align="right">
																{getWorkerData("update")?.effectiveSchedule?.useGlobalSchedule
																	? "Usa horario global"
																	: `${getWorkerData("update")?.effectiveSchedule?.workStartHour}:00 - ${
																			getWorkerData("update")?.effectiveSchedule?.workEndHour
																	  }:00`}
															</TableCell>
														</TableRow>
														<TableRow>
															<TableCell>Días</TableCell>
															<TableCell align="right">{formatWorkDays(getWorkerData("update")?.effectiveSchedule?.workDays)}</TableCell>
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
										updateThresholdHours={workersData?.globalSettings?.updateThresholdHours}
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
				globalThresholdHours={workersData?.globalSettings?.updateThresholdHours}
				onClose={() => setEditDialog({ open: false, workerType: null, config: null })}
				onSave={handleSaveWorkerConfig}
				loading={actionLoading}
			/>

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

export default EjeWorkersConfig;
