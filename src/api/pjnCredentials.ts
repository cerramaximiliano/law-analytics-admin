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
	bandejaNotificationsEnabled?: boolean;
	verified: boolean;
	verifiedAt: string | null;
	isValid: boolean;
	isValidAt: string | null;
	syncStatus: "pending" | "in_progress" | "completed" | "error" | "never_synced" | "idle";
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
	/** Avisos de credencial ya enviados a este usuario (cruce con emaillogs). */
	avisos?: {
		total: number;
		lastAt: string | null;
		lastSubject: string | null;
		firstAt: string | null;
	};
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
	// Auditoría de desvinculación/reset (presente cuando syncStatus === "idle")
	unlinkedAt?: string | null;
	unlinkedMode?: "keep" | "delete" | null;
	unlinkedSource?: "user" | "team" | "admin" | null;
	unlinkedByName?: string | null;
	unlinkedByEmail?: string | null;
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
export interface CausaSyncState {
	/** 'relacionados' = vía login de credencial | 'publico' = worker público (captcha) */
	via: "relacionados" | "publico";
	/** true = figura en el listado | false = salió | null = sin credencial activa para saberlo */
	enRelacionados: boolean | null;
	estado:
		| "ok"
		| "atrasada"
		| "salio_de_relacionados"
		| "credencial_invalida"
		| "accion_requerida"
		| "credencial_deshabilitada"
		| "error_actualizacion"
		| "sin_captura";
	/** Cuándo entró en este estado */
	desde: string | null;
	detalle: string | null;
}

export interface CausaStateEvent {
	at: string;
	tipo: string;
	detalle: string;
}

