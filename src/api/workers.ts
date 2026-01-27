import workersAxios from "utils/workersAxios";

// ========================================
// Interfaces para Worker Daily Stats
// ========================================

export interface WorkerDailyStatsRun {
	runId: string;
	startedAt: string;
	finishedAt?: string;
	status: "running" | "completed" | "failed" | "interrupted";
	documentsProcessed: number;
	documentsSuccessful: number;
	documentsFailed: number;
	movimientosFound: number;
	errorMessage?: string;
}

export interface WorkerDailyStatsError {
	timestamp: string;
	causaId?: string;
	number?: number;
	year?: number;
	errorType: string;
	message: string;
	stack?: string;
	retryCount?: number;
}

export interface WorkerDailyStatsAlert {
	type: string;
	message: string;
	createdAt: string;
	acknowledged: boolean;
	acknowledgedAt?: string;
}

export interface WorkerDailyStats {
	_id: string;
	date: string;
	fuero: string;
	workerType: string;
	status: "idle" | "running" | "completed" | "failed";
	stats: {
		totalToProcess: number;
		processed: number;
		successful: number;
		failed: number;
		skipped: number;
		movimientosFound: number;
		privateCausas: number;
		publicCausas: number;
		captchaAttempts: number;
		captchaSuccessful: number;
		captchaFailed: number;
	};
	runs: WorkerDailyStatsRun[];
	errors: WorkerDailyStatsError[];
	alerts: WorkerDailyStatsAlert[];
	lastUpdate: string;
	createdAt: string;
	updatedAt: string;
}

export interface WorkerStatsTodayResponse {
	success: boolean;
	message: string;
	date: string;
	totals: {
		totalToProcess: number;
		processed: number;
		successful: number;
		failed: number;
		skipped: number;
		movimientosFound: number;
		privateCausas: number;
		publicCausas: number;
		captchaAttempts: number;
		captchaSuccessful: number;
		captchaFailed: number;
		successRate: string;
		captchaSuccessRate: string;
	};
	byFuero: Array<{
		fuero: string;
		status: string;
		stats: WorkerDailyStats["stats"];
		runsCount: number;
		errorsCount: number;
		alerts: WorkerDailyStatsAlert[];
		lastUpdate: string;
	}>;
	fueroCount: number;
}

export interface WorkerStatsRangeResponse {
	success: boolean;
	message: string;
	from: string;
	to: string;
	daysCount: number;
	summary: Array<{
		date: string;
		totalProcessed: number;
		totalSuccessful: number;
		totalFailed: number;
		totalMovimientos: number;
		fueros: string[];
	}>;
	data: WorkerDailyStats[];
}

export interface WorkerStatsByDateResponse {
	success: boolean;
	message: string;
	date: string;
	count: number;
	data: WorkerDailyStats[];
}

export interface WorkerFueroStatusResponse {
	success: boolean;
	message: string;
	data: {
		fuero: string;
		date: string;
		status: string;
		stats: WorkerDailyStats["stats"];
		runs: WorkerDailyStatsRun[];
		recentErrors: WorkerDailyStatsError[];
		alerts: WorkerDailyStatsAlert[];
		lastUpdate: string;
		health: "healthy" | "warning" | "critical" | "idle";
		errorRate: string;
	} | null;
}

export interface WorkerAlertsResponse {
	success: boolean;
	message: string;
	count: number;
	data: Array<{
		fuero: string;
		workerType: string;
		type: string;
		message: string;
		createdAt: string;
		status: string;
	}>;
}

export interface WorkerFueroErrorsResponse {
	success: boolean;
	message: string;
	fuero: string;
	date: string;
	totalErrors: number;
	byType: Record<string, number>;
	data: Array<WorkerDailyStatsError & { workerType: string }>;
}

