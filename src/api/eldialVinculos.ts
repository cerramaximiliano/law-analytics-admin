/**
 * API de la cola de vínculos El Dial ↔ causas PJN.
 *
 * Backend: legal-scraping-api, `/api/eldial-vinculos/*` (auth + admin).
 * Plan y criterios: legal-scraping-workers/docs/integracion-eldial-pjn.md.
 *
 * El matcher cruza cada fallo de El Dial con nuestras causas por (fuero, número,
 * año) y compara carátulas. Los claros quedan en "auto"; los dudosos y las causas
 * sin datos (N/A / scraping fallido) quedan "pendiente" para que una persona decida.
 * Nada de esto escribe en las causas: es la cola previa a F4/F5.
 */
import legalAxios from "utils/legalAxios";

export type EstadoVinculo = "auto" | "pendiente" | "sin_candidato" | "confirmado" | "reasignado" | "rechazado" | "ignorado";

export type VeredictoVinculo =
	| "match-fuerte"
	| "match-fuerte-iniciales"
	| "match-numero-causa-sin-datos"
	| "match-parcial"
	| "match-numero-caratula-distinta"
	| "match-numero-sin-caratula-comparable"
	| "sin-candidato"
	| "sin-clave"
	| "sin-fuero";

export type MetodoVinculo = "exacto" | "iniciales" | "numero" | "manual" | null;

export interface CandidatoCausa {
	codigo: string;
	coleccion: string;
	causaId: string;
	number: number;
	year: number;
	incidente: string | null;
	caratula: string;
	caratulaRaw: string;
	objeto: string;
	juzgado: number | null;
	secretaria: number | null;
	sala: number | null;
	estado: string;
	sinDatos: boolean;
	verified: boolean;
	isValid: boolean;
	source: string | null;
	lastUpdate: string | null;
	score: number;
	objetoOk: boolean | null;
	actorOk: boolean | null;
	demandadoOk: boolean | null;
	inicialesOk: boolean;
}

export interface HistorialVinculo {
	accion: string;
	por: string;
	at: string;
	estadoAntes?: string | null;
	estadoDespues?: string | null;
	causaAntes?: string | null;
	causaDespues?: string | null;
	notas?: string | null;
}

export interface Vinculo {
	_id: string;
	falloId: string;
	codigoCita: string;
	titulo: string;
	caratulaFallo: string;
	comparadoPorTitulo?: boolean;
	tribunal?: string;
	fueroPjn: string;
	prefijo?: string | null;
	conflictoPrefijo?: boolean;
	numeroCausa?: number | null;
	anio?: number | null;
	formatoExpediente?: string | null;
	fechaSentencia?: string | null;
	fechaPublicacion?: string | null;
	veredicto: VeredictoVinculo;
	codigosProbados: string[];
	candidatos: CandidatoCausa[];
	nota?: string | null;
	estado: EstadoVinculo;
	causaElegida: CandidatoCausa | null;
	metodo: MetodoVinculo;
	confianza: number | null;
	resueltoPor?: string | null;
	resueltoAt?: string | null;
	notas?: string | null;
	historial?: HistorialVinculo[];
	escaneoId?: string;
	escaneadoAt?: string;
}

export interface FalloDeVinculo {
	_id: string;
	codigoCita: string;
	titulo: string;
	urlFallo?: string;
	urlPdf?: string;
	fechaPublicacion?: string;
	fechaSentencia?: string;
	firmeza?: string | null;
	tribunal?: { nombre?: string; sala?: string; tipo?: string; provincia?: string | null };
	jurisdiccion?: string;
	fuero?: string;
	fueroPjn?: string | null;
	expediente?: {
		raw?: string;
		numero?: string;
		numeroCausa?: number;
		anio?: number;
		sufijo?: string | null;
		formato?: string;
		prefijo?: string | null;
	};
	partes?: { caratula?: string; actor?: string; demandado?: string; objeto?: string };
	clasificacion?: { metodo?: string; regla?: string; confianza?: string; version?: string; conflictoPrefijo?: boolean };
}

export interface DetalleVinculo {
	vinculo: Vinculo;
	fallo: FalloDeVinculo | null;
	causasDbDisponible: boolean;
}

export interface ResumenVinculos {
	porEstado: Partial<Record<EstadoVinculo, number>>;
	porVeredicto: Partial<Record<VeredictoVinculo, number>>;
	porFuero: Record<string, number>;
	ultimoEscaneo: string | null;
	escaneoId: string | null;
	causasDbDisponible: boolean;
}

export interface ListaVinculosParams {
	estado?: EstadoVinculo | "todos" | string;
	veredicto?: VeredictoVinculo | "";
	fuero?: string;
	q?: string;
	page?: number;
	limit?: number;
}

interface Paginado<T> {
	success: boolean;
	data: T[];
	pagination: { page: number; limit: number; total: number; pages: number };
}

const BASE = "/api/eldial-vinculos";

export const listarVinculos = async (params: ListaVinculosParams = {}): Promise<Paginado<Vinculo>> => {
	const { data } = await legalAxios.get(BASE, { params });
	return data;
};

export const obtenerResumenVinculos = async (): Promise<ResumenVinculos> => {
	const { data } = await legalAxios.get(`${BASE}/resumen`);
	return data.data;
};

export const obtenerDetalleVinculo = async (id: string): Promise<DetalleVinculo> => {
	const { data } = await legalAxios.get(`${BASE}/${id}`);
	return data.data;
};

export const confirmarVinculo = async (id: string, opts: { causaId?: string; notas?: string } = {}): Promise<Vinculo> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/confirmar`, opts);
	return data.data;
};

export const rechazarVinculo = async (id: string, notas?: string): Promise<Vinculo> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/rechazar`, { notas });
	return data.data;
};

export const ignorarVinculo = async (id: string, notas?: string): Promise<Vinculo> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/ignorar`, { notas });
	return data.data;
};

export const reabrirVinculo = async (id: string, notas?: string): Promise<Vinculo> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/reabrir`, { notas });
	return data.data;
};

export const reevaluarVinculo = async (id: string): Promise<{ data: Vinculo; accion: string }> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/reevaluar`);
	return { data: data.data, accion: data.accion };
};

export const buscarCausaParaVinculo = async (
	fuero: string,
	number: string,
	year: string,
	vinculoId?: string,
): Promise<CandidatoCausa[]> => {
	const { data } = await legalAxios.get(`${BASE}/buscar-causa`, { params: { fuero, number, year, vinculoId } });
	return data.data;
};

export const reasignarVinculo = async (
	id: string,
	body: { fuero: string; number: string | number; year: string | number; causaId: string; notas?: string; corregirFallo?: boolean },
): Promise<Vinculo> => {
	const { data } = await legalAxios.post(`${BASE}/${id}/reasignar`, body);
	return data.data;
};

export const escanearVinculos = async (): Promise<{ escaneoId: string; revisados: number; acciones: Record<string, number> }> => {
	// El escaneo recorre ~200 fallos contra el rs0: puede superar el timeout por defecto.
	const { data } = await legalAxios.post(`${BASE}/escanear`, {}, { timeout: 180000 });
	return data.data;
};
