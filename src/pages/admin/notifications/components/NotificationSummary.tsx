import React from "react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Grid, Card, CardContent, Typography, Box, CircularProgress, Alert, LinearProgress } from "@mui/material";
import { Calendar, Timer1, DollarCircle, Notification } from "iconsax-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import dayjs from "utils/dayjs-config";
import { RootState } from "store";
import notificationMonitoringService from "services/notificationMonitoringService";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";

const COLORS = {
	events: "#1976d2",
	tasks: "#ff9800",
	movements: "#4caf50",
	alerts: "#f44336",
	email: "#673ab7",
	browser: "#009688",
};

const NotificationSummary = () => {
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	const { summary } = useSelector((state: RootState) => state.notificationMonitoring);

	useEffect(() => {
		loadSummary();
	}, [startDate, endDate]);

	const loadSummary = async () => {
		try {
			const params: any = {};

			if (startDate) {
				params.startDate = dayjs(startDate).format("YYYY-MM-DD");
			}

			if (endDate) {
				params.endDate = dayjs(endDate).format("YYYY-MM-DD");
			}

			await notificationMonitoringService.getNotificationSummary(params);
		} catch (error) {
			console.error("Error loading summary:", error);
		}
	};

	if (summary.loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (summary.error) {
		return (
			<Alert severity="error" sx={{ mb: 2 }}>
				{summary.error}
			</Alert>
		);
	}

	if (!summary.data) {
		return (
			<Alert severity="info" sx={{ mb: 2 }}>
				No hay datos disponibles.
			</Alert>
		);
	}

	const pieData = [
		{ name: "Eventos", value: summary.data.events.total, type: "events" },
		{ name: "Tareas", value: summary.data.tasks.total, type: "tasks" },
		{ name: "Movimientos", value: summary.data.movements.total, type: "movements" },
		{ name: "Alertas", value: summary.data.alerts.total, type: "alerts" },
	].filter((item) => item.value > 0);

	const barData = [
		{
			category: "Eventos",
			email: summary.data.events.byMethod.email,
			browser: summary.data.events.byMethod.browser,
		},
		{
			category: "Tareas",
			email: summary.data.tasks.byMethod.email,
			browser: summary.data.tasks.byMethod.browser,
		},
		{
			category: "Movimientos",
			email: summary.data.movements.byMethod.email,
			browser: summary.data.movements.byMethod.browser,
		},
	];

	const StatCard = ({ icon, title, value, color, subtitle }: any) => (
		<Card>
			<CardContent>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					<Box
						sx={{
							p: 1.5,
							borderRadius: 2,
							bgcolor: `${color}15`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{icon}
					</Box>
					<Box sx={{ flexGrow: 1 }}>
						<Typography variant="h4" fontWeight="bold">
							{value.toLocaleString()}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{title}
						</Typography>
						{subtitle && (
							<Typography variant="caption" color="text.secondary">
								{subtitle}
							</Typography>
						)}
					</Box>
				</Box>
			</CardContent>
		</Card>
	);

	return (
		<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Grid item xs={12}>
				<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
					<Box sx={{ display: "flex", gap: 2, mb: 3 }}>
						<DatePicker
							label="Fecha inicio"
							value={startDate}
							onChange={setStartDate}
							slotProps={{
								textField: {
									size: "small",
								},
							}}
						/>

						<DatePicker
							label="Fecha fin"
							value={endDate}
							onChange={setEndDate}
							slotProps={{
								textField: {
									size: "small",
								},
							}}
						/>
					</Box>
				</LocalizationProvider>

				{summary.data.period && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Período:{" "}
						{(() => {
							try {
								const startDate = new Date(summary.data.period.start);
								const endDate = new Date(summary.data.period.end);
								if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
									return "Período no disponible";
								}
								return `${dayjs(startDate).format("DD/MM/YYYY")} - ${dayjs(endDate).format("DD/MM/YYYY")}`;
							} catch {
								return "Período no disponible";
							}
						})()}
					</Typography>
				)}
			</Grid>

			<Grid item xs={12} md={3}>
				<StatCard
					icon={<Calendar size={24} color={COLORS.events} />}
					title="Eventos notificados"
					value={summary.data.events.total}
					color={COLORS.events}
					subtitle={`Email: ${summary.data.events.byMethod.email} | Navegador: ${summary.data.events.byMethod.browser}`}
				/>
			</Grid>

			<Grid item xs={12} md={3}>
				<StatCard
					icon={<Timer1 size={24} color={COLORS.tasks} />}
					title="Tareas notificadas"
					value={summary.data.tasks.total}
					color={COLORS.tasks}
					subtitle={`Email: ${summary.data.tasks.byMethod.email} | Navegador: ${summary.data.tasks.byMethod.browser}`}
				/>
			</Grid>

			<Grid item xs={12} md={3}>
				<StatCard
					icon={<DollarCircle size={24} color={COLORS.movements} />}
					title="Movimientos notificados"
					value={summary.data.movements.total}
					color={COLORS.movements}
					subtitle={`Email: ${summary.data.movements.byMethod.email} | Navegador: ${summary.data.movements.byMethod.browser}`}
				/>
			</Grid>

			<Grid item xs={12} md={3}>
				<StatCard
					icon={<Notification size={24} color={COLORS.alerts} />}
					title="Alertas"
					value={summary.data.alerts.total}
					color={COLORS.alerts}
					subtitle={`Entregadas: ${summary.data.alerts.delivered} | Pendientes: ${summary.data.alerts.pending}`}
				/>
			</Grid>

			<Grid item xs={12}>
				<Card>
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Total de Notificaciones
						</Typography>
						<Typography variant="h3" fontWeight="bold" color="primary" sx={{ mb: 2 }}>
							{summary.data.totalNotifications.toLocaleString()}
						</Typography>

						<Box sx={{ mb: 2 }}>
							<Typography variant="body2" color="text.secondary" gutterBottom>
								Tasa de entrega de alertas
							</Typography>
							<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<Box sx={{ flexGrow: 1 }}>
									<LinearProgress
										variant="determinate"
										value={(summary.data.alerts.delivered / summary.data.alerts.total) * 100}
										sx={{ height: 8, borderRadius: 1 }}
									/>
								</Box>
								<Typography variant="body2" fontWeight="medium">
									{((summary.data.alerts.delivered / summary.data.alerts.total) * 100).toFixed(1)}%
								</Typography>
							</Box>
						</Box>
					</CardContent>
				</Card>
			</Grid>

			<Grid item xs={12} md={6}>
				<Card>
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Distribución por Tipo
						</Typography>
						<ResponsiveContainer width="100%" height={300}>
							<PieChart>
								<Pie
									data={pieData}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
									outerRadius={80}
									fill="#8884d8"
									dataKey="value"
								>
									{pieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[entry.type as keyof typeof COLORS]} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</Grid>

			<Grid item xs={12} md={6}>
				<Card>
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Distribución por Método de Envío
						</Typography>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={barData}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="category" />
								<YAxis />
								<Tooltip />
								<Legend />
								<Bar dataKey="email" fill={COLORS.email} name="Email" />
								<Bar dataKey="browser" fill={COLORS.browser} name="Navegador" />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
};

export default NotificationSummary;
