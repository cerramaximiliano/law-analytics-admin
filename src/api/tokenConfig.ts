import adminAxios from "utils/adminAxios";

// Interfaces
export interface TokenDuration {
	duration: string;
	milliseconds: number;
}

export interface AuthTokens {
	accessToken: {
		development: string;
		production: string;
	};
	refreshToken: {
		development: string;
		production: string;
	};
}

export interface HistoryChange {
	before: {
		accessToken?: { development?: string; production?: string };
		refreshToken?: { development?: string; production?: string };
	};
	after: {
		accessToken?: { development?: string; production?: string };
		refreshToken?: { development?: string; production?: string };
	};
}

export interface HistoryEntry {
	changedAt: string;
	changedBy?: string;
	changes: HistoryChange | { initial: boolean };
	reason?: string;
}

export interface TokenConfigData {
	_id: string;
	key: string;
	authTokens: AuthTokens;
	description?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	history?: HistoryEntry[];
}

export interface CurrentTokenInfo {
	environment: string;
	accessToken: TokenDuration;
	refreshToken: TokenDuration;
}

export interface CacheInfo {
	cacheDuration: string;
	lastInvalidation: string | null;
	note: string;
}

export interface TokenConfigResponse {
	success: boolean;
	data: TokenConfigData;
	current: CurrentTokenInfo;
	cacheInfo: CacheInfo;
	error?: string;
	message?: string;
	defaults?: AuthTokens;
}

export interface UpdateTokenConfigParams {
	accessToken?: {
		development?: string;
		production?: string;
	};
	refreshToken?: {
		development?: string;
		production?: string;
	};
	reason?: string;
}

export interface UpdateTokenConfigResponse {
	success: boolean;
	message: string;
	data: {
		authTokens: AuthTokens;
		updatedAt: string;
	};
	note: string;
	error?: string;
	validationErrors?: Array<{ field: string; error: string }>;
}

export interface InvalidateCacheResponse {
	success: boolean;
	message: string;
	note: string;
	timestamp: string;
}

// Servicio de configuracion de tokens
class TokenConfigService {
	/**
	 * Obtener la configuracion actual de tokens
	 */
	static async getTokenConfig(): Promise<TokenConfigResponse> {
		try {
			const response = await adminAxios.get("/api/token-config");
			return response.data;
		} catch (error: any) {
			// Si es 404, devolver un objeto con defaults
			if (error.response?.status === 404) {
				return error.response.data;
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuracion de tokens");
		}
	}

	/**
	 * Actualizar la configuracion de tokens
	 */
	static async updateTokenConfig(params: UpdateTokenConfigParams): Promise<UpdateTokenConfigResponse> {
		try {
			const response = await adminAxios.put("/api/token-config", params);
			return response.data;
		} catch (error: any) {
			// Si hay errores de validacion, devolverlos
			if (error.response?.data?.validationErrors) {
				throw {
					message: "Errores de validacion",
					validationErrors: error.response.data.validationErrors,
				};
			}
			throw new Error(error.response?.data?.message || "Error al actualizar configuracion de tokens");
		}
	}

	/**
	 * Invalidar el cache de configuracion
	 */
	static async invalidateCache(): Promise<InvalidateCacheResponse> {
		try {
			const response = await adminAxios.post("/api/token-config/invalidate-cache");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al invalidar cache");
		}
	}
}

export default TokenConfigService;
