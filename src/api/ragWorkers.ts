import ragAxios from "utils/ragAxios";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RateLimiter {
	max: number;
	duration: number;
}

export interface AutoIndexSettings {
	intervalMs: number;
	batchSize: number;
	maxConcurrentJobs: number;
	errorRetryAfterMs: number;
}

export interface WorkerConfig {
	_id: string;
	workerName: string;
	queueName: string;
	enabled: boolean;
	paused: boolean;
	concurrency: number;
	rateLimiter: RateLimiter;
	autoIndexSettings?: AutoIndexSettings;
	lastAppliedAt?: string;
	description?: string;
	createdAt: string;
	updatedAt: string;
	queueCounts?: Record<string, number>;
}

export interface WorkerStats {
	workerName: string;
	jobsCompleted: number;
	jobsFailed: number;
	avgProcessingMs: number;
	// indexDocument
	documentsProcessed?: number;
	chunksCreated?: number;
	vectorsUpserted?: number;
	pagesProcessed?: number;
	textBytesProcessed?: number;
	embeddingTokens?: number;
	embeddingBatches?: number;
	// generateSummary
	llmTokensPrompt?: number;
	llmTokensCompletion?: number;
	// ocrDocument
	ocrPagesProcessed?: number;
	// indexCausa
	causasIndexed?: number;
	ragDocumentsCreated?: number;
	// autoIndex
	scansCompleted?: number;
	causasEnqueued?: number;
	costs?: {
		embedding?: { tokens: number; usd: number };
		llm?: { prompt: { tokens: number; usd: number }; completion: { tokens: number; usd: number }; total: number };
	};
}

export interface StatsResponse {
	period: { from: string; to: string };
	workers: WorkerStats[];
	totalCosts: { usd: number };
}

export interface DailyStatsEntry {
	_id: string;
	workerName: string;
	date: string;
	jobsCompleted: number;
	jobsFailed: number;
	totalProcessingMs: number;
	[key: string]: unknown;
}

export interface CostPricing {
	_id: string;
	modelName: string;
	modelType: "llm" | "embedding";
	inputPricePer1M: number;
	outputPricePer1M: number;
	effectiveDate: string;
	notes?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const BASE = "/rag/admin";

class RagWorkersService {
	// ── Worker Control ──────────────────────────────────────────────────────

	static async getWorkers(): Promise<WorkerConfig[]> {
		const res = await ragAxios.get(`${BASE}/workers`);
		return res.data.data;
	}

	static async getWorker(workerName: string): Promise<WorkerConfig> {
		const res = await ragAxios.get(`${BASE}/workers/${workerName}`);
		return res.data.data;
	}

	static async updateWorker(
		workerName: string,
		data: Partial<Pick<WorkerConfig, "enabled" | "concurrency" | "paused" | "rateLimiter" | "autoIndexSettings" | "description">>,
	): Promise<{ data: WorkerConfig; requiresRestart: boolean }> {
		const res = await ragAxios.put(`${BASE}/workers/${workerName}`, data);
		return { data: res.data.data, requiresRestart: res.data.requiresRestart };
	}

	static async pauseWorker(workerName: string): Promise<WorkerConfig> {
		const res = await ragAxios.post(`${BASE}/workers/${workerName}/pause`);
		return res.data.data;
	}

	static async resumeWorker(workerName: string): Promise<WorkerConfig> {
		const res = await ragAxios.post(`${BASE}/workers/${workerName}/resume`);
		return res.data.data;
	}

	static async triggerAutoIndex(): Promise<void> {
		await ragAxios.post(`${BASE}/workers/autoIndex/trigger`);
	}

	// ── Stats ───────────────────────────────────────────────────────────────

	static async getStats(period = "month", workerName?: string): Promise<StatsResponse> {
		const params: Record<string, string> = { period };
		if (workerName) params.workerName = workerName;
		const res = await ragAxios.get(`${BASE}/workers/stats`, { params });
		return res.data.data;
	}

	static async getDailyStats(days = 30, workerName?: string): Promise<{ period: { from: string; to: string; days: number }; stats: DailyStatsEntry[] }> {
		const params: Record<string, string | number> = { days };
		if (workerName) params.workerName = workerName;
		const res = await ragAxios.get(`${BASE}/workers/stats/daily`, { params });
		return res.data.data;
	}

	// ── Pricing ─────────────────────────────────────────────────────────────

	static async getPricing(): Promise<CostPricing[]> {
		const res = await ragAxios.get(`${BASE}/pricing`);
		return res.data.data;
	}

	static async updatePricing(modelName: string, data: Partial<Pick<CostPricing, "inputPricePer1M" | "outputPricePer1M" | "notes">>): Promise<CostPricing> {
		const res = await ragAxios.put(`${BASE}/pricing/${modelName}`, data);
		return res.data.data;
	}
}

export default RagWorkersService;
