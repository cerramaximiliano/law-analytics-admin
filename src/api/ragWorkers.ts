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
	errorMaxRetries: number;
}

export interface RecoverySettings {
	intervalMs: number;
	batchSize: number;
	maxQueueLoad: number;
	docErrorCooldownMs: number;
	docMaxRetries: number;
	stalledThresholdMs: number;
	cleanFailedAfterMs: number;
}

export interface ScalingConfig {
	enabled: boolean;
	minConcurrency: number;
	maxConcurrency: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	scaleUpStep: number;
	scaleDownStep: number;
	cooldownMs: number;
	lastScaledConcurrency?: number;
	lastScaledAt?: string;
	lastQueueDepth?: number;
}

export interface InstanceScalingConfig {
	enabled: boolean;
	minInstances: number;
	maxInstances: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	scaleUpStep: number;
	scaleDownStep: number;
	cooldownMs: number;
	lastInstanceCount?: number;
	lastScaledAt?: string;
	lastQueueDepth?: number;
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
	recoverySettings?: RecoverySettings;
	scaling?: ScalingConfig;
	instanceScaling?: InstanceScalingConfig;
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

export interface PipelineChunkerConfig {
	chunkSizeTokens: number;
	chunkOverlapTokens: number;
	charsPerToken: number;
	maxEmbeddingTokens: number;
}

export interface PipelineEmbeddingConfig {
	model: string;
	dimensions: number;
	maxInputChars: number;
	maxRetries: number;
}

export interface PipelineBatcherConfig {
	maxBatchSize: number;
	flushIntervalMs: number;
}

export interface PipelineModelLimits {
	maxTokensPerInput: number;
}

export interface PipelinePineconeConfig {
	upsertBatchSize: number;
}

export interface PipelineLlmConfig {
	chatModel: string;
	chatMaxTokens: number;
	chatTemperature: number;
	generationModel: string;
	generationMaxTokens: number;
	generationTemperature: number;
}

// ── Editor Actions ───────────────────────────────────────────────────────────

export interface EditorActionContext {
	includeDocument: boolean;
	requiresSelection: boolean;
}

export interface EditorAction {
	_id: string;
	label: string;
	hint: string;
	prompt: string;
	systemPromptOverride: string | null;
	useStyleCorpus: boolean;
	context: EditorActionContext;
	scope: "bubble" | "panel" | "both";
	order: number;
	active: boolean;
	visibility: "global" | "user" | "plan";
	userId?: string | null;
	allowedPlans?: string[];
	createdAt: string;
	updatedAt: string;
}

export type EditorActionInput = Omit<EditorAction, "_id" | "createdAt" | "updatedAt">;

export interface EditorActionsListParams {
	scope?: "bubble" | "panel" | "both";
	visibility?: "global" | "user" | "plan";
	active?: boolean;
}

// ── Pipeline Editor Config ────────────────────────────────────────────────────

export interface PipelineEditorConfig {
	model: string;
	maxTokens: number;
	temperature: number;
	rateLimitMax: number;
	rateLimitWindowMs: number;
	documentMaxChars: number;
	pdfMaxChars: number;
	systemPrompt: string;
	styleCorpusEnabled: boolean;
}

export interface PipelineConfig {
	_id: string;
	chunker: PipelineChunkerConfig;
	embedding: PipelineEmbeddingConfig;
	batcher: PipelineBatcherConfig;
	modelLimits: PipelineModelLimits;
	pinecone: PipelinePineconeConfig;
	llm: PipelineLlmConfig;
	editor: PipelineEditorConfig;
	escritosWorker: EscritosWorkerConfig;
	createdAt: string;
	updatedAt: string;
}

export interface IndexationSummary {
	totalVerifiedCausas: number;
	totalWithRagIndex: number;
	neverIndexed: number;
	byStatus: Record<string, number>;
	upToDate: number;
	outdated: number;
	causaCountsByType: Record<string, number>;
}

export interface IndexationCausa {
	causaId: string;
	causaType: string;
	caratula: string;
	fuero: string;
	juzgado: string;
	year?: number;
	number?: string;
	ragStatus: "indexed" | "indexing" | "pending" | "error" | "outdated" | "never";
	movimientosCount: number;
	movimientosIndexed: number;
	documentsTotal?: number;
	documentsProcessed?: number;
	chunksTotal?: number;
	lastIndexedAt?: string;
	triggeredBy?: string;
	error?: string | null;
}

export interface IndexationCausasResponse {
	causas: IndexationCausa[];
	pagination: { page: number; limit: number; total: number };
}

export interface StageBreakdown {
	pending?: number;
	downloading?: number;
	downloaded?: number;
	extracting?: number;
	extracted?: number;
	chunking?: number;
	chunked?: number;
	embedding?: number;
	embedded?: number;
	error?: number;
}

export interface ActiveCausa {
	ragIndexId: string;
	causaId: string;
	causaType: string;
	caratula: string;
	fuero: string;
	juzgado?: number | null;
	documentsTotal: number;
	documentsProcessed: number;
	documentsWithError: number;
	indexStartedAt: string;
	stageBreakdown: StageBreakdown;
}

export interface RecentlyCompletedCausa {
	ragIndexId: string;
	causaId: string;
	causaType: string;
	caratula: string;
	fuero: string;
	documentsTotal: number;
	documentsProcessed: number;
	documentsWithError: number;
	lastIndexedAt: string;
	durationMs: number | null;
}

export interface QueueCounts {
	active: number;
	waiting: number;
	delayed: number;
	failed: number;
}

export interface ProcessingStats {
	avgMs: number | null;
	minMs: number | null;
	maxMs: number | null;
	avgDocs: number | null;
	minDocs: number | null;
	maxDocs: number | null;
	avgMsPerDoc: number | null;
	sampleSize: number;
}

export interface WorkerConfigSnapshot {
	concurrency: number;
	rateLimiter: { max: number; duration: number } | null;
	enabled: boolean;
	paused: boolean;
}

export interface IndexationActivity {
	activeCausas: ActiveCausa[];
	recentlyCompleted: RecentlyCompletedCausa[];
	queues: Record<string, QueueCounts | null>;
	processingStats: ProcessingStats;
	currentConfig: Record<string, WorkerConfigSnapshot>;
}

// ─── Analytics types ─────────────────────────────────────────────────────────

export interface StageAvgMs {
	download: number;
	extract: number;
	chunking: number;
	embedding: number;
	upsert: number;
	overhead: number;
	queueWait: number;
	pipelineTotal: number;
	minTotalMs?: number;
	maxTotalMs?: number;
}

export interface S3Averages {
	avgPutMs: number;
	avgGetMs: number;
	avgPutBytes: number;
	avgGetBytes: number;
	totalPutBytes: number;
	totalGetBytes: number;
}

export interface ErrorRates {
	jobFailureRate: number;
	downloadErrors: number;
	downloadRetries: number;
	downloadErrorRate: number;
	embeddingRetries: number;
	embeddingHttpErrors: number;
	embeddingBackoffMs: number;
	upsertRetries: number;
	scannedPdfsDetected: number;
	emptyTextPagesTotal: number;
}

export interface QueueAnalytics {
	avgWaitMs: number;
	avgAttempts: number;
}

export interface Throughput {
	totalDocs: number;
	totalChunks: number;
	totalVectors: number;
	totalTokens: number;
	totalPages: number;
	docsPerDay: number;
	chunksPerDay: number;
	vectorsPerDay: number;
	tokensPerDay: number;
	pagesPerDay: number;
	jobsCompleted: number;
	jobsFailed: number;
	days: number;
}

export interface PipelineDailyEntry {
	date: string;
	jobsCompleted: number;
	jobsFailed: number;
	avgDownloadMs: number;
	avgExtractMs: number;
	avgChunkingMs: number;
	avgEmbeddingMs: number;
	avgUpsertMs: number;
	avgPipelineTotalMs: number;
	avgQueueWaitMs: number;
	embeddingTokens: number;
	documentsProcessed: number;
	chunksCreated: number;
	vectorsUpserted: number;
	downloadErrors: number;
	embeddingRetries: number;
	scannedPdfsDetected: number;
}

export interface PipelineAnalytics {
	period: { from: string; to: string };
	hasData: boolean;
	stageAvgMs: StageAvgMs | null;
	s3Averages: S3Averages | null;
	errorRates: ErrorRates | null;
	queueStats: QueueAnalytics | null;
	throughput: Throughput | null;
	daily: PipelineDailyEntry[];
}

export interface PercentileSet {
	p50: number;
	p90: number;
	p95: number;
	p99: number;
}

export interface DocumentPercentiles {
	totalMs: PercentileSet;
	downloadMs: PercentileSet;
	extractMs: PercentileSet;
	chunkingMs: PercentileSet;
	embeddingMs: PercentileSet;
	upsertMs: PercentileSet;
	overheadMs: PercentileSet;
}

export interface SlowestDocument {
	_id: string;
	causaId: string;
	causaType: string;
	sourceType: string;
	sourceId: string;
	pagesCount: number;
	chunksCount: number;
	embeddedAt: string;
	metrics: {
		totalMs: number;
		download: { ms: number; bytes: number };
		extract: { ms: number; isScannedLikely: boolean };
		chunking: { ms: number };
		embedding: { ms: number; tokensTotal: number };
		upsert: { ms: number; vectorsCount: number };
		queue: { waitMs: number };
	};
}

export interface ScannedPdfRatio {
	scanned: number;
	total: number;
	percentage: number;
}

export interface AvgConfigSnapshot {
	chunkSizeTokens: number;
	chunkOverlapTokens: number;
	maxBatchSize: number;
	concurrency: number;
	embeddingModels: string[];
}

export interface DocumentAnalytics {
	period: { from: string; to: string };
	hasData: boolean;
	total: number;
	stageAvgMs: StageAvgMs | null;
	s3Averages: S3Averages | null;
	percentiles: DocumentPercentiles | null;
	slowest: SlowestDocument[];
	scannedPdfRatio: ScannedPdfRatio | null;
	avgConfig: AvgConfigSnapshot | null;
}

// ─── Escritos Worker types ────────────────────────────────────────────────────

export interface EscritosWorkerConfig {
	enabled: boolean;
	scanCron: string;
	concurrency: number;
	maxPdfSizeMb: number;
	activeFueros: string[];
	relevantDocTypes: string[];
	pauseUntil: string | null;
	// novelty detection
	noveltyEnabled: boolean;
	noveltyDocTypes: string[];
	noveltyStrategy: "A" | "B";
	noveltyTopK: number;
	noveltyThresholdTrack: number;
	noveltyThresholdAlert: number;
	noveltySameDoctypeFilter: boolean;
	noveltyMaxChunks: number;
	noveltyAutoTrackLabel: "review" | "alert";
	minYear: number;
}

export interface EscritosWorkerStats {
	total: number;
	embedded?: number;
	error?: number;
	byFuero?: Record<string, { embedded: number; error: number }>;
	lastEmbeddedAt?: string;
	lastErrorAt?: string;
}

export interface GlobalDocumentEntry {
	_id: string;
	causeId: string;
	causaType: string;
	fuero: string;
	docType: string;
	status: string;
	charCount?: number;
	chunksCount?: number;
	movimientoTipo?: string;
	movimientoFecha?: string;
	embeddedAt?: string;
	errorMessage?: string;
	updatedAt: string;
}

export interface GlobalDocumentsResponse {
	docs: GlobalDocumentEntry[];
	pagination: { page: number; limit: number; hasMore: boolean };
}

export interface EscritosSearchResult {
	id: string;
	score: number;
	causeId: string | null;
	docId: string | null;
	fuero: string | null;
	docType: string | null;
	sectionType: string | null;
	chunkIndex: number | null;
	preview: string;
}

export interface EscritosSearchMeta {
	query: string;
	fuero: string | null;
	docType: string | null;
	sectionType: string | null;
	total: number;
}

// ─── Style Corpus types ───────────────────────────────────────────────────────

export interface StyleCorpusExample {
	title: string;
	docType: string;
	preview: string;
}

export interface StyleCorpusSearchResult {
	id: string;
	score: number;
	fuero: string | null;
	docType: string | null;
	title: string | null;
	preview: string;
}

export interface StyleCorpusSearchMeta {
	query: string;
	fueroCode: string | null;
	docType: string | null;
	total: number;
}

export interface StyleCorpusByFuero {
	_id: string;
	total: number;
	high: number;
	embedded: number;
}

export interface StyleCorpusRecentDoc {
	_id: string;
	fuero: string;
	title: string;
	quality: "high" | "normal" | null;
	vectorId: string | null;
	createdAt: string;
}

export interface StyleCorpusStats {
	total: number;
	ready: number;
	high: number;
	normal: number;
	embedded: number;
	byFuero: StyleCorpusByFuero[];
	recentDocs: StyleCorpusRecentDoc[];
	indexName?: string;
	enabled?: boolean;
}

// ─── Chat types ──────────────────────────────────────────────────────────────

export interface CausaSummaryData {
	_id: string;
	causaId: string;
	causaType: string;
	summary: {
		estadoActual?: string;
		partes?: {
			actor?: string;
			demandado?: string;
			terceros?: string[];
			letrados?: { nombre: string; parte: string; matricula?: string }[];
		};
		pretensiones?: string;
		decisionesJudiciales?: { fecha: string; tipo: string; resumen: string }[];
		pendientes?: string[];
		objeto?: string;
		instanciaActual?: string;
		fuero?: string;
		juzgado?: string;
		timeline?: { fecha: string; evento: string; relevancia: string }[];
	};
	generatedAt: string;
	version: number;
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
		data: Partial<
			Pick<
				WorkerConfig,
				| "enabled"
				| "concurrency"
				| "paused"
				| "rateLimiter"
				| "autoIndexSettings"
				| "recoverySettings"
				| "scaling"
				| "instanceScaling"
				| "description"
			>
		>,
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

