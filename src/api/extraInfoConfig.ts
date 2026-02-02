import pjnAxios from "utils/pjnAxios";

// Interfaces para Extra-Info Config

export interface ExtraInfoSchedule {
	cronExpression: string;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	timezone: string;
	respectWorkingHours: boolean;
}

export interface ExtraInfoEligibility {
	requireVerified: boolean;
	requireValid: boolean;
	excludePrivate: boolean;
	requireLastUpdate: boolean;
	testMode: {
		enabled: boolean;
		testUserIds: string[];
	};
}

export interface ExtraInfoStats {
	documentsProcessed: number;
	documentsSuccess: number;
	documentsError: number;
	intervinientesExtracted: number;
	contactsSynced: number;
	lastReset: string;
}

export interface ExtraInfoSession {
	startTime?: string;
	documentsProcessed: number;
	documentsSuccess: number;
	documentsError: number;
	intervinientesExtracted: number;
	contactsSynced: number;
}

export interface ExtraInfoProgress {
	totalEligible: number;
	processedToday: number;
	lastEligibleCalculation?: string;
	currentCycleStart?: string;
	completionPercentage: number;
}

export interface ExtraInfoState {
	isRunning: boolean;
	isWithinWorkingHours: boolean;
	lastCycleAt?: string;
	cycleCount: number;
	lastError?: {
		message: string;
		timestamp: string;
		documentId?: string;
	};
}

export interface ExtraInfoConfig {
	_id: string;
	worker_id: string;
	name: string;
	processing_mode: string;
	batch_size: number;
	documentDelay: number;
	enabled: boolean;
	syncContactsEnabled: boolean;
	schedule: ExtraInfoSchedule;
	eligibility: ExtraInfoEligibility;
	stats: ExtraInfoStats;
	currentSession: ExtraInfoSession;
	processingProgress: ExtraInfoProgress;
	state: ExtraInfoState;
	createdAt: string;
	updatedAt: string;
}

export interface ExtraInfoStatus {
	initialized: boolean;
	enabled: boolean;
	syncContactsEnabled: boolean;
	processingMode: string;
	batchSize: number;
	isRunning: boolean;
	isWithinWorkingHours: boolean;
	lastCycleAt?: string;
	cycleCount: number;
	lastError?: {
		message: string;
		timestamp: string;
		documentId?: string;
	};
	schedule: ExtraInfoSchedule;
	lastUpdate: string;
	lastUpdateAgo: string | null;
	isStale: boolean;
}

export interface ExtraInfoStatsSummary {
	global: ExtraInfoStats;
	session: ExtraInfoSession;
	progress: ExtraInfoProgress;
	state: ExtraInfoState;
	schedule: ExtraInfoSchedule;
	eligibility: ExtraInfoEligibility;
}

export interface UserWithSync {
	_id: string;
	email: string;
	name: string;
	syncEnabled: boolean;
}

export interface UsersWithSyncResponse {
	totalUsers: number;
	usersWithSyncEnabled: number;
	percentage: string;
	users: UserWithSync[];
}

export interface EligibleCountResponse {
	total: number;
	byFuero: {
		civil?: number;
		comercial?: number;
		segsocial?: number;
		trabajo?: number;
	};
	testMode: boolean;
	testUserCausasCount: number;
	calculatedAt: string;
}

export interface IntervinientesStatsResponse {
	totalIntervinientes: number;
	byTipo: {
		PARTE?: number;
		LETRADO?: number;
		[key: string]: number | undefined;
	};
	documentsProcessed: {
		total: number;
		byFuero: {
			civil?: number;
			comercial?: number;
			segsocial?: number;
			trabajo?: number;
		};
	};
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

// Servicio de Extra-Info Config
export class ExtraInfoConfigService {
	/**
	 * Obtiene la configuración completa del worker
	 */
	static async getConfig(): Promise<ApiResponse<ExtraInfoConfig>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene resumen de estadísticas
	 */
	static async getStats(): Promise<ApiResponse<ExtraInfoStatsSummary>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config/stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene el estado actual del worker
	 */
	static async getStatus(): Promise<ApiResponse<ExtraInfoStatus>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config/status");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualiza configuración del worker
	 */
	static async updateConfig(updates: Partial<{
		enabled: boolean;
		syncContactsEnabled: boolean;
		processing_mode: string;
		batch_size: number;
		documentDelay: number;
		schedule: Partial<ExtraInfoSchedule>;
		eligibility: Partial<ExtraInfoEligibility>;
	}>): Promise<ApiResponse<ExtraInfoConfig>> {
		try {
			const response = await pjnAxios.patch("/api/extra-info-config", updates);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Habilitar/deshabilitar worker
	 */
	static async toggleEnabled(): Promise<ApiResponse<{ enabled: boolean }>> {
		try {
			const response = await pjnAxios.post("/api/extra-info-config/toggle");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Resetear estadísticas
	 */
	static async resetStats(): Promise<ApiResponse<void>> {
		try {
			const response = await pjnAxios.post("/api/extra-info-config/reset-stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene usuarios con sincronización habilitada
	 */
	static async getUsersWithSync(): Promise<ApiResponse<UsersWithSyncResponse>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config/users-with-sync");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene conteo de documentos elegibles
	 */
	static async getEligibleCount(): Promise<ApiResponse<EligibleCountResponse>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config/eligible-count");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene estadísticas de intervinientes
	 */
	static async getIntervinientesStats(): Promise<ApiResponse<IntervinientesStatsResponse>> {
		try {
			const response = await pjnAxios.get("/api/extra-info-config/intervinientes-stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Manejo de errores
	 */
	private static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default ExtraInfoConfigService;
