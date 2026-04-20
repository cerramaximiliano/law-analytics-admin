import adminAxios from "utils/adminAxios";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "unknown";

export interface LogEntry {
	_id: string;
	service: string;
	host: string;
	level: LogLevel;
	timestamp: string;
	message: string;
	stream: "stdout" | "stderr" | "other";
	context?: Record<string, any>;
	traceId?: string | null;
	ingest?: {
		file?: string | null;
		redacted?: boolean;
		shipperVersion?: string | null;
	};
	createdAt: string;
}

export interface LogsListResponse {
	success: boolean;
	data: LogEntry[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface LogsQueryParams {
	service?: string;
	host?: string;
	level?: LogLevel | string;
	traceId?: string;
	search?: string;
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
}

export interface ServiceInfo {
	service: string;
	host: string;
	count: number;
	errors: number;
	lastSeen: string;
}

export interface LogsStats {
	total24h: number;
	totalLastHour: number;
	byLevel: Record<string, number>;
	topServices: { service: string; count: number }[];
}

export interface AnalyzeParams {
	service?: string;
	host?: string;
	level?: string;
	from?: string;
	to?: string;
	search?: string;
	limit?: number;
	focus?: "rootCause" | "anomaly" | "summary" | "trace";
}

export interface AnalyzeResponse {
	success: boolean;
	data: {
		summary: string;
		clusters: {
			title: string;
			count: number;
			level?: string;
			rootCause: string;
			fix?: string;
			sampleMessage: string;
		}[];
		anomalies?: string[];
		totalAnalyzed: number;
		filtersApplied: Record<string, any>;
	};
	usage?: {
		total_tokens?: number;
		prompt_tokens?: number;
		completion_tokens?: number;
	};
}

export interface HealthReport {
	_id: string;
	service: string;
	host: string;
	date: string;
	healthScore: "green" | "yellow" | "red" | "unknown";
	summary: string;
	metrics: {
		logCount24h: number;
		logCount7dAvg: number;
		errorCount24h: number;
		errorCount7dAvg: number;
		errorRate24h: number;
		errorRate7dAvg: number;
		levelBreakdown: Record<string, number>;
	};
	topIssues: {
		title: string;
		count: number;
		severity: "low" | "medium" | "high";
		rootCause: string;
		fix: string;
	}[];
	alerts: string[];
	aiModel: string;
	aiTokensUsed: number;
	generatedBy: "cron" | "manual";
	generationDurationMs: number;
	createdAt: string;
}

const logsService = {
	async list(params: LogsQueryParams = {}): Promise<LogsListResponse> {
		const res = await adminAxios.get<LogsListResponse>("/api/logs", { params });
		return res.data;
	},

	async services(): Promise<{ success: boolean; data: ServiceInfo[] }> {
		const res = await adminAxios.get("/api/logs/services");
		return res.data;
	},

	async stats(): Promise<{ success: boolean; data: LogsStats }> {
		const res = await adminAxios.get("/api/logs/stats");
		return res.data;
	},

	async analyze(params: AnalyzeParams): Promise<AnalyzeResponse> {
		const res = await adminAxios.post<AnalyzeResponse>("/api/logs/analyze", params, { timeout: 90000 });
		return res.data;
	},

	async listHealthReports(params: { service?: string; host?: string; score?: string; date?: string } = {}) {
		const res = await adminAxios.get<{ success: boolean; data: HealthReport[] }>("/api/logs/health-reports", { params });
		return res.data;
	},

	async getHealthReport(id: string) {
		const res = await adminAxios.get<{ success: boolean; data: HealthReport }>(`/api/logs/health-reports/${id}`);
		return res.data;
	},

	async generateHealthReport(params: { service?: string; host?: string; all?: boolean }) {
		const res = await adminAxios.post<{ success: boolean; data?: HealthReport; message?: string }>(
			"/api/logs/health-reports/generate",
			params,
			{ timeout: 120000 },
		);
		return res.data;
	},
};

export default logsService;
