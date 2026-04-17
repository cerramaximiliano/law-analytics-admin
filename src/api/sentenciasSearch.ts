import ragAxios from "utils/ragAxios";
import { Fuero, SentenciaTipo } from "./sentenciasCapturadas";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface MatchedChunk {
	index: number;
	sectionType: string;
	text: string;
	score: number;
}

export interface FullChunk {
	index: number;
	sectionType: string;
	text: string;
	matched: boolean;
	score?: number;
}

export interface SentenciaResult {
	sentencia: {
		_id: string;
		causaId: string;
		number: number;
		year: number;
		fuero: Fuero;
		caratula?: string;
		juzgado?: number;
		sala?: number;
		organizacion?: string;
		movimientoFecha?: string;
		movimientoTipo?: string;
		sentenciaTipo: SentenciaTipo;
		category?: string;
		aiSummary?: {
			content: string;
			status: "draft" | "approved";
			generatedAt?: string;
		};
	};
	score: number;
	matchedChunks: MatchedChunk[];
	fullChunks?: FullChunk[];
}

export interface SearchFilters {
	fuero?: Fuero;
	year?: number;
	sentenciaTipo?: SentenciaTipo;
	category?: "novelty" | "rutina";
	dateFrom?: string;
	dateTo?: string;
}

export interface SearchOptions {
	topK?: number;
	minScore?: number;
	includeFullText?: boolean;
}

export interface SearchResponse {
	results: SentenciaResult[];
	total: number;
	query?: string;
	sourceSentenciaId?: string;
	filters?: SearchFilters;
	latencyMs: {
		embedding: number;
		pinecone: number;
		enrichment: number;
		total: number;
	};
}

// ── Service ───────────────────────────────────────────────────────────────────

const BASE = "/rag/sentencias";

const SentenciasSearchService = {
	async buscar(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<SearchResponse> {
		const res = await ragAxios.post<{ success: boolean } & SearchResponse>(BASE + "/buscar", {
			query,
			filters: filters || {},
			options: options || {},
		});
		return res.data;
	},

	async buscarSimilares(sentenciaId: string, options?: SearchOptions): Promise<SearchResponse> {
		const res = await ragAxios.post<{ success: boolean } & SearchResponse>(BASE + "/buscar/similar", {
			sentenciaId,
			options: options || {},
		});
		return res.data;
	},

	async getChunks(sentenciaId: string): Promise<FullChunk[]> {
		const res = await ragAxios.get<{ success: boolean; chunks: FullChunk[]; total: number }>(`${BASE}/${sentenciaId}/chunks`);
		return res.data.chunks;
	},

	async getTexto(sentenciaId: string): Promise<string> {
		const res = await ragAxios.get<{ success: boolean; text: string }>(`${BASE}/${sentenciaId}/texto`);
		return res.data.text;
	},
};

export default SentenciasSearchService;
