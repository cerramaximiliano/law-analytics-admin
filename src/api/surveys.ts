import adminAxios from "utils/adminAxios";

export type SurveyType = "nps" | "csat" | "custom" | "poll" | "onboarding" | "churn";
export type SurveyStatus = "draft" | "active" | "paused" | "closed";
export type QuestionType = "text" | "long_text" | "rating" | "scale" | "single_choice" | "multi_choice" | "boolean";

export interface SurveyQuestionOption {
	value: string;
	label: string;
}

export interface SurveyQuestion {
	id: string;
	type: QuestionType;
	question: string;
	description?: string | null;
	required: boolean;
	options?: SurveyQuestionOption[];
	min?: number | null;
	max?: number | null;
	minLabel?: string | null;
	maxLabel?: string | null;
	order?: number;
}

export interface Survey {
	_id: string;
	title: string;
	slug: string;
	description?: string | null;
	type: SurveyType;
	questions: SurveyQuestion[];
	trigger?: {
		event?: string | null;
		page?: string | null;
		delayDays?: number;
		minSessions?: number;
	};
	targetAudience?: {
		roles?: string[];
		planIds?: string[];
		onlyActive?: boolean;
	};
	status: SurveyStatus;
	startDate?: string | null;
	endDate?: string | null;
	allowMultipleResponses: boolean;
	autoPublishResponses: boolean;
	createdBy?: { _id: string; email?: string; firstName?: string; lastName?: string } | string | null;
	updatedBy?: { _id: string; email?: string; firstName?: string; lastName?: string } | string | null;
	stats: {
		responseCount: number;
		lastResponseAt?: string | null;
	};
	createdAt: string;
	updatedAt: string;
}

export interface SurveyFilters {
	page?: number;
	limit?: number;
	status?: SurveyStatus | "";
	type?: SurveyType | "";
	search?: string;
}

export interface SurveyListResponse {
	success: boolean;
	items: Survey[];
	total: number;
	page: number;
	limit: number;
}

export interface SurveyResponse {
	success: boolean;
	survey: Survey;
}

export interface SurveyReportResponse {
	success: boolean;
	survey: Survey;
	totals: { responses: number; lastResponseAt: string | null };
	perQuestion: Array<{
		questionId: string;
		type: QuestionType;
		question: string;
		count: number;
		avg?: number | null;
		distribution?: Record<string, number>;
		samples?: string[];
	}>;
}

export type SurveyPayload = Partial<Omit<Survey, "_id" | "createdAt" | "updatedAt" | "stats" | "createdBy" | "updatedBy">>;

class SurveyAdminService {
	static async list(filters: SurveyFilters = {}): Promise<SurveyListResponse> {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
		});
		const { data } = await adminAxios.get<SurveyListResponse>(`/api/surveys?${params.toString()}`);
		return data;
	}

	static async getById(id: string): Promise<SurveyResponse> {
		const { data } = await adminAxios.get<SurveyResponse>(`/api/surveys/${id}`);
		return data;
	}

	static async create(payload: SurveyPayload): Promise<SurveyResponse> {
		const { data } = await adminAxios.post<SurveyResponse>(`/api/surveys`, payload);
		return data;
	}

	static async update(id: string, payload: SurveyPayload): Promise<SurveyResponse> {
		const { data } = await adminAxios.patch<SurveyResponse>(`/api/surveys/${id}`, payload);
		return data;
	}

	static async remove(id: string, force = false): Promise<{ success: boolean; message: string; responsesCount?: number }> {
		const q = force ? "?force=true" : "";
		const { data } = await adminAxios.delete(`/api/surveys/${id}${q}`);
		return data;
	}

	static async changeStatus(id: string, status: SurveyStatus): Promise<SurveyResponse> {
		const { data } = await adminAxios.post<SurveyResponse>(`/api/surveys/${id}/status`, { status });
		return data;
	}

	static async report(id: string): Promise<SurveyReportResponse> {
		const { data } = await adminAxios.get<SurveyReportResponse>(`/api/surveys/${id}/report`);
		return data;
	}
}

export default SurveyAdminService;
