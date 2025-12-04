import pjnAxios from "utils/pjnAxios";

// Types for Worker Logs API
export interface WorkerLogCount {
	success: boolean;
	total: number;
	byType: {
		update?: number;
		stuck_documents?: number;
		verify?: number;
		recovery?: number;
		scraping?: number;
	};
}

export interface WorkerLogStats {
	success: boolean;
	period: string;
	summary: {
		totalOperations: number;
		successCount: number;
		failedCount: number;
		successRate: number;
		totalMovimientosAdded: number;
		avgDuration: number;
	};
	byWorkerType: Array<{
		_id: string;
		totalCount: number;
		stats: Array<{
			status: string;
			count: number;
			avgDuration: number;
		}>;
	}>;
}

export interface WorkerInfo {
	workerId: string;
	workerType: string;
	lastActivity: string;
	lastStatus: string;
	stats: {
		totalOperations: number;
		successCount: number;
		successRate: number;
		avgDuration: number;
		totalMovimientos: number;
	};
}

export interface WorkerListResponse {
	success: boolean;
	total: number;
	workers: WorkerInfo[];
}

export interface InProgressTask {
	_id: string;
	workerType: string;
	workerId: string;
	document: {
		number: number;
		year: number;
		fuero: string;
	};
	runningFor: number;
}

export interface WorkerActivityResponse {
	success: boolean;
	timestamp: string;
	period: string;
	currentlyProcessing: number;
	inProgressTasks: InProgressTask[];
	recentActivity: Record<string, { total: number; success: number; partial: number; failed?: number }>;
}

export interface ErrorPattern {
	count: number;
	lastOccurrence: string;
	workers: string[];
	examples: Array<{
		logId: string;
		number: number;
		year: number;
	}>;
}

export interface FailedLogsResponse {
	success: boolean;
	total: number;
	period: string;
	errorPatterns: Record<string, ErrorPattern>;
	logs: WorkerLog[];
}

export interface DocumentState {
	movimientosCount: number;
	lastUpdate?: string;
}

export interface WorkerLogDocument {
	documentId?: string;
	model?: string;
	number: number;
	year: number;
	fuero: string;
	stateBefore?: DocumentState;
	stateAfter?: DocumentState;
}

export interface WorkerLogChanges {
	movimientosAdded?: number;
	fieldsUpdated?: string[];
}

export interface WorkerLogResult {
	message: string;
	verificationResult?: {
		documentFound: boolean;
	};
	error?: {
		message: string;
		code?: string;
	};
}

// Detailed log entry within a WorkerLog
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface DetailedLogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	data?: Record<string, any>;
}

export interface LogsRetention {
	keepDetailedLogs: boolean;
	detailedLogsExpireAt?: string;
}

export interface WorkerLog {
	_id: string;
	workerType: string;
	workerId: string;
	status: "success" | "partial" | "failed" | "in_progress" | "error";
	document: WorkerLogDocument;
	changes?: WorkerLogChanges;
	duration?: number;
	result?: WorkerLogResult;
	startTime?: string;
	endTime?: string;
	error?: string;
	detailedLogs?: DetailedLogEntry[];
	logsRetention?: LogsRetention;
	matchCount?: number; // Used in search results
}

export interface WorkerLogsListResponse {
	success: boolean;
	data: WorkerLog[];
	pagination: {
		total: number;
		limit: number;
		skip: number;
		hasMore: boolean;
		pages: number;
		currentPage: number;
	};
}

export interface DocumentLogsResponse {
	success: boolean;
	documentId: string;
	stats: {
		totalOperations: number;
		successCount: number;
		failedCount: number;
		totalMovimientosAdded: number;
		lastOperation: string;
	};
	logs: WorkerLog[];
}

export interface LogDetailResponse {
	success: boolean;
	data: WorkerLog;
}

// Query parameters interfaces
export interface LogsListParams {
	workerType?: "verify" | "update" | "scraping" | "recovery" | "stuck_documents";
	status?: "success" | "partial" | "failed" | "in_progress";
	fuero?: "CIV" | "CSS" | "CNT" | "COM";
	workerId?: string;
	hours?: number | "all";
	limit?: number;
	skip?: number;
	documentId?: string;
	sort?: string;
}

