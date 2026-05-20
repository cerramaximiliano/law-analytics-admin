import adminAxios from "utils/adminAxios";

export interface FolderStatsValues {
	activeFoldersCount: number;
	statsFolders: number | null;
	statsFoldersTotal: number | null;
}

export interface SyncFolderStatsResult {
	ok: boolean;
	userId: string;
	email?: string;
	before: FolderStatsValues;
	after: FolderStatsValues;
	changed: boolean;
}

export interface SyncFolderStatsBulkResult {
	totalUsers: number;
	processed: number;
	changedUsers: number;
	errors: number;
	changedSample: Array<{
		userId: string;
		email?: string;
		before: FolderStatsValues;
		after: FolderStatsValues;
	}>;
}

class UserStatsService {
	/**
	 * Reconcilia los contadores de folders de un usuario:
	 * User.activeFoldersCount, UserStats.counts.folders y UserStats.counts.foldersTotal.
	 */
	static async syncFolderStatsForUser(userId: string): Promise<{ success: boolean; data: SyncFolderStatsResult }> {
		const response = await adminAxios.post(`/api/users/${userId}/sync-folder-stats`);
		return response.data;
	}

	/**
	 * Reconcilia los contadores de folders para TODOS los usuarios (modo masivo).
	 * Puede tardar varios segundos si hay muchos usuarios.
	 */
	static async syncFolderStatsBulk(): Promise<{ success: boolean; data: SyncFolderStatsBulkResult }> {
		const response = await adminAxios.post(`/api/users/sync-folder-stats-bulk`, {}, { timeout: 120000 });
		return response.data;
	}
}

export default UserStatsService;
