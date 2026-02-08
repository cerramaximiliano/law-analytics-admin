import mevAxios from "utils/mevAxios";

export interface MEVWorkerConfig {
	_id: string;
	worker_id: string;
	jurisdiccion: string;
	tipo_organismo: string;
	verification_mode: string;
	last_check?: string;
	documents_verified?: number;
	documents_valid?: number;
	documents_invalid?: number;
	documents_not_found?: number;
	enabled: boolean;
	batch_size: number;
	delay_between_searches: number;
	max_retries: number;
	login?: {
		username: string;
		password: string;
		lastPasswordChange?: string;
		passwordExpiryWarningShown?: boolean;
	};
	statistics?: {
		total_searches?: number;
		successful_searches?: number;
		failed_searches?: number;
		last_error?: string;
		last_error_date?: string;
		consecutive_failures?: number;
		uptime_hours?: number;
		last_success_date?: string;
	};
	settings?: {
		environments?: {
			development?: {
				headless?: boolean;
				log_level?: "debug" | "info" | "warn" | "error";
			};
			production?: {
				headless?: boolean;
				log_level?: "debug" | "info" | "warn" | "error";
			};
		};
		headless?: boolean;
		timeout_seconds?: number;
		navigation_timeout?: number;
		page_load_timeout?: number;
		use_stealth?: boolean;
		viewport_width?: number;
		viewport_height?: number;
		max_movimientos?: number;
		timeout_per_movimiento?: number;
		update_frequency_hours?: number;
	};
	notification?: {
		email?: string;
		send_on_error?: boolean;
		send_daily_report?: boolean;
		send_password_expiry_alert?: boolean;
		error_threshold?: number;
	};
	schedule?: {
		cron_pattern?: string;
		timezone?: string;
		active_hours?: {
			start: number;
			end: number;
		};
		skip_weekends?: boolean;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface MEVWorkersResponse {
	success: boolean;
	data: MEVWorkerConfig[];
}

export interface SystemConfig {
	_id: string;
	userId: string;
	key: string;
	value: any;
	dataType: "string" | "number" | "boolean" | "date" | "json";
	description: string;
	category: string;
	isEncrypted: boolean;
	metadata?: {
		createdBy?: string;
		updatedBy?: string;
		lastModifiedReason?: string;
	};
	createdAt?: string;
	updatedAt?: string;
}

export interface SystemConfigResponse {
	success: boolean;
	data: SystemConfig[];
}

export interface SyncCheckReport {
	status: "OK" | "ALERTA" | "ERROR" | null;
	date?: string;
	duration_ms?: number;
	jurisdictions_scraped?: number;
	jurisdictions_in_json?: number;
	summary?: {
		totalJurisdiccionesMEV: number;
		totalJurisdiccionesJSON: number;
		jurisdiccionesFaltantes: number;
		organismosFaltantes: number;
		organismosSobrantes: number;
	};
	missing_jurisdictions?: Array<{
		codigo: string;
		nombre: string;
		organismosCount: number;
	}>;
	missing_organisms?: Array<{
		jurisdiccion: string;
		jurisdiccionCodigo: string;
		organismoCodigo: string;
		organismoNombre: string;
	}>;
	extra_organisms?: Array<{
		jurisdiccion: string;
		jurisdiccionCodigo: string;
		organismoCodigo: string;
		organismoNombre: string;
	}>;
	error_message?: string;
}

export interface SyncCheckConfig {
	_id: string;
	worker_id: string;
	enabled: boolean;
	schedule: {
		cron_pattern: string;
		timezone: string;
		active_days: number[];
	};
	last_report: SyncCheckReport;
	statistics: {
		total_runs: number;
		successful_runs: number;
		failed_runs: number;
		last_success_date?: string;
		last_error_date?: string;
		last_error?: string;
		consecutive_ok: number;
		consecutive_alerts: number;
	};
	notification: {
		send_on_alert: boolean;
		send_on_ok: boolean;
	};
	createdAt?: string;
	updatedAt?: string;
}

class MEVWorkersService {
	async getVerificationConfigs(): Promise<MEVWorkersResponse> {
		try {
			const response = await mevAxios.get("/api/config/verification");
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("Error de autenticación. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuraciones de verificación");
		}
	}

	async updateVerificationConfig(workerId: string, data: Partial<MEVWorkerConfig>): Promise<any> {
		try {
			const response = await mevAxios.put(`/api/config/verification/${workerId}`, data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración");
		}
	}

	async toggleVerificationConfig(workerId: string): Promise<any> {
		try {
			const response = await mevAxios.patch(`/api/config/verification/${workerId}/toggle`, {});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al cambiar estado del worker");
		}
	}

	async getSystemConfigs(userId?: string): Promise<SystemConfigResponse> {
		try {
			const params = userId ? { userId } : {};
			const response = await mevAxios.get("/api/config/system", {
				params,
			});
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("Error de autenticación. Por favor, inicie sesión nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuraciones del sistema");
		}
	}

	async updateSystemConfig(userId: string, key: string, value: any): Promise<any> {
		try {
			const response = await mevAxios.put("/api/config/system", {
				userId,
				key,
				value,
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuración del sistema");
		}
	}

	async updatePasswordDate(userId: string, changeDate: string): Promise<any> {
		try {
			const response = await mevAxios.post("/api/config/passwords/update", {
				userId,
				changeDate,
			});
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar fecha de contraseña");
		}
	}

	async getSyncCheckConfig(): Promise<{ success: boolean; data: SyncCheckConfig }> {
		try {
			const response = await mevAxios.get("/api/config/sync-check");
			return response.data;
		} catch (error: any) {
			if (error.response?.status === 401) {
				throw new Error("Error de autenticacion. Por favor, inicie sesion nuevamente.");
			}
			throw new Error(error.response?.data?.message || "Error al obtener configuracion de sync check");
		}
	}

	async updateSyncCheckConfig(data: Partial<SyncCheckConfig>): Promise<any> {
		try {
			const response = await mevAxios.put("/api/config/sync-check", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuracion de sync check");
		}
	}

	async getNavigationCodesStats(): Promise<any> {
		try {
			const response = await mevAxios.get("/api/navigation-codes/stats");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadisticas de navigation codes");
		}
	}
}

export default new MEVWorkersService();
