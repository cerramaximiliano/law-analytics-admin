import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	Switch,
	FormControlLabel,
	TextField,
	Button,
	Chip,
	Alert,
	Skeleton,
	Divider,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Card,
	CardContent,
	LinearProgress,
	Tooltip,
	useTheme,
	alpha,
	Grid,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Setting2, Chart, ArrowUp, ArrowDown } from "iconsax-react";
import { useSnackbar } from "notistack";
import UpdateMovimientosService, {
	UpdateMovimientosWorkerConfig,
	UpdateMovimientosManagerConfig,
} from "api/updateMovimientos";

const FUERO_LABELS: Record<string, string> = { CIV: "Civil", CNT: "Trabajo", CSS: "Seg. Social", COM: "Comercial" };
const ALL_FUEROS = ["CIV", "CNT", "CSS", "COM"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function fmtDate(d?: string) {
	if (!d) return "-";
	return new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
	const theme = useTheme();
	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.03), minWidth: 110 }}>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>
				{typeof value === "number" ? value.toLocaleString("es-AR") : value}
			</Typography>
			<Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
			{sub && <Typography variant="caption" color="text.disabled" display="block">{sub}</Typography>}
		</Box>
	);
}

// ── Tab: Estado del Manager ───────────────────────────────────────────────────

function EstadoSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [manager, setManager] = useState<UpdateMovimientosManagerConfig | null>(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback(async () => {
		setLoading(true);
		try { setManager(await UpdateMovimientosService.getManagerConfig()); }
		catch { enqueueSnackbar("Error al cargar estado del manager", { variant: "error" }); }
		finally { setLoading(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

	if (loading) return <Stack spacing={2}>{[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={80} />)}</Stack>;
	if (!manager) return null;

	const state = manager.currentState;
	const resources = state?.resources;

	return (
		<Stack spacing={3}>
			{/* Resumen general */}
			<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
				<StatCard label="Causas pendientes" value={state?.totalPending ?? 0} color={theme.palette.warning.main} />
				{resources && (
					<>
						<StatCard label="CPU" value={`${(resources.cpuUsage * 100).toFixed(1)}%`} color={resources.cpuUsage > (manager.config.cpuThreshold ?? 0.75) ? theme.palette.error.main : theme.palette.success.main} />
						<StatCard label="Memoria" value={`${(resources.memoryUsage * 100).toFixed(1)}%`} color={resources.memoryUsage > (manager.config.memoryThreshold ?? 0.8) ? theme.palette.error.main : theme.palette.success.main} />
						<StatCard label="RAM libre" value={`${resources.freeMemoryMB} MB`} />
					</>
				)}
				{state?.timestamp && (
					<Box sx={{ ml: "auto" }}>
						<Typography variant="caption" color="text.secondary">Último ciclo: {fmtDate(state.timestamp)}</Typography>
						<Button size="small" startIcon={<Refresh size={14} />} onClick={load} sx={{ ml: 1 }}>Refrescar</Button>
					</Box>
				)}
			</Stack>

			<Divider />

			{/* Estado por fuero */}
			<Typography variant="subtitle2" fontWeight={600}>Estado por fuero</Typography>

			{Object.keys(state?.fueros ?? {}).length === 0 ? (
				<Alert severity="info">Sin datos de estado. El manager aún no ha ejecutado un ciclo.</Alert>
			) : (
				<Grid container spacing={2}>
					{Object.entries(state.fueros).map(([fuero, fs]) => (
						<Grid item xs={12} sm={6} md={3} key={fuero}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
										<Typography fontWeight={700}>{FUERO_LABELS[fuero] || fuero}</Typography>
										<Chip
											label={fs.current > 0 ? `${fs.current} worker${fs.current > 1 ? "s" : ""}` : "inactivo"}
											size="small"
											color={fs.current > 0 ? "success" : "default"}
											variant={fs.current > 0 ? "filled" : "outlined"}
										/>
									</Stack>
									<Typography variant="h5" fontWeight={700} color={theme.palette.warning.main}>
										{fs.pending.toLocaleString("es-AR")}
									</Typography>
									<Typography variant="caption" color="text.secondary">causas pendientes</Typography>
									<Box mt={1}>
										<Typography variant="caption" color="text.secondary">
											Óptimo: {fs.optimal} · {fs.action}
										</Typography>
									</Box>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			)}
		</Stack>
	);
}

// ── Tab: Configuración del Manager ────────────────────────────────────────────

function ManagerSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [manager, setManager] = useState<UpdateMovimientosManagerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [local, setLocal] = useState<Partial<UpdateMovimientosManagerConfig["config"]>>({});
	const [dirty, setDirty] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await UpdateMovimientosService.getManagerConfig();
			setManager(data); setLocal(data.config ?? {}); setDirty(false);
		} catch { enqueueSnackbar("Error al cargar configuración del manager", { variant: "error" }); }
		finally { setLoading(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

	function patch<K extends keyof UpdateMovimientosManagerConfig["config"]>(key: K, value: UpdateMovimientosManagerConfig["config"][K]) {
		setLocal(p => ({ ...p, [key]: value })); setDirty(true);
	}

	function toggleDay(day: number) {
		const cur = local.workDays ?? manager?.config.workDays ?? [1, 2, 3, 4, 5];
		patch("workDays", cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day].sort());
	}

	function toggleFuero(f: string) {
		const cur = local.fueros ?? manager?.config.fueros ?? ["CIV"];
		patch("fueros", cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f]);
	}

	async function save() {
		setSaving(true);
		try {
			const saved = await UpdateMovimientosService.updateManagerConfig(local);
			setManager(saved); setLocal(saved.config ?? {}); setDirty(false);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch { enqueueSnackbar("Error al guardar", { variant: "error" }); }
		finally { setSaving(false); }
	}

	if (loading) return <Stack spacing={2}>{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}</Stack>;

	const cfg = { ...manager?.config, ...local };

	return (
		<Stack spacing={3}>
			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField
					label="Intervalo de chequeo (ms)"
					type="number"
					value={cfg.checkInterval ?? 60000}
					onChange={e => patch("checkInterval", parseInt(e.target.value, 10))}
					helperText="Milisegundos entre ciclos de scaling"
					size="small" sx={{ flex: 1 }}
				/>
				<TextField
					label="Workers máximos"
					type="number"
					value={cfg.maxWorkers ?? 3}
					onChange={e => patch("maxWorkers", parseInt(e.target.value, 10))}
					helperText="Instancias máximas por fuero"
					size="small" inputProps={{ min: 1, max: 10 }} sx={{ flex: 1 }}
				/>
				<TextField
					label="Workers mínimos"
					type="number"
					value={cfg.minWorkers ?? 0}
					onChange={e => patch("minWorkers", parseInt(e.target.value, 10))}
					helperText="0 = apagar fuera de horario"
					size="small" inputProps={{ min: 0, max: 10 }} sx={{ flex: 1 }}
				/>
			</Stack>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField
					label="Umbral escalar arriba"
					type="number"
					value={cfg.scaleThreshold ?? 100}
					onChange={e => patch("scaleThreshold", parseInt(e.target.value, 10))}
					helperText="Pending > N → escalar al máximo"
					size="small" sx={{ flex: 1 }}
				/>
				<TextField
					label="Umbral escalar abajo"
					type="number"
					value={cfg.scaleDownThreshold ?? 10}
					onChange={e => patch("scaleDownThreshold", parseInt(e.target.value, 10))}
					helperText="Pending < N → reducir al mínimo"
					size="small" sx={{ flex: 1 }}
				/>
				<TextField
					label="Umbral CPU"
					type="number"
					value={cfg.cpuThreshold ?? 0.75}
					onChange={e => patch("cpuThreshold", parseFloat(e.target.value))}
					helperText="No escalar si CPU > N (0-1)"
					size="small" inputProps={{ min: 0, max: 1, step: 0.05 }} sx={{ flex: 1 }}
				/>
				<TextField
					label="Umbral memoria"
					type="number"
					value={cfg.memoryThreshold ?? 0.80}
					onChange={e => patch("memoryThreshold", parseFloat(e.target.value))}
					helperText="No escalar si memoria > N (0-1)"
					size="small" inputProps={{ min: 0, max: 1, step: 0.05 }} sx={{ flex: 1 }}
				/>
			</Stack>

			<Divider />
			<Typography variant="body2" fontWeight={600}>Horario laboral</Typography>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField
					label="Hora inicio"
					type="number"
					value={cfg.workStartHour ?? 7}
					onChange={e => patch("workStartHour", parseInt(e.target.value, 10))}
					helperText="Hora de inicio (0-23)"
					size="small" inputProps={{ min: 0, max: 23 }} sx={{ flex: 1 }}
				/>
				<TextField
					label="Hora fin"
					type="number"
					value={cfg.workEndHour ?? 23}
					onChange={e => patch("workEndHour", parseInt(e.target.value, 10))}
					helperText="Hora de fin (0-23, exclusivo)"
					size="small" inputProps={{ min: 0, max: 23 }} sx={{ flex: 1 }}
				/>
			</Stack>

			<Box>
				<Typography variant="body2" fontWeight={600} mb={1}>Días laborales</Typography>
				<Stack direction="row" spacing={1}>
					{DAY_LABELS.map((label, idx) => {
						const active = (cfg.workDays ?? [1, 2, 3, 4, 5]).includes(idx);
						return (
							<Chip
								key={idx}
								label={label}
								size="small"
								variant={active ? "filled" : "outlined"}
								color={active ? "primary" : "default"}
								onClick={() => toggleDay(idx)}
								sx={{ cursor: "pointer", minWidth: 42 }}
							/>
						);
					})}
				</Stack>
			</Box>

			<Divider />
			<Box>
				<Typography variant="body2" fontWeight={600} mb={1}>Fueros activos</Typography>
				<Stack direction="row" spacing={1}>
					{ALL_FUEROS.map(f => {
						const active = (cfg.fueros ?? ["CIV"]).includes(f);
						return (
							<Chip
								key={f}
								label={FUERO_LABELS[f] || f}
								size="small"
								variant={active ? "filled" : "outlined"}
								color={active ? "secondary" : "default"}
								onClick={() => toggleFuero(f)}
								sx={{ cursor: "pointer" }}
							/>
						);
					})}
				</Stack>
			</Box>

			<Stack direction="row" spacing={2} alignItems="center">
				<Button variant="contained" onClick={save} disabled={!dirty || saving} startIcon={<TickCircle size={18} />}>
					{saving ? "Guardando..." : "Guardar cambios"}
				</Button>
				{dirty && (
					<Button variant="outlined" color="inherit" onClick={() => { setLocal(manager?.config ?? {}); setDirty(false); }} startIcon={<CloseCircle size={18} />}>
						Descartar
					</Button>
				)}
				{dirty && <Alert severity="warning" sx={{ py: 0.5, px: 1 }}>Cambios sin guardar</Alert>}
			</Stack>
		</Stack>
	);
}

// ── Tab: Workers por fuero ────────────────────────────────────────────────────

function WorkersSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [configs, setConfigs] = useState<UpdateMovimientosWorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState<Record<string, boolean>>({});
	const [locals, setLocals] = useState<Record<string, Partial<UpdateMovimientosWorkerConfig>>>({});
	const [dirty, setDirty] = useState<Record<string, boolean>>({});

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await UpdateMovimientosService.getWorkerConfigs();
			setConfigs(data);
			const init: Record<string, Partial<UpdateMovimientosWorkerConfig>> = {};
			data.forEach(c => { init[c._id] = {}; });
			setLocals(init); setDirty({});
		} catch { enqueueSnackbar("Error al cargar workers", { variant: "error" }); }
		finally { setLoading(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

	function patchWorker(id: string, key: string, value: unknown) {
		setLocals(p => ({ ...p, [id]: { ...p[id], [key]: value } }));
		setDirty(p => ({ ...p, [id]: true }));
	}

	async function saveWorker(config: UpdateMovimientosWorkerConfig) {
		setSaving(p => ({ ...p, [config._id]: true }));
		try {
			const updated = await UpdateMovimientosService.updateWorkerConfig(config._id, locals[config._id] ?? {});
			setConfigs(prev => prev.map(c => c._id === config._id ? updated : c));
			setLocals(p => ({ ...p, [config._id]: {} }));
			setDirty(p => ({ ...p, [config._id]: false }));
			enqueueSnackbar(`Worker ${config.fuero} guardado`, { variant: "success" });
		} catch { enqueueSnackbar("Error al guardar", { variant: "error" }); }
		finally { setSaving(p => ({ ...p, [config._id]: false })); }
	}

	if (loading) return <Stack spacing={2}>{[...Array(2)].map((_, i) => <Skeleton key={i} variant="rounded" height={200} />)}</Stack>;

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="flex-end">
				<Button size="small" startIcon={<Refresh size={16} />} onClick={load} variant="outlined">Actualizar</Button>
			</Stack>

			{configs.length === 0 && (
				<Alert severity="info">No hay configuraciones de worker. Se crean automáticamente al iniciar el worker.</Alert>
			)}

			{configs.map(config => {
				const loc = locals[config._id] ?? {};
				const merged = { ...config, ...loc };
				const isDirty = dirty[config._id] ?? false;
				const isSaving = saving[config._id] ?? false;

				return (
					<Card key={config._id} variant="outlined" sx={{ borderColor: merged.enabled ? theme.palette.success.main : theme.palette.divider }}>
						<CardContent>
							<Stack spacing={2}>
								{/* Header */}
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Box>
										<Typography variant="h5" fontWeight={700}>{FUERO_LABELS[config.fuero] || config.fuero}</Typography>
										<Typography variant="caption" color="text.secondary">{config.worker_id}</Typography>
									</Box>
									<FormControlLabel
										control={
											<Switch
												checked={merged.enabled}
												onChange={e => patchWorker(config._id, "enabled", e.target.checked)}
												color="success"
											/>
										}
										label={
											<Typography variant="body2" fontWeight={600} color={merged.enabled ? "success.main" : "text.secondary"}>
												{merged.enabled ? "Habilitado" : "Deshabilitado"}
											</Typography>
										}
									/>
								</Stack>

								<Divider />

								{/* Stats hoy */}
								<Box>
									<Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>Hoy ({config.statsToday?.date || "-"})</Typography>
									<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
										<StatCard label="Procesadas" value={config.statsToday?.processed ?? 0} />
										<StatCard label="Exitosas" value={config.statsToday?.success ?? 0} color={theme.palette.success.main} />
										<StatCard label="Fallidas" value={config.statsToday?.failed ?? 0} color={config.statsToday?.failed ? theme.palette.error.main : undefined} />
										<StatCard label="Nuevos movs." value={config.statsToday?.newMovimientos ?? 0} color={theme.palette.info.main} />
									</Stack>
								</Box>

								{/* Progreso */}
								{config.updateProgress?.totalEligible > 0 && (
									<Box>
										<Stack direction="row" justifyContent="space-between" mb={0.5}>
											<Typography variant="caption" color="text.secondary">Progreso del ciclo</Typography>
											<Typography variant="caption" color="text.secondary">
												{config.updateProgress.processedToday}/{config.updateProgress.totalEligible} ({config.updateProgress.completionPercentage.toFixed(1)}%)
											</Typography>
										</Stack>
										<LinearProgress
											variant="determinate"
											value={Math.min(config.updateProgress.completionPercentage, 100)}
											sx={{ height: 6, borderRadius: 3 }}
										/>
									</Box>
								)}

								<Divider />

								{/* Config editable */}
								<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
									<TextField
										label="Timeout lock (min)"
										type="number"
										value={merged.lockTimeoutMinutes ?? 5}
										onChange={e => patchWorker(config._id, "lockTimeoutMinutes", parseInt(e.target.value, 10))}
										size="small" inputProps={{ min: 1, max: 60 }} sx={{ flex: 1 }}
									/>
									<FormControl size="small" sx={{ flex: 1 }}>
										<InputLabel>Proveedor captcha</InputLabel>
										<Select
											label="Proveedor captcha"
											value={merged.captcha?.defaultProvider ?? "capsolver"}
											onChange={e => patchWorker(config._id, "captcha", { ...merged.captcha, defaultProvider: e.target.value })}
										>
											<MenuItem value="capsolver">Capsolver</MenuItem>
											<MenuItem value="2captcha">2Captcha</MenuItem>
										</Select>
									</FormControl>
									<TextField
										label="Balance mínimo captcha"
										type="number"
										value={merged.captcha?.minimumBalance ?? 0.5}
										onChange={e => patchWorker(config._id, "captcha", { ...merged.captcha, minimumBalance: parseFloat(e.target.value) })}
										size="small" inputProps={{ min: 0, step: 0.1 }} sx={{ flex: 1 }}
									/>
								</Stack>

								<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
									<TextField
										label="Máx. errores consecutivos"
										type="number"
										value={merged.errorCooldown?.maxConsecutiveErrors ?? 3}
										onChange={e => patchWorker(config._id, "errorCooldown", { ...merged.errorCooldown, maxConsecutiveErrors: parseInt(e.target.value, 10) })}
										helperText="Errores antes de entrar en cooldown"
										size="small" inputProps={{ min: 1, max: 20 }} sx={{ flex: 1 }}
									/>
									<TextField
										label="Cooldown por errores (h)"
										type="number"
										value={merged.errorCooldown?.cooldownHours ?? 6}
										onChange={e => patchWorker(config._id, "errorCooldown", { ...merged.errorCooldown, cooldownHours: parseInt(e.target.value, 10) })}
										helperText="Horas de pausa tras errores consecutivos"
										size="small" inputProps={{ min: 1, max: 72 }} sx={{ flex: 1 }}
									/>
								</Stack>

								{/* Footer con acciones y stats totales */}
								<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
									<Stack direction="row" spacing={2} alignItems="center">
										<Button
											variant="contained"
											size="small"
											disabled={!isDirty || isSaving}
											onClick={() => saveWorker(config)}
											startIcon={<TickCircle size={16} />}
										>
											{isSaving ? "Guardando..." : "Guardar"}
										</Button>
										{isDirty && (
											<Button
												variant="outlined"
												size="small"
												color="inherit"
												onClick={() => { setLocals(p => ({ ...p, [config._id]: {} })); setDirty(p => ({ ...p, [config._id]: false })); }}
												startIcon={<CloseCircle size={16} />}
											>
												Descartar
											</Button>
										)}
									</Stack>
									<Stack direction="row" spacing={2}>
										<Tooltip title={`Éxitos: ${config.stats?.totalSuccess ?? 0} · Fallidas: ${config.stats?.totalFailed ?? 0}`}>
											<Typography variant="caption" color="text.secondary">
												Total: {(config.stats?.totalProcessed ?? 0).toLocaleString("es-AR")} procesadas
											</Typography>
										</Tooltip>
										<Typography variant="caption" color="text.secondary">
											Última: {fmtDate(config.stats?.lastRun)}
										</Typography>
									</Stack>
								</Stack>
							</Stack>
						</CardContent>
					</Card>
				);
			})}
		</Stack>
	);
}

// ── Componente principal ──────────────────────────────────────────────────────

const SECTIONS = [
	{ label: "Estado", value: "estado", icon: <Chart size={18} /> },
	{ label: "Manager", value: "manager", icon: <ArrowUp size={18} /> },
	{ label: "Workers", value: "workers", icon: <Setting2 size={18} /> },
];

export default function UpdateMovimientosWorkerTab() {
	const theme = useTheme();
	const [section, setSection] = useState("estado");

	return (
		<Stack spacing={3} sx={{ p: { xs: 2, md: 3 } }}>
			{/* Sub-tabs */}
			<Stack direction="row" spacing={1}>
				{SECTIONS.map(s => (
					<Button
						key={s.value}
						variant={section === s.value ? "contained" : "outlined"}
						size="small"
						startIcon={s.icon}
						onClick={() => setSection(s.value)}
						sx={{ textTransform: "none" }}
					>
						{s.label}
					</Button>
				))}
			</Stack>

			<Divider />

			{section === "estado" && <EstadoSection />}
			{section === "manager" && <ManagerSection />}
			{section === "workers" && <WorkersSection />}
		</Stack>
	);
}
