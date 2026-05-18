import adminAxios from "utils/adminAxios";

// ==============================|| TYPES ||============================== //

export interface FunnelStep {
	name: string;
	users: number;
	completionRate: number | null;
	abandonments: number | null;
	abandonmentRate: number | null;
}

export interface FunnelBreakdownRow {
	name: string;
	[stepName: string]: number | string;
}

export interface FunnelSnapshot {
	_id: string;
	funnel: "macro" | "micro";
	date: string;
	range: { start: string; end: string };
	schemaVersion: number;
	title: string;
	totals: Record<string, FunnelStep>;
	breakdowns: Record<string, FunnelBreakdownRow[]>;
	meta: {
		propertyId: string;
		fetchedBy: string;
		durationMs: number;
	};
	capturedAt: string;
}

export interface FunnelTrendPoint {
	date: string;
	rangeStart: string;
	rangeEnd: string;
	totals: Record<string, { name: string; users: number; completionRate: number | null }>;
}

interface ApiResponse<T> {
	success: boolean;
	count?: number;
	snapshots?: T;
	snapshot?: T;
	funnel?: string;
	days?: number;
	points?: FunnelTrendPoint[];
	message?: string;
}

// ==============================|| SERVICE ||============================== //

class FunnelSnapshotsService {
	/**
	 * Listado de snapshots con filtros.
	 */
	static async list(params?: {
		funnel?: "macro" | "micro";
		from?: string;
		to?: string;
		limit?: number;
	}): Promise<ApiResponse<FunnelSnapshot[]>> {
		const response = await adminAxios.get("/api/funnel-snapshots", { params });
		return response.data;
	}

	/**
	 * Último snapshot de cada funnel (uno macro, uno micro).
	 */
	static async getLatest(): Promise<ApiResponse<FunnelSnapshot[]>> {
		const response = await adminAxios.get("/api/funnel-snapshots/latest");
		return response.data;
	}

	/**
	 * Serie temporal compacta para graficar evolución.
	 */
	static async getTrend(funnel: "macro" | "micro", days = 30): Promise<ApiResponse<never>> {
		const response = await adminAxios.get("/api/funnel-snapshots/trend", {
			params: { funnel, days },
		});
		return response.data;
	}

	/**
	 * Detalle por _id.
	 */
	static async getById(id: string): Promise<ApiResponse<FunnelSnapshot>> {
		const response = await adminAxios.get(`/api/funnel-snapshots/${id}`);
		return response.data;
	}
}

export default FunnelSnapshotsService;
