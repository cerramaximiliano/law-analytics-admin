import pjsaltaAxios from "utils/pjsaltaAxios";

// ========== TYPES ==========

export interface MovimientoPjSalta {
	fecha: { $date: string } | string;
	numero?: string;
	titulo: string;
	fechaPublicacion?: { $date: string } | string;
	fechaFirma?: { $date: string } | string;
	firmantes?: string;
	organismo?: string;
	adjuntos?: number;
	notificada?: boolean;
	// Aliases para compat con UI copiada de eje (no se populan en runtime).
	tipo?: string;        // alias de `titulo` para UI
	descripcion?: string; // alias de `titulo` para UI
	detalle?: string;     // no aplica en pjsalta
	firmante?: string;    // alias singular
}

export interface TraspasoPjSalta {
	_id?: string;
	fecha: { $date: string } | string;
	descripcion?: string;
	observacion?: string;
	origenDestino?: string;
	tiempo?: string;
}

export interface IntervinientePjSalta {
	vinculo: string;
	nombre: string;
	representante?: string;
	domicilio?: string;
	// Alias compat UI eje
	tipo?: string;
}

export interface CausaRelacionadaPjSalta {
	identificador: string;
	cuij?: string; // alias compat UI eje
	caratula?: string;
	relacion?: string;
}

// Alias compat (UI copiada de eje importa `CausaRelacionada`).
export type CausaRelacionada = CausaRelacionadaPjSalta;

export interface UpdateHistoryEntry {
	timestamp: { $date: string } | string;
	source: string;
	workerId?: string;
	updateType: string;
	success: boolean;
	movimientosAdded: number;
	movimientosTotal: number;
	details?: Record<string, any>;
}

export interface UpdateStats {
	count: number;
	errors: number;
	newMovs: number;
	avgMs: number;
	last?: { $date: string } | string;
	today?: { date: string; count: number; hours: number[] };
}

