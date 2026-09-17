import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

export type TemplateId =
	| "novedad"
	| "dato"
	| "feature"
	| "carrusel"
	| "jurisprudencia-carrusel"
	| "educativo-carrusel"
	| "promo"
	| "valor-arancel"
	| "tutorial"
	| "agenda"
	| "ranking"
	| "efemeride"
	| "planes";
export type FormatoId = "feed34" | "feed45" | "square" | "story" | "reel";
export type EstadoPost = "borrador" | "aprobado" | "programado" | "publicado";
/** Redes donde se publica vía Graph API (services/social/metaPublisher.js). */
export type DestinoMeta = "facebook" | "instagram";
/** Orden del listado de guardados. El backend cae a "recientes" ante cualquier otro valor. */
export type OrdenPosts = "recientes" | "antiguos";

/** El contenido es forma libre: cada plantilla define sus propios campos. */
export type ContenidoPost = Record<string, unknown>;

/** Un campo del schema de una plantilla. `items` aparece en los arrays de objetos. */
export interface SchemaProp {
	type: string;
	description?: string;
	enum?: string[];
	items?: { properties?: Record<string, SchemaProp>; required?: string[] };
}

export interface EstiloInfo {
	id: string;
	label: string;
	description: string;
	oscuro: boolean;
}

export interface ComposicionInfo {
	id: string;
	label: string;
	description: string;
}

/** Dónde va (o si va) el pie de marca. Eje independiente de la composición. */
export interface PieInfo {
	id: string;
	label: string;
	description: string;
}

export interface AnimacionInfo {
	id: string;
	label: string;
	description: string;
	/** Solo en las animaciones de post fijo: las transiciones de flujo toman el ritmo de la plantilla. */
	duracion?: number;
}

