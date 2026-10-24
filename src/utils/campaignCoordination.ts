// Helpers del coordinador de campañas (tope por persona, prioridad y desplazamiento).
// Diseño: la-ads/analysis/2026-10-24-coordinador-campanas.md. Backend: la-marketing-service
// (services/scheduler/frequencyGate.js, GET/PUT /api/scheduler/frequency).

import {
	Campaign,
	CampaignDeferredCount,
	FrequencyPolicy,
	SchedulerFrequencyConfig,
	SchedulerFrequencyDay,
	SchedulerFrequencyState,
} from "types/campaign";
import { CampaignEmail } from "types/campaign-email";

export const DEFAULT_FREQUENCY_POLICY: FrequencyPolicy = {
	priority: 50,
	exempt: false,
	pausesLowerPriority: false,
	perishable: false,
};

// Defaults del backend (services/scheduler/schedulerConfig.js); se usan solo si el endpoint no responde.
export const DEFAULT_FREQUENCY_CONFIG: SchedulerFrequencyConfig = {
	enabled: true,
	dryRun: true,
	maxPerDay: 1,
	maxPerWeek: 3,
	maxDeferralDays: 14,
	reserveHours: 24,
	exemptCategories: ["newsletter", "notification"],
};

export const getPolicy = (campaign: Pick<Campaign, "frequencyPolicy">): FrequencyPolicy => ({
	...DEFAULT_FREQUENCY_POLICY,
	...(campaign.frequencyPolicy || {}),
	priority:
		typeof campaign.frequencyPolicy?.priority === "number" && !Number.isNaN(campaign.frequencyPolicy.priority)
			? campaign.frequencyPolicy.priority
			: DEFAULT_FREQUENCY_POLICY.priority,
});

export const clampPriority = (value: number): number => {
	if (Number.isNaN(value)) return DEFAULT_FREQUENCY_POLICY.priority;
	return Math.max(0, Math.min(100, Math.round(value)));
};

export const isExemptByCategory = (campaign: Pick<Campaign, "category">, exemptCategories: string[]): boolean => {
	const cat = (campaign.category || "").trim().toLowerCase();
	if (!cat) return false;
	return exemptCategories.some((c) => c.trim().toLowerCase() === cat);
};

export const isCampaignExempt = (campaign: Pick<Campaign, "category" | "frequencyPolicy">, exemptCategories: string[]): boolean =>
	Boolean(campaign.frequencyPolicy?.exempt) || isExemptByCategory(campaign, exemptCategories);

// Boletines SAIJ: worker_SAIJ_0 crea una campaña única por edición ("Jurisprudencia SAIJ — <fecha>").
export const isSaijEdition = (campaign: Pick<Campaign, "name">): boolean => /^jurisprudencia\s+saij/i.test((campaign.name || "").trim());

export const policiesEqual = (a: FrequencyPolicy, b: FrequencyPolicy): boolean =>
	a.priority === b.priority && a.exempt === b.exempt && a.pausesLowerPriority === b.pausesLowerPriority && a.perishable === b.perishable;

// timeDelay → días (horas y minutos como fracción).
export const delayToDays = (delay?: { value: number; unit: string } | null): number => {
	if (!delay || typeof delay.value !== "number" || delay.value <= 0) return 0;
	switch (delay.unit) {
		case "minutes":
			return delay.value / 1440;
		case "hours":
			return delay.value / 24;
		case "weeks":
			return delay.value * 7;
		case "days":
		default:
			return delay.value;
	}
};

export const formatDelay = (delay?: { value: number; unit: string } | null): string => {
	if (!delay || !delay.value) return "inmediato";
	const labels: Record<string, [string, string]> = {
		minutes: ["minuto", "minutos"],
		hours: ["hora", "horas"],
		days: ["día", "días"],
		weeks: ["semana", "semanas"],
	};
	const [one, many] = labels[delay.unit] || [delay.unit, delay.unit];
	return `${delay.value} ${delay.value === 1 ? one : many}`;
};

export const formatDayOffset = (day: number): string => {
	if (day < 1 / 24) return "día 0";
	if (day < 1) return `día 0 + ${Math.round(day * 24)} h`;
	const whole = Math.floor(day);
	const hours = Math.round((day - whole) * 24);
	return hours > 0 ? `día ${whole} + ${hours} h` : `día ${whole}`;
};

