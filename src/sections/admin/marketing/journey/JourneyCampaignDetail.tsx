import React from "react";
import {
	Alert,
	Box,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { CloseCircle } from "iconsax-react";
import { JourneyCampaignStats, JourneyMetrics, JourneyPeriod } from "api/journey";
import { reasonLabel } from "../campaignReasons";
import { biggestDropStep, dateShort, fmt, pct, per1000, periodConv, periodTotal, PERIOD_LABEL, ZERO } from "./journeyFormat";

const DARK = "#1f1f1f"; // chips ocre/amarillos con letra oscura
const STATUS_LABEL: Record<string, string> = {
	active: "Activa",
	paused: "Pausada",
	draft: "Borrador",
	completed: "Completada",
	archived: "Archivada",
};
const STATUS_BG: Record<string, string> = {
	active: "#86efac",
	paused: "#fde047",
	draft: "#e2e8f0",
	completed: "#93c5fd",
	archived: "#e2e8f0",
};

const ReasonChips: React.FC<{ data: Record<string, number> }> = ({ data }) => (
	<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
		{Object.entries(data)
			.sort(([, a], [, b]) => b - a)
			.map(([k, n]) => (
				<Tooltip key={k} title={k}>
					<Chip size="small" variant="outlined" label={`${reasonLabel(k)}: ${fmt(n)}`} />
				</Tooltip>
			))}
	</Box>
);

const Kpi: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
	<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
		<Typography variant="caption" color="textSecondary">
			{label}
		</Typography>
		<Typography variant="h5">{value}</Typography>
		{sub && (
			<Typography variant="caption" color="textSecondary">
				{sub}
			</Typography>
		)}
	</Paper>
);

interface Props {
	campaign: JourneyCampaignStats | null;
	period: JourneyPeriod;
	onClose: () => void;
}

