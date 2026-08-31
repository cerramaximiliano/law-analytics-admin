import React, { useState, useEffect, useCallback, useMemo } from "react";
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
	Collapse,
	Paper,
	Tab,
	Tabs,
	Tooltip,
	useTheme,
	alpha,
	Grid,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Setting2, Chart, ArrowUp, ArrowDown2, ArrowUp2, InfoCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import UpdateMovimientosService, { UpdateMovimientosWorkerConfig, UpdateMovimientosManagerConfig } from "api/updateMovimientos";
import WorkerControlPanel from "components/WorkerControlPanel";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER, headerBorder } from "themes/dashboardTokens";

const FUERO_LABELS: Record<string, string> = { CIV: "Civil", CNT: "Trabajo", CSS: "Seg. Social", COM: "Comercial" };
const ALL_FUEROS = ["CIV", "CNT", "CSS", "COM"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Horas sin correr a partir de las cuales un worker habilitado se considera parado. */
const HORAS_PARA_CONSIDERAR_PARADO = 6;

const fmtNum = (n?: number) => (n ?? 0).toLocaleString("es-AR");

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function timeAgo(d?: string): string {
	if (!d) return "nunca";
	const diffMin = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
	if (diffMin < 1) return "hace un momento";
	if (diffMin < 60) return `hace ${diffMin} min`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `hace ${diffH} h`;
	return `hace ${Math.floor(diffH / 24)} días`;
}

function horasDesde(d?: string): number | null {
	if (!d) return null;
	return (Date.now() - new Date(d).getTime()) / 3600000;
}

/** Fecha local en el formato que guarda statsToday.date ("2026-08-31"). */
function hoyISO(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Minutos entre ciclos, para los patrones de intervalo que usa este worker
 * ("*\/2 * * * *"). Devuelve null en patrones con hora fija, que no son un
 * ritmo sino un horario — ahí no tiene sentido derivar capacidad diaria.
 */
function cronCadaMin(pattern?: string): number | null {
	if (!pattern) return null;
	const partes = pattern.trim().split(/\s+/);
	if (partes.length < 2) return null;
	const [min, hora] = partes;
	if (hora !== "*") return null;
	if (/^\*\/\d+$/.test(min)) return parseInt(min.slice(2), 10) || null;
	if (min === "*") return 1;
	return null;
}

/** Causas por día que puede tomar un worker: ciclos dentro de la ventana × causas por ciclo. */
function capacidadDiaria(cadaMin: number | null, batchSize: number, horasVentana: number, instancias: number): number | null {
	if (!cadaMin || cadaMin <= 0 || horasVentana <= 0) return null;
	return Math.round((60 / cadaMin) * horasVentana * Math.max(batchSize, 1) * Math.max(instancias, 1));
}

function describeVentana(inicio: number, fin: number, dias: number[]): string {
	const horas = Math.max(fin - inicio, 0);
	const textoHoras = horas >= 24 ? "24 h" : `${inicio}:00 a ${fin}:00`;
	const todos = dias.length === 7;
	const habiles = dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d));
	const textoDias = todos ? "todos los días" : habiles ? "de lunes a viernes" : dias.map((d) => DAY_LABELS[d]).join(", ");
	return `${textoHoras}, ${textoDias}`;
}

// ── Métrica ───────────────────────────────────────────────────────────────────

function Metrica({
	label,
	value,
	sub,
	color,
	ayuda,
}: {
	label: string;
	value: number | string;
	sub?: string;
	color?: string;
	ayuda?: string;
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<Box
			sx={{
				p: 2,
				height: "100%",
				borderRadius: 2,
				border: `1px solid ${headerBorder(isDark)}`,
				bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03),
			}}
		>
			<Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
				<Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
					{label}
				</Typography>
				{ayuda && (
					<Tooltip title={ayuda} arrow enterTouchDelay={0}>
						<Box sx={{ display: "inline-flex", color: "text.disabled", cursor: "help" }}>
							<InfoCircle size={13} />
						</Box>
					</Tooltip>
				)}
			</Stack>
			<Typography
				variant="h4"
				fontWeight={700}
				color={color || "text.primary"}
				sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
			>
				{typeof value === "number" ? fmtNum(value) : value}
			</Typography>
			{sub && (
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25, lineHeight: 1.35 }}>
					{sub}
				</Typography>
			)}
		</Box>
	);
}

/**
 * Cifra en línea para la banda de resumen: número y etiqueta en la misma
 * línea, detalle debajo. Las tarjetas con borde medían 170px de alto y
 * empujaban el contenido de las pestañas fuera de la primera pantalla.
 */
function Cifra({
	valor,
	etiqueta,
	detalle,
	color,
	ayuda,
}: {
	valor: number | string;
	etiqueta: string;
	detalle?: string;
	color?: string;
	ayuda?: string;
}) {
	return (
		<Box sx={{ minWidth: 0 }}>
			<Stack direction="row" alignItems="baseline" spacing={0.75}>
				<Typography
					variant="h5"
					fontWeight={700}
					sx={{ color: color || "text.primary", fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
				>
					{typeof valor === "number" ? fmtNum(valor) : valor}
				</Typography>
				<Stack direction="row" alignItems="center" spacing={0.35}>
					<Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3, whiteSpace: "nowrap" }}>
						{etiqueta}
					</Typography>
					{ayuda && (
						<Tooltip title={ayuda} arrow enterTouchDelay={0}>
							<Box sx={{ display: "inline-flex", color: "text.disabled", cursor: "help" }}>
								<InfoCircle size={13} />
							</Box>
						</Tooltip>
					)}
				</Stack>
			</Stack>
			{detalle && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
					{detalle}
				</Typography>
			)}
		</Box>
	);
}

