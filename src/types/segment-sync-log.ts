// types/segment-sync-log.ts

export type SegmentSyncLogType = 'execution' | 'segment' | 'campaign' | 'error';
export type SegmentSyncLogStatus = 'started' | 'completed' | 'failed' | 'skipped';
export type SegmentSyncLogTriggeredBy = 'cron' | 'manual' | 'api';

export interface SegmentSyncLogMetrics {
	// Para type='execution' (resumen global)
	segmentsProcessed?: number;
	campaignsProcessed?: number;
	totalContactsAdded?: number;
	totalContactsRemoved?: number;
	executionTimeMs?: number;

	// Para type='segment' (por segmento)
	contactsMatched?: number;
	contactsUpdatedSegmentArray?: number;
	campaignsInSegment?: number;

	// Para type='campaign' (por campaña)
	contactsAdded?: number;
	contactsRemoved?: number;
	activeContactsAfter?: number;
}

export interface SegmentSyncLogError {
	message: string;
	stack?: string;
	code?: string;
}

export interface SegmentSyncLogMetadata {
	hostname?: string;
	environment?: string;
	nodeVersion?: string;
	triggeredBy?: SegmentSyncLogTriggeredBy;
}

export interface SegmentSyncLog {
	_id: string;
	executionId: string;
	type: SegmentSyncLogType;
	segmentId?: string;
	segmentName?: string;
	campaignId?: string;
	campaignName?: string;
	metrics?: SegmentSyncLogMetrics;
	status: SegmentSyncLogStatus;
	error?: SegmentSyncLogError;
	metadata?: SegmentSyncLogMetadata;
	startedAt?: string;
	completedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface SegmentSyncLogExecutionDetail {
	execution: SegmentSyncLog | null;
	segments: SegmentSyncLog[];
	campaigns: SegmentSyncLog[];
	errors: SegmentSyncLog[];
}

export interface SegmentSyncLogPaginatedResponse {
	success: boolean;
	data: SegmentSyncLog[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		pages: number;
	};
}

export interface SegmentSyncLogStatsSummary {
	totalExecutions: number;
	successfulExecutions: number;
	failedExecutions: number;
	totalCampaignsProcessed: number;
	totalSegmentsProcessed: number;
	totalContactsAdded: number;
	totalContactsRemoved: number;
	avgExecutionTimeMs: number;
}

export interface SegmentSyncLogDailyStats {
	_id: string; // fecha YYYY-MM-DD
	executions: number;
	successful: number;
	failed: number;
	campaignsProcessed: number;
	contactsAdded: number;
	contactsRemoved: number;
}

export interface SegmentSyncLogStatsResponse {
	success: boolean;
	data: {
		summary: SegmentSyncLogStatsSummary;
		dailyStats: SegmentSyncLogDailyStats[];
		recentErrors: SegmentSyncLog[];
	};
}
