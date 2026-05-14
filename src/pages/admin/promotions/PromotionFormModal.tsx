import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	AlertTitle,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	FormHelperText,
	Grid,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Typography,
	Autocomplete,
	Chip,
} from "@mui/material";
import { Eye, SearchNormal1, Setting2, UserAdd } from "iconsax-react";
import { useSnackbar } from "notistack";
import discountsService, {
	DiscountCode,
	CreateDiscountParams,
	UpdateDiscountParams,
	StripeEnvironment,
	TargetUser,
	TargetContact,
} from "api/discounts";
import { SegmentService } from "store/reducers/segments";
import { Segment } from "types/segment";
import PromotionPreviewTab from "./PromotionPreviewTab";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;
	return (
		<div role="tabpanel" hidden={value !== index} {...other}>
			{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
		</div>
	);
}

interface PromotionFormModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
	discount: DiscountCode | null;
}

const PromotionFormModal = ({ open, onClose, onSuccess, discount }: PromotionFormModalProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const isEditing = !!discount;

	const [loading, setLoading] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const [segments, setSegments] = useState<Segment[]>([]);
	const [loadingSegments, setLoadingSegments] = useState(false);
	// Target users: en creación se acumulan para asignar post-creación; en edición se cargan y sincronizan al guardar
	const [pendingTargetUsers, setPendingTargetUsers] = useState<TargetUser[]>([]);
	const [loadingTargetUsers, setLoadingTargetUsers] = useState(false);
	// Count de targetContacts existentes — para detectar promos públicas sin restricciones
	// y mostrar el warning correspondiente. Se gestionan fuera del form, en el tab "Contactos".
	const [targetContactsCount, setTargetContactsCount] = useState(0);
	// Datos frescos del descuento (re-fetched al abrir en edición para evitar datos stale del padre)
	const [freshDiscount, setFreshDiscount] = useState<DiscountCode | null>(null);
	const [userSearchQuery, setUserSearchQuery] = useState("");
	const [userSearchResults, setUserSearchResults] = useState<TargetUser[]>([]);
	const [userSearchLoading, setUserSearchLoading] = useState(false);
	// Contactos a asignar en modo create (en edit se gestionan vía el tab "Contactos")
	const [pendingTargetContacts, setPendingTargetContacts] = useState<TargetContact[]>([]);
	const [contactSearchQuery, setContactSearchQuery] = useState("");
	const [contactSearchResults, setContactSearchResults] = useState<TargetContact[]>([]);
	const [contactSearchLoading, setContactSearchLoading] = useState(false);
	const [formData, setFormData] = useState({
		code: "",
		name: "",
		description: "",
		discountType: "percentage" as "percentage" | "fixed_amount",
		discountValue: 0,
		currency: "USD",
		validFrom: "",
		validUntil: "",
		duration: "once" as "once" | "repeating" | "forever",
		durationInMonths: 3,
		applicablePlans: [] as string[],
		applicableBillingPeriods: [] as string[],
		maxRedemptions: null as number | null,
		maxRedemptionsPerUser: 1,
		newCustomersOnly: false,
		excludeActiveSubscribers: false,
		minimumAmount: null as number | null,
		isPublic: false,
		showOnLanding: false,
		priority: 0,
		promotionalMessage: "",
		badge: "",
		isActive: true,
		environments: ["development", "production"] as StripeEnvironment[],
		targetSegments: [] as string[],
	});

	// Cargar segmentos disponibles desde la API de Marketing
	useEffect(() => {
		const loadSegments = async () => {
			try {
				setLoadingSegments(true);
				// Obtener solo segmentos activos, ordenados por nombre
				const response = await SegmentService.getSegments(1, 100, "name", "asc", { isActive: true });
				if (response.success && response.data) {
					setSegments(response.data);
				}
			} catch (error) {
				console.error("Error cargando segmentos:", error);
			} finally {
				setLoadingSegments(false);
			}
		};
		if (open) {
			loadSegments();
		}
	}, [open]);

	// Búsqueda de usuarios con debounce
	const searchUsers = useCallback(
		async (query: string) => {
			if (query.length < 2) {
				setUserSearchResults([]);
				return;
			}
			setUserSearchLoading(true);
			try {
				const response = await discountsService.searchUsers(query, 20);
				const existingIds = pendingTargetUsers.map((u) => u._id);
				setUserSearchResults(response.data.filter((u) => !existingIds.includes(u._id)));
			} catch (error) {
				console.error("Error buscando usuarios:", error);
			} finally {
				setUserSearchLoading(false);
			}
		},
		[pendingTargetUsers],
	);

	useEffect(() => {
		const timer = setTimeout(() => searchUsers(userSearchQuery), 300);
		return () => clearTimeout(timer);
	}, [userSearchQuery, searchUsers]);

	// Búsqueda de contactos con debounce
	const searchContacts = useCallback(
		async (query: string) => {
			if (query.length < 2) {
				setContactSearchResults([]);
				return;
			}
			setContactSearchLoading(true);
			try {
				const response = await discountsService.searchContacts(query, 20);
				const existingIds = pendingTargetContacts.map((c) => c._id);
				setContactSearchResults(response.data.filter((c) => !existingIds.includes(c._id)));
			} catch (error) {
				console.error("Error buscando contactos:", error);
			} finally {
				setContactSearchLoading(false);
			}
		},
		[pendingTargetContacts],
	);

	useEffect(() => {
		const timer = setTimeout(() => searchContacts(contactSearchQuery), 300);
		return () => clearTimeout(timer);
	}, [contactSearchQuery, searchContacts]);

	// Resetear al tab de Configuración cuando se abre/cierra el modal para que el primer
	// render siempre muestre el formulario, no el preview que el usuario quizá dejó abierto.
	useEffect(() => {
		if (open) setTabValue(0);
	}, [open]);

	useEffect(() => {
		if (open) {
			if (discount) {
				// Edit mode: load discount data
				setFormData({
					code: discount.code,
					name: discount.name,
					description: discount.description || "",
					discountType: discount.discountType,
					discountValue: discount.discountValue,
					currency: discount.currency,
					validFrom: discount.validFrom.split("T")[0],
					validUntil: discount.validUntil.split("T")[0],
					duration: discount.duration,
					durationInMonths: discount.durationInMonths || 3,
					applicablePlans: discount.restrictions.applicablePlans || [],
					applicableBillingPeriods: discount.restrictions.applicableBillingPeriods || [],
					maxRedemptions: discount.restrictions.maxRedemptions,
					maxRedemptionsPerUser: discount.restrictions.maxRedemptionsPerUser,
					newCustomersOnly: discount.restrictions.newCustomersOnly,
					excludeActiveSubscribers: discount.restrictions.excludeActiveSubscribers || false,
					minimumAmount: discount.restrictions.minimumAmount,
					isPublic: discount.activationRules.isPublic,
					showOnLanding: discount.activationRules.showOnLanding || false,
					priority: discount.activationRules.priority,
					promotionalMessage: discount.activationRules.promotionalMessage || "",
					badge: discount.activationRules.badge || "",
					isActive: discount.isActive,
					environments: (discount as any).environments || (["development", "production"] as StripeEnvironment[]),
					targetSegments: discount.restrictions.targetSegments || [],
				});
				// Cargar usuarios objetivo existentes para mostrarlos en el Autocomplete
				if (discount._id) {
					setLoadingTargetUsers(true);
					discountsService
						.getTargetUsers(discount._id)
						.then((res) => setPendingTargetUsers(res.data?.targetUsers || []))
						.catch(() => {
							/* silencioso: el campo queda vacío */
						})
						.finally(() => setLoadingTargetUsers(false));
					// Cargar count de contactos targeted (gestionados en el tab Contactos)
					discountsService
						.getTargetContacts(discount._id)
						.then((res) => setTargetContactsCount(res.data?.totalTargetContacts || 0))
						.catch(() => setTargetContactsCount(0));
					// Refrescar datos del descuento para obtener el estado actualizado de Stripe
					discountsService
						.getDiscountById(discount._id)
						.then((res) => setFreshDiscount(res.data ?? null))
						.catch(() => {
							/* silencioso: se usa el prop como fallback */
						});
				}
			} else {
				// Create mode: reset form
				const today = new Date();
				const nextMonth = new Date(today);
				nextMonth.setMonth(nextMonth.getMonth() + 1);

				setFormData({
					code: "",
					name: "",
					description: "",
					discountType: "percentage",
					discountValue: 10,
					currency: "USD",
					validFrom: today.toISOString().split("T")[0],
					validUntil: nextMonth.toISOString().split("T")[0],
					duration: "once",
					durationInMonths: 3,
					applicablePlans: [],
					applicableBillingPeriods: [],
					maxRedemptions: null,
					maxRedemptionsPerUser: 1,
					newCustomersOnly: false,
					excludeActiveSubscribers: false,
					minimumAmount: null,
					isPublic: false,
					showOnLanding: false,
					priority: 0,
					promotionalMessage: "",
					badge: "",
					isActive: true,
					environments: ["development", "production"],
					targetSegments: [],
				});
				setPendingTargetUsers([]);
				setPendingTargetContacts([]);
				setTargetContactsCount(0);
				setUserSearchQuery("");
				setUserSearchResults([]);
				setFreshDiscount(null);
			}
		}
	}, [open, discount]);

	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePlanToggle = (plan: string) => {
		setFormData((prev) => ({
			...prev,
			applicablePlans: prev.applicablePlans.includes(plan)
				? prev.applicablePlans.filter((p) => p !== plan)
				: [...prev.applicablePlans, plan],
		}));
	};

	const handleBillingPeriodToggle = (period: string) => {
		setFormData((prev) => ({
			...prev,
			applicableBillingPeriods: prev.applicableBillingPeriods.includes(period)
				? prev.applicableBillingPeriods.filter((p) => p !== period)
				: [...prev.applicableBillingPeriods, period],
		}));
	};

	const handleEnvironmentToggle = (env: StripeEnvironment) => {
		setFormData((prev) => ({
			...prev,
			environments: prev.environments.includes(env) ? prev.environments.filter((e) => e !== env) : [...prev.environments, env],
		}));
	};

	// En edición: no se puede activar isPublic si el descuento no está sincronizado con Stripe
	// Usa freshDiscount (re-fetched al abrir) para evitar leer datos stale del prop del padre
	const effectiveStripeForValidation = freshDiscount?.stripe ?? discount?.stripe;
	const editSyncBlocked =
		isEditing &&
		formData.isPublic &&
		formData.isActive &&
		!effectiveStripeForValidation?.development?.couponId &&
		!effectiveStripeForValidation?.production?.couponId;

	// Pre-requisitos para mostrar el descuento en la landing pública (no autenticada).
	// Si alguno falla, el switch "Mostrar en landing" queda deshabilitado y se muestra
	// un Alert listando qué hay que cambiar. La misma validación corre en el backend.
	const landingBlockers: string[] = [];
	if (!formData.isPublic) landingBlockers.push("activá 'Mostrar públicamente en la página de planes'");
	if (!formData.isActive) landingBlockers.push("la promoción debe estar activa");
	if (pendingTargetUsers.length > 0) landingBlockers.push("remové los usuarios objetivo (debe ser para todos)");
	if (formData.targetSegments.length > 0) landingBlockers.push("remové los segmentos objetivo (debe ser para todos)");
	if (targetContactsCount > 0) landingBlockers.push("remové los contactos objetivo (debe ser para todos)");
	if (formData.newCustomersOnly) landingBlockers.push("desactivá 'Solo clientes nuevos'");
	if (formData.excludeActiveSubscribers) landingBlockers.push("desactivá 'Excluir suscriptores activos'");
	// Sincronización con Stripe: en creación se crea recién al guardar, así que no
	// bloqueamos. En edición sí: si no hay couponId en ningún entorno, no se puede.
	if (isEditing && !effectiveStripeForValidation?.development?.couponId && !effectiveStripeForValidation?.production?.couponId) {
		landingBlockers.push("sincronizá el descuento con Stripe (pestaña Stripe del detalle)");
	}
	const landingEligible = landingBlockers.length === 0;

	// Si el usuario cambió alguna condición que invalida showOnLanding, lo apagamos
	// automáticamente para mantener el form coherente con lo que aceptará el backend.
	useEffect(() => {
		if (formData.showOnLanding && !landingEligible) {
			setFormData((prev) => ({ ...prev, showOnLanding: false }));
		}
	}, [formData.showOnLanding, landingEligible]);

	const handleSubmit = async () => {
		// Validation
		if (editSyncBlocked) {
			enqueueSnackbar(
				"No se puede activar 'Mostrar públicamente' en un descuento sin sincronizar con Stripe. Sincronizá primero desde la pestaña Stripe.",
				{ variant: "error" },
			);
			return;
		}
		if (!formData.code.trim()) {
			enqueueSnackbar("El código es requerido", { variant: "error" });
			return;
		}
		if (!formData.name.trim()) {
			enqueueSnackbar("El nombre es requerido", { variant: "error" });
			return;
		}
		if (formData.discountValue <= 0) {
			enqueueSnackbar("El valor del descuento debe ser mayor a 0", { variant: "error" });
			return;
		}
		if (formData.discountType === "percentage" && formData.discountValue > 100) {
			enqueueSnackbar("El porcentaje no puede ser mayor a 100", { variant: "error" });
			return;
		}
		if (!formData.validFrom || !formData.validUntil) {
			enqueueSnackbar("Las fechas de vigencia son requeridas", { variant: "error" });
			return;
		}
		if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
			enqueueSnackbar("La fecha de inicio debe ser anterior a la fecha de fin", { variant: "error" });
			return;
		}
		if (!isEditing && formData.environments.length === 0) {
			enqueueSnackbar("Debe seleccionar al menos un entorno de Stripe", { variant: "error" });
			return;
		}

		try {
			setLoading(true);

			if (isEditing) {
				// Update existing discount
				const updateData: UpdateDiscountParams = {
					name: formData.name,
					description: formData.description || undefined,
					validFrom: formData.validFrom,
					validUntil: formData.validUntil,
					restrictions: {
						applicablePlans: formData.applicablePlans,
						applicableBillingPeriods: formData.applicableBillingPeriods,
						maxRedemptions: formData.maxRedemptions,
						maxRedemptionsPerUser: formData.maxRedemptionsPerUser,
						newCustomersOnly: formData.newCustomersOnly,
						excludeActiveSubscribers: formData.excludeActiveSubscribers,
						minimumAmount: formData.minimumAmount,
						targetSegments: formData.targetSegments,
					},
					activationRules: {
						isPublic: formData.isPublic,
						showOnLanding: formData.showOnLanding,
						priority: formData.priority,
						promotionalMessage: formData.promotionalMessage || undefined,
						badge: formData.badge || undefined,
					},
					isActive: formData.isActive,
				};

				await discountsService.updateDiscount(discount!._id, updateData);
				// Sincronizar usuarios objetivo (reemplaza la lista completa)
				await discountsService.setTargetUsers(discount!._id, {
					userIds: pendingTargetUsers.map((u) => u._id),
				});
				enqueueSnackbar("Promoción actualizada correctamente", { variant: "success" });
			} else {
				// Create new discount
				const createData: CreateDiscountParams = {
					code: formData.code.toUpperCase().trim(),
					name: formData.name.trim(),
					description: formData.description || undefined,
					discountType: formData.discountType,
					discountValue: formData.discountValue,
					currency: formData.currency,
					validFrom: formData.validFrom,
					validUntil: formData.validUntil,
					duration: formData.duration,
					durationInMonths: formData.duration === "repeating" ? formData.durationInMonths : undefined,
					applicablePlans: formData.applicablePlans.length > 0 ? formData.applicablePlans : undefined,
					applicableBillingPeriods: formData.applicableBillingPeriods.length > 0 ? formData.applicableBillingPeriods : undefined,
					maxRedemptions: formData.maxRedemptions,
					maxRedemptionsPerUser: formData.maxRedemptionsPerUser,
					newCustomersOnly: formData.newCustomersOnly,
					excludeActiveSubscribers: formData.excludeActiveSubscribers,
					minimumAmount: formData.minimumAmount,
					isPublic: formData.isPublic,
					showOnLanding: formData.showOnLanding,
					priority: formData.priority,
					promotionalMessage: formData.promotionalMessage || undefined,
					badge: formData.badge || undefined,
					isActive: formData.isActive,
					environments: formData.environments,
					targetSegments: formData.targetSegments.length > 0 ? formData.targetSegments : undefined,
				};

				const response = await discountsService.createDiscount(createData);
				const envNames = response.createdInEnvironments?.map((e) => (e === "development" ? "Desarrollo" : "Producción")).join(" y ") || "";

				// Asignar usuarios y contactos objetivo pendientes si los hay
				const newId = response.data._id;
				const assignmentResults: string[] = [];
				const assignmentWarnings: string[] = [];

				if (pendingTargetUsers.length > 0 && newId) {
					try {
						await discountsService.addTargetUsers(newId, {
							userIds: pendingTargetUsers.map((u) => u._id),
						});
						assignmentResults.push(`${pendingTargetUsers.length} usuario(s)`);
					} catch (_err) {
						assignmentWarnings.push("usuarios objetivo");
					}
				}

				if (pendingTargetContacts.length > 0 && newId) {
					try {
						await discountsService.addTargetContacts(
							newId,
							pendingTargetContacts.map((c) => c._id),
						);
						assignmentResults.push(`${pendingTargetContacts.length} contacto(s)`);
					} catch (_err) {
						assignmentWarnings.push("contactos");
					}
				}

				if (assignmentWarnings.length > 0) {
					enqueueSnackbar(
						`Promoción creada en: ${envNames}, pero hubo un error al asignar ${assignmentWarnings.join(
							" y ",
						)}. Asignalos desde el detalle.`,
						{ variant: "warning" },
					);
				} else if (assignmentResults.length > 0) {
					enqueueSnackbar(`Promoción creada en: ${envNames}. ${assignmentResults.join(" y ")} asignados.`, {
						variant: "success",
					});
				} else {
					enqueueSnackbar(`Promoción creada correctamente en: ${envNames}`, { variant: "success" });
				}
			}

			onSuccess();
		} catch (error: any) {
			console.error("Error al guardar promoción:", error);
			enqueueSnackbar(error?.message || "Error al guardar la promoción", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>{isEditing ? "Editar Promoción" : "Nueva Promoción"}</DialogTitle>
			<DialogContent dividers>
				<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
					<Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
						<Tab label="Configuración" icon={<Setting2 size={18} />} iconPosition="start" />
						<Tab label="Vista previa" icon={<Eye size={18} />} iconPosition="start" />
					</Tabs>
				</Box>

				<TabPanel value={tabValue} index={0}>
					<Grid container spacing={3}>
						{/* Basic Info */}
						<Grid item xs={12}>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Información Básica
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Código"
								value={formData.code}
								onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
								disabled={isEditing}
								helperText={isEditing ? "El código no se puede modificar" : "Ej: VERANO2025, DESCUENTO20"}
								inputProps={{ style: { textTransform: "uppercase" } }}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="Nombre" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} />
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Descripción"
								value={formData.description}
								onChange={(e) => handleChange("description", e.target.value)}
								multiline
								rows={2}
							/>
						</Grid>

						{/* Stripe Environments - Only for new discounts */}
						{!isEditing && (
							<>
								<Grid item xs={12}>
									<Divider sx={{ my: 1 }} />
									<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
										Entornos de Stripe
									</Typography>
									<Typography variant="caption" color="textSecondary">
										Selecciona en qué entornos de Stripe se creará el cupón. Una vez creado, no se puede modificar.
									</Typography>
								</Grid>

								<Grid item xs={12}>
									<Stack direction="row" spacing={3}>
										<FormControlLabel
											control={
												<Checkbox
													checked={formData.environments.includes("development")}
													onChange={() => handleEnvironmentToggle("development")}
													color="warning"
												/>
											}
											label={
												<Box>
													<Typography variant="body2">Desarrollo</Typography>
													<Typography variant="caption" color="textSecondary">
														Stripe Test Mode
													</Typography>
												</Box>
											}
										/>
										<FormControlLabel
											control={
												<Checkbox
													checked={formData.environments.includes("production")}
													onChange={() => handleEnvironmentToggle("production")}
													color="success"
												/>
											}
											label={
												<Box>
													<Typography variant="body2">Producción</Typography>
													<Typography variant="caption" color="textSecondary">
														Stripe Live Mode
													</Typography>
												</Box>
											}
										/>
									</Stack>
								</Grid>
							</>
						)}

						{/* Discount Configuration */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Configuración del Descuento
							</Typography>
						</Grid>

						<Grid item xs={12} sm={4}>
							<FormControl fullWidth disabled={isEditing}>
								<InputLabel>Tipo de Descuento</InputLabel>
								<Select
									value={formData.discountType}
									label="Tipo de Descuento"
									onChange={(e) => handleChange("discountType", e.target.value)}
								>
									<MenuItem value="percentage">Porcentaje</MenuItem>
									<MenuItem value="fixed_amount">Monto Fijo</MenuItem>
								</Select>
								{isEditing && <FormHelperText>No se puede modificar</FormHelperText>}
							</FormControl>
						</Grid>

						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								type="number"
								label="Valor"
								value={formData.discountValue}
								onChange={(e) => handleChange("discountValue", Number(e.target.value))}
								disabled={isEditing}
								InputProps={{
									endAdornment: (
										<InputAdornment position="end">{formData.discountType === "percentage" ? "%" : formData.currency}</InputAdornment>
									),
								}}
							/>
						</Grid>

						<Grid item xs={12} sm={4}>
							<FormControl fullWidth>
								<InputLabel>Duración</InputLabel>
								<Select
									value={formData.duration}
									label="Duración"
									onChange={(e) => handleChange("duration", e.target.value)}
									disabled={isEditing}
								>
									<MenuItem value="once">Una vez</MenuItem>
									<MenuItem value="repeating">Varios meses</MenuItem>
									<MenuItem value="forever">Siempre</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						{formData.duration === "repeating" && (
							<Grid item xs={12} sm={4}>
								<TextField
									fullWidth
									type="number"
									label="Meses de duración"
									value={formData.durationInMonths}
									onChange={(e) => handleChange("durationInMonths", Number(e.target.value))}
									disabled={isEditing}
									inputProps={{ min: 1, max: 24 }}
								/>
							</Grid>
						)}

						{/* Validity Period */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Período de Vigencia
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								type="date"
								label="Válido desde"
								value={formData.validFrom}
								onChange={(e) => handleChange("validFrom", e.target.value)}
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								type="date"
								label="Válido hasta"
								value={formData.validUntil}
								onChange={(e) => handleChange("validUntil", e.target.value)}
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>

						{/* Restrictions */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Restricciones
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6}>
							<Typography variant="body2" gutterBottom>
								Planes aplicables (vacío = todos)
							</Typography>
							<Stack direction="row" spacing={1}>
								<FormControlLabel
									control={
										<Checkbox checked={formData.applicablePlans.includes("standard")} onChange={() => handlePlanToggle("standard")} />
									}
									label="Standard"
								/>
								<FormControlLabel
									control={<Checkbox checked={formData.applicablePlans.includes("premium")} onChange={() => handlePlanToggle("premium")} />}
									label="Premium"
								/>
							</Stack>
						</Grid>

						<Grid item xs={12} sm={6}>
							<Typography variant="body2" gutterBottom>
								Períodos de facturación (vacío = todos)
							</Typography>
							<Stack direction="row" spacing={1}>
								<FormControlLabel
									control={
										<Checkbox
											checked={formData.applicableBillingPeriods.includes("monthly")}
											onChange={() => handleBillingPeriodToggle("monthly")}
										/>
									}
									label="Mensual"
								/>
								<FormControlLabel
									control={
										<Checkbox
											checked={formData.applicableBillingPeriods.includes("annual")}
											onChange={() => handleBillingPeriodToggle("annual")}
										/>
									}
									label="Anual"
								/>
							</Stack>
						</Grid>

						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								type="number"
								label="Máximo de usos totales"
								value={formData.maxRedemptions ?? ""}
								onChange={(e) => handleChange("maxRedemptions", e.target.value ? Number(e.target.value) : null)}
								helperText="Vacío = ilimitado"
								inputProps={{ min: 1 }}
							/>
						</Grid>

						<Grid item xs={12} sm={4}>
							<TextField
								fullWidth
								type="number"
								label="Máximo por usuario"
								value={formData.maxRedemptionsPerUser}
								onChange={(e) => handleChange("maxRedemptionsPerUser", Number(e.target.value))}
								inputProps={{ min: 1 }}
							/>
						</Grid>

						{/* Customer Targeting Restrictions */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Restricciones por Tipo de Cliente
							</Typography>
							<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
								Estas opciones controlan qué usuarios pueden ver y usar este descuento basándose en su historial de suscripciones.
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6}>
							<Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
								<FormControlLabel
									control={
										<Switch
											checked={formData.excludeActiveSubscribers}
											onChange={(e) => handleChange("excludeActiveSubscribers", e.target.checked)}
											color="warning"
										/>
									}
									label={
										<Typography variant="body2" fontWeight={500}>
											Excluir suscriptores activos
										</Typography>
									}
								/>
								<Typography variant="caption" color="textSecondary" display="block" sx={{ ml: 4.5, mt: 0.5 }}>
									No mostrar a usuarios con una suscripción paga <strong>actualmente activa</strong>. Los usuarios que cancelaron su
									suscripción SÍ podrán ver y usar este descuento. Ideal para promociones de "vuelve a suscribirte" o para usuarios en plan
									gratuito.
								</Typography>
							</Box>
						</Grid>

						<Grid item xs={12} sm={6}>
							<Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
								<FormControlLabel
									control={
										<Switch
											checked={formData.newCustomersOnly}
											onChange={(e) => handleChange("newCustomersOnly", e.target.checked)}
											color="error"
										/>
									}
									label={
										<Typography variant="body2" fontWeight={500}>
											Solo clientes nuevos
										</Typography>
									}
								/>
								<Typography variant="caption" color="textSecondary" display="block" sx={{ ml: 4.5, mt: 0.5 }}>
									Solo para usuarios que <strong>nunca han tenido</strong> una suscripción paga (ni activa ni cancelada). Más restrictivo
									que "Excluir suscriptores activos". Ideal para promociones de "primera vez" para captar nuevos clientes.
								</Typography>
							</Box>
						</Grid>

						{/* Segment Targeting */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Segmentación de Audiencia
							</Typography>
							<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
								Selecciona segmentos de contactos que podrán ver y usar esta promoción. Se combina con "Usuarios Objetivo" usando lógica OR
								(si está en usuarios O en segmentos).
							</Typography>
						</Grid>

						<Grid item xs={12}>
							<Autocomplete
								multiple
								options={segments.filter((s) => s._id)} // Solo segmentos con _id válido
								getOptionLabel={(option) =>
									`${option.name} (${option.type === "static" ? "Estático" : "Dinámico"} - ${option.estimatedCount} contactos)`
								}
								value={segments.filter((s) => s._id && formData.targetSegments.includes(s._id))}
								onChange={(_, newValue) => {
									handleChange("targetSegments", newValue.map((s) => s._id!).filter(Boolean));
								}}
								loading={loadingSegments}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Segmentos de Contactos"
										placeholder={formData.targetSegments.length === 0 ? "Seleccionar segmentos..." : ""}
										helperText={
											formData.targetSegments.length > 0
												? `${formData.targetSegments.length} segmento(s) seleccionado(s)`
												: "Dejar vacío para no restringir por segmentos"
										}
									/>
								)}
								renderTags={(value, getTagProps) =>
									value.map((option, index) => (
										<Chip
											{...getTagProps({ index })}
											key={option._id || index}
											label={option.name}
											size="small"
											color={option.type === "static" ? "primary" : "secondary"}
										/>
									))
								}
								isOptionEqualToValue={(option, value) => option._id === value._id}
								noOptionsText="No hay segmentos disponibles"
							/>
						</Grid>

						{/* Target Users */}
						<>
							<Grid item xs={12}>
								<Divider sx={{ my: 1 }} />
								<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
									Usuarios Objetivo
								</Typography>
								<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
									Buscá y seleccioná usuarios específicos que podrán ver y usar esta promoción. Se combina con los segmentos usando lógica
									OR.
								</Typography>
							</Grid>
							<Grid item xs={12}>
								<Autocomplete
									multiple
									options={userSearchResults}
									value={pendingTargetUsers}
									onChange={(_, newValue) => setPendingTargetUsers(newValue)}
									getOptionLabel={(option) => `${option.email}${option.fullName ? ` (${option.fullName})` : ""}`}
									isOptionEqualToValue={(option, value) => option._id === value._id}
									loading={userSearchLoading || loadingTargetUsers}
									inputValue={userSearchQuery}
									onInputChange={(_, value, reason) => {
										if (reason !== "reset") setUserSearchQuery(value);
									}}
									filterOptions={(x) => x}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Buscar usuarios por email o nombre"
											placeholder={pendingTargetUsers.length === 0 ? "Escribí al menos 2 caracteres..." : ""}
											helperText={
												loadingTargetUsers
													? "Cargando usuarios existentes..."
													: pendingTargetUsers.length > 0
													? `${pendingTargetUsers.length} usuario(s) seleccionado(s)`
													: "Dejar vacío para no restringir por usuarios individuales"
											}
											InputProps={{
												...params.InputProps,
												startAdornment: (
													<>
														<InputAdornment position="start">
															<SearchNormal1 size={18} />
														</InputAdornment>
														{params.InputProps.startAdornment}
													</>
												),
												endAdornment: (
													<>
														{userSearchLoading || loadingTargetUsers ? <CircularProgress color="inherit" size={18} /> : null}
														{params.InputProps.endAdornment}
													</>
												),
											}}
										/>
									)}
									renderOption={(props, option) => (
										<li {...props} key={option._id}>
											<Stack>
												<Typography variant="body2">{option.email}</Typography>
												{option.fullName && (
													<Typography variant="caption" color="textSecondary">
														{option.fullName}
													</Typography>
												)}
											</Stack>
										</li>
									)}
									renderTags={(value, getTagProps) =>
										value.map((option, index) => (
											<Chip {...getTagProps({ index })} key={option._id} label={option.email} size="small" icon={<UserAdd size={14} />} />
										))
									}
									noOptionsText={userSearchQuery.length < 2 ? "Escribí para buscar..." : "No se encontraron usuarios"}
								/>
							</Grid>
						</>

						{/* Target Contacts — solo al crear. En edición se gestionan en el tab "Contactos" del modal de detalle. */}
						{!isEditing && (
							<>
								<Grid item xs={12}>
									<Divider sx={{ my: 1 }} />
									<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
										Contactos Individuales
									</Typography>
									<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
										Buscá contactos del CRM (incluso sin cuenta de usuario aún). Cuando se registren con su mismo email, automáticamente
										verán esta promoción. Útil para otorgar el descuento de forma discrecional a prospectos.
									</Typography>
								</Grid>
								<Grid item xs={12}>
									<Autocomplete
										multiple
										options={contactSearchResults}
										value={pendingTargetContacts}
										onChange={(_, newValue) => setPendingTargetContacts(newValue)}
										getOptionLabel={(option) => `${option.email}${option.fullName ? ` (${option.fullName})` : ""}`}
										isOptionEqualToValue={(option, value) => option._id === value._id}
										loading={contactSearchLoading}
										inputValue={contactSearchQuery}
										onInputChange={(_, value, reason) => {
											if (reason !== "reset") setContactSearchQuery(value);
										}}
										filterOptions={(x) => x}
										renderInput={(params) => (
											<TextField
												{...params}
												label="Buscar contactos por email o nombre"
												placeholder={pendingTargetContacts.length === 0 ? "Escribí al menos 2 caracteres..." : ""}
												helperText={
													pendingTargetContacts.length > 0
														? `${pendingTargetContacts.length} contacto(s) seleccionado(s)`
														: "Dejar vacío para no restringir por contactos individuales"
												}
												InputProps={{
													...params.InputProps,
													startAdornment: (
														<>
															<InputAdornment position="start">
																<SearchNormal1 size={18} />
															</InputAdornment>
															{params.InputProps.startAdornment}
														</>
													),
													endAdornment: (
														<>
															{contactSearchLoading ? <CircularProgress color="inherit" size={18} /> : null}
															{params.InputProps.endAdornment}
														</>
													),
												}}
											/>
										)}
										renderOption={(props, option) => (
											<li {...props} key={option._id}>
												<Stack direction="row" spacing={1} alignItems="center">
													<Stack>
														<Typography variant="body2">{option.email}</Typography>
														{option.fullName && (
															<Typography variant="caption" color="textSecondary">
																{option.fullName}
															</Typography>
														)}
													</Stack>
													{option.hasRegisteredUser && <Chip size="small" label="ya registrado" color="success" />}
												</Stack>
											</li>
										)}
										renderTags={(value, getTagProps) =>
											value.map((option, index) => (
												<Chip
													{...getTagProps({ index })}
													key={option._id}
													label={option.email}
													size="small"
													color={option.hasRegisteredUser ? "success" : "default"}
												/>
											))
										}
										noOptionsText={contactSearchQuery.length < 2 ? "Escribí para buscar..." : "No se encontraron contactos"}
									/>
								</Grid>
							</>
						)}

						{/* Visibility */}
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Visibilidad y Promoción
							</Typography>
						</Grid>

						<Grid item xs={12} sm={6}>
							<FormControlLabel
								control={<Switch checked={formData.isPublic} onChange={(e) => handleChange("isPublic", e.target.checked)} />}
								label="Mostrar públicamente en la página de planes"
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<FormControlLabel
								control={<Switch checked={formData.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} />}
								label="Promoción activa"
							/>
						</Grid>

						<Grid item xs={12}>
							<FormControlLabel
								control={
									<Switch
										checked={formData.showOnLanding}
										onChange={(e) => handleChange("showOnLanding", e.target.checked)}
										disabled={!landingEligible}
									/>
								}
								label={
									<Box>
										<Typography variant="body2">Mostrar en la landing pública (visitantes no autenticados)</Typography>
										<Typography variant="caption" color="textSecondary">
											El descuento aparecerá en la sección de planes de la landing. Requiere que sea aplicable a todos por igual.
										</Typography>
									</Box>
								}
							/>
						</Grid>

						{!landingEligible && (
							<Grid item xs={12}>
								<Alert severity="info">
									<AlertTitle>Para habilitar "Mostrar en la landing pública"</AlertTitle>
									Un descuento en la landing pública debe poder aplicarse a cualquier visitante que se registre después de verlo. Ajustá lo
									siguiente:
									<ul style={{ marginTop: 8, marginBottom: 0 }}>
										{landingBlockers.map((blocker, i) => (
											<li key={i}>{blocker}</li>
										))}
									</ul>
								</Alert>
							</Grid>
						)}

						{editSyncBlocked && (
							<Grid item xs={12}>
								<Alert severity="error">
									<AlertTitle>Descuento no sincronizado con Stripe</AlertTitle>
									No podés activar "Mostrar públicamente" porque este descuento no tiene un Coupon ID válido en Stripe (ni en Development ni
									en Production). Cerrá este formulario, abrí el detalle de la promoción y usá el botón{" "}
									<strong>Sincronizar con Stripe</strong> en la pestaña Stripe antes de continuar.
								</Alert>
							</Grid>
						)}

						{(() => {
							const hasTargetUsers = pendingTargetUsers.length > 0;
							const hasTargetSegments = formData.targetSegments.length > 0;
							const hasTargetContacts = targetContactsCount > 0;
							const hasAnyTarget = hasTargetUsers || hasTargetSegments || hasTargetContacts;
							const hasAnyRestriction = formData.excludeActiveSubscribers || formData.newCustomersOnly;

							// Caso crítico: público sin ningún tipo de filtro → todos los users activos lo ven
							if (formData.isPublic && !hasAnyTarget && !hasAnyRestriction) {
								return (
									<Grid item xs={12}>
										<Alert severity="warning">
											<AlertTitle>Descuento público sin restricciones</AlertTitle>
											Sin segmentos, usuarios, contactos ni filtros de tipo de cliente, este descuento será visible para{" "}
											<strong>todos los usuarios activos</strong> de la plataforma. Si querés limitarlo, agregá:
											<ul style={{ marginTop: 8, marginBottom: 0 }}>
												<li>
													una <strong>audiencia específica</strong> (segmentos, usuarios o contactos en el tab "Usuarios Objetivo"),
												</li>
												<li>
													o activá <strong>"Solo clientes nuevos"</strong> / <strong>"Excluir suscriptores activos"</strong> arriba.
												</li>
											</ul>
										</Alert>
									</Grid>
								);
							}

							// Caso intermedio: público sin targets pero con filtros de tipo cliente — sigue siendo amplio
							if (formData.isPublic && !hasAnyTarget && hasAnyRestriction) {
								return (
									<Grid item xs={12}>
										<Alert severity="info">
											<AlertTitle>Descuento público con filtros por tipo de cliente</AlertTitle>
											Este descuento se mostrará a todos los usuarios que cumplan las restricciones marcadas
											{formData.newCustomersOnly && " (solo nuevos clientes)"}
											{formData.excludeActiveSubscribers && " (excluyendo suscriptores activos)"}. Confirmá que es lo que querés.
										</Alert>
									</Grid>
								);
							}
							return null;
						})()}

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Badge/Etiqueta"
								value={formData.badge}
								onChange={(e) => handleChange("badge", e.target.value)}
								helperText="Ej: 20% OFF, PROMO"
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								type="number"
								label="Prioridad"
								value={formData.priority}
								onChange={(e) => handleChange("priority", Number(e.target.value))}
								helperText="Mayor número = mayor prioridad"
							/>
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Mensaje promocional"
								value={formData.promotionalMessage}
								onChange={(e) => handleChange("promotionalMessage", e.target.value)}
								helperText="Se mostrará en la UI junto al descuento"
							/>
						</Grid>
					</Grid>
				</TabPanel>

				<TabPanel value={tabValue} index={1}>
					<PromotionPreviewTab
						formData={{
							discountType: formData.discountType,
							discountValue: formData.discountValue,
							currency: formData.currency,
							applicablePlans: formData.applicablePlans,
							applicableBillingPeriods: formData.applicableBillingPeriods,
							duration: formData.duration,
							durationInMonths: formData.durationInMonths,
							isPublic: formData.isPublic,
							showOnLanding: formData.showOnLanding,
							isActive: formData.isActive,
							badge: formData.badge,
							promotionalMessage: formData.promotionalMessage,
							newCustomersOnly: formData.newCustomersOnly,
							excludeActiveSubscribers: formData.excludeActiveSubscribers,
						}}
					/>
				</TabPanel>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={loading || editSyncBlocked}>
					{loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PromotionFormModal;
