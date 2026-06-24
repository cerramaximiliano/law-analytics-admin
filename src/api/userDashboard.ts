import adminAxios from "utils/adminAxios";
import {
	UserDashboardOverviewResponse,
	ActivityRankingResponse,
	InactiveUsersResponse,
	NewUnactivatedResponse,
	PaymentRiskResponse,
	InactiveQueryParams,
	NewUnactivatedQueryParams,
	PaymentRiskQueryParams,
} from "types/user-dashboard";

/**
 * Servicio del dashboard de estadísticas de usuarios.
 * Unifica las señales de uso (actividad, inactividad, activación, pagos)
 * hoy dispersas en /admin/users/resources, onboarding y suscripciones.
 */
class UserDashboardService {
	/** KPIs de cabecera + distribución por plan */
	static async getOverview(days = 30): Promise<UserDashboardOverviewResponse> {
		try {
			const response = await adminAxios.get<UserDashboardOverviewResponse>("/api/user-dashboard/overview", { params: { days } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener overview de usuarios");
		}
	}

	/** Top usuarios por score de actividad (logins + días activos) */
	static async getActivityRanking(days = 30, limit = 20): Promise<ActivityRankingResponse> {
		try {
			const response = await adminAxios.get<ActivityRankingResponse>("/api/user-dashboard/activity-ranking", {
				params: { days, limit },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener ranking de actividad");
		}
	}

	/** Usuarios inactivos / churn risk */
	static async getInactive(params: InactiveQueryParams = {}): Promise<InactiveUsersResponse> {
		try {
			const response = await adminAxios.get<InactiveUsersResponse>("/api/user-dashboard/inactive", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener usuarios inactivos");
		}
	}

	/** Registros recientes sin activar */
	static async getNewUnactivated(params: NewUnactivatedQueryParams = {}): Promise<NewUnactivatedResponse> {
		try {
			const response = await adminAxios.get<NewUnactivatedResponse>("/api/user-dashboard/new-unactivated", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener registros sin activar");
		}
	}

	/** Suscripciones en riesgo de pago */
	static async getPaymentRisk(params: PaymentRiskQueryParams = {}): Promise<PaymentRiskResponse> {
		try {
			const response = await adminAxios.get<PaymentRiskResponse>("/api/user-dashboard/payment-risk", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener suscripciones en riesgo");
		}
	}
}

export default UserDashboardService;
