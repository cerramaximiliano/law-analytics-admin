import adminAxios from "utils/adminAxios";

/**
 * Campañas de novedades jurisprudenciales (SAIJ).
 *
 * Las crea saij-workers vía la API de la-marketing-service; acá solo se leen
 * para el historial de la UI admin y para el seguimiento por usuario.
 */

export interface SaijCampaignFallo {
	_id: string;
	titulo?: string;
	tribunal?: string;
	fecha?: string;
	fechaUmod?: string;
}

export interface SaijCampaign {
	_id: string;
	name: string;
	status: string;
	createdAt: string;
	startDate?: string;
	endDate?: string;
	/** Conteo por estado de envío (delivered, sent, bounced, …) */
	envios: Record<string, number>;
	totalEnviados: number;
	opens: number;
	/** Clicks a la vista de jurisprudencia, ya descontados los escáneres de correo */
	clicksJurisprudencia: number;
	clicksBot: number;
	lectores: string[];
	fallos: SaijCampaignFallo[];
}

export interface SaijCampaignListResponse {
	success: boolean;
	data: SaijCampaign[];
	pagination: { total: number; page: number; limit: number; pages: number };
}

export interface SaijEngagement {
	recibidas: number;
	abiertas: number;
	/** Clicks reales a jurisprudencia (excluye escáneres) */
	clicks: number;
	clicksBot: number;
	ultimoClickAt: string | null;
	ultimaCampania: string | null;
	/** Ids de sentencias-capturadas abiertas desde el correo */
	fallosVistos: string[];
}

export const getSaijCampaigns = async (page = 1, limit = 20): Promise<SaijCampaignListResponse> => {
	const response = await adminAxios.get("/api/saij-campaigns", { params: { page, limit } });
	return response.data;
};

/** Resumen de interacción con las campañas de jurisprudencia, por email (lote). */
export const getSaijEngagementBatch = async (emails: string[]): Promise<{ success: boolean; data: Record<string, SaijEngagement> }> => {
	if (!emails.length) return { success: true, data: {} };
	const response = await adminAxios.post("/api/saij-campaigns/engagement", { emails });
	return response.data;
};
