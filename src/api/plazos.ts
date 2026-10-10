import workersAxios, { pjnAtlasAxios } from "utils/workersAxios";
import type { AxiosInstance } from "axios";

// ── Base de datos (10/10/2026) ─────────────────────────────────────────────────
// El subsistema corre con el mismo código sobre dos bases:
//   - "cache": pjn/cache-api contra el rs0 — laboratorio de desarrollo (cédulas de la caché).
//   - "usuarios": pjn/api contra Atlas — cédulas de las causas de usuarios (producción).
// Notificaciones, vencimientos, monitoreo y revisión legal siguen la base elegida; el dataset
// vive solo en la caché.
export type PlazosBase = "cache" | "usuarios";
const BASE_KEY = "plazos.base";
let baseActual: PlazosBase = (() => {
	try {
		return localStorage.getItem(BASE_KEY) === "usuarios" ? "usuarios" : "cache";
	} catch {
		return "cache";
	}
})();
export const getPlazosBase = (): PlazosBase => baseActual;
export const setPlazosBase = (b: PlazosBase) => {
	baseActual = b;
	try {
		localStorage.setItem(BASE_KEY, b);
	} catch {
		/* sin storage: queda en memoria */
	}
};
const ax = (): AxiosInstance => (baseActual === "usuarios" ? pjnAtlasAxios : workersAxios);

// Reglas y feriados: la copia maestra pasa a Atlas cuando los plazos-worker lean de ahí (F2).
// Hasta entonces se editan en el rs0, que es lo que leen los workers. La semilla en Atlas
// (16 reglas, 241 feriados) se copió el 10/10; al cambiar este flag, re-sincronizarla antes.
const REFERENCIAS_EN_ATLAS = false;
const axRef = (): AxiosInstance => (REFERENCIAS_EN_ATLAS ? pjnAtlasAxios : workersAxios);
export const referenciasEnAtlas = REFERENCIAS_EN_ATLAS;

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
	| "computed"
	| "revision_manual";

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
	const { data } = await ax().get("/api/admin/plazos/notificaciones", { params });
	return data;
};

export const getNotificacion = async (id: string): Promise<PlazoNotificacion> => {
	const { data } = await ax().get(`/api/admin/plazos/notificaciones/${id}`);
	return data.data;
};

export const getStats = async (): Promise<{
	total: number;
	porStatus: Record<string, number>;
	porFuente: Record<string, number>;
	vencimientosProximos: number;
}> => {
	const { data } = await ax().get("/api/admin/plazos/notificaciones/stats");
	return data.data;
};

export const getVencimientos = async (params: {
	page?: number;
	limit?: number;
	fuero?: string;
	desde?: string;
	hasta?: string;
}): Promise<Paginated<PlazoNotificacion>> => {
	const { data } = await ax().get("/api/admin/plazos/vencimientos", { params });
	return data;
};

export const reprocessNotificacion = async (id: string): Promise<PlazoNotificacion> => {
	const { data } = await ax().post(`/api/admin/plazos/notificaciones/${id}/reprocess`);
	return data.data;
};

export const reprocessParsed = async (fuero?: string): Promise<{ reencoladas: number }> => {
	const { data } = await ax().post("/api/admin/plazos/notificaciones/reprocess-parsed", { fuero });
	return data.data;
};

// ── Normativa ──────────────────────────────────────────────────────────────────

export const getNormativa = async (params?: {
	habilitado?: boolean;
	verificado?: boolean;
	fuero?: string;
}): Promise<PlazoNormativaRegla[]> => {
	const { data } = await axRef().get("/api/admin/plazos/normativa", { params });
	return data.data;
};

export const createNormativa = async (regla: Partial<PlazoNormativaRegla> & { _id: string }): Promise<PlazoNormativaRegla> => {
	const { data } = await axRef().post("/api/admin/plazos/normativa", regla);
	return data.data;
};

