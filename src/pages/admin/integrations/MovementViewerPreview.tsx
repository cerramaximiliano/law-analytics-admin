import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Skeleton, Stack, Typography, useTheme, alpha } from "@mui/material";
import {
	ArrowRight,
	CalendarAdd,
	CloseCircle,
	DocumentDownload,
	DocumentText,
	ExportSquare,
	Flash,
	LoginCurve,
	NoteAdd,
	TaskSquare,
} from "iconsax-react";
import MovementLinkAnalyticsService from "api/movementLinkAnalytics";
import { MovementLinkActivePromo } from "types/movementLinkAnalytics";

// ==============================|| VISTA PREVIA DEL VISOR PÚBLICO ||============================== //
//
// Recreación ESTÁTICA de la vista pública /m/:token (law-analytics-front,
// pages/public/movement-doc.tsx) para poder ver desde el admin qué ve el
// usuario que llega desde el email, sin necesitar un token real.
//
// No es un iframe ni renderiza un documento real: los datos del expediente son
// de ejemplo. La PROMO sí es real — se levanta del mismo sistema de descuentos
// (variante universal de landing) vía /api/movement-link-analytics/active-promo.
// Si se cambia el layout real del visor, actualizar esta recreación a mano.

// Tokens del strip de promo — mismos que DiscountBanner de la landing y que la
// vista pública real (movement-doc.tsx del front del usuario).
const BRAND_BLUE = "#3A7BFF";
const BRAND_PURPLE = "#8A5CFF";
const BRAND_GRADIENT_BG = `linear-gradient(90deg, ${BRAND_BLUE} 0%, ${BRAND_PURPLE} 50%, ${BRAND_BLUE} 100%)`;

const SAMPLE = {
	expediente: "EXPEDIENTE 123456/2023",
	fuero: "CSS",
	fecha: "15 de julio de 2026",
	caratula: "PÉREZ, JUAN c/ ANSES s/ REAJUSTES VARIOS",
	tipo: "SENTENCIA",
	detalle: "Se dictó sentencia haciendo lugar a la demanda.",
};

const QUICK_ACTIONS = [
	{ label: "Vencimiento", icon: <CalendarAdd size="16" /> },
	{ label: "Nota", icon: <NoteAdd size="16" /> },
	{ label: "Tarea", icon: <TaskSquare size="16" /> },
];

