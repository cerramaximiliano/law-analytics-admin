import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";

// material-ui
import {
	Alert,
	Avatar,
	Button,
	Chip,
	Divider,
	Grid,
	Paper,
	Stack,
	Tab,
	Tabs,
	Typography,
	useTheme,
	Box,
	List,
	ListItem,
	ListItemText,
	IconButton,
	FormControlLabel,
	Checkbox,
	CircularProgress,
	Tooltip,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// project imports
import MainCard from "components/MainCard";
import { getUserById, clearUserData } from "store/reducers/users";
import { DefaultRootStateProps } from "types/root";
import { User, Subscription, UserLightData } from "types/user";
import DeleteUserDialog from "./DeleteUserDialog";
import EditUserModal from "./EditUserModal";
import { formatCurrency } from "utils/formatCurrency";

// assets
import {
	User as UserIcon,
	Wallet,
	Lock,
	Calendar,
	Folder2,
	Calculator,
	Profile2User,
	CalendarAdd,
	CardPos,
	Edit2,
	Save2,
	CloseCircle,
	RefreshCircle,
	Setting2,
} from "iconsax-react";

// API and types
import ApiService from "store/reducers/ApiService";
import { StripeCustomerHistory } from "types/stripe-history";
import { openSnackbar } from "store/reducers/snackbar";
import { dispatch as storeDispatch } from "store/index";
import dayjs from "dayjs";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div role="tabpanel" hidden={value !== index} id={`user-tabpanel-${index}`} aria-labelledby={`user-tab-${index}`} {...other}>
			{value === index && (
				<Box
					sx={{
						p: 3,
						height: "400px",
						overflowY: "auto",
						"&::-webkit-scrollbar": {
							width: "8px",
						},
						"&::-webkit-scrollbar-track": {
							background: "#f1f1f1",
							borderRadius: "4px",
						},
						"&::-webkit-scrollbar-thumb": {
							background: "#888",
							borderRadius: "4px",
						},
						"&::-webkit-scrollbar-thumb:hover": {
							background: "#555",
						},
					}}
				>
					{children}
				</Box>
			)}
		</div>
	);
}

interface UserViewProps {
	user: User;
	onClose: () => void;
}

// Helper function to get the correct Stripe value based on environment
const getStripeValue = (value: any): string => {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "object" && value !== null) {
		const isDevelopment = import.meta.env.VITE_BASE_URL?.includes("localhost") || import.meta.env.MODE === "development";

		if (isDevelopment && value.test) {
			return value.test;
		} else if (!isDevelopment && value.live) {
			return value.live;
		} else if (value.test) {
			return value.test;
		} else if (value.live) {
			return value.live;
		}
	}

	return "Información no disponible";
};

// Helper function to get Stripe value with environment indicator
const getStripeValueWithIndicator = (value: any): { value: string; isTest?: boolean } => {
	if (typeof value === "string") {
		return { value };
	}

	if (typeof value === "object" && value !== null) {
		const isDevelopment = import.meta.env.VITE_BASE_URL?.includes("localhost") || import.meta.env.MODE === "development";

		if (isDevelopment && value.test) {
			return { value: value.test, isTest: true };
		} else if (!isDevelopment && value.live) {
			return { value: value.live, isTest: false };
		} else if (value.test) {
			return { value: value.test, isTest: true };
		} else if (value.live) {
			return { value: value.live, isTest: false };
		}
	}

	return { value: "Información no disponible" };
};

