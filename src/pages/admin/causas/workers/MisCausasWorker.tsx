import React, { useState, useEffect } from "react";
import { Box, Typography, Stack, Tabs, Tab, Alert, Button, Skeleton, Divider, useTheme } from "@mui/material";
import { Setting2, People, Chart, MessageQuestion, Refresh, Clock, RefreshSquare } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerConfig, ScrapingManagerService } from "api/scrapingManager";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";
import MisCausasManagerTab from "./MisCausasManagerTab";
import MisCausasWorkersTab from "./MisCausasWorkersTab";
import MisCausasStatsTab from "./MisCausasStatsTab";
import MisCausasHelpTab from "./MisCausasHelpTab";
import CausasUpdateConfigTab from "./CausasUpdateConfigTab";
import CausasUpdateHistoryTab from "./CausasUpdateHistoryTab";
import CausasUpdateStatsTab from "./CausasUpdateStatsTab";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`vertical-tabpanel-${index}`}
			aria-labelledby={`vertical-tab-${index}`}
			style={{ width: "100%" }}
			{...other}
		>
			{value === index && <Box sx={{ pl: { xs: 0, md: 3 }, pt: { xs: 2, md: 0 } }}>{children}</Box>}
		</div>
	);
}

const MisCausasWorker: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<ScrapingManagerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState(0);
	const [updateConfig, setUpdateConfig] = useState<CausasUpdateConfig | null>(null);
	const [updateConfigLoading, setUpdateConfigLoading] = useState(true);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			setUpdateConfigLoading(true);
			const [managerRes, updateRes] = await Promise.all([
				ScrapingManagerService.getConfig(),
				CausasUpdateService.getConfig(),
			]);
			if (managerRes.success) setConfig(managerRes.data);
			if (updateRes.success) setUpdateConfig(updateRes.data);
		} catch (error: any) {
			enqueueSnackbar("Error al obtener configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
			setUpdateConfigLoading(false);
		}
	};

	const fetchUpdateConfig = async () => {
		try {
			const response = await CausasUpdateService.getConfig();
			if (response.success) setUpdateConfig(response.data);
		} catch (error: any) {
			enqueueSnackbar("Error cargando configuración de updates", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	if (loading) {
		return (
			<Stack spacing={2} sx={{ p: 2 }}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!config) {
		return (
			<Alert severity="error" variant="outlined" sx={{ m: 2 }}>
				<Typography variant="body2">
					No se pudo cargar la configuración del Scraping Manager. Verifica que la API esté disponible.
				</Typography>
			</Alert>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Box>
					<Typography variant="h4">Scraping Worker Manager</Typography>
					<Typography variant="body2" color="text.secondary">
						Gestión de workers de scraping y actualización del sistema Mis Causas (PJN)
					</Typography>
				</Box>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
					Recargar Config
				</Button>
			</Box>

			{/* Alertas de estado */}
			{!config.global.enabled && (
				<Alert severity="error" variant="outlined" sx={{ py: 1 }}>
					<Typography variant="body2">
						<strong>Manager apagado:</strong> Todos los workers están detenidos.
					</Typography>
				</Alert>
			)}
			{config.global.enabled && !config.global.serviceAvailable && (
				<Alert severity="warning" variant="outlined" sx={{ py: 1 }}>
					<Typography variant="body2">
						<strong>Servicio no disponible para usuarios.</strong> Los workers pueden seguir ejecutándose.
					</Typography>
				</Alert>
			)}

			{/* Layout con tabs laterales */}
			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: { md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
						minWidth: { md: 200 },
						"& .MuiTab-root": {
							alignItems: "flex-start",
							textAlign: "left",
							minHeight: 60,
							px: 2,
						},
					}}
				>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Setting2 size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Manager</Typography>
									<Typography variant="caption" color="text.secondary">Config. global</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<People size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Workers</Typography>
									<Typography variant="caption" color="text.secondary">Config. por worker</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<RefreshSquare size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Config. Updates</Typography>
									<Typography variant="caption" color="text.secondary">Thresholds y resume</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Clock size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Historial</Typography>
									<Typography variant="caption" color="text.secondary">Runs de updates</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Chart size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Estadísticas</Typography>
									<Typography variant="caption" color="text.secondary">Estado y métricas</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<MessageQuestion size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Ayuda</Typography>
									<Typography variant="caption" color="text.secondary">Guía de uso</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
				</Tabs>

				<TabPanel value={activeTab} index={0}>
					<MisCausasManagerTab config={config} onConfigUpdate={fetchConfig} />
				</TabPanel>
				<TabPanel value={activeTab} index={1}>
					<MisCausasWorkersTab config={config} onConfigUpdate={fetchConfig} />
				</TabPanel>
				<TabPanel value={activeTab} index={2}>
					{updateConfigLoading ? (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
							<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
						</Stack>
					) : updateConfig ? (
						<CausasUpdateConfigTab config={updateConfig} onConfigUpdate={fetchUpdateConfig} />
					) : (
						<Alert severity="error" variant="outlined">
							<Typography variant="body2">No se pudo cargar la configuración de updates</Typography>
						</Alert>
					)}
				</TabPanel>
				<TabPanel value={activeTab} index={3}>
					<CausasUpdateHistoryTab />
				</TabPanel>
				<TabPanel value={activeTab} index={4}>
					<MisCausasStatsTab />
					<Divider sx={{ my: 3 }} />
					<CausasUpdateStatsTab />
				</TabPanel>
				<TabPanel value={activeTab} index={5}>
					<MisCausasHelpTab />
				</TabPanel>
			</Box>
		</Stack>
	);
};

export default MisCausasWorker;
