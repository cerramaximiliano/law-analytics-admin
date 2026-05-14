import { useMemo } from "react";
import { Alert, AlertTitle, Box, Chip, Divider, Grid, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { TickCircle, Eye, EyeSlash } from "iconsax-react";

// Mismos tokens de color que usa la landing y la página /plans del frontend.
// Si cambian allá, hay que actualizarlos acá para mantener fidelidad visual.
const BRAND_BLUE = "#3A7BFF";
const BRAND_PURPLE = "#8A5CFF";
const RECOMMENDED_BORDER_GRADIENT = `linear-gradient(135deg, ${BRAND_BLUE}, ${BRAND_PURPLE}, ${BRAND_BLUE})`;

// Precios base hardcodeados — espejo de PLAN_DEFAULTS en
// law-analytics-front/src/sections/landing/Planes.tsx. Si los planes reales cambian
// de precio en la API, este preview mostrará un valor desfasado hasta que se actualice.
const PLAN_PRICES: Record<"standard" | "premium", { name: string; basePrice: number; highlighted: boolean; suffix: string }> = {
	standard: { name: "Estándar", basePrice: 19.99, highlighted: true, suffix: "/mes" },
	premium: { name: "Premium", basePrice: 49.99, highlighted: false, suffix: "/mes" },
};

const formatPriceShort = (price: number): string => (price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`);

export interface PromotionPreviewData {
	discountType: "percentage" | "fixed_amount";
	discountValue: number;
	currency: string;
	applicablePlans: string[];
	applicableBillingPeriods: string[];
	duration: "once" | "repeating" | "forever";
	durationInMonths: number;
	isPublic: boolean;
	showOnLanding: boolean;
	isActive: boolean;
	badge: string;
	promotionalMessage: string;
	newCustomersOnly: boolean;
	excludeActiveSubscribers: boolean;
}

interface PromotionPreviewTabProps {
	formData: PromotionPreviewData;
}

const computeFinalPrice = (basePrice: number, type: "percentage" | "fixed_amount", value: number): number => {
	if (value <= 0) return basePrice;
	if (type === "percentage") {
		const pct = Math.min(value, 100);
		return Math.max(0, basePrice * (1 - pct / 100));
	}
	return Math.max(0, basePrice - value);
};

const getDurationText = (duration: string, months: number): string => {
	if (duration === "once") return "Aplica al primer pago";
	if (duration === "repeating") return `Aplica durante ${months} ${months === 1 ? "mes" : "meses"}`;
	return "Aplica siempre";
};

interface PlanPreviewCardProps {
	planId: "standard" | "premium";
	formData: PromotionPreviewData;
	disabled: boolean;
}

const PlanPreviewCard = ({ planId, formData, disabled }: PlanPreviewCardProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const plan = PLAN_PRICES[planId];
	const finalPrice = computeFinalPrice(plan.basePrice, formData.discountType, formData.discountValue);
	const hasDiscount = !disabled && formData.discountValue > 0;
	const isHighlighted = plan.highlighted;

	return (
		<Box
			sx={{
				position: "relative",
				borderRadius: 2,
				p: 2.5,
				bgcolor: isHighlighted ? alpha(BRAND_BLUE, isDark ? 0.06 : 0.035) : "transparent",
				border: isHighlighted ? "none" : `1px solid ${theme.palette.divider}`,
				...(isHighlighted && {
					"&::before": {
						content: '""',
						position: "absolute",
						inset: 0,
						borderRadius: "inherit",
						padding: "1.5px",
						background: RECOMMENDED_BORDER_GRADIENT,
						WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
						WebkitMaskComposite: "xor",
						maskComposite: "exclude",
						pointerEvents: "none",
						zIndex: 1,
					},
					boxShadow: `0 14px 36px ${alpha(BRAND_BLUE, 0.14)}, 0 6px 14px ${alpha(BRAND_BLUE, 0.08)}`,
				}),
				opacity: disabled ? 0.55 : 1,
				transition: "opacity 0.2s ease",
			}}
		>
			{isHighlighted && (
				<Chip
					label="RECOMENDADO"
					size="small"
					sx={{
						position: "absolute",
						top: -11,
						left: "50%",
						transform: "translateX(-50%)",
						background: RECOMMENDED_BORDER_GRADIENT,
						color: "#fff",
						fontWeight: 600,
						fontSize: "0.65rem",
						letterSpacing: "0.14em",
						height: 22,
						px: 1.25,
						borderRadius: 1,
						boxShadow: `0 6px 14px ${alpha(BRAND_BLUE, 0.32)}`,
						zIndex: 2,
						"& .MuiChip-label": { px: 0.5 },
					}}
				/>
			)}

			<Typography
				variant="h4"
				sx={{
					fontWeight: 600,
					fontSize: "1.25rem",
					letterSpacing: "-0.015em",
					mb: 1.25,
					color: isDark ? theme.palette.grey[100] : theme.palette.grey[900],
				}}
			>
				{plan.name}
			</Typography>

			<Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, flexWrap: "wrap" }}>
				{hasDiscount && (
					<Typography
						sx={{
							fontSize: "1rem",
							fontWeight: 500,
							color: theme.palette.text.secondary,
							textDecoration: "line-through",
							opacity: 0.7,
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{formatPriceShort(plan.basePrice)}
					</Typography>
				)}
				<Typography
					variant="h2"
					sx={{
						fontWeight: 600,
						fontSize: "2.25rem",
						lineHeight: 1,
						letterSpacing: "-0.03em",
						fontVariantNumeric: "tabular-nums",
						color: isDark ? theme.palette.grey[50] : theme.palette.grey[900],
					}}
				>
					{hasDiscount ? formatPriceShort(finalPrice) : formatPriceShort(plan.basePrice)}
				</Typography>
				<Typography
					sx={{
						fontSize: "0.9rem",
						fontWeight: 500,
						color: theme.palette.text.secondary,
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{plan.suffix}
				</Typography>
			</Box>

			{hasDiscount ? (
				<Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ mt: 0.75 }}>
					{formData.badge && (
						<Chip
							label={formData.badge}
							size="small"
							color="success"
							sx={{
								height: 20,
								fontSize: "0.7rem",
								fontWeight: 700,
								letterSpacing: "0.04em",
								"& .MuiChip-label": { px: 0.75 },
							}}
						/>
					)}
					{formData.promotionalMessage && (
						<Typography
							sx={{
								fontSize: "0.78rem",
								color: theme.palette.text.secondary,
								fontWeight: 400,
								letterSpacing: "0.01em",
							}}
						>
							{formData.promotionalMessage}
						</Typography>
					)}
				</Stack>
			) : (
				<Typography sx={{ mt: 0.5, fontSize: "0.78rem", color: theme.palette.text.secondary, visibility: "hidden" }}>—</Typography>
			)}

			<Divider sx={{ my: 2, borderColor: alpha(theme.palette.divider, 0.5) }} />

			<Stack spacing={1}>
				<Typography
					variant="caption"
					color="textSecondary"
					sx={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em" }}
				>
					Detalle del descuento
				</Typography>
				<Stack direction="row" spacing={0.75} alignItems="flex-start">
					<TickCircle size={14} variant="Bulk" color={theme.palette.success.main} style={{ marginTop: 2, flexShrink: 0 }} />
					<Typography sx={{ fontSize: "0.82rem" }}>
						{formData.discountType === "percentage"
							? `${formData.discountValue}% de descuento`
							: `${formatPriceShort(formData.discountValue)} ${formData.currency} de descuento`}
					</Typography>
				</Stack>
				<Stack direction="row" spacing={0.75} alignItems="flex-start">
					<TickCircle size={14} variant="Bulk" color={theme.palette.success.main} style={{ marginTop: 2, flexShrink: 0 }} />
					<Typography sx={{ fontSize: "0.82rem" }}>{getDurationText(formData.duration, formData.durationInMonths)}</Typography>
				</Stack>
			</Stack>

			{disabled && (
				<Box
					sx={{
						position: "absolute",
						top: 8,
						right: 8,
						bgcolor: alpha(theme.palette.warning.main, 0.15),
						color: theme.palette.warning.main,
						fontSize: "0.65rem",
						fontWeight: 700,
						letterSpacing: "0.06em",
						px: 1,
						py: 0.25,
						borderRadius: 1,
					}}
				>
					NO APLICA
				</Box>
			)}
		</Box>
	);
};

const PromotionPreviewTab = ({ formData }: PromotionPreviewTabProps) => {
	const theme = useTheme();

	// Si applicablePlans está vacío, el descuento aplica a todos los planes pagos.
	const standardApplies = formData.applicablePlans.length === 0 || formData.applicablePlans.includes("standard");
	const premiumApplies = formData.applicablePlans.length === 0 || formData.applicablePlans.includes("premium");

	// Restricciones de billing — si hay alguna, mostrar nota.
	const billingNote = useMemo(() => {
		if (formData.applicableBillingPeriods.length === 0) return null;
		const labels = formData.applicableBillingPeriods.map((p) => (p === "monthly" ? "mensual" : p === "annual" ? "anual" : p)).join(" y ");
		return `Solo válido en facturación ${labels}.`;
	}, [formData.applicableBillingPeriods]);

	// Resumen de dónde aparecerá este descuento.
	const visibilityStatus = useMemo(() => {
		const items: { label: string; visible: boolean; reason?: string }[] = [];

		// Landing pública
		const landingVisible = formData.isActive && formData.isPublic && formData.showOnLanding;
		const landingReason = !formData.isActive
			? "la promoción no está activa"
			: !formData.isPublic
			? "no está marcada como pública"
			: !formData.showOnLanding
			? "el switch 'Mostrar en landing' está apagado"
			: undefined;
		items.push({ label: "Landing pública (visitantes no autenticados)", visible: landingVisible, reason: landingReason });

		// Página /plans (autenticados)
		const plansPageVisible = formData.isActive && formData.isPublic;
		const plansReason = !formData.isActive
			? "la promoción no está activa"
			: !formData.isPublic
			? "no está marcada como pública"
			: undefined;
		items.push({ label: "Página de planes (usuarios autenticados elegibles)", visible: plansPageVisible, reason: plansReason });

		return items;
	}, [formData.isActive, formData.isPublic, formData.showOnLanding]);

	const audienceNotes: string[] = [];
	if (formData.newCustomersOnly) audienceNotes.push("solo visible a clientes nuevos (sin historial de suscripción paga)");
	if (formData.excludeActiveSubscribers) audienceNotes.push("oculto a usuarios con suscripción paga activa");

	const noPlansSelected = !standardApplies && !premiumApplies;

	return (
		<Stack spacing={3}>
			{/* Header: dónde aparecerá */}
			<Box>
				<Typography variant="subtitle2" color="primary" gutterBottom>
					Dónde aparecerá este descuento
				</Typography>
				<Stack spacing={1}>
					{visibilityStatus.map((item) => (
						<Stack key={item.label} direction="row" spacing={1} alignItems="flex-start">
							{item.visible ? (
								<Eye size={18} variant="Bulk" color={theme.palette.success.main} style={{ flexShrink: 0, marginTop: 2 }} />
							) : (
								<EyeSlash size={18} variant="Bulk" color={theme.palette.text.disabled} style={{ flexShrink: 0, marginTop: 2 }} />
							)}
							<Box>
								<Typography variant="body2" sx={{ fontWeight: 500, color: item.visible ? "text.primary" : "text.secondary" }}>
									{item.label}
								</Typography>
								{!item.visible && item.reason && (
									<Typography variant="caption" color="text.secondary">
										No aparece — {item.reason}.
									</Typography>
								)}
							</Box>
						</Stack>
					))}
				</Stack>

				{audienceNotes.length > 0 && (
					<Alert severity="info" sx={{ mt: 2 }}>
						<AlertTitle>Filtros de audiencia activos</AlertTitle>
						Este descuento estará {audienceNotes.join(" y ")}.
					</Alert>
				)}

				{billingNote && (
					<Alert severity="info" sx={{ mt: 1 }}>
						{billingNote}
					</Alert>
				)}
			</Box>

			<Divider />

			{/* Preview visual */}
			<Box>
				<Typography variant="subtitle2" color="primary" gutterBottom>
					Vista previa de las tarjetas de plan
				</Typography>
				<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
					Así se verán los planes con este descuento aplicado en la landing y en la página de planes. Los precios base se asumen iguales a
					los actuales (Estándar $19.99 / Premium $49.99); si cambian en la API real, los valores pueden no coincidir.
				</Typography>

				{noPlansSelected ? (
					<Alert severity="warning">
						No hay planes aplicables. Marcá al menos "Standard" o "Premium" en las restricciones (o dejá ambas vacías para que aplique a
						todos).
					</Alert>
				) : (
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6}>
							<PlanPreviewCard planId="standard" formData={formData} disabled={!standardApplies} />
						</Grid>
						<Grid item xs={12} sm={6}>
							<PlanPreviewCard planId="premium" formData={formData} disabled={!premiumApplies} />
						</Grid>
					</Grid>
				)}

				{formData.discountValue <= 0 && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						El valor del descuento es 0. El preview muestra el precio sin descuento aplicado.
					</Alert>
				)}
			</Box>
		</Stack>
	);
};

export default PromotionPreviewTab;
