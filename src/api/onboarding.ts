import adminAxios from "utils/adminAxios";
import {
	OnboardingSummaryResponse,
	OnboardingEventsResponse,
	OnboardingStuckUsersResponse,
	OnboardingFunnelResponse,
	OnboardingTimeToActivationResponse,
	OnboardingQueryParams,
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
}

export default OnboardingService;
