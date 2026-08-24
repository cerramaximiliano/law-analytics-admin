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

/** Estado de un ícono del strip "Integrado con" de la landing pública. */
export type LandingIntegrationStatus = "available" | "comingSoon" | "hidden";

export interface LandingIntegrationFlag {
	status: LandingIntegrationStatus;
	/** Posición del ícono en el strip (menor = más a la izquierda). */
	order?: number;
	updatedAt?: string;
	updatedBy?: string | null;
}

/** Keys del catálogo — desde 2026-08 es abierto (se pueden agregar
 *  jurisdicciones desde el admin), por eso string y no un union fijo. */
export type LandingIntegrationKey = string;

/** Las 6 jurisdicciones históricas — no se pueden eliminar del catálogo
 *  (el front tiene assets/flujos asociados); para sacarlas de la landing se
 *  usa el estado "Oculto". */
export const CORE_LANDING_KEYS = ["pjn", "mev", "eje", "seclo", "pjsalta", "pjcatamarca"] as const;

/** Entry del catálogo dinámico de jurisdicciones de la landing. */
export interface LandingCatalogEntry {
	key: string;
	shortName?: string;
	name?: string;
	/** Nombre corto para listas de texto de marketing ("PJN, MEV, EJE y Salta"). */
	listLabel?: string;
	/** Logo remoto (https). Las core usan el asset local del front si viene null. */
	logoUrl?: string | null;
	bgColor?: string;
	hasBorder?: boolean;
	status: LandingIntegrationStatus;
	order: number;
	capabilities?: {
		/** Permite vincular credenciales y sincronizar automáticamente. */
		credentialSync?: boolean;
		/** Permite agregar causas individualmente por N° de expediente. */
		individualCauses?: boolean;
	};
	updatedAt?: string;
	updatedBy?: string | null;
}

export interface UpsertLandingCatalogPayload {
	shortName?: string;
	name?: string;
	listLabel?: string;
	logoUrl?: string | null;
	bgColor?: string;
	hasBorder?: boolean;
	status?: LandingIntegrationStatus;
	order?: number;
	capabilities?: { credentialSync?: boolean; individualCauses?: boolean };
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
	/** Strip "Integrado con" de la landing — mapa legacy (solo 6 core), espejado
	 *  por compat. Opcional en docs previos al feature. */
	landingIntegrations?: Partial<Record<string, LandingIntegrationFlag>>;
	/** Catálogo dinámico de jurisdicciones — fuente de verdad desde 2026-08.
	 *  El backend lo seedea en getSingleton la primera vez. */
	landingCatalog?: LandingCatalogEntry[];
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

	/** Cambia el estado y/u orden de un ícono del strip "Integrado con" de la landing. */
	async updateLandingIntegration(
		integrationKey: LandingIntegrationKey,
		payload: { status?: LandingIntegrationStatus; order?: number },
	): Promise<{ success: boolean; message: string; data: IntegrationsConfigDoc }> {
		const res = await adminAxios.patch(`/api/integrations-config/landing/${integrationKey}`, payload);
		return res.data;
	}

	/** Crea o actualiza una jurisdicción completa del catálogo (metadata + capacidades). */
	async upsertLandingCatalogEntry(
		integrationKey: string,
		payload: UpsertLandingCatalogPayload,
	): Promise<{ success: boolean; message: string; data: IntegrationsConfigDoc }> {
		const res = await adminAxios.put(`/api/integrations-config/landing-catalog/${integrationKey}`, payload);
		return res.data;
	}

	/** Elimina una jurisdicción agregada por admin (las 6 core no se borran). */
	async deleteLandingCatalogEntry(integrationKey: string): Promise<{ success: boolean; message: string; data: IntegrationsConfigDoc }> {
		const res = await adminAxios.delete(`/api/integrations-config/landing-catalog/${integrationKey}`);
		return res.data;
	}
}

const integrationsConfigService = new IntegrationsConfigService();
export default integrationsConfigService;
