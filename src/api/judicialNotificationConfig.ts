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
		/** Exigir que el usuario tenga la causa en su cuenta para recibir el movimiento */
		requireFolderForDelivery?: boolean;
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
	/** Banner de upgrade de plan en el email de movimientos (entrega central) */
	planBanner?: {
		enabled?: boolean;
		/** Máx. 1 banner por usuario cada N días (0 = en cada email) */
		cooldownDays?: number;
		minArchivedFolders?: number;
		excludePlans?: string[];
		emailTypes?: string[];
		promo?: { enabled?: boolean; code?: string | null; text?: string | null };
	};
	/** Strip informativo de opciones de notificación */
	notificationOptionsBanner?: {
		enabled?: boolean;
		/** null = copy por defecto del sistema */
		text?: string | null;
		emailTypes?: string[];
		/** Texto por tipo de email (pisa `text` para ese tipo) */
		textByType?: Record<string, string> | null;
	};
	/** Notificaciones de seguimiento postal (webhook inmediato + safe guard diario) */
	postalNotifications?: {
		enabled?: boolean;
		safeGuardEnabled?: boolean;
	};
	/** Política transversal de banners promocionales */
	bannerPolicy?: {
		sharedCooldown?: { enabled?: boolean; days?: number; participants?: string[] };
		priority?: string[];
	};
	/** Banner de anuncio/feature en todos los emails de notificación */
	featureBanner?: {
		enabled?: boolean;
		title?: string | null;
		text?: string | null;
		ctaLabel?: string | null;
		ctaUrl?: string | null;
		emailTypes?: string[];
		/** Mostrar aunque el email ya lleve el banner de plan */
		showWithPlanBanner?: boolean;
	};
	/** Banner de invitación a sincronizar Google Calendar (solo usuarios no conectados) */
	googleCalendarBanner?: {
		enabled?: boolean;
		title?: string | null;
		text?: string | null;
		ctaLabel?: string | null;
		ctaUrl?: string | null;
		emailTypes?: string[];
		/** Cooldown propio en días (default 14; 0 = en cada email) */
		cooldownDays?: number;
		/** Mostrar aunque el email ya lleve el banner de plan o el de feature */
		showWithOtherBanners?: boolean;
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
		| "planBanner"
		| "featureBanner"
		| "googleCalendarBanner"
		| "notificationOptionsBanner"
		| "bannerPolicy"
		| "postalNotifications"
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

/** Tipos de email de usuario donde pueden aparecer los banners */
export const EMAIL_TYPES: { key: string; label: string }[] = [
	{ key: "movimiento", label: "Movimientos" },
	{ key: "calendario", label: "Calendario" },
	{ key: "tareas", label: "Tareas" },
	{ key: "vencimiento", label: "Vencimientos" },
	{ key: "inactividad", label: "Caducidad/prescripción" },
	{ key: "postal", label: "Seguimiento postal" },
];

// ----------------------------------------------------------------------
// Registro de TODOS los procesos que actualizan movimientos y notifican.
// Un proceso por fila (varios procesos pueden compartir la misma sourceKey,
// ej. los 4 clusters por fuero de PJN o el worker archived de SCBA).
// `fallback` replica la política hardcodeada en el código de cada worker —
// si se cambia allí, actualizar acá.
// ----------------------------------------------------------------------

export interface WorkerRegistryEntry {
	/** Clave con la que el worker resuelve movementPolicies.sources */
	sourceKey: string;
	proceso: string; // nombre PM2
	repo: string;
	server: string;
	jurisdiccion: "pjn" | "eje" | "mev" | "scba";
	/** Política hardcodeada en el worker (capa fallback) */
	fallback: MovementPolicy;
	/** false = código legacy sin soporte de movementPolicies */
	supportsPolicies: boolean;
	/**
	 * 1ª barrera (worker-side) para folders archivados: descripción de cómo
	 * el worker maneja archivados de su lado, o null si NO aplica ningún
	 * filtro propio (depende 100% de la 2ª barrera: la entrega central).
	 */
	archivedBarrier: string | null;
	nota?: string;
}

export const WORKER_REGISTRY: WorkerRegistryEntry[] = [
	{
		sourceKey: "pjn-app-update-worker",
		proceso: "pjn-app-update-civil",
		archivedBarrier: null,
		repo: "pjn-workers",
		server: "pjnworker",
		jurisdiccion: "pjn",
		fallback: { firstSyncPolicy: "today-only", cacheSourceTodayOnly: true },
		supportsPolicies: true,
	},
	{
		sourceKey: "pjn-app-update-worker",
		proceso: "pjn-app-update-ss",
		archivedBarrier: null,
		repo: "pjn-workers",
		server: "pjnworker",
		jurisdiccion: "pjn",
		fallback: { firstSyncPolicy: "today-only", cacheSourceTodayOnly: true },
		supportsPolicies: true,
	},
	{
		sourceKey: "pjn-app-update-worker",
		proceso: "pjn-app-update-trabajo",
		archivedBarrier: null,
		repo: "pjn-workers",
		server: "pjnworker",
		jurisdiccion: "pjn",
		fallback: { firstSyncPolicy: "today-only", cacheSourceTodayOnly: true },
		supportsPolicies: true,
	},
	{
		sourceKey: "pjn-app-update-worker",
		proceso: "pjn-app-update-comercial",
		archivedBarrier: null,
		repo: "pjn-workers",
		server: "pjnworker",
		jurisdiccion: "pjn",
		fallback: { firstSyncPolicy: "today-only", cacheSourceTodayOnly: true },
		supportsPolicies: true,
	},
	{
		sourceKey: "pjn-mis-causas-update-worker",
		proceso: "pjn-private-causas-update",
		archivedBarrier: null,
		repo: "pjn-mis-causas",
		server: "worker_02",
		jurisdiccion: "pjn",
		fallback: { firstSyncPolicy: "silent-baseline" },
		supportsPolicies: true,
		nota: "Causas privadas del portal autenticado",
	},
	{
		sourceKey: "app-update-worker",
		proceso: "pjn-app-update (legacy)",
		archivedBarrier: null,
		repo: "pjn-workers-scraping",
		server: "worker_01",
		jurisdiccion: "pjn",
		fallback: {},
		supportsPolicies: false,
		nota: "Código legacy sin movementPolicies ni first-sync guard — debe permanecer apagado",
	},
	{
		sourceKey: "mev-update-worker",
		proceso: "mev-update-cluster",
		archivedBarrier: null,
		repo: "mev-workers",
		server: "worker-002",
		jurisdiccion: "mev",
		fallback: { firstSyncPolicy: "silent-baseline" },
		supportsPolicies: true,
	},
	{
		sourceKey: "scba-update-worker",
		proceso: "scba-update-worker",
		archivedBarrier:
			"Aplica notifyArchivedFolders por causa (gate cuando TODOS sus folders están archivados). Alcance según configuracion-scba.updatePolicy.mode: 'split' = solo causas con ≥1 folder activo; 'unified' = todas las causas con folder, archivadas incluidas",
		repo: "scba-workers",
		server: "worker_02",
		jurisdiccion: "scba",
		fallback: { firstSyncPolicy: "today-only", notifyArchivedFolders: true },
		supportsPolicies: true,
		nota: "Partición del trabajo configurable en Workers → SCBA manager → Configuración (Política de update)",
	},
	{
		sourceKey: "scba-update-worker",
		proceso: "scba-update-archived-worker",
		archivedBarrier: "Mismo gate por causa que el update principal (notifyArchivedFolders según estado real de folders)",
		repo: "scba-workers",
		server: "worker_02",
		jurisdiccion: "scba",
		fallback: { firstSyncPolicy: "today-only", notifyArchivedFolders: true },
		supportsPolicies: true,
		nota: "Modo archived (1×/día 4 AM) — solo corre con updatePolicy 'split'; en 'unified' queda ocioso (el update principal cubre las archivadas). Comparte la clave scba-update-worker",
	},
	{
		sourceKey: "eje-update-worker",
		proceso: "eje-update-worker",
		archivedBarrier: null,
		repo: "eje-workers",
		server: "worker_02",
		jurisdiccion: "eje",
		fallback: { firstSyncPolicy: "silent-baseline" },
		supportsPolicies: true,
	},
	{
		sourceKey: "eje-stuck-worker",
		proceso: "eje-stuck-worker",
		archivedBarrier: null,
		repo: "eje-workers",
		server: "worker_02",
		jurisdiccion: "eje",
		fallback: { firstSyncPolicy: "silent-baseline" },
		supportsPolicies: true,
		nota: "First-touch nocturno: siempre es primera sincronización",
	},
];

// ----------------------------------------------------------------------
// Resolución de política efectiva — misma cascada que usan los workers:
// sources[sourceKey] → defaults → fallback hardcodeado → base.
// Devuelve cada campo con la capa de la que salió, para mostrar en la UI
// de dónde viene cada valor.
// ----------------------------------------------------------------------

export type PolicyLayer = "override" | "defaults" | "fallback" | "base";

export interface ResolvedField<T> {
	value: T;
	layer: PolicyLayer;
}

export interface EffectivePolicy {
	enabled: ResolvedField<boolean>;
	firstSyncPolicy: ResolvedField<FirstSyncPolicy>;
	offDayMode: ResolvedField<OffDayMode>;
	/** null = heredar notificationSchedule.activeDays global */
	activeDays: ResolvedField<number[] | null>;
	notifyArchivedFolders: ResolvedField<boolean>;
	cacheSourceTodayOnly: ResolvedField<boolean | undefined>;
	/** null = usar filters globales */
	filters: ResolvedField<MovementPolicy["filters"]>;
}

const BASE_POLICY: Required<Pick<MovementPolicy, "enabled" | "firstSyncPolicy" | "offDayMode" | "notifyArchivedFolders">> & MovementPolicy =
	{
		enabled: true,
		firstSyncPolicy: "silent-baseline",
		offDayMode: "skip",
		notifyArchivedFolders: true,
		activeDays: null,
		filters: null,
	};

export function resolveEffectivePolicy(
	policies: MovementPolicies | null | undefined,
	sourceKey: string,
	fallback: MovementPolicy = {},
): EffectivePolicy {
	const layers: { layer: PolicyLayer; policy: MovementPolicy }[] = [
		{ layer: "override", policy: policies?.sources?.[sourceKey] || {} },
		{ layer: "defaults", policy: policies?.defaults || {} },
		{ layer: "fallback", policy: fallback },
		{ layer: "base", policy: BASE_POLICY },
	];

	function pick<K extends keyof MovementPolicy>(field: K): ResolvedField<any> {
		for (const { layer, policy } of layers) {
			const v = policy[field];
			// activeDays/filters usan null como "heredar" explícito → tratarlo
			// igual que undefined para seguir bajando de capa.
			if (v !== undefined && v !== null) return { value: v, layer };
		}
		return { value: field === "activeDays" || field === "filters" ? null : undefined, layer: "base" };
	}

	return {
		enabled: pick("enabled"),
		firstSyncPolicy: pick("firstSyncPolicy"),
		offDayMode: pick("offDayMode"),
		activeDays: pick("activeDays"),
		notifyArchivedFolders: pick("notifyArchivedFolders"),
		cacheSourceTodayOnly: pick("cacheSourceTodayOnly"),
		filters: pick("filters"),
	};
}

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
