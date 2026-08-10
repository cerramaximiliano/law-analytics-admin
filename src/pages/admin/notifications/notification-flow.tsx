import React, { useState } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import {
	Box,
	Chip,
	Divider,
	Grid,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Alert,
	AlertTitle,
} from "@mui/material";
import {
	ArrowDown2,
	ArrowRight2,
	Building,
	Clock,
	CloudConnection,
	Danger,
	DocumentText,
	Filter,
	InfoCircle,
	Judge,
	MessageNotif,
	Notification,
	People,
	SecuritySafe,
	Send2,
	TickCircle,
	Warning2,
} from "iconsax-react";
import MainCard from "components/MainCard";
import LiveConfigSummary from "./components/LiveConfigSummary";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ============================================================================
// Datos del esquema — relevamiento de código (2026-08). Fuente de verdad:
// cada worker emisor + la-notification. Actualizar acá si cambia la lógica.
// ============================================================================

type YesNoPartial = "yes" | "no" | "partial";

interface MovementSource {
	key: string; // source key en movementPolicies.sources
	nombre: string;
	repo: string;
	pm2: string;
	server: string;
	trigger: string;
	firstSyncFallback: "silent-baseline" | "today-only" | "notify-all";
	seleccionCausas: string[];
	usuariosDestino: string;
	archivadas: { valor: YesNoPartial; detalle: string };
	notas?: string[];
}

