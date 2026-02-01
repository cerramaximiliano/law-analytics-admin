import pjnAxios from "utils/pjnAxios";

// Interface para ScrapingProgress
export interface ScrapingProgress {
	status?: string;
	isComplete?: boolean;
	lastProcessedAt?: { $date: string } | string;
	consecutiveErrors?: number;
	lastErrorType?: string;
	lastErrorAt?: { $date: string } | string;
	skipUntil?: { $date: string } | string;
}

// Interface para estadísticas de actualización (updateStats en el modelo)
export interface UpdateStats {
	count?: number;        // Total actualizaciones (all time)
	errors?: number;       // Total errores
	newMovs?: number;      // Total movimientos encontrados
	avgMs?: number;        // Duración promedio en ms
	last?: { $date: string } | string;  // Última actualización
	today?: {
		date?: string;       // "2026-02-01"
		count?: number;      // Veces actualizado hoy
		hours?: number[];    // Horas de cada actualización [8, 11, 14]
	};
}

// Interface para Causa
export interface Causa {
	_id: string | { $oid: string };
	number: number;
	year: number;
	caratula?: string;
	juzgado?: string;
	objeto?: string;
	fuero?: "CIV" | "COM" | "CSS" | "CNT";
	source?: "app" | "pjn-login" | "cache" | string;
	verified?: boolean;
	isValid?: boolean;
	isPrivate?: boolean | null;
	isArchived?: boolean;
	archivedDetectedAt?: { $date: string } | string;
	update?: boolean;
	folderIds?: string[];
	userCausaIds?: string[];
	movimientosCount?: number;
	lastUpdate?: { $date: string } | string;
	fechaUltimoMovimiento?: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
	scrapingProgress?: ScrapingProgress;
	updateStats?: UpdateStats;
}

// Interface para estadísticas de elegibilidad
export interface EligibilityStats {
	total: number;
	eligible: number;
	eligibleUpdated: number;
	eligiblePending: number;
	eligibleWithErrors: number;
	notEligible: number;
	updatedToday: number;
	pendingToday?: number;
	coveragePercent?: number;
}

export interface EligibilityStatsResponse {
	success: boolean;
	message: string;
	data: {
		thresholdHours: number;
		timestamp: string;
		totals: EligibilityStats;
		byFuero: Record<string, EligibilityStats>;
	};
}

// Interface para estadísticas de capacidad de procesamiento
export interface CapacityStatsFuero {
	fuero: string;
	fueroKey: string;
	eligible: number;
	updatedToday: number;
	processing: {
		avgSeconds: number;
		avgMs: number;
		totalUpdates: number;
		totalErrors: number;
		successRate: number;
	};
	capacity: {
		docsPerHourPerWorker: number;
		docsPerHourTotal: number;
		docsPerDayTotal: number;
		workers: number;
	};
	projections: {
		maxUpdatesPerDocPerDay: number;
		actualUpdatesPerDocPerDay: number;
		timeToProcessAllOnce: number; // minutos
		dailyCoveragePercent: number;
	};
}

export interface CapacityStatsTotals {
	eligible: number;
	updatedToday: number;
	avgSeconds: number;
	avgMs: number;
	successRate: number;
	docsPerHourPerWorker: number;
	docsPerDayAllFueros: number;
	maxUpdatesPerDocPerDay: number;
	timeToProcessAllOnce: number;
	dailyCoveragePercent: number;
}

export interface CapacityStatsResponse {
	success: boolean;
	message: string;
	data: {
		config: {
			thresholdHours: number;
			workersPerFuero: number;
			workHoursPerDay: number;
		};
		totals: CapacityStatsTotals;
		byFuero: Record<string, CapacityStatsFuero>;
		simulation: {
			description: string;
			parameters: Record<string, string>;
			example: string;
		};
	};
}

