import mktAxios from "utils/mktAxios";

// Recorrido del contacto (la-marketing-service: /api/journey/*)

export interface JourneyCampaign {
	_id: string;
	name: string;
	status: "active" | "paused" | "draft";
	tipo: string;
	subtipo: string | null;
	syncWithSegment: boolean;
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

export interface JourneyMapData {
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
		conversion: JourneyStageData & { sub: Record<"previsional" | "archivadas" | "tope", JourneyStageData> };
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
