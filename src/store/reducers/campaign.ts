import mktAxios from "utils/mktAxios";
import { Campaign, CampaignResponse, CampaignInput } from "types/campaign";
import { CampaignEmailResponse, SingleCampaignEmailResponse, CampaignEmailInput } from "types/campaign-email";
import { ContactResponse } from "types/marketing-contact";
import {
	AddAllActiveContactsResponse,
	AddAllActiveContactsStatusResponse,
	RemoveAllContactsResponse,
	RemoveAllContactsStatusResponse,
} from "types/campaign-contacts-status";

// Campaign API Service
export const CampaignService = {
	// Get all campaigns with optional filters
	getCampaigns: async (page = 1, limit = 20, filters = {}, sortBy = "createdAt", sortDir = "desc"): Promise<CampaignResponse> => {
		try {
			const response = await mktAxios.get("/api/campaigns", {
				params: {
					page,
					limit,
					sortBy,
					sortDir,
					...filters,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get a single campaign by ID
	getCampaignById: async (id: string): Promise<Campaign> => {
		try {
			const response = await mktAxios.get(`/api/campaigns/${id}`);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Create a new campaign
	createCampaign: async (campaignData: CampaignInput): Promise<Campaign> => {
		try {
			const response = await mktAxios.post("/api/campaigns", campaignData);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Update an existing campaign
	updateCampaign: async (id: string, campaignData: Partial<Campaign>): Promise<Campaign> => {
		try {
			const response = await mktAxios.put(`/api/campaigns/${id}`, campaignData);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Delete a campaign
	deleteCampaign: async (id: string): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.delete(`/api/campaigns/${id}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get campaign statistics
	getCampaignStats: async (): Promise<any> => {
		try {
			const response = await mktAxios.get("/api/campaigns/stats");
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Get contacts in a campaign
	getCampaignContacts: async (
		id: string,
		page = 1,
		limit = 20,
		sortBy = "campaigns.joinedAt",
		sortDir = "desc",
		filters: { status?: string; search?: string } = {},
	): Promise<ContactResponse> => {
		try {
			const response = await mktAxios.get(`/api/campaigns/${id}/contacts`, {
				params: {
					page,
					limit,
					sortBy,
					sortDir,
					...filters,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get contacts not in a campaign
	getContactsNotInCampaign: async (
		campaignId: string,
		page = 1,
		limit = 20,
		sortBy = "createdAt",
		sortDir = "desc",
		filters: {
			status?: string;
			search?: string;
			notInAnyCampaign?: boolean;
		} = {},
	): Promise<ContactResponse> => {
		try {
			const response = await mktAxios.get(`/api/contacts/not-in-campaign/${campaignId}`, {
				params: {
					page,
					limit,
					sortBy,
					sortDir,
					...filters,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Add contacts to a campaign
	addContactsToCampaign: async (
		id: string,
		data: {
			contacts?: string[];
			segmentId?: string;
			options?: {
				logActivity?: boolean;
				metadata?: Record<string, any>;
				source?: string;
			};
		},
	): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.post(`/api/campaigns/${id}/contacts`, data);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Remove contacts from a campaign
	removeContactsFromCampaign: async (id: string, contacts: string[]): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.delete(`/api/campaigns/${id}/contacts`, {
				data: { contacts },
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Remove all contacts from a campaign
	removeAllContactsFromCampaign: async (id: string): Promise<RemoveAllContactsResponse> => {
		try {
			const response = await mktAxios.delete(`/api/campaigns/${id}/contacts/all`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Check status of removing all contacts process
	getRemoveAllContactsStatus: async (id: string): Promise<RemoveAllContactsStatusResponse> => {
		try {
			const response = await mktAxios.get(`/api/campaigns/${id}/contacts/all/status`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Add all active contacts to a campaign
	addAllActiveContactsToCampaign: async (id: string): Promise<AddAllActiveContactsResponse> => {
		try {
			const response = await mktAxios.post(`/api/campaigns/${id}/contacts/active/all`, {});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Check status of adding all active contacts process
	getAddAllActiveContactsStatus: async (id: string): Promise<AddAllActiveContactsStatusResponse> => {
		try {
			const response = await mktAxios.get(`/api/campaigns/${id}/contacts/active/all/status`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Reset contact in campaign to initial step
	resetContactCampaign: async (
		campaignId: string,
		contactId: string,
		data?: { step?: number; reason?: string },
	): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.post(`/api/campaigns/${campaignId}/contacts/${contactId}/reset`, data || {});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Pause contact in campaign
	pauseContactInCampaign: async (
		campaignId: string,
		contactId: string,
		data: { reason: string; preventResync?: boolean },
	): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.post(`/api/campaigns/${campaignId}/contacts/${contactId}/pause`, {
				...data,
				preventResync: data.preventResync !== false, // Default to true
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Remove contact from campaign
	removeContactFromCampaign: async (
		campaignId: string,
		contactId: string,
		data: { reason: string; preventResync?: boolean },
	): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.delete(`/api/campaigns/${campaignId}/contacts/${contactId}`, {
				data: {
					...data,
					preventResync: true, // Always true to prevent sync
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Resume contact in campaign
	resumeContactInCampaign: async (
		campaignId: string,
		contactId: string,
		data?: { reason?: string },
	): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.post(`/api/campaigns/${campaignId}/contacts/${contactId}/resume`, data || {});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get contact progress in campaign
	getContactCampaignProgress: async (
		campaignId: string,
		contactId: string,
	): Promise<{
		success: boolean;
		data: {
			contact: {
				id: string;
				email: string;
				name: string;
			};
			campaign: {
				id: string;
				name: string;
				totalEmails: number;
				activeEmails: number;
				type: string;
				sequenceMap?: Array<{
					sequenceIndex: number;
					name: string;
					status: string;
					isActive: boolean;
					willBlock: boolean;
				}>;
			};
			progress: {
				status: string;
				currentStep: number;
				joinedAt: string;
				completedAt?: string;
				lastStepTime?: string;
				nextEmail?: {
					sequenceIndex: number;
					subject: string;
					status?: string;
					isBlocked?: boolean;
					conditions?: any;
					sendingRestrictions?: any;
				};
				nextSendTime?: string;
				blockedAt?: number;
			};
		};
	}> => {
		try {
			const url = `/api/campaigns/${campaignId}/contacts/${contactId}/progress`;
			console.log(`[CampaignService] GET ${url}`);
			const response = await mktAxios.get(url);
			console.log(`[CampaignService] Response:`, response.data);
			return response.data;
		} catch (error) {
			console.error(`[CampaignService] Error fetching contact progress:`, error);
			throw error;
		}
	},
};

// Campaign Email API Service
export const CampaignEmailService = {
	// Get emails for a campaign
	getEmailsByCampaignId: async (campaignId: string): Promise<CampaignEmailResponse> => {
		try {
			const response = await mktAxios.get(`/api/campaigns/${campaignId}/emails`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get single email by ID
	getEmailById: async (emailId: string): Promise<SingleCampaignEmailResponse> => {
		try {
			const response = await mktAxios.get(`/api/campaign-emails/${emailId}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Create a new campaign email
	createEmail: async (emailData: CampaignEmailInput): Promise<SingleCampaignEmailResponse> => {
		try {
			const response = await mktAxios.post("/api/campaign-emails", emailData);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Update an existing campaign email
	updateEmail: async (emailId: string, emailData: Partial<CampaignEmailInput>): Promise<SingleCampaignEmailResponse> => {
		try {
			// Remove campaignId from the update data since it cannot be modified
			const { campaignId: _campaignId, ...updateData } = emailData;
			const response = await mktAxios.put(`/api/campaign-emails/${emailId}`, updateData);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Delete a campaign email
	deleteEmail: async (emailId: string): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.delete(`/api/campaign-emails/${emailId}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},
};
