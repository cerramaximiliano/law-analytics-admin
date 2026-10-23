// Spec del diagrama del pipeline de intervinientes PJN (partes y letrados de
// cada causa) para el motor FlowDiagram (causas/flujos).
//
// Son dos workers que escriben la misma colección y un solo consumidor (el hub):
//   · pjn-extra-info (pjn-workers, worker_02) — causas públicas SIN credencial
//     activa, por el buscador público con captcha (OCR local).
//   · pjn-mis-causas-intervinientes (pjn-mis-causas, worker-cloud-02) — causas
//     seguidas de credenciales activas, con la sesión del usuario, sin captcha.
// El reparto es por hasActiveCredential, el mismo que usa app-update.
//
// El diagrama muestra explícitamente las dos cosas que explican los huecos:
// qué causas no tienen lector (privadas sin credencial, fueros fuera de
// processing_mode) y que los contactos se crean SOLO con la preferencia del
// dueño de la carpeta, en cualquiera de los caminos.
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export interface IntervinientesPjnInfo {
	/** Cron de pjn-extra-info (schedule.cronExpression), ej. "0 4 * * *". */
	extraInfoCron?: string;
	/** processing_mode de pjn-extra-info: all | civil | ss | trabajo | comercial. */
	processingMode?: string;
	/** eligibility.reextractAfterDays: null/0 = nunca relee. */
	reextractAfterDays?: number | null;
	/** Si el worker está habilitado (config.enabled). */
	extraInfoEnabled?: boolean;
	/** Si hay un ciclo en curso (state.isRunning). */
	extraInfoRunning?: boolean;
}

const MODO_FUEROS: Record<string, string> = {
	all: "CIV · CSS · CNT · COM",
	civil: "solo CIV",
	ss: "solo CSS",
	trabajo: "solo CNT",
	comercial: "solo COM",
};

/** "0 4 * * *" → "diario 01:00 ART"; cualquier otra cosa se muestra tal cual.
 *  El worker programa node-cron SIN opción timezone, así que la expresión se evalúa en
 *  la hora del box (worker_02 está en UTC): 04:00 UTC = 01:00 ART. schedule.timezone
 *  solo rige el horario laboral (respectWorkingHours), no el cron. */
export function describirCron(cron?: string): string {
	if (!cron) return "cron (config)";
	const m = /^0\s+(\d{1,2})\s+\*\s+\*\s+\*$/.exec(cron.trim());
	if (!m) return cron;
	const horaUtc = Number(m[1]);
	const horaArt = (horaUtc - 3 + 24) % 24;
	return `diario ${String(horaArt).padStart(2, "0")}:00 ART (${String(horaUtc).padStart(2, "0")}:00 UTC)`;
}

