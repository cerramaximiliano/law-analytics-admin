import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Box,
	Chip,
	Divider,
	Grid,
	Paper,
	Stack,
	useTheme,
} from "@mui/material";
import { StripeCustomer } from "types/stripe-subscription";
import dayjs from "utils/dayjs-config";

interface StripeCustomerDetailModalProps {
	open: boolean;
	onClose: () => void;
	customer: StripeCustomer | null;
}

const StripeCustomerDetailModal: React.FC<StripeCustomerDetailModalProps> = ({ open, onClose, customer }) => {
	const theme = useTheme();

	if (!customer) return null;

	const getStatusColor = (status: string) => {
		switch (status) {
			case "active":
				return "success";
			case "canceled":
				return "default";
			case "past_due":
				return "error";
			case "trialing":
				return "info";
			case "unpaid":
				return "warning";
			default:
				return "default";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "active":
				return "Activo";
			case "canceled":
				return "Cancelado";
			case "past_due":
				return "Pago vencido";
			case "trialing":
				return "Período de prueba";
			case "unpaid":
				return "Impago";
			default:
				return status;
		}
	};

	const getEnvironmentColor = (environment: string) => {
		switch (environment) {
			case "live":
				return "success";
			case "test":
				return "warning";
			default:
				return "default";
		}
	};

	const getEnvironmentLabel = (environment: string) => {
		switch (environment) {
			case "live":
				return "Producción";
			case "test":
				return "Test";
			default:
				return environment;
		}
	};

	const formatCurrency = (amount: number, currency: string) => {
		const formatter = new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: currency.toUpperCase(),
		});
		return formatter.format(amount);
	};

	const formatInterval = (interval: string) => {
		switch (interval) {
			case "month":
				return "Mensual";
			case "year":
				return "Anual";
			case "week":
				return "Semanal";
			case "day":
				return "Diario";
			default:
				return interval;
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Detalles del Cliente de Stripe</Typography>
					<Chip
						label={getEnvironmentLabel(customer.environment)}
						color={getEnvironmentColor(customer.environment) as any}
						size="small"
					/>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={3}>
					{/* Información del Cliente */}
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.50",
							borderRadius: 2,
						}}
					>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Información del Cliente
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Nombre
									</Typography>
									<Typography variant="body1" fontWeight="medium">
										{customer.name}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Email
									</Typography>
									<Typography variant="body1">{customer.email}</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										ID de Cliente Stripe
									</Typography>
									<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
										{customer.id}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Cliente desde
									</Typography>
									<Typography variant="body1">{dayjs(customer.created).format("DD/MM/YYYY HH:mm")}</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Moneda
									</Typography>
									<Typography variant="body1">{customer.currency?.toUpperCase() || "No definida"}</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Moroso
									</Typography>
									<Chip
										label={customer.delinquent ? "Sí" : "No"}
										color={customer.delinquent ? "error" : "success"}
										size="small"
									/>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Prefijo de Factura
									</Typography>
									<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
										{customer.invoice_prefix}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Próximo # de Factura
									</Typography>
									<Typography variant="body1">{customer.next_invoice_sequence}</Typography>
								</Stack>
							</Grid>
						</Grid>
					</Paper>

					{/* Metadata */}
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.50",
							borderRadius: 2,
						}}
					>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Metadata
						</Typography>
						<Grid container spacing={2}>
							{customer.metadata.userId && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											User ID (App)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{customer.metadata.userId}
										</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.app && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Aplicación
										</Typography>
										<Typography variant="body1">{customer.metadata.app}</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.app_version && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Versión de App
										</Typography>
										<Typography variant="body1">{customer.metadata.app_version}</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.environment && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Entorno (metadata)
										</Typography>
										<Typography variant="body1">{customer.metadata.environment}</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.initial_plan && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Plan Inicial
										</Typography>
										<Typography variant="body1" sx={{ textTransform: "capitalize" }}>
											{customer.metadata.initial_plan}
										</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.created_at && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Creado en App
										</Typography>
										<Typography variant="body1">{dayjs(customer.metadata.created_at).format("DD/MM/YYYY HH:mm")}</Typography>
									</Stack>
								</Grid>
							)}
							{customer.metadata.consolidated && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Consolidado
										</Typography>
										<Chip label={customer.metadata.consolidated === "true" ? "Sí" : "No"} size="small" color="info" />
									</Stack>
								</Grid>
							)}
							{customer.metadata.consolidation_date && (
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Fecha de Consolidación
										</Typography>
										<Typography variant="body1">
											{dayjs(customer.metadata.consolidation_date).format("DD/MM/YYYY HH:mm")}
										</Typography>
									</Stack>
								</Grid>
							)}
						</Grid>
					</Paper>

					{/* Información de Suscripción */}
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.50",
							borderRadius: 2,
						}}
					>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Typography variant="h6">Suscripción</Typography>
							<Chip
								label={customer.hasActiveSubscription ? "Activa" : "Sin suscripción activa"}
								color={customer.hasActiveSubscription ? "success" : "default"}
								size="small"
							/>
						</Stack>

						{customer.subscription ? (
							<Grid container spacing={2}>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											ID de Suscripción
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{customer.subscription.id}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Estado
										</Typography>
										<Box>
											<Chip
												label={getStatusLabel(customer.subscription.status)}
												color={getStatusColor(customer.subscription.status) as any}
												size="small"
											/>
										</Box>
									</Stack>
								</Grid>

								<Grid item xs={12}>
									<Divider sx={{ my: 1 }} />
								</Grid>

								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Plan
										</Typography>
										<Typography variant="body1">
											{formatCurrency(customer.subscription.plan.amount, customer.subscription.plan.currency)} /{" "}
											{formatInterval(customer.subscription.plan.interval)}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											ID del Precio
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{customer.subscription.plan.id}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Producto
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{customer.subscription.plan.product}
										</Typography>
									</Stack>
								</Grid>

								<Grid item xs={12}>
									<Divider sx={{ my: 1 }} />
								</Grid>

								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Inicio del Período Actual
										</Typography>
										<Typography variant="body1">
											{dayjs(customer.subscription.current_period_start).format("DD/MM/YYYY HH:mm")}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Fin del Período Actual
										</Typography>
										<Typography variant="body1">
											{dayjs(customer.subscription.current_period_end).format("DD/MM/YYYY HH:mm")}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} md={6}>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="text.secondary">
											Cancelar al Final del Período
										</Typography>
										<Chip
											label={customer.subscription.cancel_at_period_end ? "Sí" : "No"}
											color={customer.subscription.cancel_at_period_end ? "warning" : "default"}
											size="small"
										/>
									</Stack>
								</Grid>
							</Grid>
						) : (
							<Box sx={{ py: 2 }}>
								<Typography variant="body1" color="text.secondary" align="center">
									Este cliente no tiene una suscripción activa actualmente.
								</Typography>
								<Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
									Total de suscripciones históricas: {customer.totalSubscriptions}
								</Typography>
							</Box>
						)}
					</Paper>

					{/* Resumen */}
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.50",
							borderRadius: 2,
						}}
					>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Resumen
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} md={3}>
								<Stack spacing={0.5} alignItems="center">
									<Typography variant="caption" color="text.secondary">
										Total Suscripciones
									</Typography>
									<Typography variant="h4">{customer.totalSubscriptions}</Typography>
								</Stack>
							</Grid>
							<Grid item xs={6} md={3}>
								<Stack spacing={0.5} alignItems="center">
									<Typography variant="caption" color="text.secondary">
										Suscripción Activa
									</Typography>
									<Typography variant="h4" color={customer.hasActiveSubscription ? "success.main" : "text.secondary"}>
										{customer.hasActiveSubscription ? "Sí" : "No"}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={6} md={3}>
								<Stack spacing={0.5} alignItems="center">
									<Typography variant="caption" color="text.secondary">
										Moroso
									</Typography>
									<Typography variant="h4" color={customer.delinquent ? "error.main" : "success.main"}>
										{customer.delinquent ? "Sí" : "No"}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={6} md={3}>
								<Stack spacing={0.5} alignItems="center">
									<Typography variant="caption" color="text.secondary">
										Entorno
									</Typography>
									<Chip
										label={getEnvironmentLabel(customer.environment)}
										color={getEnvironmentColor(customer.environment) as any}
									/>
								</Stack>
							</Grid>
						</Grid>
					</Paper>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default StripeCustomerDetailModal;
