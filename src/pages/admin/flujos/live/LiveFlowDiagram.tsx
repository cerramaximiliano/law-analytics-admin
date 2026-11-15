// FlowDiagram con interruptor Teórico / En vivo. En teórico es exactamente el
// diagrama de siempre; en vivo cada nodo con fuente de datos muestra un anillo y
// una pastilla con su estado (procesos PM2, colas, errores) y el detalle al pasar
// el mouse. La elección queda en la URL (?vivo=1) para poder compartir el enlace.
import React, { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, IconButton, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { Refresh } from "iconsax-react";
import FlowDiagram, { LIVE_TONE_COLOR } from "pages/admin/causas/flujos/FlowDiagram";
import { FlowSpec, LiveTone } from "pages/admin/causas/flujos/flowTypes";
import { FlowMetrics } from "./computeLive";
import { LIVE_REFRESH_MS, useFlowLive } from "./useFlowLive";

const LEYENDA: { tone: LiveTone; label: string }[] = [
	{ tone: "ok", label: "funcionando" },
	{ tone: "idle", label: "en espera (cron o manager)" },
	{ tone: "warn", label: "atención" },
	{ tone: "bad", label: "error o caído" },
	{ tone: "unknown", label: "sin datos" },
];

interface Props {
	spec: FlowSpec;
	/** Métricas propias del flujo (colas, cobertura…), por id de nodo. */
	metrics?: () => Promise<FlowMetrics>;
}

const LiveFlowDiagram: React.FC<Props> = ({ spec, metrics }) => {
	const [params, setParams] = useSearchParams();
	const enVivo = params.get("vivo") === "1";
	const tieneFuentes = useMemo(() => !!metrics || spec.nodes.some((n) => n.live), [spec, metrics]);
	const { live, loading, updatedAt, errors, refresh } = useFlowLive(spec, enVivo && tieneFuentes, metrics);

	const setModo = (vivo: boolean) =>
		setParams(
			(prev) => {
				const next = new URLSearchParams(prev);
				if (vivo) next.set("vivo", "1");
				else next.delete("vivo");
				return next;
			},
			{ replace: true },
		);

	const resumen = useMemo(() => {
		if (!live) return null;
		const c: Record<LiveTone, number> = { ok: 0, idle: 0, warn: 0, bad: 0, unknown: 0 };
		Object.values(live).forEach((s) => (c[s.tone] += 1));
		return c;
	}, [live]);

	if (!tieneFuentes) return <FlowDiagram spec={spec} />;

	return (
		<Box>
			<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
				<ToggleButtonGroup size="small" exclusive value={enVivo ? "vivo" : "teorico"} onChange={(_, v) => v && setModo(v === "vivo")}>
					<ToggleButton value="teorico">Teórico</ToggleButton>
					<ToggleButton value="vivo">En vivo</ToggleButton>
				</ToggleButtonGroup>
				{enVivo && (
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						<Typography variant="caption" color="text.secondary">
							{loading && !updatedAt
								? "Cargando estado…"
								: updatedAt
								? `Actualizado ${updatedAt.toLocaleTimeString("es-AR")} · se refresca cada ${LIVE_REFRESH_MS / 1000} s`
								: ""}
						</Typography>
						<Tooltip title="Refrescar ahora">
							<span>
								<IconButton size="small" onClick={() => refresh(true)} disabled={loading} aria-label="Refrescar estado en vivo">
									<Refresh size={15} />
								</IconButton>
							</span>
						</Tooltip>
						{resumen && (resumen.bad > 0 || resumen.warn > 0) && (
							<Typography variant="caption" fontWeight={600} sx={{ color: LIVE_TONE_COLOR[resumen.bad ? "bad" : "warn"] }}>
								{[resumen.bad ? `${resumen.bad} con error` : null, resumen.warn ? `${resumen.warn} para mirar` : null]
									.filter(Boolean)
									.join(" · ")}
							</Typography>
						)}
					</Stack>
				)}
			</Stack>
			{enVivo && errors.length > 0 && (
				<Alert severity="warning" variant="outlined" sx={{ mb: 1.5, py: 0 }}>
					No respondió: {errors.join(", ")}. El resto del estado se muestra igual.
				</Alert>
			)}
			<FlowDiagram spec={spec} live={enVivo ? live ?? undefined : undefined} />
			{enVivo && (
				<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
					{LEYENDA.map((l) => (
						<Stack key={l.tone} direction="row" spacing={0.75} alignItems="center">
							<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: LIVE_TONE_COLOR[l.tone] }} />
							<Typography variant="caption" color="text.secondary">
								{l.label}
							</Typography>
						</Stack>
					))}
					<Typography variant="caption" color="text.secondary">
						Pasá el mouse sobre un nodo para ver el detalle.
					</Typography>
				</Stack>
			)}
		</Box>
	);
};

export default LiveFlowDiagram;
