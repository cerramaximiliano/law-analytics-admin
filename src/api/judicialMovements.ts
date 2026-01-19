import pjnAxios from "utils/pjnAxios";

// Interface para Movimiento Judicial
export interface JudicialMovement {
	_id: string | { $oid: string };
	userId: string | { $oid: string };
	expediente: {
		id: string;
		number: number;
		year: number;
		fuero: string;
		caratula: string;
		objeto: string;
	};
	movimiento: {
		fecha: { $date: string } | string;
		tipo: string;
		detalle: string;
		url?: string;
	};
	notificationStatus: string;
	notificationSettings?: {
		notifyAt: { $date: string } | string;
		channels: string[];
	};
	uniqueKey: string;
	notifications?: Array<{
		date: { $date: string } | string;
		type: string;
		success: boolean;
		details: string;
		_id: string | { $oid: string };
	}>;
	createdAt: { $date: string } | string;
	updatedAt: { $date: string } | string;
	__v?: number;
}

export interface JudicialMovementsResponse {
	success: boolean;
	message: string;
	count: number;
	data: JudicialMovement[];
	error?: string;
}

// Servicio de movimientos judiciales
export class JudicialMovementsService {
	/**
	 * Obtener movimientos judiciales por expediente.id
	 */
	static async getMovementsByExpedienteId(expedienteId: string): Promise<JudicialMovementsResponse> {
		try {
			const response = await pjnAxios.get(`/api/judicial-movements/by-expediente/${expedienteId}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Eliminar un movimiento judicial por ID
	 */
	static async deleteMovement(movementId: string): Promise<{ success: boolean; message: string }> {
		try {
			const response = await pjnAxios.delete(`/api/judicial-movements/${movementId}`);
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

export default JudicialMovementsService;
