import adminAxios from "utils/adminAxios";

// Types
export type ResourceType = "folder" | "contact" | "calculator" | "task" | "event";

export interface ResourceUser {
	_id: string;
	email: string;
	name?: string;
	firstName?: string;
	lastName?: string;
}

export interface BaseResource {
	_id: string;
	userId: ResourceUser | string;
	createdAt: string;
	updatedAt: string;
}

export interface FolderResource extends BaseResource {
	folderName: string;
	materia?: string;
	status?: string;
	archived?: boolean;
	causaVerified?: boolean;
	amount?: number;
}

export interface ContactResource extends BaseResource {
	name: string;
	lastName?: string;
	email?: string;
	phone?: string;
	type?: string;
	role?: string;
	archived?: boolean;
}

export interface CalculatorResource extends BaseResource {
	amount: number;
	type?: string;
	classType?: string;
	isVerified?: boolean;
	archived?: boolean;
	folderName?: string;
}

export interface TaskResource extends BaseResource {
	name: string;
	status?: string;
	priority?: string;
	dueDate?: string;
	checked?: boolean;
}

export interface EventResource extends BaseResource {
	title: string;
	type?: string;
	start: string;
	end?: string;
	allDay?: boolean;
}

export type Resource = FolderResource | ContactResource | CalculatorResource | TaskResource | EventResource;

export interface ResourceFilters {
	type: ResourceType;
	page?: number;
	limit?: number;
	search?: string;
	userId?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface ResourcesResponse {
	success: boolean;
	data: Resource[];
	pagination: PaginationInfo;
	stats: {
		total: number;
	};
}

export interface ResourcesStatsResponse {
	success: boolean;
	data: {
		folders: number;
		contacts: number;
		calculators: number;
		tasks: number;
		events: number;
		total: number;
	};
}

class AdminResourcesService {
	/**
	 * Get resources of a specific type with pagination
	 */
	static async getResources(filters: ResourceFilters): Promise<ResourcesResponse> {
		const params = new URLSearchParams();

		params.append("type", filters.type);
		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.search) params.append("search", filters.search);
		if (filters.userId) params.append("userId", filters.userId);
		if (filters.sortBy) params.append("sortBy", filters.sortBy);
		if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

		const response = await adminAxios.get<ResourcesResponse>(`/api/user-resources/all?${params.toString()}`);
		return response.data;
	}

	/**
	 * Get stats for all resource types
	 */
	static async getResourcesStats(): Promise<ResourcesStatsResponse> {
		const response = await adminAxios.get<ResourcesStatsResponse>("/api/user-resources/stats");
		return response.data;
	}
}

export default AdminResourcesService;
