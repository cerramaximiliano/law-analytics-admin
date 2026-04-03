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
} from "@mui/material";
import { Refresh2, FolderOpen, DocumentText, Book1, Clock } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerService, FueroStats, FueroStat } from "api/scrapingManager";

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	CSS: "Seg. Social",
	CNT: "Trabajo",
	COM: "Comercial",
};

const FUERO_COLORS: Record<string, string> = {
	CIV: "primary",
	CSS: "warning",
	CNT: "error",
	COM: "success",
};

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

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string; loading: boolean }> = ({
	icon,
	label,
	value,
	color,
	loading,
}) => {
	const theme = useTheme();
	return (
		<Card variant="outlined" sx={{ borderRadius: 2 }}>
			<CardContent sx={{ pb: "16px !important" }}>
				<Stack direction="row" alignItems="center" spacing={1.5}>
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
					<Box>
						<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
							{label}
						</Typography>
						{loading ? (
							<Skeleton width={80} height={28} />
						) : (
							<Typography variant="h5" fontWeight={600}>
								{value}
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

	const fetchStats = useCallback(async (showLoading = true) => {
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
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const fueroEntries = stats ? Object.entries(stats.fueros) : [];
	const totalSentencias = fueroEntries.reduce((acc, [, s]) => acc + s.sentencias.count, 0);
	const totalEscritos = fueroEntries.reduce((acc, [, s]) => acc + s.escritos.count, 0);

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Box>
					<Typography variant="h5">Distribución por Fuero</Typography>
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
				<Grid item xs={12} sm={4}>
					<SummaryCard
						icon={<FolderOpen size={22} />}
						label="Total causas válidas"
						value={stats ? formatNumber(stats.total) : "-"}
						color={theme.palette.primary.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={4}>
					<SummaryCard
						icon={<DocumentText size={22} />}
						label="Sentencias embebidas"
						value={stats ? formatNumber(totalSentencias) : "-"}
						color={theme.palette.success.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={12} sm={4}>
					<SummaryCard
						icon={<Book1 size={22} />}
						label="Escritos embebidos"
						value={stats ? formatNumber(totalEscritos) : "-"}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

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
									const colorKey = FUERO_COLORS[fuero] || "primary";
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
														{FUERO_LABELS[fuero] || fuero}
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
												<Grid item xs={6}>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<DocumentText size={14} color={theme.palette.success.main} />
														<Typography variant="caption" color="text.secondary">
															Sentencias:
														</Typography>
														<Typography variant="caption" fontWeight={600}>
															{formatNumber(data.sentencias.count)}
														</Typography>
														{stats && data.causas.count > 0 && (
															<Typography variant="caption" color="text.secondary">
																({((data.sentencias.count / data.causas.count) * 100).toFixed(1)}% cobertura)
															</Typography>
														)}
													</Stack>
												</Grid>
												<Grid item xs={6}>
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
																({((data.escritos.count / data.causas.count) * 100).toFixed(1)}% cobertura)
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
