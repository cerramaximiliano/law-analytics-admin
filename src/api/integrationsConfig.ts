import adminAxios from "utils/adminAxios";

// ====================================
// TYPES
// ====================================

export interface ServiceFlag {
	enabled: boolean;
	maintenanceMessage: string | null;
	updatedAt?: string;
	updatedBy?: string | null;
}

export interface IntegrationsConfigDoc {
	_id?: string;
	key: string;
	services: {
		groups: ServiceFlag;
	};
	updatedAt?: string;
	updatedBy?: string | null;
}

export type ServiceKey = "groups";

export interface UpdateServicePayload {
	enabled?: boolean;
	maintenanceMessage?: string | null;
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
