// Apunta a la pjn-api del worker_01 (Mongo local con la colección
// `liquidacion-worker-config`), expuesta vía VITE_WORKERS_URL (ngrok en dev).
// NO usar workersAxios — ese va al pjn-api del hub que NO tiene estos endpoints.
import workersAxios from "utils/workersAxios";

// ════════════════════════════════════════════════════════════════════════════
// Tipos del documento LiquidacionWorkerConfig (singleton en Mongo local de worker_01)
// Modelo: pjn-models/src/models/configuration_liquidacion_worker.js
// ════════════════════════════════════════════════════════════════════════════

export interface WorkerNames {
	manager: string;
	urlExtractor: string;
	pdfProcessor: string;
}

export interface ManagerConfig {
	configPollIntervalMs: number;
	heartbeatIntervalMs: number;
	workStartHour: number | null;
	workEndHour: number | null;
	workDays: number[];
}

export interface UrlExtractorConfig {
	enabled: boolean;
	cronExpression: string;
	reenqueuePending: boolean;
	enqueueBatchSize: number;
	enqueueBatchDelayMs: number;
	caratulaPattern: string;
	movDetallePattern: string;
	categoriesAllowed: string[];
	fueros: string[];
}

export interface PdfProcessorConfig {
	enabled: boolean;
	concurrency: number;
	downloadTimeoutMs: number;
	maxBytes: number;
	ocrCharsPerPageThreshold: number;
	retryAttempts: number;
	backoffDelayMs: number;
	requestDelayMs: number;
	dailyLimit: number;
}

export interface AlertsConfig {
	queueBacklogThreshold: number;
	failedRatioThreshold: number;
}

export interface LiquidacionConfig {
	enabled: boolean;
	workerNames: WorkerNames;
	manager: ManagerConfig;
	urlExtractor: UrlExtractorConfig;
	pdfProcessor: PdfProcessorConfig;
	alerts: AlertsConfig;
}

export interface WorkerHeartbeat {
	name: string;
	instanceId?: string;
	lastHeartbeatAt?: string;
	isRunning: boolean;
	metrics?: Record<string, unknown>;
}

export interface LastRunResult {
	startedAt?: string;
	finishedAt?: string;
	elapsedMs?: number;
	added?: number;
	enqueued?: number;
	error?: string;
}

export interface CollectionStats {
	total: number;
	byStatus: Record<string, number>;
	byCategory: Record<string, number>;
	bySectionMix?: Record<string, number>;
	causasWithDataCount?: number;
	causasTotalCount?: number;
	lastUpdatedAt?: string;
}

export interface QueueCounters {
	waiting: number;
	active: number;
	delayed?: number;
	completed: number;
	failed: number;
}

export interface QueueStats {
	liqProcess: QueueCounters;
	liqUrlExtract: QueueCounters;
	lastUpdatedAt?: string;
}

export interface DailyProcessed {
	date: string | null;
	count: number;
}

export interface CurrentState {
	workers: Record<string, WorkerHeartbeat>;
	lastUrlExtractRun: LastRunResult;
	collectionStats: CollectionStats;
	queueStats: QueueStats;
	dailyProcessed?: DailyProcessed;
}

export interface StatusResponse {
	enabled: boolean;
	workers: Record<string, WorkerHeartbeat>;
	collectionStats: CollectionStats;
	queueStats: QueueStats;
	lastUrlExtractRun: LastRunResult;
	lastUpdate?: string;
}

export interface Pm2ProcessStatus {
	name: string;
	pmId?: number;
	status: "online" | "stopped" | "stopping" | "launching" | "errored" | "one-launch-status" | "not_found" | "unknown";
	pid: number | null;
	uptime: number | null;
	restarts: number;
	cpu: number;
	memory: number;
	execMode?: string;
}

export interface Pm2ActionResult {
	name: string;
	action: "start" | "stop" | "restart";
	ok: boolean;
	error?: string;
}

export type Pm2Action = "start" | "stop" | "restart";
export type WorkerKey = "manager" | "url-extractor" | "pdf-processor";

export interface AlertEntry {
	type: "queue_backlog" | "high_failure_rate" | "worker_stopped" | "config_invalid";
	message: string;
	target?: string;
	createdAt: string;
	acknowledged: boolean;
}

