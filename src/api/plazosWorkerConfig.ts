import workersAxios from "utils/workersAxios";

/**
 * plazosWorkerConfig.ts — Config + estado del plazos-worker (pjn-api Local
 * /api/plazos-worker-config). Vista admin Workers PJN → Plazos.
 */

const BASE = "/api/plazos-worker-config";

export interface PlazosWorkerSettings {
	enabled: boolean;
	cronPattern: string;
	lockTimeoutMinutes: number;
	maxRetries: number;
	downloadTimeoutMs: number;
	scanCharsPerPageThreshold: number;
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
		const { data } = await workersAxios.get(BASE);
		return data.data;
	},
	getStatus: async (): Promise<PlazosWorkerStatus> => {
		const { data } = await workersAxios.get(`${BASE}/status`);
		return data.data;
	},
	updateSettings: async (settings: Partial<PlazosWorkerSettings>): Promise<PlazosWorkerFullDoc> => {
		const { data } = await workersAxios.patch(`${BASE}/settings`, settings);
		return data.data;
	},
	resetStats: async (): Promise<PlazosWorkerFullDoc> => {
		const { data } = await workersAxios.post(`${BASE}/reset-stats`);
		return data.data;
	},
};

export default PlazosWorkerConfigService;
