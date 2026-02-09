import { useEffect, useMemo, useState } from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	Stack,
	Tab,
	Tabs,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	Paper,
	Alert,
	Button,
	ToggleButton,
	ToggleButtonGroup,
} from "@mui/material";
import { CloseCircle, Calendar, Chart, TickCircle, CloseSquare, Copy, Cloud, People, UserTick, DocumentCode } from "iconsax-react";
import { useTheme } from "@mui/material/styles";
import { DiscountCode, FullDiscountInfoResponse } from "api/discounts";
import discountsService from "api/discounts";
import { useSnackbar } from "notistack";
import TargetUsersManager from "./TargetUsersManager";

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

const escapeHtml = (str: string) => str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface PromotionDetailModalProps {
	open: boolean;
	onClose: () => void;
	discount: DiscountCode | null;
}

const PromotionDetailModal = ({ open, onClose, discount }: PromotionDetailModalProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const theme = useTheme();
	const [tabValue, setTabValue] = useState(0);
	const [environment, setEnvironment] = useState<"development" | "production">("development");
	const [stripeData, setStripeData] = useState<FullDiscountInfoResponse["data"] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open && discount && tabValue === 1) {
			fetchStripeInfo();
		}
	}, [open, discount, tabValue, environment]);

	useEffect(() => {
		if (!open) {
			setTabValue(0);
			setStripeData(null);
			setError(null);
		}
	}, [open]);

	const fetchStripeInfo = async () => {
		if (!discount) return;

		setLoading(true);
		setError(null);
		try {
			const response = await discountsService.getFullInfo(discount._id, environment);
			setStripeData(response.data);
		} catch (err: any) {
			setError(err.message || "Error al obtener información de Stripe");
		} finally {
			setLoading(false);
		}
	};

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

	const formatShortDate = (dateString: string | null) => {
		if (!dateString) return "-";
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

	const handleCopyJson = () => {
		navigator.clipboard.writeText(JSON.stringify(discount, null, 2));
		enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
	};

	const highlightedJson = useMemo(() => {
		const isDark = theme.palette.mode === "dark";
		const colors = {
			key: isDark ? "#9CDCFE" : "#0451A5",
			string: isDark ? "#CE9178" : "#A31515",
			number: isDark ? "#B5CEA8" : "#098658",
			boolean: isDark ? "#569CD6" : "#0000FF",
			null: isDark ? "#569CD6" : "#0000FF",
			brace: isDark ? "#D4D4D4" : "#333333",
		};

		const json = JSON.stringify(discount, null, 2);
		// Match JSON tokens: strings, numbers, booleans, null, and structural chars
		const tokenRegex = /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)/g;

		const parts: { start: number; end: number; html: string }[] = [];
		let match;
		while ((match = tokenRegex.exec(json)) !== null) {
			if (match[1] !== undefined) {
				// Key (captured group 1 = key string before colon)
				const keyEnd = match.index + match[1].length;
				parts.push({
					start: match.index,
					end: keyEnd,
					html: `<span style="color:${colors.key}">${match[1]}</span>`,
				});
			} else if (match[2] !== undefined) {
				// String value
				parts.push({
					start: match.index,
					end: match.index + match[2].length,
					html: `<span style="color:${colors.string}">${match[2]}</span>`,
				});
			} else if (match[3] !== undefined) {
				// Number
				parts.push({
					start: match.index,
					end: match.index + match[3].length,
					html: `<span style="color:${colors.number}">${match[3]}</span>`,
				});
			} else if (match[4] !== undefined) {
				// Boolean
				parts.push({
					start: match.index,
					end: match.index + match[4].length,
					html: `<span style="color:${colors.boolean}">${match[4]}</span>`,
				});
			} else if (match[5] !== undefined) {
				// Null
				parts.push({
					start: match.index,
					end: match.index + match[5].length,
					html: `<span style="color:${colors.null}">${match[5]}</span>`,
				});
			}
		}

		// Build the final HTML by interleaving plain text with highlighted tokens
		let result = "";
		let cursor = 0;
		for (const part of parts) {
			if (part.start > cursor) {
				result += escapeHtml(json.slice(cursor, part.start));
			}
			result += part.html;
			cursor = part.end;
		}
		if (cursor < json.length) {
			result += escapeHtml(json.slice(cursor));
		}
		return result;
	}, [discount, theme.palette.mode]);

	const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	const handleEnvironmentChange = (_: React.MouseEvent<HTMLElement>, newEnv: "development" | "production" | null) => {
		if (newEnv !== null) {
			setEnvironment(newEnv);
		}
	};

	const getEnvironmentChips = () => {
		const chips = [];
		const hasDev = !!discount.stripe.development?.couponId;
		const hasProd = !!discount.stripe.production?.couponId;

		if (discount.targetEnvironment === "both" || discount.targetEnvironment === "development") {
			chips.push(
				<Chip
					key="dev"
					label={hasDev ? "Development (sincronizado)" : "Development (sin sincronizar)"}
					color={hasDev ? "warning" : "default"}
					variant={hasDev ? "filled" : "outlined"}
					size="small"
					icon={hasDev ? <TickCircle size={14} /> : <CloseSquare size={14} />}
					sx={hasDev ? { color: "#000", "& .MuiChip-icon": { color: "#000" } } : {}}
				/>
			);
		}
		if (discount.targetEnvironment === "both" || discount.targetEnvironment === "production") {
			chips.push(
				<Chip
					key="prod"
					label={hasProd ? "Production (sincronizado)" : "Production (sin sincronizar)"}
					color={hasProd ? "success" : "default"}
					variant={hasProd ? "filled" : "outlined"}
					size="small"
					icon={hasProd ? <TickCircle size={14} /> : <CloseSquare size={14} />}
				/>
			);
		}
		return chips;
	};

	const renderDatabaseTab = () => (
		<Grid container spacing={3}>
			{/* Entornos */}
			<Grid item xs={12}>
				<Paper variant="outlined" sx={{ p: 2, bgcolor: "background.default" }}>
					<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
						<Typography variant="subtitle2" color="textSecondary">
							Entornos destino:
						</Typography>
						<Stack direction="row" spacing={1}>
							{getEnvironmentChips()}
						</Stack>
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
							<Typography variant="h3">{discount.restrictions.maxRedemptions || "∞"}</Typography>
							<Typography variant="body2" color="textSecondary">
								Límite Total
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
							<Typography variant="h3">{discount.restrictions.maxRedemptionsPerUser}</Typography>
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
						<Divider sx={{ my: 1 }} />
						<Box display="flex" justifyContent="space-between" alignItems="center">
							<Typography variant="body2" color="textSecondary">
								Entorno:
							</Typography>
							{discount.targetEnvironment === "both" ? (
								<Chip label="Ambos" size="small" color="default" />
							) : discount.targetEnvironment === "production" ? (
								<Chip label="Producción" size="small" color="success" />
							) : (
								<Chip label="Desarrollo" size="small" color="warning" sx={{ color: "#000" }} />
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

			{/* Restricciones por Tipo de Cliente */}
			<Grid item xs={12}>
				<Typography variant="h5" gutterBottom>
					Restricciones por Tipo de Cliente
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6}>
						<Paper
							variant="outlined"
							sx={{
								p: 2,
								bgcolor: discount.restrictions.excludeActiveSubscribers ? "warning.lighter" : "background.default",
								borderColor: discount.restrictions.excludeActiveSubscribers ? "warning.main" : "divider",
							}}
						>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								{discount.restrictions.excludeActiveSubscribers ? (
									<TickCircle size={18} color="orange" />
								) : (
									<CloseSquare size={18} />
								)}
								<Typography variant="subtitle2" fontWeight={600}>
									Excluir suscriptores activos
								</Typography>
							</Stack>
							<Typography variant="caption" color="textSecondary" display="block">
								{discount.restrictions.excludeActiveSubscribers
									? "ACTIVO: No visible para usuarios con suscripción paga activa. SÍ visible para ex-suscriptores."
									: "Inactivo: Visible para todos los usuarios."}
							</Typography>
						</Paper>
					</Grid>
					<Grid item xs={12} sm={6}>
						<Paper
							variant="outlined"
							sx={{
								p: 2,
								bgcolor: discount.restrictions.newCustomersOnly ? "error.lighter" : "background.default",
								borderColor: discount.restrictions.newCustomersOnly ? "error.main" : "divider",
							}}
						>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
								{discount.restrictions.newCustomersOnly ? (
									<TickCircle size={18} color="red" />
								) : (
									<CloseSquare size={18} />
								)}
								<Typography variant="subtitle2" fontWeight={600}>
									Solo clientes nuevos
								</Typography>
							</Stack>
							<Typography variant="caption" color="textSecondary" display="block">
								{discount.restrictions.newCustomersOnly
									? "ACTIVO: Solo para usuarios que NUNCA tuvieron suscripción paga (ni activa ni cancelada)."
									: "Inactivo: Visible para usuarios nuevos y ex-suscriptores."}
							</Typography>
						</Paper>
					</Grid>
				</Grid>
			</Grid>

			{/* Segmentos de Audiencia */}
			{discount.restrictions.targetSegments && discount.restrictions.targetSegments.length > 0 && (
				<Grid item xs={12}>
					<Typography variant="h5" gutterBottom>
						Segmentos de Audiencia
					</Typography>
					<Paper variant="outlined" sx={{ p: 2, bgcolor: "secondary.lighter" }}>
						<Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
							Esta promoción está dirigida a los siguientes segmentos de contactos (lógica OR con usuarios objetivo):
						</Typography>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							{discount.restrictions.targetSegments.map((segmentId: string) => (
								<Chip
									key={segmentId}
									label={segmentId}
									size="small"
									color="secondary"
									variant="outlined"
								/>
							))}
						</Stack>
						<Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
							Total: {discount.restrictions.targetSegments.length} segmento(s)
						</Typography>
					</Paper>
				</Grid>
			)}

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
	);

	const renderStripeTab = () => {
		if (loading) {
			return (
				<Box display="flex" justifyContent="center" alignItems="center" py={4}>
					<CircularProgress />
				</Box>
			);
		}

		if (error) {
			return (
				<Alert severity="error" sx={{ mt: 2 }}>
					{error}
				</Alert>
			);
		}

		if (!stripeData) {
			return (
				<Alert severity="info" sx={{ mt: 2 }}>
					Selecciona un entorno para cargar la información de Stripe
				</Alert>
			);
		}

		const stripeInfo = stripeData.stripe;
		const isStripeError = stripeInfo && "error" in stripeInfo;

		return (
			<Grid container spacing={3}>
				{/* Selector de entorno */}
				<Grid item xs={12}>
					<Stack direction="row" justifyContent="flex-end">
						<ToggleButtonGroup
							value={environment}
							exclusive
							onChange={handleEnvironmentChange}
							size="small"
						>
							<ToggleButton
								value="development"
								color="warning"
								sx={{ "&.Mui-selected": { color: "#000" } }}
							>
								Development
							</ToggleButton>
							<ToggleButton value="production" color="success">
								Production
							</ToggleButton>
						</ToggleButtonGroup>
					</Stack>
				</Grid>

				{isStripeError ? (
					<Grid item xs={12}>
						<Alert severity="warning">
							Error consultando Stripe: {(stripeInfo as { error: string }).error}
						</Alert>
					</Grid>
				) : stripeInfo ? (
					<>
						{/* Información del Cupón en Stripe */}
						<Grid item xs={12} md={6}>
							<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<Cloud size={20} />
								Cupón en Stripe
							</Typography>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Stack spacing={1.5}>
									<Box display="flex" justifyContent="space-between" alignItems="center">
										<Typography variant="body2" color="textSecondary">
											Estado:
										</Typography>
										{(stripeInfo as any).coupon.valid ? (
											<Chip label="Válido" color="success" size="small" />
										) : (
											<Chip label="Inválido" color="error" size="small" />
										)}
									</Box>
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											ID:
										</Typography>
										<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
											{(stripeInfo as any).coupon.id}
										</Typography>
									</Box>
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											Descuento:
										</Typography>
										<Typography variant="body2" fontWeight={600} color="primary">
											{(stripeInfo as any).coupon.percent_off
												? `${(stripeInfo as any).coupon.percent_off}%`
												: `$${((stripeInfo as any).coupon.amount_off / 100).toFixed(2)}`}
										</Typography>
									</Box>
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											Duración:
										</Typography>
										<Typography variant="body2">
											{(stripeInfo as any).coupon.duration === "once"
												? "Una vez"
												: (stripeInfo as any).coupon.duration === "forever"
												? "Siempre"
												: `${(stripeInfo as any).coupon.duration_in_months} meses`}
										</Typography>
									</Box>
									<Divider />
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											Veces usado:
										</Typography>
										<Typography variant="h4" color="primary">
											{(stripeInfo as any).coupon.times_redeemed}
										</Typography>
									</Box>
									{(stripeInfo as any).coupon.max_redemptions && (
										<Box display="flex" justifyContent="space-between">
											<Typography variant="body2" color="textSecondary">
												Límite máximo:
											</Typography>
											<Typography variant="body2">
												{(stripeInfo as any).coupon.max_redemptions}
											</Typography>
										</Box>
									)}
									<Box display="flex" justifyContent="space-between">
										<Typography variant="body2" color="textSecondary">
											Creado en Stripe:
										</Typography>
										<Typography variant="body2">
											{formatShortDate((stripeInfo as any).coupon.created)}
										</Typography>
									</Box>
								</Stack>
							</Paper>
						</Grid>

						{/* Promotion Codes */}
						<Grid item xs={12} md={6}>
							<Typography variant="h5" gutterBottom>
								Promotion Codes
							</Typography>
							<Paper variant="outlined" sx={{ p: 2 }}>
								{(stripeInfo as any).promotionCodes.length === 0 ? (
									<Typography variant="body2" color="textSecondary">
										No hay promotion codes asociados
									</Typography>
								) : (
									<Stack spacing={1}>
										{(stripeInfo as any).promotionCodes.map((pc: any) => (
											<Box
												key={pc.id}
												sx={{
													p: 1.5,
													borderRadius: 1,
													bgcolor: "background.default",
												}}
											>
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace" }}>
														{pc.code}
													</Typography>
													<Chip
														label={pc.active ? "Activo" : "Inactivo"}
														color={pc.active ? "success" : "default"}
														size="small"
													/>
												</Stack>
												<Typography variant="caption" color="textSecondary">
													Usado {pc.times_redeemed} veces
												</Typography>
											</Box>
										))}
									</Stack>
								)}
							</Paper>
						</Grid>
					</>
				) : (
					<Grid item xs={12}>
						<Alert severity="info">
							Este código no está sincronizado con Stripe en el entorno {environment}
						</Alert>
					</Grid>
				)}

				{/* Suscriptores */}
				<Grid item xs={12}>
					<Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<People size={20} />
						Suscriptores Activos ({stripeData.subscribers.total})
					</Typography>

					{stripeData.subscribers.list.length === 0 ? (
						<Paper variant="outlined" sx={{ p: 3, textAlign: "center" }}>
							<Typography variant="body2" color="textSecondary">
								No hay suscriptores activos con este descuento en {environment}
							</Typography>
						</Paper>
					) : (
						<TableContainer component={Paper} variant="outlined">
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Cliente</TableCell>
										<TableCell>Plan</TableCell>
										<TableCell align="center">Inicio Descuento</TableCell>
										<TableCell align="center">Fin Descuento</TableCell>
										<TableCell align="center">Próximo Cobro</TableCell>
										<TableCell align="center">Estado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stripeData.subscribers.list.map((sub) => (
										<TableRow key={sub.subscriptionId}>
											<TableCell>
												<Typography variant="body2">{sub.customerEmail || "Sin email"}</Typography>
												{sub.customerName && (
													<Typography variant="caption" color="textSecondary">
														{sub.customerName}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="body2">
													${sub.planAmount}/{sub.planInterval === "month" ? "mes" : "año"}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Typography variant="body2">{formatShortDate(sub.discountStart)}</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={formatShortDate(sub.discountEnd)}
													color={
														sub.discountEnd && new Date(sub.discountEnd) > new Date()
															? "success"
															: "default"
													}
													size="small"
													variant="outlined"
												/>
											</TableCell>
											<TableCell align="center">
												<Typography variant="body2">
													{formatShortDate(sub.currentPeriodEnd)}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={sub.status}
													color={sub.status === "active" ? "success" : "default"}
													size="small"
												/>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</Grid>
			</Grid>
		);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: "85vh", maxHeight: 800 } }}>
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
			<DialogContent dividers sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
				{/* Header con info principal */}
				<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
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

				{/* Tabs */}
				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={tabValue} onChange={handleTabChange}>
						<Tab label="Base de Datos" icon={<Chart size={18} />} iconPosition="start" />
						<Tab label="Stripe & Suscriptores" icon={<Cloud size={18} />} iconPosition="start" />
						<Tab label="Usuarios Objetivo" icon={<UserTick size={18} />} iconPosition="start" />
						<Tab label="JSON" icon={<DocumentCode size={18} />} iconPosition="start" />
					</Tabs>
				</Box>

				<Box sx={{ flex: 1, overflow: "auto", mt: 1 }}>
					<TabPanel value={tabValue} index={0}>
						{renderDatabaseTab()}
					</TabPanel>
					<TabPanel value={tabValue} index={1}>
						{renderStripeTab()}
					</TabPanel>
					<TabPanel value={tabValue} index={2}>
						<TargetUsersManager
							discountId={discount._id}
							discountCode={discount.code}
							isPublic={discount.activationRules.isPublic}
						/>
					</TabPanel>
					<TabPanel value={tabValue} index={3}>
						<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
							<Button variant="outlined" size="small" startIcon={<Copy size={16} />} onClick={handleCopyJson}>
								Copiar JSON
							</Button>
						</Stack>
						<Paper
							variant="outlined"
							sx={{
								p: 2,
								bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
								overflow: "auto",
								maxHeight: 500,
							}}
						>
							<pre
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: 13,
									lineHeight: 1.5,
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
								}}
								dangerouslySetInnerHTML={{ __html: highlightedJson }}
							/>
						</Paper>
					</TabPanel>
				</Box>
			</DialogContent>
		</Dialog>
	);
};

export default PromotionDetailModal;
