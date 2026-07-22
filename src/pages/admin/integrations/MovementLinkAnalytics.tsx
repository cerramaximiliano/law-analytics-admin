import React, { useCallback, useEffect, useState } from "react";
import {
	Grid,
	Typography,
	Box,
	Skeleton,
	IconButton,
	Tooltip,
	useTheme,
	alpha,
	Paper,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	Tab,
	Button,
	Stack,
	Alert,
	TextField,
	FormControlLabel,
	Switch,
} from "@mui/material";
import { Refresh, Eye, DocumentText, LoginCurve, DocumentDownload, People, Folder2, ExportSquare, Warning2, TickCircle } from "iconsax-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import MainCard from "components/MainCard";
import { BRAND_BLUE } from "themes/dashboardTokens";
import MovementLinkAnalyticsService from "api/movementLinkAnalytics";
import MovementViewerPreview from "./MovementViewerPreview";
import {
	MovementLinkSummaryData,
	MovementLinkByFueroItem,
	MovementLinkByUserItem,
	MovementLinkTimeseriesItem,
	MovementLinkRecentItem,
	MovementLinkEventName,
} from "types/movementLinkAnalytics";
import { useSnackbar } from "notistack";

// Traducción de eventos para no exponer enums crudos.
const EVENT_TRANSLATIONS: Record<MovementLinkEventName, string> = {
	open: "Apertura",
	view_confirmed: "Vista confirmada",
	cta_click: "Click en CTA",
	download: "Descarga",
	fallback_click: "Click al portal PJN",
	login_continue: "Continuó en la app",
	promo_click: "Click en promo",
};

const EVENT_COLOR: Record<MovementLinkEventName, "default" | "primary" | "secondary" | "info" | "success" | "warning" | "error"> = {
	open: "default",
	view_confirmed: "info",
	cta_click: "primary",
	download: "success",
	fallback_click: "secondary",
	login_continue: "warning",
	promo_click: "error",
};

// Tab Panel
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}
function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
}

