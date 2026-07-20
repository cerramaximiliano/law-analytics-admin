import adminAxios from "utils/adminAxios";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ValorArancelario {
	_id: string;
	unidad: string;
	ambito: string;
	valor: number;
	vigenciaDesde: string;
	periodo: string;
	norma?: string;
	leyMarco?: string;
	descripcion?: string;
	fuente?: string;
	fechaPublicacion?: string;
	estado: boolean;
	createdAt?: string;
}

/** Estado de la última corrida de una tarea de sincronización. */
export interface EstadoTarea {
	clave: string;
	ultimaEjecucion?: string;
	ultimoEstado?: "ok" | "error";
	ultimoError?: string;
	publicados?: number;
	nuevos?: number;
	corregidos?: number;
	ultimoPostFecha?: string;
}

/** Fila del resumen: una jurisdicción con su valor vigente y estado de tarea. */
export interface ResumenJurisdiccion {
	unidad: string;
	ambito: string;
	descripcion?: string;
	leyMarco?: string;
	fuente?: string;
	total: number;
	vigente: {
		valor: number;
		periodo: string;
		norma?: string;
		vigenciaDesde: string;
	} | null;
	estado: EstadoTarea | null;
}

export interface Pagination {
	total: number;
	page: number;
	limit: number;
	pages: number;
}

// ─── Endpoints ─────────────────────────────────────────────────────────────────

/** Una fila por jurisdicción con su valor vigente y el estado de la sincronización. */
export const getResumen = async (): Promise<ResumenJurisdiccion[]> => {
	const res = await adminAxios.get("/api/valores-arancelarios/resumen");
	return res.data.data;
};

/** Estado de todas las tareas de sincronización. */
export const getEstadoTareas = async (): Promise<{ data: EstadoTarea[]; actualizado: string | null }> => {
	const res = await adminAxios.get("/api/valores-arancelarios/estado");
	return { data: res.data.data, actualizado: res.data.actualizado };
};

/** Serie histórica de una unidad/ámbito, del escalón más nuevo al más viejo. */
export const getSerie = async (
	unidad: string,
	ambito: string,
	params: { page?: number; limit?: number; sortDir?: "asc" | "desc" } = {},
): Promise<{ data: ValorArancelario[]; pagination: Pagination }> => {
	const res = await adminAxios.get(`/api/valores-arancelarios/${unidad}/${ambito}`, { params });
	return { data: res.data.data, pagination: res.data.pagination };
};