const MovementViewerPreview: React.FC = () => {
	const theme = useTheme();
	const [promo, setPromo] = useState<MovementLinkActivePromo | null>(null);
	const [promoLoading, setPromoLoading] = useState(true);
	const [promoError, setPromoError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		MovementLinkAnalyticsService.getActivePromo()
			.then((res) => {
				if (!cancelled) setPromo(res.promo);
			})
			.catch((err) => {
				if (!cancelled) setPromoError(err.message);
			})
			.finally(() => {
				if (!cancelled) setPromoLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const promoLabel = promo ? promo.badge || (promo.discountType === "percentage" ? `${promo.discountValue}% OFF` : promo.name) : "";
	const promoValidLabel = promo?.validUntil
		? new Date(promo.validUntil).toLocaleDateString("es-AR", { day: "numeric", month: "long", timeZone: "UTC" })
		: null;
	const promoDurationLabel = promo?.durationInMonths
		? `${promo.durationInMonths} ${promo.durationInMonths === 1 ? "mes" : "meses"}`
		: null;

	return (
		<Box sx={{ px: 3, pb: 3 }}>
			<Alert severity="info" sx={{ mb: 2 }}>
				Recreación estática de la vista pública <strong>/m/:token</strong> (el destino de "Ver documento" en los emails de
				movimientos). Los datos del expediente son de ejemplo; la <strong>promo es la real activa</strong> — la misma que resuelve el
				endpoint público con la variante universal de landing (los descuentos dirigidos por usuario pueden diferir).
				{promoError ? ` (No se pudo cargar la promo: ${promoError})` : ""}
			</Alert>

			{/* Marco de "browser" para que se lea como una página externa */}
			<Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: "hidden" }}>
				<Box sx={{ px: 2, py: 0.75, bgcolor: theme.palette.grey[100], borderBottom: `1px solid ${theme.palette.divider}` }}>
					<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
						https://lawanalytics.app/m/&lt;token&gt;?source=email_movimiento
					</Typography>
				</Box>

				{/* Recreación 1:1 del layout del visor (no interactiva) */}
				<Box sx={{ pointerEvents: "none", display: "flex", flexDirection: "column", minHeight: 560, bgcolor: theme.palette.grey[100] }}>
					{/* Top bar: logo + CTA contextual */}
					<Stack
						direction="row"
						alignItems="center"
						sx={{ px: 2, py: 1.25, bgcolor: "#fff", borderBottom: `1px solid ${theme.palette.divider}`, gap: 2 }}
					>
						<Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
							Law Analytics
						</Typography>
						<Box sx={{ flex: 1 }} />
						<Button variant="contained" color="primary" startIcon={<LoginCurve size="18" />} size="medium">
							Ver la causa completa
						</Button>
					</Stack>

					{/* Header del movimiento */}
					<Box sx={{ bgcolor: "#fff", borderBottom: `1px solid ${theme.palette.divider}`, px: 2, py: 1.5 }}>
						<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5, flexWrap: "wrap" }}>
							<Typography
								variant="caption"
								sx={{ color: theme.palette.primary.main, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
							>
								{SAMPLE.expediente}
							</Typography>
							<Chip size="small" label={SAMPLE.fuero} variant="outlined" />
							<Typography variant="caption" color="text.secondary">
								{SAMPLE.fecha}
							</Typography>
						</Stack>
						<Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
							{SAMPLE.caratula}
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
							<strong>{SAMPLE.tipo}</strong> — {SAMPLE.detalle}
						</Typography>
					</Box>

					{/* Strip de promo (real) — mismo diseño gradiente que la landing */}
					{promoLoading ? (
						<Skeleton variant="rectangular" height={34} />
					) : promo ? (
						<Box
							sx={{
								position: "relative",
								background: BRAND_GRADIENT_BG,
								backgroundSize: "300% 100%",
								color: "#fff",
								borderBottom: `1px solid ${alpha("#000", 0.18)}`,
								animation: "discountShift 16s linear infinite",
								"@keyframes discountShift": {
									"0%": { backgroundPosition: "0% 50%" },
									"100%": { backgroundPosition: "300% 50%" },
								},
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexWrap: "wrap",
								columnGap: 1.5,
								rowGap: 0.25,
								py: 0.75,
								pl: 2,
								pr: 5,
								textAlign: "center",
								lineHeight: 1.25,
							}}
						>
							<Box
								component="span"
								sx={{
									display: "inline-flex",
									alignItems: "center",
									gap: 0.5,
									fontSize: "0.82rem",
									fontWeight: 700,
									letterSpacing: "0.02em",
									textTransform: "uppercase",
									whiteSpace: "nowrap",
								}}
							>
								<Flash size={14} variant="Bold" color="#fff" />
								<Box component="span">{promoLabel}</Box>
							</Box>
							<Box aria-hidden sx={{ width: "1px", height: 14, bgcolor: alpha("#fff", 0.4) }} />
							<Box component="span" sx={{ fontSize: "0.8rem", fontWeight: 500, color: alpha("#fff", 0.95) }}>
								{promoDurationLabel ? (
									<>
										durante <strong>{promoDurationLabel}</strong>
										{promoValidLabel ? " · " : ""}
									</>
								) : null}
								{promoValidLabel ? (
									<>
										hasta el <strong>{promoValidLabel}</strong>
									</>
								) : null}
							</Box>
							<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontSize: "0.82rem", fontWeight: 700 }}>
								<Box component="span" sx={{ borderBottom: `1.5px solid ${alpha("#fff", 0.7)}`, pb: "1px" }}>
									Aprovechar promo
								</Box>
								<ArrowRight size={14} color="#fff" />
							</Box>
							{/* X de cierre (en la vista real colapsa la strip por sesión) */}
							<Box
								component="span"
								sx={{
									position: "absolute",
									right: 8,
									top: "50%",
									transform: "translateY(-50%)",
									display: "inline-flex",
									color: alpha("#fff", 0.8),
								}}
							>
								<CloseCircle size={18} />
							</Box>
						</Box>
					) : (
						<Box sx={{ px: 2, py: 0.75, bgcolor: theme.palette.grey[50], borderBottom: `1px dashed ${theme.palette.divider}` }}>
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
								(Sin promo activa — cuando haya un descuento vigente con visibilidad pública, acá aparece la strip de promo)
							</Typography>
						</Box>
					)}

					{/* Body: placeholder del PDF */}
					<Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, py: 6 }}>
						<DocumentText size={56} color={theme.palette.text.disabled} />
						<Typography variant="body2" color="text.secondary">
							Acá se embebe el PDF del documento (servido desde nuestro S3, URL pre-firmada)
						</Typography>
						<Typography variant="caption" color="text.disabled">
							Si el PDF no está disponible, se muestra el CTA de login + link al portal del PJN
						</Typography>
					</Stack>

					{/* Footer: acciones rápidas + descarga */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="center"
						justifyContent="space-between"
						sx={{ p: 1.5, bgcolor: "#fff", borderTop: `1px solid ${theme.palette.divider}`, flexWrap: "wrap", rowGap: 1 }}
					>
						<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" rowGap={0.5}>
							<Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
								Agregar a la causa:
							</Typography>
							{QUICK_ACTIONS.map((qa) => (
								<Button key={qa.label} size="small" color="secondary" startIcon={qa.icon} sx={{ textTransform: "none" }}>
									{qa.label}
								</Button>
							))}
						</Stack>
						<Stack direction="row" spacing={1}>
							<Button size="small" startIcon={<DocumentDownload size="18" />}>
								Descargar
							</Button>
							<Button size="small" startIcon={<ExportSquare size="18" />}>
								Original PJN
							</Button>
						</Stack>
					</Stack>
				</Box>
			</Paper>

			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
				Interacciones que se trackean desde esta vista: apertura (open/view_confirmed), click en CTA (cta_click, con sub-acción
				vencimiento/nota/tarea), click en la promo (promo_click), descarga (download), portal PJN (fallback_click) y regreso
				autenticado a la app (login_continue).
			</Typography>
		</Box>
	);
};

export default MovementViewerPreview;
