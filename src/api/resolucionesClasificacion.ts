import workersAxios from "utils/workersAxios";

// Cola de clasificación ligera de resoluciones (clasificador de plazos,
// repo pjn-clasificador-resoluciones). Backend: pjn-api (cache-api, rs0)
// `/api/admin/resoluciones-clasificacion`.

export type EstadoItem = "pendiente" | "anotada" | "descartada";
export type FuenteItem = "oof" | "baja_confianza" | "manual" | "cedula";
export type TipoResolucion =
	| "providencia_simple"
	| "sentencia_interlocutoria"
	| "sentencia_definitiva"
	| "sentencia_homologatoria"
	| "acta"
	| "otra_resolucion"
	| "no_es_resolucion";
export type Ordena = "traslado" | "vista" | "intimacion";

export const TIPOS: { value: TipoResolucion; label: string; tecla: string; ayuda: string }[] = [
	{
		value: "providencia_simple",
		label: "Providencia simple",
		tecla: "1",
		ayuda: "Impulsa u ordena trámite sin sustanciación (art. 160 CPCCN). Revocatoria 3 días.",
	},
	{
		value: "sentencia_interlocutoria",
		label: "Sent. interlocutoria",
		tecla: "2",
		ayuda: "Resuelve una cuestión sustanciada o que exige fundamentos (art. 161). Apelación 5 días.",
	},
	{ value: "sentencia_definitiva", label: "Sent. definitiva", tecla: "3", ayuda: "Decide el fondo y termina el proceso o la instancia." },
	{ value: "sentencia_homologatoria", label: "Sent. homologatoria", tecla: "4", ayuda: "Homologa un acuerdo, conciliación o transacción." },
	{ value: "acta", label: "Acta de audiencia", tecla: "5", ayuda: "Acta de audiencia o de comparecencia; no es una resolución." },
	{
		value: "otra_resolucion",
		label: "Otra resolución",
		tecla: "6",
		ayuda: "Resolución que no encaja en las anteriores (acordada, oficio con decisión, etc.).",
	},
	{
		value: "no_es_resolucion",
		label: "No es resolución",
		tecla: "7",
		ayuda: "Constancia, certificación, cédula, oficio, escrito de parte u otro documento sin decisión.",
	},
];
export const ORDENA_OPCIONES: { value: Ordena; label: string; tecla: string }[] = [
	{ value: "traslado", label: "Corre traslado", tecla: "T" },
	{ value: "vista", label: "Da vista", tecla: "V" },
	{ value: "intimacion", label: "Intima", tecla: "I" },
];

export interface Prediccion {
	version: string;
	tipo: TipoResolucion | string;
	confianza: number;
	probs?: Record<string, number>;
	regulaHonorarios?: { valor: boolean; p: number };
	ordena?: Record<Ordena, number>;
}
export interface Anotacion {
	tipoResolucion?: TipoResolucion;
	regulaHonorarios?: boolean;
	ordena?: Ordena[];
	notas?: string;
}
export interface Cuerpo {
	caracteres: number;
	completo: string | null;
	encabezado: string | null;
	dispositiva: string | null;
	tieneDispositiva: boolean;
	colaTexto: string | null;
}
export interface ItemResolucion {
	_id: string;
	fuente: FuenteItem;
	modeloVersion?: string | null;
	fuero: string;
	causaType: string;
	causaId: string;
	idx: number;
	url?: string | null;
	fecha?: string;
	titulo: string;
	previo?: string;
	siguiente?: string;
	objeto?: string;
	caratula?: string | null;
	number?: number;
	year?: number;
	chars?: number;
	textoFuente?: string;
	prediccion: Prediccion | null;
	gold: { tipoResolucion?: string; regulaHonorarios?: boolean; ordena?: Ordena[] } | null;
	anotacion: Anotacion | null;
	estado: EstadoItem;
	prioridad: number;
	anotadoPor?: string | null;
	anotadoAt?: string | null;
	createdAt?: string;
	cuerpo?: Cuerpo;
}
export interface FiltrosCola {
	estado?: string;
	fuero?: string;
	fuente?: string;
	tipoPred?: string;
	confMax?: number | string;
	confMin?: number | string;
	desacuerdo?: "1";
	q?: string;
	orden?: "confianza" | "reciente" | "anotacion";
}
export interface Stats {
	porEstado: Record<string, number>;
	porFuente: Record<string, number>;
	porFuero: { fuero: string; estado: string; n: number }[];
	acuerdo: {
		anotadas: number;
		iguales: number;
		pct: number | null;
		confusion: { pred: string; anotado: string; n: number }[];
		parCaro: { ps_como_interlocutoria: number; interlocutoria_como_ps: number };
	};
	porDia: { dia: string; n: number }[];
	porAnotador: { anotador: string; n: number }[];
	versiones: string[];
}
export interface MovimientoCausa {
	idx: number;
	fecha: string;
	tipo: string;
	detalle: string;
	tieneDoc: boolean;
	judicial: boolean;
	enCola: EstadoItem | null;
}

const BASE = "/api/admin/resoluciones-clasificacion";
const limpiar = (p: object) =>
	Object.fromEntries(
		Object.entries(p as Record<string, unknown>).filter(([, v]) => v !== undefined && v !== "" && v !== "todos" && v !== null),
	);

export class ResolucionesClasificacionService {
	static async getCola(params: FiltrosCola & { page?: number; limit?: number }) {
		const { data } = await workersAxios.get(BASE, { params: limpiar(params) });
		return data as {
			success: boolean;
			items: ItemResolucion[];
			total: number;
			page: number;
			limit: number;
			porEstado: Record<string, number>;
		};
	}
	static async getSiguiente(params: FiltrosCola & { excluir?: string }) {
		const { data } = await workersAxios.get(`${BASE}/siguiente`, { params: limpiar(params) });
		return data as { success: boolean; item: ItemResolucion | null };
	}
	static async getStats() {
		const { data } = await workersAxios.get(`${BASE}/stats`);
		return data as Stats & { success: boolean };
	}
	static async getUno(id: string, completo = false) {
		const { data } = await workersAxios.get(`${BASE}/${id}`, { params: completo ? { completo: "1" } : undefined });
		return data as { success: boolean; item: ItemResolucion };
	}
	static async anotar(id: string, payload: Anotacion & { descartar?: boolean; reabrir?: boolean }) {
		const { data } = await workersAxios.put(`${BASE}/${id}`, payload);
		return data as { success: boolean; item: ItemResolucion };
	}
	static async agregar(payload: { fuero: string; causaId: string; idx?: number; idxs?: number[]; todos?: boolean; prioridad?: number }) {
		const { data } = await workersAxios.post(BASE, payload);
		return data as {
			success: boolean;
			agregados: number;
			resultados: { idx: number; ok: boolean; motivo?: string; _id?: string; chars?: number }[];
		};
	}
	static async getMovimientos(fuero: string, causaId: string) {
		const { data } = await workersAxios.get(`${BASE}/movimientos/${fuero}/${causaId}`);
		return data as {
			success: boolean;
			causa: { caratula?: string; objeto?: string; number?: number; year?: number };
			movimientos: MovimientoCausa[];
		};
	}
	static async quitar(id: string) {
		const { data } = await workersAxios.delete(`${BASE}/${id}`);
		return data as { success: boolean; eliminado: boolean };
	}
}
export default ResolucionesClasificacionService;
