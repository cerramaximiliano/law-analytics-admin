import mevAxios from "utils/mevAxios";

// Interface para movimientos MEV
export interface MovimientoMEV {
	_id?: { $oid: string };
	fecha: { $date: string } | string;
	detalle: string;
	texto?: string;
	tipo?: string;
	url?: string;
}

// Interface para estadísticas de actualización (patrón PJN)
export interface UpdateStatsMEV {
	count?: number;
	errors?: number;
	newMovs?: number;
	avgMs?: number;
	last?: { $date: string } | string;
	today?: {
		date?: string;
		count?: number;
		hours?: number[];
	};
}

// Interface para estadísticas de elegibilidad MEV
export interface EligibilityStatsMEV {
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

export interface EligibilityStatsMEVResponse {
	success: boolean;
	message?: string;
	data: {
		thresholdHours: number;
		timestamp: string;
		totals: EligibilityStatsMEV;
	};
}

// Interface para Causa MEV
export interface CausaMEV {
	_id: string | { $oid: string };
	number: number;
	year: number;
	caratula?: string;
	juzgado?: string;
	objeto?: string;
	fuero?: "MEV";
	verified?: boolean;
	isValid?: boolean;
	isPrivate?: boolean | null;
	update?: boolean;
	source?: string;
	folderIds?: string[];
	userCausaIds?: string[];
	movimiento?: MovimientoMEV[];
	movimientosCount?: number;
	lastUpdate?: { $date: string } | string;
	fechaUltimoMovimiento?: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
	updateHistory?: any[];
	updateStats?: UpdateStatsMEV;
	navigationCode?: string;
	jurisdiccion?: string;
	jurisdiccionNombre?: string;
	organismo?: string;
	organismoNombre?: string;
	tipoOrganismo?: string;
	verificacion?: {
		verificado?: boolean;
		estadoVerificacion?: 'pendiente' | 'en_proceso' | 'verificado' | 'error' | 'no_encontrado';
		error?: { tipo?: string; mensaje?: string; fecha?: string };
		intentosVerificacion?: number;
		ultimoIntento?: string;
	};
	jurisdictionCooldown?: {
		skipUntil?: { $date: string } | string;
	};
}

export interface CausasMEVResponse {
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
	data: CausaMEV[];
}

// Servicio de causas MEV
export class CausasMEVService {
	/**
	 * Obtener todas las causas MEV verificadas (verified: true, isValid: true)
	 */
	static async getVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		number?: number;
		year?: number;
		objeto?: string;
		caratula?: string;
		fechaUltimoMovimiento?: string;
		lastUpdate?: string;
		update?: boolean;
		soloElegibles?: boolean;
		estadoActualizacion?: "todos" | "actualizados" | "pendientes" | "errores";
		sortBy?: "number" | "year" | "caratula" | "juzgado" | "objeto" | "movimientosCount" | "lastUpdate" | "fechaUltimoMovimiento";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasMEVResponse> {
		try {
			const response = await mevAxios.get("/api/causas/verified", {
				params,
			});
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener todas las causas MEV no verificadas (verified: true, isValid: false)
	 */
	static async getNonVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		number?: number;
		year?: number;
		objeto?: string;
		caratula?: string;
		sortBy?: "number" | "year" | "caratula" | "juzgado" | "objeto" | "movimientosCount" | "lastUpdate" | "fechaUltimoMovimiento";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasMEVResponse> {
		try {
			const response = await mevAxios.get("/api/causas/non-verified", {
				params,
			});
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener una causa MEV por ID
	 */
	static async getCausaById(id: string): Promise<CausasMEVResponse> {
		try {
			const response = await mevAxios.get(`/api/causas/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener movimientos de una causa MEV
	 */
	static async getMovimientosByDocumentId(id: string): Promise<any> {
		try {
			const response = await mevAxios.get(`/api/causas/${id}/movimientos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualizar campos de una causa MEV
	 */
	static async updateCausa(id: string, updateData: Partial<CausaMEV>): Promise<CausasMEVResponse> {
		try {
			const response = await mevAxios.put(`/api/causas/${id}`, updateData);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar un movimiento específico de una causa MEV
	 */
	static async deleteMovimiento(id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await mevAxios.delete(`/api/causas/${id}/movimientos/${movimientoIndex}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Agregar un movimiento a una causa MEV
	 */
	static async addMovimiento(
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
			const response = await mevAxios.post(`/api/causas/${id}/movimientos`, movimiento);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Enviar notificación de un movimiento específico
	 */
	static async notifyMovimiento(id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await mevAxios.post(`/api/causas/${id}/movimientos/${movimientoIndex}/notify`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener usuarios con notificaciones habilitadas para una causa MEV
	 */
	static async getNotificationUsers(id: string): Promise<any> {
		try {
			const response = await mevAxios.get(`/api/causas/${id}/notification-users`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Limpiar todo el historial de actualizaciones de una causa MEV
	 */
	static async clearUpdateHistory(id: string): Promise<any> {
		try {
			const response = await mevAxios.delete(`/api/causas/${id}/update-history`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar una entrada específica del historial de actualizaciones
	 */
	static async deleteUpdateHistoryEntry(id: string, entryIndex: number): Promise<any> {
		try {
			const response = await mevAxios.delete(`/api/causas/${id}/update-history/${entryIndex}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Re-encolar causa para verificación por el worker
	 */
	static async reVerifyCausa(id: string): Promise<CausasMEVResponse> {
		try {
			const response = await mevAxios.patch(`/api/causas/${id}/re-verify`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener estadísticas de elegibilidad para actualización MEV
	 */
	static async getEligibilityStats(params?: {
		thresholdHours?: number;
	}): Promise<EligibilityStatsMEVResponse> {
		try {
			const response = await mevAxios.get("/api/causas/stats/eligibility", { params });
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

export default CausasMEVService;
