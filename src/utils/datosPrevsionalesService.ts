import adminAxios from "utils/adminAxios";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DatoPrevisional {
	_id: string;
	fecha: string;
	estado: boolean;
	moneda: "australes" | "pesos";
	valorAMPOoMOPRE: number;
	maximoImponible: number;
	haberMaximoJubilacion: number;
	haberMaximoPension: number;
	haberMinimoJubilacion: number;
	haberMinimoPension: number;
	suplemento82SMVM: number;
	salarioMVM: number;
	minimoFerroviario406: number;
	minimoFerroviario662: number;
	movilidadGeneral: number;
	haberGeneralBrigada: number;
	pbu: number;
	topePC: number;
	referenciaDiferencialMin: number;
	referenciaDiferencialMax: number;
	movilidadDiferencial: number;
	adicionales: number;
	SupMovilidad: boolean;
}

export interface Pagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface ListadoParams {
	page?: number;
	limit?: number;
	anio?: number | "";
	moneda?: "australes" | "pesos" | "";
	sortField?: string;
	sortDir?: "asc" | "desc";
}

export interface Stats {
	total: number;
	mesesFaltantes: number;
	fechaInicio: string | null;
	fechaUltima: string | null;
	porMoneda: { _id: string; count: number; desde: string; hasta: string }[];
}

export interface MissingEntry {
	anio: number;
	meses: number[];
	count: number;
}

export interface YearEntry {
	anio: number;
	count: number;
	completo: boolean;
	monedas: string[];
}

export interface CoverageEntry {
	anio: number;
	meses: boolean[]; // índice 0 = enero, 11 = diciembre
	completo: boolean;
	faltantes: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getListado = async (params: ListadoParams = {}): Promise<{ data: DatoPrevisional[]; pagination: Pagination }> => {
	const response = await adminAxios.get("/api/datos-previsionales", { params });
	return { data: response.data.data, pagination: response.data.pagination };
};

export const getStats = async (): Promise<Stats> => {
	const response = await adminAxios.get("/api/datos-previsionales/stats");
	return response.data.data;
};

export const getMissing = async (anio?: number): Promise<{ data: MissingEntry[]; total: number }> => {
	const params = anio ? { anio } : {};
	const response = await adminAxios.get("/api/datos-previsionales/missing", { params });
	return { data: response.data.data, total: response.data.total };
};

export const getYears = async (): Promise<YearEntry[]> => {
	const response = await adminAxios.get("/api/datos-previsionales/years");
	return response.data.data;
};

export const getCoverage = async (): Promise<CoverageEntry[]> => {
	const response = await adminAxios.get("/api/datos-previsionales/coverage");
	return response.data.data;
};

export const getById = async (id: string): Promise<DatoPrevisional> => {
	const response = await adminAxios.get(`/api/datos-previsionales/${id}`);
	return response.data.data;
};

export const updateById = async (id: string, campos: Partial<DatoPrevisional>): Promise<DatoPrevisional> => {
	const response = await adminAxios.put(`/api/datos-previsionales/${id}`, campos);
	return response.data.data;
};

export const create = async (data: Partial<DatoPrevisional> & { fecha: string }): Promise<DatoPrevisional> => {
	const response = await adminAxios.post("/api/datos-previsionales", data);
	return response.data.data;
};

export const toggleEstado = async (id: string): Promise<DatoPrevisional> => {
	const response = await adminAxios.patch(`/api/datos-previsionales/${id}/toggle`);
	return response.data.data;
};
