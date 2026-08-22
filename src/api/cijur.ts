// API del subsistema CIJur (Centro de Información Jurídica del Ministerio
// Público de Buenos Aires). Los endpoints viven en pjn-api, igual que los de
// SAIJ, porque comparten la conexión al corpus de jurisprudencia del rs0.

import pjnAxios from "utils/pjnAxios";

export type CijurCanal = "PROVINCIAL" | "NACIONAL";

export interface CijurWorkerConfig {
	_id: string;
	worker_id: string;
	enabled: boolean;
	scraping: {
		canales: CijurCanal[];
		cronPattern: string;
		paginasPorCiclo: number;
		maxPaginas: number;
		rateLimit: number;
		delayBetweenRequests: number;
		descargarPdf: boolean;
	};
	notification: {
		errorEmail: boolean;
		newDocumentsEmail: boolean;
		recipientEmail: string;
	};
	stats: {
		totalProcessed: number;
		totalSuccess: number;
		totalErrors: number;
		lastRunAt?: string;
		lastSuccessAt?: string;
		lastErrorAt?: string;
		lastErrorMessage?: string;
	};
	lastUpdate?: string;
}

export interface CijurCanalProgress {
	canal: CijurCanal;
	docs: number;
	/** Fallos con más de 1.500 caracteres de texto: los aprovechables */
	conTexto: number;
	conVoces: number;
	errores: number;
	chars: number;
	masReciente: string | null;
	masAntiguo: string | null;
	ultimoCapturado: string | null;
}

export interface CijurProgressResponse {
	success: boolean;
	data: {
		workers: {
			workerId: string;
			enabled: boolean;
			canales: CijurCanal[];
			cronPattern: string | null;
			paginasPorCiclo: number | null;
			rateLimit: number | null;
			lastRunAt: string | null;
			lastSuccessAt: string | null;
			lastErrorAt: string | null;
			lastErrorMessage: string | null;
			totalSuccess: number;
			totalErrors: number;
		}[];
		canales: CijurCanalProgress[];
		totales: { docs: number; chars: number; conTexto: number; errores: number };
	};
}

export interface CijurFallo {
	_id: string;
	cijurId: string;
	canal: CijurCanal;
	titulo?: string;
	tribunal?: string;
	caratula?: string;
	fecha?: string;
	fechaString?: string;
	/** Redacción editorial de la Procuración: sirve para buscar, NO se republica */
	voces?: string;
	pdfUrl?: string;
	pdfNombre?: string;
	textoSource?: string;
	/** Largo del texto; el texto en sí solo viaja en el detalle */
	textoChars?: number;
	textoCompleto?: string;
	contenido?: string;
	publicadoEn?: string;
	publicadoEnString?: string;
	paginaOrigen?: number;
	url?: string;
	status?: "captured" | "processing" | "error";
	errorMessage?: string;
	createdAt?: string;
}

export interface CijurFallosParams {
	page?: number;
	limit?: number;
	canal?: CijurCanal;
	status?: string;
	q?: string;
	conTexto?: "true" | "false";
	desde?: string;
	hasta?: string;
}

export interface CijurFallosResponse {
	success: boolean;
	data: CijurFallo[];
	pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CijurStatsResponse {
	success: boolean;
	data: {
		porTribunal: { tribunal: string; n: number }[];
		porAño: { año: number; n: number }[];
		general: { total: number; conPdf: number; conTexto: number; charsProm: number };
	};
}

export const getCijurProgress = async (): Promise<CijurProgressResponse> => {
	const res = await pjnAxios.get("/api/cijur/progress");
	return res.data;
};

export const getCijurConfigs = async (): Promise<{ success: boolean; data: CijurWorkerConfig[] }> => {
	const res = await pjnAxios.get("/api/cijur/config");
	return res.data;
};

export const setCijurEnabled = async (workerId: string, enabled: boolean) => {
	const res = await pjnAxios.post(`/api/cijur/config/${workerId}/${enabled ? "enable" : "disable"}`);
	return res.data;
};

export const updateCijurScraping = async (workerId: string, body: Partial<CijurWorkerConfig["scraping"]>) => {
	const res = await pjnAxios.patch(`/api/cijur/config/${workerId}/scraping`, body);
	return res.data;
};

export const updateCijurNotification = async (workerId: string, body: Partial<CijurWorkerConfig["notification"]>) => {
	const res = await pjnAxios.patch(`/api/cijur/config/${workerId}/notification`, body);
	return res.data;
};

export const getCijurFallos = async (params: CijurFallosParams): Promise<CijurFallosResponse> => {
	const res = await pjnAxios.get("/api/cijur/fallos", { params });
	return res.data;
};

export const getCijurStats = async (): Promise<CijurStatsResponse> => {
	const res = await pjnAxios.get("/api/cijur/fallos/stats");
	return res.data;
};

export const getCijurFallo = async (id: string): Promise<{ success: boolean; data: CijurFallo }> => {
	const res = await pjnAxios.get(`/api/cijur/fallos/${id}`);
	return res.data;
};
