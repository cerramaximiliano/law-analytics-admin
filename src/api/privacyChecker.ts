/**
 * API Service para el worker pjn-privacy-checker.
 */
import adminAxios from "utils/adminAxios";

export interface PrivacyCheckerConfig {
	_id?: string;
	name: string;
	enabled: boolean;
	cron_expression: string;
	consecutive_strikes_threshold: number;
	per_fuero: {
		CIV: { enabled: boolean };
		CSS: { enabled: boolean };
		CNT: { enabled: boolean };
		COM: { enabled: boolean };
	};
	last_run?: string;
	stats: {
		causas_marked_private: number;
		causas_reset_public: number;
		folders_synced: number;
		total_runs: number;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface PrivacyCheckerLive {
	pendingPromotion: number;
	currentlyPrivate: number;
	currentlyTracked: number;
}

export interface PrivacyCheckerResponse {
	config: PrivacyCheckerConfig;
	live: PrivacyCheckerLive;
}

export interface PrivacyCheckerFolder {
	_id: string;
	folderName: string;
	userId: string;
	source: string;
	pjn: boolean;
	causaId: string;
	causaType: string;
	accessFailureCount: number;
	causaIsPrivate: boolean;
	causaPrivateDetectedAt: string | null;
	judFolder?: { numberJudFolder?: string };
	createdAt: string;
	updatedAt: string;
}

export interface ApiResponse<T> {
	success: boolean;
	message?: string;
	data: T;
	count?: number;
	status?: string;
	error?: string;
}

export class PrivacyCheckerService {
	static async getConfig(): Promise<ApiResponse<PrivacyCheckerResponse>> {
		const res = await adminAxios.get("/api/privacy-checker");
		return res.data;
	}

	static async updateConfig(updates: Partial<PrivacyCheckerConfig>): Promise<ApiResponse<PrivacyCheckerConfig>> {
		const res = await adminAxios.put("/api/privacy-checker", updates);
		return res.data;
	}

	static async resetConfig(): Promise<ApiResponse<PrivacyCheckerConfig>> {
		const res = await adminAxios.post("/api/privacy-checker/reset");
		return res.data;
	}

	static async listFolders(
		status: "tracked" | "private" | "pending" = "tracked",
		limit = 50,
	): Promise<ApiResponse<PrivacyCheckerFolder[]>> {
		const res = await adminAxios.get("/api/privacy-checker/folders", { params: { status, limit } });
		return res.data;
	}
}
