import pjnAxios from "utils/pjnAxios";

// =================== Interfaces ===================

export interface HtmlDriftSample {
	caratula?: string | null;
	dependencia?: string | null;
	situacion?: string | null;
	idsPresentes?: string[];
	totalSpans?: number | null;
	causaRef?: string | null;
}

export interface HtmlDriftIncident {
	_id: string;
	type: string;
	signature: string;
	openedDay: string;
	startedAt: string;
	endedAt: string | null;
	durationMs: number | null;
	detectedBy: string | null;
	resolvedBy: string | null;
	detectionCount: number;
	severity: "warn" | "critical";
	notes: string | null;
	sample: HtmlDriftSample;
	createdAt: string;
	updatedAt: string;
}

export interface HtmlDriftTypeBreakdown {
	_id: string; // tipo
	total: number;
	open: number;
	totalDetections: number;
}

export interface HtmlDriftListSummary {
	openCount: number;
	openCritical: number;
	byType: HtmlDriftTypeBreakdown[];
	lastEventAt: string | null;
	lastEventType: string | null;
}

export interface HtmlDriftListResponse {
	success: boolean;
	message: string;
	data: HtmlDriftIncident[];
	count: number;
	summary: HtmlDriftListSummary;
	serverTime: string;
}

export interface HtmlDriftListParams {
	limit?: number;
	skip?: number;
	resolved?: boolean;
	sinceDays?: number;
	type?: string;
}

export interface FingerprintSelectorFreq {
	id: string;
	count: number;
	pct: number;
}

export interface FingerprintTimeseriesPoint {
	date: string;
	avgTotalSpans: number;
	count: number;
	situacionPct: number;
}

export interface FingerprintByFuero {
	_id: string | null;
	count: number;
	avgTotalSpans: number;
}

export interface FingerprintStats {
	windowDays: number;
	total: number;
	avgTotalSpans: number;
	minTotalSpans: number;
	maxTotalSpans: number;
	selectorFrequencies: FingerprintSelectorFreq[];
	timeseries: FingerprintTimeseriesPoint[];
	byFuero: FingerprintByFuero[];
}

export interface FingerprintStatsResponse {
	success: boolean;
	message: string;
	data: FingerprintStats;
	serverTime: string;
}

// =================== Service ===================

export const HtmlDriftService = {
	/**
	 * Lista drifts estructurales con filtros + summary agregado.
	 *
	 * @param params filtros (limit, skip, resolved, sinceDays, type)
	 */
	listIncidents: async (params: HtmlDriftListParams = {}): Promise<HtmlDriftListResponse> => {
		const q: Record<string, string | number> = {};
		if (params.limit !== undefined) q.limit = params.limit;
		if (params.skip !== undefined) q.skip = params.skip;
		if (params.resolved !== undefined) q.resolved = String(params.resolved);
		if (params.sinceDays !== undefined) q.sinceDays = params.sinceDays;
		if (params.type) q.type = params.type;

		const response = await pjnAxios.get<HtmlDriftListResponse>("/api/html-drift/incidents", { params: q });
		return response.data;
	},

	/**
	 * Estadísticas de fingerprints HTML del portal (últimos N días).
	 */
	getFingerprintStats: async (days = 7): Promise<FingerprintStatsResponse> => {
		const response = await pjnAxios.get<FingerprintStatsResponse>(
			"/api/html-drift/fingerprints/stats",
			{ params: { days } },
		);
		return response.data;
	},

	/**
	 * Cierra manualmente un drift (acknowledge).
	 */
	closeIncident: async (id: string, notes?: string): Promise<HtmlDriftIncident> => {
		const response = await pjnAxios.post<{ success: boolean; data: HtmlDriftIncident }>(
			`/api/html-drift/incidents/${id}/close`,
			{ notes },
		);
		return response.data.data;
	},
};
