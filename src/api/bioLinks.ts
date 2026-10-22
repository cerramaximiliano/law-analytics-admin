import mktAxios from "utils/mktAxios";

// ==================== Tipos ====================

/** Icono del set fijo dibujado en la página de links. */
export type BioLinkIcono = "home" | "libro" | "lapiz" | "link" | "app";

/** En qué dispositivos se muestra el link (la página detecta el del visitante). */
export type BioLinkPlataforma = "todas" | "android" | "ios" | "desktop";

/** Insignia oficial de tienda a la derecha de la tarjeta. */
export type BioLinkInsignia = "ninguna" | "google-play";

export interface BioLink {
	_id: string;
	titulo: string;
	descripcion: string;
	url: string;
	icono: BioLinkIcono;
	/** Links viejos sin el campo: "todas". */
	plataforma?: BioLinkPlataforma;
	insignia?: BioLinkInsignia;
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
	plataforma?: BioLinkPlataforma;
	insignia?: BioLinkInsignia;
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
