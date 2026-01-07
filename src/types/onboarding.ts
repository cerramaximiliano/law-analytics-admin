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
		folderId?: string;
		timeToCompleteMs?: number;
		timeToComplete?: string;
		source?: string;
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
