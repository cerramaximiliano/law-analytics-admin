import React from "react";
import { useState, useEffect } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TablePagination,
	TextField,
	MenuItem,
	Box,
	Chip,
	Avatar,
	Typography,
	CircularProgress,
	Alert,
	Grid,
	Tabs,
	Tab,
} from "@mui/material";
import { Notification, TaskSquare, CalendarRemove, TableDocument, Message, NotificationBing, TickCircle } from "iconsax-react";
import dayjs from "utils/dayjs-config";
import notificationMonitoringService from "services/notificationMonitoringService";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import { useSelector } from "store";
import { RootState } from "store";

const NotificationHistory = () => {
	// Estado para el tab activo
	const [activeTab, setActiveTab] = useState(0);

	// Estado para alertas entregadas
	const [alertsPage, setAlertsPage] = useState(0);
	const [alertsRowsPerPage, setAlertsRowsPerPage] = useState(25);
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [filterSourceType, setFilterSourceType] = useState<string>("all");
	const [alertsStartDate, setAlertsStartDate] = useState<Date | null>(null);
	const [alertsEndDate, setAlertsEndDate] = useState<Date | null>(null);
	const [alertsLoading, setAlertsLoading] = useState(false);
	const [alerts, setAlerts] = useState<any[]>([]);
	const [alertsTotalCount, setAlertsTotalCount] = useState(0);
	const [alertsError, setAlertsError] = useState<string | null>(null);

	// Estado para historial de notificaciones
	const [historyPage, setHistoryPage] = useState(0);
	const [historyRowsPerPage, setHistoryRowsPerPage] = useState(25);
	const [filterType, setFilterType] = useState<string>("all");
	const [filterMethod, setFilterMethod] = useState<string>("all");
	const [filterHistoryStatus, setFilterHistoryStatus] = useState<string>("all");
	const [historyStartDate, setHistoryStartDate] = useState<Date | null>(null);
	const [historyEndDate, setHistoryEndDate] = useState<Date | null>(null);

	// Obtener datos del historial desde Redux
	const { history } = useSelector((state: RootState) => state.notificationMonitoring);

	useEffect(() => {
		loadAlerts();
	}, [alertsPage, alertsRowsPerPage, filterStatus, filterSourceType, alertsStartDate, alertsEndDate]);

	useEffect(() => {
		loadHistory();
	}, [historyPage, historyRowsPerPage, filterType, filterMethod, filterHistoryStatus, historyStartDate, historyEndDate]);

	const loadAlerts = async () => {
		try {
			setAlertsLoading(true);
			setAlertsError(null);

			const params: any = {
				page: alertsPage + 1,
				limit: alertsRowsPerPage,
			};

			if (filterStatus !== "all") {
				params.read = filterStatus === "read";
			}

			if (filterSourceType !== "all") {
				params.sourceType = filterSourceType;
			}

			if (alertsStartDate) {
				params.startDate = dayjs(alertsStartDate).format("YYYY-MM-DD");
			}

			if (alertsEndDate) {
				params.endDate = dayjs(alertsEndDate).format("YYYY-MM-DD");
			}

			const response = await notificationMonitoringService.getDeliveredAlerts(params);

			if (response.success) {
				setAlerts(response.data || []);
				setAlertsTotalCount(response.pagination?.total || 0);
			}
		} catch (error) {
			console.error("Error loading alerts:", error);
			setAlertsError("Error al cargar las alertas entregadas");
		} finally {
			setAlertsLoading(false);
		}
	};

	const loadHistory = async () => {
		try {
			const params: any = {
				page: historyPage + 1,
				limit: historyRowsPerPage,
			};

			if (filterType !== "all") {
				params.type = filterType;
			}

			if (filterHistoryStatus !== "all") {
				params.status = filterHistoryStatus;
			}

			if (filterMethod !== "all") {
				params.method = filterMethod;
			}

			if (historyStartDate) {
				params.startDate = dayjs(historyStartDate).format("YYYY-MM-DD");
			}

			if (historyEndDate) {
				params.endDate = dayjs(historyEndDate).format("YYYY-MM-DD");
			}

			await notificationMonitoringService.getNotificationHistory(params);
		} catch (error) {
			console.error("Error loading history:", error);
		}
	};

	const handleAlertsChangePage = (_event: unknown, newPage: number) => {
		setAlertsPage(newPage);
	};

	const handleAlertsChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setAlertsRowsPerPage(parseInt(event.target.value, 10));
		setAlertsPage(0);
	};

	const handleHistoryChangePage = (_event: unknown, newPage: number) => {
		setHistoryPage(newPage);
	};

	const handleHistoryChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setHistoryRowsPerPage(parseInt(event.target.value, 10));
		setHistoryPage(0);
	};

	const getSourceTypeLabel = (type: string) => {
		switch (type) {
			case "event":
				return "Evento";
			case "task":
				return "Tarea";
			case "movement":
				return "Movimiento";
			case "system":
				return "Sistema";
			case "marketing":
				return "Marketing";
			case "custom":
				return "Personalizada";
			default:
				return "Otro";
		}
	};

	const getSourceTypeColor = (type: string) => {
		switch (type) {
			case "event":
				return "primary";
			case "task":
				return "warning";
			case "movement":
				return "success";
			case "system":
				return "info";
			case "marketing":
				return "secondary";
			case "custom":
				return "error";
			default:
				return "default";
		}
	};

	const getSourceTypeIcon = (type: string) => {
		switch (type) {
			case "event":
				return <CalendarRemove size={16} />;
			case "task":
				return <TaskSquare size={16} />;
			case "movement":
				return <TableDocument size={16} />;
			default:
				return <Notification size={16} />;
		}
	};

	const getTypeLabel = (type: string) => {
		const normalizedType = type?.trim().toLowerCase() || "";
		switch (normalizedType) {
			case "event":
			case "evento":
				return "Evento";
			case "task":
			case "tarea":
				return "Tarea";
			case "movement":
			case "movimiento":
				return "Movimiento";
			case "alert":
			case "alerta":
				return "Alerta";
			default:
				return "Otro";
		}
	};

	const getTypeColor = (type: string) => {
		const normalizedType = type?.trim().toLowerCase() || "";
		switch (normalizedType) {
			case "event":
			case "evento":
				return "primary";
			case "task":
			case "tarea":
				return "warning";
			case "movement":
			case "movimiento":
				return "success";
			case "alert":
			case "alerta":
				return "error";
			default:
				return "default";
		}
	};

	const getMethodIcon = (method: string) => {
		return method === "email" ? <Message size={16} /> : <NotificationBing size={16} />;
	};

	const formatDate = (date: string) => {
		try {
			const dateObj = new Date(date);
			if (isNaN(dateObj.getTime())) {
				return "Fecha no disponible";
			}
			return dayjs(dateObj).format("DD/MM/YYYY HH:mm");
		} catch (error) {
			return "Fecha no disponible";
		}
	};

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	return (
		<Box>
			{/* Cards de resumen */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={12} sm={6} md={3}>
					<Paper elevation={1} sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Avatar sx={{ bgcolor: "primary.light", width: 48, height: 48 }}>
								<Notification size={24} />
							</Avatar>
							<Box>
								<Typography variant="h6">{alertsTotalCount}</Typography>
								<Typography variant="body2" color="text.secondary">
									Alertas Entregadas
								</Typography>
							</Box>
						</Box>
					</Paper>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Paper elevation={1} sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Avatar sx={{ bgcolor: "success.light", width: 48, height: 48 }}>
								<TickCircle size={24} />
							</Avatar>
							<Box>
								<Typography variant="h6">{alerts.filter((a) => a.read).length}</Typography>
								<Typography variant="body2" color="text.secondary">
									Alertas Leídas
								</Typography>
							</Box>
						</Box>
					</Paper>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Paper elevation={1} sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Avatar sx={{ bgcolor: "warning.light", width: 48, height: 48 }}>
								<NotificationBing size={24} />
							</Avatar>
							<Box>
								<Typography variant="h6">{alerts.filter((a) => !a.read).length}</Typography>
								<Typography variant="body2" color="text.secondary">
									Alertas No Leídas
								</Typography>
							</Box>
						</Box>
					</Paper>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Paper elevation={1} sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Avatar sx={{ bgcolor: "info.light", width: 48, height: 48 }}>
								<TableDocument size={24} />
							</Avatar>
							<Box>
								<Typography variant="h6">{history.pagination?.total || 0}</Typography>
								<Typography variant="body2" color="text.secondary">
									Total Notificaciones
								</Typography>
							</Box>
						</Box>
					</Paper>
				</Grid>
			</Grid>

			<Paper elevation={0} sx={{ mb: 3 }}>
				<Tabs
					value={activeTab}
					onChange={handleTabChange}
					aria-label="Historial de notificaciones"
					textColor="primary"
					indicatorColor="primary"
					sx={{ borderBottom: 1, borderColor: "divider" }}
				>
					<Tab label="Alertas Entregadas" icon={<Notification size={20} />} iconPosition="start" sx={{ minHeight: 48 }} />
					<Tab label="Historial de Notificaciones" icon={<NotificationBing size={20} />} iconPosition="start" sx={{ minHeight: 48 }} />
				</Tabs>
			</Paper>

			{/* Panel de Alertas Entregadas */}
			{activeTab === 0 && (
				<Box>
					<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
						<Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
							<TextField
								select
								label="Tipo de origen"
								value={filterSourceType}
								onChange={(e) => setFilterSourceType(e.target.value)}
								size="small"
								sx={{ minWidth: 200 }}
							>
								<MenuItem value="all">Todas</MenuItem>
								<MenuItem value="event">Eventos</MenuItem>
								<MenuItem value="task">Tareas</MenuItem>
								<MenuItem value="movement">Movimientos</MenuItem>
								<MenuItem value="system">Sistema</MenuItem>
								<MenuItem value="marketing">Marketing</MenuItem>
								<MenuItem value="custom">Personalizadas</MenuItem>
							</TextField>

							<TextField
								select
								label="Estado"
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								size="small"
								sx={{ minWidth: 150 }}
							>
								<MenuItem value="all">Todas</MenuItem>
								<MenuItem value="read">Leídas</MenuItem>
								<MenuItem value="unread">No leídas</MenuItem>
							</TextField>

							<DatePicker
								label="Fecha inicio"
								value={alertsStartDate}
								onChange={setAlertsStartDate}
								slotProps={{
									textField: {
										size: "small",
									},
								}}
							/>

							<DatePicker
								label="Fecha fin"
								value={alertsEndDate}
								onChange={setAlertsEndDate}
								slotProps={{
									textField: {
										size: "small",
									},
								}}
							/>
						</Box>
					</LocalizationProvider>

					{alertsLoading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
							<CircularProgress />
						</Box>
					) : alertsError ? (
						<Alert severity="error" sx={{ mb: 2 }}>
							{alertsError}
						</Alert>
					) : (
						<TableContainer component={Paper} elevation={1}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Tipo</TableCell>
										<TableCell>Título</TableCell>
										<TableCell>Descripción</TableCell>
										<TableCell>Usuario</TableCell>
										<TableCell>Fecha de entrega</TableCell>
										<TableCell align="center">Estado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{alerts.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
												<Typography variant="body1" color="text.secondary">
													No hay alertas entregadas para mostrar
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										alerts.map((alert: any) => (
											<TableRow key={alert._id}>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
														{getSourceTypeIcon(alert.sourceType)}
														<Chip
															label={getSourceTypeLabel(alert.sourceType)}
															size="small"
															color={getSourceTypeColor(alert.sourceType) as any}
														/>
													</Box>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontWeight={500}>
														{alert.primaryText || "Alerta"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography
														variant="body2"
														sx={{
															maxWidth: 300,
															overflow: "hidden",
															textOverflow: "ellipsis",
															whiteSpace: "nowrap",
														}}
													>
														{alert.secondaryText}
													</Typography>
												</TableCell>
												<TableCell>
													<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
														<Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
															{alert.userId?.name ? alert.userId.name.charAt(0).toUpperCase() : "?"}
														</Avatar>
														<Box>
															<Typography variant="body2">{alert.userId?.name || "Usuario desconocido"}</Typography>
															<Typography variant="caption" color="text.secondary">
																{alert.userId?.email || "Sin email"}
															</Typography>
														</Box>
													</Box>
												</TableCell>
												<TableCell>{alert.deliveredAt ? formatDate(alert.deliveredAt) : formatDate(alert.createdAt)}</TableCell>
												<TableCell align="center">
													<Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
														<Chip label="Entregada" color="success" size="small" />
														{alert.read && <Chip label="Leída" color="info" size="small" variant="outlined" />}
													</Box>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
							<TablePagination
								rowsPerPageOptions={[10, 25, 50, 100]}
								component="div"
								count={alertsTotalCount}
								rowsPerPage={alertsRowsPerPage}
								page={alertsPage}
								onPageChange={handleAlertsChangePage}
								onRowsPerPageChange={handleAlertsChangeRowsPerPage}
								labelRowsPerPage="Filas por página"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</TableContainer>
					)}
				</Box>
			)}

			{/* Panel de Historial de Notificaciones */}
			{activeTab === 1 && (
				<Box>
					<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
						<Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
							<TextField
								select
								label="Tipo de notificación"
								value={filterType}
								onChange={(e) => setFilterType(e.target.value)}
								size="small"
								sx={{ minWidth: 200 }}
							>
								<MenuItem value="all">Todas</MenuItem>
								<MenuItem value="event">Eventos</MenuItem>
								<MenuItem value="task">Tareas</MenuItem>
								<MenuItem value="movement">Movimientos</MenuItem>
								<MenuItem value="alert">Alertas</MenuItem>
							</TextField>

							<TextField
								select
								label="Estado"
								value={filterHistoryStatus}
								onChange={(e) => setFilterHistoryStatus(e.target.value)}
								size="small"
								sx={{ minWidth: 150 }}
							>
								<MenuItem value="all">Todos</MenuItem>
								<MenuItem value="sent">Enviado</MenuItem>
								<MenuItem value="delivered">Entregado</MenuItem>
								<MenuItem value="failed">Fallido</MenuItem>
								<MenuItem value="pending">Pendiente</MenuItem>
								<MenuItem value="retry">Reintento</MenuItem>
							</TextField>

							<TextField
								select
								label="Método"
								value={filterMethod}
								onChange={(e) => setFilterMethod(e.target.value)}
								size="small"
								sx={{ minWidth: 150 }}
							>
								<MenuItem value="all">Todos</MenuItem>
								<MenuItem value="email">Email</MenuItem>
								<MenuItem value="browser">Navegador</MenuItem>
								<MenuItem value="webhook">Webhook</MenuItem>
								<MenuItem value="sms">SMS</MenuItem>
							</TextField>

							<DatePicker
								label="Fecha inicio"
								value={historyStartDate}
								onChange={setHistoryStartDate}
								slotProps={{
									textField: {
										size: "small",
									},
								}}
							/>

							<DatePicker
								label="Fecha fin"
								value={historyEndDate}
								onChange={setHistoryEndDate}
								slotProps={{
									textField: {
										size: "small",
									},
								}}
							/>
						</Box>
					</LocalizationProvider>

					{history.loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
							<CircularProgress />
						</Box>
					) : history.error ? (
						<Alert severity="error" sx={{ mb: 2 }}>
							{history.error}
						</Alert>
					) : (
						<TableContainer component={Paper} elevation={1}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Tipo</TableCell>
										<TableCell>Descripción</TableCell>
										<TableCell>Usuario</TableCell>
										<TableCell>Fecha de envío</TableCell>
										<TableCell>Método</TableCell>
										<TableCell align="center">Estado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{history.data.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
												<Typography variant="body1" color="text.secondary">
													No hay notificaciones para mostrar
												</Typography>
											</TableCell>
										</TableRow>
									) : (
										history.data.map((item: any, index: number) => {
											const itemType = item.entity?.type || item.type || "unknown";
											const entityTitle = item.entity?.title || item.entityTitle || `${itemType} ${item.entity?.id?.slice(-6) || ""}`;

											return (
												<TableRow key={`${item._id || `item-${index}`}`}>
													<TableCell>
														<Chip label={getTypeLabel(itemType)} size="small" color={getTypeColor(itemType) as any} />
													</TableCell>
													<TableCell>
														<Typography variant="body2">{entityTitle}</Typography>
													</TableCell>
													<TableCell>
														<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
															<Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
																{item.user?.name ? item.user.name.charAt(0).toUpperCase() : "?"}
															</Avatar>
															<Box>
																<Typography variant="body2">{item.user?.name || "Usuario desconocido"}</Typography>
																<Typography variant="caption" color="text.secondary">
																	{item.user?.email || "Sin email"}
																</Typography>
															</Box>
														</Box>
													</TableCell>
													<TableCell>{item.notification?.sentAt ? formatDate(item.notification.sentAt) : "Sin fecha"}</TableCell>
													<TableCell>
														<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
															{getMethodIcon(item.notification?.method || "browser")}
															<Typography variant="body2">{item.notification?.method === "email" ? "Email" : "Navegador"}</Typography>
														</Box>
													</TableCell>
													<TableCell align="center">
														<Chip
															label={item.notification?.status === "delivered" ? "Entregado" : "Enviado"}
															color={item.notification?.status === "delivered" ? "success" : "info"}
															size="small"
														/>
													</TableCell>
												</TableRow>
											);
										})
									)}
								</TableBody>
							</Table>
							<TablePagination
								rowsPerPageOptions={[10, 25, 50, 100]}
								component="div"
								count={history.pagination?.total || 0}
								rowsPerPage={historyRowsPerPage}
								page={historyPage}
								onPageChange={handleHistoryChangePage}
								onRowsPerPageChange={handleHistoryChangeRowsPerPage}
								labelRowsPerPage="Filas por página"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						</TableContainer>
					)}
				</Box>
			)}
		</Box>
	);
};

export default NotificationHistory;
