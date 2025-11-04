import workersAxios from "utils/workersAxios";

// Interface para Causa
export interface Causa {
	_id: string | { $oid: string };
	number: number;
	year: number;
	caratula?: string;
	juzgado?: string;
	objeto?: string;
	fuero?: "CIV" | "COM" | "CSS" | "CNT";
	verified?: boolean;
	isValid?: boolean;
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
export class CausasService {
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
	static async getCausaById(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<CausasResponse> {
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
		fuero: "CIV" | "COM" | "CSS" | "CNT",
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
	static async findByNumberAndYear(fuero: "CIV" | "COM" | "CSS" | "CNT", number: number, year: number): Promise<CausasResponse> {
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
	static async getMovimientosByDocumentId(fuero: "CIV" | "COM" | "CSS" | "CNT", id: string): Promise<any> {
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
	static async listObjetos(fuero: "CIV" | "COM" | "CSS" | "CNT"): Promise<any> {
		try {
			const response = await workersAxios.get(`/api/causas/${fuero}/objetos`);
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
