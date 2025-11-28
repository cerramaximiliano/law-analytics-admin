import {
	Box,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Paper,
} from "@mui/material";
import { CloseCircle, Calendar, Chart, TickCircle, CloseSquare, Copy } from "iconsax-react";
import { DiscountCode } from "api/discounts";
import { useSnackbar } from "notistack";

interface PromotionDetailModalProps {
	open: boolean;
	onClose: () => void;
	discount: DiscountCode | null;
}

const PromotionDetailModal = ({ open, onClose, discount }: PromotionDetailModalProps) => {
	const { enqueueSnackbar } = useSnackbar();

	if (!discount) return null;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatShortDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const getDiscountText = () => {
		if (discount.discountType === "percentage") {
			return `${discount.discountValue}%`;
		}
		return `$${discount.discountValue} ${discount.currency}`;
	};

	const getDurationText = () => {
		if (discount.duration === "once") return "Primera facturación";
		if (discount.duration === "forever") return "Siempre";
		return `${discount.durationInMonths} meses`;
	};

	const isValidNow = () => {
		const now = new Date();
		const validFrom = new Date(discount.validFrom);
		const validUntil = new Date(discount.validUntil);
		return discount.isActive && validFrom <= now && validUntil >= now;
	};

	const getStatusInfo = () => {
		if (!discount.isActive) {
			return { label: "Inactivo", color: "error" as const };
		}
		const now = new Date();
		const validFrom = new Date(discount.validFrom);
		const validUntil = new Date(discount.validUntil);

		if (validFrom > now) {
			return { label: "Programado", color: "warning" as const };
		}
		if (validUntil < now) {
			return { label: "Expirado", color: "default" as const };
		}
		return { label: "Activo", color: "success" as const };
	};

	const status = getStatusInfo();

	const handleCopyCode = () => {
		navigator.clipboard.writeText(discount.code);
		enqueueSnackbar("Código copiado al portapapeles", { variant: "success" });
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={2} alignItems="center">
						<Typography variant="h4">Detalles de Promoción</Typography>
						<Chip label={status.label} color={status.color} size="small" />
					</Stack>
					<IconButton onClick={onClose} size="small">
						<CloseCircle />
					</IconButton>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Grid container spacing={3}>
					{/* Información Principal */}
					<Grid item xs={12}>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
								<Box>
									<Stack direction="row" spacing={1} alignItems="center">
										<Typography variant="h3" sx={{ fontFamily: "monospace" }}>
											{discount.code}
										</Typography>
										<IconButton size="small" onClick={handleCopyCode} title="Copiar código">
											<Copy size={18} />
										</IconButton>
									</Stack>
									<Typography variant="h5" color="textSecondary" sx={{ mt: 0.5 }}>
										{discount.name}
									</Typography>
									{discount.description && (
										<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
											{discount.description}
										</Typography>
									)}
								</Box>
								<Box textAlign="right">
									<Typography variant="h2" color="primary">
										{getDiscountText()}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										{getDurationText()}
									</Typography>
								</Box>
							</Stack>
						</Paper>
					</Grid>

					{/* Estadísticas */}
					<Grid item xs={12}>
						<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Chart size={20} />
							Estadísticas de Uso
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Typography variant="h3" color="primary">
										{discount.stats.timesRedeemed}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Veces Usado
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Typography variant="h3" color="success.main">
										${discount.stats.totalAmountSaved.toFixed(2)}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Total Ahorrado
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Typography variant="h3">
										{discount.restrictions.maxRedemptions || "∞"}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Límite Total
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Typography variant="h3">
										{discount.restrictions.maxRedemptionsPerUser}
									</Typography>
									<Typography variant="body2" color="textSecondary">
										Límite/Usuario
									</Typography>
								</Paper>
							</Grid>
						</Grid>
					</Grid>

					{/* Vigencia */}
					<Grid item xs={12} md={6}>
						<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Calendar size={20} />
							Vigencia
						</Typography>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack spacing={1}>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Válido desde:
									</Typography>
									<Typography variant="body2">{formatDate(discount.validFrom)}</Typography>
								</Box>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Válido hasta:
									</Typography>
									<Typography variant="body2">{formatDate(discount.validUntil)}</Typography>
								</Box>
								<Divider sx={{ my: 1 }} />
								<Box display="flex" justifyContent="space-between" alignItems="center">
									<Typography variant="body2" color="textSecondary">
										¿Válido ahora?
									</Typography>
									{isValidNow() ? (
										<Chip icon={<TickCircle size={16} />} label="Sí" color="success" size="small" />
									) : (
										<Chip icon={<CloseSquare size={16} />} label="No" color="default" size="small" />
									)}
								</Box>
							</Stack>
						</Paper>
					</Grid>

					{/* Restricciones */}
					<Grid item xs={12} md={6}>
						<Typography variant="h5" gutterBottom>
							Restricciones
						</Typography>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack spacing={1}>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Planes aplicables:
									</Typography>
									<Typography variant="body2">
										{discount.restrictions.applicablePlans.length === 0
											? "Todos"
											: discount.restrictions.applicablePlans.join(", ")}
									</Typography>
								</Box>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Períodos:
									</Typography>
									<Typography variant="body2">
										{discount.restrictions.applicableBillingPeriods.length === 0
											? "Todos"
											: discount.restrictions.applicableBillingPeriods.join(", ")}
									</Typography>
								</Box>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Solo nuevos clientes:
									</Typography>
									<Typography variant="body2">{discount.restrictions.newCustomersOnly ? "Sí" : "No"}</Typography>
								</Box>
								{discount.restrictions.minimumAmount && (
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											Monto mínimo:
										</Typography>
										<Typography variant="body2">${discount.restrictions.minimumAmount}</Typography>
									</Box>
								)}
							</Stack>
						</Paper>
					</Grid>

					{/* Configuración de Visibilidad */}
					<Grid item xs={12} md={6}>
						<Typography variant="h5" gutterBottom>
							Visibilidad
						</Typography>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack spacing={1}>
								<Box display="flex" justifyContent="space-between" alignItems="center">
									<Typography variant="body2" color="textSecondary">
										Público:
									</Typography>
									{discount.activationRules.isPublic ? (
										<Chip label="Sí - visible en planes" color="info" size="small" />
									) : (
										<Chip label="No - solo por código" variant="outlined" size="small" />
									)}
								</Box>
								<Box display="flex" justifyContent="space-between">
									<Typography variant="body2" color="textSecondary">
										Prioridad:
									</Typography>
									<Typography variant="body2">{discount.activationRules.priority}</Typography>
								</Box>
								{discount.activationRules.badge && (
									<Box display="flex" justifyContent="space-between" alignItems="center">
										<Typography variant="body2" color="textSecondary">
											Badge:
										</Typography>
										<Chip label={discount.activationRules.badge} color="primary" size="small" />
									</Box>
								)}
								{discount.activationRules.promotionalMessage && (
									<Box>
										<Typography variant="body2" color="textSecondary" gutterBottom>
											Mensaje promocional:
										</Typography>
										<Typography variant="body2" sx={{ fontStyle: "italic" }}>
											"{discount.activationRules.promotionalMessage}"
										</Typography>
									</Box>
								)}
							</Stack>
						</Paper>
					</Grid>

					{/* Stripe Config */}
					<Grid item xs={12} md={6}>
						<Typography variant="h5" gutterBottom>
							Configuración Stripe
						</Typography>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack spacing={2}>
								<Box>
									<Typography variant="subtitle2" color="primary" gutterBottom>
										Development
									</Typography>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="textSecondary">
											Coupon ID: {discount.stripe.development?.couponId || "No sincronizado"}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											Promo Code ID: {discount.stripe.development?.promotionCodeId || "No sincronizado"}
										</Typography>
									</Stack>
								</Box>
								<Divider />
								<Box>
									<Typography variant="subtitle2" color="success.main" gutterBottom>
										Production
									</Typography>
									<Stack spacing={0.5}>
										<Typography variant="caption" color="textSecondary">
											Coupon ID: {discount.stripe.production?.couponId || "No sincronizado"}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											Promo Code ID: {discount.stripe.production?.promotionCodeId || "No sincronizado"}
										</Typography>
									</Stack>
								</Box>
							</Stack>
						</Paper>
					</Grid>

					{/* Historial de Uso */}
					{discount.redemptionHistory && discount.redemptionHistory.length > 0 && (
						<Grid item xs={12}>
							<Typography variant="h5" gutterBottom>
								Últimos Usos
							</Typography>
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Usuario</TableCell>
											<TableCell>Fecha</TableCell>
											<TableCell>Plan</TableCell>
											<TableCell align="right">Ahorro</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{discount.redemptionHistory.slice(0, 10).map((item, index) => (
											<TableRow key={index}>
												<TableCell>
													<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
														{item.userId.slice(0, 8)}...
													</Typography>
												</TableCell>
												<TableCell>{formatShortDate(item.redeemedAt)}</TableCell>
												<TableCell>{item.planId || "-"}</TableCell>
												<TableCell align="right">${item.amountSaved?.toFixed(2) || "0.00"}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							{discount.redemptionHistory.length > 10 && (
								<Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
									Mostrando 10 de {discount.redemptionHistory.length} registros
								</Typography>
							)}
						</Grid>
					)}

					{/* Metadatos */}
					<Grid item xs={12}>
						<Divider sx={{ my: 1 }} />
						<Stack direction="row" spacing={3} justifyContent="flex-end">
							<Typography variant="caption" color="textSecondary">
								Creado: {formatDate(discount.createdAt)}
							</Typography>
							<Typography variant="caption" color="textSecondary">
								Actualizado: {formatDate(discount.updatedAt)}
							</Typography>
						</Stack>
					</Grid>
				</Grid>
			</DialogContent>
		</Dialog>
	);
};

export default PromotionDetailModal;
