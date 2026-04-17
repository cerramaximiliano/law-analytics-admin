import { useEffect, useState, useCallback } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { TickCircle, Warning2, Refresh, Setting2, Clock, Calendar1, Play } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { fetchTrabajoConfig, updateTrabajoConfig, triggerWorkerRun } from "store/reducers/seclo";
import { useDispatch } from "store";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
	if (!d) return "—";
	return new Date(d).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ── Cron selector ─────────────────────────────────────────────────────────────

const CRON_PRESETS: Array<{ label: string; value: string }> = [
	{ label: "Cada 5 minutos", value: "*/5 * * * *" },
	{ label: "Cada 10 minutos", value: "*/10 * * * *" },
	{ label: "Cada 15 minutos", value: "*/15 * * * *" },
	{ label: "Cada 30 minutos", value: "*/30 * * * *" },
	{ label: "Cada hora", value: "0 * * * *" },
	{ label: "Cada 2 horas", value: "0 */2 * * *" },
	{ label: "Cada 4 horas", value: "0 */4 * * *" },
	{ label: "Cada 6 horas", value: "0 */6 * * *" },
	{ label: "Cada 12 horas", value: "0 */12 * * *" },
	{ label: "Una vez al día", value: "0 0 * * *" },
];

const CUSTOM_VALUE = "__custom__";

interface CronSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

function CronSelector({ value, onChange }: CronSelectorProps) {
	const isCustom = !CRON_PRESETS.some((p) => p.value === value);
	const selectValue = isCustom ? CUSTOM_VALUE : value;

	const handleSelect = (v: string) => {
		if (v !== CUSTOM_VALUE) onChange(v);
		else onChange(value); // mantener el valor actual al pasar a custom
	};

	return (
		<Stack spacing={1}>
			<FormControl fullWidth size="small">
				<InputLabel>Frecuencia</InputLabel>
				<Select value={selectValue} label="Frecuencia" onChange={(e) => handleSelect(e.target.value)}>
					{CRON_PRESETS.map((p) => (
						<MenuItem key={p.value} value={p.value}>
							{p.label}
						</MenuItem>
					))}
					<MenuItem value={CUSTOM_VALUE}>
						<em>Personalizado (avanzado)</em>
					</MenuItem>
				</Select>
			</FormControl>
			<Collapse in={isCustom}>
				<TextField
					fullWidth
					size="small"
					label="Expresión cron"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder="*/10 * * * *"
					helperText="Formato cron estándar: minuto hora día-mes mes día-semana"
					sx={{ bgcolor: alpha("#000", 0.02) }}
				/>
			</Collapse>
			<Typography variant="caption" color="text.secondary">
				Los cambios se aplican automáticamente en ≤ 60 segundos sin reiniciar el proceso.
			</Typography>
		</Stack>
	);
}

// ── Worker card ────────────────────────────────────────────────────────────────

interface WorkerCardProps {
	name: string;
	label: string;
	description: string;
	scheduleMode: "24/7" | "working-hours";
	config: { enabled: boolean; cronPattern: string; consecutiveErrors?: number; disabledByCircuitBreaker?: boolean };
	stats: {
		lastRunAt?: string | null;
		lastRunStatus?: string;
		lastRunOk?: number;
		lastRunErrors?: number;
		totalProcessed?: number;
		totalErrors?: number;
	};
	onChange: (field: string, value: any) => void;
	onRun: () => void;
}

