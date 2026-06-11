import React, { useCallback, useEffect, useState } from "react";
import { Box, Chip, Paper, Skeleton, Stack, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { ArrowRight2, Routing2 } from "iconsax-react";

import IntegrationsConfigService from "api/integrationsConfig";
import { ScrapingManagerService } from "api/scrapingManager";
import ScbaManagerService from "api/scbaManager";
import judicialNotificationConfigService from "services/judicialNotificationConfigService";
import { LIVE_GREEN, STALE_AMBER, LIVE_PULSE_KEYFRAMES, headerBorder, headerShadow } from "themes/dashboardTokens";

interface ServiceRow {
	key: string;
	label: string;
	enabled: boolean | null; // null = error
	offLabel?: string; // chip cuando enabled=false (default "Mantenimiento")
}

const IntegrationsStatusWidget: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [services, setServices] = useState<ServiceRow[]>([
		{ key: "pjn", label: "PJN", enabled: null },
		{ key: "scba", label: "SCBA", enabled: null },
		{ key: "groups", label: "Grupos", enabled: null },
		{ key: "movViewer", label: "Visor docs (emails)", enabled: null, offLabel: "Inactivo" },
	]);
	const [loading, setLoading] = useState(true);

	const fetchAll = useCallback(async () => {
		setLoading(true);

		const [integrationsRes, pjnRes, scbaRes, movViewerRes] = await Promise.allSettled([
			IntegrationsConfigService.getConfig(),
			ScrapingManagerService.getConfig(),
			ScbaManagerService.getConfig(),
			judicialNotificationConfigService.getConfig(),
		]);

		const rows: ServiceRow[] = [
			{
				key: "pjn",
				label: "Mis Causas PJN",
				enabled: pjnRes.status === "fulfilled" ? !!pjnRes.value.data?.global?.serviceAvailable : null,
			},
			{
				key: "scba",
				label: "Mis Causas SCBA",
				enabled: scbaRes.status === "fulfilled" ? !!scbaRes.value.data?.config?.serviceAvailable : null,
			},
			{
				key: "groups",
				label: "Grupos / Teams",
				enabled: integrationsRes.status === "fulfilled" ? !!integrationsRes.value.data?.services?.groups?.enabled : null,
			},
			{
				key: "movViewer",
				label: "Visor docs (emails)",
				enabled: movViewerRes.status === "fulfilled" ? !!movViewerRes.value.contentConfig?.usePublicMovementLinks : null,
				offLabel: "Inactivo",
			},
		];

		setServices(rows);
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchAll();
		const interval = setInterval(fetchAll, 60000);
		return () => clearInterval(interval);
	}, [fetchAll]);

	const enabledCount = services.filter((s) => s.enabled === true).length;
	const errorCount = services.filter((s) => s.enabled === null).length;
	const isDark = theme.palette.mode === "dark";
	const allHealthy = enabledCount === services.length && errorCount === 0;

	const headerColor = errorCount > 0 ? theme.palette.error.main : allHealthy ? LIVE_GREEN : STALE_AMBER;

	return (
		<Paper
			elevation={0}
			onClick={() => navigate("/admin/integrations")}
			sx={{
				p: { xs: 1.5, sm: 2 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${headerBorder(isDark)}`,
				cursor: "pointer",
				transition: "transform 240ms ease, box-shadow 240ms ease, border-color 240ms ease",
				height: "100%",
				"&:hover": {
					boxShadow: headerShadow(isDark),
					borderColor: alpha(headerColor, 0.5),
					transform: "translateY(-1px)",
				},
				...LIVE_PULSE_KEYFRAMES,
			}}
		>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
					<Routing2 size={20} color={headerColor} variant="Bold" />
					<Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" }, letterSpacing: "-0.01em" }}>
						Integraciones
					</Typography>
				</Stack>
				<ArrowRight2 size={14} color={theme.palette.text.secondary} />
			</Stack>

			{loading ? (
				<Stack spacing={0.75}>
					<Skeleton variant="rounded" height={22} />
					<Skeleton variant="rounded" height={22} />
					<Skeleton variant="rounded" height={22} />
				</Stack>
			) : (
				<Stack spacing={0.75}>
					{services.map((service) => {
						const dotColor =
							service.enabled === null ? theme.palette.error.main : service.enabled ? LIVE_GREEN : STALE_AMBER;
						return (
							<Box
								key={service.key}
								sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}
							>
								<Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.75rem" }}>
									{service.label}
								</Typography>
								<Stack direction="row" spacing={0.75} alignItems="center">
									{service.enabled === true && (
										<Box
											component="span"
											sx={{
												position: "relative",
												width: 8,
												height: 8,
												borderRadius: "50%",
												bgcolor: LIVE_GREEN,
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
									<Chip
										size="small"
										label={service.enabled === null ? "Error" : service.enabled ? "Activo" : service.offLabel ?? "Mantenimiento"}
										variant="outlined"
										sx={{
											height: 20,
											fontSize: "0.65rem",
											fontWeight: 600,
											color: dotColor,
											borderColor: alpha(dotColor, 0.45),
											bgcolor: alpha(dotColor, 0.06),
										}}
									/>
								</Stack>
							</Box>
						);
					})}
				</Stack>
			)}

			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ display: "block", mt: 1.5, fontSize: "0.65rem", fontVariantNumeric: "tabular-nums" }}
			>
				{enabledCount} de {services.length} servicios disponibles
			</Typography>
		</Paper>
	);
};

export default IntegrationsStatusWidget;
