import pjnAxios from "utils/pjnAxios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export type ProcessingStatus = "pending" | "processing" | "extracted_needs_ocr" | "processed" | "error";
export type SentenciaTipo = "primera_instancia" | "camara" | "interlocutoria" | "honorarios" | "definitiva" | "resolucion" | "otro";
export type Fuero = "CIV" | "CSS" | "CNT" | "COM";

export interface SentenciaCapturada {
	_id: string;
	causaId: string;
	number: number;
	year: number;
	fuero: Fuero;
	caratula?: string;
	juzgado?: number;
	secretaria?: number;
	sala?: number;
	movimientoFecha?: string;
	movimientoTipo?: string;
	movimientoDetalle?: string;
	url: string;
	tipoDoc?: string;
	sentenciaTipo: SentenciaTipo;
	detectedAt: string;
	processingStatus: ProcessingStatus;
	processedAt?: string;
	processingError?: string;
	processingResult?: {
		text?: string;
		pageCount?: number;
		charCount?: number;
		isScanned?: boolean;
		needsOcr?: boolean;
		method?: string;
		pdfSizeBytes?: number;
	};
	retryCount?: number;
}

export interface SentenciasStats {
	totals: {
		total: number;
		processed: number;
		pending: number;
		processing: number;
		needsOcr: number;
		error: number;
	};
	byStatus: { _id: string; count: number }[];
	byTipo: { _id: SentenciaTipo; count: number; avgChars: number; avgPages: number }[];
	byFuero: { _id: Fuero; total: number; processed: number; pending: number; error: number }[];
	recientes: SentenciaCapturada[];
	errores: SentenciaCapturada[];
}

// ── Service ───────────────────────────────────────────────────────────────────

const BASE = "/api/sentencias-capturadas";

const SentenciasService = {
	async getStats(): Promise<SentenciasStats> {
		const res = await pjnAxios.get<{ success: boolean; data: SentenciasStats }>(BASE + "/stats");
		return res.data.data;
	},

	async findAll(params?: { status?: ProcessingStatus; fuero?: Fuero; tipo?: SentenciaTipo; page?: number; limit?: number }): Promise<{ data: SentenciaCapturada[]; total: number }> {
		const res = await pjnAxios.get<{ success: boolean; data: SentenciaCapturada[]; total: number }>(BASE, { params });
		return { data: res.data.data, total: res.data.total };
	},

	async findById(id: string): Promise<SentenciaCapturada> {
		const res = await pjnAxios.get<{ success: boolean; data: SentenciaCapturada }>(`${BASE}/${id}`);
		return res.data.data;
	},

	async retry(id: string): Promise<SentenciaCapturada> {
		const res = await pjnAxios.post<{ success: boolean; data: SentenciaCapturada }>(`${BASE}/${id}/retry`);
		return res.data.data;
	},
};

export default SentenciasService;
