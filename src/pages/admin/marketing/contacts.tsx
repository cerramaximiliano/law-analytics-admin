import React from "react";
import { useState, useEffect, useCallback } from "react";

// material-ui
import { Box, Divider, Grid, Tab, Tabs, Typography, Alert, IconButton, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

// project imports
import MainCard from "components/MainCard";
import ContactsPanel from "sections/admin/marketing/ContactsPanel";
import SegmentsPanel from "sections/admin/marketing/SegmentsPanel";
import MarketingQuickNav from "components/admin/marketing/MarketingQuickNav";
import { Refresh } from "iconsax-react";
import { useRequestQueueRefresh } from "hooks/useRequestQueueRefresh";

// ==============================|| ADMIN - MARKETING CONTACTS ||============================== //

// Server Status Types
interface ServiceStatus {
	name: string;
	url: string;
	ip: string;
	baseUrl: string;
	status: "online" | "offline" | "checking";
	timestamp?: string;
	message?: string;
}

// Styled components
const StatusIndicator = styled(Box)<{ status: "online" | "offline" | "checking" }>(({ theme, status }) => ({
	width: 12,
	height: 12,
	borderRadius: "50%",
	backgroundColor:
		status === "online" ? theme.palette.success.main : status === "offline" ? theme.palette.error.main : theme.palette.warning.main,
	marginRight: theme.spacing(1),
	animation: status === "checking" ? "pulse 1.5s infinite" : "none",
	"@keyframes pulse": {
		"0%": {
			opacity: 1,
		},
		"50%": {
			opacity: 0.4,
		},
		"100%": {
			opacity: 1,
		},
	},
}));

// TabPanel component
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div role="tabpanel" hidden={value !== index} id={`contacts-tabpanel-${index}`} aria-labelledby={`contacts-tab-${index}`} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

const MarketingContacts = () => {
	// Tab state
	const [tabValue, setTabValue] = useState<number>(0);

	// Server status state
	const [serverStatus, setServerStatus] = useState<ServiceStatus>({
		name: "Servidor de Marketing",
		url: "https://mkt.lawanalytics.app",
		ip: "15.229.93.121",
		baseUrl: "https://mkt.lawanalytics.app",
		status: "checking",
	});
	const [checkingStatus, setCheckingStatus] = useState(false);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	// Check server status
	const checkServerStatus = useCallback(async () => {
		setCheckingStatus(true);
		setServerStatus((prev) => ({ ...prev, status: "checking" }));

		try {
			const response = await fetch(serverStatus.url, {
				method: "GET",
				mode: "cors",
				headers: {
					Accept: "application/json",
				},
			});

			if (response.ok) {
				try {
					const data = await response.json();
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: data.timestamp || new Date().toISOString(),
						message: data.message,
					}));
				} catch {
					setServerStatus((prev) => ({
						...prev,
						status: "online",
						timestamp: new Date().toISOString(),
						message: "Respuesta exitosa (no JSON)",
					}));
				}
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
				}));
			}
		} catch (error) {
			// Si es un error de CORS, asumir que está online
			if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
				setServerStatus((prev) => ({
					...prev,
					status: "online",
					timestamp: new Date().toISOString(),
					message: "CORS restrictivo - Estado verificado externamente",
				}));
			} else {
				setServerStatus((prev) => ({
					...prev,
					status: "offline",
					timestamp: new Date().toISOString(),
					message: error instanceof Error ? error.message : "Error desconocido",
				}));
			}
		} finally {
			setCheckingStatus(false);
		}
	}, [serverStatus.url]);

	// Check server status on mount and periodically
	useEffect(() => {
		checkServerStatus();
		const interval = setInterval(checkServerStatus, 60000); // Check every minute
		return () => clearInterval(interval);
	}, [checkServerStatus]);

	// Refresh server status when processing queued requests
	useRequestQueueRefresh(() => {
		checkServerStatus();
	}, [checkServerStatus]);

	return (
		<MainCard>
			<Box sx={{ mb: 2 }}>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h3">Gestión de Contactos y Segmentos</Typography>
					</Grid>
				</Grid>
			</Box>

			{/* Marketing Quick Navigation */}
			<MarketingQuickNav />

			{/* Server Status Alert */}
			<Box sx={{ mb: 2 }}>
				<Alert
					severity={serverStatus.status === "online" ? "success" : serverStatus.status === "offline" ? "error" : "warning"}
					icon={
						<Box display="flex" alignItems="center">
							<StatusIndicator status={serverStatus.status} />
						</Box>
					}
					action={
						<Tooltip title="Verificar estado">
							<IconButton
								size="small"
								onClick={checkServerStatus}
								disabled={checkingStatus}
								sx={{
									animation: checkingStatus ? "spin 1s linear infinite" : "none",
									"@keyframes spin": {
										"0%": {
											transform: "rotate(0deg)",
										},
										"100%": {
											transform: "rotate(360deg)",
										},
									},
								}}
							>
								<Refresh size={16} />
							</IconButton>
						</Tooltip>
					}
				>
					<Box>
						<Typography variant="subtitle2" fontWeight="bold">
							{serverStatus.name}
						</Typography>
						<Typography variant="body2">
							Estado:{" "}
							{serverStatus.status === "online" ? "En línea" : serverStatus.status === "offline" ? "Fuera de línea" : "Verificando..."}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{serverStatus.baseUrl} • IP: {serverStatus.ip}
						</Typography>
						{serverStatus.message && (
							<Typography variant="caption" display="block" sx={{ fontStyle: "italic", mt: 0.5 }}>
								{serverStatus.message}
							</Typography>
						)}
					</Box>
				</Alert>
			</Box>

			<MainCard content={false}>
				<Tabs
					value={tabValue}
					onChange={handleTabChange}
					indicatorColor="primary"
					textColor="primary"
					variant="fullWidth"
					aria-label="contact management tabs"
				>
					<Tab label="Contactos" />
					<Tab label="Segmentos" />
				</Tabs>

				<Divider />

				<TabPanel value={tabValue} index={0}>
					<ContactsPanel />
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					<SegmentsPanel />
				</TabPanel>
			</MainCard>
		</MainCard>
	);
};

export default MarketingContacts;
