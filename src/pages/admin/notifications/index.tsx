import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Grid, Tab, Tabs } from "@mui/material";
import { Notification, Setting2, Judge, Truck, Calendar1, Gift, Diagram } from "iconsax-react";

// project-imports
import MainCard from "components/MainCard";
import { BRAND_BLUE } from "themes/dashboardTokens";

import MonitoringPanel from "./components/MonitoringPanel";
import JudicialMovementsConfig from "./components/JudicialMovementsConfig";
import UserRemindersInfo from "./components/UserRemindersInfo";
import useLiveJudicialConfig from "./components/useLiveJudicialConfig";
import JudicialMovementsList from "./components/JudicialMovementsList";
import NotificationFlowPage from "./notification-flow";
import FolderInactivityPanel from "./folder-inactivity";

// ----------------------------------------------------------------------
// Centro de notificaciones: un tab por área.
//
// Reemplaza la dispersión previa (monitoreo en una página, toda la
// configuración amontonada dentro de "Movimientos judiciales", y el esquema de
// flujo en una tercera). Las rutas viejas redirigen acá con ?tab=N.
// ----------------------------------------------------------------------

interface TabDef {
	key: string;
	label: string;
	icon: React.ReactElement;
}

const TABS: TabDef[] = [
	{ key: "monitoreo", label: "Monitoreo", icon: <Notification size={18} /> },
	{ key: "general", label: "General", icon: <Setting2 size={18} /> },
	{ key: "judicial", label: "Movimientos judiciales", icon: <Judge size={18} /> },
	{ key: "postal", label: "Seguimiento postal", icon: <Truck size={18} /> },
	{ key: "recordatorios", label: "Recordatorios del usuario", icon: <Calendar1 size={18} /> },
	{ key: "banners", label: "Banners y promociones", icon: <Gift size={18} /> },
	{ key: "diagnostico", label: "Diagnóstico", icon: <Diagram size={18} /> },
];

function TabPanel({ children, value, index }: { children?: React.ReactNode; value: number; index: number }) {
	return (
		<div role="tabpanel" hidden={value !== index} id={`notif-tabpanel-${index}`}>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
}

const NotificationsCenter = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [activeTab, setActiveTab] = useState(0);

	// Deep-link por índice (?tab=2) o por clave (?tab=judicial)
	useEffect(() => {
		const raw = searchParams.get("tab");
		if (!raw) return;
		const byKey = TABS.findIndex((t) => t.key === raw);
		const idx = byKey >= 0 ? byKey : Number.parseInt(raw, 10);
		if (Number.isInteger(idx) && idx >= 0 && idx < TABS.length) setActiveTab(idx);
	}, [searchParams]);

	const handleTabChange = (_e: React.SyntheticEvent, next: number) => {
		setActiveTab(next);
		setSearchParams({ tab: TABS[next].key }, { replace: true });
	};

	// Una sola suscripción a la config viva, compartida por los paneles que la usan.
	const live = useLiveJudicialConfig();

	return (
		<MainCard title="Notificaciones">
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Grid item xs={12}>
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							aria-label="secciones de notificaciones"
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": { textTransform: "none", fontWeight: 500, minHeight: 44 },
								"& .Mui-selected": { color: `${BRAND_BLUE} !important` },
								"& .MuiTabs-indicator": { backgroundColor: BRAND_BLUE, height: 3, borderRadius: 1.5 },
							}}
						>
							{TABS.map((t) => (
								<Tab key={t.key} icon={t.icon} iconPosition="start" label={t.label} />
							))}
						</Tabs>
					</Box>
				</Grid>

				<Grid item xs={12}>
					<TabPanel value={activeTab} index={0}>
						<MonitoringPanel />
					</TabPanel>
					<TabPanel value={activeTab} index={1}>
						<JudicialMovementsConfig section="general" />
					</TabPanel>
					<TabPanel value={activeTab} index={2}>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
							<JudicialMovementsConfig section="judicial" />
							<JudicialMovementsList />
						</Box>
					</TabPanel>
					<TabPanel value={activeTab} index={3}>
						<JudicialMovementsConfig section="postal" />
					</TabPanel>
					<TabPanel value={activeTab} index={4}>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
							<UserRemindersInfo live={live} />
							<FolderInactivityPanel embedded />
						</Box>
					</TabPanel>
					<TabPanel value={activeTab} index={5}>
						<JudicialMovementsConfig section="banners" />
					</TabPanel>
					<TabPanel value={activeTab} index={6}>
						<NotificationFlowPage embedded />
					</TabPanel>
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default NotificationsCenter;
