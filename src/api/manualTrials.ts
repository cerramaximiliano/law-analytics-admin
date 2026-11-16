import adminAxios from "utils/adminAxios";

/**
 * Prueba manual sin tarjeta: un plan pago por N días, sin Stripe. Al vencer pasa a
 * Gratuito con el mismo período de gracia que una baja paga.
 * Backend: admin-api /api/manual-trials (law-analytics-server/services/manualTrialService.js).
 * Doc: la-ads/docs/producto/prueba-manual-sin-tarjeta.md
 */
export type ManualTrialPlan = "standard" | "pro" | "premium";

export const MANUAL_TRIAL_PLANS: { value: ManualTrialPlan; label: string }[] = [
	{ value: "standard", label: "Plan Estándar" },
	{ value: "pro", label: "Plan Pro" },
	{ value: "premium", label: "Plan Premium" },
];

export const MANUAL_TRIAL_MAX_DAYS = 90;

export interface ManualTrialSummary {
	active: boolean;
	plan: ManualTrialPlan | null;
	previousPlan: string | null;
	startedAt: string | null;
	endsAt: string | null;
	grantedBy: string | null;
	reason: string | null;
	extendedAt: string | null;
	reminderSentAt: string | null;
	revokedAt: string | null;
	revokedBy: string | null;
	processedAt: string | null;
	convertedAt: string | null;
	currentPlan: string;
	status: string;
}

export interface ManualTrialListItem extends ManualTrialSummary {
	userId: string;
	email: string | null;
	name: string | null;
}

export async function getManualTrial(userId: string): Promise<ManualTrialSummary | null> {
	const res = await adminAxios.get<{ success: boolean; data: ManualTrialSummary | null }>(`/api/manual-trials/${userId}`);
	return res.data.data;
}

export async function grantManualTrial(userId: string, body: { plan: ManualTrialPlan; days: number; reason?: string }): Promise<ManualTrialSummary> {
	const res = await adminAxios.post<{ success: boolean; data: ManualTrialSummary }>(`/api/manual-trials/${userId}`, body);
	return res.data.data;
}

export async function extendManualTrial(userId: string, days: number): Promise<ManualTrialSummary> {
	const res = await adminAxios.patch<{ success: boolean; data: ManualTrialSummary }>(`/api/manual-trials/${userId}`, { days });
	return res.data.data;
}

export async function revokeManualTrial(userId: string): Promise<ManualTrialSummary> {
	const res = await adminAxios.delete<{ success: boolean; data: ManualTrialSummary }>(`/api/manual-trials/${userId}`);
	return res.data.data;
}

export async function listManualTrials(status: "active" | "ended" | "converted" | "all" = "active"): Promise<ManualTrialListItem[]> {
	const res = await adminAxios.get<{ success: boolean; data: ManualTrialListItem[] }>(`/api/manual-trials`, { params: { status } });
	return res.data.data;
}