const MOVEMENT_SOURCES: MovementSource[] = [
	{
		key: "pjn-app-update-worker",
		nombre: "PJN — app-update (emisor principal)",
		repo: "pjn-workers",
		pm2: "pjn-app-update-{civil,ss,trabajo,comercial} + manager",
		server: "pjnworker",
		trigger: "Loop continuo, ventana 8–22 h, autoescala 1–10 instancias",
		firstSyncFallback: "today-only",
		seleccionCausas: [
			"source ∈ {app, cache} · verified: true · isValid: true · update: true",
			"isPrivate ≠ true · hasActiveCredential ≠ true (esas van por Mis Causas)",
			"movimientosCount > 0 · lastUpdate > 12 h · sin lock ni cooldown",
			"Solo notifica si detectó movimientos agregados o reemplazados en el ciclo",
			"source 'cache' + cacheSourceTodayOnly → solo movimientos con fecha de HOY (UTC)",
		],
		usuariosDestino: "userUpdatesEnabled[].enabled === true → fallback: TODOS los userCausaIds",
		archivadas: {
			valor: "partial",
			detalle: "El worker no filtra, pero la entrega central aplica notifyArchivedFolders (defaults u override 'pjn').",
		},
		notas: [
			"Docs source:'app' fuera de first-sync notifican todo movimiento nuevo aunque su fecha sea vieja.",
			"movimientosReemplazados > 0 reenvía el set completo — el dedup queda 100% en la-notification.",
			"'Hoy' se compara en UTC (no ART): entre 21:00 y 24:00 ART difiere el día.",
		],
	},
	{
		key: "pjn-mis-causas-update-worker",
		nombre: "PJN Mis Causas — causas privadas",
		repo: "pjn-mis-causas",
		pm2: "pjn-private-causas-update (gobernado por manager)",
		server: "worker_02",
		trigger: "Ciclos del manager (scraping-manager-state en Mongo)",
		firstSyncFallback: "silent-baseline",
		seleccionCausas: [
			"linkedCredentials no vacío + credencial enabled: true",
			"source ∈ {pjn-login, cache, app} · lastUpdate vencido",
			"Sin filtro verified / isValid / archived",
			"Solo CASO 1 (movimientos nuevos con fecha > referencia, deduplicados); reemplazos NO notifican",
		],
		usuariosDestino: "userUpdatesEnabled → fallback userCausaIds",
		archivadas: { valor: "partial", detalle: "El worker no filtra; la entrega central aplica notifyArchivedFolders ('pjn')." },
		notas: ["Baseline inicial se persiste sin notificar (silent-baseline).", "'Hoy' se compara en hora LOCAL (difiere de pjn-workers que usa UTC)."],
	},
	{
		key: "mev-update-worker",
		nombre: "MEV — update cluster",
		repo: "mev-workers",
		pm2: "mev-update-cluster (2 inst.)",
		server: "worker-002",
		trigger: "Cron Mongo shared_update, default */15 · gate de portal sano",
		firstSyncFallback: "silent-baseline",
		seleccionCausas: [
			"verified: true · isValid: true · update: true · source: 'app'",
			"lastCheckedDate > update_frequency_hours (24 h) · sin lock ni cooldown de jurisdicción",
			"Gates: portal MEV sano, config enabled, password válido, ventana horaria",
			"Dedup por mevId + clave fecha|detalle con corte al primer match",
		],
		usuariosDestino: "userUpdatesEnabled → fallback userCausaIds",
		archivadas: { valor: "partial", detalle: "El worker no filtra; la entrega central aplica notifyArchivedFolders ('mev')." },
		notas: ["Updates sucesivos notifican TODOS los movimientos nuevos sin importar fecha."],
	},
	{
		key: "scba-update-worker",
		nombre: "SCBA — update (active + archived)",
		repo: "scba-workers",
		pm2: "scba-update-worker (*/2) + scba-update-archived-worker (0 4 * * *) — spawn dinámico del manager",
		server: "worker_02",
		trigger: "Crons de configuracion-scba, ventana 8–20 h · gate de portal sano",
		firstSyncFallback: "today-only",
		seleccionCausas: [
			"verificacion.verificado: true · listStatus: 'active' · scraping completed · update ≠ false",
			"$lookup a folders: modo normal exige ≥1 folder ACTIVO; modo archived exige folders todos archivados",
			"Causas sin ningún folder vinculado se saltean en ambos modos",
			"Dedup por clave fecha|detalle|verUrl (merge por Map)",
		],
		usuariosDestino: "userUpdatesEnabled → fallback userCausaIds",
		archivadas: {
			valor: "partial",
			detalle:
				"Única fuente con manejo explícito: worker dedicado para folders archivados (1×/día 4 AM), apagable con notifyArchivedFolders=false (default: notifica).",
		},
		notas: ["Envía fuero 'MEV' deliberadamente para unificar template.", "tipo hardcodeado 'TRAMITE' → filtros por tipo casi no aplican; el útil es excludedKeywords."],
	},
	{
		key: "eje-update-worker",
		nombre: "EJE — update worker",
		repo: "eje-workers",
		pm2: "eje-update-worker",
		server: "worker_02",
		trigger: "Cron manager, default */10, working hours ~8–20 ART",
		firstSyncFallback: "silent-baseline",
		seleccionCausas: [
			"verified: true · isValid: true · isPrivate ≠ true",
			"detailsLastUpdate > updateThresholdHours (24 h) · sin lock",
			"Diff real por movimiento.numero contra los persistidos",
		],
		usuariosDestino: "userUpdatesEnabled → fallback userCausaIds",
		archivadas: { valor: "partial", detalle: "Worker + entrega central respetan notifyArchivedFolders ('eje')." },
	},
	{
		key: "eje-stuck-worker",
		nombre: "EJE — stuck worker (first-touch)",
		repo: "eje-workers",
		pm2: "eje-stuck-worker",
		server: "worker_02",
		trigger: "Cron fijo */5 — SOLO fuera del horario del update-worker (noche / finde)",
		firstSyncFallback: "silent-baseline",
		seleccionCausas: [
			"verified + isValid + no privadas + JAMÁS tocadas (detailsLastUpdate inexistente) + errorCount 0",
			"Siempre es first-sync → con silent-baseline no notifica nada (solo notificaría con today-only/notify-all)",
		],
		usuariosDestino: "userUpdatesEnabled → fallback userCausaIds",
		archivadas: { valor: "partial", detalle: "Mismo comportamiento que eje-update-worker (entrega central aplica la política)." },
	},
];

interface InternalProducer {
	nombre: string;
	trigger: string;
	seleccion: string[];
	archivadas: { valor: YesNoPartial; detalle: string };
	notas?: string[];
}