export interface TemplateInfo {
	id: TemplateId;
	label: string;
	description: string;
	multiSlide: boolean;
	limits: Record<string, number>;
	/** Mínimo y máximo de filas para los campos que son arrays de objetos. */
	rangos?: Record<string, [number, number]>;
	/** Animaciones de video aplicables a esta plantilla. */
	animaciones?: AnimacionInfo[];
	/** Estilo visual que mejor le sienta a esta plantilla. */
	estiloPorDefecto?: string;
	/** Estilos disponibles (son transversales a todas las plantillas). */
	estilos?: EstiloInfo[];
	composicionPorDefecto?: string;
	composiciones?: ComposicionInfo[];
	schema: {
		type: string;
		properties: Record<string, SchemaProp>;
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
	estilos: EstiloInfo[];
	defaultEstilo: string;
	composiciones: ComposicionInfo[];
	defaultComposicion: string;
	pies: PieInfo[];
	defaultPie: string;
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
	/** Clips de marca aplicados (null si el video salió sin ellos). */
	intro?: string | null;
	cierre?: string | null;
}

/** Clip de marca (loader SVG animado) para intro/cierre de videos. */
export interface ClipInfo {
	id: string;
	label: string;
	description: string;
	/** Posición recomendada; la API acepta cualquier clip en cualquier posición. */
	tipo: "intro" | "cierre";
	duracionMs: number;
}

/** Pista de música embebible en los videos (assets/audio del backend). */
export interface AudioInfo {
	id: string;
	label: string;
	description: string;
}

export interface GeneracionMeta {
	modelo: string | null;
	inputTokens: number | null;
	outputTokens: number | null;
	generadoEn: string | null;
}

/** Resumen de las piezas guardadas en S3, con miniatura firmada. */
export interface MediaResumen {
	imagenes: number;
	/** Formatos efectivamente archivados. */
	formatos?: string[];
	video: boolean;
	actualizadoEn?: string | null;
	/** URL prefirmada de la primera imagen (expira a los 15 min). */
	previewUrl?: string;
}

export interface SocialPost {
	_id: string;
	titulo: string;
	/** Presente solo si el post ya tiene piezas persistidas. */
	mediaResumen?: MediaResumen;
	templateId: TemplateId;
	formato: FormatoId;
	prompt: string;
	contenido: ContenidoPost;
	caption: string;
	/** Caption propio para Facebook. Vacío = se deriva del caption sin "Link in BIO". */
	captionFacebook?: string;
	hashtags: string[];
	estado: EstadoPost;
	/** Fecha en que se marcó como publicado. Null si no se publicó. */
	publicadoEn?: string | null;
	/** Publicación automática en Meta: cuándo (estado 'programado'). */
	programadoPara?: string | null;
	destinos?: DestinoMeta[];
	/** Resultado de la publicación en Meta (ids de Graph API, último error). */
	publicacion?: PublicacionMeta | null;
	/** Campaña paga creada desde el panel (Marketing API). */
	promocion?: PromocionMeta | null;
	/** Campaña del reel del post (segunda campaña, independiente de la de la imagen). */
	promocionReel?: PromocionMeta | null;
	/** Animación del video, guardada con el post para que sirva como plantilla. */
	animacion?: string;
	/** Estilo visual. Null = el que la plantilla trae por defecto. */
	estilo?: string | null;
	/** Composición: dónde se ancla el contenido. Null = el de la plantilla. */
	composicion?: string | null;
	/** Pie de marca: con el contenido, siempre abajo, o sin pie. */
	pie?: string | null;
	duracionSeg?: number | null;
	generacion?: GeneracionMeta;
	creadoPor: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface PublicacionMeta {
	estado: "pendiente" | "publicando" | "publicado" | "parcial" | "error" | null;
	facebookPostId?: string | null;
	instagramMediaId?: string | null;
	error?: string | null;
	intentos?: number;
	ultimoIntentoEn?: string | null;
	/** Reel (video 9:16 archivado) publicado aparte de la imagen. */
	reel?: {
		estado: "publicando" | "publicado" | "parcial" | "error" | null;
		instagramReelId?: string | null;
		facebookVideoId?: string | null;
		error?: string | null;
		publicadoEn?: string | null;
	} | null;
}

export interface PromocionMeta {
	campaignId?: string | null;
	adsetId?: string | null;
	adId?: string | null;
	creativeId?: string | null;
	estado?: "pausada" | "activa" | "finalizada" | null;
	objetivo?: "trafico" | "interaccion";
	presupuestoDiarioARS?: number | null;
	dias?: number | null;
	inicio?: string | null;
	fin?: string | null;
	url?: string | null;
	cta?: string | null;
	creadoEn?: string | null;
	activadoEn?: string | null;
}

/** GET /api/social/posts/:id/promocion — estado real en Meta + métricas. */
export interface EstadoPromocion {
	promocion: PromocionMeta;
	campana: { id: string; nombre: string; status: string; effectiveStatus: string };
	conjunto: { status: string; presupuestoDiario: number; inicio: string; fin: string } | null;
	anuncio: { status: string; effectiveStatus: string } | null;
	insights: {
		impressions?: string;
		reach?: string;
		frequency?: string;
		inline_link_clicks?: string;
		clicks?: string;
		spend?: string;
		cpc?: string;
		ctr?: string;
	} | null;
	/** Snapshots diarios del cron de seguimiento (más reciente primero). */
	historial?: HistorialMetaAds[];
	/** Registros atribuidos acumulados (suma del historial). */
	registros?: number;
	adsManagerUrl: string;
}

export interface HistorialMetaAds {
	fecha: string;
	impressions: number;
	reach: number;
	clicks: number;
	inlineLinkClicks: number;
	spend: number;
	cpc: number | null;
	ctr: number | null;
	interacciones?: number;
	likes?: number;
	comentarios?: number;
	guardados?: number;
	registros: number;
	capturadoEn: string;
}

/** GET /api/social/meta/instagram-media — publicaciones recientes de la cuenta. */
export interface InstagramMedia {
	id: string;
	tipo: "imagen" | "carrusel" | "video";
	fecha: string;
	likes: number;
	comentarios: number;
	permalink: string;
	titulo: string;
	/** Medidas de la primera imagen y si Meta la admite como anuncio (4:5 a 1,91:1). null = no se pudo medir. */
	ancho?: number | null;
	alto?: number | null;
	elegible?: boolean | null;
}

/** GET /api/social/meta/whoami — diagnóstico del token de Meta. */
export interface MetaWhoami {
	configurado: boolean;
	graphVersion: string;
	usuario?: { id: string; name: string } | null;
	pagina?: { id: string; name: string } | null;
	instagram?: { id: string; username?: string } | null;
	error?: string | null;
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

export const getClips = async (): Promise<ClipInfo[]> => {
	const res = await mktAxios.get("/api/social/clips");
	return res.data.data;
};

export const getAudios = async (): Promise<AudioInfo[]> => {
	const res = await mktAxios.get("/api/social/audios");
	return res.data.data;
};

export const generateContent = async (params: { templateId: TemplateId; prompt: string; notas?: string }): Promise<GenerateResponse> => {
	const res = await mktAxios.post("/api/social/generate", params);
	return res.data.data;
};

/** Caption + hashtags generados con IA a partir del contenido del post. */
export interface CaptionResponse {
	caption: string;
	hashtags: string[];
	usage: { model: string; inputTokens: number | null; outputTokens: number | null };
}

export const generateCaption = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	notas?: string;
}): Promise<CaptionResponse> => {
	const res = await mktAxios.post("/api/social/caption", params);
	return res.data.data;
};

export const renderContent = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	formato: FormatoId;
	estilo?: string;
	composicion?: string;
	pie?: string;
}): Promise<RenderResponse> => {
	const res = await mktAxios.post("/api/social/render", params);
	return res.data.data;
};

