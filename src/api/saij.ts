import pjnAxios from "utils/pjnAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

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
	titulo: string;
	fecha: string;
	fechaString: string;
	tribunal: string;
	tipoTribunal: string;
	jurisdiccion: {
		codigo: string;
		descripcion: string;
		capital: string;
		idPais: number;
	};
	descriptores: string[];
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
	};
}

export interface SaijWorkerConfig {
	_id: string;
	worker_id: string;
	enabled: boolean;
	scraping: {
		url: string;
		apiUrl: string;
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
	};
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
		recipientEmail: string;
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

export const getSaijSentenciaById = async (id: string): Promise<{ success: boolean; data: SaijSentencia }> => {
	const response = await pjnAxios.get(`/api/saij/sentencias/${id}`);
	return response.data;
};

export const updateSaijSentencia = async (id: string, data: Partial<SaijSentencia>): Promise<{ success: boolean; data: SaijSentencia }> => {
	const response = await pjnAxios.patch(`/api/saij/sentencias/${id}`, data);
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

export const updateSaijNotificationConfig = async (workerId: string, data: Partial<SaijWorkerConfig["notification"]>) => {
	const response = await pjnAxios.patch(`/api/saij/config/${workerId}/notification`, data);
	return response.data;
};
