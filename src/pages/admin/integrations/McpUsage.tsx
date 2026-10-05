import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	Grid,
	IconButton,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Activity, Cpu, Danger, People, Refresh, Timer1 } from "iconsax-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { useSnackbar } from "notistack";

import MainCard from "components/MainCard";
import { BRAND_BLUE } from "themes/dashboardTokens";
import { useTabParam } from "hooks/useTabParam";
import McpUsageService from "api/mcpUsage";
import {
	McpProvider,
	McpUsageByClientItem,
	McpUsageByProviderItem,
	McpUsageByToolItem,
	McpUsageByUserItem,
	McpUsageErrorItem,
	McpUsageSummaryData,
	McpUsageTimeseriesItem,
} from "types/mcpUsage";

// Rango en días, en la URL (?dias=30) para que la vista sea compartible.
// 90 = TTL de McpUsageEvent: más atrás no hay datos.
const RANGE_VALUES = ["7", "30", "90"] as const;

const PROVIDER_LABEL: Record<McpProvider, string> = {
	claude: "Claude",
	chatgpt: "ChatGPT",
	other: "Otro",
	unknown: "Desconocido",
};

const PROVIDER_COLOR: Record<McpProvider, "primary" | "success" | "default" | "warning"> = {
	claude: "primary",
	chatgpt: "success",
	other: "default",
	unknown: "warning",
};

