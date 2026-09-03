import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Grid,
	Card,
	CardContent,
	Chip,
	IconButton,
	Tooltip,
	LinearProgress,
	Skeleton,
	Alert,
	useTheme,
	alpha,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { Refresh2, FolderOpen, DocumentText, Book1, Clock, InfoCircle } from "iconsax-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { useSnackbar } from "notistack";
import { ScrapingManagerService, FueroStats, FueroStat } from "api/scrapingManager";
import { labelCortoDeFuero, paletaDeFuero } from "utils/fueros";

// Etiquetas y colores salen del catálogo compartido. Los mapas que había acá
// tenían cuatro fueros, así que las jurisdicciones nuevas aparecían con su
// código crudo y sin color asignado.

function formatNumber(n: number): string {
	return n.toLocaleString("es-AR");
}

function formatTimeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	if (diff < 60000) return "Hace segundos";
	if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
	if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} h`;
	return `Hace ${Math.floor(diff / 86400000)} d`;
}

const SummaryCard: React.FC<{
	icon: React.ReactNode;
	label: string;
	value: string;
	subtitle?: string;
	tooltip?: string;
	color: string;
	loading: boolean;
}> = ({ icon, label, value, subtitle, tooltip, color, loading }) => {
	const theme = useTheme();
	return (
		<Card variant="outlined" sx={{ borderRadius: 2 }}>
			<CardContent sx={{ pb: "16px !important" }}>
				<Stack direction="row" alignItems="flex-start" spacing={1.5}>
					<Box
						sx={{
							width: 44,
							height: 44,
							borderRadius: 2,
							bgcolor: alpha(color, 0.1),
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
							color,
						}}
					>
						{icon}
					</Box>
					<Box flex={1}>
						<Stack direction="row" alignItems="center" spacing={0.5}>
							<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
								{label}
							</Typography>
							{tooltip && (
								<Tooltip title={tooltip} placement="top">
									<Box sx={{ display: "flex", alignItems: "center", color: "text.disabled", cursor: "help" }}>
										<InfoCircle size={13} />
									</Box>
								</Tooltip>
							)}
						</Stack>
						{loading ? (
							<Skeleton width={80} height={28} />
						) : (
							<Typography variant="h4" fontWeight={600} sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
								{value}
							</Typography>
						)}
						{subtitle && !loading && (
							<Typography variant="caption" color="text.secondary">
								{subtitle}
							</Typography>
						)}
					</Box>
				</Stack>
			</CardContent>
		</Card>
	);
};

const FueroStatsPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<FueroStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = useCallback(
		async (showLoading = true) => {
			if (showLoading) setLoading(true);
			setError(null);
			try {
				const res = await ScrapingManagerService.getFueroStats();
				if (res.success) {
					setStats(res.data);
				}
			} catch (err: any) {
				const msg = err.response?.data?.message || "Error al cargar estadísticas por fuero";
				setError(msg);
				if (showLoading) {
					enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
				}
			} finally {
				if (showLoading) setLoading(false);
			}
		},
		[enqueueSnackbar],
	);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const fueroEntries = stats ? Object.entries(stats.fueros) : [];
	const totalSentenciasHistorico = fueroEntries.reduce((acc, [, s]) => acc + s.sentencias.count, 0);
	const totalSentenciasActivas = stats?.sentenciasActivas?.total ?? null;
	const totalEscritos = fueroEntries.reduce((acc, [, s]) => acc + s.escritos.count, 0);

	// Universo por fuero. Solo los que tienen documentos: los fueros cableados
	// pero nunca barridos aportarían filas en cero que no dicen nada.
	const universo = fueroEntries
		.map(([code, s]) => ({
			code,
			docs: s.causas.docs ?? 0,
			validas: s.causas.count ?? 0,
			verificadas: s.causas.verificadas ?? 0,
			sinVerificar: s.causas.sinVerificar ?? 0,
			inexistentes: s.causas.inexistentes ?? 0,
			rendimiento: s.causas.rendimiento ?? 0,
		}))
		.filter((f) => f.docs > 0)
		.sort((a, b) => b.docs - a.docs);

	const tot = universo.reduce(
		(a, f) => ({
			docs: a.docs + f.docs,
			validas: a.validas + f.validas,
			verificadas: a.verificadas + f.verificadas,
			sinVerificar: a.sinVerificar + f.sinVerificar,
			inexistentes: a.inexistentes + f.inexistentes,
		}),
		{ docs: 0, validas: 0, verificadas: 0, sinVerificar: 0, inexistentes: 0 },
	);

	// La composición es lo que más sorprende del corpus: la mitad de los
	// documentos son números que no existen en el portal.
	const composicion = [
		{ name: "Verificadas", value: tot.verificadas, color: theme.palette.success.main },
		{ name: "Sin verificar", value: tot.sinVerificar, color: theme.palette.warning.main },
		{ name: "Inexistentes", value: tot.inexistentes, color: theme.palette.grey[400] },
	].filter((x) => x.value > 0);

	const porFuero = universo
		.filter((f) => f.validas > 0)
		.map((f) => ({ name: f.code, value: f.validas, color: theme.palette[paletaDeFuero(f.code)].main }));

	const rendimiento = universo
		.filter((f) => f.docs > 500)
		.map((f) => ({ name: f.code, value: f.rendimiento, color: theme.palette[paletaDeFuero(f.code)].main }));

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Box>
					<Typography
						variant="h4"
						sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
					>
						Distribución por fuero
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
						Causas válidas, sentencias y escritos procesados por fuero judicial
					</Typography>
				</Box>
				<Stack direction="row" alignItems="center" spacing={1}>
					{stats?.updatedAt && (
						<Chip
							icon={<Clock size={14} />}
							label={formatTimeAgo(stats.updatedAt)}
							size="small"
							variant="outlined"
							sx={{ fontSize: "0.7rem" }}
						/>
					)}
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={() => fetchStats()} disabled={loading}>
							<Refresh2 size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Box>

			{error && !stats && (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{/* Summary cards */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={3}>
					<SummaryCard
						icon={<FolderOpen size={22} />}
						label="Causas válidas"
						value={stats ? formatNumber(stats.total) : "-"}
						color={theme.palette.primary.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={3}>
					<SummaryCard
						icon={<DocumentText size={22} />}
						label="Indexadas en Pinecone"
						value={totalSentenciasActivas !== null ? formatNumber(totalSentenciasActivas) : "-"}
						subtitle="Stock actual de vectores activos"
						tooltip="Sentencias con embeddingStatus=completed en MongoDB. Representa el corpus efectivamente disponible para búsqueda semántica en Pinecone ahora mismo."
						color={theme.palette.success.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={3}>
					<SummaryCard
						icon={<DocumentText size={22} />}
						label="Procesadas por worker"
						value={stats ? formatNumber(totalSentenciasHistorico) : "-"}
						subtitle="Contador histórico acumulativo"
						tooltip="Total de operaciones de embedding ejecutadas por el worker a lo largo del tiempo. Puede superar al stock actual porque cuenta cada procesamiento, incluyendo re-indexaciones del corpus completo."
						color={theme.palette.warning.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={3}>
					<SummaryCard
						icon={<Book1 size={22} />}
						label="Escritos embebidos"
						value={stats ? formatNumber(totalEscritos) : "-"}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

			{/* ── Universo del corpus ─────────────────────────────────────────── */}
			<Card variant="outlined" sx={{ borderRadius: 2 }}>
				<CardContent>
					<Stack direction="row" alignItems="baseline" spacing={1} mb={0.5}>
						<Typography variant="subtitle1" fontWeight={600}>
							Universo de documentos
						</Typography>
						<Tooltip
							title="El scraper deja un documento por cada número que intenta, exista o no el expediente. Por eso el total de documentos casi duplica al de causas: la mitad son huecos, y son los que permiten medir cobertura."
							arrow
						>
							<InfoCircle size={15} style={{ opacity: 0.5 }} />
						</Tooltip>
					</Stack>

					<Grid container spacing={3} alignItems="center">
						{/* Composición: qué proporción de lo barrido resultó ser un expediente */}
						<Grid item xs={12} md={4}>
							<Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
								Composición de lo barrido
							</Typography>
							<ResponsiveContainer width="100%" height={190}>
								<PieChart>
									<Pie
										data={composicion}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										innerRadius={45}
										outerRadius={72}
										paddingAngle={2}
									>
										{composicion.map((e) => (
											<Cell key={e.name} fill={e.color} />
										))}
									</Pie>
									<RechartsTooltip formatter={(v: number, n: string) => [formatNumber(v), n]} />
									<Legend verticalAlign="bottom" height={32} iconSize={9} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
								</PieChart>
							</ResponsiveContainer>
						</Grid>

						{/* Reparto de las causas válidas entre fueros */}
						<Grid item xs={12} md={4}>
							<Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
								Causas válidas por fuero
							</Typography>
							<ResponsiveContainer width="100%" height={190}>
								<PieChart>
									<Pie data={porFuero} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
										{porFuero.map((e) => (
											<Cell key={e.name} fill={e.color} />
										))}
									</Pie>
									<RechartsTooltip formatter={(v: number, n: string) => [formatNumber(v), n]} />
									<Legend verticalAlign="bottom" height={32} iconSize={9} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
								</PieChart>
							</ResponsiveContainer>
						</Grid>

						{/* Rendimiento: cuántos intentos cuesta encontrar un expediente */}
						<Grid item xs={12} md={4}>
							<Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
								Rendimiento por fuero
							</Typography>
							<Tooltip
								title="Porcentaje de números intentados que resultaron ser un expediente real. Cuanto más alto, menos búsquedas cuesta cada causa."
								arrow
							>
								<Box>
									<ResponsiveContainer width="100%" height={190}>
										<BarChart data={rendimiento} layout="vertical" margin={{ left: 8, right: 24 }}>
											<XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
											<YAxis type="category" dataKey="name" width={44} tick={{ fontSize: 10 }} />
											<RechartsTooltip formatter={(v: number) => [`${v}%`, "rendimiento"]} />
											<Bar dataKey="value" radius={[0, 4, 4, 0]}>
												{rendimiento.map((e) => (
													<Cell key={e.name} fill={e.color} />
												))}
											</Bar>
										</BarChart>
									</ResponsiveContainer>
								</Box>
							</Tooltip>
						</Grid>
					</Grid>

					{/* Tabla detallada */}
					<TableContainer sx={{ mt: 2 }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fuero</TableCell>
									<TableCell align="right">Documentos</TableCell>
									<TableCell align="right">Válidas</TableCell>
									<TableCell align="right">Inexistentes</TableCell>
									<TableCell align="right">Rendimiento</TableCell>
									<TableCell align="right">Verificadas</TableCell>
									<TableCell align="right">Sin verificar</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{universo.map((f) => (
									<TableRow key={f.code} hover>
										<TableCell>
											<Typography variant="body2" fontWeight={600} component="span">
												{f.code}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
												{labelCortoDeFuero(f.code)}
											</Typography>
										</TableCell>
										<TableCell align="right">{formatNumber(f.docs)}</TableCell>
										<TableCell align="right">{formatNumber(f.validas)}</TableCell>
										<TableCell align="right">
											<Typography variant="body2" color="text.secondary">
												{formatNumber(f.inexistentes)}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Chip
												size="small"
												label={`${f.rendimiento}%`}
												color={f.rendimiento >= 70 ? "success" : f.rendimiento >= 45 ? "warning" : "default"}
												variant="outlined"
											/>
										</TableCell>
										<TableCell align="right">{formatNumber(f.verificadas)}</TableCell>
										<TableCell align="right">
											<Typography variant="body2" color={f.sinVerificar > 0 ? "warning.main" : "text.disabled"}>
												{f.sinVerificar > 0 ? formatNumber(f.sinVerificar) : "—"}
											</Typography>
										</TableCell>
									</TableRow>
								))}
								<TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid", borderColor: "divider" } }}>
									<TableCell>TOTAL</TableCell>
									<TableCell align="right">{formatNumber(tot.docs)}</TableCell>
									<TableCell align="right">{formatNumber(tot.validas)}</TableCell>
									<TableCell align="right">{formatNumber(tot.inexistentes)}</TableCell>
									<TableCell align="right">{tot.docs ? `${Math.round((tot.validas / tot.docs) * 1000) / 10}%` : "—"}</TableCell>
									<TableCell align="right">{formatNumber(tot.verificadas)}</TableCell>
									<TableCell align="right">{formatNumber(tot.sinVerificar)}</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>

			{/* Per-fuero breakdown */}
			<Card variant="outlined" sx={{ borderRadius: 2 }}>
				<CardContent>
					<Typography variant="subtitle1" fontWeight={600} gutterBottom>
						Detalle por fuero
					</Typography>
					<Divider sx={{ mb: 2 }} />

					<Stack spacing={3}>
						{loading
							? [1, 2, 3, 4].map((i) => (
									<Box key={i}>
										<Skeleton width={120} height={20} sx={{ mb: 1 }} />
										<Skeleton height={10} sx={{ borderRadius: 1 }} />
									</Box>
							  ))
							: fueroEntries.map(([fuero, data]: [string, FueroStat]) => {
									const colorKey = paletaDeFuero(fuero);
									const colorValue =
										colorKey === "primary"
											? theme.palette.primary.main
											: colorKey === "warning"
											? theme.palette.warning.main
											: colorKey === "error"
											? theme.palette.error.main
											: theme.palette.success.main;

									return (
										<Box key={fuero}>
											<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
												<Stack direction="row" spacing={1} alignItems="center">
													<Chip
														label={fuero}
														size="small"
														sx={{
															bgcolor: alpha(colorValue, 0.1),
															color: colorValue,
															fontWeight: 600,
															fontSize: "0.7rem",
															height: 22,
														}}
													/>
													<Typography variant="body2" color="text.secondary">
														{labelCortoDeFuero(fuero)}
													</Typography>
												</Stack>
												<Typography variant="body2" fontWeight={500}>
													{formatNumber(data.causas.count)} causas ({data.causas.pct}%)
												</Typography>
											</Stack>

											<LinearProgress
												variant="determinate"
												value={data.causas.pct}
												sx={{
													height: 8,
													borderRadius: 4,
													bgcolor: alpha(colorValue, 0.1),
													"& .MuiLinearProgress-bar": { bgcolor: colorValue, borderRadius: 4 },
													mb: 1.5,
												}}
											/>

											<Grid container spacing={2}>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<DocumentText size={14} color={theme.palette.success.main} />
														<Typography variant="caption" color="text.secondary">
															Indexadas (Pinecone):
														</Typography>
														<Typography variant="caption" fontWeight={600} color={theme.palette.success.main}>
															{formatNumber(stats?.sentenciasActivas?.byFuero?.[fuero] ?? 0)}
														</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<DocumentText size={14} color={theme.palette.warning.main} />
														<Typography variant="caption" color="text.secondary">
															Worker (histórico):
														</Typography>
														<Typography variant="caption" fontWeight={600} color={theme.palette.warning.main}>
															{formatNumber(data.sentencias.count)}
														</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<Book1 size={14} color={theme.palette.info.main} />
														<Typography variant="caption" color="text.secondary">
															Escritos:
														</Typography>
														<Typography variant="caption" fontWeight={600}>
															{formatNumber(data.escritos.count)}
														</Typography>
														{stats && data.causas.count > 0 && (
															<Typography variant="caption" color="text.secondary">
																({((data.escritos.count / data.causas.count) * 100).toFixed(1)}%)
															</Typography>
														)}
													</Stack>
												</Grid>
											</Grid>
										</Box>
									);
							  })}
					</Stack>
				</CardContent>
			</Card>
		</Stack>
	);
};

export default FueroStatsPanel;
