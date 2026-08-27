import React, { useCallback, useEffect, useState } from "react";
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
	Tabs,
	Tab,
	CircularProgress,
} from "@mui/material";
import { ArrowDown2, ArrowUp2, TickCircle, Timer1, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerConfig, WorkerConfig, ScrapingManagerService } from "api/scrapingManager";
import DailySyncPanel from "components/pjn/DailySyncPanel";
import pjnCredentialsService, { WorkerStatsData, WorkerStatKpi } from "api/pjnCredentials";
import MisCausasWorkersFlow from "../../flujos/MisCausasWorkersFlow";
import CausaCoveragePanel from "components/pjn/CausaCoveragePanel";

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

interface WorkerDoc {
	proceso: string;
	queHace: string;
	cuandoCorre: string;
	escribe: string;
	senales: string[];
}

// Explicación de cada worker: qué resuelve, cuándo se dispara y qué deja escrito.
// Sirve para leer las estadísticas de al lado sin tener que abrir el código.
const WORKER_DOCS: Record<string, WorkerDoc> = {
	"credentials-processor": {
		proceso: "pjn-credentials-processor",
		queHace:
			"Toma las credenciales recién cargadas o marcadas para revisión, entra al portal con el CUIL/clave y confirma si sirven. Según el resultado marca la credencial como válida, inválida o con acción requerida (cambio de clave obligatorio, 2FA) y dispara el aviso al usuario.",
		cuandoCorre: "Por cola: el manager lo levanta cuando hay credenciales pendientes y lo apaga al vaciarse.",
		escribe: "pjn-credentials (verified, isValid, credentialInvalid, errorHistory) + screenshots de error en S3.",
		senales: [
			"Pendientes de verificar creciendo = cola trabada o worker apagado.",
			"Error sostenido (≥2 consecutivos) es lo que dispara alerta; un error aislado es ruido.",
		],
	},
	"mis-causas": {
		proceso: "pjn-mis-causas",
		queHace:
			"Sync completa de una credencial. Recorre TODO el listado de Expedientes Relacionados y procesa cada fila: busca la causa en la base local, si no está la pide al caché y si tampoco está la crea desde el portal. Después arma la carpeta del usuario y vincula la credencial a la causa. Las filas sin prefijo de fuero (Tribunal Oral) van por un camino aparte — no se pueden buscar por número — y se dan de alta desde el detalle del listado. El backfill de movimientos es silencioso: no notifica.",
		cuandoCorre: "On-demand: al validar una credencial nueva o cuando se pide un resync desde la UI.",
		escribe: "mis-causas-syncs (triggeredBy ≠ update-worker), causas-*, folders (+ linkedCredentials en la causa).",
		senales: [
			"Corridas interrupted/incomplete = la sesión o la paginación se cortó; se reintenta en la próxima ventana.",
			"Carpetas creadas ≫ causas nuevas: la causa ya existía (la trajo otro usuario o el worker público) y acá solo se vinculó.",
			"Total de causas > creadas + vinculadas: la diferencia son las que el plan bloqueó — mirar archivadas y pendientes por límite.",
			"Pendientes por límite > 0 = el usuario llegó al tope de storage; esas causas quedan SIN carpeta y reaparecen cada día como 'portal sin carpeta'.",
		],
	},
	"update-sync": {
		proceso: "pjn-update-sync",
		queHace:
			"Una pasada diaria por credencial sobre el listado completo. Compara el portal contra las carpetas del usuario por expediente y por carátula: lo que aparece de más se da de alta, lo que ya no está se marca como salido del listado (listRemoved) y si vuelve se limpia la marca. El alta la decide esa comparación contra las carpetas reales — no la heurística de rangos de carátulas, que daba por conocido casi todo.",
		cuandoCorre: "Diario, a la hora configurada abajo (modo daily). Recorre siempre todas las páginas.",
		escribe: "mis-causas-syncs (triggeredBy = update-worker), folders.listRemoved*, capturas del listado en S3 (TTL 60 días).",
		senales: [
			"Scan completo < 100% = quedaron páginas sin leer; ese run no habilita marcar salidas ni dar altas por reconciliación.",
			"Salidas del listado con pico repentino suele ser portal degradado, no bajas reales.",
			"Altas por reconciliación > 0 = expedientes que el portal lista y no tenían carpeta. Es el dato real, no la heurística de carátulas.",
			"Portal sin carpeta que no baja de una corrida a la otra = o el plan del usuario las bloquea, o el alta está fallando: el run guarda cuáles son.",
		],
	},
	"private-causas-update": {
		proceso: "pjn-private-causas-update",
		queHace:
			"Actualiza los movimientos de las causas privadas entrando con la credencial del usuario (las públicas las cubre pjn-workers). Baja los PDFs nuevos a S3 y alimenta las notificaciones de novedades.",
		cuandoCorre: "Incremental en horario laboral; el scrapeo inicial de causas sin capturar corre también fuera de horario.",
		escribe: "causas-update-runs, causas-* (movimiento), pjn-movements + PDFs en S3.",
		senales: [
			"Runs partial repetidos sobre la misma credencial = catch-up trabado, revisar el cooldown.",
			"Movimientos nuevos en 0 durante días con causas procesadas > 0 es normal fuera de feria; sostenido no.",
			"Por lista + por número debe dar el total de causas de la credencial: si no cierra, hay un caso sin clasificar.",
			"Sweep re-paginó: el sweep abre todas las causas de la vía lista en UNA pasada del listado y vuelve con “Volver a Mi Lista”. Cuando no encuentra ese enlace tiene que re-navegar y paginar desde la página 1 — funciona, pero pierde todo el ahorro. Debe ser 0; sobre el 5% de las causas por lista salta alerta.",
		],
	},
};

