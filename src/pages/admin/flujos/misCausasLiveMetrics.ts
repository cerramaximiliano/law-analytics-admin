// Métricas en vivo del diagrama del repo pjn-mis-causas: colas e instancias de
// los workers que maneja el manager (scraping-manager-state), cobertura del
// update del día y corridas de hoy del updater. Lo de PM2 lo agrega computeLive.
import ScrapingManagerService, { WorkerStateInfo } from "api/scrapingManager";
import pjnCredentialsService from "api/pjnCredentials";
import CausasUpdateService from "api/causasUpdate";
import { FlowMetrics, NodeLivePatch, peorTono } from "./live/computeLive";

const nf = (n: number) => n.toLocaleString("es-AR");

function patchWorker(nombre: string, w: WorkerStateInfo | undefined): NodeLivePatch | null {
	if (!w) return null;
	const detail = [
		`${nombre}: cola ${nf(w.queueDepth)} · ${w.currentInstances}/${w.desiredInstances} instancias${
			w.withinSchedule ? "" : " · fuera de horario"
		}`,
		w.reason ? `  ${w.reason}` : null,
		w.error ? `  error: ${w.error}` : null,
	].filter((x): x is string => !!x);
	if (w.error) return { tone: "bad", badge: "error", detail };
	if (!w.enabled) return { tone: "idle", badge: "apagado", detail };
	// Cola con trabajo, dentro de horario y sin nadie atendiéndola: el manager no está escalando.
	const trabada = w.queueDepth > 0 && w.currentInstances === 0 && w.desiredInstances > 0;
	return {
		tone: trabada ? "warn" : w.currentInstances > 0 ? "ok" : "idle",
		badge: w.currentInstances > 0 ? `cola ${nf(w.queueDepth)} · ${w.currentInstances} inst` : `cola ${nf(w.queueDepth)}`,
		detail,
	};
}

function unir(...ps: (NodeLivePatch | null)[]): NodeLivePatch | undefined {
	const v = ps.filter((p): p is NodeLivePatch => !!p);
	if (!v.length) return undefined;
	return { tone: peorTono(...v.map((p) => p.tone)), badge: v[0].badge, detail: v.flatMap((p) => p.detail ?? []) };
}

export async function misCausasLiveMetrics(): Promise<FlowMetrics> {
	const [state, cov, runs] = await Promise.allSettled([
		ScrapingManagerService.getManagerState(),
		pjnCredentialsService.getUpdateCoverage(),
		CausasUpdateService.getStats(),
	]);
	if (state.status === "rejected" && cov.status === "rejected" && runs.status === "rejected") throw new Error("sin métricas");
	const out: FlowMetrics = {};

	const ms = state.status === "fulfilled" ? state.value.data?.managerStatus : null;
	if (ms) {
		const w = ms.workers || {};
		const segs = ms.lastPoll ? Math.round((Date.now() - new Date(ms.lastPoll).getTime()) / 1000) : null;
		const viejo = segs == null || segs > 180;
		out.manager = {
			tone: !ms.isRunning || viejo ? "bad" : !ms.globalEnabled || !ms.serviceAvailable ? "warn" : "ok",
			badge: !ms.isRunning ? "detenido" : viejo ? "sin heartbeat" : `poll hace ${segs} s`,
			detail: [
				`Último poll: ${ms.lastPoll ? new Date(ms.lastPoll).toLocaleString("es-AR") : "nunca"}`,
				`Global ${ms.globalEnabled ? "encendido" : "apagado"} · servicio ${ms.serviceAvailable ? "disponible" : "no disponible"}`,
			],
		};
		const p = (k: string) => patchWorker(k, w[k]);
		const set = (id: string, v: NodeLivePatch | null | undefined) => {
			if (v) out[id] = v;
		};
		set("credproc", p("credentials-processor"));
		set("queueproc", p("sync-queue-processor"));
		set("full", p("mis-causas"));
		set("daily", p("update-sync"));
		set("priv", unir(p("private-causas-update"), p("initial-sync")));
		const sq = w["sync-queue-processor"];
		if (sq)
			out.queue = {
				tone: sq.queueDepth > 0 && sq.currentInstances === 0 && sq.desiredInstances > 0 ? "warn" : "idle",
				badge: `${nf(sq.queueDepth)} en staging`,
				detail: [],
			};
	}

	if (cov.status === "fulfilled" && cov.value?.data) {
		const c = cov.value.data;
		const linea = (n: string, b?: { total: number; updatedToday: number; pending: number; withErrors: number; coveragePercent: number }) =>
			b
				? `${n}: ${nf(b.updatedToday)}/${nf(b.total)} al día (${b.coveragePercent}%) · ${nf(b.pending)} pendientes · ${nf(
						b.withErrors,
				  )} con error`
				: null;
		out.datos = {
			tone: c.withErrors > 0 ? "warn" : "ok",
			badge: `${c.coveragePercent}% al día${c.withErrors ? ` · ${nf(c.withErrors)} err` : ""}`,
			detail: [linea("Públicas", c.publicas), linea("Privadas", c.privadas)].filter((x): x is string => !!x),
		};
	}

	if (runs.status === "fulfilled" && runs.value?.data?.today) {
		const t = runs.value.data.today;
		const errores = t.errors ?? 0;
		const linea = `Hoy: ${nf(t.totalRuns)} corridas · ${nf(t.causasProcessed)} causas · ${nf(t.newMovimientos)} movimientos nuevos · ${nf(
			errores,
		)} corridas con error`;
		const prev = out.priv;
		out.priv = {
			tone: peorTono(prev?.tone, errores > 0 ? "warn" : undefined),
			badge: prev?.badge ?? `${nf(t.newMovimientos)} mov. hoy`,
			detail: [linea, ...(prev?.detail ?? [])],
		};
	}
	return out;
}

/** Mismas métricas para el diagrama "Causas PJN por credencial", con sus ids de nodo. */
export async function misCausasCredencialesMetrics(): Promise<FlowMetrics> {
	const m = await misCausasLiveMetrics();
	const out: FlowMetrics = {};
	if (m.full) out.full = m.full;
	if (m.daily) out.daily = m.daily;
	if (m.priv) out.movs = m.priv;
	return out;
}
