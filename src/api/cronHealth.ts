import adminAxios from "utils/adminAxios";

export type CronHealthStatus = "ok" | "stale" | "error" | "pending";

export interface CronHealthItem {
	name: string;
	displayName: string;
	schedule: string | null;
	status: CronHealthStatus;
	lastRunAt: string | null;
	ageHours: number | null;
	maxAgeHours: number;
	lastStatus: "ok" | "error" | "pending";
	lastError: string | null;
	lastResult?: any;
	runCount: number;
	consecutiveErrors: number;
	updatedAt?: string;
}

export interface CronHealthSummary {
	total: number;
	ok: number;
	stale: number;
	error: number;
	pending: number;
}

export interface CronHealthResponse {
	success: boolean;
	summary: CronHealthSummary;
	data: CronHealthItem[];
}

// Servicio de salud (heartbeat) de los crons in-process del admin-api.
class CronHealthService {
	/**
	 * Obtener el estado de salud de todos los crons monitoreados.
	 */
	static async getCronHealth(): Promise<CronHealthResponse> {
		try {
			const response = await adminAxios.get("/api/cron-health");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener salud de crons");
		}
	}
}

export default CronHealthService;
