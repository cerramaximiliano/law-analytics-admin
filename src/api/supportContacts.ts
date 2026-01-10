import adminAxios from "utils/adminAxios";

// Interfaces
export interface SupportContact {
	_id: string;
	name: string;
	email: string;
	subject: string;
	priority: "low" | "medium" | "high" | "urgent";
	message: string;
	status: "pending" | "in-progress" | "resolved" | "closed";
	assignedTo: {
		_id: string;
		email: string;
		name?: string;
		firstName?: string;
		lastName?: string;
	} | null;
	createdAt: string;
	updatedAt: string;
}

export interface SupportContactFilters {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	status?: string;
	priority?: string;
	email?: string;
	search?: string;
	assignedTo?: string;
	startDate?: string;
	endDate?: string;
}

export interface SupportContactsListResponse {
	success: boolean;
	message: string;
	data: SupportContact[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
}

export interface SupportContactResponse {
	success: boolean;
	message: string;
	data: SupportContact;
}

export interface SupportContactStatsResponse {
	success: boolean;
	message: string;
	data: {
		general: {
			total: number;
			pending: number;
			inProgress: number;
			resolved: number;
			closed: number;
		};
		byPriority: Array<{
			priority: string;
			count: number;
		}>;
		byDay: Array<{
			_id: string;
			count: number;
		}>;
		urgentPending: number;
		unassigned: number;
	};
}

export interface UpdateSupportContactData {
	status?: "pending" | "in-progress" | "resolved" | "closed";
	priority?: "low" | "medium" | "high" | "urgent";
	assignedTo?: string | null;
}

export interface BulkDeleteResponse {
	success: boolean;
	message: string;
	data: {
		requested: number;
		deleted: number;
	};
}

export interface BulkStatusUpdateResponse {
	success: boolean;
	message: string;
	data: {
		requested: number;
		modified: number;
	};
}

export interface ReplyData {
	replyMessage: string;
	changeStatus?: boolean;
}

export interface ReplyResponse {
	success: boolean;
	message: string;
	data: {
		contactId: string;
		email: string;
		status: string;
	};
}

// Service
class SupportContactsService {
	/**
	 * Obtener lista de contactos de soporte con paginación y filtros
	 */
	static async getSupportContacts(filters: SupportContactFilters = {}): Promise<SupportContactsListResponse> {
		try {
			const params = new URLSearchParams();
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== "") {
					params.append(key, String(value));
				}
			});
			const response = await adminAxios.get<SupportContactsListResponse>(`/api/support-contacts?${params.toString()}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener contactos de soporte");
		}
	}

	/**
	 * Obtener un contacto de soporte por ID
	 */
	static async getSupportContactById(id: string): Promise<SupportContactResponse> {
		try {
			const response = await adminAxios.get<SupportContactResponse>(`/api/support-contacts/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener contacto de soporte");
		}
	}

	/**
	 * Obtener estadísticas de contactos de soporte
	 */
	static async getSupportStats(params: { startDate?: string; endDate?: string } = {}): Promise<SupportContactStatsResponse> {
		try {
			const queryParams = new URLSearchParams();
			if (params.startDate) queryParams.append("startDate", params.startDate);
			if (params.endDate) queryParams.append("endDate", params.endDate);
			const response = await adminAxios.get<SupportContactStatsResponse>(`/api/support-contacts/stats?${queryParams.toString()}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas de soporte");
		}
	}

	/**
	 * Actualizar un contacto de soporte
	 */
	static async updateSupportContact(id: string, data: UpdateSupportContactData): Promise<SupportContactResponse> {
		try {
			const response = await adminAxios.patch<SupportContactResponse>(`/api/support-contacts/${id}`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar contacto de soporte");
		}
	}

	/**
	 * Eliminar un contacto de soporte
	 */
	static async deleteSupportContact(id: string): Promise<SupportContactResponse> {
		try {
			const response = await adminAxios.delete<SupportContactResponse>(`/api/support-contacts/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar contacto de soporte");
		}
	}

	/**
	 * Eliminar múltiples contactos de soporte
	 */
	static async bulkDeleteSupportContacts(ids: string[]): Promise<BulkDeleteResponse> {
		try {
			const response = await adminAxios.post<BulkDeleteResponse>("/api/support-contacts/bulk-delete", { ids });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar contactos de soporte");
		}
	}

	/**
	 * Actualizar estado de múltiples contactos
	 */
	static async bulkUpdateStatus(ids: string[], status: string): Promise<BulkStatusUpdateResponse> {
		try {
			const response = await adminAxios.patch<BulkStatusUpdateResponse>("/api/support-contacts/bulk-status", { ids, status });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar estado de contactos");
		}
	}

	/**
	 * Responder a un contacto de soporte por email
	 */
	static async replySupportContact(id: string, data: ReplyData): Promise<ReplyResponse> {
		try {
			const response = await adminAxios.post<ReplyResponse>(`/api/support-contacts/${id}/reply`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al enviar respuesta");
		}
	}
}

export default SupportContactsService;
