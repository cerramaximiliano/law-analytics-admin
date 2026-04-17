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

export interface CampaignStep {
	name: string;
	subject: string;
	htmlBody: string;
	timeDelayValue: number;
	timeDelayUnit: "hours" | "days";
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
	campaignType?: "onetime" | "sequence";
	steps?: CampaignStep[];
}

export interface LaunchCampaignResult {
	campaignId: string;
	campaignName: string;
	segmentId: string;
	recipientCount: number;
	status: "draft" | "active";
	segmentCreated: boolean;
	emailsCreated?: number;
}

export interface LaunchCampaignResponse {
	success: boolean;
	message: string;
	data: LaunchCampaignResult;
}

export interface ActivateCampaignResponse {
	success: boolean;
	message: string;
	data: { campaignId: string; status: "active" };
}

const discountCampaignService = {
	async launchCampaign(discountId: string, params: LaunchCampaignParams): Promise<LaunchCampaignResponse> {
		const res = await adminAxios.post<LaunchCampaignResponse>(`/api/discounts/${discountId}/launch-campaign`, params);
		return res.data;
	},

	async activateCampaign(discountId: string, campaignId: string): Promise<ActivateCampaignResponse> {
		const res = await adminAxios.post<ActivateCampaignResponse>(`/api/discounts/${discountId}/activate-campaign`, { campaignId });
		return res.data;
	},

	async getMarketingTemplates(category?: string): Promise<MarketingTemplatesResponse> {
		const params = category ? `?category=${category}` : "";
		const res = await adminAxios.get<MarketingTemplatesResponse>(`/api/discounts/marketing-templates${params}`);
		return res.data;
	},
};

export default discountCampaignService;
