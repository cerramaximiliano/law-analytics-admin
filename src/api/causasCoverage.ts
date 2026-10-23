import adminAxios from "utils/adminAxios";

/**
 * Cobertura de texto por causa PJN (admin-api `/api/causas-coverage`).
 * Responde, por causa, cuántos movimientos con PDF tienen texto extraído
 * (por categoría documental) y si la causa está al día en su actualización.
 */

export type CoverageCategoriaKey = "resolucion" | "cedula" | "escrito" | "diligenciada" | "deo";

/**
 * completo       → todos los documentos de la categoría tienen texto
 * en_curso       → hay `pendiente` o `sinPdf` (el extractor / la descarga lo van a hacer)
 * incompleto     → solo queda `needsOcr` / `failed`, nada en vuelo
 * no_habilitado  → categoría con pendientes cuyo proceso RAG está apagado (p. ej. diligenciada)
 * sin_documentos → la categoría no tiene documentos en la causa
 */
export type CoverageFlag = "completo" | "en_curso" | "incompleto" | "no_habilitado" | "sin_documentos";

export type ActualizacionEstado = "al_dia" | "atrasada" | "cooldown" | "no_actualizable" | "sin_dato";

export interface CoverageDefinitivos {
	/** Ninguna carpeta con credencial ve el movimiento */
	reservada: number;
	muy_grande: number;
	otros: number;
}

export interface CoverageCategoria {
	total: number;
	conTexto: number;
	pendiente: number;
	sinPdf: number;
	needsOcr: number;
	failed: number;
	/** PDFs que no se leen por motivo definitivo — no cuentan como pendientes */
	definitivos: CoverageDefinitivos;
}

export interface CoverageTextos {
	total: number;
	conTexto: number;
	pendiente: number;
	sinPdf: number;
	needsOcr: number;
	failed: number;
	definitivos: number;
}

export interface CoverageNuevos {
	total: number;
	sinPdf: number;
	pendiente: number;
}

export interface CoverageActualizacion {
	estado: ActualizacionEstado;
	thresholdHours: number;
	lastUpdate: string | null;
	skipUntil: string | null;
	fechaUltimoMovimiento: string | null;
}

/** alta ≥ 70 · media 40–69 · baja 10–39 · archivo < 10 */
export type PrioridadNivel = "alta" | "media" | "baja" | "archivo";

export interface PrioridadComponentes {
	carpetas: number;
	plan: number;
	addon: number;
	prueba: number;
	usuarios: number;
	actividad: number;
	cola: number;
}

/**
 * Prioridad de extracción de textos de una causa (calculada por el cron horario del hub).
 * `score` es el valor efectivo (= `manual` si hay override), `automatico` el calculado sin override.
 * `motivos`: 'manual', 'carpeta_viva', 'solo_archivadas', 'sin_carpetas', 'plan_<plan>', 'addon_mcp',
 * 'cuenta_prueba', 'usuarios_N', 'mov_7d'|'mov_30d'|'mov_180d', 'cola_Nd'.
 */
export interface Prioridad {
	score: number;
	automatico: number;
	nivel: PrioridadNivel;
	motivos: string[];
	componentes: PrioridadComponentes;
	/** Override fijado desde el admin; null si no hay */
	manual: number | null;
	manualPor?: string;
	manualEn?: string;
	manualNota?: string;
	computedAt: string;
	version: string;
}

export interface CausaCoverage {
	fuente: string;
	causaEncontrada: boolean;
	movimientos: number;
	sinCuerpo: number;
	categorias: Record<CoverageCategoriaKey, CoverageCategoria>;
	flags: Record<CoverageCategoriaKey, CoverageFlag>;
	textos: CoverageTextos;
	nuevos: CoverageNuevos;
	actualizacion: CoverageActualizacion;
	/** Desde cuándo hay documentos esperando texto (ISO) */
	pendientesDesde: string | null;
	/** null si el cron todavía no calculó la causa */
	prioridad: Prioridad | null;
}

export interface PrioridadMutationResponse {
	success: boolean;
	prioridad: {
		causaId: string;
		causaType: string;
		score: number;
		nivel: PrioridadNivel;
		motivos: string[];
	};
}

/** Nombre de modelo PJN que espera el backend en `causaType` */
export type PjnCausaType = "CausasCivil" | "CausasComercial" | "CausasSegSocial" | "CausasTrabajo";

const FUERO_TO_CAUSA_TYPE: Record<string, PjnCausaType> = {
	CIV: "CausasCivil",
	COM: "CausasComercial",
	CSS: "CausasSegSocial",
	CNT: "CausasTrabajo",
	Civil: "CausasCivil",
	Comercial: "CausasComercial",
	"Seguridad Social": "CausasSegSocial",
	Trabajo: "CausasTrabajo",
};

