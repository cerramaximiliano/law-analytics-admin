import adminAxios from "utils/adminAxios";

export type IncidentSeverity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "open" | "acked" | "resolved";
export type IncidentSource = "log-coverage" | "health-report" | "worker-contract" | "manual";

export interface IncidentSummaryRow {
	_id: string;
	severity: IncidentSeverity;
	type: string;
	source: IncidentSource;
	title: string;
	service: string | null;
	host: string | null;
	ageDays: number;
}

export interface IncidentSummary {
	/** Abiertos + los silenciados cuyo silencio ya venció. */
	open: number;
	/** Silenciados con silencio vigente — existen, pero no reclaman atención hoy. */
	silenced: number;
	bySeverity: Record<IncidentSeverity, number>;
	oldestDays: number;
	oldest: { title: string; service: string | null; host: string | null; ageDays: number } | null;
	top: IncidentSummaryRow[];
}

export interface Incident extends IncidentSummaryRow {
	status: IncidentStatus;
	effectiveStatus: IncidentStatus;
	detail: string;
	runbook: string | null;
	firstSeenAt: string;
	lastSeenAt: string;
	occurrences: number;
	reopenCount: number;
	ackedUntil: string | null;
	ackReason: string | null;
	resolvedAt: string | null;
	resolvedBy: string | null;
	meta?: Record<string, any>;
}

// Registro central de incidentes del ecosistema. Lo pueblan la auditoría de
// cobertura de logs y los health reports IA; cada fuente reporta su estado
// completo y los incidentes que dejan de aparecer se cierran solos.
class IncidentsService {
	/** Resumen para el widget del dashboard: tres números y cinco filas. */
	static async getSummary(): Promise<{ success: boolean; data: IncidentSummary }> {
		const response = await adminAxios.get("/api/incidents/summary");
		return response.data;
	}

	static async list(params?: {
		status?: IncidentStatus;
		severity?: IncidentSeverity;
		source?: IncidentSource;
		limit?: number;
		includeResolved?: boolean;
	}): Promise<{ success: boolean; count: number; data: Incident[] }> {
		const response = await adminAxios.get("/api/incidents", { params });
		return response.data;
	}

	/** Silenciar N días. El motivo es obligatorio del lado del servidor. */
	static async ack(id: string, days: number, reason: string): Promise<{ success: boolean; data: Incident }> {
		const response = await adminAxios.post(`/api/incidents/${id}/ack`, { days, reason });
		return response.data;
	}

	static async resolve(id: string): Promise<{ success: boolean; data: Incident }> {
		const response = await adminAxios.post(`/api/incidents/${id}/resolve`, {});
		return response.data;
	}
}

export default IncidentsService;
