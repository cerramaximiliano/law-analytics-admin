// Spec del diagrama de los dos workers de sincronización de pjn-mis-causas para
// el motor FlowDiagram (causas/flujos).
//
// Son dos caminos sobre el MISMO listado del portal:
//   · mis-causas   → sync completa, on-demand, al validar una credencial.
//   · update-sync  → una pasada diaria por credencial, para detectar altas y bajas.
//
// El diagrama muestra explícitamente las bifurcaciones que hacen que una fila
// del portal termine (o no) en una carpeta del usuario, porque son las que
// producían huecos silenciosos: el desvío de las filas sin fuero, quién decide
// que una fila es "nueva", el techo del plan, y —desde el 9/11/2026— de dónde
// sale el listado: la API JSON del SCW nuevo (detrás de un flag, con evidencia
// JSON en S3) o el browser sobre el SCW clásico, que queda de respaldo.
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export interface MisCausasScheduleInfo {
	/** Hora de la pasada diaria del update-sync, ej. "09:00". */
	dailyRunAt?: string;
	/** Máximo de credenciales en paralelo (scaling.maxInstances). */
	maxInstances?: number;
	/** Si el alta por reconciliación está habilitada. */
	createFromReconciliation?: boolean;
	/** Listado por la API del SCW nuevo (causas-update-config.worker.listadoApiScwBeta). */
	listadoApi?: {
		global: boolean;
		/** Cantidad de credenciales en la lista; 0 = todas. */
		credenciales: number;
	};
	/** Carga inicial (credentials-processor) por la API (worker.cargaInicialApi). */
	cargaInicialApi?: boolean;
}

export function describirListadoApi(info?: MisCausasScheduleInfo["listadoApi"]): string {
	if (!info) return "listado por API: config no leída";
	if (!info.global) return "listado por API: OFF";
	return info.credenciales > 0 ? `listado por API: ON (${info.credenciales} credencial${info.credenciales === 1 ? "" : "es"})` : "listado por API: ON (todas)";
}

