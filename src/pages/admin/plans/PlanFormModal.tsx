import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Grid,
	FormControl,
	FormControlLabel,
	Switch,
	InputLabel,
	MenuItem,
	Select,
	Typography,
	Box,
	IconButton,
	Alert,
} from "@mui/material";
import { CloseCircle, Add, Trash } from "iconsax-react";
import { Plan, PlanPricingInfo, ResourceLimit, PlanFeature, VisibilityType } from "types/plan";

// Opciones de visibilidad para features y resourceLimits
const VISIBILITY_OPTIONS: { value: VisibilityType; label: string }[] = [
	{ value: "all", label: "Todos los ambientes" },
	{ value: "development", label: "Solo desarrollo" },
	{ value: "production", label: "Solo producción" },
	{ value: "none", label: "Oculto" },
];

interface PlanFormModalProps {
	open: boolean;
	onClose: () => void;
	onSave: (planData: Partial<Plan>, updateSubscriptions: boolean) => Promise<void>;
	plan?: Plan | null;
}

const PlanFormModal = ({ open, onClose, onSave, plan }: PlanFormModalProps) => {
	const [formData, setFormData] = useState<Partial<Plan>>({
		planId: "",
		displayName: "",
		description: "",
		isActive: true,
		isDefault: false,
		resourceLimits: [],
		features: [],
		pricingInfo: {
			basePrice: 0,
			currency: "COP",
			billingPeriod: "monthly",
		},
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [updateSubscriptions, setUpdateSubscriptions] = useState(false);

	useEffect(() => {
		if (plan) {
			setFormData(plan);
		} else {
			setFormData({
				planId: "",
				displayName: "",
				description: "",
				isActive: true,
				isDefault: false,
				resourceLimits: [],
				features: [],
				pricingInfo: {
					basePrice: 0,
					currency: "COP",
					billingPeriod: "monthly",
				},
			});
		}
	}, [plan]);

	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handlePricingChange = (field: keyof PlanPricingInfo, value: any) => {
		setFormData((prev) => ({
			...prev,
			pricingInfo: {
				...prev.pricingInfo!,
				[field]: value,
			},
		}));
	};

	const addResourceLimit = () => {
		setFormData((prev) => ({
			...prev,
			resourceLimits: [...prev.resourceLimits!, { name: "", limit: 0, description: "", displayName: "", visibility: "all" }],
		}));
	};

	const updateResourceLimit = (index: number, field: keyof ResourceLimit, value: any) => {
		const newLimits = [...formData.resourceLimits!];
		newLimits[index] = { ...newLimits[index], [field]: value };
		setFormData((prev) => ({
			...prev,
			resourceLimits: newLimits,
		}));
	};

	const removeResourceLimit = (index: number) => {
		const newLimits = formData.resourceLimits!.filter((_, i) => i !== index);
		setFormData((prev) => ({
			...prev,
			resourceLimits: newLimits,
		}));
	};

	const addFeature = () => {
		setFormData((prev) => ({
			...prev,
			features: [...prev.features!, { name: "", enabled: true, description: "", displayName: "", visibility: "all" }],
		}));
	};

	const updateFeature = (index: number, field: keyof PlanFeature, value: any) => {
		const newFeatures = [...formData.features!];
		newFeatures[index] = { ...newFeatures[index], [field]: value };
		setFormData((prev) => ({
			...prev,
			features: newFeatures,
		}));
	};

	const removeFeature = (index: number) => {
		const newFeatures = formData.features!.filter((_, i) => i !== index);
		setFormData((prev) => ({
			...prev,
			features: newFeatures,
		}));
	};

	const handleSubmit = async () => {
		setLoading(true);
		setError(null);
		try {
			await onSave(formData, updateSubscriptions);
			onClose();
			setUpdateSubscriptions(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al guardar el plan");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Typography variant="h5">{plan ? "Editar Plan" : "Crear Nuevo Plan"}</Typography>
					<IconButton onClick={onClose} size="small">
						<CloseCircle />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mt: 1 }}>
					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							label="ID del Plan"
							value={formData.planId}
							onChange={(e) => handleChange("planId", e.target.value)}
							disabled={!!plan}
							required
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							fullWidth
							label="Nombre del Plan"
							value={formData.displayName}
							onChange={(e) => handleChange("displayName", e.target.value)}
							required
						/>
					</Grid>
					<Grid item xs={12}>
						<TextField
							fullWidth
							label="Descripción"
							value={formData.description}
							onChange={(e) => handleChange("description", e.target.value)}
							multiline
							rows={3}
							required
						/>
					</Grid>

					{/* Pricing Info */}
					<Grid item xs={12}>
						<Typography variant="h6" gutterBottom>
							Información de Precio
						</Typography>
						{plan && (
							<Typography variant="caption" color="text.secondary">
								Para modificar el precio, utilice el botón "Actualizar Precio" en la lista de planes.
							</Typography>
						)}
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							label="Precio Base"
							type="number"
							value={formData.pricingInfo?.basePrice}
							onChange={(e) => handlePricingChange("basePrice", Number(e.target.value))}
							required
							disabled={!!plan}
							InputProps={{
								readOnly: !!plan,
							}}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							label="Moneda"
							value={formData.pricingInfo?.currency}
							disabled={!!plan}
							InputProps={{
								readOnly: !!plan,
							}}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							label="Período"
							value={
								formData.pricingInfo?.billingPeriod === "monthly"
									? "Mensual"
									: formData.pricingInfo?.billingPeriod === "yearly"
									? "Anual"
									: formData.pricingInfo?.billingPeriod
							}
							disabled={!!plan}
							InputProps={{
								readOnly: !!plan,
							}}
						/>
					</Grid>

					{/* Resource Limits */}
					<Grid item xs={12}>
						<Box display="flex" alignItems="center" justifyContent="space-between">
							<Typography variant="h6">Límites de Recursos</Typography>
							<Button startIcon={<Add />} onClick={addResourceLimit} size="small">
								Agregar
							</Button>
						</Box>
					</Grid>
					{formData.resourceLimits?.map((limit, index) => (
						<Grid item xs={12} key={index}>
							<Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
								<TextField
									label="Nombre (ID)"
									value={limit.name}
									onChange={(e) => updateResourceLimit(index, "name", e.target.value)}
									size="small"
									style={{ flex: 1, minWidth: 120 }}
								/>
								<TextField
									label="Límite"
									type="number"
									value={limit.limit}
									onChange={(e) => updateResourceLimit(index, "limit", Number(e.target.value))}
									size="small"
									style={{ width: 80 }}
								/>
								<TextField
									label="Nombre UI"
									value={limit.displayName || ""}
									onChange={(e) => updateResourceLimit(index, "displayName", e.target.value)}
									size="small"
									style={{ flex: 1, minWidth: 120 }}
									placeholder="Nombre para mostrar"
								/>
								<TextField
									label="Descripción"
									value={limit.description}
									onChange={(e) => updateResourceLimit(index, "description", e.target.value)}
									size="small"
									style={{ flex: 1.5, minWidth: 150 }}
								/>
								<FormControl size="small" style={{ minWidth: 140 }}>
									<InputLabel>Visibilidad</InputLabel>
									<Select
										value={limit.visibility || "all"}
										label="Visibilidad"
										onChange={(e) => updateResourceLimit(index, "visibility", e.target.value)}
									>
										{VISIBILITY_OPTIONS.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<IconButton onClick={() => removeResourceLimit(index)} size="small">
									<Trash size={20} />
								</IconButton>
							</Box>
						</Grid>
					))}

					{/* Features */}
					<Grid item xs={12}>
						<Box display="flex" alignItems="center" justifyContent="space-between">
							<Typography variant="h6">Características</Typography>
							<Button startIcon={<Add />} onClick={addFeature} size="small">
								Agregar
							</Button>
						</Box>
					</Grid>
					{formData.features?.map((feature, index) => (
						<Grid item xs={12} key={index}>
							<Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
								<TextField
									label="Nombre (ID)"
									value={feature.name}
									onChange={(e) => updateFeature(index, "name", e.target.value)}
									size="small"
									style={{ flex: 1, minWidth: 120 }}
								/>
								<TextField
									label="Nombre UI"
									value={feature.displayName || ""}
									onChange={(e) => updateFeature(index, "displayName", e.target.value)}
									size="small"
									style={{ flex: 1, minWidth: 120 }}
									placeholder="Nombre para mostrar"
								/>
								<TextField
									label="Descripción"
									value={feature.description}
									onChange={(e) => updateFeature(index, "description", e.target.value)}
									size="small"
									style={{ flex: 1.5, minWidth: 150 }}
								/>
								<FormControl size="small" style={{ minWidth: 140 }}>
									<InputLabel>Visibilidad</InputLabel>
									<Select
										value={feature.visibility || "all"}
										label="Visibilidad"
										onChange={(e) => updateFeature(index, "visibility", e.target.value)}
									>
										{VISIBILITY_OPTIONS.map((opt) => (
											<MenuItem key={opt.value} value={opt.value}>
												{opt.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<FormControlLabel
									control={<Switch checked={feature.enabled} onChange={(e) => updateFeature(index, "enabled", e.target.checked)} />}
									label="Activo"
								/>
								<IconButton onClick={() => removeFeature(index)} size="small">
									<Trash size={20} />
								</IconButton>
							</Box>
						</Grid>
					))}

					{/* Status */}
					<Grid item xs={12}>
						<Box display="flex" gap={3}>
							<FormControlLabel
								control={<Switch checked={formData.isActive} onChange={(e) => handleChange("isActive", e.target.checked)} />}
								label="Plan Activo"
							/>
							<FormControlLabel
								control={<Switch checked={formData.isDefault} onChange={(e) => handleChange("isDefault", e.target.checked)} />}
								label="Plan Default"
							/>
						</Box>
					</Grid>

					{/* Update Subscriptions Option - Only show when editing */}
					{plan && (
						<Grid item xs={12}>
							<Alert severity="warning" sx={{ mb: 2 }}>
								<FormControlLabel
									control={<Switch checked={updateSubscriptions} onChange={(e) => setUpdateSubscriptions(e.target.checked)} />}
									label={
										<Box>
											<Typography variant="subtitle2" fontWeight="bold">
												Actualizar todas las suscripciones existentes
											</Typography>
											<Typography variant="body2" color="text.secondary">
												Al activar esta opción, los cambios en los límites y características se aplicarán a todas las suscripciones activas
												con este plan.
											</Typography>
										</Box>
									}
								/>
							</Alert>
						</Grid>
					)}
				</Grid>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={loading}>
					{loading ? "Guardando..." : plan ? "Actualizar" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PlanFormModal;
