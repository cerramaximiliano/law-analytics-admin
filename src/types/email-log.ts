// Types for Email Logs

export interface EmailLogUser {
	_id: string;
	email: string;
	name?: string;
	firstName?: string;
	lastName?: string;
}

export interface EmailLog {
	_id: string;
	to: string;
	userId?: EmailLogUser | string | null;
	subject: string;
	templateCategory?: string | null;
	templateName?: string | null;
	sesMessageId?: string | null;
	status: "sent" | "failed" | "bounced" | "complained" | "delivered";
	errorMessage?: string | null;
	metadata?: Record<string, any>;
	requestIp?: string | null;
	userAgent?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface EmailLogPagination {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface EmailLogsResponse {
	success: boolean;
	message: string;
	data: EmailLog[];
	pagination: EmailLogPagination;
}

export interface EmailLogResponse {
	success: boolean;
	message: string;
	data: EmailLog;
}

export interface EmailLogGeneralStats {
	total: number;
	sent: number;
	failed: number;
	bounced: number;
	complained: number;
	delivered: number;
}

export interface EmailLogGroupedStat {
	_id: string | { category: string; name: string };
	count: number;
}

export interface EmailLogTopRecipient {
	_id: string;
	count: number;
	lastEmail: string;
}

export interface EmailLogRecentFailure {
	_id: string;
	to: string;
	subject: string;
	templateCategory?: string;
	templateName?: string;
	errorMessage?: string;
	createdAt: string;
}

export interface EmailLogStatsResponse {
	success: boolean;
	message: string;
	data: {
		general: EmailLogGeneralStats;
		groupedBy: {
			field: string;
			data: EmailLogGroupedStat[];
		};
		topRecipients: EmailLogTopRecipient[];
		recentFailures: EmailLogRecentFailure[];
	};
}

export interface EmailLogTemplateOption {
	category: string;
	name: string;
	count: number;
}

export interface EmailLogTemplatesResponse {
	success: boolean;
	message: string;
	data: {
		categories: string[];
		templates: EmailLogTemplateOption[];
	};
}

export interface EmailLogsQueryParams {
	page?: number;
	limit?: number;
	sortBy?: "createdAt" | "to" | "status" | "templateCategory" | "templateName";
	sortOrder?: "asc" | "desc";
	status?: "sent" | "failed" | "bounced" | "complained" | "delivered";
	templateCategory?: string;
	templateName?: string;
	to?: string;
	userId?: string;
	startDate?: string;
	endDate?: string;
	sesMessageId?: string;
}

export interface UpdateEmailStatusParams {
	status: "sent" | "failed" | "bounced" | "complained" | "delivered";
	metadata?: Record<string, any>;
}

export interface DeleteEmailLogResponse {
	success: boolean;
	message: string;
}

export interface DeleteMultipleEmailLogsResponse {
	success: boolean;
	message: string;
	data: {
		deletedCount: number;
		requestedCount: number;
	};
}

export interface DeleteAllEmailLogsResponse {
	success: boolean;
	message: string;
	data: {
		deletedCount: number;
	};
}
