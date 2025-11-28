import axios from "axios";

export interface JudicialMovementFilters {
	page?: number;
	limit?: number;
	userId?: string;
	notificationStatus?: "pending" | "sent" | "failed";
	movementDateFrom?: string;
	movementDateTo?: string;
	notifyAtFrom?: string;
	notifyAtTo?: string;
	expedienteNumber?: number;
	expedienteYear?: number;
	fuero?: string;
	movementType?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface JudicialMovementUser {
	_id: string;
	name: string;
	email: string;
	phone?: string;
}

export interface JudicialMovementExpediente {
	id: string;
	number: number;
	year: number;
	fuero: string;
	caratula: string;
	objeto: string;
}

export interface JudicialMovementData {
	fecha: string;
	tipo: string;
	detalle: string;
	url?: string;
}

export interface JudicialMovementNotification {
	date: string;
	type: string;
	success: boolean;
	details: string;
}

export interface JudicialMovementSettings {
	notifyAt: string;
	channels: string[];
}

export interface JudicialMovement {
	_id: string;
	userId: JudicialMovementUser;
	expediente: JudicialMovementExpediente;
	movimiento: JudicialMovementData;
	notificationStatus: "pending" | "sent" | "failed";
	notificationSettings: JudicialMovementSettings;
	notifications: JudicialMovementNotification[];
	uniqueKey: string;
	createdAt: string;
	updatedAt: string;
}

export interface JudicialMovementPagination {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	nextPage: number | null;
	prevPage: number | null;
}

export interface JudicialMovementStats {
	totalPending: number;
	totalSent: number;
	totalFailed: number;
}

export interface JudicialMovementResponse {
	success: boolean;
	data: {
		movements: JudicialMovement[];
		pagination: JudicialMovementPagination;
		stats: JudicialMovementStats;
	};
}

class JudicialMovementsService {
	async getMovements(filters: JudicialMovementFilters = {}): Promise<JudicialMovementResponse> {
		try {
			const params = new URLSearchParams();

			// Add filters to query params
			if (filters.page) params.append("page", filters.page.toString());
			if (filters.limit) params.append("limit", filters.limit.toString());
			if (filters.userId) params.append("userId", filters.userId);
			if (filters.notificationStatus) params.append("notificationStatus", filters.notificationStatus);
			if (filters.movementDateFrom) params.append("movementDateFrom", filters.movementDateFrom);
			if (filters.movementDateTo) params.append("movementDateTo", filters.movementDateTo);
			if (filters.notifyAtFrom) params.append("notifyAtFrom", filters.notifyAtFrom);
			if (filters.notifyAtTo) params.append("notifyAtTo", filters.notifyAtTo);
			if (filters.expedienteNumber) params.append("expedienteNumber", filters.expedienteNumber.toString());
			if (filters.expedienteYear) params.append("expedienteYear", filters.expedienteYear.toString());
			if (filters.fuero) params.append("fuero", filters.fuero);
			if (filters.movementType) params.append("movementType", filters.movementType);
			if (filters.sortBy) params.append("sortBy", filters.sortBy);
			if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

			const queryString = params.toString();
			const apiBase = import.meta.env.VITE_NOTIFICATION_URL || import.meta.env.VITE_API_PJN || "";
			const baseUrl = `${apiBase}/api/judicial-movements`;
			const url = queryString ? `${baseUrl}/?${queryString}` : `${baseUrl}/`;

			const response = await axios.get<JudicialMovementResponse>(url);
			return response.data;
		} catch (error: any) {
			console.error("Error fetching judicial movements:", error);
			throw error;
		}
	}

	async deleteMovement(id: string): Promise<{ success: boolean; message: string }> {
		try {
			const apiBase = import.meta.env.VITE_NOTIFICATION_URL || import.meta.env.VITE_API_PJN || "";
			const baseUrl = `${apiBase}/api/judicial-movements`;
			const response = await axios.delete(`${baseUrl}/${id}`);
			return response.data;
		} catch (error: any) {
			console.error("Error deleting judicial movement:", error);
			throw error;
		}
	}

	async retryNotification(id: string): Promise<void> {
		try {
			const apiBase = import.meta.env.VITE_NOTIFICATION_URL || import.meta.env.VITE_API_PJN || "";
			const baseUrl = `${apiBase}/api/judicial-movements`;
			await axios.post(`${baseUrl}/${id}/retry`);
		} catch (error: any) {
			console.error("Error retrying notification:", error);
			throw error;
		}
	}
}

const judicialMovementsService = new JudicialMovementsService();
export default judicialMovementsService;
