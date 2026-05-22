/**
 * API service for PJ Salta worker configuration and statistics.
 * Connects to pjsalta-api (default https://pjsalta.lawanalytics.app/api).
 *
 * Worker types: 'verifier' | 'updater' | 'stuck'  (≠ eje: 'verification' | 'update' | 'stuck')
 */
import pjsaltaAxios from "../utils/pjsaltaAxios";

// ========== TYPES ==========

export type PjSaltaWorkerType = "verifier" | "updater" | "stuck";

export interface IWorkerSchedule {
	enabled?: boolean;
	workStartHour?: number;
	workEndHour?: number;
	workDays?: number[];
	useGlobalSchedule?: boolean; // alias para compat UI eje
}

export interface IEffectiveSchedule extends IWorkerSchedule {
	source?: "global" | "worker-specific";
}

export interface IManagerWorkerConfig {
	enabled: boolean;
	cronExpression: string;
	minInstances: number;
	maxInstances: number;
	// Aliases para compat con UI copiada de eje (minWorkers/maxWorkers).
	// Se setean en el normalizador de getAllWorkersConfig.
	minWorkers?: number;
	maxWorkers?: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	batchSize: number;
	delayBetweenRequests: number;
	maxRetries: number;
	updateThresholdHours?: number; // sólo aplica al updater (se inyecta desde global setting)
	schedule?: IWorkerSchedule;
	workerName: string;
	workerScript: string;
	maxMemoryRestart: string;
	pivotMaxResults?: number; // sólo aplica a verifier
}

export interface IEmailConfig {
	sendDailyReport: boolean;
	reportHour: number;
	alertOnError: boolean;
	reportTo: string;
}

export interface IManagerSettings {
	managerCron?: string;
	checkInterval: number;
	lockTimeoutMinutes: number;
	updateThresholdHours: number;
	cpuThreshold: number;
	memoryThreshold: number;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	timezone: string;
	email: IEmailConfig;
	workers: {
		verifier: IManagerWorkerConfig;
		updater: IManagerWorkerConfig;
		stuck: IManagerWorkerConfig;
	};
}

export interface IWorkerStatus {
	activeInstances: number;
	pendingDocuments: number;
	optimalInstances: number;
	lastProcessedAt?: string;
	lastHeartbeat?: string;
	processedThisCycle: number;
	errorsThisCycle: number;
}

export interface ISystemResources {
	cpuUsage: number;
	memoryUsage: number;
	memoryTotal: number;
	memoryFree: number;
	loadAvg: number[];
}

export interface ILastScaleAction {
	timestamp: string;
	workerType: PjSaltaWorkerType;
	action: "scale_up" | "scale_down" | "no_change";
	from: number;
	to: number;
	reason: string;
}

export interface IManagerState {
	isRunning: boolean;
	isPaused: boolean;
	lastCycleAt?: string;
	cycleCount: number;
	workers: {
		verifier: IWorkerStatus;
		updater: IWorkerStatus;
		stuck: IWorkerStatus;
	};
	systemResources: ISystemResources;
	lastScaleAction?: ILastScaleAction;
	lastDailyReportSent?: string;
	lastCriticalAlertSent?: string;
}

export interface IAlert {
	_id: string;
	type: "high_cpu" | "high_memory" | "no_workers" | "high_pending" | "manager_stopped" | "stuck_documents" | "worker_error" | "info";
	workerType?: PjSaltaWorkerType;
	message: string;
	timestamp: string;
	acknowledged: boolean;
	acknowledgedAt?: string;
	acknowledgedBy?: string;
	value?: number;
	threshold?: number;
}

export interface IDailyByWorkerStats {
	processed: number;
	success: number;
	errors: number;
	movimientosFound: number;
	recovered: number;
	markedInvalid: number;
	peakPending: number;
	peakWorkers: number;
}

export interface IDailyStats {
	date: string;
	byWorker: {
		verifier: IDailyByWorkerStats;
		updater: IDailyByWorkerStats;
		stuck: IDailyByWorkerStats;
	};
	cyclesRun: number;
	avgCycleTime: number;
}

export interface IHistorySnapshot {
	timestamp: string;
	cycleCount: number;
	workers: {
		verifier: { active: number; pending: number };
		updater: { active: number; pending: number };
		stuck: { active: number; pending: number };
	};
	systemResources: ISystemResources;
	scaleChanges: number;
}

export interface IManagerConfig {
	name: string;
	config: IManagerSettings;
	currentState: IManagerState;
}

export interface IManagerFullConfig extends IManagerConfig {
	history: IHistorySnapshot[];
	alerts: IAlert[];
	dailyStats: IDailyStats[];
	createdAt: string;
	updatedAt: string;
}

