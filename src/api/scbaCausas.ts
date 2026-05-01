/**
 * API service para la vista admin "Causas por Credencial" (SCBA).
 * Consume /api/scba-causas/* expuesto por el admin-api.
 */
import adminAxios from "utils/adminAxios";

export interface ScbaSyncedCausaFolder {
	folderId: string;
	listRemoved: boolean;
	listRemovedSource: "pjn" | "scba" | "mev" | "eje" | null;
	listRemovedAt: string | null;
}

export interface ScbaSyncedCausaCredential {
	credentialId: string | null;
	userId: string | null;
	userName: string;
	userEmail: string;
	syncStatus: "never_synced" | "pending" | "in_progress" | "completed" | "error" | null;
	lastSync: string | null;
	lastSyncAttempt: string | null;
	enabled: boolean;
	verified: boolean;
	removedFromSync: boolean;
	removedAt: string | null;
}

export interface ScbaSyncedCausa {
	_id: string;
	number?: number;
	year?: number;
	scbaNumber?: string;
	caratula?: string;
	scbaCaratula?: string;
	objeto?: string;
	jurisdiccion?: string;
	jurisdiccionNombre?: string;
	organismo?: string;
	organismoNombre?: string;
	scbaJuzgado?: string;
	scbaDepartamento?: string;
	source?: string;
	movimientosCount?: number;
	fechaUltimoMovimiento?: string | null;
	lastUpdate?: string | null;
	listStatus?: "active" | "removed";
	removedAt?: string | null;
	updateStats?: {
		count?: number;
		errors?: number;
		newMovs?: number;
		avgMs?: number;
		last?: string;
		today?: { date?: string; count?: number; hours?: number[] };
	};
	scrapingProgress?: { status?: string; isComplete?: boolean };
	verificacion?: { verificado?: boolean; estadoVerificacion?: string };
	createdAt?: string;
	folder: ScbaSyncedCausaFolder | null;
	credential: ScbaSyncedCausaCredential;
}

export interface ScbaSyncedCausasSummary {
	totalCausas: number;
	withMovements: number;
	withoutMovements: number;
	removed: number;
	credentialsCount: number;
	syncStatus: {
		pending: number;
		in_progress: number;
		completed: number;
		error: number;
		never_synced: number;
	};
	updatedToday: number;
}

export interface ScbaSyncedCausasFilters {
	credentialId?: string;
	hasMovements?: "true" | "false" | "";
	soloActive?: "true" | "false" | "";
	search?: string;
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface ScbaSyncedCausasResponse {
	success: boolean;
	data: ScbaSyncedCausa[];
	summary: ScbaSyncedCausasSummary;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export interface ScbaUpdateCoverage {
	total: number;
	updatedToday: number;
	pending: number;
	withErrors: number;
	coveragePercent: number;
	byFuero: Array<{ fuero: string; total: number; updatedToday: number; withErrors: number }>;
}

const scbaCausasService = {
	/** Lista paginada de causas SCBA agrupadas por credencial, con summary. */
	async getSyncedCausas(filters: ScbaSyncedCausasFilters = {}): Promise<ScbaSyncedCausasResponse> {
		const response = await adminAxios.get<ScbaSyncedCausasResponse>("/api/scba-causas/synced-causas", {
			params: filters,
		});
		return response.data;
	},

	/** Devuelve el documento completo de una causa (para el modal JSON). */
	async getSyncedCausaById(id: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
		const response = await adminAxios.get<{ success: boolean; data: Record<string, unknown> }>(`/api/scba-causas/synced-causas/${id}`);
		return response.data;
	},

	/**
	 * Cobertura diaria para el widget del dashboard (paralelo a
	 * pjnCredentialsService.getUpdateCoverage).
	 */
	async getUpdateCoverage(): Promise<{ success: boolean; data: ScbaUpdateCoverage }> {
		const response = await adminAxios.get<{ success: boolean; data: ScbaUpdateCoverage }>("/api/scba-causas/update-coverage");
		return response.data;
	},
};

export default scbaCausasService;
