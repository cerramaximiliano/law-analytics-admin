import adminAxios from "utils/adminAxios";

export type AiPlan = "free" | "standard" | "premium";

export interface AiUsageRow {
	_id: string;
	userId: string;
	period: string;
	plan: AiPlan;
	currentPlan?: AiPlan;
	subscriptionStatus?: string;
	count: number;
	tokensInput: number;
	tokensOutput: number;
	tokensTotal: number;
	costUsd: number;
	lastUsedAt?: string;
	createdAt: string;
	updatedAt: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	name?: string;
}

export interface AiUsagePagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface AiUsageStats {
	period: string;
	usersWithUsage: number;
	totalQueries: number;
	totalTokens: number;
	totalCostUsd: number;
}

export interface AiUsageMonthlyResponse {
	success: boolean;
	data: AiUsageRow[];
	pagination: AiUsagePagination;
	stats: AiUsageStats;
}

export interface AiUsageMonthlyFilters {
	period?: string;
	page?: number;
	limit?: number;
	search?: string;
	plan?: AiPlan;
	sortBy?: "count" | "tokensTotal" | "costUsd" | "lastUsedAt" | "email" | "plan";
	sortOrder?: "asc" | "desc";
}

export interface AiUsageLogEntry {
	_id: string;
	userId: string;
	period: string;
	plan: AiPlan;
	action: string;
	model: string;
	tokensInput: number;
	tokensOutput: number;
	tokensTotal: number;
	costUsd: number;
	streaming?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AiUsageBreakdown {
	byAction: Array<{ _id: string; count: number; tokensTotal: number; costUsd: number }>;
	byModel: Array<{ _id: string; count: number; tokensInput: number; tokensOutput: number; costUsd: number }>;
}

export interface AiUsageDetailResponse {
	success: boolean;
	data: AiUsageLogEntry[];
	pagination: AiUsagePagination;
	summary: AiUsageRow | null;
	breakdown: AiUsageBreakdown;
}

export interface AiUsagePeriodsResponse {
	success: boolean;
	data: string[];
}

export interface AiUsageResetResponse {
	success: boolean;
	message: string;
	data: AiUsageRow;
}

class AdminAiUsageService {
	static async getMonthly(filters: AiUsageMonthlyFilters = {}): Promise<AiUsageMonthlyResponse> {
		const params = new URLSearchParams();
		if (filters.period) params.append("period", filters.period);
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.search) params.append("search", filters.search);
		if (filters.plan) params.append("plan", filters.plan);
		if (filters.sortBy) params.append("sortBy", filters.sortBy);
		if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

		const response = await adminAxios.get<AiUsageMonthlyResponse>(`/api/ai-usage/monthly?${params.toString()}`);
		return response.data;
	}

	static async getPeriods(): Promise<AiUsagePeriodsResponse> {
		const response = await adminAxios.get<AiUsagePeriodsResponse>("/api/ai-usage/periods");
		return response.data;
	}

	static async getDetail(userId: string, period: string, page = 1, limit = 50): Promise<AiUsageDetailResponse> {
		const params = new URLSearchParams({ period, page: String(page), limit: String(limit) });
		const response = await adminAxios.get<AiUsageDetailResponse>(`/api/ai-usage/${userId}/detail?${params.toString()}`);
		return response.data;
	}

	static async reset(userId: string, period: string): Promise<AiUsageResetResponse> {
		const params = new URLSearchParams({ period });
		const response = await adminAxios.post<AiUsageResetResponse>(`/api/ai-usage/${userId}/reset?${params.toString()}`);
		return response.data;
	}
}

export default AdminAiUsageService;
