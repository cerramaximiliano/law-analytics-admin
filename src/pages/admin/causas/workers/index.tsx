import React from "react";
import { useState } from "react";
import { Box, Tab, Tabs, Typography, Paper, Stack, Chip, useTheme, alpha, IconButton, Tooltip, Popover } from "@mui/material";
import { TickSquare, SearchNormal1, DocumentUpload, InfoCircle, People, Warning2, SecurityUser, Lock1, Gallery } from "iconsax-react";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import { BRAND_BLUE, headerBorder, navActiveBg } from "themes/dashboardTokens";
import VerificationWorker from "./VerificationWorker";
import ScrapingWorker from "./ScrapingWorker";
import AppUpdateWorker from "./AppUpdateWorker";
import IntervinientesWorker from "./IntervinientesWorker";
import StuckDocumentsWorker from "./StuckDocumentsWorker";
import MisCausasWorker from "./MisCausasWorker";
import PrivacyCheckerWorker from "./PrivacyCheckerWorker";
import CaptchaDatasetTab from "./CaptchaDatasetTab";

// Interfaz para los tabs
interface WorkerTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
	description: string;
	status?: "active" | "inactive" | "error";
	badge?: string;
	ip?: string;
}

const WorkersConfig = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("scraping");
	const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLButtonElement | null>(null);

	const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
	};

	// Definición de las pestañas de workers
	const workerTabs: WorkerTab[] = [
		{
			label: "Scraping PJN",
			value: "scraping",
			icon: <SearchNormal1 size={20} />,
			component: <ScrapingWorker />,
			description: "Configura los workers que buscan y recopilan nuevas causas judiciales",
			status: "active",
			badge: "worker_01",
			ip: "100.111.73.56",
		},
		{
			label: "Verificación",
			value: "verification",
			icon: <TickSquare size={20} />,
			component: <VerificationWorker />,
			description: "Configura los parámetros del worker de verificación de causas",
			status: "active",
			badge: "app",
			ip: "18.228.63.73",
		},
		{
			label: "Actualización",
			value: "app-update",
			icon: <DocumentUpload size={20} />,
			component: <AppUpdateWorker />,
			description: "Mantiene actualizados los documentos de causas judiciales (API de PJN)",
			status: "active",
			badge: "app",
			ip: "18.228.63.73",
		},
		{
			label: "Intervinientes",
			value: "intervinientes",
			icon: <People size={20} />,
			component: <IntervinientesWorker />,
			description: "Extrae intervinientes (partes y letrados) de las causas desde PJN",
			status: "active",
			badge: "app",
			ip: "18.228.63.73",
		},
		{
			label: "Stuck Documents",
			value: "stuck-documents",
			icon: <Warning2 size={20} />,
			component: <StuckDocumentsWorker />,
			description: "Procesa documentos verificados sin movimientos guardados",
			status: "active",
			badge: "app",
			ip: "18.228.63.73",
		},
		{
			label: "Mis Causas",
			value: "mis-causas",
			icon: <SecurityUser size={20} />,
			component: <MisCausasWorker />,
			description: "Gestión del scraping y actualización de causas PJN (login SSO)",
			status: "active",
			badge: "worker_02",
			ip: "100.98.180.101",
		},
		{
			label: "Privacy Checker",
			value: "privacy-checker",
			icon: <Lock1 size={20} />,
			component: <PrivacyCheckerWorker />,
			description: "Detecta causas PJN individuales que pasaron a estado reservado y mantiene el flag automáticamente",
			status: "active",
			badge: "app",
			ip: "18.228.63.73",
		},
		{
			label: "Captcha Dataset",
			value: "captcha-dataset",
			icon: <Gallery size={20} />,
			component: <CaptchaDatasetTab />,
			description: "Visualiza las imágenes de captcha capturadas para entrenar un OCR propio",
			status: "active",
			badge: "worker_01",
			ip: "100.111.73.56",
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

	const isDark = theme.palette.mode === "dark";

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Header */}
				<Box>
					<Stack direction="row" alignItems="center" spacing={1}>
						<Typography variant="h3" sx={{ letterSpacing: "-0.01em" }}>
							Configuración de workers
						</Typography>
						<Tooltip title="Ver información">
							<IconButton size="small" color="info" onClick={(e) => setInfoAnchorEl(e.currentTarget)}>
								<InfoCircle size={22} />
							</IconButton>
						</Tooltip>
						<Popover
							open={Boolean(infoAnchorEl)}
							anchorEl={infoAnchorEl}
							onClose={() => setInfoAnchorEl(null)}
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "left",
							}}
							transformOrigin={{
								vertical: "top",
								horizontal: "left",
							}}
						>
							<Box sx={{ p: 2, maxWidth: 400 }}>
								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
									Información sobre Workers
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Los workers son procesos automatizados que ejecutan tareas en segundo plano. Cada worker tiene su propia configuración y
									puede ser activado o desactivado según las necesidades del sistema.
								</Typography>
							</Box>
						</Popover>
					</Stack>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Gestiona y configura los diferentes workers del sistema de causas
					</Typography>
				</Box>

				{/* Tabs de navegación */}
				<Paper
					elevation={0}
					sx={{
						borderRadius: 2,
						overflow: "hidden",
						border: `1px solid ${headerBorder(isDark)}`,
					}}
				>
					<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.04 : 0.02) }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							variant="scrollable"
							scrollButtons="auto"
							TabIndicatorProps={{ sx: { backgroundColor: BRAND_BLUE, height: 2.5 } }}
							sx={{
								"& .MuiTab-root": {
									minHeight: 64,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
									transition: "background-color 200ms ease, color 200ms ease",
									"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.04) },
								},
								"& .MuiTab-root.Mui-selected": { color: BRAND_BLUE, bgcolor: navActiveBg(isDark) },
							}}
						>
							{workerTabs.map((tab) => (
								<Tab
									key={tab.value}
									label={
										<Stack direction="row" spacing={1.5} alignItems="center">
											<Box sx={{ color: getStatusColor(tab.status) }}>{tab.icon}</Box>
											<Box>
												<Stack direction="row" spacing={0.75} alignItems="center">
													<Typography variant="body2" fontWeight={500}>
														{tab.label}
													</Typography>
													{tab.badge && (
														<Box
															component="span"
															sx={{
																display: "inline-flex",
																alignItems: "center",
																px: 1,
																py: 0.25,
																borderRadius: 1,
																bgcolor: alpha(theme.palette.text.primary, isDark ? 0.18 : 0.08),
																color: theme.palette.text.primary,
																fontSize: "0.65rem",
																fontWeight: 500,
																fontFamily: "monospace",
																letterSpacing: "0.5px",
																fontVariantNumeric: "tabular-nums",
															}}
														>
															{tab.badge}
														</Box>
													)}
													{tab.ip && (
														<Box
															component="span"
															sx={{
																display: "inline-flex",
																alignItems: "center",
																px: 0.75,
																py: 0.25,
																borderRadius: 1,
																bgcolor: alpha(theme.palette.info.main, 0.1),
																color: theme.palette.info.main,
																fontSize: "0.6rem",
																fontWeight: 500,
																fontFamily: "monospace",
															}}
														>
															{tab.ip}
														</Box>
													)}
												</Stack>
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
								{tab.component}
							</TabPanel>
						))}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
};

export default WorkersConfig;
