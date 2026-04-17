import adminAxios from "utils/adminAxios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PostalDocUser {
	_id: string;
	name?: string;
	email?: string;
}

export interface PostalDocument {
	_id: string;
	userId: PostalDocUser | string;
	groupId?: string | null;
	pdfTemplateId: string;
	templateSlug: string;
	templateName: string;
	templateCategory: string;
	supportsTracking: boolean;
	title: string;
	description: string;
	formData: Record<string, unknown>;
	s3Key: string | null;
	status: "draft" | "generated" | "sent" | "archived";
	generatedAt: string | null;
	linkedTrackingId?: string | null;
	linkedFolderId?: string | null;
	linkedContactId?: string | null;
	tags: string[];
	sentAt: string | null;
	sentVia: "correo" | "email" | "manual" | null;
	presignedUrl?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PostalDocumentStats {
	totals: {
		total: number;
		generated: number;
		draft: number;
		sent: number;
		archived: number;
		createdToday: number;
		createdLast30Days: number;
	};
	byStatus: Array<{ _id: string; count: number }>;
	byTemplate: Array<{ _id: string; templateName: string; count: number }>;
	byCategory: Array<{ _id: string; count: number }>;
	topUsers: Array<{ userId: string; userName?: string; userEmail?: string; count: number }>;
	recentActivityToday: PostalDocument[];
}

export interface PostalDocFilters {
	page?: number;
	limit?: number;
	userId?: string;
	templateSlug?: string;
	status?: string;
	templateCategory?: string;
	search?: string;
	startDate?: string;
	endDate?: string;
}

export interface PostalDocListResponse {
	success: boolean;
	message: string;
	data: PostalDocument[];
	count: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface PostalDocStatsResponse {
	success: boolean;
	message: string;
	data: PostalDocumentStats;
}

// ── Service ───────────────────────────────────────────────────────────────────

class PostalDocumentsAdminService {
	static BASE = "/api/postal-documents";

	static async getAll(filters: PostalDocFilters = {}): Promise<PostalDocListResponse> {
		const params = new URLSearchParams();
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.userId) params.append("userId", filters.userId);
		if (filters.templateSlug) params.append("templateSlug", filters.templateSlug);
		if (filters.status) params.append("status", filters.status);
		if (filters.templateCategory) params.append("templateCategory", filters.templateCategory);
		if (filters.search) params.append("search", filters.search);
		if (filters.startDate) params.append("startDate", filters.startDate);
		if (filters.endDate) params.append("endDate", filters.endDate);
		const response = await adminAxios.get(`${this.BASE}?${params.toString()}`);
		return response.data;
	}

	static async getStats(): Promise<PostalDocStatsResponse> {
		const response = await adminAxios.get(`${this.BASE}/stats`);
		return response.data;
	}

	static async getByUser(userId: string, filters: Omit<PostalDocFilters, "userId"> = {}): Promise<PostalDocListResponse> {
		const params = new URLSearchParams();
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.status) params.append("status", filters.status);
		if (filters.templateSlug) params.append("templateSlug", filters.templateSlug);
		const response = await adminAxios.get(`${this.BASE}/by-user/${userId}?${params.toString()}`);
		return response.data;
	}

	static async getByTemplate(slug: string, filters: Omit<PostalDocFilters, "templateSlug"> = {}): Promise<PostalDocListResponse> {
		const params = new URLSearchParams();
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.status) params.append("status", filters.status);
		const response = await adminAxios.get(`${this.BASE}/by-template/${slug}?${params.toString()}`);
		return response.data;
	}

	static async getById(id: string): Promise<{ success: boolean; data: PostalDocument }> {
		const response = await adminAxios.get(`${this.BASE}/${id}`);
		return response.data;
	}

	static async getPresignedUrl(id: string): Promise<{ success: boolean; data: { presignedUrl: string; expiresIn: number } }> {
		const response = await adminAxios.get(`${this.BASE}/${id}/presigned-url`);
		return response.data;
	}

	static async updateStatus(id: string, status: PostalDocument["status"]): Promise<{ success: boolean; data: PostalDocument }> {
		const response = await adminAxios.patch(`${this.BASE}/${id}/status`, { status });
		return response.data;
	}

	static async remove(id: string): Promise<{ success: boolean; message: string }> {
		const response = await adminAxios.delete(`${this.BASE}/${id}`);
		return response.data;
	}

	static async bulkDelete(ids: string[]): Promise<{ success: boolean; message: string; data: { deleted: number } }> {
		const response = await adminAxios.post(`${this.BASE}/bulk-delete`, { ids });
		return response.data;
	}

	static async bulkUpdateStatus(
		ids: string[],
		status: PostalDocument["status"],
	): Promise<{ success: boolean; message: string; data: { modified: number } }> {
		const response = await adminAxios.post(`${this.BASE}/bulk-status`, { ids, status });
		return response.data;
	}
}

export default PostalDocumentsAdminService;