export function buildMisCausasWorkersSpec(schedule: MisCausasScheduleInfo = {}): FlowSpec {
	const hora = schedule.dailyRunAt ?? "hora (config)";
	const paralelo =
		schedule.maxInstances && schedule.maxInstances > 1 ? `hasta ${schedule.maxInstances} credenciales en paralelo` : "secuencial";
	const reconOn = schedule.createFromReconciliation !== false;
	const apiOn = schedule.listadoApi?.global === true;
	const apiAlcance = !schedule.listadoApi
		? "flag listadoApiScwBeta"
		: !apiOn
			? "flag listadoApiScwBeta: OFF"
			: schedule.listadoApi.credenciales > 0
				? `ON para ${schedule.listadoApi.credenciales} credencial${schedule.listadoApi.credenciales === 1 ? "" : "es"}`
				: "ON para todas las credenciales";

	const nodes: FlowNode[] = [
		{ id: "user", x: 30, y: 24, w: 190, h: 58, kind: "actor", label: "Usuario", sub: ["carga su credencial PJN"] },
		{
			id: "portal",
			x: 300,
			y: 24,
			w: 230,
			h: 74,
			kind: "ext",
			label: "Mis Causas (SCW clásico)",
			sub: ["Expedientes Relacionados", "paginado por browser, sin captcha"],
		},
		{
			id: "full",
			x: 30,
			y: 150,
			w: 190,
			h: 88,
			kind: "private",
			label: "mis-causas",
			sub: ["sync completa on-demand", "al validar la credencial"],
		},
		{
			id: "daily",
			x: 30,
			y: 292,
			w: 190,
			h: 100,
			kind: "private",
			label: "update-sync",
			sub: [`diario ${hora}`, paralelo, "lee SIEMPRE el listado entero"],
		},
		{
			id: "api",
			x: 30,
			y: 450,
			w: 190,
			h: 100,
			kind: apiOn ? "ok" : "ext",
			label: "API del SCW nuevo",
			sub: ["scw-beta.pjn.gov.ar/api", "token de la misma sesión SSO", apiAlcance],
		},
		{
			id: "rows",
			x: 300,
			y: 190,
			w: 230,
			h: 92,
			kind: "db",
			label: "Filas leídas del listado",
			sub: ["expediente · carátula · dependencia", "evidencia en S3 (60 d):", "api-listado.json o PNG por página"],
		},
		{
			id: "listonly",
			x: 300,
			y: 320,
			w: 230,
			h: 92,
			kind: "warn",
			label: "Filas SIN fuero",
			sub: ['"031319/1996/TO01" (Tribunal Oral)', "no son buscables por número", "alta desde el detalle del listado"],
		},
		{
			id: "vertodos",
			x: 300,
			y: 450,
			w: 230,
			h: 100,
			kind: "warn",
			label: '"Ver todos los expedientes"',
			sub: ["incluye archivo / destruido…", "solo para no contar como baja", "una causa que pasó a archivo"],
		},
		{
			id: "recon",
			x: 610,
			y: 292,
			w: 235,
			h: 100,
			kind: reconOn ? "ok" : "bad",
			label: "Reconciliación",
			sub: ["portal vs carpetas reales", "match por expediente y carátula", reconOn ? "lo que no tiene carpeta → alta" : "ALTA DESHABILITADA"],
		},
		{
			id: "alta",
			x: 610,
			y: 150,
			w: 235,
			h: 96,
			kind: "hub",
			label: "Alta de causa",
			sub: ["base local → caché → portal", "crea causa + vincula credencial"],
		},
		{
			id: "plan",
			x: 610,
			y: 40,
			w: 235,
			h: 78,
			kind: "warn",
			label: "Techo del plan",
			sub: ["sobre el límite → archivada", "sin storage → SIN carpeta"],
		},
		{
			id: "folder",
			x: 920,
			y: 150,
			w: 200,
			h: 82,
			kind: "db",
			label: "folders",
			sub: ["carpeta del usuario", "causaId · causaType · pjn"],
		},
		{
			id: "removed",
			x: 920,
			y: 292,
			w: 200,
			h: 100,
			kind: "bad",
			label: "listRemoved",
			sub: ["salió del listado", "solo con escaneo completo", "si vuelve, se limpia"],
		},
		{
			id: "movs",
			x: 920,
			y: 30,
			w: 200,
			h: 78,
			kind: "private",
			label: "private-causas-update",
			sub: ["baja los movimientos", "y dispara las novedades"],
		},
		{
			id: "digest",
			x: 920,
			y: 450,
			w: 200,
			h: 100,
			kind: "warn",
			label: "Aviso de altas y bajas",
			sub: ["digest pjnCausaChanges", "sin aviso: 1ª base del listado,", "cuadernos ES01, tope del plan"],
		},
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "user", to: "full", kind: "handoff", label: "credencial validada" },
		{ id: "e2", from: "full", to: "portal", label: "login SSO", fromSide: "right", toSide: "left" },
		{ id: "e3", from: "daily", to: "portal", label: apiOn ? "login SSO · browser de respaldo" : "login SSO", fromSide: "right", toSide: "bottom" },
		{ id: "e4", from: "portal", to: "rows", label: "paginado completo" },
		{ id: "e5", from: "rows", to: "alta", kind: "ok", label: "filas con fuero" },
		{ id: "e6", from: "rows", to: "listonly", kind: "handoff", label: "sin prefijo" },
		{ id: "e7", from: "listonly", to: "alta", kind: "handoff", label: "fuero inferido del tribunal" },
		{ id: "e8", from: "rows", to: "recon", label: "todas las filas", fromSide: "bottom", toSide: "left" },
		{ id: "e9", from: "recon", to: "alta", kind: "ok", label: "sin carpeta → alta" },
		{ id: "e10", from: "recon", to: "removed", kind: "problem", label: "carpeta sin fila" },
		{ id: "e11", from: "alta", to: "plan", kind: "normal", label: "consulta límites" },
		{ id: "e12", from: "alta", to: "folder", kind: "ok", label: "crea / vincula" },
		{ id: "e13", from: "folder", to: "movs", kind: "handoff", label: "queda para actualizar" },
		{ id: "e14", from: "daily", to: "api", kind: apiOn ? "ok" : "normal", label: apiOn ? "listado por API (1 llamada)" : "listado por API (apagado)", fromSide: "bottom", toSide: "top" },
		{ id: "e15", from: "api", to: "rows", kind: apiOn ? "ok" : "normal", label: "mismas filas, en segundos", fromSide: "right", toSide: "bottom", labelDy: -40 },
		{ id: "e16", from: "api", to: "vertodos", kind: "handoff", label: "allItems" },
		{ id: "e17", from: "vertodos", to: "removed", kind: "handoff", label: "no es baja si está en archivo", fromSide: "right", toSide: "bottom" },
		{ id: "e18", from: "folder", to: "digest", kind: "handoff", label: "alta con carátula real (72 h)", fromSide: "bottom", toSide: "top" },
		{ id: "e19", from: "removed", to: "digest", kind: "problem", label: "baja de 48 h a 14 d" },
	];

	return {
		id: "pjn-mis-causas-workers",
		title: "Sincronización de causas PJN por credencial",
		intro:
			"Los dos workers que llevan una fila del listado de Mis Causas hasta una carpeta del usuario: la sync completa del alta de credencial y la pasada diaria. Están juntos porque recorren el mismo listado y comparten el alta — lo que cambia es quién decide qué falta y, desde noviembre de 2026, de dónde sale el listado: la API JSON del SCW nuevo o el browser sobre el SCW clásico.",
		width: 1160,
		height: 580,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "Los dos workers entran con la credencial del usuario y leen el listado entero. De ahí en adelante el camino es común: alta de la causa, carpeta, y de la carpeta se ocupa después el worker de movimientos. El aviso de altas y bajas sale aparte, como digest, con sus propias pausas.",
			},
			{
				title: "Sync completa (mis-causas)",
				text: "Corre on-demand cuando el usuario valida una credencial nueva o pide un resync. Procesa TODAS las filas del listado, sin heurísticas: para cada una busca la causa en la base local, si no está la pide al caché, y si tampoco está la crea desde el portal. Después arma la carpeta y vincula la credencial a la causa. El alta inicial de una credencial recién cargada la hace credentials-processor con el mismo esquema (y también puede leer el listado por la API, flag cargaInicialApi).",
				nodes: ["user", "full", "portal", "rows", "alta", "folder"],
				edges: ["e1", "e2", "e4", "e5", "e12"],
			},
			{
				title: "Pasada diaria (update-sync)",
				text: `Una vez por día por credencial, a las ${hora}. Recorre siempre el listado entero —no corta al encontrar filas conocidas— y deja evidencia en S3 con 60 días de retención para auditar a mano qué mostraba el portal ese día: el JSON del listado cuando lo leyó por la API, o una captura PNG por página cuando lo leyó con el browser.`,
				nodes: ["daily", "portal", "api", "rows"],
				edges: ["e3", "e4", "e14", "e15"],
			},
			{
				title: "El listado por la API del SCW nuevo",
				text: apiOn
					? `El SCW nuevo (React, "Probar nueva versión") tiene un backend JSON que devuelve el mismo listado Relacionados en una sola llamada: 2.857 causas en ~70 s contra ~21 min paginando con el browser. update-sync lo usa con el token de la misma sesión SSO, ${apiAlcance.toLowerCase()}, y verifica que las filas estén completas antes de aceptarlas; si la API falla o devuelve menos de lo esperado, vuelve al browser en la misma corrida. En la columna "Listado API" de Credenciales PJN se ve qué credenciales lo usan y, en el historial de cada corrida, la fuente (api/browser) y el JSON de evidencia.`
					: "El SCW nuevo tiene un backend JSON que devuelve el mismo listado Relacionados en una sola llamada (2.857 causas en ~70 s contra ~21 min con el browser). El flag listadoApiScwBeta está APAGADO: todas las credenciales leen el listado con el browser. Se enciende en Workers → Mis Causas updates y se acota por credencial desde Credenciales PJN.",
				nodes: ["daily", "api", "rows"],
				edges: ["e14", "e15"],
			},
			{
				title: '"Ver todos" no suma causas: evita bajas falsas',
				text: 'El listado muestra por defecto solo los expedientes en trámite. Una causa que pasó a archivo desaparece de esa vista aunque siga siendo del letrado, y antes eso se contaba como baja. Por eso la lectura (por API con allItems, o por HTTP en el browser) también trae los "no en trámite", pero SOLO para no marcarlos como salidos del listado: traerlos a la app como causas depende del interruptor "No en trámite" de cada credencial, apagado por defecto.',
				nodes: ["api", "vertodos", "removed"],
				edges: ["e16", "e17"],
			},
			{
				title: "Filas sin prefijo de fuero",
				text: 'El portal lista los expedientes asignados a Tribunal Oral como "031319/1996/TO01", sin fuero adelante. No se pueden buscar por número —no hay fuero con qué buscar—, así que el alta por número no sirve: se abren desde el detalle del listado y se les infiere el fuero del tribunal, solo para clasificarlas. Quedan marcadas listOnly y nunca se buscan en el portal público.',
				nodes: ["rows", "listonly", "alta"],
				edges: ["e6", "e7"],
			},
			{
				title: "Quién decide que falta una causa",
				text: reconOn
					? "La reconciliación compara las filas del portal contra las carpetas reales del usuario, por expediente y por carátula. Lo que el portal lista y no tiene carpeta se da de alta. Antes esto lo decidía una heurística de rangos alfabéticos de carátulas que daba por conocido casi todo, y así se perdían altas sin dejar rastro."
					: "El alta por reconciliación está DESHABILITADA (processing.createFromReconciliation). Las filas del portal sin carpeta se registran pero no se crean.",
				nodes: ["rows", "recon", "alta"],
				edges: ["e8", "e9"],
			},
			{
				title: "Bajas del listado",
				text: "Una carpeta cuya causa ya no aparece en el listado se marca listRemoved. Solo se marca cuando el escaneo leyó todas las páginas: con un escaneo parcial, la ausencia no prueba nada y un portal degradado convertiría causas sanas en bajas. Si la causa reaparece, la marca se limpia sola. El flapping medido es mayoritario, por eso el aviso al usuario espera entre 48 horas y 14 días.",
				nodes: ["recon", "removed", "digest"],
				edges: ["e10", "e19"],
			},
			{
				title: "El techo del plan",
				text: "El alta consulta los límites de la suscripción. Sobre el tope de carpetas la crea archivada; sin storage disponible NO la crea. Ese segundo caso deja la causa sin carpeta de forma legítima y permanente, y reaparece cada día en el conteo de 'portal sin carpeta' — por eso el run guarda cuáles son y cuántas quedaron pendientes por límite.",
				nodes: ["alta", "plan", "folder"],
				edges: ["e11", "e12"],
			},
			{
				title: "Qué altas se avisan y cuáles no",
				text: "El digest de altas y bajas (pjnCausaChanges) lo arma un barrido del manager cada 30 minutos. Una carpeta nueva se avisa dentro de las 72 horas y recién cuando tiene carátula real. No se avisan, y se estampan igual: las carpetas creadas por la primera corrida de update-sync que no tenía un listado completo anterior contra el cual comparar (no son altas, es la base), los cuadernos de escritos (\"Escrito Nº ES01…\") y las carpetas que nacen archivadas por el tope del plan. Esa regla salió del incidente del 9/11/2026, cuando 5 cuentas recibieron \"17 causas nuevas\" que no lo eran.",
				nodes: ["folder", "digest"],
				edges: ["e18"],
			},
			{
				title: "Qué pasa después",
				text: "Estos dos workers no bajan movimientos: dejan la causa y la carpeta creadas. De ahí en adelante la actualiza private-causas-update con la misma credencial, y es ese worker el que dispara las novedades al usuario según la política de notificación.",
				nodes: ["folder", "movs"],
				edges: ["e13"],
			},
		],
	};
}
