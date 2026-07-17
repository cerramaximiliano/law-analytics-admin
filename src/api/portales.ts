import adminAxios from "utils/adminAxios";

// ==================== Tipos ====================

export type PortalKey = "pjn" | "scba" | "mev";
export type PortalStatusValue = "healthy" | "down" | "unknown";

export interface NormalizedIncident {
	id: string;
	portal: PortalKey;
	startedAt: string | null;
	endedAt: string | null;
	durationMs: number | null;
	active: boolean;
	detectedBy: string | null;
	resolvedBy: string | null;
	message: string | null;
	extra: {
		consecutiveDetections?: number | null;
		type?: string | null;
		totalErrors?: number | null;
		affectedCredentialsCount?: number | null;
		affectedWorkers?: string[];
	};
}

export interface PortalState {
	portal: PortalKey;
	status: PortalStatusValue;
	message: string | null;
	lastTransitionAt: string | null;
	lastSuccessAt: string | null;
	lastFailureAt: string | null;
	consecutiveFailures: number;
	firstFailureAt: string | null;
	activeIncident: NormalizedIncident | null;
	lastResolvedIncident: NormalizedIncident | null;
}

export interface PortalesStatusResponse {
	success: boolean;
	data: Record<PortalKey, PortalState>;
}

export interface PortalIncidentsResponse {
	success: boolean;
	data: {
		items: NormalizedIncident[];
		pagination: { page: number; limit: number; total: number; pages: number };
	};
}

// ==================== Fetchers ====================

export async function getPortalesStatus(): Promise<PortalesStatusResponse["data"]> {
	const res = await adminAxios.get<PortalesStatusResponse>("/api/portales/status");
	return res.data.data;
}

export async function getPortalIncidents(
	portal: PortalKey,
	opts: { page?: number; limit?: number; resolved?: boolean } = {},
): Promise<PortalIncidentsResponse["data"]> {
	const params: Record<string, string | number> = {
		page: opts.page ?? 1,
		limit: opts.limit ?? 20,
	};
	if (opts.resolved !== undefined) params.resolved = String(opts.resolved);
	const res = await adminAxios.get<PortalIncidentsResponse>(`/api/portales/${portal}/incidents`, { params });
	return res.data.data;
}
