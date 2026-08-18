import ragAxios from "utils/ragAxios";
import { Fuero, SentenciaTipo } from "./sentenciasCapturadas";
import { SentenciaResult, FullChunk } from "./sentenciasSearch";

// ── Servicio de búsqueda de sentencias por PROMPT (endpoint /ask) ──────────────
//
// DE DÓNDE SE CONSUME
//   Repositorio : pjn-rag-api  (github: cerramaximiliano/pjn-rag-service)
//   Servidor    : hub 15.229.93.121 — PM2 `pjn-rag-api`, /var/www/pjn-rag-service:5005
//   Dominio     : https://ia.lawanalytics.app  (VITE_RAG_URL → ragAxios)
//   Ruta        : POST /rag/sentencias/ask
//
// Migrado desde pjn-api en 2026-08 para que toda la búsqueda de sentencias salga
// de una sola API. El endpoint viejo (`POST /api/sentencias/ask` de **pjn-api**,
// PM2 `pjn/api` en el mismo hub) sigue existiendo y funcionando: la migración fue
// aditiva, se copiaron queryPlanner.js y citations.js a pjn-rag-api sin tocar el
// original. Si algo falla acá, revertir es cambiar este import por workersAxios y
// BASE por "/api/sentencias".
//
// Qué hace el endpoint, y en qué se diferencia de `api/sentenciasSearch`
// (POST /rag/sentencias/buscar, misma API, sin planner ni filtro por juzgado):
//   - acepta un prompt en lenguaje natural + filtros explícitos,
//   - soporta filtro por juzgado / sala / secretaría (payload Qdrant),
//   - opcionalmente interpreta el prompt con un query planner (si está habilitado
//     en la config del semantic worker), derivando filtros y estrategia.
// El toggle del planner vive en la colección `configuracion-semantic-worker`, que
// ambas APIs leen: activarlo desde esta vista afecta a las dos por igual.
// Los resultados comparten la forma SentenciaResult con /buscar, de modo que
// ambas vistas se pueden comparar 1:1.

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

const BASE = "/rag/sentencias";

const SentenciasAskService = {
	async ask(prompt: string, filters?: AskFilters, options?: AskOptions): Promise<AskResponse> {
		const res = await ragAxios.post<AskResponse>(BASE + "/ask", {
			prompt,
			filters: filters || {},
			options: options || {},
		});
		return res.data;
	},

	async getChunks(sentenciaId: string): Promise<FullChunk[]> {
		const res = await ragAxios.get<{ success: boolean; chunks: FullChunk[]; total: number }>(`${BASE}/${sentenciaId}/chunks`);
		return res.data.chunks;
	},
};

export default SentenciasAskService;
