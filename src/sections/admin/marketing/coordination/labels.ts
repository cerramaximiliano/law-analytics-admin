import { CampaignStatus, CampaignType, EnrollmentPausedReason, OrdenVencidos, QuotaMode, RampaAccion } from "types/campaign";

// Cupos y pasos (plan de cupos 28/10/2026)
export const QUOTA_MODE_LABEL: Record<QuotaMode, string> = {
	secuencia_primero: "Secuencia primero",
	reserva: "Reserva para nuevos",
	proporcional: "Proporcional",
};

export const QUOTA_MODE_HELP: Record<QuotaMode, string> = {
	secuencia_primero: "Primero los que ya están en la secuencia, del más atrasado al más nuevo; lo que sobra va a nuevos.",
	reserva: "Igual, pero guarda un porcentaje del cupo para nuevos.",
	proporcional: "Reparte el cupo por tamaño de cada paso (comportamiento anterior).",
};

export const ORDEN_VENCIDOS_LABEL: Record<OrdenVencidos, string> = {
	mas_atrasado_primero: "Más atrasado primero",
	paso_mas_alto_primero: "Paso más alto primero",
};

export const RAMPA_MODO_LABEL: Record<"sugerir" | "automatico", string> = {
	automatico: "Automática",
	sugerir: "Solo sugiere",
};

export const RAMPA_ACCION_LABEL: Record<RampaAccion, string> = {
	sube: "Subió",
	baja: "Bajó",
};

export const ENROLLMENT_PAUSED_REASON_LABEL: Record<EnrollmentPausedReason, string> = {
	atraso: "atraso en la secuencia",
	tope_diario_nuevos: "tope diario de nuevos",
};

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
	onetime: "Única",
	automated: "Automática",
	sequence: "Secuencia",
	recurring: "Recurrente",
};

export const CAMPAIGN_STATUS_CHIP: Record<
	CampaignStatus,
	{ label: string; color: "default" | "success" | "warning" | "info" | "secondary" }
> = {
	draft: { label: "Borrador", color: "default" },
	active: { label: "Activa", color: "success" },
	paused: { label: "Pausada", color: "warning" },
	completed: { label: "Completada", color: "info" },
	archived: { label: "Archivada", color: "secondary" },
};

// Regla de la casa: chips ocre/amarillo siempre con letra oscura.
export const WARNING_CHIP_SX = { color: "#1D2630", "& .MuiChip-icon": { color: "#1D2630" } } as const;

export const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const formatAllowedDays = (days?: number[]): string => {
	if (!days || days.length === 0 || days.length === 7) return "todos los días";
	const sorted = [...days].sort((a, b) => a - b);
	if (sorted.join(",") === "1,2,3,4,5") return "lun a vie";
	return sorted.map((d) => DAY_NAMES_SHORT[d] ?? d).join(", ");
};
