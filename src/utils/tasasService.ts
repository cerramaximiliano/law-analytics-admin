import tasasAxios from "utils/tasasAxios";

export interface TasaConfig {
	value: string;
	label: string;
	fechaInicio: string | null;
	fechaUltima: string | null;
	fechaUltimaCompleta: string | null;
	fechasFaltantes: string[];
}

export interface TasaResultItem {
	fecha: string;
	valor: number | null;
	fuente?: string | null;
}

export interface ConsultaParams {
	fechaDesde: string;
	fechaHasta: string;
	campo: string;
	completo: boolean;
}

export const getTasasListado = async (): Promise<TasaConfig[]> => {
	const response = await tasasAxios.get<TasaConfig[]>("/api/tasas/listado");
	return response.data;
};

export const consultarTasas = async (params: ConsultaParams): Promise<TasaResultItem[]> => {
	const response = await tasasAxios.get("/api/tasas/consulta", {
		params: {
			fechaDesde: params.fechaDesde,
			fechaHasta: params.fechaHasta,
			campo: params.campo,
			completo: params.completo ? "true" : "false",
		},
	});

	if (!response.data.success) {
		throw new Error(response.data.mensaje || "Error en la consulta");
	}

	const { datos } = response.data;

	if (Array.isArray(datos)) {
		return datos.map((item: Record<string, unknown>) => ({
			fecha: item.fecha as string,
			valor: item[params.campo] != null ? (item[params.campo] as number) : null,
			fuente: (item.fuentes as Record<string, string> | undefined)?.[params.campo] ?? null,
		}));
	}

	// completo=false → { inicio, fin }
	const result: TasaResultItem[] = [];
	if (datos.inicio) {
		result.push({
			fecha: datos.inicio.fecha,
			valor: datos.inicio[params.campo] ?? null,
			fuente: datos.inicio.fuentes?.[params.campo] ?? null,
		});
	}
	if (datos.fin && datos.fin.fecha !== datos.inicio?.fecha) {
		result.push({
			fecha: datos.fin.fecha,
			valor: datos.fin[params.campo] ?? null,
			fuente: datos.fin.fuentes?.[params.campo] ?? null,
		});
	}
	return result;
};

export const actualizarValorTasa = async (fecha: string, campo: string, valor: number): Promise<void> => {
	await tasasAxios.put("/api/tasas/valor", { fecha, campo, valor });
};

export interface TasasStatusItem {
	tipoTasa: string;
	fechaUltima: string | null;
}

export interface TasasStatus {
	total: number;
	actualizadas: number;
	noActualizadas: number;
	desactualizadas: TasasStatusItem[];
	fechaHoy: string;
}

export const getTasasStatus = async (): Promise<TasasStatus> => {
	const response = await tasasAxios.get<{ success: boolean; data: TasasStatus }>("/api/tasas/status");
	return response.data.data;
};

export const rellenarGaps = async (tipoTasa?: string): Promise<void> => {
	const params = tipoTasa ? { tipoTasa } : {};
	await tasasAxios.post("/api/tasas/rellenar-gaps", undefined, { params });
};
