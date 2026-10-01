import ragAxios from "utils/ragAxios";
import adminAxios from "utils/adminAxios";

// Registro de búsquedas de jurisprudencia:
//  - semántica (usuarios registrados): jurisprudencia-busquedas vía pjn-rag-api
//  - pública (visitantes, texto tradicional): jurisprudencia-busquedas-publicas vía admin-api

export interface SearchLogParams {
	days?: number;
	page?: number;
	limit?: number;
	zeroOnly?: boolean;
}

export interface SearchLogQueryStat {
	query: string;
	count: number;
	users?: number;
	avgResults?: number | null;
	last?: string;
}

export interface SemanticLogItem {
	id: string;
	userId: string;
	email: string | null;
	plan: string | null;
	consumer: string;
	tipo: "ask" | "buscar" | "similar";
	query: string;
	filters: Record<string, unknown> | null;
	total: number | null;
	latencyMs: number | null;
	createdAt: string;
}

export interface SemanticLogResponse {
	success: boolean;
	days: number;
	totals: { searches: number; users: number; zeroResults: number };
	byUser: Array<{
		userId: string;
		email: string | null;
		plan: string | null;
		consumer: string;
		searches: number;
		zeroResults: number;
		last: string;
	}>;
	topQueries: SearchLogQueryStat[];
	zeroQueries: SearchLogQueryStat[];
	items: SemanticLogItem[];
	page: number;
	limit: number;
	listTotal: number;
}

export interface PublicLogItem {
	id: string;
	query: string;
	fuero: string | null;
	jurisdiccion: string | null;
	total: number | null;
	esBot: boolean;
	createdAt: string;
}

export interface PublicLogResponse {
	days: number;
	totals: { searches: number; zeroResults: number };
	topQueries: SearchLogQueryStat[];
	zeroQueries: SearchLogQueryStat[];
	items: PublicLogItem[];
	page: number;
	limit: number;
	listTotal: number;
}

const SearchLogService = {
	async semantic(params: SearchLogParams & { userId?: string }): Promise<SemanticLogResponse> {
		const res = await ragAxios.get<SemanticLogResponse>("/rag/admin/search-log", { params });
		return res.data;
	},
	async publica(params: SearchLogParams & { bots?: boolean }): Promise<PublicLogResponse> {
		const res = await adminAxios.get<{ success: boolean; data: PublicLogResponse }>("/api/saij-campaigns/busquedas-publicas", {
			params,
		});
		return res.data.data;
	},
};

export default SearchLogService;
