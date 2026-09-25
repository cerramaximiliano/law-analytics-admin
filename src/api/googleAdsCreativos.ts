import mktAxios from "utils/mktAxios";

// Imágenes candidatas para Google Ads (la-marketing-service, /api/google-ads).

export type FormatoGAds = "horizontal" | "cuadrado" | "vertical";
export type EstadoCreativo = "nueva" | "elegida" | "descartada" | "subida" | "aprobada" | "rechazada";

export interface OpcionCatalogo {
	id: string;
	label: string;
	descripcion?: string;
}

export interface FormatoCatalogo extends OpcionCatalogo {
	width: number;
	height: number;
}

export interface PaletaCatalogo extends OpcionCatalogo {
	oscuro: boolean;
	fondo: string;
	acento: string;
}

export interface CatalogoGAds {
	plantillas: OpcionCatalogo[];
	formatos: FormatoCatalogo[];
	paletas: PaletaCatalogo[];
	estados: EstadoCreativo[];
	maxPorLote: number;
	storage: boolean;
}

export interface CreativoGAds {
	_id: string;
	plantilla: string;
	formato: FormatoGAds;
	paleta: string;
	semilla: number;
	width: number;
	height: number;
	lote: string;
	estado: EstadoCreativo;
	estadoEn: string | null;
	motivo: string;
	notas: string;
	url: string | null;
	createdAt: string;
}

export interface ProgresoLote {
	lote: string;
	total: number;
	hechas: number;
	fallidas: number;
	errores: string[];
	terminado: boolean;
}

export interface ListadoCreativos {
	data: CreativoGAds[];
	pagination: { page: number; limit: number; total: number; pages: number };
	porEstado: Partial<Record<EstadoCreativo, number>>;
}

export interface FiltroCreativos {
	estado?: EstadoCreativo | "";
	formato?: FormatoGAds | "";
	plantilla?: string;
	page?: number;
	limit?: number;
}

export const getCatalogoGAds = async (): Promise<CatalogoGAds> => {
	const { data } = await mktAxios.get("/api/google-ads/catalogo");
	return data.data;
};

export const generarCreativos = async (pedido: {
	plantillas: string[];
	formatos: string[];
	paletas: string[];
	cantidad: number;
}): Promise<ProgresoLote> => {
	const { data } = await mktAxios.post("/api/google-ads/generar", pedido);
	return data.data;
};

export const getProgresoLote = async (lote: string): Promise<ProgresoLote> => {
	const { data } = await mktAxios.get(`/api/google-ads/lotes/${lote}`);
	return data.data;
};

export const listCreativos = async (filtro: FiltroCreativos): Promise<ListadoCreativos> => {
	const params: Record<string, string | number> = {};
	Object.entries(filtro).forEach(([k, v]) => {
		if (v !== "" && v !== undefined && v !== null) params[k] = v as string | number;
	});
	const { data } = await mktAxios.get("/api/google-ads/creativos", { params });
	return { data: data.data, pagination: data.pagination, porEstado: data.porEstado || {} };
};

export const actualizarCreativo = async (
	id: string,
	cambios: { estado?: EstadoCreativo; motivo?: string; notas?: string },
): Promise<CreativoGAds> => {
	const { data } = await mktAxios.patch(`/api/google-ads/creativos/${id}`, cambios);
	return data.data;
};

export const actualizarVariosCreativos = async (ids: string[], estado: EstadoCreativo): Promise<number> => {
	const { data } = await mktAxios.post("/api/google-ads/creativos/estado", { ids, estado });
	return data.data.modificadas;
};

export const descargaCreativo = async (id: string): Promise<{ url: string; nombre: string }> => {
	const { data } = await mktAxios.get(`/api/google-ads/creativos/${id}/descarga`);
	return data.data;
};

export const borrarCreativo = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/google-ads/creativos/${id}`);
};
