/**
 * Servicio API para Intervinientes
 * Maneja las llamadas a la API de intervinientes del PJN
 */
import pjnAxios from "../utils/pjnAxios";

// Interfaces
export interface Parte {
    tipo: string;
    nombre: string;
    tomoFolio?: string;
    iej?: string;
}

export interface Letrado {
    tipo: string;
    nombre: string;
    matricula?: string;
    estadoIej?: string;
    parteRepresentada?: {
        tipo: string;
        nombre: string;
    };
}

export interface Interviniente {
    _id: string;
    causaId: string;
    expediente: {
        number: number;
        year: number;
        fuero: string;
        caratula?: string;
    };
    tipoInterviniente: "PARTE" | "LETRADO";
    parte?: Parte;
    letrado?: Letrado;
    nombreNormalizado?: string;
    fechaExtraccion?: string;
    source?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface IntervinientesResponse {
    success: boolean;
    message: string;
    count: number;
    data: {
        causaId: string;
        partes: Interviniente[];
        letrados: Interviniente[];
        all: Interviniente[];
    };
}

export interface IntervinientesListResponse {
    success: boolean;
    message: string;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: Interviniente[];
}

export interface IntervinientesStatsResponse {
    success: boolean;
    message: string;
    data: {
        total: number;
        causasConIntervinientes: number;
        byTipo: Array<{ _id: string; count: number }>;
        byFuero: Array<{ _id: string; count: number }>;
        byTipoParte: Array<{ _id: string; count: number }>;
        byTipoLetrado: Array<{ _id: string; count: number }>;
    };
}

export class IntervinientesService {
    /**
     * Maneja errores de API de forma consistente
     */
    private static handleError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error("Error desconocido en la API de intervinientes");
    }

    /**
     * Obtiene los intervinientes de una causa por su ID
     */
    static async getByCausaId(causaId: string): Promise<IntervinientesResponse> {
        try {
            const response = await pjnAxios.get(`/api/intervinientes/causa/${causaId}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Obtiene los intervinientes por expediente (fuero, número, año)
     */
    static async getByExpediente(
        fuero: string,
        number: number,
        year: number
    ): Promise<IntervinientesResponse> {
        try {
            const response = await pjnAxios.get(
                `/api/intervinientes/expediente/${fuero}/${number}/${year}`
            );
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Busca intervinientes por nombre
     */
    static async searchByNombre(
        nombre: string,
        page: number = 1,
        limit: number = 20
    ): Promise<IntervinientesListResponse> {
        try {
            const response = await pjnAxios.get("/api/intervinientes/buscar/nombre", {
                params: { nombre, page, limit },
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Obtiene estadísticas de intervinientes
     */
    static async getStats(): Promise<IntervinientesStatsResponse> {
        try {
            const response = await pjnAxios.get("/api/intervinientes/stats");
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Obtiene todos los intervinientes con paginación
     */
    static async getAll(params?: {
        page?: number;
        limit?: number;
        tipoInterviniente?: "PARTE" | "LETRADO";
        fuero?: string;
        nombre?: string;
    }): Promise<IntervinientesListResponse> {
        try {
            const response = await pjnAxios.get("/api/intervinientes", { params });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Obtiene un interviniente por su ID
     */
    static async getById(id: string): Promise<{ success: boolean; message: string; data: Interviniente }> {
        try {
            const response = await pjnAxios.get(`/api/intervinientes/${id}`);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }
}

export default IntervinientesService;
