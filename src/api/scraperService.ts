import adminAxios from "utils/adminAxios";

// ─── Scraper Config ───────────────────────────────────────────────────────────

export interface ScraperConfigSchedule {
	workingHoursStart: number;
	workingHoursEnd: number;
	workingDays: number[];
	timezone: string;
}

export interface ScraperConfigWorkers {
	scraper: {
		scaling: {
			minWorkers: number;
			maxWorkers: number;
			scaleUpThreshold: number;
			scaleDownThreshold: number;
		};
		schedule: ScraperConfigSchedule;
		cron: {
			batchSize: number;
			pollIntervalMs: number;
			configPollIntervalMs: number;
		};
		health: {
			healthCheckIntervalMs: number;
			stuckJobThresholdMs: number;
		};
	};
}

export interface ScraperConfigScraping {
	targetUrl: string;
	headless: {
		development: boolean;
		production: boolean;
	};
	schedule: ScraperConfigSchedule;
	checkIntervalHours: number;
	finalStatuses: string[];
	finalDeliveryStatuses: string[];
	notificationPatterns: {
		statusMatches: string[];
		descriptionMatches: string[];
	};
}

export interface ScraperConfig {
	_id: string;
	global: {
		enabled: boolean;
		logLevel: string;
	};
	manager: {
		pollIntervalMs: number;
		configPollIntervalMs: number;
		healthCheckIntervalMs: number;
	};
	workers: ScraperConfigWorkers;
	scraping: ScraperConfigScraping;
	updatedAt?: string;
}

// ─── Scraper Jobs ─────────────────────────────────────────────────────────────

export interface ScraperJob {
	_id: string;
	jobType: string;
	entityId?: string;
	entityType?: string;
	status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
	priority: number;
	payload?: Record<string, any>;
	result?: Record<string, any>;
	errorMessage?: string;
	errorCode?: string;
	attempts: number;
	maxAttempts: number;
	claimedBy?: string;
	claimedAt?: string;
	scheduledAt: string;
	nextRetryAt?: string;
	completedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ScraperJobStats {
	byStatus: Record<string, number>;
	total: number;
	byType: Array<{ _id: string; count: number; pending: number }>;
	today: Record<string, number>;
	oldestPendingJob?: { scheduledAt: string; jobType: string };
}

// ─── Scraper Runs ─────────────────────────────────────────────────────────────

export interface ScraperRun {
	_id: string;
	workerId: string;
	workerPid?: number;
	startedAt: string;
	finishedAt?: string;
	durationMs?: number;
	status: "running" | "completed" | "failed" | "stopped";
	jobsProcessed: number;
	jobsSucceeded: number;
	jobsFailed: number;
	errorMessage?: string;
}

export interface ScraperRunStats {
	today: { total: number; completed: number; failed: number; jobsProcessed: number };
	weekByDay: Array<{ date: string; total: number; completed: number; jobsProcessed: number }>;
	byStatus: Array<{ _id: string; count: number }>;
	recent: ScraperRun[];
}

// ─── Postal Tracking ─────────────────────────────────────────────────────────

export interface PostalTrackingEvent {
	status: string;
	description?: string;
	location?: string;
	eventDate?: string;
	scrapedAt: string;
	rawData?: string;
}

export interface PostalTracking {
	_id: string;
	codeId: string;
	numberId: string;
	processingStatus: "pending" | "active" | "paused" | "completed" | "error" | "not_found";
	trackingStatus?: string;
	isFinalStatus: boolean;
	consecutiveErrors: number;
	lastError?: string;
	lastCheckedAt?: string;
	nextCheckAt?: string;
	history: PostalTrackingEvent[];
	userId?: string;
	folderId?: string;
	movementId?: string;
	notificationId?: string;
	documentId?: string;
	attachment?: string;
	startDate?: string;
	notificationDate?: string;
	deadlineDays?: number;
	notFoundAt?: string;
	label?: string;
	tags?: string[];
	screenshotEnabled?: boolean;
	screenshotKey?: string;
	screenshotUrl?: string;
	screenshotUpdatedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PostalTrackingStats {
	byProcessingStatus: Array<{ _id: string; count: number }>;
	byTrackingStatus: Array<{ _id: string; count: number }>;
	byCode: Array<{ _id: string; count: number }>;
	metrics: {
		total: number;
		withErrors: number;
		finalStatuses: number;
		avgConsecutiveErrors: number;
	};
	recentlyUpdatedToday: number;
}

export interface PostalTrackingFilters {
	page?: number;
	limit?: number;
	processingStatus?: string;
	trackingStatus?: string;
	codeId?: string;
	isFinalStatus?: boolean;
	search?: string;
	startDate?: string;
	endDate?: string;
}

// ─── Service class ────────────────────────────────────────────────────────────

class ScraperService {
	// Config
	async getConfig(): Promise<{ success: boolean; data: ScraperConfig }> {
		try {
			const response = await adminAxios.get("/api/scraper/config");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener configuracion del scraper");
		}
	}

