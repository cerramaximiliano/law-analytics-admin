import { useState, useEffect } from "react";
import {
	Box,
	Grid,
	Card,
	CardContent,
	Typography,
	Chip,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Stack,
	CircularProgress,
	Divider,
	Button,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Warning2, Calendar } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import WebhooksService, { WebhooksStatus } from "api/webhooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const StripeWebhooks = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<WebhooksStatus | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [runningHealthCheck, setRunningHealthCheck] = useState(false);

	const fetchWebhooksStatus = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await WebhooksService.getWebhooksStatus();
			setData(response.data);
		} catch (error: any) {
			const errorMessage = error.message || "Error al cargar el estado de webhooks";
			setError(errorMessage);
			enqueueSnackbar(errorMessage, {
				variant: "error",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleHealthCheck = async () => {
		try {
			setRunningHealthCheck(true);
			const response = await WebhooksService.runHealthCheck();

			enqueueSnackbar(
				response.message || "Health check completado exitosamente. Suscripciones actualizadas y webhooks reparados.",
				{
					variant: "success",
				},
			);

			// Recargar el estado después del health check
			await fetchWebhooksStatus();
		} catch (error: any) {
			const errorMessage = error.message || "Error al ejecutar health check";
			enqueueSnackbar(errorMessage, {
				variant: "error",
			});
		} finally {
			setRunningHealthCheck(false);
		}
	};

	useEffect(() => {
		fetchWebhooksStatus();
	}, []);

	if (loading) {
		return (
			<MainCard>
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	if (error && !data) {
		return (
			<MainCard
				title="Estado de Stripe Webhooks"
				secondary={
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchWebhooksStatus}>
						Reintentar
					</Button>
				}
			>
				<Alert severity="error" sx={{ mb: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error al cargar información de webhooks
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						{error}
					</Typography>
				</Alert>
				<Alert severity="info">
					<Typography variant="body2">
						<strong>Posibles causas:</strong>
					</Typography>
					<ul style={{ marginTop: "8px", marginBottom: 0 }}>
						<li>El endpoint no está disponible en el servidor ({import.meta.env.VITE_AUTH_URL})</li>
						<li>Problemas de autenticación - intente cerrar sesión y volver a iniciar</li>
						<li>El servidor está temporalmente fuera de servicio</li>
					</ul>
				</Alert>
			</MainCard>
		);
	}

	if (!data) {
		return (
			<MainCard>
				<Alert severity="error">No se pudo cargar la información de webhooks</Alert>
			</MainCard>
		);
	}

	const hasPendingIssues = data.webhooks.pending_total > 0;
	const hasRecentIssues = data.webhooks.pending_last_24h > 0;

	return (
		<MainCard
			title="Estado de Stripe Webhooks"
			secondary={
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchWebhooksStatus}>
					Actualizar
				</Button>
			}
		>
			<Stack spacing={3}>
				{/* Alertas de problemas */}
				{hasPendingIssues && (
					<Alert severity="error" icon={<Warning2 size={24} />}>
						<Typography variant="subtitle2" fontWeight="bold">
							⚠️ Atención: Hay {data.webhooks.pending_total} webhook(s) sin entregar
						</Typography>
						{hasRecentIssues && (
							<Typography variant="body2" sx={{ mt: 0.5 }}>
								{data.webhooks.pending_last_24h} de estos son de las últimas 24 horas y requieren atención inmediata.
							</Typography>
						)}
					</Alert>
				)}

				{!hasPendingIssues && (
					<Alert severity="success" icon={<TickCircle size={24} />}>
						<Typography variant="subtitle2" fontWeight="bold">
							✅ Todos los webhooks funcionando correctamente
						</Typography>
						<Typography variant="body2" sx={{ mt: 0.5 }}>
							No hay eventos pendientes de entrega.
						</Typography>
					</Alert>
				)}

				{/* Botón de Health Check */}
				<Card variant="outlined" sx={{ backgroundColor: "primary.lighter", borderColor: "primary.main" }}>
					<CardContent>
						<Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="primary.main" gutterBottom>
									🔧 Actualizar Suscripciones y Reparar Webhooks
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Sincroniza todas las suscripciones con Stripe y repara webhooks fallados. Este proceso puede tardar algunos minutos.
								</Typography>
							</Box>
							<Button
								variant="contained"
								color="primary"
								onClick={handleHealthCheck}
								disabled={runningHealthCheck}
								startIcon={runningHealthCheck ? <CircularProgress size={16} color="inherit" /> : <Refresh size={16} />}
								sx={{ minWidth: { xs: "100%", sm: "200px" } }}
							>
								{runningHealthCheck ? "Ejecutando..." : "Ejecutar Health Check"}
							</Button>
						</Stack>
					</CardContent>
				</Card>

				{/* Información sobre el período de datos */}
				<Alert severity="info">
					<Typography variant="body2">
						<strong>Período de datos:</strong> Los eventos y webhooks mostrados corresponden a los últimos 30 días de actividad en Stripe.
					</Typography>
				</Alert>

				{/* Indicadores clave */}
				<Grid container spacing={3}>
					<Grid item xs={12} sm={6} md={3}>
						<Card
							sx={{
								backgroundColor: hasPendingIssues ? "error.lighter" : "success.lighter",
								border: 1,
								borderColor: hasPendingIssues ? "error.main" : "success.main",
							}}
						>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Webhooks Pendientes
									</Typography>
									<Typography variant="h3" color={hasPendingIssues ? "error.main" : "success.main"}>
										{data.webhooks.pending_total}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{data.webhooks.pending_last_24h} en últimas 24h
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "background.paper" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Eventos (24h)
									</Typography>
									<Typography variant="h3">{data.webhooks.total_events_24h}</Typography>
									<Typography variant="caption" color="text.secondary">
										{data.webhooks.total_events_week} en esta semana
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "background.paper" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Suscripciones Totales
									</Typography>
									<Typography variant="h3">{data.subscriptions.total}</Typography>
									<Typography variant="caption" color="text.secondary">
										{data.subscriptions.active_paid} activas pagadas
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "background.paper" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Endpoints Configurados
									</Typography>
									<Typography variant="h3">{data.endpoints.total}</Typography>
									<Typography variant="caption" color="text.secondary">
										Modo: {data.mode}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Endpoints de Stripe */}
				<Box>
					<Typography variant="h6" gutterBottom>
						Endpoints Configurados
					</Typography>
					<TableContainer component={Paper}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Estado</TableCell>
									<TableCell>URL</TableCell>
									<TableCell>Modo</TableCell>
									<TableCell>Eventos Habilitados</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{data.endpoints.list.map((endpoint) => (
									<TableRow key={endpoint.id}>
										<TableCell>
											{endpoint.status === "enabled" ? (
												<Chip
													icon={<TickCircle size={16} />}
													label="Habilitado"
													color="success"
													size="small"
												/>
											) : (
												<Chip
													icon={<CloseCircle size={16} />}
													label="Deshabilitado"
													color="error"
													size="small"
												/>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
												{endpoint.url}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={endpoint.livemode ? "Producción" : "Desarrollo"}
												color={endpoint.livemode ? "primary" : "default"}
												size="small"
											/>
										</TableCell>
										<TableCell>
											<Typography variant="caption">{endpoint.enabled_events.length} eventos</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>

				{/* Webhooks pendientes - solo si hay */}
				{data.pending_details.length > 0 && (
					<Box>
						<Typography variant="h6" gutterBottom color="error.main">
							⚠️ Webhooks Pendientes de Entrega
						</Typography>
						<TableContainer component={Paper}>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>Tipo de Evento</TableCell>
										<TableCell>Fecha</TableCell>
										<TableCell>Pendientes</TableCell>
										<TableCell>Subscription ID</TableCell>
										<TableCell>Customer ID</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.pending_details.map((webhook) => (
										<TableRow key={webhook.id}>
											<TableCell>
												<Chip label={webhook.type} size="small" color="warning" sx={{ color: "rgba(0, 0, 0, 0.87)" }} />
											</TableCell>
											<TableCell>
												<Stack direction="row" spacing={1} alignItems="center">
													<Calendar size={16} />
													<Typography variant="body2">{dayjs(webhook.created).format("DD/MM/YYYY HH:mm")}</Typography>
												</Stack>
												<Typography variant="caption" color="text.secondary">
													{dayjs(webhook.created).fromNow()}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={webhook.pending_webhooks} color="error" size="small" />
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{webhook.data.subscription_id || "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{webhook.data.customer_id || "-"}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Box>
				)}

				{/* Tipos de eventos */}
				<Box>
					<Typography variant="h6" gutterBottom>
						Tipos de Eventos (Actividad Reciente)
					</Typography>
					<Grid container spacing={2}>
						{Object.entries(data.event_types)
							.sort(([, a], [, b]) => b - a)
							.map(([type, count]) => (
								<Grid item xs={12} sm={6} md={4} key={type}>
									<Card variant="outlined">
										<CardContent>
											<Stack direction="row" justifyContent="space-between" alignItems="center">
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
													{type}
												</Typography>
												<Chip label={count} color="primary" size="small" />
											</Stack>
										</CardContent>
									</Card>
								</Grid>
							))}
					</Grid>
				</Box>

				<Divider />

				{/* Footer con timestamp */}
				<Box>
					<Typography variant="caption" color="text.secondary">
						Última actualización: {dayjs(data.timestamp).format("DD/MM/YYYY HH:mm:ss")}
					</Typography>
				</Box>
			</Stack>
		</MainCard>
	);
};

export default StripeWebhooks;