const UserView: React.FC<UserViewProps> = ({ user, onClose }) => {
	const theme = useTheme();
	const dispatch = useDispatch();
	const { user: userDetails, lightData } = useSelector((state: DefaultRootStateProps) => state.users);

	// Estados para los modales
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const [stripeHistory, setStripeHistory] = useState<StripeCustomerHistory | null>(null);
	const [stripeHistoryLoading, setStripeHistoryLoading] = useState(false);
	const [stripeHistoryError, setStripeHistoryError] = useState<string | null>(null);

	// Estados para editar el downgrade grace period
	const [isEditingGracePeriod, setIsEditingGracePeriod] = useState(false);
	const [gracePeriodExpiresAt, setGracePeriodExpiresAt] = useState<Date | null>(null);
	const [autoArchiveScheduled, setAutoArchiveScheduled] = useState(false);
	const [savingGracePeriod, setSavingGracePeriod] = useState(false);

	// Estado para sincronización de suscripción
	const [syncingSubscription, setSyncingSubscription] = useState(false);

	// Estado para sincronización de almacenamiento
	const [syncingStorage, setSyncingStorage] = useState(false);

	useEffect(() => {
		const userId = user?.id || user?._id;
		if (userId) {
			dispatch(getUserById(userId) as any);
		}

		return () => {
			dispatch(clearUserData() as any);
		};
	}, [user, dispatch]);

	// Initialize grace period values when subscription data is available
	useEffect(() => {
		if (userDetails?.subscription?.downgradeGracePeriod) {
			const gracePeriod = userDetails.subscription.downgradeGracePeriod;
			setGracePeriodExpiresAt(gracePeriod.expiresAt ? new Date(gracePeriod.expiresAt) : null);
			setAutoArchiveScheduled(gracePeriod.autoArchiveScheduled || false);
		}
	}, [userDetails?.subscription?.downgradeGracePeriod]);

	// Información combinada
	const userData = userDetails || user;

	const handleEditClick = () => {
		setEditModalOpen(true);
	};

	const handleDeleteClick = () => {
		setDeleteDialogOpen(true);
	};

	const handleEditModalClose = () => {
		setEditModalOpen(false);
	};

	const handleDeleteDialogClose = () => {
		setDeleteDialogOpen(false);
		if (!userDetails) {
			onClose();
		}
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);

		// Cargar historial de Stripe cuando se selecciona esa pestaña
		if (newValue === 6 && !stripeHistory && !stripeHistoryLoading) {
			const userId = userData?.id || userData?._id;
			if (userId) {
				loadStripeHistory(userId);
			}
		}
	};

	const loadStripeHistory = async (userId: string) => {
		setStripeHistoryLoading(true);
		setStripeHistoryError(null);
		try {
			const response = await ApiService.getStripeCustomerHistory(userId);
			if (response.success && response.data) {
				setStripeHistory(response.data);
			} else {
				setStripeHistoryError(response.message || "No se pudo cargar el historial de Stripe");
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Error desconocido al cargar el historial de Stripe";
			setStripeHistoryError(errorMessage);
		} finally {
			setStripeHistoryLoading(false);
		}
	};

	const handleSaveGracePeriod = async () => {
		const userId = userData?.id || userData?._id;
		if (!userId) {
			storeDispatch(
				openSnackbar({
					open: true,
					message: "No se pudo identificar el usuario",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
			return;
		}

		setSavingGracePeriod(true);
		try {
			const response = await ApiService.updateUserSubscription(userId, {
				downgradeGracePeriod: {
					...userData?.subscription?.downgradeGracePeriod,
					expiresAt: gracePeriodExpiresAt,
					autoArchiveScheduled: autoArchiveScheduled,
				} as any,
			});

			if (response.success) {
				storeDispatch(
					openSnackbar({
						open: true,
						message: "Período de gracia actualizado correctamente",
						variant: "alert",
						alert: { color: "success" },
						close: true,
					}),
				);
				setIsEditingGracePeriod(false);
				dispatch(getUserById(userId) as any);
			} else {
				storeDispatch(
					openSnackbar({
						open: true,
						message: response.message || "Error al actualizar el período de gracia",
						variant: "alert",
						alert: { color: "error" },
						close: true,
					}),
				);
			}
		} catch (error) {
			storeDispatch(
				openSnackbar({
					open: true,
					message: "Error al actualizar el período de gracia",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setSavingGracePeriod(false);
		}
	};

	const handleCancelEditGracePeriod = () => {
		setIsEditingGracePeriod(false);
		if (userDetails?.subscription?.downgradeGracePeriod) {
			const gracePeriod = userDetails.subscription.downgradeGracePeriod;
			setGracePeriodExpiresAt(gracePeriod.expiresAt ? new Date(gracePeriod.expiresAt) : null);
			setAutoArchiveScheduled(gracePeriod.autoArchiveScheduled || false);
		}
	};

	const handleSyncSubscription = async () => {
		const userId = userData?.id || userData?._id;
		if (!userId) {
			storeDispatch(
				openSnackbar({
					open: true,
					message: "No se pudo obtener el ID del usuario",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
			return;
		}

		setSyncingSubscription(true);
		try {
			const response = await ApiService.repairUserSubscription(userId);

			if (response.success) {
				storeDispatch(
					openSnackbar({
						open: true,
						message: response.message || "Suscripción sincronizada exitosamente",
						variant: "alert",
						alert: { color: "success" },
						close: true,
					}),
				);
				dispatch(getUserById(userId) as any);
			} else {
				storeDispatch(
					openSnackbar({
						open: true,
						message: response.message || "Error al sincronizar la suscripción",
						variant: "alert",
						alert: { color: "error" },
						close: true,
					}),
				);
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || error?.message || "Error al sincronizar la suscripción";
			storeDispatch(
				openSnackbar({
					open: true,
					message: errorMessage,
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setSyncingSubscription(false);
		}
	};

	const handleSyncStorage = async () => {
		const userId = userData?.id || userData?._id;
		if (!userId) {
			storeDispatch(
				openSnackbar({
					open: true,
					message: "No se pudo obtener el ID del usuario",
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
			return;
		}

		setSyncingStorage(true);
		try {
			const response = await ApiService.recalculateUserStorage(userId);

			if (response.success) {
				const beforeMB = response.data?.before?.storageMB || 0;
				const afterMB = response.data?.after?.storage?.totalMB || 0;
				const difference = response.data?.difference?.mb || 0;

				let message = `Almacenamiento sincronizado para ${response.data?.user?.email || "el usuario"}`;
				if (response.data?.changed) {
					message += `. Antes: ${beforeMB.toFixed(2)} MB, Después: ${afterMB.toFixed(2)} MB (${
						difference > 0 ? "+" : ""
					}${difference.toFixed(2)} MB)`;
				}

				storeDispatch(
					openSnackbar({
						open: true,
						message,
						variant: "alert",
						alert: { color: "success" },
						close: true,
					}),
				);
				dispatch(getUserById(userId) as any);
			} else {
				storeDispatch(
					openSnackbar({
						open: true,
						message: response.message || "Error al sincronizar el almacenamiento",
						variant: "alert",
						alert: { color: "error" },
						close: true,
					}),
				);
			}
		} catch (error: any) {
			const errorMessage = error?.response?.data?.message || error?.message || "Error al sincronizar el almacenamiento";
			storeDispatch(
				openSnackbar({
					open: true,
					message: errorMessage,
					variant: "alert",
					alert: { color: "error" },
					close: true,
				}),
			);
		} finally {
			setSyncingStorage(false);
		}
	};

	// Renderizado de chip de estado
	const renderStatusChip = (status: string) => {
		let color;
		let label;

		switch (status.toLowerCase()) {
			case "active":
			case "activo":
				color = "success";
				label = "Activo";
				break;
			case "inactive":
			case "inactivo":
				color = "error";
				label = "Inactivo";
				break;
			case "pending":
			case "pendiente":
				color = "warning";
				label = "Pendiente";
				break;
			default:
				color = "primary";
				label = status;
		}

		return (
			<Chip
				label={label}
				size="small"
				color={color as any}
				sx={{
					borderRadius: "4px",
					fontSize: "0.875rem",
				}}
			/>
		);
	};

	// Renderizar chip de estado de suscripción
	const renderSubscriptionStatusChip = (status: string) => {
		let color;
		let label;

		switch (status.toLowerCase()) {
			case "active":
				color = "success";
				label = "Activa";
				break;
			case "canceled":
				color = "error";
				label = "Cancelada";
				break;
			case "past_due":
				color = "warning";
				label = "Pago vencido";
				break;
			case "trialing":
				color = "info";
				label = "Período de prueba";
				break;
			case "incomplete":
				color = "warning";
				label = "Incompleta";
				break;
			case "unpaid":
				color = "error";
				label = "Impaga";
				break;
			case "incomplete_expired":
				color = "error";
				label = "Incompleta expirada";
				break;
			default:
				color = "default";
				label = status;
		}

		return (
			<Chip
				label={label}
				size="small"
				color={color as any}
				sx={{
					borderRadius: "4px",
					fontSize: "0.875rem",
				}}
			/>
		);
	};

	// Renderizar información de la suscripción
	const renderSubscriptionInfo = (subscription?: Subscription) => {
		if (!subscription) {
			return (
				<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
						<Alert severity="info" sx={{ flex: 1, mr: 2 }}>
							<Typography variant="body2">
								<strong>Nota:</strong> La información mostrada corresponde a los datos del usuario dentro de la colección de suscripciones.
							</Typography>
						</Alert>
						<Tooltip title="Sincronizar con Stripe para obtener información de suscripción">
							<Button
								variant="outlined"
								size="small"
								startIcon={syncingSubscription ? <CircularProgress size={16} /> : <RefreshCircle size={16} />}
								onClick={handleSyncSubscription}
								disabled={syncingSubscription}
								sx={{
									minWidth: 150,
									borderColor: theme.palette.primary.main,
									color: theme.palette.primary.main,
									"&:hover": {
										borderColor: theme.palette.primary.dark,
										backgroundColor: theme.palette.action.hover,
									},
								}}
							>
								{syncingSubscription ? "Sincronizando..." : "Sincronizar"}
							</Button>
						</Tooltip>
					</Box>
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
							borderRadius: 2,
						}}
					>
						<Typography variant="body1" align="center">
							El usuario no posee información sobre suscripción dentro de la colección de suscripciones.
						</Typography>
						<Typography variant="body2" align="center" sx={{ mt: 2, color: "text.secondary" }}>
							Usa el botón "Sincronizar" para intentar obtener la información desde Stripe.
						</Typography>
					</Paper>
				</Stack>
			);
		}

		return (
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
					<Alert severity="info" sx={{ flex: 1, mr: 2 }}>
						<Typography variant="body2">
							<strong>Nota:</strong> La información mostrada corresponde a los datos del usuario dentro de la colección de suscripciones.
						</Typography>
					</Alert>
					<Tooltip title="Sincronizar con Stripe para actualizar la información de suscripción">
						<Button
							variant="outlined"
							size="small"
							startIcon={syncingSubscription ? <CircularProgress size={16} /> : <RefreshCircle size={16} />}
							onClick={handleSyncSubscription}
							disabled={syncingSubscription}
							sx={{
								minWidth: 150,
								borderColor: theme.palette.primary.main,
								color: theme.palette.primary.main,
								"&:hover": {
									borderColor: theme.palette.primary.dark,
									backgroundColor: theme.palette.action.hover,
								},
							}}
						>
							{syncingSubscription ? "Sincronizando..." : "Sincronizar"}
						</Button>
					</Tooltip>
				</Box>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Plan</Typography>
					<Chip
						label={subscription.plan || subscription.name || "Sin información"}
						size="small"
						color="primary"
						sx={{
							borderRadius: "4px",
							fontSize: "0.875rem",
							textTransform: "capitalize",
						}}
					/>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Estado</Typography>
					{renderSubscriptionStatusChip(subscription.status)}
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">ID de Cliente Stripe</Typography>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
							{(() => {
								const stripeData = getStripeValueWithIndicator(subscription.stripeCustomerId);
								return stripeData.value;
							})()}
						</Typography>
						{(() => {
							const stripeData = getStripeValueWithIndicator(subscription.stripeCustomerId);
							if (stripeData.isTest !== undefined) {
								return (
									<Chip
										label={stripeData.isTest ? "TEST" : "LIVE"}
										size="small"
										color={stripeData.isTest ? "warning" : "success"}
										sx={{
											height: 20,
											fontSize: "0.7rem",
											fontWeight: "bold",
										}}
									/>
								);
							}
							return null;
						})()}
					</Box>
				</Stack>

				{subscription.stripeSubscriptionId && (
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="subtitle1">ID de Suscripción Stripe</Typography>
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
								{(() => {
									const stripeData = getStripeValueWithIndicator(subscription.stripeSubscriptionId);
									return stripeData.value;
								})()}
							</Typography>
							{(() => {
								const stripeData = getStripeValueWithIndicator(subscription.stripeSubscriptionId);
								if (stripeData.isTest !== undefined) {
									return (
										<Chip
											label={stripeData.isTest ? "TEST" : "LIVE"}
											size="small"
											color={stripeData.isTest ? "warning" : "success"}
											sx={{
												height: 20,
												fontSize: "0.7rem",
												fontWeight: "bold",
											}}
										/>
									);
								}
								return null;
							})()}
						</Box>
					</Stack>
				)}

				<Divider />
				<Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
					Período de Facturación
				</Typography>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Inicio del período actual</Typography>
					<Typography variant="body2">
						{subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : "Información no disponible"}
					</Typography>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Fin del período actual</Typography>
					<Typography variant="body2">
						{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "Información no disponible"}
					</Typography>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Cancelar al final del período</Typography>
					<Typography variant="body2">{subscription.cancelAtPeriodEnd ? "Sí" : "No"}</Typography>
				</Stack>

				{subscription.canceledAt && (
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="subtitle1">Fecha de cancelación</Typography>
						<Typography variant="body2">{new Date(subscription.canceledAt).toLocaleDateString()}</Typography>
					</Stack>
				)}

				{(subscription.pendingPlanChange || subscription.scheduledPlanChange || subscription.downgradeGracePeriod) && (
					<>
						<Divider />
						<Typography variant="subtitle1" sx={{ fontWeight: "bold", fontSize: "0.9rem" }}>
							Cambios Programados
						</Typography>

						<Grid container spacing={1}>
							{subscription.pendingPlanChange && (
								<Grid item xs={12} md={6}>
									<Paper elevation={0} sx={{ p: 1.5, backgroundColor: "warning.light", height: "100%" }}>
										<Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
											Cambio pendiente: {getStripeValue(subscription.pendingPlanChange.planId)}
										</Typography>
										<Typography variant="caption">
											Efectivo:{" "}
											{subscription.pendingPlanChange.effectiveDate
												? new Date(subscription.pendingPlanChange.effectiveDate).toLocaleDateString()
												: "No especificada"}
										</Typography>
									</Paper>
								</Grid>
							)}

							{subscription.downgradeGracePeriod && (
								<Grid item xs={12} md={6}>
									<Paper elevation={0} sx={{ p: 1.5, backgroundColor: "info.light", height: "100%" }}>
										<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
											<Box sx={{ flex: 1 }}>
												<Typography variant="body2">
													Período de gracia {subscription.downgradeGracePeriod.isActive ? "activo" : "inactivo"}
													{subscription.downgradeGracePeriod.previousPlan &&
														` (plan anterior: ${subscription.downgradeGracePeriod.previousPlan})`}
												</Typography>

												{isEditingGracePeriod ? (
													<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
														<Stack spacing={2} sx={{ mt: 2 }}>
															<DatePicker
																label="Fecha de expiración"
																value={gracePeriodExpiresAt ? dayjs(gracePeriodExpiresAt) : null}
																onChange={(newValue) => setGracePeriodExpiresAt(newValue?.toDate() || null)}
																slotProps={{
																	textField: {
																		size: "small",
																		fullWidth: true,
																	},
																}}
															/>
															<FormControlLabel
																control={
																	<Checkbox
																		checked={autoArchiveScheduled}
																		onChange={(e) => setAutoArchiveScheduled(e.target.checked)}
																		size="small"
																	/>
																}
																label="Auto-archivar programado"
															/>
															<Stack direction="row" spacing={1}>
																<Button
																	size="small"
																	variant="contained"
																	startIcon={<Save2 size={16} />}
																	onClick={handleSaveGracePeriod}
																	disabled={savingGracePeriod}
																>
																	{savingGracePeriod ? "Guardando..." : "Guardar"}
																</Button>
																<Button
																	size="small"
																	variant="outlined"
																	startIcon={<CloseCircle size={16} />}
																	onClick={handleCancelEditGracePeriod}
																	disabled={savingGracePeriod}
																>
																	Cancelar
																</Button>
															</Stack>
														</Stack>
													</LocalizationProvider>
												) : (
													<>
														<Typography variant="caption">
															Expira:{" "}
															{subscription.downgradeGracePeriod.expiresAt
																? new Date(subscription.downgradeGracePeriod.expiresAt).toLocaleDateString()
																: "No especificada"}
														</Typography>
														{subscription.downgradeGracePeriod.autoArchiveScheduled !== undefined && (
															<Typography variant="caption" display="block">
																Auto-archivar: {subscription.downgradeGracePeriod.autoArchiveScheduled ? "Sí" : "No"}
															</Typography>
														)}
													</>
												)}
											</Box>
											{!isEditingGracePeriod && (
												<IconButton size="small" onClick={() => setIsEditingGracePeriod(true)} sx={{ ml: 1 }}>
													<Edit2 size={16} />
												</IconButton>
											)}
										</Stack>
									</Paper>
								</Grid>
							)}
						</Grid>
					</>
				)}

				{subscription.statusHistory && subscription.statusHistory.length > 0 && (
					<>
						<Divider />
						<Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
							Historial de Estados
						</Typography>

						<List dense>
							{subscription.statusHistory.slice(0, 5).map((history, index) => (
								<ListItem key={index} sx={{ px: 0 }}>
									<ListItemText
										primary={
											<Stack direction="row" alignItems="center" spacing={1}>
												<Typography variant="body2" fontWeight="medium">
													{history.status}
												</Typography>
												{history.reason && (
													<Typography variant="caption" color="textSecondary">
														- {history.reason}
													</Typography>
												)}
											</Stack>
										}
										secondary={new Date(history.changedAt).toLocaleString()}
									/>
								</ListItem>
							))}
						</List>
						{subscription.statusHistory.length > 5 && (
							<Typography variant="caption" color="textSecondary" align="center" display="block">
								Mostrando 5 de {subscription.statusHistory.length} cambios de estado
							</Typography>
						)}
					</>
				)}

				<Divider />
				<Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
					Información de Auditoría
				</Typography>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Creado</Typography>
					<Typography variant="body2">
						{subscription.createdAt ? new Date(subscription.createdAt).toLocaleString() : "Información no disponible"}
					</Typography>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Última actualización</Typography>
					<Typography variant="body2">
						{subscription.updatedAt ? new Date(subscription.updatedAt).toLocaleString() : "Información no disponible"}
					</Typography>
				</Stack>
			</Stack>
		);
	};

	// Renderiza información de actividad
	const renderActivityInfo = () => {
		return (
			<Stack spacing={2}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Último acceso</Typography>
					<Typography variant="body2">{userData?.lastLogin ? new Date(userData.lastLogin).toLocaleString() : "Nunca"}</Typography>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Fecha de registro</Typography>
					<Typography variant="body2">{userData?.createdAt ? new Date(userData.createdAt).toLocaleString() : "-"}</Typography>
				</Stack>

				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="subtitle1">Última actualización</Typography>
					<Typography variant="body2">{userData?.updatedAt ? new Date(userData.updatedAt).toLocaleString() : "-"}</Typography>
				</Stack>
			</Stack>
		);
	};

	// Renderizar configuración y preferencias
	const renderPreferences = () => {
		return (
			<Stack spacing={2}>
				<Alert severity="info">
					<Typography variant="body2">La información de preferencias no está disponible actualmente.</Typography>
				</Alert>
			</Stack>
		);
	};

	// Renderizar límites de recursos
	const renderResourceLimits = () => {
		const subscription = userData?.subscription;

		if (!subscription) {
			return (
				<Alert severity="info">
					<Typography variant="body2">No hay información de límites disponible para este usuario.</Typography>
				</Alert>
			);
		}

		return (
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{subscription.limits && Object.keys(subscription.limits).length > 0 && (
					<>
						<Typography variant="h6" sx={{ fontWeight: "bold" }}>
							Límites del Plan
						</Typography>
						<Paper
							elevation={0}
							sx={{
								p: 3,
								backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
								borderRadius: 2,
							}}
						>
							<Grid container spacing={2}>
								{Object.entries(subscription.limits).map(([key, value], index) => (
									<Grid item xs={12} sm={6} key={index}>
										<Stack spacing={1}>
											<Stack direction="row" alignItems="center" spacing={1}>
												<Typography variant="subtitle2" color="textSecondary">
													{key === "maxFolders"
														? "Carpetas máximas"
														: key === "maxCalculators"
														? "Calculadoras máximas"
														: key === "maxContacts"
														? "Contactos máximos"
														: key === "storageLimit" || key.toLowerCase() === "storage" || key === "Storage"
														? "Almacenamiento"
														: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
												</Typography>
												{(key === "storageLimit" || key.toLowerCase() === "storage" || key === "Storage") && (
													<Tooltip title="Sincronizar el cálculo de almacenamiento del usuario">
														<IconButton
															size="small"
															onClick={handleSyncStorage}
															disabled={syncingStorage}
															sx={{
																color: theme.palette.primary.main,
																"&:hover": {
																	backgroundColor: theme.palette.action.hover,
																},
															}}
														>
															{syncingStorage ? <CircularProgress size={16} /> : <RefreshCircle size={16} />}
														</IconButton>
													</Tooltip>
												)}
											</Stack>
											<Typography variant="h6" fontWeight="medium">
												{key === "storageLimit" || key.toLowerCase() === "storage" || key === "Storage"
													? `${value} MB`
													: String(value || "Información no disponible")}
											</Typography>
										</Stack>
									</Grid>
								))}
							</Grid>
						</Paper>
					</>
				)}

				{subscription.usageTracking && (
					<>
						<Typography variant="h6" sx={{ fontWeight: "bold" }}>
							Uso Actual
						</Typography>
						<Paper
							elevation={0}
							sx={{
								p: 3,
								backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
								borderRadius: 2,
							}}
						>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} sm={6}>
									<Stack spacing={1}>
										<Typography variant="subtitle2" color="textSecondary">
											Carpetas creadas
										</Typography>
										<Typography variant="h6" fontWeight="medium">
											{subscription.usageTracking.foldersCreated || 0}
											{subscription.limits?.maxFolders && (
												<Typography component="span" variant="body2" color="textSecondary">
													{" / "}
													{subscription.limits.maxFolders}
												</Typography>
											)}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Stack spacing={1}>
										<Typography variant="subtitle2" color="textSecondary">
											Cálculos creados
										</Typography>
										<Typography variant="h6" fontWeight="medium">
											{subscription.usageTracking.calculatorsCreated || 0}
											{subscription.limits?.maxCalculators && (
												<Typography component="span" variant="body2" color="textSecondary">
													{" / "}
													{subscription.limits.maxCalculators}
												</Typography>
											)}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Stack spacing={1}>
										<Typography variant="subtitle2" color="textSecondary">
											Contactos creados
										</Typography>
										<Typography variant="h6" fontWeight="medium">
											{subscription.usageTracking.contactsCreated || 0}
											{subscription.limits?.maxContacts && (
												<Typography component="span" variant="body2" color="textSecondary">
													{" / "}
													{subscription.limits.maxContacts}
												</Typography>
											)}
										</Typography>
									</Stack>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Stack spacing={1}>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Typography variant="subtitle2" color="textSecondary">
												Almacenamiento usado
											</Typography>
											<Tooltip title="Sincronizar el cálculo de almacenamiento del usuario">
												<IconButton
													size="small"
													onClick={handleSyncStorage}
													disabled={syncingStorage}
													sx={{
														color: theme.palette.primary.main,
														"&:hover": {
															backgroundColor: theme.palette.action.hover,
														},
													}}
												>
													{syncingStorage ? <CircularProgress size={16} /> : <RefreshCircle size={16} />}
												</IconButton>
											</Tooltip>
										</Stack>
										<Typography variant="h6" fontWeight="medium">
											{subscription.usageTracking.storageUsed || 0} MB
											{subscription.limits?.storageLimit && (
												<Typography component="span" variant="body2" color="textSecondary">
													{" / "}
													{subscription.limits.storageLimit} MB
												</Typography>
											)}
										</Typography>
									</Stack>
								</Grid>
							</Grid>
						</Paper>
					</>
				)}
			</Stack>
		);
	};

	// Renderizar información resumida (lightData)
	const renderLightData = (lightData?: UserLightData) => {
		if (!lightData) {
			return (
				<Alert severity="info">
					<Typography variant="body2">No hay información resumida disponible.</Typography>
				</Alert>
			);
		}

		return (
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Carpetas */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
							borderRadius: 2,
							height: "100%",
						}}
					>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
							<Folder2 size={20} />
							<Typography variant="h6">Carpetas</Typography>
							<Chip label={`${lightData.folders.totalCount} total`} size="small" sx={{ ml: "auto" }} />
						</Stack>
						{lightData.folders.items.length > 0 ? (
							<Stack spacing={1.5}>
								{lightData.folders.items.slice(0, 5).map((folder, index) => (
									<Box key={folder._id}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Box>
												<Typography variant="subtitle2">{folder.folderName}</Typography>
												<Typography variant="caption" color="textSecondary">
													{folder.materia} {folder.status}
												</Typography>
											</Box>
											<Typography variant="body2" fontWeight="medium">
												{folder.amount != null ? formatCurrency(folder.amount) : "-"}
											</Typography>
										</Stack>
										{index < lightData.folders.items.length - 1 && <Divider sx={{ mt: 1.5 }} />}
									</Box>
								))}
								{lightData.folders.totalCount > lightData.folders.count && (
									<Typography variant="caption" color="textSecondary" align="center" sx={{ pt: 1 }}>
										Mostrando {lightData.folders.count} de {lightData.folders.totalCount} carpetas
									</Typography>
								)}
							</Stack>
						) : (
							<Typography variant="body2" color="textSecondary">
								No hay carpetas registradas
							</Typography>
						)}
					</Paper>
				</Grid>

				{/* Calculadoras */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
							borderRadius: 2,
							height: "100%",
						}}
					>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
							<Calculator size={20} />
							<Typography variant="h6">Cálculos</Typography>
							<Chip label={`${lightData.calculators.totalCount} total`} size="small" sx={{ ml: "auto" }} />
						</Stack>
						{lightData.calculators.items.length > 0 ? (
							<Stack spacing={1.5}>
								{lightData.calculators.items.slice(0, 5).map((calc, index) => (
									<Box key={calc._id}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Box>
												<Typography variant="subtitle2">{calc.type}</Typography>
												<Typography variant="caption" color="textSecondary">
													{calc.classType} {new Date(calc.date).toLocaleDateString()}
												</Typography>
											</Box>
											<Typography variant="body2" fontWeight="medium">
												{calc.amount != null ? formatCurrency(calc.amount) : "-"}
											</Typography>
										</Stack>
										{index < lightData.calculators.items.length - 1 && <Divider sx={{ mt: 1.5 }} />}
									</Box>
								))}
								{lightData.calculators.totalCount > lightData.calculators.count && (
									<Typography variant="caption" color="textSecondary" align="center" sx={{ pt: 1 }}>
										Mostrando {lightData.calculators.count} de {lightData.calculators.totalCount} cálculos
									</Typography>
								)}
							</Stack>
						) : (
							<Typography variant="body2" color="textSecondary">
								No hay cálculos registrados
							</Typography>
						)}
					</Paper>
				</Grid>

				{/* Contactos */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
							borderRadius: 2,
							height: "100%",
						}}
					>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
							<Profile2User size={20} />
							<Typography variant="h6">Contactos</Typography>
							<Chip label={`${lightData.contacts.totalCount} total`} size="small" sx={{ ml: "auto" }} />
						</Stack>
						{lightData.contacts.items.length > 0 ? (
							<Stack spacing={1.5}>
								{lightData.contacts.items.slice(0, 5).map((contact, index) => (
									<Box key={contact._id}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Box>
												<Typography variant="subtitle2">
													{contact.name} {contact.lastName}
												</Typography>
												<Typography variant="caption" color="textSecondary">
													{contact.role} {contact.type}
												</Typography>
											</Box>
											{contact.email && (
												<Typography variant="caption" color="textSecondary">
													{contact.email}
												</Typography>
											)}
										</Stack>
										{index < lightData.contacts.items.length - 1 && <Divider sx={{ mt: 1.5 }} />}
									</Box>
								))}
								{lightData.contacts.totalCount > lightData.contacts.count && (
									<Typography variant="caption" color="textSecondary" align="center" sx={{ pt: 1 }}>
										Mostrando {lightData.contacts.count} de {lightData.contacts.totalCount} contactos
									</Typography>
								)}
							</Stack>
						) : (
							<Typography variant="body2" color="textSecondary">
								No hay contactos registrados
							</Typography>
						)}
					</Paper>
				</Grid>

				{/* Eventos */}
				<Grid item xs={12} md={6}>
					<Paper
						elevation={0}
						sx={{
							p: 3,
							backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100",
							borderRadius: 2,
							height: "100%",
						}}
					>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
							<CalendarAdd size={20} />
							<Typography variant="h6">Eventos</Typography>
							<Chip label={`${lightData.events.totalCount} total`} size="small" sx={{ ml: "auto" }} />
						</Stack>
						{lightData.events.items.length > 0 ? (
							<Stack spacing={1.5}>
								{lightData.events.items.slice(0, 5).map((event, index) => (
									<Box key={event._id}>
										<Stack direction="row" justifyContent="space-between" alignItems="center">
											<Box sx={{ flex: 1 }}>
												<Typography variant="subtitle2" noWrap>
													{event.title}
												</Typography>
												<Typography variant="caption" color="textSecondary">
													{new Date(event.start).toLocaleDateString()} {event.type}
												</Typography>
											</Box>
											{!event.allDay && (
												<Typography variant="caption" color="textSecondary">
													{new Date(event.start).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
													})}
												</Typography>
											)}
										</Stack>
										{index < lightData.events.items.length - 1 && <Divider sx={{ mt: 1.5 }} />}
									</Box>
								))}
								{lightData.events.totalCount > lightData.events.count && (
									<Typography variant="caption" color="textSecondary" align="center" sx={{ pt: 1 }}>
										Mostrando {lightData.events.count} de {lightData.events.totalCount} eventos
									</Typography>
								)}
							</Stack>
						) : (
							<Typography variant="body2" color="textSecondary">
								No hay eventos programados
							</Typography>
						)}
					</Paper>
				</Grid>
			</Grid>
		);
	};

	// Renderizar historial de Stripe
	const renderStripeHistory = () => {
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

		if (stripeHistoryLoading) {
			return (
				<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
					<CircularProgress />
				</Box>
			);
		}

		if (stripeHistoryError) {
			return (
				<Alert severity="error" sx={{ mb: 2 }}>
					{stripeHistoryError}
				</Alert>
			);
		}

		if (!stripeHistory) {
			return (
				<Alert severity="info" sx={{ mb: 2 }}>
					No se ha cargado el historial de Stripe. Intenta refrescar la página.
				</Alert>
			);
		}

		return (
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Información del Cliente */}
				<Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100" }}>
					<Typography variant="h6" sx={{ mb: 2 }}>
						Información del Cliente
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} md={6}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									ID de Cliente
								</Typography>
								<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
									{stripeHistory.customer.id}
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={6}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Email
								</Typography>
								<Typography variant="body2">{stripeHistory.customer.email}</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={6}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Creado
								</Typography>
								<Typography variant="body2">{new Date(stripeHistory.customer.created).toLocaleString()}</Typography>
							</Stack>
						</Grid>
					</Grid>
				</Paper>

				{/* Estadísticas */}
				<Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100" }}>
					<Typography variant="h6" sx={{ mb: 2 }}>
						Estadísticas
					</Typography>
					<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
						<Grid item xs={6} md={3}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Total Gastado
								</Typography>
								<Typography variant="h5">{formatCurrency(stripeHistory.stats?.lifetimeValue || 0)}</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={3}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Suscripciones Activas
								</Typography>
								<Typography variant="h5">{stripeHistory.stats?.activeSubscriptions || 0}</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={3}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Total Facturas
								</Typography>
								<Typography variant="h5">{stripeHistory.stats?.totalInvoices || 0}</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} md={3}>
							<Stack spacing={1}>
								<Typography variant="subtitle2" color="text.secondary">
									Facturas Pagadas
								</Typography>
								<Typography variant="h5">{stripeHistory.stats?.paidInvoices || 0}</Typography>
							</Stack>
						</Grid>
					</Grid>
				</Paper>

				{/* Suscripciones */}
				{stripeHistory.subscriptions.length > 0 && (
					<Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100" }}>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Historial de Suscripciones
						</Typography>
						<Stack spacing={2}>
							{stripeHistory.subscriptions.map((sub) => (
								<Paper key={sub.id} variant="outlined" sx={{ p: 2 }}>
									<Grid container spacing={2}>
										<Grid item xs={12}>
											<Stack direction="row" justifyContent="space-between" alignItems="center">
												<Typography variant="subtitle1">ID: {sub.id}</Typography>
												{renderSubscriptionStatusChip(sub.status)}
											</Stack>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Período Actual
											</Typography>
											<Typography variant="body2">
												{new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}
											</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary">
												Creada
											</Typography>
											<Typography variant="body2">{new Date(sub.created).toLocaleString()}</Typography>
										</Grid>
										{sub.plan && (
											<Grid item xs={12}>
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="body2">
														Plan: {sub.plan.product || sub.plan.id}
														{sub.plan.interval && ` (${formatInterval(sub.plan.interval)})`}
													</Typography>
													<Typography variant="body2" fontWeight="medium">
														{formatCurrency(sub.plan.amount || 0)} {(sub.plan.currency || "usd").toUpperCase()}
													</Typography>
												</Stack>
											</Grid>
										)}
										{sub.canceled_at && (
											<Grid item xs={12}>
												<Typography variant="caption" color="error">
													Cancelada el: {new Date(sub.canceled_at).toLocaleString()}
												</Typography>
											</Grid>
										)}
									</Grid>
								</Paper>
							))}
						</Stack>
					</Paper>
				)}

				{/* Facturas */}
				{stripeHistory.invoices.length > 0 && (
					<Paper elevation={0} sx={{ p: 3, backgroundColor: theme.palette.mode === "dark" ? "background.default" : "grey.100" }}>
						<Typography variant="h6" sx={{ mb: 2 }}>
							Facturas
						</Typography>
						<Stack spacing={2}>
							{stripeHistory.invoices.slice(0, 10).map((invoice) => (
								<Paper key={invoice.id} variant="outlined" sx={{ p: 2 }}>
									<Grid container spacing={2} alignItems="center">
										<Grid item xs={12} md={3}>
											<Typography variant="subtitle2">{invoice.number || invoice.id}</Typography>
											<Typography variant="caption" color="text.secondary">
												{new Date(invoice.created).toLocaleDateString()}
											</Typography>
										</Grid>
										<Grid item xs={12} md={3}>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip label={invoice.paid ? "Pagada" : "Pendiente"} size="small" color={invoice.paid ? "success" : "warning"} />
												<Typography variant="caption" color="text.secondary">
													{invoice.status}
												</Typography>
											</Stack>
										</Grid>
										<Grid item xs={12} md={3}>
											<Typography variant="body2" fontWeight="medium">
												{formatCurrency((invoice.amount_paid || 0) / 100)} {(invoice.currency || "usd").toUpperCase()}
											</Typography>
										</Grid>
										<Grid item xs={12} md={3}>
											<Stack direction="row" spacing={1}>
												{invoice.pdf_url && (
													<Button size="small" variant="outlined" href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
														PDF
													</Button>
												)}
												{invoice.hosted_invoice_url && (
													<Button
														size="small"
														variant="outlined"
														href={invoice.hosted_invoice_url}
														target="_blank"
														rel="noopener noreferrer"
													>
														Ver
													</Button>
												)}
											</Stack>
										</Grid>
									</Grid>
								</Paper>
							))}
							{stripeHistory.invoices.length > 10 && (
								<Typography variant="caption" color="text.secondary" align="center">
									Mostrando 10 de {stripeHistory.invoices.length} facturas
								</Typography>
							)}
						</Stack>
					</Paper>
				)}
			</Stack>
		);
	};

	return (
		<>
			<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
				<MainCard
					title={<Typography variant="h5">Detalles del Usuario</Typography>}
					sx={{ flex: 1, display: "flex", flexDirection: "column" }}
				>
					<Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
						{/* Header con info del usuario */}
						<Box sx={{ pb: 2 }}>
							<Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "center", sm: "flex-start" }} spacing={2.5}>
								<Avatar
									alt={userData?.name}
									src={userData?.avatar || "/assets/images/users/default.png"}
									sx={{
										width: { xs: 80, sm: 90 },
										height: { xs: 80, sm: 90 },
										boxShadow: theme.shadows[4],
									}}
								/>
								<Stack spacing={1} sx={{ width: "100%", alignItems: { xs: "center", sm: "flex-start" } }}>
									<Typography variant="h4">{userData?.name}</Typography>
									<Typography variant="body1" color="textSecondary">
										{userData?.email}
									</Typography>
									<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
										{userData?.status && renderStatusChip(userData.status)}
										<Chip
											label={userData?.role}
											size="small"
											sx={{
												borderRadius: "4px",
												backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.primary.light,
												color: theme.palette.primary.main,
												fontSize: "0.875rem",
											}}
										/>
									</Stack>
								</Stack>
							</Stack>
						</Box>

						<Divider />

						{/* Contenido con tabs */}
						<Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", mt: 2 }}>
							<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
								<Tabs value={tabValue} onChange={handleTabChange} aria-label="user tabs" variant="scrollable" scrollButtons="auto">
									<Tab
										icon={<UserIcon size={18} />}
										iconPosition="start"
										label="Información General"
										id="user-tab-0"
										aria-controls="user-tabpanel-0"
									/>
									<Tab
										icon={<Wallet size={18} />}
										iconPosition="start"
										label="Suscripción"
										id="user-tab-1"
										aria-controls="user-tabpanel-1"
									/>
									<Tab
										icon={<Calendar size={18} />}
										iconPosition="start"
										label="Actividad"
										id="user-tab-2"
										aria-controls="user-tabpanel-2"
									/>
									<Tab
										icon={<Lock size={18} />}
										iconPosition="start"
										label="Preferencias"
										id="user-tab-3"
										aria-controls="user-tabpanel-3"
									/>
									<Tab icon={<Folder2 size={18} />} iconPosition="start" label="Resumen" id="user-tab-4" aria-controls="user-tabpanel-4" />
									<Tab
										icon={<Setting2 size={18} />}
										iconPosition="start"
										label="Límites de Recursos"
										id="user-tab-5"
										aria-controls="user-tabpanel-5"
									/>
									<Tab
										icon={<CardPos size={18} />}
										iconPosition="start"
										label="Clientes de Stripe"
										id="user-tab-6"
										aria-controls="user-tabpanel-6"
									/>
								</Tabs>
							</Box>

							<TabPanel value={tabValue} index={0}>
								<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
									<Grid item xs={12} md={6}>
										<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
											<Typography variant="h6">Información Personal</Typography>
											<Stack spacing={2}>
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">Nombre completo</Typography>
													<Typography variant="body2">{userData?.name || "-"}</Typography>
												</Stack>

												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">Correo electrónico</Typography>
													<Typography variant="body2">{userData?.email || "-"}</Typography>
												</Stack>

												{userData?.phone && (
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography variant="subtitle1">Teléfono</Typography>
														<Typography variant="body2">{userData.phone}</Typography>
													</Stack>
												)}
											</Stack>
										</Stack>
									</Grid>
									<Grid item xs={12} md={6}>
										<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
											<Typography variant="h6">Información de Cuenta</Typography>
											<Stack spacing={2}>
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">ID</Typography>
													<Typography
														variant="body2"
														sx={{
															maxWidth: "180px",
															overflow: "hidden",
															textOverflow: "ellipsis",
														}}
													>
														{userData?.id || userData?._id || "-"}
													</Typography>
												</Stack>

												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">Rol</Typography>
													<Chip
														label={userData?.role || "Sin rol"}
														size="small"
														sx={{
															borderRadius: "4px",
															backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[800] : theme.palette.primary.light,
															color: theme.palette.primary.main,
															fontSize: "0.75rem",
														}}
													/>
												</Stack>

												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">Estado</Typography>
													{userData?.status ? renderStatusChip(userData.status) : "-"}
												</Stack>

												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="subtitle1">Fecha de registro</Typography>
													<Typography variant="body2">
														{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "-"}
													</Typography>
												</Stack>
											</Stack>
										</Stack>
									</Grid>
								</Grid>
							</TabPanel>

							<TabPanel value={tabValue} index={1}>
								{renderSubscriptionInfo(userData?.subscription)}
							</TabPanel>

							<TabPanel value={tabValue} index={2}>
								{renderActivityInfo()}
							</TabPanel>

							<TabPanel value={tabValue} index={3}>
								{renderPreferences()}
							</TabPanel>

							<TabPanel value={tabValue} index={4}>
								{renderLightData(lightData)}
							</TabPanel>

							<TabPanel value={tabValue} index={5}>
								{renderResourceLimits()}
							</TabPanel>

							<TabPanel value={tabValue} index={6}>
								{renderStripeHistory()}
							</TabPanel>
						</Box>

						{/* Botones de acción */}
						<Box sx={{ pt: 2 }}>
							<Divider sx={{ mb: 2 }} />
							<Stack direction="row" spacing={1} justifyContent="space-between">
								<Button variant="outlined" color="error" onClick={handleDeleteClick}>
									Eliminar Usuario
								</Button>
								<Stack direction="row" spacing={1}>
									<Button variant="outlined" onClick={onClose}>
										Cerrar
									</Button>
									<Button variant="contained" onClick={handleEditClick}>
										Editar Usuario
									</Button>
								</Stack>
							</Stack>
						</Box>
					</Box>
				</MainCard>
			</Box>

			{/* Modal para editar usuario */}
			{editModalOpen && userData && <EditUserModal user={userData} open={editModalOpen} onClose={handleEditModalClose} />}

			{/* Diálogo para confirmar eliminación */}
			{deleteDialogOpen && userData && <DeleteUserDialog user={userData} open={deleteDialogOpen} onClose={handleDeleteDialogClose} />}
		</>
	);
};

export default UserView;
