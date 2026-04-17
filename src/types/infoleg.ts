// ── Norma ─────────────────────────────────────────────────────

export type InfolegStatus = "pending" | "scraped" | "error" | "not_found";
export type InfolegVigencia = "vigente" | "derogada" | "parcialmente_vigente" | "desconocida";
export type InfolegTipo =
	| "ley"
	| "decreto"
	| "decreto_ley"
	| "decreto_reglamentario"
	| "decreto_dnu"
	| "resolucion"
	| "resolucion_general"
	| "resolucion_administrativa"
	| "decision_administrativa"
	| "disposicion"
	| "disposicion_conjunta"
	| "acuerdo"
	| "convenio"
	| "otro";

export interface InfolegBoletin {
	numero?: string;
	fecha?: string;
	pagina?: string;
}

export interface InfolegVinculacionEntrante {
	total: number;
	modificaciones: number;
	derogaciones: number;
	complementos: number;
	reglamentaciones: number;
	aplicaciones: number;
	referencias: number;
}

export interface InfolegVinculacionRaw {
	tipo: string;
	textoOriginal: string;
	infolegIdDestino: number;
	urlDestino: string;
}

export interface InfolegTasks {
	textoOriginal: boolean;
	textoActualizado: boolean;
	vinculacionesParsed: boolean;
	vinculacionesResolved: boolean;
	textoActualizadoStale: boolean;
}

export interface InfolegTextoFuente {
	original: string;
	actualizado: string;
}

export interface InfolegNorma {
	_id: string;
	infolegId: number;
	numero?: string;
	anio?: number;
	tipo?: InfolegTipo | null;
	titulo: string;
	organismo: string;
	fechaPublicacion?: string;
	fechaVigencia?: string;
	boletin: InfolegBoletin;
	textoHtml?: string;
	textoPlano?: string;
	textoActualizadoHtml?: string;
	textoActualizadoPlano?: string;
	textoFuente: InfolegTextoFuente;
	vigencia: InfolegVigencia;
	urlSlug: string;
	vinculacionesEntrantes: InfolegVinculacionEntrante;
	status: InfolegStatus;
	tasks: InfolegTasks;
	vinculacionesRaw?: InfolegVinculacionRaw[];
	consecutiveErrors?: number;
	scrapedAt?: string;
	createdAt?: string;
	updatedAt?: string;
}

// ── Config ────────────────────────────────────────────────────

export interface InfolegWorkerConfig {
	enabled: boolean;
	pm2Name: string;
	minWorkers: number;
	maxWorkers: number;
	scaleUpThreshold: number;
	scaleDownThreshold: number;
	batchSize: number;
	delayMs: number;
	workStartHour: number;
	workEndHour: number;
	workDays: number[];
}

export interface InfolegScrapingConfig {
	idStart: number;
	idCurrent: number;
	idMax: number;
}

export interface InfolegEmailConfig {
	sendDailyReport: boolean;
	reportHour: number;
	alertOnError: boolean;
	reportTo: string;
}

export interface InfolegConfig {
	_id: string;
	name: string;
	config: {
		checkInterval: number;
		timezone: string;
		scraping: InfolegScrapingConfig;
		workers: {
			scraper: InfolegWorkerConfig;
			vinculaciones: InfolegWorkerConfig;
		};
		email: InfolegEmailConfig;
	};
	state: {
		managerRunning: boolean;
		lastCycle?: string;
		cycleCount: number;
	};
	stats: {
		totalProcessed: number;
		totalErrors: number;
		lastDailyReport?: string;
	};
	history: InfolegSnapshot[];
	alerts: InfolegAlert[];
	updatedAt?: string;
}

export interface InfolegSnapshot {
	timestamp: string;
	activeWorkers?: number;
	pendingScraper?: number;
	pendingVinculaciones?: number;
	cycleCount?: number;
}

export interface InfolegAlert {
	type: "error" | "warning" | "info";
	message: string;
	context?: string;
	timestamp: string;
	resolved: boolean;
}

// ── Stats ─────────────────────────────────────────────────────

export interface InfolegStats {
	totals: {
		pending: number;
		scraped: number;
		error: number;
		not_found: number;
		total: number;
	};
	tasks: {
		conTextoOriginal: number;
		conTextoActualizado: number;
		conVinculaciones: number;
		stale: number;
	};
	porTipo: { tipo: string; count: number }[];
	recientes: Pick<InfolegNorma, "_id" | "infolegId" | "tipo" | "numero" | "anio" | "titulo" | "scrapedAt">[];
	scraping?: InfolegScrapingConfig;
	managerState?: InfolegConfig["state"];
	managerStats?: InfolegConfig["stats"];
}

// ── Worker PM2 ────────────────────────────────────────────────

export interface InfolegWorkerStatus {
	name: string;
	status: "online" | "stopped" | "errored" | "unavailable" | string;
	pid?: number;
	instances?: number;
	uptime?: number;
	restarts?: number;
	memory?: number;
	cpu?: number;
}

// ── API Responses ─────────────────────────────────────────────

export interface InfolegNormasResponse {
	success: boolean;
	data: InfolegNorma[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface InfolegNormaResponse {
	success: boolean;
	data: InfolegNorma;
}

export interface InfolegConfigResponse {
	success: boolean;
	data: InfolegConfig | null;
	message?: string;
}

export interface InfolegStatsResponse {
	success: boolean;
	data: InfolegStats;
}

export interface InfolegWorkersResponse {
	success: boolean;
	data: InfolegWorkerStatus[];
}

// ── Filtros de listado ────────────────────────────────────────

export interface InfolegNormaFilters {
	page?: number;
	limit?: number;
	status?: InfolegStatus;
	tipo?: InfolegTipo;
	vigencia?: InfolegVigencia;
	search?: string;
	desde?: string;
	hasta?: string;
	conTexto?: "true" | "false";
	stale?: "true" | "false";
}
