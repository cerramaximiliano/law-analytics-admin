import React, { useState, useEffect } from "react";
import { Box, Typography, Stack, Alert, Button, Skeleton } from "@mui/material";
import { Setting2, People, Chart, MessageQuestion, Refresh, Notification } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerConfig, ScrapingManagerService } from "api/scrapingManager";
import { useTabIndexParam } from "hooks/useTabParam";
import WorkerSubTabs, { SubTabDef } from "./WorkerSubTabs";
import MisCausasManagerTab from "./MisCausasManagerTab";
import MisCausasWorkersTab from "./MisCausasWorkersTab";
import MisCausasStatsTab from "./MisCausasStatsTab";
import MisCausasHelpTab from "./MisCausasHelpTab";
import MisCausasBandejaTab from "./MisCausasBandejaTab";

const SUB_TABS = ["configuracion", "workers", "estadisticas", "bandeja", "ayuda"] as const;

const TAB_DEFS: SubTabDef[] = [
	{ label: "Configuración", icon: <Setting2 size={18} />, hint: "Config. global del manager" },
	{ label: "Workers", icon: <People size={18} />, hint: "Config. por worker" },
	{ label: "Estadísticas", icon: <Chart size={18} />, hint: "Estado y métricas del scraping" },
	{ label: "Bandeja", icon: <Notification size={18} />, hint: "Notificaciones y escritos" },
	{ label: "Ayuda", icon: <MessageQuestion size={18} />, hint: "Guía de uso de Mis Causas" },
];

const MisCausasScrapingWorker: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<ScrapingManagerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useTabIndexParam("tab", SUB_TABS);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const res = await ScrapingManagerService.getConfig();
			if (res.success) setConfig(res.data);
		} catch (error: any) {
			enqueueSnackbar("No se pudo obtener la configuración del manager", {
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

	if (loading) {
		return (
			<Stack spacing={2} sx={{ p: 3 }}>
				<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={150} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!config) {
		return (
			<Alert severity="error" variant="outlined" sx={{ m: 3 }}>
				<Typography variant="body2">
					No se pudo cargar la configuración del scraping manager. Verificá que la API esté disponible.
				</Typography>
			</Alert>
		);
	}

	return (
		<Box>
			<WorkerSubTabs value={activeTab} onChange={setActiveTab} tabs={TAB_DEFS} aria-label="Secciones de scraping" />

			<Box sx={{ p: { xs: 2, md: 3 } }}>
				<Stack spacing={2}>
					{/* Alertas de estado del manager: aplican a todas las secciones, van arriba de los tabs de contenido */}
					{!config.global.enabled && (
						<Alert severity="error" variant="outlined" sx={{ py: 1 }}>
							<Typography variant="body2">
								<strong>Manager apagado:</strong> todos los workers están detenidos.
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

					<Box display="flex" justifyContent="flex-end">
						<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
							Recargar config
						</Button>
					</Box>

					{activeTab === 0 && <MisCausasManagerTab config={config} onConfigUpdate={fetchConfig} />}
					{activeTab === 1 && <MisCausasWorkersTab config={config} onConfigUpdate={fetchConfig} />}
					{activeTab === 2 && <MisCausasStatsTab />}
					{activeTab === 3 && <MisCausasBandejaTab />}
					{activeTab === 4 && <MisCausasHelpTab />}
				</Stack>
			</Box>
		</Box>
	);
};

export default MisCausasScrapingWorker;
