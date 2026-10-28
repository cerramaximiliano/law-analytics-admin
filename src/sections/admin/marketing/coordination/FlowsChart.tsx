import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, CircularProgress, FormControlLabel, Stack, Switch, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

import MainCard from "components/MainCard";
import { Campaign, SchedulerFrequencyConfig } from "types/campaign";
import { CampaignEmail } from "types/campaign-email";
import { CampaignEmailService } from "store/reducers/campaign";
import { BRAND_BLUE, STALE_AMBER } from "themes/dashboardTokens";
import {
	DEFAULT_FREQUENCY_CONFIG,
	FlowStep,
	buildFlowSteps,
	formatDayOffset,
	formatDelay,
	getPolicy,
	isCampaignExempt,
	isExemptByCategory,
	isSaijEdition,
} from "utils/campaignCoordination";
import { CAMPAIGN_TYPE_LABEL, DAY_NAMES_SHORT, formatAllowedDays } from "./labels";
import { formatDateTime } from "utils/format";

interface FlowsChartProps {
	campaigns: Campaign[];
	config: SchedulerFrequencyConfig | null;
}

// Geometría del gráfico (px).
const LABEL_W = 270;
const DAY_W = 30;
const X0 = 18; // margen izquierdo del eje dentro del carril
const LANE_H = 58;
const AXIS_H = 40;
const MARKER = 24;
const MIN_DAYS = 30;
const MAX_DAYS = 90;

const AMBER_TEXT = "#1D2630"; // texto sobre ocre: siempre oscuro

interface Lane {
	campaign: Campaign;
	steps: FlowStep[];
	priority: number;
	exempt: boolean;
	exemptByCategory: boolean;
	draft: boolean;
}

const xOf = (day: number) => X0 + day * DAY_W;

const PolicyTag = ({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "amber" | "brand" }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const styles =
		tone === "amber"
			? { bgcolor: STALE_AMBER, color: AMBER_TEXT, borderColor: STALE_AMBER }
			: tone === "brand"
			? { bgcolor: alpha(BRAND_BLUE, isDark ? 0.2 : 0.1), color: isDark ? "#BFD3FF" : "#1F4FBF", borderColor: alpha(BRAND_BLUE, 0.35) }
			: { bgcolor: "transparent", color: "text.secondary", borderColor: "divider" };
	return (
		<Box
			component="span"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				height: 18,
				px: 0.75,
				borderRadius: 1,
				border: "1px solid",
				fontSize: "0.66rem",
				fontWeight: 600,
				lineHeight: 1,
				whiteSpace: "nowrap",
				...styles,
			}}
		>
			{label}
		</Box>
	);
};

const PriorityBadge = ({ value }: { value: number }) => (
	<Tooltip title="Prioridad (0–100)">
		<Box
			component="span"
			sx={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				minWidth: 28,
				height: 20,
				px: 0.5,
				borderRadius: 1,
				bgcolor: BRAND_BLUE,
				color: "#fff",
				fontSize: "0.72rem",
				fontWeight: 700,
				fontVariantNumeric: "tabular-nums",
			}}
		>
			{value}
		</Box>
	</Tooltip>
);

const StepTooltip = ({ step, campaign, index }: { step: FlowStep; campaign: Campaign; index: number }) => {
	const e = step.email;
	const timeWindow = e.sendingRestrictions?.timeWindow || campaign.settings?.sendingRestrictions?.timeWindow;
	const days = e.sendingRestrictions?.allowedDays || campaign.settings?.sendingRestrictions?.allowedDays;
	return (
		<Box sx={{ maxWidth: 320 }}>
			<Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
				Paso {index + 1}: {e.name}
			</Typography>
			<Typography variant="caption" sx={{ display: "block" }}>
				Asunto: {e.subject || "(sin asunto)"}
			</Typography>
			<Typography variant="caption" sx={{ display: "block" }}>
				{step.fixedDate
					? `Fecha fija: ${formatDateTime(step.fixedDate)}`
					: `Cuándo: ${formatDayOffset(step.day)} (${formatDelay(e.conditions?.timeDelay)} después del ${
							index === 0 ? "ingreso" : "paso anterior"
					  })`}
			</Typography>
			<Typography variant="caption" sx={{ display: "block" }}>
				Ventana: {timeWindow ? `${timeWindow.start}–${timeWindow.end}` : "sin restricción horaria"}, {formatAllowedDays(days)}
			</Typography>
			{step.conditional && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
					Condicional, solo si cumple: {step.filterSummary}
				</Typography>
			)}
			{e.status && e.status !== "active" && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}>
					Estado del correo: {e.status}
				</Typography>
			)}
		</Box>
	);
};