/**
 * Fila de un formulario de configuración: etiqueta y explicación a la
 * izquierda, control en una columna de ancho fijo a la derecha. Todos los
 * controles caen en la misma vertical, que es lo que un muro de TextFields
 * sueltos en un Grid no lograba.
 */
function Campo({
	label,
	ayuda,
	children,
	ultimo,
	ancho = 200,
}: {
	label: string;
	ayuda?: string;
	children: React.ReactNode;
	ultimo?: boolean;
	/** Los controles de chips necesitan más aire que un input numérico. */
	ancho?: number;
}) {
	const theme = useTheme();
	return (
		<Stack
			direction={{ xs: "column", sm: "row" }}
			alignItems={{ sm: "center" }}
			spacing={{ xs: 0.75, sm: 2 }}
			sx={{ py: 1.25, borderBottom: ultimo ? "none" : `1px solid ${alpha(theme.palette.divider, 0.7)}` }}
		>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="body2" fontWeight={500}>
					{label}
				</Typography>
				{ayuda && (
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.35 }}>
						{ayuda}
					</Typography>
				)}
			</Box>
			<Box sx={{ width: { xs: "100%", sm: ancho }, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
				<Box sx={{ width: "100%" }}>{children}</Box>
			</Box>
		</Stack>
	);
}

// ── Datos derivados que comparten todas las secciones ─────────────────────────

type Resumen = ReturnType<typeof calcularResumen>;

function calcularResumen(manager: UpdateMovimientosManagerConfig | null, workers: UpdateMovimientosWorkerConfig[]) {
	const hoy = hoyISO();
	const cfg = manager?.config;
	const horasVentana = cfg ? Math.max((cfg.workEndHour ?? 24) - (cfg.workStartHour ?? 0), 0) : 24;

	const porFuero = workers.map((w) => {
		const esDeHoy = w.statsToday?.date === hoy;
		const estado = manager?.currentState?.fueros?.[w.fuero];
		const cadaMin = cronCadaMin(w.cronPattern);
		return {
			config: w,
			fuero: w.fuero,
			label: FUERO_LABELS[w.fuero] || w.fuero,
			cola: estado?.pending ?? 0,
			instancias: estado?.current ?? 0,
			optimo: estado?.optimal ?? 0,
			accion: estado?.action ?? "",
			cadaMin,
			capacidad: capacidadDiaria(cadaMin, w.batchSize ?? 1, horasVentana, estado?.current ?? 1),
			// statsToday no se limpia solo: si la fecha no es la de hoy, esos
			// números son del último día que el worker efectivamente corrió.
			esDeHoy,
			procesadasHoy: esDeHoy ? w.statsToday?.processed ?? 0 : 0,
			exitosasHoy: esDeHoy ? w.statsToday?.success ?? 0 : 0,
			fallidasHoy: esDeHoy ? w.statsToday?.failed ?? 0 : 0,
			movimientosHoy: esDeHoy ? w.statsToday?.newMovimientos ?? 0 : 0,
			ultimaCorrida: w.stats?.lastRun,
			horasSinCorrer: horasDesde(w.stats?.lastRun),
		};
	});

	const suma = (f: (x: (typeof porFuero)[number]) => number) => porFuero.reduce((a, x) => a + f(x), 0);
	const capacidades = porFuero.map((f) => f.capacidad).filter((c): c is number => c != null);

	return {
		hoy,
		horasVentana,
		porFuero,
		cola: manager?.currentState?.totalPending ?? suma((f) => f.cola),
		procesadasHoy: suma((f) => f.procesadasHoy),
		exitosasHoy: suma((f) => f.exitosasHoy),
		fallidasHoy: suma((f) => f.fallidasHoy),
		movimientosHoy: suma((f) => f.movimientosHoy),
		capacidadTotal: capacidades.length ? capacidades.reduce((a, b) => a + b, 0) : null,
		totalHistorico: workers.reduce((a, w) => a + (w.stats?.totalProcessed ?? 0), 0),
		movimientosHistoricos: workers.reduce((a, w) => a + (w.stats?.totalNewMovimientos ?? 0), 0),
		// Un worker habilitado que no corre hace horas es el modo de falla real
		// de esta vista: el switch dice "Habilitado" y no pasa nada.
		parados: porFuero.filter((f) => f.config.enabled && (f.horasSinCorrer ?? Infinity) > HORAS_PARA_CONSIDERAR_PARADO),
		fallandoTodo: porFuero.filter((f) => f.esDeHoy && f.procesadasHoy > 0 && f.exitosasHoy === 0),
	};
}

// ── Resumen del flujo ─────────────────────────────────────────────────────────

/**
 * Lo que faltaba de un vistazo: cuántas causas hay en el circuito, cuántas se
 * procesaron hoy, qué salió de eso, y cada cuánto corre la cosa.
 *
 * Los números ya venían de la API pero estaban repartidos: la cola solo en
 * "Estado", el ritmo escondido en un campo "Cron pattern" dentro de la ficha
 * de cada worker, y la capacidad en ningún lado.
 */