export interface FlowStep {
	email: CampaignEmail;
	day: number; // día acumulado desde que el contacto entra
	conditional: boolean;
	filterSummary: string | null;
	fixedDate: string | null;
}

// Resumen legible de un contactFilter (filtro Mongo sobre EmailContact).
export const summarizeFilter = (filter: any): string => {
	if (filter == null) return "";
	try {
		const text = JSON.stringify(filter)
			.replace(/"customFields\./g, "")
			.replace(/"/g, "")
			.replace(/,/g, ", ")
			.replace(/:/g, ": ");
		return text.length > 220 ? `${text.slice(0, 220)}…` : text;
	} catch {
		return "filtro personalizado";
	}
};

// Pasos de una secuencia ordenados, con el día acumulado (suma de timeDelay).
export const buildFlowSteps = (emails: CampaignEmail[]): FlowStep[] => {
	const sorted = [...emails].sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));
	let acc = 0;
	return sorted.map((email) => {
		const isFixed = email.conditions?.type === "fixedDate";
		if (!isFixed) acc += delayToDays(email.conditions?.timeDelay);
		const filter = email.conditions?.customCondition?.contactFilter;
		const conditional = filter != null && (typeof filter !== "object" || Object.keys(filter).length > 0);
		return {
			email,
			day: acc,
			conditional,
			filterSummary: conditional ? summarizeFilter(filter) : null,
			fixedDate: isFixed ? email.conditions?.sendAt || null : null,
		};
	});
};

// ---------- Normalización de la respuesta de GET /api/scheduler/frequency ----------
// El backend se programó en paralelo con esta UI: se aceptan varias formas de conteo.

const addCount = (acc: Record<string, CampaignDeferredCount>, campaignId: string, reason: string, n: number) => {
	if (!campaignId || !n) return;
	const entry = acc[campaignId] || { campaignId, total: 0, byReason: {} };
	entry.total += n;
	entry.byReason[reason] = (entry.byReason[reason] || 0) + n;
	acc[campaignId] = entry;
};

export const normalizeDeferredCounts = (input: any): Record<string, CampaignDeferredCount> => {
	const acc: Record<string, CampaignDeferredCount> = {};
	if (!input) return acc;

	if (Array.isArray(input)) {
		input.forEach((item: any) => {
			if (!item || typeof item !== "object") return;
			const campaignId = String(item.campaignId ?? item._id?.campaignId ?? item._id ?? item.id ?? "");
			if (item.byReason && typeof item.byReason === "object") {
				Object.entries(item.byReason).forEach(([reason, n]) => addCount(acc, campaignId, reason, Number(n) || 0));
			} else if (item.reasons && typeof item.reasons === "object" && !Array.isArray(item.reasons)) {
				Object.entries(item.reasons).forEach(([reason, n]) => addCount(acc, campaignId, reason, Number(n) || 0));
			} else {
				const reason = String(item.reason ?? item._id?.reason ?? "deferred");
				addCount(acc, campaignId, reason, Number(item.count ?? item.total ?? item.n ?? 0));
			}
		});
		return acc;
	}

	if (typeof input === "object") {
		Object.entries(input).forEach(([campaignId, value]: [string, any]) => {
			if (typeof value === "number") {
				addCount(acc, campaignId, "deferred", value);
			} else if (value && typeof value === "object") {
				const reasons = value.byReason && typeof value.byReason === "object" ? value.byReason : value;
				Object.entries(reasons).forEach(([reason, n]) => {
					if (typeof n === "number" && reason !== "total") addCount(acc, campaignId, reason, n);
				});
			}
		});
	}
	return acc;
};

const mergeCounts = (maps: Record<string, CampaignDeferredCount>[]): Record<string, CampaignDeferredCount> => {
	const acc: Record<string, CampaignDeferredCount> = {};
	maps.forEach((m) =>
		Object.values(m).forEach((entry) =>
			Object.entries(entry.byReason).forEach(([reason, n]) => addCount(acc, entry.campaignId, reason, n)),
		),
	);
	return acc;
};

