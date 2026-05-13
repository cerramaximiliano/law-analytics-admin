import workersAxios from "utils/workersAxios";

export interface CaptchaDatasetEntry {
	ts: string;
	file: string; // "verified/abc.png" o "unverified/abc.png"
	label: string;
	verified: boolean;
	worker_id?: string;
	fuero?: string;
	expediente?: string | null;
	attempt?: number;
}

export interface CaptchaDatasetListResponse {
	success: boolean;
	count: number;
	total: number;
	skip: number;
	limit: number;
	data: CaptchaDatasetEntry[];
}

export interface CaptchaDatasetStats {
	total: number;
	verified: number;
	unverified: number;
	byWorker: Record<string, number>;
	byFuero: Record<string, number>;
	diskBytes: number;
	diskMB: number;
	datasetRoot: string;
}

export interface CaptchaDatasetStatsResponse {
	success: boolean;
	data: CaptchaDatasetStats;
}

export interface CaptchaDatasetListParams {
	skip?: number;
	limit?: number;
	verified?: boolean;
	worker_id?: string;
	fuero?: string;
	search?: string;
}

export const CaptchaDatasetService = {
	async list(params: CaptchaDatasetListParams = {}): Promise<CaptchaDatasetListResponse> {
		const response = await workersAxios.get<CaptchaDatasetListResponse>("/api/captcha-dataset", { params });
		return response.data;
	},

	async stats(): Promise<CaptchaDatasetStatsResponse> {
		const response = await workersAxios.get<CaptchaDatasetStatsResponse>("/api/captcha-dataset/stats");
		return response.data;
	},

	// URL que el browser usa para cargar el PNG (incluye baseURL).
	// El token de auth viaja por el interceptor de workersAxios... pero <img src> no
	// pasa por el interceptor de axios. Resolvemos eso usando un fetch con auth
	// y un blob URL desde el componente.
	imageURL(file: string): string {
		// file viene como "verified/abc.png" o "unverified/abc.png"
		const base = (workersAxios.defaults.baseURL || "").replace(/\/$/, "");
		return `${base}/api/captcha-dataset/image/${file}`;
	},
};

export default CaptchaDatasetService;
