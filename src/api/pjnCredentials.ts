import adminAxios from "utils/adminAxios";

// Interfaces
export interface PjnCredential {
	_id: string;
	userId: string;
	userName: string;
	userEmail: string;
	userPhone?: string;
	cuilMasked: string;
	enabled: boolean;
	verified: boolean;
	verifiedAt: string | null;
	isValid: boolean;
	isValidAt: string | null;
	syncStatus: "pending" | "in_progress" | "completed" | "error" | "never_synced";
	lastSync: string | null;
	lastSyncAttempt: string | null;
	consecutiveErrors: number;
	lastError: {
		message: string;
		code: string;
		timestamp: string;
	} | null;
	credentialInvalid: boolean;
	credentialInvalidAt: string | null;
	credentialInvalidReason: string | null;
	errorHistory?: Array<{
		message: string;
		code: string;
		isPortalError: boolean;
		timestamp: string;
		screenshotFile: string | null;
	}>;
	// NOTA: el detalle con screenshot pre-firmado se trae aparte vía getErrorHistory()
	expectedCausasCount: number;
	processedCausasCount: number;
	foldersCreatedCount: number;
	totalFoldersLinked?: number;
	extractionStatus?: "idle" | "completed";
	extractedCausasCount?: number;
	stats?: {
		totalCausasFound: number;
		newCausasCreated: number;
		foldersCreated: number;
		lastCausasCount: number;
		byFuero: Record<string, number>;
	};
	successfulSyncs: number;
	firstSync: string | null;
	initialMovementsSync: string | null;
	initialMovementsSyncAt: string | null;
	totalMovements: number;
	lastMovementDate: string | null;
	lastSyncDuration: number | null;
	byFuero: Record<string, number>;
	currentSyncProgress?: {
		startedAt: string;
		currentPage: number;
		totalPages: number;
		causasProcessed: number;
		totalExpected: number;
		progress: number;
		lastBatchSample?: string[];
	} | null;
	createdAt: string;
	updatedAt: string;
}

export interface PjnCredentialDetail extends PjnCredential {
	userCreatedAt?: string;
	evolution?: any;
	syncHistory?: any[];
	simulationData?: any;
}

