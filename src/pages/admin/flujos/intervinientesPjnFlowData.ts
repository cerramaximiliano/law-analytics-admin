// Spec del diagrama del pipeline de intervinientes PJN (partes y letrados de
// cada causa) para el motor FlowDiagram (causas/flujos).
//
// Tres lectores escriben la misma colección y un solo consumidor (el hub). El
// reparto es por hasActiveCredential, el mismo que usa app-update:
//   · CON credencial activa (pjn-mis-causas, worker-cloud-01), dos vías:
//       - private-causas-update con el lector HTTP: un POST ajax más sobre la
//         vista del detalle que el actualizador ya abrió (switch enUpdater de
//         configuracion-intervinientes-mis-causas, default apagado);
//       - pjn-mis-causas-intervinientes: cron diario de respaldo con browser y
//         login SSO (config enabled de la misma colección).
//   · SIN credencial activa, solo públicas (pjn-workers, worker-cloud-01):
//       pjn-extra-info, browser en el buscador público con captcha (OCR local).
// Las tres vías leen el SCW CLÁSICO (scw.pjn.gov.ar). La API del SCW nuevo
// tiene /intervinientes (scw-beta-client.intervinientes) pero ningún lector la usa.
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
 *  la hora del box (worker-cloud-01 está en UTC): 04:00 UTC = 01:00 ART. schedule.timezone
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
			y: 236,
			w: 220,
			h: 104,
			kind: "db",
			label: "Causa PJN (Atlas)",
			sub: ["verified · isValid", "hasActiveCredential reparte", "detailsLoaded · detailsLastUpdate"],
		},
		{
			id: "sinlector",
			x: 30,
			y: 410,
			w: 220,
			h: 96,
			kind: "warn",
			label: "Sin lector",
			sub: ["privadas sin credencial activa", "públicas de los otros 24 fueros", "(extra-info solo 4)"],
		},
		{
			id: "updhttp",
			live: { box: "workercloud01", procs: ["pjn-private-causas-update*"] },
			x: 300,
			y: 20,
			w: 260,
			h: 124,
			kind: "private",
			label: "private-causas-update · HTTP",
			sub: [
				"CON credencial · dentro del update diario",
				"seguidas, verificadas, 28 fueros",
				"públicas, privadas e incidentes",
				"switch enUpdater (default apagado)",
			],
		},
		{
			id: "miscausas",
			live: { box: "workercloud01", procs: ["pjn-mis-causas-intervinientes"] },
			x: 300,
			y: 182,
			w: 260,
			h: 124,
			kind: "private",
			label: "pjn-mis-causas-intervinientes",
			sub: [
				"CON credencial · cron 05:00 ART",
				"respaldo de lo que no leyó el HTTP",
				"mismo universo · lock por credencial",
				"config enabled (puede estar apagado)",
			],
		},
		{
			id: "extrainfo",
			live: { box: "workercloud01", procs: ["pjn-extra-info", "pjn-extra-info-ocr"], alwaysOnline: true },
			x: 300,
			y: 360,
			w: 260,
			h: 124,
			kind: extraOff ? "bad" : "public",
			label: "pjn-extra-info",
			sub: [
				`SIN credencial · ${cron}`,
				`solo públicas · ${fueros}`,
				"principales + incidentes seguidos",
				extraOff ? "DESHABILITADO (config.enabled)" : relee,
			],
		},
		{
			id: "scwhttp",
			x: 620,
			y: 30,
			w: 220,
			h: 104,
			kind: "ext",
			label: "SCW clásico · HTTP",
			sub: ["detalle ya abierto por el update", "POST faces/ajax (~150 ms)", "sin browser ni captcha"],
		},
		{
			id: "portallogin",
			x: 620,
			y: 192,
			w: 220,
			h: 104,
			kind: "ext",
			label: "SCW clásico · browser + login",
			sub: ["sesión SSO del usuario", "listado Relacionados o búsqueda", "sin captcha"],
		},
		{
			id: "portalpub",
			x: 620,
			y: 370,
			w: 220,
			h: 104,
			kind: "ext",
			label: "SCW clásico · browser público",
			sub: ["buscador por número", "captcha → sidecar OCR", "(pjn-extra-info-ocr)"],
		},
		{
			id: "api",
			x: 900,
			y: 30,
			w: 250,
			h: 104,
			kind: "ext",
			label: "API del SCW nuevo",
			sub: ["scw-beta.pjn.gov.ar/api/intervinientes", "existe en el cliente", "NINGÚN lector la usa"],
		},
		{
			id: "interv",
			x: 900,
			y: 236,
			w: 250,
			h: 112,
			kind: "db",
			label: "intervinientes",
			sub: ["partes y letrados por causaId", "misma forma desde las tres vías", "detailsLoaded · detailsLastUpdate"],
		},
		{
			id: "panel",
			x: 30,
			y: 580,
			w: 220,
			h: 104,
			kind: "ui",
			label: "Carpeta → Intervinientes",
			sub: ["ve partes y letrados siempre", "elige cuáles agregar", "o agrega todos"],
		},
		{
			id: "hub",
			live: { box: "hub", procs: ["law-analytics-server-prod"], alwaysOnline: true },
			x: 620,
			y: 566,
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
			x: 900,
			y: 580,
			w: 250,
			h: 104,
			kind: "db",
			label: "contacts",
			sub: ["SOLO con la preferencia del dueño", "partes primero, letrados enlazados", "techo del plan → archivado"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e1b", from: "causa", to: "updhttp", kind: "ok", label: "credencial activa", fromSide: "right", toSide: "left", labelDy: -10 },
		{ id: "e1", from: "causa", to: "miscausas", kind: "ok", fromSide: "right", toSide: "left" },
		{
			id: "e2",
			from: "causa",
			to: "extrainfo",
			kind: "ok",
			label: "sin credencial",
			fromSide: "right",
			toSide: "left",
			labelDy: 10,
		},
		{ id: "e3", from: "causa", to: "sinlector", kind: "problem", label: "nadie la lee", fromSide: "bottom", toSide: "top" },
		{ id: "e4b", from: "updhttp", to: "scwhttp", label: "misma sesión" },
		{ id: "e4", from: "miscausas", to: "portallogin", label: "login SSO" },
		{ id: "e5", from: "extrainfo", to: "portalpub", label: "captcha" },
		{ id: "e6b", from: "scwhttp", to: "interv", kind: "ok", fromSide: "right", toSide: "left" },
		{ id: "e6", from: "portallogin", to: "interv", kind: "ok", label: "pestaña Intervinientes", fromSide: "right", toSide: "left" },
		{ id: "e7", from: "portalpub", to: "interv", kind: "ok", fromSide: "right", toSide: "left" },
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
			"Tres vías leen la pestaña Intervinientes del SCW clásico y escriben la misma colección: dos para las causas con credencial activa (HTTP dentro del actualizador y un cron de respaldo con login) y una para las públicas sin credencial (buscador público con captcha). La API del SCW nuevo no se usa. El hub muestra las partes en la carpeta y, solo con la preferencia del dueño, las convierte en contactos.",
		width: 1180,
		height: 710,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "La causa decide su lector por hasActiveCredential. Las tres vías dejan las partes en intervinientes con la misma forma y marcan detailsLoaded en la causa. De ahí en adelante todo es del hub: la carpeta siempre las muestra, y los contactos se crean solo si el dueño activó la preferencia.",
			},
			{
				title: "Causas con credencial",
				text: "Universo: las causas que la credencial ve en su listado (linkedCredentials, sin removedFromSync), verificadas y seguidas en alguna carpeta, de los 28 fueros del PJN: públicas, privadas e incidentes; nunca leídas o con la relectura vencida (reextractAfterDays). Dos vías sobre el SCW clásico. La principal, si el switch enUpdater está encendido: private-causas-update, que ya abre cada causa por HTTP en su corrida diaria, pide la pestaña con un POST ajax más (~150 ms, sin otro login ni el lock). El respaldo: pjn-mis-causas-intervinientes, cron de las 05:00 ART con browser y login SSO, que abre las privadas e incidentes desde el listado Relacionados y comparte el lock por credencial con el actualizador; solo corre con enabled en su config. Al guardar, avisan al hub (sync-pjn) para los contactos.",
				nodes: ["causa", "updhttp", "miscausas", "scwhttp", "portallogin", "interv", "hub"],
				edges: ["e1b", "e1", "e4b", "e4", "e6b", "e6", "e8"],
			},
			{
				title: "Causas públicas sin credencial",
				text: `Universo: causas públicas (isPrivate distinto de true) SIN credencial activa, verificadas y con isValid, cargadas desde la app, la caché o pjn-login. pjn-extra-info corre en worker-cloud-01 (${cron}, batch grande: procesa todo lo pendiente) con browser sobre el buscador público del SCW clásico. Solo ${fueros}; principales, más los incidentes que alguien sigue, que abre desde la pestaña Vinculados del principal. El captcha lo resuelve su sidecar de OCR (pjn-extra-info-ocr, mismo box): sin él falla siempre. Este worker crea los contactos él mismo, con la misma regla de preferencia. isValid: true es a propósito: las verificadas sin isValid son registros vacíos que el portal no encuentra.`,
				nodes: ["causa", "extrainfo", "portalpub", "interv", "contacts"],
				edges: ["e2", "e5", "e7", "e11"],
			},
			{
				title: "De dónde sale cada dato",
				text: "Las tres vías leen la misma pestaña Intervinientes del SCW clásico (scw.pjn.gov.ar) y guardan lo mismo: tipo, nombre, tomo/folio e IEJ de cada parte, y tipo, nombre, matrícula y estado IEJ de cada letrado. Cambia solo cómo llegan: por HTTP sobre la sesión del actualizador, con browser y login, o con browser en el buscador público resolviendo el captcha. La API del SCW nuevo expone /intervinientes y el cliente ya tiene el método, pero hoy ningún lector la usa.",
				nodes: ["updhttp", "miscausas", "extrainfo", "scwhttp", "portallogin", "portalpub", "api", "interv"],
				edges: ["e4b", "e4", "e5", "e6b", "e6", "e7"],
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
