// Spec del diagrama de los dos workers de sincronización de pjn-mis-causas para
// el motor FlowDiagram (causas/flujos).
//
// Son dos caminos sobre el MISMO listado del portal:
//   · mis-causas   → sync completa, on-demand, al validar una credencial.
//   · update-sync  → una pasada diaria por credencial, para detectar altas y bajas.
//
// El diagrama muestra explícitamente las tres bifurcaciones que hacen que una
// fila del portal termine (o no) en una carpeta del usuario, porque son las que
// producían huecos silenciosos: el desvío de las filas sin fuero, quién decide
// que una fila es "nueva", y el techo del plan.
import { FlowSpec, FlowNode, FlowEdge } from "../causas/flujos/flowTypes";

export interface MisCausasScheduleInfo {
	/** Hora de la pasada diaria del update-sync, ej. "09:00". */
	dailyRunAt?: string;
	/** Máximo de credenciales en paralelo (scaling.maxInstances). */
	maxInstances?: number;
	/** Si el alta por reconciliación está habilitada. */
	createFromReconciliation?: boolean;
}

export function buildMisCausasWorkersSpec(schedule: MisCausasScheduleInfo = {}): FlowSpec {
	const hora = schedule.dailyRunAt ?? "hora (config)";
	const paralelo =
		schedule.maxInstances && schedule.maxInstances > 1 ? `hasta ${schedule.maxInstances} credenciales en paralelo` : "secuencial";
	const reconOn = schedule.createFromReconciliation !== false;

	const nodes: FlowNode[] = [
		{ id: "user", x: 30, y: 24, w: 190, h: 58, kind: "actor", label: "Usuario", sub: ["carga su credencial PJN"] },
		{
			id: "portal",
			x: 300,
			y: 24,
			w: 230, h: 74,
			kind: "ext",
			label: "Mis Causas (SCW)",
			sub: ["Expedientes Relacionados", "paginado completo, sin captcha"],
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
			sub: [`diario ${hora}`, paralelo, "lee SIEMPRE todas las páginas"],
		},
		{
			id: "rows",
			x: 300,
			y: 190,
			w: 230,
			h: 78,
			kind: "db",
			label: "Filas leídas del portal",
			sub: ["expediente · carátula · dependencia", "captura de cada página a S3 (60d)"],
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
	];

	const edges: FlowEdge[] = [
		{ id: "e1", from: "user", to: "full", kind: "handoff", label: "credencial validada" },
		{ id: "e2", from: "full", to: "portal", label: "login SSO", fromSide: "right", toSide: "left" },
		{ id: "e3", from: "daily", to: "portal", label: "login SSO", fromSide: "right", toSide: "bottom" },
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
	];

	return {
		id: "pjn-mis-causas-workers",
		title: "Sincronización de causas PJN por credencial",
		intro:
			"Los dos workers que llevan una fila del listado de Mis Causas hasta una carpeta del usuario: la sync completa del alta de credencial y la pasada diaria. Están juntos porque recorren el mismo listado y comparten el alta — lo que cambia es quién decide qué falta.",
		width: 1160,
		height: 440,
		nodes,
		edges,
		steps: [
			{
				title: "Vista completa",
				text: "Los dos workers entran al mismo listado con la credencial del usuario y leen todas las páginas. De ahí en adelante el camino es común: alta de la causa, carpeta, y de la carpeta se ocupa después el worker de movimientos.",
			},
			{
				title: "Sync completa (mis-causas)",
				text: "Corre on-demand cuando el usuario valida una credencial nueva o pide un resync. Procesa TODAS las filas del listado, sin heurísticas: para cada una busca la causa en la base local, si no está la pide al caché, y si tampoco está la crea desde el portal. Después arma la carpeta y vincula la credencial a la causa.",
				nodes: ["user", "full", "portal", "rows", "alta", "folder"],
				edges: ["e1", "e2", "e4", "e5", "e12"],
			},
			{
				title: "Pasada diaria (update-sync)",
				text: `Una vez por día por credencial, a las ${hora}. Recorre siempre el listado entero — no corta al encontrar filas conocidas — y toma captura de cada página a S3 con 60 días de retención, para poder auditar a mano qué mostraba el portal ese día.`,
				nodes: ["daily", "portal", "rows"],
				edges: ["e3", "e4"],
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
				text: "Una carpeta cuya causa ya no aparece en el listado se marca listRemoved. Solo se marca cuando el escaneo leyó todas las páginas: con un escaneo parcial, la ausencia no prueba nada y un portal degradado convertiría causas sanas en bajas. Si la causa reaparece, la marca se limpia sola.",
				nodes: ["recon", "removed"],
				edges: ["e10"],
			},
			{
				title: "El techo del plan",
				text: "El alta consulta los límites de la suscripción. Sobre el tope de carpetas la crea archivada; sin storage disponible NO la crea. Ese segundo caso deja la causa sin carpeta de forma legítima y permanente, y reaparece cada día en el conteo de 'portal sin carpeta' — por eso el run guarda cuáles son y cuántas quedaron pendientes por límite.",
				nodes: ["alta", "plan", "folder"],
				edges: ["e11", "e12"],
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
