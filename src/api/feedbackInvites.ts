import adminAxios from "utils/adminAxios";

export type InviteType = "comment" | "survey";
export type InviteStatus = "active" | "used" | "expired" | "revoked";

export interface InviteUse {
	usedAt: string;
	ip?: string | null;
	userAgent?: string | null;
	feedbackId?: { _id: string; title?: string; content?: string; status?: string; createdAt?: string } | string | null;
	submittedBy?: { name?: string | null; email?: string | null };
}

export interface FeedbackInvite {
	_id: string;
	token: string;
	type: InviteType;
	surveyId?: { _id: string; title?: string; slug?: string; type?: string } | string | null;
	recipientEmail?: string | null;
	recipientName?: string | null;
	message?: string | null;
	createdBy?: { _id: string; email?: string; firstName?: string; lastName?: string } | string | null;
	expiresAt: string;
	maxUses: number;
	usedCount: number;
	uses: InviteUse[];
	revoked: boolean;
	revokedAt?: string | null;
	revokedBy?: { _id: string; email?: string } | string | null;
	createdAt: string;
	updatedAt: string;
	status: InviteStatus; // virtual
	url: string; // enriched by backend
}

export interface InviteFilters {
	page?: number;
	limit?: number;
	status?: InviteStatus | "";
	type?: InviteType | "";
	surveyId?: string;
	search?: string;
}

export interface InviteListResponse {
	success: boolean;
	items: FeedbackInvite[];
	total: number;
	page: number;
	limit: number;
}

export interface InviteCreateResponse {
	success: boolean;
	invite: FeedbackInvite;
	url: string;
}

export interface InviteCreatePayload {
	type: InviteType;
	surveyId?: string;
	recipientEmail?: string;
	recipientName?: string;
	message?: string;
	expiresInDays?: number;
}

class FeedbackInvitesService {
	static async list(filters: InviteFilters = {}): Promise<InviteListResponse> {
		const params = new URLSearchParams();
		Object.entries(filters).forEach(([k, v]) => {
			if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
		});
		const { data } = await adminAxios.get<InviteListResponse>(`/api/feedback-invites?${params.toString()}`);
		return data;
	}

	static async getById(id: string): Promise<{ success: boolean; invite: FeedbackInvite }> {
		const { data } = await adminAxios.get(`/api/feedback-invites/${id}`);
		return data;
	}

	static async create(payload: InviteCreatePayload): Promise<InviteCreateResponse> {
		const { data } = await adminAxios.post<InviteCreateResponse>(`/api/feedback-invites`, payload);
		return data;
	}

	static async revoke(id: string): Promise<{ success: boolean; invite: FeedbackInvite }> {
		const { data } = await adminAxios.post(`/api/feedback-invites/${id}/revoke`);
		return data;
	}

	static async remove(id: string): Promise<{ success: boolean; message: string }> {
		const { data } = await adminAxios.delete(`/api/feedback-invites/${id}`);
		return data;
	}
}

export default FeedbackInvitesService;