export interface PjnCredentialsFilters {
	page?: number;
	limit?: number;
	syncStatus?: string;
	verified?: string;
	isValid?: string;
	enabled?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PjnCredentialsListResponse {
	success: boolean;
	data: PjnCredential[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface PjnCredentialResponse {
	success: boolean;
	data: PjnCredentialDetail;
	message?: string;
}

export interface PjnCredentialsStatsResponse {
	success: boolean;
	data: {
		total: number;
		enabled: number;
		disabled: number;
		verified: number;
		notVerified: number;
		isValid: number;
		notValid: number;
		syncStatus: {
			pending: number;
			inProgress: number;
			completed: number;
			error: number;
			neverSynced: number;
		};
		totals: {
			causas: number;
			folders: number;
			avgCausasPerUser: number;
		};
		syncActivity: {
			syncsLast24h: number;
			syncsLast7d: number;
			successRate: number;
			avgDurationMs: number;
		};
		updateActivity: {
			runsLast24h: number;
			runsLast7d: number;
			newMovements24h: number;
			newMovements7d: number;
		};
		movementTotals: {
			totalMovements: number;
			avgPerFolder: number;
			foldersWithMovements: number;
			lastGlobalMovement: string | null;
		};
		byFuero: Array<{ fuero: string; total: number }>;
	};
}

export interface SyncRun {
	_id: string;
	userName: string;
	userEmail: string;
	status: string;
	startedAt: string;
	completedAt: string | null;
	results: {
		totalCausasInPJN: number;
		causasNuevas: number;
		foldersCreados: number;
		errores: number;
	};
	metadata: { tiempoEjecucionMs: number; triggeredBy: string };
	error: { message: string; code: string } | null;
	createdAt: string;
}

export interface UpdateRun {
	_id: string;
	credentialsId?: string;
	userName: string;
	userEmail: string;
	status: string;
	startedAt: string;
	completedAt: string | null;
	durationSeconds: number | null;
	results: {
		totalCausas: number;
		causasProcessed: number;
		causasUpdated: number;
		newMovimientos: number;
		causasError: number;
	};
	metadata: {
		triggeredBy: string;
		isResumedRun: boolean;
		previousRunId?: string;
		resumeAttempts?: number;
	};
	error: { message: string; code: string; phase: string } | null;
	createdAt: string;
}

export interface SyncError {
	type: "sync" | "update";
	userName: string;
	userEmail: string;
	status: string;
	error: { message: string; code?: string; phase?: string } | null;
	errorCount: number;
	createdAt: string;
}

export interface SyncActivityResponse {
	success: boolean;
	data: {
		additionalMetrics: {
			syncStatusBreakdown7d: Record<string, number>;
			avgCausasPerSync: number;
			cacheVsScraping: { cache: number; scraping: number };
			updateStatusBreakdown7d: Record<string, number>;
		};
		recentSyncs: SyncRun[];
		recentUpdateRuns: UpdateRun[];
		recentErrors: SyncError[];
	};
}

// Interfaces para causas sincronizadas por credenciales
export interface SyncedCausa {
	_id: string;
	number: number;
	year: number;
	incidente?: string | null;
	fuero: string;
	caratula: string;
	objeto: string;
	juzgado: string;
	secretaria: string;
	source: string;
	movimientosCount: number;
	fechaUltimoMovimiento: string | null;
	lastUpdate: string | null;
	updateStats?: {
		count?: number;
		last?: string;
		today?: { date: string; count: number; hours: number[] };
		// Acumulado all-time de intentos fallidos (no se resetea).
		errors?: number;
		// Error de la ÚLTIMA actualización; el worker lo limpia al primer éxito.
		lastError?: { message: string; phase?: string; date: string } | null;
	};
	createdAt: string;
	/**
	 * Flags del Folder asociado a la causa (null si no hay folder).
	 * `listRemoved` se setea por el worker cuando la causa ya no aparece en
	 * "Mis Causas" del portal origen.
	 */
	folder?: {
		folderId: string;
		listRemoved: boolean;
		listRemovedSource: "pjn" | "scba" | "mev" | "eje" | null;
		listRemovedAt: string | null;
	} | null;
	credential: {
		credentialId?: string;
		userName: string;
		userEmail: string;
		initialMovementsSync: string | null;
		initialMovementsSyncAt: string | null;
		removedFromSync?: boolean;
		removedAt?: string | null;
		// Motivo por el que la causa privada no es actualizable (solo en la vista "No actualizables").
		noActualizableReason?: "sin_credencial" | "credencial_eliminada" | "credencial_invalida" | "removida_del_sync";
	};
}

export interface SyncedCausasSummary {
	totalCausas: number;
	withMovements: number;
	withoutMovements: number;
	byFuero: Record<string, { total: number; withMovements: number }>;
	credentialsCount: number;
	initialSyncStatus: {
		pending: number;
		in_progress: number;
		completed: number;
		none: number;
	};
	// Privadas no actualizables (sin credencial activa).
	noActualizables?: number;
	// Causas cuya última actualización falló (updateStats.lastError vigente).
	conErrores?: number;
}

export interface SyncedCausasFilters {
	credentialId?: string;
	fuero?: string;
	hasMovements?: string;
	soloElegibles?: boolean;
	noActualizables?: boolean;
	conErrores?: boolean;
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface SyncedCausasResponse {
	success: boolean;
	data: SyncedCausa[];
	summary: SyncedCausasSummary;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface PortalIncidentErrorSample {
	code: string;
	message: string;
	timestamp: string;
	credentialId?: string;
}

export interface PortalIncident {
	_id: string;
	type: "portal_down" | "portal_degraded" | "login_service_error";
	status: "active" | "resolved";
	startedAt: string;
	resolvedAt?: string | null;
	durationMinutes?: number | null;
	detectedBy: string;
	affectedWorkers: string[];
	affectedCredentialsCount: number;
	errorSamples: PortalIncidentErrorSample[];
	totalErrors: number;
}

export interface PortalStatusResponse {
	success: boolean;
	data: {
		activeIncident: PortalIncident | null;
		recentIncidents: PortalIncident[];
		credentialsWithPortalErrors: number;
		portalHealthy: boolean;
		lastSuccessfulConnection: string | null;
		lastResolvedIncident: PortalIncident | null;
	};
}

export interface MisCausasCoverageBucket {
	total: number;
	updatedToday: number;
	pending: number;
	withErrors: number;
	coveragePercent: number;
	schedule: string;
}

export interface MisCausasCoverage {
	// Split nuevo: públicas (isPrivate≠true) vs privadas (isPrivate===true).
	publicas?: MisCausasCoverageBucket;
	privadas?: MisCausasCoverageBucket;
	// Globales (compat)
	total: number;
	updatedToday: number;
	pending: number;
	withErrors: number;
	coveragePercent: number;
	byFuero: Array<{ fuero: string; total: number; updatedToday: number; withErrors: number }>;
}

export interface GenericResponse {
	success: boolean;
	message?: string;
	data?: any;
}

export interface CreatePjnCredentialPayload {
	userId: string;
	cuil: string;
	password: string;
}

// Entrada del historial de errores de login con screenshot pre-firmado de S3
export interface CredentialErrorEntry {
	message: string | null;
	code: string | null;
	isPortalError: boolean;
	timestamp: string | null;
	actionName: string | null;
	loginUrl: string | null;
	urlHash: string | null;
	s3Key: string | null;
	screenshotUrl: string | null; // URL pre-firmada (válida ~5 min) o null
}

export interface CausaScreenshotEntry {
	_id: string;
	type:
		| "search_error"
		| "scraping_error"
		| "degraded_scrape"
		| "processing_exception"
		| "login_error"
		| "empty_movements"
		| "other";
	errorMessage: string | null;
	pageUrl: string | null;
	detectionCount: number;
	firstSeenAt: string | null;
	lastSeenAt: string | null;
	resolved: boolean;
	s3Key: string | null;
	screenshotUrl: string | null; // URL pre-firmada (válida ~5 min) o null
}

// Servicio de Credenciales PJN
class PjnCredentialsService {
	/**
	 * Crear credenciales PJN para un usuario
	 */
	async createCredential(payload: CreatePjnCredentialPayload): Promise<GenericResponse> {
		const response = await adminAxios.post("/api/pjn-credentials", payload);
		return response.data;
	}

	/**
	 * Obtener lista de credenciales con paginación y filtros
	 */
	async getCredentials(filters: PjnCredentialsFilters = {}): Promise<PjnCredentialsListResponse> {
		const response = await adminAxios.get("/api/pjn-credentials", { params: filters });
		return response.data;
	}

	/**
	 * Obtener estadísticas de credenciales
	 */
	async getStats(): Promise<PjnCredentialsStatsResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/stats");
		return response.data;
	}

	/**
	 * Obtener detalle de una credencial
	 */
	async getCredentialById(id: string): Promise<PjnCredentialResponse> {
		const response = await adminAxios.get(`/api/pjn-credentials/${id}`);
		return response.data;
	}

	/**
	 * Historial de errores de login con screenshots pre-firmados de S3.
	 * Las screenshotUrl son URLs pre-firmadas válidas ~5 minutos.
	 */
	async getErrorHistory(id: string): Promise<{ success: boolean; data: CredentialErrorEntry[]; count: number }> {
		const response = await adminAxios.get(`/api/pjn-credentials/${id}/error-history`);
		return response.data;
	}

	/**
	 * Screenshots de incidencias de scraping de una causa (incl. causas sin
	 * movimientos — type "empty_movements"). Las screenshotUrl son URLs
	 * pre-firmadas válidas ~5 minutos.
	 */
	async getCausaScreenshots(causaId: string): Promise<{ success: boolean; data: CausaScreenshotEntry[]; count: number }> {
		const response = await adminAxios.get(`/api/pjn-credentials/causa/${causaId}/screenshots`);
		return response.data;
	}

	/**
	 * Habilitar o deshabilitar credencial
	 */
	async toggleCredential(id: string, enabled: boolean): Promise<GenericResponse> {
		const response = await adminAxios.patch(`/api/pjn-credentials/${id}/toggle`, { enabled });
		return response.data;
	}

	/**
	 * Resetear credencial para re-sincronización
	 */
	async resetCredential(id: string): Promise<GenericResponse> {
		const response = await adminAxios.post(`/api/pjn-credentials/${id}/reset`);
		return response.data;
	}

	/**
	 * Resetear sincronización completa (folders, causas, syncs, credencial)
	 */
	async resetSyncData(id: string, dryRun: boolean = true): Promise<GenericResponse> {
		const response = await adminAxios.post(`/api/pjn-credentials/${id}/reset-sync`, { dryRun });
		return response.data;
	}

	/**
	 * Obtener actividad detallada de syncs y updates
	 */
	async getSyncActivity(): Promise<SyncActivityResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/sync-activity");
		return response.data;
	}

	/**
	 * Obtener causas sincronizadas por credenciales PJN
	 */
	async getSyncedCausas(filters: SyncedCausasFilters = {}): Promise<SyncedCausasResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/synced-causas", { params: filters });
		return response.data;
	}

	/**
	 * Obtener documento completo de una causa sincronizada por ID y fuero
	 */
	async getSyncedCausaById(id: string, fuero: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
		const response = await adminAxios.get(`/api/pjn-credentials/synced-causas/${id}`, { params: { fuero } });
		return response.data;
	}

	/**
	 * Obtener documento raw de una credencial (sin datos sensibles)
	 */
	async getRawCredential(id: string): Promise<GenericResponse> {
		const response = await adminAxios.get(`/api/pjn-credentials/${id}`, { params: { raw: true } });
		return response.data;
	}

	/**
	 * Obtener folders vinculados a una credencial (source=pjn-login)
	 */
	async getCredentialFolders(id: string, page = 1, limit = 100): Promise<GenericResponse> {
		const response = await adminAxios.get(`/api/pjn-credentials/${id}/folders`, { params: { page, limit } });
		return response.data;
	}

	/**
	 * Actualizar contraseña de una credencial (admin)
	 */
	async updatePassword(id: string, password: string): Promise<GenericResponse> {
		const response = await adminAxios.patch(`/api/pjn-credentials/${id}/password`, { password });
		return response.data;
	}

	/**
	 * Eliminar credencial
	 */
	async deleteCredential(id: string): Promise<GenericResponse> {
		const response = await adminAxios.delete(`/api/pjn-credentials/${id}`);
		return response.data;
	}

	/**
	 * Obtener estado del portal PJN (incidentes activos y recientes)
	 */
	async getPortalStatus(): Promise<PortalStatusResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/portal-status");
		return response.data;
	}

	/**
	 * Obtener cobertura de actualización de causas vinculadas (private-causas-update)
	 */
	async getUpdateCoverage(): Promise<{ success: boolean; data: MisCausasCoverage }> {
		const response = await adminAxios.get("/api/pjn-credentials/update-coverage");
		return response.data;
	}
}

export default new PjnCredentialsService();
