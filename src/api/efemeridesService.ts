import adminAxios from "utils/adminAxios";

export type Emblema = "escarapela" | "bandera" | null;

export interface Efemeride {
	_id: string;
	efemerideId: string;
	mes: number;
	dia: number;
	titulo: string;
	contexto?: string;
	mensajes: string[];
	cierre?: string;
	emblema?: Emblema;
	icono?: string;
	activo: boolean;
	orden: number;
	createdAt?: string;
	updatedAt?: string;
}

/** Campos editables al crear/actualizar. */
export type EfemerideInput = {
	mes: number;
	dia: number;
	titulo: string;
	contexto?: string;
	mensajes?: string[];
	cierre?: string;
	emblema?: Emblema;
	icono?: string;
	activo?: boolean;
	orden?: number;
	efemerideId?: string;
};

export const getEfemerides = async (): Promise<Efemeride[]> => {
	const res = await adminAxios.get("/api/efemerides");
	return res.data.data;
};

export const crearEfemeride = async (payload: EfemerideInput): Promise<Efemeride> => {
	const res = await adminAxios.post("/api/efemerides", payload);
	return res.data.data;
};

export const actualizarEfemeride = async (id: string, payload: EfemerideInput): Promise<Efemeride> => {
	const res = await adminAxios.put(`/api/efemerides/${id}`, payload);
	return res.data.data;
};

export const toggleEfemeride = async (id: string): Promise<Efemeride> => {
	const res = await adminAxios.patch(`/api/efemerides/${id}/toggle`);
	return res.data.data;
};

export const eliminarEfemeride = async (id: string): Promise<void> => {
	await adminAxios.delete(`/api/efemerides/${id}`);
};
