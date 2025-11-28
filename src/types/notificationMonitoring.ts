// Common interfaces
export interface PaginationData {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface UserData {
	_id: string;
	name: string;
	email: string;
}

export interface NotificationConfigData {
	daysInAdvance: number;
	notifyOnceOnly: boolean;
	notificationDate: string;
	shouldNotifyToday: boolean;
	wasNotifiedToday: boolean;
	willBeNotified: boolean;
}

// Upcoming Events
export interface UpcomingEvent {
	_id: string;
	title: string;
	description: string;
	date: string;
	type: string;
	user: UserData;
	notificationConfig: NotificationConfigData;
	daysUntilEvent: number;
}

export interface UpcomingEventsResponse {
	success: boolean;
	data: UpcomingEvent[];
	pagination: PaginationData;
}

// Upcoming Tasks
export interface UpcomingTask {
	_id: string;
	title: string;
	description: string;
	dueDate: string;
	status: string;
	priority: string;
	user: UserData;
	notificationConfig: NotificationConfigData;
	daysUntilDue: number;
}

export interface UpcomingTasksResponse {
	success: boolean;
	data: UpcomingTask[];
	pagination: PaginationData;
}

// Upcoming Movements
export interface UpcomingMovement {
	_id: string;
	description: string;
	type: string;
	amount: number;
	expirationDate: string;
	status: string;
	user: UserData;
	notificationConfig: NotificationConfigData;
	daysUntilExpiration: number;
}

export interface UpcomingMovementsResponse {
	success: boolean;
	data: UpcomingMovement[];
	pagination: PaginationData;
}

// Pending Alerts
export interface PendingAlert {
	_id: string;
	userId: UserData;
	folderId?: string;
	avatarType?: string;
	avatarIcon?: "Gift" | "MessageText1" | "Setting2" | "TableDocument" | "TaskSquare" | "CalendarRemove";
	avatarSize?: number;
	avatarInitial?: string;
	primaryText?: string;
	primaryVariant?: string;
	secondaryText: string;
	actionText: string;
	expirationDate?: string;
	delivered: boolean;
	read: boolean;
	deliveryAttempts: number;
	lastDeliveryAttempt?: string;
	createdAt: string;
	// Campos legacy para compatibilidad
	title?: string;
	message?: string;
	type?: string;
	icon?: string;
	avatarUrl?: string | null;
	expiresAt?: string;
}

export interface PendingAlertsResponse {
	success: boolean;
	data: PendingAlert[];
	pagination: PaginationData;
}

// Notification History
export interface NotificationHistoryItem {
	_id: string;
	entity: {
		type: "event" | "task" | "movement" | "alert";
		id: string;
		title?: string;
		date?: string;
	};
	user: UserData;
	notification: {
		sentAt: string;
		method: "email" | "browser";
		status: "sent" | "delivered";
		content?: {
			template: string;
		};
		delivery?: {
			attempts: number;
			deliveredAt: string;
			recipientEmail: string;
		};
	};
	metadata?: {
		source: string;
		createdAt: string;
		updatedAt: string;
	};
	// Campos alternativos para compatibilidad
	type?: "event" | "task" | "movement" | "alert";
	entityId?: string;
	entityTitle?: string;
	entityDate?: string;
}

export interface NotificationHistoryResponse {
	success: boolean;
	data: NotificationHistoryItem[];
	pagination: PaginationData;
}

// Notification Summary
export interface NotificationSummaryData {
	events: {
		total: number;
		byMethod: {
			email: number;
			browser: number;
		};
	};
	tasks: {
		total: number;
		byMethod: {
			email: number;
			browser: number;
		};
	};
	movements: {
		total: number;
		byMethod: {
			email: number;
			browser: number;
		};
	};
	alerts: {
		total: number;
		delivered: number;
		pending: number;
	};
	totalNotifications: number;
	period: {
		start: string;
		end: string;
	};
}

export interface NotificationSummaryResponse {
	success: boolean;
	data: NotificationSummaryData;
}

// Query Parameters
export interface UpcomingQueryParams {
	days?: number;
	limit?: number;
	page?: number;
}

export interface AlertsQueryParams {
	userId?: string;
	limit?: number;
	page?: number;
}

export interface HistoryQueryParams {
	type?: "event" | "task" | "movement" | "alert";
	userId?: string;
	startDate?: string;
	endDate?: string;
	limit?: number;
	page?: number;
}

export interface SummaryQueryParams {
	startDate?: string;
	endDate?: string;
}
