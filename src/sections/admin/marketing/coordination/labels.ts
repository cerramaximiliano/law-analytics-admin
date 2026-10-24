import { CampaignStatus, CampaignType } from "types/campaign";

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