function ResumenFlujo({ r, loading, onRefresh }: { r: Resumen; loading: boolean; onRefresh: () => void }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	const ritmos = Array.from(new Set(r.porFuero.map((f) => f.cadaMin).filter((m): m is number => m != null)));
	const textoRitmo =
		ritmos.length === 1
			? `un ciclo cada ${ritmos[0]} min`
			: ritmos.length > 1
			? `un ciclo cada ${Math.min(...ritmos)}–${Math.max(...ritmos)} min`
			: null;
	const lotes = Array.from(new Set(r.porFuero.map((f) => f.config.batchSize ?? 1)));
	const textoLote = lotes.length === 1 ? `${lotes[0]} causa${lotes[0] > 1 ? "s" : ""} por ciclo` : "según el fuero";

	// Cuánto tarda en drenarse lo que hay en cola, al ritmo configurado.
	const porMinuto = r.capacidadTotal ? r.capacidadTotal / (r.horasVentana * 60) : null;
	const minutosDeCola = porMinuto && porMinuto > 0 && r.cola > 0 ? Math.ceil(r.cola / porMinuto) : null;

	return (
		<Paper variant="outlined" sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderRadius: 2, borderColor: headerBorder(isDark) }}>
			<Stack
				direction={{ xs: "column", lg: "row" }}
				spacing={{ xs: 1.5, lg: 3 }}
				alignItems={{ lg: "center" }}
				divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", lg: "block" }, my: 0.5 }} />}
			>
				<Cifra
					valor={r.cola}
					etiqueta="en cola"
					color={r.cola > 0 ? STALE_AMBER : undefined}
					detalle={minutosDeCola ? `≈ ${minutosDeCola} min de trabajo` : "nada esperando"}
					ayuda="Causas marcadas para revisar (update=true, verificadas y válidas). Las marca el pipeline de novedad; el worker las relee y las desmarca."
				/>
				<Cifra
					valor={r.procesadasHoy}
					etiqueta="releídas hoy"
					color={r.procesadasHoy > 0 && r.exitosasHoy === 0 ? theme.palette.error.main : undefined}
					detalle={r.procesadasHoy > 0 ? `${fmtNum(r.exitosasHoy)} ok · ${fmtNum(r.fallidasHoy)} con error` : "sin actividad hoy"}
					ayuda="Causas que los workers releyeron hoy, sumando los cuatro fueros."
				/>
				<Cifra
					valor={r.movimientosHoy}
					etiqueta="movs. nuevos"
					color={r.movimientosHoy > 0 ? LIVE_GREEN : undefined}
					detalle="lo que el flujo produce"
					ayuda="Movimientos que no estaban y aparecieron al releer. Es el resultado del circuito, no el trabajo hecho."
				/>
				<Cifra
					valor={r.capacidadTotal != null ? `${fmtNum(r.capacidadTotal)}/día` : "—"}
					etiqueta="de capacidad"
					detalle={textoRitmo ? `${textoRitmo} · ${textoLote}` : "ritmo no derivable del cron"}
					ayuda="Techo teórico: ciclos que entran en la ventana de trabajo × causas por ciclo × instancias activas. No es lo que se procesa, es lo que se podría."
				/>
				<Box sx={{ flexGrow: 1 }} />
				<Stack direction="row" alignItems="center" spacing={1.5}>
					<Typography variant="caption" color="text.secondary" sx={{ textAlign: { lg: "right" } }}>
						Histórico
						<br />
						{fmtNum(r.totalHistorico)} releídas · {fmtNum(r.movimientosHistoricos)} movs.
					</Typography>
					<Button
						size="small"
						startIcon={<Refresh size={15} />}
						onClick={onRefresh}
						disabled={loading}
						sx={{ textTransform: "none", flexShrink: 0 }}
					>
						Actualizar
					</Button>
				</Stack>
			</Stack>
		</Paper>
	);
}

// ── Avisos de salud ───────────────────────────────────────────────────────────

function AvisosSalud({ r }: { r: Resumen }) {
	if (r.parados.length === 0 && r.fallandoTodo.length === 0) return null;
	// Una línea por problema: son avisos, no artículos. Con AlertTitle ocupaban
	// 150px arriba de las pestañas.
	const sx = { py: 0.25, flex: 1, "& .MuiAlert-message": { py: 0.5 } };
	return (
		<Stack direction={{ xs: "column", lg: "row" }} spacing={1} alignItems="stretch">
			{r.parados.length > 0 && (
				<Alert severity="warning" sx={sx}>
					<b>
						{r.parados.length === 1
							? "Un worker habilitado no reporta ciclos"
							: `${r.parados.length} workers habilitados no reportan ciclos`}
					</b>{" "}
					— {r.parados.map((f) => `${f.label} (${timeAgo(f.ultimaCorrida)})`).join(" · ")}. Puede ser que no tengan cola, o que el proceso
					esté caído en worker_01.
				</Alert>
			)}
			{r.fallandoTodo.length > 0 && (
				<Alert severity="error" sx={sx}>
					<b>Hoy falla todo lo que se intenta</b> —{" "}
					{r.fallandoTodo.map((f) => `${f.label}: ${fmtNum(f.procesadasHoy)} intentos sin ninguno exitoso`).join(" · ")}.
				</Alert>
			)}
		</Stack>
	);
}

// ── Sección: Estado ───────────────────────────────────────────────────────────

