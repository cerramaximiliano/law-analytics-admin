import mevAxios from "utils/mevAxios";

// ========== Tipos de worker ==========

export type ScbaWorkerType = "verification" | "initialScraping" | "update" | "updateArchived" | "listAudit";

export const SCBA_WORKER_TYPES: ScbaWorkerType[] = ["verification", "initialScraping", "update", "updateArchived", "listAudit"];

export const SCBA_WORKER_LABELS: Record<ScbaWorkerType, string> = {
	verification: "Verificación de Lista",
	initialScraping: "Extracción Inicial",
	update: "Actualización Periódica",
	updateArchived: "Actualización Archivadas",
	listAudit: "Auditoría Diaria",
};

export const SCBA_WORKER_DESCRIPTIONS: Record<ScbaWorkerType, string> = {
	verification:
		"Sincroniza la lista de 'Mis Causas' del portal SCBA para cada credencial. Descarga sólo metadata (carátula, juzgado, IDs) y deja cada causa pendiente para el Extracción Inicial.",
	initialScraping:
		"Procesa las causas marcadas como pending por el Verificación: navega a cada una, extrae todos los trámites y las deja en estado completed listas para el Actualización.",
	update:
		"Refresca periódicamente los movimientos de causas ya procesadas. Usa merge inteligente por (fecha+detalle+URL) para no duplicar movimientos. Respeta el threshold de horas desde la última actualización. Con updatePolicy 'unified' cubre TODAS las causas con folder (archivadas incluidas).",
	updateArchived:
		"Refresca causas cuyos folders están TODOS archivados (cron diario 4 AM ART). Solo trabaja con updatePolicy 'split' — en modo 'unified' queda ocioso porque la Actualización Periódica cubre también las archivadas.",
	listAudit:
		"Corre una vez al día (3 AM ARG): compara la lista actual en SCBA con las causas ya guardadas, detecta altas y bajas, y dispara email consolidado al usuario con los cambios.",
};

// ========== Interfaces ==========

export interface ScbaWorkerSchedule {
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	useGlobalSchedule: boolean;
}

export interface ScbaWorkerConfig {
	enabled: boolean;
	minWorkers: number;
	maxWorkers: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	updateThresholdHours: number;
	batchSize: number;
	delayBetweenRequests: number;
	maxRetries: number;
	schedule: ScbaWorkerSchedule;
	cronExpression: string;
	workerName: string;
	workerScript: string;
	maxMemoryRestart: string;
}

export type ScbaWorkersConfigMap = Record<ScbaWorkerType, ScbaWorkerConfig>;

/**
 * Partición del trabajo de update:
 *  - 'split': causas con ≥1 folder activo → update frecuente; causas con TODOS
 *    los folders archivados → updateArchived diario (4 AM ART). Las archivadas
 *    se descubren de madrugada y la notificación llega recién al día siguiente.
 *  - 'unified': TODAS las causas con folder van al update principal en horario
 *    laboral; updateArchived queda ocioso (el manager le reporta pending=0).
 */
export type ScbaUpdatePolicyMode = "split" | "unified";

export interface ScbaUpdatePolicy {
	mode: ScbaUpdatePolicyMode;
}

/**
 * Rechazos explícitos de login ("Datos inválidos") en credenciales ESTABLECIDAS:
 * cuántos rechazos (con separación mínima entre el primero y el que confirma)
 * antes de deshabilitar la credencial y emailear al usuario. Las credenciales
 * nuevas disparan siempre al primer rechazo (feedback inmediato al vincular).
 */
export interface ScbaCredentialPolicy {
	rejectionConfirmations: number;
	rejectionMinSpacingMinutes: number;
}

export interface ScbaManagerSettings {
	serviceAvailable: boolean;
	maintenanceMessage: string;
	checkInterval: number;
	lockTimeoutMinutes: number;
	updateThresholdHours: number;
	cpuThreshold: number;
	memoryThreshold: number;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
	timezone: string;
	updatePolicy?: ScbaUpdatePolicy;
	credentialPolicy?: ScbaCredentialPolicy;
	workers: ScbaWorkersConfigMap;
}

export interface ScbaWorkerStatus {
	activeInstances: number;
	pendingDocuments: number;
	optimalInstances: number;
	lastProcessedAt?: string;
	processedThisCycle: number;
	errorsThisCycle: number;
}

export type ScbaWorkerStatusMap = Record<ScbaWorkerType, ScbaWorkerStatus>;

export interface ScbaSystemResources {
	cpuUsage: number;
	memoryUsage: number;
	memoryTotal: number;
	memoryFree: number;
	loadAvg: number[];
}

export interface ScbaManagerCurrentState {
	isRunning: boolean;
	isPaused: boolean;
	lastCycleAt?: string;
	cycleCount: number;
	workers: ScbaWorkerStatusMap;
	systemResources: ScbaSystemResources;
	lastScaleAction?: {
		timestamp: string;
		workerType: ScbaWorkerType;
		action: "scale_up" | "scale_down" | "no_change";
		from: number;
		to: number;
		reason: string;
	};
}

