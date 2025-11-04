import React from "react";
import { useState } from "react";
import { Box, Tab, Tabs, Typography, Paper, Alert, Stack, Chip, useTheme, alpha } from "@mui/material";
import { Setting2, Notification, Broom, TickSquare, Refresh2, SearchNormal1, DocumentUpload } from "iconsax-react";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import VerificationWorker from "./VerificationWorker";
import ScrapingWorker from "./ScrapingWorker";
import AppUpdateWorker from "./AppUpdateWorker";
import SyncWorker from "./SyncWorker";
import ProcessingWorker from "./ProcessingWorker";
import NotificationWorker from "./NotificationWorker";
import CleanupWorker from "./CleanupWorker";

// Interfaz para los tabs
interface WorkerTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
	description: string;
	status?: "active" | "inactive" | "error";
}

const WorkersConfig = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("scraping");

	const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
	};

	// Definición de las pestañas de workers
	const workerTabs: WorkerTab[] = [
		{
			label: "Scraping",
			value: "scraping",
			icon: <SearchNormal1 size={20} />,
			component: <ScrapingWorker />,
			description: "Configura los workers que buscan y recopilan nuevas causas judiciales",
			status: "active",
		},
		{
			label: "Actualización",
			value: "app-update",
			icon: <DocumentUpload size={20} />,
			component: <AppUpdateWorker />,
			description: "Mantiene actualizados los documentos de causas judiciales",
			status: "active",
		},
		{
			label: "Verificación",
			value: "verification",
			icon: <TickSquare size={20} />,
			component: <VerificationWorker />,
			description: "Configura los parámetros del worker de verificación de causas",
			status: "active",
		},
		{
			label: "Sincronización",
			value: "sync",
			icon: <Refresh2 size={20} />,
			component: <SyncWorker />,
			description: "Gestiona la sincronización de datos con sistemas externos",
			status: "inactive",
		},
		{
			label: "Procesamiento",
			value: "processing",
			icon: <Setting2 size={20} />,
			component: <ProcessingWorker />,
			description: "Controla el procesamiento automático de documentos",
			status: "inactive",
		},
		{
			label: "Notificaciones",
			value: "notifications",
			icon: <Notification size={20} />,
			component: <NotificationWorker />,
			description: "Administra el envío de notificaciones y alertas",
			status: "active",
		},
		{
			label: "Limpieza",
			value: "cleanup",
			icon: <Broom size={20} />,
			component: <CleanupWorker />,
			description: "Configura las tareas de mantenimiento y limpieza",
			status: "inactive",
		},
	];

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "active":
				return theme.palette.success.main;
			case "inactive":
				return theme.palette.warning.main;
			case "error":
				return theme.palette.error.main;
			default:
				return theme.palette.grey[500];
		}
	};

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Header */}
				<Box>
					<Typography variant="h3" gutterBottom>
						Configuración de Workers
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Gestiona y configura los diferentes workers del sistema de causas
					</Typography>
				</Box>

				{/* Alert informativo */}
				<Alert severity="info" variant="outlined">
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Información sobre Workers
					</Typography>
					<Typography variant="body2">
						Los workers son procesos automatizados que ejecutan tareas en segundo plano. Cada worker tiene su propia configuración y puede
						ser activado o desactivado según las necesidades del sistema.
					</Typography>
				</Alert>

				{/* Tabs de navegación */}
				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 64,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
								},
							}}
						>
							{workerTabs.map((tab) => (
								<Tab
									key={tab.value}
									label={
										<Stack direction="row" spacing={1.5} alignItems="center">
											<Box sx={{ color: getStatusColor(tab.status) }}>{tab.icon}</Box>
											<Box>
												<Typography variant="body2" fontWeight={500}>
													{tab.label}
												</Typography>
												{tab.status && (
													<Chip
														label={tab.status === "active" ? "Activo" : tab.status === "inactive" ? "Inactivo" : "Error"}
														size="small"
														sx={{
															height: 16,
															fontSize: "0.7rem",
															mt: 0.5,
															bgcolor: alpha(getStatusColor(tab.status), 0.1),
															color: getStatusColor(tab.status),
														}}
													/>
												)}
											</Box>
										</Stack>
									}
									value={tab.value}
								/>
							))}
						</Tabs>
					</Box>

					{/* Contenido de las pestañas */}
					<Box sx={{ bgcolor: theme.palette.background.paper }}>
						{workerTabs.map((tab) => (
							<TabPanel key={tab.value} value={activeTab} index={tab.value}>
								<Stack spacing={2}>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
										{tab.description}
									</Typography>
									{tab.component}
								</Stack>
							</TabPanel>
						))}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
};

export default WorkersConfig;