// Interface para historial de scraping
export interface ScrapingHistory {
	_id: string | { $oid: string };
	worker_id: string;
	fuero: string;
	year: number;
	range_start: number;
	range_end: number;
	documents_processed?: number;
	documents_found?: number;
	completedAt: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

export interface ScrapingHistoryResponse {
	success: boolean;
	message?: string;
	count?: number;
	total?: number;
	page?: number;
	pages?: number;
	data: ScrapingHistory[];
}

// Interfaces para Workers
export interface WorkerConfig {
	_id: string | { $oid: string };
	nombre?: string;
	valor?: number | string | boolean;
	descripcion?: string;
	activo?: boolean;
	// Campos reales de la API de verificación según modelo mongoose
	fuero?: "CIV" | "CSS" | "CNT" | string;
	worker_id?: string;
	verification_mode?: "all" | "civil" | "ss" | "trabajo" | string;
	last_check?: { $date: string } | string;
	documents_verified?: number;
	documents_valid?: number;
	documents_invalid?: number;
	enabled?: boolean;
	balance?: {
		twoCaptcha?: boolean;
		current?: number;
		lastUpdate?: { $date: string } | string;
		startOfDay?: number;
		provider?: string;
	};
	batch_size?: number;
	captcha?: {
		defaultProvider?: "2captcha" | "capsolver" | string;
		skipResolution?: boolean;
		apiKeys?: {
			twocaptcha?: {
				key?: string;
				enabled?: boolean;
			};
			capsolver?: {
				key?: string;
				enabled?: boolean;
			};
		};
		fallbackEnabled?: boolean;
		minimumBalance?: number;
	};
	lastUpdate?: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
	__v?: number;
	// Campos específicos de scraping
	year?: number;
	number?: number;
	max_number?: number;
	consecutive_not_found?: number;
	not_found_range?: {
		start_number?: number;
		end_number?: number;
	};
	// Totales de scraping
	total_found?: number;
	total_not_found?: number;
	total_errors?: number;
	// Errores técnicos consecutivos
	consecutive_errors?: number;
	error_range?: {
		start_number?: number;
		end_number?: number;
	};
	range_start?: number;
	range_end?: number;
	proxy?: {
		enabled?: boolean;
		applyTo?: {
			puppeteer?: boolean;
			captchaService?: boolean;
		};
		service?: {
			name?: string;
			protocol?: string;
		};
		captchaConfig?: {
			twoCaptcha?: any;
			capsolver?: {
				type?: string;
			};
		};
	};
	capsolver?: {
		totalCaptchas?: number;
		totalCaptchasAttempted?: number;
	};
	notification?: {
		startupEmail?: boolean;
	};
	// Campos específicos de app-update
	update_mode?: "all" | "single" | string;
	documents_updated?: number;
	documents_checked?: number;
	documents_failed?: number;
	last_update_threshold_hours?: number;
	// Historial de rangos completados
	rangeHistory?: Array<{
		version?: number;
		range_start?: number;
		range_end?: number;
		year?: string | number;
		completedAt?: { $date: string } | string;
		lastProcessedNumber?: number;
		documentsProcessed?: number;
		documentsFound?: number;
		enabled?: boolean;
		completionEmailSent?: boolean;
		_id?: string | { $oid: string };
	}>;
}

export interface WorkerConfigResponse {
	success: boolean;
	message: string;
	count?: number;
	total?: number;
	page?: number;
	pages?: number;
	data: WorkerConfig[] | WorkerConfig;
}

// Tipos de workers disponibles
export type WorkerType = "verificacion" | "sincronizacion" | "procesamiento" | "notificaciones" | "limpieza" | "scraping" | "app-update" | "email-verification";

// Interface para configuración de email verification
export interface EmailVerificationConfig {
	_id: string | { $oid: string };
	worker_id: string;
	enabled: boolean;
	dailyLimit: number;
	batchSize: number;
	schedule: string;
	lastRun?: { $date: string } | string;
	todayVerified: number;
	todayJobs: number;
	dailyJobsLimit: number;
	todayDate?: { $date: string } | string;
	totalVerified: number;
	totalFailed: number;
	neverBounceCredits?: number;
	priorityTags: string[];
	retryAttempts: number;
	retryDelay: number;
	neverBouncePollingInterval: number;
	neverBounceMaxPollingAttempts: number;
	stats: {
		valid: number;
		invalid: number;
		disposable: number;
		catchall: number;
		unknown: number;
	};
	processing: {
		isRunning: boolean;
		startedAt?: { $date: string } | string;
		completedAt?: { $date: string } | string;
	};
	contactsDatabase?: "local" | "remote";
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

export interface EmailVerificationConfigResponse {
	success: boolean;
	message: string;
	data: EmailVerificationConfig | null;
}

// Clase base genérica para configuraciones de workers
class WorkerConfigService {
	private endpoint: string;

