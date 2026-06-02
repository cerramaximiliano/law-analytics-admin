import adminAxios from "utils/adminAxios";

export type PaymentAttemptSource = "initial_checkout" | "renewal" | "backend_session_error";
export type PaymentAttemptMode = "test" | "live";

export interface PaymentAttempt {
	_id: string;
	user:
		| {
				_id: string;
				email?: string;
				name?: string;
				role?: string;
		  }
		| string
		| null;
	email: string | null;
	stripeCustomerId: string | null;
	planId: string | null;
	amount: number | null;
	currency: string | null;
	source: PaymentAttemptSource;
	mode: PaymentAttemptMode;
	failureCode: string | null;
	declineCode: string | null;
	sellerMessage: string | null;
	failureReason: string | null;
	paymentIntentId: string | null;
	invoiceId: string | null;
	chargeId: string | null;
	stripeEventId: string | null;
	billingReason: string | null;
	emailNotification?: {
		sent: boolean;
		sentAt: string | null;
		template: string | null;
	};
	metadata?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
}

export interface PaymentAttemptsPagination {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface GetPaymentAttemptsParams {
	page?: number;
	limit?: number;
	userId?: string;
	source?: PaymentAttemptSource | "";
	failureCode?: string;
	mode?: PaymentAttemptMode | "all";
	planId?: string;
	from?: string;
	to?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PaymentAttemptsListResponse {
	success: boolean;
	data: PaymentAttempt[];
	pagination: PaymentAttemptsPagination;
}

export interface PaymentAttemptsSummary {
	total: number;
	uniqueUsers: number;
	bySource: Array<{ source: PaymentAttemptSource; count: number }>;
	byFailureCode: Array<{ failureCode: string; count: number }>;
	byDeclineCode: Array<{ declineCode: string; count: number }>;
	byPlan: Array<{ planId: string; count: number }>;
	topUsers: Array<{
		userId: string;
		email: string | null;
		count: number;
		lastFailedAt: string;
		lastFailureReason: string | null;
	}>;
	timeline: Array<{ date: string; count: number }>;
}

export interface PaymentAttemptsSummaryResponse {
	success: boolean;
	summary: PaymentAttemptsSummary;
}

export interface GetSummaryParams {
	mode?: PaymentAttemptMode | "all";
	from?: string;
	to?: string;
	source?: PaymentAttemptSource | "";
	failureCode?: string;
	planId?: string;
}

class PaymentAttemptsService {
	async getPaymentAttempts(params: GetPaymentAttemptsParams = {}): Promise<PaymentAttemptsListResponse> {
		try {
			const response = await adminAxios.get("/api/payment-attempts", { params });
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/payment-attempts no está disponible en el servidor");
			}
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener los intentos de pago fallidos");
		}
	}

	async getSummary(params: GetSummaryParams = {}): Promise<PaymentAttemptsSummaryResponse> {
		try {
			const response = await adminAxios.get("/api/payment-attempts/summary", { params });
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener el resumen de intentos de pago fallidos");
		}
	}

	async getByUser(
		userId: string,
		mode?: PaymentAttemptMode | "all",
	): Promise<{ success: boolean; userId: string; total: number; data: PaymentAttempt[] }> {
		try {
			const response = await adminAxios.get(`/api/payment-attempts/user/${userId}`, { params: { mode } });
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener el historial del usuario");
		}
	}
}

export default new PaymentAttemptsService();
