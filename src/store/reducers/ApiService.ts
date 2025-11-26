import authAxios from "utils/authAxios";
import { StripeCustomersResponse } from "types/stripe-subscription";
import { StripeCustomerHistory } from "types/stripe-history";
import { Subscription as UserSubscription } from "types/user";

// ===============================
// Interfaces de respuesta API
// ===============================

export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	document?: T;
	message?: string;
	requireLogin?: boolean;
	accountDeactivated?: boolean;
}

// Tipos temporales para soporte de auth
export interface Payment {
	id: string;
	amount: number;
	currency: string;
	status: string;
	created: number;
	description?: string;
}

export interface ApiServiceState {
	isLoading: boolean;
	error: string | null;
}

export const initialState: ApiServiceState = {
	isLoading: false,
	error: null,
};

// ===============================
// Servicio principal de API
// ===============================

class ApiService {
	// ================================
	// Utilidades
	// ================================

	/**
	 * Maneja errores de Axios de forma consistente
	 * @param error - El error capturado
	 */
	private static handleAxiosError(error: unknown): Error {
		if (error && typeof error === "object" && "isAxiosError" in error) {
			const axiosError = error as any;

			// Si hay un mensaje específico en la respuesta, úsalo
			if (axiosError.response?.data?.message) {
				return new Error(axiosError.response.data.message);
			}

			// Mensajes según el código de estado HTTP
			if (axiosError.response) {
				switch (axiosError.response.status) {
					case 401:
						return new Error("No autorizado. Por favor inicia sesión nuevamente");
					case 403:
						return new Error("No tienes permisos para realizar esta acción");
					case 404:
						return new Error("El recurso solicitado no fue encontrado");
					case 500:
						return new Error("Error interno del servidor");
					default:
						return new Error(`Error en la comunicación con el servidor (${axiosError.response.status})`);
				}
			}

			// Error de red u otro error de Axios
			return new Error("Error de conexión. Verifica tu red e intenta nuevamente");
		}

		// Si no es un error de Axios, devuelve el error original o un mensaje genérico
		return error instanceof Error ? error : new Error("Error desconocido");
	}

	// ================================
	// Gestión de clientes de Stripe
	// ================================

	/**
	 * Obtiene todos los clientes de Stripe (solo administradores)
	 * @param cursor - Cursor para paginación (opcional)
	 */
	static async getStripeCustomers(cursor?: string): Promise<StripeCustomersResponse> {
		try {
			const params = cursor ? { cursor } : {};
			const response = await authAxios.get<StripeCustomersResponse>("/api/subscriptions/stripe-subscriptions", {
				params,
			});
			return response.data;
		} catch (error) {
			throw this.handleAxiosError(error);
		}
	}

	/**
	 * Obtiene el historial completo de Stripe para un usuario específico
	 * @param userId - ID del usuario
	 */
	static async getStripeCustomerHistory(userId: string): Promise<ApiResponse<StripeCustomerHistory>> {
		try {
			const response = await authAxios.get<ApiResponse<StripeCustomerHistory>>(`/api/subscriptions/user/${userId}/stripe-history`);
			return response.data;
		} catch (error) {
			throw this.handleAxiosError(error);
		}
	}

	/**
	 * Repara la suscripción de un usuario específico sincronizándola con Stripe
	 * @param userId - ID del usuario a sincronizar
	 */
	static async repairUserSubscription(userId: string): Promise<{
		success: boolean;
		message: string;
		user?: any;
		subscription?: any;
	}> {
		try {
			const response = await authAxios.get(`/api/repair/fix-user-subscription/${userId}`);
			console.log(`/api/repair/fix-user-subscription/${userId}`, response.data);
			return response.data;
		} catch (error) {
			throw this.handleAxiosError(error);
		}
	}

	/**
	 * Recalcula y sincroniza el almacenamiento de un usuario específico
	 * @param userId - ID del usuario
	 */
	static async recalculateUserStorage(userId: string): Promise<{
		success: boolean;
		message: string;
		data?: {
			user: {
				id: string;
				email: string;
				plan: string;
			};
			before: {
				storage: number;
				storageMB: number;
			};
			after: {
				archived: {
					folders: number;
					contacts: number;
					calculators: number;
				};
				active: {
					folders: number;
					contacts: number;
					calculators: number;
				};
				storage: {
					folders: number;
					contacts: number;
					calculators: number;
					total: number;
					totalMB: number;
				};
			};
			changed: boolean;
			difference: {
				bytes: number;
				mb: number;
			};
		};
	}> {
		try {
			const response = await authAxios.post(`/api/admin/storage/recalculate/user/${userId}`, {});
			console.log(`/api/admin/storage/recalculate/user/${userId}`, response.data);
			return response.data;
		} catch (error) {
			throw this.handleAxiosError(error);
		}
	}

	/**
	 * Actualiza la suscripción de un usuario específico
	 * @param userId - ID del usuario
	 * @param subscriptionData - Datos de suscripción a actualizar
	 */
	static async updateUserSubscription(userId: string, subscriptionData: Partial<UserSubscription>): Promise<ApiResponse<UserSubscription>> {
		try {
			const response = await authAxios.patch<ApiResponse<UserSubscription>>(`/api/subscriptions/user/${userId}`, subscriptionData);
			return response.data;
		} catch (error) {
			throw this.handleAxiosError(error);
		}
	}
}

export default ApiService;
