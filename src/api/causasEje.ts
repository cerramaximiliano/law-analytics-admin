import ejeAxios from "utils/ejeAxios";

// Interface para Movimiento EJE
export interface MovimientoEje {
	fecha: { $date: string } | string;
	tipo: string;
	descripcion: string;
	detalle?: string;
	firmante?: string;
	numero?: string;
}

// Interface para Interviniente EJE
export interface IntervinienteEje {
	tipo: string;
	nombre: string;
	representante?: string;
}

// Interface para Causa Relacionada
export interface CausaRelacionada {
	cuij: string;
	caratula?: string;
	relacion: string;
}

// Interface para estadísticas de actualización del día
export interface UpdateStatsToday {
	date: string;
	count: number;
	hours: number[];
}

// Interface para estadísticas de actualización
export interface UpdateStats {
	avgMs: number;
	count: number;
	errors: number;
	newMovs: number;
	today?: UpdateStatsToday;
	last?: { $date: string } | string;
}

// Interface para historial de actualizaciones
export interface UpdateHistoryEntry {
	timestamp: { $date: string } | string;
	source: string;
	updateType: "link" | "unlink" | "update" | "verify" | "scrape";
	success: boolean;
	movimientosAdded: number;
	movimientosTotal: number;
	details?: {
		message?: string;
		folderId?: string;
		userId?: string;
		searchTerm?: string;
		error?: string;
	};
}

