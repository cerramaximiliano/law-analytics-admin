import adminAxios from "utils/adminAxios";
import {
	GA4OverviewMetrics,
	GA4UsersTrendItem,
	GA4TrafficSource,
	GA4TopPage,
	GA4CustomEvent,
	GA4FunnelStep,
	GA4CtaClick,
	GA4FeatureInterest,
	GA4Attribution,
	GA4RealtimeUsers,
	GA4DeviceStat,
	GA4CountryStat,
	GA4AllData,
	GA4ApiResponse,
	GA4PeriodOption,
	GA4LandingPage,
	GA4ExitPage,
	GA4PageFlow,
	GA4NavigationPath,
	GA4PageEngagement,
	GA4NavigationData,
	GA4AllEventsData,
	GA4CustomFunnelData,
	GA4EventDetails,
	GA4EventTrendItem,
	GA4ParameterValue,
} from "types/ga4-analytics";

// ==============================|| GA4 ANALYTICS SERVICE ||============================== //

interface QueryParams {
	period?: GA4PeriodOption;
	startDate?: string;
	endDate?: string;
	limit?: number;
}

class GA4AnalyticsService {
	/**
	 * Obtiene métricas generales de overview
	 */
	static async getOverview(params?: QueryParams): Promise<GA4ApiResponse<GA4OverviewMetrics>> {
		try {
			const response = await adminAxios.get("/api/ga4/overview", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener overview de GA4");
		}
	}

	/**
	 * Obtiene tendencia de usuarios por día
	 */
	static async getUsersTrend(params?: QueryParams): Promise<GA4ApiResponse<GA4UsersTrendItem[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/users-trend", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener tendencia de usuarios");
		}
	}

	/**
	 * Obtiene fuentes de tráfico
	 */
	static async getTrafficSources(params?: QueryParams): Promise<GA4ApiResponse<GA4TrafficSource[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/traffic-sources", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener fuentes de tráfico");
		}
	}

	/**
	 * Obtiene páginas más visitadas
	 */
	static async getTopPages(params?: QueryParams): Promise<GA4ApiResponse<GA4TopPage[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/top-pages", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener páginas top");
		}
	}

	/**
	 * Obtiene eventos personalizados
	 */
	static async getCustomEvents(params?: QueryParams): Promise<GA4ApiResponse<GA4CustomEvent[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/events", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener eventos personalizados");
		}
	}

	/**
	 * Obtiene funnel de conversión
	 */
	static async getConversionFunnel(params?: QueryParams): Promise<GA4ApiResponse<GA4FunnelStep[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/funnel", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener funnel de conversión");
		}
	}

	/**
	 * Obtiene clicks en CTAs
	 */
	static async getCtaClicks(params?: QueryParams): Promise<GA4ApiResponse<GA4CtaClick[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/cta-clicks", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener CTA clicks");
		}
	}

	/**
	 * Obtiene interés en features
	 */
	static async getFeatureInterest(params?: QueryParams): Promise<GA4ApiResponse<GA4FeatureInterest[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/feature-interest", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener interés en features");
		}
	}

	/**
	 * Obtiene datos de atribución
	 */
	static async getAttribution(params?: QueryParams): Promise<GA4ApiResponse<GA4Attribution[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/attribution", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener datos de atribución");
		}
	}

	/**
	 * Obtiene usuarios en tiempo real
	 */
	static async getRealtimeUsers(): Promise<GA4ApiResponse<GA4RealtimeUsers>> {
		try {
			const response = await adminAxios.get("/api/ga4/realtime");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener usuarios en tiempo real");
		}
	}

	/**
	 * Obtiene estadísticas de dispositivos
	 */
	static async getDeviceStats(params?: QueryParams): Promise<GA4ApiResponse<GA4DeviceStat[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/devices", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas de dispositivos");
		}
	}

	/**
	 * Obtiene estadísticas por país
	 */
	static async getCountryStats(params?: QueryParams): Promise<GA4ApiResponse<GA4CountryStat[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/countries", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas por país");
		}
	}

	/**
	 * Obtiene todos los datos en una sola llamada
	 */
	static async getAllData(params?: QueryParams): Promise<GA4ApiResponse<GA4AllData>> {
		try {
			const response = await adminAxios.get("/api/ga4/all", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener datos de GA4");
		}
	}

	/**
	 * Invalida el cache de GA4
	 */
	static async invalidateCache(): Promise<{ success: boolean; message: string }> {
		try {
			const response = await adminAxios.post("/api/ga4/invalidate-cache");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al invalidar cache");
		}
	}

	// ==============================|| NAVEGACIÓN METHODS ||============================== //

	/**
	 * Obtiene páginas de entrada (landing pages)
	 */
	static async getLandingPages(params?: QueryParams): Promise<GA4ApiResponse<GA4LandingPage[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/landing-pages", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener landing pages");
		}
	}

	/**
	 * Obtiene páginas de salida (exit pages)
	 */
	static async getExitPages(params?: QueryParams): Promise<GA4ApiResponse<GA4ExitPage[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/exit-pages", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener exit pages");
		}
	}

	/**
	 * Obtiene flujo de páginas
	 */
	static async getPageFlow(params?: QueryParams): Promise<GA4ApiResponse<GA4PageFlow[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/page-flow", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener flujo de páginas");
		}
	}

	/**
	 * Obtiene rutas de navegación
	 */
	static async getNavigationPaths(params?: QueryParams): Promise<GA4ApiResponse<GA4NavigationPath[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/navigation-paths", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener rutas de navegación");
		}
	}

	/**
	 * Obtiene engagement por página
	 */
	static async getPageEngagement(params?: QueryParams): Promise<GA4ApiResponse<GA4PageEngagement[]>> {
		try {
			const response = await adminAxios.get("/api/ga4/page-engagement", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener engagement por página");
		}
	}

	/**
	 * Obtiene todos los datos de navegación en una sola llamada
	 */
	static async getNavigationAll(params?: QueryParams): Promise<GA4ApiResponse<GA4NavigationData>> {
		try {
			const response = await adminAxios.get("/api/ga4/navigation-all", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener datos de navegación");
		}
	}

	// ==============================|| FUNNEL METHODS ||============================== //

	/**
	 * Obtiene todos los eventos disponibles en GA4
	 */
	static async getAllEvents(params?: QueryParams): Promise<GA4ApiResponse<GA4AllEventsData>> {
		try {
			const response = await adminAxios.get("/api/ga4/events/all", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener eventos de GA4");
		}
	}

	/**
	 * Genera un funnel personalizado con los eventos especificados
	 */
	static async getCustomFunnel(events: string[], params?: QueryParams): Promise<GA4ApiResponse<GA4CustomFunnelData>> {
		try {
			const response = await adminAxios.post("/api/ga4/funnel/custom", { events }, { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al generar funnel personalizado");
		}
	}

	// ==============================|| EVENT EXPLORER METHODS ||============================== //

	/**
	 * Obtiene detalles completos de un evento (resumen, tendencia, parámetros detectados)
	 */
	static async getEventDetails(eventName: string, params?: QueryParams): Promise<GA4ApiResponse<GA4EventDetails>> {
		try {
			const response = await adminAxios.get(`/api/ga4/events/${encodeURIComponent(eventName)}/details`, { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener detalles del evento");
		}
	}

	/**
	 * Obtiene la tendencia temporal de un evento
	 */
	static async getEventTrend(eventName: string, params?: QueryParams): Promise<GA4ApiResponse<GA4EventTrendItem[]>> {
		try {
			const response = await adminAxios.get(`/api/ga4/events/${encodeURIComponent(eventName)}/trend`, { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener tendencia del evento");
		}
	}

	/**
	 * Obtiene los valores de un parámetro específico de un evento
	 */
	static async getEventParameters(eventName: string, parameterName: string, params?: QueryParams): Promise<GA4ApiResponse<GA4ParameterValue[]>> {
		try {
			const response = await adminAxios.get(`/api/ga4/events/${encodeURIComponent(eventName)}/parameters/${encodeURIComponent(parameterName)}`, { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener parámetros del evento");
		}
	}
}

export default GA4AnalyticsService;
