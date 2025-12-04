import pjnAxios from "utils/pjnAxios";

// Types for Cleanup Config API

export interface RetentionConfig {
	detailedLogsDays: number;
	workerLogsDays: number;
}

export interface ScheduleConfig {
	cronExpression: string;
	timezone: string;
	description: string;
}

export interface NotificationsConfig {
	emailOnComplete: boolean;
	emailOnError: boolean;
	recipientEmails: string[];
}

export interface LimitsConfig {
	maxDocsPerRun: number;
	timeoutSeconds: number;
	warningThreshold: number;
}

export interface ExecutionStats {
	documentsWithLogsBefore: number;
	totalLogEntriesBefore: number;
	pendingCleanup: number;
	totalCleared: number;
	documentsWithLogsAfter: number;
	totalLogEntriesAfter: number;
}

export interface LastExecution {
	timestamp: string;
	status: "success" | "error" | "partial" | "timeout";
	duration: number;
	stats: ExecutionStats;
	error?: string;
}

export interface ExecutionHistoryItem {
	timestamp: string;
	status: "success" | "error" | "partial" | "timeout";
	duration: number;
	totalCleared: number;
	error?: string;
}

export interface MaintenanceConfig {
	isPaused: boolean;
	pausedAt?: string;
	pausedBy?: string;
	pauseReason?: string;
}

export interface MetadataConfig {
	createdBy: string;
	version: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface CleanupConfig {
	_id: string;
	configId: string;
	enabled: boolean;
	retention: RetentionConfig;
	schedule: ScheduleConfig;
	notifications: NotificationsConfig;
	limits: LimitsConfig;
	lastExecution?: LastExecution;
	executionHistory: ExecutionHistoryItem[];
	maintenance: MaintenanceConfig;
	metadata: MetadataConfig;
}

// Response interfaces
export interface CleanupConfigResponse {
	success: boolean;
	config: CleanupConfig;
}

export interface CleanupStatusResponse {
	success: boolean;
	status: {
		enabled: boolean;
		isPaused: boolean;
		isRunning: boolean;
		lastExecution?: LastExecution;
		nextExecution?: string;
		schedule: ScheduleConfig;
	};
}

export interface CleanupHistoryResponse {
	success: boolean;
	history: ExecutionHistoryItem[];
	pagination?: {
		total: number;
		limit: number;
		skip: number;
	};
}

// Update interfaces
export interface UpdateRetentionParams {
	detailedLogsDays?: number;
	workerLogsDays?: number;
}

export interface UpdateScheduleParams {
	cronExpression?: string;
	timezone?: string;
	description?: string;
}

export interface UpdateConfigParams {
	enabled?: boolean;
	retention?: UpdateRetentionParams;
	schedule?: UpdateScheduleParams;
	notifications?: Partial<NotificationsConfig>;
	limits?: Partial<LimitsConfig>;
}

// Cleanup Config Service
export class CleanupConfigService {
	private static readonly BASE_PATH = "/api/cleanup-config";

	/**
	 * GET /cleanup-config - Obtener configuración completa
	 */
	static async getConfig(): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.get(this.BASE_PATH);
		return response.data;
	}

	/**
	 * GET /cleanup-config/status - Obtener estado actual
	 */
	static async getStatus(): Promise<CleanupStatusResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/status`);
		return response.data;
	}

	/**
	 * GET /cleanup-config/history - Obtener historial de ejecuciones
	 */
	static async getHistory(limit: number = 30, skip: number = 0): Promise<CleanupHistoryResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/history`, {
			params: { limit, skip },
		});
		return response.data;
	}

	/**
	 * PUT /cleanup-config - Actualizar configuración completa
	 */
	static async updateConfig(params: UpdateConfigParams): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.put(this.BASE_PATH, params);
		return response.data;
	}

	/**
	 * PATCH /cleanup-config/retention - Cambiar retención
	 */
	static async updateRetention(params: UpdateRetentionParams): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.patch(`${this.BASE_PATH}/retention`, params);
		return response.data;
	}

	/**
	 * PATCH /cleanup-config/schedule - Cambiar schedule
	 */
	static async updateSchedule(params: UpdateScheduleParams): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.patch(`${this.BASE_PATH}/schedule`, params);
		return response.data;
	}

	/**
	 * POST /cleanup-config/enable - Habilitar
	 */
	static async enable(): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/enable`);
		return response.data;
	}

	/**
	 * POST /cleanup-config/disable - Deshabilitar
	 */
	static async disable(): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/disable`);
		return response.data;
	}

	/**
	 * POST /cleanup-config/pause - Pausar
	 */
	static async pause(reason?: string): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/pause`, { reason });
		return response.data;
	}

	/**
	 * POST /cleanup-config/resume - Reanudar
	 */
	static async resume(): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/resume`);
		return response.data;
	}

	/**
	 * POST /cleanup-config/reset - Resetear a defaults
	 */
	static async reset(): Promise<CleanupConfigResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/reset`);
		return response.data;
	}
}

export default CleanupConfigService;
