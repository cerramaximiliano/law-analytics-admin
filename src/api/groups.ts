import adminAxios from "utils/adminAxios";

// ====================================
// INTERFACES
// ====================================

export interface GroupUser {
	_id: string;
	firstName: string;
	lastName: string;
	email: string;
	avatar?: string;
	subscriptionPlan?: "free" | "standard" | "premium";
	createdAt?: string;
	lastLogin?: string;
}

export interface GroupMember {
	_id: string;
	userId: GroupUser;
	role: "admin" | "editor" | "viewer" | "owner";
	status: "active" | "suspended" | "removed";
	joinedAt: string;
	invitedBy?: GroupUser;
	lastActivityAt?: string;
	isOwner?: boolean;
}

export interface GroupInvitation {
	_id: string;
	email: string;
	role: "admin" | "editor" | "viewer";
	status: "pending" | "accepted" | "rejected" | "expired" | "revoked";
	expiresAt: string;
	sentAt: string;
	respondedAt?: string;
	resendCount: number;
	lastResendAt?: string;
	personalMessage?: string;
	invitedBy?: GroupUser;
	userId?: GroupUser;
}

export interface GroupHistoryEntry {
	action: string;
	performedBy: GroupUser;
	targetUser?: GroupUser;
	details?: Record<string, unknown>;
	timestamp: string;
}

export interface GroupSettings {
	autoShareNewResources: boolean;
	defaultRole: "editor" | "viewer";
	shareableResourceTypes: string[];
	notifications: {
		memberActivity: boolean;
		resourceChanges: boolean;
	};
}

export interface GroupResourceCounts {
	folders: number;
	calculators: number;
	contacts: number;
	notes: number;
	events: number;
}

export interface Group {
	_id: string;
	name: string;
	description: string;
	owner: GroupUser;
	status: "active" | "suspended" | "archived" | "deleted";
	members: GroupMember[];
	invitations: GroupInvitation[];
	settings: GroupSettings;
	metadata: {
		resourceCounts: GroupResourceCounts;
		lastResourceSync?: string;
	};
	history: GroupHistoryEntry[];
	activeMemberCount: number;
	totalMemberCount: number;
	pendingInvitationsCount: number;
	memberLimit?: number;
	createdAt: string;
	updatedAt: string;
}

export interface GroupStats {
	total: number;
	byStatus: {
		active: number;
		suspended: number;
		archived: number;
		deleted: number;
	};
	members: {
		total: number;
		average: number;
		max: number;
	};
	byOwnerPlan: Record<string, number>;
}

export interface GroupFilters {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

export interface PaginatedGroupsResponse {
	success: boolean;
	data: {
		groups: Group[];
		pagination: {
			total: number;
			page: number;
			limit: number;
			pages: number;
		};
	};
}

// ====================================
// SERVICE
// ====================================

const GroupsService = {
	getGroups: async (filters: GroupFilters = {}): Promise<PaginatedGroupsResponse> => {
		const params = new URLSearchParams();
		if (filters.page) params.set("page", String(filters.page));
		if (filters.limit) params.set("limit", String(filters.limit));
		if (filters.status) params.set("status", filters.status);
		if (filters.search) params.set("search", filters.search);
		if (filters.sortBy) params.set("sortBy", filters.sortBy);
		if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

		const response = await adminAxios.get(`/api/groups?${params.toString()}`);
		return response.data;
	},

	getStats: async (): Promise<{ success: boolean; data: GroupStats }> => {
		const response = await adminAxios.get("/api/groups/stats");
		return response.data;
	},

	getGroupById: async (groupId: string): Promise<{ success: boolean; data: Group }> => {
		const response = await adminAxios.get(`/api/groups/${groupId}`);
		return response.data;
	},

	getGroupMembers: async (groupId: string, status?: string) => {
		const params = status ? `?status=${status}` : "";
		const response = await adminAxios.get(`/api/groups/${groupId}/members${params}`);
		return response.data;
	},

	getGroupInvitations: async (groupId: string, status?: string) => {
		const params = status ? `?status=${status}` : "";
		const response = await adminAxios.get(`/api/groups/${groupId}/invitations${params}`);
		return response.data;
	},

	getGroupHistory: async (groupId: string, page = 1, limit = 50) => {
		const response = await adminAxios.get(`/api/groups/${groupId}/history?page=${page}&limit=${limit}`);
		return response.data;
	},

	updateGroupStatus: async (groupId: string, status: "active" | "suspended" | "archived", reason?: string) => {
		const response = await adminAxios.patch(`/api/groups/${groupId}/status`, { status, reason });
		return response.data;
	},

	removeGroupMember: async (groupId: string, userId: string) => {
		const response = await adminAxios.delete(`/api/groups/${groupId}/members/${userId}`);
		return response.data;
	},

	cancelGroupInvitation: async (groupId: string, invitationId: string) => {
		const response = await adminAxios.delete(`/api/groups/${groupId}/invitations/${invitationId}`);
		return response.data;
	},
};

export default GroupsService;