	async updateConfig(data: Record<string, any>): Promise<{ success: boolean; data: ScraperConfig }> {
		try {
			const response = await adminAxios.patch("/api/scraper/config", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuracion del scraper");
		}
	}

	async resetConfig(): Promise<{ success: boolean; data: ScraperConfig }> {
		try {
			const response = await adminAxios.post("/api/scraper/config/reset");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear configuracion del scraper");
		}
	}

	// Jobs
	async getJobs(params?: {
		page?: number;
		limit?: number;
		status?: string;
		jobType?: string;
	}): Promise<{ success: boolean; data: ScraperJob[]; pagination: any }> {
		try {
			const response = await adminAxios.get("/api/scraper/jobs", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener jobs del scraper");
		}
	}

	async getJobStats(): Promise<{ success: boolean; data: ScraperJobStats }> {
		try {
			const response = await adminAxios.get("/api/scraper/jobs/stats");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadisticas de jobs");
		}
	}

	async clearJobs(params?: { status?: string; olderThanHours?: number }): Promise<{ success: boolean; data: { deleted: number } }> {
		try {
			const response = await adminAxios.post("/api/scraper/jobs/clear", params);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al limpiar jobs del scraper");
		}
	}

	async deleteJob(jobId: string): Promise<{ success: boolean }> {
		try {
			const response = await adminAxios.delete(`/api/scraper/jobs/${jobId}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar job del scraper");
		}
	}

	// Runs
	async getRuns(params?: {
		page?: number;
		limit?: number;
		status?: string;
	}): Promise<{ success: boolean; data: ScraperRun[]; pagination: any }> {
		try {
			const response = await adminAxios.get("/api/scraper/runs", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener runs del scraper");
		}
	}

	async getRunStats(): Promise<{ success: boolean; data: ScraperRunStats }> {
		try {
			const response = await adminAxios.get("/api/scraper/runs/stats");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadisticas de runs");
		}
	}

	async clearRuns(olderThanDays = 7): Promise<{ success: boolean; data: { deleted: number } }> {
		try {
			const response = await adminAxios.post("/api/scraper/runs/clear", { olderThanDays });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al limpiar runs");
		}
	}

	async getRunDetail(runId: string): Promise<{ success: boolean; data: ScraperRun }> {
		try {
			const response = await adminAxios.get(`/api/scraper/runs/${runId}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener detalle del run");
		}
	}

	// Postal Tracking
	async getPostalTrackings(filters?: PostalTrackingFilters): Promise<{ success: boolean; data: PostalTracking[]; pagination: any }> {
		try {
			const response = await adminAxios.get("/api/postal-tracking", { params: filters });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener seguimientos postales");
		}
	}

	async getPostalTrackingStats(): Promise<{ success: boolean; data: PostalTrackingStats }> {
		try {
			const response = await adminAxios.get("/api/postal-tracking/stats");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadisticas de seguimientos");
		}
	}

	async getPostalTrackingById(id: string): Promise<{ success: boolean; data: PostalTracking }> {
		try {
			const response = await adminAxios.get(`/api/postal-tracking/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener seguimiento postal");
		}
	}

	async createPostalTracking(data: {
		codeId: string;
		numberId: string;
		label?: string;
		tags?: string[];
		userId?: string;
		folderId?: string;
		documentId?: string;
		attachment?: string;
		notificationDate?: string;
		deadlineDays?: number;
	}): Promise<{ success: boolean; data: PostalTracking }> {
		try {
			const response = await adminAxios.post("/api/postal-tracking", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al crear seguimiento postal");
		}
	}

	async updatePostalTracking(id: string, data: { label?: string; tags?: string[] }): Promise<{ success: boolean; data: PostalTracking }> {
		try {
			const response = await adminAxios.patch(`/api/postal-tracking/${id}`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar seguimiento postal");
		}
	}

	async deletePostalTracking(id: string): Promise<{ success: boolean }> {
		try {
			const response = await adminAxios.delete(`/api/postal-tracking/${id}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al eliminar seguimiento postal");
		}
	}

	async enqueuePostalTracking(id: string): Promise<{ success: boolean }> {
		try {
			const response = await adminAxios.post(`/api/postal-tracking/${id}/enqueue`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al encolar seguimiento postal");
		}
	}

	async pausePostalTracking(id: string): Promise<{ success: boolean; data: PostalTracking }> {
		try {
			const response = await adminAxios.patch(`/api/postal-tracking/${id}/pause`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al pausar seguimiento postal");
		}
	}

	async resumePostalTracking(id: string): Promise<{ success: boolean; data: PostalTracking }> {
		try {
			const response = await adminAxios.patch(`/api/postal-tracking/${id}/resume`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al reanudar seguimiento postal");
		}
	}
}

export default new ScraperService();
