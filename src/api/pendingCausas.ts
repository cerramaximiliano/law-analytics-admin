import adminAxios from "utils/adminAxios";

export type FuenteCausa = "pjn" | "mev" | "eje";
export type FueroPJN = "CIV" | "COM" | "CSS" | "CNT";

export interface PendingCausa {
	_id: string;
	fuente: FuenteCausa;
	fuero: string;
	cuij?: string; // EJE only
	numero?: number;
	anio?: number;
	caratula: string;
	juzgado?: string;
	objeto?: string;
	isPivot?: boolean; // EJE only
	verified: boolean;
	isValid: boolean | null;
	source?: string;
	lastUpdate?: string;
	createdAt?: string;
}

export interface PendingCausasPagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

export interface PendingCausasResponse {
	success: boolean;
	data: PendingCausa[];
	pagination: PendingCausasPagination;
}

export interface PendingCausasStats {
	total: number;
	pjn: {
		total: number;
		CIV: number;
		COM: number;
		CSS: number;
		CNT: number;
	};
	mev: number;
	eje: number;
}

export interface PendingCausasStatsResponse {
	success: boolean;
	data: PendingCausasStats;
}

export interface PendingCausasParams {
	fuente?: FuenteCausa;
	fuero?: FueroPJN;
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	caratula?: string;
	numero?: string;
	anio?: string;
}

export class PendingCausasService {
	static async getStats(): Promise<PendingCausasStatsResponse> {
		const response = await adminAxios.get<PendingCausasStatsResponse>("/api/pending-causas/stats");
		return response.data;
	}

	static async getPendingCausas(params: PendingCausasParams): Promise<PendingCausasResponse> {
		const response = await adminAxios.get<PendingCausasResponse>("/api/pending-causas", { params });
		return response.data;
	}
}
