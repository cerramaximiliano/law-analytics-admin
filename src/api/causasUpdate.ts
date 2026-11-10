/**
 * API Service para Causas Update Worker
 * Config y Runs del worker de actualización de causas (pjn-mis-causas)
 */
import adminAxios from "utils/adminAxios";

// ====== Interfaces ======

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
	count?: number;
	page?: number;
	limit?: number;
	totalPages?: number;
}

export interface CausasUpdateConfig {
	worker: {
		enabled: boolean;
		maxCredentialsPerRun: number;
		maxCausasPerCredential: number;
		delayBetweenCausas: number;
		delayBetweenCredentials: number;
		paginationDelay: number;
		/** Correo al usuario antes de que venza su contraseña del Portal PJN (pjn-mis-causas password-expiry-notifier). Default false. */
		passwordExpiryEmailEnabled?: boolean;
		/** Correo al usuario cuando el portal le ofrece o él activa 2FA (portal-2fa-notifier). Default false. */
		portal2faEmailEnabled?: boolean;
		/** update-sync lee el listado Relacionados por la API del SCW nuevo (fallback al browser). Default false. */
		listadoApiScwBeta?: boolean;
		/** Ids de credenciales alcanzadas por listadoApiScwBeta; vacío = todas. Se edita desde Credenciales PJN. */
		listadoApiScwBetaCredenciales?: string[];
		listadoApiScwBetaUpdatedAt?: string | null;
		listadoApiScwBetaUpdatedBy?: string | null;
		/** Sonda diaria de la API del SCW nuevo (pjn-scw-beta-probe). Default true. */
		scwBetaProbeEnabled?: boolean;
		/** Ante una falla dura la sonda apaga los flags de la API. Default true. */
		scwBetaProbeAutoOff?: boolean;
		/** Id de la credencial con la que corre la sonda; vacío = la primera de listadoApiScwBetaCredenciales. */
		scwBetaProbeCredencial?: string | null;
		/** Backfill por el SCW clásico de las históricas que la API no pudo dar (pjn-huecos-backfill). Default false. */
		huecosBackfillEnabled?: boolean;
		huecosBackfillMaxCausas?: number;
	};
	thresholds: {
		updateThresholdHours: number;
		minTimeBetweenRunsMinutes: number;
		maxRunsPerDay: number;
	};
	concurrency: {
		waitForCausaCreation: boolean;
		checkIntervalMs: number;
		maxWaitMinutes: number;
	};
	resume: {
		enabled: boolean;
		maxResumeAttempts: number;
		resumeDelayMinutes: number;
	};
	updatedAt?: string;
	updatedBy?: string;
}

export interface CausaDetail {
	causaId: string;
	fuero: string;
	number: number;
	year: number;
	status: "success" | "error" | "skipped" | "not_found";
	movimientosAdded: number;
	movimientosTotal: number;
	error?: string;
	processedAt: string;
}

