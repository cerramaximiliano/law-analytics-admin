import React, { useEffect, useState } from "react";
import { Alert, Chip, Tooltip } from "@mui/material";
import mktAxios from "utils/mktAxios";
import { CampaignService } from "store/reducers/campaign";
import { PricingBlocks, PricingMode, PricingStatus } from "types/campaign";

// Bloques de precios dinámicos: detección en el cliente (para listas) y estado "hoy se muestra…" desde el servicio.
const PATTERNS: Record<string, RegExp> = {
	"{{tablaPrecios}}": /(\{\{|\$\{)\s*tablaPrecios/,
	"{{ofertaActual}}": /(\{\{|\$\{)\s*ofertaActual/,
	"{{descuento.*}}": /(\{\{|\$\{)\s*descuento\./,
	"{{plan.*}}": /(\{\{|\$\{)\s*plan\./,
};

export const detectPricingBlocks = (...texts: Array<string | undefined | null>): string[] => {
	const joined = texts.filter(Boolean).join("\n");
	return Object.entries(PATTERNS)
		.filter(([, re]) => re.test(joined))
		.map(([name]) => name);
};

// Chip "Precios dinámicos" con el detalle de los bloques al pasar el mouse.
export const DynamicPricingChip: React.FC<{ texts: Array<string | undefined | null> }> = ({ texts }) => {
	const used = detectPricingBlocks(...texts);
	if (!used.length) return null;
	return (
		<Tooltip title={`Usa ${used.join(", ")}. Muestra el descuento vigente o, sin descuento, los precios de lista.`}>
			<Chip
				label="Precios dinámicos"
				size="small"
				color="info"
				variant="outlined"
				sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
			/>
		</Tooltip>
	);
};

const SEVERITY: Record<PricingMode, "info" | "success" | "warning"> = {
	none: "info",
	adjunto: "success",
	auto_descuento: "success",
	auto_lista: "info",
};

export const PricingStatusAlert: React.FC<{ pricing: PricingStatus | null; blocks?: PricingBlocks | null; sx?: object }> = ({
	pricing,
	sx,
}) => {
	if (!pricing || pricing.mode === "none") return null;
	const warn = pricing.label.includes("no vigente") || (pricing.requiresPromo && pricing.mode === "auto_lista");
	return (
		<Alert severity={warn ? "warning" : SEVERITY[pricing.mode]} sx={sx}>
			<strong>Hoy se muestra:</strong> {pricing.label}
		</Alert>
	);
};

// Estado de una plantilla (GET /api/templates/:id/pricing-status).
export const TemplatePricingStatus: React.FC<{ templateId: string; sx?: object }> = ({ templateId, sx }) => {
	const [pricing, setPricing] = useState<PricingStatus | null>(null);
	useEffect(() => {
		let cancelled = false;
		mktAxios
			.get(`/api/templates/${templateId}/pricing-status`)
			.then((res) => !cancelled && setPricing(res.data.data.pricing))
			.catch(() => !cancelled && setPricing(null));
		return () => {
			cancelled = true;
		};
	}, [templateId]);
	return <PricingStatusAlert pricing={pricing} sx={sx} />;
};

// Estado de una campaña (descuento asociado / automático con descuento / automático sin descuento).
export const CampaignPricingStatus: React.FC<{ campaignId: string; sx?: object }> = ({ campaignId, sx }) => {
	const [pricing, setPricing] = useState<PricingStatus | null>(null);
	useEffect(() => {
		let cancelled = false;
		CampaignService.getDiscountUsage(campaignId)
			.then((u) => !cancelled && setPricing(u.pricing ?? null))
			.catch(() => !cancelled && setPricing(null));
		return () => {
			cancelled = true;
		};
	}, [campaignId]);
	return <PricingStatusAlert pricing={pricing} sx={sx} />;
};