const INTERNAL_PRODUCERS: InternalProducer[] = [
	{
		nombre: "Coordinador de movimientos (safety-net interno)",
		trigger: "Dentro del cron judicial (*/15) de la-notification",
		seleccion: [
			"Escanea 11 colecciones PJN (civil, comercial, segsocial, trabajo, CAF, CCF, CNE, CPE, CFP, CCC, CSJ)",
			"Causas con fechaUltimoMovimiento = HOY (UTC) → movimientos del día",
			"Usuarios = Folder.find({ causaId }) — excluye archivados si notifyArchivedFolders=false",
			"Respeta status.enabled/coordinatorEnabled, activeDays y filtros de contenido",
			"Crea JudicialMovement pending con notifyAt = dailyNotificationHour de la config (fallback 19:00 ART)",
		],
		archivadas: {
			valor: "partial",
			detalle: "Configurable: movementPolicies.defaults.notifyArchivedFolders (o override 'pjn') — aplicado en el Folder.find del coordinador.",
		},
		notas: [
			"Red de seguridad: garantiza que ningún movimiento del día con folder vinculado quede sin notificar, incluso si el worker no lo envió.",
			"Apagable desde la admin UI con status.coordinatorEnabled.",
		],
	},
	{
		nombre: "Coordinador de cédulas (notificaciones electrónicas)",
		trigger: "Mismo cron */15 — lee pjn-notifications (poblada por pjn-bandeja-sync)",
		seleccion: [
			"Docs con notified ≠ true (batch 500)",
			"SOLO cédulas del día actual (ART): las viejas se marcan coordinadas SIN email",
			"Destinatario = dueño de la credencial (no se expande a otros usuarios del folder)",
		],
		archivadas: { valor: "yes", detalle: "Sin concepto de archivado: la cédula va al domicilio electrónico del dueño de la credencial." },
	},
];

interface RelayEndpoint {
	endpoint: string;
	evento: string;
	emisores: string;
	condiciones: string;
	persiste: boolean;
}

const RELAY_ENDPOINTS: RelayEndpoint[] = [
	{
		endpoint: "/api/folder-events/created",
		evento: "folders_created → WS user room",
		emisores: "pjn-mis-causas (causa-sync) · scba-workers (verification)",
		condiciones: "Solo folders recién creados. PJN excluye los archivados por límite de plan; SCBA envía flag archived.",
		persiste: false,
	},
	{
		endpoint: "/api/sync-progress/update",
		evento: "sync_progress → WS user room",
		emisores: "5 workers de pjn-mis-causas · scba-workers (verification + initial-scraping)",
		condiciones: "Telemetría de fases de sincronización por usuario. Sin filtros.",
		persiste: false,
	},
	{
		endpoint: "/api/seclo-events/credential-update · solicitud-update",
		evento: "seclo_credential_update / seclo_solicitud_update → WS",
		emisores: "trabajo-worker (creds-checker */5 · envio */5 · agenda */5)",
		condiciones: "checking/validated/invalid en validación de credencial; processing/submitted/completed/error por solicitud; agenda solo si obtuvo conciliador.",
		persiste: false,
	},
	{
		endpoint: "/api/system-status/broadcast",
		evento: "system_status → TODOS los sockets",
		emisores: "mev-workers (MEV_SITE_STATUS) · scba-workers (SCBA_SITE_STATUS, 5 procesos) · pjn (PJN_SITE_STATUS)",
		condiciones: "Solo en TRANSICIÓN de estado del portal (3 fallos consecutivos, cooldown 1 h, latch en doc singleton).",
		persiste: false,
	},
	{
		endpoint: "/api/alerts/create",
		evento: "Alerta persistida + campanita",
		emisores: "scba-workers (verification)",
		condiciones: "Solo cuando el sync archivó ≥1 folder por límite de plan ('Ver planes').",
		persiste: true,
	},
];

interface CronInterno {
	nombre: string;
	cron: string;
	descripcion: string;
	filtros: string[];
}