export const sumCounts = (m: Record<string, CampaignDeferredCount>): number => Object.values(m).reduce((s, e) => s + e.total, 0);

const pickConfig = (cfgSrc: any): Partial<SchedulerFrequencyConfig> =>
	Object.fromEntries(
		Object.entries({
			enabled: cfgSrc?.enabled,
			dryRun: cfgSrc?.dryRun,
			maxPerDay: cfgSrc?.maxPerDay,
			maxPerWeek: cfgSrc?.maxPerWeek,
			maxDeferralDays: cfgSrc?.maxDeferralDays,
			reserveHours: cfgSrc?.reserveHours,
			exemptCategories: Array.isArray(cfgSrc?.exemptCategories) ? cfgSrc.exemptCategories : undefined,
			timezone: cfgSrc?.timezone,
			updatedAt: cfgSrc?.updatedAt,
			updatedBy: cfgSrc?.updatedBy,
		}).filter(([, v]) => v !== undefined && v !== null),
	);

// Solo la config (respuesta del PUT: { success, data: { config } }).
export const normalizeFrequencyConfig = (body: any): SchedulerFrequencyConfig => {
	const root = body?.data ?? body ?? {};
	return { ...DEFAULT_FREQUENCY_CONFIG, ...pickConfig(root.config ?? root) };
};

// Respuesta del GET: { success, data: { config, deferred: [{ campaignId, campaignName, reason, count }],
//   daily: [{ day, deferred: {<campId>: {<motivo>: n}}, wouldDefer, skipped }] } }
export const normalizeFrequencyResponse = (body: any): SchedulerFrequencyState => {
	const root = body?.data ?? body ?? {};
	const config = normalizeFrequencyConfig(body);

	const campaignNames: Record<string, string> = {};
	if (Array.isArray(root.deferred)) {
		root.deferred.forEach((r: any) => {
			if (r?.campaignId && r?.campaignName) campaignNames[String(r.campaignId)] = r.campaignName;
		});
	}

	const daily: SchedulerFrequencyDay[] = (Array.isArray(root.daily) ? root.daily : [])
		.map((d: any) => ({
			day: String(d?.day ?? d?._id ?? ""),
			deferred: normalizeDeferredCounts(d?.deferred),
			wouldDefer: normalizeDeferredCounts(d?.wouldDefer),
			skipped: normalizeDeferredCounts(d?.skipped),
		}))
		.filter((d: SchedulerFrequencyDay) => d.day)
		.sort((a: SchedulerFrequencyDay, b: SchedulerFrequencyDay) => b.day.localeCompare(a.day));

	return {
		config,
		deferred: normalizeDeferredCounts(root.deferred),
		wouldDefer: mergeCounts([normalizeDeferredCounts(root.wouldDefer), ...daily.map((d) => d.wouldDefer)]),
		skipped: mergeCounts([normalizeDeferredCounts(root.skipped), ...daily.map((d) => d.skipped)]),
		daily,
		campaignNames,
		raw: root,
	};
};

// Payload exacto de frequencyPolicy para el PUT (el backend rechaza campos desconocidos).
export const toPolicyPayload = (p: FrequencyPolicy): FrequencyPolicy => ({
	priority: clampPriority(Number(p.priority)),
	exempt: Boolean(p.exempt),
	pausesLowerPriority: Boolean(p.pausesLowerPriority),
	perishable: Boolean(p.perishable),
});

// Motivo legible. `resolveName` traduce los ids de reserved_for:/paused_by:.
export const reasonLabel = (reason: string, resolveName?: (id: string) => string | undefined): string => {
	if (reason === "daily_cap") return "Tope diario";
	if (reason === "weekly_cap") return "Tope semanal";
	if (reason === "max_deferral" || reason === "frequency_max_deferral") return "Espera máxima superada";
	if (reason === "perishable" || reason === "frequency_perishable") return "Perecedera, salteada";
	if (reason === "deferred") return "Diferido";
	const [kind, id] = reason.split(":");
	if (id) {
		const name = resolveName?.(id) || id;
		if (kind === "reserved_for") return `Reservado para "${name}"`;
		if (kind === "paused_by") return `En pausa por "${name}"`;
	}
	return reason;
};
