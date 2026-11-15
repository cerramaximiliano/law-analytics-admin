// Carga y refresca (cada 30 s, solo con la pestaña visible) los datos del modo
// en vivo de un diagrama. Inactivo no hace ninguna petición.
import { useCallback, useEffect, useRef, useState } from "react";
import InfrastructureService, { InfraInventory } from "api/infrastructure";
import CronHealthService, { CronHealthItem } from "api/cronHealth";
import { FlowSpec, NodeLiveState } from "pages/admin/causas/flujos/flowTypes";
import { computeLive, FlowMetrics } from "./computeLive";

export const LIVE_REFRESH_MS = 30_000;

export interface FlowLiveResult {
	live: Record<string, NodeLiveState> | null;
	loading: boolean;
	updatedAt: Date | null;
	/** Fuentes que fallaron en la última carga (el resto se muestra igual). */
	errors: string[];
	refresh: (force?: boolean) => void;
}

export function useFlowLive(spec: FlowSpec, enabled: boolean, metricsProvider?: () => Promise<FlowMetrics>): FlowLiveResult {
	const [live, setLive] = useState<Record<string, NodeLiveState> | null>(null);
	const [loading, setLoading] = useState(false);
	const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const vivo = useRef(true);

	const usaPm2 = spec.nodes.some((n) => n.live?.procs?.length);
	const usaCrons = spec.nodes.some((n) => n.live?.crons?.length);

	const load = useCallback(
		async (force = false) => {
			setLoading(true);
			const [inv, crons, metrics] = await Promise.allSettled([
				usaPm2 ? InfrastructureService.getInventory(force) : Promise.resolve(null),
				usaCrons ? CronHealthService.getCronHealth() : Promise.resolve(null),
				metricsProvider ? metricsProvider() : Promise.resolve(null),
			]);
			if (!vivo.current) return;
			const errs: string[] = [];
			if (inv.status === "rejected") errs.push("infraestructura (PM2)");
			if (crons.status === "rejected") errs.push("cron-health");
			if (metrics.status === "rejected") errs.push("métricas del flujo");
			const invData = inv.status === "fulfilled" ? (inv.value as InfraInventory | null) : null;
			const cronData = crons.status === "fulfilled" && crons.value ? (crons.value.data as CronHealthItem[]) : null;
			const metricData = metrics.status === "fulfilled" ? (metrics.value as FlowMetrics | null) : null;
			setLive(computeLive(spec, invData, cronData, metricData));
			setErrors(errs);
			setUpdatedAt(new Date());
			setLoading(false);
		},
		[spec, usaPm2, usaCrons, metricsProvider],
	);

	useEffect(() => {
		vivo.current = true;
		if (!enabled) {
			setLive(null);
			return;
		}
		load();
		const id = window.setInterval(() => {
			if (!document.hidden) load();
		}, LIVE_REFRESH_MS);
		return () => {
			vivo.current = false;
			window.clearInterval(id);
		};
	}, [enabled, load]);

	return { live, loading, updatedAt, errors, refresh: load };
}
