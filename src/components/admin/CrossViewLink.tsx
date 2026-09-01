import { Button, Tooltip, alpha, useTheme } from "@mui/material";
import { ArrowRight2, DocumentText, Setting2 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * El par de links que conecta una vista de datos con el worker que los extrae.
 *
 * Casi toda vista de datos del admin tiene un worker detrás, y casi toda vista
 * de worker tiene datos que mirar. Antes cada una resolvía ese salto por su
 * cuenta: cuatro implementaciones con tres etiquetas distintas ("Ver los
 * datos", "Config del worker", "Configuración del worker"), tres íconos y tres
 * ubicaciones. El salto se veía distinto según de dónde vinieras.
 *
 * Dos decisiones de diseño acá:
 *
 * 1. **No es un botón de acción.** "Actualizar" o "Guardar" hacen algo en esta
 *    vista; esto te lleva a otra. Por eso el tinte azul de marca y la flecha
 *    final, en vez del outlined neutro que usan las acciones: a un golpe de
 *    vista se distingue "voy a otro lado" de "esto ejecuta algo".
 *
 * 2. **El ícono nombra el destino, no el origen.** Vas a *datos* (documento) o
 *    vas a *configuración* (engranaje). Es la señal que te dice qué mitad del
 *    par estás mirando ahora mismo.
 *
 * Va siempre en la fila de encabezado de la vista, alineado a la derecha y
 * antes de los demás recursos del encabezado.
 */

export type CrossViewKind = "datos" | "worker";

export interface CrossViewLinkProps {
	/** A qué mitad del par vas: los datos, o el worker que los produce. */
	kind: CrossViewKind;
	to: string;
	/** Sólo para destinos que no son "los datos" a secas (ej. "Ver los datos postales"). */
	label?: string;
	/** Qué vas a encontrar del otro lado. Por defecto describe el tipo de destino. */
	tooltip?: string;
}

const DEFAULTS: Record<CrossViewKind, { label: string; tooltip: string }> = {
	datos: { label: "Ver los datos", tooltip: "Ir a la vista de datos que produce este worker" },
	worker: { label: "Configuración del worker", tooltip: "Ir a la configuración del worker que extrae estos datos" },
};

const CrossViewLink = ({ kind, to, label, tooltip }: CrossViewLinkProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const defaults = DEFAULTS[kind];

	return (
		<Tooltip title={tooltip ?? defaults.tooltip}>
			<Button
				size="small"
				variant="outlined"
				component={RouterLink}
				to={to}
				startIcon={kind === "datos" ? <DocumentText size={15} /> : <Setting2 size={15} />}
				endIcon={<ArrowRight2 size={13} />}
				sx={{
					flexShrink: 0,
					whiteSpace: "nowrap",
					textTransform: "none",
					fontWeight: 600,
					fontSize: "0.75rem",
					borderRadius: 1.5,
					py: 0.4,
					pl: 1.1,
					pr: 0.9,
					color: BRAND_BLUE,
					borderColor: alpha(BRAND_BLUE, isDark ? 0.38 : 0.26),
					bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04),
					"&:hover": {
						borderColor: alpha(BRAND_BLUE, isDark ? 0.6 : 0.45),
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.16 : 0.09),
					},
					"& .MuiButton-startIcon": { mr: 0.7 },
					"& .MuiButton-endIcon": { ml: 0.4, opacity: 0.65 },
				}}
			>
				{label ?? defaults.label}
			</Button>
		</Tooltip>
	);
};

/** Desde una vista de worker hacia los datos que produce. */
export const VerDatosLink = (props: Omit<CrossViewLinkProps, "kind">) => <CrossViewLink kind="datos" {...props} />;

/** Desde una vista de datos hacia el worker que los extrae. */
export const ConfigWorkerLink = (props: Omit<CrossViewLinkProps, "kind">) => <CrossViewLink kind="worker" {...props} />;

export default CrossViewLink;
