// Placeholder alerts reducer - not used in admin project
import { createSlice } from "@reduxjs/toolkit";

interface PaginationType {
	page: number;
	limit: number;
	total: number;
	hasNext?: boolean;
}

const initialState = {
	alerts: [],
	pagination: { page: 1, limit: 10, total: 0 } as PaginationType,
	stats: { unread: 0, total: 0 },
	isLoader: false,
};

const alerts = createSlice({
	name: "alerts",
	initialState,
	reducers: {},
});

// Placeholder action creators - not implemented
export const markAlertAsRead = (_alertId: string) => ({ type: "alerts/markAsRead" });
export const fetchUserAlerts = (_userId: string, _page?: number, _limit?: number) => ({ type: "alerts/fetch" });
export const deleteAlert = (_alertId: string) => ({ type: "alerts/delete" });
export const loadMoreAlerts = (_userId: string, _page?: number) => ({ type: "alerts/loadMore" });

export default alerts.reducer;
