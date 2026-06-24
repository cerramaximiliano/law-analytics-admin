// Types para el dashboard de estadísticas de usuarios (/admin/users/dashboard)

export interface UserDashboardPagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// --- Overview ---
export interface UserDashboardOverview {
	users: {
		total: number;
		activeAccounts: number;
		verified: number;
		newThisWeek: number;
		activeInWindow: number;
		inactiveInWindow: number;
	};
	onboarding: {
		completed: number;
		completionRate: number;
	};
	subscriptions: {
		byPlan: { free: number; standard: number; pro: number; premium: number };
		paidUsers: number;
		paymentRisk: number;
	};
	window: { days: number; activeCutoff: string };
}

export interface UserDashboardOverviewResponse {
	success: boolean;
	data: UserDashboardOverview;
	timestamp: string;
}

// --- Activity ranking (top usuarios) ---
export interface ActivityRankingRow {
	_id: string;
	email?: string;
	name?: string;
	createdAt?: string;
	subscriptionPlan?: string;
	totalLogins: number;
	activeDays: number;
	lastLogin?: string;
	score: number;
}

export interface ActivityRankingResponse {
	success: boolean;
	data: ActivityRankingRow[];
	meta: { days: number; limit: number; scoreFormula: string };
}

// --- Inactivos / churn risk ---
export interface InactiveUserRow {
	_id: string;
	email?: string;
	name?: string;
	createdAt?: string;
	lastLogin?: string | null;
	plan: string;
	isPaid: boolean;
	subscriptionStatus?: string;
	daysSinceLastLogin: number | null;
}

export interface InactiveUsersResponse {
	success: boolean;
	data: InactiveUserRow[];
	pagination: UserDashboardPagination;
	meta: { days: number; onlyPaid: boolean };
}

// --- Nuevos sin activar ---
export interface NewUnactivatedRow {
	_id: string;
	email?: string;
	name?: string;
	createdAt: string;
	isVerified?: boolean;
	lastLogin?: string | null;
	onboardingSessionsCount: number;
	subscriptionPlan?: string;
	daysSinceRegistration: number;
}

export interface NewUnactivatedResponse {
	success: boolean;
	data: NewUnactivatedRow[];
	pagination: UserDashboardPagination;
	meta: { days: number };
}

// --- Pagos en riesgo ---
export interface PaymentRiskRow {
	_id: string;
	userId: string;
	email?: string;
	name?: string;
	plan: string;
	status?: string;
	accountStatus?: string;
	cancelAtPeriodEnd?: boolean;
	currentPeriodEnd?: string;
	paymentFailuresCount: number;
	lastFailedAt?: string;
	lastFailureReason?: string;
}

export interface PaymentRiskResponse {
	success: boolean;
	data: PaymentRiskRow[];
	pagination: UserDashboardPagination;
}

// --- Query params ---
export interface InactiveQueryParams {
	days?: number;
	page?: number;
	limit?: number;
	onlyPaid?: boolean;
}

export interface NewUnactivatedQueryParams {
	days?: number;
	page?: number;
	limit?: number;
}

export interface PaymentRiskQueryParams {
	page?: number;
	limit?: number;
}
