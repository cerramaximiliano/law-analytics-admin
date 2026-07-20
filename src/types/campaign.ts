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

export interface SendingRestrictions {
	allowedDays: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
	timeWindow: {
		start: string; // Format "HH:MM"
		end: string; // Format "HH:MM"
	};
}

export interface RecurringSchedule {
	enabled: boolean;
	frequency: "daily" | "weekly" | "monthly" | "yearly";
	dayOfMonth: number; // 1-31, -1 for last day of month
	dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
	monthOfYear: number; // 1-12
	time: string; // Format "HH:MM"
	lastExecutedAt?: Date | string;
}

export interface CampaignSettings {
	throttleRate: number;
	dailyLimit?: number; // Límite de emails por día (0 = sin límite)
	timezone: string;
	tracking: TrackingSettings;
	personalization: {
		defaultValues: Record<string, any>;
	};
	retryConfig: RetryConfig;
	sendingRestrictions?: SendingRestrictions;
	recurringSchedule?: RecurringSchedule; // For recurring campaigns with fixed dates
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
	// Controla si la campaña sincroniza contactos automáticamente con el segmento
	// true = sincroniza automáticamente, false = no sincroniza (default en campañas duplicadas)
	syncWithSegment?: boolean;
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
	// Promo adjunta (doc de discountcodes). Si está seteada, el contenido dinámico
	// de descuento ({{descuento.*}}, {{tablaPrecios}}) usa ese código en vez de la
	// selección automática. Requerida para activar campañas cuyos emails usan descuento.
	promoDiscountId?: string | null;
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
	promoDiscountId?: string | null;
}

// Código de descuento disponible para adjuntar a una campaña
// (GET /api/campaigns/promos/available)
export interface AvailablePromo {
	_id: string;
	code: string;
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	currency: string;
	validFrom?: string;
	validUntil?: string;
	duration?: string;
	durationInMonths?: number | null;
	priority: number;
	isPublic: boolean;
	targeted: boolean;
	vigente: boolean;
}

// Estado de uso de contenido de descuento de una campaña
// (GET /api/campaigns/:id/discount-usage)
export interface CampaignDiscountUsage {
	usesDiscountContent: boolean;
	promoDiscountId: string | null;
	promo: { _id: string; code: string | null; valid: boolean; reason: string | null } | null;
	activationBlocked: boolean;
}

// Types for Campaign Send Logs
export type SendLogStatus = "queued" | "sent" | "delivered" | "bounced" | "complained" | "failed" | "unsubscribed";

export interface CampaignSendLog {
	_id: string;
	campaignId: string;
	campaignEmailId: {
		_id: string;
		name: string;
		subject: string;
		sequenceIndex: number;
	};
	contactId: {
		_id: string;
		email: string;
		firstName?: string;
		lastName?: string;
	};
	recipientEmail: string;
	subject?: string;
	messageId?: string;
	status: SendLogStatus;
	queuedAt?: string;
	sentAt?: string;
	deliveredAt?: string;
	bouncedAt?: string;
	complainedAt?: string;
	unsubscribedAt?: string;
	opens: number;
	firstOpenedAt?: string;
	lastOpenedAt?: string;
	clicks: number;
	firstClickedAt?: string;
	lastClickedAt?: string;
	clickedLinks?: Array<{ url: string; clickedAt: string }>;
	sequenceIndex: number;
	bounce?: {
		type: string;
		subType: string;
		diagnosticCode?: string;
	};
	complaint?: {
		feedbackType: string;
	};
	error?: {
		code: string;
		message: string;
	};
	createdAt: string;
	updatedAt: string;
}

export interface CampaignSendLogsResponse {
	success: boolean;
	data: CampaignSendLog[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
}

export interface CampaignSendStatsSummary {
	total: number;
	sent: number;
	delivered: number;
	bounced: number;
	complained: number;
	failed: number;
	queued: number;
	unsubscribed: number;
	totalOpens: number;
	totalClicks: number;
	uniqueOpens: number;
	uniqueClicks: number;
	deliveryRate: number;
	bounceRate: number;
	openRate: number;
	clickRate: number;
	unsubscribeRate: number;
}

export interface StatusBreakdown {
	_id: string;
	count: number;
}

export interface EmailBreakdown {
	_id: string;
	count: number;
	delivered: number;
	bounced: number;
	unsubscribed: number;
	opens: number;
	clicks: number;
	name?: string;
	subject?: string;
	sequenceIndex?: number;
}

export interface StepBreakdownItem {
	step: number;
	name: string;
	sent: number;
	delivered: number;
	bounced: number;
}

export interface DailyBreakdown {
	_id: string; // Date in YYYY-MM-DD format
	sent: number;
	delivered: number;
	bounced: number;
	unsubscribed: number;
	opens: number;
	clicks: number;
	stepBreakdown?: StepBreakdownItem[];
}

export interface CampaignSendStatsResponse {
	success: boolean;
	data: {
		summary: CampaignSendStatsSummary;
		statusBreakdown: StatusBreakdown[];
		emailBreakdown: EmailBreakdown[];
		dailyBreakdown: DailyBreakdown[];
	};
}

// === Audience stats (estado de los contactos, no de los envíos) ===

export interface AudienceStepItem {
	step: number;
	name: string;
	subject?: string;
	activeQueued: number;     // contactos esperando recibir este email
	deliveredUnique: number;  // contactos distintos que ya recibieron este email
}

export interface AudienceExclusionItem {
	step: number;
	status: "removed" | "skipped";
	reason: string | null;          // removalReason o skippedReason
	contactStatus: "active" | "unsubscribed" | "bounced" | "complained";
	count: number;
}

export interface AudienceCompletionItem {
	reason: "finished" | "unsubscribed" | "bounced" | "complained" | "manual" | null;
	count: number;
}

export interface CampaignAudienceStats {
	eligible: number;
	total: number;
	inside: number;
	excluded: number;
	statusBreakdown: Record<string, number>;
	byStep: AudienceStepItem[];
	exclusionsByStep: AudienceExclusionItem[];
	completionsByReason: AudienceCompletionItem[];
	meta: {
		sequenceLength: number;
		lastSequenceIndex: number;
		generatedAt: string;
	};
}

export interface CampaignAudienceStatsResponse {
	success: boolean;
	data: CampaignAudienceStats;
}
