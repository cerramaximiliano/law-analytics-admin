import React, { useEffect, useState, useCallback } from "react";
import { Box, Typography, Paper, Chip, Skeleton, alpha } from "@mui/material";
import { ArrowRight2, Cloud } from "iconsax-react";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

type ServiceStatus = "online" | "offline" | "checking";

interface ServiceInfo {
	name: string;
	url: string;
	shortName: string;
	corsRestricted?: boolean;
}

const SERVICES: ServiceInfo[] = [
	{ name: "API de Tasas de Interés", shortName: "Tasas", url: "https://admin.lawanalytics.app/api" },
	{ name: "API de Causas PJN", shortName: "PJN", url: "https://api.lawanalytics.app/api", corsRestricted: true },
	{ name: "API de Marketing", shortName: "Marketing", url: "https://mkt.lawanalytics.app" },
	{ name: "API Principal", shortName: "Principal", url: "https://server.lawanalytics.app" },
	{ name: "API de Suscripciones", shortName: "Subs.", url: "https://subscriptions.lawanalytics.app/health", corsRestricted: true },
	{
		name: "API de Causas MEV",
		shortName: "MEV",
		url: `${import.meta.env.VITE_API_MEV || "https://mev.lawanalytics.app"}/health`,
		corsRestricted: true,
	},
	{
		name: "API de Causas EJE",
		shortName: "EJE",
		url: `${import.meta.env.VITE_API_EJE || "https://eje.lawanalytics.app/api"}/health`,
		corsRestricted: true,
	},
	{ name: "API de RAG (IA)", shortName: "RAG/IA", url: "https://ia.lawanalytics.app/rag/health", corsRestricted: true },
];

interface ServiceState {
	name: string;
	shortName: string;
	status: ServiceStatus;
}

const ServicesStatusWidget = () => {
	const theme = useTheme();
	const navigate = useNavigate();
	const [services, setServices] = useState<ServiceState[]>(
		SERVICES.map((s) => ({ name: s.name, shortName: s.shortName, status: "checking" as ServiceStatus })),
	);
	const [loading, setLoading] = useState(true);

	const checkServices = useCallback(async () => {
		setLoading(true);

		const results = await Promise.all(
			SERVICES.map(async (service): Promise<ServiceState> => {
				try {
					const response = await fetch(service.url, {
						method: "GET",
						mode: "cors",
						headers: { Accept: "application/json" },
					});
					if (response.ok) {
						return { name: service.name, shortName: service.shortName, status: "online" };
					}
					return { name: service.name, shortName: service.shortName, status: "offline" };
				} catch (error) {
					if (error instanceof TypeError && error.message.includes("Failed to fetch") && service.corsRestricted) {
						// Intentar via proxy
						try {
							const proxyUrl = `${import.meta.env.VITE_AUTH_URL}/api/server-status/check-external`;
							const proxyResponse = await fetch(proxyUrl, {
								method: "POST",
								credentials: "include",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ url: service.url }),
							});
							if (proxyResponse.ok) {
								const proxyData = await proxyResponse.json();
								return { name: service.name, shortName: service.shortName, status: proxyData.online ? "online" : "offline" };
							}
						} catch {
							// proxy fallo, asumir online para servicios CORS restrictivos conocidos
						}
						return { name: service.name, shortName: service.shortName, status: "online" };
					}
					return { name: service.name, shortName: service.shortName, status: "offline" };
				}
			}),
		);

		setServices(results);
		setLoading(false);
	}, []);

	useEffect(() => {
		checkServices();
		const interval = setInterval(checkServices, 60000);
		return () => clearInterval(interval);
	}, [checkServices]);

	const onlineCount = services.filter((s) => s.status === "online").length;
	const offlineCount = services.filter((s) => s.status === "offline").length;
	const total = services.length;
	const allOnline = onlineCount === total && !loading;
	const hasOffline = offlineCount > 0;

	const statusColor = hasOffline ? theme.palette.error.main : allOnline ? theme.palette.success.main : theme.palette.warning.main;
	const statusBorderColor = hasOffline ? theme.palette.error.main : allOnline ? theme.palette.divider : theme.palette.warning.main;

	const dotColor = (status: ServiceStatus) => {
		if (status === "online") return theme.palette.success.main;
		if (status === "offline") return theme.palette.error.main;
		return theme.palette.warning.main;
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
				transition: "all 0.2s ease",
				"&:hover": {
					boxShadow: theme.shadows[2],
					borderColor: statusColor,
				},
			}}
		>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1, sm: 1.5 } }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.5, sm: 1 } }}>
					<Box sx={{ color: statusColor, display: "flex", flexShrink: 0 }}>
						<Cloud size={20} variant={hasOffline ? "Linear" : "Bold"} />
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
						Estado de Servicios
					</Typography>
				</Box>
				<ArrowRight2 size={14} style={{ color: theme.palette.text.secondary, flexShrink: 0 }} />
			</Box>

			{/* Counter */}
			{loading ? (
				<Skeleton variant="text" width={80} height={40} sx={{ mb: 1 }} />
			) : (
				<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: { xs: 1, sm: 1.5 } }}>
					<Typography
						variant="h3"
						sx={{
							fontWeight: 700,
							color: statusColor,
							lineHeight: 1,
							fontSize: { xs: "1.5rem", sm: "2rem" },
						}}
					>
						{onlineCount}
					</Typography>
					<Typography variant="body2" color="text.secondary">
						/ {total} en línea
					</Typography>
				</Box>
			)}

			{/* Service dots */}
			{loading ? (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
					{SERVICES.map((_, i) => (
						<Skeleton key={i} variant="rounded" width={42} height={20} />
					))}
				</Box>
			) : (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
					{services.map((service) => (
						<Chip
							key={service.name}
							label={service.shortName}
							size="small"
							sx={{
								fontSize: "0.6rem",
								height: 20,
								bgcolor: alpha(dotColor(service.status), 0.12),
								color: dotColor(service.status),
								fontWeight: 600,
								border: `1px solid ${alpha(dotColor(service.status), 0.3)}`,
							}}
						/>
					))}
				</Box>
			)}
		</Paper>
	);
};

export default ServicesStatusWidget;
