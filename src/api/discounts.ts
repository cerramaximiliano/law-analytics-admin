import adminAxios from "utils/adminAxios";

// Types for Discount Codes
export interface DiscountRestrictions {
	applicablePlans: string[];
	applicableBillingPeriods: string[];
	maxRedemptions: number | null;
	maxRedemptionsPerUser: number;
	/** Solo para nuevos clientes que NUNCA tuvieron suscripción paga (ni activa ni cancelada) */
	newCustomersOnly: boolean;
	/** Excluir usuarios con suscripción paga ACTUALMENTE activa (permite ex-suscriptores) */
	excludeActiveSubscribers: boolean;
	minimumAmount: number | null;
	targetUsers?: string[]; // Array de IDs de usuarios específicos
	targetSegments?: string[]; // Array de IDs de segmentos de contactos
}

// Types for Target Users management
export interface TargetUser {
	_id: string;
	email: string;
	name: string;
	lastName: string;
	fullName: string;
	createdAt: string;
}

export interface TargetUsersResponse {
	success: boolean;
	data: {
		discountId: string;
		code: string;
		name: string;
		isPublic: boolean;
		totalTargetUsers: number;
		targetUsers: TargetUser[];
	};
}

export interface AddTargetUsersParams {
	userIds?: string[];
	emails?: string[];
}

export interface AddTargetUsersResponse {
	success: boolean;
	message: string;
	data: {
		added: number;
		alreadyExisted: number;
		notFoundEmails?: string[];
		totalTargetUsers: number;
	};
}

export interface RemoveTargetUsersResponse {
	success: boolean;
	message: string;
	data: {
		removed: number;
		totalTargetUsers: number;
	};
}

export interface SetTargetUsersResponse {
	success: boolean;
	message: string;
	data: {
		previousCount: number;
		newCount: number;
		notFoundEmails: string[];
		isUniversal: boolean;
	};
}

// Types for Target Segments management
export interface TargetSegment {
	_id: string;
	name: string;
	description: string;
	type: "static" | "dynamic";
	estimatedCount: number;
	isActive: boolean;
}

export interface TargetSegmentsResponse {
	success: boolean;
	data: {
		discountId: string;
		code: string;
		name: string;
		totalTargetSegments: number;
		targetSegments: TargetSegment[];
	};
}

export interface SetTargetSegmentsResponse {
	success: boolean;
	message: string;
	data: {
		previousCount: number;
		newCount: number;
		invalidIds: string[];
	};
}

