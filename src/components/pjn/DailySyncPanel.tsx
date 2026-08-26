import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	IconButton,
	Paper,
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
	alpha,
	useTheme,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import dayjs from "dayjs";
import pjnCredentialsService, { DailySyncControlData, DailySyncRow, DailySyncState } from "api/pjnCredentials";
import { BRAND_BLUE, LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

/**
 * Control diario de "Mis Causas" (update-sync) por credencial: cuánto tenía el
 * usuario en el portal → cuánto tiene ahora, qué cambió, si la corrida se
 * completó, y una serie de los últimos días. Se usa en Workers Mis Causas
 * (tab del worker) y en Credenciales PJN.
 */

const STATE_META: Record<DailySyncState, { label: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
	ok: { label: "OK", tone: "ok" },
	running: { label: "En curso", tone: "neutral" },
	no_run_today: { label: "Sin corrida hoy", tone: "warn" },
	incomplete: { label: "Escaneo incompleto", tone: "warn" },
	interrupted: { label: "Interrumpida", tone: "warn" },
	error: { label: "Error", tone: "bad" },
	invalid: { label: "Credencial inválida", tone: "bad" },
	inactive_user: { label: "Usuario inactivo", tone: "neutral" },
};

const OUTCOME_LABEL: Record<string, string> = {
	no_changes: "sin cambios",
	updated: "con altas",
	no_new: "sin altas",
	incomplete_scan: "escaneo incompleto",
	maintenance: "portal en mantenimiento",
	error: "error",
	interrupted: "interrumpida",
};

function Sparkline({
	series,
	width = 120,
	height = 28,
}: {
	series: Array<{ date: string; total: number }>;
	width?: number;
	height?: number;
}) {
	const theme = useTheme();
	if (!series || series.length < 2) {
		return (
			<Typography variant="caption" color="text.disabled">
				{series?.length === 1 ? `${series[0].total}` : "—"}
			</Typography>
		);
	}
	const vals = series.map((s) => s.total);
	const min = Math.min(...vals);
	const max = Math.max(...vals);
	const span = max - min || 1;
	const pad = 3;
	const pts = series.map((s, i) => {
		const x = pad + (i / (series.length - 1)) * (width - pad * 2);
		const y = height - pad - ((s.total - min) / span) * (height - pad * 2);
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});
	const last = series[series.length - 1];
	const first = series[0];
	const up = last.total > first.total;
	const down = last.total < first.total;
	const stroke = up ? LIVE_GREEN : down ? STALE_AMBER : BRAND_BLUE;
	return (
		<Tooltip title={`${series.length} días: ${first.date} ${first.total} → ${last.date} ${last.total} (mín ${min}, máx ${max})`}>
			<svg width={width} height={height} style={{ display: "block" }}>
				<polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
				<circle
					cx={pts[pts.length - 1].split(",")[0]}
					cy={pts[pts.length - 1].split(",")[1]}
					r={3}
					fill={stroke}
					stroke={theme.palette.background.paper}
					strokeWidth={1.5}
				/>
			</svg>
		</Tooltip>
	);
}

function StatTile({
	label,
	value,
	sub,
	tone,
}: {
	label: string;
	value: string | number;
	sub?: string;
	tone?: "ok" | "warn" | "bad" | "neutral";
}) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const color = tone === "ok" ? LIVE_GREEN : tone === "warn" ? STALE_AMBER : tone === "bad" ? theme.palette.error.main : BRAND_BLUE;
	return (
		<Paper
			variant="outlined"
			sx={{ p: 1.25, minWidth: 140, borderColor: alpha(color, isDark ? 0.35 : 0.25), bgcolor: alpha(color, isDark ? 0.08 : 0.04) }}
		>
			<Typography sx={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "text.secondary" }}>
				{label}
			</Typography>
			<Typography sx={{ fontSize: "1.35rem", fontWeight: 700, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
			{sub && (
				<Typography variant="caption" color="text.secondary">
					{sub}
				</Typography>
			)}
		</Paper>
	);
}

export default function DailySyncPanel({ days = 14, compact = false }: { days?: number; compact?: boolean }) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [data, setData] = useState<DailySyncControlData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<"all" | "changes" | "problems">("all");

	const load = () => {
		setLoading(true);
		setError(null);
		pjnCredentialsService
			.getDailySyncControl({ days })
			.then((r: { data: DailySyncControlData }) => setData(r.data))
			.catch((e: { response?: { data?: { message?: string } }; message?: string }) =>
				setError(e?.response?.data?.message || e?.message || "Error"),
			)
			.finally(() => setLoading(false));
	};
	useEffect(load, [days]); // eslint-disable-line react-hooks/exhaustive-deps

	const rows = useMemo(() => {
		if (!data) return [];
		if (filter === "problems") return data.rows.filter((r) => !["ok", "running", "inactive_user"].includes(r.state));
		if (filter === "changes")
			return data.rows.filter(
				(r) =>
					(r.totals.delta || 0) !== 0 ||
					r.changes.causasNuevas > 0 ||
					r.changes.foldersCreados > 0 ||
					r.changes.listRemovedMarked > 0 ||
					r.changes.listRemovedCleared > 0,
			);
		return data.rows;
	}, [data, filter]);

	const toneColor = (t: "ok" | "warn" | "bad" | "neutral") =>
		t === "ok" ? LIVE_GREEN : t === "warn" ? STALE_AMBER : t === "bad" ? theme.palette.error.main : theme.palette.text.secondary;

	const fmtDelta = (d: number | null) => (d === null ? "—" : d > 0 ? `+${d}` : `${d}`);
	const fmtTime = (d: string | null | undefined) => (d ? dayjs(d).format("DD/MM HH:mm") : "—");

	const t = data?.totals;
	const problems = t
		? (t.byState.error || 0) +
		  (t.byState.incomplete || 0) +
		  (t.byState.invalid || 0) +
		  (t.byState.interrupted || 0) +
		  (t.byState.no_run_today || 0)
		: 0;

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" useFlexGap spacing={1}>
				<Stack spacing={0.25}>
					<Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
						Control diario de Mis Causas
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{data
							? `${data.totals.credentials} credenciales habilitadas · hoy ${data.today} · últimos ${data.days} días · generado ${fmtTime(
									data.generatedAt,
							  )}`
							: "—"}
					</Typography>
				</Stack>
				<Stack direction="row" spacing={1} alignItems="center">
					<ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
						<ToggleButton value="all">Todas</ToggleButton>
						<ToggleButton value="changes">Con cambios</ToggleButton>
						<ToggleButton value="problems">Con problemas{problems ? ` (${problems})` : ""}</ToggleButton>
					</ToggleButtonGroup>
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={load} disabled={loading}>
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			{error && <Alert severity="error">{error}</Alert>}
			{loading && !data ? (
				<Stack alignItems="center" sx={{ py: 4 }}>
					<CircularProgress size={28} />
				</Stack>
			) : data && t ? (
				<>
					{/* Totales globales */}
					<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
						<StatTile
							label="Causas en el portal"
							value={t.portalCausas}
							sub={`antes ${t.portalCausasPrevious} (${fmtDelta(t.portalCausas - t.portalCausasPrevious)})`}
						/>
						<StatTile
							label="Carpetas pjn-login"
							value={t.foldersTotal}
							sub={`${t.foldersActive} activas · ${t.foldersArchived} archivadas`}
						/>
						<StatTile
							label="Altas hoy"
							value={t.todayNewCausas}
							sub={`${t.todayFoldersCreated} carpetas creadas`}
							tone={t.todayNewCausas > 0 ? "ok" : "neutral"}
						/>
						<StatTile
							label="Ya no en la lista"
							value={t.foldersListRemoved}
							sub={`${t.todayListRemovedMarked} marcadas hoy`}
							tone={t.todayListRemovedMarked > 0 ? "warn" : "neutral"}
						/>
						<StatTile
							label="Sin carpeta"
							value={t.todayPortalWithoutFolder}
							sub={t.todayMatchedByCaratula ? `${t.todayMatchedByCaratula} match x carátula` : "expedientes del portal"}
							tone={t.todayPortalWithoutFolder > 0 ? "warn" : "neutral"}
						/>
						<StatTile
							label="OK hoy"
							value={t.byState.ok || 0}
							sub={`de ${t.credentials}`}
							tone={(t.byState.ok || 0) === t.credentials ? "ok" : "neutral"}
						/>
						<StatTile
							label="Con problemas"
							value={problems}
							sub={
								Object.entries(t.byState)
									.filter(([k]) => !["ok", "running", "inactive_user"].includes(k))
									.map(([k, n]) => `${STATE_META[k as DailySyncState]?.label || k} ${n}`)
									.join(" · ") || "—"
							}
							tone={problems > 0 ? "bad" : "ok"}
						/>
					</Stack>

					<Box sx={{ overflowX: "auto" }}>
						<Table size="small" sx={{ "& td, & th": { fontSize: "0.75rem", py: 0.6, whiteSpace: "nowrap" } }}>
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell align="center">Última corrida</TableCell>
									<TableCell align="right">Tenía → tiene</TableCell>
									<TableCell align="right">Δ</TableCell>
									<TableCell align="right">Nuevas</TableCell>
									<TableCell align="right">Carpetas</TableCell>
									<TableCell align="right">Lista</TableCell>
									{!compact && <TableCell align="center">Escaneo</TableCell>}
									<TableCell align="right">Carpetas usuario</TableCell>
									<TableCell align="center">{data.days}d</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{rows.map((r: DailySyncRow) => {
									const meta = STATE_META[r.state] || { label: r.state, tone: "neutral" as const };
									const color = toneColor(meta.tone);
									return (
										<TableRow
											key={r.credentialId}
											hover
											sx={{ bgcolor: meta.tone === "bad" ? alpha(theme.palette.error.main, isDark ? 0.08 : 0.04) : undefined }}
										>
											<TableCell>
												<Typography variant="body2" sx={{ fontSize: "0.78rem" }} noWrap>
													{r.user.email || r.user.id}
												</Typography>
												{r.credential.lastErrorCode && (
													<Typography variant="caption" color="error">
														{r.credential.lastErrorCode}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Tooltip title={r.stateReason}>
													<Chip
														size="small"
														label={meta.label}
														sx={{
															height: 20,
															fontSize: "0.66rem",
															bgcolor: alpha(color, isDark ? 0.18 : 0.1),
															color,
															border: `1px solid ${alpha(color, 0.35)}`,
														}}
													/>
												</Tooltip>
												{r.credential.retries > 0 && (
													<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
														reintentos {r.credential.retries}
													</Typography>
												)}
											</TableCell>
											<TableCell align="center">
												<Tooltip
													title={
														r.lastRun
															? `${r.lastRun.status} · ${OUTCOME_LABEL[r.lastRun.outcome || ""] || r.lastRun.outcome || ""} · ${
																	r.lastRun.triggeredBy || ""
															  }${r.lastRun.durationMs ? ` · ${Math.round(r.lastRun.durationMs / 1000)}s` : ""}${
																	r.lastRun.error ? ` · ${r.lastRun.error}` : ""
															  }`
															: "sin corridas"
													}
												>
													<span>{fmtTime(r.lastRun?.startedAt)}</span>
												</Tooltip>
												{r.lastRun?.outcome && (
													<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
														{OUTCOME_LABEL[r.lastRun.outcome] || r.lastRun.outcome}
													</Typography>
												)}
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												{r.totals.previous ?? "—"} → <b>{r.totals.current ?? "—"}</b>
											</TableCell>
											<TableCell
												align="right"
												sx={{
													fontVariantNumeric: "tabular-nums",
													color: (r.totals.delta || 0) > 0 ? LIVE_GREEN : (r.totals.delta || 0) < 0 ? STALE_AMBER : "text.secondary",
													fontWeight: r.totals.delta ? 700 : 400,
												}}
											>
												{fmtDelta(r.totals.delta)}
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												<Tooltip title={`detectadas en el listado ${r.changes.causasEncontradas} · creadas ${r.changes.causasNuevas}`}>
													<span>{r.changes.causasNuevas || (r.changes.causasEncontradas ? `${r.changes.causasEncontradas}*` : "—")}</span>
												</Tooltip>
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												<Tooltip
													title={`creadas ${r.changes.foldersCreados} · archivadas por plan ${r.changes.foldersArchivados} · sin crear por límite ${r.changes.foldersPendientesLimite}`}
												>
													<span>
														{r.changes.foldersCreados || "—"}
														{r.changes.foldersArchivados ? ` (${r.changes.foldersArchivados} arch.)` : ""}
														{r.changes.foldersPendientesLimite ? ` · ${r.changes.foldersPendientesLimite} sin crear` : ""}
													</span>
												</Tooltip>
											</TableCell>
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												<Tooltip
													title={`“Ya no en la lista”: marcadas ${r.changes.listRemovedMarked} · limpiadas ${r.changes.listRemovedCleared}`}
												>
													<span>
														{r.changes.listRemovedMarked ? <span style={{ color: STALE_AMBER }}>−{r.changes.listRemovedMarked}</span> : ""}
														{r.changes.listRemovedMarked && r.changes.listRemovedCleared ? " / " : ""}
														{r.changes.listRemovedCleared ? <span style={{ color: LIVE_GREEN }}>+{r.changes.listRemovedCleared}</span> : ""}
														{!r.changes.listRemovedMarked && !r.changes.listRemovedCleared ? "—" : ""}
													</span>
												</Tooltip>
											</TableCell>
											{!compact && (
												<TableCell align="center">
													{r.changes.scanComplete === null ? (
														<Typography variant="caption" color="text.disabled">
															—
														</Typography>
													) : r.changes.scanComplete ? (
														<Tooltip
															title={
																r.reconciliation.portalExpedientes !== null
																	? `${r.reconciliation.portalExpedientes} expedientes leídos · ${
																			r.reconciliation.matchedByKey ?? 0
																	  } match por expediente · ${r.reconciliation.matchedByCaratula ?? 0} por carátula · ${
																			r.reconciliation.portalWithoutFolder ?? 0
																	  } en portal sin carpeta`
																	: "escaneo completo"
															}
														>
															<Chip
																size="small"
																label={`completo${r.changes.pagesScanned ? ` · ${r.changes.pagesScanned} pág.` : ""}${
																	r.reconciliation.matchedByCaratula ? ` · ${r.reconciliation.matchedByCaratula} x carátula` : ""
																}${r.reconciliation.portalWithoutFolder ? ` · ${r.reconciliation.portalWithoutFolder} sin carpeta` : ""}`}
																variant="outlined"
																color={r.reconciliation.portalWithoutFolder ? "warning" : "default"}
																sx={{ height: 20, fontSize: "0.64rem" }}
															/>
														</Tooltip>
													) : (
														<Chip size="small" label="incompleto" color="warning" sx={{ height: 20, fontSize: "0.64rem" }} />
													)}
												</TableCell>
											)}
											<TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
												<Tooltip
													title={`${r.folders.active} activas · ${r.folders.archived} archivadas · ${r.folders.listRemoved} “ya no en la lista”`}
												>
													<span>
														{r.folders.total}
														{r.folders.archived ? (
															<span style={{ color: theme.palette.text.secondary }}> ({r.folders.archived} arch.)</span>
														) : (
															""
														)}
														{r.totals.current !== null && r.folders.total !== r.totals.current ? (
															<span style={{ color: STALE_AMBER }}> ≠</span>
														) : null}
													</span>
												</Tooltip>
											</TableCell>
											<TableCell align="center">
												<Sparkline series={r.series} />
											</TableCell>
										</TableRow>
									);
								})}
								{rows.length === 0 && (
									<TableRow>
										<TableCell colSpan={compact ? 10 : 11}>
											<Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
												Sin credenciales para el filtro elegido.
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</Box>
					<Typography variant="caption" color="text.secondary">
						“Tenía → tiene” = total de expedientes en Mis Causas del portal antes/después de la última corrida. “Carpetas usuario” =
						carpetas pjn-login del usuario; el ≠ indica que no coincide con el total del portal (incidentes sin carpeta, límite de plan, o
						bajas). “Nuevas” con * = detectadas pero no creadas.
					</Typography>
				</>
			) : null}
		</Stack>
	);
}