export interface FullDoc {
	_id: string;
	name: string;
	config: LiquidacionConfig;
	currentState: CurrentState;
	alerts: AlertEntry[];
	lastUpdate?: string;
	createdAt?: string;
}

// ── Document exploration ────────────────────────────────────────────────────

export interface SectionInfo {
	type: "HABER_CAJA" | "HABER_REAJUSTADO" | "RETROACTIVO" | "ESCRITO_COVER" | "OTRO";
	confidence: number;
	markers?: string[];
	pageStart?: number;
	pageEnd?: number;
}

export type Regimen = "dependencia" | "autonomo" | "mixto" | "unknown";
export type RegimenSource = "tipo_calculo" | "breakdown" | "inferred" | "unknown";

export interface RegimenSignals {
	tipoCalculo?: string | null;
	hasCategoriasAutonomas?: boolean;
	hasRentaPromedioAutonoma?: boolean;
	soloDepAniosMesesDias?: string | null;
	soloAutAniosMesesDias?: string | null;
	soloDepHasService?: boolean;
	soloAutHasService?: boolean;
	rdMesesTotal?: number | null;
	hasRelacionDepText?: boolean;
}

export interface ExtractedData {
	persona?: string;
	beneficio?: string;
	expediente?: string;
	prestacion?: string;
	fechaCese?: string;
	fechaAdquisicion?: string;
	fechaInicialPago?: string;
	regimen?: Regimen;
	regimenSource?: RegimenSource;
	regimenConfidence?: number;
	regimenSignals?: RegimenSignals;
	haberCaja?: {
		haberInicialPercibido?: number;
		haberInicialAlAlta?: number;
		haberActual?: number;
		fechaCalculo?: string;
		pbu?: number;
		pc?: number;
		pap?: number;
		pbuAlAlta?: number;
		pcAlAlta?: number;
		papAlAlta?: number;
		totalAlAlta?: number;
	};
	haberReajustado?: {
		haberInicialReajustado?: number;
		haberActualReajustado?: number;
		pbuReajustada?: number;
		pcReajustada?: number;
		papReajustada?: number;
		diferenciaPbuPct?: number;
		indiceUsado?: string;
	};
	retroactivo?: {
		capital?: number;
		intereses?: number;
		total?: number;
		pagado?: number;
		saldo?: number;
		fechaConsolidacion?: string;
		primerHaberReclamado?: number;
		haberPercibidoBase?: number;
		tasaInteres?: string;
	};
}

export interface LiquidacionDocListItem {
	_id: string;
	causaId: string;
	causaNumber: number;
	causaYear: number;
	fuero?: string;
	caratula: string;
	juzgado?: number;
	secretaria?: number;
	movFecha?: string;
	tipo?: string;
	detalleNorm?: string;
	url: string;
	tipoDoc?: string;
	category?: string;
	pdfStatus?: string;
	pdfPages?: number;
	pdfProducer?: string;
	sectionMix?: string;
	hasHaberCaja?: boolean;
	hasHaberReajustado?: boolean;
	hasRetroactivo?: boolean;
	hasRegimenDependencia?: boolean;
	hasRegimenAutonomo?: boolean;
	extracted?: ExtractedData;
	processedAt?: string;
}

export interface LiquidacionDocDetail extends LiquidacionDocListItem {
	detalle?: string;
	movIdx?: number;
	pdfBytes?: number;
	pdfCharsPerPage?: number;
	pdfTitle?: string;
	pdfNeedsOcr?: boolean;
	pdfFailureReason?: string;
	pdfFailureCount?: number;
	sections?: SectionInfo[];
	processorVersion?: string;
	capturedAt?: string;
	lastSeenAt?: string;
}

export interface CausaOrigen {
	_id: string;
	number?: number;
	year?: number;
	incidente?: string | null;
	caratula?: string;
	objeto?: string;
	fuero?: string;
	juzgado?: number;
	secretaria?: number;
	situacion?: string;
	partes?: {
		actor?: string;
		demandado?: string;
		causante?: string;
	};
	intervinientes?: Array<{ tipo?: string; nombre?: string }>;
	movimientosCount?: number;
	fechaUltimoMovimiento?: string;
	lastUpdate?: string;
	isPrivate?: boolean | null;
	isArchived?: boolean | null;
	verified?: boolean;
	isValid?: boolean | null;
}

