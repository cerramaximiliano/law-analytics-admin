import pjnAxios from "utils/pjnAxios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export type SearchCorpusValue = "saij" | "all";
export type SearchCorpusConsumer = "app" | "mcp" | "public";
export type SearchCorpus = Record<SearchCorpusConsumer, SearchCorpusValue>;

// Consumidores del grifo, en el orden en que se muestran en la UI.
export const SEARCH_CORPUS_CONSUMERS: { key: SearchCorpusConsumer; label: string; help: string }[] = [
	{ key: "app", label: "App (/herramientas/jurisprudencia)", help: "Búsqueda in-app de law-analytics-front" },
	{ key: "mcp", label: "MCP (Claude / IA externas)", help: "Tool search_sentencias de la-mcp-server" },
	{
		key: "public",
		label: "Pública (/jurisprudencia)",
		help: "Vista sin login. Con \"Todo\" solo suma sentencias no-SAIJ con resumen aprobado y publicación 'published'",
	},
];

/** searchCorpus con los defaults del backend aplicados (ausente = 'saij'). */
export function normalizeSearchCorpus(sc?: Partial<SearchCorpus> | null): SearchCorpus {
	const pick = (v?: SearchCorpusValue) => (v === "all" ? "all" : "saij");
	return { app: pick(sc?.app), mcp: pick(sc?.mcp), public: pick(sc?.public) };
}

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
	// Corpus habilitado por consumidor ("grifo"). 'saij' = solo el corpus curado
	// público (~10k); 'all' = todo el corpus embebido (~320k, incluye sentencias
	// PJN de causas de usuarios). app/mcp los enfuerza pjn-rag-api; public lo
	// enfuerza law-analytics-server (vista pública /jurisprudencia). Un campo
	// ausente equivale a 'saij'.
	searchCorpus?: Partial<SearchCorpus>;
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