export interface ScbaHistorySnapshot {
	timestamp: string;
	workers: Record<ScbaWorkerType, { active: number; pending: number }>;
	systemResources: ScbaSystemResources;
	scaleChanges: number;
}

export interface ScbaAlert {
	type: string;
	workerType?: ScbaWorkerType;
	message: string;
	timestamp: string;
	acknowledged: boolean;
	acknowledgedAt?: string;
	acknowledgedBy?: string;
	value?: number;
	threshold?: number;
}

export interface ScbaDailyStatsByWorkerCommon {
	processed: number;
	success: number;
	errors: number;
	peakPending: number;
	peakWorkers: number;
}

export interface ScbaDailyStatsWorkerWithMovimientos extends ScbaDailyStatsByWorkerCommon {
	movimientosFound: number;
}

export interface ScbaDailyStatsListAudit {
	processed: number;
	success: number;
	errors: number;
	causasRemoved: number;
	causasReactivated: number;
	causasAdded: number;
}

export interface ScbaDailyStats {
	date: string;
	byWorker: {
		verification: ScbaDailyStatsByWorkerCommon;
		initialScraping: ScbaDailyStatsWorkerWithMovimientos;
		update: ScbaDailyStatsWorkerWithMovimientos;
		/** Ausente en dailyStats anteriores a la incorporación del worker archived */
		updateArchived?: ScbaDailyStatsWorkerWithMovimientos;
		listAudit: ScbaDailyStatsListAudit;
	};
	cyclesRun: number;
	avgCycleTime: number;
}

export interface ScbaManagerConfig {
	_id: string;
	name: string;
	config: ScbaManagerSettings;
	currentState: ScbaManagerCurrentState;
	history: ScbaHistorySnapshot[];
	alerts: ScbaAlert[];
	dailyStats: ScbaDailyStats[];
	createdAt?: string;
	updatedAt?: string;
}

export interface ScbaManagerStatusResponse {
	success: boolean;
	data: ScbaManagerCurrentState & {
		staleness: "active" | "delayed" | "stale" | "unknown";
		lastCycleAgo: string | null;
	};
}

// ========== Credenciales (listado admin + reset) ==========

export type ScbaSyncStatus = "never_synced" | "pending" | "in_progress" | "completed" | "error";

export interface ScbaCredentialListItem {
	_id: string;
	userId: string;
	user: {
		email?: string;
		firstName?: string;
		lastName?: string;
		role?: string;
	} | null;
	enabled: boolean;
	isExpired: boolean;
	syncStatus: ScbaSyncStatus;
	lastSync: string | null;
	lastSyncAttempt: string | null;
	consecutiveErrors: number;
	errorNotifiedAt: string | null;
	errorRecoveryPending: boolean;
	/** Último error de login persistido por los workers (hasScreenshot = hay evidencia visual en S3) */
	lastError?: {
		message: string | null;
		code: string | null;
		date: string | null;
		hasScreenshot: boolean;
	} | null;
	stats: {
		causasCreated: number;
		causasLinked: number;
		errors: number;
	};
	foldersCount: number;
}

/** Alerta admin de credenciales SCBA (doc de scba-admin-alerts, dedup por tipo+credencial) */
export interface ScbaAdminAlert {
	_id: string;
	key: string;
	type: "credential_stuck" | "credential_disabled" | "transient_streak" | "causas_drop" | "login_degraded" | string;
	credentialId: string | null;
	userEmail: string | null;
	message: string;
	details: Record<string, string | number>;
	source: string;
	firstDetectedAt: string;
	lastDetectedAt: string;
	lastSentAt: string | null;
	sendCount: number;
	resolvedAt: string | null;
}

export interface ScbaAdminAlertsResponse {
	success: boolean;
	data: ScbaAdminAlert[];
	activeCount: number;
	pagination: { page: number; limit: number; total: number; pages: number };
}

/** Snapshot visual de "Mis Causas" (evidencia diaria capturada por scba-workers) */
export interface ScbaListSnapshot {
	_id: string;
	date: string; // YYYY-MM-DD (ART)
	takenAt: string;
	causasCount: number;
	totalPages: number;
	trigger: "daily" | "count-changed" | "sync";
	prevCount: number | null;
	source: string;
	pagesTruncated: boolean;
	pages: { page: number; s3Key: string; url: string | null }[];
}

export interface ScbaResetPreview {
	credentialId: string;
	userId: string;
	syncStatus: ScbaSyncStatus;
	lastSync: string | null;
	willDelete: {
		userFolders: number;
		orphanCausas: number;
	};
	willPull: {
		sharedCausas: number;
	};
}

export interface ScbaResetResult {
	credentialId: string;
	userId: string;
	deleted: {
		folders: number;
		orphanCausas: number;
	};
	pulledFrom: {
		sharedCausas: number;
	};
	credentialUpdated: boolean;
}

// ========== Service ==========

