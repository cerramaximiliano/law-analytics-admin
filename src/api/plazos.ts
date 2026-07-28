import workersAxios from "utils/workersAxios";

/**
 * plazos.ts — Cliente del subsistema de plazos procesales (pjn-api
 * /api/admin/plazos/*).
 *
 * ⚠️ Usa workersAxios (instancia LOCAL de pjn-api en worker_01): las
 * colecciones plazos-notificaciones / plazos-normativa / feriados-judiciales
 * viven en el Mongo local del worker.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type PlazoProcessingStatus =
	| "pending"
	| "no_url"
	| "processing"
	| "downloading"
	| "parsed"
	| "extracted"
	| "ocr_needed"
	| "ocr_processing"
	| "failed"
	| "not_pdf"
	| "computed";

export interface PlazoComputado {
	fuente: "texto" | "norma";
	confianza: "alta" | "media" | null;
	norma?: {
		clave: string;
		acto: string;
		label: string;
		cita: string;
		verificado: boolean;
		matchedIn: "texto" | "detalle";
		matchedPattern: string;
		snippet: string;
	};
	fechaNotificacionFuente: "detalle" | "movimiento";
	fechaNotificacion: string;
	perfeccionamiento: string;
	inicioPlazo: string;
	vencimiento: string;
	vencimientoConGracia: string | null;
	prorrogado: boolean;
	diasComputados: string[] | null;
	feriadosAplicados: string[];
	plazoDias: number;
	tipoPlazo: "habiles" | "corridos";
	version: number;
	computedAt: string;
}

export interface PlazoNotificacion {
	_id: string;
	causaId: string;
	number?: number;
	year?: number;
	fuero: string;
	objeto?: string | null;
	caratula?: string;
	collection?: string;
	sourceId: string;
	movimiento: { fecha: string | null; tipo: string | null; detalle: string | null; url: string | null };
	tipoNotificacion: string;
	processingStatus: PlazoProcessingStatus;
	retryCount: number;
	lastError: string | null;
	extraccion?: {
		pageCount?: number;
		charCount?: number;
		needsOcr?: boolean;
		sinDocumento?: boolean;
		plazoDias?: number | null;
		tipoPlazo?: string | null;
		plazoHoras?: number | null;
		confianza?: string | null;
		apercibimiento?: string | null;
		menciones?: Array<{ valor: number; unidad: string; tipoPlazo: string; score: number; snippet: string }>;
		textExcerpt?: string;
		extractorVersion?: number;
	} | null;
	plazo?: PlazoComputado | null;
	detectedAt: string;
	processedAt?: string | null;
	source?: { worker: string; collectionName: string; collectedAt: string };
}

export interface PlazoNormativaRegla {
	_id: string;
	label: string;
	acto: string;
	fuero: string[];
	objetos?: string[];
	matchers: string[];
	matchersDetalle: string[];
	plazoDias: number;
	tipoPlazo: "habiles" | "corridos";
	norma: string;
	descripcion: string;
	prioridad: number;
	habilitado: boolean;
	verificado: boolean;
	notas: string;
}

export interface FeriadoJudicial {
	_id: string;
	fecha: string;
	tipo: string;
	ambito: string;
	descripcion: string;
	fuente: string;
	verificado: boolean;
	habilitado: boolean;
	notas: string;
}

export interface Paginated<T> {
	success: boolean;
	count: number;
	pagination: { currentPage: number; totalPages: number; limit: number; hasNextPage: boolean; hasPrevPage: boolean };
	data: T[];
}

// ── Notificaciones ─────────────────────────────────────────────────────────────

export const getNotificaciones = async (params: {
	page?: number;
	limit?: number;
	status?: string;
	fuero?: string;
	fuente?: string;
	causaId?: string;
	desde?: string;
	hasta?: string;
}): Promise<Paginated<PlazoNotificacion>> => {
	const { data } = await workersAxios.get("/api/admin/plazos/notificaciones", { params });
	return data;
};

export const getNotificacion = async (id: string): Promise<PlazoNotificacion> => {
	const { data } = await workersAxios.get(`/api/admin/plazos/notificaciones/${id}`);
	return data.data;
};

export const getStats = async (): Promise<{
	total: number;
	porStatus: Record<string, number>;
	porFuente: Record<string, number>;
	vencimientosProximos: number;
}> => {
	const { data } = await workersAxios.get("/api/admin/plazos/notificaciones/stats");
	return data.data;
};

export const getVencimientos = async (params: {
	page?: number;
	limit?: number;
	fuero?: string;
	desde?: string;
	hasta?: string;
}): Promise<Paginated<PlazoNotificacion>> => {
	const { data } = await workersAxios.get("/api/admin/plazos/vencimientos", { params });
	return data;
};

export const reprocessNotificacion = async (id: string): Promise<PlazoNotificacion> => {
	const { data } = await workersAxios.post(`/api/admin/plazos/notificaciones/${id}/reprocess`);
	return data.data;
};

export const reprocessParsed = async (fuero?: string): Promise<{ reencoladas: number }> => {
	const { data } = await workersAxios.post("/api/admin/plazos/notificaciones/reprocess-parsed", { fuero });
	return data.data;
};

// ── Normativa ──────────────────────────────────────────────────────────────────

export const getNormativa = async (params?: {
	habilitado?: boolean;
	verificado?: boolean;
	fuero?: string;
}): Promise<PlazoNormativaRegla[]> => {
	const { data } = await workersAxios.get("/api/admin/plazos/normativa", { params });
	return data.data;
};

export const createNormativa = async (regla: Partial<PlazoNormativaRegla> & { _id: string }): Promise<PlazoNormativaRegla> => {
	const { data } = await workersAxios.post("/api/admin/plazos/normativa", regla);
	return data.data;
};

export const updateNormativa = async (id: string, cambios: Partial<PlazoNormativaRegla>): Promise<PlazoNormativaRegla> => {
	const { data } = await workersAxios.patch(`/api/admin/plazos/normativa/${id}`, cambios);
	return data.data;
};

// ── Dataset de plazos expresos (minería de reglas empíricas) ──────────────────

export interface DatasetCandidato {
	fuero: string;
	objeto: string | null;
	acto: string;
	n: number;
	plazoDias: number;
	tipoPlazo: "habiles" | "corridos" | null;
	share: number;
	variantes: Array<{ plazoDias: number; tipoPlazo: string | null; n: number }>;
	ejemplos: string[];
	normasCitadas?: string[];
	reglaExistente: { clave: string; plazoDias: number; tipoPlazo: string; coincide: boolean } | null;
}

export interface DatasetStats {
	total: number;
	conPlazo: number;
	sinPlazo: number;
	descartados?: number;
	porFuero: Array<{ fuero: string; total: number; conPlazo: number }>;
	porActo: Array<{ acto: string; n: number }>;
}

export interface DatasetEjemplo {
	_id: string;
	causaId: string;
	collection?: string;
	fuero: string;
	objeto: string | null;
	number?: number;
	year?: number;
	sourceId: string;
	movimiento: { fecha: string | null; tipo: string | null; detalle: string | null; url: string | null };
	acto: string;
	actoReglaClave: string | null;
	plazoDias: number | null;
	tipoPlazo: string | null;
	plazoHoras: number | null;
	confianza: string | null;
	sinPlazo: boolean;
	snippet: string | null;
	apercibimiento: string | null;
	normaCitada?: string | null;
	source: "inline" | "backfill";
	harvestedAt: string;
	revision?: { estado: "sin_revisar" | "confirmado" | "descartado"; notas: string; revisadoAt: string | null };
	// presente solo cuando se pide ?dispersos=true
	_disperso?: { apartado: boolean; sospechoso: boolean; dominanteGrupo: number | null; nGrupo: number };
}

export const getDataset = async (params: {
	page?: number;
	limit?: number;
	fuero?: string;
	acto?: string;
	objeto?: string;
	conPlazo?: boolean;
	revision?: string;
	dispersos?: boolean;
}): Promise<Paginated<DatasetEjemplo>> => {
	const { data } = await workersAxios.get("/api/admin/plazos/dataset", { params });
	return data;
};

export const revisarDatasetEjemplo = async (
	id: string,
	estado: "confirmado" | "descartado" | "sin_revisar",
	notas?: string,
): Promise<DatasetEjemplo> => {
	const { data } = await workersAxios.patch(`/api/admin/plazos/dataset/${encodeURIComponent(id)}/revision`, { estado, notas });
	return data.data;
};

export const getDatasetStats = async (): Promise<DatasetStats> => {
	const { data } = await workersAxios.get("/api/admin/plazos/dataset/stats");
	return data.data;
};

export const getDatasetCandidatos = async (params?: { minN?: number; minShare?: number }): Promise<DatasetCandidato[]> => {
	const { data } = await workersAxios.get("/api/admin/plazos/dataset/candidatos", { params });
	return data.data;
};

// ── Feriados ───────────────────────────────────────────────────────────────────

export const getFeriados = async (params?: {
	anio?: number;
	tipo?: string;
	verificado?: boolean;
	habilitado?: boolean;
}): Promise<FeriadoJudicial[]> => {
	const { data } = await workersAxios.get("/api/admin/plazos/feriados", { params });
	return data.data;
};

export const createFeriados = async (payload: {
	fecha?: string;
	desde?: string;
	hasta?: string;
	tipo: string;
	ambito?: string;
	descripcion?: string;
	fuente?: string;
	verificado?: boolean;
	notas?: string;
}): Promise<{ dias: number; upserts: number }> => {
	const { data } = await workersAxios.post("/api/admin/plazos/feriados", payload);
	return data.data;
};

export const updateFeriado = async (id: string, cambios: Partial<FeriadoJudicial>): Promise<FeriadoJudicial> => {
	const { data } = await workersAxios.patch(`/api/admin/plazos/feriados/${encodeURIComponent(id)}`, cambios);
	return data.data;
};