export const updateNormativa = async (id: string, cambios: Partial<PlazoNormativaRegla>): Promise<PlazoNormativaRegla> => {
	const { data } = await axRef().patch(`/api/admin/plazos/normativa/${id}`, cambios);
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
	naturaleza?: "procesal" | "pago" | "cumplimiento" | "otro" | null;
	snippet: string | null;
	apercibimiento: string | null;
	normaCitada?: string | null;
	textoExtracto?: string | null;
	juzgado?: number | null;
	sala?: number | null;
	source: "inline" | "backfill";
	harvestedAt: string;
	revision?: { estado: "sin_revisar" | "confirmado" | "descartado"; corregido?: boolean; notas: string; revisadoAt: string | null };
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
	opts?: { notas?: string; acto?: string; naturaleza?: string },
): Promise<DatasetEjemplo> => {
	const { data } = await workersAxios.patch(`/api/admin/plazos/dataset/${encodeURIComponent(id)}/revision`, { estado, ...opts });
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

// ── Monitoreo consolidado del subsistema ──────────────────────────────────────

export interface PlazosMonitor {
	workers: {
		plazosWorker: {
			enabled: boolean;
			alive: boolean;
			lastCycleAt: string | null;
			lastResult: string | null;
			stats: Record<string, number> | null;
		};
		datasetWorker: {
			enabled: boolean;
			alive: boolean;
			lastCycleAt: string | null;
			lastFuero: string | null;
			hoy: { date: string; count: number } | null;
			dailyLimit: number | null;
			stats: Record<string, number> | null;
			fuerosAgotados: string[];
		};
		foldersWorker: {
			enabled: boolean;
			alive: boolean;
			lastCycleAt: string | null;
			lastRun: { plazosLeidos: number; validadas: number; creadas: number } | null;
			source: string;
			dryRun: boolean;
			userFilter: Record<string, unknown> | null;
			stats: Record<string, number> | null;
		};
	};
	cola: Record<string, number>;
	hoy: { detectadas: number; computadas: number };
	revisionManual: number;
	dispersosSinRevisar: number;
	updaters: Array<{ fuero: string; enabled: boolean; processedToday: number | null }>;
	alertas: string[];
	generatedAt: string;
}

export const getMonitor = async (): Promise<PlazosMonitor> => {
	const { data } = await ax().get("/api/admin/plazos/monitor");
	return data.data;
};

// ── Config del harvester del dataset (plazos-dataset-worker) ──────────────────

export interface DatasetConfig {
	_id: string;
	enabled: boolean;
	cronPattern: string;
	batchSize: number;
	maxPerCausa: number;
	dailyLimit: number;
	requestDelayMs: number;
	scanCharsPerPageThreshold?: number;
	fueros?: string[]; // ausente = todos los fueros de pjn-models
	cursor?: Record<string, string | null>; // por fuero; 'DONE' = agotado
	fueroIdx?: number;
	daily?: { date: string; count: number };
	heartbeat?: { lastCycleAt?: string; lastFuero?: string };
	stats?: { harvested: number; conPlazo: number; sinPlazo: number; skippedOcr: number; errors: number };
}

export const getDatasetConfig = async (): Promise<DatasetConfig | null> => {
	const { data } = await workersAxios.get("/api/admin/plazos/dataset-config");
	return data.data;
};

export const updateDatasetConfig = async (
	cambios: Partial<Omit<DatasetConfig, "_id" | "cursor" | "daily" | "heartbeat" | "stats">> & {
		fueros?: string[] | null;
		resetCursor?: string | string[];
	},
): Promise<DatasetConfig> => {
	const { data } = await workersAxios.patch("/api/admin/plazos/dataset-config", cambios);
	return data.data;
};

// ── Feriados ───────────────────────────────────────────────────────────────────

export const getFeriados = async (params?: {
	anio?: number;
	tipo?: string;
	verificado?: boolean;
	habilitado?: boolean;
}): Promise<FeriadoJudicial[]> => {
	const { data } = await axRef().get("/api/admin/plazos/feriados", { params });
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
	const { data } = await axRef().post("/api/admin/plazos/feriados", payload);
	return data.data;
};

export const updateFeriado = async (id: string, cambios: Partial<FeriadoJudicial>): Promise<FeriadoJudicial> => {
	const { data } = await axRef().patch(`/api/admin/plazos/feriados/${encodeURIComponent(id)}`, cambios);
	return data.data;
};

// ── Revisión legal (fase F0) ───────────────────────────────────────────────────

export type Destinatario = "actor" | "demandado" | "perito" | "tercero" | "otro";

export interface RevisionVeredicto {
	destinatario: Destinatario | null;
	actoNotificado: string | null;
	plazoCorrecto: boolean | null;
	plazoQueCorresponde: string | null;
	vencimientoCorrecto: boolean | null;
	vencimientoQueCorresponde: string | null;
	comentario: string | null;
}

export interface RevisionItem {
	_id: string;
	muestra: string;
	notificacionId: string;
	estrato: string;
	fuero: string;
	number: number;
	year: number;
	caratula: string | null;
	tipoNotificacion: string | null;
	processingStatus: string;
	movimiento: { fecha: string | null; tipo: string | null; detalle: string | null; url: string | null };
	plazo: {
		fuente: string | null;
		confianza: string | null;
		regla: string | null;
		cita: string | null;
		reglaVerificada: boolean | null;
		fragmento: string | null;
		plazoDias: number | null;
		tipoPlazo: string | null;
		fechaNotificacion: string | null;
		fechaNotificacionFuente: string | null;
		perfeccionamiento: string | null;
		inicioPlazo: string | null;
		vencimiento: string | null;
		vencimientoConGracia: string | null;
		feriadosAplicados: string[];
	};
	estado: "pendiente" | "revisada";
	veredicto: RevisionVeredicto | null;
	revisadoEn?: string;
	textoCedula?: string | null;
}

export interface RevisionMuestra {
	muestra: string;
	total: number;
	revisadas: number;
	creadoEn: string;
}

export interface RevisionFila {
	clave: string | null;
	total: number;
	revisadas: number;
	plazoOk: number;
	vencOk: number;
	ambosOk: number;
	precision: number | null;
}

export interface RevisionStats {
	global: RevisionFila | null;
	porEstrato: RevisionFila[];
	porRegla: RevisionFila[];
	destinatarios: { destinatario: string | null; n: number }[];
}

export const getRevisionMuestras = async (): Promise<RevisionMuestra[]> => {
	const { data } = await ax().get("/api/admin/plazos/revision-legal/muestras");
	return data.data;
};

export const crearRevisionMuestra = async (body: { nombre?: string; desde?: string }): Promise<{ muestra: string; total: number }> => {
	// $sample sobre una colección grande: más margen que el timeout por defecto
	const { data } = await ax().post("/api/admin/plazos/revision-legal/muestras", body, { timeout: 150000 });
	return data.data;
};

export const getRevisionItems = async (params: {
	muestra: string;
	estado?: string;
	estrato?: string;
	page?: number;
	limit?: number;
}): Promise<Paginated<RevisionItem>> => {
	const { data } = await ax().get("/api/admin/plazos/revision-legal", { params });
	return data;
};

export const getRevisionItem = async (id: string): Promise<RevisionItem> => {
	const { data } = await ax().get(`/api/admin/plazos/revision-legal/item/${id}`);
	return data.data;
};

export const guardarRevisionVeredicto = async (id: string, veredicto: RevisionVeredicto): Promise<RevisionItem> => {
	const { data } = await ax().patch(`/api/admin/plazos/revision-legal/item/${id}`, { veredicto });
	return data.data;
};

export const getRevisionStats = async (muestra: string): Promise<RevisionStats> => {
	const { data } = await ax().get("/api/admin/plazos/revision-legal/stats", { params: { muestra } });
	return data.data;
};