export interface IRunStats {
	_id: string;
	runId: string;
	workerType: "verification" | "update" | "stuck"; // viene como verification/update por WorkerStats schema
	workerId: string;
	status: "running" | "completed" | "failed";
	startedAt: string;
	finishedAt?: string;
	batchSize?: number;
	pendingCount?: number;
	successCount: number;
	errorCount: number;
	errorMessage?: string;
	errorRecords?: Array<{
		expedienteId?: string;
		errorType?: string;
		message?: string;
		timestamp?: string;
	}>;
}

export interface IWorkerStatsTotals {
	_id: string;
	workerType: "verification" | "update" | "stuck";
	totalRuns: number;
	totalSuccess: number;
	totalErrors: number;
	lastRunAt?: string;
}

// ========== API FUNCTIONS ==========

// Manager
export const getManager = async (): Promise<IManagerConfig> => {
	const response = await pjsaltaAxios.get("/config/manager");
	return response.data.data;
};

export const getManagerFull = async (): Promise<IManagerFullConfig> => {
	const response = await pjsaltaAxios.get("/config/manager/full");
	return response.data.data;
};

export const updateManagerConfig = async (updates: Partial<IManagerSettings>): Promise<IManagerSettings> => {
	const response = await pjsaltaAxios.patch("/config/manager", updates);
	return response.data.data;
};

export const toggleManager = async (): Promise<{ isRunning: boolean }> => {
	const response = await pjsaltaAxios.post("/config/manager/toggle");
	return response.data.data;
};

export const pauseManager = async (): Promise<{ isPaused: boolean }> => {
	const response = await pjsaltaAxios.post("/config/manager/pause");
	return response.data.data;
};

export const getHistory = async (limit: number = 200): Promise<IHistorySnapshot[]> => {
	const response = await pjsaltaAxios.get("/config/manager/history", { params: { limit } });
	return response.data.data;
};

// Acepta tanto el shape de eje `getAlerts(false)` como el de pjsalta `getAlerts({ onlyOpen })`.
export const getAlerts = async (
	paramsOrAcknowledged?: { onlyOpen?: boolean; limit?: number } | boolean,
): Promise<IAlert[]> => {
	let params: { onlyOpen?: boolean; limit?: number } = {};
	if (typeof paramsOrAcknowledged === "boolean") {
		// Compat eje: `getAlerts(false)` quería las NO acknowledged → equivalente a `onlyOpen: true`.
		params = { onlyOpen: !paramsOrAcknowledged };
	} else if (paramsOrAcknowledged) {
		params = paramsOrAcknowledged;
	}
	const response = await pjsaltaAxios.get("/config/manager/alerts", { params });
	return response.data.data;
};

// El UI eje pasa el index (number) del array. pjsalta-api espera el _id (string).
// Lo resolvemos buscando la alert por index en el array actual.
export const acknowledgeAlert = async (
	alertIdOrIndex: string | number,
): Promise<{ alertId: string; acknowledgedBy: string }> => {
	let alertId: string;
	if (typeof alertIdOrIndex === "number") {
		const alerts = await getAlerts({ onlyOpen: true });
		const alert = alerts[alertIdOrIndex];
		if (!alert) throw new Error(`Alerta en índice ${alertIdOrIndex} no encontrada`);
		alertId = alert._id;
	} else {
		alertId = alertIdOrIndex;
	}
	const response = await pjsaltaAxios.post(`/config/manager/alerts/${alertId}/acknowledge`);
	return response.data.data;
};

// Retorna stats en el shape eje (`IDailyWorkerStats[]` con una entrada por
// (workerType × día)). Use `getDailyStatsRaw` para el shape nativo pjsalta.
export const getDailyStats = async (days: number = 30): Promise<IDailyWorkerStats[]> => {
	const response = await pjsaltaAxios.get("/config/manager/daily-stats", { params: { days } });
	return expandDailyStatsForUI(response.data.data || []);
};

export const getDailyStatsRaw = async (days: number = 30): Promise<IDailyStats[]> => {
	const response = await pjsaltaAxios.get("/config/manager/daily-stats", { params: { days } });
	return response.data.data;
};

// ─────────────────────────────────────────────────────────────────────────
// Compat aliases para UI copiada de eje
// ─────────────────────────────────────────────────────────────────────────
export type IWorkerStatusDetail = IWorkerStatus;

