import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

/** Cada presentación del mismo trabajo. Un informe puede tener varias. */
export type VarianteTipo = "informe" | "ficha" | "carrusel" | "resumen" | "otro";

export type PublicacionEstado = "borrador" | "publicada" | "archivada";

export interface PublicacionVariante {
	tipo: VarianteTipo;
	label: string;
	url: string;
	/** Una sola por publicación: la que abre el listado y se manda por privado. */
	principal?: boolean;
	nota?: string;
}

export interface PublicacionBase {
	descripcion?: string;
	documentosLeidos?: number | null;
	pronunciamientos?: number | null;
	periodo?: string;
}

export interface PublicacionPdf {
	key?: string | null;
	url?: string | null;
	bytes?: number | null;
	paginas?: number | null;
	generadoEn?: string | null;
}

export interface PublicacionFuente {
	repo?: string;
	rama?: string;
	scripts?: string;
	documentos?: string;
}

export interface Publicacion {
	_id: string;
	titulo: string;
	slug: string;
	bajada: string;
	categoria: string;
	fuero: string;
	variantes: PublicacionVariante[];
	base: PublicacionBase;
	pdf: PublicacionPdf;
	estado: PublicacionEstado;
	publicadoEn: string | null;
	destacada: boolean;
	/** false = se llega sólo con el link: no aparece en el listado ni se indexa. */
	listada: boolean;
	orden: number;
	postId: string | null;
	fuente: PublicacionFuente;
	seo: { title?: string; description?: string };
	createdAt: string;
	updatedAt: string;
}

export interface PublicacionPayload {
	titulo?: string;
	slug?: string;
	bajada?: string;
	categoria?: string;
	fuero?: string;
	variantes?: PublicacionVariante[];
	base?: PublicacionBase;
	pdf?: PublicacionPdf;
	estado?: PublicacionEstado;
	destacada?: boolean;
	listada?: boolean;
	orden?: number;
	postId?: string | null;
	fuente?: PublicacionFuente;
	seo?: { title?: string; description?: string };
}

// ==================== Endpoints ====================

export const listPublicaciones = async (params?: { estado?: PublicacionEstado; categoria?: string }): Promise<Publicacion[]> => {
	const res = await mktAxios.get("/api/publicaciones", { params });
	return res.data.data;
};

export const getPublicacion = async (id: string): Promise<Publicacion> => {
	const res = await mktAxios.get(`/api/publicaciones/${id}`);
	return res.data.data;
};

export const createPublicacion = async (payload: PublicacionPayload & { titulo: string; slug: string; bajada: string }): Promise<Publicacion> => {
	const res = await mktAxios.post("/api/publicaciones", payload);
	return res.data.data;
};

export const updatePublicacion = async (id: string, payload: PublicacionPayload): Promise<Publicacion> => {
	const res = await mktAxios.put(`/api/publicaciones/${id}`, payload);
	return res.data.data;
};

export const deletePublicacion = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/publicaciones/${id}`);
};

// ==================== Flujo ====================
// contenido → PDF → post → automatización. Cada paso es independiente:
// nada se encadena solo, un informe se publica cuando alguien lo decide.

export interface PasoContenido {
	ok: boolean;
	secciones: number;
	placas: number;
	errores: string[];
}

/** Un problema de coherencia del flujo. Ver validaciones.js en el backend. */
export interface Hallazgo {
	nivel: "error" | "aviso";
	codigo: string;
	mensaje: string;
	arreglo: string;
}

export interface FlujoEstado {
	/** Lo que el post promete tiene que existir de verdad. */
	validaciones: Hallazgo[];
	contenido: PasoContenido;
	pdf: { ok: boolean; paginas: number | null; bytes: number | null; generadoEn: string | null };
	post: { ok: boolean; id?: string; titulo?: string; estado?: string; publicadoEn?: string | null; instagramMediaId?: string | null };
	trigger: {
		ok: boolean;
		id?: string;
		palabras?: string[];
		activo?: boolean;
		/** Sin el media id el webhook no sabe a qué post pertenece un comentario. */
		vinculado?: boolean;
		metricas?: { comentarios: number; respondidos: number; abrieron: number; emails: number; errores: number };
	};
}

export interface ConfiguracionFlujo {
	post: { templateId: string; formato: string; estilo: string; cierre: string; hashtags: string[]; llamado: string };
	trigger: {
		estrategiaPalabra: "titulo" | "fija";
		palabraFija: string;
		exacta: boolean;
		activarAlCrear: boolean;
		pedirEmail: boolean;
		mensajeInicial: { texto: string; boton: string };
		mensajeMaterial: { texto: string; boton: string };
		mensajeEmail: { texto: string; confirmacion: string };
	};
	publicacion: { listadaPorDefecto: boolean; piezaPrincipal: string; piezas: string[] };
}

export const getFlujo = async (id: string): Promise<FlujoEstado> => {
	const res = await mktAxios.get(`/api/publicaciones/${id}/flujo`);
	return res.data.data;
};

export const generarPdf = async (id: string, pieza?: string): Promise<{ paginas: number | null; bytes: number }> => {
	const res = await mktAxios.post(`/api/publicaciones/${id}/pdf`, { pieza });
	return res.data.data;
};

export const crearPostDesdePublicacion = async (id: string, palabra?: string): Promise<{ _id: string; titulo: string }> => {
	const res = await mktAxios.post(`/api/publicaciones/${id}/post`, { palabra });
	return res.data.data;
};

export const crearTriggerDesdePublicacion = async (id: string, palabra?: string): Promise<{ _id: string; palabras: string[] }> => {
	const res = await mktAxios.post(`/api/publicaciones/${id}/trigger`, { palabra });
	return res.data.data;
};

export const vincularMedia = async (id: string): Promise<{ instagramMediaId: string }> => {
	const res = await mktAxios.post(`/api/publicaciones/${id}/vincular-media`);
	return res.data.data;
};

/**
 * Enlace de vista previa. Una publicación reservada no se abre sin token ni
 * desde el admin: en vez de hacer una excepción —otra puerta que cuidar— se
 * emite un acceso de un día y se abre la URL real. Se ve lo mismo que verá
 * la persona, por el mismo camino.
 */
export const getVistaPrevia = async (id: string, pieza?: string): Promise<{ url: string }> => {
	const res = await mktAxios.get(`/api/publicaciones/${id}/vista-previa`, { params: pieza ? { pieza } : undefined });
	return res.data.data;
};

export const getConfigFlujo = async (): Promise<ConfiguracionFlujo> => {
	const res = await mktAxios.get("/api/publicaciones/flujo-config");
	return res.data.data;
};

export const updateConfigFlujo = async (payload: Partial<ConfiguracionFlujo>): Promise<ConfiguracionFlujo> => {
	const res = await mktAxios.put("/api/publicaciones/flujo-config", payload);
	return res.data.data;
};
