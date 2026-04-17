import pjnAxios from "utils/pjnAxios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SemanticWorkerConfig {
	_id: string;
	name: string;
	enabled: boolean;
	minCorpusSize: number;
	similarityThreshold: number;
	filterByFuero: boolean;
	filterBySentenciaTipo: boolean;
	topK: number;
	batchSize: number;
	cronPattern: string;
	currentState: {
		isRunning: boolean;
		workerId?: string;
		lastRunAt?: string;
		lastRunDoubles: number;
		lastRunRejected: number;
	};
	updatedAt?: string;
}

export type SemanticWorkerConfigUpdate = Partial<
	Pick<
		SemanticWorkerConfig,
		"enabled" | "minCorpusSize" | "similarityThreshold" | "filterByFuero" | "filterBySentenciaTipo" | "topK" | "batchSize" | "cronPattern"
	>
>;

// ── Service ───────────────────────────────────────────────────────────────────

const BASE = "/api/configuracion-semantic-worker";

const SemanticWorkerService = {
	async getConfig(): Promise<SemanticWorkerConfig> {
		const res = await pjnAxios.get<{ success: boolean; data: SemanticWorkerConfig }>(BASE);
		return res.data.data;
	},

	async updateConfig(data: SemanticWorkerConfigUpdate): Promise<SemanticWorkerConfig> {
		const res = await pjnAxios.put<{ success: boolean; data: SemanticWorkerConfig }>(BASE, data);
		return res.data.data;
	},
};

export default SemanticWorkerService;
