import workersAxios from "utils/workersAxios";

// Apunta a la pjn-api del worker_01 (DB local), expuesta vía VITE_WORKERS_URL.
// Las causas viven en el caché local del server donde corre update-movimientos-worker.

export type Fuero = "CIV" | "COM" | "CSS" | "CNT";

export const FUERO_LABELS: Record<Fuero, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

export interface CausaElegible {
	_id: string;
	number: number;
	year: number;
	fuero: string;
	caratula: string | null;
	objeto: string | null;
	juzgado: string | null;
	verified: boolean;
	isValid: boolean | null;
	update: boolean;
	lastUpdate: string | null;
	movimientosCount: number;
	foldersLinked: number;
	usersLinked: number;
	usersWithUpdatesEnabled: number;
	isProcessing: boolean;
	processingLock: { workerId: string; lockedAt: string; expiresAt: string } | null;
	isInCooldown: boolean;
	cooldownUntil: string | null;
	source: string;
	createdAt: string;
	updatedAt: string;
}

export interface FueroStats {
	total: number;
	eligibles: number;
	processing: number;
	cooldown: number;
}

export interface CausasUpdateStatsResponse {
	success: boolean;
	data: Record<Fuero, FueroStats>;
}

export interface CausasUpdateListResponse {
	success: boolean;
	data: CausaElegible[];
	pagination: { page: number; limit: number; total: number; pages: number };
}

const BASE = "/api/causas-elegibles-update";

const CausasElegiblesUpdateService = {
	async getStats(): Promise<CausasUpdateStatsResponse> {
		const res = await workersAxios.get<CausasUpdateStatsResponse>(`${BASE}/stats`);
		return res.data;
	},

	async getList(params: {
		fuero: Fuero;
		page?: number;
		limit?: number;
		search?: string;
		onlyAvailable?: boolean;
	}): Promise<CausasUpdateListResponse> {
		const qs = new URLSearchParams();
		qs.append("fuero", params.fuero);
		if (params.page) qs.append("page", String(params.page));
		if (params.limit) qs.append("limit", String(params.limit));
		if (params.search) qs.append("search", params.search);
		if (params.onlyAvailable) qs.append("onlyAvailable", "true");
		const res = await workersAxios.get<CausasUpdateListResponse>(`${BASE}?${qs.toString()}`);
		return res.data;
	},
};

export default CausasElegiblesUpdateService;
