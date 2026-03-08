import adminAxios from "utils/adminAxios";

export interface TasaConfig {
	value: string;
	label: string;
	fechaInicio: string | null;
	fechaUltima: string | null;
	fechaUltimaCompleta: string | null;
}

export interface TasaResultItem {
	fecha: string;
	valor: number | null;
}

export interface ConsultaParams {
	fechaDesde: string;
	fechaHasta: string;
	campo: string;
	completo: boolean;
}

export const getTasasListado = async (): Promise<TasaConfig[]> => {
	const response = await adminAxios.get<TasaConfig[]>("/api/tasas/listado");
	return response.data;
};

export const consultarTasas = async (params: ConsultaParams): Promise<TasaResultItem[]> => {
	const response = await adminAxios.get("/api/tasas/consulta", {
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
		}));
	}

	// completo=false → { inicio, fin }
	const result: TasaResultItem[] = [];
	if (datos.inicio) {
		result.push({ fecha: datos.inicio.fecha, valor: datos.inicio[params.campo] ?? null });
	}
	if (datos.fin && datos.fin.fecha !== datos.inicio?.fecha) {
		result.push({ fecha: datos.fin.fecha, valor: datos.fin[params.campo] ?? null });
	}
	return result;
};

export const actualizarValorTasa = async (fecha: string, campo: string, valor: number): Promise<void> => {
	await adminAxios.put("/api/tasas/valor", { fecha, campo, valor });
};
