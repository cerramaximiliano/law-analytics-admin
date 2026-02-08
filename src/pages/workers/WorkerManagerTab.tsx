import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	TextField,
	Button,
	Stack,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Chip,
	Checkbox,
	FormControlLabel,
	FormGroup,
	Collapse,
	Tooltip,
	IconButton,
	Divider,
	LinearProgress,
} from "@mui/material";
import { Refresh, InfoCircle, TickCircle, CloseCircle, Warning2, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MEVWorkersService, {
	MEVManagerConfig,
	MEVManagerConfigSettings,
	MEVManagerCurrentState,
	MEVManagerAlert,
	MEVManagerStatsEntry,
} from "api/workersMEV";

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const WORKER_TYPES: ("verify" | "update")[] = ["verify", "update"];
const WORKER_LABELS: Record<string, string> = { verify: "Verificacion", update: "Actualizacion" };

export default function WorkerManagerTab() {
	const { enqueueSnackbar } = useSnackbar();

	// Estado
	const [loading, setLoading] = useState(true);
	const [config, setConfig] = useState<MEVManagerConfig | null>(null);
	const [status, setStatus] = useState<(MEVManagerCurrentState & { staleness: string; lastCycleAgo: string | null }) | null>(null);
	const [alerts, setAlerts] = useState<MEVManagerAlert[]>([]);
	const [stats, setStats] = useState<MEVManagerStatsEntry[]>([]);

	// Edicion de config
	const [editConfig, setEditConfig] = useState<Partial<MEVManagerConfigSettings>>({});
	const [saving, setSaving] = useState(false);

	// Secciones colapsables
	const [showConfig, setShowConfig] = useState(false);
	const [showAlerts, setShowAlerts] = useState(false);
	const [showStats, setShowStats] = useState(false);

	// Cargar datos
	const loadData = useCallback(async () => {
		try {
			setLoading(true);
			const [configRes, statusRes, alertsRes, statsRes] = await Promise.all([
				MEVWorkersService.getManagerConfig(),
				MEVWorkersService.getManagerStatus(),
				MEVWorkersService.getManagerAlerts(),
				MEVWorkersService.getManagerStats(24),
			]);

			setConfig(configRes.data);
			setStatus(statusRes.data);
			setAlerts(alertsRes.data);
			setStats(statsRes.data);

			// Inicializar form de edicion
			if (configRes.data?.config) {
				setEditConfig(JSON.parse(JSON.stringify(configRes.data.config)));
			}
		} catch (error: any) {
			enqueueSnackbar(error.message, { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Auto-refresh status cada 30s
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const statusRes = await MEVWorkersService.getManagerStatus();
				setStatus(statusRes.data);
			} catch {
				// silenciar errores de auto-refresh
			}
		}, 30000);
		return () => clearInterval(interval);
	}, []);

	// Guardar config
	const handleSave = async () => {
		try {
			setSaving(true);
			await MEVWorkersService.updateManagerSettings(editConfig);
			enqueueSnackbar("Configuracion actualizada", { variant: "success" });
			await loadData();
		} catch (error: any) {
			enqueueSnackbar(error.message, { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	// Reset config
	const handleReset = async () => {
		try {
			await MEVWorkersService.resetManagerToDefaults();
			enqueueSnackbar("Configuracion reseteada a defaults", { variant: "success" });
			await loadData();
		} catch (error: any) {
			enqueueSnackbar(error.message, { variant: "error" });
		}
	};

	// Reconocer alerta
	const handleAcknowledgeAlert = async (index: number) => {
		try {
			await MEVWorkersService.acknowledgeManagerAlert(index);
			enqueueSnackbar("Alerta reconocida", { variant: "success" });
			const alertsRes = await MEVWorkersService.getManagerAlerts();
			setAlerts(alertsRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message, { variant: "error" });
		}
	};

	// Helper: update nested edit config
	const updateNestedConfig = (path: string, value: any) => {
		setEditConfig((prev) => {
			const copy: any = JSON.parse(JSON.stringify(prev));
			const parts = path.split(".");
			let obj = copy;
			for (let i = 0; i < parts.length - 1; i++) {
				if (!obj[parts[i]]) obj[parts[i]] = {};
				obj = obj[parts[i]];
			}
			obj[parts[parts.length - 1]] = value;
			return copy;
		});
	};

	// Staleness chip
	const getStalenessChip = () => {
		if (!status) return null;
		const map: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
			active: { color: "success", label: "Activo" },
			delayed: { color: "warning", label: "Retrasado" },
			stale: { color: "error", label: "Inactivo" },
			unknown: { color: "default", label: "Desconocido" },
		};
		const info = map[status.staleness] || map.unknown;
		return <Chip size="small" color={info.color} label={info.label} />;
	};

	if (loading) {
		return (
			<Box>
				<Skeleton variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 1 }} />
			</Box>
		);
	}

	return (
		<Box>
			{/* ===== ESTADO ACTUAL ===== */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="h6">Estado del Manager</Typography>
						<Stack direction="row" spacing={1} alignItems="center">
							{getStalenessChip()}
							<Tooltip title="Refrescar">
								<IconButton size="small" onClick={loadData}>
									<Refresh size={18} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>

					{status && (
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Ultimo ciclo
								</Typography>
								<Typography variant="body2">{status.lastCycleAgo ? `hace ${status.lastCycleAgo}` : "Nunca"}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Ciclos totales
								</Typography>
								<Typography variant="body2">{status.cycleCount?.toLocaleString() || 0}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Horario laboral
								</Typography>
								<Typography variant="body2">
									{status.isWithinWorkingHours ? (
										<Chip size="small" color="success" label="Dentro" />
									) : (
										<Chip size="small" color="default" label="Fuera" />
									)}
								</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Recursos
								</Typography>
								<Typography variant="body2">
									CPU: {((status.systemResources?.cpuUsage || 0) * 100).toFixed(0)}% | RAM:{" "}
									{status.systemResources?.freeMemoryMB || 0}/{status.systemResources?.totalMemoryMB || 0} MB
								</Typography>
							</Grid>
						</Grid>
					)}

					{/* Tabla de workers */}
					{status && (
						<TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Worker</TableCell>
										<TableCell align="center">Activos</TableCell>
										<TableCell align="center">Pendientes</TableCell>
										<TableCell align="center">Optimo</TableCell>
										<TableCell align="center">Accion</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{WORKER_TYPES.map((type) => {
										const current = status.workers?.[type] || 0;
										const pending = status.pending?.[type] || 0;
										const optimal = status.optimalWorkers?.[type] || 0;
										const diff = optimal - current;
										return (
											<TableRow key={type}>
												<TableCell>
													<Typography variant="body2" fontWeight={600}>
														{WORKER_LABELS[type]}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Chip size="small" label={current} />
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2" color={pending > 0 ? "warning.main" : "text.secondary"}>
														{pending.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="center">{optimal}</TableCell>
												<TableCell align="center">
													{diff > 0 ? (
														<Chip size="small" color="success" label={`+${diff}`} icon={<ArrowUp2 size={14} />} />
													) : diff < 0 ? (
														<Chip size="small" color="error" label={`${diff}`} icon={<ArrowDown2 size={14} />} />
													) : (
														<Chip size="small" color="default" label="=" />
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</CardContent>
			</Card>

			{/* ===== CONFIGURACION (colapsable) ===== */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						onClick={() => setShowConfig(!showConfig)}
						sx={{ cursor: "pointer" }}
					>
						<Typography variant="h6">Configuracion</Typography>
						{showConfig ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
					</Stack>

					<Collapse in={showConfig}>
						<Box sx={{ mt: 2 }}>
							{/* Horario y general */}
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								General
							</Typography>
							<Grid container spacing={2} sx={{ mb: 3 }}>
								<Grid item xs={6} sm={3}>
									<TextField
										size="small"
										fullWidth
										label="Intervalo (ms)"
										type="number"
										value={(editConfig as any)?.checkInterval || 60000}
										onChange={(e) => updateNestedConfig("checkInterval", parseInt(e.target.value) || 60000)}
									/>
								</Grid>
								<Grid item xs={6} sm={3}>
									<TextField
										size="small"
										fullWidth
										label="Hora inicio"
										type="number"
										inputProps={{ min: 0, max: 23 }}
										value={(editConfig as any)?.workStartHour ?? 6}
										onChange={(e) => updateNestedConfig("workStartHour", parseInt(e.target.value) || 0)}
									/>
								</Grid>
								<Grid item xs={6} sm={3}>
									<TextField
										size="small"
										fullWidth
										label="Hora fin"
										type="number"
										inputProps={{ min: 0, max: 24 }}
										value={(editConfig as any)?.workEndHour ?? 22}
										onChange={(e) => updateNestedConfig("workEndHour", parseInt(e.target.value) || 0)}
									/>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Typography variant="caption" sx={{ mr: 0.5 }}>
											CPU:
										</Typography>
										<TextField
											size="small"
											type="number"
											inputProps={{ min: 0, max: 1, step: 0.05 }}
											value={(editConfig as any)?.cpuThreshold ?? 0.75}
											onChange={(e) => updateNestedConfig("cpuThreshold", parseFloat(e.target.value) || 0.75)}
											sx={{ width: 80 }}
										/>
									</Stack>
								</Grid>
							</Grid>

							{/* Dias laborales */}
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Dias laborales
							</Typography>
							<FormGroup row sx={{ mb: 3 }}>
								{DAY_LABELS.map((label, i) => (
									<FormControlLabel
										key={i}
										control={
											<Checkbox
												size="small"
												checked={((editConfig as any)?.workDays || [1, 2, 3, 4, 5]).includes(i)}
												onChange={(e) => {
													const current = (editConfig as any)?.workDays || [1, 2, 3, 4, 5];
													const updated = e.target.checked ? [...current, i].sort() : current.filter((d: number) => d !== i);
													updateNestedConfig("workDays", updated);
												}}
											/>
										}
										label={label}
									/>
								))}
							</FormGroup>

							{/* Tabla de configuracion por tipo de worker */}
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Configuracion por Worker
							</Typography>
							<TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Worker</TableCell>
											<TableCell align="center">Min</TableCell>
											<TableCell align="center">Max</TableCell>
											<TableCell align="center">Scale Up</TableCell>
											<TableCell align="center">Scale Down</TableCell>
											<TableCell align="center">Docs/Worker</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{WORKER_TYPES.map((type) => (
											<TableRow key={type}>
												<TableCell>
													<Typography variant="body2" fontWeight={600}>
														{WORKER_LABELS[type]}
													</Typography>
												</TableCell>
												{["minWorkers", "maxWorkers", "scaleThreshold", "scaleDownThreshold", "docsPerWorker"].map((field) => (
													<TableCell key={field} align="center">
														<TextField
															size="small"
															type="number"
															sx={{ width: 70 }}
															value={(editConfig as any)?.[field]?.[type] ?? ""}
															onChange={(e) => updateNestedConfig(`${field}.${type}`, parseInt(e.target.value) || 0)}
														/>
													</TableCell>
												))}
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>

							<Stack direction="row" spacing={2}>
								<Button variant="contained" size="small" onClick={handleSave} disabled={saving}>
									{saving ? "Guardando..." : "Guardar"}
								</Button>
								<Button variant="outlined" size="small" color="warning" onClick={handleReset}>
									Reset a defaults
								</Button>
							</Stack>
						</Box>
					</Collapse>
				</CardContent>
			</Card>

			{/* ===== ALERTAS (colapsable) ===== */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						onClick={() => setShowAlerts(!showAlerts)}
						sx={{ cursor: "pointer" }}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="h6">Alertas</Typography>
							{alerts.length > 0 && <Chip size="small" color="warning" label={alerts.length} />}
						</Stack>
						{showAlerts ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
					</Stack>

					<Collapse in={showAlerts}>
						<Box sx={{ mt: 2 }}>
							{alerts.length === 0 ? (
								<Typography variant="body2" color="text.secondary">
									Sin alertas activas
								</Typography>
							) : (
								<Stack spacing={1}>
									{alerts.map((alert, i) => (
										<Alert
											key={i}
											severity={alert.type.includes("error") || alert.type === "no_workers" ? "error" : "warning"}
											action={
												<Button size="small" onClick={() => handleAcknowledgeAlert(i)}>
													Reconocer
												</Button>
											}
										>
											<Typography variant="body2">
												<strong>{alert.workerType ? `[${WORKER_LABELS[alert.workerType]}] ` : ""}</strong>
												{alert.message}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{new Date(alert.createdAt).toLocaleString("es-AR")}
											</Typography>
										</Alert>
									))}
								</Stack>
							)}
						</Box>
					</Collapse>
				</CardContent>
			</Card>

			{/* ===== ESTADISTICAS (colapsable) ===== */}
			<Card>
				<CardContent>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						onClick={() => setShowStats(!showStats)}
						sx={{ cursor: "pointer" }}
					>
						<Typography variant="h6">Estadisticas (24h)</Typography>
						{showStats ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}
					</Stack>

					<Collapse in={showStats}>
						<Box sx={{ mt: 2 }}>
							{stats.length === 0 ? (
								<Typography variant="body2" color="text.secondary">
									Sin estadisticas disponibles
								</Typography>
							) : (
								<>
									{WORKER_TYPES.map((type) => {
										const typeStats = stats.filter((s) => s.workerType === type);
										if (typeStats.length === 0) return null;

										const totalCycles = typeStats.reduce((sum, s) => sum + s.managerCycles, 0);
										const totalScaleEvents = typeStats.reduce((sum, s) => sum + (s.scalingEvents?.length || 0), 0);
										const maxWorkers = Math.max(...typeStats.map((s) => s.stats.maxActiveWorkers || 0));
										const lastPending = typeStats[0]?.stats.pendingAtEnd;

										return (
											<Box key={type} sx={{ mb: 2 }}>
												<Typography variant="subtitle2" sx={{ mb: 1 }}>
													{WORKER_LABELS[type]}
												</Typography>
												<Grid container spacing={2}>
													<Grid item xs={3}>
														<Typography variant="caption" color="text.secondary">
															Ciclos
														</Typography>
														<Typography variant="body2">{totalCycles}</Typography>
													</Grid>
													<Grid item xs={3}>
														<Typography variant="caption" color="text.secondary">
															Eventos escalado
														</Typography>
														<Typography variant="body2">{totalScaleEvents}</Typography>
													</Grid>
													<Grid item xs={3}>
														<Typography variant="caption" color="text.secondary">
															Max workers
														</Typography>
														<Typography variant="body2">{maxWorkers}</Typography>
													</Grid>
													<Grid item xs={3}>
														<Typography variant="caption" color="text.secondary">
															Pendientes (ultimo)
														</Typography>
														<Typography variant="body2">{lastPending ?? "-"}</Typography>
													</Grid>
												</Grid>

												{/* Ultimos eventos de escalado */}
												{totalScaleEvents > 0 && (
													<Box sx={{ mt: 1 }}>
														<Typography variant="caption" color="text.secondary">
															Ultimos eventos de escalado:
														</Typography>
														{typeStats
															.flatMap((s) => s.scalingEvents || [])
															.slice(0, 5)
															.map((ev, j) => (
																<Typography key={j} variant="caption" display="block" sx={{ ml: 1 }}>
																	{new Date(ev.timestamp).toLocaleTimeString("es-AR")} - {ev.action}: {ev.from} → {ev.to} ({ev.reason})
																</Typography>
															))}
													</Box>
												)}
												<Divider sx={{ mt: 1 }} />
											</Box>
										);
									})}
								</>
							)}
						</Box>
					</Collapse>
				</CardContent>
			</Card>
		</Box>
	);
}
