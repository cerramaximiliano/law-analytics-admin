import { useState } from "react";
import { Box, Paper, Stack, Tab, Tabs, Typography, alpha, useTheme } from "@mui/material";
import { Activity, CpuSetting, DocumentText, InfoCircle, Setting3 } from "iconsax-react";
import MainCard from "components/MainCard";
import WorkerStatusTab from "./WorkerStatusTab";
import StatsTab from "./StatsTab";
import ConfigTab from "./ConfigTab";
import HelpTab from "./HelpTab";

const InfolegWorkersPage = () => {
	const theme = useTheme();
	const [tab, setTab] = useState("status");

	const tabs = [
		{ value: "status", label: "Estado / Control", icon: <CpuSetting size={18} /> },
		{ value: "stats", label: "Estadísticas", icon: <Activity size={18} /> },
		{ value: "config", label: "Configuración", icon: <Setting3 size={18} /> },
		{ value: "help", label: "Ayuda", icon: <InfoCircle size={18} /> },
	];

	return (
		<MainCard>
			<Stack spacing={2.5}>
				<Box>
					<Typography variant="h3" gutterBottom>
						Workers Infoleg
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Scraper de normas jurídicas argentinas — <strong>infoleg.gob.ar</strong>. Procesa leyes, decretos y resoluciones de forma
						secuencial por ID numérico.
					</Typography>
				</Box>

				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box
						sx={{
							borderBottom: 1,
							borderColor: "divider",
							bgcolor: alpha(theme.palette.primary.main, 0.02),
						}}
					>
						<Tabs
							value={tab}
							onChange={(_, v) => setTab(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={{ "& .MuiTab-root": { textTransform: "none", minHeight: 48, fontWeight: 500 } }}
						>
							{tabs.map((t) => (
								<Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" />
							))}
						</Tabs>
					</Box>

					<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
						{tab === "status" && <WorkerStatusTab />}
						{tab === "stats" && <StatsTab />}
						{tab === "config" && <ConfigTab />}
						{tab === "help" && <HelpTab />}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
};

export default InfolegWorkersPage;