// Interface para Causa EJE
export interface CausaEje {
	_id: string | { $oid: string };
	cuij: string;
	numero: number;
	anio: number;
	caratula: string;
	objeto?: string;
	monto?: number;
	montoMoneda?: string;
	fechaInicio?: { $date: string } | string;
	juzgado?: string;
	sala?: string;
	tribunalSuperior?: string;
	ubicacionActual?: string;
	estado?: string;
	isPrivate: boolean;
	source: "app" | "import" | "scraping";
	verified: boolean;
	isValid: boolean;
	lastUpdate?: { $date: string } | string;
	verifiedAt?: { $date: string } | string;
	detailsLoaded: boolean;
	detailsLastUpdate?: { $date: string } | string;
	lastError?: string;
	errorCount: number;
	stuckSince?: { $date: string } | string;
	lockedBy?: string;
	lockedAt?: { $date: string } | string;
	folderIds?: string[];
	userCausaIds?: string[];
	update?: boolean;
	movimientos?: MovimientoEje[];
	movimientosCount?: number;
	ultimoMovimiento?: { $date: string } | string;
	intervinientes?: IntervinienteEje[];
	causasRelacionadas?: CausaRelacionada[];
	updateHistory?: UpdateHistoryEntry[];
	updateStats?: UpdateStats;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

// Interface para respuesta de API
export interface CausasEjeResponse {
	success: boolean;
	message?: string;
	count?: number;
	totalInDatabase?: number;
	pagination?: {
		currentPage: number;
		totalPages: number;
		limit: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
	data: CausaEje | CausaEje[];
}

// Interface para estadísticas de workers
export interface WorkerStatsResponse {
	success: boolean;
	data: {
		total: number;
		verification: {
			pending: number;
			completed: number;
			rate: string;
		};
		details: {
			pending: number;
			completed: number;
			rate: string;
		};
		status: {
			valid: number;
			invalid: number;
			private: number;
		};
		processing: {
			locked: number;
			stuck: number;
			recentlyProcessed: number;
		};
		errors: {
			total: number;
			distribution: Array<{ count: number; docs: number }>;
		};
	};
}

// Interface para estadísticas de elegibilidad
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

// Servicio de causas EJE
export class CausasEjeService {
	/**
	 * Obtener causas verificadas y válidas (para vista Carpetas Verificadas)
	 */
	static async getVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		numero?: number;
		anio?: number;
		cuij?: string;
		caratula?: string;
		objeto?: string;
		juzgado?: string;
		isPrivate?: boolean | "todos";
		update?: boolean | "todos";
		source?: "app" | "import" | "scraping" | "todos";
		detailsLoaded?: boolean | "todos";
		sortBy?: "numero" | "anio" | "caratula" | "juzgado" | "movimientosCount" | "ultimoMovimiento" | "createdAt" | "lastUpdate";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasEjeResponse> {
		try {
			// Build params - filter out 'todos' values
			const queryParams: Record<string, any> = {};

			if (params?.page) queryParams.page = params.page;
			if (params?.limit) queryParams.limit = params.limit;
			if (params?.numero) queryParams.numero = params.numero;
			if (params?.anio) queryParams.anio = params.anio;
			if (params?.cuij) queryParams.cuij = params.cuij;
			if (params?.caratula) queryParams.caratula = params.caratula;
			if (params?.objeto) queryParams.objeto = params.objeto;
			if (params?.juzgado) queryParams.juzgado = params.juzgado;
			if (params?.sortBy) queryParams.sortBy = params.sortBy;
			if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

			// Boolean filters - only add if not 'todos'
			if (params?.isPrivate !== undefined && params?.isPrivate !== "todos") {
				queryParams.isPrivate = params.isPrivate;
			}
			if (params?.update !== undefined && params?.update !== "todos") {
				queryParams.update = params.update;
			}
			if (params?.source !== undefined && params?.source !== "todos") {
				queryParams.source = params.source;
			}
			if (params?.detailsLoaded !== undefined && params?.detailsLoaded !== "todos") {
				queryParams.detailsLoaded = params.detailsLoaded;
			}

			// Add verified and isValid filters
			queryParams.verified = true;
			queryParams.isValid = true;

			const response = await ejeAxios.get("/causas-eje/search", { params: queryParams });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causas no verificadas (verified: false o isValid: false)
	 */
	static async getNonVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		numero?: number;
		anio?: number;
		cuij?: string;
		caratula?: string;
		source?: "app" | "import" | "scraping" | "todos";
		sortBy?: "numero" | "anio" | "caratula" | "createdAt";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasEjeResponse> {
		try {
			const queryParams: Record<string, any> = {
				verified: false,
			};

			if (params?.page) queryParams.page = params.page;
			if (params?.limit) queryParams.limit = params.limit;
			if (params?.numero) queryParams.numero = params.numero;
			if (params?.anio) queryParams.anio = params.anio;
			if (params?.cuij) queryParams.cuij = params.cuij;
			if (params?.caratula) queryParams.caratula = params.caratula;
			if (params?.sortBy) queryParams.sortBy = params.sortBy;
			if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

			if (params?.source !== undefined && params?.source !== "todos") {
				queryParams.source = params.source;
			}

			const response = await ejeAxios.get("/causas-eje/search", { params: queryParams });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causa por ID
	 */
	static async getCausaById(id: string): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get(`/causas-eje/id/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causa por CUIJ
	 */
	static async getCausaByCuij(cuij: string): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get(`/causas-eje/cuij/${encodeURIComponent(cuij)}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causa por número y año
	 */
	static async getCausaByNumeroAnio(numero: number, anio: number): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get(`/causas-eje/${numero}/${anio}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener movimientos de una causa
	 */
	static async getMovimientos(id: string): Promise<{ success: boolean; data: MovimientoEje[]; count: number }> {
		try {
			const response = await ejeAxios.get(`/causas-eje/${id}/movimientos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener intervinientes de una causa
	 */
	static async getIntervinientes(id: string): Promise<{ success: boolean; data: IntervinienteEje[]; count: number }> {
		try {
			const response = await ejeAxios.get(`/causas-eje/${id}/intervinientes`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causas relacionadas
	 */
	static async getCausasRelacionadas(id: string): Promise<{ success: boolean; data: CausaRelacionada[]; count: number }> {
		try {
			const response = await ejeAxios.get(`/causas-eje/${id}/relacionadas`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas generales
	 */
	static async getStats(): Promise<{ success: boolean; data: any }> {
		try {
			const response = await ejeAxios.get("/causas-eje/stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualizar campos de una causa
	 */
	static async updateCausa(id: string, updateData: Partial<CausaEje>): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.put(`/causas-eje/${id}`, updateData);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar una causa
	 */
	static async deleteCausa(id: string): Promise<{ success: boolean; message: string }> {
		try {
			const response = await ejeAxios.delete(`/causas-eje/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// ========== WORKER STATS ==========

	/**
	 * Obtener estadísticas de workers
	 */
	static async getWorkerStats(): Promise<WorkerStatsResponse> {
		try {
			const response = await ejeAxios.get("/worker-stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas de elegibilidad para actualización
	 */
	static async getEligibilityStats(): Promise<EligibilityStatsResponse> {
		try {
			const response = await ejeAxios.get("/worker-stats/eligibility");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener documentos con errores
	 */
	static async getErrorDocuments(params?: { limit?: number }): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get("/worker-stats/errors", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener documentos stuck
	 */
	static async getStuckDocuments(params?: { thresholdMinutes?: number }): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get("/worker-stats/stuck", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Limpiar locks de documentos stuck
	 */
	static async clearStuckLocks(params?: { thresholdMinutes?: number }): Promise<{ success: boolean; message: string; clearedCount: number }> {
		try {
			const response = await ejeAxios.post("/worker-stats/clear-stuck", params);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Resetear contador de errores de un documento
	 */
	static async resetErrorCount(id: string): Promise<{ success: boolean; message: string }> {
		try {
			const response = await ejeAxios.post(`/worker-stats/reset-error/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener actividad reciente
	 */
	static async getRecentActivity(params?: { hours?: number; limit?: number }): Promise<CausasEjeResponse> {
		try {
			const response = await ejeAxios.get("/worker-stats/recent-activity", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Manejo de errores
	static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default CausasEjeService;