function EstadoSection({ r, manager }: { r: Resumen; manager: UpdateMovimientosManagerConfig | null }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const recursos = manager?.currentState?.resources;
	const cfg = manager?.config;

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
					Estado por fuero
				</Typography>
				{r.porFuero.length === 0 ? (
					<Alert severity="info">Sin datos de estado. El manager todavía no ejecutó un ciclo.</Alert>
				) : (
					<Grid container spacing={2}>
						{r.porFuero.map((f) => {
							const activo = f.instancias > 0;
							const parado = f.config.enabled && (f.horasSinCorrer ?? Infinity) > HORAS_PARA_CONSIDERAR_PARADO;
							const acento = parado ? STALE_AMBER : activo ? LIVE_GREEN : theme.palette.text.disabled;
							return (
								<Grid item xs={12} sm={6} lg={3} key={f.fuero}>
									<Paper
										variant="outlined"
										sx={{
											p: 2,
											height: "100%",
											borderRadius: 2,
											borderColor: alpha(acento, isDark ? 0.45 : 0.32),
											transition: "box-shadow 200ms ease, border-color 200ms ease",
											"&:hover": { boxShadow: `0 4px 14px ${alpha(acento, 0.14)}` },
										}}
									>
										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
											<Typography fontWeight={700}>{f.label}</Typography>
											<Chip
												label={activo ? `${f.instancias} worker${f.instancias > 1 ? "s" : ""}` : "sin instancias"}
												size="small"
												variant="outlined"
												sx={{ height: 20, fontSize: "0.68rem", color: acento, borderColor: alpha(acento, 0.5) }}
											/>
										</Stack>

										<Stack direction="row" spacing={2.5} sx={{ mb: 1.25 }}>
											<Box>
												<Typography
													variant="h4"
													fontWeight={700}
													sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15, color: f.cola > 0 ? STALE_AMBER : "text.primary" }}
												>
													{fmtNum(f.cola)}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													en cola
												</Typography>
											</Box>
											<Box>
												<Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
													{fmtNum(f.procesadasHoy)}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													releídas hoy
												</Typography>
											</Box>
										</Stack>

										<Stack spacing={0.25}>
											{f.esDeHoy && f.procesadasHoy > 0 && (
												<Typography variant="caption" sx={{ color: f.exitosasHoy === 0 ? theme.palette.error.main : "text.secondary" }}>
													{fmtNum(f.exitosasHoy)} ok · {fmtNum(f.fallidasHoy)} con error · {fmtNum(f.movimientosHoy)} movs. nuevos
												</Typography>
											)}
											<Typography variant="caption" color={parado ? "warning.main" : "text.secondary"}>
												Última corrida {timeAgo(f.ultimaCorrida)}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{f.cadaMin ? `Un ciclo cada ${f.cadaMin} min` : f.config.cronPattern} ·{" "}
												{f.capacidad != null ? `hasta ${fmtNum(f.capacidad)}/día` : "—"}
											</Typography>
											{f.accion && f.accion !== "sin cambios" && (
												<Typography variant="caption" color="info.main">
													Manager: {f.accion} (óptimo {f.optimo})
												</Typography>
											)}
										</Stack>
									</Paper>
								</Grid>
							);
						})}
					</Grid>
				)}
			</Box>

			<Divider />

			{/* Recursos del box: contexto, no el dato principal de esta vista. */}
			<Box>
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Recursos de worker_01
				</Typography>
				<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap alignItems="baseline">
					{recursos ? (
						<>
							<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
								CPU{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: recursos.cpuUsage > (cfg?.cpuThreshold ?? 0.75) ? "error.main" : "success.main" }}
								>
									{(recursos.cpuUsage * 100).toFixed(1)}%
								</Box>
								<Box component="span" sx={{ color: "text.secondary" }}>
									{" "}
									/ tope {((cfg?.cpuThreshold ?? 0.75) * 100).toFixed(0)}%
								</Box>
							</Typography>
							<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
								Memoria{" "}
								<Box
									component="span"
									sx={{ fontWeight: 700, color: recursos.memoryUsage > (cfg?.memoryThreshold ?? 0.8) ? "error.main" : "success.main" }}
								>
									{(recursos.memoryUsage * 100).toFixed(1)}%
								</Box>
								<Box component="span" sx={{ color: "text.secondary" }}>
									{" "}
									/ tope {((cfg?.memoryThreshold ?? 0.8) * 100).toFixed(0)}%
								</Box>
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
								RAM libre {fmtNum(recursos.freeMemoryMB)} MB
							</Typography>
						</>
					) : (
						<Typography variant="body2" color="text.secondary">
							El manager todavía no reportó recursos.
						</Typography>
					)}
					<Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}>
						Último ciclo del manager: {fmtDate(manager?.currentState?.timestamp)}
					</Typography>
				</Stack>
			</Box>
		</Stack>
	);
}

// ── Sección: Manager ──────────────────────────────────────────────────────────