// Search logs parameters
export interface SearchLogsParams {
	q: string;
	workerType?: "verify" | "update" | "scraping" | "recovery" | "stuck_documents";
	status?: "success" | "partial" | "failed" | "in_progress" | "error";
	hours?: number;
	level?: LogLevel;
	limit?: number;
	skip?: number;
}

// Search logs response
export interface SearchLogsResponse {
	success: boolean;
	searchText: string;
	period: string;
	filters: {
		workerType: string | null;
		status: string | null;
		level: string | null;
	};
	results: WorkerLog[];
	pagination: {
		total: number;
		limit: number;
		skip: number;
		hasMore: boolean;
	};
}

// Logs stats response
export interface LogsStatsResponse {
	success: boolean;
	statistics: {
		documentsWithLogs: number;
		documentsWithoutLogs: number;
		totalLogEntries: number;
		avgLogsPerDocument: number;
		byWorkerType: Array<{
			_id: string;
			count: number;
			totalLogEntries: number;
		}>;
		pendingCleanup: number;
	};
}

// Cleanup request and response
export interface CleanupParams {
	retentionDays?: number;
}

export interface CleanupResponse {
	success: boolean;
	cleanedAt: string;
	retentionDays: number;
	cutoffDate: string;
	expiredLogsCleared: number;
	oldLogsCleared: number;
	totalCleared: number;
}

// Worker Logs Service
export class WorkerLogsService {
	private static readonly BASE_PATH = "/api/worker-logs";

	/**
	 * GET /count - Total log count by worker type
	 */
	static async getCount(): Promise<WorkerLogCount> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/count`);
		return response.data;
	}

	/**
	 * GET /stats - Detailed operation statistics
	 * @param hours - Analysis period (default: 24)
	 */
	static async getStats(hours: number = 24): Promise<WorkerLogStats> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/stats`, {
			params: { hours },
		});
		return response.data;
	}

	/**
	 * GET /workers - List of workers with individual statistics
	 * @param hours - Analysis period (default: 24)
	 */
	static async getWorkers(hours: number = 24): Promise<WorkerListResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/workers`, {
			params: { hours },
		});
		return response.data;
	}

	/**
	 * GET /activity - Real-time activity
	 * @param minutes - Analysis period (default: 5)
	 */
	static async getActivity(minutes: number = 5): Promise<WorkerActivityResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/activity`, {
			params: { minutes },
		});
		return response.data;
	}

	/**
	 * GET /failed - Failed logs with error patterns
	 * @param hours - Analysis period (default: 24)
	 * @param limit - Number of logs to return (default: 100)
	 */
	static async getFailedLogs(hours: number = 24, limit: number = 100): Promise<FailedLogsResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/failed`, {
			params: { hours, limit },
		});
		return response.data;
	}

	/**
	 * GET / - List logs with filters and pagination
	 */
	static async getLogs(params: LogsListParams = {}): Promise<WorkerLogsListResponse> {
		const response = await pjnAxios.get(this.BASE_PATH, { params });
		return response.data;
	}

	/**
	 * GET /document/:documentId - Log history for a document
	 */
	static async getDocumentLogs(documentId: string): Promise<DocumentLogsResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/document/${documentId}`);
		return response.data;
	}

	/**
	 * GET /:id - Complete detail of a specific log (includes detailedLogs)
	 */
	static async getLogDetail(id: string): Promise<LogDetailResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/${id}`);
		return response.data;
	}

	/**
	 * GET /search-logs - Search text in detailed logs
	 */
	static async searchLogs(params: SearchLogsParams): Promise<SearchLogsResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/search-logs`, { params });
		return response.data;
	}

	/**
	 * GET /logs-stats - Get detailed logs usage statistics
	 */
	static async getLogsStats(): Promise<LogsStatsResponse> {
		const response = await pjnAxios.get(`${this.BASE_PATH}/logs-stats`);
		return response.data;
	}

	/**
	 * POST /cleanup - Execute manual cleanup of expired detailed logs
	 */
	static async cleanupLogs(params: CleanupParams = {}): Promise<CleanupResponse> {
		const response = await pjnAxios.post(`${this.BASE_PATH}/cleanup`, params);
		return response.data;
	}
}

export default WorkerLogsService;
