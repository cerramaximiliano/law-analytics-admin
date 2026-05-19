import React, { useCallback, useEffect, useState } from "react";
import { Box, Chip, Paper, Skeleton, Stack, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";
import { ArrowRight2, Routing2 } from "iconsax-react";

import IntegrationsConfigService from "api/integrationsConfig";
import { ScrapingManagerService } from "api/scrapingManager";
import ScbaManagerService from "api/scbaManager";

interface ServiceRow {
	key: string;
	label: string;
	enabled: boolean | null; // null = error
}

const IntegrationsStatusWidget: React.FC = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [services, setServices] = useState<ServiceRow[]>([
		{ key: "pjn", label: "PJN", enabled: null },
		{ key: "scba", label: "SCBA", enabled: null },
		{ key: "groups", label: "Grupos", enabled: null },
	]);
	const [loading, setLoading] = useState(true);

	const fetchAll = useCallback(async () => {
		setLoading(true);

		const [integrationsRes, pjnRes, scbaRes] = await Promise.allSettled([
			IntegrationsConfigService.getConfig(),
			ScrapingManagerService.getConfig(),
			ScbaManagerService.getConfig(),
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

	const headerColor =
		errorCount > 0 ? theme.palette.error.main : enabledCount === services.length ? theme.palette.success.main : theme.palette.warning.main;

	return (
		<Paper
			elevation={0}
			onClick={() => navigate("/admin/integrations")}
			sx={{
				p: { xs: 1.5, sm: 2 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
				cursor: "pointer",
				transition: "all 0.2s ease",
				height: "100%",
				"&:hover": { boxShadow: theme.shadows[2], borderColor: alpha(headerColor, 0.5) },
			}}
		>
			<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
					<Routing2 size={20} color={headerColor} variant="Bold" />
					<Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}>
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
					{services.map((service) => (
						<Box key={service.key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
							<Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: "0.75rem" }}>
								{service.label}
							</Typography>
							<Chip
								size="small"
								label={service.enabled === null ? "Error" : service.enabled ? "Activo" : "Mantenimiento"}
								color={service.enabled === null ? "error" : service.enabled ? "success" : "warning"}
								variant="outlined"
								sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
							/>
						</Box>
					))}
				</Stack>
			)}

			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, fontSize: "0.65rem" }}>
				{enabledCount} de {services.length} servicios disponibles
			</Typography>
		</Paper>
	);
};

export default IntegrationsStatusWidget;
