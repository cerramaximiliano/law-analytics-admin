// Tipos compartidos de los diagramas de flujo de causas/folders.
// Los diagramas se definen como data (nodos con coordenadas absolutas + aristas
// entre ids) y los renderiza FlowDiagram.tsx como SVG animado.

export type NodeKind =
	| "actor" // usuario / acción humana (azul brand)
	| "hub" // law-analytics-server (azul relleno)
	| "public" // workers públicos con captcha (ámbar)
	| "private" // workers con credencial (violeta)
	| "db" // colecciones / almacenamiento (gris pizarra)
	| "ext" // sistemas externos: portales PJN, caché (gris punteado)
	| "ui" // interfaz del usuario final (azul punteado)
	| "ok" // estado sano (verde)
	| "warn" // estado a vigilar (naranja)
	| "bad"; // estado problema / bug (rojo)

export type EdgeKind = "normal" | "ok" | "handoff" | "problem";

export type Side = "left" | "right" | "top" | "bottom";

/**
 * De dónde sale el estado en vivo de un nodo (modo "En vivo" de /admin/flujos).
 * Sin esto el nodo se dibuja igual en los dos modos.
 */
export interface FlowNodeLiveRef {
	/** Box del inventario de infraestructura (key: "hub", "workercloud01"…). */
	box?: string;
	/** Procesos PM2 del nodo. Un `*` final matchea por prefijo (copias dinámicas -2, -3…). */
	procs?: string[];
	/** true = deben estar online (APIs, always-on). false/omitido = cron o manager: stopped es normal. */
	alwaysOnline?: boolean;
	/** Crons in-process con heartbeat en cron-health (admin-api). */
	crons?: string[];
}

export interface FlowNode {
	id: string;
	live?: FlowNodeLiveRef;
	x: number;
	y: number;
	w: number;
	h: number;
	kind: NodeKind;
	label: string;
	sub?: string[];
}

export interface FlowEdge {
	id: string;
	from: string;
	to: string;
	kind?: EdgeKind;
	label?: string;
	/** Ajuste fino de la posición de la etiqueta */
	labelDx?: number;
	labelDy?: number;
	fromSide?: Side;
	toSide?: Side;
}

export interface FlowStep {
	title: string;
	text: string;
	/** Ids activos; undefined = todo el diagrama activo */
	nodes?: string[];
	edges?: string[];
}

export interface FlowSpec {
	id: string;
	title: string;
	/** Descripción corta que se muestra arriba del diagrama */
	intro: string;
	width: number;
	height: number;
	nodes: FlowNode[];
	edges: FlowEdge[];
	steps: FlowStep[];
}

/** Severidad del estado en vivo de un nodo, de mejor a peor: idle < ok < unknown < warn < bad. */
export type LiveTone = "idle" | "ok" | "unknown" | "warn" | "bad";

export interface NodeLiveState {
	tone: LiveTone;
	/** Texto corto de la pastilla sobre el nodo ("2 online", "cola 14", "en espera"). */
	badge: string;
	/** Líneas del detalle (tooltip). */
	detail: string[];
}
