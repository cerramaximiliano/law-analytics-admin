import mevAxios from "utils/mevAxios";

// ========== Tipos de worker ==========

export type ScbaWorkerType = "verification" | "initialScraping" | "update" | "listAudit";

export const SCBA_WORKER_TYPES: ScbaWorkerType[] = ["verification", "initialScraping", "update", "listAudit"];

export const SCBA_WORKER_LABELS: Record<ScbaWorkerType, string> = {
	verification: "Verificación de Lista",
	initialScraping: "Extracción Inicial",
	update: "Actualización Periódica",
	listAudit: "Auditoría Diaria",
};

export const SCBA_WORKER_DESCRIPTIONS: Record<ScbaWorkerType, string> = {
	verification:
		"Sincroniza la lista de 'Mis Causas' del portal SCBA para cada credencial. Descarga sólo metadata (carátula, juzgado, IDs) y deja cada causa pendiente para el Extracción Inicial.",
	initialScraping:
		"Procesa las causas marcadas como pending por el Verificación: navega a cada una, extrae todos los trámites y las deja en estado completed listas para el Actualización.",
	update:
		"Refresca periódicamente los movimientos de causas ya procesadas. Usa merge inteligente por (fecha+detalle+URL) para no duplicar movimientos. Respeta el threshold de horas desde la última actualización.",
	listAudit:
		"Corre una vez al día (3 AM ARG): compara la lista actual en SCBA con las causas ya guardadas, detecta altas y bajas, y dispara email consolidado al usuario con los cambios.",
};

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

export type ScbaWorkersConfigMap = Record<ScbaWorkerType, ScbaWorkerConfig>;

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
	workers: ScbaWorkersConfigMap;
}

export interface ScbaWorkerStatus {
	activeInstances: number;
	pendingDocuments: number;
	optimalInstances: number;
	lastProcessedAt?: string;
	processedThisCycle: number;
	errorsThisCycle: number;
}

export type ScbaWorkerStatusMap = Record<ScbaWorkerType, ScbaWorkerStatus>;

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
	workers: ScbaWorkerStatusMap;
	systemResources: ScbaSystemResources;
	lastScaleAction?: {
		timestamp: string;
		workerType: ScbaWorkerType;
		action: "scale_up" | "scale_down" | "no_change";
		from: number;
		to: number;
		reason: string;
	};
}

export interface ScbaHistorySnapshot {
	timestamp: string;
	workers: Record<ScbaWorkerType, { active: number; pending: number }>;
	systemResources: ScbaSystemResources;
	scaleChanges: number;
}

export interface ScbaAlert {
	type: string;
	workerType?: ScbaWorkerType;
	message: string;
	timestamp: string;
	acknowledged: boolean;
	acknowledgedAt?: string;
	acknowledgedBy?: string;
	value?: number;
	threshold?: number;
}

export interface ScbaDailyStatsByWorkerCommon {
	processed: number;
	success: number;
	errors: number;
	peakPending: number;
	peakWorkers: number;
}

export interface ScbaDailyStatsWorkerWithMovimientos extends ScbaDailyStatsByWorkerCommon {
	movimientosFound: number;
}

export interface ScbaDailyStatsListAudit {
	processed: number;
	success: number;
	errors: number;
	causasRemoved: number;
	causasReactivated: number;
	causasAdded: number;
}

export interface ScbaDailyStats {
	date: string;
	byWorker: {
		verification: ScbaDailyStatsByWorkerCommon;
		initialScraping: ScbaDailyStatsWorkerWithMovimientos;
		update: ScbaDailyStatsWorkerWithMovimientos;
		listAudit: ScbaDailyStatsListAudit;
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

// ========== Credenciales (listado admin + reset) ==========

export type ScbaSyncStatus = "never_synced" | "pending" | "in_progress" | "completed" | "error";

export interface ScbaCredentialListItem {
	_id: string;
	userId: string;
	user: {
		email?: string;
		firstName?: string;
		lastName?: string;
		role?: string;
	} | null;
	enabled: boolean;
	isExpired: boolean;
	syncStatus: ScbaSyncStatus;
	lastSync: string | null;
	lastSyncAttempt: string | null;
	consecutiveErrors: number;
	errorNotifiedAt: string | null;
	errorRecoveryPending: boolean;
	stats: {
		causasCreated: number;
		causasLinked: number;
		errors: number;
	};
	foldersCount: number;
}

export interface ScbaResetPreview {
	credentialId: string;
	userId: string;
	syncStatus: ScbaSyncStatus;
	lastSync: string | null;
	willDelete: {
		userFolders: number;
		orphanCausas: number;
	};
	willPull: {
		sharedCausas: number;
	};
}

export interface ScbaResetResult {
	credentialId: string;
	userId: string;
	deleted: {
		folders: number;
		orphanCausas: number;
	};
	pulledFrom: {
		sharedCausas: number;
	};
	credentialUpdated: boolean;
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

	async listCredentials(): Promise<{ success: boolean; data: ScbaCredentialListItem[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/credentials");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al listar credenciales SCBA");
		}
	}

	async previewResetCredential(credentialId: string): Promise<{ success: boolean; dryRun: boolean; data: ScbaResetPreview }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/credentials/${credentialId}/reset`, null, {
				params: { dryRun: true },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al previsualizar reset de credencial SCBA");
		}
	}

	async resetCredential(credentialId: string): Promise<{ success: boolean; message: string; data: ScbaResetResult }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/credentials/${credentialId}/reset`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear credencial SCBA");
		}
	}
}

export default new ScbaManagerService();
