// Types for Admin Tasks

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "completed" | "cancelled" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory =
	| "bug"
	| "feature"
	| "improvement"
	| "maintenance"
	| "documentation"
	| "research"
	| "meeting"
	| "admin"
	| "other";
export type RecurringPattern = "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type RelatedEntityType = "user" | "folder" | "subscription" | "support" | "other";

export interface TaskComment {
	_id: string;
	content: string;
	createdBy: string;
	createdAt: string;
}

export interface TaskSubtask {
	_id: string;
	title: string;
	completed: boolean;
	completedAt?: string;
	order: number;
}

export interface TaskAttachment {
	_id: string;
	name: string;
	url: string;
	type?: string;
	size?: number;
	uploadedAt: string;
}

export interface ExternalLink {
	label: string;
	url: string;
}

export interface AdminTask {
	_id: string;
	title: string;
	description?: string;
	status: TaskStatus;
	priority: TaskPriority;
	category: TaskCategory;
	tags: string[];
	project?: string;
	module?: string;
	assignedTo?: string;
	createdBy: string;
	dueDate?: string;
	reminderDate?: string;
	startDate?: string;
	completedAt?: string;
	estimatedHours?: number;
	actualHours?: number;
	progress: number;
	subtasks: TaskSubtask[];
	comments: TaskComment[];
	attachments: TaskAttachment[];
	parentTask?: string | { _id: string; title: string; status: TaskStatus };
	relatedTasks: string[] | Array<{ _id: string; title: string; status: TaskStatus }>;
	blockedBy: string[] | Array<{ _id: string; title: string; status: TaskStatus }>;
	externalLinks: ExternalLink[];
	relatedUserId?: string;
	relatedEntityType?: RelatedEntityType;
	relatedEntityId?: string;
	isRecurring: boolean;
	recurringPattern?: RecurringPattern;
	recurringEndDate?: string;
	isPinned: boolean;
	isArchived: boolean;
	metadata?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	// Virtuals
	isOverdue?: boolean;
	subtaskProgress?: number | null;
}

export interface TaskStats {
	total: number;
	overdue: number;
	completedThisWeek: number;
	statusCounts: Record<TaskStatus, number>;
	priorityCounts: Record<TaskPriority, number>;
	categoryCounts: Record<TaskCategory, number>;
}

export interface TaskFilterOptions {
	projects: string[];
	tags: string[];
	assignees: string[];
	creators: string[];
	statuses: TaskStatus[];
	priorities: TaskPriority[];
	categories: TaskCategory[];
}

export interface PaginationInfo {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// Request types
export interface CreateTaskRequest {
	title: string;
	description?: string;
	status?: TaskStatus;
	priority?: TaskPriority;
	category?: TaskCategory;
	tags?: string[];
	project?: string;
	module?: string;
	assignedTo?: string;
	createdBy?: string;
	dueDate?: string;
	reminderDate?: string;
	startDate?: string;
	estimatedHours?: number;
	parentTask?: string;
	relatedTasks?: string[];
	blockedBy?: string[];
	externalLinks?: ExternalLink[];
	relatedUserId?: string;
	relatedEntityType?: RelatedEntityType;
	relatedEntityId?: string;
	isRecurring?: boolean;
	recurringPattern?: RecurringPattern;
	recurringEndDate?: string;
	isPinned?: boolean;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
	progress?: number;
	actualHours?: number;
	isArchived?: boolean;
}

export interface TasksQueryParams {
	page?: number;
	limit?: number;
	status?: TaskStatus | string;
	priority?: TaskPriority | string;
	category?: TaskCategory | string;
	project?: string;
	assignedTo?: string;
	createdBy?: string;
	tags?: string;
	search?: string;
	isArchived?: boolean;
	isPinned?: boolean;
	hasSubtasks?: boolean;
	isOverdue?: boolean;
	dueDateFrom?: string;
	dueDateTo?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

// Response types
export interface TaskResponse {
	success: boolean;
	data: AdminTask;
	message?: string;
}

export interface TasksResponse {
	success: boolean;
	data: AdminTask[];
	pagination: PaginationInfo;
}

export interface TaskStatsResponse {
	success: boolean;
	data: TaskStats;
}

export interface TaskFilterOptionsResponse {
	success: boolean;
	data: TaskFilterOptions;
}

export interface BulkActionResponse {
	success: boolean;
	message: string;
}

// Status labels and colors
export const STATUS_LABELS: Record<TaskStatus, string> = {
	backlog: "Backlog",
	todo: "Por hacer",
	in_progress: "En progreso",
	review: "En revisión",
	completed: "Completada",
	cancelled: "Cancelada",
	blocked: "Bloqueada",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
	backlog: "default",
	todo: "info",
	in_progress: "warning",
	review: "secondary",
	completed: "success",
	cancelled: "error",
	blocked: "error",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
	low: "Baja",
	medium: "Media",
	high: "Alta",
	urgent: "Urgente",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
	low: "success",
	medium: "info",
	high: "warning",
	urgent: "error",
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
	bug: "Bug",
	feature: "Feature",
	improvement: "Mejora",
	maintenance: "Mantenimiento",
	documentation: "Documentación",
	research: "Investigación",
	meeting: "Reunión",
	admin: "Admin",
	other: "Otro",
};