function ManagerSection({
	manager,
	r,
	onSaved,
}: {
	manager: UpdateMovimientosManagerConfig | null;
	r: Resumen;
	onSaved: (m: UpdateMovimientosManagerConfig) => void;
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);
	const [local, setLocal] = useState<Partial<UpdateMovimientosManagerConfig["config"]>>({});
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		setLocal({});
		setDirty(false);
	}, [manager?.updatedAt]);

	function patch<K extends keyof UpdateMovimientosManagerConfig["config"]>(key: K, value: UpdateMovimientosManagerConfig["config"][K]) {
		setLocal((p) => ({ ...p, [key]: value }));
		setDirty(true);
	}

	const cfg = { ...manager?.config, ...local } as UpdateMovimientosManagerConfig["config"];

	function toggleDay(day: number) {
		const cur = cfg.workDays ?? [1, 2, 3, 4, 5];
		patch("workDays", cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort());
	}

	function toggleFuero(f: string) {
		const cur = cfg.fueros ?? ["CIV"];
		patch("fueros", cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);
	}

	async function save() {
		setSaving(true);
		try {
			onSaved(await UpdateMovimientosService.updateManagerConfig(local));
			setLocal({});
			setDirty(false);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch {
			enqueueSnackbar("Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	}

	if (!manager) return <Alert severity="info">No se pudo leer la configuración del manager.</Alert>;

	const instanciasActuales = r.porFuero.reduce((a, f) => a + f.instancias, 0);
	const sinVentana = (cfg.workEndHour ?? 24) - (cfg.workStartHour ?? 0) >= 24 && (cfg.workDays ?? []).length === 7;

	return (
		<Stack spacing={3}>
			{/* La regla en castellano, con dónde estamos parados. Antes había que
			    deducirla de cuatro campos numéricos con nombres crípticos. */}
			<Paper
				variant="outlined"
				sx={{ p: 2, borderRadius: 2, borderColor: alpha(BRAND_BLUE, 0.3), bgcolor: alpha(BRAND_BLUE, isDark ? 0.07 : 0.035) }}
			>
				<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
					Qué hace el manager
				</Typography>
				<Stack spacing={0.75}>
					<Typography variant="body2">
						Cada <b>{Math.round((cfg.checkInterval ?? 60000) / 1000)} s</b> mira la cola de cada fuero. Con más de{" "}
						<b>{fmtNum(cfg.scaleThreshold ?? 100)}</b> causas esperando escala hasta <b>{cfg.maxWorkers ?? 3}</b> instancias; con menos de{" "}
						<b>{fmtNum(cfg.scaleDownThreshold ?? 10)}</b> baja a <b>{cfg.minWorkers ?? 0}</b>.
					</Typography>
					<Typography variant="body2">
						No escala si la CPU supera <b>{((cfg.cpuThreshold ?? 0.75) * 100).toFixed(0)}%</b> o la memoria{" "}
						<b>{((cfg.memoryThreshold ?? 0.8) * 100).toFixed(0)}%</b>. {sinVentana ? "Corre sin corte" : "Solo corre"}:{" "}
						<b>{describeVentana(cfg.workStartHour ?? 0, cfg.workEndHour ?? 24, cfg.workDays ?? [1, 2, 3, 4, 5])}</b>.
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Ahora mismo: <b>{fmtNum(r.cola)}</b> en cola y <b>{instanciasActuales}</b> instancia{instanciasActuales === 1 ? "" : "s"}{" "}
						corriendo
						{r.cola < (cfg.scaleDownThreshold ?? 10) ? " — por debajo del umbral de bajada, así que se queda en el mínimo." : "."}
					</Typography>
				</Stack>
			</Paper>

			{/* Tres bloques, una sola columna de controles: todos los campos caen en
			    la misma vertical y cada fila mide lo mismo. Antes era un Grid con
			    filas de 4, 3 y 2 columnas, así que ningún input quedaba alineado
			    con el de arriba ni con el de abajo. */}
			<Paper variant="outlined" sx={{ borderRadius: 2, borderColor: headerBorder(isDark) }}>
				<Typography variant="subtitle2" fontWeight={700} sx={{ px: 2, pt: 1.75, pb: 0.5 }}>
					Escalado
				</Typography>
				<Box sx={{ px: 2, pb: 1 }}>
					<Campo label="Escalar arriba" ayuda="Cuando la cola supera esta cantidad de causas, va al máximo de instancias">
						<TextField
							fullWidth
							type="number"
							value={cfg.scaleThreshold ?? 100}
							onChange={(e) => patch("scaleThreshold", parseInt(e.target.value, 10))}
							size="small"
						/>
					</Campo>
					<Campo label="Bajar al mínimo" ayuda="Cuando la cola baja de esta cantidad, vuelve al mínimo de instancias">
						<TextField
							fullWidth
							type="number"
							value={cfg.scaleDownThreshold ?? 10}
							onChange={(e) => patch("scaleDownThreshold", parseInt(e.target.value, 10))}
							size="small"
						/>
					</Campo>
					<Campo label="Instancias máximas" ayuda="Techo de workers simultáneos por fuero">
						<TextField
							fullWidth
							type="number"
							value={cfg.maxWorkers ?? 3}
							onChange={(e) => patch("maxWorkers", parseInt(e.target.value, 10))}
							size="small"
							inputProps={{ min: 1, max: 10 }}
						/>
					</Campo>
					<Campo label="Instancias mínimas" ayuda="0 apaga el fuero fuera de la ventana de trabajo" ultimo>
						<TextField
							fullWidth
							type="number"
							value={cfg.minWorkers ?? 0}
							onChange={(e) => patch("minWorkers", parseInt(e.target.value, 10))}
							size="small"
							inputProps={{ min: 0, max: 10 }}
						/>
					</Campo>
				</Box>
			</Paper>

			<Paper variant="outlined" sx={{ borderRadius: 2, borderColor: headerBorder(isDark) }}>
				<Typography variant="subtitle2" fontWeight={700} sx={{ px: 2, pt: 1.75, pb: 0.5 }}>
					Frenos por recursos
				</Typography>
				<Box sx={{ px: 2, pb: 1 }}>
					<Campo
						label="Intervalo de chequeo"
						ayuda={`Milisegundos entre ciclos de scaling — ahora ${Math.round((cfg.checkInterval ?? 60000) / 1000)} s`}
					>
						<TextField
							fullWidth
							type="number"
							value={cfg.checkInterval ?? 60000}
							onChange={(e) => patch("checkInterval", parseInt(e.target.value, 10))}
							size="small"
						/>
					</Campo>
					<Campo
						label="Tope de CPU"
						ayuda={`De 0 a 1. No escala por encima — ahora ${((manager.currentState?.resources?.cpuUsage ?? 0) * 100).toFixed(1)}%`}
					>
						<TextField
							fullWidth
							type="number"
							value={cfg.cpuThreshold ?? 0.75}
							onChange={(e) => patch("cpuThreshold", parseFloat(e.target.value))}
							size="small"
							inputProps={{ min: 0, max: 1, step: 0.05 }}
						/>
					</Campo>
					<Campo
						label="Tope de memoria"
						ayuda={`De 0 a 1. No escala por encima — ahora ${((manager.currentState?.resources?.memoryUsage ?? 0) * 100).toFixed(1)}%`}
						ultimo
					>
						<TextField
							fullWidth
							type="number"
							value={cfg.memoryThreshold ?? 0.8}
							onChange={(e) => patch("memoryThreshold", parseFloat(e.target.value))}
							size="small"
							inputProps={{ min: 0, max: 1, step: 0.05 }}
						/>
					</Campo>
				</Box>
			</Paper>

			<Paper variant="outlined" sx={{ borderRadius: 2, borderColor: headerBorder(isDark) }}>
				<Typography variant="subtitle2" fontWeight={700} sx={{ px: 2, pt: 1.75, pb: 0.5 }}>
					Ventana de trabajo
				</Typography>
				<Box sx={{ px: 2, pb: 1 }}>
					<Campo label="Hora de inicio" ayuda="De 0 a 23">
						<TextField
							fullWidth
							type="number"
							value={cfg.workStartHour ?? 7}
							onChange={(e) => patch("workStartHour", parseInt(e.target.value, 10))}
							size="small"
							inputProps={{ min: 0, max: 23 }}
						/>
					</Campo>
					<Campo label="Hora de fin" ayuda="Exclusiva. 24 = sin corte">
						<TextField
							fullWidth
							type="number"
							value={cfg.workEndHour ?? 23}
							onChange={(e) => patch("workEndHour", parseInt(e.target.value, 10))}
							size="small"
							inputProps={{ min: 0, max: 24 }}
						/>
					</Campo>
					<Campo label="Días" ayuda="En los días apagados no corre ningún worker" ancho={280}>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
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
										sx={{ cursor: "pointer", minWidth: 44 }}
									/>
								);
							})}
						</Stack>
					</Campo>
					<Campo label="Fueros que escala" ayuda="Los que el manager vigila para subir y bajar instancias" ancho={280} ultimo>
						<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap justifyContent="flex-end">
							{ALL_FUEROS.map((f) => {
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
					</Campo>
				</Box>
			</Paper>

			<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
				<Button
					variant="contained"
					onClick={save}
					disabled={!dirty || saving}
					startIcon={<TickCircle size={18} />}
					sx={{
						textTransform: "none",
						transition: "transform 200ms ease, box-shadow 200ms ease",
						"&:hover:not(:disabled)": { transform: "translateY(-1px)", boxShadow: `0 4px 12px ${alpha(BRAND_BLUE, 0.32)}` },
						"&:active:not(:disabled)": { transform: "scale(0.98)" },
					}}
				>
					{saving ? "Guardando…" : "Guardar cambios"}
				</Button>
				{dirty && (
					<>
						<Button
							variant="outlined"
							color="inherit"
							onClick={() => {
								setLocal({});
								setDirty(false);
							}}
							startIcon={<CloseCircle size={18} />}
							sx={{ textTransform: "none" }}
						>
							Descartar
						</Button>
						<Typography variant="caption" color="warning.main">
							Hay cambios sin guardar
						</Typography>
					</>
				)}
			</Stack>
		</Stack>
	);
}

// ── Sección: Workers ──────────────────────────────────────────────────────────

function WorkerCard({ fila, onSaved }: { fila: Resumen["porFuero"][number]; onSaved: (c: UpdateMovimientosWorkerConfig) => void }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const config = fila.config;
	const [local, setLocal] = useState<Partial<UpdateMovimientosWorkerConfig>>({});
	const [saving, setSaving] = useState(false);
	const [ajustesAbiertos, setAjustesAbiertos] = useState(false);

	const dirty = Object.keys(local).length > 0;
	const merged = { ...config, ...local };
	const parado = config.enabled && (fila.horasSinCorrer ?? Infinity) > HORAS_PARA_CONSIDERAR_PARADO;
	const acento = !config.enabled ? theme.palette.text.disabled : parado ? STALE_AMBER : LIVE_GREEN;

	function patch(key: string, value: unknown) {
		setLocal((p) => ({ ...p, [key]: value }));
	}

	async function save() {
		setSaving(true);
		try {
			onSaved(await UpdateMovimientosService.updateWorkerConfig(config._id, local));
			setLocal({});
			enqueueSnackbar(`Worker ${FUERO_LABELS[config.fuero] || config.fuero} guardado`, { variant: "success" });
		} catch {
			enqueueSnackbar("Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<Paper variant="outlined" sx={{ borderRadius: 2, borderColor: alpha(acento, isDark ? 0.45 : 0.3), overflow: "hidden" }}>
			<Box sx={{ p: 2 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} flexWrap="wrap" useFlexGap>
					<Box>
						<Typography variant="h5" fontWeight={700}>
							{fila.label}
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
							{config.worker_id}
						</Typography>
					</Box>
					<FormControlLabel
						sx={{ mr: 0 }}
						control={<Switch checked={merged.enabled} onChange={(e) => patch("enabled", e.target.checked)} color="success" />}
						label={
							<Typography variant="body2" fontWeight={600} color={merged.enabled ? "success.main" : "text.secondary"}>
								{merged.enabled ? "Habilitado" : "Deshabilitado"}
							</Typography>
						}
					/>
				</Stack>

				{/* Una línea que dice qué hace y a qué ritmo: era lo que había que
				    deducir del campo "Cron pattern". */}
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
					{fila.cadaMin ? (
						<>
							Un ciclo cada <b>{fila.cadaMin} min</b>, <b>{merged.batchSize ?? 1}</b> causa{(merged.batchSize ?? 1) > 1 ? "s" : ""} por
							ciclo
							{fila.capacidad != null ? (
								<>
									{" "}
									→ hasta <b>{fmtNum(fila.capacidad)}</b> causas por día
								</>
							) : null}
							.
						</>
					) : (
						<>
							Cron <b style={{ fontFamily: "monospace" }}>{merged.cronPattern}</b> · {merged.batchSize ?? 1} causa por ciclo.
						</>
					)}{" "}
					Última corrida <b style={{ color: parado ? STALE_AMBER : undefined }}>{timeAgo(fila.ultimaCorrida)}</b>.
				</Typography>

				<Grid container spacing={1.5} sx={{ mt: 0.5 }}>
					<Grid item xs={6} sm={3}>
						<Metrica label="En cola" value={fila.cola} color={fila.cola > 0 ? STALE_AMBER : undefined} />
					</Grid>
					<Grid item xs={6} sm={3}>
						<Metrica
							label="Releídas hoy"
							value={fila.procesadasHoy}
							sub={fila.esDeHoy ? undefined : `sin actividad · último día ${config.statsToday?.date || "—"}`}
						/>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Metrica label="Con error hoy" value={fila.fallidasHoy} color={fila.fallidasHoy > 0 ? theme.palette.error.main : undefined} />
					</Grid>
					<Grid item xs={6} sm={3}>
						<Metrica label="Movs. nuevos hoy" value={fila.movimientosHoy} color={fila.movimientosHoy > 0 ? LIVE_GREEN : undefined} />
					</Grid>
				</Grid>

				<Stack direction="row" spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
					<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
						Histórico: {fmtNum(config.stats?.totalProcessed)} releídas · {fmtNum(config.stats?.totalSuccess)} ok ·{" "}
						{fmtNum(config.stats?.totalFailed)} con error · {fmtNum(config.stats?.totalNewMovimientos)} movimientos nuevos
					</Typography>
				</Stack>
			</Box>

			<Divider />

			<Stack
				direction="row"
				alignItems="center"
				spacing={0.75}
				onClick={() => setAjustesAbiertos((v) => !v)}
				sx={{ px: 2, py: 1, cursor: "pointer", color: "text.secondary", "&:hover": { bgcolor: alpha(BRAND_BLUE, 0.04) } }}
			>
				{ajustesAbiertos ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
				<Typography variant="caption">Ajustes del worker (cron, lote, captcha, cooldown)</Typography>
			</Stack>

			<Collapse in={ajustesAbiertos} unmountOnExit>
				<Box sx={{ px: 2, pb: 2 }}>
					<Grid container spacing={2}>
						<Grid item xs={12} md={8}>
							<TextField
								fullWidth
								label="Cron pattern"
								value={merged.cronPattern ?? "*/2 * * * *"}
								onChange={(e) => patch("cronPattern", e.target.value)}
								helperText="Ritmo de los ciclos. El horario lo decide el manager, no este cron."
								size="small"
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<TextField
								fullWidth
								label="Causas por ciclo"
								type="number"
								value={merged.batchSize ?? 1}
								onChange={(e) => patch("batchSize", parseInt(e.target.value, 10))}
								size="small"
								inputProps={{ min: 1, max: 20 }}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								label="Timeout del lock (min)"
								type="number"
								value={merged.lockTimeoutMinutes ?? 5}
								onChange={(e) => patch("lockTimeoutMinutes", parseInt(e.target.value, 10))}
								helperText="Tras esto la causa vuelve a estar disponible"
								size="small"
								inputProps={{ min: 1, max: 60 }}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<FormControl size="small" fullWidth>
								<InputLabel>Proveedor de captcha</InputLabel>
								<Select
									label="Proveedor de captcha"
									value={merged.captcha?.defaultProvider ?? "capsolver"}
									onChange={(e) => patch("captcha", { ...merged.captcha, defaultProvider: e.target.value })}
								>
									<MenuItem value="capsolver">Capsolver</MenuItem>
									<MenuItem value="2captcha">2Captcha</MenuItem>
									<MenuItem value="captchaai">CaptchaAI</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								label="Balance mínimo de captcha"
								type="number"
								value={merged.captcha?.minimumBalance ?? 0.5}
								onChange={(e) => patch("captcha", { ...merged.captcha, minimumBalance: parseFloat(e.target.value) })}
								size="small"
								inputProps={{ min: 0, step: 0.1 }}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Errores seguidos antes de pausar"
								type="number"
								value={merged.errorCooldown?.maxConsecutiveErrors ?? 3}
								onChange={(e) => patch("errorCooldown", { ...merged.errorCooldown, maxConsecutiveErrors: parseInt(e.target.value, 10) })}
								size="small"
								inputProps={{ min: 1, max: 20 }}
							/>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Horas de pausa tras esos errores"
								type="number"
								value={merged.errorCooldown?.cooldownHours ?? 6}
								onChange={(e) => patch("errorCooldown", { ...merged.errorCooldown, cooldownHours: parseInt(e.target.value, 10) })}
								size="small"
								inputProps={{ min: 1, max: 72 }}
							/>
						</Grid>
					</Grid>
				</Box>
			</Collapse>

			{dirty && (
				<>
					<Divider />
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.5, bgcolor: alpha(STALE_AMBER, 0.08) }}>
						<Button
							variant="contained"
							size="small"
							disabled={saving}
							onClick={save}
							startIcon={<TickCircle size={16} />}
							sx={{ textTransform: "none" }}
						>
							{saving ? "Guardando…" : "Guardar"}
						</Button>
						<Button
							variant="outlined"
							size="small"
							color="inherit"
							onClick={() => setLocal({})}
							startIcon={<CloseCircle size={16} />}
							sx={{ textTransform: "none" }}
						>
							Descartar
						</Button>
						<Typography variant="caption" color="warning.main">
							Cambios sin guardar
						</Typography>
					</Stack>
				</>
			)}
		</Paper>
	);
}

function WorkersSection({ r, onSaved }: { r: Resumen; onSaved: (c: UpdateMovimientosWorkerConfig) => void }) {
	if (r.porFuero.length === 0) {
		return <Alert severity="info">No hay configuraciones de worker. Se crean solas cuando el worker arranca por primera vez.</Alert>;
	}
	return (
		<Stack spacing={2}>
			{r.porFuero.map((fila) => (
				<WorkerCard key={fila.config._id} fila={fila} onSaved={onSaved} />
			))}
		</Stack>
	);
}

// ── Componente principal ──────────────────────────────────────────────────────

const SECTIONS = [
	{ label: "Estado", value: "estado", icon: <Chart size={16} /> },
	{ label: "Manager", value: "manager", icon: <ArrowUp size={16} /> },
	{ label: "Workers", value: "workers", icon: <Setting2 size={16} /> },
];

export default function UpdateMovimientosWorkerTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [section, setSection] = useState("estado");

	// Una sola carga para toda la vista: antes cada sección pedía lo mismo por
	// su cuenta (tres fetch de los mismos dos endpoints) y podían mostrar
	// números de momentos distintos.
	const [manager, setManager] = useState<UpdateMovimientosManagerConfig | null>(null);
	const [workers, setWorkers] = useState<UpdateMovimientosWorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [toggling, setToggling] = useState<Record<string, boolean>>({});

	const load = useCallback(async () => {
		setLoading(true);
		const [m, w] = await Promise.allSettled([UpdateMovimientosService.getManagerConfig(), UpdateMovimientosService.getWorkerConfigs()]);
		if (m.status === "fulfilled") setManager(m.value);
		if (w.status === "fulfilled") setWorkers(w.value);
		if (m.status === "rejected" || w.status === "rejected") {
			enqueueSnackbar("Error al cargar la configuración del flujo", { variant: "error" });
		}
		setLoading(false);
	}, [enqueueSnackbar]);

	useEffect(() => {
		load();
	}, [load]);

	const r = useMemo(() => calcularResumen(manager, workers), [manager, workers]);

	const upsertWorker = (c: UpdateMovimientosWorkerConfig) => setWorkers((prev) => prev.map((w) => (w._id === c._id ? c : w)));

	const handleToggleFuero = async (config: UpdateMovimientosWorkerConfig, val: boolean) => {
		setToggling((p) => ({ ...p, [config._id]: true }));
		try {
			upsertWorker(await UpdateMovimientosService.updateWorkerConfig(config._id, { enabled: val }));
			enqueueSnackbar(`Worker ${FUERO_LABELS[config.fuero] || config.fuero} ${val ? "habilitado" : "deshabilitado"}`, {
				variant: val ? "success" : "warning",
			});
		} catch {
			enqueueSnackbar("Error actualizando", { variant: "error" });
		} finally {
			setToggling((p) => ({ ...p, [config._id]: false }));
		}
	};

	if (loading && !manager && workers.length === 0) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rounded" height={72} />
				<Skeleton variant="rounded" height={168} />
				<Skeleton variant="rounded" height={220} />
			</Stack>
		);
	}

	return (
		<Stack spacing={3}>
			<WorkerControlPanel
				processes={
					workers.length > 0
						? workers.map((cfg) => ({
								label: FUERO_LABELS[cfg.fuero] || cfg.fuero,
								description: cfg.worker_id,
								enabled: cfg.enabled,
								toggling: toggling[cfg._id] ?? false,
								onToggle: (val) => handleToggleFuero(cfg, val),
						  }))
						: ALL_FUEROS.map((f) => ({
								label: FUERO_LABELS[f] || f,
								description: "cargando…",
								enabled: null,
								onToggle: () => {},
						  }))
				}
			/>

			<ResumenFlujo r={r} loading={loading} onRefresh={load} />
			<AvisosSalud r={r} />

			<Box>
				<Tabs
					value={section}
					onChange={(_, v) => setSection(v)}
					variant="scrollable"
					scrollButtons="auto"
					sx={{
						borderBottom: `1px solid ${headerBorder(isDark)}`,
						mb: 3,
						"& .MuiTab-root": {
							minHeight: 46,
							textTransform: "none",
							fontSize: "0.875rem",
							fontWeight: 500,
							transition: "color 200ms ease",
							"&.Mui-selected": { color: BRAND_BLUE, fontWeight: 600 },
						},
						"& .MuiTabs-indicator": { bgcolor: BRAND_BLUE, height: 2.5 },
					}}
				>
					{SECTIONS.map((s) => (
						<Tab
							key={s.value}
							value={s.value}
							label={
								<Stack direction="row" spacing={1} alignItems="center">
									<Box sx={{ display: "flex", color: section === s.value ? BRAND_BLUE : theme.palette.text.secondary }}>{s.icon}</Box>
									<span>{s.label}</span>
								</Stack>
							}
						/>
					))}
				</Tabs>

				{section === "estado" && <EstadoSection r={r} manager={manager} />}
				{section === "manager" && <ManagerSection manager={manager} r={r} onSaved={setManager} />}
				{section === "workers" && <WorkersSection r={r} onSaved={upsertWorker} />}
			</Box>
		</Stack>
	);
}
