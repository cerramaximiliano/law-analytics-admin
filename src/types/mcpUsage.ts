// Tipos del dashboard "Uso del MCP". Matchea las respuestas de admin-api
// /api/mcp-usage/* (law-analytics-server admin-api/controllers/mcpUsageController.js).
// Fuente: colección McpUsageEvent (un doc por tool call de la-mcp-server, TTL 90 días).

export interface McpUsageQueryParams {
	from?: string;
	to?: string;
	limit?: number;
}

export interface McpUsageRange {
	from: string;
	to: string;
}

// GET /summary
export interface McpUsageSummaryData {
	total_calls: number;
	success_calls: number;
	error_calls: number;
	success_rate: number | null;
	avg_elapsed_ms: number | null;
	p50_elapsed_ms: number | null;
	p95_elapsed_ms: number | null;
	unique_users: number;
	unique_tools: number;
	unique_clients: number;
}

export interface McpUsageSummaryResponse {
	success: boolean;
	range: McpUsageRange;
	data: McpUsageSummaryData;
}

// GET /by-tool
export interface McpUsageByToolItem {
	tool: string;
	calls: number;
	success: number;
	errors: number;
	avg_elapsed_ms: number | null;
	unique_users: number;
}

// GET /by-user
export interface McpUsageByUserItem {
	userId: string;
	email?: string;
	name?: string;
	calls: number;
	success: number;
	errors: number;
	last_call: string;
	tools_used: number;
}

// GET /errors
export interface McpUsageErrorItem {
	_id: string;
	userId: string;
	clientId?: string;
	tool?: string;
	jsonRpcMethod?: string;
	errorMessage?: string;
	elapsedMs?: number;
	ts: string;
}

// GET /timeseries
export interface McpUsageTimeseriesItem {
	date: string; // YYYY-MM-DD en hora AR
	calls: number;
	errors: number;
	unique_users: number;
}

// GET /by-client
export type McpProvider = "claude" | "chatgpt" | "other" | "unknown";

export interface McpUsageByClientItem {
	clientId: string | null;
	client_name: string | null;
	provider: McpProvider;
	calls: number;
	errors: number;
	unique_users: number;
	last_call: string;
}

export interface McpUsageByProviderItem {
	provider: McpProvider;
	clients: number;
	calls: number;
	errors: number;
}

export interface McpUsageListResponse<T> {
	success: boolean;
	range: McpUsageRange;
	items: T[];
}

export interface McpUsageTimeseriesResponse extends McpUsageListResponse<McpUsageTimeseriesItem> {
	timezone: string;
}

export interface McpUsageByClientResponse extends McpUsageListResponse<McpUsageByClientItem> {
	by_provider: McpUsageByProviderItem[];
}
