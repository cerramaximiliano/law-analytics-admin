import adminAxios from "utils/adminAxios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfField {
	name: string;
	label: string;
	type: "text" | "multiline" | "date" | "radio" | "checkbox" | "flow-section";
	group?: string;
	required?: boolean;
	placeholder?: string;
	order?: number;
	x?: number;
	y?: number;
	fontSize?: number;
	maxWidth?: number;
	inFlowSection?: boolean;
}

export interface PdfTemplate {
	_id: string;
	name: string;
	slug: string;
	description: string;
	category: "postal" | "laboral" | "judicial" | "societario" | "notarial" | "otros";
	s3Key: string;
	fields?: PdfField[];
	isActive: boolean;
	isPublic: boolean;
	fillConfig?: { flatten?: boolean };
	fillMethod: "acroform" | "overlay";
	source: "system" | "user";
	modelType: "static" | "dynamic";
	supportsTracking: boolean;
	userId?: string | null;
	presignedUrl?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PdfTemplateStats {
	totals: {
		total: number;
		active: number;
		public: number;
		supportsTracking: number;
	};
	byCategory: Array<{ _id: string; count: number; active: number }>;
	bySource: Array<{ _id: string; count: number }>;
	byModelType: Array<{ _id: string; count: number }>;
	byFillMethod: Array<{ _id: string; count: number }>;
}

export interface PdfTemplateFilters {
	page?: number;
	limit?: number;
	category?: string;
	isActive?: boolean;
	isPublic?: boolean;
	source?: string;
	modelType?: string;
	supportsTracking?: boolean;
	fillMethod?: string;
	search?: string;
}

export interface PdfTemplateListResponse {
	success: boolean;
	message: string;
	data: PdfTemplate[];
	count: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface PdfTemplateInput {
	name: string;
	slug: string;
	description?: string;
	category?: PdfTemplate["category"];
	s3Key: string;
	fields?: PdfField[];
	isActive?: boolean;
	isPublic?: boolean;
	fillMethod?: PdfTemplate["fillMethod"];
	fillConfig?: { flatten?: boolean };
	source?: PdfTemplate["source"];
	modelType?: PdfTemplate["modelType"];
	supportsTracking?: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

class PdfTemplatesAdminService {
	static BASE = "/api/pdf-templates";

	static async getAll(filters: PdfTemplateFilters = {}): Promise<PdfTemplateListResponse> {
		const params = new URLSearchParams();
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.category) params.append("category", filters.category);
		if (filters.isActive !== undefined) params.append("isActive", String(filters.isActive));
		if (filters.isPublic !== undefined) params.append("isPublic", String(filters.isPublic));
		if (filters.source) params.append("source", filters.source);
		if (filters.modelType) params.append("modelType", filters.modelType);
		if (filters.supportsTracking !== undefined) params.append("supportsTracking", String(filters.supportsTracking));
		if (filters.fillMethod) params.append("fillMethod", filters.fillMethod);
		if (filters.search) params.append("search", filters.search);
		const response = await adminAxios.get(`${this.BASE}?${params.toString()}`);
		return response.data;
	}

	static async getStats(): Promise<{ success: boolean; data: PdfTemplateStats }> {
		const response = await adminAxios.get(`${this.BASE}/stats`);
		return response.data;
	}

	static async getById(id: string): Promise<{ success: boolean; data: PdfTemplate }> {
		const response = await adminAxios.get(`${this.BASE}/${id}`);
		return response.data;
	}

	static async getBySlug(slug: string): Promise<{ success: boolean; data: PdfTemplate }> {
		const response = await adminAxios.get(`${this.BASE}/slug/${slug}`);
		return response.data;
	}

	static async getPresignedUrl(id: string): Promise<{ success: boolean; data: { presignedUrl: string; expiresIn: number; s3Key: string } }> {
		const response = await adminAxios.get(`${this.BASE}/${id}/presigned-url`);
		return response.data;
	}

	static async create(data: PdfTemplateInput): Promise<{ success: boolean; data: PdfTemplate }> {
		const response = await adminAxios.post(`${this.BASE}`, data);
		return response.data;
	}

	static async update(id: string, data: Partial<PdfTemplateInput>): Promise<{ success: boolean; data: PdfTemplate }> {
		const response = await adminAxios.put(`${this.BASE}/${id}`, data);
		return response.data;
	}

	static async toggleActive(id: string): Promise<{ success: boolean; data: { _id: string; slug: string; isActive: boolean } }> {
		const response = await adminAxios.patch(`${this.BASE}/${id}/toggle-active`);
		return response.data;
	}

	static async remove(id: string): Promise<{ success: boolean; message: string }> {
		const response = await adminAxios.delete(`${this.BASE}/${id}`);
		return response.data;
	}
}

export default PdfTemplatesAdminService;
