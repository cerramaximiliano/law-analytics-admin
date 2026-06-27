import adminAxios from "utils/adminAxios";

// Interfaces
export interface ScbaCredential {
	_id: string;
	userId: string;
	userName: string;
	userEmail: string;
	userPhone?: string;
	usernameMasked: string;
	enabled: boolean;
	verified: boolean;
	verifiedAt: string | null;
	isExpired: boolean;
	syncStatus: "pending" | "in_progress" | "completed" | "error" | "never_synced" | "idle";
	lastSync: string | null;
	lastSyncAttempt: string | null;
	consecutiveErrors: number;
	lastError: {
		message: string;
		date: string;
		code: string;
	} | null;
	stats?: {
		totalCausasFound: number;
		causasCreated: number;
		causasLinked: number;
		causasSkipped: number;
		errors: number;
	};
	currentSyncProgress?: {
		startedAt: string;
		currentPage: number;
		totalPages: number;
		causasFound: number;
		causasProcessed: number;
		causasCreated: number;
		progress: number;
	} | null;
	linkedCausasCount: number;
	// Auditoría de desvinculación (presente cuando syncStatus === "idle")
	unlinkedAt?: string | null;
	unlinkedMode?: "keep" | "delete" | null;
	unlinkedSource?: "user" | "team" | null;
	unlinkedByName?: string | null;
	unlinkedByEmail?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ScbaCredentialDetail extends ScbaCredential {
	userCreatedAt?: string;
	syncHistory?: {
		date: string;
		totalCausas: number;
		causasCreated: number;
		causasLinked: number;
		durationSeconds: number;
		pagesProcessed: number;
	}[];
	linkedCausaIds?: string[];
	// Recordatorios de credencial inválida (ver "Recorrido de recordatorios")
	reminderCount?: number;
	lastReminderAt?: string | null;
	errorNotifiedAt?: string | null;
	reminderHistory?: {
		date: string;
		reminderNumber: number;
		to: string;
		templateName: string;
		status: string;
	}[];
}

export interface ScbaCredentialsFilters {
	page?: number;
	limit?: number;
	syncStatus?: string;
	verified?: string;
	enabled?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ScbaCredentialsListResponse {
	success: boolean;
	data: ScbaCredential[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface ScbaCredentialResponse {
	success: boolean;
	data: ScbaCredentialDetail;
	message?: string;
}

export interface ScbaCredentialsStatsResponse {
	success: boolean;
	data: {
		total: number;
		enabled: number;
		disabled: number;
		verified: number;
		notVerified: number;
		syncStatus: {
			pending: number;
			inProgress: number;
			completed: number;
			error: number;
			neverSynced: number;
		};
		totals: {
			causasFound: number;
			causasCreated: number;
			causasLinked: number;
		};
	};
}

export interface GenericResponse {
	success: boolean;
	message?: string;
	data?: any;
}

export interface CreateCredentialPayload {
	userId: string;
	username: string;
	password: string;
	description?: string;
}

// Servicio de Credenciales SCBA (Admin)
class ScbaCredentialsService {
	/**
	 * Crear credenciales SCBA para un usuario
	 */
	async createCredential(payload: CreateCredentialPayload): Promise<GenericResponse> {
		const response = await adminAxios.post("/api/scba-credentials", payload);
		return response.data;
	}

	/**
	 * Obtener lista de credenciales con paginación y filtros
	 */
	async getCredentials(filters: ScbaCredentialsFilters = {}): Promise<ScbaCredentialsListResponse> {
		const response = await adminAxios.get("/api/scba-credentials", { params: filters });
		return response.data;
	}

	/**
	 * Obtener estadísticas de credenciales
	 */
	async getStats(): Promise<ScbaCredentialsStatsResponse> {
		const response = await adminAxios.get("/api/scba-credentials/stats");
		return response.data;
	}

	/**
	 * Obtener detalle de una credencial
	 */
	async getCredentialById(id: string): Promise<ScbaCredentialResponse> {
		const response = await adminAxios.get(`/api/scba-credentials/${id}`);
		return response.data;
	}

	/**
	 * Habilitar o deshabilitar credencial
	 */
	async toggleCredential(id: string, enabled: boolean): Promise<GenericResponse> {
		const response = await adminAxios.patch(`/api/scba-credentials/${id}/toggle`, { enabled });
		return response.data;
	}

	/**
	 * Resetear credencial para re-sincronización (no toca causas)
	 */
	async resetCredential(id: string): Promise<GenericResponse> {
		const response = await adminAxios.post(`/api/scba-credentials/${id}/reset`);
		return response.data;
	}

	/**
	 * Resetear sincronización y eliminar/desvincular causas
	 */
	async resetAndCleanCausas(id: string): Promise<GenericResponse> {
		const response = await adminAxios.post(`/api/scba-credentials/${id}/reset-and-clean`);
		return response.data;
	}

	/**
	 * Eliminar credencial
	 */
	async deleteCredential(id: string): Promise<GenericResponse> {
		const response = await adminAxios.delete(`/api/scba-credentials/${id}`);
		return response.data;
	}
}

export default new ScbaCredentialsService();
