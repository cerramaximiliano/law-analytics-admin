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
const REFERENCIAS_EN_ATLAS = true;
const axRef = (): AxiosInstance => (REFERENCIAS_EN_ATLAS ? pjnAtlasAxios : workersAxios);
export const referenciasEnAtlas = REFERENCIAS_EN_ATLAS;

/**
 * plazos.ts — Cliente del subsistema de plazos procesales (pjn-api
 * /api/admin/plazos/*), contra la base elegida (ver arriba). Documento del
 * feature: la-ads/docs/producto/plazos-automaticos.md.
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
	| "revision_manual"
	| "esperando_documento"
	| "requiere_tipo_proceso";

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
	fechaNotificacionFuente: "detalle" | "movimiento" | "bandeja";
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
	/** Estado del calendario de inhábiles al calcular (lo agrega plazos-worker). */
	calendario?: PlazoCalendario | null;
}

export interface PlazoCalendario {
	estado: "ok" | "sin_confirmar" | "fuera_de_cobertura";
	hasta?: string | null;
	/** Días inhábiles sin verificar que caen dentro del plazo (lista o cantidad). */
	diasSinVerificar?: string[] | number | null;
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
		/** De qué texto salió: resolución notificada, cuerpo de la cédula o la cédula entera (base usuarios). */
		textoFuente?: "resolucion" | "cuerpo_cedula" | "cedula" | null;
	} | null;
	/** "bandeja" si la creó la bandeja del PJN (base usuarios). */
	fuente?: string | null;
	/** Presente si la cédula pasó por la bandeja, aunque la haya creado otro worker (se reconcilió). */
	bandeja?: { numeroCedula?: string | null; tardia?: boolean } | null;
	/** Usuarios dueños de carpetas de la causa (base usuarios). */
	usuarios?: Array<{ userId: string; email: string | null }>;
	/** Vencimientos: fragmento del texto del que salió el plazo. */
	fragmento?: string | null;
	plazo?: PlazoComputado | null;
	detectedAt: string;
	processedAt?: string | null;
	source?: { worker: string; collectionName: string; collectedAt: string; primeraSync?: boolean };
}

export type TipoProceso = "ordinario" | "sumario" | "especial";

export interface TipoProcesoEvidencia {
	tipo: TipoProceso;
	fuente: "expreso" | "plazo_demanda" | "plazo_agravios" | "objeto" | "objeto_especial" | "norma" | "operador";
	movementId: string | null;
	fecha: string | null;
	frase: string | null;
	operador: string | null;
}

