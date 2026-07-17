import workersAxios from "utils/workersAxios";
import { Fuero, SentenciaTipo } from "./sentenciasCapturadas";
import { SentenciaResult, FullChunk } from "./sentenciasSearch";

// ── Servicio de búsqueda de sentencias por PROMPT (endpoint /ask) ──────────────
//
// A diferencia de `api/sentenciasSearch` (que pega a pjn-rag-api vía ragAxios y
// NO soporta filtro por juzgado/sala ni query planner), este servicio consume
// `POST /api/sentencias/ask` de **pjn-api** desplegada en worker_01, expuesta vía
// VITE_WORKERS_URL (workersAxios). Ese endpoint:
//   - acepta un prompt en lenguaje natural + filtros explícitos,
//   - soporta filtro por juzgado / sala / secretaría (payload Qdrant),
//   - opcionalmente interpreta el prompt con un query planner (si está habilitado
//     en la config del semantic worker), derivando filtros y estrategia.
// Los resultados comparten la misma forma (SentenciaResult) que la búsqueda de
// pjn-rag-api, de modo que ambas vistas se pueden comparar 1:1.

export interface AskFilters {
	fuero?: Fuero;
	juzgado?: number;
	sala?: number;
	secretaria?: number;
	year?: number;
	sentenciaTipo?: SentenciaTipo;
	category?: "novelty" | "rutina";
	dateFrom?: string;
	dateTo?: string;
}

export interface AskOptions {
	topK?: number;
	minScore?: number;
	includeFullText?: boolean;
}

// Plan derivado por el query planner (solo presente si el planner corrió).
export interface SearchPlan {
	semanticQuery?: string;
	lexicalTerms?: string[];
	filters?: Record<string, unknown>;
	strategy?: "semantic" | "lexical" | "hybrid";
	needsExactCitation?: boolean;
}

export interface AskResponse {
	success: boolean;
	results: SentenciaResult[];
	total: number;
	prompt: string;
	filters: AskFilters;
	latencyMs: {
		embedding: number;
		pinecone: number;
		enrichment: number;
		total: number;
	};
	// Metadata del planner (expuesta para evaluación desde la UI).
	plannerEnabled: boolean;
	plannerUsed: boolean;
	lexicalEnabled?: boolean;
	lexicalTerms?: string[];
	plan?: SearchPlan;
}

const BASE = "/api/sentencias";

const SentenciasAskService = {
	async ask(prompt: string, filters?: AskFilters, options?: AskOptions): Promise<AskResponse> {
		const res = await workersAxios.post<AskResponse>(BASE + "/ask", {
			prompt,
			filters: filters || {},
			options: options || {},
		});
		return res.data;
	},

	async getChunks(sentenciaId: string): Promise<FullChunk[]> {
		const res = await workersAxios.get<{ success: boolean; chunks: FullChunk[]; total: number }>(`${BASE}/${sentenciaId}/chunks`);
		return res.data.chunks;
	},
};

export default SentenciasAskService;
