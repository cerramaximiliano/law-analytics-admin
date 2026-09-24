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
