import React, { useState } from "react";
import { Box, Tab, Tabs, Typography, Paper, Stack, useTheme, alpha } from "@mui/material";
import { Setting3, Chart, DollarSquare, InfoCircle, DocumentText, CpuSetting, Activity, MessageText } from "iconsax-react";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import WorkerControlTab from "./WorkerControlTab";
import WorkerStatsTab from "./WorkerStatsTab";
import WorkerPricingTab from "./WorkerPricingTab";
import WorkerIndexationTab from "./WorkerIndexationTab";
import WorkerPipelineTab from "./WorkerPipelineTab";
import WorkerAnalyticsTab from "./WorkerAnalyticsTab";
import WorkerHelpTab from "./WorkerHelpTab";
import ChatRagTab from "./ChatRagTab";
import ChatEditorTab from "./ChatEditorTab";

// ── Sub-tab wrappers ─────────────────────────────────────────────────────────

const MetricasTab = () => {
	const theme = useTheme();
	const [sub, setSub] = useState("stats");
	return (
		<Stack spacing={0}>
			<Tabs
				value={sub}
				onChange={(_, v) => setSub(v)}
				sx={{ borderBottom: 1, borderColor: "divider", mb: 2, "& .MuiTab-root": { textTransform: "none", minHeight: 40 } }}
			>
				<Tab value="stats" label="Estadísticas de Jobs" icon={<Chart size={16} />} iconPosition="start" />
				<Tab value="analytics" label="Analytics del Pipeline" icon={<Activity size={16} />} iconPosition="start" />
			</Tabs>
			{sub === "stats" && <WorkerStatsTab />}
			{sub === "analytics" && <WorkerAnalyticsTab />}
		</Stack>
	);
};

const ChatTab = () => {
	const [sub, setSub] = useState("rag");
	return (
		<Stack spacing={0}>
			<Tabs
				value={sub}
				onChange={(_, v) => setSub(v)}
				sx={{ borderBottom: 1, borderColor: "divider", mb: 2, "& .MuiTab-root": { textTransform: "none", minHeight: 40 } }}
			>
				<Tab value="rag" label="Chat RAG" icon={<MessageText size={16} />} iconPosition="start" />
				<Tab value="editor" label="Chat Editor" icon={<MessageText size={16} />} iconPosition="start" />
			</Tabs>
			{sub === "rag" && <ChatRagTab />}
			{sub === "editor" && <ChatEditorTab />}
		</Stack>
	);
};

// ── Page ─────────────────────────────────────────────────────────────────────

interface RagWorkerTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
}

const RagWorkersPage = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("control");

	const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
	};

	const tabs: RagWorkerTab[] = [
		{
			label: "Control de Workers",
			value: "control",
			icon: <Setting3 size={20} />,
			component: <WorkerControlTab />,
		},
		{
			label: "Métricas",
			value: "metricas",
			icon: <Chart size={20} />,
			component: <MetricasTab />,
		},
		{
			label: "Costos y Precios",
			value: "pricing",
			icon: <DollarSquare size={20} />,
			component: <WorkerPricingTab />,
		},
		{
			label: "Indexacion",
			value: "indexation",
			icon: <DocumentText size={20} />,
			component: <WorkerIndexationTab />,
		},
		{
			label: "Pipeline",
			value: "pipeline",
			icon: <CpuSetting size={20} />,
			component: <WorkerPipelineTab />,
		},
		{
			label: "Chat",
			value: "chat",
			icon: <MessageText size={20} />,
			component: <ChatTab />,
		},
		{
			label: "Ayuda",
			value: "help",
			icon: <InfoCircle size={20} />,
			component: <WorkerHelpTab />,
		},
	];

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Box>
					<Typography variant="h3">Workers RAG</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Indexación por causa, embeddings, resúmenes y OCR del sistema RAG por usuario
					</Typography>
				</Box>

				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
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

export default RagWorkersPage;
