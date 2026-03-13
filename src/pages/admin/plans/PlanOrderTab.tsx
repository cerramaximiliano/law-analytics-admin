import { useState } from "react";
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	Grid,
	Paper,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ArrangeVertical, Save2, TickCircle, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { Plan } from "types/plan";
import adminAxios from "utils/adminAxios";

interface PlanOrderTabProps {
	plans: Plan[];
	onRefresh: () => void;
}

const VISIBILITY_LABELS: Record<string, { label: string; color: "default" | "success" | "warning" | "error" }> = {
	all: { label: "Todos", color: "default" },
	development: { label: "Dev", color: "warning" },
	production: { label: "Prod", color: "success" },
	none: { label: "Oculto", color: "error" },
};

const PlanOrderTab = ({ plans, onRefresh }: PlanOrderTabProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Local state: order values per plan, keyed by planId
	// Structure: { [planId]: { resources: { [name]: order }, features: { [name]: order } } }
	const [localOrders, setLocalOrders] = useState<
		Record<string, { resources: Record<string, number>; features: Record<string, number> }>
	>(() => {
		const initial: Record<string, { resources: Record<string, number>; features: Record<string, number> }> = {};
		plans.forEach((plan) => {
			initial[plan.planId] = {
				resources: Object.fromEntries(plan.resourceLimits.map((r) => [r.name, r.order ?? 99])),
				features: Object.fromEntries(plan.features.map((f) => [f.name, f.order ?? 99])),
			};
		});
		return initial;
	});

	const [savingPlan, setSavingPlan] = useState<string | null>(null);

	const handleResourceOrderChange = (planId: string, name: string, value: number) => {
		setLocalOrders((prev) => ({
			...prev,
			[planId]: {
				...prev[planId],
				resources: { ...prev[planId].resources, [name]: value },
			},
		}));
	};

	const handleFeatureOrderChange = (planId: string, name: string, value: number) => {
		setLocalOrders((prev) => ({
			...prev,
			[planId]: {
				...prev[planId],
				features: { ...prev[planId].features, [name]: value },
			},
		}));
	};

	const handleSavePlan = async (plan: Plan) => {
		setSavingPlan(plan.planId);
		const orders = localOrders[plan.planId];
		let hasError = false;

		try {
			// Save resources
			const resourcePromises = plan.resourceLimits.map((resource) => {
				const newOrder = orders.resources[resource.name] ?? 99;
				if (newOrder === (resource.order ?? 99)) return Promise.resolve();
				return adminAxios
					.patch(`/api/plan-configs/${plan.planId}/resource-limits/${resource.name}`, { order: newOrder })
					.catch((err) => {
						console.error(`Error saving resource ${resource.name}:`, err);
						hasError = true;
					});
			});

			// Save features
			const featurePromises = plan.features.map((feature) => {
				const newOrder = orders.features[feature.name] ?? 99;
				if (newOrder === (feature.order ?? 99)) return Promise.resolve();
				return adminAxios
					.patch(`/api/plan-configs/${plan.planId}/features/${feature.name}`, { order: newOrder })
					.catch((err) => {
						console.error(`Error saving feature ${feature.name}:`, err);
						hasError = true;
					});
			});

			await Promise.all([...resourcePromises, ...featurePromises]);

			if (hasError) {
				enqueueSnackbar(`Orden de ${plan.displayName} guardado con algunos errores`, { variant: "warning" });
			} else {
				enqueueSnackbar(`Orden de ${plan.displayName} guardado correctamente`, { variant: "success" });
			}
			onRefresh();
		} catch (err) {
			enqueueSnackbar(`Error al guardar el orden de ${plan.displayName}`, { variant: "error" });
		} finally {
			setSavingPlan(null);
		}
	};

	const getPreviewItems = (plan: Plan, planId: string) => {
		const resources = [...plan.resourceLimits]
			.map((r) => ({ ...r, currentOrder: localOrders[planId]?.resources[r.name] ?? r.order ?? 99 }))
			.sort((a, b) => a.currentOrder - b.currentOrder);
		const features = [...plan.features]
			.map((f) => ({ ...f, currentOrder: localOrders[planId]?.features[f.name] ?? f.order ?? 99 }))
			.sort((a, b) => a.currentOrder - b.currentOrder);
		return { resources, features };
	};

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
				<ArrangeVertical size={20} color={theme.palette.primary.main} />
				<Typography variant="h6">Ordenamiento de Recursos y Características</Typography>
			</Stack>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Ajusta el orden de visualización para cada plan. Los ítems con menor número aparecen primero. Guarda cada plan por
				separado.
			</Typography>

			<Grid container spacing={3}>
				{plans.map((plan) => {
					const { resources, features } = getPreviewItems(plan, plan.planId);
					const isSaving = savingPlan === plan.planId;

					return (
						<Grid item xs={12} md={6} lg={4} key={plan.planId}>
							<Paper
								variant="outlined"
								sx={{
									p: 2,
									border: "1px solid",
									borderColor: plan.isDefault ? "primary.main" : "divider",
									height: "100%",
								}}
							>
								<Stack spacing={2}>
									{/* Plan Header */}
									<Box display="flex" alignItems="center" justifyContent="space-between">
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="h6">{plan.displayName}</Typography>
											{!plan.isActive && <Chip label="Inactivo" size="small" color="error" />}
										</Stack>
										<Button
											variant="contained"
											size="small"
											startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : <Save2 size={16} />}
											onClick={() => handleSavePlan(plan)}
											disabled={isSaving}
										>
											{isSaving ? "Guardando..." : "Guardar"}
										</Button>
									</Box>

									<Divider />

									{/* Resources */}
									<Box>
										<Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
											RECURSOS ({resources.length})
										</Typography>
										<Stack spacing={1}>
											{resources.map((resource) => {
												const visInfo = VISIBILITY_LABELS[resource.visibility || "all"];
												return (
													<Box
														key={resource.name}
														display="flex"
														alignItems="center"
														gap={1}
														sx={{
															p: 1,
															bgcolor: "background.default",
															borderRadius: 1,
															border: "1px solid",
															borderColor: "divider",
														}}
													>
														<TextField
															type="number"
															value={localOrders[plan.planId]?.resources[resource.name] ?? resource.order ?? 99}
															onChange={(e) =>
																handleResourceOrderChange(plan.planId, resource.name, Number(e.target.value))
															}
															size="small"
															inputProps={{ min: 0, style: { width: 40, textAlign: "center", padding: "4px 6px" } }}
															sx={{ "& .MuiOutlinedInput-root": { width: 58 } }}
														/>
														<Box flex={1} minWidth={0}>
															<Typography variant="body2" fontWeight="medium" noWrap>
																{resource.displayName || resource.name}
															</Typography>
															<Typography variant="caption" color="text.secondary" noWrap>
																{resource.name} · límite: {resource.limit}
															</Typography>
														</Box>
														<Tooltip title={`Visibilidad: ${visInfo.label}`}>
															<Chip label={visInfo.label} size="small" color={visInfo.color} sx={{ flexShrink: 0 }} />
														</Tooltip>
													</Box>
												);
											})}
										</Stack>
									</Box>

									<Divider />

									{/* Features */}
									<Box>
										<Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
											CARACTERÍSTICAS ({features.length})
										</Typography>
										<Stack spacing={1}>
											{features.map((feature) => {
												const visInfo = VISIBILITY_LABELS[feature.visibility || "all"];
												return (
													<Box
														key={feature.name}
														display="flex"
														alignItems="center"
														gap={1}
														sx={{
															p: 1,
															bgcolor: "background.default",
															borderRadius: 1,
															border: "1px solid",
															borderColor: "divider",
															opacity: feature.enabled ? 1 : 0.6,
														}}
													>
														<TextField
															type="number"
															value={localOrders[plan.planId]?.features[feature.name] ?? feature.order ?? 99}
															onChange={(e) =>
																handleFeatureOrderChange(plan.planId, feature.name, Number(e.target.value))
															}
															size="small"
															inputProps={{ min: 0, style: { width: 40, textAlign: "center", padding: "4px 6px" } }}
															sx={{ "& .MuiOutlinedInput-root": { width: 58 } }}
														/>
														<Box flex={1} minWidth={0}>
															<Typography variant="body2" fontWeight="medium" noWrap>
																{feature.displayName || feature.name}
															</Typography>
															<Typography variant="caption" color="text.secondary" noWrap>
																{feature.name}
															</Typography>
														</Box>
														<Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
															{feature.enabled ? (
																<TickCircle size={16} color={theme.palette.success.main} variant="Bold" />
															) : (
																<CloseCircle size={16} color={theme.palette.text.disabled} variant="Bold" />
															)}
															<Tooltip title={`Visibilidad: ${visInfo.label}`}>
																<Chip label={visInfo.label} size="small" color={visInfo.color} />
															</Tooltip>
														</Stack>
													</Box>
												);
											})}
										</Stack>
									</Box>
								</Stack>
							</Paper>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
};

export default PlanOrderTab;
