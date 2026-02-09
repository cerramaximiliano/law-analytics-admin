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
		organismos?: Array<{ codigo: string; nombre: string }>;
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
	screenshots_dir?: string;
}

export interface ScreenshotInfo {
	filename: string;
	size: number;
	index: string;
	jurisdiccionCodigo: string | null;
}

export interface NavigationCodeDoc {
	_id: string;
	code: string;
	jurisdiccion: { codigo: string; nombre: string };
	organismo: { codigo: string; nombre: string };
	tipo: string;
	descripcion: string;
	navegacion: {
		requiresRadio: boolean;
		radioValue?: string;
		jurisdiccionValue: string;
		organismoValue: string;
	};
	activo: boolean;
	fechaCreacion?: string;
	fechaActualizacion?: string;
	stats?: {
		vecesUsado: number;
		ultimoUso?: string;
		exitosos: number;
		fallidos: number;
	};
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
	settings?: {
		screenshots_enabled?: boolean;
		screenshots_detailed?: boolean;
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
	report_history?: SyncCheckReport[];
	createdAt?: string;
	updatedAt?: string;
}

// ========== Worker Manager Types ==========

export interface MEVManagerConfigSettings {
	checkInterval: number;
	maxWorkers: { verify: number; update: number };
	minWorkers: { verify: number; update: number };
	scaleThreshold: { verify: number; update: number };
	scaleDownThreshold: { verify: number; update: number };
	docsPerWorker: { verify: number; update: number };
	cpuThreshold: number;
	memoryThreshold: number;
	workStartHour: { verify: number; update: number };
	workEndHour: { verify: number; update: number };
	workDays: { verify: number[]; update: number[] };
	workerNames: { verify: string; update: string };
}

export interface MEVManagerCurrentState {
	workers: { verify: number; update: number };
	pending: { verify: number; update: number };
	optimalWorkers: { verify: number; update: number };
	systemResources: {
		cpuUsage: number;
		memoryUsage: number;
		freeMemoryMB: number;
		totalMemoryMB: number;
	};
	isRunning: boolean;
	isWithinWorkingHours: { verify: boolean; update: boolean };
	lastCycleAt?: string;
	cycleCount: number;
}

export interface MEVManagerAlert {
	type: string;
	message: string;
	workerType?: string;
	createdAt: string;
	acknowledged: boolean;
}

export interface MEVManagerStateSnapshot {
	timestamp: string;
	workers: { verify: number; update: number };
	pending: { verify: number; update: number };
	systemResources: { cpuUsage: number; memoryUsage: number; freeMemoryMB: number };
}

export interface MEVManagerConfig {
	_id: string;
	name: string;
	config: MEVManagerConfigSettings;
	currentState: MEVManagerCurrentState;
	history: MEVManagerStateSnapshot[];
	alerts: MEVManagerAlert[];
	createdAt?: string;
	updatedAt?: string;
}

export interface MEVManagerStatusResponse {
	success: boolean;
	data: MEVManagerCurrentState & {
		staleness: "active" | "delayed" | "stale" | "unknown";
		lastCycleAgo: string | null;
	};
}

export interface MEVManagerStatsEntry {
	date: string;
	hour: number;
	workerType: "verify" | "update";
	stats: {
		processed: number;
		successful: number;
		failed: number;
		skipped: number;
		maxActiveWorkers: number;
		avgActiveWorkers: number;
		pendingAtStart?: number;
		pendingAtEnd?: number;
	};
	managerCycles: number;
	scalingEvents: Array<{
		timestamp: string;
		action: string;
		from: number;
		to: number;
		reason: string;
	}>;
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

	async addOrganism(data: {
		jurisdiccionCodigo: string;
		jurisdiccionNombre: string;
		organismoCodigo: string;
		organismoNombre: string;
		tipo?: string;
	}): Promise<any> {
		try {
			const response = await mevAxios.post("/api/config/sync-check/fix/add-organism", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al agregar organismo");
		}
	}

	async removeOrganism(data: {
		jurisdiccionCodigo: string;
		organismoCodigo: string;
		jurisdiccionNombre?: string;
		organismoNombre?: string;
	}): Promise<any> {
		try {
			const response = await mevAxios.post("/api/config/sync-check/fix/remove-organism", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al desactivar organismo");
		}
	}

	async addJurisdiction(data: {
		jurisdiccionCodigo: string;
		jurisdiccionNombre: string;
		organismos: Array<{ codigo: string; nombre: string }>;
	}): Promise<any> {
		try {
			const response = await mevAxios.post("/api/config/sync-check/fix/add-jurisdiction", data);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al agregar jurisdiccion");
		}
	}

	getScreenshotUrl(dir: string, filename: string): string {
		const base = (mevAxios.defaults.baseURL || "").replace(/\/$/, "");
		return `${base}/api/config/sync-check/screenshot/${dir}/${filename}`;
	}

	async listScreenshots(dir: string): Promise<{ success: boolean; data: ScreenshotInfo[] }> {
		try {
			const response = await mevAxios.get(`/api/config/sync-check/screenshots/${dir}`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al listar screenshots");
		}
	}

	async getNavigationCodes(params?: {
		page?: number;
		limit?: number;
		jurisdiccion?: string;
		activo?: boolean;
	}): Promise<{ success: boolean; data: NavigationCodeDoc[]; pagination?: any }> {
		try {
			const response = await mevAxios.get("/api/navigation-codes/", { params: { limit: 1000, ...params } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener navigation codes");
		}
	}

	// ========== Worker Manager ==========

	async getManagerConfig(): Promise<{ success: boolean; data: MEVManagerConfig }> {
		try {
			const response = await mevAxios.get("/api/worker-manager");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener configuracion del manager");
		}
	}

	async getManagerStatus(): Promise<MEVManagerStatusResponse> {
		try {
			const response = await mevAxios.get("/api/worker-manager/status");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estado del manager");
		}
	}

	async updateManagerSettings(settings: Partial<MEVManagerConfigSettings>): Promise<any> {
		try {
			const response = await mevAxios.patch("/api/worker-manager/settings", settings);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al actualizar configuracion del manager");
		}
	}

	async getManagerHistory(hours: number = 24): Promise<{ success: boolean; data: MEVManagerStateSnapshot[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/worker-manager/history", { params: { hours } });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener historial del manager");
		}
	}

	async getManagerAlerts(): Promise<{ success: boolean; data: MEVManagerAlert[]; count: number }> {
		try {
			const response = await mevAxios.get("/api/worker-manager/alerts");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener alertas del manager");
		}
	}

	async acknowledgeManagerAlert(index: number): Promise<any> {
		try {
			const response = await mevAxios.post(`/api/worker-manager/alerts/${index}/acknowledge`);
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al reconocer alerta");
		}
	}

	async resetManagerToDefaults(): Promise<any> {
		try {
			const response = await mevAxios.post("/api/worker-manager/reset");
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al resetear configuracion del manager");
		}
	}

	async getManagerStats(hours: number = 24, type?: string): Promise<{ success: boolean; data: MEVManagerStatsEntry[]; count: number }> {
		try {
			const params: any = { hours };
			if (type) params.type = type;
			const response = await mevAxios.get("/api/worker-manager/stats", { params });
			return response.data;
		} catch (error: any) {
			throw new Error(error.response?.data?.message || "Error al obtener estadisticas del manager");
		}
	}
}

export default new MEVWorkersService();
