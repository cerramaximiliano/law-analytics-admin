import workersAxios from "utils/workersAxios";

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type EstadoAnotacion = "pendiente" | "en_progreso" | "anotada" | "verificada" | "descartada";

export interface Decision {
	objetoDecidido: string; // ej. "recurso_apelacion", "medida_cautelar", "costas"
	resultado: string | null;
}

export interface Plazo {
	cantidad: number | null;
	unidad: "dias" | "horas" | "meses";
	tipo: "procesales" | "corridos";
}

// Taxonomía v2 (2026-07-31): tipo preciso, instancia por metadatos, objeto
// triseccionado (materia × contexto × función), firmeza como estado aparte,
// acto procesal accionable, decisiones multivaluadas y bloque acto completo.
export interface AnotacionMovimiento {
	tipoResolucion?: string | null;
	instancia?: string | null;
	materia?: string | null;
	contexto?: string | null;
	funcion?: string | null;
	modoTerminacion?: string | null; // solo si funcion=terminacion
	estadoImpugnatorio?: string | null;
	actoProcesal?: string | null;
	resultado?: string | null; // resultado de la decisión principal
	decisiones?: Decision[]; // disposiciones múltiples
	destinatario?: string[];
	accionRequerida?: string;
	plazo?: Plazo | null;
	apercibimiento?: string;
	etiqueta?: string; // etapa/hito final sugerida (texto libre corto)
	replicaDe?: number | null; // idx del movimiento del que este es réplica
	descartar?: boolean;
	notas?: string;
}

export interface ItemCola {
	_id: string;
	fuero: string;
	causaType: string;
	causaId: string;
	number: number;
	year: number;
	caratula?: string;
	objeto?: string;
	juzgado?: number;
	sala?: number;
	motivo: string;
	prioridad: number;
	estado: EstadoAnotacion;
	notasCausa?: string;
	movimientosAnotados: number;
	createdAt?: string;
	updatedAt?: string;
}

export interface CorpusEstado {
	pdf: string | null; // pdfStatus del PjnMovement (downloaded, pending, failed…)
	texto: string | null; // textoStatus (extracted, needs_ocr, not_applicable…)
}

export interface MovimientoAnotable {
	idx: number;
	fecha: string;
	dia: string | null;
	tipo: string;
	detalle: string;
	url: string | null;
	etiquetaDebil: string | null;
	corpus: CorpusEstado | null;
}

export interface CuerpoOnDemand {
	fuente: "cache" | "sentencias-capturadas" | "descarga";
	caracteres: number;
	encabezado: string;
	dispositiva: string;
	tieneDispositiva: boolean;
	colaTexto: string | null;
}

export interface CuerpoSegmentado {
	url: string;
	dia: string | null;
	detalle: string;
	caracteres: number;
	encabezado: string;
	dispositiva: string;
	tieneDispositiva: boolean;
	colaTexto: string | null;
}

export interface CausaParaAnotar {
	success: boolean;
	causa: {
		fuero: string;
		causaType: string;
		id: string;
		number: number;
		year: number;
		caratula?: string;
		objeto?: string;
		juzgado?: number;
		sala?: number;
		etapaActual?: string;
		familia?: string;
		timeline: { etapa: string; desde?: string; hasta?: string; dias?: number }[];
		hitos: { tipo: string; fecha?: string; detalle?: string }[];
	};
	movimientos: MovimientoAnotable[];
	cuerpos: CuerpoSegmentado[];
	anotacion: (ItemCola & { anotaciones: Record<string, AnotacionMovimiento> }) | null;
	dimensiones: Record<string, string[]>;
	cuerposDisponibles: boolean;
}

// ── Servicio ───────────────────────────────────────────────────────────────────

export class EtapaAnotacionesService {
	static async getCola(params?: { estado?: string; fuero?: string; motivo?: string; page?: number; limit?: number }) {
		const { data } = await workersAxios.get("/api/admin/etapa-anotaciones", { params });
		return data as {
			success: boolean;
			items: ItemCola[];
			total: number;
			porEstado: Record<string, number>;
			dimensiones: Record<string, string[]>;
		};
	}

	static async getMembership(ids: string[], fuero?: string) {
		if (!ids.length) return {} as Record<string, { estado: EstadoAnotacion; motivo: string }>;
		const { data } = await workersAxios.get("/api/admin/etapa-anotaciones/membership", {
			params: { ids: ids.join(","), fuero },
		});
		return (data.membership || {}) as Record<string, { estado: EstadoAnotacion; motivo: string }>;
	}

	static async getCausa(fuero: string, id: string) {
		const { data } = await workersAxios.get(`/api/admin/etapa-anotaciones/causa/${fuero}/${id}`);
		return data as CausaParaAnotar;
	}

	static async agregarACola(fuero: string, id: string, motivo = "manual", prioridad = 2) {
		const { data } = await workersAxios.post(`/api/admin/etapa-anotaciones/causa/${fuero}/${id}`, { motivo, prioridad });
		return data as { success: boolean; creado: boolean };
	}

	static async guardar(
		fuero: string,
		id: string,
		payload: {
			anotaciones?: Record<string, AnotacionMovimiento | null>;
			notasCausa?: string;
			estado?: EstadoAnotacion;
			limpiarTodo?: boolean;
		},
	) {
		const { data } = await workersAxios.put(`/api/admin/etapa-anotaciones/causa/${fuero}/${id}`, payload);
		return data as { success: boolean };
	}

	static async getCuerpo(fuero: string, id: string, idx: number) {
		const { data } = await workersAxios.get(`/api/admin/etapa-anotaciones/cuerpo/${fuero}/${id}/${idx}`);
		return data as { success: boolean; cuerpo: CuerpoOnDemand };
	}

	static async quitar(fuero: string, id: string) {
		const { data } = await workersAxios.delete(`/api/admin/etapa-anotaciones/causa/${fuero}/${id}`);
		return data as { success: boolean };
	}
}

export default EtapaAnotacionesService;
