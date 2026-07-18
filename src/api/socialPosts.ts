import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

export type TemplateId = "novedad" | "dato" | "feature" | "carrusel" | "promo" | "valor-arancel";
export type FormatoId = "feed34" | "feed45" | "square" | "story";
export type EstadoPost = "borrador" | "aprobado" | "publicado";

/** El contenido es forma libre: cada plantilla define sus propios campos. */
export type ContenidoPost = Record<string, unknown>;

export interface AnimacionInfo {
	id: string;
	label: string;
	description: string;
	duracion: number;
}

export interface TemplateInfo {
	id: TemplateId;
	label: string;
	description: string;
	multiSlide: boolean;
	limits: Record<string, number>;
	/** Animaciones de video aplicables a esta plantilla. */
	animaciones?: AnimacionInfo[];
	schema: {
		type: string;
		properties: Record<string, { type: string; description?: string }>;
		required: string[];
	};
}

export interface FormatoInfo {
	id: FormatoId;
	label: string;
	width: number;
	height: number;
}

export interface TemplatesResponse {
	templates: TemplateInfo[];
	formats: FormatoInfo[];
	defaultFormat: FormatoId;
	animaciones: AnimacionInfo[];
}

/** Video renderizado. `video` viene en base64, sin el prefijo data:. */
export interface VideoResponse {
	video: string;
	frames: number;
	bytes: number;
	ms: number;
	width: number;
	height: number;
	animacion: string;
	duracionMs: number;
}

export interface GeneracionMeta {
	modelo: string | null;
	inputTokens: number | null;
	outputTokens: number | null;
	generadoEn: string | null;
}

export interface SocialPost {
	_id: string;
	titulo: string;
	templateId: TemplateId;
	formato: FormatoId;
	prompt: string;
	contenido: ContenidoPost;
	caption: string;
	hashtags: string[];
	estado: EstadoPost;
	generacion?: GeneracionMeta;
	creadoPor: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListPostsResponse {
	posts: SocialPost[];
	total: number;
	page: number;
	pages: number;
}

export interface GenerateResponse {
	contenido: ContenidoPost;
	usage: { inputTokens: number; outputTokens: number; model: string };
	/** Avisos de limite de caracteres. No bloquean: el usuario puede editar. */
	warnings: string[];
}

/** Las imagenes vienen en base64, sin el prefijo data:. */
export interface RenderResponse {
	images: string[];
	width: number;
	height: number;
	ms: number;
}

/** Una variante renderizada. `error` viene poblado si ese formato falló. */
export interface VarianteFormato {
	formato: FormatoId;
	label: string;
	width?: number;
	height?: number;
	images?: string[];
	ms?: number;
	error?: string;
}

export interface SocialHealth {
	renderer: { online: boolean; ok?: boolean; error?: string };
	claudeConfigurado: boolean;
}

// ==================== Endpoints ====================

export const getTemplates = async (): Promise<TemplatesResponse> => {
	const res = await mktAxios.get("/api/social/templates");
	return res.data.data;
};

export const getHealth = async (): Promise<SocialHealth> => {
	const res = await mktAxios.get("/api/social/health");
	return res.data.data;
};

export const generateContent = async (params: { templateId: TemplateId; prompt: string; notas?: string }): Promise<GenerateResponse> => {
	const res = await mktAxios.post("/api/social/generate", params);
	return res.data.data;
};

export const renderContent = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	formato: FormatoId;
}): Promise<RenderResponse> => {
	const res = await mktAxios.post("/api/social/render", params);
	return res.data.data;
};

/** Renderiza el mismo contenido en todos los formatos de una pasada. */
export const renderAllFormats = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	formatos?: FormatoId[];
}): Promise<VarianteFormato[]> => {
	const res = await mktAxios.post("/api/social/render-all", params);
	return res.data.data.variantes;
};

/**
 * Renderiza un video del contenido. Por defecto en story (1080x1920), que es
 * el formato en que Instagram publica video.
 */
export const renderVideo = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	animacion?: string;
	duracionSeg?: number;
	formato?: FormatoId;
}): Promise<VideoResponse> => {
	// El render de video tarda bastante mas que una imagen: se sube el timeout
	// del cliente para que no corte antes de que el server termine.
	const res = await mktAxios.post("/api/social/video", params, { timeout: 300000 });
	return res.data.data;
};

