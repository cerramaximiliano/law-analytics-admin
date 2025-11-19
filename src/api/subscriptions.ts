import adminAxios from "utils/adminAxios";

// Types for Subscription
export interface StripeIds {
	test: string | null;
	live: string | null;
	current: string;
}

export interface NotificationStatus {
	sent: boolean;
	sentAt: string | null;
}

export interface PaymentFailures {
	count: number;
	firstFailedAt: string | null;
	lastFailedAt: string | null;
	lastFailureReason: string | null;
	lastFailureCode: string | null;
	nextRetryAt: string | null;
	notificationsSent: {
		firstWarning: NotificationStatus;
		secondWarning: NotificationStatus;
		finalWarning: NotificationStatus;
		suspensionNotice: NotificationStatus;
	};
}

export interface PaymentRecovery {
	inRecovery: boolean;
	recoveryStartedAt: string | null;
	recoveryEndedAt: string | null;
	lastRecoveryAttempt: string | null;
	recoveryAttempts: number;
	recoveredAt: string | null;
}

export interface SubscriptionLimits {
	folders: number;
	calculators: number;
	contacts: number;
	storage: number;
}

export interface SubscriptionFeatures {
	advancedAnalytics: boolean;
	exportReports: boolean;
	taskAutomation: boolean;
	bulkOperations: boolean;
	prioritySupport: boolean;
	vinculateFolders: boolean;
	booking: boolean;
}

export interface UserInfo {
	_id: string;
	email: string;
	name: string;
	role: string;
}

export interface DowngradeGracePeriod {
	previousPlan: string;
	targetPlan: string;
	expiresAt: string;
	autoArchiveScheduled: boolean;
	reminderSent: boolean;
	reminder3DaysSent: boolean;
	reminder1DaySent: boolean;
	processedAt: string | null;
	immediateCancel: boolean;
	calculatedFrom: string;
	manuallyModified: boolean;
	modifiedBy: string | null;
	modifiedAt: string | null;
}

export interface SubscriptionHistoryEvent {
	_id?: string;
	eventType: string;
	timestamp: string;
	planChange?: {
		fromPlan: string;
		toPlan: string;
		fromPrice: number;
		toPrice: number;
	};
	statusChange?: {
		fromStatus: string;
		toStatus: string;
	};
	triggeredBy: string;
	adminUser?: string;
	stripeData?: {
		eventId: string;
		subscriptionId: string;
		invoiceId: string;
		paymentIntentId: string;
		customerId: string;
	};
	paymentInfo?: {
		amount: number;
		currency: string;
		paymentMethod: string;
		failureReason: string;
		failureCode: string;
		attemptNumber: number;
	};
	metadata?: {
		reason: string;
		effectiveDate: string;
		gracePeriodEnd: string;
		cancellationDate: string;
		couponCode: string;
		discountPercentage: number;
		billingCycle: string;
		isScheduled: boolean;
		executedScheduledChange: boolean;
	};
	snapshot?: {
		plan: string;
		status: string;
		accountStatus: string;
		cancelAtPeriodEnd: boolean;
		currentPeriodStart: string;
		currentPeriodEnd: string;
	};
	notes?: string;
	requiresAttention?: boolean;
	emailSent?: boolean;
	emailTemplate?: string;
}

export interface Subscription {
	_id: string;
	user: UserInfo;
	stripeCustomerId: StripeIds;
	stripeSubscriptionId: StripeIds;
	stripePriceId: StripeIds;
	plan: string;
	status: string;
	currentPeriodStart: string;
	currentPeriodEnd: string;
	cancelAtPeriodEnd: boolean;
	trialStart: string | null;
	trialEnd: string | null;
	canceledAt: string | null;
	paymentMethod: string;
	notifiedCancellation: boolean;
	scheduledPlanChange: any | null;
	downgradeGracePeriod: DowngradeGracePeriod | null;
	paymentFailures: PaymentFailures;
	accountStatus: string;
	paymentRecovery: PaymentRecovery;
	statusHistory: any[];
	subscriptionHistory: SubscriptionHistoryEvent[];
	limits: SubscriptionLimits;
	features: SubscriptionFeatures;
	lastPlanSync: string;
	testMode?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface SubscriptionStats {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface SubscriptionsResponse {
	success: boolean;
	data: Subscription[];
	stats: SubscriptionStats;
}

export interface GetSubscriptionsParams {
	page?: number;
	limit?: number;
	status?: string;
	plan?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	testMode?: boolean;
}

export interface ResetSubscriptionParams {
	userId: string;
	cancelInStripe: boolean;
}

export interface ResetSubscriptionResponse {
	success: boolean;
	message: string;
	data?: any;
}

class SubscriptionsService {
	async getSubscriptions(params: GetSubscriptionsParams = {}): Promise<SubscriptionsResponse> {
		try {
			const response = await adminAxios.get("/api/subscriptions", { params });
			return response.data;
		} catch (error: any) {
			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/subscriptions no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			throw new Error(error.response?.data?.message || "Error al obtener las suscripciones");
		}
	}

	async resetUserSubscription(params: ResetSubscriptionParams): Promise<ResetSubscriptionResponse> {
		try {
			const response = await adminAxios.post("/api/subscriptions/reset-user", params);
			return response.data;
		} catch (error: any) {
			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/subscriptions/reset-user no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			// Si es un error 400, puede ser un problema con los parámetros
			if (error.response?.status === 400) {
				throw new Error(error.response?.data?.message || "Parámetros inválidos");
			}

			throw new Error(error.response?.data?.message || "Error al resetear la suscripción");
		}
	}
}

export default new SubscriptionsService();