// Shape esperado por la UI eje: una entrada por (workerType, fecha) con totales planos.
export interface IDailyWorkerStats {
	date: string;
	workerType: PjSaltaWorkerType | "all";
	totalProcessed: number;
	totalSuccess: number;
	totalErrors: number;
	totalSkipped: number;
	totalMovimientosFound: number;
	totalPrivateCausas: number;
	totalPublicCausas: number;
	runsCompleted: number;
	runsFailed: number;
	runsCancelled: number;
	totalRunTime: number;
	avgRunTime: number;
	avgProcessingTime: number;
	peakProcessingHour: number;
	peakProcessingCount: number;
	hourlyStats: Array<{ hour: number; processed: number; success: number; errors: number; movimientosFound: number; avgProcessingTime: number; runsCount: number }>;
	topErrors: Array<{ errorType: string; count: number; lastOccurrence: string }>;
}

function expandDailyStatsForUI(stats: IDailyStats[]): IDailyWorkerStats[] {
	const result: IDailyWorkerStats[] = [];
	for (const day of stats) {
		const types: PjSaltaWorkerType[] = ["verifier", "updater", "stuck"];
		for (const t of types) {
			const bw = day.byWorker?.[t] || ({} as IDailyByWorkerStats);
			result.push({
				date: day.date,
				workerType: t,
				totalProcessed: bw.processed || 0,
				totalSuccess: bw.success || 0,
				totalErrors: bw.errors || 0,
				totalSkipped: 0,
				totalMovimientosFound: bw.movimientosFound || 0,
				totalPrivateCausas: 0,
				totalPublicCausas: 0,
				runsCompleted: day.cyclesRun || 0,
				runsFailed: 0,
				runsCancelled: 0,
				totalRunTime: day.avgCycleTime * (day.cyclesRun || 0),
				avgRunTime: day.avgCycleTime || 0,
				avgProcessingTime: day.avgCycleTime || 0,
				peakProcessingHour: 0,
				peakProcessingCount: bw.peakPending || 0,
				hourlyStats: [],
				topErrors: [],
			});
		}
	}
	return result;
}

export interface IGlobalSettings {
	managerCron?: string;
	checkInterval?: number;
	workStartHour?: number;
	workEndHour?: number;
	workDays?: number[];
	timezone?: string;
	cpuThreshold?: number;
	memoryThreshold?: number;
	lockTimeoutMinutes?: number;
	updateThresholdHours?: number;
}

export interface IWorkerData {
	workerType: PjSaltaWorkerType;
	config: IManagerWorkerConfig;
	status: IWorkerStatusDetail;
	effectiveSchedule?: IEffectiveSchedule;
}

export interface IAllWorkersResponse {
	workers: IWorkerData[];
	globalSettings: IGlobalSettings;
	managerState: {
		isRunning: boolean;
		isPaused: boolean;
		lastCycleAt?: string;
		cycleCount: number;
		systemResources: ISystemResources;
	};
}

// Workers
export const getAllWorkersConfig = async (): Promise<IAllWorkersResponse> => {
	// El endpoint del API devuelve { workers: { verifier, updater, stuck } } (workers como objeto).
	// Acá hacemos también un fetch del manager full para tener `globalSettings` + `managerState`,
	// y devolvemos el shape `IAllWorkersResponse` esperado por la UI copiada.
	const [workersResp, managerResp] = await Promise.all([
		pjsaltaAxios.get("/config/manager/workers"),
		pjsaltaAxios.get("/config/manager"),
	]);

	const workersObj = workersResp.data.data as Record<PjSaltaWorkerType, IManagerWorkerConfig>;
	const managerData = managerResp.data.data as IManagerConfig;
	const state = managerData.currentState;
	const settings = managerData.config;

	const workers: IWorkerData[] = (Object.keys(workersObj) as PjSaltaWorkerType[]).map((workerType) => {
		const cfg = workersObj[workerType];
		// Aliases para compat UI
		const enrichedCfg: IManagerWorkerConfig = {
			...cfg,
			minWorkers: cfg.minInstances,
			maxWorkers: cfg.maxInstances,
			updateThresholdHours: settings.updateThresholdHours,
		};
		const status = state.workers?.[workerType] || ({} as IWorkerStatus);
		const sched = cfg.schedule;
		const effectiveSchedule: IEffectiveSchedule = sched?.enabled
			? { ...sched, source: "worker-specific", useGlobalSchedule: false }
			: {
					workStartHour: settings.workStartHour,
					workEndHour: settings.workEndHour,
					workDays: settings.workDays,
					source: "global",
					useGlobalSchedule: true,
				};
		return { workerType, config: enrichedCfg, status, effectiveSchedule };
	});

	return {
		workers,
		globalSettings: {
			managerCron: settings.managerCron,
			checkInterval: settings.checkInterval,
			workStartHour: settings.workStartHour,
			workEndHour: settings.workEndHour,
			workDays: settings.workDays,
			timezone: settings.timezone,
			cpuThreshold: settings.cpuThreshold,
			memoryThreshold: settings.memoryThreshold,
			lockTimeoutMinutes: settings.lockTimeoutMinutes,
			updateThresholdHours: settings.updateThresholdHours,
		},
		managerState: {
			isRunning: state.isRunning,
			isPaused: state.isPaused,
			lastCycleAt: state.lastCycleAt,
			cycleCount: state.cycleCount,
			systemResources: state.systemResources,
		},
	};
};

