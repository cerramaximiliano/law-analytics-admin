import React, { useState, useEffect } from "react";
import { Box, Typography, Stack, Tabs, Tab, Alert, Skeleton, useTheme } from "@mui/material";
import { Setting2, Clock, Chart, MessageQuestion } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";
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
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
		</div>
	);
}

const CausasUpdateWorker: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<CausasUpdateConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState(0);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const response = await CausasUpdateService.getConfig();
			if (response.success) {
				setConfig(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar("Error cargando configuración del worker de actualización", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	if (loading) {
		return (
			<Stack spacing={2} sx={{ p: 2 }}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!config) {
		return (
			<Alert severity="error" variant="outlined" sx={{ m: 2 }}>
				<Typography variant="body2">No se pudo cargar la configuración del worker de actualización de causas</Typography>
			</Alert>
		);
	}

	const tabs = [
		{ label: "Configuración", subtitle: "Config. general", icon: <Setting2 size={20} /> },
		{ label: "Historial", subtitle: "Runs de scraping", icon: <Clock size={20} /> },
		{ label: "Estadísticas", subtitle: "Estado en vivo", icon: <Chart size={20} /> },
		{ label: "Ayuda", subtitle: "Guía de uso", icon: <MessageQuestion size={20} /> },
	];

	return (
		<Stack spacing={2}>
			<Box>
				<Typography variant="h4" gutterBottom>
					Causas Update Worker
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Worker de actualización de movimientos de causas vinculadas a credenciales PJN (login SSO)
				</Typography>
			</Box>

			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: 1,
						borderColor: "divider",
						minWidth: { md: 200 },
						"& .MuiTab-root": {
							textTransform: "none",
							alignItems: "flex-start",
							minHeight: 64,
							px: 2,
						},
					}}
				>
					{tabs.map((tab, i) => (
						<Tab
							key={i}
							label={
								<Stack direction="row" spacing={1.5} alignItems="center">
									{tab.icon}
									<Box textAlign="left">
										<Typography variant="body2" fontWeight={500}>
											{tab.label}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{tab.subtitle}
										</Typography>
									</Box>
								</Stack>
							}
						/>
					))}
				</Tabs>

				<Box sx={{ flexGrow: 1 }}>
					<TabPanel value={activeTab} index={0}>
						<CausasUpdateConfigTab config={config} onConfigUpdate={fetchConfig} />
					</TabPanel>
					<TabPanel value={activeTab} index={1}>
						<CausasUpdateHistoryTab />
					</TabPanel>
					<TabPanel value={activeTab} index={2}>
						<CausasUpdateStatsTab />
					</TabPanel>
					<TabPanel value={activeTab} index={3}>
						<Stack spacing={2}>
							<Typography variant="h6">Guía del Worker de Actualización de Causas</Typography>
							<Alert severity="info" variant="outlined">
								<Typography variant="body2">
									Este worker actualiza los movimientos de TODAS las causas vinculadas a credenciales de usuario mediante login SSO al portal PJN.
									Usa un algoritmo de comparación por cantidad para detectar movimientos nuevos de forma eficiente.
								</Typography>
							</Alert>
							<Typography variant="subtitle1" fontWeight={600}>Flujo de ejecución</Typography>
							<Typography variant="body2" component="div">
								<ol style={{ margin: 0, paddingLeft: 20 }}>
									<li>Resume de runs interrumpidos anteriores</li>
									<li>Buscar causas con credenciales vinculadas agrupadas por credencial</li>
									<li>Por cada credencial: verificar threshold, esperar concurrencia, login SSO</li>
									<li>Por cada causa: buscar en portal, comparar movimientos, actualizar BD</li>
									<li>Registrar detalle del run para tracking y resume futuro</li>
								</ol>
							</Typography>
							<Typography variant="subtitle1" fontWeight={600}>Configuración</Typography>
							<Typography variant="body2">
								<strong>Thresholds:</strong> Controlan la frecuencia de actualización por causa y por credencial. El updateThresholdHours define cuántas horas deben pasar antes de volver a procesar una causa. minTimeBetweenRunsMinutes controla el intervalo mínimo entre runs de la misma credencial.
							</Typography>
							<Typography variant="body2">
								<strong>Concurrencia:</strong> Si waitForCausaCreation está habilitado, el worker espera a que termine el worker de creación de causas antes de procesar una credencial.
							</Typography>
							<Typography variant="body2">
								<strong>Resume:</strong> Si un run es interrumpido (error, shutdown), se retoma automáticamente en la próxima ejecución, procesando solo las causas que faltaron.
							</Typography>
						</Stack>
					</TabPanel>
				</Box>
			</Box>
		</Stack>
	);
};

export default CausasUpdateWorker;
