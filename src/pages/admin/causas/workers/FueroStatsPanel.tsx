import React from "react";
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
	Skeleton,
	Alert,
	useTheme,
	useMediaQuery,
	alpha,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { Refresh2, FolderOpen, DocumentText, Book1, Clock, InfoCircle } from "iconsax-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Legend, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { labelCortoDeFuero, paletaDeFuero } from "utils/fueros";
import { useFueroStats, formatNumber, formatCompact, formatTimeAgo } from "./useFueroStats";

// Etiquetas y colores salen del catálogo compartido. Los mapas que había acá
// tenían cuatro fueros, así que las jurisdicciones nuevas aparecían con su
// código crudo y sin color asignado.

const SummaryCard: React.FC<{
	icon: React.ReactNode;
	label: string;
	value: string;
	subtitle?: string;
	tooltip?: string;
	color: string;
	loading: boolean;
}> = ({ icon, label, value, subtitle, tooltip, color, loading }) => {
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
	const esMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { stats, loading, error, setError, fetchStats, totalSentenciasHistorico, totalSentenciasActivas, totalEscritos, universo, tot } =
		useFueroStats();

	// La composición es lo que más sorprende del corpus: la mitad de los
	// documentos son números que no existen en el portal.
	const composicion = [
		{ name: "Verificadas", value: tot.verificadas, color: theme.palette.success.main },
		{ name: "Sin verificar", value: tot.sinVerificar, color: theme.palette.warning.main },
		{ name: "Inexistentes", value: tot.inexistentes, color: theme.palette.grey[400] },
	].filter((x) => x.value > 0);

	// Un donut con los 21 fueros que tienen causas dejaba gajos de un grado y
	// una leyenda de 21 entradas metida en 32px: ilegible en desktop e inservible
	// en mobile. Son barras horizontales, como el gráfico de rendimiento de al
	// lado, y se cortan en los 8 más grandes. El resto se suma en "otros" —el
	// total sigue cerrando, y el detalle fuero por fuero está en la tabla de
	// abajo, que es donde uno va a buscar un fuero puntual.
	const PORFUERO_TOP = 8;
	const porFueroOrdenado = universo
		.filter((f) => f.validas > 0)
		.map((f) => ({ name: f.code, value: f.validas, color: theme.palette[paletaDeFuero(f.code)].main }))
		.sort((a, b) => b.value - a.value);
	const porFueroResto = porFueroOrdenado.slice(PORFUERO_TOP);
	const porFuero = [
		...porFueroOrdenado.slice(0, PORFUERO_TOP),
		...(porFueroResto.length
			? [
					{
						name: "otros",
						value: porFueroResto.reduce((a, f) => a + f.value, 0),
						color: theme.palette.grey[400],
					},
			  ]
			: []),
	];
	// Nueve barras a 190px dan 21px cada una y los labels del eje se pisan. En
	// mobile el gráfico ocupa el ancho completo y hay lugar de sobra para dar
	// aire vertical; en desktop comparte fila con otros dos y tiene que respetar
	// la altura común.
	const porFueroAlto = esMobile ? Math.max(190, porFuero.length * 26 + 30) : 190;

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
						Qué hay en el corpus y cuánto costó barrerlo
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
						label="Indexadas en Qdrant"
						value={totalSentenciasActivas !== null ? formatNumber(totalSentenciasActivas) : "-"}
						subtitle="Stock actual de vectores activos"
						tooltip="Sentencias con embeddingStatus=completed en MongoDB. Representa el corpus efectivamente disponible para búsqueda semántica en Qdrant (colección 'sentencias') ahora mismo."
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
								{porFueroResto.length > 0 && (
									<Typography component="span" variant="caption" color="text.disabled">
										{" "}
										· top {PORFUERO_TOP}
									</Typography>
								)}
							</Typography>
							<ResponsiveContainer width="100%" height={porFueroAlto}>
								<BarChart data={porFuero} layout="vertical" margin={{ left: 8, right: 32 }}>
									<XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatCompact} />
									<YAxis type="category" dataKey="name" width={44} tick={{ fontSize: 10 }} />
									<RechartsTooltip formatter={(v: number) => [formatNumber(v), "causas válidas"]} />
									<Bar dataKey="value" radius={[0, 4, 4, 0]}>
										{porFuero.map((e) => (
											<Cell key={e.name} fill={e.color} />
										))}
									</Bar>
								</BarChart>
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
		</Stack>
	);
};

export default FueroStatsPanel;
