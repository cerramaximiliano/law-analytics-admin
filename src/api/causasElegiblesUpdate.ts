// Hay DOS circuitos de update:true y esta vista puede mostrar ambos:
//
//   - "cache" (rs0, vía cache-api): la cola real del update-movimientos-worker
//     que corre en worker_01 contra el Mongo local (= primary de rs0). Es el
//     worker de scraping — normalmente ~decenas de causas encendidas por el
//     pipeline de novelty.
//   - "atlas" (hub pjn/api): las causas update:true de la base del hub — el
//     subsistema de carpetas de usuarios (associateFolderToCausa las enciende
//     al vincular un folder). Población distinta, worker distinto.
//
// Historia: la vista nació documentando el worker del caché, a556ce8 la movió
// entera a Atlas, y desde 2026-09-01 el llamador elige la fuente.
import workersAxios, { pjnAtlasAxios } from "utils/workersAxios";

export type FuenteElegibles = "cache" | "atlas";

const clientePorFuente: Record<FuenteElegibles, typeof workersAxios> = {
	cache: workersAxios,     // cache-api → rs0 (worker_01)
	atlas: pjnAtlasAxios,    // pjn/api del hub → Atlas
};

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
	/** Presente sólo si la causa está vinculada a SAIJ. */
	saij: {
		isFromSaij: boolean;
		createdViaSaij: boolean;
		fallosVinculados: number;
		linkedAt: string | null;
	} | null;
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
	async getStats(fuente: FuenteElegibles = "cache"): Promise<CausasUpdateStatsResponse> {
		const res = await clientePorFuente[fuente].get<CausasUpdateStatsResponse>(`${BASE}/stats`);
		return res.data;
	},

	async getList(params: {
		fuero: Fuero;
		page?: number;
		limit?: number;
		search?: string;
		onlyAvailable?: boolean;
		fuente?: FuenteElegibles;
	}): Promise<CausasUpdateListResponse> {
		const qs = new URLSearchParams();
		qs.append("fuero", params.fuero);
		if (params.page) qs.append("page", String(params.page));
		if (params.limit) qs.append("limit", String(params.limit));
		if (params.search) qs.append("search", params.search);
		if (params.onlyAvailable) qs.append("onlyAvailable", "true");
		const res = await clientePorFuente[params.fuente ?? "cache"].get<CausasUpdateListResponse>(`${BASE}?${qs.toString()}`);
		return res.data;
	},
};

export default CausasElegiblesUpdateService;
