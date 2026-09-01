import React, { useState, useEffect } from "react";
import { Box, Typography, Stack, Alert, Button, Skeleton } from "@mui/material";
import { RefreshSquare, Clock, Warning2, Chart, Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateConfig, CausasUpdateService } from "api/causasUpdate";
import { useTabIndexParam } from "hooks/useTabParam";
import WorkerSubTabs, { SubTabDef } from "./WorkerSubTabs";
import CausasUpdateConfigTab from "./CausasUpdateConfigTab";
import CausasUpdateHistoryTab from "./CausasUpdateHistoryTab";
import CausasUpdateStatsTab from "./CausasUpdateStatsTab";
import CausasUpdateIncidentsTab from "./CausasUpdateIncidentsTab";

const SUB_TABS = ["configuracion", "historial", "incidencias", "estadisticas"] as const;

const TAB_DEFS: SubTabDef[] = [
	{ label: "Configuración", icon: <RefreshSquare size={18} />, hint: "Thresholds y resume" },
	{ label: "Historial", icon: <Clock size={18} />, hint: "Runs de updates" },
	{ label: "Incidencias", icon: <Warning2 size={18} />, hint: "Errores con screenshot" },
	{ label: "Estadísticas", icon: <Chart size={18} />, hint: "Métricas de actualización" },
];

const MisCausasUpdatesWorker: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<CausasUpdateConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useTabIndexParam("tab", SUB_TABS);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const res = await CausasUpdateService.getConfig();
			if (res.success) setConfig(res.data);
		} catch (error: any) {
			enqueueSnackbar("No se pudo obtener la configuración de updates", {
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

	return (
		<Box>
			<WorkerSubTabs value={activeTab} onChange={setActiveTab} tabs={TAB_DEFS} aria-label="Secciones de actualización" />

			<Box sx={{ p: { xs: 2, md: 3 } }}>
				{activeTab === 0 &&
					(loading ? (
						<Stack spacing={2}>
							<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
							<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
						</Stack>
					) : config ? (
						<Stack spacing={2}>
							<Box display="flex" justifyContent="flex-end">
								<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
									Recargar config
								</Button>
							</Box>
							<CausasUpdateConfigTab config={config} onConfigUpdate={fetchConfig} />
						</Stack>
					) : (
						<Alert severity="error" variant="outlined">
							<Typography variant="body2">No se pudo cargar la configuración de updates.</Typography>
						</Alert>
					))}
				{activeTab === 1 && <CausasUpdateHistoryTab />}
				{activeTab === 2 && <CausasUpdateIncidentsTab />}
				{activeTab === 3 && <CausasUpdateStatsTab />}
			</Box>
		</Box>
	);
};

export default MisCausasUpdatesWorker;
