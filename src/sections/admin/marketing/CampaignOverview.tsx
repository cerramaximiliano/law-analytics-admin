import React from "react";
import {
	Box,
	Chip,
	Grid,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	useTheme,
} from "@mui/material";
import {
	Campaign,
	CampaignAudienceFlow,
	CampaignAudienceStats,
	CampaignSendStatsSummary,
	EmailBreakdown,
	SchedulerFrequencyConfig,
} from "types/campaign";

const fmt = (n: number) => n.toLocaleString("es-AR");
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const STATUS_LABEL: Record<string, string> = {
	draft: "Borrador",
	active: "Activa",
	paused: "Pausada",
	completed: "Completada",
	archived: "Archivada",
};

const dark = "#1f1f1f"; // chips ocre/amarillos siempre con letra oscura

// Encabezado: configuración de la campaña (estado, segmento, ventana, tope, pasos, coordinador).
export const CampaignHeaderInfo: React.FC<{ campaign: Campaign; frequency: SchedulerFrequencyConfig | null; steps: number | null }> = ({
	campaign,
	frequency,
	steps,
}) => {
	const theme = useTheme();
	const sr = campaign.settings?.sendingRestrictions;
	const statusColor: Record<string, string> = {
		active: theme.palette.success.light,
		paused: theme.palette.warning.light,
		draft: theme.palette.grey[300],
		completed: theme.palette.info.light,
		archived: theme.palette.grey[300],
	};
	const coordinator = !frequency || !frequency.enabled ? "apagado" : frequency.dryRun ? "dry-run (solo registra)" : "activo";
	const items: Array<[string, string]> = [
		[
			"Segmento",
			campaign.audience?.segmentId
				? campaign.audience.syncWithSegment === false
					? "vinculado, sin sincronizar"
					: "sincroniza con el segmento"
				: "sin segmento",
		],
		["Inicio", campaign.startDate ? new Date(campaign.startDate).toLocaleDateString("es-AR") : "—"],
		["Días de envío", sr?.allowedDays?.length ? sr.allowedDays.map((d) => DAY_NAMES[d]).join(" ") : "todos"],
		["Ventana", sr?.timeWindow ? `${sr.timeWindow.start}–${sr.timeWindow.end}` : "sin restricción"],
		["Tope diario", campaign.settings?.dailyLimit ? fmt(campaign.settings.dailyLimit) : "sin tope"],
		["Pasos", steps != null ? String(steps) : "—"],
		["Prioridad", String(campaign.frequencyPolicy?.priority ?? 50)],
		["Coordinador de frecuencia", coordinator],
	];
	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
			<Chip
				size="small"
				label={STATUS_LABEL[campaign.status] || campaign.status}
				sx={{ bgcolor: statusColor[campaign.status], color: dark, fontWeight: 600 }}
			/>
			{items.map(([k, v]) => (
				<Chip key={k} size="small" variant="outlined" label={`${k}: ${v}`} />
			))}
		</Box>
	);
};

// Tarjeta de KPI: número grande con su porcentaje.
const Kpi: React.FC<{ label: string; value: string; sub?: string; color: string }> = ({ label, value, sub, color }) => (
	<Paper variant="outlined" sx={{ p: 1.5, height: "100%", borderLeft: `4px solid ${color}` }}>
		<Typography variant="caption" color="textSecondary">
			{label}
		</Typography>
		<Typography variant="h4" sx={{ color, lineHeight: 1.2 }}>
			{value}
		</Typography>
		<Typography variant="caption" color="textSecondary">
			{sub || " "}
		</Typography>
	</Paper>
);

