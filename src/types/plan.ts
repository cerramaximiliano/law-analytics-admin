export interface ResourceLimit {
	name: string;
	limit: number;
	description: string;
}

export interface PlanFeature {
	name: string;
	enabled: boolean;
	description: string;
}

export interface PlanPricingInfo {
	basePrice: number;
	currency: string;
	billingPeriod: "monthly" | "yearly" | "daily" | "weekly" | "annual" | string;
	stripePriceId?: string;
}

export interface EnvironmentConfig {
	stripeProductId?: string;
	stripePriceId?: string;
	basePrice?: number;
	currency?: string;
	billingPeriod?: "daily" | "weekly" | "monthly" | "annual";
	lastSync?: string | Date;
}

export interface ChangeHistoryEntry {
	date: string;
	field: string;
	oldValue: any;
	newValue: any;
}

export interface Plan {
	_id?: {
		$oid: string;
	};
	planId: string;
	displayName: string;
	description: string;
	isActive: boolean;
	isDefault: boolean;
	resourceLimits: ResourceLimit[];
	features: PlanFeature[];
	// Información de entornos con los datos de Stripe
	environments?: {
		development?: EnvironmentConfig;
		production?: EnvironmentConfig;
	};
	// Campos legacy para compatibilidad
	pricingInfo: PlanPricingInfo;
	createdAt?: {
		$date: string;
	};
	updatedAt?: {
		$date: string;
	};
	__v?: number;
	stripePriceId?: string;
	stripeProductId?: string;
	metadata?: {
		lastSyncEnv?: string;
		lastSyncDate?: string;
		[key: string]: any;
	};
	changeHistory?: ChangeHistoryEntry[];
}

export interface PlansResponse {
	success: boolean;
	data: Plan[];
	message?: string;
}

export interface PlanResponse {
	success: boolean;
	data: Plan;
	message?: string;
}

export interface SyncResponse {
	success: boolean;
	data: Array<{ planId: string; displayName: string; synced: boolean }>;
	message?: string;
}

export interface DeleteResponse {
	success: boolean;
	message?: string;
}
