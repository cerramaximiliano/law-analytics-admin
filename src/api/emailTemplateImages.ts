import mktAxios from "utils/mktAxios";

export interface EmailTemplateImage {
	_id: string;
	url: string;
	name: string;
	description: string;
	tags: string[];
	usageCount: number;
	lastUsedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateImageInput {
	url: string;
	name?: string;
	description?: string;
	tags?: string[];
}

const emailTemplateImagesService = {
	list: async (params?: { search?: string; tag?: string }) => {
		const res = await mktAxios.get<{ success: boolean; data: EmailTemplateImage[]; total: number }>("/api/email-template-images", {
			params,
		});
		return res.data;
	},

	create: async (payload: CreateImageInput) => {
		const res = await mktAxios.post<{ success: boolean; data: EmailTemplateImage; duplicate?: boolean }>(
			"/api/email-template-images",
			payload,
		);
		return res.data;
	},

	update: async (id: string, payload: Partial<Omit<CreateImageInput, "url">>) => {
		const res = await mktAxios.patch<{ success: boolean; data: EmailTemplateImage }>(`/api/email-template-images/${id}`, payload);
		return res.data;
	},

	remove: async (id: string) => {
		const res = await mktAxios.delete<{ success: boolean }>(`/api/email-template-images/${id}`);
		return res.data;
	},

	trackUsage: async (urls: string[]) => {
		if (urls.length === 0) return null;
		const res = await mktAxios.post<{ success: boolean; matched: number; modified: number }>("/api/email-template-images/track-usage", {
			urls,
		});
		return res.data;
	},
};

export default emailTemplateImagesService;
