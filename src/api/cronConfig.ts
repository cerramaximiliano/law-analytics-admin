import adminAxios from "utils/adminAxios";

// Interfaces
export interface GracePeriodConfig {
	defaultDays: number;
	reminderDays: number[];
	enableAutoArchive: boolean;
}

export interface CronTaskConfig {
	timeout?: number;
	retryOnError?: boolean;
	gracePeriod?: GracePeriodConfig;
}

export interface NotificationConfig {
	onError?: {
		enabled: boolean;
		recipients: string[];
	};
}

export interface HistoryEntry {
	updatedAt: Date | string;
	updatedBy: string;
	changes: string[];
	notes?: string;
}

export interface CronConfig {
	_id: string;
	taskName: string;
	taskDescription: string;
	cronExpression: string;
	timezone: string;
	enabled: boolean;
	priority: number;
	config: CronTaskConfig;
	notifications: NotificationConfig;
	lastRun?: Date | string;
	nextRun?: Date | string;
	runCount: number;
	failureCount: number;
	history?: HistoryEntry[];
	createdAt: Date | string;
	updatedAt: Date | string;
	createdBy?: string;
	updatedBy?: string;
	notes?: string;
}

export interface CronConfigResponse {
	success: boolean;
	message?: string;
	count?: number;
	data: CronConfig | CronConfig[];
	updated?: {
		fields: string[];
		timestamp: string;
	};
}

export interface ToggleResponse {
	success: boolean;
	message: string;
	data: {
		taskName: string;
		enabled: boolean;
		previousState: boolean;
		nextExecution?: string;
	};
}

export interface UpdateCronConfigParams {
	taskDescription?: string;
	cronExpression?: string;
	timezone?: string;
	enabled?: boolean;
	priority?: number;
	config?: CronTaskConfig;
	notifications?: NotificationConfig;
	updatedBy?: string;
	notes?: string;
}

// Servicio de configuración de cron
class CronConfigService {
	/**
	 * Obtener todas las configuraciones de cron con filtros opcionales
	 */
	static async getCronConfigs(params?: {
		taskName?: string;
		enabled?: boolean;
		includeHistory?: boolean;
	}): Promise<CronConfigResponse> {
		try {
			const response = await adminAxios.get("/api/cron-config", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener configuraciones de cron");
		}
	}

	/**
	 * Obtener configuración de una tarea específica
	 */
	static async getCronConfig(taskName: string, includeHistory?: boolean): Promise<CronConfigResponse> {
		try {
			const params = includeHistory ? { includeHistory: true } : {};
			console.log("🔍 [CronConfigService] Getting config for:", taskName);
			console.log("🔍 [CronConfigService] Params:", { taskName, ...params });
			console.log("🔍 [CronConfigService] adminAxios baseURL:", (adminAxios as any).defaults.baseURL);

			const response = await adminAxios.get(`/api/cron-config`, {
				params: { taskName, ...params },
			});

			console.log("✅ [CronConfigService] Response status:", response.status);
			console.log("✅ [CronConfigService] Response data:", response.data);

			return response.data;
		} catch (error: any) {
			console.error("❌ [CronConfigService] Error:", error);
			console.error("❌ [CronConfigService] Error response:", error.response);
			throw new Error(error.response?.data?.message || "Error al obtener configuración de cron");
		}
	}

	/**
	 * Actualizar configuración de una tarea
	 */
	static async updateCronConfig(taskName: string, updates: UpdateCronConfigParams): Promise<CronConfigResponse> {
		try {
			const response = await adminAxios.put(`/api/cron-config/${taskName}`, updates);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración de cron");
		}
	}

	/**
	 * Alternar estado habilitado/deshabilitado de una tarea
	 */
	static async toggleCronTask(
		taskName: string,
		params?: {
			enabled?: boolean;
			updatedBy?: string;
		},
	): Promise<ToggleResponse> {
		try {
			const response = await adminAxios.patch(`/api/cron-config/${taskName}/toggle`, params);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al cambiar estado de cron");
		}
	}
}

export default CronConfigService;
