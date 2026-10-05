// types for legal documents

export interface LegalDocumentSection {
	title: string;
	content: string;
	order: number;
	/** Vacío o ausente = visible para todos los planes (hub: isSectionVisibleFor). */
	visibleFor: string[];
	/** Ancla estable de la sección (ej. "conectores-ia" → /privacy-policy#conectores-ia). */
	anchor?: string;
}

export interface CompanyDetails {
	name: string;
	address: string;
	email: string;
	phone: string;
	registrationNumber: string;
}

export interface LegalDocument {
	_id: string;
	documentType: "subscription" | "refund" | "billing" | "privacy" | "terms" | string;
	version: string;
	effectiveDate: string;
	isActive: boolean;
	language: string;
	region: string;
	title: string;
	introduction?: string;
	sections?: LegalDocumentSection[];
	conclusion?: string;
	companyDetails?: CompanyDetails;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
}

/** Idiomas admitidos por el enum del modelo en el hub (LegalDocument.language). */
export const LEGAL_DOCUMENT_LANGUAGES = ["es", "en"] as const;

export type NewLegalDocument = Omit<LegalDocument, "_id" | "createdAt" | "updatedAt">;

export interface LegalDocumentsListResponse {
	success: boolean;
	count: number;
	documents: LegalDocument[];
}

export interface LegalDocumentResponse {
	success: boolean;
	document: LegalDocument;
}

export interface LegalDocumentsState {
	documents: LegalDocument[];
	selectedDocument: LegalDocument | null;
	loading: boolean;
	loadingDetail: boolean;
	error: string | null;
}