/**
 * Mapea el fuero PJN (código CIV/COM/CSS/CNT o nombre legible) al nombre de modelo
 * que espera el backend. Devuelve null si el fuero no es de los cuatro soportados.
 */
export const fueroToCausaType = (fuero: string | null | undefined): PjnCausaType | null => {
	if (!fuero) return null;
	return FUERO_TO_CAUSA_TYPE[fuero] || FUERO_TO_CAUSA_TYPE[fuero.toUpperCase()] || null;
};

/** Normaliza variantes históricas del nombre de modelo (p. ej. `CausasSegSoc` → `CausasSegSocial`) */
export const normalizeCausaType = (causaType: string | null | undefined): string | null => {
	if (!causaType) return null;
	if (causaType === "CausasSegSoc") return "CausasSegSocial";
	return causaType;
};

export type CoveragePendienteEstado = "pendiente" | "sin_pdf" | "needs_ocr" | "failed" | "failed_definitivo";

export interface CoveragePendiente {
	id: string;
	fecha: string | null;
	firstSeenAt: string | null;
	tipo: string | null;
	detalle: string | null;
	categoria: CoverageCategoriaKey | string;
	estado: CoveragePendienteEstado;
	motivo: string | null;
	pdfBytes: number | null;
	/** true si la etapa RAG que procesa esta categoría está apagada */
	ragApagado: boolean;
}

interface CoverageMeta {
	success: boolean;
	computedAt: string;
	thresholds: Record<string, number>;
	ragApagado: string[];
	horasNuevo: number;
}

export interface CausasCoverageBatchResponse extends CoverageMeta {
	data: Record<string, CausaCoverage>;
}

export interface CausaCoveragePendientesResponse extends CoverageMeta {
	cobertura: CausaCoverage;
	/** Movimientos totales de la causa */
	total: number;
	pendientes: CoveragePendiente[];
}

/** Tope de ids por request del backend */
export const COVERAGE_BATCH_MAX = 50;
/** Por encima de esta cantidad se usa POST (la query string de GET queda larga) */
const GET_MAX_IDS = 20;

class CausasCoverageService {
	/**
	 * Cobertura por lote de causas. Filtra ids vacíos y duplicados, parte en
	 * grupos de 50 y devuelve el mapa `causaId → CausaCoverage` consolidado.
	 */
	async getBatch(causaIds: string[]): Promise<Record<string, CausaCoverage>> {
		const ids = Array.from(new Set(causaIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)));
		if (ids.length === 0) return {};

		const chunks: string[][] = [];
		for (let i = 0; i < ids.length; i += COVERAGE_BATCH_MAX) {
			chunks.push(ids.slice(i, i + COVERAGE_BATCH_MAX));
		}

		const results = await Promise.all(
			chunks.map(async (chunk) => {
				const response =
					chunk.length > GET_MAX_IDS
						? await adminAxios.post<CausasCoverageBatchResponse>("/api/causas-coverage", { causaIds: chunk })
						: await adminAxios.get<CausasCoverageBatchResponse>("/api/causas-coverage", { params: { causaIds: chunk.join(",") } });
				return response.data?.data || {};
			}),
		);

		return Object.assign({}, ...results) as Record<string, CausaCoverage>;
	}

	/**
	 * Cobertura de una causa + lista de movimientos sin texto (fecha desc).
	 */
	async getPendientes(causaId: string, limit = 500): Promise<CausaCoveragePendientesResponse> {
		const response = await adminAxios.get<CausaCoveragePendientesResponse>(`/api/causas-coverage/${causaId}/pendientes`, {
			params: { limit },
		});
		return response.data;
	}

	/**
	 * Fija (o quita, con `manual: null`) el override manual de prioridad de una causa.
	 * `causaType` es el nombre del modelo PJN (ver `fueroToCausaType` / `normalizeCausaType`).
	 */
	async setPrioridadManual(causaId: string, causaType: string, manual: number | null, nota?: string): Promise<PrioridadMutationResponse> {
		const body: { causaType: string; manual: number | null; nota?: string } = { causaType, manual };
		if (nota && nota.trim().length > 0) body.nota = nota.trim();
		const response = await adminAxios.patch<PrioridadMutationResponse>(`/api/causas-coverage/${causaId}/prioridad`, body);
		return response.data;
	}

	/** Recalcula la prioridad automática de una causa ahora (sin esperar al cron horario). */
	async recomputePrioridad(causaId: string, causaType: string): Promise<PrioridadMutationResponse> {
		const response = await adminAxios.post<PrioridadMutationResponse>(`/api/causas-coverage/${causaId}/prioridad/recompute`, {
			causaType,
		});
		return response.data;
	}
}

export default new CausasCoverageService();
