import React, { useState } from "react";
import { Box, Tab, Tabs, Typography, Paper, Stack, useTheme, alpha } from "@mui/material";
import { Setting2, InfoCircle } from "iconsax-react";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import UpdateMovimientosWorkerTab from "./UpdateMovimientosWorkerTab";

interface TabDef {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
}

const MovimientosWorkerPage = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("movimientos");

	const tabs: TabDef[] = [
		{
			label: "Update Movimientos",
			value: "movimientos",
			icon: <Setting2 size={20} />,
			component: <UpdateMovimientosWorkerTab />,
		},
	];

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Box>
					<Typography variant="h3">Worker Update Movimientos</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Scraping de nuevos movimientos judiciales en causas marcadas con update=true por el pipeline de novelty
					</Typography>
				</Box>

				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
						<Tabs
							value={activeTab}
							onChange={(_, v) => setActiveTab(v)}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 56,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
								},
							}}
						>
							{tabs.map((tab) => (
								<Tab
									key={tab.value}
									label={
										<Stack direction="row" spacing={1} alignItems="center">
											<Box sx={{ color: theme.palette.primary.main, display: "flex" }}>{tab.icon}</Box>
											<Typography variant="body2" fontWeight={500}>{tab.label}</Typography>
										</Stack>
									}
									value={tab.value}
								/>
							))}
						</Tabs>
					</Box>

					<Box sx={{ bgcolor: theme.palette.background.paper }}>
						{tabs.map((tab) => (
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

export default MovimientosWorkerPage;