const VariantCompare: React.FC<{ seq: number; stats: JourneyCampaignStats; period: JourneyPeriod }> = ({ seq, stats, period }) => {
	const step = stats.steps.find((s) => s.seq === seq);
	const variants = stats.periods[period]?.variants?.[String(seq)] || {};
	const names = Array.from(new Set([...(step?.ab || []).map((v) => v.name), ...Object.keys(variants)]));
	if (!names.length) return null;
	return (
		<Box sx={{ mb: 2 }}>
			<Typography variant="subtitle2" gutterBottom>
				Prueba A/B · paso {seq + 1}
			</Typography>
			<Grid container spacing={1.5}>
				{names.map((name) => {
					const def = step?.ab?.find((v) => v.name === name);
					const m: JourneyMetrics = variants[name] || ZERO;
					return (
						<Grid item xs={12} md={6} key={name}>
							<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
								<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
									<Chip size="small" label={`Variante ${name}`} sx={{ bgcolor: "#fde047", color: DARK, fontWeight: 700 }} />
									{def && <Typography variant="caption">{def.weight}% del tráfico</Typography>}
								</Box>
								<Typography variant="body2" sx={{ mt: 0.5 }}>
									<strong>Asunto:</strong> {def?.subject || "—"}
								</Typography>
								<Typography variant="caption" color="textSecondary" display="block">
									Plantilla: {def?.template || "—"}
								</Typography>
								<Typography variant="body2" sx={{ mt: 1 }}>
									{fmt(m.sent)} enviados · {fmt(m.delivered)} entregados
								</Typography>
								<Typography variant="body2">
									Apertura {pct(m.opens, m.delivered)} ({fmt(m.opens)}) · Clic {pct(m.clicks, m.delivered)} ({fmt(m.clicks)})
								</Typography>
								<Typography variant="body2">
									Rebotes {fmt(m.hardBounce)} def. / {fmt(m.softBounce)} temp. · Quejas {fmt(m.complained)} · Bajas {fmt(m.unsubscribed)}
								</Typography>
							</Paper>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
};

const JourneyCampaignDetail: React.FC<Props> = ({ campaign: c, period, onClose }) => {
	if (!c) return null;
	const total = periodTotal(c, period);
	const conv = periodConv(c, period);
	const paid = c.paid?.[period]?.total ?? 0;
	const stepsMetrics = c.periods[period]?.steps || {};
	const seqs = Array.from(
		new Set([...c.steps.map((s) => s.seq), ...Object.keys(stepsMetrics).map(Number), ...Object.keys(c.activeByStep).map(Number)]),
	).sort((a, b) => a - b);
	const worst = biggestDropStep(stepsMetrics);
	const removed = c.enrollment ? Object.values(c.enrollment.removedByReason).reduce((a, b) => a + b, 0) : 0;
	const completed = c.enrollment ? Object.values(c.enrollment.completedByReason).reduce((a, b) => a + b, 0) : 0;
	const coord = c.coordinator?.[period];
	const isUserStage = ["onboarding", "conversion", "reactivacion"].includes(c.tipo);

	return (
		<Dialog open onClose={onClose} maxWidth="xl" fullWidth>
			<DialogTitle>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
					<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
						<Typography variant="h5">{c.name}</Typography>
						<Chip
							size="small"
							label={STATUS_LABEL[c.status] || c.status}
							sx={{ bgcolor: STATUS_BG[c.status], color: DARK, fontWeight: 600 }}
						/>
						<Chip size="small" variant="outlined" label={`${c.tipo}${c.subtipo ? ` · ${c.subtipo}` : ""}`} />
						<Chip size="small" variant="outlined" label={`Período: ${PERIOD_LABEL[period]}`} />
					</Box>
					<IconButton onClick={onClose} size="small">
						<CloseCircle variant="Bold" />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent dividers>
				<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
					Creada {dateShort(c.createdAt)} · primer envío {dateShort(c.firstSend)} · último envío {dateShort(c.lastSend)}
					{c.durationDays ? ` · ${c.durationDays} días enviando` : ""}
					{c.completedAt ? ` · completada ${dateShort(c.completedAt)}` : ""}
					{c.archivedAt ? ` · archivada (última modificación ${dateShort(c.archivedAt)})` : ""} · {fmt(c.totalSent)} envíos en total
				</Typography>

				{c.health.length > 0 && (
					<Alert severity="warning" sx={{ mb: 2 }}>
						Alertas de salud de email (7 días): {c.health.map((h) => h.texto).join(" · ")}
					</Alert>
				)}

				<Grid container spacing={1.5} sx={{ mb: 2 }}>
					<Grid item xs={6} md={2}>
						<Kpi label="Inscripciones (histórico)" value={fmt(c.enrollment?.everEnrolled)} sub={`${fmt(c.enrollment?.active)} activas`} />
					</Grid>
					<Grid item xs={6} md={2}>
						<Kpi label="Enviados" value={fmt(total.sent)} sub={`${pct(total.delivered, total.sent)} entregados`} />
					</Grid>
					<Grid item xs={6} md={2}>
						<Kpi label="Apertura" value={pct(total.opens, total.delivered)} sub={`${fmt(total.opens)} únicas`} />
					</Grid>
					<Grid item xs={6} md={2}>
						<Kpi label="Clic" value={pct(total.clicks, total.delivered)} sub={`${fmt(total.clicks)} únicos`} />
					</Grid>
					<Grid item xs={6} md={2}>
						<Kpi
							label={isUserStage ? "Pagos" : "Altas"}
							value={fmt(isUserStage ? paid : conv.total)}
							sub={`${per1000(isUserStage ? paid : conv.total, total.sent)} cada 1.000 envíos`}
						/>
					</Grid>
					<Grid item xs={6} md={2}>
						<Kpi
							label="Tiempo hasta convertir"
							value={conv.medianDays !== null ? `${conv.medianDays} días` : "—"}
							sub={conv.bestStep !== null ? `convierte más tras el paso ${conv.bestStep + 1}` : "mediana"}
						/>
					</Grid>
				</Grid>

				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
					<Chip
						size="small"
						variant="outlined"
						label={`Rebotes definitivos ${fmt(total.hardBounce)} (${pct(total.hardBounce, total.sent)})`}
					/>
					<Chip size="small" variant="outlined" label={`Rebotes temporales ${fmt(total.softBounce)}`} />
					<Chip size="small" variant="outlined" label={`Quejas ${fmt(total.complained)}`} />
					<Chip size="small" variant="outlined" label={`Bajas ${fmt(total.unsubscribed)} (${pct(total.unsubscribed, total.sent)})`} />
					{coord && (coord.deferred > 0 || coord.wouldDefer > 0 || coord.skipped > 0) && (
						<Tooltip title="Envíos que el coordinador de frecuencia difirió, difería en prueba o salteó por el tope por persona">
							<Chip
								size="small"
								label={`Coordinador: ${fmt(coord.deferred)} diferidos · ${fmt(coord.wouldDefer)} en prueba · ${fmt(
									coord.skipped,
								)} salteados`}
								sx={{ bgcolor: "#fde047", color: DARK, fontWeight: 600 }}
							/>
						</Tooltip>
					)}
				</Box>

				{c.enrollment && (
					<Box sx={{ mb: 2 }}>
						<Typography variant="subtitle2">
							Completaron {fmt(completed)} · Salieron {fmt(removed)}
						</Typography>
						<ReasonChips data={c.enrollment.completedByReason} />
						<ReasonChips data={c.enrollment.removedByReason} />
					</Box>
				)}

				<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
					Embudo por paso
				</Typography>
				<Box sx={{ overflowX: "auto", mb: 2 }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Paso</TableCell>
								<TableCell>Asunto · plantilla · demora · condición</TableCell>
								<TableCell align="right">En este paso hoy</TableCell>
								<TableCell align="right">Enviados</TableCell>
								<TableCell align="right">
									<Tooltip title="Correos con estado «entregado». Los que después se dieron de baja o se quejaron ya no cuentan como entregados, así que las tasas de apertura y clic se calculan sobre este número.">
										<span>Entregados</span>
									</Tooltip>
								</TableCell>
								<TableCell align="right">Apertura</TableCell>
								<TableCell align="right">Clic</TableCell>
								<TableCell align="right">Rebote def./temp.</TableCell>
								<TableCell align="right">Quejas</TableCell>
								<TableCell align="right">Bajas</TableCell>
								<TableCell align="right">{isUserStage ? "Pagos" : "Altas"}</TableCell>
								<TableCell align="right">c/1.000</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{seqs.map((seq) => {
								const def = c.steps.find((s) => s.seq === seq);
								const m = stepsMetrics[String(seq)] || ZERO;
								const altas = (isUserStage ? c.paid?.[period]?.byStep?.[String(seq)] : conv.byStep[String(seq)]) || 0;
								return (
									<TableRow key={seq} hover sx={worst === seq ? { bgcolor: "rgba(245, 158, 11, 0.12)" } : undefined}>
										<TableCell>
											{seq + 1}
											{worst === seq && (
												<Chip size="small" label="Mayor caída" sx={{ ml: 0.5, bgcolor: "#fde047", color: DARK, fontWeight: 700 }} />
											)}
										</TableCell>
										<TableCell sx={{ minWidth: 280 }}>
											<Typography variant="body2">{def?.subject || def?.name || "—"}</Typography>
											<Typography variant="caption" color="textSecondary" display="block">
												{def?.template ? `Plantilla: ${def.template} · ` : ""}
												{def?.delay || ""}
												{def?.filter?.length ? ` · solo si: ${def.filter.join("; ")}` : ""}
												{def?.ab ? " · prueba A/B" : ""}
											</Typography>
										</TableCell>
										<TableCell align="right">{fmt(c.activeByStep[String(seq)] || 0)}</TableCell>
										<TableCell align="right">{fmt(m.sent)}</TableCell>
										<TableCell align="right">{`${fmt(m.delivered)} (${pct(m.delivered, m.sent)})`}</TableCell>
										<TableCell align="right">{pct(m.opens, m.delivered)}</TableCell>
										<TableCell align="right">{pct(m.clicks, m.delivered)}</TableCell>
										<TableCell align="right">{`${fmt(m.hardBounce)} / ${fmt(m.softBounce)}`}</TableCell>
										<TableCell align="right">{fmt(m.complained)}</TableCell>
										<TableCell align="right">{fmt(m.unsubscribed)}</TableCell>
										<TableCell align="right">{fmt(altas)}</TableCell>
										<TableCell align="right">{per1000(altas, m.sent)}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Box>

				{seqs.map((seq) => (
					<VariantCompare key={seq} seq={seq} stats={c} period={period} />
				))}
			</DialogContent>
		</Dialog>
	);
};

export default JourneyCampaignDetail;
