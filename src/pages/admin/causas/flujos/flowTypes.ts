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

export interface FlowNode {
	id: string;
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
