/**
 * API de conciliación de apareos SAIJ ↔ causas PJN.
 *
 * Backend: pjn-api, `/api/saij/conciliacion/*`.
 *
 * El apareo automático se hace por (fuero, número, año) y eso alcanza para
 * colgar un fallo de la causa equivocada. Esta cola lista los pares que el
 * comparador de carátulas marca como sospechosos para que una persona los
 * confirme, los desvincule o los mueva a la causa correcta.
 */
import pjnAxios from "utils/pjnAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type VeredictoApareo = "coincide" | "no_coincide" | "indeterminado";

export type EstadoConciliacion = "pendiente" | "confirmado" | "desvinculado" | "reapareado" | "ignorado";

/** Banderas del diagnóstico. INSTANCIA sola no marca el caso como sospechoso. */
export type FlagConciliacion =
	| "CARATULA"
	| "FUERO"
	| "NUMERO"
	| "ANIO"
	| "INSTANCIA"
	| "CARATULA_PLACEHOLDER"
	| "FALLO_ANONIMIZADO"
	| "SIN_COMPARABLE";

export interface ExpedienteFallo {
	numero?: number;
	año?: number;
	fuero?: string;
	/** El parser sabe cuán seguro está; `low` es el que producía apareos cruzados. */
	confidence?: "high" | "medium" | "low";
	source?: string;
}

export interface CandidatoConciliacion {
	_id: string;
	causaId: string;
	causaCollection: string;
	fuero: string;
	number?: string;
	year?: string;
	caratulaCausa?: string;
	causaSource?: string;
	causaVerified?: boolean;
	esShell?: boolean;

	saijDocId: string;
	caratulaFallo?: string;
	saijUrl?: string;
	expedienteFallo?: ExpedienteFallo;

	veredicto?: VeredictoApareo;
	jaccard?: number | null;
	containment?: number | null;
	objetoJaccard?: number | null;
	flags: FlagConciliacion[];
	sospechoso: boolean;

	estado: EstadoConciliacion;
	resueltoPor?: string;
	resueltoAt?: string;
	notas?: string;
	resultado?: {
		movimientoQuitado?: boolean;
		sentenciasCapturadasTocadas?: number;
		embeddingReencolado?: number;
		causaNueva?: string;
		backupId?: string;
	};
	detectadoAt: string;
	escaneoId?: string;
}

export interface MovimientoSaij {
	fecha?: string;
	tipo?: string;
	detalle?: string;
	url?: string;
}

export interface CausaDeCandidato {
	_id: string;
	number?: string;
	year?: string;
	caratula?: string;
	fuero?: string;
	juzgado?: number;
	secretaria?: number;
	objeto?: string;
	source?: string;
	verified?: boolean;
	isValid?: boolean;
	update?: boolean;
	movimientosCount?: number;
	saij?: { isFromSaij?: boolean; saijSentenciaIds?: string[]; linkedAt?: string; createdViaSaij?: boolean };
	/** Sólo los movimientos 'SENTENCIA SAIJ' — el resto no hace al apareo. */
	movimiento?: MovimientoSaij[];
}

export interface FalloDeCandidato {
	_id: string;
	titulo?: string;
	actor?: string;
	demandado?: string;
	sobre?: string;
	fecha?: string;
	tribunal?: string;
	url?: string;
	pdfUrl?: string;
	expediente?: ExpedienteFallo;
	fuero?: string;
	causaRefs?: Array<{ causaId: string; caratula: string; fuero: string }>;
	apareoMotivo?: string;
	pipelineStatus?: string;
}

export interface ScDeCandidato {
	_id: string;
	causaId?: string | null;
	caratula?: string;
	number?: number;
	year?: number;
	fuero?: string;
	embeddingStatus?: string;
	embeddingChunksCount?: number;
	url?: string;
}

export interface DetalleConciliacion {
	candidato: CandidatoConciliacion;
	causa: CausaDeCandidato | null;
	fallo: FalloDeCandidato | null;
	sentenciasCapturadas: ScDeCandidato[];
}

export interface ResumenConciliacion {
	porEstado: Record<string, number>;
	porFuero: Record<string, number>;
	porFlag: Record<string, number>;
	pendientesSospechosos: number;
	ultimoEscaneo: string | null;
	escaneoId: string | null;
}

