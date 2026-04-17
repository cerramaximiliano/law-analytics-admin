import adminAxios from "utils/adminAxios";

export interface MarketingTemplate {
	_id: string;
	name: string;
	subject: string;
	preheader?: string;
	category: string;
	description?: string;
	variables: string[];
	htmlBody?: string;
	isActive: boolean;
}

export interface MarketingTemplatesResponse {
	success: boolean;
	data: MarketingTemplate[];
}

export interface LaunchCampaignParams {
	subject: string;
	htmlBody: string;
	campaignName?: string;
	preheader?: string;
	fromName?: string;
	fromEmail?: string;
	launchImmediately?: boolean;
	startDate?: string;
	throttleRate?: number;
	dailyLimit?: number;
	allowedDays?: number[];
	timeWindow?: { start: string; end: string };
}

export interface LaunchCampaignResult {
	campaignId: string;
	campaignName: string;
	segmentId: string;
	recipientCount: number;
	status: "draft" | "active";
	segmentCreated: boolean;
}

export interface LaunchCampaignResponse {
	success: boolean;
	message: string;
	data: LaunchCampaignResult;
}

const discountCampaignService = {
	async launchCampaign(discountId: string, params: LaunchCampaignParams): Promise<LaunchCampaignResponse> {
		const res = await adminAxios.post<LaunchCampaignResponse>(`/api/discounts/${discountId}/launch-campaign`, params);
		return res.data;
	},

	async getMarketingTemplates(category?: string): Promise<MarketingTemplatesResponse> {
		const params = category ? `?category=${category}` : "";
		const res = await adminAxios.get<MarketingTemplatesResponse>(`/api/discounts/marketing-templates${params}`);
		return res.data;
	},
};

export default discountCampaignService;
