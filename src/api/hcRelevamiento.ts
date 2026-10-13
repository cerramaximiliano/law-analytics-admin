// Relevamiento del haber de caja (pjn-liquidacion-worker/scripts/hc-relevamiento.js, cron horario en worker_02).
// Endpoints en pjn-api (/api/hc-relevamiento) servidos por pjn/cache-api contra el rs0 (VITE_WORKERS_URL).
import workersAxios from "utils/workersAxios";

export type EstadoCaso =
	| "cerrado"
	| "explicado"
	| "insumo"
	| "abierto"
	| "sentencia"
	| "descartado"
	| "fuera_de_alcance"
	| "error_motor"
	| "sin_comparables";

export type EstadoRevision = "pendiente" | "corregida" | "validada" | "descartada";

export type MotivoRevision =
	| "fad_no_leida"
	| "fecha_invalida"
	| "sin_tiempos"
	| "tiempos_inconsistentes"
	| "filas_ocr"
	| "moratoria_no_capturada"
	| "calidad_ocr";

export const MOTIVO_LABEL: Record<MotivoRevision, string> = {
	fad_no_leida: "FAD no leída",
	fecha_invalida: "Fecha inválida",
	sin_tiempos: "Sin tiempos de servicio",
	tiempos_inconsistentes: "Tiempos que no suman el total",
	filas_ocr: "Filas de remuneraciones",
	moratoria_no_capturada: "Moratoria no capturada",
	calidad_ocr: "Lectura dudosa (abierto)",
};

export const ESTADO_LABEL: Record<EstadoCaso, string> = {
	cerrado: "Cerrado",
	explicado: "Explicado",
	insumo: "Insumo",
	abierto: "Abierto",
	sentencia: "Sentencia",
	descartado: "Descartado",
	fuera_de_alcance: "Fuera de alcance",
	error_motor: "Error del motor",
	sin_comparables: "Sin comparables",
};

export const COMPONENTES = ["sumatoria", "W", "R", "PBU", "PC", "PAP"] as const;
export type Componente = (typeof COMPONENTES)[number];

export interface ComponenteEval {
	e: number | null;
	estado: "ok" | "explicado" | "insumo" | "abierto" | "sin_dato" | "sentencia";
	nota?: string;
	regla?: string;
	valor?: unknown;
}

export interface Desvio {
	componente: string;
	regla: string;
	valor: unknown;
}

export interface RevisionEval {
	requerida: boolean;
	motivos: MotivoRevision[];
	detalle?: { filasLeidas: number | null; filasEsperadas: number | null; huecos: number; dudosas: number; difSumaDep: number | null };
	estado: EstadoRevision | null;
	actualizadoEn: string | null;
}

export interface Impresos {
	W?: number | null;
	R?: number | null;
	sumatoria?: number | null;
	sumatoriaDep?: number | null;
	PBU?: number | null;
	PC?: number | null;
	PAP?: number | null;
	periodoDep?: { desde: string | null; hasta: string | null };
}

export interface CasoListItem {
	_id: string;
	fuente: "detalleBeneficio" | "sica";
	fadMes: string | null;
	estado: EstadoCaso;
	estadoReferencia?: EstadoCaso;
	pension?: boolean;
	moratoria?: boolean;
	calidadOk?: boolean;
	causaYear?: number;
	componentes: Partial<Record<Componente, ComponenteEval>>;
	desvios: Desvio[];
	causas: string[];
	revision?: RevisionEval;
	impresos?: Impresos;
	recalculos?: string[];
	evaluadoEn?: string;
	versionHub?: string;
}

export interface CasosParams {
	fuente?: "detalleBeneficio" | "sica" | "todas";
	estado?: string;
	revision?: "requerida" | "revisada";
	motivo?: MotivoRevision;
	regla?: string;
	componente?: Componente;
	componenteEstado?: string;
	page?: number;
	limit?: number;
}

export interface CasosResponse {
	docs: CasoListItem[];
	total: number;
	page: number;
	limit: number;
	pages: number;
}

export interface Tiempo {
	a: number;
	m: number;
	d: number;
}
export interface TiemposTramo {
	dep: Tiempo | null;
	aut: Tiempo | null;
	sim: Tiempo | null;
}
export interface Tiempos {
	antes?: TiemposTramo;
	despues?: TiemposTramo;
	total?: Tiempo | null;
}

