import workersAxios from "utils/workersAxios";

// Fueros PJN con scraping activo
export type Fuero = "CIV" | "COM" | "CSS" | "CNT" | "CCF" | "CAF";

// Interface para Causa
export interface Causa {
	_id: string | { $oid: string };
	number: number;
	year: number;
	caratula?: string;
	juzgado?: string;
	objeto?: string;
	fuero?: Fuero;
	verified?: boolean;
	isValid?: boolean;
	update?: boolean;
	folderIds?: string[];
	userCausaIds?: string[];
	movimientosCount?: number;
	lastUpdate?: { $date: string } | string;
	createdAt?: { $date: string } | string;
	updatedAt?: { $date: string } | string;
}

export interface CausasResponse {
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
	// Conteo por código de fuero (CIV/COM/CSS/CNT/CCF/CAF)
	breakdown?: Record<string, number>;
	filters?: {
		fuero: string;
	};
	fuero?: string;
	data: Causa[];
}

// Servicio de causas
export class CausasService {
	/**
	 * Obtener todas las causas verificadas con búsqueda avanzada y ordenamiento
	 */
	static async getVerifiedCausas(params?: {
		page?: number;
		limit?: number;
		fuero?: Fuero | "todos";
		number?: number;
		year?: number;
		objeto?: string;
		caratula?: string;
		sortBy?: "number" | "year" | "caratula" | "juzgado" | "objeto" | "movimientosCount";
		sortOrder?: "asc" | "desc";
	}): Promise<CausasResponse> {
		try {
			const response = await workersAxios.get("/api/causas/verified", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener una causa por ID
	 */
	static async getCausaById(fuero: Fuero, id: string): Promise<CausasResponse> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/id/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener causas con carpetas vinculadas
	 */
	static async getCausasWithFolders(
		fuero: Fuero,
		params?: {
			page?: number;
			limit?: number;
			light?: boolean;
		},
	): Promise<CausasResponse> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/folders`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Buscar causa por número y año
	 */
	static async findByNumberAndYear(fuero: Fuero, number: number, year: number): Promise<CausasResponse> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/${number}/${year}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener movimientos de una causa
	 */
	static async getMovimientosByDocumentId(fuero: Fuero, id: string): Promise<any> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/${id}/movimientos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Listar objetos únicos
	 */
	static async listObjetos(fuero: Fuero): Promise<any> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/objetos`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Actualizar campos de una causa
	 */
	static async updateCausa(fuero: Fuero, id: string, updateData: Partial<Causa>): Promise<CausasResponse> {
		try {
			const response = await workersAxios.patch(`/api/causas/${fuero}/${id}`, updateData);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar un movimiento específico de una causa
	 */
	static async deleteMovimiento(fuero: Fuero, id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await workersAxios.delete(`/api/causas/${fuero}/${id}/movimientos/${movimientoIndex}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Agregar un movimiento a una causa
	 */
	static async addMovimiento(
		fuero: Fuero,
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
			const response = await workersAxios.post(`/api/causas/${fuero}/${id}/movimientos`, movimiento);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Enviar notificación de un movimiento específico
	 */
	static async notifyMovimiento(fuero: Fuero, id: string, movimientoIndex: number): Promise<any> {
		try {
			const response = await workersAxios.post(`/api/causas/${fuero}/${id}/movimientos/${movimientoIndex}/notify`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Obtener usuarios con notificaciones habilitadas para una causa
	 */
	static async getNotificationUsers(fuero: Fuero, id: string): Promise<any> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/${id}/notification-users`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Limpiar todo el historial de actualizaciones de una causa
	 */
	static async clearUpdateHistory(fuero: Fuero, id: string): Promise<any> {
		try {
			const response = await workersAxios.delete(`/api/causas/${fuero}/${id}/update-history`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar una entrada específica del historial de actualizaciones
	 */
	static async deleteUpdateHistoryEntry(fuero: Fuero, id: string, entryIndex: number): Promise<any> {
		try {
			const response = await workersAxios.delete(`/api/causas/${fuero}/${id}/update-history/${entryIndex}`);
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

export default CausasService;
