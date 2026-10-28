import { JourneyCampaignStats, JourneyConversionSummary, JourneyMetrics, JourneyPeriod } from "api/journey";

export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("es-AR"));
export const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");
export const dateShort = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR") : "—");
export const PERIOD_LABEL: Record<JourneyPeriod, string> = { "7": "7 días", "30": "30 días", "90": "90 días", all: "Todo" };

export const ZERO: JourneyMetrics = {
	sent: 0,
	delivered: 0,
	opens: 0,
	clicks: 0,
	hardBounce: 0,
	softBounce: 0,
	bounced: 0,
	complained: 0,
	unsubscribed: 0,
};

export const periodTotal = (c: JourneyCampaignStats, p: JourneyPeriod): JourneyMetrics => c.periods[p]?.total ?? ZERO;
export const periodConv = (c: JourneyCampaignStats, p: JourneyPeriod): JourneyConversionSummary =>
	c.conversions?.[p] ?? { total: 0, byStep: {}, medianDays: null, medianDaysByStep: {}, bestStep: null, withClick: 0 };

// Altas (captación) o pagos (usuarios) de la campaña en el período.
export const periodAltas = (c: JourneyCampaignStats, p: JourneyPeriod): number => periodConv(c, p).total + (c.paid?.[p]?.total ?? 0);

export const per1000 = (altas: number, sent: number) => (sent > 0 ? ((altas / sent) * 1000).toFixed(2) : "—");

// Paso con mayor caída: el que retiene la menor proporción de entregados respecto del paso anterior.
export const biggestDropStep = (steps: Record<string, JourneyMetrics>): number | null => {
	const keys = Object.keys(steps)
		.map(Number)
		.sort((a, b) => a - b);
	let worst: number | null = null;
	let worstRatio = 1;
	for (let i = 1; i < keys.length; i++) {
		const prev = steps[keys[i - 1]].delivered;
		const cur = steps[keys[i]].delivered;
		if (prev >= 30) {
			const ratio = cur / prev;
			if (ratio < worstRatio) {
				worstRatio = ratio;
				worst = keys[i];
			}
		}
	}
	return worst;
};