export interface FilaPrpa {
	periodo: string;
	desde?: string;
	hasta?: string;
	meses?: number;
	moneda?: string;
	importe: number;
	actualizado?: number;
	pagina?: number;
	dudosa?: boolean;
	crudo?: string;
}

export interface PrpaDetalle {
	_id: string;
	fuente: string;
	fechas?: Record<string, string | null>;
	impresos?: Impresos & Record<string, unknown>;
	tiempos?: { informado?: Tiempos; tomado?: Tiempos };
	prpa?: FilaPrpa[];
	prpaMeses?: number;
	calidad?: {
		ok?: boolean;
		controles?: Record<string, any>;
		advertencias?: string[];
	};
	moratoria?: boolean;
	tipoPrestacion?: string;
	url?: string;
	causaNumber?: number;
	causaYear?: number;
	fuero?: string;
	movFecha?: string;
	extraidoEn?: string;
	ocr?: { paginas: number };
}

export interface Correcciones {
	fechas?: Partial<Record<"fad" | "cese" | "solicitud" | "alta" | "acuerdo", string>>;
	impresos?: Partial<Record<"W" | "R" | "sumatoriaDep" | "PBU" | "PC" | "PAP", number | null>>;
	periodoDep?: { desde: string; hasta: string };
	tiempos?: Tiempos;
	filas?: { periodo: string; importe: number; moneda?: string; hasta?: string; meses?: number }[];
	moratoria?: boolean;
}

export interface RevisionDoc {
	_id: string;
	estado: EstadoRevision;
	correcciones: Correcciones | null;
	nota: string | null;
	revisadoPor: string | null;
	actualizadoEn: string;
	creadoEn?: string;
	historial?: { estado: EstadoRevision; nota: string | null; por: string | null; en: string }[];
}

export interface CasoDetalle {
	evaluacion: CasoListItem | null;
	prpa: PrpaDetalle | null;
	revision: RevisionDoc | null;
}

export interface Regla {
	id: string;
	nombre: string;
	norma: string;
	normaConfirmada: boolean;
	opcion: string;
	anses: string;
}

export interface PasadaResumen {
	_id: string;
	evaluados: number;
	nuevos: number;
	totalPrpa: number;
	porEstado: Record<string, number>;
	revision?: { requerida: number; porMotivo: Record<string, number> };
	segundos: number;
	versionHub: string | null;
	motorVersion: string;
}

export interface ResumenResponse {
	ultima: (PasadaResumen & { acumulado?: Record<string, number>; desviosAcumulados?: Record<string, number>; reglas?: Regla[] }) | null;
	historial: PasadaResumen[];
	estados: Record<string, number>;
	revision: { requerida: number; revisadas: number; porMotivo: Record<string, number>; porEstado: Record<string, number> };
	reglas: Regla[];
}

export interface DesviosResponse {
	desvios: { regla: string; valor: unknown; n: number; casos: string[] }[];
	abiertos: { componente: string; conMotivoOcr: boolean; n: number }[];
}

const BASE = "/api/hc-relevamiento";

const HcRelevamientoService = {
	async getResumen(historial = 48): Promise<ResumenResponse> {
		const res = await workersAxios.get<{ success: boolean; data: ResumenResponse }>(`${BASE}/resumen`, { params: { historial } });
		return res.data.data;
	},

	async listCasos(params: CasosParams = {}): Promise<CasosResponse> {
		const res = await workersAxios.get<{ success: boolean; data: CasosResponse }>(`${BASE}/casos`, { params });
		return res.data.data;
	},

	async getCaso(id: string): Promise<CasoDetalle> {
		const res = await workersAxios.get<{ success: boolean; data: CasoDetalle }>(`${BASE}/casos/${id}`);
		return res.data.data;
	},

	async guardarRevision(
		id: string,
		body: { estado: EstadoRevision; correcciones?: Correcciones; nota?: string },
	): Promise<RevisionDoc | null> {
		const res = await workersAxios.put<{ success: boolean; data: RevisionDoc | null }>(`${BASE}/casos/${id}/revision`, body);
		return res.data.data;
	},

	async getDesvios(): Promise<DesviosResponse> {
		const res = await workersAxios.get<{ success: boolean; data: DesviosResponse }>(`${BASE}/desvios`);
		return res.data.data;
	},
};

export default HcRelevamientoService;