export interface CausaPjSalta {
	_id: string | { $oid: string };
	expedienteId: string;
	cuij?: string;
	tipo?: string;
	numero?: number;
	anio?: number;
	searchTerm?: string;
	// Datos del expediente
	caratula: string;
	objeto?: string;
	fechaInicio?: { $date: string } | string;
	fechaUltimoMovimiento?: { $date: string } | string;
	ultimoMovimiento?: { $date: string } | string;
	// Ubicación
	tribunalPrimera?: string;
	tribunalSegunda?: string;
	corteJusticia?: string;
	juez?: string;
	juzgado?: string;
	sala?: string;            // no aplica en pjsalta — alias compat UI eje
	tribunalSuperior?: string; // no aplica en pjsalta — alias compat UI eje
	monto?: number;            // no aplica en pjsalta — alias compat UI eje
	montoMoneda?: string;      // no aplica en pjsalta — alias compat UI eje
	ubicacionActual?: string;
	expedienteAdministrativoUACF?: string;
	// Sub-docs
	movimiento?: MovimientoPjSalta[];
	movimientos?: MovimientoPjSalta[]; // alias plural compat con UI eje (no existe en backend)
	movimientosCount?: number;
	traspasos?: TraspasoPjSalta[];
	traspasosCount?: number;
	intervinientes?: IntervinientePjSalta[];
	causasRelacionadas?: CausaRelacionadaPjSalta[];
	// Estado
	estado?: string;
	tieneSentencia?: boolean;
	isPrivate?: boolean;
	// Flags
	source?: "app" | "import" | "pjsalta-scraping";
	verified: boolean;
	isValid: boolean | null;
	update?: boolean;
	isError?: boolean;
	lastUpdate?: { $date: string } | string;
	lastCheckedDate?: { $date: string } | string;
	dailyUpdateCount?: number;
	// Pivote
	isPivot?: boolean;
	pivotCausaIds?: (string | { $oid: string })[];
	resolved?: boolean;
	selectedCausaId?: string | { $oid: string };
	tooManyResults?: boolean;
	searchTotalResults?: number;
	// Workers
	verifiedAt?: { $date: string } | string;
	detailsLoaded?: boolean;
	detailsLastUpdate?: { $date: string } | string;
	lastError?: string;
	errorCount?: number;
	stuckSince?: { $date: string } | string;
	lockedBy?: string;
	lockedAt?: { $date: string } | string;
	// Vinculación
	folderIds?: string[];
	userCausaIds?: string[];
	userUpdatesEnabled?: Array<{ userId: string; enabled: boolean }>;
	// Historial / metadata
	updateHistory?: UpdateHistoryEntry[];
	updateStats?: UpdateStats;
	portalData?: {
		urlExpediente?: string;
		fechaConsulta?: { $date: string } | string;
		tipoConsulta?: string;
		resultadosBusqueda?: number;
	};
	scrapingProgress?: {
		isComplete?: boolean;
		totalExpected?: number;
		totalProcessed?: number;
		remainingCount?: number;
		status?: "pending" | "in_progress" | "completed" | "partial" | "error";
	};
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

export interface CausasPjSaltaResponse {
	success: boolean;
	message?: string;
	data: CausaPjSalta | CausaPjSalta[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		pages: number;
		// Aliases para compatibilidad con UI que usa formato EJE
		currentPage?: number;
		totalPages?: number;
		hasNextPage?: boolean;
		hasPrevPage?: boolean;
	};
	count?: number;
	totalInDatabase?: number;
}

// ========== SHARED LIST PARAMS ==========

export interface ListParams {
	page?: number;
	limit?: number;
	cuij?: string;
	expedienteId?: string;
	q?: string;
	userId?: string;
	folderId?: string;
	verified?: boolean;
	isValid?: boolean | null;
	isPivot?: boolean;
	update?: boolean;
	tooMany?: boolean;
	sort?: "asc" | "desc";
}

function normalizePaginationResponse(resp: CausasPjSaltaResponse): CausasPjSaltaResponse {
	if (resp?.pagination) {
		const p = resp.pagination;
		resp.pagination = {
			...p,
			currentPage: p.page,
			totalPages: p.pages,
			hasNextPage: p.page < p.pages,
			hasPrevPage: p.page > 1,
		};
		resp.count = Array.isArray(resp.data) ? resp.data.length : 0;
		resp.totalInDatabase = p.total;
	}
	return resp;
}

// ========== SERVICE ==========

// ─────────────────────────────────────────────────────────────────────────
// Types adicionales — stats globales (compat UI copiada de eje)
// ─────────────────────────────────────────────────────────────────────────

export interface WorkerStatsResponse {
	success: boolean;
	data: {
		total: number;
		verification: { pending: number; completed: number; rate: string };
		details: { pending: number; completed: number; rate: string };
		status: { valid: number; invalid: number; private: number };
		processing: { locked: number; stuck: number; recentlyProcessed: number };
		errors: { total: number; distribution: Array<{ count: number; docs: number }> };
	};
}

export interface EligibilityStatsResponse {
	success: boolean;
	data: {
		elegibles: number;
		noElegibles: number;
		totalElegibles: number;
		actualizadosHoy: number;
		pendientesHoy: number;
		coveragePercent: number;
		thresholdHours: number;
	};
}

export class CausasPjSaltaService {
	/** Causas verificadas y válidas (vista Carpetas Verificadas) */
	static async getVerifiedCausas(params?: ListParams): Promise<CausasPjSaltaResponse> {
		const queryParams: Record<string, any> = { verified: true, isValid: true, isPivot: false, ...params };
		// Sólo dejamos pasar params definidos
		Object.keys(queryParams).forEach((k) => queryParams[k] === undefined && delete queryParams[k]);
		const response = await pjsaltaAxios.get("/causas", { params: queryParams });
		return normalizePaginationResponse(response.data);
	}

	/** Causas no verificadas (verified=false o isValid=false) */
	static async getNonVerifiedCausas(params?: ListParams): Promise<CausasPjSaltaResponse> {
		const queryParams: Record<string, any> = { verified: false, isPivot: false, ...params };
		Object.keys(queryParams).forEach((k) => queryParams[k] === undefined && delete queryParams[k]);
		const response = await pjsaltaAxios.get("/causas", { params: queryParams });
		return normalizePaginationResponse(response.data);
	}

	/** Pivots — documentos con múltiples resultados pendientes de selección */
	static async getPivotCausas(params?: ListParams): Promise<CausasPjSaltaResponse> {
		const queryParams: Record<string, any> = { isPivot: true, ...params };
		Object.keys(queryParams).forEach((k) => queryParams[k] === undefined && delete queryParams[k]);
		const response = await pjsaltaAxios.get("/causas", { params: queryParams });
		return normalizePaginationResponse(response.data);
	}

	/** Causa por _id */
	static async getCausaById(id: string): Promise<CausasPjSaltaResponse> {
		const response = await pjsaltaAxios.get(`/causas/${encodeURIComponent(id)}`);
		return response.data;
	}

	/** Causa por CUIJ */
	static async getCausaByCuij(cuij: string): Promise<CausasPjSaltaResponse> {
		const response = await pjsaltaAxios.get(`/causas/cuij/${encodeURIComponent(cuij)}`);
		return response.data;
	}

