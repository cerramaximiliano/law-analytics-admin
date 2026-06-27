import adminAxios from "utils/adminAxios";

export interface RecipientOption {
	email: string;
	name: string;
	source: "usuario" | "contacto";
}

export interface ComposePayload {
	from: "cuentas" | "soporte";
	recipients: string[];
	subject: string;
	contentHtml: string;
	signature?: string;
	ctaText?: string;
	ctaUrl?: string;
}

export interface SendResult {
	to: string;
	ok: boolean;
	messageId?: string | null;
	error?: string;
}

export interface EmailDraft {
	_id: string;
	title: string;
	from: "cuentas" | "soporte";
	recipients: string[];
	subject: string;
	contentHtml: string;
	signature?: string;
	ctaText?: string;
	ctaUrl?: string;
	createdBy?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

export type DraftInput = Omit<EmailDraft, "_id" | "createdBy" | "createdAt" | "updatedAt">;

class EmailComposerService {
	async searchRecipients(q: string): Promise<RecipientOption[]> {
		const res = await adminAxios.get("/api/email-composer/recipients", { params: { q } });
		return res.data?.data || [];
	}

	async preview(payload: Omit<ComposePayload, "from" | "recipients">): Promise<string> {
		const res = await adminAxios.post("/api/email-composer/preview", payload);
		return res.data?.html || "";
	}

	async send(payload: ComposePayload): Promise<{ success: boolean; sent: number; total: number; results: SendResult[] }> {
		const res = await adminAxios.post("/api/email-composer/send", payload);
		return res.data;
	}

	async listDrafts(): Promise<EmailDraft[]> {
		const res = await adminAxios.get("/api/email-composer/drafts");
		return res.data?.data || [];
	}

	async createDraft(payload: Partial<DraftInput>): Promise<EmailDraft> {
		const res = await adminAxios.post("/api/email-composer/drafts", payload);
		return res.data?.data;
	}

	async updateDraft(id: string, payload: Partial<DraftInput>): Promise<EmailDraft> {
		const res = await adminAxios.put(`/api/email-composer/drafts/${id}`, payload);
		return res.data?.data;
	}

	async deleteDraft(id: string): Promise<void> {
		await adminAxios.delete(`/api/email-composer/drafts/${id}`);
	}
}

export default new EmailComposerService();
