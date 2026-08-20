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
	// Router de consulta por prompt en la búsqueda de sentencias (opcional/experimental).
	searchQueryPlanner?: {
		enabled: boolean;
		model: string;
	};
	// Capa léxica: filtro por citas exactas (art/ley) en la búsqueda (opcional).
	searchLexicalLayer?: {
		enabled: boolean;
	};
	// Corpus habilitado para la búsqueda semántica, por consumidor. 'saij' = solo
	// el corpus curado público (~10k); 'all' = todo el corpus embebido (~320k,
	// incluye sentencias PJN de causas de usuarios). Lo enfuerza pjn-rag-api.
	searchCorpus?: {
		app: "saij" | "all";
		mcp: "saij" | "all";
	};
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
		| "enabled"
		| "minCorpusSize"
		| "similarityThreshold"
		| "filterByFuero"
		| "filterBySentenciaTipo"
		| "topK"
		| "batchSize"
		| "cronPattern"
		| "searchQueryPlanner"
		| "searchLexicalLayer"
		| "searchCorpus"
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
