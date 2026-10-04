// Features de plan que se GESTIONAN desde /admin/integrations.
//
// En la vista de planes se muestran pero no se editan: su disponibilidad la
// decide el interruptor del servicio (por entorno donde aplica), y el backend
// ignora cualquier cambio que llegue por las rutas de planes
// (law-analytics-server/services/integrationLinkedFeatures.js — mantener las
// dos listas iguales).

export const MANAGED_PLAN_FEATURES: Record<string, { service: string; label: string }> = {
	teams: { service: "groups", label: "Equipos" },
	expediente_chat: { service: "expedienteChat", label: "Chat con IA sobre el expediente" },
};

export const INTEGRATIONS_PATH = "/admin/integrations";

export function isManagedPlanFeature(name?: string | null): boolean {
	return !!name && Object.prototype.hasOwnProperty.call(MANAGED_PLAN_FEATURES, name);
}
