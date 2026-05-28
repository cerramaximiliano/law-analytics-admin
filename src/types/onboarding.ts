// Onboarding Analytics types

export interface OnboardingSummaryRates {
	activationRate: number;
	dismissRate: number;
	stuckRate: number;
}

export interface OnboardingSummaryCounts {
	totalUsersWithOnboarding: number;
	usersCompletedOnboarding: number;
	usersDismissedOnboarding: number;
	usersCreatedFolder: number;
	stuckUsers: number;
}

export interface OnboardingEventMetric {
	count: number;
	uniqueUsers: number;
}

export interface OnboardingSessionDistributionItem {
	_id: string;
	count: number;
	createdFolder: number;
}

export interface OnboardingSummaryData {
	summary: OnboardingSummaryCounts;
	rates: OnboardingSummaryRates;
	events: Record<string, OnboardingEventMetric>;
	sessionDistribution: OnboardingSessionDistributionItem[];
}

export interface OnboardingSummaryResponse {
	success: boolean;
	data: OnboardingSummaryData;
	filters: {
		dateFrom: string | null;
		dateTo: string | null;
	};
	timestamp: string;
}

// Onboarding Events
export interface OnboardingEventUser {
	_id: string;
	email: string;
	name: string;
}

export interface OnboardingEvent {
	_id: string;
	userId: OnboardingEventUser | null;
	event: string;
	sessionsCount: number;
	metadata?: {
		// Legacy
		folderId?: string;
		timeToCompleteMs?: number;
		timeToComplete?: string;
		source?: string;
		// Nuevos (OnboardingChecklist)
		step_id?: string; // first_folder | judicial_connection | first_contact | first_deadline
		jurisdiction?: string; // PJN | MEV | SCBA | EJE
		mode?: string; // credential | individual
		completed_count?: number;
		total_steps?: number;
	};
	clientInfo?: {
		userAgent: string;
		platform: string;
		timestamp: string;
	};
	createdAt: string;
}

export interface OnboardingEventsResponse {
	success: boolean;
	data: OnboardingEvent[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

// Stuck Users
export interface OnboardingStuckUser {
	_id: string;
	email: string;
	name: string;
	sessionsCount: number;
	lastSessionAt: string | null;
	createdAt: string;
	lastLogin: string;
	daysSinceRegistration: number;
}

export interface OnboardingStuckUsersResponse {
	success: boolean;
	data: OnboardingStuckUser[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

// Funnel
export interface OnboardingFunnelStep {
	step: string;
	count: number;
	rate: number;
}

export interface OnboardingFunnelData {
	funnel: OnboardingFunnelStep[];
	dismissed: {
		count: number;
		rate: number;
	};
	conversionRate: number;
}

export interface OnboardingFunnelResponse {
	success: boolean;
	data: OnboardingFunnelData;
	filters: {
		dateFrom: string | null;
		dateTo: string | null;
	};
	timestamp: string;
}

// Time to Activation
export interface OnboardingTimeDistributionItem {
	range: string;
	count: number;
}

export interface OnboardingTimeToActivationData {
	averageTimeMs: number;
	averageTimeFormatted: string;
	medianTimeMs: number;
	medianTimeFormatted: string;
	averageSessions: number;
	totalCompletions: number;
	distribution: OnboardingTimeDistributionItem[];
}

export interface OnboardingTimeToActivationResponse {
	success: boolean;
	data: OnboardingTimeToActivationData;
	filters: {
		dateFrom: string | null;
		dateTo: string | null;
	};
	timestamp: string;
}

// Query Params
export interface OnboardingQueryParams {
	dateFrom?: string;
	dateTo?: string;
	event?: string;
	userId?: string;
	page?: number;
	limit?: number;
	minSessions?: number;
}

// ── Reset onboarding por user (admin tool) ──
export interface OnboardingUserState {
	createdFirstFolder: boolean;
	createdFirstFolderAt: string | null;
	usedFirstFeature: boolean;
	firstFeatureUsedAt: string | null;
	firstFeatureName: string | null;
	onboardingComplete: boolean;
	onboardingCompletedAt: string | null;
	completedSteps: string[];
	onboardingSessionsCount: number;
	lastOnboardingSessionAt: string | null;
	dismissed: boolean;
	dismissedAt: string | null;
}

export interface OnboardingResetResponse {
	success: boolean;
	message: string;
	user: { _id: string; email: string; onboarding: OnboardingUserState };
	purgedEvents: number;
}

// ── Búsqueda de usuarios ──
export interface OnboardingUserSearchItem {
	_id: string;
	email: string;
	firstName?: string;
	lastName?: string;
	role: string;
	createdAt: string;
	onboarding?: OnboardingUserState | null;
}

export interface OnboardingUserSearchResponse {
	success: boolean;
	data: OnboardingUserSearchItem[];
}

// ── Funnel por step del OnboardingChecklist ──
// Granular: shown → click step #1 → done step #1 → click step #2 → done #2 → ...
// Conteo de users únicos (no de eventos).
export interface OnboardingStepFunnelItem {
	id: string; // first_folder | judicial_connection | first_contact | first_deadline
	clicked: number;
	completed: number;
	dropOff: number; // porcentaje 0-100
}

export interface OnboardingJudicialClick {
	jurisdiction: string; // PJN | MEV | SCBA | EJE
	mode: string; // credential | individual
	uniqueUsers: number;
}

export interface OnboardingFunnelByStepData {
	totalShown: number;
	totalCompleted: number;
	totalDismissed: number;
	steps: OnboardingStepFunnelItem[];
	judicialClicks: OnboardingJudicialClick[];
}

export interface OnboardingFunnelByStepResponse {
	success: boolean;
	data: OnboardingFunnelByStepData;
	filters: { dateFrom: string | null; dateTo: string | null };
	timestamp: string;
}

// ── Detalle de onboarding de un user ──
export interface OnboardingUserDetailResponse {
	success: boolean;
	data: {
		user: {
			_id: string;
			email: string;
			firstName?: string;
			lastName?: string;
			role: string;
			createdAt: string;
			lastLogin: string | null;
		};
		onboarding: OnboardingUserState | null;
		realCounts: { folders: number };
		recentEvents: OnboardingEvent[];
	};
}
