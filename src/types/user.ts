// types for user

// Interfaz para los datos ligeros del usuario
export interface LightDataItem<T> {
	items: T[];
	count: number;
	totalCount: number;
}

export interface FolderLightData {
	_id: string;
	folderName: string;
	materia: string;
	status: string;
	initialDateFolder: string;
	finalDateFolder: string | null;
	amount: number;
}

export interface CalculatorLightData {
	_id: string;
	type: string;
	classType: string;
	amount: number;
	date: string;
	folderName: string;
}

export interface ContactLightData {
	_id: string;
	name: string;
	lastName: string;
	role: string;
	type: string;
	email: string;
	phone: string;
}

export interface EventLightData {
	_id: string;
	title: string;
	start: string;
	end: string;
	type: string;
	allDay: boolean;
}

export interface UserLightData {
	folders: LightDataItem<FolderLightData>;
	calculators: LightDataItem<CalculatorLightData>;
	contacts: LightDataItem<ContactLightData>;
	events: LightDataItem<EventLightData>;
}

// Interfaz para la suscripción del usuario
export interface Subscription {
	_id: string;
	user: string;
	name: string; // Plan name for display
	stripeCustomerId: string;
	stripeSubscriptionId?: string;
	stripePriceId?: string;
	plan: "free" | "standard" | "premium";
	status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "unpaid" | "incomplete_expired";
	currentPeriodStart: Date;
	currentPeriodEnd: Date;
	startDate: Date; // Start date
	endDate?: Date; // End date
	cancelAtPeriodEnd: boolean;
	trialStart?: Date;
	trialEnd?: Date;
	canceledAt?: Date;
	paymentMethod?: string;
	paymentInfo?: {
		method: string;
		lastPayment?: Date;
		nextPayment?: Date;
		lastFourDigits?: string;
		brand?: string;
		expiryMonth?: number;
		expiryYear?: number;
	};
	limits: {
		maxFolders?: number;
		maxCalculators?: number;
		maxContacts?: number;
		storageLimit?: number;
		// Nuevas propiedades del API
		folders?: number;
		calculators?: number;
		contacts?: number;
		storage?: number;
	};
	features: {
		advancedAnalytics?: boolean;
		exportReports?: boolean;
		taskAutomation?: boolean;
		bulkOperations?: boolean;
		prioritySupport?: boolean;
		vinculateFolders?: boolean;
		booking?: boolean;
		movements?: boolean;
		[key: string]: boolean | undefined; // Permitir propiedades dinámicas
	};
	// Nuevas propiedades con descripciones
	featuresWithDescriptions?: Array<{
		name: string;
		enabled: boolean;
		description: string;
	}>;
	featureDetails?: {
		[key: string]: {
			enabled: boolean;
			description: string;
		};
	};
	limitsWithDescriptions?: Array<{
		name: string;
		limit: number;
		description: string;
	}>;
	limitDetails?: {
		[key: string]: {
			limit: number;
			description: string;
		};
	};
	pendingPlanChange?: {
		planId: string;
		effectiveDate: Date;
	};
	scheduledPlanChange?: {
		targetPlan: string;
		effectiveDate: Date;
		notified: boolean;
	};
	downgradeGracePeriod?: {
		previousPlan: string;
		targetPlan: string;
		expiresAt: Date;
		originalLimits?: {
			maxFolders: number;
			maxCalculators: number;
			maxContacts: number;
			storageLimit: number;
		};
		originalFeatures?: {
			advancedAnalytics: boolean;
			exportReports: boolean;
			taskAutomation: boolean;
			bulkOperations: boolean;
			prioritySupport: boolean;
			vinculateFolders: boolean;
			booking: boolean;
		};
		isActive?: boolean;
		notificationsSent?: string[];
		autoArchiveScheduled?: boolean;
		reminderSent?: boolean;
		reminder3DaysSent?: boolean;
		reminder1DaySent?: boolean;
		immediateCancel?: boolean;
	};
	paymentFailures?: {
		count: number;
		dates: Date[];
		lastAttempt?: Date;
		nextRetry?: Date;
		notificationsSent?: {
			firstFailure?: Date;
			secondFailure?: Date;
			finalWarning?: Date;
		};
	};
	accountStatus?: {
		isLocked: boolean;
		lockedAt?: Date;
		lockedReason?: string;
		suspendedFeatures?: string[];
		warnings?: {
			type: string;
			message: string;
			sentAt: Date;
		}[];
	};
	paymentRecovery?: {
		isInRecovery: boolean;
		recoveryStarted?: Date;
		attemptCount: number;
		lastRecoveryAttempt?: Date;
		recoveryDeadline?: Date;
		recoveryMethod?: string;
	};
	statusHistory?: {
		status: string;
		changedAt: Date;
		reason?: string;
		metadata?: Record<string, any>;
	}[];
	metadata?: {
		source?: string;
		referrer?: string;
		campaignId?: string;
		notes?: string;
		customFields?: Record<string, any>;
	};
	usageTracking?: {
		foldersCreated: number;
		calculatorsCreated: number;
		contactsCreated: number;
		lastActivityDate?: Date;
		storageUsed: number;
	};
	invoiceSettings?: {
		customerId?: string;
		billingEmail?: string;
		taxId?: string;
		billingAddress?: {
			line1?: string;
			line2?: string;
			city?: string;
			state?: string;
			postalCode?: string;
			country?: string;
		};
	};
	notifications?: {
		email: boolean;
		sms: boolean;
		inApp: boolean;
		marketing: boolean;
		billingAlerts: boolean;
	};
	createdAt?: Date;
	updatedAt?: Date;
}

export interface User {
	id: string;
	_id: string; // Add _id property that matches id
	email: string;
	name: string;
	role: string;
	status: string;
	avatar?: string;
	phone?: string;
	lastLogin?: string;
	subscription?: Subscription;
	lightData?: UserLightData;
	createdAt: string;
	updatedAt: string;
}

export interface UsersResponse {
	users: User[];
	total: number;
}

export interface UserResponse {
	user: User;
	subscription?: Subscription;
	lightData?: UserLightData;
}
