import adminAxios from "utils/adminAxios";

// Types for Discount Codes
export interface DiscountRestrictions {
	applicablePlans: string[];
	applicableBillingPeriods: string[];
	maxRedemptions: number | null;
	maxRedemptionsPerUser: number;
	newCustomersOnly: boolean;
	minimumAmount: number | null;
}

export interface DiscountActivationRules {
	isPublic: boolean;
	priority: number;
	promotionalMessage?: string;
	badge?: string;
}

export interface DiscountStats {
	timesRedeemed: number;
	totalAmountSaved: number;
	lastRedeemedAt: string | null;
}

export interface RedemptionHistoryItem {
	userId: string;
	redeemedAt: string;
	planId?: string;
	billingPeriod?: string;
	stripeSessionId?: string;
	amountSaved?: number;
}

export interface StripeConfig {
	couponId?: string;
	promotionCodeId?: string;
	syncedAt?: string;
}

export interface DiscountCode {
	_id: string;
	code: string;
	name: string;
	description?: string;
	stripe: {
		development: StripeConfig;
		production: StripeConfig;
	};
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	currency: string;
	validFrom: string;
	validUntil: string;
	duration: "once" | "repeating" | "forever";
	durationInMonths?: number;
	restrictions: DiscountRestrictions;
	activationRules: DiscountActivationRules;
	isActive: boolean;
	stats: DiscountStats;
	redemptionHistory: RedemptionHistoryItem[];
	createdBy?: string;
	updatedBy?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateDiscountParams {
	code: string;
	name: string;
	description?: string;
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	currency?: string;
	validFrom: string;
	validUntil: string;
	duration?: "once" | "repeating" | "forever";
	durationInMonths?: number;
	applicablePlans?: string[];
	applicableBillingPeriods?: string[];
	maxRedemptions?: number | null;
	maxRedemptionsPerUser?: number;
	newCustomersOnly?: boolean;
	minimumAmount?: number | null;
	isPublic?: boolean;
	priority?: number;
	promotionalMessage?: string;
	badge?: string;
	isActive?: boolean;
}

export interface UpdateDiscountParams {
	name?: string;
	description?: string;
	validFrom?: string;
	validUntil?: string;
	restrictions?: Partial<DiscountRestrictions>;
	activationRules?: Partial<DiscountActivationRules>;
	isActive?: boolean;
}

export interface DiscountResponse {
	success: boolean;
	message?: string;
	data: DiscountCode;
}

export interface DiscountsListResponse {
	success: boolean;
	count: number;
	data: DiscountCode[];
}

export interface DiscountStatsResponse {
	success: boolean;
	data: {
		code: string;
		name: string;
		stats: DiscountStats;
		redemptionHistory: RedemptionHistoryItem[];
		isActive: boolean;
		validFrom: string;
		validUntil: string;
		isCurrentlyValid: boolean;
	};
}

export interface GetDiscountsParams {
	isActive?: boolean;
	isPublic?: boolean;
	validOnly?: boolean;
}

class DiscountsService {
	/**
	 * Listar todos los códigos de descuento
	 */
	async getDiscounts(params: GetDiscountsParams = {}): Promise<DiscountsListResponse> {
		try {
			const queryParams = new URLSearchParams();
			if (params.isActive !== undefined) queryParams.append("isActive", String(params.isActive));
			if (params.isPublic !== undefined) queryParams.append("isPublic", String(params.isPublic));
			if (params.validOnly !== undefined) queryParams.append("validOnly", String(params.validOnly));

			const url = `/api/discounts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
			const response = await adminAxios.get<DiscountsListResponse>(url);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/discounts no está disponible en el servidor");
			}
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener los códigos de descuento");
		}
	}

	/**
	 * Obtener un código de descuento por ID
	 */
	async getDiscountById(id: string): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.get<DiscountResponse>(`/api/discounts/${id}`);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al obtener el código de descuento");
		}
	}

	/**
	 * Crear un nuevo código de descuento
	 */
	async createDiscount(params: CreateDiscountParams): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.post<DiscountResponse>("/api/discounts", params);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 400) {
				throw new Error(error.response?.data?.message || "Datos inválidos");
			}
			throw new Error(error.response?.data?.message || "Error al crear el código de descuento");
		}
	}

	/**
	 * Actualizar un código de descuento
	 */
	async updateDiscount(id: string, params: UpdateDiscountParams): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.put<DiscountResponse>(`/api/discounts/${id}`, params);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al actualizar el código de descuento");
		}
	}

	/**
	 * Activar/Desactivar un código de descuento
	 */
	async toggleDiscount(id: string): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.patch<DiscountResponse>(`/api/discounts/${id}/toggle`);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al cambiar el estado del código");
		}
	}

	/**
	 * Eliminar un código de descuento (soft delete)
	 */
	async deleteDiscount(id: string): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.delete<DiscountResponse>(`/api/discounts/${id}`);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al eliminar el código de descuento");
		}
	}

	/**
	 * Sincronizar código con Stripe
	 */
	async syncWithStripe(id: string, environment?: "development" | "production"): Promise<DiscountResponse> {
		try {
			const response = await adminAxios.post<DiscountResponse>(`/api/discounts/${id}/sync`, { environment });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al sincronizar con Stripe");
		}
	}

	/**
	 * Obtener estadísticas de un código
	 */
	async getDiscountStats(id: string): Promise<DiscountStatsResponse> {
		try {
			const response = await adminAxios.get<DiscountStatsResponse>(`/api/discounts/${id}/stats`);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al obtener las estadísticas");
		}
	}
}

export default new DiscountsService();
