import adminAxios from "utils/adminAxios";
import {
	UsersSessionMetricsResponse,
	UserSessionHistoryResponse,
	UserSessionMetricsResponse,
	SessionStatsResponse,
	UsersWithSessionMetricsResponse,
	SessionMetricsQueryParams,
	UserSessionHistoryQueryParams,
	UsersWithMetricsQueryParams,
} from "types/user-session";

/**
 * Servicio para gestionar las sesiones y métricas de actividad de usuarios
 */
class UserSessionsService {
	/**
	 * Obtener métricas de sesión para múltiples usuarios
	 */
	static async getUsersSessionMetrics(params: SessionMetricsQueryParams = {}): Promise<UsersSessionMetricsResponse> {
		try {
			const response = await adminAxios.get<UsersSessionMetricsResponse>("/api/user-sessions/metrics", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener métricas de sesión");
		}
	}

	/**
	 * Obtener historial de sesiones de un usuario específico
	 */
	static async getUserSessionHistory(
		userId: string,
		params: UserSessionHistoryQueryParams = {}
	): Promise<UserSessionHistoryResponse> {
		try {
			const response = await adminAxios.get<UserSessionHistoryResponse>(`/api/user-sessions/${userId}/history`, {
				params,
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener historial de sesiones");
		}
	}

	/**
	 * Obtener métricas detalladas de un usuario específico
	 */
	static async getUserSessionMetrics(userId: string, days: number = 30): Promise<UserSessionMetricsResponse> {
		try {
			const response = await adminAxios.get<UserSessionMetricsResponse>(`/api/user-sessions/${userId}/metrics`, {
				params: { days },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener métricas de sesión del usuario");
		}
	}

	/**
	 * Obtener estadísticas generales de sesiones
	 */
	static async getSessionStats(days: number = 30): Promise<SessionStatsResponse> {
		try {
			const response = await adminAxios.get<SessionStatsResponse>("/api/user-sessions/stats", {
				params: { days },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas de sesión");
		}
	}

	/**
	 * Obtener usuarios con sus métricas de sesión (combinado)
	 */
	static async getUsersWithSessionMetrics(
		params: UsersWithMetricsQueryParams = {}
	): Promise<UsersWithSessionMetricsResponse> {
		try {
			const response = await adminAxios.get<UsersWithSessionMetricsResponse>("/api/user-sessions/users-with-metrics", {
				params,
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener usuarios con métricas");
		}
	}
}

export default UserSessionsService;
