// Types for user session logs and metrics

export type LoginMethod = "password" | "google" | "token" | "other";
export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";
export type EventType = "login" | "logout" | "activity";

export interface SessionLogMetadata {
	loginMethod: LoginMethod;
	userAgent?: string;
	success: boolean;
	failReason?: string;
}

export interface SessionLog {
	_id: string;
	userId: string;
	eventType: EventType;
	sessionId?: string;
	deviceId?: string;
	deviceType: DeviceType;
	browser?: string;
	os?: string;
	ip?: string;
	location?: string;
	metadata: SessionLogMetadata;
	createdAt: string;
	updatedAt: string;
}

export interface UserSessionMetrics {
	totalLogins: number;
	lastLogin: string | null;
	activeDays: number;
	devices?: string[];
	browsers?: string[];
}

export interface UserWithSessionMetrics {
	_id: string;
	email: string;
	name: string;
	createdAt: string;
	lastLogin: string | null;
	totalLogins: number;
	activeDays: number;
}

export interface SessionStats {
	summary: {
		totalLogins: number;
		successfulLogins: number;
		failedLogins: number;
		uniqueUsers: number;
	};
	byLoginMethod: Record<string, number>;
	byDeviceType: Record<string, number>;
	dailyLogins: Array<{
		_id: string;
		logins: number;
		uniqueUsers: number;
	}>;
	period: {
		days: number;
		startDate: string;
		endDate: string;
	};
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// API Response types
export interface UsersSessionMetricsResponse {
	success: boolean;
	data: Record<string, UserSessionMetrics>;
}

export interface UserSessionHistoryResponse {
	success: boolean;
	data: SessionLog[];
	pagination: PaginationInfo;
}

export interface UserSessionMetricsResponse {
	success: boolean;
	data: {
		user: {
			_id: string;
			email: string;
			name: string;
		} | null;
		metrics: UserSessionMetrics;
		period: {
			days: number;
			startDate: string;
			endDate: string;
		};
	};
}

export interface SessionStatsResponse {
	success: boolean;
	data: SessionStats;
}

export interface UsersWithSessionMetricsResponse {
	success: boolean;
	data: UserWithSessionMetrics[];
	pagination: PaginationInfo;
}

// Query params types
export interface SessionMetricsQueryParams {
	userIds?: string;
	days?: number;
}

export interface UserSessionHistoryQueryParams {
	page?: number;
	limit?: number;
	eventType?: EventType;
	days?: number;
}

export interface UsersWithMetricsQueryParams {
	page?: number;
	limit?: number;
	search?: string;
	sortBy?: "lastLogin" | "activeDays" | "totalLogins" | "email" | "createdAt";
	sortOrder?: "asc" | "desc";
	days?: number;
}
