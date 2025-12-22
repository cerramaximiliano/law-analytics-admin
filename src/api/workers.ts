import workersAxios from "utils/workersAxios";

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
