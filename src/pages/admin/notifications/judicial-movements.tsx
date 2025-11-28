import React, { useState } from "react";
import { Grid, Tab, Tabs, Box, Typography } from "@mui/material";
import { Setting2, DocumentText } from "iconsax-react";
import MainCard from "components/MainCard";
import JudicialMovementsConfig from "./components/JudicialMovementsConfig";
import JudicialMovementsList from "./components/JudicialMovementsList";

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
			id={`judicial-movements-tabpanel-${index}`}
			aria-labelledby={`judicial-movements-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
}

function a11yProps(index: number) {
	return {
		id: `judicial-movements-tab-${index}`,
		"aria-controls": `judicial-movements-tabpanel-${index}`,
	};
}

const JudicialMovementsPage = () => {
	const [activeTab, setActiveTab] = useState(0);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	return (
		<MainCard title="Movimientos Judiciales">
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Grid item xs={12}>
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							aria-label="judicial movements tabs"
							variant="scrollable"
							scrollButtons="auto"
						>
							<Tab icon={<DocumentText size={20} />} iconPosition="start" label="Listado de Movimientos" {...a11yProps(0)} />
							<Tab icon={<Setting2 size={20} />} iconPosition="start" label="Configuración" {...a11yProps(1)} />
						</Tabs>
					</Box>
				</Grid>

				<Grid item xs={12}>
					<TabPanel value={activeTab} index={0}>
						<JudicialMovementsList />
					</TabPanel>
					<TabPanel value={activeTab} index={1}>
						<JudicialMovementsConfig />
					</TabPanel>
				</Grid>
			</Grid>
		</MainCard>
	);
};

export default JudicialMovementsPage;
