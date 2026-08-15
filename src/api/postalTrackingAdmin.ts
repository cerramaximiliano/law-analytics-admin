import adminAxios from "utils/adminAxios";

// ----------------------------------------------------------------------
// Estadísticas del seguimiento postal (Correo Argentino).
// admin-api: GET /api/postal-tracking/stats
// ----------------------------------------------------------------------

export interface PostalTrackingStats {
	/** Conteo por processingStatus: active | pending | completed | error | not_found */
	byProcessingStatus: Record<string, number>;
	byTrackingStatus: { _id: string; count: number }[];
	byCode: { _id: string; count: number }[];
	metrics: {
		total: number;
		withErrors: number;
		finalStatuses: number;
		avgConsecutiveErrors: number;
	};
	/** Seguimientos con cambio de estado registrado hoy */
	recentlyUpdatedToday: number;
}

const PostalTrackingAdminService = {
	async getStats(): Promise<PostalTrackingStats> {
		const response = await adminAxios.get("/api/postal-tracking/stats");
		return response.data.data;
	},
};

export default PostalTrackingAdminService;
