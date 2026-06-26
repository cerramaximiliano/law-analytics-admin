/**
 * API Service para el worker de bandeja (pjn-bandeja-sync).
 * Config singleton `bandeja-sync-config` administrable vía admin-api.
 */
import adminAxios from "utils/adminAxios";

export interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T;
}

export interface BandejaSyncConfig {
	enabled: boolean;
	testEmails: string[];
	notifyEnabled: boolean;
	lookbackDays: number;
	minGapMs?: number;
	pauseBetweenCredsMs?: number;
	updatedAt?: string | null;
	updatedBy?: string | null;
}

export class BandejaSyncConfigService {
	static async getConfig(): Promise<ApiResponse<BandejaSyncConfig>> {
		try {
			const response = await adminAxios.get("/api/bandeja-sync-config");
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	static async updateConfig(data: Partial<BandejaSyncConfig>): Promise<ApiResponse<BandejaSyncConfig>> {
		try {
			const response = await adminAxios.patch("/api/bandeja-sync-config", data);
			return response.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	private static handleError(error: any): Error {
		if (error.isAxiosError) {
			throw error;
		}
		return new Error("Error al procesar la solicitud");
	}
}

export default BandejaSyncConfigService;
