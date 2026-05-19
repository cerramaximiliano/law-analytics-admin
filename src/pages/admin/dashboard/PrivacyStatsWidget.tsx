import React, { useEffect, useState, useCallback } from "react";
import { Box, Typography, Paper, Grid, Skeleton, Chip, useTheme, alpha, Tooltip, IconButton, Stack, Divider, Theme } from "@mui/material";
import { Refresh, Lock1, LockSlash, Calendar1 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import { CausasPjnService, PrivacyStatsResponse } from "api/causasPjn";

interface PrivacyStatsWidgetProps {
	/** Modo compacto para incrustar como header de la tabla (sin Paper wrapper, sin recent list). */
	compact?: boolean;
	onRefresh?: () => void;
}

const getColors = (theme: Theme) => ({
	private: { main: theme.palette.error.main, lighter: alpha(theme.palette.error.light, 0.15) },
	change24h: { main: theme.palette.warning.main, lighter: alpha(theme.palette.warning.light, 0.15) },
	change7d: { main: theme.palette.info.main, lighter: alpha(theme.palette.info.light, 0.15) },
	neutral: { main: theme.palette.text.secondary, lighter: alpha(theme.palette.grey[400], 0.15) },
});

const formatDateTime = (iso?: string | null): string => {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString("es-AR", {
			day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
			timeZone: "America/Argentina/Buenos_Aires",
		});
	} catch {
		return "—";
	}
};

const PrivacyStatsWidget: React.FC<PrivacyStatsWidgetProps> = ({ compact = false, onRefresh }) => {
	const theme = useTheme();
	const COLORS = getColors(theme);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<PrivacyStatsResponse["data"] | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await CausasPjnService.getPrivacyStats();
			if (response.success) setStats(response.data);
		} catch (err: any) {
			setError(err?.message || "Error al cargar privacy stats");
		} finally {
			setLoading(false);
			if (onRefresh) onRefresh();
		}
	}, [onRefresh]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const wrapper = (children: React.ReactNode) =>
		compact ? (
			<Box>{children}</Box>
		) : (
			<Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				{children}
			</Paper>
		);

	if (loading && !stats) {
		return wrapper(
			<>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
					<Lock1 size={20} style={{ color: COLORS.private.main }} />
					<Typography variant="subtitle1" fontWeight="bold">
						Causas Privadas PJN
					</Typography>
				</Box>
				<Skeleton variant="rectangular" width="100%" height={compact ? 80 : 200} sx={{ borderRadius: 1 }} />
			</>,
		);
	}

	if (error) {
		return wrapper(<Typography color="error">{error}</Typography>);
	}

	if (!stats) return null;

	const verifiedAppLink = "/admin/causas/verified-app?isPrivate=true";

	return wrapper(
		<>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Lock1 size={20} style={{ color: COLORS.private.main }} />
					<Typography variant={compact ? "subtitle2" : "subtitle1"} fontWeight="bold">
						Causas Privadas PJN
					</Typography>
				</Box>
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={fetchStats} disabled={loading}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Box>

			{/* Métricas principales */}
			<Grid container spacing={compact ? 1 : 2} sx={{ mb: compact ? 1 : 2 }}>
				<Grid item xs={4}>
					<Box
						component={RouterLink}
						to={verifiedAppLink}
						sx={{
							display: "block",
							textAlign: "center",
							p: compact ? 1 : 1.5,
							bgcolor: COLORS.private.lighter,
							borderRadius: 2,
							textDecoration: "none",
							color: "inherit",
							transition: "transform 0.15s",
							"&:hover": { transform: "translateY(-2px)", bgcolor: alpha(theme.palette.error.light, 0.25) },
						}}
					>
						<Typography variant={compact ? "h5" : "h4"} fontWeight="bold" color={COLORS.private.main}>
							{stats.total}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							🔒 Total privadas
						</Typography>
					</Box>
				</Grid>
				<Grid item xs={4}>
					<Box sx={{ textAlign: "center", p: compact ? 1 : 1.5, bgcolor: COLORS.change24h.lighter, borderRadius: 2 }}>
						<Typography variant={compact ? "h5" : "h4"} fontWeight="bold" color={COLORS.change24h.main}>
							{stats.changes.last24h}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							⏱️ Últimas 24h
						</Typography>
					</Box>
				</Grid>
				<Grid item xs={4}>
					<Box sx={{ textAlign: "center", p: compact ? 1 : 1.5, bgcolor: COLORS.change7d.lighter, borderRadius: 2 }}>
						<Typography variant={compact ? "h5" : "h4"} fontWeight="bold" color={COLORS.change7d.main}>
							{stats.changes.last7d}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							📅 Últimos 7 días
						</Typography>
					</Box>
				</Grid>
			</Grid>

			{!compact && (
				<>
					<Divider sx={{ my: 2 }} />

					{/* Estado del checker */}
					{stats.checker && (
						<Box sx={{ mb: 2 }}>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
								Privacy-checker worker
							</Typography>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
								<Chip
									size="small"
									label={stats.checker.enabled ? "habilitado" : "deshabilitado"}
									color={stats.checker.enabled ? "success" : "default"}
								/>
								<Chip size="small" variant="outlined" label={`threshold: ${stats.checker.threshold}`} />
								<Chip
									size="small"
									variant="outlined"
									icon={<Calendar1 size={12} />}
									label={`última corrida: ${formatDateTime(stats.checker.lastRun)}`}
								/>
								{stats.checker.allTimeStats && (
									<Chip
										size="small"
										variant="outlined"
										icon={<LockSlash size={12} />}
										label={`all-time: ${stats.checker.allTimeStats.causas_marked_private ?? 0} marcadas / ${stats.checker.allTimeStats.causas_reset_public ?? 0} restauradas`}
									/>
								)}
							</Stack>
						</Box>
					)}

					{/* Últimas marcadas */}
					{stats.recent.length > 0 && (
						<Box>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Últimas marcadas como privadas
							</Typography>
							<Stack spacing={0.5}>
								{stats.recent.slice(0, 5).map((c) => {
									const exp = c.year ? `${c.number}/${c.year}` : `${c.number ?? "—"}`;
									const fuero = c.fuero || c.causaType || "—";
									return (
										<Box key={c._id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{exp}
											</Typography>
											<Typography variant="caption" color="text.secondary" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
												{fuero} · {c.caratula ? c.caratula.slice(0, 60) : "—"}
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{formatDateTime(c.privateDetectedAt)}
											</Typography>
										</Box>
									);
								})}
							</Stack>
						</Box>
					)}
				</>
			)}
		</>,
	);
};

export default PrivacyStatsWidget;
