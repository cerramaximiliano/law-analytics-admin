import ragAxios from "utils/ragAxios";

// Extracción de texto y fichas del RAG por causa. Backend: pjn-rag-api /rag/admin/extraccion/*
//   cedulas    → worker pjn-rag-cedulas (cédulas electrónicas: ficha, resolución, adjuntos por remisión)
//   resultados → worker pjn-rag-cedulas-diligenciadas (cédulas/mandamientos en papel que vuelven diligenciados)

export type EtapaExtraccion = "cedulas" | "resultados" | "deo" | "escritos";

export interface ExtraccionResumen {
	etapa: EtapaExtraccion;
	worker: {
		activo: boolean;
		host: string;
		version: string;
		ultimoCicloAt: string;
		ultimoCiclo: Record<string, any>;
		totales: Record<string, number>;
	} | null;
	procesados: {
		porStatus: Record<string, number>;
		porClase: Record<string, number>;
		porFamilia: Record<string, number>;
		porFuero: Record<string, number>;
		vinculadas: number;
		conTranscripcion: number;
		sinVinculoPorMotivo: Record<string, number>;
		porVersion: Record<string, number>;
		revisar: number;
	};
	// pjn-movements (Atlas) de la etapa con PDF descargado, por textoStatus
	atlas: Record<string, number>;
	// cédulas: tramos de adjuntos por método de remisión (sgj / huella / similitud)
	adjuntosPorMetodo?: Record<string, number>;
	// diligenciadas: conteo por clase / resultado / quién la libró, y gasto de visión
	notificaciones?: Array<{ clase?: string; resultado?: string; libradaPor?: string | null; n: number }>;
	vision?: { usd: number; documentos: number };
}

export type MotivoSinVinculo = "sin_texto_de_resolucion" | "causa_sin_textos" | "sin_coincidencia";

export interface Vinculo {
	movementId: string;
	cobertura: number;
	metodo?: "texto" | "fecha" | "adjunto";
	pagina?: number;
}

export interface AdjuntoRemitido {
	indice?: number;
	paginas: number[];
	movementId: string;
	paginasOrigen?: number[];
	metodo?: "sgj" | "huella" | "similitud" | "texto";
	similitud?: number | null;
	cobertura?: number;
	tipoOrigen?: string;
	detalleOrigen?: string | null;
	fechaOrigen?: string;
}

export interface FichaCedula {
	esCedula: boolean;
	familia?: string;
	emisor?: "tribunal" | "parte";
	instrumento?: string;
	numeroCedula?: string | null;
	notificadoEl?: string | null;
	fechaEmision?: string | null;
	fechaResolucion?: string | null;
	destinatario?: string | null;
	destinatarioLetrado?: string | null;
	destinatarios?: Array<{
		nombre: string;
		letrado?: string | null;
		domicilio?: string | null;
		tipoDomicilio?: string | null;
		domicilioElectronico?: boolean;
		paginas: number[];
	}>;
	domicilio?: string | null;
	tipoDomicilio?: string | null;
	domicilioElectronico?: boolean;
	zona?: string | null;
	caracter?: string | null;
	observaciones?: string | null;
	copias?: boolean | null;
	tribunal?: string | null;
	tribunalDireccion?: string | null;
	fueroCodigo?: string | null;
	oficina?: string | null;
	expediente?: { numero: string; anio: string | null; anioTruncado?: boolean } | null;
	caratula?: string | null;
	firmante?: { nombre: string | null; cargo: string | null; cuit: string | null } | null;
	resolucionEnAdjunto?: boolean;
	transcripcion?: string | null;
	paginasCedula?: number[];
	paginasDorsoFormulario?: number[];
	paginasAdjuntas?: Array<{ n: number; conTexto: boolean; enBlanco?: boolean; chars: number }>;
	// Tramos de adjuntos con su movimiento de origen (remisión)
	adjuntos?: Array<{
		paginas: number[];
		movementId: string | null;
		tipoOrigen: string | null;
		metodo: string | null;
		similitud: number | null;
	}>;
	adjuntosSinOrigen?: number[];
	tiposParser?: Array<{ tipo: string; paginas: number[] }>;
	camposFaltantes?: string[];
}

export interface Diligencia {
	fecha: string | null;
	hora: string | null;
	tipo: "aviso" | "entrega" | "fijacion" | "negativa" | "sin_diligenciar" | "intimacion" | "embargo" | "otro";
	quienAtendio: string | null;
	observaciones: string | null;
}

export interface ResultadoNotificacion {
	diligencias: Diligencia[];
	resultado: "positiva" | "negativa" | "sin_diligenciar" | "indeterminado";
	motivo?: string | null;
	fechaNotificacion: string | null;
	fechaUltimaDiligencia: string | null;
	fuenteFecha: "dorso" | "sistema" | null;
	fuenteResultado: "dorso" | "sistema" | null;
	legibilidad: "alta" | "media" | "baja" | null;
	oficialNotificador?: string | null;
	discrepancias: string[];
}

