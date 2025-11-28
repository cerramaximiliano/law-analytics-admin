import notificationAxios from "utils/notificationAxios";
import { dispatch } from "store";
import {
	setUpcomingEventsLoading,
	setUpcomingEvents,
	setUpcomingEventsError,
	setUpcomingTasksLoading,
	setUpcomingTasks,
	setUpcomingTasksError,
	setUpcomingMovementsLoading,
	setUpcomingMovements,
	setUpcomingMovementsError,
	setPendingAlertsLoading,
	setPendingAlerts,
	setPendingAlertsError,
	setHistoryLoading,
	setHistory,
	setHistoryError,
	setSummaryLoading,
	setSummary,
	setSummaryError,
} from "store/reducers/notificationMonitoring";
import type {
	UpcomingEventsResponse,
	UpcomingTasksResponse,
	UpcomingMovementsResponse,
	PendingAlertsResponse,
	NotificationHistoryResponse,
	NotificationSummaryResponse,
	UpcomingQueryParams,
	AlertsQueryParams,
	HistoryQueryParams,
	SummaryQueryParams,
} from "types/notificationMonitoring";

class NotificationMonitoringService {
	// Upcoming Events
	async getUpcomingEvents(params?: UpcomingQueryParams): Promise<UpcomingEventsResponse> {
		try {
			dispatch(setUpcomingEventsLoading(true));
			const response = await notificationAxios.get<UpcomingEventsResponse>("/api/monitoring/events/upcoming", { params });

			console.log("📅 Upcoming Events Response:", response.data);
			console.log("  - Total events:", response.data.data?.length || 0);
			console.log("  - First event:", response.data.data?.[0]);

			if (response.data.success) {
				dispatch(
					setUpcomingEvents({
						data: response.data.data,
						pagination: response.data.pagination,
					}),
				);
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener eventos próximos";
			console.error("❌ Error getting upcoming events:", error);
			dispatch(setUpcomingEventsError(errorMessage));
			throw error;
		}
	}

	// Upcoming Tasks
	async getUpcomingTasks(params?: UpcomingQueryParams): Promise<UpcomingTasksResponse> {
		try {
			dispatch(setUpcomingTasksLoading(true));
			const response = await notificationAxios.get<UpcomingTasksResponse>("/api/monitoring/tasks/upcoming", { params });

			console.log("📋 Upcoming Tasks Response:", response.data);
			console.log("  - Total tasks:", response.data.data?.length || 0);
			console.log("  - First task:", response.data.data?.[0]);

			if (response.data.success) {
				dispatch(
					setUpcomingTasks({
						data: response.data.data,
						pagination: response.data.pagination,
					}),
				);
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener tareas próximas";
			console.error("❌ Error getting upcoming tasks:", error);
			dispatch(setUpcomingTasksError(errorMessage));
			throw error;
		}
	}

	// Upcoming Movements
	async getUpcomingMovements(params?: UpcomingQueryParams): Promise<UpcomingMovementsResponse> {
		try {
			dispatch(setUpcomingMovementsLoading(true));
			const response = await notificationAxios.get<UpcomingMovementsResponse>("/api/monitoring/movements/upcoming", { params });

			console.log("💰 Upcoming Movements Response:", response.data);
			console.log("  - Total movements:", response.data.data?.length || 0);
			console.log("  - First movement:", response.data.data?.[0]);

			if (response.data.success) {
				dispatch(
					setUpcomingMovements({
						data: response.data.data,
						pagination: response.data.pagination,
					}),
				);
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener movimientos próximos";
			console.error("❌ Error getting upcoming movements:", error);
			dispatch(setUpcomingMovementsError(errorMessage));
			throw error;
		}
	}

	// Pending Alerts
	async getPendingAlerts(params?: AlertsQueryParams): Promise<PendingAlertsResponse> {
		try {
			dispatch(setPendingAlertsLoading(true));
			const response = await notificationAxios.get<PendingAlertsResponse>("/api/monitoring/alerts/pending", { params });

			console.log("🔔 Pending Alerts Response:", response.data);
			console.log("  - Total alerts:", response.data.data?.length || 0);
			console.log("  - First alert:", response.data.data?.[0]);

			if (response.data.success) {
				dispatch(
					setPendingAlerts({
						data: response.data.data,
						pagination: response.data.pagination,
					}),
				);
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener alertas pendientes";
			console.error("❌ Error getting pending alerts:", error);
			dispatch(setPendingAlertsError(errorMessage));
			throw error;
		}
	}

	// Notification History
	async getNotificationHistory(params?: HistoryQueryParams): Promise<NotificationHistoryResponse> {
		try {
			dispatch(setHistoryLoading(true));
			const response = await notificationAxios.get<NotificationHistoryResponse>("/api/monitoring/history", { params });

			console.log("📜 Notification History Response:", response.data);
			console.log("  - Total items:", response.data.data?.length || 0);
			console.log("  - First item:", response.data.data?.[0]);
			console.log("  - Pagination:", response.data.pagination);

			if (response.data.success) {
				dispatch(
					setHistory({
						data: response.data.data,
						pagination: response.data.pagination,
					}),
				);
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener historial de notificaciones";
			console.error("❌ Error getting notification history:", error);
			dispatch(setHistoryError(errorMessage));
			throw error;
		}
	}

	// Notification Summary
	async getNotificationSummary(params?: SummaryQueryParams): Promise<NotificationSummaryResponse> {
		try {
			dispatch(setSummaryLoading(true));
			const response = await notificationAxios.get<NotificationSummaryResponse>("/api/monitoring/summary", { params });

			console.log("📊 Notification Summary Response:", response.data);
			console.log("  - Total notifications:", response.data.data?.totalNotifications);
			console.log("  - Summary data:", response.data.data);

			if (response.data.success) {
				dispatch(setSummary(response.data.data));
			}

			return response.data;
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al obtener resumen de notificaciones";
			console.error("❌ Error getting notification summary:", error);
			dispatch(setSummaryError(errorMessage));
			throw error;
		}
	}

	// Get all upcoming notifications at once
	async getAllUpcoming(params?: UpcomingQueryParams): Promise<void> {
		try {
			await Promise.all([this.getUpcomingEvents(params), this.getUpcomingTasks(params), this.getUpcomingMovements(params)]);
		} catch (error) {
			console.error("Error fetching upcoming notifications:", error);
		}
	}

	// Get failed notifications
	async getFailedNotifications(params?: any): Promise<any> {
		try {
			const response = await notificationAxios.get("/api/monitoring/notifications/failed", { params });
			return response.data;
		} catch (error: any) {
			console.error("Error fetching failed notifications:", error);
			throw error;
		}
	}

	// Retry a failed notification
	async retryNotification(notificationId: string): Promise<any> {
		try {
			const response = await notificationAxios.post(`/api/monitoring/notifications/${notificationId}/retry`);
			return response.data;
		} catch (error: any) {
			console.error("Error retrying notification:", error);
			throw error;
		}
	}

	// Get duplicate notifications
	async getDuplicateNotifications(windowSeconds?: number): Promise<any> {
		try {
			const params = windowSeconds ? { windowSeconds } : {};
			const response = await notificationAxios.get("/api/monitoring/notifications/duplicates", { params });
			return response.data;
		} catch (error: any) {
			console.error("Error fetching duplicate notifications:", error);
			throw error;
		}
	}

	// Get notification details
	async getNotificationDetails(notificationId: string): Promise<any> {
		try {
			const response = await notificationAxios.get(`/api/monitoring/notifications/${notificationId}`);
			return response.data;
		} catch (error: any) {
			console.error("Error fetching notification details:", error);
			throw error;
		}
	}

	// Create custom alerts for specific users
	async createCustomAlerts(data: {
		userIds: string[];
		alert: {
			secondaryText: string;
			actionText: string;
			avatarIcon?: string;
			primaryText?: string;
			expirationDate?: string;
		};
		deliverImmediately?: boolean;
		campaign?: {
			name: string;
			type: string;
			trackingId?: string;
		};
	}): Promise<any> {
		try {
			const response = await notificationAxios.post("/api/alerts/create", data);
			console.log("🔔 Custom alerts created:", response.data);
			return response.data;
		} catch (error: any) {
			console.error("Error creating custom alerts:", error);
			throw error;
		}
	}

	// Create bulk alerts with filters
	async createBulkAlerts(data: {
		filter?: {
			role?: string;
			active?: boolean;
			subscriptionPlan?: string;
		};
		template: {
			secondaryText: string;
			actionText: string;
			avatarIcon?: string;
			primaryText?: string;
			expirationDate?: string;
		};
		options?: {
			deliverImmediately?: boolean;
			respectNotificationPreferences?: boolean;
			testMode?: boolean;
			limit?: number;
		};
		campaign?: {
			name: string;
			type: string;
		};
	}): Promise<any> {
		try {
			const response = await notificationAxios.post("/api/alerts/bulk", data);
			console.log("📢 Bulk alerts created:", response.data);
			return response.data;
		} catch (error: any) {
			console.error("Error creating bulk alerts:", error);
			throw error;
		}
	}

	// Get pending alerts for a specific user (admin)
	async getPendingAlertsForUser(userId: string): Promise<any> {
		try {
			const response = await notificationAxios.get(`/api/alerts/pending/${userId}`);
			return response.data;
		} catch (error: any) {
			console.error("Error fetching user pending alerts:", error);
			throw error;
		}
	}

	// Get delivered alerts
	async getDeliveredAlerts(params?: HistoryQueryParams): Promise<any> {
		try {
			const response = await notificationAxios.get("/api/monitoring/alerts/delivered", { params });
			console.log("📬 Delivered Alerts Response:", response.data);
			return response.data;
		} catch (error: any) {
			console.error("Error fetching delivered alerts:", error);
			throw error;
		}
	}

	// Mark alert as read
	async markAlertAsRead(alertId: string): Promise<any> {
		try {
			const response = await notificationAxios.put(`/api/alerts/${alertId}/read`);
			return response.data;
		} catch (error: any) {
			console.error("Error marking alert as read:", error);
			throw error;
		}
	}

	// Cleanup old alerts (admin)
	async cleanupAlerts(data: { daysOld: number; onlyDelivered?: boolean; dryRun?: boolean }): Promise<any> {
		try {
			const response = await notificationAxios.delete("/api/alerts/cleanup", { data });
			console.log("🧹 Cleanup alerts result:", response.data);
			return response.data;
		} catch (error: any) {
			console.error("Error cleaning up alerts:", error);
			throw error;
		}
	}
}

const notificationMonitoringService = new NotificationMonitoringService();
export default notificationMonitoringService;
