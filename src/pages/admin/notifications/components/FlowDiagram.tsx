import React from "react";
import { useTheme, alpha } from "@mui/material/styles";
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import {
	JudicialNotificationConfig,
	resolveEffectivePolicy,
	MovementPolicies,
} from "api/judicialNotificationConfig";
import { LiveJudicialConfig } from "./useLiveJudicialConfig";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Esquema gráfico del flujo (SVG) — DINÁMICO: los nodos reflejan el estado
// del doc judicial-notification-configs en vivo (kill-switches por source,
// coordinadores on/off, política de archivados, filtros, días activos).
// Refresca junto con el hook compartido (60 s).
// ----------------------------------------------------------------------

const COLORS = {
	pjn: BRAND_BLUE,
	eje: "#22C55E",
	mev: "#F59E0B",
	scba: "#8B5CF6",
	cedulas: "#64748B",
	danger: "#EF4444",
};

const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface NodeProps {
	x: number;
	y: number;
	w: number;
	h: number;
	title: string;
	subtitle?: string;
	color: string;
	off?: boolean;
	offLabel?: string;
	dashed?: boolean;
	tooltip?: string;
	textColor: string;
	subColor: string;
	bg: string;
}

const DiagramNode: React.FC<NodeProps> = ({ x, y, w, h, title, subtitle, color, off, offLabel, dashed, tooltip, textColor, subColor, bg }) => (
	<g opacity={off ? 0.45 : 1}>
		<rect
			x={x}
			y={y}
			width={w}
			height={h}
			rx={8}
			fill={bg}
			stroke={off ? COLORS.danger : color}
			strokeWidth={1.5}
			strokeDasharray={dashed ? "5 4" : undefined}
		/>
		<rect x={x} y={y} width={4} height={h} rx={2} fill={off ? COLORS.danger : color} />
		<text x={x + 12} y={y + (subtitle ? 19 : h / 2 + 4)} fontSize={11.5} fontWeight={700} fill={textColor}>
			{title}
			{off ? ` — ${offLabel || "OFF"}` : ""}
		</text>
		{subtitle && (
			<text x={x + 12} y={y + 34} fontSize={9.5} fill={subColor}>
				{subtitle}
			</text>
		)}
		{tooltip && <title>{tooltip}</title>}
	</g>
);

/** Curva con flecha entre dos puntos (horizontal-dominante). */
const Edge: React.FC<{ from: [number, number]; to: [number, number]; color: string; dashed?: boolean; width?: number }> = ({
	from,
	to,
	color,
	dashed,
	width = 1.5,
}) => {
	const [x1, y1] = from;
	const [x2, y2] = to;
	const mx = (x1 + x2) / 2;
	return (
		<path
			d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
			fill="none"
			stroke={color}
			strokeWidth={width}
			strokeDasharray={dashed ? "5 4" : undefined}
			markerEnd="url(#flow-arrow)"
			opacity={0.8}
		/>
	);
};

function filtersSummary(config: JudicialNotificationConfig | null): string {
	const f = config?.filters;
	if (!f) return "sin filtros";
	const parts: string[] = [];
	if (f.excludedMovementTypes?.length) parts.push(`${f.excludedMovementTypes.length} tipo(s) excluidos`);
	if (f.excludedKeywords?.length) parts.push(`${f.excludedKeywords.length} keyword(s)`);
	if (f.includedMovementTypes?.length) parts.push(`whitelist ${f.includedMovementTypes.length}`);
	return parts.length ? parts.join(" · ") : "sin filtros";
}

