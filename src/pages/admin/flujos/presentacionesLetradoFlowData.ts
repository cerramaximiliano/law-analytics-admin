// Spec del diagrama del circuito "Presentaciones del letrado" (pjn-mis-causas) para el motor
// FlowDiagram (causas/flujos).
//
// Dos procesos en worker-cloud-01:
//   · pjn-bandeja-sync — con login por credencial, lee de las APIs de la bandeja del portal los
//     escritos, cédulas y DEOX que el letrado presentó (pjn-actos-letrado).
//   · pjn-actos-letrado — sin login, vincula cada presentación con el movimiento del expediente que
//     la registra y recalcula folder.ultimaActividadLetrado (el contador del widget).
// Los movimientos los trae el updater de Mis Causas: el contador se mueve cuando llega
// "ESCRITO AGREGADO", no cuando se presenta.
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export interface PresentacionesLetradoInfo {
	/** bandeja-sync-config.actosLetrado.enabled */
	lecturaActos?: boolean;
	/** bandeja-sync-config.enabled */
	bandejaSync?: boolean;
	/** Escritos válidos todavía sin movimiento. */
	pendientes?: number;
	/** Credenciales con bandeja. */
	credenciales?: number;
}

export function buildPresentacionesLetradoSpec(info: PresentacionesLetradoInfo = {}): FlowSpec {
	const apagado = info.lecturaActos === false || info.bandejaSync === false;
	const creds = info.credenciales != null ? `${info.credenciales} credenciales con bandeja` : "credenciales con bandeja";

	const nodes: FlowNode[] = [
		{
			id: "cred",
			x: 30,
			y: 40,
			w: 210,
			h: 92,
			kind: "db",
			label: "Credencial PJN",
			sub: [creds, "perfil letrado (pjn-sne / pjn-escritos)", "las de parte quedan excluidas"],
		},
		{
			id: "portal",
			x: 30,
			y: 200,
			w: 210,
			h: 124,
			kind: "ext",
			label: "APIs de la bandeja (PJN)",
			sub: ["escritos.pjn.gov.ar /escritos", "notif.pjn.gov.ar /notificaciones", "deox.pjn.gov.ar /deox", "api.pjn.gov.ar /usuario/info", "solo GET · token de 5 min"],
		},
		{
			id: "huecos",
			x: 30,
			y: 400,
			w: 210,
			h: 108,
			kind: "warn",
			label: "Lo que no entra",
			sub: ["escritos firmados por otro CUIL", "causas que no están en la base", "enviados sin aceptación (2018)"],
		},
		{
			id: "bandeja",
			x: 300,
			y: 40,
			w: 230,
			h: 124,
			kind: apagado ? "bad" : "private",
			label: "pjn-bandeja-sync",
			sub: ["07:00 · 13:00 · 19:00 ART", "login SSO por credencial", "ventana desde la última lectura", "histórico completo la primera vez"],
			live: { box: "workercloud01", procs: ["pjn-bandeja-sync"] },
		},
		{
			id: "updater",
			x: 300,
			y: 340,
			w: 230,
			h: 108,
			kind: "private",
			label: "Updater de Mis Causas",
			sub: ["update-sync + private-causas-update", "trae los movimientos del expediente", "\"ESCRITO AGREGADO [Presentado …]\""],
			live: { box: "workercloud01", procs: ["pjn-private-causas-update*", "pjn-update-sync*"] },
		},
		{
			id: "actos",
			x: 590,
			y: 40,
			w: 220,
			h: 124,
			kind: "db",
			label: "pjn-actos-letrado",
			sub: ["una fila por presentación", "matcheado · pendiente · sin_causa", "valido: firma del titular", "vinculo.folderIds"],
		},
		{
			id: "causas",
			x: 590,
			y: 340,
			w: 220,
			h: 92,
			kind: "db",
			label: "Causas (movimientos)",
			sub: ["causas-segsocial, -civil, -trabajo…", "fecha + tipo + detalle"],
		},
		{
			id: "recalc",
			x: 870,
			y: 170,
			w: 230,
			h: 140,
			kind: apagado ? "bad" : "private",
			label: "pjn-actos-letrado",
			sub: ["cada 2 h (:40), sin login", "vincula por clave+fecha o día+título", "solo movimientos de escrito", "reintenta 200 días", "recalcula carpetas tocadas"],
			live: { box: "workercloud01", procs: ["pjn-actos-letrado"] },
		},
		{
			id: "runs",
			x: 870,
			y: 400,
			w: 230,
			h: 92,
			kind: "db",
			label: "pjn-actos-letrado-runs",
			sub: ["una fila por corrida", "lectura y recálculo · 90 días", "→ pestaña Estado"],
		},
		{
			id: "folder",
			x: 1160,
			y: 40,
			w: 220,
			h: 108,
			kind: "db",
			label: "folder.ultimaActividadLetrado",
			sub: ["última presentación en el expediente", "ultimoSinConfirmar · pendientes", "fecha = día de presentación"],
		},
		{
			id: "hub",
			x: 1160,
			y: 210,
			w: 220,
			h: 92,
			kind: "hub",
			label: "Hub",
			sub: ["/folders/actividad-propia/resumen", "/folders/:id/actos-letrado"],
			live: { box: "hub", procs: ["law-analytics-server-prod"], alwaysOnline: true },
		},
		{
			id: "ui",
			x: 1160,
			y: 370,
			w: 220,
			h: 108,
			kind: "ui",
			label: "App del usuario",
			sub: ["widget del panel (tramos de días)", "línea sobre los movimientos", "pestaña Presentaciones · filtro"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "cred", to: "bandeja", label: "login", fromSide: "right", toSide: "left" },
		{ id: "e2", from: "bandeja", to: "portal", label: "GET", fromSide: "bottom", toSide: "right", labelDx: 10 },
		{ id: "e3", from: "bandeja", to: "actos", kind: "ok", label: "upsert", fromSide: "right", toSide: "left" },
		{ id: "e4", from: "portal", to: "huecos", kind: "problem", label: "no los lista", fromSide: "bottom", toSide: "top" },
		{ id: "e5", from: "updater", to: "causas", kind: "ok", label: "movimientos", fromSide: "right", toSide: "left" },
		{ id: "e6", from: "actos", to: "recalc", label: "pendientes", fromSide: "right", toSide: "top" },
		{ id: "e7", from: "causas", to: "recalc", label: "movimientos de escrito", fromSide: "right", toSide: "bottom", labelDy: 12 },
		{ id: "e8", from: "recalc", to: "folder", kind: "ok", label: "resumen", fromSide: "right", toSide: "left" },
		{ id: "e9", from: "recalc", to: "runs", kind: "handoff", fromSide: "bottom", toSide: "top" },
		{ id: "e10", from: "bandeja", to: "runs", kind: "handoff", label: "corrida", fromSide: "bottom", toSide: "left", labelDy: 40 },
		{ id: "e11", from: "folder", to: "hub", fromSide: "bottom", toSide: "top" },
		{ id: "e12", from: "hub", to: "ui", kind: "ok", fromSide: "bottom", toSide: "top" },
		{ id: "e13", from: "actos", to: "hub", label: "lista", fromSide: "right", toSide: "left", labelDy: -8 },
	];

	return {
		id: "presentaciones-letrado",
		title: "Presentaciones del letrado",
		intro:
			"Del escrito presentado en el portal al contador de días en la carpeta: la bandeja trae lo presentado con la credencial, el updater trae el movimiento que lo registra y el recálculo los une.",
		width: 1410,
		height: 540,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "Dos procesos y un tercero del que dependen. pjn-bandeja-sync lee con la credencial lo que el letrado presentó y lo guarda en pjn-actos-letrado. El updater de Mis Causas trae los movimientos de cada expediente. pjn-actos-letrado (el worker) busca para cada presentación el movimiento que la registra y recalcula el resumen de la carpeta, que el hub sirve al widget, al detalle y al filtro del listado.",
			},
			{
				title: "1 · Lectura de la bandeja",
				text: "Tres veces por día (07, 13 y 19 ART), pjn-bandeja-sync entra con cada credencial con perfil de letrado y, con el mismo token, pide los escritos enviados y archivados, las cédulas enviadas y los DEOX. La primera vez trae toda la historia, por año; después, la ventana desde la última lectura completa. También refresca los escritos pendientes, porque el filtro de fechas del portal es por fecha de ingreso. Todo es GET: nunca presenta ni borra nada.",
				nodes: ["cred", "bandeja", "portal", "actos"],
				edges: ["e1", "e2", "e3"],
			},
			{
				title: "2 · Movimientos del expediente",
				text: "El escrito aparece en el expediente cuando el juzgado lo agrega: un movimiento de tipo ESCRITO con el título y, casi siempre, \"[Presentado DD/MM/AAAA HH:MM]\". Lo trae el updater de Mis Causas en su corrida diaria; mediana de 3 días entre la presentación y el movimiento, p90 de 11.",
				nodes: ["updater", "causas"],
				edges: ["e5"],
			},
			{
				title: "3 · Vinculación y recálculo",
				text: "Cada 2 horas, sin login, pjn-actos-letrado reintenta las presentaciones sin movimiento de los últimos 200 días: primero por fecha y hora exactas, y si el escrito vino sin hora, por día y título, solo contra movimientos de escrito (un despacho homónimo, como \"APELA\", no vale). Dos presentaciones que caen en el mismo movimiento quedan como choque. Después recalcula las carpetas tocadas: la última presentación ya registrada en el expediente es la que cuenta los días; lo posterior queda como \"sin proveer\".",
				nodes: ["actos", "causas", "recalc", "folder"],
				edges: ["e6", "e7", "e8"],
			},
			{
				title: "4 · Lo que ve el usuario",
				text: "El hub lee folder.ultimaActividadLetrado para el widget del panel (tramos de 90, 180 y 365 días, más las causas solo con presentaciones sin proveer y las sin presentaciones), para la línea sobre los movimientos de la causa y para el filtro del listado; la pestaña Presentaciones lista los actos de la carpeta. El widget solo aparece con una credencial con bandeja y alguna carpeta activa con presentación registrada.",
				nodes: ["folder", "hub", "ui", "actos"],
				edges: ["e11", "e12", "e13"],
			},
			{
				title: "Lo que no entra",
				text: "La bandeja solo lista lo presentado con el CUIL de la credencial: un escrito firmado por otro letrado del estudio llega al expediente pero no cuenta. Las presentaciones de causas que el usuario no tiene quedan sin_causa. Y hay escritos de 2018 que el portal deja \"enviados\" sin aceptación del juzgado y sin movimiento: se dejan así (decisión del 11/11).",
				nodes: ["portal", "huecos", "actos"],
				edges: ["e4"],
			},
			{
				title: "Monitoreo",
				text: "Cada corrida de lectura y de recálculo deja una fila en pjn-actos-letrado-runs (90 días). La pestaña Estado del worker arma con eso el relevamiento por día, compara con las corridas esperadas (3 lecturas y 12 recálculos) y suma las alertas por credencial a partir de bandeja-sync-state.",
				nodes: ["bandeja", "recalc", "runs"],
				edges: ["e9", "e10"],
			},
		],
	};
}
