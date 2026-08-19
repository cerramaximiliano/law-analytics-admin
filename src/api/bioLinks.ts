import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

/** Icono del set fijo dibujado en la página de links. */
export type BioLinkIcono = "home" | "libro" | "lapiz" | "link";

export interface BioLink {
	_id: string;
	titulo: string;
	descripcion: string;
	url: string;
	icono: BioLinkIcono;
	/** Solo los habilitados se muestran en links.lawanalytics.app. */
	habilitado: boolean;
	orden: number;
	createdAt: string;
	updatedAt: string;
}

export interface BioLinkPayload {
	titulo?: string;
	descripcion?: string;
	url?: string;
	icono?: BioLinkIcono;
	habilitado?: boolean;
	orden?: number;
}

// ==================== Endpoints ====================

export const listBioLinks = async (): Promise<BioLink[]> => {
	const res = await mktAxios.get("/api/biolinks");
	return res.data.data;
};

export const createBioLink = async (payload: BioLinkPayload & { titulo: string; url: string }): Promise<BioLink> => {
	const res = await mktAxios.post("/api/biolinks", payload);
	return res.data.data;
};

export const updateBioLink = async (id: string, payload: BioLinkPayload): Promise<BioLink> => {
	const res = await mktAxios.put(`/api/biolinks/${id}`, payload);
	return res.data.data;
};

export const deleteBioLink = async (id: string): Promise<void> => {
	await mktAxios.delete(`/api/biolinks/${id}`);
};