const recurringLabel = (c: Campaign): string => {
	const r = c.settings?.recurringSchedule;
	if (!r) return "recurrente";
	const time = r.time ? `, ${r.time}` : "";
	switch (r.frequency) {
		case "daily":
			return `todos los días${time}`;
		case "weekly":
			return `semanal, ${DAY_NAMES_SHORT[r.dayOfWeek] ?? ""}${time}`;
		case "monthly":
			return `mensual, día ${r.dayOfMonth === -1 ? "último" : r.dayOfMonth}${time}`;
		case "yearly":
			return `anual, ${r.dayOfMonth}/${r.monthOfYear}${time}`;
		default:
			return "recurrente";
	}
};

const FlowsChart: React.FC<FlowsChartProps> = ({ campaigns, config }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [includeDrafts, setIncludeDrafts] = useState(false);
	const [emailsById, setEmailsById] = useState<Record<string, CampaignEmail[]>>({});
	const [failedIds, setFailedIds] = useState<string[]>([]);
	const [loadingEmails, setLoadingEmails] = useState(false);
	const exemptCategories = config?.exemptCategories ?? DEFAULT_FREQUENCY_CONFIG.exemptCategories;

	const laneCampaigns = useMemo(
		() =>
			campaigns
				.filter(
					(c) => (c.type === "automated" || c.type === "sequence") && (c.status === "active" || (includeDrafts && c.status === "draft")),
				)
				.filter((c) => !isSaijEdition(c))
				.sort((a, b) => getPolicy(b).priority - getPolicy(a).priority || a.name.localeCompare(b.name, "es")),
		[campaigns, includeDrafts],
	);

	// Correos de cada carril: se piden una vez por campaña y quedan en caché.
	useEffect(() => {
		const missing = laneCampaigns.map((c) => c._id || "").filter((id) => id && !emailsById[id] && !failedIds.includes(id));
		if (missing.length === 0) return;
		let cancelled = false;
		setLoadingEmails(true);
		Promise.allSettled(missing.map((id) => CampaignEmailService.getEmailsByCampaignId(id))).then((results) => {
			if (cancelled) return;
			const next: Record<string, CampaignEmail[]> = {};
			const failed: string[] = [];
			results.forEach((r, i) => {
				if (r.status === "fulfilled") next[missing[i]] = r.value?.data || [];
				else failed.push(missing[i]);
			});
			setEmailsById((prev) => ({ ...prev, ...next }));
			if (failed.length) setFailedIds((prev) => [...prev, ...failed]);
			setLoadingEmails(false);
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [laneCampaigns]);

	const lanes: Lane[] = useMemo(
		() =>
			laneCampaigns
				.filter((c) => emailsById[c._id || ""])
				.map((c) => ({
					campaign: c,
					steps: buildFlowSteps(emailsById[c._id || ""]),
					priority: getPolicy(c).priority,
					exempt: isCampaignExempt(c, exemptCategories),
					exemptByCategory: isExemptByCategory(c, exemptCategories),
					draft: c.status === "draft",
				})),
		[laneCampaigns, emailsById, exemptCategories],
	);

	const maxDay = useMemo(() => {
		const furthest = Math.max(0, ...lanes.flatMap((l) => l.steps.map((s) => s.day)));
		return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.ceil(furthest) + 1));
	}, [lanes]);

	// Días con pasos de dos o más carriles no exentos: posible choque que resuelve el coordinador.
	const collisions = useMemo(() => {
		const byDay = new Map<number, Lane[]>();
		lanes
			.filter((l) => !l.exempt)
			.forEach((l) => {
				const days = new Set(l.steps.filter((s) => !s.fixedDate).map((s) => Math.floor(s.day)));
				days.forEach((d) => byDay.set(d, [...(byDay.get(d) || []), l]));
			});
		const result = new Map<number, Lane[]>();
		byDay.forEach((ls, d) => {
			if (ls.length >= 2)
				result.set(
					d,
					[...ls].sort((a, b) => b.priority - a.priority),
				);
		});
		return result;
	}, [lanes]);

	const collisionDays = Array.from(collisions.keys()).sort((a, b) => a - b);
	const trackW = xOf(maxDay) + X0;
	const amberBand = alpha(STALE_AMBER, isDark ? 0.2 : 0.16);

	// Fondo del carril: línea vertical cada 5 días y bandas ocre en los días con choque.
	const trackBackground = (h: number) => {
		const grid = `repeating-linear-gradient(to right, ${theme.palette.divider} 0 1px, transparent 1px ${DAY_W * 5}px)`;
		return {
			backgroundImage: grid,
			backgroundPosition: `${X0}px 0`,
			backgroundRepeat: "no-repeat",
			backgroundSize: `${maxDay * DAY_W + 1}px ${h}px`,
		};
	};

	const collisionBands = (h: number) =>
		collisionDays.map((d) => (
			<Box
				key={`band-${d}`}
				sx={{
					position: "absolute",
					left: xOf(d) - MARKER / 2 - 2,
					width: DAY_W,
					top: 0,
					height: h,
					bgcolor: amberBand,
					pointerEvents: "none",
				}}
			/>
		));

	const sameDay = (campaignId: string, day: number) => collisions.get(Math.floor(day))?.some((l) => l.campaign._id === campaignId) ?? false;

	const offSequence = useMemo(() => {
		const visible = campaigns.filter(
			(c) => (c.type === "onetime" || c.type === "recurring") && (c.status === "active" || (includeDrafts && c.status === "draft")),
		);
		const saij = visible.filter(isSaijEdition);
		const rest = visible.filter((c) => !isSaijEdition(c)).sort((a, b) => getPolicy(b).priority - getPolicy(a).priority);
		return { saij, rest };
	}, [campaigns, includeDrafts]);

	const labelCellSx = {
		position: "sticky" as const,
		left: 0,
		zIndex: 3,
		width: LABEL_W,
		minWidth: LABEL_W,
		bgcolor: "background.paper",
		borderRight: "1px solid",
		borderColor: "divider",
		px: 1.5,
	};

	return (
		<MainCard
			title={<Typography variant="h5">Flujos</Typography>}
			secondary={
				<FormControlLabel
					control={<Switch size="small" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} />}
					label={<Typography variant="body2">Incluir borradores</Typography>}
				/>
			}
		>
			<Stack spacing={2}>
				<Typography variant="body2" color="text.secondary">
					Cada carril es una campaña automática o secuencia, ordenada por prioridad. Los pasos se ubican en el día acumulado desde que el
					contacto entra (suma de las esperas; las horas cuentan como fracción de día). El gráfico supone que la persona entra a todas el
					mismo día.
				</Typography>

				{collisionDays.length > 0 && (
					<Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
						<Typography variant="subtitle2">
							{collisionDays.length === 1 ? "1 día con posible choque" : `${collisionDays.length} días con posible choque`}:{" "}
							{collisionDays.map((d) => `día ${d}`).join(", ")}
						</Typography>
						<Typography variant="body2">
							Dos campañas no exentas tienen un paso el mismo día. El coordinador difiere la de menor prioridad: sale el primer día con
							lugar y sus pasos siguientes se corren solos.
							{config && !config.enabled && " Hoy el coordinador está apagado, así que ese día saldrían las dos."}
							{config && config.enabled && config.dryRun && " Hoy está en modo prueba: solo lo registra, salen las dos."}
						</Typography>
					</Alert>
				)}

				{failedIds.length > 0 && (
					<Alert severity="error">No se pudieron leer los correos de {failedIds.length} campaña(s); no aparecen en el gráfico.</Alert>
				)}

				<Box
					sx={{
						overflowX: "auto",
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 1.5,
						WebkitOverflowScrolling: "touch",
					}}
				>
					<Box sx={{ width: LABEL_W + trackW, minWidth: "100%" }}>
						{/* Eje */}
						<Box sx={{ display: "flex", height: AXIS_H, borderBottom: "1px solid", borderColor: "divider" }}>
							<Box sx={{ ...labelCellSx, display: "flex", alignItems: "center" }}>
								<Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
									Campaña y prioridad
								</Typography>
							</Box>
							<Box sx={{ position: "relative", width: trackW, flexShrink: 0 }}>
								{collisionBands(AXIS_H)}
								{Array.from({ length: maxDay + 1 }, (_, d) => {
									const major = d % 5 === 0;
									return (
										<Box
											key={d}
											sx={{
												position: "absolute",
												left: xOf(d),
												bottom: 0,
												height: major ? 10 : 5,
												borderLeft: "1px solid",
												borderColor: major ? "text.secondary" : "divider",
											}}
										/>
									);
								})}
								{Array.from({ length: Math.floor(maxDay / 5) + 1 }, (_, i) => i * 5).map((d) => (
									<Typography
										key={`l-${d}`}
										variant="caption"
										sx={{
											position: "absolute",
											left: xOf(d),
											top: 4,
											transform: "translateX(-50%)",
											color: "text.secondary",
											fontVariantNumeric: "tabular-nums",
										}}
									>
										{d === 0 ? "Día 0" : d}
									</Typography>
								))}
								{collisionDays.map((d) => {
									const ls = collisions.get(d) || [];
									return (
										<Tooltip
											key={`c-${d}`}
											title={
												<Box>
													<Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
														Día {d}: posible choque
													</Typography>
													{ls.map((l, i) => (
														<Typography key={l.campaign._id} variant="caption" sx={{ display: "block" }}>
															{i === 0 ? "Sale: " : "Se difiere: "}
															{l.campaign.name} ({l.priority})
														</Typography>
													))}
												</Box>
											}
										>
											<Box
												sx={{
													position: "absolute",
													left: xOf(d) - 7,
													top: 20,
													width: 14,
													height: 14,
													borderRadius: "50%",
													bgcolor: STALE_AMBER,
													color: AMBER_TEXT,
													fontSize: "0.62rem",
													fontWeight: 800,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													cursor: "help",
													zIndex: 2,
												}}
											>
												!
											</Box>
										</Tooltip>
									);
								})}
							</Box>
						</Box>

						{/* Carriles */}
						{loadingEmails && lanes.length === 0 && (
							<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
								<CircularProgress size={24} />
							</Box>
						)}
						{!loadingEmails && lanes.length === 0 && (
							<Box sx={{ py: 3, px: 2 }}>
								<Typography variant="body2" color="text.secondary">
									No hay campañas automáticas ni secuencias {includeDrafts ? "activas o en borrador" : "activas"}.
								</Typography>
							</Box>
						)}
						{lanes.map((lane) => {
							const policy = getPolicy(lane.campaign);
							const laneColor = lane.exempt ? theme.palette.secondary.main : BRAND_BLUE;
							let lastX = -Infinity;
							const positioned = lane.steps.map((s) => {
								let x = xOf(Math.min(s.day, maxDay));
								if (x - lastX < MARKER - 4) x = lastX + MARKER - 4; // pasos del mismo día: se corren un poco
								lastX = x;
								return { step: s, x };
							});
							const firstX = positioned[0]?.x ?? 0;
							const endX = positioned[positioned.length - 1]?.x ?? 0;
							return (
								<Box key={lane.campaign._id} sx={{ display: "flex", height: LANE_H, borderBottom: "1px solid", borderColor: "divider" }}>
									<Box sx={{ ...labelCellSx, display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, minWidth: 0 }}>
										<Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
											<PriorityBadge value={lane.priority} />
											<Typography variant="subtitle2" noWrap title={lane.campaign.name} sx={{ minWidth: 0 }}>
												{lane.campaign.name}
											</Typography>
										</Stack>
										<Stack direction="row" spacing={0.5} sx={{ overflow: "hidden" }}>
											<PolicyTag label={CAMPAIGN_TYPE_LABEL[lane.campaign.type]} />
											{lane.draft && <PolicyTag label="Borrador" />}
											{lane.exempt && <PolicyTag label={lane.exemptByCategory && !policy.exempt ? "Exenta por categoría" : "Exenta"} />}
											{policy.pausesLowerPriority && <PolicyTag label="Pausa a menores" tone="brand" />}
											{policy.perishable && <PolicyTag label="Perecedera" tone="amber" />}
										</Stack>
									</Box>
									<Box
										sx={{
											position: "relative",
											width: trackW,
											flexShrink: 0,
											opacity: lane.draft ? 0.6 : 1,
											...trackBackground(LANE_H),
										}}
									>
										{collisionBands(LANE_H)}
										{positioned.length > 1 && (
											<Box
												sx={{
													position: "absolute",
													left: firstX,
													width: endX - firstX,
													top: LANE_H / 2 - 1,
													height: 2,
													bgcolor: alpha(laneColor, 0.35),
												}}
											/>
										)}
										{lane.steps.length === 0 && (
											<Typography variant="caption" color="text.secondary" sx={{ position: "absolute", left: X0, top: LANE_H / 2 - 9 }}>
												Sin correos cargados
											</Typography>
										)}
										{positioned.map(({ step, x }, i) => {
											const clash = !lane.exempt && !step.fixedDate && sameDay(lane.campaign._id || "", step.day);
											return (
												<Tooltip key={step.email._id || i} title={<StepTooltip step={step} campaign={lane.campaign} index={i} />} arrow>
													<Box
														sx={{
															position: "absolute",
															left: x - MARKER / 2,
															top: LANE_H / 2 - MARKER / 2,
															width: MARKER,
															height: MARKER,
															borderRadius: step.fixedDate ? 1 : "50%",
															display: "flex",
															alignItems: "center",
															justifyContent: "center",
															fontSize: "0.7rem",
															fontWeight: 700,
															cursor: "default",
															zIndex: 1,
															...(step.conditional
																? { bgcolor: "background.paper", color: laneColor, border: `2px dashed ${laneColor}` }
																: { bgcolor: laneColor, color: "#fff", border: `2px solid ${laneColor}` }),
															...(clash && { boxShadow: `0 0 0 3px ${STALE_AMBER}` }),
															...(step.email.status === "paused" && { opacity: 0.45 }),
														}}
													>
														{i + 1}
													</Box>
												</Tooltip>
											);
										})}
									</Box>
								</Box>
							);
						})}
					</Box>
				</Box>

				{/* Leyenda */}
				<Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap alignItems="center">
					<Stack direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: BRAND_BLUE }} />
						<Typography variant="caption">Paso (número de orden)</Typography>
					</Stack>
					<Stack direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 16, height: 16, borderRadius: "50%", border: `2px dashed ${BRAND_BLUE}` }} />
						<Typography variant="caption">Condicional: se saltea si el contacto no cumple el filtro</Typography>
					</Stack>
					<Stack direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: BRAND_BLUE }} />
						<Typography variant="caption">Fecha fija</Typography>
					</Stack>
					<Stack direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: theme.palette.secondary.main }} />
						<Typography variant="caption">Campaña exenta (no cuenta para el tope)</Typography>
					</Stack>
					<Stack direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 16, height: 16, bgcolor: amberBand, border: `1px solid ${STALE_AMBER}` }} />
						<Typography variant="caption">Posible choque: el coordinador difiere la de menor prioridad</Typography>
					</Stack>
					{includeDrafts && (
						<Stack direction="row" spacing={0.75} alignItems="center">
							<Box sx={{ width: 16, height: 16, borderRadius: "50%", bgcolor: BRAND_BLUE, opacity: 0.6 }} />
							<Typography variant="caption">Borrador (atenuado)</Typography>
						</Stack>
					)}
				</Stack>

				{/* Fuera de secuencia */}
				<Box>
					<Typography variant="subtitle2" gutterBottom>
						Fuera de secuencia
					</Typography>
					<Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
						Campañas únicas y recurrentes: no dependen del día de ingreso del contacto, salen en su fecha. También pasan por el tope.
					</Typography>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{offSequence.rest.length === 0 && offSequence.saij.length === 0 && (
							<Typography variant="body2" color="text.secondary">
								Ninguna
							</Typography>
						)}
						{offSequence.rest.map((c) => {
							const exempt = isCampaignExempt(c, exemptCategories);
							const when =
								c.type === "recurring" ? recurringLabel(c) : c.startDate ? formatDateTime(c.startDate) : "sin fecha";
							return (
								<Chip
									key={c._id}
									variant="outlined"
									sx={{ height: "auto", py: 0.5, opacity: c.status === "draft" ? 0.7 : 1, "& .MuiChip-label": { whiteSpace: "normal" } }}
									label={
										<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
											<PriorityBadge value={getPolicy(c).priority} />
											<Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
												{c.name}
											</Typography>
											<PolicyTag label={c.type === "recurring" ? `Recurrente: ${when}` : `Única: ${when}`} />
											{c.status === "draft" && <PolicyTag label="Borrador" />}
											{exempt && <PolicyTag label="Exenta" />}
											{getPolicy(c).perishable && <PolicyTag label="Perecedera" tone="amber" />}
										</Stack>
									}
								/>
							);
						})}
						{offSequence.saij.length > 0 && (
							<Chip
								variant="outlined"
								sx={{ height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
								label={
									<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
										<PriorityBadge value={Math.max(...offSequence.saij.map((c) => getPolicy(c).priority))} />
										<Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
											Jurisprudencia SAIJ
										</Typography>
										<PolicyTag label={`${offSequence.saij.length} ediciones, cada ~2 días`} />
										{offSequence.saij.every((c) => isCampaignExempt(c, exemptCategories)) && <PolicyTag label="Exentas" />}
									</Stack>
								}
							/>
						)}
					</Stack>
				</Box>
			</Stack>
		</MainCard>
	);
};

export default FlowsChart;
