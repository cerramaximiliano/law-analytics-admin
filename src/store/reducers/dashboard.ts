import adminAxios from "utils/adminAxios";
import { DashboardSummaryResponse, DetailedUserStats, DetailedSubscriptionStats, DetailedFolderStats } from "types/dashboard";

// Dashboard API Service
export class DashboardService {
	/**
	 * Get dashboard summary with all stats combined
	 */
	static async getSummary(): Promise<DashboardSummaryResponse> {
		const response = await adminAxios.get<DashboardSummaryResponse>("/api/dashboard/summary");
		return response.data;
	}

	/**
	 * Get detailed user statistics
	 */
	static async getUserStats(): Promise<{ success: boolean; data: DetailedUserStats }> {
		const response = await adminAxios.get<{ success: boolean; data: DetailedUserStats }>("/api/dashboard/users");
		return response.data;
	}

	/**
	 * Get detailed subscription statistics
	 */
	static async getSubscriptionStats(): Promise<{ success: boolean; data: DetailedSubscriptionStats }> {
		const response = await adminAxios.get<{ success: boolean; data: DetailedSubscriptionStats }>("/api/dashboard/subscriptions");
		return response.data;
	}

	/**
	 * Get detailed folder statistics
	 */
	static async getFolderStats(): Promise<{ success: boolean; data: DetailedFolderStats }> {
		const response = await adminAxios.get<{ success: boolean; data: DetailedFolderStats }>("/api/dashboard/folders");
		return response.data;
	}
}
