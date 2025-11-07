import mevAxios from "utils/mevAxios";

// Interface para Causa MEV (hereda de Causa pero puede tener campos adicionales si es necesario)
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
	update?: boolean;
	folderIds?: string[];
	userCausaIds?: string[];
	movimientosCount?: number;
	lastUpdate?: { $date: string } | string;
	fechaUltimoMovimiento?: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

export interface CausasMEVResponse {
	success: boolean;
	message: string;
	count: number;
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
