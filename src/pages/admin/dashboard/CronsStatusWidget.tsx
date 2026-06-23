import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Paper, Chip, Skeleton, alpha } from "@mui/material";
import { ArrowRight2, Clock } from "iconsax-react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { LIVE_GREEN, STALE_AMBER, LIVE_PULSE_KEYFRAMES, headerBorder, headerShadow } from "themes/dashboardTokens";
import CronHealthService, { CronHealthItem, CronHealthStatus } from "api/cronHealth";

// Etiquetas cortas para los chips (fallback al displayName/name).
const SHORT_LABEL: Record<string, string> = {
	winbackExpiryCron: "Winback",
	cronHealthCheckCron: "Watchdog",
	discountReconciliationCron: "Reconcile",
	discountReconciliationDigestCron: "Rec.Digest",
	healthDigestCron: "H.Digest",
	healthReportsCron: "H.Reports",
};

const CronsStatusWidget = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [crons, setCrons] = useState<CronHealthItem[]>([]);
	const [loading, setLoading] = useState(true);
	const isDark = theme.palette.mode === "dark";

	const loadCrons = useCallback(async () => {
		try {
			const res = await CronHealthService.getCronHealth();
			setCrons(res.data || []);
		} catch {
			setCrons([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadCrons();
		const interval = setInterval(loadCrons, 120000);
		return () => clearInterval(interval);
	}, [loadCrons]);

	const total = crons.length;
	const okCount = crons.filter((c) => c.status === "ok").length;
	const errorCount = crons.filter((c) => c.status === "error").length;
	const staleCount = crons.filter((c) => c.status === "stale").length;
	const pendingCount = crons.filter((c) => c.status === "pending").length;

	const hasError = errorCount > 0;
	const hasStale = staleCount > 0;
	const hasPending = pendingCount > 0;
	const allOk = total > 0 && okCount === total && !loading;

	const statusColor = hasError
		? theme.palette.error.main
		: hasStale || hasPending
			? STALE_AMBER
			: allOk
				? LIVE_GREEN
				: STALE_AMBER;
	const statusBorderColor = hasError
		? theme.palette.error.main
		: hasStale
			? alpha(STALE_AMBER, 0.4)
			: allOk
				? headerBorder(isDark)
				: alpha(STALE_AMBER, 0.4);

	const dotColor = (status: CronHealthStatus) => {
		if (status === "ok") return LIVE_GREEN;
		if (status === "error") return theme.palette.error.main;
		return STALE_AMBER; // stale | pending
	};

	return (
		<Paper
			elevation={0}
			onClick={() => navigate("/admin/server-status")}
			sx={{
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${statusBorderColor}`,
				height: "100%",
				cursor: "pointer",
				transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
				"&:hover": {
					boxShadow: headerShadow(isDark),
					borderColor: statusColor,
					transform: "translateY(-1px)",
				},
				...LIVE_PULSE_KEYFRAMES,
			}}
		>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1, sm: 1.5 } }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
					<Box sx={{ color: statusColor, display: "flex", flexShrink: 0 }}>
						<Clock size={20} variant={hasError ? "Linear" : "Bold"} />
					</Box>
					<Typography
						variant="body2"
						sx={{
							fontWeight: 500,
							fontSize: { xs: "0.75rem", sm: "0.875rem" },
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						Estado de Crons
					</Typography>
				</Box>
				<ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
			</Box>

			{/* Counter */}
			{loading ? (
				<Skeleton variant="text" width={80} height={40} sx={{ mb: 1 }} />
			) : (
				<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: { xs: 1, sm: 1.5 } }}>
					{allOk && (
						<Box
							component="span"
							sx={{
								position: "relative",
								width: 10,
								height: 10,
								borderRadius: "50%",
								bgcolor: LIVE_GREEN,
								mr: 0.75,
								alignSelf: "center",
								"&::after": {
									content: '""',
									position: "absolute",
									inset: 0,
									borderRadius: "50%",
									bgcolor: LIVE_GREEN,
									animation: "la-live-pulse 2.4s ease-out infinite",
								},
							}}
						/>
					)}
					<Typography
						variant="h3"
						sx={{
							fontWeight: 700,
							color: statusColor,
							lineHeight: 1,
							fontSize: { xs: "1.5rem", sm: "2rem" },
							letterSpacing: "-0.02em",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{okCount}
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
						/ {total} OK
					</Typography>
				</Box>
			)}

			{/* Cron chips */}
			{loading ? (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
					{[0, 1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} variant="rounded" width={52} height={20} />
					))}
				</Box>
			) : total === 0 ? (
				<Typography variant="caption" color="text.secondary">
					Sin datos de crons
				</Typography>
			) : (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
					{crons.map((cron) => (
						<Chip
							key={cron.name}
							label={SHORT_LABEL[cron.name] || cron.displayName || cron.name}
							size="small"
							sx={{
								fontSize: "0.6rem",
								height: 20,
								bgcolor: alpha(dotColor(cron.status), 0.12),
								color: dotColor(cron.status),
								fontWeight: 600,
								border: `1px solid ${alpha(dotColor(cron.status), 0.3)}`,
							}}
						/>
					))}
				</Box>
			)}
		</Paper>
	);
};

export default CronsStatusWidget;
