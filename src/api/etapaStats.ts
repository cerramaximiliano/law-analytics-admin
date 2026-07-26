import pjnAxios from "utils/pjnAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type TipoResumen =
	| "duracion-fuero-etapa"
	| "duracion-objeto-etapa"
	| "duracion-juzgado-etapa"
	| "duracion-sala-etapa"
	| "transicion"
	| "resultado";

export interface ResumenDuracion {
	_id: string;
	tipo: TipoResumen;
	fuero: string;
	etapa?: string;
	objeto?: string;
	juzgado?: number;
	sala?: number;
	// transicion
	etapaSiguiente?: string;
	diasMean?: number;
	// resultado
	resultado?: string;
	detalle?: string;
	diasTotalesMean?: number;
	diasHastaSentenciaMean?: number;
	// duración
	n: number;
	mean?: number;
	min?: number;
	max?: number;
	p25?: number;
	p50?: number;
	p75?: number;
	p90?: number;
	updatedAt?: string;
}

export interface FiltrosEtapaStats {
	fueros: string[];
	etapas: string[];
	objetos: string[];
	juzgados: number[];
	salas: number[];
	etiquetas: Record<string, string>;
}

export interface SegmentoEtapa {
	etapa: string;
	rank: number;
	desde?: string | null;
	hasta?: string | null;
	dias?: number | null;
	retroceso?: boolean;
}

export interface EtapaProcesalDoc {
	familia?: string;
	etapaActual?: string | null;
	rankActual?: number | null;
	fase?: string | null;
	terminal?: boolean | null;
	resultado?: { etapa: string; detalle: string } | null;
	paralizado?: boolean | null;
	timeline?: SegmentoEtapa[];
	suspensiones?: { desde?: string | null; hasta?: string | null }[];
	asOf?: string | null;
	confianza?: number;
	version?: number;
	computedAt?: string;
}

export interface CausaConEtapa {
	_id: string;
	caratula?: string;
	number?: number;
	year?: number;
	objeto?: string;
	fuero: string;
	juzgado?: number;
	sala?: number;
	movimientosCount?: number;
	fechaUltimoMovimiento?: string;
	etapaProcesal?: EtapaProcesalDoc;
}

export interface CausasEtapaResponse {
	success: boolean;
	count: number;
	pagination: { currentPage: number; totalPages: number; limit: number; hasNextPage: boolean; hasPrevPage: boolean };
	data: CausaConEtapa[];
}

export interface CausaContexto {
	causa: CausaConEtapa;
	etiquetas: Record<string, string>;
	referencia: {
		porEtapa: ResumenDuracion[];
		porObjeto: ResumenDuracion[];
		porJuzgado: ResumenDuracion[];
		porSala: ResumenDuracion[];
	};
	transiciones: ResumenDuracion[];
	resultados: ResumenDuracion[];
}

const BASE = "/api/admin/etapa-stats";

const EtapaStatsService = {
	async resumen(params: {
		tipo: TipoResumen;
		fuero?: string;
		objeto?: string;
		juzgado?: number | string;
		sala?: number | string;
		etapa?: string;
		limit?: number;
	}): Promise<{ success: boolean; count: number; updatedAt: string | null; data: ResumenDuracion[] }> {
		const res = await pjnAxios.get(`${BASE}/resumen`, { params });
		return res.data;
	},
	async filtros(fuero?: string): Promise<{ success: boolean; data: FiltrosEtapaStats }> {
		const res = await pjnAxios.get(`${BASE}/filtros`, { params: { fuero } });
		return res.data;
	},
	async causas(params: {
		fuero: string;
		etapaActual?: string;
		fase?: string;
		search?: string;
		page?: number;
		limit?: number;
	}): Promise<CausasEtapaResponse> {
		const res = await pjnAxios.get(`${BASE}/causas`, { params });
		return res.data;
	},
	async causaContext(causaType: string, id: string): Promise<{ success: boolean; data: CausaContexto }> {
		const res = await pjnAxios.get(`${BASE}/causa/${causaType}/${id}`);
		return res.data;
	},
};

export default EtapaStatsService;