/** Renderiza el mismo contenido en todos los formatos de una pasada. */
export const renderAllFormats = async (params: {
	templateId: TemplateId;
	contenido: ContenidoPost;
	formatos?: FormatoId[];
	estilo?: string;
	composicion?: string;
	pie?: string;
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
	estilo?: string;
	composicion?: string;
	pie?: string;
	/** Clip de marca antes del post (id de ClipInfo). */
	intro?: string;
	/** Clip de marca después del post (id de ClipInfo). */
	cierre?: string;
	/** Pista de música (id de AudioInfo); el renderer la loopea con fade de salida. */
	audio?: string;
}): Promise<VideoResponse> => {
	// El render de video tarda bastante mas que una imagen: se sube el timeout
	// del cliente para que no corte antes de que el server termine.
	const res = await mktAxios.post("/api/social/video", params, { timeout: 600000 });
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
	params: { estado?: EstadoPost; templateId?: TemplateId; page?: number; limit?: number; orden?: OrdenPosts } = {},
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
	animacion?: string;
	duracionSeg?: number;
	estilo?: string;
	composicion?: string;
	pie?: string;
	usage?: { model: string; inputTokens: number; outputTokens: number };
}): Promise<SocialPost> => {
	const res = await mktAxios.post("/api/social/posts", payload);
	return res.data.data;
};