export interface SearchUsersResponse {
	success: boolean;
	count: number;
	data: TargetUser[];
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
	/** Solo para nuevos clientes que NUNCA tuvieron suscripción paga */
	newCustomersOnly?: boolean;
	/** Excluir usuarios con suscripción paga actualmente activa */
	excludeActiveSubscribers?: boolean;
	minimumAmount?: number | null;
	isPublic?: boolean;
	priority?: number;
	promotionalMessage?: string;
	badge?: string;
	isActive?: boolean;
	environments?: StripeEnvironment[];
	targetUsers?: string[]; // Array de IDs de usuarios específicos
	targetSegments?: string[]; // Array de IDs de segmentos de contactos
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

// Types for User Promotions endpoint
export interface UserPromotionRedemption {
	redeemedAt: string;
	planId?: string;
	billingPeriod?: string;
	amountSaved?: number;
}

export interface UserPromotion {
	_id: string;
	code: string;
	name: string;
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	badge: string | null;
	promotionalMessage: string | null;
	// Estado
	isActive: boolean;
	isExpired: boolean;
	isNotYetValid: boolean;
	validFrom: string;
	validUntil: string;
	// Entornos
	targetEnvironment: "both" | "development" | "production";
	availableInDevelopment: boolean;
	availableInProduction: boolean;
	hasStripeDevSync: boolean;
	hasStripeProdSync: boolean;
	// Uso por el usuario
	redeemedByUser: boolean;
	userRedemptionCount: number;
	maxRedemptionsPerUser: number;
	canStillUse: boolean;
	userRedemptions: UserPromotionRedemption[];
	// Elegibilidad
	eligibilityReason: "targetUser" | "segment" | "public";
	segmentNames: string[];
	// Descuento
	duration: "once" | "repeating" | "forever";
	durationInMonths?: number;
	applicablePlans: string[];
	// Prioridad
	priority: number;
}

export interface UserPromotionsSummary {
	total: number;
	active: number;
	expired: number;
	redeemed: number;
	canUse: number;
}

export interface UserPromotionsResponse {
	success: boolean;
	data: {
		user: {
			_id: string;
			email: string;
			firstName: string;
			lastName: string;
		};
		promotions: UserPromotion[];
		summary: UserPromotionsSummary;
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

	// ============================================
	// Métodos para gestión de usuarios objetivo (targetUsers)
	// ============================================

	/**
	 * Buscar usuarios para agregar como objetivo
	 */
	async searchUsers(query: string, limit: number = 20): Promise<SearchUsersResponse> {
		try {
			const response = await adminAxios.get<SearchUsersResponse>(
				`/api/discounts/search-users?q=${encodeURIComponent(query)}&limit=${limit}`
			);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al buscar usuarios");
		}
	}

	/**
	 * Obtener usuarios objetivo de un código de descuento
	 */
	async getTargetUsers(discountId: string): Promise<TargetUsersResponse> {
		try {
			const response = await adminAxios.get<TargetUsersResponse>(
				`/api/discounts/${discountId}/target-users`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al obtener usuarios objetivo");
		}
	}

	/**
	 * Agregar usuarios objetivo a un código de descuento
	 */
	async addTargetUsers(discountId: string, params: AddTargetUsersParams): Promise<AddTargetUsersResponse> {
		try {
			const response = await adminAxios.post<AddTargetUsersResponse>(
				`/api/discounts/${discountId}/target-users`,
				params
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al agregar usuarios");
		}
	}

	/**
	 * Eliminar usuarios objetivo de un código de descuento
	 */
	async removeTargetUsers(discountId: string, params: AddTargetUsersParams): Promise<RemoveTargetUsersResponse> {
		try {
			const response = await adminAxios.delete<RemoveTargetUsersResponse>(
				`/api/discounts/${discountId}/target-users`,
				{ data: params }
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al eliminar usuarios");
		}
	}

	/**
	 * Reemplazar todos los usuarios objetivo de un código de descuento
	 */
	async setTargetUsers(discountId: string, params: AddTargetUsersParams): Promise<SetTargetUsersResponse> {
		try {
			const response = await adminAxios.put<SetTargetUsersResponse>(
				`/api/discounts/${discountId}/target-users`,
				params
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al configurar usuarios");
		}
	}

	// ============================================
	// Target Segments Methods
	// ============================================

	/**
	 * Obtener segmentos objetivo de un código de descuento
	 */
	async getTargetSegments(discountId: string): Promise<TargetSegmentsResponse> {
		try {
			const response = await adminAxios.get<TargetSegmentsResponse>(
				`/api/discounts/${discountId}/target-segments`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al obtener segmentos");
		}
	}

	/**
	 * Actualizar segmentos objetivo de un código de descuento
	 */
	async setTargetSegments(discountId: string, segmentIds: string[]): Promise<SetTargetSegmentsResponse> {
		try {
			const response = await adminAxios.put<SetTargetSegmentsResponse>(
				`/api/discounts/${discountId}/target-segments`,
				{ segmentIds }
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Código de descuento no encontrado");
			}
			throw new Error(error.response?.data?.message || "Error al configurar segmentos");
		}
	}

	// ============================================
	// User Promotions lookup
	// ============================================

	/**
	 * Obtener todas las promociones que aplican a un usuario específico
	 */
	async getUserPromotions(userId: string): Promise<UserPromotionsResponse> {
		try {
			const response = await adminAxios.get<UserPromotionsResponse>(
				`/api/discounts/user/${userId}/promotions`
			);
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 404) {
				throw new Error("Usuario no encontrado");
			}
			if (error.response?.status === 400) {
				throw new Error("ID de usuario inválido");
			}
			throw new Error(error.response?.data?.message || "Error al obtener promociones del usuario");
		}
	}

}

export default new DiscountsService();
