import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

export type EstadoArticulo = "borrador" | "publicado";

/** De dónde salió el fallo citado: match de texto SAIJ, semántico, o corpus PJN completo. */
export type OrigenJurisprudencia = "saij-texto" | "saij-semantica" | "corpus";

/** Fallo citado en el artículo. La API pública lo renderiza como card debajo del cuerpo. */
export interface JurisprudenciaRef {
	/** _id de sentencias-capturadas (string para no atar el tipo al rs0). */
	sentenciaId: string;
	caratula: string;
	tribunal: string | null;
	fuero: string | null;
	fecha: string | null;
	/** Comentario redactado que conecta el fallo con el tema del artículo. Máx 1200. */
	comentario: string;
	/** true = tiene página pública en /jurisprudencia/{sentenciaId}. Los del corpus se citan sin link. */
	enlazable: boolean;
	origen: OrigenJurisprudencia;
}

export interface SeoArticulo {
	/** Máx 70 caracteres. */
	title: string;
	/** Máx 170 caracteres. */
	description: string;
	keywords: string[];
}

export interface GeneracionArticuloMeta {
	modelo: string | null;
	inputTokens: number | null;
	outputTokens: number | null;
	generadoEn: string | null;
}

export interface EducativoArticulo {
	_id: string;
	/** Slug de URL pública (lawanalytics.app/educativo/:slug). Coincide con el _id del tema del banco. */
	slug: string;
	temaId: string;
	titulo: string;
	/** Bajada corta: listado del blog + meta description. Máx 200. */
	resumen: string;
	/** Cuerpo en markdown. Ausente en el listado: la API lo excluye para no engordar la respuesta. */
	cuerpo?: string;
	jurisprudencia: JurisprudenciaRef[];
	seo: SeoArticulo;
	estado: EstadoArticulo;
	/** Fecha en que se publicó. Null en borrador. */
	publicadoEn: string | null;
	/** Post social hermano (el carrusel de IG del mismo tema). */
	postId: string | null;
	/** Publicación coordinada: al publicar el post de IG, el artículo sale con él. */
	publicarConPost?: boolean;
	generacion?: GeneracionArticuloMeta;
	createdAt: string;
	updatedAt: string;
}

export interface ListArticulosResponse {
	articulos: EducativoArticulo[];
	total: number;
	page: number;
	pages: number;
}

/**
 * Payload de edición. De la jurisprudencia el backend solo admite editar el
 * comentario de cada fallo y/o quitar fallos: el array reemplaza al guardado,
 * pero cada item debe referir (por sentenciaId) a un fallo que el artículo ya
 * tenía — carátula/origen/etc. se conservan siempre del original.
 */
export interface UpdateArticuloPayload {
	titulo?: string;
	resumen?: string;
	cuerpo?: string;
	seo?: Partial<Pick<SeoArticulo, "title" | "description">> & { keywords?: string[] };
	estado?: EstadoArticulo;
	jurisprudencia?: Array<{ sentenciaId: string; comentario?: string }>;
	publicarConPost?: boolean;
}

// ==================== Endpoints ====================

export const listArticulos = async (
	params: { estado?: EstadoArticulo; page?: number; limit?: number } = {},
): Promise<ListArticulosResponse> => {
	const res = await mktAxios.get("/api/educativo/articulos", { params });
	return res.data.data;
};

export const getArticulo = async (id: string): Promise<EducativoArticulo> => {
	const res = await mktAxios.get(`/api/educativo/articulos/${id}`);
	return res.data.data;
};

export const updateArticulo = async (id: string, payload: UpdateArticuloPayload): Promise<EducativoArticulo> => {
	const res = await mktAxios.put(`/api/educativo/articulos/${id}`, payload);
	return res.data.data;
};

export const deleteArticulo = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/educativo/articulos/${id}`);
};