const nf = new Intl.NumberFormat("es-AR");
const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? "—" : nf.format(n));
const fmtMs = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${nf.format(Math.round(n))} ms`);
const fmtPct = (part: number, total: number) => (total ? `${((part / total) * 100).toFixed(1)}%` : "—");
const fmtDateTime = (iso: string | null | undefined) =>
	iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }) : "—";
// "2026-09-03" → "03/09" para el eje X.
const fmtDay = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const shortId = (id: string | null | undefined) => (id ? `${id.slice(0, 8)}…` : "—");

// Stat Card (mismo diseño que Visor de documentos — Analytics)
interface StatCardProps {
	title: string;
	value: string;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
				<Box>
					<Typography
						variant="caption"
						color="text.secondary"
						sx={{ letterSpacing: 0.3, textTransform: "uppercase", display: "block", mb: 0.5 }}
					>
						{title}
					</Typography>
					{loading ? (
						<Skeleton width={80} height={40} />
					) : (
						<Typography variant="h3" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums" }}>
							{value}
						</Typography>
					)}
					{subtitle && !loading && (
						<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						width: 44,
						height: 44,
						borderRadius: 1.25,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: alpha(color, 0.1),
						color,
					}}
				>
					{icon}
				</Box>
			</Stack>
		</Paper>
	);
};

// Sección con título + contenido (tabla o gráfico)
const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => {
	const theme = useTheme();
	return (
		<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
			<Typography variant="h6">{title}</Typography>
			{subtitle && (
				<Typography variant="caption" color="text.secondary">
					{subtitle}
				</Typography>
			)}
			<Box sx={{ mt: 2 }}>{children}</Box>
		</Paper>
	);
};

const EmptyRow: React.FC<{ colSpan: number; loading: boolean }> = ({ colSpan, loading }) => (
	<TableRow>
		<TableCell colSpan={colSpan}>
			{loading ? (
				<Skeleton height={28} />
			) : (
				<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 1 }}>
					Sin datos en el rango
				</Typography>
			)}
		</TableCell>
	</TableRow>
);

interface UsageData {
	summary: McpUsageSummaryData | null;
	series: McpUsageTimeseriesItem[] | null; // null = endpoint no disponible
	byTool: McpUsageByToolItem[];
	byUser: McpUsageByUserItem[];
	byClient: McpUsageByClientItem[] | null;
	byProvider: McpUsageByProviderItem[];
	errors: McpUsageErrorItem[];
}

const EMPTY: UsageData = { summary: null, series: [], byTool: [], byUser: [], byClient: [], byProvider: [], errors: [] };

const McpUsage: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [range, setRange] = useTabParam("dias", RANGE_VALUES);
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<UsageData>(EMPTY);
	const [failed, setFailed] = useState<string[]>([]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		const to = new Date();
		const from = new Date(to.getTime() - Number(range) * 86400000);
		const params = { from: from.toISOString(), to: to.toISOString() };
		// allSettled: si un endpoint falla (p. ej. hub sin deployar timeseries/by-client)
		// el resto de la vista sigue funcionando.
		const [summary, series, byTool, byUser, byClient, errors] = await Promise.allSettled([
			McpUsageService.getSummary(params),
			McpUsageService.getTimeseries(params),
			McpUsageService.getByTool(params),
			McpUsageService.getByUser({ ...params, limit: 50 }),
			McpUsageService.getByClient({ ...params, limit: 25 }),
			McpUsageService.getErrors({ ...params, limit: 50 }),
		]);
		const bad: string[] = [];
		const ok = <T,>(r: PromiseSettledResult<T>, label: string): T | null => {
			if (r.status === "fulfilled") return r.value;
			bad.push(label);
			return null;
		};
		const s = ok(summary, "resumen");
		const ts = ok(series, "serie diaria");
		const t = ok(byTool, "por tool");
		const u = ok(byUser, "por usuario");
		const c = ok(byClient, "por cliente");
		const e = ok(errors, "errores");
		setData({
			summary: s?.data ?? null,
			series: ts ? ts.items : null,
			byTool: t?.items ?? [],
			byUser: u?.items ?? [],
			byClient: c ? c.items : null,
			byProvider: c?.by_provider ?? [],
			errors: e?.items ?? [],
		});
		setFailed(bad);
		if (bad.length) enqueueSnackbar(`No se pudo cargar: ${bad.join(", ")}`, { variant: "warning" });
		setLoading(false);
	}, [range, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Email de cada userId (de by-user, que ya lo resuelve) para mostrar en errores.
	const emailByUser = useMemo(() => new Map(data.byUser.map((u) => [u.userId, u.email || u.name || ""])), [data.byUser]);
	const providerByClient = useMemo(() => new Map((data.byClient ?? []).map((c) => [c.clientId, c.provider])), [data.byClient]);

	const s = data.summary;
	const errorRate = s ? fmtPct(s.error_calls, s.total_calls) : "—";

	return (
		<MainCard
			title="Uso del MCP"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<ToggleButtonGroup
						size="small"
						exclusive
						value={range}
						onChange={(_e, v: string | null) => v && setRange(v)}
						aria-label="Rango de días"
					>
						{RANGE_VALUES.map((d) => (
							<ToggleButton key={d} value={d} sx={{ px: 1.5, textTransform: "none" }}>
								{d} días
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Tooltip title="Actualizar">
						<span>
							<IconButton onClick={fetchData} disabled={loading} size="small">
								<Refresh size={18} />
							</IconButton>
						</span>
					</Tooltip>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Tool calls de la-mcp-server (Claude.ai, ChatGPT y otros clientes OAuth). Los eventos se conservan 90 días.
			</Typography>

			{failed.length > 0 && !loading && (
				<Alert severity="warning" sx={{ mb: 3 }}>
					No se pudo cargar: {failed.join(", ")}. El resto de la vista muestra datos parciales.
				</Alert>
			)}

			{/* KPIs */}
			<Grid container spacing={3} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Llamadas"
						value={fmtNum(s?.total_calls ?? 0)}
						subtitle={`${fmtNum(s?.unique_tools ?? 0)} tools · ${fmtNum(s?.unique_clients ?? 0)} clientes OAuth`}
						icon={<Activity size={24} />}
						color={BRAND_BLUE}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Usuarios únicos"
						value={fmtNum(s?.unique_users ?? 0)}
						subtitle={s?.unique_users ? `${(s.total_calls / s.unique_users).toFixed(1)} llamadas por usuario` : undefined}
						icon={<People size={24} />}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Errores"
						value={errorRate}
						subtitle={`${fmtNum(s?.error_calls ?? 0)} llamadas con error`}
						icon={<Danger size={24} />}
						color={s && s.error_calls > 0 ? theme.palette.error.main : theme.palette.success.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<StatCard
						title="Latencia p50 / p95"
						value={s?.p50_elapsed_ms !== undefined ? `${fmtMs(s?.p50_elapsed_ms)}` : fmtMs(s?.avg_elapsed_ms)}
						subtitle={
							s?.p95_elapsed_ms !== undefined
								? `p95 ${fmtMs(s?.p95_elapsed_ms)} · promedio ${fmtMs(s?.avg_elapsed_ms)}`
								: "promedio (sin percentiles)"
						}
						icon={<Timer1 size={24} />}
						color={theme.palette.warning.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

			{/* Serie diaria + proveedores */}
			<Grid container spacing={3} sx={{ mb: 3 }}>
				<Grid item xs={12} md={8}>
					<Section title="Llamadas por día" subtitle="Día calendario en hora argentina">
						{loading ? (
							<Skeleton variant="rectangular" height={260} />
						) : data.series === null ? (
							<Alert severity="info">La serie diaria no está disponible en este backend.</Alert>
						) : data.series.every((d) => d.calls === 0) ? (
							<Alert severity="info">Sin llamadas en el rango.</Alert>
						) : (
							<ResponsiveContainer width="100%" height={260}>
								<BarChart data={data.series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11 }} minTickGap={12} />
									<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
									<RechartsTooltip labelFormatter={(l) => fmtDay(String(l))} />
									<Legend wrapperStyle={{ fontSize: 12 }} />
									<Bar dataKey="calls" name="Llamadas" fill={BRAND_BLUE} />
									<Bar dataKey="errors" name="Errores" fill={theme.palette.error.main} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</Section>
				</Grid>
				<Grid item xs={12} md={4}>
					<Section title="Por proveedor" subtitle="Clientes OAuth (DCR) agrupados">
						{loading ? (
							<Skeleton variant="rectangular" height={120} />
						) : data.byClient === null ? (
							<Alert severity="info">El uso por cliente no está disponible en este backend.</Alert>
						) : data.byProvider.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								Sin datos en el rango
							</Typography>
						) : (
							<Stack spacing={1.5}>
								{data.byProvider.map((p) => (
									<Stack key={p.provider} direction="row" justifyContent="space-between" alignItems="center">
										<Chip size="small" color={PROVIDER_COLOR[p.provider]} variant="outlined" label={PROVIDER_LABEL[p.provider]} />
										<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{fmtNum(p.calls)} llamadas · {fmtNum(p.clients)} {p.clients === 1 ? "cliente" : "clientes"}
											{p.errors > 0 && ` · ${fmtNum(p.errors)} err.`}
										</Typography>
									</Stack>
								))}
							</Stack>
						)}
					</Section>
				</Grid>
			</Grid>

			{/* Por tool + por usuario */}
			<Grid container spacing={3} sx={{ mb: 3 }}>
				<Grid item xs={12} lg={6}>
					<Section title="Por tool">
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Tool</TableCell>
										<TableCell align="right">Llamadas</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell align="right">Usuarios</TableCell>
										<TableCell align="right">Latencia prom.</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.byTool.length === 0 ? (
										<EmptyRow colSpan={5} loading={loading} />
									) : (
										data.byTool.map((t) => (
											<TableRow key={t.tool} hover>
												<TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{t.tool}</TableCell>
												<TableCell align="right">{fmtNum(t.calls)}</TableCell>
												<TableCell align="right">
													{t.errors > 0 ? (
														<Typography variant="body2" color="error.main" component="span">
															{fmtNum(t.errors)} ({fmtPct(t.errors, t.calls)})
														</Typography>
													) : (
														"0"
													)}
												</TableCell>
												<TableCell align="right">{fmtNum(t.unique_users)}</TableCell>
												<TableCell align="right">{fmtMs(t.avg_elapsed_ms)}</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Section>
				</Grid>
				<Grid item xs={12} lg={6}>
					<Section title="Por usuario" subtitle="Top 50 por cantidad de llamadas">
						<TableContainer sx={{ maxHeight: 440 }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										<TableCell>Usuario</TableCell>
										<TableCell align="right">Llamadas</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell align="right">Tools</TableCell>
										<TableCell align="right">Última actividad</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.byUser.length === 0 ? (
										<EmptyRow colSpan={5} loading={loading} />
									) : (
										data.byUser.map((u) => (
											<TableRow key={u.userId} hover>
												<TableCell>
													<Typography variant="body2">{u.email || shortId(u.userId)}</Typography>
													{u.name && (
														<Typography variant="caption" color="text.secondary">
															{u.name}
														</Typography>
													)}
												</TableCell>
												<TableCell align="right">{fmtNum(u.calls)}</TableCell>
												<TableCell align="right">
													{u.errors > 0 ? (
														<Typography variant="body2" color="error.main" component="span">
															{fmtNum(u.errors)}
														</Typography>
													) : (
														"0"
													)}
												</TableCell>
												<TableCell align="right">{fmtNum(u.tools_used)}</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													{fmtDateTime(u.last_call)}
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</TableContainer>
					</Section>
				</Grid>
			</Grid>

			{/* Errores recientes */}
			<Section title="Errores recientes" subtitle="Últimos 50 del rango">
				<TableContainer sx={{ maxHeight: 480 }}>
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Tool</TableCell>
								<TableCell>Usuario</TableCell>
								<TableCell>Cliente</TableCell>
								<TableCell align="right">Latencia</TableCell>
								<TableCell>Mensaje</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{data.errors.length === 0 ? (
								<EmptyRow colSpan={6} loading={loading} />
							) : (
								data.errors.map((e) => {
									const provider = providerByClient.get(e.clientId ?? null);
									return (
										<TableRow key={e._id} hover>
											<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.ts)}</TableCell>
											<TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{e.tool || e.jsonRpcMethod || "—"}</TableCell>
											<TableCell>{emailByUser.get(e.userId) || shortId(e.userId)}</TableCell>
											<TableCell>
												{provider ? (
													<Chip size="small" variant="outlined" color={PROVIDER_COLOR[provider]} label={PROVIDER_LABEL[provider]} />
												) : (
													<Tooltip title={e.clientId || ""}>
														<span>{shortId(e.clientId)}</span>
													</Tooltip>
												)}
											</TableCell>
											<TableCell align="right">{fmtMs(e.elapsedMs)}</TableCell>
											<TableCell sx={{ maxWidth: 420 }}>
												<Tooltip title={e.errorMessage || ""}>
													<Typography variant="body2" noWrap>
														{e.errorMessage || "—"}
													</Typography>
												</Tooltip>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Section>

			{/* Por cliente OAuth (detalle) */}
			{data.byClient && data.byClient.length > 0 && (
				<Box sx={{ mt: 3 }}>
					<Section title="Por cliente OAuth" subtitle="Cada (re)conexión de Claude.ai/ChatGPT registra un cliente nuevo por DCR">
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Cliente</TableCell>
										<TableCell>Proveedor</TableCell>
										<TableCell align="right">Llamadas</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell align="right">Usuarios</TableCell>
										<TableCell align="right">Última actividad</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.byClient.map((c) => (
										<TableRow key={c.clientId ?? "sin-client"} hover>
											<TableCell>
												<Typography variant="body2">{c.client_name || "—"}</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
													{c.clientId ?? "sin clientId"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip size="small" variant="outlined" color={PROVIDER_COLOR[c.provider]} label={PROVIDER_LABEL[c.provider]} />
											</TableCell>
											<TableCell align="right">{fmtNum(c.calls)}</TableCell>
											<TableCell align="right">{fmtNum(c.errors)}</TableCell>
											<TableCell align="right">{fmtNum(c.unique_users)}</TableCell>
											<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
												{fmtDateTime(c.last_call)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Section>
				</Box>
			)}

			{!loading && s && s.total_calls === 0 && (
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 3, color: "text.secondary" }}>
					<Cpu size={18} />
					<Typography variant="body2">Sin tool calls registradas en los últimos {range} días.</Typography>
				</Stack>
			)}
		</MainCard>
	);
};

export default McpUsage;
