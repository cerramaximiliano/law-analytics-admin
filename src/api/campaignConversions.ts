import adminAxios from "utils/adminAxios";
import { ConversionUserJourney } from "types/campaign";

// Recorrido posterior de usuarios convertidos (admin-api del hub: /api/marketing/conversions/users)
export const CampaignConversionsService = {
	getUsers: async (ids: string[]): Promise<ConversionUserJourney[]> => {
		const response = await adminAxios.post("/api/marketing/conversions/users", { ids });
		return response.data.data;
	},
};