export function buildIntervinientesPjnSpec(info: IntervinientesPjnInfo = {}): FlowSpec {
	const cron = describirCron(info.extraInfoCron);
	const fueros = MODO_FUEROS[info.processingMode ?? ""] ?? "fueros según processing_mode";
	const relee = info.reextractAfterDays && info.reextractAfterDays > 0 ? `relee cada ${info.reextractAfterDays} días` : "sin relectura";
	const extraOff = info.extraInfoEnabled === false;

	const nodes: FlowNode[] = [
		{
			id: "causa",
			x: 30,
			y: 160,
			w: 210,
			h: 104,
			kind: "db",
			label: "Causa PJN (Atlas)",
			sub: ["verified · isValid", "hasActiveCredential elige el lector", "detailsLoaded marca que ya se leyó"],
		},
		{
			id: "sinlector",
			x: 30,
			y: 318,
			w: 210,
			h: 96,
			kind: "warn",
			label: "Sin lector",
			sub: ["privadas sin credencial activa", "públicas de los otros 24 fueros", "(extra-info solo 4)"],
		},
		{
			id: "miscausas",
			x: 290,
			y: 24,
			w: 240,
			h: 112,
			kind: "private",
			label: "pjn-mis-causas-intervinientes",
			sub: [
				"worker-cloud-02 · diario 05:00 ART",
				"solo causas seguidas, 28 fueros",
				"públicas, privadas e incidentes",
				"lock por credencial · relee cada 30 días",
			],
		},
		{
			id: "extrainfo",
			x: 290,
			y: 262,
			w: 240,
			h: 112,
			kind: extraOff ? "bad" : "public",
			label: "pjn-extra-info",
			sub: [`worker_02 · ${cron}`, fueros, "principales + incidentes seguidos", extraOff ? "DESHABILITADO (config.enabled)" : relee],
		},
		{
			id: "portallogin",
			x: 600,
			y: 36,
			w: 200,
			h: 88,
			kind: "ext",
			label: "Mis Causas (login)",
			sub: ["sesión del usuario", "sin captcha"],
		},
		{
			id: "portalpub",
			x: 600,
			y: 274,
			w: 200,
			h: 88,
			kind: "ext",
			label: "Portal público SCW",
			sub: ["buscador por número", "captcha → sidecar OCR local"],
		},
		{
			id: "interv",
			x: 870,
			y: 150,
			w: 240,
			h: 112,
			kind: "db",
			label: "intervinientes",
			sub: ["partes y letrados por causaId", "misma forma desde los dos workers", "detailsLoaded · detailsLastUpdate"],
		},
		{
			id: "panel",
			x: 30,
			y: 470,
			w: 210,
			h: 104,
			kind: "ui",
			label: "Carpeta → Intervinientes",
			sub: ["ve partes y letrados siempre", "elige cuáles agregar", "o agrega todos"],
		},
		{
			id: "hub",
			x: 600,
			y: 456,
			w: 240,
			h: 132,
			kind: "hub",
			label: "law-analytics-server",
			sub: [
				"al vincular una carpeta",
				"al activar la preferencia (retroactivo)",
				"al desarchivar una carpeta",
				"aviso de pjn-mis-causas (sync-pjn)",
			],
		},
		{
			id: "contacts",
			x: 870,
			y: 470,
			w: 240,
			h: 104,
			kind: "db",
			label: "contacts",
			sub: ["SOLO con la preferencia del dueño", "partes primero, letrados enlazados", "techo del plan → archivado"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "causa", to: "miscausas", kind: "ok", label: "credencial activa", fromSide: "right", toSide: "left" },
		{ id: "e2", from: "causa", to: "extrainfo", kind: "ok", label: "sin credencial activa", fromSide: "right", toSide: "left" },
		{ id: "e3", from: "causa", to: "sinlector", kind: "problem", label: "nadie la lee", fromSide: "bottom", toSide: "top" },
		{ id: "e4", from: "miscausas", to: "portallogin", label: "login SSO" },
		{ id: "e5", from: "extrainfo", to: "portalpub", label: "captcha" },
		{ id: "e6", from: "portallogin", to: "interv", kind: "ok", label: "pestaña Intervinientes" },
		{ id: "e7", from: "portalpub", to: "interv", kind: "ok", label: "pestaña Intervinientes" },
		{ id: "e8", from: "interv", to: "hub", kind: "handoff", label: "partes ya descargadas", fromSide: "bottom", toSide: "top" },
		{ id: "e9", from: "panel", to: "hub", label: "lista / agrega", fromSide: "right", toSide: "left" },
		{ id: "e10", from: "hub", to: "contacts", kind: "ok", label: "crea / vincula" },
		{
			id: "e11",
			from: "extrainfo",
			to: "contacts",
			kind: "handoff",
			label: "sync propia (misma regla)",
			fromSide: "bottom",
			toSide: "top",
		},
	];

	return {
		id: "intervinientes-pjn",
		title: "Intervinientes PJN: de la causa al contacto",
		intro:
			"Dos workers leen la pestaña Intervinientes del PJN y escriben la misma colección; el hub la muestra en la carpeta y, solo con la preferencia del dueño, convierte partes y letrados en contactos.",
		width: 1160,
		height: 610,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "La causa decide su lector por hasActiveCredential. Los dos workers dejan las partes en intervinientes con la misma forma y marcan detailsLoaded en la causa. De ahí en adelante todo es del hub: la carpeta siempre las muestra, y los contactos se crean solo si el dueño activó la preferencia.",
			},
			{
				title: "Causas con credencial",
				text: "pjn-mis-causas-intervinientes corre una vez por día en worker-cloud-02 (05:00 ART, stopped entre corridas es normal). Por cada credencial activa toma las causas seguidas de los 28 fueros del PJN, entra con la sesión del usuario (sin captcha), lee privadas e incidentes desde el listado Relacionados y relee cada 30 días. Comparte el lock por credencial con private-causas-update. Al guardar, avisa al hub (sync-pjn) para que cree los contactos.",
				nodes: ["causa", "miscausas", "portallogin", "interv", "hub"],
				edges: ["e1", "e4", "e6", "e8"],
			},
			{
				title: "Causas públicas sin credencial",
				text: `pjn-extra-info corre en worker_02 (${cron}, batch grande: procesa todo lo pendiente). Solo ${fueros}; principales, más los incidentes que alguien sigue, que abre desde la pestaña Vinculados del principal. El captcha lo resuelve el sidecar OCR propio del box. Este worker crea los contactos él mismo, con la misma regla de preferencia. isValid: true es a propósito: las verificadas sin isValid son registros vacíos que el portal no encuentra.`,
				nodes: ["causa", "extrainfo", "portalpub", "interv", "contacts"],
				edges: ["e2", "e5", "e7", "e11"],
			},
			{
				title: "Quién no tiene lector",
				text: "Una causa privada sin credencial activa no la puede abrir nadie. Una pública de un fuero fuera de processing_mode (los 24 fueros federales y penales) tampoco: pjn-mis-causas los cubre solo si hay credencial. Son los dos huecos conocidos del relevamiento del 20/10.",
				nodes: ["causa", "sinlector"],
				edges: ["e3"],
			},
			{
				title: "Del interviniente al contacto",
				text: "El hub crea contactos desde las partes ya descargadas en cuatro momentos: al vincular una carpeta a una causa, al activar la preferencia (recorre todas las carpetas PJN vigentes), al desarchivar una carpeta y cuando pjn-mis-causas avisa. Siempre la misma alta: partes primero y letrados enlazados a las partes que representan, con el techo del plan (sobre el límite, el contacto nace archivado). Sin la preferencia no se crea nada, pero la carpeta igual muestra las partes y el usuario puede agregarlas a mano.",
				nodes: ["interv", "hub", "panel", "contacts"],
				edges: ["e8", "e9", "e10"],
			},
		],
	};
}
