import mktAxios from "utils/mktAxios";
import { Segment, SegmentResponse, SegmentInput } from "types/segment";
// import { SingleSegmentResponse } from "types/segment";

// Use the central axios instance that has token refresh capability
// We'll only modify the baseURL for marketing API requests

// Segment API Service
export const SegmentService = {
	// Get all segments with optional filters
	getSegments: async (
		page = 1,
		limit = 20,
		sortBy = "createdAt",
		sortDir = "desc",
		filters: {
			isActive?: boolean;
		} = {},
	): Promise<SegmentResponse> => {
		try {
			const response = await mktAxios.get("/api/segments", {
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

	// Get a single segment by ID
	getSegmentById: async (id: string): Promise<Segment> => {
		try {
			const response = await mktAxios.get(`/api/segments/${id}`);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Create a new segment
	createSegment: async (segmentData: SegmentInput): Promise<Segment> => {
		try {
			const response = await mktAxios.post("/api/segments", segmentData);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Update an existing segment
	updateSegment: async (id: string, segmentData: Partial<SegmentInput>): Promise<Segment> => {
		try {
			const response = await mktAxios.put(`/api/segments/${id}`, segmentData);
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},

	// Delete a segment
	deleteSegment: async (id: string): Promise<{ success: boolean; message: string }> => {
		try {
			const response = await mktAxios.delete(`/api/segments/${id}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get contacts belonging to a segment
	getSegmentContacts: async (id: string, page = 1, limit = 20, sortBy = "email", sortDir = "asc"): Promise<any> => {
		try {
			const response = await mktAxios.get(`/api/segments/${id}/contacts`, {
				params: {
					page,
					limit,
					sortBy,
					sortDir,
				},
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Add contacts to a static segment
	addContactsToSegment: async (id: string, contactIds: string[]): Promise<{ success: boolean; message: string; count?: number }> => {
		try {
			const response = await mktAxios.post(`/api/segments/${id}/contacts`, { contactIds });
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Remove contacts from a static segment
	removeContactsFromSegment: async (id: string, contactIds: string[]): Promise<{ success: boolean; message: string; count?: number }> => {
		try {
			const response = await mktAxios.delete(`/api/segments/${id}/contacts`, {
				data: { contactIds },
			});
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Calculate segment membership count (preview)
	calculateSegmentCount: async (conditions: any): Promise<{ count: number; success: boolean }> => {
		try {
			const response = await mktAxios.post("/api/segments/calculate", { conditions });
			return response.data;
		} catch (error) {
			throw error;
		}
	},

	// Get segment statistics
	getSegmentStats: async (): Promise<any> => {
		try {
			const response = await mktAxios.get("/api/segments/stats");
			return response.data.data;
		} catch (error) {
			throw error;
		}
	},
};
