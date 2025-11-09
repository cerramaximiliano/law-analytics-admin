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
	Button,
	TextField,
	MenuItem,
	Pagination,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Divider,
	IconButton,
	Tabs,
	Tab,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Warning2, Calendar, Profile2User, Eye, CloseSquare, Edit } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import SubscriptionsService, { Subscription } from "api/subscriptions";
import WebhooksService from "api/webhooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const Suscripciones = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Filtros y paginación
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [statusFilter, setStatusFilter] = useState("");
	const [planFilter, setPlanFilter] = useState("");

	// Modal de detalles
	const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
	const [openDialog, setOpenDialog] = useState(false);
	const [tabValue, setTabValue] = useState(0);

	// Modal de actualizar fecha de gracia
	const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
	const [newExpiresAt, setNewExpiresAt] = useState("");
	const [adminEmail, setAdminEmail] = useState("");
	const [updatingGracePeriod, setUpdatingGracePeriod] = useState(false);

	const fetchSubscriptions = async () => {
		try {
			setLoading(true);
			setError(null);

			const params: any = {
				page,
				limit,
			};

			if (statusFilter) {
				params.status = statusFilter;
			}

			if (planFilter) {
				params.plan = planFilter;
			}

			const response = await SubscriptionsService.getSubscriptions(params);
			setSubscriptions(response.data);
			setTotalPages(response.stats.totalPages);
			setTotal(response.stats.total);
		} catch (error: any) {
			const errorMessage = error.message || "Error al cargar las suscripciones";
			setError(errorMessage);
			enqueueSnackbar(errorMessage, {
				variant: "error",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSubscriptions();
	}, [page, statusFilter, planFilter]);

	const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
		setPage(value);
	};

	const handleViewDetails = (subscription: Subscription) => {
		setSelectedSubscription(subscription);
		setOpenDialog(true);
	};

	const handleCloseDialog = () => {
		setOpenDialog(false);
		setSelectedSubscription(null);
		setTabValue(0); // Reset tab al cerrar
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	const handleOpenUpdateDialog = () => {
		if (selectedSubscription?.downgradeGracePeriod) {
			// Pre-cargar la fecha actual
			setNewExpiresAt(dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).format("YYYY-MM-DDTHH:mm"));
		}
		setOpenUpdateDialog(true);
	};

	const handleCloseUpdateDialog = () => {
		setOpenUpdateDialog(false);
		setNewExpiresAt("");
		setAdminEmail("");
	};

	const handleUpdateGracePeriod = async () => {
		if (!selectedSubscription || !newExpiresAt || !adminEmail) {
			enqueueSnackbar("Por favor, completa todos los campos", { variant: "warning" });
			return;
		}

		try {
			setUpdatingGracePeriod(true);

			// Intentar parsear la fecha en diferentes formatos
			let expiresAtISO: string;

			// Si es un número, asumir que es un timestamp Unix en milisegundos
			if (!isNaN(Number(newExpiresAt))) {
				expiresAtISO = dayjs(Number(newExpiresAt)).toISOString();
			} else {
				// Intentar parsear como fecha con dayjs
				const parsedDate = dayjs(newExpiresAt);
				if (!parsedDate.isValid()) {
					enqueueSnackbar("Formato de fecha inválido. Por favor, verifica la fecha ingresada.", { variant: "error" });
					setUpdatingGracePeriod(false);
					return;
				}
				expiresAtISO = parsedDate.toISOString();
			}

			await WebhooksService.updateGracePeriod(selectedSubscription.user._id, expiresAtISO, adminEmail);

			enqueueSnackbar("Período de gracia actualizado exitosamente", { variant: "success" });
			handleCloseUpdateDialog();
			handleCloseDialog();
			// Recargar las suscripciones para ver los cambios
			await fetchSubscriptions();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar el período de gracia", { variant: "error" });
		} finally {
			setUpdatingGracePeriod(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return "success";
			case "trialing":
				return "info";
			case "canceled":
			case "cancelled":
				return "error";
			case "past_due":
				return "warning";
			default:
				return "default";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status.toLowerCase()) {
			case "active":
				return "Activa";
			case "trialing":
				return "En Prueba";
			case "canceled":
			case "cancelled":
				return "Cancelada";
			case "past_due":
				return "Pago Vencido";
			default:
				return status;
		}
	};

	const getPlanLabel = (plan: string) => {
		switch (plan.toLowerCase()) {
			case "free":
				return "Gratis";
			case "standard":
				return "Estándar";
			case "premium":
				return "Premium";
			default:
				return plan;
		}
	};

	const getPlanColor = (plan: string) => {
		switch (plan.toLowerCase()) {
			case "free":
				return "default";
			case "standard":
				return "primary";
			case "premium":
				return "secondary";
			default:
				return "default";
		}
	};

	if (loading) {
		return (
			<MainCard>
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	if (error && subscriptions.length === 0) {
		return (
			<MainCard
				title="Suscripciones de Usuarios"
				secondary={
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchSubscriptions}>
						Reintentar
					</Button>
				}
			>
				<Alert severity="error" sx={{ mb: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error al cargar suscripciones
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
						<li>El endpoint no está disponible en el servidor ({import.meta.env.VITE_ADMIN_URL})</li>
						<li>Problemas de autenticación - intente cerrar sesión y volver a iniciar</li>
						<li>El servidor está temporalmente fuera de servicio</li>
					</ul>
				</Alert>
			</MainCard>
		);
	}

	return (
		<MainCard
			title="Suscripciones de Usuarios"
			secondary={
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchSubscriptions}>
					Actualizar
				</Button>
			}
		>
			<Stack spacing={3}>
				{/* Estadísticas generales */}
				<Grid container spacing={3}>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Total Suscripciones
									</Typography>
									<Typography variant="h3" color="primary.main">
										{total}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Suscripciones Activas
									</Typography>
									<Typography variant="h3" color="success.main">
										{subscriptions.filter((s) => s.status.toLowerCase() === "active").length}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "info.lighter", border: 1, borderColor: "info.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										En Prueba
									</Typography>
									<Typography variant="h3" color="info.main">
										{subscriptions.filter((s) => s.status.toLowerCase() === "trialing").length}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "error.lighter", border: 1, borderColor: "error.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Canceladas
									</Typography>
									<Typography variant="h3" color="error.main">
										{subscriptions.filter((s) => s.status.toLowerCase() === "canceled" || s.status.toLowerCase() === "cancelled").length}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Filtros */}
				<Card variant="outlined">
					<CardContent>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									select
									fullWidth
									label="Estado"
									value={statusFilter}
									onChange={(e) => {
										setStatusFilter(e.target.value);
										setPage(1);
									}}
									size="small"
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="active">Activa</MenuItem>
									<MenuItem value="trialing">En Prueba</MenuItem>
									<MenuItem value="canceled">Cancelada</MenuItem>
									<MenuItem value="past_due">Pago Vencido</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									select
									fullWidth
									label="Plan"
									value={planFilter}
									onChange={(e) => {
										setPlanFilter(e.target.value);
										setPage(1);
									}}
									size="small"
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="free">Gratis</MenuItem>
									<MenuItem value="standard">Estándar</MenuItem>
									<MenuItem value="premium">Premium</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={12} md={4}>
								<Typography variant="body2" color="text.secondary">
									Mostrando {subscriptions.length} de {total} suscripciones
								</Typography>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Tabla de suscripciones */}
				<TableContainer component={Paper}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Plan</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Método de Pago</TableCell>
								<TableCell>Período Actual</TableCell>
								<TableCell>Creación</TableCell>
								<TableCell>Detalles</TableCell>
								<TableCell>Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{subscriptions.map((subscription) => (
								<TableRow key={subscription._id}>
									<TableCell>
										<Stack spacing={0.5}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Profile2User size={16} />
												<Typography variant="body2" fontWeight="bold">
													{subscription.user.name}
												</Typography>
											</Stack>
											<Typography variant="caption" color="text.secondary">
												{subscription.user.email}
											</Typography>
										</Stack>
									</TableCell>
									<TableCell>
										<Chip label={getPlanLabel(subscription.plan)} color={getPlanColor(subscription.plan)} size="small" />
									</TableCell>
									<TableCell>
										<Chip
											label={getStatusLabel(subscription.status)}
											color={getStatusColor(subscription.status)}
											size="small"
											icon={
												subscription.status.toLowerCase() === "active" ? (
													<TickCircle size={16} />
												) : subscription.status.toLowerCase() === "canceled" || subscription.status.toLowerCase() === "cancelled" ? (
													<CloseCircle size={16} />
												) : subscription.status.toLowerCase() === "past_due" ? (
													<Warning2 size={16} />
												) : undefined
											}
											sx={getStatusColor(subscription.status) === "warning" ? { color: "rgba(0, 0, 0, 0.87)" } : undefined}
										/>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{subscription.paymentMethod || "-"}</Typography>
									</TableCell>
									<TableCell>
										<Stack spacing={0.5}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Calendar size={14} />
												<Typography variant="caption">
													{dayjs(subscription.currentPeriodStart).format("DD/MM/YYYY")}
												</Typography>
											</Stack>
											<Typography variant="caption" color="text.secondary">
												hasta {dayjs(subscription.currentPeriodEnd).format("DD/MM/YYYY")}
											</Typography>
											{subscription.cancelAtPeriodEnd && (
												<Chip label="Se cancelará" color="warning" size="small" sx={{ mt: 0.5, color: "rgba(0, 0, 0, 0.87)" }} />
											)}
										</Stack>
									</TableCell>
									<TableCell>
										<Typography variant="caption">{dayjs(subscription.createdAt).format("DD/MM/YYYY")}</Typography>
									</TableCell>
									<TableCell>
										<Stack spacing={0.5}>
											{subscription.paymentFailures.count > 0 && (
												<Tooltip title={`${subscription.paymentFailures.count} fallos de pago`}>
													<Chip
														label={`${subscription.paymentFailures.count} fallos`}
														color="error"
														size="small"
														icon={<Warning2 size={14} />}
													/>
												</Tooltip>
											)}
											{subscription.trialEnd && dayjs(subscription.trialEnd).isAfter(dayjs()) && (
												<Tooltip title={`Prueba hasta ${dayjs(subscription.trialEnd).format("DD/MM/YYYY")}`}>
													<Chip label="En Prueba" color="info" size="small" />
												</Tooltip>
											)}
											{subscription.accountStatus !== "active" && (
												<Chip label={subscription.accountStatus} color="warning" size="small" sx={{ color: "rgba(0, 0, 0, 0.87)" }} />
											)}
										</Stack>
									</TableCell>
									<TableCell>
										<Button
											variant="outlined"
											size="small"
											startIcon={<Eye size={16} />}
											onClick={() => handleViewDetails(subscription)}
										>
											Ver
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>

				{/* Paginación */}
				{totalPages > 1 && (
					<Box display="flex" justifyContent="center" mt={2}>
						<Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" showFirstButton showLastButton />
					</Box>
				)}

				{subscriptions.length === 0 && (
					<Alert severity="info">
						<Typography variant="body2">No se encontraron suscripciones con los filtros seleccionados.</Typography>
					</Alert>
				)}
			</Stack>

			{/* Modal de detalles */}
			<Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Detalles de Suscripción</Typography>
						<IconButton onClick={handleCloseDialog} size="small">
							<CloseSquare size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
					<Tab label="General" />
					<Tab label="Stripe" />
					<Tab label="Períodos" />
					<Tab label="Plan" />
					{selectedSubscription?.paymentFailures && selectedSubscription.paymentFailures.count > 0 && <Tab label="Fallos de Pago" />}
				</Tabs>
				<DialogContent sx={{ minHeight: "500px", maxHeight: "500px", overflowY: "auto" }}>
					{selectedSubscription && (
						<>
							{/* Tab 0: General */}
							{tabValue === 0 && (
								<Stack spacing={3} sx={{ mt: 1 }}>
									{/* Alerta de Downgrade Grace Period */}
									{selectedSubscription.downgradeGracePeriod && (
										<Alert severity="warning" icon={<Warning2 size={24} />}>
											<Typography variant="subtitle2" fontWeight="bold">
												Período de Gracia de Downgrade Activo
											</Typography>
											<Typography variant="body2" sx={{ mt: 1 }}>
												El usuario está en período de gracia para cambio de plan de{" "}
												<strong>{selectedSubscription.downgradeGracePeriod.previousPlan}</strong> a{" "}
												<strong>{selectedSubscription.downgradeGracePeriod.targetPlan}</strong>.
											</Typography>
											<Typography variant="body2" sx={{ mt: 0.5 }}>
												Expira: {dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).format("DD/MM/YYYY HH:mm")}
											</Typography>
										</Alert>
									)}

									{/* Información del Usuario */}
									<Box>
								<Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Profile2User size={20} />
									Información del Usuario
								</Typography>
								<Divider sx={{ mb: 2 }} />
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Nombre
										</Typography>
										<Typography variant="body2" fontWeight="bold">
											{selectedSubscription.user.name}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Email
										</Typography>
										<Typography variant="body2" fontWeight="bold">
											{selectedSubscription.user.email}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Rol
										</Typography>
										<Typography variant="body2">{selectedSubscription.user.role}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											User ID
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.user._id}
										</Typography>
									</Grid>
								</Grid>
							</Box>

							{/* Información de Suscripción */}
							<Box>
								<Typography variant="h6" gutterBottom>
									Información de Suscripción
								</Typography>
								<Divider sx={{ mb: 2 }} />
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Plan
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip label={getPlanLabel(selectedSubscription.plan)} color={getPlanColor(selectedSubscription.plan)} size="small" />
										</Box>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Estado
										</Typography>
										<Box sx={{ mt: 0.5 }}>
											<Chip
												label={getStatusLabel(selectedSubscription.status)}
												color={getStatusColor(selectedSubscription.status)}
												size="small"
												sx={getStatusColor(selectedSubscription.status) === "warning" ? { color: "rgba(0, 0, 0, 0.87)" } : undefined}
											/>
										</Box>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Método de Pago
										</Typography>
										<Typography variant="body2">{selectedSubscription.paymentMethod || "-"}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Estado de Cuenta
										</Typography>
										<Typography variant="body2">{selectedSubscription.accountStatus}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Cancelar al final del período
										</Typography>
										<Typography variant="body2">{selectedSubscription.cancelAtPeriodEnd ? "Sí" : "No"}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Cancelación notificada
										</Typography>
										<Typography variant="body2">{selectedSubscription.notifiedCancellation ? "Sí" : "No"}</Typography>
									</Grid>
								</Grid>
							</Box>
								</Stack>
							)}

							{/* Tab 1: Stripe */}
							{tabValue === 1 && (
								<Stack spacing={3} sx={{ mt: 1 }}>
									{/* IDs de Stripe */}
									<Box>
								<Typography variant="h6" gutterBottom>
									IDs de Stripe
								</Typography>
								<Divider sx={{ mb: 2 }} />
								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Customer ID (Actual)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeCustomerId?.current || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Customer ID (Test)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeCustomerId?.test || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Customer ID (Live)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeCustomerId?.live || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Subscription ID (Actual)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeSubscriptionId?.current || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Subscription ID (Test)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeSubscriptionId?.test || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Subscription ID (Live)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripeSubscriptionId?.live || "-"}
										</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Price ID (Actual)
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{selectedSubscription.stripePriceId?.current || "-"}
										</Typography>
									</Grid>
								</Grid>
							</Box>
								</Stack>
							)}

							{/* Tab 2: Períodos */}
							{tabValue === 2 && (
								<Stack spacing={3} sx={{ mt: 1 }}>
									{/* Períodos */}
									<Box>
								<Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
									<Calendar size={20} />
									Períodos
								</Typography>
								<Divider sx={{ mb: 2 }} />
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Inicio del Período Actual
										</Typography>
										<Typography variant="body2">{dayjs(selectedSubscription.currentPeriodStart).format("DD/MM/YYYY HH:mm")}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Fin del Período Actual
										</Typography>
										<Typography variant="body2">{dayjs(selectedSubscription.currentPeriodEnd).format("DD/MM/YYYY HH:mm")}</Typography>
									</Grid>
									{selectedSubscription.trialStart && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												Inicio de Prueba
											</Typography>
											<Typography variant="body2">{dayjs(selectedSubscription.trialStart).format("DD/MM/YYYY HH:mm")}</Typography>
										</Grid>
									)}
									{selectedSubscription.trialEnd && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												Fin de Prueba
											</Typography>
											<Typography variant="body2">{dayjs(selectedSubscription.trialEnd).format("DD/MM/YYYY HH:mm")}</Typography>
										</Grid>
									)}
									{selectedSubscription.canceledAt && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												Fecha de Cancelación
											</Typography>
											<Typography variant="body2">{dayjs(selectedSubscription.canceledAt).format("DD/MM/YYYY HH:mm")}</Typography>
										</Grid>
									)}
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Última Sincronización de Plan
										</Typography>
										<Typography variant="body2">{dayjs(selectedSubscription.lastPlanSync).format("DD/MM/YYYY HH:mm")}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Creación
										</Typography>
										<Typography variant="body2">{dayjs(selectedSubscription.createdAt).format("DD/MM/YYYY HH:mm")}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="text.secondary">
											Última Actualización
										</Typography>
										<Typography variant="body2">{dayjs(selectedSubscription.updatedAt).format("DD/MM/YYYY HH:mm")}</Typography>
									</Grid>
								</Grid>
							</Box>

									{/* Downgrade Grace Period */}
									{selectedSubscription.downgradeGracePeriod && (
										<Box>
											<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
												<Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
													<Warning2 size={20} color="#ed6c02" />
													Período de Gracia de Downgrade
												</Typography>
												<Button variant="outlined" size="small" startIcon={<Edit size={16} />} onClick={handleOpenUpdateDialog}>
													Actualizar Fecha
												</Button>
											</Stack>
											<Divider sx={{ mb: 2 }} />
											<Grid container spacing={2}>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Plan Anterior
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{getPlanLabel(selectedSubscription.downgradeGracePeriod.previousPlan)}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Plan Objetivo
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{getPlanLabel(selectedSubscription.downgradeGracePeriod.targetPlan)}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Fecha de Expiración
													</Typography>
													<Typography variant="body2" color="warning.main" fontWeight="bold">
														{dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).format("DD/MM/YYYY HH:mm")}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).fromNow()}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Calculado Desde
													</Typography>
													<Typography variant="body2">
														{selectedSubscription.downgradeGracePeriod.calculatedFrom === "cancellation"
															? "Cancelación"
															: "Otro"}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Auto-archivo Programado
													</Typography>
													<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
														{selectedSubscription.downgradeGracePeriod.autoArchiveScheduled ? (
															<>
																<TickCircle size={16} color="#2e7d32" />
																<Typography variant="body2">Sí</Typography>
															</>
														) : (
															<>
																<CloseCircle size={16} color="#d32f2f" />
																<Typography variant="body2">No</Typography>
															</>
														)}
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="caption" color="text.secondary">
														Cancelación Inmediata
													</Typography>
													<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
														{selectedSubscription.downgradeGracePeriod.immediateCancel ? (
															<>
																<TickCircle size={16} color="#2e7d32" />
																<Typography variant="body2">Sí</Typography>
															</>
														) : (
															<>
																<CloseCircle size={16} color="#d32f2f" />
																<Typography variant="body2">No</Typography>
															</>
														)}
													</Stack>
												</Grid>

												{/* Recordatorios */}
												<Grid item xs={12}>
													<Typography variant="caption" color="text.secondary" fontWeight="bold">
														Estado de Recordatorios
													</Typography>
												</Grid>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.downgradeGracePeriod.reminderSent ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Recordatorio Inicial</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.downgradeGracePeriod.reminder3DaysSent ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Recordatorio 3 Días</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={4}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.downgradeGracePeriod.reminder1DaySent ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Recordatorio 1 Día</Typography>
													</Stack>
												</Grid>

												{/* Modificación Manual */}
												{selectedSubscription.downgradeGracePeriod.manuallyModified && (
													<>
														<Grid item xs={12}>
															<Typography variant="caption" color="text.secondary" fontWeight="bold">
																Modificación Manual
															</Typography>
														</Grid>
														<Grid item xs={12} sm={6}>
															<Typography variant="caption" color="text.secondary">
																Modificado Por
															</Typography>
															<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
																{selectedSubscription.downgradeGracePeriod.modifiedBy}
															</Typography>
														</Grid>
														<Grid item xs={12} sm={6}>
															<Typography variant="caption" color="text.secondary">
																Fecha de Modificación
															</Typography>
															<Typography variant="body2">
																{dayjs(selectedSubscription.downgradeGracePeriod.modifiedAt).format("DD/MM/YYYY HH:mm")}
															</Typography>
														</Grid>
													</>
												)}

												{/* Fecha de Procesamiento */}
												{selectedSubscription.downgradeGracePeriod.processedAt && (
													<Grid item xs={12} sm={6}>
														<Typography variant="caption" color="text.secondary">
															Fecha de Procesamiento
														</Typography>
														<Typography variant="body2">
															{dayjs(selectedSubscription.downgradeGracePeriod.processedAt).format("DD/MM/YYYY HH:mm")}
														</Typography>
													</Grid>
												)}
											</Grid>
										</Box>
									)}
								</Stack>
							)}

							{/* Tab 3: Plan */}
							{tabValue === 3 && (
								<Stack spacing={3} sx={{ mt: 1 }}>
									{/* Límites del Plan */}
									{selectedSubscription.limits && (
										<Box>
											<Typography variant="h6" gutterBottom>
												Límites del Plan
											</Typography>
											<Divider sx={{ mb: 2 }} />
											<Grid container spacing={2}>
												<Grid item xs={12} sm={6} md={3}>
													<Typography variant="caption" color="text.secondary">
														Carpetas
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{selectedSubscription.limits.folders || "-"}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6} md={3}>
													<Typography variant="caption" color="text.secondary">
														Calculadoras
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{selectedSubscription.limits.calculators || "-"}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6} md={3}>
													<Typography variant="caption" color="text.secondary">
														Contactos
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{selectedSubscription.limits.contacts || "-"}
													</Typography>
												</Grid>
												<Grid item xs={12} sm={6} md={3}>
													<Typography variant="caption" color="text.secondary">
														Almacenamiento (MB)
													</Typography>
													<Typography variant="body2" fontWeight="bold">
														{selectedSubscription.limits.storage || "-"}
													</Typography>
												</Grid>
											</Grid>
										</Box>
									)}

									{/* Características del Plan */}
									{selectedSubscription.features && (
										<Box>
											<Typography variant="h6" gutterBottom>
												Características del Plan
											</Typography>
											<Divider sx={{ mb: 2 }} />
											<Grid container spacing={1}>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.advancedAnalytics ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Análisis Avanzado</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.exportReports ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Exportar Reportes</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.taskAutomation ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Automatización de Tareas</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.bulkOperations ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Operaciones Masivas</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.prioritySupport ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Soporte Prioritario</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.vinculateFolders ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Vincular Carpetas</Typography>
													</Stack>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Stack direction="row" spacing={1} alignItems="center">
														{selectedSubscription.features.booking ? (
															<TickCircle size={16} color="#2e7d32" />
														) : (
															<CloseCircle size={16} color="#d32f2f" />
														)}
														<Typography variant="body2">Reservas</Typography>
													</Stack>
												</Grid>
											</Grid>
										</Box>
									)}
								</Stack>
							)}

							{/* Tab 4: Fallos de Pago */}
							{tabValue === 4 && selectedSubscription.paymentFailures && selectedSubscription.paymentFailures.count > 0 && (
								<Stack spacing={3} sx={{ mt: 1 }}>
									{/* Fallos de Pago */}
									<Box>
									<Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										<Warning2 size={20} color="#d32f2f" />
										Fallos de Pago
									</Typography>
									<Divider sx={{ mb: 2 }} />
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="text.secondary">
												Cantidad de Fallos
											</Typography>
											<Typography variant="body2" color="error">
												{selectedSubscription.paymentFailures.count}
											</Typography>
										</Grid>
										{selectedSubscription.paymentFailures.firstFailedAt && (
											<Grid item xs={12} sm={6}>
												<Typography variant="caption" color="text.secondary">
													Primer Fallo
												</Typography>
												<Typography variant="body2">
													{dayjs(selectedSubscription.paymentFailures.firstFailedAt).format("DD/MM/YYYY HH:mm")}
												</Typography>
											</Grid>
										)}
										{selectedSubscription.paymentFailures.lastFailedAt && (
											<Grid item xs={12} sm={6}>
												<Typography variant="caption" color="text.secondary">
													Último Fallo
												</Typography>
												<Typography variant="body2">
													{dayjs(selectedSubscription.paymentFailures.lastFailedAt).format("DD/MM/YYYY HH:mm")}
												</Typography>
											</Grid>
										)}
										{selectedSubscription.paymentFailures.lastFailureReason && (
											<Grid item xs={12}>
												<Typography variant="caption" color="text.secondary">
													Razón del Último Fallo
												</Typography>
												<Typography variant="body2">{selectedSubscription.paymentFailures.lastFailureReason}</Typography>
											</Grid>
										)}
										{selectedSubscription.paymentFailures.lastFailureCode && (
											<Grid item xs={12} sm={6}>
												<Typography variant="caption" color="text.secondary">
													Código de Error
												</Typography>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
													{selectedSubscription.paymentFailures.lastFailureCode}
												</Typography>
											</Grid>
										)}
										{selectedSubscription.paymentFailures.nextRetryAt && (
											<Grid item xs={12} sm={6}>
												<Typography variant="caption" color="text.secondary">
													Próximo Reintento
												</Typography>
												<Typography variant="body2">
													{dayjs(selectedSubscription.paymentFailures.nextRetryAt).format("DD/MM/YYYY HH:mm")}
												</Typography>
											</Grid>
										)}
									</Grid>
								</Box>
								</Stack>
							)}
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDialog} variant="contained">
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de actualizar fecha de gracia */}
			<Dialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="h5">Actualizar Fecha de Gracia</Typography>
						<IconButton onClick={handleCloseUpdateDialog} size="small">
							<CloseSquare size={20} />
						</IconButton>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 2 }}>
						<Alert severity="info">
							<Typography variant="body2">
								Esta acción actualizará la fecha de expiración del período de gracia para el usuario{" "}
								<strong>{selectedSubscription?.user.email}</strong>
							</Typography>
						</Alert>

						<Stack spacing={1}>
							<TextField
								fullWidth
								label="Nueva Fecha de Expiración (Selector)"
								type="datetime-local"
								value={newExpiresAt}
								onChange={(e) => setNewExpiresAt(e.target.value)}
								InputLabelProps={{
									shrink: true,
								}}
								helperText="Usa el selector para elegir fecha y hora fácilmente"
							/>
							<Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
								O escribe manualmente en cualquier formato válido:
							</Typography>
							<TextField
								fullWidth
								label="Nueva Fecha de Expiración (Manual)"
								value={newExpiresAt}
								onChange={(e) => setNewExpiresAt(e.target.value)}
								placeholder="2025-11-20T00:00:00.000Z"
								helperText={
									newExpiresAt && dayjs(newExpiresAt).isValid()
										? `Vista previa: ${dayjs(newExpiresAt).format("DD/MM/YYYY HH:mm")}`
										: "Escribe la fecha en cualquier formato válido"
								}
								error={newExpiresAt !== "" && !dayjs(newExpiresAt).isValid()}
							/>
						</Stack>

						<Alert severity="info" sx={{ fontSize: "0.75rem" }}>
							<Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
								Formatos de fecha aceptados:
							</Typography>
							<Typography variant="caption" component="div">
								• ISO 8601: 2025-11-20T00:00:00.000Z, 2025-11-20T00:00:00Z, 2025-11-20
							</Typography>
							<Typography variant="caption" component="div">
								• Texto: November 20, 2025
							</Typography>
							<Typography variant="caption" component="div">
								• Otros: 2025-11-20 00:00:00, 2025/11/20
							</Typography>
							<Typography variant="caption" component="div">
								• Timestamp Unix (ms): 1732060800000
							</Typography>
						</Alert>

						<TextField
							fullWidth
							label="Tu Email (Admin)"
							type="email"
							value={adminEmail}
							onChange={(e) => setAdminEmail(e.target.value)}
							placeholder="admin@lawanalytics.app"
							helperText="Este email se registrará como el admin que modificó el período de gracia"
						/>

						{selectedSubscription?.downgradeGracePeriod && (
							<Box sx={{ p: 2, backgroundColor: "grey.100", borderRadius: 1 }}>
								<Typography variant="caption" color="text.secondary" fontWeight="bold">
									Información Actual
								</Typography>
								<Grid container spacing={1} sx={{ mt: 0.5 }}>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Plan Anterior:
										</Typography>
										<Typography variant="body2" fontWeight="bold">
											{getPlanLabel(selectedSubscription.downgradeGracePeriod.previousPlan)}
										</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Plan Objetivo:
										</Typography>
										<Typography variant="body2" fontWeight="bold">
											{getPlanLabel(selectedSubscription.downgradeGracePeriod.targetPlan)}
										</Typography>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="text.secondary">
											Fecha Actual de Expiración:
										</Typography>
										<Typography variant="body2" fontWeight="bold" color="warning.main">
											{dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).format("DD/MM/YYYY HH:mm")}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											({dayjs(selectedSubscription.downgradeGracePeriod.expiresAt).fromNow()})
										</Typography>
									</Grid>
								</Grid>
							</Box>
						)}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseUpdateDialog} variant="outlined" disabled={updatingGracePeriod}>
						Cancelar
					</Button>
					<Button
						onClick={handleUpdateGracePeriod}
						variant="contained"
						color="primary"
						disabled={updatingGracePeriod || !newExpiresAt || !adminEmail}
						startIcon={updatingGracePeriod ? <CircularProgress size={16} color="inherit" /> : <Edit size={16} />}
					>
						{updatingGracePeriod ? "Actualizando..." : "Actualizar"}
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default Suscripciones;