const MisCausasWorkersTab: React.FC<Props> = ({ config, onConfigUpdate }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<string>("__resumen__");
	const [statsDays, setStatsDays] = useState<number>(7);
	const [stats, setStats] = useState<WorkerStatsData | null>(null);
	const [statsLoading, setStatsLoading] = useState<boolean>(false);
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
				...(workerData.processing ? { processing: workerData.processing } : {}),
				...(workerData.minHoursBetweenUpdates !== undefined ? { minHoursBetweenUpdates: workerData.minHoursBetweenUpdates } : {}),
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

	const loadStats = useCallback(async () => {
		setStatsLoading(true);
		try {
			const res = await pjnCredentialsService.getWorkerStats({ days: statsDays });
			if (res.success) setStats(res as unknown as WorkerStatsData);
		} catch (err) {
			// las estadísticas son informativas: si fallan no bloquean la configuración
			setStats(null);
		} finally {
			setStatsLoading(false);
		}
	}, [statsDays]);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	const toneColor = (tone?: WorkerStatKpi["tone"]) =>
		tone === "success"
			? theme.palette.success.main
			: tone === "warning"
			? theme.palette.warning.main
			: tone === "error"
			? theme.palette.error.main
			: theme.palette.text.primary;

	const fmtFecha = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "—");

	const renderWorkerInfo = (workerName: string) => {
		const doc = WORKER_DOCS[workerName];
		const block = stats?.workers?.[workerName];
		return (
			<Stack spacing={2}>
				{doc && (
					<Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
						<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								<Setting2 size={16} color={theme.palette.primary.main} />
								<Typography variant="subtitle2" fontWeight="bold">
									Qué hace este worker
								</Typography>
								<Chip label={doc.proceso} size="small" variant="outlined" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }} />
							</Stack>
							<Typography variant="body2" sx={{ mb: 1.5 }}>
								{doc.queHace}
							</Typography>
							<Grid container spacing={1.5}>
								<Grid item xs={12} sm={6}>
									<Typography variant="caption" color="text.secondary" display="block">
										Cuándo corre
									</Typography>
									<Typography variant="body2">{doc.cuandoCorre}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="caption" color="text.secondary" display="block">
										Qué deja escrito
									</Typography>
									<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
										{doc.escribe}
									</Typography>
								</Grid>
							</Grid>
							<Divider sx={{ my: 1.5 }} />
							<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
								Cómo leer las métricas
							</Typography>
							{doc.senales.map((sig) => (
								<Stack key={sig} direction="row" spacing={0.75} alignItems="flex-start">
									<TickCircle size={14} color={theme.palette.text.secondary} style={{ marginTop: 3, flexShrink: 0 }} />
									<Typography variant="body2" color="text.secondary">
										{sig}
									</Typography>
								</Stack>
							))}
						</CardContent>
					</Card>
				)}

				<Card variant="outlined">
					<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Timer1 size={16} color={theme.palette.text.secondary} />
								<Typography variant="subtitle2" fontWeight="bold">
									Estadísticas
								</Typography>
								{statsLoading && <CircularProgress size={14} />}
							</Stack>
							<Stack direction="row" spacing={0.5}>
								{[1, 7, 30].map((d) => (
									<Chip
										key={d}
										label={d === 1 ? "24h" : `${d}d`}
										size="small"
										color={statsDays === d ? "primary" : "default"}
										variant={statsDays === d ? "filled" : "outlined"}
										onClick={() => setStatsDays(d)}
										sx={{ fontSize: "0.65rem", height: 22 }}
									/>
								))}
							</Stack>
						</Stack>
						{!block ? (
							<Typography variant="body2" color="text.secondary">
								{statsLoading ? "Cargando…" : "Sin estadísticas disponibles."}
							</Typography>
						) : (
							<>
								<Grid container spacing={1.5}>
									{block.kpis.map((k) => (
										<Grid item xs={6} sm={4} md={3} key={k.label}>
											<Box
												sx={{
													p: 1.25,
													borderRadius: 1,
													border: `1px solid ${theme.palette.divider}`,
													textAlign: "center",
												}}
											>
												<Typography variant="h5" sx={{ color: toneColor(k.tone), lineHeight: 1.2 }}>
													{k.value.toLocaleString("es-AR")}
													{k.unit ? <Typography component="span" variant="caption">{k.unit}</Typography> : null}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{k.label}
												</Typography>
											</Box>
										</Grid>
									))}
								</Grid>
								<Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap alignItems="center">
									{block.runs &&
										Object.entries(block.runs.byStatus).map(([st, n]) => (
											<Chip
												key={st}
												label={`${st}: ${n}`}
												size="small"
												variant="outlined"
												color={st === "completed" ? "success" : st === "error" ? "error" : st === "in_progress" ? "info" : "warning"}
												sx={{ fontSize: "0.65rem", height: 20 }}
											/>
										))}
									<Typography variant="caption" color="text.secondary">
										Última actividad: {fmtFecha(block.ultimaActividad)} · fuente {block.source}
									</Typography>
								</Stack>
							</>
						)}
					</CardContent>
				</Card>

				{workerName === "update-sync" && (
					<Card variant="outlined">
						<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
							<DailySyncPanel days={14} />
						</CardContent>
					</Card>
				)}
			</Stack>
		);
	};

	const workerNames = Object.keys(config.workers);

	return (
		<Stack spacing={2}>
			<Tabs
				value={workerNames.includes(activeTab) || activeTab === "__resumen__" ? activeTab : "__resumen__"}
				onChange={(_e, v) => setActiveTab(v)}
				variant="scrollable"
				scrollButtons="auto"
				sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none" } }}
			>
				<Tab value="__resumen__" label="Resumen" />
				{workerNames.map((name) => (
					<Tab
						key={name}
						value={name}
						label={
							<Stack direction="row" spacing={0.75} alignItems="center">
								<span>{WORKER_LABELS[name] || name}</span>
								<Chip
									label={config.workers[name].enabled ? "ON" : "OFF"}
									size="small"
									color={config.workers[name].enabled ? "success" : "default"}
									sx={{ fontSize: "0.6rem", height: 16 }}
								/>
							</Stack>
						}
					/>
				))}
			</Tabs>

			{/* Tabla resumen */}
			{activeTab === "__resumen__" && (
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
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Estado
									</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Horario
									</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Instancias
									</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Scale Up
									</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Scale Down
									</TableCell>
									<TableCell align="center" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
										Fast
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.entries(config.workers).map(([name, w]) => (
									<TableRow key={name} sx={{ "&:last-child td": { borderBottom: 0 } }}>
										<TableCell sx={{ fontSize: "0.8rem" }}>
											<Stack direction="row" spacing={0.5} alignItems="center">
												<Typography variant="body2" fontWeight={500}>
													{WORKER_LABELS[name] || name}
												</Typography>
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
											{!w.schedule.enabled
												? "24/7"
												: w.schedule.mode === "daily" && w.schedule.dailyRunAt
												? `Diario ${w.schedule.dailyRunAt} → ${w.schedule.workingHoursEnd}`
												: `${w.schedule.workingHoursStart} - ${w.schedule.workingHoursEnd}`}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											<Stack alignItems="center" spacing={0.25}>
												<Chip
													label={w.scaling.maxInstances > 1 ? `Simultáneo ≤${w.scaling.maxInstances}` : "Secuencial"}
													size="small"
													color={w.scaling.maxInstances > 1 ? "info" : "default"}
													variant="outlined"
													sx={{ fontSize: "0.65rem", height: 20 }}
												/>
												<Typography variant="caption" color="text.secondary">
													{w.scaling.minInstances} - {w.scaling.maxInstances} inst.
													{w.processing?.maxUsersPerBatch ? ` · lote ${w.processing.maxUsersPerBatch}` : ""}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.scaleUpThreshold}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.scaleDownThreshold}
										</TableCell>
										<TableCell align="center" sx={{ fontSize: "0.8rem" }}>
											{w.scaling.fastScalingEnabled !== false ? (
												<Chip
													label={`1:1 ≤${w.scaling.fastScalingThreshold || 5}`}
													size="small"
													color="info"
													sx={{ fontSize: "0.65rem", height: 20 }}
												/>
											) : (
												<Chip label="OFF" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>

					<Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
						Cada worker tiene su propia pestaña arriba, con la explicación de qué hace, sus estadísticas y su configuración.
					</Typography>

					<Divider sx={{ my: 2.5 }} />

					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Reparto de las causas con credencial
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
						Cuántas causas hay, cómo se llega a cada una y qué worker la actualiza. Los tres cortes suman el mismo universo.
					</Typography>
					<CausaCoveragePanel />

					<Divider sx={{ my: 2.5 }} />

					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Flujo de sincronización
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
						Cómo una fila del listado de Mis Causas termina siendo una carpeta del usuario. Es el mismo diagrama que vive en Flujos del
						ecosistema; lee la config del manager en vivo.
					</Typography>
					<MisCausasWorkersFlow />
				</CardContent>
			</Card>
			)}

			{Object.entries(config.workers)
				.filter(([workerName]) => workerName === activeTab)
				.map(([workerName, workerConfig]) => {
				const worker = getEditValue(workerName);
				const isExpanded = expandedWorker !== workerName;
				const hasEdits = !!editValues[workerName];
				const isSaving = saving === workerName;

				return (
					<React.Fragment key={workerName}>
					{renderWorkerInfo(workerName)}
					<Card variant="outlined">
						<CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
							{/* Header del worker */}
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
									<IconButton size="small" onClick={() => setExpandedWorker(isExpanded ? workerName : null)}>
										{isExpanded ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
									</IconButton>
									<Box sx={{ flex: 1 }}>
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="subtitle1" fontWeight="bold">
												{WORKER_LABELS[workerName] || workerName}
											</Typography>
											<Chip label={workerName} size="small" variant="outlined" sx={{ fontSize: "0.65rem", fontFamily: "monospace" }} />
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
										<Grid item xs={6} sm={4}>
											<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ height: "100%" }}>
												<Box>
													<Typography variant="body2" fontWeight={500}>
														Fast Scaling
													</Typography>
													<Typography variant="caption" color="text.secondary">
														1 worker por item en colas chicas
													</Typography>
												</Box>
												<Switch
													checked={worker.scaling.fastScalingEnabled !== false}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															scaling: { ...worker.scaling, fastScalingEnabled: e.target.checked },
														})
													}
													size="small"
												/>
											</Stack>
										</Grid>
										{worker.scaling.fastScalingEnabled !== false && (
											<Grid item xs={6} sm={4}>
												<TextField
													label="Umbral Fast Scaling"
													type="number"
													size="small"
													fullWidth
													value={worker.scaling.fastScalingThreshold || 5}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															scaling: { ...worker.scaling, fastScalingThreshold: Number(e.target.value) },
														})
													}
													helperText="Cola <= umbral = 1 worker por item"
													inputProps={{ min: 1, max: 20 }}
												/>
											</Grid>
										)}
									</Grid>
								</Box>

								{/* Procesamiento (concurrencia data-driven: maxInstances) */}
								<Box sx={{ mb: 3 }}>
									<Typography variant="subtitle2" fontWeight="bold" gutterBottom color="primary">
										Procesamiento de credenciales
									</Typography>
									<Grid container spacing={2} alignItems="center">
										<Grid item xs={12} sm={4}>
											<TextField
												select
												label="Modo"
												size="small"
												fullWidth
												SelectProps={{ native: true }}
												value={worker.scaling.maxInstances > 1 ? "parallel" : "sequential"}
												onChange={(e) =>
													setWorkerEdit(workerName, {
														scaling: {
															...worker.scaling,
															maxInstances: e.target.value === "sequential" ? 1 : Math.max(2, worker.scaling.maxInstances),
														},
													})
												}
												helperText={
													worker.scaling.maxInstances > 1
														? `Hasta ${worker.scaling.maxInstances} credenciales a la vez (una instancia por credencial; escala de a ${
																worker.scaling.scaleUpStep
														  } cada ${Math.round(worker.scaling.cooldownMs / 1000)}s)`
														: "Una instancia: las credenciales se procesan una por una"
												}
											>
												<option value="sequential">Secuencial</option>
												<option value="parallel">Simultáneo</option>
											</TextField>
										</Grid>
										{worker.scaling.maxInstances > 1 && (
											<Grid item xs={6} sm={2}>
												<TextField
													label="Máx. simultáneas"
													type="number"
													size="small"
													fullWidth
													inputProps={{ min: 2, max: 10 }}
													value={worker.scaling.maxInstances}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															scaling: { ...worker.scaling, maxInstances: Math.max(2, Number(e.target.value) || 2) },
														})
													}
												/>
											</Grid>
										)}
										{workerName === "update-sync" && (
											<>
												<Grid item xs={6} sm={2}>
													<TextField
														label="Usuarios por lote"
														type="number"
														size="small"
														fullWidth
														inputProps={{ min: 1, max: 100 }}
														value={worker.processing?.maxUsersPerBatch ?? 10}
														onChange={(e) =>
															setWorkerEdit(workerName, {
																processing: { ...(worker.processing || {}), maxUsersPerBatch: Number(e.target.value) || 1 },
															})
														}
														helperText="por instancia, en secuencia"
													/>
												</Grid>
												<Grid item xs={6} sm={2}>
													<TextField
														label="Pausa entre usuarios (s)"
														type="number"
														size="small"
														fullWidth
														inputProps={{ min: 0, max: 600 }}
														value={worker.processing?.pauseBetweenUsersSec ?? 10}
														onChange={(e) =>
															setWorkerEdit(workerName, {
																processing: { ...(worker.processing || {}), pauseBetweenUsersSec: Number(e.target.value) || 0 },
															})
														}
													/>
												</Grid>
											</>
										)}
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
									{worker.schedule.enabled && workerName === "update-sync" && (
										<Grid container spacing={2} sx={{ mb: 1 }}>
											<Grid item xs={12} sm={4}>
												<TextField
													select
													label="Frecuencia"
													size="small"
													fullWidth
													SelectProps={{ native: true }}
													value={worker.schedule.mode === "daily" ? "daily" : "window"}
													onChange={(e) =>
														setWorkerEdit(workerName, {
															schedule: {
																...worker.schedule,
																mode: e.target.value as "daily" | "window",
																dailyRunAt: e.target.value === "daily" ? worker.schedule.dailyRunAt || "09:00" : worker.schedule.dailyRunAt,
															},
														})
													}
													helperText={
														worker.schedule.mode === "daily"
															? "Una pasada por día: cada usuario se procesa una vez, a partir de la hora elegida y hasta la hora fin"
															: `Dentro de la franja, cada usuario se reprocesa cuando pasaron ${worker.minHoursBetweenUpdates ?? 24} h`
													}
												>
													<option value="daily">Diario a una hora</option>
													<option value="window">Franja horaria (cada N horas)</option>
												</TextField>
											</Grid>
											{worker.schedule.mode === "daily" ? (
												<Grid item xs={6} sm={3}>
													<TextField
														label="Hora de procesamiento"
														type="time"
														size="small"
														fullWidth
														InputLabelProps={{ shrink: true }}
														value={worker.schedule.dailyRunAt || "09:00"}
														onChange={(e) => setWorkerEdit(workerName, { schedule: { ...worker.schedule, dailyRunAt: e.target.value } })}
														helperText={worker.schedule.timezone || "America/Argentina/Buenos_Aires"}
													/>
												</Grid>
											) : (
												<Grid item xs={6} sm={3}>
													<TextField
														label="Horas entre corridas"
														type="number"
														size="small"
														fullWidth
														inputProps={{ min: 1, max: 168 }}
														value={worker.minHoursBetweenUpdates ?? 24}
														onChange={(e) => setWorkerEdit(workerName, { minHoursBetweenUpdates: Number(e.target.value) || 1 })}
													/>
												</Grid>
											)}
										</Grid>
									)}
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
					</React.Fragment>
				);
			})}
		</Stack>
	);
};

export default MisCausasWorkersTab;
