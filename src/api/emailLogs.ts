import adminAxios from "utils/adminAxios";
import {
	EmailLogsResponse,
	EmailLogResponse,
	EmailLogStatsResponse,
	EmailLogTemplatesResponse,
	EmailLogsQueryParams,
	UpdateEmailStatusParams,
	DeleteEmailLogResponse,
	DeleteMultipleEmailLogsResponse,
	DeleteAllEmailLogsResponse,
} from "types/email-log";

/**
 * Servicio para gestionar los logs de correos electrónicos
 */
class EmailLogsService {
	/**
	 * Obtener logs de correos con paginación y filtros
	 */
	static async getEmailLogs(params: EmailLogsQueryParams = {}): Promise<EmailLogsResponse> {
		try {
			const response = await adminAxios.get<EmailLogsResponse>("/api/email-logs", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener logs de correos");
		}
	}

	/**
	 * Obtener un log específico por ID
	 */
	static async getEmailLogById(id: string): Promise<EmailLogResponse> {
		try {
			const response = await adminAxios.get<EmailLogResponse>(`/api/email-logs/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener log de correo");
		}
	}

	/**
	 * Obtener estadísticas de correos
	 */
	static async getEmailStats(params: {
		startDate?: string;
		endDate?: string;
		groupBy?: "status" | "templateCategory" | "templateName" | "day";
	} = {}): Promise<EmailLogStatsResponse> {
		try {
			const response = await adminAxios.get<EmailLogStatsResponse>("/api/email-logs/stats", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadísticas de correos");
		}
	}

	/**
	 * Obtener opciones de plantillas disponibles
	 */
	static async getTemplateOptions(): Promise<EmailLogTemplatesResponse> {
		try {
			const response = await adminAxios.get<EmailLogTemplatesResponse>("/api/email-logs/templates");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener opciones de plantillas");
		}
	}

	/**
	 * Buscar log por SES Message ID
	 */
	static async getEmailLogBySesId(sesMessageId: string): Promise<EmailLogResponse> {
		try {
			const response = await adminAxios.get<EmailLogResponse>(`/api/email-logs/ses/${encodeURIComponent(sesMessageId)}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener log por SES ID");
		}
	}

	/**
	 * Actualizar estado de un correo por SES Message ID
	 */
	static async updateEmailStatus(sesMessageId: string, params: UpdateEmailStatusParams): Promise<EmailLogResponse> {
		try {
			const response = await adminAxios.patch<EmailLogResponse>(
				`/api/email-logs/ses/${encodeURIComponent(sesMessageId)}/status`,
				params
			);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar estado del correo");
		}
	}

	/**
	 * Eliminar un log de correo por ID
	 */
	static async deleteEmailLog(id: string): Promise<DeleteEmailLogResponse> {
		try {
			const response = await adminAxios.delete<DeleteEmailLogResponse>(`/api/email-logs/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar log de correo");
		}
	}

	/**
	 * Eliminar múltiples logs de correo por IDs
	 */
	static async deleteMultipleEmailLogs(ids: string[]): Promise<DeleteMultipleEmailLogsResponse> {
		try {
			const response = await adminAxios.post<DeleteMultipleEmailLogsResponse>("/api/email-logs/delete-multiple", { ids });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar logs de correo");
		}
	}

	/**
	 * Eliminar todos los logs de correo
	 */
	static async deleteAllEmailLogs(): Promise<DeleteAllEmailLogsResponse> {
		try {
			const response = await adminAxios.delete<DeleteAllEmailLogsResponse>("/api/email-logs/all");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar todos los logs de correo");
		}
	}
}

export default EmailLogsService;
