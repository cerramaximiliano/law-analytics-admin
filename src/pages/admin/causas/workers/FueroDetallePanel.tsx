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
	LinearProgress,
	Skeleton,
	Alert,
	useTheme,
	alpha,
	Divider,
} from "@mui/material";
import { Refresh2, DocumentText, Book1, Clock } from "iconsax-react";
import { FueroStat } from "api/scrapingManager";
import { labelCortoDeFuero, paletaDeFuero } from "utils/fueros";
import { useFueroStats, formatNumber, formatTimeAgo } from "./useFueroStats";

/**
 * El reparto fuero por fuero: una barra con su porcentaje y, debajo, cuántas
 * sentencias están indexadas, cuántas procesó el worker y cuántos escritos hay.
 *
 * Salió de la pestaña Corpus, que apilaba las tarjetas de totales, tres
 * gráficos, la tabla de cobertura y estos 21 bloques en una sola página. Acá
 * la pregunta es otra —cómo se distribuye el trabajo entre fueros— y no
 * compite con la de al lado.
 */

const FueroDetallePanel = () => {
	const theme = useTheme();
	const { stats, loading, error, setError, fetchStats, fueroEntries } = useFueroStats();

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Box>
					<Typography
						variant="h4"
						sx={{ fontFamily: '"Geist Variable", "Geist", system-ui, sans-serif', letterSpacing: "-0.02em", fontWeight: 600 }}
					>
						Detalle por fuero
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
						Cómo se reparten las causas, sentencias indexadas y escritos entre los fueros
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
															Indexadas (Qdrant):
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

export default FueroDetallePanel;
