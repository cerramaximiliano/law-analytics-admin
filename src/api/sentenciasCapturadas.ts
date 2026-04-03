import pjnAxios from "utils/pjnAxios";

// ── Interfaces ────────────────────────────────────────────────────────────────

export type ProcessingStatus = "pending" | "processing" | "extracted_needs_ocr" | "processed" | "error";
export type OcrStatus = "not_needed" | "pending" | "processing" | "completed" | "error";
export type EmbeddingStatus = "pending" | "processing" | "completed" | "error" | "skipped";
export type SentenciaTipo = "primera_instancia" | "camara" | "interlocutoria" | "honorarios" | "definitiva" | "resolucion" | "otro";
export type Fuero = "CIV" | "CSS" | "CNT" | "COM";

export type Category = "novelty" | "rutina";
export type NoveltyCheckStatus = "single" | "double" | "rejected" | "pending_semantic";
export type PublicationStatus = "pending" | "published" | "skipped";

export interface SentenciaCapturada {
	_id: string;
	causaId: string;
	number: number;
	year: number;
	fuero: Fuero;
	caratula?: string;
	category?: Category;
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
	ocrStatus?: OcrStatus;
	ocrAttempts?: number;
	ocrResult?: {
		processedAt?: string;
		text?: string;
		charCount?: number;
		pageCount?: number;
		method?: string;
		processingTimeMs?: number;
		error?: string;
	};
	processingHistory?: Array<{
		status: string;
		at: string;
		method?: string;
		notes?: string;
	}>;
	embeddingStatus?: EmbeddingStatus;
	embeddedAt?: string;
	embeddingError?: string;
	embeddingChunksCount?: number;
	noveltyCheck?: {
		status?: NoveltyCheckStatus;
		semanticScore?: number;
		semanticTopMatchId?: string;
		verifiedAt?: string;
		semanticVerifiedAt?: string;
	};
	publicationStatus?: PublicationStatus;
	publishedAt?: string;
	publicationNotes?: string;
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
	ocr: {
		byStatus: { _id: OcrStatus; count: number; avgMs: number }[];
		recientes: SentenciaCapturada[];
	};
	byCategory: { _id: Category; total: number; processed: number; pending: number }[];
	noveltyRecientes: SentenciaCapturada[];
	embeddings: {
		byStatus: { _id: EmbeddingStatus; count: number; avgChunks: number }[];
		recientes: SentenciaCapturada[];
		errors: SentenciaCapturada[];
	};
	noveltyCheck: {
		byStatus: { _id: NoveltyCheckStatus | null; count: number }[];
	};
}

// ── Service ───────────────────────────────────────────────────────────────────

const BASE = "/api/sentencias-capturadas";

const SentenciasService = {
	async getStats(): Promise<SentenciasStats> {
		const res = await pjnAxios.get<{ success: boolean; data: SentenciasStats }>(BASE + "/stats");
		return res.data.data;
	},

	async findAll(params?: { status?: ProcessingStatus; fuero?: Fuero; tipo?: SentenciaTipo; category?: Category; page?: number; limit?: number }): Promise<{ data: SentenciaCapturada[]; total: number }> {
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

	async retryOcr(id: string): Promise<SentenciaCapturada> {
		const res = await pjnAxios.post<{ success: boolean; data: SentenciaCapturada }>(`${BASE}/${id}/retry-ocr`);
		return res.data.data;
	},

	async retryEmbedding(id: string): Promise<SentenciaCapturada> {
		const res = await pjnAxios.post<{ success: boolean; data: SentenciaCapturada }>(`${BASE}/${id}/retry-embedding`);
		return res.data.data;
	},

	async getPublicationQueue(params?: { fuero?: Fuero; tipo?: SentenciaTipo; publicationStatus?: PublicationStatus; sortOrder?: "asc" | "desc"; page?: number; limit?: number }): Promise<{ data: SentenciaCapturada[]; total: number; page: number; limit: number }> {
		const res = await pjnAxios.get<{ success: boolean; data: SentenciaCapturada[]; total: number; page: number; limit: number }>(BASE + "/publication-queue", { params });
		return res.data;
	},

	async updatePublicationStatus(id: string, status: "published" | "skipped" | "pending", notes?: string): Promise<SentenciaCapturada> {
		const res = await pjnAxios.patch<{ success: boolean; data: SentenciaCapturada }>(`${BASE}/${id}/publication`, { status, notes });
		return res.data.data;
	},
};

export default SentenciasService;