export const updatePost = async (
	id: string,
	payload: Partial<
		Pick<
			SocialPost,
			| "titulo"
			| "formato"
			| "contenido"
			| "caption"
			| "captionFacebook"
			| "hashtags"
			| "estado"
			| "animacion"
			| "duracionSeg"
			| "estilo"
			| "composicion"
			| "pie"
			| "publicadoEn"
		>
	>,
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

/**
 * Renderiza el video de un post guardado. Sin `animacion` explícita usa la que
 * el post tiene guardada, así el duplicado conserva su movimiento.
 */
export const renderVideoSavedPost = async (
	id: string,
	params: {
		animacion?: string;
		duracionSeg?: number;
		formato?: FormatoId;
		estilo?: string;
		composicion?: string;
		pie?: string;
		intro?: string;
		cierre?: string;
		audio?: string;
	} = {},
): Promise<VideoResponse> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/video`, params, { timeout: 600000 });
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

// ==================== Piezas guardadas (S3) ====================

/** Pieza persistida de un post. `url` es prefirmada y expira (ttlSegundos). */
export interface MediaImagen {
	key: string;
	formato?: string;
	indice?: number;
	bytes?: number;
	generadoEn?: string;
	/** Para ver en el visor (inline). */
	url: string;
	/** Para bajar el archivo con nombre legible (Content-Disposition). */
	urlDescarga?: string;
}

export interface MediaVideo {
	key: string;
	urlDescarga?: string;
	formato?: string;
	duracionMs?: number | null;
	fps?: number | null;
	bytes?: number;
	generadoEn?: string;
	url: string;
}

export interface MediaPost {
	imagenes: MediaImagen[];
	video: MediaVideo | null;
	actualizadoEn: string | null;
	ttlSegundos: number;
}

export interface GuardarMediaPayload {
	/** PNGs en base64 (sin prefijo data:), en orden de slide. Un solo formato. */
	imagenes?: string[];
	/** Varios formatos de una: lo que produce "Generar variantes". */
	variantes?: { formato: FormatoId; imagenes: string[] }[];
	/** MP4 en base64. */
	video?: string;
	formato?: FormatoId;
	duracionMs?: number;
	fps?: number;
	/** Sin esto, si el post ya tiene piezas la API responde 409. */
	reemplazar?: boolean;
}

/**
 * Sube al post las piezas ya renderizadas. Ante un post que ya las tiene, la
 * API responde 409 con `requiereConfirmacion`: la UI pregunta y reintenta con
 * `reemplazar: true`.
 */
export const guardarMediaPost = async (
	id: string,
	payload: GuardarMediaPayload,
): Promise<{ imagenes: number; video: boolean; actualizadoEn: string }> => {
	// Sube los PNG/MP4 en base64: con el timeout por defecto (30s) una
	// carga de varios MB se corta a mitad de camino.
	const res = await mktAxios.post(`/api/social/posts/${id}/media`, payload, { timeout: 300000 });
	return res.data.data;
};

export const getMediaPost = async (id: string): Promise<MediaPost> => {
	const res = await mktAxios.get(`/api/social/posts/${id}/media`);
	return res.data.data;
};

export const borrarMediaPost = async (id: string): Promise<{ borrados: number }> => {
	const res = await mktAxios.delete(`/api/social/posts/${id}/media`);
	return res.data.data;
};

/** Progreso del video que el renderer está capturando ahora mismo. */
export interface ProgresoRender {
	activo: boolean;
	/** Tanda de "generar todos los formatos" en curso (la lleva la API). */
	variantes?: { activo: boolean; indice?: number; total?: number; formato?: string; segundos?: number };
	frames?: number;
	total?: number;
	porcentaje?: number;
	encodeando?: boolean;
	segundos?: number;
}

export const getProgresoRender = async (): Promise<ProgresoRender> => {
	const res = await mktAxios.get("/api/social/render-progreso");
	return res.data.data;
};

// ==================== Carrusel de un fallo (SAIJ) ====================

export interface FalloExplicadoResponse {
	creado: boolean;
	postId?: string;
	content: { caratula?: string; rama?: string; bloques?: { rotulo: string; texto: string }[] };
	caption?: string;
	warnings?: string[];
}

/**
 * Genera el carrusel de UNA sentencia del corpus SAIJ y lo deja en borrador.
 * El prompt lo arma el backend con el texto del fallo: acá solo se elige cuál.
 */
export const crearFalloExplicado = async (scId: string, notas?: string): Promise<FalloExplicadoResponse> => {
	const { data } = await mktAxios.post("/api/social/fallo-explicado", { scId, notas });
	return data.data;
};

// ==================== Publicación en Meta (Graph API) ====================

/** Valida el token de Meta y muestra qué página e Instagram ve. */
export const getMetaWhoami = async (): Promise<MetaWhoami> => {
	const res = await mktAxios.get("/api/social/meta/whoami");
	return res.data.data;
};

/** Programa la publicación: el cron del backend la ejecuta cuando llega la hora. */
export const programarPost = async (
	id: string,
	payload: { programadoPara: string; destinos?: DestinoMeta[]; captionFacebook?: string },
): Promise<SocialPost> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/programar`, payload);
	return res.data.data;
};

/**
 * Publica el video archivado como reel en Instagram y video en Facebook.
 * 202 + segundo plano: consultar getPost hasta que publicacion.reel.estado deje de ser 'publicando'.
 */
export const publicarReel = async (id: string, destinos?: DestinoMeta[]): Promise<void> => {
	await mktAxios.post(`/api/social/posts/${id}/publicar-reel`, destinos ? { destinos } : {});
};

/**
 * Olvida el id de Meta de una red (porque el post se borró allá) para poder
 * volver a publicarlo. No borra nada en Meta.
 */
