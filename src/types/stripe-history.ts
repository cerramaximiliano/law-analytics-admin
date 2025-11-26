// Stripe Customer History Types

export interface StripeCustomerMetadata {
	app?: string;
	userId?: string;
	created_at?: string;
	environment?: string;
	app_version?: string;
	initial_plan?: string;
	[key: string]: string | undefined;
}

export interface StripeCustomer {
	id: string;
	email: string;
	name: string | null;
	created: string;
	currency: string;
	delinquent: boolean;
	balance: number;
	metadata: StripeCustomerMetadata;
	phone: string | null;
	address: any | null;
	tax_exempt: string;
	tax_ids: any[];
	deleted: boolean;
}

export interface StripeSubscriptionItem {
	id: string;
	object: string;
	created: number;
	price: {
		id: string;
		product: string;
		unit_amount: number;
		currency: string;
		recurring: {
			interval: string;
			interval_count: number;
		};
	};
	quantity: number;
}

export interface StripeSubscription {
	id: string;
	status: string;
	created: string;
	current_period_start: string;
	current_period_end: string;
	canceled_at: string | null;
	ended_at: string | null;
	cancel_at_period_end: boolean;
	cancel_at: string | null;
	trial_start: string | null;
	trial_end: string | null;
	plan: {
		id: string;
		product: string;
		amount: number;
		currency: string;
		interval: string;
		interval_count: number;
	};
	collection_method: string;
	payment_settings: {
		payment_method_options: any;
		payment_method_types: any;
		save_default_payment_method: string;
	};
	days_until_due: number | null;
	latest_invoice: string;
}

export interface StripeInvoiceLine {
	id: string;
	amount: number;
	currency: string;
	description: string;
	period: {
		start: number;
		end: number;
	};
	price: {
		id: string;
		product: string;
		unit_amount: number;
		currency: string;
	};
}

export interface StripeInvoice {
	id: string;
	number: string;
	status: string;
	amount_paid: number;
	amount_due: number;
	amount_remaining: number;
	currency: string;
	created: string;
	due_date: string | null;
	paid: boolean;
	paid_at: string | null;
	period_start: string;
	period_end: string;
	subscription: string;
	attempt_count: number;
	next_payment_attempt: string | null;
	pdf_url: string;
	hosted_invoice_url: string;
}

export interface StripePaymentMethod {
	id: string;
	type: string;
	created: string;
	card?: {
		brand: string;
		last4: string;
		exp_month: number;
		exp_year: number;
		funding: string;
	};
	billing_details: {
		address: {
			city: string | null;
			country: string | null;
			line1: string | null;
			line2: string | null;
			postal_code: string | null;
			state: string | null;
		};
		email: string | null;
		name: string | null;
		phone: string | null;
	};
}

export interface StripeEvent {
	id: string;
	type: string;
	created: string;
	data: {
		object_id: string;
		object_type: string;
	};
}

export interface StripeStatistics {
	totalSubscriptions: number;
	activeSubscriptions: number;
	totalInvoices: number;
	paidInvoices: number;
	totalPaymentMethods: number;
	lifetimeValue: number;
}

export interface StripeCustomerHistory {
	customer: StripeCustomer;
	subscriptions: StripeSubscription[];
	invoices: StripeInvoice[];
	paymentMethods: StripePaymentMethod[];
	recentEvents: StripeEvent[];
	stats: StripeStatistics;
}
