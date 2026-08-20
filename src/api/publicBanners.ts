import adminAxios from "utils/adminAxios";

// ==================== Tipos ====================

/** Slot fijo de un banner en las páginas públicas (los define el front). */
export type BannerKey = "jurisprudencia-index" | "jurisprudencia-detail" | "educativo-index" | "educativo-detail";

export const BANNER_KEYS: BannerKey[] = ["jurisprudencia-index", "jurisprudencia-detail", "educativo-index", "educativo-detail"];

export interface PublicBanner {
	_id: string;
	key: BannerKey;
	nombre: string;
	/** Admite tokens: {fallos} → cifra dinámica del corpus; ==texto== → resaltado. */
	titulo: string;
	cuerpo: string;
	ctaLabel: string;
	ctaHref: string;
	/** Deshabilitado → el sitio muestra su copy de respaldo hardcodeado. */
	habilitado: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PublicBannerPayload {
	nombre?: string;
	titulo?: string;
	cuerpo?: string;
	ctaLabel?: string;
	ctaHref?: string;
	habilitado?: boolean;
}

export interface BannerStatsEntry {
	views: number;
	clicks: number;
	/** Porcentaje con un decimal (clicks/views). */
	ctr: number;
	/** Clicks por origen de la sesión ("directo" = sin UTM ni referer). */
	origenes: Record<string, number>;
}

export interface BannerStats {
	days: number;
	banners: Record<BannerKey, BannerStatsEntry>;
	serie: Array<{ dia: string; key: BannerKey; clicks: number }>;
}

// ==================== Endpoints ====================

export const listPublicBanners = async (): Promise<PublicBanner[]> => {
	const res = await adminAxios.get("/api/public-banners");
	return res.data.data;
};

export const updatePublicBanner = async (key: BannerKey, payload: PublicBannerPayload): Promise<PublicBanner> => {
	const res = await adminAxios.put(`/api/public-banners/${key}`, payload);
	return res.data.data;
};

export const getBannerStats = async (days = 30): Promise<BannerStats> => {
	const res = await adminAxios.get("/api/public-banners/stats", { params: { days } });
	return res.data.data;
};
