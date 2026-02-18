/**
 * API Service para Causas Update Worker
 * Config y Runs del worker de actualización de causas (pjn-mis-causas)
 */
import adminAxios from "utils/adminAxios";

// ====== Interfaces ======

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
	count?: number;
	page?: number;
	limit?: number;
	totalPages?: number;
}

export interface CausasUpdateConfig {
	worker: {
		enabled: boolean;
		maxCredentialsPerRun: number;
		maxCausasPerCredential: number;
		delayBetweenCausas: number;
		delayBetweenCredentials: number;
		paginationDelay: number;
	};
	thresholds: {
		updateThresholdHours: number;
		minTimeBetweenRunsMinutes: number;
		maxRunsPerDay: number;
	};
	concurrency: {
		waitForCausaCreation: boolean;
		checkIntervalMs: number;
		maxWaitMinutes: number;
	};
	resume: {
		enabled: boolean;
		maxResumeAttempts: number;
		resumeDelayMinutes: number;
	};
	updatedAt?: string;
	updatedBy?: string;
}

export interface CausaDetail {
	causaId: string;
	fuero: string;
	number: number;
	year: number;
	status: "success" | "error" | "skipped" | "not_found";
	movimientosAdded: number;
	movimientosTotal: number;
	error?: string;
	processedAt: string;
}

export interface CausasUpdateRun {
	_id: string;
	credentialsId: string;
	userId: string;
	status: "in_progress" | "completed" | "partial" | "error" | "interrupted";
	startedAt: string;
	completedAt?: string;
	durationSeconds?: number;
	results: {
		totalCausas: number;
		causasProcessed: number;
		causasUpdated: number;
		causasSkipped: number;
		causasError: number;
		newMovimientos: number;
		isComplete: boolean;
	};
	causasDetail?: CausaDetail[];
	resumePoint?: {
		lastProcessedIndex: number;
		lastCausaId: string;
		lastFuero: string;
	};
	error?: {
		message: string;
		code: string;
		phase: string;
	};
	metadata: {
		triggeredBy: "manager" | "manual" | "resume";
		workerPid: number;
		configSnapshot: {
			updateThresholdHours: number;
			maxCausasPerCredential: number;
			delayBetweenCausas: number;
		};
		isFirstRun: boolean;
		isResumedRun: boolean;
		previousRunId?: string;
		resumeAttempts: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface RunsStats {
	today: {
		totalRuns: number;
		causasProcessed: number;
		causasUpdated: number;
		newMovimientos: number;
		totalErrors: number;
		avgDuration?: number;
		completed?: number;
		partial?: number;
		errors?: number;
	};
	weekByDay: Array<{
		_id: string;
		runs: number;
		causasUpdated: number;
		newMovimientos: number;
	}>;
	incompleteRuns: number;
	byCredential: Array<{
		_id: string;
		userId: string;
		totalRuns: number;
		causasUpdated: number;
		newMovimientos: number;
		errors: number;
		lastRun: string;
	}>;
	recentRuns: CausasUpdateRun[];
}

export interface RunsQueryParams {
	page?: number;
	limit?: number;
	status?: string;
	credentialsId?: string;
	startDate?: string;
	endDate?: string;
}

// ====== Service ======

export class CausasUpdateService {
	// Config
	static async getConfig(): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.get("/api/causas-update/config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateConfig(data: Partial<CausasUpdateConfig>): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.patch("/api/causas-update/config", data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async resetConfig(): Promise<ApiResponse<CausasUpdateConfig>> {
		try {
			const response = await adminAxios.post("/api/causas-update/config/reset");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	// Runs
	static async getRuns(params?: RunsQueryParams): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs", { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getRunDetail(id: string): Promise<ApiResponse<CausasUpdateRun>> {
		try {
			const response = await adminAxios.get(`/api/causas-update/runs/${id}`);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getStats(): Promise<ApiResponse<RunsStats>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs/stats");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getIncompleteRuns(): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get("/api/causas-update/runs/incomplete");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async getCredentialRuns(credId: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<CausasUpdateRun[]>> {
		try {
			const response = await adminAxios.get(`/api/causas-update/runs/credential/${credId}`, { params });
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	private static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default CausasUpdateService;