const CRONES_INTERNOS: CronInterno[] = [
	{
		nombre: "Movimientos judiciales + cédulas",
		cron: "*/15 (NOTIFICATION_JUDICIAL_MOVEMENT_CRON)",
		descripcion: "Coordina faltantes y envía email consolidado (movimientos + cédulas del usuario en un solo correo).",
		filtros: [
			"JudicialMovement/JudicialCedula pending con notifyAt ≤ ahora, agrupados por usuario",
			"Usuario debe existir · isActive ≠ false (si no → failed terminal)",
			"Email: channels.email ≠ false (default habilitado) · Browser: channels.browser === true (opt-in)",
			"Reporte admin a las 15:00 / 17:00 / 19:30 o ante errores",
		],
	},
	{
		nombre: "Calendario",
		cron: "0 9 (NOTIFICATION_CALENDAR_CRON)",
		descripcion: "Eventos próximos según daysInAdvance del usuario (default 5).",
		filtros: ["isActive ≠ false · user.calendar ≠ false · email ≠ false o browser === true"],
	},
	{
		nombre: "Tareas",
		cron: "15 9 (NOTIFICATION_TASK_CRON)",
		descripcion: "Tareas con vencimiento próximo.",
		filtros: ["Excluye status completada/cancelada · mismas preferencias de canal"],
	},
	{
		nombre: "Vencimientos (movimientos de usuario)",
		cron: "45 9 (NOTIFICATION_MOVEMENT_CRON)",
		descripcion: "Movements creados por el usuario con dateExpiration próxima.",
		filtros: ["user.expiration ≠ false · expirationSettings.daysInAdvance (default 5)"],
	},
	{
		nombre: "Caducidad y prescripción",
		cron: "0 10 (NOTIFICATION_FOLDER_INACTIVITY_CRON)",
		descripcion: "Folders inactivos próximos a caducidad (180 d) o prescripción (730 d).",
		filtros: [
			"ÚNICO flujo que excluye archivados: archived: false y status ≠ 'Cerrada'",
			"user.inactivity ≠ false · email ≠ false · dedup: no repite alertType el mismo día",
		],
	},
	{
		nombre: "Limpieza semanal",
		cron: "0 2 dom (CLEANUP_CRON)",
		descripcion: "Purga movimientos sent (60 d), logs (30 d) y alertas entregadas (30 d) según dataRetention.",
		filtros: [],
	},
];

interface Hallazgo {
	severidad: "error" | "warning" | "info";
	titulo: string;
	detalle: string;
}

const HALLAZGOS: Hallazgo[] = [
	{
		severidad: "info",
		titulo: "RESUELTO — folders archivados ahora configurables centralmente",
		detalle:
			"la-notification aplica notifyArchivedFolders (movementPolicies.defaults u override por jurisdicción pjn/eje/mev/scba) en la ENTREGA y en el coordinador interno. Con 'No notificar archivados', el movimiento se descarta ('skipped' con motivo) aunque el worker lo haya enviado. Default: notificar (comportamiento histórico).",
	},
	{
		severidad: "info",
		titulo: "RESUELTO — bypass de pjn-api cerrado en la entrega",
		detalle:
			"pjn-api sigue posteando sin consultar la config, pero ahora la entrega central re-aplica kill-switch global/por source, días activos, filtros de contenido y archivados. Ningún camino evita la config.",
	},
	{
		severidad: "warning",
		titulo: "Fallback a userCausaIds ignora preferencias",
		detalle:
			"En todos los emisores, si la causa no tiene userUpdatesEnabled, se notifica a TODOS los userCausaIds. El único gate de preferencia real es channels.email ≠ false en la entrega.",
	},
	{
		severidad: "error",
		titulo: "POST /api/events/mcp-app-connected no existe en la-notification",
		detalle:
			"law-analytics-server lo llama (fire-and-forget) al aceptar un consent OAuth/MCP, pero la-notification no monta ningún router /api/events → 404 silencioso. El email de 'app conectada' nunca sale.",
	},
	{
		severidad: "info",
		titulo: "'Hoy' inconsistente entre workers (UTC vs ART)",
		detalle:
			"pjn-workers compara fecha de hoy en UTC; pjn-mis-causas en hora local; los coordinadores usan ART. Entre 21:00 y 24:00 ART el día difiere y un movimiento puede clasificarse distinto según el emisor.",
	},
	{
		severidad: "info",
		titulo: "app-update-worker legacy en pjn-workers-scraping",
		detalle:
			"Copia vieja sin movementPolicies ni first-sync guard: si llegara a correr, notificaría históricos completos (mitigado: la entrega central ahora filtra igual). No figura en los procesos esperados — verificar que siga apagado.",
	},
	{
		severidad: "info",
		titulo: "Límites por usuario: opt-in vía limits.enforcePerUserLimits",
		detalle:
			"maxNotificationsPerUserPerDay y minHoursBetweenSameExpediente ahora se aplican en la entrega cuando enforcePerUserLimits está activo (default apagado). Lo que excede el límite se difiere, no se pierde.",
	},
];

// ============================================================================
// Componentes de presentación
// ============================================================================

