/**
 * Ciclo de actualización por clases y franjas (pjn-mis-causas · private-causas-update).
 * Backend: admin-api /api/causas-update/ciclo. Diseño: pjn-mis-causas/docs/ciclo-de-franjas.md.
 */
import adminAxios from "utils/adminAxios";

export type EstadoCarpeta = "seguimiento" | "activa" | "archivada" | "ninguna" | "cualquiera";

export interface Rango {
	min?: number | null;
	max?: number | null;
}

export interface ReglaClase {
	carpeta?: EstadoCarpeta | EstadoCarpeta[];
	ultimoMovimientoDias?: Rango;
	movimientosCount?: Rango;
	fueros?: string[];
	credenciales?: string[];
}

export interface ClaseCiclo {
	id: string;
	nombre: string;
	orden: number;
	activa: boolean;
	regla: ReglaClase;
	franjas: string[];
}

export interface CapacidadCiclo {
	horaCorte: string;
	margenMin: number;
	overheadSegPorCorrida: number;
	segPorCausaManual: number | null;
	ritmoDias: number;
	boxLoadMax: number;
	boxRamLibreMinGb: number;
}

export interface InicialCiclo {
	separado: boolean;
	carrilesNoche: number;
	carrilesDia: number;
	carrilesDiaCargado: number;
}

export interface CicloConfig {
	enabled: boolean;
	timezone: string;
	dias: number[];
	minutosMinEntreLecturas: number;
	reclasificarCadaMin: number;
	claseDefault: string;
	clases: ClaseCiclo[];
	inicial?: InicialCiclo;
	capacidad: CapacidadCiclo;
}

export interface FranjaProyectada {
	franja: string;
	at: string;
	clases: string[];
	causas: number;
	trabajoMin: number;
	duracionMin: number;
	inicioAt: string;
	finAt: string;
	ocupacion: number | null;
	estado: "verde" | "amarillo" | "rojo";
	dominante: "credencial" | "total";
	credencialMax: { id: string; causas: number; min: number } | null;
}

export interface CicloEstado {
	enabled: boolean;
	updatedAt: string;
	franjaActual?: string | null;
	pendientes?: number;
	box?: { load1: number; ramLibreGb: number };
	porClase?: Record<string, number>;
	totalCausas?: number;
	ritmo?: { global: number; manual: boolean; credenciales: number };
	proyeccion?: { dia: string; corte: string; instancias: number; carriles: number; franjas: FranjaProyectada[] };
	alertas?: { type: string; message: string }[];
	ultimaReclasificacionAt?: string;
}

export interface FranjaEjecutada {
	_id: string;
	dia: string;
	franja: string;
	inicioAt: string;
	finAt?: string;
	estado: "en-curso" | "cerrada";
	cerradaPor?: "vaciada" | "siguiente-franja";
	planificadas: number;
	pendientes?: number;
	procesadas?: number;
	errores?: number;
	newMovimientos?: number;
	corridas?: number;
	duracionSeg?: number;
	segPorCausa?: number | null;
	incumplida?: boolean;
	clases: string[];
	box?: { load1Max?: number; ramLibreMinGb?: number };
}

export interface CicloResponse {
	ciclo: CicloConfig;
	guardado: boolean;
	updatedAt: string | null;
	updatedBy: string | null;
	estado: CicloEstado | null;
	franjas: FranjaEjecutada[];
}

export class CausasUpdateCicloService {
	static async get(): Promise<CicloResponse> {
		const response = await adminAxios.get("/api/causas-update/ciclo", { params: { franjas: 40 } });
		return response.data.data;
	}

	static async save(ciclo: CicloConfig): Promise<{ message: string; ciclo: CicloConfig }> {
		const response = await adminAxios.put("/api/causas-update/ciclo", ciclo);
		return { message: response.data.message, ciclo: response.data.data.ciclo };
	}
}
