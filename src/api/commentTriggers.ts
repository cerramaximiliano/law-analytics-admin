import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

export interface TriggerMensajeInicial {
	texto: string;
	/** Meta corta el rótulo a 20 caracteres. */
	boton: string;
}

export interface TriggerMensajeMaterial {
	texto: string;
	boton: string;
	url: string;
}

export interface TriggerMensajeEmail {
	texto?: string;
	confirmacion?: string;
}

export interface TriggerMetricas {
	comentarios: number;
	respondidos: number;
	abrieron: number;
	emails: number;
	errores: number;
	ultimoEn: string | null;
}

export interface CommentTrigger {
	_id: string;
	postId: string | null;
	/** Por acá entran los comentarios del webhook. */
	instagramMediaId: string | null;
	publicacionId: string | null;
	nombre: string;
	palabras: string[];
	/** true = la palabra tiene que ser el comentario entero. */
	exacta: boolean;
	mensajeInicial: TriggerMensajeInicial;
	mensajeMaterial: TriggerMensajeMaterial;
	pedirEmail: boolean;
	mensajeEmail: TriggerMensajeEmail;
	activo: boolean;
	metricas: TriggerMetricas;
	createdAt: string;
	updatedAt: string;
}

export interface CommentTriggerPayload {
	nombre?: string;
	instagramMediaId?: string | null;
	postId?: string | null;
	publicacionId?: string | null;
	palabras?: string[];
	exacta?: boolean;
	mensajeInicial?: TriggerMensajeInicial;
	mensajeMaterial?: TriggerMensajeMaterial;
	pedirEmail?: boolean;
	mensajeEmail?: TriggerMensajeEmail;
	activo?: boolean;
}

export type LeadEstado = "comentado" | "respondido" | "abrio" | "email" | "error";

export interface CommentLead {
	_id: string;
	username: string | null;
	estado: LeadEstado;
	email: string | null;
	textoComentario: string;
	createdAt: string;
	ultimoError: string | null;
}

export interface TriggerLeads {
	embudo: Partial<Record<LeadEstado, number>>;
	ultimos: CommentLead[];
}

/** Diagnóstico: qué falta para que el flujo pueda entregar algo. */
export interface TriggerEstado {
	configurado: boolean;
	variablesFaltantes: string[];
	permisos: { scopes?: string[]; faltantes?: string[]; error?: string } | null;
	webhook: string;
	camposASuscribir: string[];
}

// ==================== Endpoints ====================

export const getTriggerEstado = async (): Promise<TriggerEstado> => {
	const res = await mktAxios.get("/api/comment-triggers/estado");
	return res.data.data;
};

export const listTriggers = async (): Promise<CommentTrigger[]> => {
	const res = await mktAxios.get("/api/comment-triggers");
	return res.data.data;
};

export const getTriggerLeads = async (id: string): Promise<TriggerLeads> => {
	const res = await mktAxios.get(`/api/comment-triggers/${id}/leads`);
	return res.data.data;
};

export const createTrigger = async (payload: CommentTriggerPayload): Promise<CommentTrigger> => {
	const res = await mktAxios.post("/api/comment-triggers", payload);
	return res.data.data;
};

export const updateTrigger = async (id: string, payload: CommentTriggerPayload): Promise<CommentTrigger> => {
	const res = await mktAxios.put(`/api/comment-triggers/${id}`, payload);
	return res.data.data;
};

export const deleteTrigger = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/comment-triggers/${id}`);
};

/** Los hallazgos de coherencia de una automatización, sin intentar guardar. */
export interface HallazgoTrigger {
	nivel: "error" | "aviso";
	codigo: string;
	mensaje: string;
	arreglo: string;
}

export const revisarTrigger = async (id: string): Promise<HallazgoTrigger[]> => {
	const res = await mktAxios.get(`/api/comment-triggers/${id}/revision`);
	return res.data.data;
};
