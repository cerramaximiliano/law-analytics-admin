import mktAxios from "utils/mktAxios";
import {
	SegmentSyncLog,
	SegmentSyncLogPaginatedResponse,
	SegmentSyncLogExecutionDetail,
	SegmentSyncLogStatsResponse,
} from "types/segment-sync-log";

// Segment Sync Log API Service
export const SegmentSyncLogService = {
	// Get executions list with pagination
	getExecutions: async (
		page = 1,
		limit = 20,
		filters: { status?: string; startDate?: string; endDate?: string } = {}
	): Promise<SegmentSyncLogPaginatedResponse> => {
		try {
			const response = await mktAxios.get("/api/segment-sync-logs", {
				params: {
					page,
					limit,
					...filters,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get execution detail by executionId
	getExecutionDetail: async (executionId: string): Promise<{ success: boolean; data: SegmentSyncLogExecutionDetail }> => {
		try {
			const response = await mktAxios.get(`/api/segment-sync-logs/${executionId}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get segment sync history
	getSegmentHistory: async (
		segmentId: string,
		page = 1,
		limit = 50
	): Promise<SegmentSyncLogPaginatedResponse> => {
		try {
			const response = await mktAxios.get(`/api/segment-sync-logs/segment/${segmentId}`, {
				params: {
					page,
					limit,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get campaign sync history
	getCampaignHistory: async (
		campaignId: string,
		page = 1,
		limit = 50
	): Promise<SegmentSyncLogPaginatedResponse> => {
		try {
			const response = await mktAxios.get(`/api/segment-sync-logs/campaign/${campaignId}`, {
				params: {
					page,
					limit,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get aggregated statistics
	getStats: async (days = 30): Promise<SegmentSyncLogStatsResponse> => {
		try {
			const response = await mktAxios.get("/api/segment-sync-logs/stats", {
				params: {
					days,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},
};
