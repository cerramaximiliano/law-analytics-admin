import pjnAxios from "utils/pjnAxios";

// Interfaces para Manager Config
export interface ManagerConfigSettings {
	checkInterval: number;
	maxWorkers: number;
	minWorkers: number;
	scaleThreshold: number;
	scaleDownThreshold: number;
	updateThresholdHours: number;
	cpuThreshold: number;
	memoryThreshold: number;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	workerNames: {
		civil: string;
		ss: string;
		trabajo: string;
		comercial: string;
	};
}

export interface ManagerCurrentState {
	workers: {
		civil: number;
		ss: number;
		trabajo: number;
		comercial: number;
	};
	pending: {
		civil: number;
		ss: number;
		trabajo: number;
		comercial: number;
	};
	optimalWorkers: {
		civil: number;
		ss: number;
		trabajo: number;
		comercial: number;
	};
	systemResources: {
		cpuUsage: number;
		memoryUsage: number;
		freeMemoryMB: number;
		totalMemoryMB: number;
	};
	isRunning: boolean;
	isWithinWorkingHours: boolean;
	lastCycleAt: string;
	cycleCount: number;
}

export interface ManagerStateSnapshot {
	timestamp: string;
	workers: {
		civil: number;
		ss: number;
		trabajo: number;
		comercial: number;
	};
	pending: {
		civil: number;
		ss: number;
		trabajo: number;
		comercial: number;
	};
	systemResources: {
		cpuUsage: number;
		memoryUsage: number;
		freeMemoryMB: number;
	};
}

export interface ManagerAlert {
	type: "high_cpu" | "high_memory" | "no_workers" | "high_pending" | "manager_stopped";
	message: string;
	fuero?: string;
	createdAt: string;
	acknowledged: boolean;
}

export interface ManagerConfig {
	_id: string;
	name: string;
	config: ManagerConfigSettings;
	currentState: ManagerCurrentState;
	history: ManagerStateSnapshot[];
	alerts: ManagerAlert[];
	lastUpdate: string;
	createdAt: string;
}

export interface ManagerStatusResponse {
	success: boolean;
	message: string;
	data: {
		workers?: { [key: string]: number };
		pending?: { [key: string]: number };
		systemResources?: {
			cpuUsage: number;
			memoryUsage: number;
			freeMemoryMB: number;
		};
		isRunning: boolean;
		isWithinWorkingHours?: boolean;
		lastUpdate: string;
		lastUpdateAgo: string | null;
		isStale: boolean;
		totalWorkers: number;
		totalPending: number;
	};
}

export interface ManagerHistoryStats {
	avgWorkers: number | string;
	avgPending: number;
	avgCpu: string;
	avgMemory: string;
	maxWorkers: number;
	maxPending: number;
	snapshotCount: number;
}

export interface ManagerHistoryResponse {
	success: boolean;
	message: string;
	hoursBack: number;
	stats: ManagerHistoryStats;
	data: ManagerStateSnapshot[];
}

export interface ManagerAlertsResponse {
	success: boolean;
	message: string;
	count: number;
	data: ManagerAlert[];
}

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

// Servicio de Manager Config
export class ManagerConfigService {
	/**
	 * Obtiene la configuración completa del manager
	 */
	static async getConfig(): Promise<ApiResponse<ManagerConfig>> {
		try {
			const response = await pjnAxios.get("/api/manager-config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene solo los valores de configuración
	 */
	static async getSettings(): Promise<ApiResponse<ManagerConfigSettings>> {
		try {
			const response = await pjnAxios.get("/api/manager-config/settings");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualiza valores de configuración
	 */
	static async updateSettings(settings: Partial<ManagerConfigSettings>): Promise<ApiResponse<ManagerConfigSettings>> {
		try {
			const response = await pjnAxios.patch("/api/manager-config/settings", settings);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene el estado actual del manager
	 */
	static async getCurrentStatus(): Promise<ManagerStatusResponse> {
		try {
			const response = await pjnAxios.get("/api/manager-config/status");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene historial de snapshots
	 */
	static async getHistory(hours: number = 24): Promise<ManagerHistoryResponse> {
		try {
			const response = await pjnAxios.get("/api/manager-config/history", { params: { hours } });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtiene alertas activas
	 */
	static async getAlerts(): Promise<ManagerAlertsResponse> {
		try {
			const response = await pjnAxios.get("/api/manager-config/alerts");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Reconoce una alerta
	 */
	static async acknowledgeAlert(index: number): Promise<ApiResponse<void>> {
		try {
			const response = await pjnAxios.post(`/api/manager-config/alerts/${index}/acknowledge`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Resetea configuración a valores por defecto
	 */
	static async resetToDefaults(): Promise<ApiResponse<ManagerConfigSettings>> {
		try {
			const response = await pjnAxios.post("/api/manager-config/reset");
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

export default ManagerConfigService;
