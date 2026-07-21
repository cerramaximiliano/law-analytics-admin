import adminAxios from "utils/adminAxios";

// ----------------------------------------------------------------------
// Types — dominio user-lifecycle (cron la-user-lifecycle, admin-api /api/user-lifecycle)
// ----------------------------------------------------------------------

export interface UserLifecycleConfig {
	_id: string;
	enabled: boolean;
	dryRun: boolean;
	excludeEmailPatterns: string[];
	verificationReminder: {
		enabled: boolean;
		minAgeDays: number;
		maxAgeDays: number;
		batchLimit: number;
		purgeNoticeGraceDays: number;
	};
	purge: {
		enabled: boolean;
		minAgeDays: number;
		batchLimit: number;
		holdUntil: string | null;
		updateMarketingContact: boolean;
	};
	stats: {
		enabled: boolean;
	};
	updatedAt?: string;
	updatedBy?: string;
}

export type UserLifecycleConfigUpdate = Partial<{
	enabled: boolean;
	dryRun: boolean;
	excludeEmailPatterns: string[];
	verificationReminder: Partial<UserLifecycleConfig["verificationReminder"]>;
	purge: Partial<Omit<UserLifecycleConfig["purge"], "holdUntil">> & { holdUntil?: string | null };
	stats: Partial<UserLifecycleConfig["stats"]>;
}>;

export interface UserLifecycleOverview {
	totals: {
		users: number;
		verified: number;
		unverified: number;
		testAccounts: number;
	};
	unverifiedByAge: {
		under7d: number;
		d7to30: number;
		d30to90: number;
		d90to180: number;
		over180d: number;
		noCreatedAt: number;
	};
	eligibleNow: {
		reminder: number;
		purge: number;
	};
	lifetime: {
		remindersSent: number;
		usersPurged: number;
		purgeSkippedWithData: number;
	};
	purgeOnHold: boolean;
	holdUntil: string | null;
}

export interface UserLifecycleSnapshot {
	_id: string;
	date: string;
	at: string;
	totals: {
		users: number;
		verified: number;
		unverified: number;
		unverifiedNoCreatedAt: number;
		testAccounts?: number;
	};
	unverifiedByAge: UserLifecycleOverview["unverifiedByAge"];
	today: {
		remindersSent: number;
		usersPurged: number;
	};
	lifetime: {
		remindersSent: number;
		usersPurged: number;
	};
}

export interface UserLifecycleAction {
	_id: string;
	action: "reminder_sent" | "user_purged" | "purge_skipped_has_data";
	userId: string;
	email: string;
	at: string;
	meta?: Record<string, unknown>;
}

export interface UserLifecycleActionsPagination {
	page: number;
	limit: number;
	total: number;
	pages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// ----------------------------------------------------------------------
// Service
// ----------------------------------------------------------------------

class UserLifecycleService {
	static async getConfig(): Promise<UserLifecycleConfig> {
		try {
			const response = await adminAxios.get("/api/user-lifecycle/config");
			return response.data.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener la configuración del ciclo de vida");
		}
	}

	static async updateConfig(updates: UserLifecycleConfigUpdate): Promise<UserLifecycleConfig> {
		try {
			const response = await adminAxios.put("/api/user-lifecycle/config", updates);
			return response.data.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar la configuración del ciclo de vida");
		}
	}

	static async getOverview(): Promise<UserLifecycleOverview> {
		try {
			const response = await adminAxios.get("/api/user-lifecycle/overview");
			return response.data.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener el estado del ciclo de vida");
		}
	}

	static async getStats(limit = 30): Promise<UserLifecycleSnapshot[]> {
		try {
			const response = await adminAxios.get("/api/user-lifecycle/stats", { params: { limit } });
			return response.data.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener los snapshots del ciclo de vida");
		}
	}

	static async getActions(params: {
		action?: UserLifecycleAction["action"];
		page?: number;
		limit?: number;
	}): Promise<{ data: UserLifecycleAction[]; pagination: UserLifecycleActionsPagination }> {
		try {
			const response = await adminAxios.get("/api/user-lifecycle/actions", { params });
			return { data: response.data.data, pagination: response.data.pagination };
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener la auditoría del ciclo de vida");
		}
	}
}

export default UserLifecycleService;
