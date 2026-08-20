import ragAxios from "utils/ragAxios";

// Uso de la búsqueda semántica de jurisprudencia (rag-usage-monthly, poblada
// por el middleware searchQuota de pjn-rag-api para TODOS los planes).

export interface SearchUsageBreakdown {
	searches: number;
	users: number;
}

export interface SearchUsageTopUser {
	userId: string;
	email: string | null;
	plan: string;
	consumer: string;
	searches: number;
}

export interface SearchUsageResponse {
	success: boolean;
	period: string;
	totals: SearchUsageBreakdown;
	byPlan: Array<SearchUsageBreakdown & { plan: string }>;
	byConsumer: Array<SearchUsageBreakdown & { consumer: string }>;
	topUsers: SearchUsageTopUser[];
	periods: string[];
}

const SearchUsageService = {
	async get(period?: string): Promise<SearchUsageResponse> {
		const res = await ragAxios.get<SearchUsageResponse>("/rag/admin/search-usage", {
			params: period ? { period } : undefined,
		});
		return res.data;
	},
};

export default SearchUsageService;
