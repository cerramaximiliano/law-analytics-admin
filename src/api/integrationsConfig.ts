import adminAxios from "utils/adminAxios";

// ====================================
// TYPES
// ====================================

export type ReleaseStage = "beta" | "stable";

export interface ServiceFlag {
	enabled: boolean;
	maintenanceMessage: string | null;
	/** Solo aplica a integraciones AI (claudeAi, chatGpt). El frontend público
	 *  renderiza distinto chip/CTA según este valor. */
	releaseStage?: ReleaseStage;
	updatedAt?: string;
	updatedBy?: string | null;
}

export interface IntegrationsConfigDoc {
	_id?: string;
	key: string;
	services: {
		groups: ServiceFlag;
		/** Integraciones AI — opcionales en docs viejos (default fail-closed en el
		 *  endpoint público si faltan). El backend persiste con default
		 *  `enabled: false, releaseStage: 'beta'` cuando se crea el singleton. */
		claudeAi?: ServiceFlag;
		chatGpt?: ServiceFlag;
	};
	updatedAt?: string;
	updatedBy?: string | null;
}

export type ServiceKey = "groups" | "claudeAi" | "chatGpt";

export interface UpdateServicePayload {
	enabled?: boolean;
	maintenanceMessage?: string | null;
	/** Solo válido para claudeAi/chatGpt — el backend rechaza si se manda en groups. */
	releaseStage?: ReleaseStage;
}

// ====================================
// SERVICE
// ====================================

class IntegrationsConfigService {
	async getConfig(): Promise<{ success: boolean; data: IntegrationsConfigDoc }> {
		const res = await adminAxios.get("/api/integrations-config");
		return res.data;
	}

	async updateService(
		serviceKey: ServiceKey,
		payload: UpdateServicePayload,
	): Promise<{ success: boolean; message: string; data: IntegrationsConfigDoc }> {
		const res = await adminAxios.patch(`/api/integrations-config/services/${serviceKey}`, payload);
		return res.data;
	}
}

const integrationsConfigService = new IntegrationsConfigService();
export default integrationsConfigService;
