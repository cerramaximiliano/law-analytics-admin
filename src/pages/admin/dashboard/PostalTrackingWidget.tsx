import React, { useEffect, useState, useCallback } from "react";
import { Box, Stack, Typography, Paper, Skeleton, Tooltip, IconButton, useTheme, alpha, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Refresh, Truck } from "iconsax-react";
import PostalTrackingAdminService, { PostalTrackingStats } from "api/postalTrackingAdmin";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Seguimiento postal (Correo Argentino): cuántos envíos se están siguiendo
// activamente, más el desglose que importa para operar el worker
// (pendientes de primer scrape, con errores, cerrados por no encontrados).
// ----------------------------------------------------------------------

interface PostalTrackingWidgetProps {
	onRefresh?: () => void;
}

const PostalTrackingWidget: React.FC<PostalTrackingWidgetProps> = ({ onRefresh }) => {
	const theme = useTheme();
	const navigate = useNavigate();
	const isDark = theme.palette.mode === "dark";

	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<PostalTrackingStats | null>(null);
	const [error, setError] = useState<string | null>(null);

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const data = await PostalTrackingAdminService.getStats();
			setStats(data);
			if (onRefresh) onRefresh();
		} catch (e: any) {
			setError(e?.message || "Error cargando seguimiento postal");
		} finally {
			setLoading(false);
		}
	}, [onRefresh]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const wrapper = (children: React.ReactNode) => (
		<Paper
			elevation={0}
			sx={{
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				border: `1px solid ${headerBorder(isDark)}`,
				transition: "border-color 240ms ease",
				height: "100%",
			}}
		>
			{children}
		</Paper>
	);

	const header = (
		<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Box
					sx={{
						width: 28,
						height: 28,
						borderRadius: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.08),
						border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
						color: BRAND_BLUE,
					}}
				>
					<Truck size={15} />
				</Box>
				<Typography variant="subtitle2" fontWeight="bold">
					Seguimiento postal
				</Typography>
			</Box>
			<Tooltip title="Actualizar">
				<IconButton size="small" onClick={fetchStats} disabled={loading}>
					<Refresh size={18} />
				</IconButton>
			</Tooltip>
		</Box>
	);

	if (loading && !stats) {
		return wrapper(
			<>
				{header}
				<Skeleton variant="rectangular" width="100%" height={110} sx={{ borderRadius: 1 }} />
			</>,
		);
	}

	if (error) {
		return wrapper(
			<>
				{header}
				<Typography color="error" variant="body2">
					{error}
				</Typography>
			</>,
		);
	}

	if (!stats) return null;

	const byStatus = stats.byProcessingStatus || {};
	const activos = byStatus.active || 0;
	const pendientes = byStatus.pending || 0;
	const completados = byStatus.completed || 0;
	const noEncontrados = byStatus.not_found || 0;
	const conErrores = stats.metrics?.withErrors || 0;
	const desactualizados = stats.metrics?.staleActive || 0;
	const desactualizadosDetalle = stats.staleActiveTrackings || [];

	const filas: { label: string; value: number; color: string }[] = [
		{ label: "Pendientes", value: pendientes, color: theme.palette.text.secondary },
		{ label: "Con errores", value: conErrores, color: conErrores > 0 ? theme.palette.warning.main : theme.palette.text.secondary },
		{ label: "Completados", value: completados, color: theme.palette.success.main },
		{ label: "No encontrados", value: noEncontrados, color: theme.palette.text.secondary },
	];

	return wrapper(
		<>
			{header}

			{/* Alerta: seguimientos activos que el worker no consulta hace >24h */}
			{desactualizados > 0 && (
				<Tooltip
					title={
						<Box>
							{desactualizadosDetalle.slice(0, 5).map((t) => (
								<Typography key={t._id} variant="caption" display="block">
									{t.codeId} {t.numberId} — última consulta:{" "}
									{t.lastCheckedAt ? new Date(t.lastCheckedAt).toLocaleString("es-AR") : "nunca"}
								</Typography>
							))}
							{desactualizados > 5 && (
								<Typography variant="caption" display="block">
									…y {desactualizados - 5} más
								</Typography>
							)}
						</Box>
					}
				>
					<Box
						onClick={() => navigate("/admin/postal-tracking")}
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 0.75,
							mb: 1.5,
							px: 1,
							py: 0.5,
							borderRadius: 1,
							cursor: "pointer",
							bgcolor: alpha(theme.palette.error.main, isDark ? 0.18 : 0.08),
							border: `1px solid ${alpha(theme.palette.error.main, isDark ? 0.4 : 0.25)}`,
						}}
					>
						<Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 600 }}>
							⚠ {desactualizados === 1 ? "1 seguimiento activo sin actualizar" : `${desactualizados} seguimientos activos sin actualizar`} hace más de 24h
						</Typography>
					</Box>
				</Tooltip>
			)}

			{/* KPI principal: envíos en seguimiento activo */}
			<Box
				sx={{ cursor: "pointer", mb: 1.5 }}
				onClick={() => navigate("/admin/workers/scraper")}
				title="Ver el worker de seguimiento postal"
			>
				<Stack direction="row" alignItems="baseline" spacing={1}>
					<Typography variant="h3" sx={{ color: BRAND_BLUE, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
						{activos}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						activos
					</Typography>
					{stats.recentlyUpdatedToday > 0 && (
						<Chip
							size="small"
							label={`${stats.recentlyUpdatedToday} con novedad hoy`}
							sx={{
								height: 20,
								fontSize: "0.65rem",
								bgcolor: alpha(theme.palette.success.main, 0.12),
								color: theme.palette.success.main,
							}}
						/>
					)}
				</Stack>
				<Typography variant="caption" color="text.secondary">
					de {stats.metrics?.total ?? 0} seguimientos registrados
				</Typography>
			</Box>

			{/* Desglose */}
			<Stack spacing={0.5}>
				{filas.map((f) => (
					<Stack key={f.label} direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="caption" color="text.secondary">
							{f.label}
						</Typography>
						<Typography variant="caption" sx={{ color: f.color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
							{f.value}
						</Typography>
					</Stack>
				))}
			</Stack>
		</>,
	);
};

export default PostalTrackingWidget;
