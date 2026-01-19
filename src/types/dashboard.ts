// Dashboard types

export interface UserStats {
	total: number;
	active: number;
	verified: number;
}

export interface SubscriptionPlanBreakdown {
	free: number;
	standard: number;
	premium: number;
}

export interface SubscriptionModeStats {
	total: number;
	active: number;
	byPlan: SubscriptionPlanBreakdown;
}

export interface SubscriptionStats {
	total: number;
	active: number;
	byPlan: SubscriptionPlanBreakdown;
	live: SubscriptionModeStats;
	test: SubscriptionModeStats;
}

export interface FolderSourceStats {
	total: number;
	verified: number;
	nonVerified: number;
	pending: number;
}

export interface FolderStats {
	total: number;
	verified: number;
	pending: number;
	pjn: FolderSourceStats;
	mev: FolderSourceStats;
}

export interface MarketingCampaignStats {
	total: number;
	active: number;
	scheduled: number;
}

export interface MarketingContactStats {
	total: number;
	active: number;
	// Email verification stats (isEmailVerified field)
	emailVerified?: number;
	emailNotVerified?: number;
	// Verification result stats (emailVerification.verified field)
	verificationValid?: number;
	verificationNotValid?: number;
}

export interface MarketingSegmentStats {
	total: number;
	dynamic: number;
	static: number;
}

export interface MarketingStats {
	campaigns: MarketingCampaignStats;
	contacts: MarketingContactStats;
	segments: MarketingSegmentStats;
}

export interface ContactStats {
	total: number;
}

export interface CalculatorStats {
	total: number;
}

export interface DashboardSummary {
	users: UserStats;
	subscriptions: SubscriptionStats;
	folders: FolderStats;
	marketing: MarketingStats;
	contacts?: ContactStats;
	calculators?: CalculatorStats;
}

export interface DashboardSummaryResponse {
	success: boolean;
	data: DashboardSummary;
	timestamp: string;
}

// Detailed stats types
export interface DetailedUserStats {
	total: number;
	active: number;
	inactive: number;
	verified: number;
	unverified: number;
	admins: number;
	recentRegistrations: number;
	recentLogins: number;
}

export interface DetailedSubscriptionStats {
	total: number;
	byStatus: {
		active: number;
		canceled: number;
		trialing: number;
		pastDue: number;
	};
	byPlan: {
		free: number;
		standard: number;
		premium: number;
	};
	scheduledCancellations: number;
	gracePeriod: number;
}

export interface DetailedFolderStats {
	total: number;
	verified: number;
	unverified: number;
	archived: number;
	byStatus: {
		new: number;
		inProgress: number;
		closed: number;
		pending: number;
	};
	bySource: {
		manual: number;
		pjn: number;
		mev: number;
	};
}
