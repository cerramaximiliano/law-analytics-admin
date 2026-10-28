import React, { useEffect, useMemo, useState } from "react";
import {
	Box,
	Collapse,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ArrowDown2, ArrowRight2 } from "iconsax-react";

import MainCard from "components/MainCard";
import { Campaign, CampaignDeferredCount, SchedulerFrequencyDay, SchedulerFrequencyState } from "types/campaign";
import { BRAND_BLUE, PREMIUM_GOLD, PRO_TEAL, STALE_AMBER } from "themes/dashboardTokens";
import { reasonLabel, sumCounts } from "utils/campaignCoordination";
import { clickableProps } from "utils/a11y";

interface DailyDeferredCardProps {
	frequency: SchedulerFrequencyState | null;
	campaigns: Campaign[];
}

type Metric = "wouldDefer" | "deferred" | "skipped";

const METRIC_LABEL: Record<Metric, string> = {
	wouldDefer: "Habría diferido",
	deferred: "Diferido",
	skipped: "Salteado",
};

const DAYS = 14;
const TZ = "America/Argentina/Buenos_Aires";
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Últimos N días calendario de Buenos Aires (YYYY-MM-DD), el más reciente primero.
const lastDays = (n: number): string[] => {
	const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
	return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - i * 86400000)));
};

