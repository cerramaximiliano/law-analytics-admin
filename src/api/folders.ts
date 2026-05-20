import adminAxios from "utils/adminAxios";

// Types
export interface FolderUser {
	_id: string;
	email: string;
	name?: string;
	firstName?: string;
	lastName?: string;
}

export interface JudFolder {
	initialDateJudFolder?: string;
	finalDateJudFolder?: string;
	numberJudFolder?: string;
	statusJudFolder?: string;
	amountJudFolder?: string;
	descriptionJudFolder?: string;
	courtNumber?: string;
	secretaryNumber?: string;
}

export interface FolderJuris {
	item?: string | null;
	label?: string | null;
}

export interface ScrapingProgress {
	isComplete?: boolean;
	totalExpected?: number;
	totalProcessed?: number;
	status?: string;
}

export interface Folder {
	_id: string;
	folderName: string;
	materia: string;
	status: string;
	archived: boolean;
	pjn: boolean;
	mev: boolean;
	eje?: boolean;
	scba?: boolean;
	causaId?: string;
	causaType?: string;
	folderJuris?: FolderJuris;
	folderFuero?: string;
	judFolder?: JudFolder;
	initialDateFolder?: string;
	finalDateFolder?: string;
	amount?: number;
	userId?: string;
	groupId?: string;
	causaVerified?: boolean;
	causaIsValid?: boolean;
	causaUpdateEnabled?: boolean;
	causaAssociationStatus?: string;
	causaAssociationError?: string;
	causaLastSyncDate?: string;
	lastMovementDate?: string;
	scrapingProgress?: ScrapingProgress;
	/** @deprecated usar listRemoved + listRemovedSource='pjn' */
	pjnNotFound?: boolean;
	/** La causa ya no aparece en el listado "Mis Causas" del portal origen. */
	listRemoved?: boolean;
	listRemovedAt?: string;
	listRemovedSource?: "pjn" | "scba" | "mev" | "eje";
	createdAt: string;
	updatedAt: string;
	user?: FolderUser;
}

export interface Causa {
	_id: string;
	number: number;
	year: number;
	caratula?: string;
	objeto?: string;
	juzgado?: number;
	secretaria?: number;
	fuero?: string;
	verified?: boolean;
	isValid?: boolean;
	update?: boolean;
	fechaInicio?: string;
	fechaUltimoMovimiento?: string;
	movimientosCount?: number;
	source?: string;
	scrapingProgress?: ScrapingProgress;
	updateHistory?: any[];
	movimiento?: any[];
	createdAt?: string;
	updatedAt?: string;
}

export interface FolderWithCausa extends Folder {
	causa?: Causa;
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface FolderStats {
	total: number;
	archived: number;
	active: number;
	pjn: number;
	mev: number;
	eje?: number;
	scba?: number;
	withCausa: number;
	verified: number;
	valid?: number;
	byStatus?: Record<string, number>;
	byFuero?: Record<string, number>;
	byCausaType?: Record<string, number>;
}

export interface FoldersResponse {
	success: boolean;
	data: Folder[];
	pagination: PaginationInfo;
	stats: FolderStats;
}

export interface FolderResponse {
	success: boolean;
	data: FolderWithCausa;
}

export interface CausaResponse {
	success: boolean;
	data: Causa;
}

export interface FolderStatsResponse {
	success: boolean;
	data: FolderStats;
}

export interface FoldersFilters {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	search?: string;
	userId?: string;
	status?: string;
	archived?: boolean;
	pjn?: boolean;
	mev?: boolean;
	eje?: boolean;
	scba?: boolean;
	causaType?: string;
	fuero?: string;
}

class FoldersService {
	/**
	 * Get all folders with pagination and filters
	 */
	static async getFolders(filters: FoldersFilters = {}): Promise<FoldersResponse> {
		const params = new URLSearchParams();

		if (filters.page) params.append("page", String(filters.page));
		if (filters.limit) params.append("limit", String(filters.limit));
		if (filters.sortBy) params.append("sortBy", filters.sortBy);
		if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
		if (filters.search) params.append("search", filters.search);
		if (filters.userId) params.append("userId", filters.userId);
		if (filters.status) params.append("status", filters.status);
		if (filters.archived !== undefined) params.append("archived", String(filters.archived));
		if (filters.pjn !== undefined) params.append("pjn", String(filters.pjn));
		if (filters.mev !== undefined) params.append("mev", String(filters.mev));
		if (filters.eje !== undefined) params.append("eje", String(filters.eje));
		if (filters.scba !== undefined) params.append("scba", String(filters.scba));
		if (filters.causaType) params.append("causaType", filters.causaType);
		if (filters.fuero) params.append("fuero", filters.fuero);

		const response = await adminAxios.get<FoldersResponse>(`/api/folders?${params.toString()}`);
		return response.data;
	}

