import React, { useState } from "react";
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
	Chip,
	Collapse,
	IconButton,
	Tooltip,
	Divider,
	Checkbox,
	FormControlLabel,
	useTheme,
	alpha,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { ArrowDown2, ArrowUp2, TickCircle, Timer1, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerConfig, WorkerConfig, ScrapingManagerService } from "api/scrapingManager";

interface Props {
	config: ScrapingManagerConfig;
	onConfigUpdate: () => void;
}

const DAY_LABELS: Record<number, string> = {
	1: "Lun",
	2: "Mar",
	3: "Mié",
	4: "Jue",
	5: "Vie",
	6: "Sáb",
	7: "Dom",
};

const WORKER_LABELS: Record<string, string> = {
	"credentials-processor": "Verificación de Credenciales",
	"mis-causas": "Sync Completa (on-demand)",
	"update-sync": "Detección de Nuevas Causas",
	"private-causas-update": "Actualización de Movimientos",
};

const MisCausasWorkersTab: React.FC<Props> = ({ config, onConfigUpdate }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
	const [saving, setSaving] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Record<string, WorkerConfig>>({});

	const getEditValue = (workerName: string): WorkerConfig => {
		return editValues[workerName] || config.workers[workerName];
	};

	const setWorkerEdit = (workerName: string, updates: Partial<WorkerConfig>) => {
		const current = getEditValue(workerName);
		setEditValues((prev) => ({
			...prev,
			[workerName]: { ...current, ...updates },
		}));
	};

	const handleToggleEnabled = async (workerName: string) => {
		const current = getEditValue(workerName);
		try {
			await ScrapingManagerService.updateWorker(workerName, { enabled: !current.enabled });
			enqueueSnackbar(`Worker ${WORKER_LABELS[workerName]} ${!current.enabled ? "activado" : "desactivado"}`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			onConfigUpdate();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar estado", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleSaveWorker = async (workerName: string) => {
		const workerData = editValues[workerName];
		if (!workerData) return;

		try {
			setSaving(workerName);
			await ScrapingManagerService.updateWorker(workerName, {
				scaling: workerData.scaling,
				schedule: workerData.schedule,
				queue: workerData.queue,
				healthCheck: workerData.healthCheck,
			});
			enqueueSnackbar(`Worker ${WORKER_LABELS[workerName]} actualizado`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setEditValues((prev) => {
				const next = { ...prev };
				delete next[workerName];
				return next;
			});
			onConfigUpdate();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(null);
		}
	};

	const toggleDay = (workerName: string, day: number) => {
		const worker = getEditValue(workerName);
		const days = [...worker.schedule.workingDays];
		const idx = days.indexOf(day);
		if (idx >= 0) {
			days.splice(idx, 1);
		} else {
			days.push(day);
			days.sort((a, b) => a - b);
		}
		setWorkerEdit(workerName, {
			schedule: { ...worker.schedule, workingDays: days },
		});
	};

	return (
		<Stack spacing={2}>
			{/* Tabla resumen */}
			<Card variant="outlined">
				<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
					<Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
						Resumen de Workers
					</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Worker</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Estado</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Horario</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Instancias</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Scale Up</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Scale Down</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.entries(config.workers).map(([name, w]) => (
									<TableRow key={name} sx={{ "&:last-child td": { borderBottom: 0 } }}>
										<TableCell sx={{ fontSize: "0.8rem" }}>
											<Stack direction="row" spacing={0.5} alignItems="center">
												<Typography variant="body2" fontWeight={500}>{WORKER_LABELS[name] || name}</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													({name})
												</Typography>
											</Stack>
										</TableCell>
										<TableCell align="center">
											<Chip
												label={w.enabled ? "ON" : "OFF"}
												size="small"
												color={w.enabled ? "success" : "default"}
												sx={{ fontSize: "0.65rem", height: 20 }}
											/>
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
											{w.schedule.enabled
												? `${w.schedule.workingHoursStart} - ${w.schedule.workingHoursEnd}`
												: "24/7"}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.minInstances} - {w.scaling.maxInstances}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.scaleUpThreshold}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.scaleDownThreshold}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>

			{Object.entries(config.workers).map(([workerName, workerConfig]) => {
				const worker = getEditValue(workerName);
				const isExpanded = expandedWorker === workerName;
				const hasEdits = !!editValues[workerName];
				const isSaving = saving === workerName;

				return (
					<Card key={workerName} variant="outlined">
						<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
							{/* Header del worker */}
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
									<IconButton size="small" onClick={() => setExpandedWorker(isExpanded ? null : workerName)}>
										{isExpanded ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
									</IconButton>
									<Box sx={{ flex: 1 }}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="subtitle1" fontWeight="bold">
												{WORKER_LABELS[workerName] || workerName}
											</Typography>
											<Chip
												label={workerName}
												size="small"
												variant="outlined"
												sx={{ fontSize: "0.65rem", fontFamily: "monospace" }}
											/>
											<Chip
												label={worker.enabled ? "ON" : "OFF"}
												size="small"
												color={worker.enabled ? "success" : "default"}
												sx={{ fontSize: "0.65rem" }}
											/>
										</Stack>
										<Typography variant="caption" color="text.secondary">
											{worker.description}
										</Typography>
									</Box>
								</Stack>
								<Switch checked={worker.enabled} onChange={() => handleToggleEnabled(workerName)} color="success" size="small" />
							</Stack>

							{/* Contenido expandible */}
							<Collapse in={isExpanded}>
								<Divider sx={{ my: 2 }} />

								{/* Scaling */}
								<Box sx={{ mb: 3 }}>
									<Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
										Escalado
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={3}>
											<TextField
												label="Min Instancias"
												type="number"
												size="small"
												fullWidth
												value={worker.scaling.minInstances}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: { ...worker.scaling, minInstances: Number(e.target.value) },
													})
												}
												inputProps={{ min: 0, max: 10 }}
											/>
										</Grid>
										<Grid item xs={6} sm={3}>
											<TextField
												label="Max Instancias"
												type="number"
												size="small"
												fullWidth
												value={worker.scaling.maxInstances}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: { ...worker.scaling, maxInstances: Number(e.target.value) },
													})
												}
												inputProps={{ min: 1, max: 10 }}
											/>
										</Grid>
										<Grid item xs={6} sm={3}>
											<TextField
												label="Umbral Scale Up"
												type="number"
												size="small"
												fullWidth
												value={worker.scaling.scaleUpThreshold}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: { ...worker.scaling, scaleUpThreshold: Number(e.target.value) },
													})
												}
												helperText="Cola > umbral = agregar"
												inputProps={{ min: 1 }}
											/>
										</Grid>
										<Grid item xs={6} sm={3}>
											<TextField
												label="Umbral Scale Down"
												type="number"
												size="small"
												fullWidth
												value={worker.scaling.scaleDownThreshold}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: { ...worker.scaling, scaleDownThreshold: Number(e.target.value) },
													})
												}
												helperText="Cola < umbral = reducir"
												inputProps={{ min: 0 }}
											/>
										</Grid>
										<Grid item xs={6} sm={4}>
											<TextField
												label="Cooldown (seg)"
												type="number"
												size="small"
												fullWidth
												value={worker.scaling.cooldownMs / 1000}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: { ...worker.scaling, cooldownMs: Number(e.target.value) * 1000 },
													})
												}
												helperText="Espera entre escalados"
											/>
										</Grid>
									</Grid>
								</Box>

								{/* Schedule */}
								<Box sx={{ mb: 3 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<Typography variant="subtitle2" fontWeight="bold" color="primary">
											Horario
										</Typography>
										<Switch
											size="small"
											checked={worker.schedule.enabled}
											onChange={(e) =>
												setWorkerEdit(workerName, {
													schedule: { ...worker.schedule, enabled: e.target.checked },
												})
											}
										/>
										<Typography variant="caption" color="text.secondary">
											{worker.schedule.enabled ? "Restricción activa" : "24/7 (sin restricción)"}
										</Typography>
									</Stack>
									{worker.schedule.enabled && (
										<Grid container spacing={2}>
											<Grid item xs={12} sm={6}>
												<Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
													{[1, 2, 3, 4, 5, 6, 7].map((day) => (
														<Chip
															key={day}
															label={DAY_LABELS[day]}
															size="small"
															color={worker.schedule.workingDays.includes(day) ? "primary" : "default"}
															variant={worker.schedule.workingDays.includes(day) ? "filled" : "outlined"}
															onClick={() => toggleDay(workerName, day)}
															sx={{ cursor: "pointer", minWidth: 45 }}
														/>
													))}
												</Stack>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													label="Hora inicio"
													size="small"
													fullWidth
													value={worker.schedule.workingHoursStart}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															schedule: { ...worker.schedule, workingHoursStart: e.target.value },
														})
													}
													placeholder="08:00"
												/>
											</Grid>
											<Grid item xs={6} sm={3}>
												<TextField
													label="Hora fin"
													size="small"
													fullWidth
													value={worker.schedule.workingHoursEnd}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															schedule: { ...worker.schedule, workingHoursEnd: e.target.value },
														})
													}
													placeholder="20:00"
												/>
											</Grid>
										</Grid>
									)}
								</Box>

								{/* Queue */}
								<Box sx={{ mb: 3 }}>
									<Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
										Cola
									</Typography>
									<Grid container spacing={2}>
										<Grid item xs={6} sm={4}>
											<TextField
												label="Poll Interval (seg)"
												type="number"
												size="small"
												fullWidth
												value={worker.queue.pollIntervalMs / 1000}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														queue: { ...worker.queue, pollIntervalMs: Number(e.target.value) * 1000 },
													})
												}
											/>
										</Grid>
										<Grid item xs={6} sm={4}>
											<TextField
												label="Max Errores Consecutivos"
												type="number"
												size="small"
												fullWidth
												value={worker.queue.maxConsecutiveErrors}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														queue: { ...worker.queue, maxConsecutiveErrors: Number(e.target.value) },
													})
												}
											/>
										</Grid>
										<Grid item xs={6} sm={4}>
											<TextField
												label="Error Cooldown (seg)"
												type="number"
												size="small"
												fullWidth
												value={worker.queue.errorCooldownMs / 1000}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														queue: { ...worker.queue, errorCooldownMs: Number(e.target.value) * 1000 },
													})
												}
											/>
										</Grid>
									</Grid>
								</Box>

								{/* Health Check */}
								<Box sx={{ mb: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
										<Typography variant="subtitle2" fontWeight="bold" color="primary">
											Health Check
										</Typography>
										<Switch
											size="small"
											checked={worker.healthCheck.enabled}
											onChange={(e) =>
												setWorkerEdit(workerName, {
													healthCheck: { ...worker.healthCheck, enabled: e.target.checked },
												})
											}
										/>
									</Stack>
									{worker.healthCheck.enabled && (
										<Grid container spacing={2}>
											<Grid item xs={6} sm={4}>
												<TextField
													label="Max Idle (min)"
													type="number"
													size="small"
													fullWidth
													value={worker.healthCheck.maxIdleMinutes}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															healthCheck: { ...worker.healthCheck, maxIdleMinutes: Number(e.target.value) },
														})
													}
												/>
											</Grid>
											<Grid item xs={6} sm={4}>
												<TextField
													label="Max Processing (min)"
													type="number"
													size="small"
													fullWidth
													value={worker.healthCheck.maxProcessingMinutes}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															healthCheck: { ...worker.healthCheck, maxProcessingMinutes: Number(e.target.value) },
														})
													}
												/>
											</Grid>
											<Grid item xs={12} sm={4}>
												<FormControlLabel
													control={
														<Checkbox
															size="small"
															checked={worker.healthCheck.autoRestartOnStuck}
															onChange={(e) =>
																setWorkerEdit(workerName, {
																	healthCheck: { ...worker.healthCheck, autoRestartOnStuck: e.target.checked },
																})
															}
														/>
													}
													label={<Typography variant="body2">Auto-restart si colgado</Typography>}
												/>
											</Grid>
										</Grid>
									)}
								</Box>

								{/* Botón guardar */}
								{hasEdits && (
									<Box display="flex" justifyContent="flex-end">
										<Button
											variant="contained"
											size="small"
											onClick={() => handleSaveWorker(workerName)}
											disabled={isSaving}
											startIcon={<TickCircle size={16} />}
										>
											{isSaving ? "Guardando..." : "Guardar Worker"}
										</Button>
									</Box>
								)}
							</Collapse>
						</CardContent>
					</Card>
				);
			})}
		</Stack>
	);
};

export default MisCausasWorkersTab;
