import adminAxios from "utils/adminAxios";

// ====================================
// TYPES
// ====================================

export type ReleaseStage = "beta" | "stable";

export type Environment = "development" | "production";

/** Flag de habilitación por entorno — usada solo por AI services. */
export interface EnabledByEnv {
	development: boolean;
	production: boolean;
}

/** Service simple (sin per-env) — ej. groups. */
export interface ServiceFlag {
	enabled: boolean;
	maintenanceMessage: string | null;
	updatedAt?: string;
	updatedBy?: string | null;
}

/** Service AI con habilitación independiente por entorno. */
export interface AiServiceFlag {
	enabled: EnabledByEnv;
	maintenanceMessage: string | null;
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
		 *  `enabled: { development: false, production: false }` cuando se crea
		 *  el singleton. */
		claudeAi?: AiServiceFlag;
		chatGpt?: AiServiceFlag;
	};
	updatedAt?: string;
	updatedBy?: string | null;
}

export type ServiceKey = "groups" | "claudeAi" | "chatGpt";

export interface UpdateServicePayload {
	/** Boolean para services simples. Para AI services se acepta también
	 *  Partial<EnabledByEnv> para actualizar un entorno sin tocar el otro. */
	enabled?: boolean | Partial<EnabledByEnv>;
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
