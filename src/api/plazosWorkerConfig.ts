import workersAxios, { pjnAtlasAxios } from "utils/workersAxios";
import { getPlazosBase } from "api/plazos";

/**
 * plazosWorkerConfig.ts — Config + estado del plazos-worker (pjn-api
 * /api/plazos-worker-config), según la base elegida en Plazos:
 *   - caché → plazos-worker (worker_01, laboratorio) vía pjn/cache-api;
 *   - usuarios → plazos-worker-usuarios (worker_02) vía pjn/api contra Atlas.
 * Vista admin Workers → Plazos.
 */
const ax = () => (getPlazosBase() === "usuarios" ? pjnAtlasAxios : workersAxios);

const BASE = "/api/plazos-worker-config";

export interface PlazosWorkerSettings {
	enabled: boolean;
	cronPattern: string;
	lockTimeoutMinutes: number;
	maxRetries: number;
	downloadTimeoutMs: number;
	scanCharsPerPageThreshold: number;
	/** Solo usuarios: alcance del cálculo. Ausente/null = solo cuentas de prueba; {} = todas. */
	filtroUsuarios?: Record<string, unknown> | null;
}

export interface PlazosWorkerHeartbeat {
	workerId: string | null;
	startedAt: string | null;
	lastCycleAt: string | null;
	lastProcessedAt: string | null;
	lastProcessedId: string | null;
	lastResult: string | null;
}

export interface PlazosWorkerStats {
	processed: number;
	computed: number;
	parsed: number;
	extracted: number;
	ocrNeeded: number;
	notPdf: number;
	failed: number;
}

export interface PlazosWorkerFullDoc extends PlazosWorkerSettings {
	_id: string;
	heartbeat: PlazosWorkerHeartbeat;
	stats: PlazosWorkerStats;
	updatedAt?: string;
}

export interface PlazosWorkerStatus {
	enabled: boolean;
	cronPattern: string;
	heartbeat: PlazosWorkerHeartbeat;
	alive: boolean;
	stats: PlazosWorkerStats;
	cola: Record<string, number>;
}

const PlazosWorkerConfigService = {
	getFull: async (): Promise<PlazosWorkerFullDoc> => {
		const { data } = await ax().get(BASE);
		return data.data;
	},
	getStatus: async (): Promise<PlazosWorkerStatus> => {
		const { data } = await ax().get(`${BASE}/status`);
		return data.data;
	},
	updateSettings: async (settings: Partial<PlazosWorkerSettings>): Promise<PlazosWorkerFullDoc> => {
		const { data } = await ax().patch(`${BASE}/settings`, settings);
		return data.data;
	},
	resetStats: async (): Promise<PlazosWorkerFullDoc> => {
		const { data } = await ax().post(`${BASE}/reset-stats`);
		return data.data;
	},
};

export default PlazosWorkerConfigService;