const FlowDiagram: React.FC<{ live: LiveJudicialConfig }> = ({ live }) => {
	const theme = useTheme();
	const { config, loading } = live;
	const dark = theme.palette.mode === "dark";

	if (loading) {
		return (
			<Stack alignItems="center" sx={{ py: 4 }}>
				<CircularProgress size={28} />
			</Stack>
		);
	}

	const policies: MovementPolicies | null | undefined = config?.movementPolicies;
	const text = theme.palette.text.primary;
	const sub = theme.palette.text.secondary;
	const bg = dark ? alpha("#0F172A", 0.6) : "#FFFFFF";
	const bandBg = dark ? alpha(BRAND_BLUE, 0.08) : alpha(BRAND_BLUE, 0.04);
	const containerBg = dark ? alpha("#1E293B", 0.5) : alpha("#F8FAFC", 0.9);
	const edgeColor = dark ? alpha("#94A3B8", 0.8) : "#94A3B8";

	const globallyOn = !config || (config.status?.enabled !== false && config.status?.mode !== "maintenance");
	const coordOn = config?.status?.coordinatorEnabled !== false;
	const cedulasOn = config?.status?.cedulasEnabled !== false;

	// Estado efectivo por source (kill-switch) — misma cascada que los workers.
	const srcEnabled = (key: string, fallback = {}) => resolveEffectivePolicy(policies, key, fallback).enabled.value !== false;
	const pjnAppOn = srcEnabled("pjn-app-update-worker");
	const misCausasOn = srcEnabled("pjn-mis-causas-update-worker");
	const mevOn = srcEnabled("mev-update-worker");
	const scbaOn = srcEnabled("scba-update-worker");
	const ejeOn = srcEnabled("eje-update-worker") || srcEnabled("eje-stuck-worker");

	const defaults = resolveEffectivePolicy(policies, "__defaults__");
	const archivedNotifica = defaults.notifyArchivedFolders.value !== false;
	const activeDaysGlobal =
		Array.isArray(config?.notificationSchedule?.activeDays) && config!.notificationSchedule.activeDays.length > 0
			? config!.notificationSchedule.activeDays.map((d) => dayNames[d] ?? String(d)).join("·")
			: "Lun–Vie";
	const limitsOn = config?.limits?.enforcePerUserLimits === true;
	const horaEntrega = `${config?.notificationSchedule?.dailyNotificationHour ?? 19}:${String(config?.notificationSchedule?.dailyNotificationMinute ?? 0).padStart(2, "0")}`;

	// Emisores (columna 1)
	const emitters: { y: number; title: string; subtitle: string; color: string; on: boolean; tooltip: string }[] = [
		{ y: 30, title: "PJN — app-update", subtitle: "4 clusters por fuero · pjnworker", color: COLORS.pjn, on: pjnAppOn, tooltip: "pjn-workers: causas verified públicas. 1ª sync: solo hoy. Sin barrera de archivados worker-side." },
		{ y: 92, title: "PJN — Mis Causas", subtitle: "causas privadas · worker_02", color: COLORS.pjn, on: misCausasOn, tooltip: "pjn-mis-causas: portal autenticado. 1ª sync silenciosa. Sin barrera de archivados worker-side." },
		{ y: 154, title: "MEV — update", subtitle: "mev-update-cluster · worker-002", color: COLORS.mev, on: mevOn, tooltip: "Causas verified source app. 1ª sync silenciosa. Sin barrera de archivados worker-side." },
		{ y: 216, title: "SCBA — update + archived", subtitle: "1ª barrera propia de archivados", color: COLORS.scba, on: scbaOn, tooltip: "Único con barrera worker-side: modo normal exige folders activos; worker archived (4 AM) lee notifyArchivedFolders." },
		{ y: 278, title: "EJE — update + stuck", subtitle: "worker_02 · diff por nº", color: COLORS.eje, on: ejeOn, tooltip: "eje-workers: update (*/10) + stuck first-touch nocturno (silent-baseline)." },
	];

	const webhookY = 70; // centro del nodo webhook

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
				<Typography variant="h5">Esquema gráfico del flujo</Typography>
				<Chip
					size="small"
					label={globallyOn ? "sistema activo — estados en vivo" : "SISTEMA DESHABILITADO"}
					sx={{
						bgcolor: alpha(globallyOn ? LIVE_GREEN : COLORS.danger, 0.12),
						color: globallyOn ? LIVE_GREEN : COLORS.danger,
						fontWeight: 600,
					}}
				/>
			</Stack>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
				Los nodos reflejan la configuración vigente (se actualiza cada 60 s): un source con kill-switch, un coordinador apagado o la
				política de archivados cambian el dibujo. Pasá el mouse sobre cada nodo para el detalle.
			</Typography>
			<Paper variant="outlined" sx={{ borderRadius: 2, overflow: "auto" }}>
				<Box sx={{ minWidth: 1240 }}>
					<svg viewBox="0 0 1240 640" width="100%" style={{ display: "block" }}>
						<defs>
							<marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
								<path d="M 0 0 L 10 5 L 0 10 z" fill={edgeColor} />
							</marker>
						</defs>

						{/* ==== Columna 1: emisores ==== */}
						<text x={16} y={18} fontSize={10} fontWeight={700} fill={sub} letterSpacing={1}>
							WORKERS EMISORES
						</text>
						{emitters.map((e) => (
							<DiagramNode
								key={e.title}
								x={16}
								y={e.y}
								w={200}
								h={46}
								title={e.title}
								subtitle={e.subtitle}
								color={e.color}
								off={!e.on}
								offLabel="kill-switch"
								tooltip={e.tooltip}
								textColor={text}
								subColor={sub}
								bg={bg}
							/>
						))}
						<DiagramNode
							x={16}
							y={352}
							w={200}
							h={46}
							title="pjn-api — envío manual"
							subtitle="admin · bypassea barrera 1"
							color={COLORS.danger}
							dashed
							tooltip="Endpoints admin de pjn-api: postean directo al webhook sin gates del worker. La barrera 2 (entrega) igual los filtra."
							textColor={text}
							subColor={sub}
							bg={bg}
						/>
						<DiagramNode
							x={16}
							y={430}
							w={200}
							h={46}
							title="pjn-bandeja-sync"
							subtitle="cédulas → Mongo pjn-notifications"
							color={COLORS.cedulas}
							tooltip="Sube las cédulas del portal a la colección pjn-notifications; el coordinador de cédulas las levanta de ahí."
							textColor={text}
							subColor={sub}
							bg={bg}
						/>

						{/* ==== Barrera 1 ==== */}
						<rect x={252} y={22} width={70} height={300} rx={10} fill={bandBg} stroke={BRAND_BLUE} strokeDasharray="6 4" strokeWidth={1.2} />
						<text x={287} y={172} fontSize={10.5} fontWeight={700} fill={BRAND_BLUE} transform="rotate(-90 287 172)" textAnchor="middle">
							BARRERA 1 · gates del worker
						</text>
						<title />

						{/* Flechas emisores → webhook (cruzan barrera 1) */}
						{emitters.map((e) => (
							<Edge key={e.title} from={[216, e.y + 23]} to={[416, webhookY]} color={e.on ? edgeColor : alpha(COLORS.danger, 0.5)} dashed={!e.on} />
						))}
						{/* pjn-api bypass (por debajo de la barrera) */}
						<path
							d={`M 216 375 C 300 375, 330 100, 416 ${webhookY + 10}`}
							fill="none"
							stroke={COLORS.danger}
							strokeWidth={1.5}
							strokeDasharray="5 4"
							markerEnd="url(#flow-arrow)"
							opacity={0.7}
						/>
						<text x={268} y={340} fontSize={9} fill={COLORS.danger}>
							bypass barrera 1
						</text>
						{/* bandeja → coordinador cédulas */}
						<Edge from={[216, 453]} to={[416, 316]} color={edgeColor} dashed />

						{/* ==== la-notification ==== */}
						<rect x={400} y={22} width={252} height={438} rx={12} fill={containerBg} stroke={alpha(BRAND_BLUE, 0.5)} strokeWidth={1.2} />
						<text x={416} y={44} fontSize={10.5} fontWeight={700} fill={BRAND_BLUE} letterSpacing={0.5}>
							LA-NOTIFICATION · worker-003
						</text>
						<DiagramNode x={416} y={52} w={220} h={40} title="Webhook /daily-movements" subtitle="Bearer INTERNAL_SERVICE_TOKEN" color={BRAND_BLUE} tooltip="POST /api/judicial-movements/webhook/daily-movements — recibe un item por usuario × movimiento." textColor={text} subColor={sub} bg={bg} />
						<DiagramNode x={416} y={116} w={220} h={40} title="Dedup por uniqueKey" subtitle="'sent' nunca se re-notifica" color={BRAND_BLUE} tooltip="uniqueKey = user + expediente + fecha + tipo + hash(detalle). pending/failed se resetean; sent se ignora." textColor={text} subColor={sub} bg={bg} />
						<DiagramNode
							x={416}
							y={196}
							w={220}
							h={40}
							title="Coordinador PJN (safety-net)"
							subtitle="11 colecciones · movs de HOY · cron */15"
							color={BRAND_BLUE}
							off={!coordOn}
							offLabel="apagado"
							tooltip="Escanea las colecciones de causas PJN con fechaUltimoMovimiento = hoy y crea las notificaciones que los workers no enviaron. Respeta la config central."
							textColor={text}
							subColor={sub}
							bg={bg}
						/>
						<DiagramNode
							x={416}
							y={276}
							w={220}
							h={40}
							title="Coordinador cédulas"
							subtitle="solo día actual ART · dueño de credencial"
							color={COLORS.cedulas}
							off={!cedulasOn}
							offLabel="apagado"
							tooltip="Lee pjn-notifications (notified≠true) y crea JudicialCedula pending solo para cédulas del día."
							textColor={text}
							subColor={sub}
							bg={bg}
						/>
						<DiagramNode x={416} y={368} w={220} h={44} title="Cola pending" subtitle={`JudicialMovement + JudicialCedula · notifyAt ${horaEntrega}`} color={STALE_AMBER} tooltip={`Documentos pending esperando notifyAt (hora de entrega configurada: ${horaEntrega} ART). El cron */15 los agrupa por usuario.`} textColor={text} subColor={sub} bg={bg} />
						{/* flujos internos */}
						<Edge from={[526, 92]} to={[526, 116]} color={edgeColor} />
						<Edge from={[526, 156]} to={[526, 368]} color={edgeColor} />
						<Edge from={[636, 216]} to={[646, 380]} color={edgeColor} />
						<Edge from={[636, 296]} to={[646, 390]} color={edgeColor} />

						{/* ==== Barrera 2 (dinámica) ==== */}
						<rect
							x={692}
							y={22}
							width={158}
							height={438}
							rx={10}
							fill={globallyOn ? bandBg : alpha(COLORS.danger, 0.08)}
							stroke={globallyOn ? BRAND_BLUE : COLORS.danger}
							strokeDasharray="6 4"
							strokeWidth={1.2}
						/>
						<text x={704} y={46} fontSize={10.5} fontWeight={700} fill={globallyOn ? BRAND_BLUE : COLORS.danger}>
							BARRERA 2 · entrega
						</text>
						<text x={704} y={60} fontSize={9} fill={sub}>
							(final — aplica a todo)
						</text>
						{[
							{ y: 86, dot: globallyOn ? LIVE_GREEN : COLORS.danger, label: globallyOn ? "Sistema: activo" : "Sistema: OFF" },
							{ y: 108, dot: BRAND_BLUE, label: `Días: ${activeDaysGlobal}` },
							{
								y: 130,
								dot: archivedNotifica ? STALE_AMBER : LIVE_GREEN,
								label: archivedNotifica ? "Archivados: notifica" : "Archivados: filtra",
							},
							{ y: 152, dot: BRAND_BLUE, label: filtersSummary(config).slice(0, 24) },
							{ y: 174, dot: limitsOn ? LIVE_GREEN : "#94A3B8", label: limitsOn ? "Límites/usuario: ON" : "Límites/usuario: off" },
							{ y: 196, dot: BRAND_BLUE, label: "Kill-switch por source" },
							{ y: 218, dot: BRAND_BLUE, label: "user.isActive ≠ false" },
							{ y: 240, dot: BRAND_BLUE, label: "channels.email ≠ false" },
						].map((row) => (
							<g key={row.y}>
								<circle cx={710} cy={row.y - 3} r={3.5} fill={row.dot} />
								<text x={720} y={row.y} fontSize={9.5} fill={text}>
									{row.label}
								</text>
								<title>Estado en vivo del doc de configuración</title>
							</g>
						))}
						{/* cola → barrera */}
						<Edge from={[636, 390]} to={[692, 240]} color={edgeColor} width={2} />

						{/* ==== Canales ==== */}
						<text x={886} y={18} fontSize={10} fontWeight={700} fill={sub} letterSpacing={1}>
							CANALES
						</text>
						<DiagramNode x={886} y={110} w={190} h={44} title="Email consolidado (SES)" subtitle="movimientos + cédulas en 1 correo" color={LIVE_GREEN} tooltip="Un solo email por usuario y corrida, con cards por expediente, CTAs y torta en el reporte admin." textColor={text} subColor={sub} bg={bg} />
						<DiagramNode x={886} y={186} w={190} h={44} title="Alerta navegador" subtitle="opt-in channels.browser === true" color={LIVE_GREEN} tooltip="Crea Alert + emite por WebSocket si el usuario activó el canal browser." textColor={text} subColor={sub} bg={bg} />
						<DiagramNode x={886} y={330} w={190} h={44} title="Descartados ('skipped')" subtitle="con motivo · retención 30 d" color={STALE_AMBER} dashed tooltip="Lo que la barrera 2 descarta queda auditado: notificationStatus='skipped' + motivo en el historial." textColor={text} subColor={sub} bg={bg} />
						<Edge from={[850, 150]} to={[886, 132]} color={edgeColor} width={2} />
						<Edge from={[850, 200]} to={[886, 208]} color={edgeColor} />
						<Edge from={[850, 330]} to={[886, 352]} color={alpha(STALE_AMBER, 0.8)} dashed />

						{/* ==== Usuario ==== */}
						<g>
							<circle cx={1160} cy={150} r={26} fill={alpha(BRAND_BLUE, dark ? 0.25 : 0.12)} stroke={BRAND_BLUE} strokeWidth={1.5} />
							<text x={1160} y={156} fontSize={16} textAnchor="middle">
								👤
							</text>
							<text x={1160} y={196} fontSize={10.5} fontWeight={700} fill={text} textAnchor="middle">
								Usuario final
							</text>
						</g>
						<Edge from={[1076, 132]} to={[1132, 143]} color={edgeColor} width={2} />
						<Edge from={[1076, 208]} to={[1134, 162]} color={edgeColor} />

						{/* ==== Lane tiempo real ==== */}
						<line x1={16} y1={500} x2={1224} y2={500} stroke={alpha(sub, 0.25)} strokeDasharray="3 5" />
						<text x={16} y={520} fontSize={10} fontWeight={700} fill={sub} letterSpacing={1}>
							TIEMPO REAL (SIN EMAIL — pass-through WebSocket)
						</text>
						<DiagramNode x={16} y={532} w={230} h={44} title="Workers de sync + SECLO" subtitle="pjn-mis-causas · scba · trabajo · mev" color={COLORS.cedulas} tooltip="Emiten folder-events, sync-progress, seclo-events y transiciones de portal (system-status)." textColor={text} subColor={sub} bg={bg} />
						<DiagramNode x={400} y={532} w={370} h={44} title="Relays: folder-events · sync-progress · seclo · system-status · alerts" subtitle="no persisten (solo alerts persiste) — retransmiten al socket" color={COLORS.cedulas} textColor={text} subColor={sub} bg={bg} />
						<DiagramNode x={886} y={532} w={190} h={44} title="Socket.io" subtitle="room user-{id} · broadcast global" color={COLORS.cedulas} textColor={text} subColor={sub} bg={bg} />
						<Edge from={[246, 554]} to={[400, 554]} color={edgeColor} />
						<Edge from={[770, 554]} to={[886, 554]} color={edgeColor} />
						<Edge from={[1076, 554]} to={[1150, 554]} color={edgeColor} />
						<text x={1160} y={558} fontSize={14} textAnchor="middle">
							🖥️
						</text>
					</svg>
				</Box>
			</Paper>
			<Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
				<Typography variant="caption" color="text.secondary">
					— línea llena: flujo activo · - - - línea punteada: bypass / descarte / fuente externa · nodo atenuado: apagado por config
				</Typography>
			</Stack>
		</Box>
	);
};

export default FlowDiagram;
