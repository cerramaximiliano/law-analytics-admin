// workersAxios (pjn/cache-api → rs0) y NO pjnAxios (pjn/api del hub → Atlas):
// el manager y los workers de update-movimientos leen su configuración de rs0.
// Con pjnAxios, los PUT de esta vista escribían en Atlas — el worker nunca los
// veía y el espejo local→Atlas los pisaba en el ciclo siguiente (split-brain,
// detectado 25/08/2026). Mismo patrón que etapaStats.ts / plazos.ts.
import workersAxios from "utils/workersAxios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface UpdateMovimientosWorkerConfig {
	_id: string;
	worker_id: string;
	fuero: "CIV" | "CSS" | "CNT" | "COM";
	enabled: boolean;
	cronPattern: string;
	batchSize: number;
	lockTimeoutMinutes: number;
	errorCooldown: {
		enabled: boolean;
		maxConsecutiveErrors: number;
		cooldownHours: number;
	};
	captcha: {
		defaultProvider: "2captcha" | "capsolver" | "captchaai";
		fallbackEnabled: boolean;
		apiKeys: {
			twocaptcha: { key: string; enabled: boolean };
			capsolver: { key: string; enabled: boolean };
			captchaai: { key: string; enabled: boolean };
		};
		minimumBalance: number;
	};
	updateProgress: {
		totalEligible: number;
		processedToday: number;
		lastEligibleCalculation?: string;
		currentCycleStart?: string;
		completionPercentage: number;
	};
	stats: {
		totalProcessed: number;
		totalSuccess: number;
		totalFailed: number;
		totalNewMovimientos: number;
		lastRun?: string;
		lastSuccessfulRun?: string;
	};
	statsToday: {
		date?: string;
		processed: number;
		success: number;
		failed: number;
		newMovimientos: number;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface ManagerFueroState {
	pending: number;
	current: number;
	optimal: number;
	action: string;
}

export interface ManagerCurrentState {
	totalPending: number;
	fueros: Record<string, ManagerFueroState>;
	resources?: {
		cpuUsage: number;
		memoryUsage: number;
		freeMemoryMB: number;
	};
	timestamp?: string;
}

export interface UpdateMovimientosManagerConfig {
	_id: string;
	name: string;
	config: {
		checkInterval: number;
		maxWorkers: number;
		minWorkers: number;
		scaleThreshold: number;
		scaleDownThreshold: number;
		cpuThreshold: number;
		memoryThreshold: number;
		workStartHour: number;
		workEndHour: number;
		workDays: number[];
		fueros: string[];
	};
	currentState: ManagerCurrentState;
	updatedAt?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

const BASE = "/api/configuracion-update-movimientos";

const UpdateMovimientosService = {
	async getWorkerConfigs(): Promise<UpdateMovimientosWorkerConfig[]> {
		const res = await workersAxios.get<{ success: boolean; data: UpdateMovimientosWorkerConfig[] }>(BASE + "/");
		return res.data.data;
	},

	async updateWorkerConfig(id: string, data: Partial<UpdateMovimientosWorkerConfig>): Promise<UpdateMovimientosWorkerConfig> {
		const res = await workersAxios.put<{ success: boolean; data: UpdateMovimientosWorkerConfig }>(`${BASE}/${id}`, data);
		return res.data.data;
	},

	async getManagerConfig(): Promise<UpdateMovimientosManagerConfig> {
		const res = await workersAxios.get<{ success: boolean; data: UpdateMovimientosManagerConfig }>(BASE + "/manager");
		return res.data.data;
	},

	async updateManagerConfig(config: Partial<UpdateMovimientosManagerConfig["config"]>): Promise<UpdateMovimientosManagerConfig> {
		const res = await workersAxios.put<{ success: boolean; data: UpdateMovimientosManagerConfig }>(BASE + "/manager", { config });
		return res.data.data;
	},
};

export default UpdateMovimientosService;
