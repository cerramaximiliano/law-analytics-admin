import adminAxios from "utils/adminAxios";

export type FeedbackType = "comment" | "survey_response" | "nps" | "rating" | "suggestion" | "bug";
export type FeedbackStatus = "pending" | "approved" | "rejected" | "published" | "archived";

export interface FeedbackAnswer {
	questionId: string;
	valueType: "text" | "number" | "rating" | "scale" | "single_choice" | "multi_choice" | "boolean";
	valueText?: string | null;
	valueNumber?: number | null;
	valueArray?: string[];
	valueBoolean?: boolean | null;
}

export interface FeedbackAuthorSnapshot {
	name?: string | null;
	email?: string | null;
	role?: string | null;
}

export interface FeedbackUserRef {
	_id: string;
	email?: string;
	firstName?: string;
	lastName?: string;
	role?: string;
}

export interface FeedbackSurveyRef {
	_id: string;
	title?: string;
	slug?: string;
	type?: string;
	questions?: Array<{
		id: string;
		type: string;
		question: string;
		required?: boolean;
		options?: Array<{ value: string; label: string }>;
	}>;
}

export interface UserFeedback {
	_id: string;
	type: FeedbackType;
	userId?: FeedbackUserRef | string | null;
	authorSnapshot?: FeedbackAuthorSnapshot | null;
	surveyId?: FeedbackSurveyRef | string | null;
	title?: string | null;
	content: string;
	rating?: number | null;
	answers: FeedbackAnswer[];
	context?: {
		page?: string | null;
		feature?: string | null;
		appVersion?: string | null;
		userAgent?: string | null;
	};
	consent: {
		allowPublish: boolean;
		allowContact: boolean;
		displayName?: string | null;
	};
	tags: string[];
	status: FeedbackStatus;
	moderation: {
		reviewedBy?: FeedbackUserRef | string | null;
		reviewedAt?: string | null;
		notes?: string | null;
		publishedAt?: string | null;
		rejectionReason?: string | null;
	};
	isPublic: boolean;
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
}

export interface FeedbackFilters {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	type?: FeedbackType | "";
	status?: FeedbackStatus | "";
	surveyId?: string;
	userId?: string;
	hasRating?: boolean;
	minRating?: number;
	maxRating?: number;
	tag?: string;
	isPublic?: boolean;
	consentPublish?: boolean;
	search?: string;
	startDate?: string;
	endDate?: string;
}

export interface FeedbackListResponse {
	success: boolean;
	items: UserFeedback[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface FeedbackResponse {
	success: boolean;
	feedback: UserFeedback;
	message?: string;
}

export interface FeedbackStatsResponse {
	success: boolean;
	byStatus: Array<{ _id: FeedbackStatus; count: number }>;
	byType: Array<{ _id: FeedbackType; count: number }>;
	avgRating: { avg: number | null; count: number };
	last30Days: Array<{ _id: string; count: number }>;
}

export interface UpdateFeedbackPayload {
	title?: string | null;
	content?: string;
	tags?: string[];
	isPublic?: boolean;
	moderation?: { notes?: string };
}

class FeedbackService {
	static async list(filters: FeedbackFilters = {}): Promise<FeedbackListResponse> {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
		});
		const { data } = await adminAxios.get<FeedbackListResponse>(`/api/feedback?${params.toString()}`);
		return data;
	}

	static async getById(id: string): Promise<FeedbackResponse> {
		const { data } = await adminAxios.get<FeedbackResponse>(`/api/feedback/${id}`);
		return data;
	}

	static async stats(): Promise<FeedbackStatsResponse> {
		const { data } = await adminAxios.get<FeedbackStatsResponse>(`/api/feedback/stats`);
		return data;
	}

	static async update(id: string, payload: UpdateFeedbackPayload): Promise<FeedbackResponse> {
		const { data } = await adminAxios.patch<FeedbackResponse>(`/api/feedback/${id}`, payload);
		return data;
	}

	static async remove(id: string): Promise<{ success: boolean; message: string }> {
		const { data } = await adminAxios.delete<{ success: boolean; message: string }>(`/api/feedback/${id}`);
		return data;
	}

	static async approve(id: string, notes?: string): Promise<FeedbackResponse> {
		const { data } = await adminAxios.post<FeedbackResponse>(`/api/feedback/${id}/approve`, { notes });
		return data;
	}

	static async publish(id: string, force = false): Promise<FeedbackResponse> {
		const { data } = await adminAxios.post<FeedbackResponse>(`/api/feedback/${id}/publish`, { force });
		return data;
	}

	static async unpublish(id: string): Promise<FeedbackResponse> {
		const { data } = await adminAxios.post<FeedbackResponse>(`/api/feedback/${id}/unpublish`);
		return data;
	}

	static async reject(id: string, reason?: string): Promise<FeedbackResponse> {
		const { data } = await adminAxios.post<FeedbackResponse>(`/api/feedback/${id}/reject`, { reason });
		return data;
	}

	static async bulkStatus(ids: string[], status: FeedbackStatus): Promise<{ success: boolean; modified: number }> {
		const { data } = await adminAxios.post<{ success: boolean; modified: number }>(`/api/feedback/bulk-status`, {
			ids,
			status,
		});
		return data;
	}
}

export default FeedbackService;