const FIRST_SYNC_LABEL: Record<MovementSource["firstSyncFallback"], { label: string; color: "default" | "success" | "warning" }> = {
	"silent-baseline": { label: "1ª sync: silenciosa", color: "default" },
	"today-only": { label: "1ª sync: solo hoy", color: "success" },
	"notify-all": { label: "1ª sync: todo", color: "warning" },
};

const ArchivadasChip = ({ value }: { value: { valor: YesNoPartial; detalle: string } }) => {
	const map: Record<YesNoPartial, { label: string; color: string }> = {
		yes: { label: "Notifica archivadas", color: STALE_AMBER },
		no: { label: "Excluye archivadas", color: LIVE_GREEN },
		partial: { label: "Archivadas configurables", color: BRAND_BLUE },
	};
	const cfg = map[value.valor];
	return (
		<Tooltip title={value.detalle} arrow>
			<Chip
				size="small"
				label={cfg.label}
				sx={{ bgcolor: alpha(cfg.color, 0.12), color: cfg.color, fontWeight: 600, border: `1px solid ${alpha(cfg.color, 0.35)}` }}
			/>
		</Tooltip>
	);
};

const StageBox = ({
	icon,
	title,
	subtitle,
	items,
	color,
}: {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	items: string[];
	color: string;
}) => {
	const theme = useTheme();
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				height: "100%",
				borderColor: alpha(color, 0.4),
				bgcolor: alpha(color, theme.palette.mode === "dark" ? 0.08 : 0.04),
				borderRadius: 2,
			}}
		>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
				<Box sx={{ color, display: "flex" }}>{icon}</Box>
				<Typography variant="subtitle1" fontWeight={700}>
					{title}
				</Typography>
			</Stack>
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
				{subtitle}
			</Typography>
			<Stack spacing={0.5}>
				{items.map((it) => (
					<Typography key={it} variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.45 }}>
						• {it}
					</Typography>
				))}
			</Stack>
		</Paper>
	);
};

const FlowArrow = () => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: theme.palette.text.disabled,
				px: { md: 0.5 },
				py: { xs: 0.5, md: 0 },
			}}
		>
			<Box sx={{ display: { xs: "none", md: "flex" } }}>
				<ArrowRight2 size={22} />
			</Box>
			<Box sx={{ display: { xs: "flex", md: "none" } }}>
				<ArrowDown2 size={22} />
			</Box>
		</Box>
	);
};