export interface CausasResponse {
	success: boolean;
	message: string;
	count: number;
	totalInDatabase?: number;
	pagination?: {
		currentPage: number;
		totalPages: number;
		limit: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
	breakdown?: {
		civil: number;
		seguridad_social: number;
		trabajo: number;
	};
	filters?: {
		fuero: string;
	};
	fuero?: string;
	data: Causa[];
}

// Servicio de causas
export class CausasPjnService {
	/**
	 * Obtener todas las causas verificadas con búsqueda avanzada y ordenamiento
	 */
	static async getVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		fuero?: "CIV" | "COM" | "CSS" | "CNT" | "todos";
		number?: number;
		year?: number;
		objeto?: string;
		caratula?: string;
		fechaUltimoMovimiento?: string;
		lastUpdate?: string;
		update?: boolean;
		isPrivate?: boolean | "null";
		source?: "app" | "pjn-login" | "cache" | string;
		soloElegibles?: boolean;
		estadoActualizacion?: "todos" | "actualizados" | "pendientes" | "errores";
		sortBy?: "number" | "year" | "caratula" | "juzgado" | "objeto" | "movimientosCount" | "lastUpdate" | "fechaUltimoMovimiento";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.get("/api/causas/verified", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener todas las causas no verificadas (verified: true, isValid: false)
	 */
	static async getNonVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		fuero?: "CIV" | "COM" | "CSS" | "CNT" | "todos";
		number?: number;
		year?: number;
		objeto?: string;
		caratula?: string;
		sortBy?: "number" | "year" | "caratula" | "juzgado" | "objeto" | "movimientosCount" | "lastUpdate" | "fechaUltimoMovimiento";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.get("/api/causas/non-verified", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener una causa por ID
	 */
	static async getCausaById(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/id/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causas con carpetas vinculadas
	 */
	static async getCausasWithFolders(
		fuero: "CIV" | "COM" | "CSS" | "CNT",
		params?: {
			page?: number;
			limit?: number;
			light?: boolean;
		},
	): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/folders`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Buscar causa por número y año
	 */
	static async findByNumberAndYear(fuero: "CIV" | "COM" | "CSS" | "CNT", number: number, year: number): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/${number}/${year}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener movimientos de una causa
	 */
	static async getMovimientosByDocumentId(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<any> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/${id}/movimientos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Listar objetos únicos
	 */
	static async listObjetos(fuero: "CIV" | "COM" | "CSS" | "CNT"): Promise<any> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/objetos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualizar campos de una causa
	 */
	static async updateCausa(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string, updateData: Partial<Causa>): Promise<CausasResponse> {
		try {
			const response = await pjnAxios.patch(`/api/causas/${fuero}/${id}`, updateData);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar un movimiento específico de una causa
	 */
	static async deleteMovimiento(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await pjnAxios.delete(`/api/causas/${fuero}/${id}/movimientos/${movimientoIndex}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Agregar un movimiento a una causa
	 */
	static async addMovimiento(
		fuero: "CIV" | "COM" | "CSS" | "CNT",
		id: string,
		movimiento: {
			fecha: string;
			tipo: string;
			detalle: string;
			url?: string | null;
			sendNotification?: boolean;
		},
	): Promise<any> {
		try {
			const response = await pjnAxios.post(`/api/causas/${fuero}/${id}/movimientos`, movimiento);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Enviar notificación de un movimiento específico
	 */
	static async notifyMovimiento(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await pjnAxios.post(`/api/causas/${fuero}/${id}/movimientos/${movimientoIndex}/notify`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener usuarios con notificaciones habilitadas para una causa
	 */
	static async getNotificationUsers(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<any> {
		try {
			const response = await pjnAxios.get(`/api/causas/${fuero}/${id}/notification-users`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Limpiar todo el historial de actualizaciones de una causa
	 */
	static async clearUpdateHistory(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<any> {
		try {
			const response = await pjnAxios.delete(`/api/causas/${fuero}/${id}/update-history`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar una entrada específica del historial de actualizaciones
	 */
	static async deleteUpdateHistoryEntry(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string, entryIndex: number): Promise<any> {
		try {
			const response = await pjnAxios.delete(`/api/causas/${fuero}/${id}/update-history/${entryIndex}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas de elegibilidad para actualización
	 * @param fuero - Fuero específico o 'todos'
	 * @param thresholdHours - Umbral en horas para considerar actualizado (default: 2)
	 */
	static async getEligibilityStats(params?: {
		fuero?: "CIV" | "COM" | "CSS" | "CNT" | "todos";
		thresholdHours?: number;
	}): Promise<EligibilityStatsResponse> {
		try {
			const response = await pjnAxios.get("/api/causas/stats/eligibility", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas de capacidad de procesamiento
	 * @param thresholdHours - Tiempo mínimo entre actualizaciones (default: 2)
	 * @param workersPerFuero - Cantidad de workers por fuero (default: 3)
	 * @param workHoursPerDay - Horas de trabajo por día (default: 14)
	 */
	static async getCapacityStats(params?: {
		thresholdHours?: number;
		workersPerFuero?: number;
		workHoursPerDay?: number;
	}): Promise<CapacityStatsResponse> {
		try {
			const response = await pjnAxios.get("/api/causas/stats/capacity", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Marcar causa como archivada (excluir del procesamiento de stuck documents)
	 */
	static async archiveCausa(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string, reason?: string): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post(`/api/workers/stuck-documents/archive/${fuero}/${id}`, { reason });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Desarchivar causa (volver a incluir en procesamiento)
	 */
	static async unarchiveCausa(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.post(`/api/workers/stuck-documents/unarchive/${fuero}/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Manejo de errores
	static handleError(error: any): Error {
		// Re-throw axios errors for interceptor handling
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default CausasPjnService;
