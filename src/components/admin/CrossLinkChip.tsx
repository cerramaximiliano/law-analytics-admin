import { Box, Tooltip, alpha, useTheme } from "@mui/material";
import { ArrowRight2 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Salto entre dos vistas que hablan del mismo asunto desde ángulos distintos.
 *
 * Nace del par infraestructura ↔ bases de datos: el box qdrant-01 y la base
 * Qdrant son la misma cosa mirada como máquina o como datos, y quien está en
 * una casi siempre quiere la otra. Sin el link había que volver al menú y
 * acordarse de dónde estaba la contraparte.
 *
 * Toma el lenguaje visual de los `monoChip` de la franja de contexto —radio 6,
 * fondo tintado, sin borde grueso— porque navegar no ejecuta nada: el borde
 * marcado, en esta interfaz, significa que algo va a pasar.
 *
 * Para el trío datos → worker → flujo existe `CrossViewLinks`, que además marca
 * en cuál de los tres estás parado. Este es el caso simple: un solo destino.
 */
export interface CrossLinkChipProps {
	/** Adónde va. Ruta interna, con su query si hace falta. */
	to: string;
	/** Qué se encuentra del otro lado. Un sustantivo, no una orden. */
	label: string;
	/** Detalle opcional para el tooltip. */
	title?: string;
}

const CrossLinkChip = ({ to, label, title }: CrossLinkChipProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	return (
		<Tooltip title={title || ""}>
			<Box
				component={RouterLink}
				to={to}
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 0.5,
					px: 1,
					py: 0.4,
					borderRadius: "6px",
					textDecoration: "none",
					fontSize: "0.72rem",
					fontWeight: 600,
					lineHeight: 1.4,
					color: BRAND_BLUE,
					bgcolor: alpha(BRAND_BLUE, isDark ? 0.14 : 0.08),
					transition: "background-color 200ms ease",
					"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.22 : 0.14) },
				}}
			>
				{label}
				<ArrowRight2 size={12} />
			</Box>
		</Tooltip>
	);
};

export default CrossLinkChip;
