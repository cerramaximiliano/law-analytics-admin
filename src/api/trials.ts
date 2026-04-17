import adminAxios from "utils/adminAxios";

// ── Tipos comunes ──────────────────────────────────────────────────────────────

export interface TrialResources {
	folders: { current: number; limit: number; atRisk: number };
	calculators: { current: number; limit: number; atRisk: number };
	contacts: { current: number; limit: number; atRisk: number };
	totalAtRisk: number;
}

export type TrialUrgency = "ok" | "attention" | "warning" | "critical" | "expired" | "unknown";

// ── Períodos de prueba (status: trialing) ─────────────────────────────────────

export interface TrialSubscription {
	_id: string;
	user: { _id: string; email: string; name: string } | null;
	plan: string;
	status: string;
	trialStart: string | null;
	trialEnd: string | null;
	daysRemaining: number | null;
	urgency: TrialUrgency;
	resources: TrialResources | null;
	paymentMethod: string | null;
	testMode: boolean;
	createdAt: string;
}

export interface TrialStats {
	total: number;
	active: number;
	expired: number;
	expiring1d: number;
	expiring3d: number;
	expiring7d: number;
}

export interface GetTrialSubscriptionsParams {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	expiringSoon?: "1" | "3" | "7";
	testMode?: boolean;
}

// ── Períodos de gracia ────────────────────────────────────────────────────────

export interface GracePeriod {
	_id: string;
	type: "downgrade" | "payment";
	user: { _id: string; email: string; name: string } | null;
	plan: string;
	previousPlan: string | null;
	targetPlan: string | null;
	startedAt: string | null;
	expiresAt: string | null;
	daysRemaining: number | null;
	isExpired: boolean;
	isCompleted: boolean;
	processedAt: string | null;
	// downgrade específico
	reminder3DaysSent?: boolean;
	reminder1DaySent?: boolean;
	resources?: TrialResources | null;
	// payment específico
	failureCount?: number;
	lastFailureReason?: string;
	reminderSent?: boolean;
	testMode: boolean;
}

export interface GraceStats {
	downgrade: { total: number; active: number; expired: number; completed: number };
	payment: { total: number };
	total: number;
}

export interface GetGracePeriodsParams {
	page?: number;
	limit?: number;
	type?: "downgrade" | "payment" | "";
	status?: "active" | "expired" | "completed" | "";
	testMode?: boolean;
}

// ── Configuración de trial ────────────────────────────────────────────────────

export interface PlanTrialConfig {
	planId: string;
	displayName: string;
	trialDays: { development: number; production: number };
}

export interface UpdateTrialConfigParams {
	environment: "development" | "production";
	trialDays: number;
}

// ── Configuración de período de gracia ────────────────────────────────────────

export interface GraceConfig {
	downgradeGraceDays: number;
	paymentGraceDays: number;
}

export interface UpdateGraceConfigParams {
	downgradeGraceDays?: number;
	paymentGraceDays?: number;
}

// ── Respuestas genéricas ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
	success: boolean;
	data: T[];
	stats: { total: number; page: number; limit: number; totalPages: number };
}

// ── Servicio ──────────────────────────────────────────────────────────────────

class TrialsService {
	// Períodos de prueba
	async getTrialSubscriptions(params: GetTrialSubscriptionsParams = {}): Promise<PaginatedResponse<TrialSubscription>> {
		const response = await adminAxios.get("/api/trials", { params });
		return response.data;
	}

	async getTrialStats(): Promise<{ success: boolean; data: TrialStats }> {
		const response = await adminAxios.get("/api/trials/stats");
		return response.data;
	}

	// Períodos de gracia
	async getGracePeriods(params: GetGracePeriodsParams = {}): Promise<PaginatedResponse<GracePeriod>> {
		const response = await adminAxios.get("/api/trials/grace", { params });
		return response.data;
	}

	async getGraceStats(): Promise<{ success: boolean; data: GraceStats }> {
		const response = await adminAxios.get("/api/trials/grace/stats");
		return response.data;
	}

	// Configuración
	async getTrialConfig(): Promise<{ success: boolean; data: PlanTrialConfig[] }> {
		const response = await adminAxios.get("/api/trials/config");
		return response.data;
	}

	async updateTrialConfig(planId: string, params: UpdateTrialConfigParams): Promise<{ success: boolean; message: string }> {
		const response = await adminAxios.put(`/api/trials/config/${planId}`, params);
		return response.data;
	}

	// Configuración de período de gracia
	async getGraceConfig(): Promise<{ success: boolean; data: GraceConfig }> {
		const response = await adminAxios.get("/api/trials/grace/config");
		return response.data;
	}

	async updateGraceConfig(params: UpdateGraceConfigParams): Promise<{ success: boolean; message: string; data: GraceConfig }> {
		const response = await adminAxios.put("/api/trials/grace/config", params);
		return response.data;
	}
}

export default new TrialsService();