const NotificationFlowPage = () => {
	const theme = useTheme();
	const [expandedSource, setExpandedSource] = useState<string | false>(false);

	return (
		<MainCard
			title="Esquema del flujo de notificaciones"
			secondary={
				<Chip
					icon={<InfoCircle size={16} />}
					label="Relevamiento de código · agosto 2026"
					size="small"
					variant="outlined"
					sx={{ "& .MuiChip-icon": { color: BRAND_BLUE } }}
				/>
			}
		>
			<Stack spacing={4}>
				{/* ============ 0. Configuración vigente (en vivo) ============ */}
				<LiveConfigSummary />

				{/* ============ 1. Pipeline general ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 0.5 }}>
						Pipeline end-to-end
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Camino de un documento judicial desde el scraping hasta el usuario final. Todos los emisores autentican con{" "}
						<code>INTERNAL_SERVICE_TOKEN</code> contra <code>notifications.lawanalytics.app</code> (PM2 <code>notification-service</code> en
						worker-003).
					</Typography>
					<Grid container alignItems="stretch" sx={{ flexWrap: { md: "nowrap" } }}>
						<Grid item xs={12} md>
							<StageBox
								icon={<CloudConnection size={20} />}
								color={BRAND_BLUE}
								title="1 · Workers emisores"
								subtitle="Detectan movimientos nuevos y postean al webhook"
								items={[
									"PJN app-update (loop 8–22 h)",
									"PJN Mis Causas (privadas)",
									"MEV update (*/15)",
									"SCBA update (*/2 + archived 4 AM)",
									"EJE update (*/10) + stuck (first-touch)",
									"pjn-api (envío manual admin)",
								]}
							/>
						</Grid>
						<FlowArrow />
						<Grid item xs={12} md>
							<StageBox
								icon={<Filter size={20} />}
								color="#8B5CF6"
								title="2 · Gates del emisor"
								subtitle="judicial-notification-configs (Mongo, cache 5 min)"
								items={[
									"Kill-switch global (status.enabled / maintenance)",
									"Kill-switch por source (movementPolicies)",
									"Días activos (default lun–vie) + offDayMode",
									"Política de 1ª sincronización",
									"Filtros de tipo / keywords · batch ≤ 100",
									"Usuarios: userUpdatesEnabled → userCausaIds",
								]}
							/>
						</Grid>
						<FlowArrow />
						<Grid item xs={12} md>
							<StageBox
								icon={<DocumentText size={20} />}
								color={STALE_AMBER}
								title="3 · Webhook + coordinación"
								subtitle="la-notification persiste JudicialMovement / JudicialCedula"
								items={[
									"POST /webhook/daily-movements",
									"Dedup por uniqueKey (user + expte + fecha + tipo + hash detalle)",
									"'sent' nunca se re-notifica; pending/failed se resetean",
									"Coordinador PJN: safety-net cada 15 min (11 colecciones)",
									"Coordinador cédulas: solo día actual ART",
								]}
							/>
						</Grid>
						<FlowArrow />
						<Grid item xs={12} md>
							<StageBox
								icon={<Send2 size={20} />}
								color={LIVE_GREEN}
								title="4 · Entrega al usuario"
								subtitle="Cron */15 · notifyAt ≤ ahora · agrupado por usuario"
								items={[
									"ENFORCEMENT CENTRAL: kill-switch global/por source, días activos, filtros de contenido, folders archivados (skipped con motivo)",
									"Límites por usuario (opt-in enforcePerUserLimits): difiere excedentes",
									"Usuario existe + isActive ≠ false",
									"Email (SES): channels.email ≠ false — 1 correo consolidado",
									"Browser: channels.browser === true (opt-in) → Alert + WS",
									"Retención: sent 60 d · skipped 30 d · logs 30 d",
								]}
							/>
						</Grid>
					</Grid>
				</Box>

				<Divider />

				{/* ============ 2. Matriz por fuente ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 0.5 }}>
						¿Qué documentos se notifican? — matriz por fuente
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Condiciones que debe cumplir un movimiento para llegar al usuario, según el worker que lo detecta.
					</Typography>
					<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
						<Table size="small">
							<TableHead>
								<TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
									<TableCell>Fuente</TableCell>
									<TableCell>Causa requerida</TableCell>
									<TableCell>1ª sincronización</TableCell>
									<TableCell>Updates sucesivos</TableCell>
									<TableCell>Archivadas</TableCell>
									<TableCell>Destinatarios</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								<TableRow>
									<TableCell>PJN app-update</TableCell>
									<TableCell>verified + isValid + update + pública</TableCell>
									<TableCell>Solo de hoy (UTC)</TableCell>
									<TableCell>Todo mov. nuevo (sin filtro de fecha)</TableCell>
									<TableCell>Configurable (central)</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>PJN Mis Causas</TableCell>
									<TableCell>Credencial habilitada (sin verified)</TableCell>
									<TableCell>Silenciosa</TableCell>
									<TableCell>Solo movs. nuevos posteriores a referencia</TableCell>
									<TableCell>Configurable (central)</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>MEV</TableCell>
									<TableCell>verified + isValid + update + source app</TableCell>
									<TableCell>Silenciosa</TableCell>
									<TableCell>Todo mov. nuevo</TableCell>
									<TableCell>Configurable (central)</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>SCBA</TableCell>
									<TableCell>verificado + active + ≥1 folder vinculado</TableCell>
									<TableCell>Solo de hoy (ART)</TableCell>
									<TableCell>Todo mov. nuevo</TableCell>
									<TableCell>Configurable (worker dedicado)</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>EJE</TableCell>
									<TableCell>verified + isValid + no privada</TableCell>
									<TableCell>Silenciosa</TableCell>
									<TableCell>Diff por nº de movimiento</TableCell>
									<TableCell>Configurable (central)</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>Cédulas PJN (bandeja)</TableCell>
									<TableCell>Credencial del usuario</TableCell>
									<TableCell colSpan={2}>Solo cédulas del día actual (ART); viejas se marcan sin email</TableCell>
									<TableCell>N/A</TableCell>
									<TableCell>Solo dueño de la credencial</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>Coordinador interno (safety-net)</TableCell>
									<TableCell>Cualquier causa PJN con mov. de HOY</TableCell>
									<TableCell colSpan={2}>Solo movimientos con fecha = hoy · respeta config central</TableCell>
									<TableCell>Configurable</TableCell>
									<TableCell>Folders vinculados (excluye archivados si la política lo pide)</TableCell>
								</TableRow>
								<TableRow>
									<TableCell>pjn-api (manual admin)</TableCell>
									<TableCell>La causa elegida por el admin</TableCell>
									<TableCell colSpan={2}>Postea sin gates, pero la ENTREGA re-aplica la config central</TableCell>
									<TableCell>Configurable</TableCell>
									<TableCell>Suscriptos → todos los vinculados</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</TableContainer>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
						Jurisdicciones SIN integración a la-notification: PJ Salta, PJ Catamarca y PJ Mendoza (usan email SES directo desde sus workers).
					</Typography>
				</Box>

				<Divider />

				{/* ============ 3. Detalle por fuente ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 0.5 }}>
						Emisores de movimientos — detalle
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Cada fuente se identifica por su <code>source</code> key (usada en <code>movementPolicies.sources</code>, editable desde la pestaña
						Configuración de Movimientos Judiciales).
					</Typography>
					{MOVEMENT_SOURCES.map((src) => (
						<Accordion
							key={src.key}
							expanded={expandedSource === src.key}
							onChange={(_e, ex) => setExpandedSource(ex ? src.key : false)}
							disableGutters
							sx={{ "&:before": { display: "none" }, border: `1px solid ${theme.palette.divider}`, borderRadius: "8px !important", mb: 1 }}
						>
							<AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
								<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ width: "100%", pr: 1 }}>
									<Judge size={18} color={BRAND_BLUE} />
									<Typography variant="subtitle1" fontWeight={600}>
										{src.nombre}
									</Typography>
									<Chip label={src.key} size="small" variant="outlined" sx={{ fontFamily: "monospace" }} />
									<Box sx={{ flexGrow: 1 }} />
									<Chip size="small" color={FIRST_SYNC_LABEL[src.firstSyncFallback].color} label={FIRST_SYNC_LABEL[src.firstSyncFallback].label} />
									<ArchivadasChip value={src.archivadas} />
								</Stack>
							</AccordionSummary>
							<AccordionDetails sx={{ pt: 0 }}>
								<Grid container spacing={2}>
									<Grid item xs={12} md={4}>
										<Stack spacing={1}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Building size={16} color={theme.palette.text.secondary} />
												<Typography variant="body2">
													<b>{src.repo}</b> · {src.server}
												</Typography>
											</Stack>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>
												{src.pm2}
											</Typography>
											<Stack direction="row" spacing={1} alignItems="center">
												<Clock size={16} color={theme.palette.text.secondary} />
												<Typography variant="body2">{src.trigger}</Typography>
											</Stack>
											<Stack direction="row" spacing={1} alignItems="center">
												<People size={16} color={theme.palette.text.secondary} />
												<Typography variant="body2">{src.usuariosDestino}</Typography>
											</Stack>
										</Stack>
									</Grid>
									<Grid item xs={12} md={8}>
										<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
											Condiciones de selección y filtrado
										</Typography>
										<Stack spacing={0.5}>
											{src.seleccionCausas.map((c) => (
												<Typography key={c} variant="body2" sx={{ fontSize: 13 }}>
													• {c}
												</Typography>
											))}
										</Stack>
										{src.notas && src.notas.length > 0 && (
											<>
												<Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5, color: STALE_AMBER }}>
													Particularidades
												</Typography>
												<Stack spacing={0.5}>
													{src.notas.map((n) => (
														<Typography key={n} variant="body2" sx={{ fontSize: 13 }}>
															⚠ {n}
														</Typography>
													))}
												</Stack>
											</>
										)}
									</Grid>
								</Grid>
							</AccordionDetails>
						</Accordion>
					))}
				</Box>

				<Divider />

				{/* ============ 4. Productores internos ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 2 }}>
						Productores internos de la-notification
					</Typography>
					<Grid container spacing={2}>
						{INTERNAL_PRODUCERS.map((p) => (
							<Grid item xs={12} md={6} key={p.nombre}>
								<Paper variant="outlined" sx={{ p: 2, height: "100%", borderRadius: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
										<SecuritySafe size={18} color={BRAND_BLUE} />
										<Typography variant="subtitle1" fontWeight={600}>
											{p.nombre}
										</Typography>
										<ArchivadasChip value={p.archivadas} />
									</Stack>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
										{p.trigger}
									</Typography>
									<Stack spacing={0.5}>
										{p.seleccion.map((s) => (
											<Typography key={s} variant="body2" sx={{ fontSize: 13 }}>
												• {s}
											</Typography>
										))}
									</Stack>
									{p.notas?.map((n) => (
										<Typography key={n} variant="body2" sx={{ fontSize: 13, mt: 1, color: theme.palette.text.secondary }}>
											{n}
										</Typography>
									))}
								</Paper>
							</Grid>
						))}
					</Grid>
				</Box>

				<Divider />

				{/* ============ 5. Canales tiempo real ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 0.5 }}>
						Canales de tiempo real (pass-through WebSocket)
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Estos endpoints no generan emails: retransmiten eventos al socket del usuario (o global) y solo /api/alerts persiste.
					</Typography>
					<TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
						<Table size="small">
							<TableHead>
								<TableRow sx={{ "& th": { fontWeight: 700 } }}>
									<TableCell>Endpoint</TableCell>
									<TableCell>Evento</TableCell>
									<TableCell>Emisores</TableCell>
									<TableCell>Condiciones</TableCell>
									<TableCell align="center">Persiste</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{RELAY_ENDPOINTS.map((r) => (
									<TableRow key={r.endpoint}>
										<TableCell sx={{ fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{r.endpoint}</TableCell>
										<TableCell>
											<Stack direction="row" spacing={0.5} alignItems="center">
												<MessageNotif size={14} color={BRAND_BLUE} />
												<span>{r.evento}</span>
											</Stack>
										</TableCell>
										<TableCell>{r.emisores}</TableCell>
										<TableCell>{r.condiciones}</TableCell>
										<TableCell align="center">
											{r.persiste ? <TickCircle size={18} color={LIVE_GREEN} /> : <Typography variant="caption">no</Typography>}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>

				<Divider />

				{/* ============ 6. Crons internos ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 2 }}>
						Crons de entrega en la-notification
					</Typography>
					<Grid container spacing={2}>
						{CRONES_INTERNOS.map((c) => (
							<Grid item xs={12} sm={6} md={4} key={c.nombre}>
								<Paper variant="outlined" sx={{ p: 2, height: "100%", borderRadius: 2 }}>
									<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
										<Notification size={16} color={BRAND_BLUE} />
										<Typography variant="subtitle2" fontWeight={700}>
											{c.nombre}
										</Typography>
									</Stack>
									<Chip label={c.cron} size="small" variant="outlined" sx={{ fontFamily: "monospace", mb: 1 }} />
									<Typography variant="body2" sx={{ fontSize: 13, mb: c.filtros.length ? 1 : 0 }}>
										{c.descripcion}
									</Typography>
									<Stack spacing={0.4}>
										{c.filtros.map((f) => (
											<Typography key={f} variant="caption" color="text.secondary">
												• {f}
											</Typography>
										))}
									</Stack>
								</Paper>
							</Grid>
						))}
					</Grid>
				</Box>

				<Divider />

				{/* ============ 7. Hallazgos ============ */}
				<Box>
					<Typography variant="h5" sx={{ mb: 0.5 }}>
						Hallazgos del relevamiento
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Comportamientos no obvios o inconsistencias detectadas al mapear el flujo (agosto 2026).
					</Typography>
					<Stack spacing={1.5}>
						{HALLAZGOS.map((h) => (
							<Alert
								key={h.titulo}
								severity={h.severidad}
								icon={h.severidad === "error" ? <Danger size={20} /> : h.severidad === "warning" ? <Warning2 size={20} /> : <InfoCircle size={20} />}
								sx={{ alignItems: "flex-start", "& .MuiAlert-message": { width: "100%" } }}
							>
								<AlertTitle sx={{ fontWeight: 700, mb: 0.25 }}>{h.titulo}</AlertTitle>
								<Typography variant="body2">{h.detalle}</Typography>
							</Alert>
						))}
					</Stack>
				</Box>
			</Stack>
		</MainCard>
	);
};

export default NotificationFlowPage;