export interface ListaParams {
	estado?: EstadoConciliacion | "todos";
	fuero?: string;
	sospechoso?: "true" | "false" | "todos";
	veredicto?: VeredictoApareo;
	flag?: FlagConciliacion;
	q?: string;
	incluirShells?: boolean;
	page?: number;
	limit?: number;
	sort?: "jaccard" | "reciente";
}

interface Paginado<T> {
	success: boolean;
	data: T[];
	pagination: { page: number; limit: number; total: number; pages: number };
}

// ── Llamadas ───────────────────────────────────────────────────────────────────

export const listarCandidatos = async (params: ListaParams = {}): Promise<Paginado<CandidatoConciliacion>> => {
	const { data } = await pjnAxios.get("/api/saij/conciliacion", {
		params: { ...params, incluirShells: params.incluirShells ? "true" : "false" },
	});
	return data;
};

export const obtenerResumen = async (): Promise<ResumenConciliacion> => {
	const { data } = await pjnAxios.get("/api/saij/conciliacion/resumen");
	return data.data;
};

export const obtenerDetalle = async (id: string): Promise<DetalleConciliacion> => {
	const { data } = await pjnAxios.get(`/api/saij/conciliacion/${id}`);
	return data.data;
};

export const escanear = async (opts: { fueros?: string[]; soloSospechosos?: boolean } = {}) => {
	const { data } = await pjnAxios.post("/api/saij/conciliacion/escanear", opts);
	return data.data as { escaneoId: string; revisados: number; registrados: number; porVeredicto: Record<string, number> };
};

export const confirmar = async (id: string, notas?: string) => {
	const { data } = await pjnAxios.post(`/api/saij/conciliacion/${id}/confirmar`, { notas });
	return data.data as CandidatoConciliacion;
};

export const ignorar = async (id: string, notas?: string) => {
	const { data } = await pjnAxios.post(`/api/saij/conciliacion/${id}/ignorar`, { notas });
	return data.data as CandidatoConciliacion;
};

export const desvincular = async (id: string, opts: { notas?: string; reencolarEmbedding?: boolean } = {}) => {
	const { data } = await pjnAxios.post(`/api/saij/conciliacion/${id}/desvincular`, opts);
	return data.data;
};

export const reaparear = async (
	id: string,
	body: { fuero: string; number: string; year: string; forzar?: boolean; notas?: string },
) => {
	const { data } = await pjnAxios.post(`/api/saij/conciliacion/${id}/reaparear`, body);
	return data.data;
};

/**
 * Resuelve un expediente y, si se pasa `saijDocId`, adelanta el veredicto del
 * comparador — así se ve antes de confirmar si el apareo pasa el gate o hay
 * que forzarlo.
 */
export const buscarCausa = async (fuero: string, number: string, year: string, saijDocId?: string) => {
	const { data } = await pjnAxios.get("/api/saij/conciliacion/buscar-causa", {
		params: { fuero, number, year, saijDocId },
	});
	return data.data as {
		causa: CausaDeCandidato;
		veredicto: (CandidatoConciliacion & { motivo?: string }) | null;
	};
};

/**
 * Lote de casos "claros": carátula sin relación con nombres completos en ambos
 * lados. dryRun devuelve el conteo y una muestra; sin dryRun desvincula y, si
 * el expediente actual del fallo apunta a otra causa cuya carátula coincide,
 * lo re-aparea automáticamente con los gates nuevos.
 */
export interface LoteDryRun {
	dryRun: true;
	total: number;
	muestra: Array<Pick<CandidatoConciliacion, "fuero" | "number" | "year" | "caratulaCausa" | "caratulaFallo" | "jaccard" | "flags">>;
}
export interface LoteResultado {
	dryRun: false;
	procesados: number;
	desvinculados: number;
	reapareados: number;
	errores: Array<{ id: string; expte: string; error: string }>;
}

export const desvincularLote = async (opts: {
	dryRun?: boolean;
	jaccardMax?: number;
	reintentarApareo?: boolean;
	notas?: string;
}): Promise<LoteDryRun | LoteResultado> => {
	const { data } = await pjnAxios.post("/api/saij/conciliacion/desvincular-lote", opts);
	return data.data;
};
