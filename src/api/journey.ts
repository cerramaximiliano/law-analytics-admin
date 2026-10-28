import mktAxios from "utils/mktAxios";

// Recorrido del contacto (la-marketing-service: /api/journey/*)

export interface JourneyCampaign {
	_id: string;
	name: string;
	status: "active" | "paused" | "draft";
	tipo: string;
	subtipo: string | null;
	syncWithSegment: boolean;
	acceptsNew: boolean;
	dailyLimit: number;
	steps: number;
	segment: { _id: string; name: string; size: number | null; calculatedAt: string | null } | null;
	conditions: { operator: string; filters: Array<{ field: string; text: string }> } | null;
	stepFilters: string[];
	active: number;
}

export interface JourneyReason {
	text: string;
	count: number;
}

export interface JourneyStageData {
	en_campania?: number;
	sin_campania?: number;
	reasons?: { sampleSize: number; items: JourneyReason[] } | null;
	campaigns?: JourneyCampaign[];
	total?: number;
}

export interface JourneyBucket {
	key: string;
	label: string;
	kind: "ok" | "info" | "intencional" | "fuga";
	description: string;
	count: number;
}

export type JourneyPeriod = "7" | "30" | "90" | "all";

export interface JourneyMetrics {
	sent: number;
	delivered: number;
	opens: number;
	clicks: number;
	hardBounce: number;
	softBounce: number;
	bounced: number;
	complained: number;
	unsubscribed: number;
}

export interface JourneyStepContent {
	seq: number;
	name: string;
	subject: string;
	template: string | null;
	delay: string;
	filter: string[];
	ab: Array<{ name: string; subject: string | null; template: string | null; weight: number }> | null;
}

export interface JourneyConversionSummary {
	total: number;
	byStep: Record<string, number>;
	medianDays: number | null;
	medianDaysByStep: Record<string, number | null>;
	bestStep: number | null;
	withClick: number;
}

export interface JourneyCampaignStats {
	name: string;
	status: string;
	tipo: string;
	subtipo: string | null;
	createdAt: string | null;
	completedAt: string | null;
	archivedAt: string | null;
	firstSend: string | null;
	lastSend: string | null;
	totalSent: number;
	durationDays: number | null;
	enrollment: {
		everEnrolled: number;
		active: number;
		paused: number;
		completedByReason: Record<string, number>;
		removedByReason: Record<string, number>;
		skippedByReason: Record<string, number>;
	} | null;
	activeByStep: Record<string, number>;
	steps: JourneyStepContent[];
	periods: Partial<
		Record<
			JourneyPeriod,
			{ steps: Record<string, JourneyMetrics>; variants: Record<string, Record<string, JourneyMetrics>>; total: JourneyMetrics }
		>
	>;
	conversions: Record<JourneyPeriod, JourneyConversionSummary>;
	paid: Record<JourneyPeriod, { total: number; byStep: Record<string, number> }>;
	health: Array<{ kind: string; texto: string; lastSentAt: string }>;
	coordinator: Partial<Record<JourneyPeriod, { deferred: number; wouldDefer: number; skipped: number }>>;
}

export interface JourneyCategoryTotals {
	everEnrolled: number;
	active: number;
	completedByReason: Record<string, number>;
	removedByReason: Record<string, number>;
	skippedByReason: Record<string, number>;
	activeByStep: Record<string, number>;
	converted: number;
	paid: number;
	contactsEver: number;
}

export interface JourneyV2 {
	periods: JourneyPeriod[];
	orphans?: { conversions: number };
	campaigns: Record<string, JourneyCampaignStats>;
	categories: Record<string, JourneyCategoryTotals | null>;
	cohorts: Record<string, Array<{ week: string; entered: number; converted: number }>>;
	usersAging: Record<
		string,
		{ n: number; avgDays: number; lt7: number; d7_30: number; d30_60: number; gt60: number; gt30: number; gt90: number }
	>;
}

export interface JourneyMapData {
	v2?: JourneyV2 | null;
	v2Error?: string | null;
	generatedAt: string;
	tookMs: number;
	cached?: boolean;
	flows: { windowDays: number; altas: { total: number; bySubtipo: Record<string, number> }; entradas: Record<string, number> };
	captacion: {
		campaigns: Record<string, JourneyCampaign[]>;
		activeCampaigns: number;
		nonUsersActive: number;
		buckets: JourneyBucket[];
		fuga: { reasons: JourneyReason[]; sampleSize: number; conHistorial: number; nuncaEntraron: number } | null;
		nonActive: Record<string, number>;
	};
	stages: {
		counts: Record<string, { total: number; sub: Record<string, number> }>;
		onboarding: JourneyStageData;
		conversion: JourneyStageData & {
			subOrder?: string[];
			sub: Record<string, JourneyStageData & { label?: string; total?: number }>;
		};
		inactivo: JourneyStageData;
		cliente: { total: number };
		activo_free: { total: number };
	};
	lane: { contenido: JourneyCampaign[]; servicio: JourneyCampaign[] };
	exclusivity: Record<string, { count: number; sample: string[] }>;
	types: Record<string, { label: string; color: string }>;
}

export interface JourneyLeakItem {
	contactId: string;
	email: string;
	etapa: string | null;
	closest: string | null;
	failing: string[];
	reason: string | null;
}

export interface JourneyLookup {
	contact: {
		contactId: string;
		email: string;
		status: string;
		isAppUser: boolean;
		userId: string | null;
		etapa: string;
		subetapa: string | null;
		etapaDesde: string | null;
		neverBounce: string | null;
	};
	enrollments: Array<{
		campaignId: string;
		name: string;
		tipo: string | null;
		subtipo: string | null;
		campaignStatus: string | null;
		status: string;
		currentStep: number;
		joinedAt: string;
		removedAt: string | null;
		removalReason: string | null;
		completedAt: string | null;
	}>;
	evaluated: Array<{
		campaignId: string;
		name: string;
		tipo: string;
		subtipo: string | null;
		matches: boolean;
		enrolled: boolean;
		acceptsNew: boolean;
		filters: Array<{ text: string; ok: boolean }>;
		nextStepFilter: string[] | null;
	}>;
	exclusions: Array<{ key: string; text: string }>;
	coordinator: { enabled: boolean; dryRun: boolean; maxPerDay: number; maxPerWeek: number; sentLast7Days: number; sentToday: number };
	highlight: { stage: string; campaignIds: string[] };
}

export const JourneyService = {
	getMap: async (refresh = false): Promise<JourneyMapData> => {
		const response = await mktAxios.get("/api/journey/map", { params: refresh ? { refresh: 1 } : {}, timeout: refresh ? 300000 : 60000 });
		return response.data.data;
	},
	lookup: async (q: string): Promise<JourneyLookup | null> => {
		try {
			const response = await mktAxios.get("/api/journey/lookup", { params: { q } });
			return response.data.data;
		} catch (err: any) {
			if (err?.response?.status === 404) return null;
			throw err;
		}
	},
	leaks: async (
		scope: string,
		bucket: string,
		page: number,
		limit: number,
	): Promise<{ total: number; page: number; limit: number; items: JourneyLeakItem[] }> => {
		const response = await mktAxios.get("/api/journey/leaks", { params: { scope, bucket, page, limit }, timeout: 120000 });
		return response.data.data;
	},
};