	/**
	 * Get a single folder by ID with linked causa
	 */
	static async getFolderById(folderId: string): Promise<FolderResponse> {
		const response = await adminAxios.get<FolderResponse>(`/api/folders/${folderId}`);
		return response.data;
	}

	/**
	 * Get causa details for a folder
	 */
	static async getFolderCausa(folderId: string): Promise<CausaResponse> {
		const response = await adminAxios.get<CausaResponse>(`/api/folders/${folderId}/causa`);
		return response.data;
	}

	/**
	 * Update a folder
	 */
	static async updateFolder(folderId: string, data: Partial<Folder>): Promise<FolderResponse> {
		const response = await adminAxios.put<FolderResponse>(`/api/folders/${folderId}`, data);
		return response.data;
	}

	/**
	 * Delete a folder
	 */
	static async deleteFolder(folderId: string): Promise<{ success: boolean; message: string }> {
		const response = await adminAxios.delete(`/api/folders/${folderId}`);
		return response.data;
	}

	/**
	 * Get folder statistics
	 */
	static async getFoldersStats(): Promise<FolderStatsResponse> {
		const response = await adminAxios.get<FolderStatsResponse>("/api/folders/stats");
		return response.data;
	}

	/**
	 * Update a causa and sync changes to linked folders
	 */
	static async updateCausaAndSync(
		causaId: string,
		causaType: string,
		data: Partial<Causa>,
	): Promise<{
		success: boolean;
		message: string;
		data: {
			causa: Causa;
			sync: {
				foldersFound: number;
				foldersUpdated: number;
				updatedFolderIds: string[];
				syncedFields: string[];
			};
		};
	}> {
		const response = await adminAxios.put(`/api/folders/causa/${causaId}`, {
			causaType,
			...data,
		});
		return response.data;
	}

	/**
	 * Batch lookup en emaillogs por folderId. Devuelve por cada folder el count
	 * total de envíos y el último (status, sentAt, subject, sesMessageId).
	 */
	static async getEmailLogsBatch(folderIds: string[]): Promise<{
		success: boolean;
		data: Record<
			string,
			{
				count: number;
				last: {
					sentAt: string;
					status: "sent" | "failed" | "bounced" | "complained" | "delivered";
					subject: string | null;
					templateName: string | null;
					templateCategory: string | null;
					source: string | null;
					sesMessageId: string | null;
					errorMessage: string | null;
					eventType: string | null;
				} | null;
			}
		>;
	}> {
		if (!folderIds.length) return { success: true, data: {} };
		const response = await adminAxios.post(`/api/folders/email-logs/batch`, { folderIds });
		return response.data;
	}

	/**
	 * Bulk: vuelve a hacer elegibles folders para que pjn-workers / mev-workers /
	 * eje-workers los procesen.
	 *
	 * - PJN: crea (si no existe) o asocia el doc en CausasXXX y marca la asociación pending.
	 * - MEV/EJE: re-trigger sobre asociaciones existentes (requiere causaId previo).
	 */
	static async retryCausaAssociation(
		folderIds: string[],
		hasPaidSubscription: boolean = false,
	): Promise<{
		success: boolean;
		data: {
			summary: {
				totalRequested: number;
				validIds: number;
				notFound: number;
				queued: number;
				skipped: number;
				failed: number;
			};
			results: Array<{
				folderId: string;
				platform: "pjn" | "mev" | "eje" | null;
				status: "queued" | "skipped" | "failed";
				causaId?: string;
				causaType?: string;
				reason?: string;
				note?: string;
			}>;
			notFoundIds: string[];
		};
	}> {
		const response = await adminAxios.post(`/api/folders/retry-causa-association`, {
			folderIds,
			hasPaidSubscription,
		});
		return response.data;
	}
}

export default FoldersService;
