import adminAxios from "utils/adminAxios";

// ======================== TYPES ========================

// Folder types
export interface UserFolder {
	_id: string;
	folderName: string;
	materia: string;
	status: string;
	archived: boolean;
	initialDateFolder?: string;
	finalDateFolder?: string;
	amount?: number;
	calculatorsCount?: number;
	contactsCount?: number;
	agendaCount?: number;
	documentsCount?: number;
	tasksCount?: number;
	movementsCount?: number;
	causaVerified?: boolean;
	causaIsValid?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface FolderStats {
	total: number;
	archived: number;
	active: number;
	withCausa: number;
	totalAmount: number;
	byStatus: Record<string, number>;
}

// Calculator types
export interface UserCalculator {
	_id: string;
	type: string;
	classType: string;
	subClassType?: string;
	amount: number;
	capital?: number;
	interest?: number;
	folderName?: string;
	description?: string;
	date?: string;
	archived: boolean;
	active: boolean;
	isVerified?: boolean;
	verifiedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CalculatorStats {
	total: number;
	archived: number;
	active: number;
	verified: number;
	totalAmount: number;
	totalCapital: number;
	totalInterest: number;
	byClassType: Record<string, { count: number; totalAmount: number }>;
}

// Contact types
export interface UserContact {
	_id: string;
	name: string;
	lastName: string;
	role: string;
	type: string;
	email?: string;
	phone?: string;
	state?: string;
	city?: string;
	company?: string;
	archived: boolean;
	folderIds?: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ContactStats {
	total: number;
	archived: number;
	active: number;
	withEmail: number;
	withPhone: number;
	linkedToFolders: number;
	byRole: Record<string, number>;
	byType: Record<string, number>;
}

// Pagination
export interface Pagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
}

// ======================== RESPONSE INTERFACES ========================

export interface UserFoldersResponse {
	success: boolean;
	data: UserFolder[];
	pagination: Pagination;
	stats: FolderStats;
}

export interface UserCalculatorsResponse {
	success: boolean;
	data: UserCalculator[];
	pagination: Pagination;
	stats: CalculatorStats;
}

export interface UserContactsResponse {
	success: boolean;
	data: UserContact[];
	pagination: Pagination;
	stats: ContactStats;
}

export interface UserResourcesSummaryResponse {
	success: boolean;
	data: {
		folders: {
			total: number;
			archived: number;
			active: number;
			withCausa: number;
			totalAmount: number;
		};
		calculators: {
			total: number;
			archived: number;
			active: number;
			verified: number;
			totalAmount: number;
		};
		contacts: {
			total: number;
			archived: number;
			active: number;
		};
	};
}

// ======================== QUERY PARAMS ========================

export interface UserResourcesListParams {
	page?: number;
	limit?: number;
	archived?: string;
	classType?: string; // For calculators
}

// ======================== SERVICE ========================

export class UserResourcesService {
	private static readonly BASE_PATH = "/api/user-resources";

	/**
	 * GET /api/user-resources/:userId/summary
	 * Get summary of all resources for a user
	 */
	static async getSummary(userId: string): Promise<UserResourcesSummaryResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/${userId}/summary`);
		return response.data;
	}

	/**
	 * GET /api/user-resources/:userId/folders
	 * Get all folders for a user
	 */
	static async getFolders(userId: string, params: UserResourcesListParams = {}): Promise<UserFoldersResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/${userId}/folders`, { params });
		return response.data;
	}

	/**
	 * GET /api/user-resources/:userId/calculators
	 * Get all calculators for a user
	 */
	static async getCalculators(userId: string, params: UserResourcesListParams = {}): Promise<UserCalculatorsResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/${userId}/calculators`, { params });
		return response.data;
	}

	/**
	 * GET /api/user-resources/:userId/contacts
	 * Get all contacts for a user
	 */
	static async getContacts(userId: string, params: UserResourcesListParams = {}): Promise<UserContactsResponse> {
		const response = await adminAxios.get(`${this.BASE_PATH}/${userId}/contacts`, { params });
		return response.data;
	}
}

export default UserResourcesService;