const dayLabel = (day: string): string => {
	const [y, m, d] = day.split("-").map(Number);
	const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
	return `${WEEKDAYS[wd]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

// Agrupa los motivos con id (reserved_for:<id>, paused_by:<id>) para el color de la barra.
const reasonGroup = (reason: string): string => {
	if (reason.startsWith("reserved_for:")) return "reserved_for";
	if (reason.startsWith("paused_by:")) return "paused_by";
	return reason;
};

const GROUP_LABEL: Record<string, string> = {
	daily_cap: "Tope diario",
	weekly_cap: "Tope semanal",
	reserved_for: "Reservado para otra",
	paused_by: "En pausa por otra",
	frequency_perishable: "Perecedera",
	frequency_max_deferral: "Espera máxima",
};

const DailyDeferredCard: React.FC<DailyDeferredCardProps> = ({ frequency, campaigns }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const dry = !frequency || frequency.config.dryRun || !frequency.config.enabled;
	const [metric, setMetric] = useState<Metric>(dry ? "wouldDefer" : "deferred");
	const [openDay, setOpenDay] = useState<string | null>(null);

	useEffect(() => setMetric(dry ? "wouldDefer" : "deferred"), [dry]);

	const groupColor = (group: string): string => {
		switch (group) {
			case "daily_cap":
				return BRAND_BLUE;
			case "weekly_cap":
				return PRO_TEAL;
			case "reserved_for":
				return PREMIUM_GOLD;
			case "paused_by":
				return theme.palette.secondary.main;
			case "frequency_perishable":
				return STALE_AMBER;
			case "frequency_max_deferral":
				return theme.palette.error.main;
			default:
				return theme.palette.text.disabled;
		}
	};

	const nameById = useMemo(() => new Map(campaigns.map((c) => [c._id || "", c.name])), [campaigns]);
	const resolveName = (id: string) => nameById.get(id) || frequency?.campaignNames[id];

	const rows = useMemo(() => {
		const byDay = new Map<string, SchedulerFrequencyDay>((frequency?.daily || []).map((d) => [d.day, d]));
		return lastDays(DAYS).map((day) => {
			const counts: Record<string, CampaignDeferredCount> = byDay.get(day)?.[metric] || {};
			const groups: Record<string, number> = {};
			Object.values(counts).forEach((c) =>
				Object.entries(c.byReason).forEach(([r, n]) => {
					const g = reasonGroup(r);
					groups[g] = (groups[g] || 0) + n;
				}),
			);
			return { day, counts, groups, total: sumCounts(counts), hasDoc: byDay.has(day) };
		});
	}, [frequency, metric]);

	const max = Math.max(1, ...rows.map((r) => r.total));
	const grandTotal = rows.reduce((s, r) => s + r.total, 0);
	const usedGroups = Array.from(new Set(rows.flatMap((r) => Object.keys(r.groups))));

	return (
		<MainCard
			title={<Typography variant="h5">Últimos 14 días</Typography>}
			secondary={
				<ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v) => v && setMetric(v)}>
					{(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
						<ToggleButton key={m} value={m} sx={{ textTransform: "none", px: 1.25, py: 0.25 }}>
							{METRIC_LABEL[m]}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			}
		>
			<Stack spacing={1.5}>
				<Typography variant="body2" color="text.secondary">
					Correos por día (Buenos Aires) que el coordinador{" "}
					{metric === "wouldDefer" ? "habría diferido en modo prueba" : metric === "deferred" ? "difirió" : "salteó"}, por motivo. Tocá un
					día para verlo por campaña. Sirve para revisar el modo prueba antes de activarlo.{" "}
					<b>Total: {grandTotal.toLocaleString("es-AR")}</b>
				</Typography>

				{!frequency ? (
					<Typography variant="body2" color="text.secondary">
						Sin datos del coordinador.
					</Typography>
				) : (
					<Box>
						{rows.map((r) => {
							const isOpen = openDay === r.day;
							const campaignsOfDay = Object.values(r.counts).sort((a, b) => b.total - a.total);
							return (
								<Box key={r.day} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
									<Box
										{...(r.total > 0 ? clickableProps(() => setOpenDay(isOpen ? null : r.day)) : {})}
										sx={{
											display: "flex",
											alignItems: "center",
											gap: 1.5,
											py: 0.75,
											cursor: r.total > 0 ? "pointer" : "default",
											"&:hover": r.total > 0 ? { bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04) } : undefined,
										}}
									>
										<Box sx={{ width: 18, color: "text.secondary", display: "flex" }}>
											{r.total > 0 && (isOpen ? <ArrowDown2 size={14} /> : <ArrowRight2 size={14} />)}
										</Box>
										<Typography variant="body2" sx={{ width: 76, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
											{dayLabel(r.day)}
										</Typography>
										<Box
											sx={{
												flex: 1,
												minWidth: 80,
												height: 14,
												display: "flex",
												borderRadius: 0.75,
												overflow: "hidden",
												bgcolor: alpha(theme.palette.text.primary, 0.04),
											}}
										>
											{Object.entries(r.groups).map(([g, n]) => (
												<Tooltip key={g} title={`${GROUP_LABEL[g] || g}: ${n.toLocaleString("es-AR")}`}>
													<Box
														sx={{
															width: `${(n / max) * 100}%`,
															bgcolor: groupColor(g),
															borderRight: `1px solid ${theme.palette.background.paper}`,
														}}
													/>
												</Tooltip>
											))}
										</Box>
										<Typography
											variant="body2"
											sx={{
												width: 56,
												textAlign: "right",
												fontVariantNumeric: "tabular-nums",
												color: r.total ? "text.primary" : "text.secondary",
											}}
										>
											{r.hasDoc || r.total ? r.total.toLocaleString("es-AR") : "–"}
										</Typography>
									</Box>
									<Collapse in={isOpen} unmountOnExit>
										<Box sx={{ pl: 4, pb: 1, overflowX: "auto" }}>
											<Table size="small" sx={{ minWidth: 420 }}>
												<TableHead>
													<TableRow>
														<TableCell>Campaña</TableCell>
														<TableCell>Motivos</TableCell>
														<TableCell align="right">Total</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{campaignsOfDay.map((c) => (
														<TableRow key={c.campaignId}>
															<TableCell sx={{ maxWidth: 280 }}>
																<Typography variant="body2" noWrap title={resolveName(c.campaignId) || c.campaignId}>
																	{resolveName(c.campaignId) || c.campaignId}
																</Typography>
															</TableCell>
															<TableCell>
																<Stack spacing={0.25}>
																	{Object.entries(c.byReason).map(([reason, n]) => (
																		<Stack key={reason} direction="row" spacing={0.75} alignItems="center">
																			<Box
																				sx={{
																					width: 10,
																					height: 10,
																					borderRadius: 0.5,
																					bgcolor: groupColor(reasonGroup(reason)),
																					flexShrink: 0,
																				}}
																			/>
																			<Typography variant="caption">
																				{reasonLabel(reason, resolveName)}: {n.toLocaleString("es-AR")}
																			</Typography>
																		</Stack>
																	))}
																</Stack>
															</TableCell>
															<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
																{c.total.toLocaleString("es-AR")}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</Box>
									</Collapse>
								</Box>
							);
						})}
					</Box>
				)}

				{usedGroups.length > 0 && (
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						{usedGroups.map((g) => (
							<Stack key={g} direction="row" spacing={0.75} alignItems="center">
								<Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: groupColor(g) }} />
								<Typography variant="caption">{GROUP_LABEL[g] || g}</Typography>
							</Stack>
						))}
					</Stack>
				)}
				<Typography variant="caption" color="text.secondary">
					Un guion indica que ese día no hay contadores (el coordinador no corrió o estaba apagado).
				</Typography>
			</Stack>
		</MainCard>
	);
};

export default DailyDeferredCard;
