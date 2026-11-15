// Arma el estado en vivo de cada nodo de un diagrama a partir de tres fuentes:
//   1. el inventario de infraestructura (PM2 de cada box vía worker-monitoring,
//      más los errores de logs de las últimas 24 h que junta el admin-api);
//   2. cron-health (heartbeat de los crons in-process del admin-api);
//   3. métricas propias del flujo (colas, cobertura, corridas), que aporta cada
//      diagrama porque solo él sabe qué significa una cola en su dominio.
// Es pura: se testea sin red y la usa useFlowLive.
import { FlowSpec, FlowNodeLiveRef, LiveTone, NodeLiveState } from "pages/admin/causas/flujos/flowTypes";
import { InfraInventory, InfraProcess } from "api/infrastructure";
import { CronHealthItem } from "api/cronHealth";

/** Lo que aporta un proveedor de métricas para un nodo. Se combina con el estado de PM2. */
export interface NodeLivePatch {
	tone?: LiveTone;
	/** Si viene, reemplaza la pastilla de PM2 (una cola dice más que "en espera"). */
	badge?: string;
	detail?: string[];
}

export type FlowMetrics = Record<string, NodeLivePatch>;

const SEVERITY: Record<LiveTone, number> = { idle: 0, ok: 1, unknown: 2, warn: 3, bad: 4 };

export const peorTono = (...tonos: (LiveTone | undefined)[]): LiveTone =>
	tonos.filter((t): t is LiveTone => !!t).reduce<LiveTone>((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), "idle");

const matchProc = (patron: string, nombre: string) => (patron.endsWith("*") ? nombre.startsWith(patron.slice(0, -1)) : nombre === patron);

function estadoPm2(ref: FlowNodeLiveRef, inv: InfraInventory | null): NodeLiveState | null {
	if (!ref.procs?.length) return null;
	const box = inv?.boxes.find((b) => b.key === ref.box);
	if (!box || !box.live?.reachable) {
		return {
			tone: "unknown",
			badge: "sin datos",
			detail: [box ? `${box.label}: el monitor del box no responde` : `Box ${ref.box ?? "?"} sin datos`],
		};
	}
	const detail: string[] = [];
	const encontrados: InfraProcess[] = [];
	const faltan: string[] = [];
	for (const patron of ref.procs) {
		const m = box.processes.filter((p) => matchProc(patron, p.name));
		if (m.length) encontrados.push(...m);
		else faltan.push(patron.replace(/\*$/, ""));
	}
	const online = encontrados.filter((p) => p.status === "online");
	const errored = encontrados.filter((p) => p.status === "errored");
	const caidos = ref.alwaysOnline ? encontrados.filter((p) => p.status !== "online") : [];
	const erroresLog = encontrados.reduce((a, p) => a + (p.logs?.errors ?? 0), 0);

	for (const p of encontrados) {
		const extra = [p.restarts ? `${p.restarts} reinicios` : null, p.logs?.errors ? `${p.logs.errors} errores en logs (24 h)` : null].filter(
			Boolean,
		);
		detail.push(`${p.name}: ${p.status}${extra.length ? ` · ${extra.join(" · ")}` : ""}`);
	}
	faltan.forEach((n) => detail.push(`${n}: no está registrado en PM2`));

	let tone: LiveTone;
	let badge: string;
	if (faltan.length || errored.length || caidos.length) {
		tone = "bad";
		badge = faltan.length
			? "falta en PM2"
			: errored.length
			? `${errored.length} errored`
			: `${caidos.length} caído${caidos.length > 1 ? "s" : ""}`;
	} else if (online.length) {
		tone = "ok";
		badge = ref.alwaysOnline
			? encontrados.length > 1
				? `${online.length}/${encontrados.length} online`
				: "online"
			: `${online.length} corriendo`;
	} else {
		tone = "idle";
		badge = "en espera";
	}
	if (erroresLog > 0) {
		tone = peorTono(tone, "warn");
		badge = `${badge} · ${erroresLog} err`;
	}
	return { tone, badge, detail };
}

function estadoCrons(ref: FlowNodeLiveRef, crons: CronHealthItem[] | null): NodeLiveState | null {
	if (!ref.crons?.length) return null;
	if (!crons) return { tone: "unknown", badge: "sin datos", detail: ["cron-health no respondió"] };
	const items = ref.crons.includes("*") ? crons : crons.filter((c) => ref.crons!.includes(c.name));
	if (!items.length) return { tone: "unknown", badge: "sin heartbeat", detail: ["Ningún heartbeat registrado en cron-health"] };
	const malos = items.filter((c) => c.status === "error");
	const viejos = items.filter((c) => c.status === "stale");
	const detail = items.map((c) => {
		const edad =
			c.ageHours == null ? "nunca corrió" : `hace ${c.ageHours < 1 ? `${Math.round(c.ageHours * 60)} min` : `${c.ageHours.toFixed(1)} h`}`;
		return `${c.displayName || c.name}: ${c.status} · ${edad}${c.lastError ? ` · ${c.lastError}` : ""}`;
	});
	const tone: LiveTone = malos.length ? "bad" : viejos.length ? "warn" : "ok";
	const badge = malos.length
		? `${malos.length} con error`
		: viejos.length
		? `${viejos.length} atrasado${viejos.length > 1 ? "s" : ""}`
		: items.length > 1
		? `${items.length} crons ok`
		: "cron ok";
	return { tone, badge, detail };
}

export function computeLive(
	spec: FlowSpec,
	inv: InfraInventory | null,
	crons: CronHealthItem[] | null,
	metrics: FlowMetrics | null,
): Record<string, NodeLiveState> {
	const out: Record<string, NodeLiveState> = {};
	for (const node of spec.nodes) {
		const partes = [node.live ? estadoPm2(node.live, inv) : null, node.live ? estadoCrons(node.live, crons) : null].filter(
			(x): x is NodeLiveState => !!x,
		);
		const m = metrics?.[node.id];
		if (!partes.length && !m) continue;
		const tone = peorTono(...partes.map((p) => p.tone), m?.tone);
		const badge = m?.badge ?? partes.map((p) => p.badge).join(" · ");
		out[node.id] = { tone, badge, detail: [...(m?.detail ?? []), ...partes.flatMap((p) => p.detail)] };
	}
	return out;
}
