// Motivos de salida/cierre de contactos en una campaña, con nombres legibles.
export const REASON_LABELS: Record<string, string> = {
	// removalReason
	segment_sync: "Dejó el segmento o se hizo usuario",
	movido_a_reenganche: "Movido a una campaña de reenganche",
	excluido_captacion_vieja_sin_apertura: "Excluido: no abrió la campaña anterior",
	manual: "Removido a mano",
	bounce: "Rebote",
	complaint: "Queja",
	unsubscribe: "Baja",
	// completionReason
	finished: "Completó la secuencia",
	bounced: "Rebote",
	complained: "Queja",
	unsubscribed: "Baja",
	// skippedReason
	campaign_endDate_reached: "La campaña terminó antes del envío",
	campaign_closed_manually: "Cierre manual de la campaña",
	frequency_perishable: "Coordinador: no entró por el tope",
	frequency_max_deferral: "Coordinador: demasiado tiempo diferido",
	otro: "Otro motivo",
};

export const reasonLabel = (key: string): string => REASON_LABELS[key] || key;
