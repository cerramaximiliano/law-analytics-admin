// Lee del caché (pjn/cache-api → rs0), no del pjn-api del hub (→ Atlas):
// scraping-manager-state y configuracion-scraping viven en el replica set rs0 (los escribe el scraping-manager de worker_01). La copia de Atlas quedó congelada en la migración de agosto 2026.
// scraping-manager vive en ATLAS (lo escribe pjn-mis-causas en worker_02) —
// NO usar workersAxios (/cache → rs0): ahí la colección no existe (500).
// Dos bases, y no es lo mismo cuál se usa:
//   atlasAxios → api.lawanalytics.app          (pjn/api contra Atlas)
//   rs0Axios   → api.lawanalytics.app/cache    (pjn/cache-api contra el rs0)
// La configuración del manager solo existe en Atlas; las estadísticas de causas
// las escribe el scraping-manager en el rs0. Antes este archivo importaba
// `pjnAtlasAxios as workersAxios`: el alias hacía leer `workersAxios.get(...)` y
// suponer que iba al rs0, y así `fuero-stats` estuvo sirviendo desde Atlas una
// copia congelada el 2026-08-15 —de cuando el manager todavía espejaba el doc—.
// Se nombran por su destino para que el call site diga a qué base va.
import { pjnAtlasAxios as atlasAxios, default as rs0Axios } from "utils/workersAxios";

// ====== Interfaces ======

export interface ScalingConfig {
	minInstances: number;
	maxInstances: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	scaleUpStep: number;
	scaleDownStep: number;
	cooldownMs: number;
	fastScalingEnabled: boolean;
	fastScalingThreshold: number;
}

export interface ScheduleConfig {
	enabled: boolean;
	timezone: string;
	workingDays: number[];
	workingHoursStart: string;
	workingHoursEnd: string;
	allowWeekends: boolean;
	/** "window" (franja horaria, default) | "daily" (una pasada por día desde dailyRunAt) */
	mode?: "window" | "daily";
	/** HH:mm en timezone; solo con mode "daily" */
	dailyRunAt?: string;
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

export interface ProcessingConfig {
	/** Usuarios (credenciales) que procesa cada instancia por corrida, en secuencia */
	maxUsersPerBatch?: number;
	/** Pausa entre usuarios dentro de una instancia (segundos) */
	pauseBetweenUsersSec?: number;
}

export interface WorkerConfig {
	enabled: boolean;
	pm2ProcessName: string;
	description: string;
	processing?: ProcessingConfig;
	/** update-sync: horas mínimas entre corridas por usuario (modo window) */
	minHoursBetweenUpdates?: number;
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
			const response = await atlasAxios.get("/api/scraping-manager");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateConfig(config: ScrapingManagerConfig): Promise<ApiResponse<ScrapingManagerConfig>> {
		try {
			const response = await atlasAxios.put("/api/scraping-manager", config);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateGlobal(
		data: Partial<GlobalConfig> & { manager?: Partial<ManagerSettings> },
	): Promise<ApiResponse<ScrapingManagerConfig>> {
		try {
			const response = await atlasAxios.patch("/api/scraping-manager/global", data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateWorker(workerName: string, data: Partial<WorkerConfig>): Promise<ApiResponse<WorkerConfig>> {
		try {
			const response = await atlasAxios.patch(`/api/scraping-manager/workers/${workerName}`, data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getManagerState(): Promise<ApiResponse<ManagerState>> {
		try {
			const response = await atlasAxios.get("/api/scraping-manager/state");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getFueroStats(): Promise<ApiResponse<FueroStats>> {
		try {
			// Va al rs0: es donde el scraping-manager escribe `fuero-causa-stats`
			// cada ~2 minutos. La copia de Atlas quedó sin actualizarse.
			const response = await rs0Axios.get("/api/scraping-manager/fuero-stats");
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

// ====== Fuero Stats Interfaces ======

export interface FueroStat {
	causas: {
		/** Expedientes que existen en el portal (isValid=true). */
		count: number;
		/** Qué porcentaje del total de causas válidas representa este fuero. */
		pct: number;
		/**
		 * Todos los documentos de la colección. El scraper deja uno por CADA
		 * NÚMERO INTENTADO, así que incluye los inexistentes: sin este dato no se
		 * distingue "cuánto barrimos" de "cuánto encontramos".
		 */
		docs?: number | null;
		/** Válidas que además pasaron la verificación del worker. */
		verificadas?: number | null;
		sinVerificar?: number | null;
		/** Números barridos que resultaron no existir. */
		inexistentes?: number | null;
		/** Proporción de lo intentado que resultó ser un expediente real. */
		rendimiento?: number | null;
	};
	sentencias: { count: number };
	escritos: { count: number };
}

export interface FueroStats {
	/** Causas válidas: los expedientes que existen. */
	total: number;
	/** Universo completo de documentos, incluidos los números inexistentes. */
	docsTotal?: number;
	verificadasTotal?: number;
	inexistentesTotal?: number;
	fueros: Record<string, FueroStat>;
	updatedAt: string;
	/** Sentencias actualmente indexadas en Qdrant (embeddingStatus=completed en MongoDB) */
	sentenciasActivas?: { total: number; byFuero: Record<string, number> };
}

export default ScrapingManagerService;
