/**
 * Estado del circuito "Presentaciones del letrado" (pjn-bandeja-sync + pjn-actos-letrado).
 * Solo lectura: admin-api GET /api/actos-letrado/estado.
 */
import adminAxios from "utils/adminAxios";

export interface CorridaDia {
	dia: string;
	parcial?: boolean;
	lectura: { corridas: number; esperadas: number; credFallidas: number; actosFallidas: number; nuevos: number; msMax: number };
	recalculo: {
		corridas: number;
		esperadas: number;
		fallidas?: number;
		nuevosMatch: number;
		choques: number;
		carpetasCambiadas: number;
		msMax: number;
	};
	leidos: { escrito: number; cedula: number; deox: number };
	vinculados: { escrito: number; cedula: number; deox: number };
}

export interface Corrida {
	_id: string;
	proceso: "lectura" | "recalculo";
	inicio: string;
	fin: string;
	ms: number;
	ok: boolean;
	error?: string;
	manual?: boolean;
	backfillLogs?: boolean;
	// lectura
	procesadas?: number;
	errores?: number;
	excluidas?: number;
	sinBandeja?: number;
	fallidas?: { credentialsId: string; code: string | null; error: string }[];
	actos?: { credenciales: number; ok: number; fallidas: number; nuevos: number; total: number; matcheado: number; pendiente: number; errores: number } | null;
	// recálculo
	credenciales?: number;
	revisados?: number;
	nuevosMatch?: number;
	choques?: number;
	carpetasCambiadas?: number;
	carpetasRecalculadas?: number;
}

export interface CredencialEstado {
	credentialsId: string;
	email: string | null;
	perfil: string | null;
	lastRunAt: string | null;
	consecutiveErrors: number;
	excludedUntil: string | null;
	excludedReason: string | null;
	lastError: { code: string; message: string; timestamp: string } | null;
	actosBackfillAt: string | null;
	actosLeidoHasta: string | null;
	actosLast: {
		at: string;
		ok: boolean;
		backfill: boolean;
		completo?: boolean;
		total: number;
		nuevos: number;
		matcheado: number;
		pendiente: number;
		sin_causa: number;
		errores: Record<string, unknown> | null;
		ms: number;
	} | null;
	actos: number;
	ultimoActo: string | null;
	carpetas: { activas: number; conFecha: number; soloSinConfirmar: number };
	widgetVisible: boolean;
}

export interface Alerta {
	nivel: "error" | "warning" | "info";
	codigo: string;
	texto: string;
	dia?: string;
	credentialsId?: string;
}

export interface TotalesTipo {
	total: number;
	matcheado: number;
	pendiente: number;
	sin_causa: number;
	invalidos: number;
}

export interface EstadoActosLetrado {
	ahora: string;
	dias: number;
	config: { lecturaActos: boolean; backfill: boolean; bandejaSync: boolean; cron: { lectura: string; recalculo: string } };
	ultima: { lectura: Corrida | null; recalculo: Corrida | null };
	porDia: CorridaDia[];
	corridas: Corrida[];
	totales: Record<"escrito" | "cedula" | "deox", TotalesTipo>;
	pendientes: { porEdad: Record<string, number>; total: number; sinAceptacionViejos: number };
	demora: { n: number; mediana: number | null; p90: number | null };
	credenciales: CredencialEstado[];
	cobertura: {
		credenciales: number;
		usuariosConBandeja: number;
		usuariosWidget: number;
		activas: number;
		conFecha: number;
		soloSinConfirmar: number;
	};
	alertas: Alerta[];
}

export const ActosLetradoService = {
	async getEstado(dias = 14, fresh = false): Promise<EstadoActosLetrado> {
		const response = await adminAxios.get("/api/actos-letrado/estado", { params: { dias, ...(fresh ? { fresh: 1 } : {}) } });
		return response.data?.data;
	},
};

export default ActosLetradoService;
