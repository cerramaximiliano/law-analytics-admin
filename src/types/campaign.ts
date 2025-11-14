// Interfaces for Campaign schema structure
export interface GoogleAnalyticsTracking {
	enabled: boolean;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmContent?: string;
}

export interface TrackingSettings {
	opens: boolean;
	clicks: boolean;
	googleAnalytics: GoogleAnalyticsTracking;
}

export interface RetryConfig {
	maxRetries: number;
	retryInterval: number;
}

export interface CampaignSettings {
	throttleRate: number;
	timezone: string;
	tracking: TrackingSettings;
	personalization: {
		defaultValues: Record<string, any>;
	};
	retryConfig: RetryConfig;
}

export interface CampaignMetrics {
	totalContacts: number;
	activeContacts: number;
	completedContacts: number;
	totalEmailsSent: number;
	opens: number;
	clicks: number;
	bounces: number;
	complaints: number;
	unsubscribes: number;
	emailCount?: number; // Número de emails en la campaña
	custom: Record<string, any>;
}

export interface CampaignAudience {
	segmentId?: string;
	filters: Record<string, any>;
	exclusions: string[];
}

export type CampaignType = "onetime" | "automated" | "sequence" | "recurring";
export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

export interface Campaign {
	_id?: string;
	name: string;
	description?: string;
	type: CampaignType;
	status: CampaignStatus;
	startDate?: Date | string;
	endDate?: Date | string;
	isPermanent: boolean;
	category?: string;
	tags: string[];
	entryConditions: Record<string, any>;
	exitConditions: Record<string, any>;
	metrics: CampaignMetrics;
	audience: CampaignAudience;
	settings: CampaignSettings;
	createdBy?: string;
	lastModifiedBy?: string;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

// Interface for API responses
export interface CampaignResponse {
	success: boolean;
	data: Campaign[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
	message?: string;
	// Legacy support
	total?: number;
	page?: number;
	limit?: number;
}

// Interface for campaign creation/update
export interface CampaignInput {
	name: string;
	description?: string;
	type: CampaignType;
	status?: CampaignStatus;
	startDate?: Date | string;
	endDate?: Date | string;
	isPermanent?: boolean;
	category?: string;
	tags?: string[];
	entryConditions?: Record<string, any>;
	exitConditions?: Record<string, any>;
	audience?: Partial<CampaignAudience>;
	settings?: Partial<CampaignSettings>;
}
