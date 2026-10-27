import React, { useEffect, useState } from "react";
import { Checkbox, Chip, ListItemText, MenuItem, TextField } from "@mui/material";
import { CampaignService } from "store/reducers/campaign";
import { CampaignTipo, CampaignTypeInfo } from "types/campaign";

// Tipología fija de campañas. Respaldo estático (misma tabla que la-marketing-service/utils/campaignTypes.js)
// por si el endpoint GET /api/campaigns/types todavía no está desplegado.
export const FALLBACK_TIPOS: CampaignTypeInfo[] = [
	{ key: "captacion", label: "Captación", color: "#2563EB" },
	{ key: "onboarding", label: "Onboarding", color: "#16A34A" },
	{ key: "conversion", label: "Conversión", color: "#7C3AED" },
	{ key: "reactivacion", label: "Reactivación", color: "#EA580C" },
	{ key: "producto", label: "Novedades de producto", color: "#0891B2" },
	{ key: "promocion", label: "Promociones", color: "#DB2777" },
	{ key: "contenido", label: "Contenido", color: "#CA8A04" },
	{ key: "servicio", label: "Avisos de servicio", color: "#475569" },
	{ key: "prueba", label: "Prueba", color: "#94A3B8" },
];

export const SIN_TIPO = "sin_tipo";
const SIN_TIPO_INFO = { key: SIN_TIPO, label: "Sin clasificar", color: "#9CA3AF" };

let cache: CampaignTypeInfo[] | null = null;

export const useCampaignTipos = (): CampaignTypeInfo[] => {
	const [tipos, setTipos] = useState<CampaignTypeInfo[]>(cache ?? FALLBACK_TIPOS);
	useEffect(() => {
		if (cache) return;
		CampaignService.getCampaignTypes()
			.then((list) => {
				cache = list;
				setTipos(list);
			})
			.catch(() => undefined);
	}, []);
	return tipos;
};

export const tipoInfo = (tipos: CampaignTypeInfo[], key?: string | null) =>
	(key ? tipos.find((t) => t.key === key) : undefined) ?? (key ? { key, label: key, color: "#9CA3AF" } : SIN_TIPO_INFO);

// Chip de color con la etiqueta del tipo. Texto oscuro sobre fondo claro para que se lea con cualquier color.
export const CampaignTipoChip: React.FC<{ tipo?: CampaignTipo | string | null; subtipo?: string | null; size?: "small" | "medium" }> = ({
	tipo,
	subtipo,
	size = "small",
}) => {
	const tipos = useCampaignTipos();
	const info = tipoInfo(tipos, tipo);
	return (
		<Chip
			size={size}
			label={subtipo ? `${info.label} · ${subtipo}` : info.label}
			sx={{ bgcolor: `${info.color}26`, color: "#1f1f1f", border: `1px solid ${info.color}`, fontWeight: 600 }}
		/>
	);
};

// Selector múltiple de tipo (incluye "Sin clasificar").
export const TipoMultiSelect: React.FC<{ value: string[]; onChange: (value: string[]) => void; label?: string; minWidth?: number }> = ({
	value,
	onChange,
	label = "Tipo de campaña",
	minWidth = 220,
}) => {
	const tipos = useCampaignTipos();
	const options = [...tipos, SIN_TIPO_INFO];
	return (
		<TextField
			select
			size="small"
			label={label}
			value={value}
			onChange={(e) => onChange(typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as unknown as string[]))}
			SelectProps={{
				multiple: true,
				renderValue: (selected) => (selected as string[]).map((k) => tipoInfo(tipos, k).label).join(", ") || "Todos",
				displayEmpty: true,
			}}
			InputLabelProps={{ shrink: true }}
			sx={{ minWidth }}
		>
			{options.map((t) => (
				<MenuItem key={t.key} value={t.key}>
					<Checkbox size="small" checked={value.includes(t.key)} />
					<ListItemText primary={t.label} />
				</MenuItem>
			))}
		</TextField>
	);
};

export const tipoOrder = (key?: string | null): number => {
	const i = FALLBACK_TIPOS.findIndex((t) => t.key === key);
	return i === -1 ? FALLBACK_TIPOS.length : i;
};
