import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
	Box,
	Typography,
	Stack,
	Chip,
	IconButton,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Tooltip,
	Grid,
	Card,
	CardContent,
	useTheme,
	alpha,
	LinearProgress,
	Button,
	Switch,
	FormControlLabel,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Divider,
} from "@mui/material";
import {
	Refresh2,
	Warning2,
	TickCircle,
	Activity,
	Code1,
	InfoCircle,
	CloseCircle,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";
import {
	HtmlDriftService,
	HtmlDriftIncident,
	HtmlDriftListSummary,
	FingerprintStats,
} from "api/htmlDrift";

const REFRESH_INTERVAL_MS = 30_000;

const PERIOD_OPTIONS = [
	{ value: 1, label: "Últimas 24h" },
	{ value: 7, label: "Últimos 7 días" },
	{ value: 30, label: "Últimos 30 días" },
];

const RESOLVED_OPTIONS: Array<{ value: "all" | "open" | "closed"; label: string }> = [
	{ value: "all", label: "Todos" },
	{ value: "open", label: "Abiertos" },
	{ value: "closed", label: "Resueltos" },
];

function formatDateTime(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("es-AR", {
		timeZone: "America/Argentina/Buenos_Aires",
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

function formatDuration(ms: number | null): string {
	if (ms === null || ms === undefined || ms < 0) return "—";
	const min = Math.floor(ms / 60000);
	if (min < 1) return `${Math.round(ms / 1000)} s`;
	if (min < 60) return `${min} min`;
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h < 24) return `${h}h ${m}min`;
	const d = Math.floor(h / 24);
	const hr = h % 24;
	return `${d}d ${hr}h`;
}

function relativeFrom(iso: string | null): string {
	if (!iso) return "—";
	const ms = Date.now() - new Date(iso).getTime();
	if (ms < 0) return "ahora";
	const min = Math.floor(ms / 60000);
	if (min < 1) return "hace unos seg";
	if (min < 60) return `hace ${min} min`;
	const h = Math.floor(min / 60);
	if (h < 24) return `hace ${h}h`;
	const d = Math.floor(h / 24);
	return `hace ${d}d`;
}

function severityColor(severity: string) {
	if (severity === "critical") return "error";
	if (severity === "warn") return "warning";
	return "default";
}

function typeIcon(type: string) {
	if (type.startsWith("missing")) return Warning2;
	if (type.includes("state")) return Warning2;
	if (type.includes("fingerprint")) return Activity;
	if (type.includes("shape")) return Code1;
	return InfoCircle;
}

const PjnHtmlDriftPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [loading, setLoading] = useState(false);
	const [incidents, setIncidents] = useState<HtmlDriftIncident[]>([]);
	const [summary, setSummary] = useState<HtmlDriftListSummary | null>(null);
	const [stats, setStats] = useState<FingerprintStats | null>(null);

	const [sinceDays, setSinceDays] = useState<number>(7);
	const [resolvedFilter, setResolvedFilter] = useState<"all" | "open" | "closed">("all");
	const [typeFilter, setTypeFilter] = useState<string>("");
	const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

	// Dialog para cerrar manualmente.
	const [closeDialog, setCloseDialog] = useState<{ open: boolean; incident?: HtmlDriftIncident; notes: string }>({
		open: false,
		notes: "",
	});

	const fetchAll = useCallback(async () => {
		try {
			setLoading(true);
			const params: any = { sinceDays, limit: 100 };
			if (resolvedFilter === "open") params.resolved = false;
			if (resolvedFilter === "closed") params.resolved = true;
			if (typeFilter) params.type = typeFilter;

			const [listRes, statsRes] = await Promise.all([
				HtmlDriftService.listIncidents(params),
				HtmlDriftService.getFingerprintStats(sinceDays),
			]);

			setIncidents(listRes.data || []);
			setSummary(listRes.summary || null);
			setStats(statsRes.data || null);
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error obteniendo datos de drift", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [sinceDays, resolvedFilter, typeFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	useEffect(() => {
		if (!autoRefresh) return undefined;
		const id = setInterval(fetchAll, REFRESH_INTERVAL_MS);
		return () => clearInterval(id);
	}, [autoRefresh, fetchAll]);

	const handleCloseIncident = async () => {
		const inc = closeDialog.incident;
		if (!inc) return;
		try {
			await HtmlDriftService.closeIncident(inc._id, closeDialog.notes || undefined);
			enqueueSnackbar(`Drift "${inc.signature}" cerrado`, { variant: "success" });
			setCloseDialog({ open: false, notes: "" });
			fetchAll();
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error cerrando drift", { variant: "error" });
		}
	};

	// Derivados para los stat cards.
	const openCount = summary?.openCount ?? 0;
	const openCritical = summary?.openCritical ?? 0;
	const totalInWindow = useMemo(
		() => (summary?.byType || []).reduce((acc, t) => acc + t.total, 0),
		[summary],
	);
	const avgSpans = stats?.avgTotalSpans ?? 0;

	const driftTypes = useMemo(() => {
		const set = new Set<string>();
		(summary?.byType || []).forEach((t) => set.add(t._id));
		return Array.from(set).sort();
	}, [summary]);

	return (
		<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
			<CardContent>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center">
						<Code1 size={20} color={theme.palette.primary.main} />
						<Typography variant="h5" sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}>
							HTML structure drift
						</Typography>
						<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
							Monitor de cambios estructurales del portal PJN
						</Typography>
					</Stack>
					<Stack direction="row" spacing={1} alignItems="center">
						<FormControlLabel
							control={
								<Switch
									size="small"
									checked={autoRefresh}
									onChange={(e) => setAutoRefresh(e.target.checked)}
								/>
							}
							label={<Typography variant="caption">Auto 30s</Typography>}
						/>
						<Tooltip title="Recargar">
							<IconButton size="small" onClick={fetchAll} disabled={loading}>
								<Refresh2 size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{/* Stat Cards */}
				<Grid container spacing={2} sx={{ mb: 2 }}>
					<Grid item xs={6} sm={3}>
						<Paper
							variant="outlined"
							sx={{
								p: 1.5,
								backgroundColor: openCritical > 0 ? alpha(theme.palette.error.main, 0.08) : undefined,
								borderColor: openCritical > 0 ? theme.palette.error.main : undefined,
							}}
						>
							<Typography variant="caption" color="text.secondary">
								Drifts abiertos
							</Typography>
							<Typography
								variant="h4"
								color={openCritical > 0 ? "error" : "text.primary"}
								sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}
							>
								{openCount}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{openCritical} críticos
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Paper variant="outlined" sx={{ p: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Eventos en ventana
							</Typography>
							<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}>
								{totalInWindow}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Últimos {sinceDays}d
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Paper variant="outlined" sx={{ p: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Últ. evento
							</Typography>
							<Typography variant="h6" sx={{ fontWeight: 600 }}>
								{relativeFrom(summary?.lastEventAt ?? null)}
							</Typography>
							<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>
								{summary?.lastEventType || "—"}
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Paper variant="outlined" sx={{ p: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Avg spans (HTML)
							</Typography>
							<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontWeight: 600 }}>
								{avgSpans ? avgSpans.toFixed(0) : "—"}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{stats?.total ?? 0} fingerprints
							</Typography>
						</Paper>
					</Grid>
				</Grid>

				{/* Filtros */}
				<Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Período</InputLabel>
						<Select
							value={sinceDays}
							label="Período"
							onChange={(e) => setSinceDays(Number(e.target.value))}
						>
							{PERIOD_OPTIONS.map((o) => (
								<MenuItem key={o.value} value={o.value}>
									{o.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Estado</InputLabel>
						<Select
							value={resolvedFilter}
							label="Estado"
							onChange={(e) => setResolvedFilter(e.target.value as any)}
						>
							{RESOLVED_OPTIONS.map((o) => (
								<MenuItem key={o.value} value={o.value}>
									{o.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<InputLabel>Tipo</InputLabel>
						<Select value={typeFilter} label="Tipo" onChange={(e) => setTypeFilter(e.target.value)}>
							<MenuItem value="">Todos</MenuItem>
							{driftTypes.map((t) => (
								<MenuItem key={t} value={t}>
									{t}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Stack>

				{loading && (
					<Box sx={{ mb: 2 }}>
						<LinearProgress />
					</Box>
				)}

				{/* Lista de incidentes */}
				<Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
					Incidentes de drift
				</Typography>
				{incidents.length === 0 ? (
					<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
						<TickCircle size={32} color={theme.palette.success.main} />
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							No hay drifts en la ventana seleccionada
						</Typography>
					</Paper>
				) : (
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Tipo</TableCell>
									<TableCell>Firma</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="right">Hits</TableCell>
									<TableCell>Abrió</TableCell>
									<TableCell>Duración</TableCell>
									<TableCell>Detectó</TableCell>
									<TableCell>Muestra</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{incidents.map((inc) => {
									const Icon = typeIcon(inc.type);
									const isOpen = !inc.endedAt;
									const sample = inc.sample || {};
									return (
										<TableRow key={inc._id} hover>
											<TableCell>
												<Stack direction="row" spacing={0.5} alignItems="center">
													<Icon
														size={14}
														color={
															inc.severity === "critical"
																? theme.palette.error.main
																: theme.palette.warning.main
														}
													/>
													<Typography variant="caption" sx={{ fontWeight: 600 }}>
														{inc.type}
													</Typography>
												</Stack>
											</TableCell>
											<TableCell>
												<Tooltip title={inc.signature}>
													<Typography
														variant="caption"
														sx={{
															fontFamily: "monospace",
															display: "block",
															maxWidth: 220,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{inc.signature}
													</Typography>
												</Tooltip>
											</TableCell>
											<TableCell align="center">
												{isOpen ? (
													<Chip
														label="Abierto"
														size="small"
														color={severityColor(inc.severity) as any}
														icon={<Warning2 size={12} />}
													/>
												) : (
													<Chip
														label="Resuelto"
														size="small"
														color="success"
														variant="outlined"
														icon={<TickCircle size={12} />}
													/>
												)}
											</TableCell>
											<TableCell align="right">
												<Typography variant="caption" sx={{ fontWeight: 600 }}>
													{inc.detectionCount}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption" sx={{ display: "block" }}>
													{formatDateTime(inc.startedAt)}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{relativeFrom(inc.startedAt)}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{isOpen
														? formatDuration(Date.now() - new Date(inc.startedAt).getTime())
														: formatDuration(inc.durationMs)}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
													{inc.detectedBy || "—"}
												</Typography>
											</TableCell>
											<TableCell>
												<Tooltip
													title={
														<Box>
															{sample.caratula && <div>caratula: "{sample.caratula}"</div>}
															{sample.dependencia && <div>dependencia: "{sample.dependencia}"</div>}
															{sample.situacion && <div>situación: "{sample.situacion}"</div>}
															{sample.causaRef && <div>causa: {sample.causaRef}</div>}
															{sample.idsPresentes && sample.idsPresentes.length > 0 && (
																<div>ids: {sample.idsPresentes.join(", ")}</div>
															)}
														</Box>
													}
												>
													<Typography
														variant="caption"
														sx={{
															display: "block",
															maxWidth: 180,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
															color: "text.secondary",
														}}
													>
														{sample.caratula
															? `"${sample.caratula}"`
															: sample.causaRef || "—"}
													</Typography>
												</Tooltip>
											</TableCell>
											<TableCell align="center">
												{isOpen && (
													<Tooltip title="Cerrar manualmente">
														<IconButton
															size="small"
															onClick={() =>
																setCloseDialog({
																	open: true,
																	incident: inc,
																	notes: "",
																})
															}
														>
															<CloseCircle size={16} />
														</IconButton>
													</Tooltip>
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				)}

				{/* Tendencia + Selectores */}
				<Grid container spacing={2} sx={{ mt: 2 }}>
					<Grid item xs={12} md={7}>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Tendencia avg totalSpans
							</Typography>
							{!stats || stats.timeseries.length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Sin datos suficientes
								</Typography>
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<LineChart data={stats.timeseries}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" tick={{ fontSize: 11 }} />
										<YAxis
											tick={{ fontSize: 11 }}
											domain={[
												(dataMin: number) => Math.floor(dataMin * 0.95),
												(dataMax: number) => Math.ceil(dataMax * 1.05),
											]}
										/>
										<RechartsTooltip
											formatter={(value: number) => value.toFixed(1)}
											labelStyle={{ fontSize: 12 }}
										/>
										<Line
											type="monotone"
											dataKey="avgTotalSpans"
											stroke={theme.palette.primary.main}
											strokeWidth={2}
											dot={{ r: 3 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							)}
						</Paper>
					</Grid>
					<Grid item xs={12} md={5}>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Selectores presentes (%)
							</Typography>
							{!stats || stats.selectorFrequencies.length === 0 ? (
								<Typography variant="caption" color="text.secondary">
									Sin fingerprints
								</Typography>
							) : (
								<Stack spacing={1}>
									{stats.selectorFrequencies.slice(0, 8).map((s) => {
										const pct = Math.round(s.pct * 100);
										const isFlaky = pct < 95 && pct > 5;
										return (
											<Box key={s.id}>
												<Stack direction="row" justifyContent="space-between">
													<Typography
														variant="caption"
														sx={{ fontFamily: "monospace", fontWeight: isFlaky ? 600 : 400 }}
													>
														{s.id}
													</Typography>
													<Typography
														variant="caption"
														color={isFlaky ? "warning.main" : "text.secondary"}
													>
														{pct}%
													</Typography>
												</Stack>
												<LinearProgress
													variant="determinate"
													value={pct}
													color={isFlaky ? "warning" : pct >= 95 ? "success" : "error"}
													sx={{ height: 4, borderRadius: 1 }}
												/>
											</Box>
										);
									})}
								</Stack>
							)}
						</Paper>
					</Grid>
				</Grid>

				{/* Por fuero */}
				{stats && stats.byFuero && stats.byFuero.length > 0 && (
					<Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Fingerprints por fuero
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							{stats.byFuero.map((f) => (
								<Box key={f._id || "unknown"}>
									<Typography variant="caption" color="text.secondary">
										{f._id || "(sin fuero)"}
									</Typography>
									<Typography variant="body2">
										{f.count} muestras · avg {f.avgTotalSpans.toFixed(0)} spans
									</Typography>
								</Box>
							))}
						</Stack>
					</Paper>
				)}

				{/* Dialog cerrar manual */}
				<Dialog
					open={closeDialog.open}
					onClose={() => setCloseDialog({ open: false, notes: "" })}
					maxWidth="sm"
					fullWidth
				>
					<DialogTitle>Cerrar drift manualmente</DialogTitle>
					<DialogContent>
						<Typography variant="body2" sx={{ mb: 2 }}>
							{closeDialog.incident?.type} · {closeDialog.incident?.signature}
						</Typography>
						<Divider sx={{ mb: 2 }} />
						<TextField
							label="Notas (opcional)"
							placeholder="Por qué cerrás este drift? ej: 'falso positivo, caratula corta es válida en CCC'"
							fullWidth
							multiline
							minRows={2}
							value={closeDialog.notes}
							onChange={(e) =>
								setCloseDialog((s) => ({ ...s, notes: e.target.value }))
							}
						/>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setCloseDialog({ open: false, notes: "" })}>Cancelar</Button>
						<Button onClick={handleCloseIncident} variant="contained" color="error">
							Cerrar drift
						</Button>
					</DialogActions>
				</Dialog>
			</CardContent>
		</Card>
	);
};

export default PjnHtmlDriftPanel;