/** Descarga un mp4 en base64 como archivo. */
export const downloadVideo = (base64: string, filename: string) => {
	const bytes = atob(base64);
	const buffer = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
	const url = URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = filename.replace(/\.mp4$/i, "") + ".mp4";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

export const listPosts = async (
	params: { estado?: EstadoPost; templateId?: TemplateId; page?: number; limit?: number } = {},
): Promise<ListPostsResponse> => {
	const res = await mktAxios.get("/api/social/posts", { params });
	return res.data.data;
};

export const getPost = async (id: string): Promise<SocialPost> => {
	const res = await mktAxios.get(`/api/social/posts/${id}`);
	return res.data.data;
};

export const createPost = async (payload: {
	titulo: string;
	templateId: TemplateId;
	formato: FormatoId;
	prompt?: string;
	contenido: ContenidoPost;
	caption?: string;
	hashtags?: string[];
	estado?: EstadoPost;
	usage?: { model: string; inputTokens: number; outputTokens: number };
}): Promise<SocialPost> => {
	const res = await mktAxios.post("/api/social/posts", payload);
	return res.data.data;
};

export const updatePost = async (
	id: string,
	payload: Partial<Pick<SocialPost, "titulo" | "formato" | "contenido" | "caption" | "hashtags" | "estado">>,
): Promise<SocialPost> => {
	const res = await mktAxios.put(`/api/social/posts/${id}`, payload);
	return res.data.data;
};

/**
 * Clona un post aplicando solo los campos que cambian. Para posts recurrentes
 * (valores arancelarios, índices): el mes que viene cambian dos o tres datos y
 * el resto se hereda. No interviene el LLM.
 */
export const duplicatePost = async (
	id: string,
	payload: { contenido?: ContenidoPost; titulo?: string; formato?: FormatoId; caption?: string; hashtags?: string[]; estado?: EstadoPost },
): Promise<SocialPost> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/duplicate`, payload);
	return res.data.data;
};

export const deletePost = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/social/posts/${id}`);
};

export const renderSavedPost = async (id: string, formato?: FormatoId): Promise<RenderResponse> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/render`, null, {
		params: formato ? { formato } : undefined,
	});
	return res.data.data;
};

// ==================== Helpers ====================

/** Calidad del JPG de publicación. 92 es el punto donde el peso baja mucho sin artefactos visibles en tipografía. */
const CALIDAD_JPG = 0.92;

const dispararDescarga = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const base64ABytes = (base64: string) => {
	const bytes = atob(base64);
	const buffer = new Uint8Array(bytes.length);
	for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
	return buffer;
};

/**
 * Descarga una imagen lista para publicar.
 *
 * El renderer devuelve PNG (sin pérdida, ideal para previsualizar y archivar),
 * pero Instagram y Facebook reconvierten todo a JPEG al subirlo. Entregar
 * directamente un JPG de alta calidad evita esa doble conversión y baja el peso
 * del archivo drásticamente, que es lo que importa al publicar desde el celular.
 *
 * Se convierte en el navegador con canvas: el backend sigue devolviendo un solo
 * PNG y no hace falta re-renderizar para cambiar de formato.
 *
 * @param tipo "jpg" (default, para publicar) o "png" (sin pérdida, para archivo)
 */
export const downloadImage = async (base64: string, filename: string, tipo: "jpg" | "png" = "jpg"): Promise<void> => {
	if (tipo === "png") {
		dispararDescarga(new Blob([base64ABytes(base64)], { type: "image/png" }), filename.replace(/\.(jpe?g|png)$/i, "") + ".png");
		return;
	}

	const img = new Image();
	img.src = `data:image/png;base64,${base64}`;
	try {
		await img.decode();
	} catch {
		// Si el decode falla, es preferible entregar el PNG original antes que no descargar nada.
		dispararDescarga(new Blob([base64ABytes(base64)], { type: "image/png" }), filename.replace(/\.(jpe?g|png)$/i, "") + ".png");
		return;
	}

	const canvas = document.createElement("canvas");
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		dispararDescarga(new Blob([base64ABytes(base64)], { type: "image/png" }), filename.replace(/\.(jpe?g|png)$/i, "") + ".png");
		return;
	}
	// JPEG no tiene canal alfa: se pinta un fondo opaco por si el diseño tuviera
	// transparencia, para no obtener bordes negros.
	ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0);

	const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPG));
	if (!blob) {
		dispararDescarga(new Blob([base64ABytes(base64)], { type: "image/png" }), filename.replace(/\.(jpe?g|png)$/i, "") + ".png");
		return;
	}
	dispararDescarga(blob, filename.replace(/\.(jpe?g|png)$/i, "") + ".jpg");
};
