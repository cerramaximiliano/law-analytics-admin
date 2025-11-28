import React from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import {
	Grid,
	Card,
	CardContent,
	Typography,
	Box,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	IconButton,
	Tooltip,
	TextField,
	MenuItem,
	CircularProgress,
	Alert,
	Avatar,
	Collapse,
} from "@mui/material";
import { Calendar, Timer1, DollarCircle, Notification, Refresh, ArrowDown2, ArrowUp2 } from "iconsax-react";
import dayjs from "utils/dayjs-config";
import { RootState } from "store";
import notificationMonitoringService from "services/notificationMonitoringService";
import type { UpcomingEvent, UpcomingTask } from "types/notificationMonitoring";

interface Props {
	onRefresh: () => void;
}

type NotificationType = "all" | "events" | "tasks" | "movements" | "alerts";

const UpcomingNotifications = ({ onRefresh }: Props) => {
	const [filterType, setFilterType] = useState<NotificationType>("all");
	const [filterDays, setFilterDays] = useState<number>(7);
	const [expandedSections, setExpandedSections] = useState({
		events: true,
		tasks: true,
		movements: true,
		alerts: true,
	});

	const { upcomingEvents, upcomingTasks, upcomingMovements, pendingAlerts } = useSelector(
		(state: RootState) => state.notificationMonitoring,
	);

	const handleFilterDaysChange = async (days: number) => {
		setFilterDays(days);
		try {
			await notificationMonitoringService.getAllUpcoming({ days, limit: 100 });
		} catch (error) {
			console.error("Error updating filter:", error);
		}
	};

	const toggleSection = (section: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
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

	const getDaysText = (days: number) => {
		if (days === 0) return "Hoy";
		if (days === 1) return "Mañana";
		if (days < 0) return `Hace ${Math.abs(days)} días`;
		return `En ${days} días`;
	};

	const getStatusChip = (willBeNotified: boolean, wasNotified: boolean) => {
		if (wasNotified) {
			return <Chip label="Notificado" color="success" size="small" />;
		}
		if (willBeNotified) {
			return <Chip label="Pendiente" color="warning" size="small" />;
		}
		return <Chip label="No se notificará" color="default" size="small" />;
	};

	const isLoading = upcomingEvents.loading || upcomingTasks.loading || upcomingMovements.loading || pendingAlerts.loading;

	const hasError = upcomingEvents.error || upcomingTasks.error || upcomingMovements.error || pendingAlerts.error;

	return (
		<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Grid item xs={12}>
				<Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
					<TextField
						select
						label="Filtrar por tipo"
						value={filterType}
						onChange={(e) => setFilterType(e.target.value as NotificationType)}
						size="small"
						sx={{ minWidth: 200 }}
					>
						<MenuItem value="all">Todas las notificaciones</MenuItem>
						<MenuItem value="events">Solo eventos</MenuItem>
						<MenuItem value="tasks">Solo tareas</MenuItem>
						<MenuItem value="movements">Solo movimientos</MenuItem>
						<MenuItem value="alerts">Solo alertas</MenuItem>
					</TextField>

					<TextField
						select
						label="Días de anticipación"
						value={filterDays}
						onChange={(e) => handleFilterDaysChange(Number(e.target.value))}
						size="small"
						sx={{ minWidth: 150 }}
					>
						<MenuItem value={3}>3 días</MenuItem>
						<MenuItem value={7}>7 días</MenuItem>
						<MenuItem value={15}>15 días</MenuItem>
						<MenuItem value={30}>30 días</MenuItem>
					</TextField>

					<Box sx={{ flexGrow: 1 }} />

					<Tooltip title="Actualizar">
						<IconButton onClick={onRefresh} disabled={isLoading}>
							<Refresh />
						</IconButton>
					</Tooltip>
				</Box>
			</Grid>

			{hasError && (
				<Grid item xs={12}>
					<Alert severity="error">Error al cargar las notificaciones. Por favor, intente nuevamente.</Alert>
				</Grid>
			)}

			{isLoading && (
				<Grid item xs={12}>
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress />
					</Box>
				</Grid>
			)}

			{!isLoading && !hasError && (
				<>
					{/* Events Section */}
					{(filterType === "all" || filterType === "events") && upcomingEvents.data.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Box sx={{ display: "flex", alignItems: "center", mb: 2, cursor: "pointer" }} onClick={() => toggleSection("events")}>
										<Calendar size={24} color="#1976d2" />
										<Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
											Eventos Próximos ({upcomingEvents.data.length})
										</Typography>
										{expandedSections.events ? <ArrowUp2 /> : <ArrowDown2 />}
									</Box>
									<Collapse in={expandedSections.events}>
										<TableContainer component={Paper} variant="outlined">
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Título</TableCell>
														<TableCell>Fecha</TableCell>
														<TableCell>Usuario</TableCell>
														<TableCell>Notificar en</TableCell>
														<TableCell align="center">Estado</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{upcomingEvents.data.map((event: UpcomingEvent) => (
														<TableRow key={event._id}>
															<TableCell>
																<Typography variant="body2" fontWeight={500}>
																	{event.title}
																</Typography>
																<Typography variant="caption" color="text.secondary">
																	{event.description}
																</Typography>
															</TableCell>
															<TableCell>{formatDate(event.date)}</TableCell>
															<TableCell>
																<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
																	<Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
																		{event.user?.name ? event.user.name.charAt(0) : "?"}
																	</Avatar>
																	<Box>
																		<Typography variant="caption">{event.user?.name || "Usuario desconocido"}</Typography>
																		<Typography variant="caption" color="text.secondary" display="block">
																			{event.user?.email || "Sin email"}
																		</Typography>
																	</Box>
																</Box>
															</TableCell>
															<TableCell>
																<Chip
																	label={getDaysText(event.daysUntilEvent)}
																	size="small"
																	color={event.daysUntilEvent <= 3 ? "error" : "default"}
																/>
															</TableCell>
															<TableCell align="center">
																{getStatusChip(event.notificationConfig.willBeNotified, event.notificationConfig.wasNotifiedToday)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</Collapse>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Tasks Section */}
					{(filterType === "all" || filterType === "tasks") && upcomingTasks.data.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Box sx={{ display: "flex", alignItems: "center", mb: 2, cursor: "pointer" }} onClick={() => toggleSection("tasks")}>
										<Timer1 size={24} color="#ff9800" />
										<Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
											Tareas Próximas ({upcomingTasks.data.length})
										</Typography>
										{expandedSections.tasks ? <ArrowUp2 /> : <ArrowDown2 />}
									</Box>
									<Collapse in={expandedSections.tasks}>
										<TableContainer component={Paper} variant="outlined">
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Título</TableCell>
														<TableCell>Fecha de vencimiento</TableCell>
														<TableCell>Usuario</TableCell>
														<TableCell>Prioridad</TableCell>
														<TableCell>Vence en</TableCell>
														<TableCell align="center">Estado</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{upcomingTasks.data.map((task: UpcomingTask) => (
														<TableRow key={task._id}>
															<TableCell>
																<Typography variant="body2" fontWeight={500}>
																	{task.title}
																</Typography>
																<Typography variant="caption" color="text.secondary">
																	{task.description}
																</Typography>
															</TableCell>
															<TableCell>{formatDate(task.dueDate)}</TableCell>
															<TableCell>
																<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
																	<Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
																		{task.user?.name ? task.user.name.charAt(0) : "?"}
																	</Avatar>
																	<Box>
																		<Typography variant="caption">{task.user?.name || "Usuario desconocido"}</Typography>
																		<Typography variant="caption" color="text.secondary" display="block">
																			{task.user?.email || "Sin email"}
																		</Typography>
																	</Box>
																</Box>
															</TableCell>
															<TableCell>
																<Chip
																	label={task.priority}
																	size="small"
																	color={task.priority === "alta" ? "error" : task.priority === "media" ? "warning" : "default"}
																/>
															</TableCell>
															<TableCell>
																<Chip
																	label={getDaysText(task.daysUntilDue)}
																	size="small"
																	color={task.daysUntilDue <= 3 ? "error" : "default"}
																/>
															</TableCell>
															<TableCell align="center">
																{getStatusChip(task.notificationConfig.willBeNotified, task.notificationConfig.wasNotifiedToday)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</Collapse>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Movements Section */}
					{(filterType === "all" || filterType === "movements") && upcomingMovements.data.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Box sx={{ display: "flex", alignItems: "center", mb: 2, cursor: "pointer" }} onClick={() => toggleSection("movements")}>
										<DollarCircle size={24} color="#4caf50" />
										<Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
											Movimientos Próximos ({upcomingMovements.data.length})
										</Typography>
										{expandedSections.movements ? <ArrowUp2 /> : <ArrowDown2 />}
									</Box>
									<Collapse in={expandedSections.movements}>
										<TableContainer component={Paper} variant="outlined">
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Título</TableCell>
														<TableCell>Tipo de Movimiento</TableCell>
														<TableCell>Fecha de Vencimiento</TableCell>
														<TableCell>Usuario</TableCell>
														<TableCell>Expira en</TableCell>
														<TableCell align="center">Estado</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{upcomingMovements.data.map((movement: any) => (
														<TableRow key={movement._id}>
															<TableCell>
																<Typography variant="body2" fontWeight={500}>
																	{movement.title}
																</Typography>
																{movement.description && (
																	<Typography variant="caption" color="text.secondary">
																		{movement.description}
																	</Typography>
																)}
															</TableCell>
															<TableCell>
																<Chip
																	label={movement.movement}
																	size="small"
																	color={
																		movement.movement === "Evento"
																			? "primary"
																			: movement.movement === "Despacho"
																			? "secondary"
																			: movement.movement === "Cédula"
																			? "info"
																			: movement.movement === "Oficio"
																			? "warning"
																			: movement.movement === "Escrito-Actor"
																			? "success"
																			: movement.movement === "Escrito-Demandado"
																			? "error"
																			: "default"
																	}
																/>
															</TableCell>
															<TableCell>{formatDate(movement.dateExpiration)}</TableCell>
															<TableCell>
																<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
																	<Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
																		{movement.user?.name ? movement.user.name.charAt(0) : "?"}
																	</Avatar>
																	<Box>
																		<Typography variant="caption">{movement.user?.name || "Usuario desconocido"}</Typography>
																		<Typography variant="caption" color="text.secondary" display="block">
																			{movement.user?.email || "Sin email"}
																		</Typography>
																	</Box>
																</Box>
															</TableCell>
															<TableCell>
																<Chip
																	label={getDaysText(movement.daysUntilExpiration)}
																	size="small"
																	color={movement.daysUntilExpiration <= 3 ? "error" : "default"}
																/>
															</TableCell>
															<TableCell align="center">
																{getStatusChip(movement.notificationConfig.willBeNotified, movement.notificationConfig.wasNotifiedToday)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</Collapse>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* Alerts Section */}
					{(filterType === "all" || filterType === "alerts") && pendingAlerts.data.length > 0 && (
						<Grid item xs={12}>
							<Card>
								<CardContent>
									<Box sx={{ display: "flex", alignItems: "center", mb: 2, cursor: "pointer" }} onClick={() => toggleSection("alerts")}>
										<Notification size={24} color="#f44336" />
										<Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
											Alertas Pendientes ({pendingAlerts.data.length})
										</Typography>
										{expandedSections.alerts ? <ArrowUp2 /> : <ArrowDown2 />}
									</Box>
									<Collapse in={expandedSections.alerts}>
										<TableContainer component={Paper} variant="outlined">
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Título</TableCell>
														<TableCell>Descripción</TableCell>
														<TableCell>Usuario</TableCell>
														<TableCell>Carpeta</TableCell>
														<TableCell>Creada</TableCell>
														<TableCell align="center">Estado</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{pendingAlerts.data.map((alert: any) => (
														<TableRow key={alert._id}>
															<TableCell>
																<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
																	{alert.avatarIcon && (
																		<Box
																			sx={{
																				p: 0.5,
																				borderRadius: 1,
																				bgcolor: "primary.lighter",
																				display: "flex",
																				alignItems: "center",
																			}}
																		>
																			<Typography variant="caption" color="primary">
																				{alert.avatarIcon}
																			</Typography>
																		</Box>
																	)}
																	<Typography variant="body2" fontWeight={500}>
																		{alert.primaryText || "Alerta"}
																	</Typography>
																</Box>
															</TableCell>
															<TableCell>
																<Typography variant="caption" sx={{ display: "block" }}>
																	{alert.secondaryText}
																</Typography>
																{alert.actionText && (
																	<Typography variant="caption" color="primary" sx={{ cursor: "pointer" }}>
																		{alert.actionText}
																	</Typography>
																)}
															</TableCell>
															<TableCell>
																<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
																	<Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
																		{alert.userId?.name ? alert.userId.name.charAt(0) : "?"}
																	</Avatar>
																	<Box>
																		<Typography variant="caption">{alert.userId?.name || "Usuario desconocido"}</Typography>
																		<Typography variant="caption" color="text.secondary" display="block">
																			{alert.userId?.email || "Sin email"}
																		</Typography>
																	</Box>
																</Box>
															</TableCell>
															<TableCell>
																<Typography variant="caption">
																	{alert.folderId ? `Carpeta ${alert.folderId.slice(-6)}` : "Sin carpeta"}
																</Typography>
															</TableCell>
															<TableCell>{formatDate(alert.createdAt)}</TableCell>
															<TableCell align="center">
																<Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
																	<Chip
																		label={alert.delivered ? "Entregada" : "Pendiente"}
																		color={alert.delivered ? "success" : "warning"}
																		size="small"
																	/>
																	{alert.read && <Chip label="Leída" color="info" size="small" variant="outlined" />}
																</Box>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</Collapse>
								</CardContent>
							</Card>
						</Grid>
					)}

					{/* No data message */}
					{upcomingEvents.data.length === 0 &&
						upcomingTasks.data.length === 0 &&
						upcomingMovements.data.length === 0 &&
						pendingAlerts.data.length === 0 && (
							<Grid item xs={12}>
								<Alert severity="info">No hay notificaciones próximas para los próximos {filterDays} días.</Alert>
							</Grid>
						)}
				</>
			)}
		</Grid>
	);
};

export default UpcomingNotifications;
