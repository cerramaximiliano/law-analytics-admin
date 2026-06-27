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
}

export default new EmailComposerService();
