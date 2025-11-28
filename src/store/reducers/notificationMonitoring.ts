import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
	UpcomingEvent,
	UpcomingTask,
	UpcomingMovement,
	PendingAlert,
	NotificationHistoryItem,
	NotificationSummaryData,
	PaginationData,
} from "types/notificationMonitoring";

interface NotificationMonitoringState {
	upcomingEvents: {
		data: UpcomingEvent[];
		pagination: PaginationData | null;
		loading: boolean;
		error: string | null;
	};
	upcomingTasks: {
		data: UpcomingTask[];
		pagination: PaginationData | null;
		loading: boolean;
		error: string | null;
	};
	upcomingMovements: {
		data: UpcomingMovement[];
		pagination: PaginationData | null;
		loading: boolean;
		error: string | null;
	};
	pendingAlerts: {
		data: PendingAlert[];
		pagination: PaginationData | null;
		loading: boolean;
		error: string | null;
	};
	history: {
		data: NotificationHistoryItem[];
		pagination: PaginationData | null;
		loading: boolean;
		error: string | null;
	};
	summary: {
		data: NotificationSummaryData | null;
		loading: boolean;
		error: string | null;
	};
}

const initialState: NotificationMonitoringState = {
	upcomingEvents: {
		data: [],
		pagination: null,
		loading: false,
		error: null,
	},
	upcomingTasks: {
		data: [],
		pagination: null,
		loading: false,
		error: null,
	},
	upcomingMovements: {
		data: [],
		pagination: null,
		loading: false,
		error: null,
	},
	pendingAlerts: {
		data: [],
		pagination: null,
		loading: false,
		error: null,
	},
	history: {
		data: [],
		pagination: null,
		loading: false,
		error: null,
	},
	summary: {
		data: null,
		loading: false,
		error: null,
	},
};

const notificationMonitoringSlice = createSlice({
	name: "notificationMonitoring",
	initialState,
	reducers: {
		// Upcoming Events
		setUpcomingEventsLoading: (state, action: PayloadAction<boolean>) => {
			state.upcomingEvents.loading = action.payload;
		},
		setUpcomingEvents: (state, action: PayloadAction<{ data: UpcomingEvent[]; pagination: PaginationData }>) => {
			state.upcomingEvents.data = action.payload.data;
			state.upcomingEvents.pagination = action.payload.pagination;
			state.upcomingEvents.loading = false;
			state.upcomingEvents.error = null;
		},
		setUpcomingEventsError: (state, action: PayloadAction<string>) => {
			state.upcomingEvents.error = action.payload;
			state.upcomingEvents.loading = false;
		},

		// Upcoming Tasks
		setUpcomingTasksLoading: (state, action: PayloadAction<boolean>) => {
			state.upcomingTasks.loading = action.payload;
		},
		setUpcomingTasks: (state, action: PayloadAction<{ data: UpcomingTask[]; pagination: PaginationData }>) => {
			state.upcomingTasks.data = action.payload.data;
			state.upcomingTasks.pagination = action.payload.pagination;
			state.upcomingTasks.loading = false;
			state.upcomingTasks.error = null;
		},
		setUpcomingTasksError: (state, action: PayloadAction<string>) => {
			state.upcomingTasks.error = action.payload;
			state.upcomingTasks.loading = false;
		},

		// Upcoming Movements
		setUpcomingMovementsLoading: (state, action: PayloadAction<boolean>) => {
			state.upcomingMovements.loading = action.payload;
		},
		setUpcomingMovements: (state, action: PayloadAction<{ data: UpcomingMovement[]; pagination: PaginationData }>) => {
			state.upcomingMovements.data = action.payload.data;
			state.upcomingMovements.pagination = action.payload.pagination;
			state.upcomingMovements.loading = false;
			state.upcomingMovements.error = null;
		},
		setUpcomingMovementsError: (state, action: PayloadAction<string>) => {
			state.upcomingMovements.error = action.payload;
			state.upcomingMovements.loading = false;
		},

		// Pending Alerts
		setPendingAlertsLoading: (state, action: PayloadAction<boolean>) => {
			state.pendingAlerts.loading = action.payload;
		},
		setPendingAlerts: (state, action: PayloadAction<{ data: PendingAlert[]; pagination: PaginationData }>) => {
			state.pendingAlerts.data = action.payload.data;
			state.pendingAlerts.pagination = action.payload.pagination;
			state.pendingAlerts.loading = false;
			state.pendingAlerts.error = null;
		},
		setPendingAlertsError: (state, action: PayloadAction<string>) => {
			state.pendingAlerts.error = action.payload;
			state.pendingAlerts.loading = false;
		},

		// History
		setHistoryLoading: (state, action: PayloadAction<boolean>) => {
			state.history.loading = action.payload;
		},
		setHistory: (state, action: PayloadAction<{ data: NotificationHistoryItem[]; pagination: PaginationData }>) => {
			state.history.data = action.payload.data;
			state.history.pagination = action.payload.pagination;
			state.history.loading = false;
			state.history.error = null;
		},
		setHistoryError: (state, action: PayloadAction<string>) => {
			state.history.error = action.payload;
			state.history.loading = false;
		},

		// Summary
		setSummaryLoading: (state, action: PayloadAction<boolean>) => {
			state.summary.loading = action.payload;
		},
		setSummary: (state, action: PayloadAction<NotificationSummaryData>) => {
			state.summary.data = action.payload;
			state.summary.loading = false;
			state.summary.error = null;
		},
		setSummaryError: (state, action: PayloadAction<string>) => {
			state.summary.error = action.payload;
			state.summary.loading = false;
		},

		// Clear all data
		clearNotificationMonitoring: (state) => {
			return initialState;
		},
	},
});

export const {
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
	clearNotificationMonitoring,
} = notificationMonitoringSlice.actions;

export default notificationMonitoringSlice.reducer;