	constructor(workerType: WorkerType) {
		this.endpoint = `/api/configuracion-${workerType}/`;
	}

	async getConfigs(params?: {
		activo?: boolean;
		enabled?: boolean;
		fuero?: string;
		year?: string;
		progreso?: string;
		worker_id?: string;
		sortBy?: string;
		sortOrder?: string;
		page?: number;
		limit?: number;
	}): Promise<WorkerConfigResponse> {
		try {
			const response = await workersAxios.get(this.endpoint, { params });
			return response.data;
		} catch (error) {
			throw WorkersService.handleError(error);
		}
	}

	async updateConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		try {
			const response = await workersAxios.put(`${this.endpoint}${id}`, data);
			return response.data;
		} catch (error) {
			throw WorkersService.handleError(error);
		}
	}

	async updateRange(id: string, data: { range_start: number; range_end: number; year?: number }): Promise<WorkerConfigResponse> {
		try {
			const response = await workersAxios.put(`${this.endpoint}${id}/range`, data);
			return response.data;
		} catch (error) {
			throw WorkersService.handleError(error);
		}
	}

	async deleteConfig(id: string): Promise<WorkerConfigResponse> {
		try {
			const response = await workersAxios.delete(`${this.endpoint}${id}`);
			return response.data;
		} catch (error) {
			throw WorkersService.handleError(error);
		}
	}

	async createConfig(data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		try {
			const response = await workersAxios.post(this.endpoint, data);
			return response.data;
		} catch (error) {
			throw WorkersService.handleError(error);
		}
	}
}

// Servicio principal de Workers
export class WorkersService {
	// Mapa de servicios para cada tipo de worker
	private static services: Record<WorkerType, WorkerConfigService> = {
		verificacion: new WorkerConfigService("verificacion"),
		sincronizacion: new WorkerConfigService("sincronizacion"),
		procesamiento: new WorkerConfigService("procesamiento"),
		notificaciones: new WorkerConfigService("notificaciones"),
		limpieza: new WorkerConfigService("limpieza"),
		scraping: new WorkerConfigService("scraping"),
		"app-update": new WorkerConfigService("app-update"),
		"email-verification": new WorkerConfigService("email-verification"),
	};

	// Método genérico para obtener configuraciones
	static async getConfigs(
		workerType: WorkerType,
		params?: {
			activo?: boolean;
			enabled?: boolean;
			fuero?: string;
			year?: string;
			progreso?: string;
			worker_id?: string;
			sortBy?: string;
			sortOrder?: string;
			page?: number;
			limit?: number;
		},
	): Promise<WorkerConfigResponse> {
		return this.services[workerType].getConfigs(params);
	}

	// Método genérico para actualizar configuraciones
	static async updateConfig(workerType: WorkerType, id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.services[workerType].updateConfig(id, data);
	}

	// Métodos específicos para mantener compatibilidad con el código existente
	static async getVerificationConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("verificacion", params);
	}

