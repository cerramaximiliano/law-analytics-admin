export interface StripeCustomerMetadata {
	app: string;
	userId: string;
	created_at: string;
	environment?: string;
	app_version?: string;
	initial_plan?: string;
	consolidated?: string;
	consolidation_date?: string;
	reused_customer?: string;
	updated_at?: string;
}

export interface StripeSubscription {
	id: string;
	status: "active" | "canceled" | "past_due" | "trialing" | "unpaid" | "incomplete" | "incomplete_expired";
	current_period_start: string;
	current_period_end: string;
	cancel_at_period_end: boolean;
	plan: {
		id: string;
		product: string;
		amount: number;
		currency: string;
		interval: "month" | "year" | "week" | "day";
	};
}

export interface StripeCustomer {
	id: string;
	email: string;
	name: string;
	metadata: StripeCustomerMetadata;
	created: string;
	currency: string;
	delinquent: boolean;
	invoice_prefix: string;
	next_invoice_sequence: number;
	subscription: StripeSubscription | null;
	hasActiveSubscription: boolean;
	totalSubscriptions: number;
	environment: "test" | "live";
}

export interface StripeStats {
	totalCustomers: number;
	customersWithActiveSubscriptions: number;
	customersWithoutSubscriptions: number;
	customersWithCanceledSubscriptions: number;
}

export interface StripePaginationEnv {
	has_more: boolean;
	next_cursor: string | null;
	error: string | null;
}

export interface StripeCustomersResponse {
	success: boolean;
	customers: StripeCustomer[];
	stats: {
		combined: StripeStats;
		test: StripeStats;
		live: StripeStats;
	};
	pagination: {
		test: StripePaginationEnv;
		live: StripePaginationEnv;
	};
}

export interface DeleteStripeCustomerRequest {
	customerId?: string;
	email?: string;
	environment: "test" | "live" | "both";
}

export interface DeletedCustomerInfo {
	customerId: string;
	email: string;
}

export interface SkippedCustomerInfo {
	customerId: string;
	email: string;
	reason: string;
}

export interface DeleteEnvironmentResult {
	deleted: boolean;
	deletedCount?: number;
	deletedCustomers?: DeletedCustomerInfo[];
	skippedCount?: number;
	skippedCustomers?: SkippedCustomerInfo[];
	reason?: string;
}

export interface DeleteStripeCustomerResponse {
	success: boolean;
	message: string;
	environment: "test" | "live" | "both";
	results: {
		test?: DeleteEnvironmentResult;
		live?: DeleteEnvironmentResult;
		errors: string[];
	};
}