export interface TipoProcesoCausa {
	_id?: string;
	fuero?: string;
	tipo: TipoProceso | null;
	fuente: TipoProcesoEvidencia["fuente"] | null;
	movementId?: string | null;
	fecha?: string | null;
	frase?: string | null;
	conflicto?: boolean;
	/** Sugerencia del detector cuando no hay tipo vigente: no vale hasta que el operador la confirma. */
	sugerencia?: { tipo: TipoProceso; motivo: string | null } | null;
	evidencias: TipoProcesoEvidencia[];
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
	/** Quién, cuándo y por qué se verificó (o se quitó la verificación). */
	verificadoPor?: string | null;
	verificadoAt?: string | null;
	verificadoNota?: string | null;
	/** Variante por tipo de proceso (P21): null = cualquiera. Un acto que depende del trámite tiene una regla por tipo. */
	tipoProceso?: TipoProceso | null;
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
	/** Por dónde entró la cédula (base usuarios): app-update | mis-causas | bandeja */
	via?: string;
	/** Regla aplicada (plazo.norma.clave) y si estaba verificada */
	norma?: string;
	normaVerificada?: boolean;
	/** Cómo se extrajo el texto: resolucion | cuerpo_cedula | cedula */
	textoFuente?: string;
	/** Base usuarios: cédulas de las causas de este usuario (id o parte del correo). */
	userId?: string;
	email?: string;
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
	via?: string;
	textoFuente?: string;
	userId?: string;
	email?: string;
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

export const updateNormativa = async (id: string, cambios: Partial<PlazoNormativaRegla> & { nota?: string }): Promise<PlazoNormativaRegla> => {
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

export interface PlazosMonitorWorker {
	/** plazos-worker (caché) | plazos-worker-usuarios (Atlas) */
	nombre: string;
	servidor: string;
	enabled: boolean;
	alive: boolean;
	lastCycleAt: string | null;
	lastResult: string | null;
	stats: Record<string, number> | null;
	/** Solo usuarios: alcance del cálculo. null = default (solo cuentas de prueba); {} = todos. */
	filtroUsuarios?: Record<string, unknown> | null;
}

export interface PlazosMonitor {
	base: PlazosBase;
	workers: {
		plazosWorker: PlazosMonitorWorker;
		/** Solo caché (laboratorio). */
		datasetWorker: {
			enabled: boolean;
			alive: boolean;
			lastCycleAt: string | null;
			lastFuero: string | null;
			hoy: { date: string; count: number } | null;
			dailyLimit: number | null;
			stats: Record<string, number> | null;
			fuerosAgotados: string[];
		} | null;
		/** Solo usuarios: entrega a carpetas vía el hub (worker_02, config en Atlas). */
		foldersWorker: {
			servidor: string;
			enabled: boolean;
			alive: boolean;
			lastCycleAt: string | null;
			lastRun: Record<string, unknown> | null;
			dryRun: boolean;
			userFilter: Record<string, unknown> | null;
			stats: Record<string, number> | null;
		} | null;
	};
	cola: Record<string, number>;
	hoy: { detectadas: number; computadas: number };
	revisionManual: number;
	dispersosSinRevisar: number;
	/** Solo caché: detección por update-movimientos. */
	updaters: Array<{ fuero: string; enabled: boolean; processedToday: number | null }>;
	/** Solo usuarios: por dónde entraron las cédulas (app-update, mis-causas, bandeja). */
	porFuente: Record<string, number>;
	alertas: string[];
	generatedAt: string;
}

export const getMonitor = async (): Promise<PlazosMonitor> => {
	const { data } = await ax().get("/api/admin/plazos/monitor");
	return data.data;
};

// ── Flujo de plazos automáticos: contadores por etapa (solo base de usuarios) ──
export interface PlazosFlujoEtapa {
	id: "detectadas" | "esperando" | "calculo" | "calculadas" | "entrega" | "entregadas";
	label: string;
	total: number;
	nota: string;
	hoy?: number;
	desglose?: Record<string, number>;
	enCola?: number;
	fueraDeAlcance?: number;
	errores?: number;
	pausada?: boolean;
	motivoPausa?: string | null;
	confiables?: number;
	sinPlazo?: number;
	revisionManual?: number;
	sinCarpeta?: number;
	eventos?: number;
	avisos?: number;
}

export interface PlazosFlujo {
	alcance: {
		calculo: "prueba" | "todos";
		filtroCalculo: Record<string, unknown>;
		causasCalculo: number | null;
		causasEntrega: number;
		dryRun: boolean;
	};
	etapas: PlazosFlujoEtapa[];
	generatedAt: string;
}

/** Siempre contra Atlas: el flujo de plazos automáticos es de la base de usuarios. */
export const getFlujoUsuarios = async (): Promise<PlazosFlujo> => {
	const { data } = await pjnAtlasAxios.get("/api/admin/plazos/flujo");
	return data.data;
};

// ── Detalle unificado de una cédula de usuario (Atlas) ─────────────────────────
export interface CedulaUsuario {
	_id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	isTestAccount?: boolean;
	plazosAutomaticos?: { activo?: boolean; cuit?: string | null } | null;
}

export interface CedulaDetalle {
	movementId: string | null;
	coleccion: string | null;
	causa: {
		_id: string;
		number?: number;
		year?: number;
		fuero?: string;
		caratula?: string;
		objeto?: string;
		juzgado?: string;
		secretaria?: string;
		isPrivate?: boolean;
		source?: string;
	} | null;
	/** Doc de pjn-movements con el bloque cedula {documento, resultado, recepcion, plazo}. */
	movimiento: {
		_id: string;
		fecha?: string;
		tipo?: string;
		detalle?: string;
		url?: string;
		pdfStatus?: string;
		textoStatus?: string;
		textoMethod?: string;
		cedula?: { documento?: any; resultado?: any; recepcion?: any; plazo?: any };
	} | null;
	texto: { chars: number; texto: string } | null;
	plazo: (PlazoNotificacion & { origen?: string; fuente?: string; bandeja?: any; validacion?: any; source?: any }) | null;
	bandeja: Array<{
		_id: string;
		userId: string;
		credentialsId: string;
		numeroCedula?: number;
		fecha?: string;
		destinatarios?: any[];
		vinculo?: any;
		notified?: boolean;
		notifiedAt?: string | null;
	}>;
	folders: Array<{ _id: string; userId: string; folderName?: string; archived?: boolean; source?: string }>;
	usuarios: CedulaUsuario[];
	entrega: {
		estado: string | null;
		resultados: Array<{
			folderId: string;
			userId: string;
			accion: string;
			confirmadoPor?: string | null;
			eventId?: string;
			notificationId?: string;
		}>;
		eventos: Array<{
			_id: string;
			userId: string;
			folderId: string;
			title?: string;
			start?: string;
			confirmadoPor?: string | null;
			archivedAt?: string | null;
			googleEventId?: string | null;
		}>;
		avisos: Array<{ _id: string; userId: string; folderId: string; code: string; read?: boolean; createdAt?: string }>;
	};
	correos: Array<{
		_id: string;
		userId: string;
		notificationStatus: string;
		notificationSettings?: { notifyAt?: string };
		notifications?: Array<{ date: string; type: string; success: boolean; details: string }>;
	}>;
	/** Resolución que notifica la cédula (la vincula pjn-rag-cedulas), con su texto. Desde el 14/10/2026. */
	resolucion?: {
		movementId: string;
		tipo: string | null;
		fecha: string | null;
		detalle: string | null;
		/** 'texto': transcripción o copia contra el texto de la resolución; 'fecha': única resolución del día; 'adjunto': páginas identificadas por huella. */
		metodo: "texto" | "fecha" | "adjunto" | null;
		cobertura: number | null;
		fuente: "transcripcion" | "copia_adjunta" | null;
		texto: { chars: number; texto: string } | null;
	} | null;
	resolucionNotificada?: {
		fuente: "transcripcion" | "copia_adjunta" | null;
		textoMovementId: string | null;
		texto: string | null;
		chars: number | null;
	} | null;
	/** Tipo de proceso de la causa (ordinario | sumario) con la evidencia de la que salió. */
	tipoProceso?: TipoProcesoCausa | null;
	/** Movimientos de la causa adjuntos a la cédula (escritos, otras resoluciones). */
	adjuntosRemitidos?: Array<{ movementId: string; tipo: string | null; fecha: string | null; detalle: string | null }>;
}

/** Siempre contra Atlas. Por movimiento ("causaId:sourceId") o por id del plazo. */
export const getCedulaDetalle = async (q: { movementId?: string; plazoId?: string }): Promise<CedulaDetalle> => {
	const { data } = await pjnAtlasAxios.get("/api/admin/plazos/cedula", { params: q });
	return data.data;
};

/** Monitor de una base puntual, sin depender del selector (lo usa el diagrama del flujo). */
export const getMonitorDe = async (base: PlazosBase): Promise<PlazosMonitor> => {
	const { data } = await (base === "usuarios" ? pjnAtlasAxios : workersAxios).get("/api/admin/plazos/monitor");
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

export const deleteFeriado = async (id: string): Promise<void> => {
	await axRef().delete(`/api/admin/plazos/feriados/${encodeURIComponent(id)}`);
};

export interface BloqueDiff {
	aplicado: boolean;
	agregan: string[];
	quitan: string[];
	conflictos: { fecha: string; tipo: string }[];
	quedan: number;
}

/** Reemplaza un bloque de feria (feria_*) por otro rango. Sin `aplicar` devuelve solo el diff. */
export const reemplazarBloqueFeria = async (body: {
	tipo: string;
	bloqueDesde: string;
	bloqueHasta: string;
	desde: string;
	hasta: string;
	aplicar?: boolean;
}): Promise<BloqueDiff> => {
	const { data } = await axRef().put("/api/admin/plazos/feriados/bloque", body);
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

export const crearRevisionMuestra = async (body: { nombre?: string; desde?: string; regla?: string; cantidad?: number }): Promise<{ muestra: string; total: number }> => {
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

// ── Beta de plazos automáticos (F5) — datos reales en la base "usuarios" (Atlas) ──

export interface PlazosBeta {
	usuarios: { activos: number; conCuit: number };
	bandeja: {
		cedulas: number;
		hoy: number;
		credencialesConCedulas: number;
		credencialesElegibles: number;
		enPlazos: number;
		porStatus: Record<string, number>;
		eventosPorConfirmacion: Record<string, number>;
	};
	cedulas: { total: number; ultimos7d: number; porStatus: Record<string, number> };
	sugerencias: { eventos: number; eventosArchivados: number; porAccion: Record<string, number> };
	feedback: {
		correctos: number;
		incorrectos: number;
		precision: number | null;
		porRegla: { clave: string; total: number; correctos: number }[];
		negativos: {
			_id: string;
			fuero: string;
			regla: string | null;
			fuente: string | null;
			vencimiento: string | null;
			comentario: string | null;
			at: string;
		}[];
	};
}

export const getPlazosBeta = async (): Promise<PlazosBeta> => {
	const { data } = await ax().get("/api/admin/plazos/beta");
	return data.data;
};

// ── Pendientes del usuario (Atlas) ─────────────────────────────────────────────
export interface PendienteDecision {
	id: "P3" | "P4" | "P5" | "P6" | "P8";
	titulo: string;
	estado: "listo_para_decidir" | "bloqueado" | "esperando" | "hecho";
	requisitos: { texto: string; ok: boolean }[];
	impacto: { texto: string; n?: number };
	accion: { texto: string; link?: string };
}

export interface PendienteRegla {
	normaId: string;
	label: string;
	fueros: string[];
	retenidos: number;
	ultimos7d: number;
}

export interface PendienteCarpeta {
	folderId: string;
	userId: string;
	email: string | null;
	causaId: string;
	fuero: string;
	expediente: string | null;
	caratula: string | null;
	intervinientes: number;
	parteDetectada: string | null;
	cedulasRecientes: number;
	linkFront: string;
}

export interface PendienteEntrega {
	plazoNotificacionId: string;
	cedula: string;
	folderId: string | null;
	userId: string | null;
	email: string | null;
	accion: string;
	confirmadoPor: string | null;
	entregadoAt: string | null;
	vencimiento: string | null;
}

export interface PendienteCredencial {
	credentialsId: string;
	userId: string | null;
	email: string | null;
	consecutiveErrors: number;
	code: string | null;
	lastSuccessAt: string | null;
	lastRunAt: string | null;
}

export interface CoberturaCalendario {
	hasta: string | null;
	ultimoAnio: number | null;
	diasRestantes: number | null;
	aniosIncompletos: number[];
}

export interface DiaSinVerificar {
	fecha: string;
	tipo: string;
	descripcion?: string;
}

export interface PendienteCalendario {
	cobertura: CoberturaCalendario | null;
	sinVerificar: DiaSinVerificar[];
	plazosFueraDeCobertura: number;
	alerta: boolean;
	error?: string;
}

export interface PlazosPendientes {
	generadoAt: string;
	resumen: {
		total: number;
		decisionesListas: number;
		reglasSinVerificar: number;
		plazosRetenidos: number;
		carpetasSinParte: number;
		entregasSinFeedback: number;
		credencialesBandeja: number;
		sinTipoProceso?: number;
		calendarioAlerta?: number;
		diasSinVerificar?: number;
		cuentasActivas: number;
		eventos: number;
		avisos: number;
		respuestas: number;
		entregas: number;
	};
	decisiones: PendienteDecision[];
	calendario: PendienteCalendario;
	reglasSinVerificar: PendienteRegla[];
	carpetasSinParte: PendienteCarpeta[];
	entregasSinFeedback: PendienteEntrega[];
	credencialesBandeja: PendienteCredencial[];
}

/** Siempre contra Atlas: los pendientes son de la base de usuarios. */
export const getPlazosPendientes = async (fresh = false): Promise<PlazosPendientes> => {
	const { data } = await pjnAtlasAxios.get("/api/admin/plazos/pendientes", { params: fresh ? { fresh: 1 } : undefined });
	return data.data;
};

// ── Calendario judicial: cobertura y generación de un año (base de referencias) ─
export interface CoberturaFeriados {
	cobertura: CoberturaCalendario;
	sinVerificar: DiaSinVerificar[];
}

export interface GenerarAnioResultado {
	anio: number;
	total: number;
	agregan: string[];
	existentes: number;
	sinVerificar: number;
	aplicado: boolean;
}

export const getCoberturaFeriados = async (): Promise<CoberturaFeriados> => {
	const { data } = await axRef().get("/api/admin/plazos/feriados/cobertura");
	return data.data;
};

/** Sin `aplicar` devuelve el diff; con `aplicar: true` inserta SOLO lo que falta (nunca pisa ni borra). */
export const generarAnioFeriados = async (anio: number, aplicar = false): Promise<GenerarAnioResultado> => {
	const { data } = await axRef().post("/api/admin/plazos/feriados/generar", { anio, aplicar });
	return data.data;
};

// ── Tipo de proceso de la causa (P21, Atlas) ───────────────────────────────────
export interface TipoProcesoPendiente {
	causaId: string;
	fuero: string;
	expediente: string | null;
	caratula: string | null;
	cedulas: Array<{ plazoNotificacionId: string; cedula: string; acto: string | null; label: string | null; snippet: string | null }>;
	cantidadCedulas: number;
	usuarios: Array<{ userId: string; email: string | null }>;
	tipo: TipoProceso | null;
	fuente: TipoProcesoEvidencia["fuente"] | null;
	conflicto: boolean;
	sugerencia?: { tipo: TipoProceso; motivo: string | null } | null;
	evidencias: TipoProcesoEvidencia[];
}

/** Causas con cédulas sin vencimiento porque falta el tipo de proceso. */
export const getTipoProcesoPendientes = async (): Promise<{ total: number; data: TipoProcesoPendiente[] }> => {
	const { data } = await pjnAtlasAxios.get("/api/admin/plazos/tipo-proceso/pendientes");
	return { total: data.total, data: data.data };
};

/** Fija el tipo de proceso como operador (gana siempre) y re-encola las cédulas de la causa; null quita el del operador. */
export const fijarTipoProceso = async (causaId: string, tipo: TipoProceso | null): Promise<{ tipo: TipoProceso | null; reencoladas: number }> => {
	const { data } = await pjnAtlasAxios.put(`/api/admin/plazos/tipo-proceso/${causaId}`, { tipo });
	return data.data;
};

export interface TipoProcesoCobertura {
	porTipo: Array<{ fuero: string; tipo: TipoProceso | null; fuente: string | null; causas: number }>;
	sinTipo: number;
	sugeridas: Array<{
		causaId: string;
		fuero: string;
		expediente: string | null;
		caratula: string | null;
		objeto: string | null;
		sugerencia: { tipo: TipoProceso; motivo: string | null };
	}>;
}

/** Causas con tipo de proceso por fuero y tipo, y las sin tipo con sugerencia del detector. */
export const getTipoProcesoCobertura = async (): Promise<TipoProcesoCobertura> => {
	const { data } = await pjnAtlasAxios.get("/api/admin/plazos/tipo-proceso/cobertura");
	return data.data;
};
