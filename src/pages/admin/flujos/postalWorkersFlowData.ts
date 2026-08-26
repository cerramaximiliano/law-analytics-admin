// Spec del diagrama del worker postal (Correo Argentino) para el motor
// FlowDiagram (causas/flujos). Es CONFIG-AWARE: recibe la configuración viva
// del scraper (scraper-config vía admin-api) y refleja el intervalo de checks,
// el horario y el estado del detector stale-alert en los nodos.

import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export interface PostalFlowLiveConfig {
	checkIntervalHours: number;
	/** false ⇒ la ventana horaria NO se aplica: el worker consulta 24/7. */
	scheduleEnabled: boolean;
	workingHoursStart: number;
	workingHoursEnd: number;
	staleAlertEnabled: boolean;
	staleAfterHours: number;
}

export function buildPostalWorkersSpec(cfg: PostalFlowLiveConfig): FlowSpec {
	const nodes: FlowNode[] = [
		{
			id: "user",
			x: 40,
			y: 30,
			w: 200,
			h: 60,
			kind: "actor",
			label: "Usuario / Admin",
			sub: ["alta del seguimiento (app / UI admin)"],
		},
		{
			id: "trackings",
			x: 40,
			y: 140,
			w: 200,
			h: 108,
			kind: "db",
			label: "postal-trackings",
			sub: ["processingStatus · history[]", `nextCheckAt (threshold ${cfg.checkIntervalHours}h)`, "consecutiveNotFound · auditLog"],
		},
		{
			id: "manager",
			x: 40,
			y: 310,
			w: 200,
			h: 108,
			kind: "hub",
			label: "postal-manager",
			sub: ["permanente (PM2, worker_01)", "encola vencidos cada 5 min", "health + stale-alert cada 2 min"],
		},
		{
			id: "alertState",
			x: 40,
			y: 480,
			w: 200,
			h: 60,
			kind: "db",
			label: "alert-state",
			sub: ["anti-spam del stale-alert"],
		},
		{
			id: "worker",
			x: 330,
			y: 140,
			w: 230,
			h: 108,
			kind: "public",
			label: "scraper-worker (efímero)",
			sub: ["spawneado on-demand vía PM2", "idle-exit · máx 1h de uptime", "cierra final / not_found (≥10)"],
		},
		{
			id: "queue",
			x: 330,
			y: 310,
			w: 230,
			h: 72,
			kind: "db",
			label: "Cola scraper-jobs",
			sub: ["pending → in_progress → completed", "releaseStuckJobs (5 min)"],
		},
		{
			id: "portal",
			x: 650,
			y: 30,
			w: 220,
			h: 84,
			kind: "ext",
			label: "Correo Argentino ONDNC",
			sub: [
				"formularios/ondnc",
				"público · sin captcha ni login",
				cfg.scheduleEnabled ? `horario ${cfg.workingHoursStart}-${cfg.workingHoursEnd} ART lun-vie` : "sin ventana horaria · 24/7",
			],
		},
		{
			id: "lanotif",
			x: 650,
			y: 250,
			w: 220,
			h: 108,
			kind: "ok",
			label: "la-notification",
			sub: ["webhook eventos → usuario", "webhook admin-alert → admin", "templates + banners"],
		},
		{
			id: "email",
			x: 950,
			y: 250,
			w: 180,
			h: 108,
			kind: "ui",
			label: "Email (SES)",
			sub: ["usuario: novedades del envío", "admin: alerta operativa", "tracking aperturas/clicks", "(fallback: SES directo)"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e-user-track", from: "user", to: "trackings", label: "alta (pending)" },
		{ id: "e-track-manager", from: "trackings", to: "manager", label: "findDue (nextCheckAt vencido)" },
		{ id: "e-manager-queue", from: "manager", to: "queue", kind: "handoff", label: "bulkEnqueue", fromSide: "right", toSide: "left" },
		{
			id: "e-manager-worker",
			from: "manager",
			to: "worker",
			kind: "handoff",
			label: "spawn / scale (PM2)",
			fromSide: "right",
			toSide: "bottom",
			labelDx: -30,
			labelDy: -6,
		},
		{ id: "e-queue-worker", from: "queue", to: "worker", label: "dequeue", fromSide: "top", toSide: "bottom", labelDx: 60 },
		{
			id: "e-worker-portal",
			from: "worker",
			to: "portal",
			label: "consulta codeId + numberId",
			fromSide: "right",
			toSide: "left",
			labelDy: -8,
		},
		{
			id: "e-worker-track",
			from: "worker",
			to: "trackings",
			kind: "ok",
			label: "recordEvent · cierre",
			fromSide: "left",
			toSide: "right",
			labelDy: 12,
		},
		{
			id: "e-worker-notif",
			from: "worker",
			to: "lanotif",
			kind: "ok",
			label: "webhook eventos (notifiedAt)",
			fromSide: "right",
			toSide: "top",
			labelDx: 26,
			labelDy: -4,
		},
		{
			id: "e-manager-notif",
			from: "manager",
			to: "lanotif",
			kind: cfg.staleAlertEnabled ? "normal" : "problem",
			label: cfg.staleAlertEnabled ? `admin-alert (sin consulta >${cfg.staleAfterHours}h)` : "admin-alert APAGADO",
			fromSide: "bottom",
			toSide: "bottom",
			labelDx: 120,
			labelDy: 14,
		},
		{ id: "e-manager-alertstate", from: "manager", to: "alertState", label: "estado anti-spam" },
		{ id: "e-notif-email", from: "lanotif", to: "email", kind: "ok", label: "SES + tracking", fromSide: "right", toSide: "left" },
	];

	return {
		id: "postal-workers",
		title: "Worker postal",
		intro: "",
		width: 1150,
		height: 565,
		nodes,
		edges,
		steps: [],
	};
}