function WorkerCard({ name, label, description, scheduleMode, config, stats, onChange, onRun }: WorkerCardProps) {
	const theme = useTheme();
	const [running, setRunning] = useState(false);
	const statusColor: Record<string, string> = {
		completed: theme.palette.success.main,
		error: theme.palette.error.main,
		running: theme.palette.info.main,
		idle: theme.palette.text.disabled,
	};
	const lastStatus = stats.lastRunStatus || "idle";

	const handleRun = async () => {
		setRunning(true);
		try {
			await onRun();
		} finally {
			setRunning(false);
		}
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, borderColor: config.disabledByCircuitBreaker ? "error.main" : undefined }}>
			{config.disabledByCircuitBreaker && (
				<Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
					Circuit breaker activo — deshabilitado tras {config.consecutiveErrors ?? 0} errores consecutivos. Corrige el problema y vuelve a
					habilitar.
				</Alert>
			)}
			<Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
				<Box>
					<Box display="flex" alignItems="center" gap={1} mb={0.25}>
						<Typography variant="subtitle1" fontWeight={600}>
							{label}
						</Typography>
						<Chip
							label={scheduleMode === "working-hours" ? "Respeta horario" : "24/7"}
							size="small"
							color={scheduleMode === "working-hours" ? "info" : "default"}
							icon={scheduleMode === "working-hours" ? <Calendar1 size={12} /> : <Clock size={12} />}
						/>
					</Box>
					<Typography variant="body2" color="text.secondary">
						{description}
					</Typography>
				</Box>
				<Box display="flex" alignItems="center" gap={1}>
					<Tooltip title="Ejecutar ciclo manualmente (en ≤ 10 segundos)">
						<span>
							<Button
								size="small"
								variant="outlined"
								color="primary"
								startIcon={running ? <CircularProgress size={14} /> : <Play size={14} />}
								onClick={handleRun}
								disabled={running}
								sx={{ minWidth: 120 }}
							>
								Ejecutar ahora
							</Button>
						</span>
					</Tooltip>
					<FormControlLabel
						control={
							<Switch checked={config.enabled} onChange={(e) => onChange(`workers.${name}.enabled`, e.target.checked)} color="primary" />
						}
						label={config.enabled ? "Activo" : "Pausado"}
						labelPlacement="start"
						sx={{ ml: 0, mr: 0, gap: 1 }}
					/>
				</Box>
			</Box>

			<Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
				<Box>
					<Typography variant="caption" color="text.secondary">
						Último ciclo
					</Typography>
					<Typography variant="body2">{fmtDate(stats.lastRunAt)}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Estado
					</Typography>
					<Box display="flex" alignItems="center" gap={0.5}>
						<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusColor[lastStatus] || statusColor.idle }} />
						<Typography variant="body2" sx={{ textTransform: "capitalize" }}>
							{lastStatus}
						</Typography>
					</Box>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Último ok / errores
					</Typography>
					<Typography variant="body2">
						<Box component="span" color="success.main">
							{stats.lastRunOk ?? 0}
						</Box>
						{" / "}
						<Box component="span" color={(stats.lastRunErrors ?? 0) > 0 ? "error.main" : "text.secondary"}>
							{stats.lastRunErrors ?? 0}
						</Box>
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Total procesados
					</Typography>
					<Typography variant="body2">{(stats.totalProcessed ?? 0).toLocaleString("es-AR")}</Typography>
				</Box>
			</Stack>

			<CronSelector value={config.cronPattern || "*/10 * * * *"} onChange={(v) => onChange(`workers.${name}.cronPattern`, v)} />
		</Paper>
	);
}

// ── Página principal ───────────────────────────────────────────────────────────

interface WorkerEntry {
	enabled: boolean;
	cronPattern: string;
	consecutiveErrors?: number;
	disabledByCircuitBreaker?: boolean;
}

interface TrabajoConfig {
	enabled: boolean;
	heartbeatAt?: string | null;
	workers: {
		envio: WorkerEntry;
		verificar: WorkerEntry;
		agenda: WorkerEntry;
		postAudiencia: WorkerEntry;
	};
	workingDays: number[];
	workingHours: { start: string; end: string };
	maxUsersPerCycle: number;
	navigationTimeoutMs: number;
	actionDelayMs: number;
	delayBetweenRequests: number;
	headless: boolean;
	retry: { maxAttempts: number; delayMs: number };
	stats: {
		envio: any;
		verificar: any;
		agenda: any;
		postAudiencia: any;
	};
	updatedAt?: string;
}