// Stat Card
interface StatCardProps {
	title: string;
	value: number | string;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => {
	const theme = useTheme();
	return (
		<Paper
			elevation={0}
			sx={{
				p: 3,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				height: "100%",
				transition: "transform 200ms ease, box-shadow 200ms ease",
				"&:hover": { transform: "translateY(-2px)", boxShadow: `0 6px 20px ${alpha(color, 0.12)}` },
			}}
		>
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
					{subtitle && (
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

const fmtRate = (r: number | null | undefined): string => (r === null || r === undefined ? "—" : `${r}%`);

// Main component
const MovementLinkAnalytics: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [tabValue, setTabValue] = useState(0);
	const [loading, setLoading] = useState(true);
	const [summary, setSummary] = useState<MovementLinkSummaryData | null>(null);
	const [series, setSeries] = useState<MovementLinkTimeseriesItem[]>([]);
	const [byFuero, setByFuero] = useState<MovementLinkByFueroItem[]>([]);
	const [byUser, setByUser] = useState<MovementLinkByUserItem[]>([]);
	const [recent, setRecent] = useState<MovementLinkRecentItem[]>([]);

	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [includeBots, setIncludeBots] = useState(false);

	const buildParams = useCallback(() => {
		return {
			...(dateFrom && { from: dateFrom }),
			...(dateTo && { to: dateTo }),
			...(includeBots && { includeBots: "1" as const }),
		};
	}, [dateFrom, dateTo, includeBots]);

	// Resumen + datos de la primera tab.
	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = buildParams();
			const [summaryRes, seriesRes, fueroRes] = await Promise.all([
				MovementLinkAnalyticsService.getSummary(params),
				MovementLinkAnalyticsService.getTimeseries(params),
				MovementLinkAnalyticsService.getByFuero(params),
			]);
			if (summaryRes.success) setSummary(summaryRes.data);
			if (seriesRes.success) setSeries(seriesRes.items);
			if (fueroRes.success) setByFuero(fueroRes.items);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar datos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [buildParams, enqueueSnackbar]);

	const fetchByUser = useCallback(async () => {
		try {
			const res = await MovementLinkAnalyticsService.getByUser({ ...buildParams(), limit: 50 });
			if (res.success) setByUser(res.items);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar usuarios", { variant: "error" });
		}
	}, [buildParams, enqueueSnackbar]);

	const fetchRecent = useCallback(async () => {
		try {
			const res = await MovementLinkAnalyticsService.getRecent({ ...buildParams(), limit: 100 });
			if (res.success) setRecent(res.items);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar eventos", { variant: "error" });
		}
	}, [buildParams, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		if (tabValue === 1) fetchByUser();
		else if (tabValue === 2) fetchRecent();
	}, [tabValue, fetchByUser, fetchRecent]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => setTabValue(newValue);

	return (
		<MainCard title="Visor de documentos — Analytics" content={false}>
			{/* Header: filtros + refresh */}
			<Box sx={{ p: 3, pb: 0 }}>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
					<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" rowGap={1}>
						<TextField
							type="date"
							size="small"
							label="Desde"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						<TextField
							type="date"
							size="small"
							label="Hasta"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							InputLabelProps={{ shrink: true }}
							sx={{ width: 160 }}
						/>
						<FormControlLabel
							control={<Switch size="small" checked={includeBots} onChange={(e) => setIncludeBots(e.target.checked)} />}
							label={
								<Typography variant="caption" color="text.secondary">
									Incluir bots
								</Typography>
							}
						/>
						<Button variant="contained" size="small" onClick={fetchData} disabled={loading}>
							Aplicar
						</Button>
						{(dateFrom || dateTo) && (
							<Button
								variant="outlined"
								size="small"
								onClick={() => {
									setDateFrom("");
									setDateTo("");
								}}
							>
								Limpiar
							</Button>
						)}
					</Stack>
					<Tooltip title="Actualizar datos">
						<IconButton onClick={fetchData} disabled={loading}>
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Box>

			{/* Tabs */}
			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 2 }}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					TabIndicatorProps={{ sx: { height: 2.5, backgroundColor: BRAND_BLUE } }}
					sx={{
						"& .MuiTab-root": { textTransform: "none", fontWeight: 500, fontSize: "0.875rem" },
						"& .Mui-selected": { fontWeight: 600, color: BRAND_BLUE + " !important" },
					}}
				>
					<Tab label="Resumen" />
					<Tab label="Por usuario" />
					<Tab label="Eventos recientes" />
					<Tab label="Vista previa" />
				</Tabs>
			</Box>

			{/* Tab: Resumen */}
			<TabPanel value={tabValue} index={0}>
				<Box sx={{ px: 3, pb: 3 }}>
					{/* Cards */}
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Aperturas (humanas)"
								value={summary?.opens_human ?? 0}
								subtitle={`${summary?.opens_bot ?? 0} bots · ${fmtRate(summary?.rate_bot)} bot`}
								icon={<Eye size={24} />}
								color={BRAND_BLUE}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Vistas confirmadas"
								value={summary?.views_confirmed ?? 0}
								subtitle="Corrió JS (humano real)"
								icon={<DocumentText size={24} />}
								color={theme.palette.info.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Clicks en CTA"
								value={summary?.cta_clicks ?? 0}
								subtitle={`${fmtRate(summary?.rate_view_to_cta)} de las vistas`}
								icon={<LoginCurve size={24} />}
								color={theme.palette.primary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Descargas"
								value={summary?.downloads ?? 0}
								subtitle={`${fmtRate(summary?.rate_view_to_download)} de las vistas`}
								icon={<DocumentDownload size={24} />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Continuaron en la app"
								value={summary?.login_continues ?? 0}
								subtitle={`${fmtRate(summary?.rate_cta_to_login)} de los CTA`}
								icon={<TickCircle size={24} />}
								color={theme.palette.secondary.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<StatCard
								title="Usuarios únicos"
								value={summary?.unique_users ?? 0}
								subtitle={`${summary?.unique_causas ?? 0} causas`}
								icon={<People size={24} />}
								color={theme.palette.warning.main}
								loading={loading}
							/>
						</Grid>
					</Grid>

					{/* Join con los envíos de emails (la-notification): denominador real del
					    funnel — cuánto se envió y qué % de usuarios llegó a la vista. */}
					<Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
						Emails de movimientos enviados (la-notification)
					</Typography>
					<Grid container spacing={3} sx={{ mb: 4 }}>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Movimientos notificados"
								value={summary?.notifications?.movements_notified ?? 0}
								subtitle="Logs de envío en el rango"
								icon={<DocumentText size={24} />}
								color={BRAND_BLUE}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Usuarios notificados"
								value={summary?.notifications?.users_notified ?? 0}
								subtitle="Recibieron al menos un email"
								icon={<People size={24} />}
								color={theme.palette.info.main}
								loading={loading}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<StatCard
								title="Tasa de apertura"
								value={fmtRate(summary?.notifications?.open_rate_users)}
								subtitle={`${summary?.notifications?.users_opened ?? 0} de ${
									summary?.notifications?.users_notified ?? 0
								} usuarios vieron un documento`}
								icon={<Eye size={24} />}
								color={theme.palette.success.main}
								loading={loading}
							/>
						</Grid>
					</Grid>

					<Grid container spacing={3}>
						{/* Funnel */}
						<Grid item xs={12} md={4}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: "100%" }}>
								<Typography variant="h6" gutterBottom>
									Funnel de engagement
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={220} />
								) : summary ? (
									<Stack spacing={2} sx={{ mt: 1 }}>
										<FunnelStep label="Aperturas humanas" value={summary.opens_human} max={summary.opens_human} color={BRAND_BLUE} theme={theme} />
										<FunnelStep
											label="Vistas confirmadas"
											value={summary.views_confirmed}
											max={summary.opens_human}
											color={theme.palette.info.main}
											theme={theme}
										/>
										<FunnelStep
											label="Clicks en CTA"
											value={summary.cta_clicks}
											max={summary.opens_human}
											color={theme.palette.primary.main}
											theme={theme}
										/>
										<FunnelStep
											label="Continuaron en la app"
											value={summary.login_continues}
											max={summary.opens_human}
											color={theme.palette.secondary.main}
											theme={theme}
										/>
										<FunnelStep
											label="Descargas"
											value={summary.downloads}
											max={summary.opens_human}
											color={theme.palette.success.main}
											theme={theme}
										/>
										<Box sx={{ pt: 1 }}>
											<Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
												<Chip size="small" variant="outlined" label={`PDF servido: ${fmtRate(summary.rate_pdf_served)}`} />
												<Chip size="small" variant="outlined" color="primary" label={`CTA/apertura: ${fmtRate(summary.rate_cta_per_open)}`} />
												<Chip size="small" variant="outlined" color="secondary" label={`Login post-CTA: ${fmtRate(summary.rate_cta_to_login)}`} />
											</Stack>
										</Box>
										{(summary.opens_expired > 0 || summary.opens_not_found > 0) && (
											<Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
												{summary.opens_expired > 0 && (
													<Chip size="small" color="warning" variant="outlined" label={`${summary.opens_expired} expirados`} />
												)}
												{summary.opens_not_found > 0 && (
													<Chip size="small" color="error" variant="outlined" label={`${summary.opens_not_found} sin movimiento`} />
												)}
											</Stack>
										)}
									</Stack>
								) : (
									<Alert severity="info">No hay datos disponibles</Alert>
								)}
							</Paper>
						</Grid>

						{/* Tendencia */}
						<Grid item xs={12} md={8}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, height: 360 }}>
								<Typography variant="h6" gutterBottom>
									Tendencia diaria
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={280} />
								) : series.length > 0 ? (
									<ResponsiveContainer width="100%" height={290}>
										<LineChart data={series} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
											<CartesianGrid strokeDasharray="3 3" vertical={false} />
											<XAxis dataKey="date" tick={{ fontSize: 11 }} />
											<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
											<RechartsTooltip />
											<Legend wrapperStyle={{ fontSize: 12 }} />
											<Line
												type="monotone"
												dataKey="notified"
												name="Notificados (email)"
												stroke={theme.palette.grey[500]}
												strokeWidth={2}
												strokeDasharray="5 4"
												dot={false}
											/>
											<Line type="monotone" dataKey="views" name="Vistas" stroke={theme.palette.info.main} strokeWidth={2} dot={false} />
											<Line type="monotone" dataKey="cta_clicks" name="CTA" stroke={theme.palette.primary.main} strokeWidth={2} dot={false} />
											<Line type="monotone" dataKey="downloads" name="Descargas" stroke={theme.palette.success.main} strokeWidth={2} dot={false} />
											<Line
												type="monotone"
												dataKey="login_continues"
												name="Continuó en app"
												stroke={theme.palette.secondary.main}
												strokeWidth={2}
												dot={false}
											/>
										</LineChart>
									</ResponsiveContainer>
								) : (
									<Alert severity="info">No hay datos en el rango seleccionado</Alert>
								)}
							</Paper>
						</Grid>

						{/* Por fuero */}
						<Grid item xs={12}>
							<Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
								<Typography variant="h6" gutterBottom>
									Engagement por fuero
								</Typography>
								{loading ? (
									<Skeleton variant="rectangular" height={160} />
								) : byFuero.length > 0 ? (
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Fuero</TableCell>
													<TableCell align="right">Aperturas</TableCell>
													<TableCell align="right">Vistas</TableCell>
													<TableCell align="right">CTA</TableCell>
													<TableCell align="right">Descargas</TableCell>
													<TableCell align="right">Usuarios</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{byFuero.map((row) => (
													<TableRow key={row.fuero} hover>
														<TableCell>
															<Chip label={row.fuero} size="small" variant="outlined" />
														</TableCell>
														<TableCell align="right">{row.opens}</TableCell>
														<TableCell align="right">{row.views}</TableCell>
														<TableCell align="right">{row.cta_clicks}</TableCell>
														<TableCell align="right">{row.downloads}</TableCell>
														<TableCell align="right">{row.unique_users}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								) : (
									<Alert severity="info">No hay datos por fuero</Alert>
								)}
							</Paper>
						</Grid>
					</Grid>
				</Box>
			</TabPanel>

			{/* Tab: Por usuario */}
			<TabPanel value={tabValue} index={1}>
				<Box sx={{ px: 3, pb: 3 }}>
					<Alert severity="info" sx={{ mb: 3 }} icon={<People size={18} />}>
						Usuarios que más interactúan con los links de los emails de movimientos, ordenados por vistas confirmadas.
					</Alert>
					<TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell align="right">Aperturas</TableCell>
									<TableCell align="right">Vistas</TableCell>
									<TableCell align="right">CTA</TableCell>
									<TableCell align="right">Continuó</TableCell>
									<TableCell align="right">Descargas</TableCell>
									<TableCell align="right">Causas</TableCell>
									<TableCell>Última actividad</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{byUser.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} align="center">
											<Typography color="text.secondary">No hay actividad de usuarios</Typography>
										</TableCell>
									</TableRow>
								) : (
									byUser.map((u) => (
										<TableRow key={u.userId} hover>
											<TableCell>
												<Stack>
													<Typography variant="body2">{u.name || "Sin nombre"}</Typography>
													<Typography variant="caption" color="text.secondary">
														{u.email || u.userId}
													</Typography>
												</Stack>
											</TableCell>
											<TableCell align="right">{u.opens}</TableCell>
											<TableCell align="right">{u.views}</TableCell>
											<TableCell align="right">{u.cta_clicks}</TableCell>
											<TableCell align="right">{u.login_continues ?? 0}</TableCell>
											<TableCell align="right">{u.downloads}</TableCell>
											<TableCell align="right">
												<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
													<Folder2 size={13} />
													<span>{u.unique_causas}</span>
												</Stack>
											</TableCell>
											<TableCell>
												<Typography variant="body2">{new Date(u.last_activity).toLocaleDateString()}</Typography>
												<Typography variant="caption" color="text.secondary">
													{new Date(u.last_activity).toLocaleTimeString()}
												</Typography>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			</TabPanel>

			{/* Tab: Eventos recientes */}
			<TabPanel value={tabValue} index={2}>
				<Box sx={{ px: 3, pb: 3 }}>
					<TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Evento</TableCell>
									<TableCell>Causa / Movimiento</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Source</TableCell>
									<TableCell>Detalle</TableCell>
									<TableCell>Fecha</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{recent.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<Typography color="text.secondary">No hay eventos</Typography>
										</TableCell>
									</TableRow>
								) : (
									recent.map((ev, i) => (
										<TableRow key={ev._id || i} hover>
											<TableCell>
												<Stack direction="row" spacing={0.5} alignItems="center">
													<Chip label={EVENT_TRANSLATIONS[ev.event] || ev.event} size="small" color={EVENT_COLOR[ev.event] || "default"} />
													{ev.botSuspected && (
														<Tooltip title="User-Agent sospechoso de bot/prefetcher">
															<Box component="span" sx={{ display: "inline-flex", color: theme.palette.warning.main }}>
																<Warning2 size={14} />
															</Box>
														</Tooltip>
													)}
												</Stack>
											</TableCell>
											<TableCell>
												<Stack>
													<Typography variant="caption" color="text.secondary">
														{ev.causaId || "—"}
													</Typography>
													{ev.movementId && (
														<Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.68rem" }}>
															{ev.movementId}
														</Typography>
													)}
												</Stack>
											</TableCell>
											<TableCell>{ev.fuero ? <Chip label={ev.fuero} size="small" variant="outlined" /> : "—"}</TableCell>
											<TableCell>
												{ev.source ? (
													<Typography variant="caption" color="text.secondary">
														{ev.source}
													</Typography>
												) : (
													"—"
												)}
											</TableCell>
											<TableCell>
												<Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
													{ev.event === "open" && (
														<Chip
															icon={<DocumentText size={11} />}
															label={ev.hasPdf ? "con PDF" : "sin PDF"}
															size="small"
															variant="outlined"
															color={ev.hasPdf ? "success" : "default"}
														/>
													)}
													{ev.reason && <Chip label={ev.reason} size="small" variant="outlined" color="warning" />}
													{ev.event === "fallback_click" && (
														<Chip icon={<ExportSquare size={11} />} label="portal PJN" size="small" variant="outlined" />
													)}
												</Stack>
											</TableCell>
											<TableCell>
												<Typography variant="body2">{new Date(ev.ts).toLocaleDateString()}</Typography>
												<Typography variant="caption" color="text.secondary">
													{new Date(ev.ts).toLocaleTimeString()}
												</Typography>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			</TabPanel>

			{/* Tab: Vista previa (recreación del visor público) */}
			<TabPanel value={tabValue} index={3}>
				<MovementViewerPreview />
			</TabPanel>
		</MainCard>
	);
};

// Barra horizontal proporcional del funnel.
interface FunnelStepProps {
	label: string;
	value: number;
	max: number;
	color: string;
	theme: any;
}
const FunnelStep: React.FC<FunnelStepProps> = ({ label, value, max, color }) => {
	const pct = max > 0 ? (value / max) * 100 : 0;
	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
				<Typography sx={{ fontSize: "0.88rem", fontWeight: 600 }}>{label}</Typography>
				<Stack direction="row" spacing={1} alignItems="baseline">
					<Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{max > 0 ? `${pct.toFixed(0)}%` : ""}</Typography>
					<Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
				</Stack>
			</Stack>
			<Box sx={{ position: "relative", height: 10, bgcolor: alpha(color, 0.08), borderRadius: 5, overflow: "hidden" }}>
				<Box
					sx={{ position: "absolute", inset: 0, width: `${pct}%`, bgcolor: color, borderRadius: 5, transition: "width 400ms ease" }}
				/>
			</Box>
		</Box>
	);
};

export default MovementLinkAnalytics;
