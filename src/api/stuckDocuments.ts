import pjnAxios from "utils/pjnAxios";

// Interfaces para Stuck Documents
export interface StuckDocumentsPendingByFuero {
	name: string;
	app: number;
	pjnLogin: number;
	cache: number;
	total: number;
}

export interface StuckDocumentsRepeatedFailure {
	documentId: string;
	expediente: string;
	fuero: string;
	attempts: number;
	lastAttempt: string;
	lastStatus: string;
	lastMessage?: string;
}

export interface ChronicStuckDocument {
	documentId: string;
	expediente: string;
	fuero: string;
	caratula?: string;
	hasFolders: boolean;
	foldersCount: number;
	attemptCount: number;
	firstAttempt: string | null;
	lastAttempt: string | null;
	daysSinceFirst: number | null;
	hasDateDiscordance: boolean;
}

export interface StuckDocumentsStats {
	worker: {
		enabled: boolean;
		processingMode: string;
		lastCheck: string | null;
		timeSinceLastCheck: string | null;
		health: "healthy" | "warning" | "critical" | "disabled" | "unknown";
		healthMessage: string;
	};
	totals: {
		processed: number;
		fixed: number;
		failed: number;
		successRate: string;
	};
	pending: {
		byFuero: Record<string, StuckDocumentsPendingByFuero>;
		totalApp: number;
		totalPjnLogin: number;
		total: number;
		note: string | null;
	};
	recent: {
		period: string;
		totalLogs: number;
		uniqueDocuments: number;
		byStatus: Record<string, number>;
		movimientosAdded: number;
		successRate: string;
	};
	repeatedFailures: StuckDocumentsRepeatedFailure[];
	chronicStuck: ChronicStuckDocument[];
}

export interface StuckDocumentsStatsResponse {
	success: boolean;
	message: string;
	data: StuckDocumentsStats;
}

export interface StuckDocument {
	_id: string | { $oid: string };
	number: number;
	year: number;
	caratula?: string;
	juzgado?: string;
	objeto?: string;
	source: string;
	fuero: string;
	createdAt?: string;
	lastUpdate?: string;
	retryCount: number;
	scrapingProgress?: {
		isComplete?: boolean;
		status?: string;
	};
}

export interface StuckDocumentsPendingResponse {
	success: boolean;
	message: string;
	count: number;
	total: number;
	pagination: {
		page: number;
		limit: number;
		totalPages: number;
		hasMore: boolean;
	};
	data: StuckDocument[];
}

export interface StuckDocumentsLog {
	id: string;
	status: string;
	startTime: string;
	endTime?: string;
	duration?: number;
	document?: {
		id: string;
		expediente: string;
		fuero: string;
		movimientosBefore: number;
		movimientosAfter?: number;
	};
	movimientosAdded: number;
	message?: string;
	error?: string;
}

export interface StuckDocumentsLogsResponse {
	success: boolean;
	message: string;
	period: string;
	count: number;
	data: StuckDocumentsLog[];
}

// Interfaces para configuración del worker
export interface StuckDocumentsSchedule {
	cronPattern: string;
	workingDays: number[];
	workingHoursStart: number;
	workingHoursEnd: number;
	timezone: string;
	pauseOnWeekends: boolean;
	pauseOnHolidays: boolean;
}

export interface StuckDocumentsConfig {
	_id: string;
	worker_id: string;
	fuero: string;
	processing_mode: string;
	enabled: boolean;
	schedule: StuckDocumentsSchedule;
	batch_size: number;
	lock_timeout_minutes: number;
	captcha_provider: string;
	documents_processed: number;
	documents_fixed: number;
	documents_failed: number;
	last_check: string | null;
	createdAt: string;
	updatedAt: string;
	scheduleSummary?: string;
}

export interface StuckDocumentsConfigResponse {
	success: boolean;
	message: string;
	data: StuckDocumentsConfig;
}

// Servicio de Stuck Documents
export class StuckDocumentsService {
	/**
	 * Obtener estadísticas completas del stuck documents worker
	 */
	static async getStats(hours: number = 24): Promise<StuckDocumentsStatsResponse> {
		try {
			const response = await pjnAxios.get("/api/workers/stuck-documents/stats", {
				params: { hours },
			});
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener lista de documentos stuck pendientes
	 */
	static async getPendingDocuments(params?: {
		fuero?: "CIV" | "COM" | "CSS" | "CNT";
		source?: "app" | "pjn-login" | "cache" | "all";
		page?: number;
		limit?: number;
	}): Promise<StuckDocumentsPendingResponse> {
		try {
			const response = await pjnAxios.get("/api/workers/stuck-documents/pending", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener logs recientes del worker
	 */
	static async getRecentLogs(params?: {
		hours?: number;
		status?: "success" | "partial" | "failed";
		limit?: number;
	}): Promise<StuckDocumentsLogsResponse> {
		try {
			const response = await pjnAxios.get("/api/workers/stuck-documents/logs", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Marcar documento como archivado (excluir del procesamiento)
	 */
	static async archiveDocument(
		fuero: "CIV" | "COM" | "CSS" | "CNT",
		id: string,
		reason?: string
	): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post(`/api/workers/stuck-documents/archive/${fuero}/${id}`, {
				reason,
			});
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Desarchivar documento (volver a incluir en procesamiento)
	 */
	static async unarchiveDocument(
		fuero: "CIV" | "COM" | "CSS" | "CNT",
		id: string
	): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post(`/api/workers/stuck-documents/unarchive/${fuero}/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Habilitar/deshabilitar worker
	 */
	static async toggleWorker(enabled: boolean): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post("/api/workers/stuck-documents/toggle", { enabled });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener configuración completa del worker
	 */
	static async getConfig(): Promise<StuckDocumentsConfigResponse> {
		try {
			const response = await pjnAxios.get("/api/workers/stuck-documents/config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualizar configuración del worker
	 */
	static async updateConfig(updates: Partial<{
		enabled: boolean;
		processing_mode: string;
		batch_size: number;
		lock_timeout_minutes: number;
		schedule: Partial<StuckDocumentsSchedule>;
	}>): Promise<StuckDocumentsConfigResponse> {
		try {
			const response = await pjnAxios.patch("/api/workers/stuck-documents/config", updates);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Resetear estadísticas del worker
	 */
	static async resetStats(): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post("/api/workers/stuck-documents/reset-stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Manejo de errores
	static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default StuckDocumentsService;
