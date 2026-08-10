import adminAxios from "utils/adminAxios";

// ----------------------------------------------------------------------
// Types — config global de notificaciones de movimientos judiciales
// (doc único configKey:'global' de `judicial-notification-configs`,
// admin-api /api/judicial-notification-config). Compartido con los workers
// pjn/mev/scba/eje/mis-causas y la-notification.
// ----------------------------------------------------------------------

export type FirstSyncPolicy = "silent-baseline" | "today-only" | "notify-all";
export type OffDayMode = "skip" | "send" | "defer";

/**
 * Política sparse: solo los campos seteados overridean la capa anterior.
 * Resolución en los workers: sources[source] → defaults → fallback hardcodeado.
 */
export interface MovementPolicy {
	firstSyncPolicy?: FirstSyncPolicy;
	offDayMode?: OffDayMode;
	/** null u omitido = usar notificationSchedule.activeDays global */
	activeDays?: number[] | null;
	/** null u omitido = usar filters globales (override avanzado, sin UI) */
	filters?: {
		excludedMovementTypes?: string[];
		excludedKeywords?: string[];
		includedMovementTypes?: string[];
	} | null;
	enabled?: boolean;
	notifyArchivedFolders?: boolean;
	/** Solo pjn-app-update-worker: docs desde cache notifican solo movs de hoy */
	cacheSourceTodayOnly?: boolean;
}

export interface MovementPolicies {
	version?: number;
	defaults?: MovementPolicy;
	sources?: Record<string, MovementPolicy>;
}

export interface JudicialNotificationConfig {
	_id?: string;
	configKey: string;
	notificationSchedule: {
		dailyNotificationHour: number;
		dailyNotificationMinute: number;
		timezone: string;
		activeDays: number[];
		/** Horas 'H:mm' (ART) del reporte de monitoreo al admin (la-notification) */
		reportHours?: string[];
	};
	limits: {
		maxMovementsPerBatch: number;
		maxNotificationsPerUserPerDay: number;
		minHoursBetweenSameExpediente: number;
		/** Aplicar los límites por usuario en la entrega (opt-in, default false) */
		enforcePerUserLimits?: boolean;
	};
	retryConfig: {
		maxRetries: number;
		initialRetryDelay: number;
		backoffMultiplier: number;
		webhookTimeout: number;
	};
	contentConfig: {
		includeFullCaratula: boolean;
		maxDetalleLength: number;
		includeExpedienteLink: boolean;
		groupMovementsByExpediente: boolean;
		usePublicMovementLinks?: boolean;
	};
	filters: {
		excludedMovementTypes: string[];
		excludedKeywords: string[];
		includedMovementTypes: string[];
	};
	dataRetention: {
		judicialMovementRetentionDays: number;
		notificationLogRetentionDays: number;
		alertRetentionDays: number;
		/** Días para retener movimientos descartados por política ('skipped') */
		skippedRetentionDays?: number;
		autoCleanupEnabled: boolean;
		cleanupHour: number;
	};
	endpoints: {
		notificationServiceUrl: string;
		judicialMovementsEndpoint: string;
		fallbackServiceUrl: string | null;
	};
	status: {
		enabled: boolean;
		mode: string;
		maintenanceMessage: string;
		/** Coordinador interno de movimientos PJN (safety-net en la-notification) */
		coordinatorEnabled?: boolean;
		/** Coordinación de cédulas (bandeja PJN → JudicialCedula) */
		cedulasEnabled?: boolean;
	};
	movementPolicies?: MovementPolicies | null;
	stats?: {
		lastNotificationSentAt: string | null;
		totalNotificationsSent: number;
		totalMovementsProcessed: number;
		lastError?: {
			message: string;
			timestamp: string;
			count: number;
		} | null;
	};
	metadata?: {
		createdBy: string;
		lastModifiedBy: string;
		version: string;
		notes: string;
	};
	createdAt?: string;
	updatedAt?: string;
}

/**
 * PATCH por secciones. Las secciones escalares mergean campo a campo en el
 * backend; `movementPolicies` se REEMPLAZA entera (enviar el objeto completo).
 */
export type JudicialNotificationConfigUpdate = Partial<
	Pick<
		JudicialNotificationConfig,
		| "notificationSchedule"
		| "limits"
		| "retryConfig"
		| "contentConfig"
		| "filters"
		| "dataRetention"
		| "endpoints"
		| "status"
		| "movementPolicies"
	>
>;

// ----------------------------------------------------------------------
// Sources conocidos (workers deployados que envían movimientos). La UI los
// muestra siempre; un source sin entrada en el doc hereda defaults/fallback.
// ----------------------------------------------------------------------

export const KNOWN_MOVEMENT_SOURCES: { key: string; label: string; hint?: string }[] = [
	{ key: "pjn-app-update-worker", label: "PJN — app-update", hint: "Cluster por fuero en pjnworker" },
	{ key: "pjn-mis-causas-update-worker", label: "PJN Mis Causas — private-causas-update", hint: "Portal autenticado (worker_02)" },
	{ key: "scba-update-worker", label: "SCBA — update (active + archived)", hint: "Workers dinámicos del scba-manager" },
	{ key: "mev-update-worker", label: "MEV — update-cluster", hint: "worker-002" },
	{ key: "eje-update-worker", label: "EJE — update-worker", hint: "worker_02" },
	{ key: "eje-stuck-worker", label: "EJE — stuck-worker (first-touch)", hint: "worker_02" },
];

// Claves de jurisdicción que resuelve la-notification en la ENTREGA (el
// movimiento persistido solo trae 'pjn'|'eje'|'mev'|'scba', no la clave del
// worker). Overridean defaults para todo lo que llegue de esa jurisdicción,
// sin importar qué worker lo haya enviado. Para un toggle global alcanza con
// editar los defaults.
export const DELIVERY_MOVEMENT_SOURCES: { key: string; label: string; hint?: string }[] = [
	{ key: "pjn", label: "Entrega central — PJN", hint: "app-update + Mis Causas + coordinador interno + pjn-api" },
	{ key: "eje", label: "Entrega central — EJE", hint: "update + stuck worker" },
	{ key: "mev", label: "Entrega central — MEV", hint: "update-cluster" },
	{ key: "scba", label: "Entrega central — SCBA", hint: "update + archived worker" },
];

// ----------------------------------------------------------------------
// API
// ----------------------------------------------------------------------

const BASE = "/api/judicial-notification-config";

const JudicialNotificationConfigService = {
	async getConfig(): Promise<JudicialNotificationConfig> {
		const response = await adminAxios.get(BASE);
		return response.data.data;
	},

	async updateConfig(updates: JudicialNotificationConfigUpdate): Promise<JudicialNotificationConfig> {
		const response = await adminAxios.patch(BASE, updates);
		return response.data.data;
	},

	/** PATCH parcial de contentConfig (el backend mergea campo a campo). */
	async updateContentConfig(content: Partial<JudicialNotificationConfig["contentConfig"]>): Promise<JudicialNotificationConfig> {
		const response = await adminAxios.patch(BASE, { contentConfig: content });
		return response.data.data;
	},

	async toggleNotifications(enabled?: boolean): Promise<{ enabled: boolean }> {
		const response = await adminAxios.post(`${BASE}/toggle`, enabled === undefined ? {} : { enabled });
		return response.data.data;
	},

	async resetStats(): Promise<JudicialNotificationConfig["stats"]> {
		const response = await adminAxios.post(`${BASE}/reset-stats`);
		return response.data.data;
	},
};

export default JudicialNotificationConfigService;