export interface SyncedCausa {
	_id: string;
	number: number;
	year: number;
	incidente?: string | null;
	fuero: string;
	/** Colección Mongo de origen (para el endpoint de historial de estado) */
	collection?: string;
	/** Estado de sync explícito, computado en vivo por el backend */
	syncState?: CausaSyncState;
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

export type UserViewGate = "archived" | "pending_selection" | "reserved" | "reserved_revoked" | "failed" | "invalid" | "pending" | null;

export type UserViewList =
	| "plain"
	| "reserved"
	| "reserved_covered"
	| "revoked"
	| "list_removed"
	| "pending_selection"
	| "failed"
	| "pending"
	| "invalid"
	| "ok"
	| "ok_cred_error"
	| "cred_status";

export interface CausaUserViewEntry {
	user: { id: string | null; email: string | null; name: string | null };
	folder: {
		_id: string;
		userId: string | null;
		causaId?: string | null;
		causaType?: string;
		folderName?: string;
		materia?: string;
		status?: string;
		orderStatus?: string;
		archived?: boolean;
		source?: string;
		pjn?: boolean;
		mev?: boolean;
		eje?: boolean;
		scba?: boolean;
		pjsalta?: boolean;
		pjcatamarca?: boolean;
		pjmendoza?: boolean;
		mevCredentialStatus?: string | null;
		causaVerified?: boolean;
		causaIsValid?: boolean;
		causaIsPrivate?: boolean;
		causaCredentialCovered?: boolean;
		causaAssociationStatus?: string;
		listRemoved?: boolean;
		listRemovedSource?: string | null;
		listRemovedAt?: string | null;
		pjnNotFound?: boolean;
		lastMovementDate?: string | null;
		verificationAttempts?: number;
		expedientNumber?: string;
		expedientYear?: string;
		description?: string;
		judFolder?: Record<string, unknown>;
		folderJuris?: { label?: string } | string;
		initialDateFolder?: string | null;
		finalDateFolder?: string | null;
		scrapingProgress?: { status?: string; isComplete?: boolean } | null;
		createdAt?: string;
		updatedAt?: string;
	};
	links: Array<{
		credentialId: string | null;
		removedFromSync: boolean;
		removedAt: string | null;
		access: string | null;
		accessChangedAt: string | null;
		credentialEnabled: boolean | null;
		credentialValid: boolean | null;
		credentialSyncStatus: string | null;
		credentialLastErrorCode: string | null;
	}>;
	view: {
		list: UserViewList;
		expanded: { label: string; accent: "red" | "amber" | "green"; badge: string };
		detail: { chip: { label: string; accent: "red" | "amber" | "green"; badge: string }; gate: UserViewGate };
		hiddenFromList: boolean;
		inAttentionTable: boolean;
		contentBlocked: boolean;
		credError: { code: string; message: string | null } | null;
		isPjnPrivateCovered: boolean;
	};
}

export interface CausaUserViewData {
	causa: null | {
		_id: string;
		number: number;
		year: number;
		incidente: string | null;
		fuero: string;
		caratula: string;
		objeto?: string;
		juzgado?: string;
		isPrivate: boolean | null;
		source?: string;
		lastUpdate: string | null;
		movimientosCount: number;
		fechaUltimoMovimiento: string | null;
		verified?: boolean | null;
		isValid?: boolean | null;
		lastError: { message: string; phase?: string; date: string } | null;
	};
	entries: CausaUserViewEntry[];
}

export interface UserViewStatsCombo {
	key: {
		source: string | null;
		archived: boolean;
		causaVerified: boolean | null;
		causaIsValid: boolean | null;
		causaAssociationStatus: string | null;
		causaIsPrivate: boolean | null;
		causaCredentialCovered: boolean | null;
		listRemoved: boolean;
		listRemovedSource?: string | null;
		pjnNotFound: boolean;
		mevCredentialStatus?: string | null;
		hasPending?: boolean;
		hasCausa: boolean;
		credError: boolean;
	};
	n: number;
	pct: number;
	users: number;
	sampleFolderId: string | null;
	view: CausaUserViewEntry["view"];
	flags: string[];
}

export interface UserViewStatsData {
	total: number;
	filters: { archived: string; userId: string | null; jurisdiction?: string };
	byRow: Array<{ row: string; n: number; pct: number; combos: number; flagged: number }>;
	byGate: Record<string, number>;
	combos: UserViewStatsCombo[];
	users: Array<{ id: string; email: string | null; n: number; archived: number; credError: boolean }>;
}

export interface FolderRowStatsData {
	total: number;
	filters: { archived: string };
	byRow: Array<{ row: string; n: number; pct: number }>;
	jurisdictions: Array<{ jurisdiction: string; total: number; pct: number; rows: Array<{ row: string; n: number; pct: number }> }>;
}

export type DailySyncState = "ok" | "no_run_today" | "incomplete" | "error" | "invalid" | "interrupted" | "running" | "inactive_user";

export interface CausaCoverageData {
	universo: number;
	via: { lista: number; numero: number };
	motivo: Record<string, number>;
	actualizador: { "privado-lista": number; "privado-numero": number; "privado+publico": number };
	credencialViva: { si: number; no: number };
	porFuero: Record<string, { total: number; lista: number; numero: number }>;
	invariante: { suma: number; universo: number; cierra: boolean };
}

export interface WorkerStatKpi {
	label: string;
	value: number;
	unit?: string;
	tone?: "success" | "warning" | "error";
}

export interface WorkerStatBlock {
	source: string;
	runs: { total: number; byStatus: Record<string, number> } | null;
	ultimaActividad: string | null;
	kpis: WorkerStatKpi[];
}

export interface WorkerStatsData {
	days: number;
	since: string;
	workers: Record<string, WorkerStatBlock>;
}

export interface DailySyncRow {
	credentialId: string;
	user: { id: string | null; email: string | null; name: string | null; isActive: boolean | null };
	credential: {
		isValid: boolean;
		syncStatus: string;
		lastErrorCode: string | null;
		retries: number;
		lastIncrementalSync: string | null;
		lastAttemptAt: string | null;
		lastFullSync: string | null;
	};
	state: DailySyncState;
	stateReason: string;
	lastRun: {
		id: string;
		status: string;
		startedAt: string;
		completedAt: string | null;
		triggeredBy: string | null;
		outcome: string | null;
		durationMs: number | null;
		error: string | null;
	} | null;
	totals: { previous: number | null; current: number | null; delta: number | null };
	changes: {
		causasEncontradas: number;
		causasNuevas: number;
		foldersCreados: number;
		foldersArchivados: number;
		foldersPendientesLimite: number;
		listRemovedMarked: number;
		listRemovedCleared: number;
		scanComplete: boolean | null;
		pagesScanned: number | null;
	};
	reconciliation: {
		portalExpedientes: number | null;
		matchedByKey: number | null;
		matchedByCaratula: number | null;
		portalWithoutFolder: number | null;
	};
	folders: { total: number; active: number; archived: number; listRemoved: number };
	series: Array<{ date: string; total: number }>;
	runsInPeriod: number;
}

export interface DailySyncControlData {
	generatedAt: string;
	days: number;
	today: string;
	rows: DailySyncRow[];
	totals: {
		credentials: number;
		byState: Record<string, number>;
		portalCausas: number;
		portalCausasPrevious: number;
		foldersTotal: number;
		foldersActive: number;
		foldersArchived: number;
		foldersListRemoved: number;
		todayNewCausas: number;
		todayFoldersCreated: number;
		todayListRemovedMarked: number;
		todayMatchedByCaratula: number;
		todayPortalWithoutFolder: number;
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
	// Causas con movimiento fechado HOY (novedad judicial real del día).
	movimientosHoy?: number;
}

export interface SyncedCausasFilters {
	credentialId?: string;
	fuero?: string;
	hasMovements?: string;
	soloElegibles?: boolean;
	noActualizables?: boolean;
	conErrores?: boolean;
	/** Solo causas con movimiento fechado HOY (novedad judicial real) */
	movimientosHoy?: boolean;
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
	// Credenciales PJN activas (enabled + isValid). El backend ya las computa
	// para filtrar causas, así que viene sin costo extra en el mismo payload.
	activeCredentials?: number;
	/** Política de update del worker SSO (espejo de updatePolicyMode en SCBA). */
	updatePolicy?: { schedule: string; everyDay: boolean; enabled: boolean };
}

export interface HealthAnomaly {
	credentialId: string;
	userId: string | null;
	userEmail: string | null;
	userName: string | null;
	total: number;
	conError: number;
	sinCaptura: number;
	problem: number;
	coveragePercent: number | null;
	anomala: boolean;
	firstAnomalyAt: string | null;
	evaluatedAt: string | null;
}

export interface HealthAnomaliesResponse {
	success: boolean;
	data: HealthAnomaly[];
	meta: { count: number; lastEvaluatedAt: string | null };
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
	type: "search_error" | "scraping_error" | "degraded_scrape" | "processing_exception" | "login_error" | "empty_movements" | "other";
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
/** Alerta admin de credenciales (doc de pjn-admin-alerts, dedup por tipo+credencial) */
export interface PjnAdminAlert {
	_id: string;
	key: string;
	type: "credential_stuck" | "credential_disabled" | "transient_streak" | string;
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

export interface PjnAdminAlertsResponse {
	success: boolean;
	data: PjnAdminAlert[];
	activeCount: number;
	pagination: { page: number; limit: number; total: number; pages: number };
}

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
	 * Activar/desactivar notificaciones de bandeja (cédulas) por credencial
	 */
	async toggleBandejaNotifications(id: string, bandejaNotificationsEnabled: boolean): Promise<GenericResponse> {
		const response = await adminAxios.patch(`/api/pjn-credentials/${id}/bandeja-notifications`, { bandejaNotificationsEnabled });
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
	 * Línea de tiempo de cambios de estado de una causa (click en chip Estado).
	 */
	async getCausaStateHistory(
		collection: string,
		causaId: string,
	): Promise<{ success: boolean; data: { causa: { id: string; identificador: string; caratula: string }; events: CausaStateEvent[] } }> {
		const response = await adminAxios.get("/api/pjn-credentials/causa-state-history", { params: { collection, causaId } });
		return response.data;
	}

	/**
	 * Vista del usuario: lo que cada usuario vinculado ve en su lista/detalle
	 * de carpeta para esta causa (lógica espejada del front).
	 */
	async getCausaUserView(params: {
		collection?: string;
		causaId?: string;
		folderId?: string;
	}): Promise<{ success: boolean; data: CausaUserViewData }> {
		const response = await adminAxios.get("/api/pjn-credentials/user-view", { params });
		return response.data;
	}

	/**
	 * Distribución real de tipos de fila del listado del usuario (folders PJN).
	 */
	async getUserViewStats(params: {
		archived?: "all" | "true" | "false";
		userId?: string;
		jurisdiction?: string;
	}): Promise<{ success: boolean; data: UserViewStatsData }> {
		const response = await adminAxios.get("/api/pjn-credentials/user-view-stats", { params });
		return response.data;
	}

	/**
	 * Tipos de fila del listado del usuario por jurisdicción (todas las carpetas vinculadas).
	 */
	async getFolderRowStats(params: { archived?: "all" | "true" | "false" }): Promise<{ success: boolean; data: FolderRowStatsData }> {
		const response = await adminAxios.get("/api/pjn-credentials/folder-row-stats", { params });
		return response.data;
	}

	/**
	 * Control diario de Mis Causas por credencial (update-sync).
	 */
	async getDailySyncControl(params: { days?: number }): Promise<{ success: boolean; data: DailySyncControlData }> {
		const response = await adminAxios.get("/api/pjn-credentials/daily-sync", { params });
		return response.data;
	}

	/**
	 * Estadísticas agregadas por worker de pjn-mis-causas (tabs de la UI Admin).
	 */
	async getWorkerStats(params: { days?: number }): Promise<{ success: boolean } & WorkerStatsData> {
		const response = await adminAxios.get("/api/pjn-credentials/worker-stats", { params });
		return response.data;
	}

	/**
	 * Reparto de las causas con credencial: por vía de acceso y por quién actualiza.
	 */
	async getCausaCoverage(): Promise<{ success: boolean } & CausaCoverageData> {
		const response = await adminAxios.get("/api/pjn-credentials/causa-coverage");
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
	 * Alertas admin de credenciales (watchdog + hooks de pjn-mis-causas,
	 * colección pjn-admin-alerts).
	 */
	async getAdminAlerts(
		params: { status?: "active" | "resolved" | "all"; type?: string; page?: number; limit?: number } = {},
	): Promise<PjnAdminAlertsResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/admin-alerts", { params });
		return response.data;
	}

	/**
	 * Obtener cobertura de actualización de causas vinculadas (private-causas-update)
	 */
	async getUpdateCoverage(): Promise<{ success: boolean; data: MisCausasCoverage }> {
		const response = await adminAxios.get("/api/pjn-credentials/update-coverage");
		return response.data;
	}

	/**
	 * Credenciales sanas con alto % de causas con error/sin captura (snapshot del
	 * cron credential-health-monitor). Detecta el caso "credencial verde, causas rotas".
	 */
	async getHealthAnomalies(): Promise<HealthAnomaliesResponse> {
		const response = await adminAxios.get("/api/pjn-credentials/health-anomalies");
		return response.data;
	}
}

export default new PjnCredentialsService();
