import ragAxios from "utils/ragAxios";

// Detalle de la extracción de texto y fichas del RAG por causa (worker pjn-rag-cedulas).
// Backend: pjn-rag-api /rag/admin/extraccion/*

export type EtapaExtraccion = "cedulas" | "deo" | "escritos";

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
	};
	// pjn-movements (Atlas) del tipo de la etapa con PDF descargado, por textoStatus
	atlas: Record<string, number>;
}

export interface Vinculo {
	movementId: string;
	cobertura: number;
	metodo?: "texto" | "fecha";
	pagina?: number;
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
	paginasAdjuntas?: Array<{ n: number; conTexto: boolean; chars: number }>;
	camposFaltantes?: string[];
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
	ficha?: Partial<FichaCedula>;
	vinculos?: { resolucion?: Vinculo | null; adjuntos?: Vinculo[] };
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
				ficha?: FichaCedula;
				paginasSinTexto?: number[];
				producer?: string;
				textHash?: string;
				parserVersion?: string;
				ms?: number;
				intentos?: number;
				vinculos?: { resolucion?: Vinculo | null; adjuntos?: Vinculo[]; intentadoAt?: string };
		  })
		| null;
	texto: string | null;
	textoTruncado: boolean;
	vinculados: Array<{ _id: string; tipo: string; detalle: string; fecha: string; extracto: string }>;
}

export interface ExtraccionFiltros {
	etapa?: EtapaExtraccion;
	status?: string;
	clase?: string;
	familia?: string;
	vinculo?: "si" | "no" | "";
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
	// El PDF se pide con el token del admin y se muestra como objeto local.
	async pdfUrl(id: string): Promise<string> {
		const r = await ragAxios.get(`/rag/admin/extraccion/documentos/${encodeURIComponent(id)}/pdf`, {
			responseType: "blob",
			timeout: 60000,
		});
		return URL.createObjectURL(r.data as Blob);
	},
};

export default RagExtraccionService;