export const updateGlobalSettings = async (updates: Partial<IGlobalSettings>): Promise<IGlobalSettings> => {
	// pjsalta-api no tiene `/config/manager/settings`. Reusamos PATCH /config/manager.
	const response = await pjsaltaAxios.patch("/config/manager", updates);
	return response.data.data;
};

export const getWorkerConfig = async (
	workerType: PjSaltaWorkerType,
): Promise<{ config: IManagerWorkerConfig; state: IWorkerStatus }> => {
	const response = await pjsaltaAxios.get(`/config/manager/worker/${workerType}`);
	return response.data.data;
};

export const updateWorkerConfig = async (
	workerType: PjSaltaWorkerType,
	updates: Partial<IManagerWorkerConfig>,
): Promise<IManagerWorkerConfig> => {
	const response = await pjsaltaAxios.patch(`/config/manager/worker/${workerType}`, updates);
	return response.data.data;
};

export const toggleWorker = async (workerType: PjSaltaWorkerType): Promise<{ workerType: string; enabled: boolean }> => {
	const response = await pjsaltaAxios.post(`/config/manager/worker/${workerType}/toggle`);
	return response.data.data;
};

// Worker Stats (raíz, no bajo /config en pjsalta-api)
export const getWorkerStats = async (): Promise<IWorkerStatsTotals[]> => {
	const response = await pjsaltaAxios.get("/worker-stats");
	return response.data.data;
};

// Devuelve un array en el shape eje (`IDailyWorkerStats[]`) — una entry por
// workerType — adaptado desde el byType del API.
export const getTodaySummary = async (): Promise<IDailyWorkerStats[]> => {
	const response = await pjsaltaAxios.get("/worker-stats/today");
	const raw = response.data.data as {
		runs: number;
		byType: Record<string, { runs: number; completed: number; failed: number; processed: number; errors: number }>;
	};
	const today = new Date().toISOString().slice(0, 10);
	// El API agrupa por workerType (verification/update/stuck — usa los nombres del WorkerStats schema).
	// Mapeamos a IDailyWorkerStats.
	const mapType = (apiType: string): PjSaltaWorkerType => {
		if (apiType === "verification") return "verifier";
		if (apiType === "update") return "updater";
		return "stuck";
	};
	return Object.entries(raw?.byType || {}).map(([apiType, t]) => ({
		date: today,
		workerType: mapType(apiType),
		totalProcessed: t.processed || 0,
		totalSuccess: (t.processed || 0) - (t.errors || 0),
		totalErrors: t.errors || 0,
		totalSkipped: 0,
		totalMovimientosFound: 0,
		totalPrivateCausas: 0,
		totalPublicCausas: 0,
		runsCompleted: t.completed || 0,
		runsFailed: t.failed || 0,
		runsCancelled: 0,
		totalRunTime: 0,
		avgRunTime: 0,
		avgProcessingTime: 0,
		peakProcessingHour: 0,
		peakProcessingCount: 0,
		hourlyStats: [],
		topErrors: [],
	}));
};

export const getRunHistory = async (
	workerType: "verification" | "update" | "stuck",
	params: { workerId?: string; status?: string; limit?: number } = {},
): Promise<IRunStats[]> => {
	const response = await pjsaltaAxios.get(`/worker-stats/${workerType}/runs`, { params });
	return response.data.data;
};

export const getRunById = async (workerType: "verification" | "update" | "stuck", runId: string): Promise<IRunStats> => {
	const response = await pjsaltaAxios.get(`/worker-stats/${workerType}/runs/${runId}`);
	return response.data.data;
};

export default {
	// Manager
	getManager,
	getManagerFull,
	updateManagerConfig,
	updateGlobalSettings,
	toggleManager,
	pauseManager,
	getHistory,
	getAlerts,
	acknowledgeAlert,
	getDailyStats,
	// Workers
	getAllWorkersConfig,
	getWorkerConfig,
	updateWorkerConfig,
	toggleWorker,
	// Stats
	getWorkerStats,
	getTodaySummary,
	getRunHistory,
	getRunById,
};