	static async updateVerificationConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("verificacion", id, data);
	}

	static async getSyncConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("sincronizacion", params);
	}

	static async updateSyncConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("sincronizacion", id, data);
	}

	static async getProcessingConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("procesamiento", params);
	}

	static async updateProcessingConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("procesamiento", id, data);
	}

	static async getNotificationConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("notificaciones", params);
	}

	static async updateNotificationConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("notificaciones", id, data);
	}

	static async getCleanupConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("limpieza", params);
	}

	static async updateCleanupConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("limpieza", id, data);
	}

	static async getScrapingConfigs(params?: {
		activo?: boolean;
		enabled?: boolean;
		fuero?: string;
		year?: string;
		progreso?: string;
		worker_id?: string;
		sortBy?: string;
		sortOrder?: string;
		page?: number;
		limit?: number;
	}): Promise<WorkerConfigResponse> {
		return this.getConfigs("scraping", params);
	}

	static async updateScrapingConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("scraping", id, data);
	}

	static async updateScrapingRange(id: string, data: { range_start: number; range_end: number; year?: number }): Promise<WorkerConfigResponse> {
		return this.services["scraping"].updateRange(id, data);
	}

	static async deleteScrapingConfig(id: string): Promise<WorkerConfigResponse> {
		return this.services["scraping"].deleteConfig(id);
	}

	static async createScrapingConfig(data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.services["scraping"].createConfig(data);
	}

	static async getAppUpdateConfigs(params?: { activo?: boolean; page?: number; limit?: number }): Promise<WorkerConfigResponse> {
		return this.getConfigs("app-update", params);
	}

	static async updateAppUpdateConfig(id: string, data: Partial<WorkerConfig>): Promise<WorkerConfigResponse> {
		return this.updateConfig("app-update", id, data);
	}

	// Métodos para historial de scraping
	static async getScrapingHistory(params?: {
		page?: number;
		limit?: number;
		worker_id?: string;
		fuero?: string;
		year?: string;
		sortBy?: string;
		sortOrder?: string;
	}): Promise<ScrapingHistoryResponse> {
		try {
			const response = await workersAxios.get("/api/configuracion-scraping-history/", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Métodos para Email Verification (NeverBounce)
	static async getEmailVerificationConfig(): Promise<EmailVerificationConfigResponse> {
		try {
			const response = await workersAxios.get("/api/configuracion-email-verification/");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateEmailVerificationConfig(id: string, data: Partial<EmailVerificationConfig>): Promise<EmailVerificationConfigResponse> {
		try {
			const response = await workersAxios.put(`/api/configuracion-email-verification/${id}`, data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async resetEmailVerificationDailyCounters(id: string): Promise<EmailVerificationConfigResponse> {
		try {
			const response = await workersAxios.post(`/api/configuracion-email-verification/${id}/reset-daily`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async clearEmailVerificationProcessing(id: string): Promise<EmailVerificationConfigResponse> {
		try {
			const response = await workersAxios.post(`/api/configuracion-email-verification/${id}/clear-processing`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async refreshEmailVerificationCredits(id: string): Promise<EmailVerificationConfigResponse> {
		try {
			const response = await workersAxios.post(`/api/configuracion-email-verification/${id}/refresh-credits`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// ========================================
	// Métodos para Worker Daily Stats
	// ========================================

	/**
	 * Obtener resumen de estadísticas del día actual
	 */
	static async getWorkerStatsTodaySummary(workerType?: string): Promise<WorkerStatsTodayResponse> {
		try {
			const params: Record<string, string> = {};
			if (workerType) params.workerType = workerType;
			const response = await workersAxios.get("/api/workers/stats/today", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas de un día específico
	 */
	static async getWorkerStatsByDate(
		date: string,
		params?: { workerType?: string; fuero?: string }
	): Promise<WorkerStatsByDateResponse> {
		try {
			const response = await workersAxios.get(`/api/workers/stats/${date}`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas por rango de fechas
	 */
	static async getWorkerStatsByRange(params: {
		from: string;
		to: string;
		workerType?: string;
		fuero?: string;
	}): Promise<WorkerStatsRangeResponse> {
		try {
			const response = await workersAxios.get("/api/workers/stats/range", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estado actual de un fuero específico
	 */
	static async getWorkerFueroStatus(
		fuero: string,
		workerType?: string
	): Promise<WorkerFueroStatusResponse> {
		try {
			const params: Record<string, string> = {};
			if (workerType) params.workerType = workerType;
			const response = await workersAxios.get(`/api/workers/fuero/${fuero}/status`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener errores recientes de un fuero
	 */
	static async getWorkerFueroErrors(
		fuero: string,
		params?: { workerType?: string; limit?: number }
	): Promise<WorkerFueroErrorsResponse> {
		try {
			const response = await workersAxios.get(`/api/workers/fuero/${fuero}/errors`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener alertas activas
	 */
	static async getWorkerAlerts(): Promise<WorkerAlertsResponse> {
		try {
			const response = await workersAxios.get("/api/workers/alerts");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Reconocer (acknowledge) una alerta
	 */
	static async acknowledgeWorkerAlert(
		fuero: string,
		alertType: string,
		workerType?: string
	): Promise<{ success: boolean; message: string; modifiedCount: number }> {
		try {
			const params: Record<string, string> = {};
			if (workerType) params.workerType = workerType;
			const response = await workersAxios.post(
				`/api/workers/alerts/${fuero}/${alertType}/acknowledge`,
				{},
				{ params }
			);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Manejo de errores
	static handleError(error: any): Error {
		// Si es un error de axios, re-lanzarlo tal cual para que el interceptor pueda manejarlo
		// Esto permite que el interceptor de workersAxios intente refrescar el token en errores 401
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default WorkersService;
