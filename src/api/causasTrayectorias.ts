import pjnAxios from "utils/pjnAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface TramoTrayectoria {
	tipo: "juzgado" | "camara" | "corte" | "otro";
	juzgado?: number;
	secretaria?: number;
	sala?: number;
	vocalia?: number;
	organismo?: string;
	textoCompleto?: string;
	desde?: string | null;
	hasta?: string | null;
	actual?: boolean;
	fuenteDatos?: string;
}

export interface CausaTrayectoria {
	_id: string;
	number: number;
	year: number;
	fuero: string;
	caratula?: string;
	juzgado?: number;
	secretaria?: number;
	sala?: number;
	vocalia?: number;
	tipoOrganizacion?: string;
	organizacionTextoCompleto?: string;
	movimientosCount?: number;
	foldersCount?: number;
	lastUpdate?: string;
	tramos?: number;
	trayectoria: TramoTrayectoria[];
}

export interface TrayectoriasResponse {
	success: boolean;
	count: number;
	pagination: {
		currentPage: number;
		totalPages: number;
		limit: number;
		hasNextPage: boolean;
		hasPrevPage: boolean;
	};
	data: CausaTrayectoria[];
}

export interface TrayectoriaStats {
	success: boolean;
	total: number;
	byFuero: Record<string, number>;
}

const BASE = "/api/admin/trayectorias";

const TrayectoriasService = {
	async list(params: { fuero?: string; page?: number; limit?: number }): Promise<TrayectoriasResponse> {
		const res = await pjnAxios.get<TrayectoriasResponse>(BASE, { params });
		return res.data;
	},
	async stats(): Promise<TrayectoriaStats> {
		const res = await pjnAxios.get<TrayectoriaStats>(`${BASE}/stats`);
		return res.data;
	},
};

export default TrayectoriasService;
