import pjnAxios from "utils/pjnAxios";

// ====== Interfaces ======

export interface ScalingConfig {
	minInstances: number;
	maxInstances: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	scaleUpStep: number;
	scaleDownStep: number;
	cooldownMs: number;
}

export interface ScheduleConfig {
	enabled: boolean;
	timezone: string;
	workingDays: number[];
	workingHoursStart: string;
	workingHoursEnd: string;
	allowWeekends: boolean;
}

export interface QueueConfig {
	pollIntervalMs: number;
	maxConsecutiveErrors: number;
	errorCooldownMs: number;
}

export interface HealthCheckConfig {
	enabled: boolean;
	maxIdleMinutes: number;
	maxProcessingMinutes: number;
	autoRestartOnStuck: boolean;
}

export interface WorkerConfig {
	enabled: boolean;
	pm2ProcessName: string;
	description: string;
	scaling: ScalingConfig;
	schedule: ScheduleConfig;
	queue: QueueConfig;
	healthCheck: HealthCheckConfig;
}

export interface GlobalConfig {
	enabled: boolean;
	serviceAvailable: boolean;
	maintenanceMessage: string | null;
	scheduledDowntime: string | null;
}

export interface ManagerSettings {
	pollIntervalMs: number;
	configWatchEnabled: boolean;
	healthCheckIntervalMs: number;
}

export interface ScrapingManagerConfig {
	_version: string;
	_lastModified: string;
	_createdBy?: string;
	global: GlobalConfig;
	manager: ManagerSettings;
	workers: Record<string, WorkerConfig>;
}

export interface WorkerStateInfo {
	enabled: boolean;
	queueDepth: number;
	queueBreakdown?: Record<string, number> | null;
	currentInstances: number;
	desiredInstances: number;
	withinSchedule: boolean;
	reason: string;
	error?: string;
}

export interface ManagerState {
	serviceAvailability: {
		enabled: boolean;
		maintenanceMessage: string | null;
		scheduledDowntime: string | null;
		globalEnabled: boolean;
		updatedAt: string;
	} | null;
	managerStatus: {
		isRunning: boolean;
		configVersion: string;
		globalEnabled: boolean;
		serviceAvailable: boolean;
		workers: Record<string, WorkerStateInfo>;
		lastPoll: string;
		updatedAt: string;
	} | null;
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

// ====== Service ======

export class ScrapingManagerService {
	static async getConfig(): Promise<ApiResponse<ScrapingManagerConfig>> {
		try {
			const response = await pjnAxios.get("/api/scraping-manager");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateConfig(config: ScrapingManagerConfig): Promise<ApiResponse<ScrapingManagerConfig>> {
		try {
			const response = await pjnAxios.put("/api/scraping-manager", config);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateGlobal(data: Partial<GlobalConfig> & { manager?: Partial<ManagerSettings> }): Promise<ApiResponse<ScrapingManagerConfig>> {
		try {
			const response = await pjnAxios.patch("/api/scraping-manager/global", data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateWorker(workerName: string, data: Partial<WorkerConfig>): Promise<ApiResponse<WorkerConfig>> {
		try {
			const response = await pjnAxios.patch(`/api/scraping-manager/workers/${workerName}`, data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getManagerState(): Promise<ApiResponse<ManagerState>> {
		try {
			const response = await pjnAxios.get("/api/scraping-manager/state");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	private static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default ScrapingManagerService;
