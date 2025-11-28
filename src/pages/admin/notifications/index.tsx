import React from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
	Grid,
	Tab,
	Tabs,
	Box,
	Button,
	Stack,
	Typography,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Alert,
	CircularProgress,
} from "@mui/material";
import {
	Notification,
	Timer1,
	NotificationStatus,
	InfoCircle,
	NotificationBing,
	Refresh,
	Calendar,
	TaskSquare,
	DocumentText,
	Trash,
} from "iconsax-react";
import MainCard from "components/MainCard";
import { RootState } from "store";
import notificationMonitoringService from "services/notificationMonitoringService";
import UpcomingNotifications from "./components/UpcomingNotifications";
import NotificationHistory from "./components/NotificationHistory";
import NotificationSummary from "./components/NotificationSummary";
import FailedNotifications from "./components/FailedNotifications";
import AlertManagement from "./components/AlertManagement";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";
import notificationAxios from "utils/notificationAxios";

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
			id={`notification-tabpanel-${index}`}
			aria-labelledby={`notification-tab-${index}`}
			{...other}
		>
			{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
		</div>
	);
}

function a11yProps(index: number) {
	return {
		id: `notification-tab-${index}`,
		"aria-controls": `notification-tabpanel-${index}`,
	};
}

const NotificationMonitoring = () => {
	const [activeTab, setActiveTab] = useState(0);
	const [refreshKey, setRefreshKey] = useState(0);
	const [cronDialog, setCronDialog] = useState<{ open: boolean; type: string | null }>({ open: false, type: null });
	const [loading, setLoading] = useState(false);

	const { upcomingEvents, upcomingTasks, upcomingMovements, pendingAlerts } = useSelector(
		(state: RootState) => state.notificationMonitoring,
	);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	const handleRefresh = () => {
		setRefreshKey((prev) => prev + 1);
	};

	const handleOpenCronDialog = (type: string) => {
		setCronDialog({ open: true, type });
	};

	const handleCloseCronDialog = () => {
		setCronDialog({ open: false, type: null });
	};

	const handleExecuteCron = async () => {
		if (!cronDialog.type) return;

		setLoading(true);
		try {
			const response = await notificationAxios.post("/api/monitoring/cron/execute", {
				jobType: cronDialog.type,
			});

			if (response.data && response.data.success) {
				dispatch(
					openSnackbar({
						open: true,
						message: `Cron job de ${getCronTypeName(cronDialog.type)} ejecutado exitosamente`,
						variant: "success",
						alert: { color: "success" },
						close: false,
					}),
				);
				handleRefresh();
			} else {
				throw new Error(response.data?.message || "Error al ejecutar el cron job");
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al ejecutar el cron job";
			dispatch(
				openSnackbar({
					open: true,
					message: errorMessage,
					variant: "error",
					alert: { color: "error" },
					close: false,
				}),
			);
		} finally {
			setLoading(false);
			handleCloseCronDialog();
		}
	};

	const getCronTypeName = (type: string) => {
		const names: Record<string, string> = {
			calendar: "Calendario",
			tasks: "Tareas",
			movements: "Movimientos",
			clearLogs: "Limpieza de Logs",
		};
		return names[type] || type;
	};

	const getCronTypeDescription = (type: string) => {
		const descriptions: Record<string, string> = {
			calendar: "Se procesarán todos los eventos del calendario y se enviarán las notificaciones correspondientes a los usuarios.",
			tasks: "Se procesarán todas las tareas pendientes y se enviarán las notificaciones correspondientes a los usuarios asignados.",
			movements: "Se procesarán todos los movimientos registrados y se enviarán las notificaciones correspondientes.",
			clearLogs: "Se eliminarán los logs antiguos del sistema para liberar espacio y mantener el rendimiento óptimo.",
		};
		return descriptions[type] || "";
	};

	useEffect(() => {
		// Load initial data
		const loadInitialData = async () => {
			console.log("🚀 Loading notification monitoring data...");
			console.log("  - RefreshKey:", refreshKey);

			try {
				await Promise.all([
					notificationMonitoringService.getAllUpcoming({ limit: 100 }),
					notificationMonitoringService.getPendingAlerts({ limit: 100 }),
					notificationMonitoringService.getNotificationSummary(),
				]);
				console.log("✅ All notification data loaded successfully");
			} catch (error) {
				console.error("❌ Error loading notification data:", error);
			}
		};

		loadInitialData();
	}, [refreshKey]);

	// Calculate total upcoming notifications
	const totalUpcoming =
		(upcomingEvents.data?.length || 0) +
		(upcomingTasks.data?.length || 0) +
		(upcomingMovements.data?.length || 0) +
		(pendingAlerts.data?.length || 0);

	return (
		<MainCard title="Monitoreo de Notificaciones">
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Grid item xs={12}>
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							aria-label="notification monitoring tabs"
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTabs-scrollButtons": {
									"&.Mui-disabled": {
										opacity: 0.3,
									},
								},
							}}
						>
							<Tab
								icon={<Notification size={20} />}
								iconPosition="start"
								label={`Notificaciones Próximas (${totalUpcoming})`}
								{...a11yProps(0)}
							/>
							<Tab icon={<Timer1 size={20} />} iconPosition="start" label="Historial de Notificaciones" {...a11yProps(1)} />
							<Tab icon={<NotificationStatus size={20} />} iconPosition="start" label="Resumen Estadístico" {...a11yProps(2)} />
							<Tab icon={<InfoCircle size={20} />} iconPosition="start" label="Notificaciones Fallidas" {...a11yProps(3)} />
							<Tab icon={<NotificationBing size={20} />} iconPosition="start" label="Gestión de Alertas" {...a11yProps(4)} />
							<Tab icon={<Refresh size={20} />} iconPosition="start" label="Ejecución Manual" {...a11yProps(5)} />
						</Tabs>
					</Box>
				</Grid>

				<Grid item xs={12}>
					<TabPanel value={activeTab} index={0}>
						<UpcomingNotifications onRefresh={handleRefresh} />
					</TabPanel>
					<TabPanel value={activeTab} index={1}>
						<NotificationHistory />
					</TabPanel>
					<TabPanel value={activeTab} index={2}>
						<NotificationSummary />
					</TabPanel>
					<TabPanel value={activeTab} index={3}>
						<FailedNotifications />
					</TabPanel>
					<TabPanel value={activeTab} index={4}>
						<AlertManagement />
					</TabPanel>
					<TabPanel value={activeTab} index={5}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12}>
								<Alert severity="warning" sx={{ mb: 3 }}>
									<Typography variant="body2" fontWeight="bold" gutterBottom>
										Advertencia: Ejecución Manual de Tareas
									</Typography>
									<Typography variant="body2">
										Estas acciones ejecutarán inmediatamente las tareas programadas del sistema, lo que puede resultar en:
									</Typography>
									<ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
										<li>Envío masivo de correos electrónicos</li>
										<li>Generación de múltiples notificaciones push</li>
										<li>Creación de alertas en el sistema</li>
										<li>Consumo de recursos del servidor</li>
									</ul>
									<Typography variant="body2">Use estas funciones con precaución y solo cuando sea necesario.</Typography>
								</Alert>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<MainCard>
									<Stack spacing={2} alignItems="center">
										<Calendar size={48} color="#1890ff" />
										<Typography variant="h5" align="center">
											Sincronizar Calendario
										</Typography>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ minHeight: 60 }}>
											Procesa todos los eventos del calendario y envía notificaciones de recordatorio
										</Typography>
										<Button
											fullWidth
											variant="contained"
											color="primary"
											onClick={() => handleOpenCronDialog("calendar")}
											startIcon={<Refresh />}
										>
											Ejecutar
										</Button>
									</Stack>
								</MainCard>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<MainCard>
									<Stack spacing={2} alignItems="center">
										<TaskSquare size={48} color="#52c41a" />
										<Typography variant="h5" align="center">
											Sincronizar Tareas
										</Typography>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ minHeight: 60 }}>
											Procesa todas las tareas pendientes y envía notificaciones a los usuarios asignados
										</Typography>
										<Button
											fullWidth
											variant="contained"
											color="success"
											onClick={() => handleOpenCronDialog("tasks")}
											startIcon={<Refresh />}
										>
											Ejecutar
										</Button>
									</Stack>
								</MainCard>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<MainCard>
									<Stack spacing={2} alignItems="center">
										<DocumentText size={48} color="#fa8c16" />
										<Typography variant="h5" align="center">
											Sincronizar Movimientos
										</Typography>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ minHeight: 60 }}>
											Procesa todos los movimientos registrados y envía las notificaciones correspondientes
										</Typography>
										<Button
											fullWidth
											variant="contained"
											color="warning"
											onClick={() => handleOpenCronDialog("movements")}
											startIcon={<Refresh />}
										>
											Ejecutar
										</Button>
									</Stack>
								</MainCard>
							</Grid>

							<Grid item xs={12} md={6} lg={3}>
								<MainCard>
									<Stack spacing={2} alignItems="center">
										<Trash size={48} color="#ff4d4f" />
										<Typography variant="h5" align="center">
											Limpiar Logs
										</Typography>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ minHeight: 60 }}>
											Elimina registros antiguos del sistema para mantener el rendimiento óptimo
										</Typography>
										<Button
											fullWidth
											variant="contained"
											color="error"
											onClick={() => handleOpenCronDialog("clearLogs")}
											startIcon={<Refresh />}
										>
											Ejecutar
										</Button>
									</Stack>
								</MainCard>
							</Grid>
						</Grid>
					</TabPanel>
				</Grid>
			</Grid>

			{/* Dialog de confirmación */}
			<Dialog open={cronDialog.open} onClose={handleCloseCronDialog} maxWidth="sm" fullWidth>
				<DialogTitle>Confirmar Ejecución Manual</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography variant="body1" paragraph>
							¿Está seguro que desea ejecutar manualmente el cron job de <strong>{getCronTypeName(cronDialog.type || "")}</strong>?
						</Typography>
						<Alert severity="info" sx={{ mt: 2 }}>
							{getCronTypeDescription(cronDialog.type || "")}
						</Alert>
						{cronDialog.type !== "clearLogs" && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								Esta acción puede generar múltiples notificaciones y correos electrónicos a los usuarios.
							</Alert>
						)}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseCronDialog} disabled={loading}>
						Cancelar
					</Button>
					<Button onClick={handleExecuteCron} variant="contained" color="primary" disabled={loading}>
						{loading ? <CircularProgress size={20} /> : "Ejecutar"}
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default NotificationMonitoring;