export const CampaignKpis: React.FC<{
	campaign: Campaign;
	summary: CampaignSendStatsSummary | null;
	flow: CampaignAudienceFlow | null;
}> = ({ campaign, summary, flow }) => {
	const theme = useTheme();
	const s = summary;
	const pct = (v?: number) => `${(v ?? 0).toFixed(1)}%`;
	const cards = [
		{
			label: "Inscriptos activos",
			value: fmt(campaign.metrics?.activeContacts ?? 0),
			sub: `${fmt(campaign.metrics?.completedContacts ?? 0)} completados`,
			color: theme.palette.primary.main,
		},
		{ label: "Enviados", value: fmt(s?.total ?? 0), sub: `${fmt(s?.queued ?? 0)} en cola`, color: theme.palette.grey[700] },
		{ label: "Entregados", value: pct(s?.deliveryRate), sub: `${fmt(s?.delivered ?? 0)} correos`, color: theme.palette.success.main },
		{ label: "Apertura", value: pct(s?.openRate), sub: `${fmt(s?.uniqueOpens ?? 0)} únicas`, color: theme.palette.info.main },
		{ label: "Clics", value: pct(s?.clickRate), sub: `${fmt(s?.uniqueClicks ?? 0)} únicos`, color: "#7c3aed" },
		{ label: "Rebotes", value: pct(s?.bounceRate), sub: `${fmt(s?.bounced ?? 0)} correos`, color: theme.palette.error.main },
		{ label: "Bajas", value: fmt(s?.unsubscribed ?? 0), sub: pct(s?.unsubscribeRate), color: theme.palette.warning.dark },
		{
			label: "Altas en la app",
			value: flow?.altas ? fmt(flow.altas.total) : "—",
			sub: flow?.altas ? `de ${fmt(flow.altas.recipients)} destinatarios` : "se calcula en Audiencia y flujo",
			color: theme.palette.success.dark,
		},
	];
	return (
		<Grid container spacing={1.5} sx={{ mb: 2 }}>
			{cards.map((c) => (
				<Grid item xs={6} sm={3} md={1.5} key={c.label}>
					<Kpi {...c} />
				</Grid>
			))}
		</Grid>
	);
};

// Embudo por paso: en cola → entregados → abiertos → clics.
export const CampaignFunnel: React.FC<{ audience: CampaignAudienceStats | null; breakdown: EmailBreakdown[] }> = ({
	audience,
	breakdown,
}) => {
	const theme = useTheme();
	const bySeq = new Map(breakdown.map((b) => [b.sequenceIndex ?? -1, b]));
	const steps = audience?.byStep ?? [];
	if (steps.length === 0 && breakdown.length === 0) {
		return (
			<Typography variant="body2" color="textSecondary">
				Todavía no hay pasos con datos.
			</Typography>
		);
	}
	const rows = (
		steps.length
			? steps
			: breakdown.map((b) => ({
					step: b.sequenceIndex ?? 0,
					name: b.name || `Paso ${(b.sequenceIndex ?? 0) + 1}`,
					activeQueued: 0,
					deliveredUnique: 0,
			  }))
	).map((st) => {
		const b = bySeq.get(st.step);
		return {
			step: st.step,
			name: st.name,
			queued: st.activeQueued,
			sent: b?.count ?? 0,
			delivered: b?.delivered ?? 0,
			opens: b?.opens ?? 0,
			clicks: b?.clicks ?? 0,
		};
	});
	const rate = (a: number, b: number) => (b > 0 ? ` (${((a / b) * 100).toFixed(1)}%)` : "");
	return (
		<TableContainer component={Paper} variant="outlined">
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Paso</TableCell>
						<TableCell align="right">En cola</TableCell>
						<TableCell align="right" sx={{ color: theme.palette.grey[700] }}>
							Enviados
						</TableCell>
						<TableCell align="right" sx={{ color: theme.palette.success.main }}>
							Entregados
						</TableCell>
						<TableCell align="right" sx={{ color: theme.palette.info.main }}>
							Abiertos
						</TableCell>
						<TableCell align="right" sx={{ color: "#7c3aed" }}>
							Clics
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((r) => (
						<TableRow key={r.step} hover>
							<TableCell>
								{r.step + 1}. {r.name}
							</TableCell>
							<TableCell align="right">{fmt(r.queued)}</TableCell>
							<TableCell align="right">{fmt(r.sent)}</TableCell>
							<TableCell align="right">
								{fmt(r.delivered)}
								{rate(r.delivered, r.sent)}
							</TableCell>
							<TableCell align="right">
								{fmt(r.opens)}
								{rate(r.opens, r.delivered)}
							</TableCell>
							<TableCell align="right">
								{fmt(r.clicks)}
								{rate(r.clicks, r.delivered)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};