	static async getDailyStats(
		days = 30,
		workerName?: string,
	): Promise<{ period: { from: string; to: string; days: number }; stats: DailyStatsEntry[] }> {
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

	static async updatePricing(
		modelName: string,
		data: Partial<Pick<CostPricing, "inputPricePer1M" | "outputPricePer1M" | "notes">>,
	): Promise<CostPricing> {
		const res = await ragAxios.put(`${BASE}/pricing/${modelName}`, data);
		return res.data.data;
	}

	static async createPricing(data: Omit<CostPricing, "_id" | "effectiveDate">): Promise<CostPricing> {
		const res = await ragAxios.post(`${BASE}/pricing`, data);
		return res.data.data;
	}

	static async deletePricing(modelName: string): Promise<void> {
		await ragAxios.delete(`${BASE}/pricing/${modelName}`);
	}

	// ── Pipeline Config ─────────────────────────────────────────────────────

	static async getPipelineConfig(): Promise<PipelineConfig> {
		const res = await ragAxios.get(`${BASE}/pipeline`);
		return res.data.data;
	}

	static async updatePipelineConfig(data: {
		chunker?: Partial<PipelineChunkerConfig>;
		embedding?: Partial<Pick<PipelineEmbeddingConfig, "maxInputChars" | "maxRetries">>;
		batcher?: Partial<PipelineBatcherConfig>;
		llm?: Partial<PipelineLlmConfig>;
		editor?: Partial<PipelineEditorConfig>;
	}): Promise<{ data: PipelineConfig; requiresRestart: boolean }> {
		const res = await ragAxios.put(`${BASE}/pipeline`, data);
		return { data: res.data.data, requiresRestart: res.data.requiresRestart };
	}

	// ── Indexation ──────────────────────────────────────────────────────────

	static async getIndexationSummary(): Promise<IndexationSummary> {
		const res = await ragAxios.get(`${BASE}/indexation/summary`);
		return res.data.data;
	}

	static async getIndexationActivity(): Promise<IndexationActivity> {
		const res = await ragAxios.get(`${BASE}/indexation/activity`);
		return res.data.data;
	}

	static async getIndexationCausas(filter = "all", page = 1, limit = 50, causaType?: string): Promise<IndexationCausasResponse> {
		const params: Record<string, string | number> = { filter, page, limit };
		if (causaType) params.causaType = causaType;
		const res = await ragAxios.get(`${BASE}/indexation/causas`, { params });
		return res.data.data;
	}

	// ── Editor Actions ──────────────────────────────────────────────────────

	static async getEditorActions(params?: EditorActionsListParams): Promise<EditorAction[]> {
		const res = await ragAxios.get(`${BASE}/editor-actions`, { params });
		return res.data.data;
	}

	static async createEditorAction(data: EditorActionInput): Promise<EditorAction> {
		const res = await ragAxios.post(`${BASE}/editor-actions`, data);
		return res.data.data;
	}

	static async updateEditorAction(id: string, data: Partial<EditorActionInput>): Promise<EditorAction> {
		const res = await ragAxios.put(`${BASE}/editor-actions/${id}`, data);
		return res.data.data;
	}

	static async deleteEditorAction(id: string, hard = false): Promise<void> {
		await ragAxios.delete(`${BASE}/editor-actions/${id}`, { params: hard ? { hard: "true" } : undefined });
	}

	static async seedEditorActions(force = false): Promise<{ seeded: number; skipped: number }> {
		const res = await ragAxios.post(`${BASE}/editor-actions/seed`, {}, { params: force ? { force: "true" } : undefined });
		return res.data.data;
	}

	// ── Chat ───────────────────────────────────────────────────────────────

	static async getChatConversations(causaId: string) {
		const res = await ragAxios.get("/rag/chat/conversations", { params: { causaId } });
		return res.data.data;
	}

	static async getChatSummary(causaId: string): Promise<CausaSummaryData | null> {
		const res = await ragAxios.get(`${BASE}/chat/summary/${causaId}`);
		return res.data.data;
	}

	static async getChatSuggestions(causaId: string): Promise<string[]> {
		const res = await ragAxios.get(`${BASE}/chat/suggestions/${causaId}`);
		return res.data.data || [];
	}

	// ── Analytics ──────────────────────────────────────────────────────────

	static async getPipelineAnalytics(period = "week"): Promise<PipelineAnalytics> {
		const res = await ragAxios.get(`${BASE}/analytics/pipeline`, { params: { period } });
		return res.data.data;
	}

	static async getDocumentAnalytics(period = "week", limit = 10): Promise<DocumentAnalytics> {
		const res = await ragAxios.get(`${BASE}/analytics/documents`, { params: { period, limit } });
		return res.data.data;
	}

	// ── Escritos Worker ─────────────────────────────────────────────────────

	static async getEscritosWorkerConfig(): Promise<EscritosWorkerConfig> {
		const res = await ragAxios.get(`${BASE}/escritos-worker/config`);
		return res.data.data;
	}

	static async updateEscritosWorkerConfig(data: Partial<EscritosWorkerConfig>): Promise<EscritosWorkerConfig> {
		const res = await ragAxios.patch(`${BASE}/escritos-worker/config`, data);
		return res.data.data;
	}

	static async getEscritosWorkerStats(): Promise<EscritosWorkerStats> {
		const res = await ragAxios.get(`${BASE}/escritos-worker/stats`);
		return res.data.data;
	}

	static async getEscritosWorkerDocuments(
		opts: { status?: string; fuero?: string; limit?: number; page?: number } = {}
	): Promise<GlobalDocumentsResponse> {
		const res = await ragAxios.get(`${BASE}/escritos-worker/documents`, { params: opts });
		return res.data.data;
	}

	static async searchEscritosWorker(
		q: string,
		opts: { fuero?: string; docType?: string; sectionType?: string; limit?: number; minScore?: number } = {}
	): Promise<{ data: EscritosSearchResult[]; meta: EscritosSearchMeta }> {
		const res = await ragAxios.get(`${BASE}/escritos-worker/search`, { params: { q, ...opts } });
		return { data: res.data.data ?? [], meta: res.data.meta };
	}

	// ── Style Corpus ────────────────────────────────────────────────────────

	static async getStyleCorpusStats(): Promise<StyleCorpusStats> {
		const res = await ragAxios.get(`${BASE}/style-corpus/stats`);
		return res.data.data;
	}

	static async getStyleExamples(fuero: string, q: string, limit = 3, docType?: string): Promise<StyleCorpusExample[]> {
		const params: Record<string, string | number> = { fuero, q, limit };
		if (docType) params.docType = docType;
		const res = await ragAxios.get("/rag/editor/style-examples", { params });
		return res.data.data ?? [];
	}

	static async searchStyleCorpus(
		q: string,
		opts: { fuero?: string; docType?: string; limit?: number; minScore?: number } = {}
	): Promise<{ data: StyleCorpusSearchResult[]; meta: StyleCorpusSearchMeta }> {
		const params: Record<string, string | number> = { q };
		if (opts.fuero)    params.fuero    = opts.fuero;
		if (opts.docType)  params.docType  = opts.docType;
		if (opts.limit)    params.limit    = opts.limit;
		if (opts.minScore) params.minScore = opts.minScore;
		const res = await ragAxios.get(`${BASE}/style-corpus/search`, { params });
		return { data: res.data.data ?? [], meta: res.data.meta };
	}
}

export default RagWorkersService;