	/** Causas candidatas vinculadas a un pivote */
	static async getPivotCandidates(pivotId: string): Promise<{
		success: boolean;
		data: { pivot: Partial<CausaPjSalta>; candidates: CausaPjSalta[] };
	}> {
		const response = await pjsaltaAxios.get(`/causas/${encodeURIComponent(pivotId)}/pivot-candidates`);
		return response.data;
	}

	/** Resolver un pivote eligiendo una causa */
	static async resolvePivot(
		pivotId: string,
		selectedCausaId: string,
	): Promise<{
		success: boolean;
		data: { pivot: CausaPjSalta; selectedCausa: CausaPjSalta; foldersMoved: number };
	}> {
		const response = await pjsaltaAxios.post(`/causas/${encodeURIComponent(pivotId)}/resolve-pivot`, { selectedCausaId });
		return response.data;
	}

	/** Crear causa para que el verifier la procese */
	static async createCausa(payload: { searchTerm: string; caratula?: string; userCausaId?: string; folderId?: string }): Promise<CausasPjSaltaResponse> {
		const response = await pjsaltaAxios.post("/causas", payload);
		return response.data;
	}

	/** Actualizar campos editables */
	static async updateCausa(
		id: string,
		updates: Partial<Pick<CausaPjSalta, "update" | "userUpdatesEnabled" | "folderIds" | "userCausaIds">>,
	): Promise<CausasPjSaltaResponse> {
		const response = await pjsaltaAxios.patch(`/causas/${encodeURIComponent(id)}`, updates);
		return response.data;
	}

	/** Forzar reprocesamiento en próximo ciclo del updater */
	static async forceUpdate(id: string): Promise<{ success: boolean; data: { _id: string; queuedForUpdate: boolean } }> {
		const response = await pjsaltaAxios.post(`/causas/${encodeURIComponent(id)}/force-update`);
		return response.data;
	}

	/** Volver al pool del verifier (admin) */
	static async resetVerification(id: string): Promise<{ success: boolean; data: { _id: string; queuedForVerification: boolean } }> {
		const response = await pjsaltaAxios.post(`/causas/${encodeURIComponent(id)}/reset-verification`);
		return response.data;
	}

	/** Eliminar causa (admin) */
	static async deleteCausa(id: string): Promise<{ success: boolean; data: { _id: string; deleted: boolean } }> {
		const response = await pjsaltaAxios.delete(`/causas/${encodeURIComponent(id)}`);
		return response.data;
	}

	/** Alias del UI eje — devuelve las causas candidatas vinculadas al pivote. */
	static async getPivotLinkedCausas(pivotId: string): Promise<CausasPjSaltaResponse> {
		const { data } = await CausasPjSaltaService.getPivotCandidates(pivotId);
		return { success: true, data: data.candidates };
	}

	/** Stats globales del subsistema pjsalta — una sola query agregada en backend. */
	static async getWorkerStats(): Promise<WorkerStatsResponse> {
		try {
			const response = await pjsaltaAxios.get("/causas/stats");
			const d = response.data?.data || {};
			return {
				success: !!response.data?.success,
				data: {
					total: d.total || 0,
					verification: d.verification || { pending: 0, completed: 0, rate: "0%" },
					// `details` no aplica en pjsalta — devolvemos shape vacío
					details: { pending: 0, completed: 0, rate: "0%" },
					status: d.status || { valid: 0, invalid: 0, private: 0 },
					processing: { locked: 0, stuck: d.processing?.stuck || 0, recentlyProcessed: d.update?.updatedToday || 0 },
					errors: { total: d.processing?.withErrors || 0, distribution: [] },
				},
			};
		} catch (error) {
			return {
				success: false,
				data: {
					total: 0,
					verification: { pending: 0, completed: 0, rate: "0%" },
					details: { pending: 0, completed: 0, rate: "0%" },
					status: { valid: 0, invalid: 0, private: 0 },
					processing: { locked: 0, stuck: 0, recentlyProcessed: 0 },
					errors: { total: 0, distribution: [] },
				},
			};
		}
	}

	/** Stats de elegibilidad para el update worker. */
	static async getEligibilityStats(): Promise<EligibilityStatsResponse> {
		try {
			const response = await pjsaltaAxios.get("/causas/eligibility");
			return response.data;
		} catch (error) {
			return {
				success: false,
				data: {
					elegibles: 0,
					noElegibles: 0,
					totalElegibles: 0,
					actualizadosHoy: 0,
					pendientesHoy: 0,
					coveragePercent: 0,
					thresholdHours: 24,
				},
			};
		}
	}
}

export default CausasPjSaltaService;
