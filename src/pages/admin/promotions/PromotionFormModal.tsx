import { useEffect, useState } from "react";
import {
	Box,
	Button,
	Checkbox,
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
	TextField,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import discountsService, { DiscountCode, CreateDiscountParams, UpdateDiscountParams, StripeEnvironment } from "api/discounts";

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
		priority: 0,
		promotionalMessage: "",
		badge: "",
		isActive: true,
		environments: ["development", "production"] as StripeEnvironment[],
	});

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
					priority: discount.activationRules.priority,
					promotionalMessage: discount.activationRules.promotionalMessage || "",
					badge: discount.activationRules.badge || "",
					isActive: discount.isActive,
					environments: (discount as any).environments || (["development", "production"] as StripeEnvironment[]),
				});
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
					priority: 0,
					promotionalMessage: "",
					badge: "",
					isActive: true,
					environments: ["development", "production"],
				});
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

	const handleSubmit = async () => {
		// Validation
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
					},
					activationRules: {
						isPublic: formData.isPublic,
						priority: formData.priority,
						promotionalMessage: formData.promotionalMessage || undefined,
						badge: formData.badge || undefined,
					},
					isActive: formData.isActive,
				};

				await discountsService.updateDiscount(discount!._id, updateData);
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
					priority: formData.priority,
					promotionalMessage: formData.promotionalMessage || undefined,
					badge: formData.badge || undefined,
					isActive: formData.isActive,
					environments: formData.environments,
				};

				const response = await discountsService.createDiscount(createData);
				const envNames = response.createdInEnvironments?.map((e) => (e === "development" ? "Desarrollo" : "Producción")).join(" y ") || "";
				enqueueSnackbar(`Promoción creada correctamente en: ${envNames}`, { variant: "success" });
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
								control={
									<Checkbox checked={formData.applicablePlans.includes("premium")} onChange={() => handlePlanToggle("premium")} />
								}
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
								No mostrar a usuarios con una suscripción paga <strong>actualmente activa</strong>.
								Los usuarios que cancelaron su suscripción SÍ podrán ver y usar este descuento.
								Ideal para promociones de "vuelve a suscribirte" o para usuarios en plan gratuito.
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
								Solo para usuarios que <strong>nunca han tenido</strong> una suscripción paga (ni activa ni cancelada).
								Más restrictivo que "Excluir suscriptores activos".
								Ideal para promociones de "primera vez" para captar nuevos clientes.
							</Typography>
						</Box>
					</Grid>

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
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={loading}>
					{loading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PromotionFormModal;
