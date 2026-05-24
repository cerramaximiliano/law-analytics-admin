import React, { useState } from "react";
import { Box, Chip, Tab, Tabs, Typography, Paper, Stack, useTheme, alpha } from "@mui/material";
import { Setting2, InfoCircle } from "iconsax-react";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import UpdateMovimientosWorkerTab from "./UpdateMovimientosWorkerTab";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

interface TabDef {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
}

const MovimientosWorkerPage = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
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
					<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
						<Box sx={{ maxWidth: 720 }}>
							<Typography variant="h3" sx={{ mb: 0.75 }}>
								Worker Update (IA)
							</Typography>
							<Typography variant="body1" color="text.secondary">
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
									fontVariantNumeric: "tabular-nums",
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
									bgcolor: alpha(BRAND_BLUE, 0.1),
									color: BRAND_BLUE,
									fontSize: "0.6rem",
									fontWeight: 500,
									fontFamily: "monospace",
									fontVariantNumeric: "tabular-nums",
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
								variant="outlined"
								sx={{
									fontFamily: "monospace",
									fontSize: "0.72rem",
									color: BRAND_BLUE,
									borderColor: alpha(BRAND_BLUE, 0.4),
								}}
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

				<RepoBadgeGroup
					repos={[
						{
							localName: "pjn-workers-scraping",
							role: "Worker + Manager",
							description:
								"src/tasks/update-movimientos-manager.js (escala) + src/tasks/update-movimientos-worker.js (uno por fuero). PM2: pm2.update-movimientos.config.js. Lee config de configuracion-update-movimientos[-manager] en law_analytics.",
						},
						{
							localName: "pjn-api",
							role: "API config",
							description:
								"Endpoints /api/configuracion-update-movimientos/ y /manager (CRUD de la config que lee el worker). Controllers y rutas en src/controllers + src/routes.",
						},
					]}
				/>

				<Paper
					variant="outlined"
					sx={{ borderRadius: 2, overflow: "hidden", borderColor: headerBorder(isDark), boxShadow: "none" }}
				>
					<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.04 : 0.025) }}>
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
									transition: "color 200ms ease",
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
