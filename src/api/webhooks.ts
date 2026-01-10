import adminAxios from "utils/adminAxios";

export interface ServiceInfo {
	id: string;
	name: string;
	description: string;
	handledEvents: string[];
}

export interface WebhookEndpoint {
	id: string;
	url: string;
	status: "enabled" | "disabled";
	enabled_events: string[];
	livemode: boolean;
	service?: ServiceInfo;
}

export interface FailedEndpoint {
	endpoint_id: string;
	endpoint_url: string;
	service_id: string;
	service_name: string;
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
	probable_failed_endpoints?: FailedEndpoint[];
}

export interface ServiceConfig {
	[key: string]: {
		displayName: string;
		description: string;
		events: string[];
		urlPatterns: string[];
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
		total_events_week?: number;
		total_events_30days?: number;
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
	service_config?: ServiceConfig;
}

export interface WebhooksStatusResponse {
	success: boolean;
	data: WebhooksStatus;
}

class WebhooksService {
	async getWebhooksStatus(): Promise<WebhooksStatusResponse> {
		try {
			const response = await adminAxios.get("/api/webhooks/status");
			return response.data;
		} catch (error: any) {
			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/webhooks/status no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			throw new Error(error.response?.data?.message || "Error al obtener el estado de webhooks");
		}
	}

	async runHealthCheck(): Promise<any> {
		try {
			const response = await adminAxios.post("/api/webhooks/health-check");
			return response.data;
		} catch (error: any) {
			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/webhooks/health-check no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			throw new Error(error.response?.data?.message || "Error al ejecutar health check");
		}
	}

	async updateGracePeriod(userId: string, expiresAt: string, adminEmail: string): Promise<any> {
		try {
			const response = await adminAxios.post("/api/webhooks/update-grace-period", {
				userId,
				expiresAt,
				adminEmail,
			});
			return response.data;
		} catch (error: any) {
			// Si es un error 404, el endpoint no existe
			if (error.response?.status === 404) {
				throw new Error("El endpoint /api/webhooks/update-grace-period no está disponible en el servidor");
			}

			// Si es un error 401, hay problema de autenticación
			if (error.response?.status === 401) {
				throw new Error("No autorizado. Por favor, inicie sesión nuevamente.");
			}

			throw new Error(error.response?.data?.message || "Error al actualizar el período de gracia");
		}
	}
}

export default new WebhooksService();
