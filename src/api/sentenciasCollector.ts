import pjnAxios from "utils/pjnAxios";

export type Fuero = "CIV" | "CSS" | "CNT" | "COM";

export interface FueroConfig {
	fuero: Fuero;
	enabled: boolean;
	collection?: string;
	yearFrom: number;
	yearTo: number;
	lastScannedId: string | null;
	totalScanned: number;
	totalEnqueued: number;
	completedFullScan: boolean;
	lastScanCompletedAt?: string;
}

export interface CollectorConfig {
	_id: string;
	name: string;
	enabled: boolean;
	cronPattern: string;
	batchSize: number;
	maxPendingQueue: number;
	fueros: FueroConfig[];
	aiSummary?: {
		systemPrompt: string | null;
		model: string;
	};
	currentState: {
		isRunning: boolean;
		workerId?: string;
		startedAt?: string;
		currentFuero?: string;
	};
	stats: {
		lastRunAt?: string;
		lastRunEnqueued: number;
		lastRunScanned: number;
		totalEnqueuedAllTime: number;
		totalScannedAllTime: number;
	};
	updatedAt: string;
}

export interface UpdateCollectorConfigPayload {
	enabled?: boolean;
	cronPattern?: string;
	batchSize?: number;
	maxPendingQueue?: number;
	fueros?: Partial<FueroConfig & { fuero: Fuero }>[];
	aiSummary?: {
		systemPrompt?: string | null;
		model?: string;
	};
}

const BASE = "/api/configuracion-sentencias-collector";

const CollectorService = {
	async getConfig(): Promise<CollectorConfig> {
		const res = await pjnAxios.get<{ success: boolean; data: CollectorConfig }>(BASE);
		return res.data.data;
	},

	async updateConfig(payload: UpdateCollectorConfigPayload): Promise<CollectorConfig> {
		const res = await pjnAxios.put<{ success: boolean; data: CollectorConfig }>(BASE, payload);
		return res.data.data;
	},

	async resetFueroCursor(fuero: Fuero): Promise<CollectorConfig> {
		const res = await pjnAxios.post<{ success: boolean; data: CollectorConfig }>(`${BASE}/${fuero}/reset-cursor`);
		return res.data.data;
	},

	async resetAllCursors(): Promise<CollectorConfig> {
		const res = await pjnAxios.post<{ success: boolean; data: CollectorConfig }>(`${BASE}/reset-all-cursors`);
		return res.data.data;
	},
};

export default CollectorService;