export interface DocumentsListParams {
	page?: number;
	limit?: number;
	pdfStatus?: string;
	sectionMix?: string;
	category?: string;
	fuero?: string;
	caratula?: string;
	fechaFrom?: string;
	fechaTo?: string;
	causaId?: string;
	hasData?: boolean;
	regimen?: Regimen;
	hasRegimen?: string; // "dependencia" | "autonomo" | "dependencia,autonomo"
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface DocumentsListResponse {
	docs: LiquidacionDocListItem[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface UpdateSettingsPayload {
	enabled?: boolean;
	workerNames?: Partial<WorkerNames>;
	manager?: Partial<ManagerConfig>;
	urlExtractor?: Partial<UrlExtractorConfig>;
	pdfProcessor?: Partial<PdfProcessorConfig>;
	alerts?: Partial<AlertsConfig>;
}

// ════════════════════════════════════════════════════════════════════════════
// Service
// ════════════════════════════════════════════════════════════════════════════

const BASE = "/api/liquidacion-worker-config";

const LiquidacionWorkerConfigService = {
	async getFull(): Promise<FullDoc> {
		const res = await workersAxios.get<{ success: boolean; data: FullDoc }>(BASE);
		return res.data.data;
	},

	async getSettings(): Promise<LiquidacionConfig> {
		const res = await workersAxios.get<{ success: boolean; data: LiquidacionConfig }>(`${BASE}/settings`);
		return res.data.data;
	},

	async updateSettings(payload: UpdateSettingsPayload): Promise<LiquidacionConfig> {
		const res = await workersAxios.patch<{ success: boolean; data: LiquidacionConfig }>(`${BASE}/settings`, payload);
		return res.data.data;
	},

	async getStatus(): Promise<StatusResponse> {
		const res = await workersAxios.get<{ success: boolean; data: StatusResponse }>(`${BASE}/status`);
		return res.data.data;
	},

	async getAlerts(): Promise<AlertEntry[]> {
		const res = await workersAxios.get<{ success: boolean; data: AlertEntry[] }>(`${BASE}/alerts`);
		return res.data.data;
	},

	async acknowledgeAlert(index: number): Promise<void> {
		await workersAxios.post(`${BASE}/alerts/${index}/acknowledge`);
	},

	async resetToDefaults(): Promise<FullDoc> {
		const res = await workersAxios.post<{ success: boolean; data: FullDoc }>(`${BASE}/reset`);
		return res.data.data;
	},

	// ── PM2 control ──────────────────────────────────────────────────────────

	async getPm2Status(): Promise<Pm2ProcessStatus[]> {
		const res = await workersAxios.get<{ success: boolean; data: Pm2ProcessStatus[] }>(`${BASE}/pm2-status`);
		return res.data.data;
	},

	/**
	 * Ejecuta start/stop/restart en uno o más procesos.
	 * Sin `workers` = aplica a los 3.
	 */
	async pm2Action(action: Pm2Action, workers?: WorkerKey[]): Promise<Pm2ActionResult[]> {
		const res = await workersAxios.post<{ success: boolean; data: Pm2ActionResult[] }>(
			`${BASE}/pm2/${action}`,
			workers && workers.length > 0 ? { workers } : {},
		);
		return res.data.data;
	},

	// ── Documents exploration ────────────────────────────────────────────────

	async listDocuments(params: DocumentsListParams = {}): Promise<DocumentsListResponse> {
		const res = await workersAxios.get<{ success: boolean; data: DocumentsListResponse }>(`${BASE}/documents`, { params });
		return res.data.data;
	},

	async getDocument(id: string): Promise<LiquidacionDocDetail> {
		const res = await workersAxios.get<{ success: boolean; data: LiquidacionDocDetail }>(`${BASE}/documents/${id}`);
		return res.data.data;
	},

	async getDocumentCausa(id: string): Promise<CausaOrigen> {
		const res = await workersAxios.get<{ success: boolean; data: CausaOrigen }>(`${BASE}/documents/${id}/causa`);
		return res.data.data;
	},
};

export default LiquidacionWorkerConfigService;
