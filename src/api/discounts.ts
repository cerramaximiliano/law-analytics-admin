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

export type TargetEnvironment = "development" | "production" | "both";

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
	targetEnvironment: TargetEnvironment;
	stats: DiscountStats;
	redemptionHistory: RedemptionHistoryItem[];
	createdBy?: string;
	updatedBy?: string;
	createdAt: string;
	updatedAt: string;
}

export type StripeEnvironment = "development" | "production";

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
	environments?: StripeEnvironment[];
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
	createdInEnvironments?: StripeEnvironment[];
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

// Types for Stripe Info endpoint
export interface StripeCouponInfo {
	id: string;
	name: string | null;
	percent_off: number | null;
	amount_off: number | null;
	currency: string | null;
	duration: string;
	duration_in_months: number | null;
	max_redemptions: number | null;
	times_redeemed: number;
	valid: boolean;
	created: string;
	redeem_by: string | null;
	metadata?: Record<string, string>;
}

export interface StripePromotionCode {
	id: string;
	code: string;
	active: boolean;
	times_redeemed: number;
	max_redemptions?: number | null;
	created?: string;
	expires_at?: string | null;
}

export interface StripeInfoResponse {
	success: boolean;
	data: {
		discount: {
			_id: string;
			code: string;
			name: string;
			description?: string;
			discountType: string;
			discountValue: number;
			duration: string;
			durationInMonths?: number;
			validFrom: string;
			validUntil: string;
			isActive: boolean;
			targetEnvironment: string;
		};
		stripe: {
			environment: string;
			coupon: StripeCouponInfo;
			promotionCodes: StripePromotionCode[];
		};
	};
}

// Types for Subscribers endpoint
export interface DiscountSubscriber {
	subscriptionId: string;
	status: string;
	customer: {
		id: string;
		email: string | null;
		name: string | null;
	};
	plan: {
		priceId: string;
		productId: string;
		interval: string;
		amount: number;
		currency: string;
	};
	discount: {
		couponId: string;
		percentOff: number | null;
		amountOff: number | null;
		duration: string;
		durationInMonths: number | null;
		start: string | null;
		end: string | null;
	};
	currentPeriod: {
		start: string;
		end: string;
	};
	created: string;
	cancelAt: string | null;
	canceledAt: string | null;
}

export interface SubscribersResponse {
	success: boolean;
	data: {
		discount: {
			_id: string;
			code: string;
			name: string;
		};
		environment: string;
		couponId: string;
		totalSubscribers: number;
		subscribers: DiscountSubscriber[];
	};
}

// Types for Full Info endpoint (combined)
export interface FullDiscountInfoResponse {
	success: boolean;
	data: {
		database: DiscountCode;
		stripe: {
			coupon: StripeCouponInfo;
			promotionCodes: StripePromotionCode[];
		} | { error: string } | null;
		subscribers: {
			environment: string;
			total: number;
			list: Array<{
				subscriptionId: string;
				status: string;
				customerEmail: string | null;
				customerName: string | null;
				discountStart: string | null;
				discountEnd: string | null;
				planAmount: number;
				planInterval: string;
				currentPeriodEnd: string;
			}>;
		};
	};
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

	/**
	 * Obtener información del cupón desde Stripe
	 */
	async getStripeInfo(id: string, environment: "development" | "production"): Promise<StripeInfoResponse> {
		try {
			const response = await adminAxios.get<StripeInfoResponse>(
				`/api/discounts/${id}/stripe-info?environment=${environment}`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error(error.response?.data?.message || "Código no sincronizado con Stripe");
			}
			throw new Error(error.response?.data?.message || "Error al obtener información de Stripe");
		}
	}

	/**
	 * Obtener suscriptores activos con este descuento
	 */
	async getSubscribers(id: string, environment: "development" | "production"): Promise<SubscribersResponse> {
		try {
			const response = await adminAxios.get<SubscribersResponse>(
				`/api/discounts/${id}/subscribers?environment=${environment}`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error(error.response?.data?.message || "Código no sincronizado con Stripe");
			}
			throw new Error(error.response?.data?.message || "Error al obtener suscriptores");
		}
	}

	/**
	 * Obtener información completa del descuento (DB + Stripe + Suscriptores)
	 */
	async getFullInfo(id: string, environment: "development" | "production"): Promise<FullDiscountInfoResponse> {
		try {
			const response = await adminAxios.get<FullDiscountInfoResponse>(
				`/api/discounts/${id}/full-info?environment=${environment}`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error(error.response?.data?.message || "Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al obtener información completa");
		}
	}
}

export default new DiscountsService();