export interface CausasUpdateRun {
	_id: string;
	credentialsId: string;
	userId: string;
	status: "in_progress" | "completed" | "partial" | "error" | "interrupted";
	startedAt: string;
	completedAt?: string;
	durationSeconds?: number;
	results: {
		totalCausas: number;
		causasProcessed: number;
		causasUpdated: number;
		causasSkipped: number;
		causasError: number;
		newMovimientos: number;
		isComplete: boolean;
	};
	causasDetail?: CausaDetail[];
	resumePoint?: {
		lastProcessedIndex: number;
		lastCausaId: string;
		lastFuero: string;
	};
	error?: {
		message: string;
		code: string;
		phase: string;
	};
	metadata: {
		triggeredBy: "manager" | "manual" | "resume";
		workerPid: number;
		configSnapshot: {
			updateThresholdHours: number;
			maxCausasPerCredential: number;
			delayBetweenCausas: number;
		};
		isFirstRun: boolean;
		isResumedRun: boolean;
		previousRunId?: string;
		resumeAttempts: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface RunsStats {
	today: {
		totalRuns: number;
		causasProcessed: number;
		causasUpdated: number;
		newMovimientos: number;
		totalErrors: number;
		avgDuration?: number;
		completed?: number;
		partial?: number;
		errors?: number;
	};
	weekByDay: Array<{
		_id: string;
		runs: number;
		causasUpdated: number;
		newMovimientos: number;
	}>;
	incompleteRuns: number;
	byCredential: Array<{
		_id: string;
		userId: string;
		totalRuns: number;
		causasUpdated: number;
		newMovimientos: number;
		errors: number;
		lastRun: string;
	}>;
	recentRuns: CausasUpdateRun[];
}

export interface RunsQueryParams {
	page?: number;
	limit?: number;
	status?: string;
	credentialsId?: string;
	startDate?: string;
	endDate?: string;
}

export type ScrapeIncidentType = "search_error" | "scraping_error" | "degraded_scrape" | "processing_exception" | "login_error" | "other";

export interface ScrapeIncident {
	_id: string;
	type: ScrapeIncidentType;
	worker: string;
	causaId?: string;
	causaType?: string | null;
	fuero?: string | null;
	number?: string | null;
	year?: string | null;
	caratula?: string | null;
	credentialsId?: string | null;
	runId?: string | null;
	pageUrl?: string | null;
	errorMessage?: string | null;
	s3Key?: string | null;
	screenshotUrl?: string | null;
	htmlSnippet?: string | null;
	openedDay?: string;
	detectionCount: number;
	firstSeenAt?: string;
	lastSeenAt?: string;
	resolved: boolean;
	resolvedAt?: string | null;
	resolvedBy?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export interface IncidentsQueryParams {
	page?: number;
	limit?: number;
	type?: ScrapeIncidentType;
	fuero?: string;
	resolved?: boolean;
	causaId?: string;
	startDate?: string;
}

export interface IncidentStats {
	total: number;
	open: number;
	byType: Record<string, number>;
}

// ====== Service ======

export interface VinculadosAppUpdate {
	capturarEnAppUpdate: boolean;
	leerIncidentes: boolean;
	refreshDays: number;
	maxPaginas: number;
	documentos?: number;
	uniforme?: boolean;
}
export interface VinculadosMisCausas {
	enabled: boolean;
	refreshDays: number;
	maxPaginas: number;
}
export interface VinculadosConfig {
	appUpdate: VinculadosAppUpdate;
	misCausas: VinculadosMisCausas;
}

// ====== API del SCW nuevo: sonda diaria y backfill de huecos (GET /api/causas-update/scw-beta) ======

export interface ScwBetaProbePaso {
	ok: boolean;
	ms?: number;
	/** Paso no ejecutado y por qué (cuenta como ok). */
	omitido?: string;
	error?: string;
	[k: string]: unknown;
}

export interface ScwBetaProbeRun {
	_id: string;
	at: string;
	ok: boolean;
	ms: number;
	/** Portal caído: la sonda no evaluó la API. */
	abortado?: string;
	duras: string[];
	avisos: string[];
	pasos: Record<string, ScwBetaProbePaso>;
	credentialId?: string;
	credentialEmail?: string | null;
	flagsApagados?: boolean;
	swagger?: { hash: string } | null;
	cliente?: { requests: number; reintentos: number; errores5xx: number; refreshes: number; ms: number } | null;
}

export interface HuecosBackfillRun {
	_id: string;
	at: string;
	ms: number;
	dryRun?: boolean;
	instance?: string;
	pendientesAlInicio: number;
	credenciales: number;
	credencialesOcupadas: number;
	credencialesConError: number;
	causas: number;
	agregados: number;
	errores: number;
	sinBotonHistoricas: number;
	noEnListado: number;
}

export interface ScwBetaPanel {
	sonda: {
		enabled: boolean;
		autoOff: boolean;
		credencialId: string | null;
		credencialEmail: string | null;
		credencialPorDefecto: boolean;
		flags: Record<string, boolean>;
		apagadoAutomatico: { at: string; motivo: string; previos: Record<string, boolean> } | null;
		estado: { ultimaCorrida?: string; ultimoOk?: boolean; ultimoResumen?: string; duras?: string[]; avisos?: string[] } | null;
		corridas: ScwBetaProbeRun[];
	};
	huecos: {
		enabled: boolean;
		maxCausas: number;
		maxIntentos: number;
		delayMs: number;
		causasPorSesion: number;
		corridas: HuecosBackfillRun[];
	};
}

export class CausasUpdateService {
	static async getScwBeta(params?: { limit?: number }): Promise<ApiResponse<ScwBetaPanel>> {
		try {
			const response = await adminAxios.get("/api/causas-update/scw-beta", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Pestaña Vinculados en pjn-workers (app-update) y pjn-mis-causas (2026-09-30). */
	static async getVinculadosConfig(): Promise<ApiResponse<VinculadosConfig>> {
		try {
			const response = await adminAxios.get("/api/causas-update/vinculados");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateVinculadosConfig(body: {
		appUpdate?: Partial<VinculadosAppUpdate>;
		misCausas?: Partial<VinculadosMisCausas>;
	}): Promise<ApiResponse<VinculadosConfig>> {
		try {
			const response = await adminAxios.patch("/api/causas-update/vinculados", body);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Config
	static async getConfig(): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.get("/api/causas-update/config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateConfig(data: Partial<CausasUpdateConfig>): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.patch("/api/causas-update/config", data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async resetConfig(): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.post("/api/causas-update/config/reset");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Runs
	static async getRuns(params?: RunsQueryParams): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getRunDetail(id: string): Promise<ApiResponse<CausasUpdateRun>> {
		try {
			const response = await adminAxios.get(`/api/causas-update/runs/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getStats(): Promise<ApiResponse<RunsStats>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs/stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getIncompleteRuns(): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs/incomplete");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getCredentialRuns(credId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get(`/api/causas-update/runs/credential/${credId}`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Scrape Incidents (evidencia de errores con screenshot en S3)
	static async getIncidents(params?: IncidentsQueryParams): Promise<ApiResponse<ScrapeIncident[]>> {
		try {
			const response = await adminAxios.get("/api/causas-update/incidents", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getIncidentStats(): Promise<ApiResponse<IncidentStats>> {
		try {
			const response = await adminAxios.get("/api/causas-update/incidents/stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getIncidentDetail(id: string): Promise<ApiResponse<ScrapeIncident>> {
		try {
			const response = await adminAxios.get(`/api/causas-update/incidents/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async resolveIncident(id: string, resolved: boolean): Promise<ApiResponse<ScrapeIncident>> {
		try {
			const response = await adminAxios.patch(`/api/causas-update/incidents/${id}/resolve`, { resolved });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	private static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default CausasUpdateService;
