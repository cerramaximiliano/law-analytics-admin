import ragAxios from "utils/ragAxios";

/**
 * Revisión manual de sellos del oficial notificador (protocolo cerrado, v1).
 * Las etiquetas quedan en rs0 rag-revision-manual: verdad de referencia para evaluar la lectura
 * y ejemplos para entrenar un modelo propio.
 */

export type Familia = "estandar" | "informe_libre" | "mandamiento" | "otro";
export type Accion =
	| "entrega"
	| "aviso"
	| "fijacion"
	| "bajo_responsabilidad"
	| "negativa"
	| "devolucion"
	| "intimacion"
	| "embargo"
	| "constatacion"
	| "otro";
export type EstadoDoc = "diligenciada" | "devuelta_sin_diligenciar" | "en_blanco" | "no_es_notificacion";
export type Resultado = "positiva" | "negativa" | "sin_diligenciar" | "indeterminado" | "en_blanco";

// Frases del sello estándar que se pueden tachar (lista cerrada del protocolo).
export const FRASES_TACHABLES = [
	"una persona que dijo ser",
	"aquel vive allí",
	"procedí a notificarle",
	"haciéndole entrega de",
	"duplicado de igual tenor",
	"previa lectura",
	"recibiéndose de ello",
	"firmó",
] as const;

export interface CamposSello {
	fecha: string | null;
	fechaFuente: "fechador" | "manuscrito" | "impreso" | null;
	hora: string | null;
	respondieron: boolean | null;
	vive: boolean | null;
	firmo: boolean | null;
	copia: "con" | "sin" | null;
	accion: Accion | null;
	entregaTachada: boolean | null;
	atendio: string | null;
	motivo: string | null;
	observacion: string | null;
	oficial: string | null;
	avisoPara: { fecha: string | null; hora: string | null } | null;
	noSeLee: string[];
}

export interface SelloEtiqueta {
	pagina: number | null;
	recuadro: [number, number, number, number] | null;
	familia: Familia | null;
	anulado: boolean;
	campos: CamposSello;
	frasesTachadas: string[];
}

export interface Etiqueta {
	_id?: string;
	estado: EstadoDoc;
	instrumento: "cedula" | "mandamiento" | "otro" | null;
	sellos: SelloEtiqueta[];
	resultadoCalculado: Resultado;
	resultadoConfirmado: boolean;
	resultadoCorrecto?: Resultado | null;
	nota?: string | null;
	lote?: string | null;
	fuente?: string;
	revisadoPor?: string | null;
	actualizadoAt?: string;
}

export interface LoteResumen {
	id: string;
	descripcion: string;
	creado: string;
	total: number;
	etiquetados: number;
}

export interface CasoLote {
	id: string;
	motivo: "a revisar" | "azar" | string;
	fuero: string | null;
	clase?: string;
	leido: string | null;
	etiquetado: boolean;
	actualizadoAt?: string;
	confirmado: boolean | null;
}

const RagRevisionService = {
	async lotes(): Promise<LoteResumen[]> {
		const r = await ragAxios.get("/rag/admin/extraccion/revision/lotes");
		return r.data.data;
	},
	async lote(id: string): Promise<{ id: string; descripcion: string; creado: string; casos: CasoLote[] }> {
		const r = await ragAxios.get(`/rag/admin/extraccion/revision/lotes/${encodeURIComponent(id)}`);
		return r.data.data;
	},
	async etiqueta(id: string): Promise<Etiqueta | null> {
		const r = await ragAxios.get(`/rag/admin/extraccion/revision/etiquetas/${encodeURIComponent(id)}`);
		return r.data.data;
	},
	async guardar(id: string, e: Etiqueta): Promise<Etiqueta> {
		const r = await ragAxios.put(`/rag/admin/extraccion/revision/etiquetas/${encodeURIComponent(id)}`, e);
		return r.data.data;
	},
};

/**
 * Resultado desde los campos (mismas reglas que resultadoDesdeCampos de pjn-rag-shared): decide el
 * último sello vigente (no anulado) por fecha y hora. Un aviso solo no cierra la diligencia.
 */
const RE_NEGATIVA =
	/inexistente|no\s+existe|no\s+vive|se\s+mud[oó]|desconocid|no\s+(?:se\s+)?(?:observa|encuentra|ubica)\s+(?:el\s+)?(?:n[uú]mero|domicilio|altura)|numeraci[oó]n/i;
export function resultadoDesdeEtiqueta(estado: EstadoDoc, sellos: SelloEtiqueta[]): Resultado {
	if (estado === "en_blanco") return "en_blanco";
	const vigentes = sellos.map((s, i) => ({ s, i })).filter(({ s }) => !s.anulado && s.campos.accion);
	if (!vigentes.length) return estado === "devuelta_sin_diligenciar" ? "sin_diligenciar" : "indeterminado";
	const clave = ({ s, i }: { s: SelloEtiqueta; i: number }) =>
		`${s.campos.fecha || ""}${s.campos.hora || ""}#${String(i).padStart(3, "0")}`;
	const { s } = vigentes.sort((a, b) => (a.s.campos.fecha && b.s.campos.fecha ? clave(a).localeCompare(clave(b)) : a.i - b.i)).pop()!;
	const c = s.campos;
	const tachada =
		c.entregaTachada === true || s.frasesTachadas.includes("procedí a notificarle") || s.frasesTachadas.includes("haciéndole entrega de");
	switch (c.accion) {
		case "entrega":
			return tachada || c.vive === false ? "negativa" : "positiva";
		case "fijacion":
		case "bajo_responsabilidad":
		case "intimacion":
		case "embargo":
		case "constatacion":
			return "positiva";
		case "negativa":
			return "negativa";
		case "devolucion":
			return RE_NEGATIVA.test(`${c.motivo || ""} ${c.observacion || ""}`) || c.vive === false ? "negativa" : "sin_diligenciar";
		default:
			return "indeterminado";
	}
}

export default RagRevisionService;