// Ficha de la etapa diligenciadas (escrito con una cédula / mandamiento en papel)
export interface FichaResultado {
	clase: "resultado" | "proyecto" | "escrito";
	instrumento: "cedula" | "mandamiento";
	ley22172: boolean;
	libradaPor: "tribunal" | "parte" | null;
	presentadaCon: "escrito" | "digitalizacion";
	numeroCedula: string | null;
	destinatario: string | null;
	domicilio: string | null;
	paginasCedula: number[];
	paginasDorso: number[];
	criterioDorso: "sello" | "contiguo" | "ninguno";
	resultadoNotificacion: ResultadoNotificacion | null;
	mismoDia?: Array<{ movementId: string; tipo: string; detalle: string | null }>;
}

export interface Vinculos {
	resolucion?: Vinculo | null;
	adjuntos?: AdjuntoRemitido[];
	motivo?: MotivoSinVinculo | null;
	original?: { movementId: string; numero: string | null; fecha: string; metodo: string } | null;
	datoSistema?: { movementId: string; tipo: string; fechaNotificacion: string | null; resultado: string | null; metodo: string } | null;
	resultado?: {
		movementId: string;
		resultado: string;
		fechaNotificacion: string | null;
		fechaMovimiento: string | null;
		detalle?: string | null;
	} | null;
	notificadoPor?: Array<{ cedulaId: string; numero: string | null; fecha: string; destinatario: string | null; emisor: string | null }>;
	intentadoAt?: string;
}

export interface ExtraccionItem {
	_id: string;
	causaId: string;
	tipo: string;
	fecha: string;
	fuero?: string;
	status: "extracted" | "needs_ocr" | "skipped" | "failed";
	skipReason?: string;
	error?: string;
	clase?: "digital" | "mixto" | "escaneado";
	paginas?: number;
	textoChars?: number;
	aliasDe?: string;
	procesadoAt: string;
	ficha?: Partial<FichaCedula> & Partial<FichaResultado>;
	vinculos?: Vinculos;
	vision?: {
		usd?: number;
		reutilizada?: boolean;
		rotada?: number;
		modelo?: string;
		paginas?: number[];
		tokIn?: number;
		tokOut?: number;
		json?: any;
	};
	claseEscrito?: string;
	parserVersion?: string;
	detalle?: string | null;
	revisar?: string[];
}

export interface ExtraccionDetalle {
	id: string;
	movimiento: {
		_id: string;
		tipo: string;
		detalle: string;
		fecha: string;
		fuero: string;
		causaType: string;
		causaId: string;
		url?: string;
		pdfStatus: string;
		pdfBytes?: number;
		textoStatus?: string;
		textoMethod?: string;
		textoCharCount?: number;
		textoExtractedAt?: string;
		textoError?: string;
	} | null;
	causa: { number: number; year: number; caratula: string; juzgado?: number } | null;
	estado:
		| (ExtraccionItem & {
				etapa?: string;
				ficha?: FichaCedula & Partial<FichaResultado>;
				paginasSinTexto?: number[];
				producer?: string;
				textHash?: string;
				ms?: number;
				intentos?: number;
				paginasEnBlanco?: number[];
				paginasOcr?: number[];
				paginasOcrFallidas?: number[];
				paginasOcrCache?: number;
				msOcr?: number;
				textoCrudoChars?: number;
		  })
		| null;
	texto: string | null;
	textoTruncado: boolean;
	revisar?: string[];
	vinculados: Array<{ _id: string; tipo: string; detalle: string; fecha: string; extracto: string }>;
}

export interface ExtraccionFiltros {
	etapa?: EtapaExtraccion;
	status?: string;
	clase?: string;
	familia?: string;
	vinculo?: "si" | "no" | "";
	motivo?: MotivoSinVinculo | "";
	resultado?: "positiva" | "negativa" | "sin_diligenciar" | "indeterminado" | "";
	claseNotif?: "resultado" | "proyecto" | "escrito" | "";
	libradaPor?: "tribunal" | "parte" | "";
	revisar?: "1" | "";
	fuero?: string;
	causaId?: string;
	q?: string;
	page?: number;
	limit?: number;
}

const limpiar = (f: ExtraccionFiltros) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== ""));

const RagExtraccionService = {
	async resumen(etapa: EtapaExtraccion = "cedulas"): Promise<ExtraccionResumen> {
		const r = await ragAxios.get("/rag/admin/extraccion/resumen", { params: { etapa } });
		return r.data.data;
	},
	async documentos(f: ExtraccionFiltros): Promise<{ data: ExtraccionItem[]; pagination: { page: number; limit: number; total: number } }> {
		const r = await ragAxios.get("/rag/admin/extraccion/documentos", { params: limpiar(f) });
		return { data: r.data.data, pagination: r.data.pagination };
	},
	async detalle(id: string): Promise<ExtraccionDetalle> {
		const r = await ragAxios.get(`/rag/admin/extraccion/documentos/${encodeURIComponent(id)}`);
		return r.data.data;
	},
	// El PDF se pide con el token del admin; se devuelven los bytes para dibujarlo con pdf.js.
	async pdf(id: string): Promise<ArrayBuffer> {
		const r = await ragAxios.get(`/rag/admin/extraccion/documentos/${encodeURIComponent(id)}/pdf`, {
			responseType: "arraybuffer",
			timeout: 60000,
		});
		return r.data as ArrayBuffer;
	},
};

export default RagExtraccionService;
