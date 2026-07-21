import adminAxios from "utils/adminAxios";
import {
	MovementLinkQueryParams,
	MovementLinkSummaryResponse,
	MovementLinkByFueroResponse,
	MovementLinkByUserResponse,
	MovementLinkTimeseriesResponse,
	MovementLinkRecentResponse,
	MovementLinkActivePromoResponse,
} from "types/movementLinkAnalytics";

// ==============================|| MOVEMENT LINK ANALYTICS SERVICE ||============================== //
//
// Analytics de la vista pública /m/:token (links "Ver documento" de los emails
// de movimientos PJN). Lee de admin-api /api/movement-link-analytics/*.

class MovementLinkAnalyticsService {
	/** Métricas agregadas + funnel del rango. */
	static async getSummary(params?: MovementLinkQueryParams): Promise<MovementLinkSummaryResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/summary", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener el resumen de analytics");
		}
	}

	/** Engagement por fuero. */
	static async getByFuero(params?: MovementLinkQueryParams): Promise<MovementLinkByFueroResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/by-fuero", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener datos por fuero");
		}
	}

	/** Top usuarios por engagement (con email). */
	static async getByUser(params?: MovementLinkQueryParams): Promise<MovementLinkByUserResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/by-user", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener datos por usuario");
		}
	}

	/** Serie diaria por evento (gráfico de tendencia). */
	static async getTimeseries(params?: MovementLinkQueryParams): Promise<MovementLinkTimeseriesResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/timeseries", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener la serie temporal");
		}
	}

	/** Feed de eventos recientes con detalle. */
	static async getRecent(params?: MovementLinkQueryParams): Promise<MovementLinkRecentResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/recent", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener eventos recientes");
		}
	}

	/** Promo activa que vería un visitante de la vista pública (para la Vista previa). */
	static async getActivePromo(): Promise<MovementLinkActivePromoResponse> {
		try {
			const response = await adminAxios.get("/api/movement-link-analytics/active-promo");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener la promo activa");
		}
	}
}

export default MovementLinkAnalyticsService;
