import React, { useState } from "react";
import { Box, Chip, Tab, Tabs, Typography, Paper, Stack, useTheme, alpha } from "@mui/material";
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
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
						<Box>
							<Typography variant="h3">Worker Update (IA)</Typography>
							<Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
								Scraping de nuevos movimientos en causas marcadas por el pipeline de novelty — instancias dinámicas vía manager
							</Typography>
						</Box>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
							<Box
								component="span"
								sx={{
									display: "inline-flex",
									alignItems: "center",
									px: 1,
									py: 0.25,
									borderRadius: 1,
									bgcolor: theme.palette.grey[800],
									color: theme.palette.common.white,
									fontSize: "0.65rem",
									fontWeight: 500,
									fontFamily: "monospace",
									letterSpacing: "0.5px",
								}}
							>
								worker_01
							</Box>
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
								100.111.73.56
							</Box>
							<Chip
								label="sin Pinecone"
								size="small"
								color="default"
								variant="outlined"
								sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
							/>
							<Chip
								label="CausasCIV/CNT/CSS/COM · local"
								size="small"
								color="info"
								variant="outlined"
								sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
							/>
							<Chip
								label="manager + workers dinámicos"
								size="small"
								color="warning"
								variant="outlined"
								sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
							/>
						</Stack>
					</Stack>
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
											<Typography variant="body2" fontWeight={500}>
												{tab.label}
											</Typography>
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
