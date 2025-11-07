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
			const response = await authAxios.get("/api/admin/webhooks/status");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener el estado de webhooks");
		}
	}
}

export default new WebhooksService();
