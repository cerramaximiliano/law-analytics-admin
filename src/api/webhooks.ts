import authAxios from "utils/authAxios";

export interface WebhookEndpoint {
	id: string;
	url: string;
	status: "enabled" | "disabled";
	enabled_events: string[];
	livemode: boolean;
}

export interface PendingWebhook {
	id: string;
	type: string;
	created: string;
	pending_webhooks: number;
	data: {
		subscription_id?: string;
		customer_id?: string;
		[key: string]: any;
	};
}

export interface WebhooksStatus {
	mode: string;
	timestamp: string;
	endpoints: {
		total: number;
		list: WebhookEndpoint[];
	};
	webhooks: {
		pending_total: number;
		pending_last_24h: number;
		total_events_week: number;
		total_events_24h: number;
	};
	pending_details: PendingWebhook[];
	subscriptions: {
		total: number;
		active_paid: number;
	};
	event_types: {
		[key: string]: number;
	};
}

export interface WebhooksStatusResponse {
	success: boolean;
	data: WebhooksStatus;
}

class WebhooksService {
	async getWebhooksStatus(): Promise<WebhooksStatusResponse> {
		try {
			console.log("🔍 Requesting webhooks status from:", import.meta.env.VITE_AUTH_URL + "/api/admin/webhooks/status");
			const response = await authAxios.get("/api/admin/webhooks/status");
			console.log("✅ Webhooks status response:", response.data);
			return response.data;
		} catch (error: any) {
			console.error("❌ Error fetching webhooks status:", error);
			console.error("❌ Error response:", error.response);
			console.error("❌ Error status:", error.response?.status);
			console.error("❌ Error data:", error.response?.data);

			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/admin/webhooks/status no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			throw new Error(error.response?.data?.message || "Error al obtener el estado de webhooks");
		}
	}
}

export default new WebhooksService();
