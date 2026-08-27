import pjnAxios from "utils/pjnAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface CausaRef {
	causaId: string;
	caratula: string;
	fuero: string;
	coleccion: string;
	source: "app" | "cache";
}

export interface AssociatedSentenciaCapturada {
	_id: string;
	processingStatus?: "pending" | "processing" | "extracted_needs_ocr" | "processed" | "error";
	embeddingStatus?: "pending" | "processing" | "completed" | "error" | "skipped";
	embeddedAt?: string;
	embeddingChunksCount?: number;
	processedAt?: string;
	category?: string;
	source?: { origin?: "pjn" | "saij"; saijDocId?: string };
	causaId?: string;
	fuero?: string;
	number?: number;
	year?: number;
	publicationStatus?: string;
	aiSummary?: { status?: string; generatedAt?: string; skipReason?: string };
	aiSummaryChars?: number;
}

export interface SaijSentencia {
	_id: string;
	saijId: string;
	saijType: "jurisprudencia" | "sumario";
	url: string;
	pdfUrl: string;
	numeroFallo: string;
	tipoFallo: string;
	actor: string;
	demandado: string;
	sobre: string;
	sumarios: string[];
	numeroSumario: string;
	texto: string;
	textoCompleto?: string;
	titulo: string;
	fecha: string;
	fechaString: string;
	fechaUmod?: string;
	tribunal: string;
	tipoTribunal: string;
	fuero: string;
	adminNotified?: boolean;
	adminNotifiedAt?: string;
	userNotified?: boolean;
	userNotifiedAt?: string;
	userCampaignId?: string;
	userCampaignExcluded?: boolean;
	userCampaignExcludedAt?: string;
	socialPost?: { generado?: boolean; postId?: string; estado?: string; markedAt?: string; markedBy?: string };
	/** Por qué quedó afuera del boletín: sin-sentencia-capturada | sin-resumen-ia | publicacion-skipped | backfill-sin-causa */
	userCampaignExcludedReason?: string;
	expediente?: {
		numero: number;
		año: number;
		texto: string;
		fuero?: string;
		instancia?: string;
		source?: "pdf" | "metadata" | "url";
		confidence?: "high" | "medium" | "low";
	};
	causaRefs: CausaRef[];
	pipelineStatus?: "pending" | "linked" | "movement_added" | "sc_created" | "sc_updated" | "failed" | "skipped";
	pipelineError?: string;
	pipelineUpdatedAt?: string;
	scrapeJurisdiccion?: string;
	sentenciaCapturada?: AssociatedSentenciaCapturada;
	jurisdiccion: {
		codigo: string;
		descripcion: string;
		capital: string;
		idPais: number;
	};
	descriptores: string[];
	saijSentenciaId?: string;
	source: string;
	workerId: string;
	scrapedAt: string;
	status: "captured" | "processing" | "processed" | "error" | "duplicate";
	errorMessage: string;
	retryCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface SentenciaListParams {
	page?: number;
	limit?: number;
	saijType?: string;
	status?: string;
	tribunal?: string;
	fuero?: string;
	yearFrom?: number;
	yearTo?: number;
	monthFrom?: number;
	monthTo?: number;
	workerId?: string;
	saijSentenciaId?: string;
	pipelineStatus?: string;
	hasExpediente?: "true" | "false";
	expedienteSource?: "pdf" | "metadata" | "url";
	linked?: "true" | "false";
	embeddingStatus?: "pending" | "processing" | "completed" | "error" | "skipped";
	hasSentenciaCapturada?: "true" | "false";
	userNotified?: "true" | "false";
	userCampaignExcluded?: "true" | "false";
	userCampaignId?: string;
	hasSocialPost?: "true" | "false";
	hasAiSummary?: "true" | "false";
	q?: string;
}

export interface SentenciaPagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface SentenciaListResponse {
	success: boolean;
	data: SaijSentencia[];
	pagination: SentenciaPagination;
}

export interface SentenciaStatsResponse {
	success: boolean;
	data: {
		total: number;
		byType: { _id: string; count: number }[];
		byStatus: { _id: string; count: number }[];
		byYear: { _id: number; count: number }[];
		byPipelineStatus: { _id: string | null; count: number }[];
		byFuero: { _id: string; count: number }[];
		withCausaRef: number;
		withExpediente: number;
		withExpedientePdf: number;
		sentenciasCapturadas: {
			total: number;
			byProcessingStatus: { _id: string; count: number }[];
			byEmbeddingStatus: { _id: string; count: number }[];
			withAiSummary?: number;
			publicationSkipped?: number;
		};
		difusion?: {
			userNotified: number;
			userCampaignExcluded: number;
			socialPost: number;
		};
	};
}

export interface SaijPipelineConfig {
	enabled: boolean;
	linkToCausa: boolean;
	markCausa: boolean;
	addMovimiento: boolean;
	downloadPdf: boolean;
	createSentenciaCapturada: boolean;
	createMissingCausas: boolean;
	/** Publicar fallos sin causa PJN vinculada (SC con causaId null) */
	createScSinCausa?: boolean;
}

export interface SaijUserCampaignConfig {
	enabled?: boolean;
	/** Base de la página pública; cada fallo linkea a <siteUrl>/<scId> */
	siteUrl?: string;
	segmentId?: string;
	templateId?: string;
	/** Hora local (0-23) a partir de la cual sale la campaña del día */
	campaignHour?: number;
	/** Solo lunes a viernes */
	weekdaysOnly?: boolean;
	/** Tope de fallos por correo */
	maxFallosPorCampania?: number;
	/** Antigüedad máxima del ALTA en SAIJ (días) */
	maxPublishAgeDays?: number;
	/** Antigüedad máxima de la SENTENCIA (días) */
	maxDocAgeDays?: number;
	/** Espera máxima de un fallo que aún no es publicable (horas) */
	maxWaitHours?: number;
	/** Ventana de envío de cada campaña (horas) */
	windowHours?: number;
	/** Emails por tick del scheduler */
	throttleRate?: number;
	/** Tope diario de emails (0 = sin límite) */
	dailyLimit?: number;
	/** Hora local del informe diario al admin */
	reportHour?: number;
	/** Ventana que cubre el informe (horas) */
	reportLookbackHours?: number;
	/** Fallos de la Corte Suprema por correo (0 = sección apagada) */
	csjnMaxItems?: number;
	/** Antigüedad máxima de la sentencia de la Corte para entrar (días) */
	csjnMaxDocAgeDays?: number;
	/** Criterio de la sección general: más reciente primero o FIFO */
	ordenSeleccion?: "reciente" | "antiguo";
	/** Criterio de la sección Corte */
	csjnOrden?: "reciente" | "antiguo";
	/** Asunto del correo */
	subject?: string;
	lastCampaignAt?: string;
	lastReportAt?: string;
}

export interface SaijWorkerConfig {
	_id: string;
	worker_id: string;
	enabled: boolean;
	scraping: {
		url: string;
		apiUrl: string;
		cronPattern: string;
		yearFrom: number;
		currentYear: number;
		currentMonth: number;
		currentOffset: number;
		batchSize: number;
		pageSize: number;
		delayBetweenRequests: number;
		rateLimit: number;
		pageTimeout: number;
		maxRetries: number;
		downloadPdf: boolean;
		/** Canal que barre el worker. CSJN = Federal + Tribunal/CORTE SUPREMA DE JUSTICIA DE LA NACION */
		jurisdiccion?: "NACIONAL" | "PROVINCIAL" | "CSJN";
		/** backfill = barrido histórico por cursor; incremental = solo novedades por fecha-umod */
		mode?: "backfill" | "incremental";
		sortOrder?: "ASC" | "DESC";
		fechaUmodWatermark?: string;
	};
	pipeline: SaijPipelineConfig;
	history: {
		year: number;
		month: number;
		totalDocuments: number;
		completed: boolean;
		completedAt: string;
		startedAt: string;
	}[];
	availability: {
		pauseOnConsecutiveErrors: number;
		pauseDurationMinutes: number;
		manualPause: boolean;
		manualPauseReason: string;
	};
	pause: {
		isPaused: boolean;
		pausedAt: string;
		resumeAt: string;
		pauseReason: string;
		consecutiveErrors: number;
	};
	notification: {
		startupEmail: boolean;
		errorEmail: boolean;
		dailyReport: boolean;
		/** Digest operativo al admin con lo capturado en cada ciclo */
		newDocumentsEmail?: boolean;
		recipientEmail: string;
		/** Campañas de novedades jurisprudenciales a los usuarios */
		userCampaign?: SaijUserCampaignConfig;
	};
	stats: {
		totalProcessed: number;
		totalSuccess: number;
		totalErrors: number;
		statsStartDate: string;
		lastRunAt: string;
		lastSuccessAt: string;
		lastErrorAt: string;
		lastErrorMessage: string;
		/** Rechazos 403 de SAIJ observados por este worker (el límite es por IP) */
		saijRechazos6h?: number;
		saijRechazosUltimaHora?: number;
		saijUltimoRechazoAt?: string;
	};
	lastUpdate: string;
	createdAt: string;
	updatedAt: string;
}

// ── Sentencias ─────────────────────────────────────────────────────────────────

export const getSaijSentencias = async (params: SentenciaListParams): Promise<SentenciaListResponse> => {
	const response = await pjnAxios.get("/api/saij/sentencias", { params });
	return response.data;
};

export const getSaijSentenciaStats = async (): Promise<SentenciaStatsResponse> => {
	const response = await pjnAxios.get("/api/saij/sentencias/stats");
	return response.data;
};

export interface EnrichStatsResponse {
	success: boolean;
	data: {
		total: number;
		enriched: number;
		pendingWithUrl: number;
		noUrl: number;
		recent: { _id: string; numeroSumario: string; texto: string; textoCompleto: string; updatedAt: string }[];
	};
}

export const getSaijEnrichStats = async (): Promise<EnrichStatsResponse> => {
	const response = await pjnAxios.get("/api/saij/sentencias/enrich/stats");
	return response.data;
};

export const getSaijSentenciaById = async (id: string): Promise<{ success: boolean; data: SaijSentencia }> => {
	const response = await pjnAxios.get(`/api/saij/sentencias/${id}`);
	return response.data;
};

export const updateSaijSentencia = async (id: string, data: Partial<SaijSentencia>): Promise<{ success: boolean; data: SaijSentencia }> => {
	const response = await pjnAxios.patch(`/api/saij/sentencias/${id}`, data);
	return response.data;
};

export const setSaijSentenciaSocialPost = async (
	id: string,
	data: { generado: boolean; postId?: string; estado?: string },
): Promise<{ success: boolean; data: SaijSentencia }> => {
	const response = await pjnAxios.patch(`/api/saij/sentencias/${id}/social-post`, data);
	return response.data;
};

export const deleteSaijSentencia = async (id: string): Promise<{ success: boolean; message: string }> => {
	const response = await pjnAxios.delete(`/api/saij/sentencias/${id}`);
	return response.data;
};

// ── Config Workers ─────────────────────────────────────────────────────────────

export const getSaijWorkerConfigs = async (): Promise<{ success: boolean; data: SaijWorkerConfig[] }> => {
	const response = await pjnAxios.get("/api/saij/config");
	return response.data;
};

export interface SaijWorkerProgress {
	workerId: string;
	enabled: boolean;
	paused: boolean;
	jurisdiccion: "NACIONAL" | "PROVINCIAL" | "CSJN";
	mode: "backfill" | "incremental";
	cursor: { year: number | null; month: number | null; offset: number; yearFrom: number; yearTarget: number };
	/** % del calendario recorrido; 100 en incremental (el backfill ya cerró) */
	avance: number;
	docs: number;
	ultimoDocAt: string | null;
	watermark: string | null;
	rateLimit: number | null;
	cronPattern: string | null;
	lastRunAt: string | null;
	rechazos: { ultimaHora: number; seisHoras: number; ultimoAt: string | null };
}

export interface SaijProgressResponse {
	success: boolean;
	data: {
		workers: SaijWorkerProgress[];
		totales: {
			porJurisdiccion: Record<string, number>;
			docs: number;
			/** Suma de rateLimit de los workers activos: es lo que SAIJ mide por IP */
			rateAgregado: number;
			rechazosUltimaHora: number;
		};
	};
}

export const getSaijProgress = async (): Promise<SaijProgressResponse> => {
	const response = await pjnAxios.get("/api/saij/config/progress");
	return response.data;
};

export const getSaijWorkerConfig = async (workerId: string): Promise<{ success: boolean; data: SaijWorkerConfig }> => {
	const response = await pjnAxios.get(`/api/saij/config/${workerId}`);
	return response.data;
};

export const getSaijWorkerStats = async (workerId: string) => {
	const response = await pjnAxios.get(`/api/saij/config/${workerId}/stats`);
	return response.data;
};

export const getSaijWorkerHistory = async (workerId: string, page = 1, limit = 24) => {
	const response = await pjnAxios.get(`/api/saij/config/${workerId}/history`, { params: { page, limit } });
	return response.data;
};

export const enableSaijWorker = async (workerId: string) => {
	const response = await pjnAxios.post(`/api/saij/config/${workerId}/enable`);
	return response.data;
};

export const disableSaijWorker = async (workerId: string) => {
	const response = await pjnAxios.post(`/api/saij/config/${workerId}/disable`);
	return response.data;
};

export const pauseSaijWorker = async (workerId: string, reason: string, resumeAt?: string) => {
	const response = await pjnAxios.post(`/api/saij/config/${workerId}/pause`, { reason, resumeAt });
	return response.data;
};

export const resumeSaijWorker = async (workerId: string) => {
	const response = await pjnAxios.post(`/api/saij/config/${workerId}/resume`);
	return response.data;
};

export const resetSaijCursor = async (workerId: string, year: number, month: number, offset = 0) => {
	const response = await pjnAxios.patch(`/api/saij/config/${workerId}/cursor`, { year, month, offset });
	return response.data;
};

export const updateSaijScrapingConfig = async (workerId: string, data: Partial<SaijWorkerConfig["scraping"]>) => {
	const response = await pjnAxios.patch(`/api/saij/config/${workerId}/scraping`, data);
	return response.data;
};

export const updateSaijPipelineConfig = async (workerId: string, data: Partial<SaijPipelineConfig>) => {
	const response = await pjnAxios.patch(`/api/saij/config/${workerId}/pipeline`, data);
	return response.data;
};

export const updateSaijNotificationConfig = async (
	workerId: string,
	data: Partial<SaijWorkerConfig["notification"]> & { userCampaign?: Partial<SaijUserCampaignConfig> },
) => {
	const response = await pjnAxios.patch(`/api/saij/config/${workerId}/notification`, data);
	return response.data;
};

/**
 * Vincula a mano un fallo con una causa PJN (o la suelta con desvincular).
 * El pipeline solo vincula cuando puede parsear el expediente del PDF; esto
 * cubre los fallos cuyo expediente no matcheó.
 */
export const vincularCausaSaij = async (
	id: string,
	data: { fuero: string; number: number; year: number } | { desvincular: true },
) => {
	const response = await pjnAxios.patch(`/api/saij/sentencias/${id}/causa`, data);
	return response.data;
};