class ScbaManagerService {
	async getConfig(): Promise<{ success: boolean; data: ScbaManagerConfig }> {
		try {
			const response = await mevAxios.get("/api/scba-manager");
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("Error de autenticación. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuración del SCBA manager");
		}
	}

	/**
	 * Solo la sección `config` (sin history/dailyStats/alerts). ~4x más liviano y
	 * rápido que getConfig — usar SIEMPRE que solo se necesiten settings
	 * (serviceAvailable, updatePolicy, credentialPolicy, workers). Medición
	 * 2026-08-22: getConfig tardaba 2.2s en el dashboard por el doc completo.
	 */
	async getSettings(): Promise<{ success: boolean; data: ScbaManagerSettings }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/settings");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener settings del SCBA manager");
		}
	}

	async updateSettings(settings: Partial<ScbaManagerSettings>): Promise<{ success: boolean; message: string; data: ScbaManagerSettings }> {
		try {
			const response = await mevAxios.patch("/api/scba-manager/settings", settings);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración del SCBA manager");
		}
	}

	async getStatus(): Promise<ScbaManagerStatusResponse> {
		try {
			const response = await mevAxios.get("/api/scba-manager/status");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estado del SCBA manager");
		}
	}

	async getHistory(hours: number = 24): Promise<{ success: boolean; data: ScbaHistorySnapshot[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/history", { params: { hours } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener historial del SCBA manager");
		}
	}

	async getAlerts(): Promise<{ success: boolean; data: ScbaAlert[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/alerts");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener alertas del SCBA manager");
		}
	}

	async acknowledgeAlert(index: number): Promise<{ success: boolean; message: string }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/alerts/${index}/acknowledge`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al reconocer alerta");
		}
	}

	async getStats(days: number = 7): Promise<{ success: boolean; data: ScbaDailyStats[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/stats", { params: { days } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas del SCBA manager");
		}
	}

	async resetToDefaults(): Promise<{ success: boolean; message: string; data: ScbaManagerConfig }> {
		try {
			const response = await mevAxios.post("/api/scba-manager/reset");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear configuración del SCBA manager");
		}
	}

	async listCredentials(): Promise<{ success: boolean; data: ScbaCredentialListItem[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/scba-manager/credentials");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al listar credenciales SCBA");
		}
	}

	async listAdminAlerts(
		params: { status?: "active" | "resolved" | "all"; type?: string; page?: number; limit?: number } = {},
	): Promise<ScbaAdminAlertsResponse> {
		try {
			const response = await mevAxios.get("/api/scba-manager/admin-alerts", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener alertas de credenciales SCBA");
		}
	}

	/** Presigned URL (10 min) del screenshot del último rechazo de login de la credencial. */
	async getLoginErrorScreenshot(
		credentialId: string,
	): Promise<{ success: boolean; data: { url: string; capturedAt: string | null; message: string | null } }> {
		try {
			const response = await mevAxios.get(`/api/scba-manager/credentials/${credentialId}/login-error-screenshot`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener el screenshot del rechazo de login");
		}
	}

	async listCredentialSnapshots(
		credentialId: string,
		params: {
			days?: number;
			page?: number;
			limit?: number;
			dateFrom?: string;
			dateTo?: string;
			countMin?: number;
			countMax?: number;
		} = {},
	): Promise<{
		success: boolean;
		data: ScbaListSnapshot[];
		count: number;
		pagination: { page: number; limit: number; total: number; pages: number };
	}> {
		try {
			const response = await mevAxios.get(`/api/scba-manager/credentials/${credentialId}/list-snapshots`, { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener snapshots de la credencial SCBA");
		}
	}

	/**
	 * Bytes de un snapshot, para copiar al portapapeles o descargar.
	 *
	 * No se usa la presigned URL directamente porque el bucket scba-docs no tiene
	 * CORS: el navegador puede MOSTRAR la imagen (<img> no pide CORS) pero no
	 * leerla con fetch, y sin el blob no hay copiado ni descarga forzada (el
	 * atributo `download` se ignora cross-origin). mev-api sí manda CORS.
	 */
	async fetchSnapshotImage(credentialId: string, s3Key: string): Promise<Blob> {
		const response = await mevAxios.get(`/api/scba-manager/credentials/${credentialId}/snapshot-image`, {
			params: { key: s3Key },
			responseType: "blob",
		});
		return response.data as Blob;
	}

	async previewResetCredential(credentialId: string): Promise<{ success: boolean; dryRun: boolean; data: ScbaResetPreview }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/credentials/${credentialId}/reset`, null, {
				params: { dryRun: true },
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al previsualizar reset de credencial SCBA");
		}
	}

	async resetCredential(credentialId: string): Promise<{ success: boolean; message: string; data: ScbaResetResult }> {
		try {
			const response = await mevAxios.post(`/api/scba-manager/credentials/${credentialId}/reset`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear credencial SCBA");
		}
	}
}

export default new ScbaManagerService();