export const desvincularRedPost = async (id: string, destino: DestinoMeta): Promise<SocialPost> => {
	const res = await mktAxios.delete(`/api/social/posts/${id}/publicacion/${destino}`);
	return res.data.data;
};

/** Cancela la programación: el post vuelve a borrador. */
export const cancelarProgramacionPost = async (id: string): Promise<SocialPost> => {
	const res = await mktAxios.delete(`/api/social/posts/${id}/programar`);
	return res.data.data;
};

/**
 * Publica ahora. El backend responde 202 y publica en segundo plano: hay que
 * consultar getPost hasta que publicacion.estado deje de ser 'publicando'.
 */
export const publicarPostAhora = async (
	id: string,
	payload: { destinos?: DestinoMeta[]; captionFacebook?: string } = {},
): Promise<void> => {
	await mktAxios.post(`/api/social/posts/${id}/publicar`, payload);
};

// ==================== Promoción paga en Meta (Marketing API) ====================

/** Crea la campaña EN PAUSA que promociona el post de Instagram. No gasta hasta activar. */
export const promocionarPost = async (
	id: string,
	payload: {
		presupuestoDiarioARS: number;
		dias: number;
		objetivo?: "trafico" | "interaccion";
		url?: string;
		cta?: "SIGN_UP" | "LEARN_MORE";
		nombre?: string;
		/** Post publicado a mano: id de la publicación de Instagram a vincular. */
		igMediaId?: string;
		/** 'reel' promociona el reel publicado del post en vez de la imagen. */
		pieza?: PiezaPromo;
	},
): Promise<SocialPost> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/promocionar`, payload);
	return res.data.data;
};

export const getInstagramMedia = async (): Promise<InstagramMedia[]> => {
	const res = await mktAxios.get("/api/social/meta/instagram-media");
	return res.data.data;
};

/** Pieza promocionada: la imagen del post o su reel. */
export type PiezaPromo = "post" | "reel";
const qPieza = (pieza?: PiezaPromo) => (pieza === "reel" ? "?pieza=reel" : "");

export const getEstadoPromocion = async (id: string, pieza?: PiezaPromo): Promise<EstadoPromocion | null> => {
	const res = await mktAxios.get(`/api/social/posts/${id}/promocion${qPieza(pieza)}`);
	return res.data.data;
};

/** LANZA la campaña: empieza el gasto (Meta la revisa antes de entregar). */
export const activarPromocion = async (id: string, pieza?: PiezaPromo): Promise<SocialPost> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/promocion/activar${qPieza(pieza)}`);
	return res.data.data;
};

export const pausarPromocion = async (id: string, pieza?: PiezaPromo): Promise<SocialPost> => {
	const res = await mktAxios.post(`/api/social/posts/${id}/promocion/pausar${qPieza(pieza)}`);
	return res.data.data;
};

/** Borra la campaña en Meta y desvincula el post. */
export const eliminarPromocion = async (id: string, pieza?: PiezaPromo): Promise<SocialPost> => {
	const res = await mktAxios.delete(`/api/social/posts/${id}/promocion${qPieza(pieza)}`);
	return res.data.data;
};

/** GET /api/social/promociones — todas las campañas de Meta con totales del seguimiento. */
export interface PromocionResumen {
	_id: string;
	titulo: string;
	templateId: TemplateId;
	formato: FormatoId;
	estado: EstadoPost;
	publicadoEn?: string | null;
	publicacion?: PublicacionMeta | null;
	/** Qué se promociona en esta fila: la imagen ('post') o el reel del post. */
	pieza?: PiezaPromo;
	/** La campaña de la fila (para 'reel' es la promocionReel del post). */
	promocion: PromocionMeta;
	mediaResumen?: { imagenes: number };
	totales: {
		impressions: number;
		reach: number;
		inlineLinkClicks: number;
		spend: number;
		interacciones: number;
		likes: number;
		comentarios: number;
		guardados: number;
		registros: number;
		dias: number;
		ultimaFecha: string;
	} | null;
}

export const listPromociones = async (): Promise<PromocionResumen[]> => {
	const res = await mktAxios.get("/api/social/promociones");
	return res.data.data;
};
