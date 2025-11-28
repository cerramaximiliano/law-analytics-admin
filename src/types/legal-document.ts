// types for legal documents

export interface LegalDocumentSection {
	title: string;
	content: string;
	order: number;
	visibleFor: string[];
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
	createdAt: string;
	updatedAt: string;
}

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