const DEFAULT_CONFIG: TrabajoConfig = {
	enabled: true,
	workers: {
		envio: { enabled: true, cronPattern: "0 */6 * * *" },
		verificar: { enabled: true, cronPattern: "0 */2 * * *" },
		agenda: { enabled: true, cronPattern: "*/10 * * * *" },
		postAudiencia: { enabled: true, cronPattern: "0 * * * *" },
	},
	workingDays: [1, 2, 3, 4, 5],
	workingHours: { start: "08:00", end: "20:00" },
	maxUsersPerCycle: 10,
	navigationTimeoutMs: 30000,
	actionDelayMs: 1500,
	delayBetweenRequests: 5000,
	headless: true,
	retry: { maxAttempts: 3, delayMs: 5000 },
	stats: { envio: {}, verificar: {}, agenda: {}, postAudiencia: {} },
};

export default function WorkersSecloPage() {
	const dispatch = useDispatch();
	const { enqueueSnackbar } = useSnackbar();

	const [config, setConfig] = useState<TrabajoConfig>(DEFAULT_CONFIG);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadConfig = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await dispatch(fetchTrabajoConfig());
			if (data)
				setConfig({
					...DEFAULT_CONFIG,
					...data,
					workers: { ...DEFAULT_CONFIG.workers, ...(data.workers || {}) },
					stats: { ...DEFAULT_CONFIG.stats, ...(data.stats || {}) },
				});
		} catch (err: any) {
			setError(err.message || "Error cargando configuración");
		} finally {
			setLoading(false);
		}
	}, [dispatch]);

	useEffect(() => {
		loadConfig();
	}, [loadConfig]);

	const handleChange = (path: string, value: any) => {
		setConfig((prev) => {
			const next = { ...prev };
			const parts = path.split(".");
			let obj: any = next;
			for (let i = 0; i < parts.length - 1; i++) {
				obj[parts[i]] = { ...(obj[parts[i]] || {}) };
				obj = obj[parts[i]];
			}
			obj[parts[parts.length - 1]] = value;
			return next;
		});
	};

	const handleToggleDay = (day: number) => {
		setConfig((prev) => {
			const days = prev.workingDays.includes(day) ? prev.workingDays.filter((d) => d !== day) : [...prev.workingDays, day].sort();
			return { ...prev, workingDays: days };
		});
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const result = await dispatch(
				updateTrabajoConfig({
					enabled: config.enabled,
					workers: config.workers,
					workingDays: config.workingDays,
					workingHours: config.workingHours,
					maxUsersPerCycle: config.maxUsersPerCycle,
					navigationTimeoutMs: config.navigationTimeoutMs,
					actionDelayMs: config.actionDelayMs,
					delayBetweenRequests: config.delayBetweenRequests,
					headless: config.headless,
					retry: config.retry,
				}),
			);
			if (result) {
				setConfig({
					...DEFAULT_CONFIG,
					...result,
					workers: { ...DEFAULT_CONFIG.workers, ...(result.workers || {}) },
					stats: { ...DEFAULT_CONFIG.stats, ...(result.stats || {}) },
				});
				enqueueSnackbar("Configuración guardada", { variant: "success" });
			} else {
				enqueueSnackbar("Error al guardar", { variant: "error" });
			}
		} catch (err: any) {
			enqueueSnackbar(err.message || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<MainCard title="Workers SECLO">
				<Box display="flex" justifyContent="center" py={8}>
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	const WORKERS: Array<{
		name: keyof TrabajoConfig["workers"];
		label: string;
		description: string;
		scheduleMode: "24/7" | "working-hours";
	}> = [
		{ name: "envio", label: "Worker de Envío", description: "Toma solicitudes pending y las envía al portal SECLO", scheduleMode: "24/7" },
		{
			name: "verificar",
			label: "Worker de Verificación",
			description: "Verifica solicitudes submitted: obtiene expediente, audiencia y constancia",
			scheduleMode: "working-hours",
		},
		{
			name: "agenda",
			label: "Worker de Agenda",
			description: "Extrae datos del conciliador, crea evento en calendario y envía email",
			scheduleMode: "working-hours",
		},
		{
			name: "postAudiencia",
			label: "Worker Post-Audiencia",
			description: "Detecta nuevas audiencias asignadas luego de que la fecha de la última audiencia ha pasado",
			scheduleMode: "24/7",
		},
	];

	return (
		<MainCard
			title="Workers SECLO"
			secondary={
				<Box display="flex" gap={1}>
					<Button size="small" startIcon={<Refresh size={16} />} onClick={loadConfig} disabled={loading}>
						Actualizar
					</Button>
					<Button size="small" variant="contained" onClick={handleSave} disabled={saving}>
						{saving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
						Guardar cambios
					</Button>
				</Box>
			}
		>
			{error && (
				<Alert severity="error" sx={{ mb: 2 }}>
					{error}
				</Alert>
			)}

			<Stack spacing={3}>
				{/* Habilitación global */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Box display="flex" alignItems="center" justifyContent="space-between">
						<Box>
							<Typography variant="subtitle1" fontWeight={600}>
								Estado global del sistema
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Cuando está deshabilitado, ningún worker procesa solicitudes aunque sus crons estén activos.
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={1}>
							{/* Heartbeat indicator */}
							{(() => {
								if (!config.heartbeatAt)
									return (
										<Tooltip title="Manager no reporta heartbeat — puede estar detenido">
											<Chip label="Manager offline" color="default" size="small" icon={<Warning2 size={14} />} />
										</Tooltip>
									);
								const ageMs = Date.now() - new Date(config.heartbeatAt).getTime();
								const isAlive = ageMs < 2 * 60 * 1000; // 2 minutos
								return (
									<Tooltip
										title={
											isAlive
												? `Último heartbeat: ${fmtDate(config.heartbeatAt)}`
												: `Manager sin respuesta desde ${fmtDate(config.heartbeatAt)}`
										}
									>
										<Chip
											label={isAlive ? "Manager activo" : "Manager sin respuesta"}
											color={isAlive ? "success" : "warning"}
											size="small"
											icon={isAlive ? <TickCircle size={14} /> : <Warning2 size={14} />}
										/>
									</Tooltip>
								);
							})()}
							<Divider orientation="vertical" flexItem />
							{config.enabled ? (
								<Chip icon={<TickCircle size={14} />} label="Habilitado" color="success" size="small" />
							) : (
								<Chip icon={<Warning2 size={14} />} label="Deshabilitado" color="error" size="small" />
							)}
							<Switch checked={config.enabled} onChange={(e) => handleChange("enabled", e.target.checked)} color="primary" />
						</Box>
					</Box>
					{config.updatedAt && (
						<Typography variant="caption" color="text.secondary" mt={1} display="block">
							Última actualización: {fmtDate(config.updatedAt)}
						</Typography>
					)}
				</Paper>

				{/* Workers individuales */}
				<Box>
					<Typography variant="subtitle2" color="text.secondary" mb={1.5} display="flex" alignItems="center" gap={0.5}>
						<Setting2 size={16} /> Configuración de workers
					</Typography>
					<Stack spacing={2}>
						{WORKERS.map((w) => (
							<WorkerCard
								key={w.name}
								name={w.name}
								label={w.label}
								description={w.description}
								scheduleMode={w.scheduleMode}
								config={config.workers[w.name]}
								stats={config.stats?.[w.name] || {}}
								onChange={(field, value) => handleChange(field, value)}
								onRun={() => dispatch(triggerWorkerRun(w.name))}
							/>
						))}
					</Stack>
				</Box>

				{/* Horario de trabajo */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle1" fontWeight={600} mb={1.5} display="flex" alignItems="center" gap={0.5}>
						<Calendar1 size={16} /> Horario de trabajo
					</Typography>
					<Typography variant="body2" color="text.secondary" mb={2}>
						Aplica únicamente a los workers <strong>verificar</strong> y <strong>agenda</strong> (hora Argentina, UTC-3). Los workers{" "}
						<strong>envío</strong> y <strong>post-audiencia</strong> corren 24/7 y no son afectados por esta configuración.
					</Typography>
					<Stack spacing={2}>
						<Box>
							<Typography variant="caption" color="text.secondary" mb={1} display="block">
								Días habilitados
							</Typography>
							<Box display="flex" gap={1} flexWrap="wrap">
								{DAY_LABELS.map((day, idx) => (
									<Chip
										key={idx}
										label={day}
										onClick={() => handleToggleDay(idx)}
										color={config.workingDays.includes(idx) ? "primary" : "default"}
										variant={config.workingDays.includes(idx) ? "filled" : "outlined"}
										size="small"
										sx={{ cursor: "pointer", minWidth: 48 }}
									/>
								))}
							</Box>
						</Box>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<TextField
									fullWidth
									size="small"
									label="Hora inicio"
									type="time"
									value={config.workingHours.start}
									onChange={(e) => handleChange("workingHours.start", e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>
							<Grid item xs={6} sm={3}>
								<TextField
									fullWidth
									size="small"
									label="Hora fin"
									type="time"
									value={config.workingHours.end}
									onChange={(e) => handleChange("workingHours.end", e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>
						</Grid>
					</Stack>
				</Paper>

				{/* Parámetros de operación */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="subtitle1" fontWeight={600} mb={1.5} display="flex" alignItems="center" gap={0.5}>
						<Clock size={16} /> Parámetros de operación
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Solicitudes por ciclo"
								type="number"
								value={config.maxUsersPerCycle}
								onChange={(e) => handleChange("maxUsersPerCycle", Number(e.target.value))}
								inputProps={{ min: 1, max: 50 }}
								helperText="Máximo de solicitudes procesadas por ciclo"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Timeout navegación (ms)"
								type="number"
								value={config.navigationTimeoutMs}
								onChange={(e) => handleChange("navigationTimeoutMs", Number(e.target.value))}
								inputProps={{ min: 5000, max: 120000, step: 1000 }}
								helperText="Timeout de carga de página"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Demora entre acciones (ms)"
								type="number"
								value={config.actionDelayMs}
								onChange={(e) => handleChange("actionDelayMs", Number(e.target.value))}
								inputProps={{ min: 500, max: 10000, step: 500 }}
								helperText="Espera entre clicks/acciones"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Demora entre solicitudes (ms)"
								type="number"
								value={config.delayBetweenRequests}
								onChange={(e) => handleChange("delayBetweenRequests", Number(e.target.value))}
								inputProps={{ min: 1000, max: 30000, step: 1000 }}
								helperText="Espera entre solicitudes del ciclo"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Max reintentos"
								type="number"
								value={config.retry.maxAttempts}
								onChange={(e) => handleChange("retry.maxAttempts", Number(e.target.value))}
								inputProps={{ min: 1, max: 10 }}
								helperText="Reintentos ante error"
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Demora entre reintentos (ms)"
								type="number"
								value={config.retry.delayMs}
								onChange={(e) => handleChange("retry.delayMs", Number(e.target.value))}
								inputProps={{ min: 1000, max: 60000, step: 1000 }}
							/>
						</Grid>
					</Grid>

					<Divider sx={{ my: 2 }} />

					<FormControlLabel
						control={<Switch checked={config.headless} onChange={(e) => handleChange("headless", e.target.checked)} />}
						label={
							<Box>
								<Typography variant="body2" fontWeight={500}>
									Modo headless
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Cuando está activo, Puppeteer corre sin interfaz gráfica (recomendado en producción)
								</Typography>
							</Box>
						}
					/>
				</Paper>
			</Stack>
		</MainCard>
	);
}
