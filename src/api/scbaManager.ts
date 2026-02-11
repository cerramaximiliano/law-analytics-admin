import mevAxios from "utils/mevAxios";

// ========== Interfaces ==========

export interface ScbaWorkerSchedule {
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	useGlobalSchedule: boolean;
}

export interface ScbaWorkerConfig {
	enabled: boolean;
	minWorkers: number;
	maxWorkers: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	updateThresholdHours: number;
	batchSize: number;
	delayBetweenRequests: number;
	maxRetries: number;
	schedule: ScbaWorkerSchedule;
	cronExpression: string;
	workerName: string;
	workerScript: string;
	maxMemoryRestart: string;
}

export interface ScbaManagerSettings {
	serviceAvailable: boolean;
	maintenanceMessage: string;
	checkInterval: number;
	lockTimeoutMinutes: number;
	updateThresholdHours: number;
	cpuThreshold: number;
	memoryThreshold: number;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	timezone: string;
	workers: {
		verification: ScbaWorkerConfig;
		update: ScbaWorkerConfig;
	};
}

export interface ScbaWorkerStatus {
	activeInstances: number;
	pendingDocuments: number;
	optimalInstances: number;
	lastProcessedAt?: string;
	processedThisCycle: number;
	errorsThisCycle: number;
}

export interface ScbaSystemResources {
	cpuUsage: number;
	memoryUsage: number;
	memoryTotal: number;
	memoryFree: number;
	loadAvg: number[];
}

export interface ScbaManagerCurrentState {
	isRunning: boolean;
	isPaused: boolean;
	lastCycleAt?: string;
	cycleCount: number;
	workers: {
		verification: ScbaWorkerStatus;
		update: ScbaWorkerStatus;
	};
	systemResources: ScbaSystemResources;
	lastScaleAction?: {
		timestamp: string;
		workerType: "verification" | "update";
		action: "scale_up" | "scale_down" | "no_change";
		from: number;
		to: number;
		reason: string;
	};
}

export interface ScbaHistorySnapshot {
	timestamp: string;
	workers: {
		verification: { active: number; pending: number };
		update: { active: number; pending: number };
	};
	systemResources: ScbaSystemResources;
	scaleChanges: number;
}

export interface ScbaAlert {
	type: string;
	workerType?: string;
	message: string;
	timestamp: string;
	acknowledged: boolean;
	acknowledgedAt?: string;
	acknowledgedBy?: string;
	value?: number;
	threshold?: number;
}

export interface ScbaDailyStats {
	date: string;
	byWorker: {
		verification: {
			processed: number;
			success: number;
			errors: number;
			peakPending: number;
			peakWorkers: number;
		};
		update: {
			processed: number;
			success: number;
			errors: number;
			movimientosFound: number;
			peakPending: number;
			peakWorkers: number;
		};
	};
	cyclesRun: number;
	avgCycleTime: number;
}

export interface ScbaManagerConfig {
	_id: string;
	name: string;
	config: ScbaManagerSettings;
	currentState: ScbaManagerCurrentState;
	history: ScbaHistorySnapshot[];
	alerts: ScbaAlert[];
	dailyStats: ScbaDailyStats[];
	createdAt?: string;
	updatedAt?: string;
}

export interface ScbaManagerStatusResponse {
	success: boolean;
	data: ScbaManagerCurrentState & {
		staleness: "active" | "delayed" | "stale" | "unknown";
		lastCycleAgo: string | null;
	};
}

// ========== Service ==========

class ScbaManagerService {
	async getConfig(): Promise<{ success: boolean; data: ScbaManagerConfig }> {
		try {
			const response = await mevAxios.get("/api/scba-manager");
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("Error de autenticación. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuración del SCBA manager");
		}
	}

	async getSettings(): Promise<{ success: boolean; data: ScbaManagerSettings }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/settings");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener settings del SCBA manager");
		}
	}

	async updateSettings(settings: Partial<ScbaManagerSettings>): Promise<{ success: boolean; message: string; data: ScbaManagerSettings }> {
		try {
			const response = await mevAxios.patch("/api/scba-manager/settings", settings);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración del SCBA manager");
		}
	}

	async getStatus(): Promise<ScbaManagerStatusResponse> {
		try {
			const response = await mevAxios.get("/api/scba-manager/status");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estado del SCBA manager");
		}
	}

	async getHistory(hours: number = 24): Promise<{ success: boolean; data: ScbaHistorySnapshot[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/history", { params: { hours } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener historial del SCBA manager");
		}
	}

	async getAlerts(): Promise<{ success: boolean; data: ScbaAlert[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/alerts");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener alertas del SCBA manager");
		}
	}

	async acknowledgeAlert(index: number): Promise<{ success: boolean; message: string }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/alerts/${index}/acknowledge`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al reconocer alerta");
		}
	}

	async getStats(days: number = 7): Promise<{ success: boolean; data: ScbaDailyStats[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/stats", { params: { days } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas del SCBA manager");
		}
	}

	async resetToDefaults(): Promise<{ success: boolean; message: string; data: ScbaManagerConfig }> {
		try {
			const response = await mevAxios.post("/api/scba-manager/reset");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear configuración del SCBA manager");
		}
	}
}

export default new ScbaManagerService();
