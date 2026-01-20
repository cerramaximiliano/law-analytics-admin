import adminAxios from "utils/adminAxios";

// Types
export interface OpenAICostsResponse {
	success: boolean;
	data: {
		totalCosts: number;
		currency: string;
		period: {
			start: string;
			end: string;
		};
		byLineItem: Record<string, number>;
		rawData?: unknown;
	};
}

export interface OpenAIBalanceResponse {
	success: boolean;
	data: {
		configured: boolean;
		message?: string;
		estimatedBalance: number | null;
		initialBalance: number;
		totalCosts: number;
		costsByModel?: Record<string, number>;
		currency: string;
		initialBalanceDate?: string;
		lastSyncAt?: string;
		cacheExpired?: boolean;
	};
}

export interface OpenAIConfigResponse {
	success: boolean;
	data: {
		initialBalance: number;
		initialBalanceDate: string;
		currency: string;
		cacheExpirationMinutes: number;
		notes?: string;
		lastSyncAt?: string;
		cachedCosts: number;
		estimatedBalance: number;
		updatedAt: string;
	};
}

export interface OpenAIConfigUpdateRequest {
	initialBalance?: number;
	initialBalanceDate?: string;
	cacheExpirationMinutes?: number;
	notes?: string;
	updatedBy?: string;
}

export interface OpenAISyncResponse {
	success: boolean;
	message: string;
	data: {
		estimatedBalance: number;
		totalCosts: number;
		costsByModel: Record<string, number>;
		syncedAt: string;
	};
}

/**
 * Servicio para gestionar la integración con OpenAI
 */
class OpenAIService {
	/**
	 * Obtener costos desde la API de OpenAI
	 */
	static async getCosts(startDate?: string, endDate?: string, limit?: number): Promise<OpenAICostsResponse> {
		try {
			const params: Record<string, string | number> = {};
			if (startDate) params.startDate = startDate;
			if (endDate) params.endDate = endDate;
			if (limit) params.limit = limit;

			const response = await adminAxios.get<OpenAICostsResponse>("/api/openai/costs", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener costos de OpenAI");
		}
	}

	/**
	 * Obtener saldo estimado
	 */
	static async getBalance(): Promise<OpenAIBalanceResponse> {
		try {
			const response = await adminAxios.get<OpenAIBalanceResponse>("/api/openai/balance");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener saldo de OpenAI");
		}
	}

	/**
	 * Obtener configuración actual
	 */
	static async getConfig(): Promise<OpenAIConfigResponse> {
		try {
			const response = await adminAxios.get<OpenAIConfigResponse>("/api/openai/config");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener configuración de OpenAI");
		}
	}

	/**
	 * Actualizar configuración
	 */
	static async updateConfig(data: OpenAIConfigUpdateRequest): Promise<OpenAIConfigResponse> {
		try {
			const response = await adminAxios.put<OpenAIConfigResponse>("/api/openai/config", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración de OpenAI");
		}
	}

	/**
	 * Forzar sincronización con la API de OpenAI
	 */
	static async syncCosts(): Promise<OpenAISyncResponse> {
		try {
			const response = await adminAxios.post<OpenAISyncResponse>("/api/openai/sync");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al sincronizar con OpenAI");
		}
	}
}

export default OpenAIService;
