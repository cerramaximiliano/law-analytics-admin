import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Box,
	Grid,
	Divider,
	Chip,
	Paper,
	IconButton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import { CloseCircle } from "iconsax-react";
import { Plan } from "types/plan";
import { formatCurrency } from "utils/formatCurrency";

interface PlanDetailModalProps {
	open: boolean;
	onClose: () => void;
	plan: Plan | null;
}

const PlanDetailModal = ({ open, onClose, plan }: PlanDetailModalProps) => {
	if (!plan) return null;

	const formatDate = (dateObj: any) => {
		if (!dateObj || !dateObj.$date) return "N/A";
		return new Date(dateObj.$date).toLocaleString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box display="flex" justifyContent="space-between" alignItems="center">
					<Typography variant="h4">Detalles del Plan: {plan.displayName}</Typography>
					<IconButton onClick={onClose} size="small">
						<CloseCircle />
					</IconButton>
				</Box>
			</DialogTitle>
			<Divider />
			<DialogContent sx={{ mt: 2 }}>
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					{/* Información General */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Información General
						</Typography>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="text.secondary">
										ID del Plan
									</Typography>
									<Typography variant="body1" fontWeight="medium">
										{plan.planId}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="text.secondary">
										Nombre
									</Typography>
									<Typography variant="body1" fontWeight="medium">
										{plan.displayName}
									</Typography>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="subtitle2" color="text.secondary">
										Descripción
									</Typography>
									<Typography variant="body1">{plan.description}</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										Estado
									</Typography>
									<Box mt={1}>
										<Chip label={plan.isActive ? "Activo" : "Inactivo"} color={plan.isActive ? "success" : "error"} size="small" />
									</Box>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										Plan Default
									</Typography>
									<Box mt={1}>
										{plan.isDefault ? <Chip label="Sí" color="primary" size="small" /> : <Typography variant="body1">No</Typography>}
									</Box>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										ID MongoDB
									</Typography>
									<Typography variant="caption" sx={{ wordBreak: "break-all" }}>
										{plan._id?.$oid || "N/A"}
									</Typography>
								</Grid>
							</Grid>
						</Paper>
					</Grid>

					{/* Información de Precios */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Información de Precios
						</Typography>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										Precio Base
									</Typography>
									<Typography variant="h4" color="primary">
										{formatCurrency(plan.pricingInfo.basePrice, plan.pricingInfo.currency)}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										Moneda
									</Typography>
									<Typography variant="body1" fontWeight="medium">
										{plan.pricingInfo.currency}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="subtitle2" color="text.secondary">
										Período de Facturación
									</Typography>
									<Typography variant="body1" fontWeight="medium">
										{plan.pricingInfo.billingPeriod === "monthly"
											? "Mensual"
											: plan.pricingInfo.billingPeriod === "yearly"
											? "Anual"
											: plan.pricingInfo.billingPeriod === "daily"
											? "Diario"
											: plan.pricingInfo.billingPeriod}
									</Typography>
								</Grid>
								{plan.pricingInfo.stripePriceId && (
									<Grid item xs={12}>
										<Typography variant="subtitle2" color="text.secondary">
											Stripe Price ID
										</Typography>
										<Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
											{plan.pricingInfo.stripePriceId}
										</Typography>
									</Grid>
								)}
							</Grid>
						</Paper>
					</Grid>

					{/* Límites de Recursos */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Límites de Recursos
						</Typography>
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Recurso</TableCell>
										<TableCell align="center">Límite</TableCell>
										<TableCell>Descripción</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{plan.resourceLimits.map((limit, index) => (
										<TableRow key={index}>
											<TableCell>
												<Typography variant="body2" fontWeight="medium">
													{limit.name}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={limit.limit === -1 ? "Ilimitado" : limit.limit.toString()}
													size="small"
													color="primary"
													variant="outlined"
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2" color="text.secondary">
													{limit.description}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Grid>

					{/* Características */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Características
						</Typography>
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Característica</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell>Descripción</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{plan.features.map((feature, index) => (
										<TableRow key={index}>
											<TableCell>
												<Typography variant="body2" fontWeight="medium">
													{feature.name}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={feature.enabled ? "Habilitado" : "Deshabilitado"}
													size="small"
													color={feature.enabled ? "success" : "default"}
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2" color="text.secondary">
													{feature.description}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Grid>

					{/* Stripe Information */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Información de Stripe
						</Typography>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={2}>
								{plan.stripePriceId && (
									<Grid item xs={12} sm={6}>
										<Typography variant="subtitle2" color="text.secondary">
											Stripe Price ID (Global)
										</Typography>
										<Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
											{plan.stripePriceId}
										</Typography>
									</Grid>
								)}
								{plan.stripeProductId && (
									<Grid item xs={12} sm={6}>
										<Typography variant="subtitle2" color="text.secondary">
											Stripe Product ID
										</Typography>
										<Typography variant="caption" sx={{ fontFamily: "monospace", wordBreak: "break-all" }}>
											{plan.stripeProductId}
										</Typography>
									</Grid>
								)}
							</Grid>
						</Paper>
					</Grid>

					{/* Metadata */}
					{plan.metadata && (
						<Grid item xs={12}>
							<Typography variant="h5" gutterBottom>
								Metadata
							</Typography>
							<Paper sx={{ p: 2 }}>
								<Grid container spacing={2}>
									{plan.metadata.lastSyncEnv && (
										<Grid item xs={12} sm={6}>
											<Typography variant="subtitle2" color="text.secondary">
												Último Entorno de Sincronización
											</Typography>
											<Typography variant="body2">{plan.metadata.lastSyncEnv}</Typography>
										</Grid>
									)}
									{plan.metadata.lastSyncDate && (
										<Grid item xs={12} sm={6}>
											<Typography variant="subtitle2" color="text.secondary">
												Última Fecha de Sincronización
											</Typography>
											<Typography variant="body2">
												{new Date(plan.metadata.lastSyncDate).toLocaleString("es-ES", {
													year: "numeric",
													month: "long",
													day: "numeric",
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
												})}
											</Typography>
										</Grid>
									)}
									{/* Mostrar cualquier otro campo en metadata */}
									{Object.entries(plan.metadata)
										.filter(([key]) => !["lastSyncEnv", "lastSyncDate"].includes(key))
										.map(([key, value]) => (
											<Grid item xs={12} sm={6} key={key}>
												<Typography variant="subtitle2" color="text.secondary">
													{key}
												</Typography>
												<Typography variant="body2">{JSON.stringify(value)}</Typography>
											</Grid>
										))}
								</Grid>
							</Paper>
						</Grid>
					)}

					{/* Change History */}
					{plan.changeHistory && plan.changeHistory.length > 0 && (
						<Grid item xs={12}>
							<Typography variant="h5" gutterBottom>
								Historial de Cambios
							</Typography>
							<TableContainer component={Paper}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fecha</TableCell>
											<TableCell>Campo</TableCell>
											<TableCell>Valor Anterior</TableCell>
											<TableCell>Valor Nuevo</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{plan.changeHistory.map((change, index) => (
											<TableRow key={index}>
												<TableCell>{new Date(change.date).toLocaleString("es-ES")}</TableCell>
												<TableCell>{change.field}</TableCell>
												<TableCell>{JSON.stringify(change.oldValue)}</TableCell>
												<TableCell>{JSON.stringify(change.newValue)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						</Grid>
					)}

					{/* Timestamps */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Información de Sistema
						</Typography>
						<Paper sx={{ p: 2 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="text.secondary">
										Fecha de Creación
									</Typography>
									<Typography variant="body2">{formatDate(plan.createdAt)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="text.secondary">
										Última Actualización
									</Typography>
									<Typography variant="body2">{formatDate(plan.updatedAt)}</Typography>
								</Grid>
								{plan.__v !== undefined && (
									<Grid item xs={12}>
										<Typography variant="subtitle2" color="text.secondary">
											Versión del Documento
										</Typography>
										<Typography variant="body2">{plan.__v}</Typography>
									</Grid>
								)}
							</Grid>
						</Paper>
					</Grid>

					{/* JSON Raw Data */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom>
							Datos Raw (JSON)
						</Typography>
						<Paper sx={{ p: 2, bgcolor: "grey.50", maxHeight: 300, overflow: "auto" }}>
							<Typography
								component="pre"
								variant="caption"
								sx={{
									fontFamily: "monospace",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
								}}
							>
								{JSON.stringify(plan, null, 2)}
							</Typography>
						</Paper>
					</Grid>
				</Grid>
			</DialogContent>
			<Divider />
			<DialogActions sx={{ p: 2 }}>
				<Button onClick={onClose} variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PlanDetailModal;
