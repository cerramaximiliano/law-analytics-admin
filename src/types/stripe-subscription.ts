export interface StripeCustomerMetadata {
	app: string;
	userId: string;
	created_at: string;
	environment?: string;
	app_version?: string;
	initial_plan?: string;
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
}

export interface StripeCustomersResponse {
	success: boolean;
	customers: StripeCustomer[];
	stats: {
		totalCustomers: number;
		customersWithActiveSubscriptions: number;
		customersWithoutSubscriptions: number;
		customersWithCanceledSubscriptions: number;
	};
	has_more: boolean;
	next_cursor?: string;
}
