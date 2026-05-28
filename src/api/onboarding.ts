import adminAxios from "utils/adminAxios";
import {
	OnboardingSummaryResponse,
	OnboardingEventsResponse,
	OnboardingStuckUsersResponse,
	OnboardingFunnelResponse,
	OnboardingTimeToActivationResponse,
	OnboardingQueryParams,
	OnboardingResetResponse,
	OnboardingUserSearchResponse,
	OnboardingUserDetailResponse,
} from "types/onboarding";

// ==============================|| ONBOARDING ANALYTICS SERVICE ||============================== //

class OnboardingService {
	/**
	 * Obtiene el resumen de analytics de onboarding
	 */
	static async getSummary(params?: OnboardingQueryParams): Promise<OnboardingSummaryResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/summary", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener resumen de onboarding");
		}
	}

	/**
	 * Obtiene la lista de eventos de onboarding con paginacion
	 */
	static async getEvents(params?: OnboardingQueryParams): Promise<OnboardingEventsResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/events", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener eventos de onboarding");
		}
	}

	/**
	 * Obtiene usuarios estancados (4+ sesiones sin crear carpeta)
	 */
	static async getStuckUsers(params?: OnboardingQueryParams): Promise<OnboardingStuckUsersResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/stuck-users", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener usuarios estancados");
		}
	}

	/**
	 * Obtiene las metricas del funnel de onboarding
	 */
	static async getFunnel(params?: OnboardingQueryParams): Promise<OnboardingFunnelResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/funnel", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener funnel de onboarding");
		}
	}

	/**
	 * Obtiene metricas de tiempo hasta activacion
	 */
	static async getTimeToActivation(params?: OnboardingQueryParams): Promise<OnboardingTimeToActivationResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/time-to-activation", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener tiempo de activacion");
		}
	}

	/**
	 * Busca usuarios por email o nombre (autocomplete del reset-tool).
	 * Devuelve hasta 20 resultados con su estado de onboarding.
	 */
	static async searchUsers(q: string): Promise<OnboardingUserSearchResponse> {
		try {
			const response = await adminAxios.get("/api/onboarding/users/search", { params: { q } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al buscar usuarios");
		}
	}

	/**
	 * Obtiene el estado completo del onboarding de un user (flags + counts reales
	 * + últimos eventos). Útil para cross-check antes de resetear.
	 */
	static async getUserDetail(userId: string): Promise<OnboardingUserDetailResponse> {
		try {
			const response = await adminAxios.get(`/api/onboarding/users/${userId}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener detalle del usuario");
		}
	}

	/**
	 * Resetea el onboarding de un user específico (QA/admin tool).
	 * @param purgeEvents si true, también borra los eventos históricos del user
	 *   de OnboardingEvent. Útil para empezar con un funnel limpio.
	 */
	static async resetUserOnboarding(userId: string, purgeEvents = false): Promise<OnboardingResetResponse> {
		try {
			// Body {} (no null) — el body-parser strict del admin-api rechaza el
			// literal "null" como JSON inválido. Express necesita un objeto
			// (incluso vacío) para no tirar SyntaxError en json.js:86.
			const response = await adminAxios.post(
				`/api/onboarding/users/${userId}/reset`,
				{},
				{
					params: { purgeEvents },
				},
			);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear onboarding");
		}
	}
}

export default OnboardingService;
