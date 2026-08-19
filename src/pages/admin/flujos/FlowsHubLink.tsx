// Enlace de vuelta al índice de flujos (/admin/flujos).
//
// Va en cada vista que contiene un diagrama, para que los cuatro esquemas del
// ecosistema queden navegables entre sí en vez de ser páginas sueltas que hay
// que conocer de memoria. Es un componente y no markup repetido para que el
// texto y el destino se cambien en un solo lugar.

import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { Hierarchy } from "iconsax-react";
import { BRAND_BLUE } from "themes/dashboardTokens";

interface FlowsHubLinkProps {
	/** Nombre de este flujo, para ubicar al lector dentro del conjunto. */
	current: string;
}

const FlowsHubLink: React.FC<FlowsHubLinkProps> = ({ current }) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				px: 1.5,
				py: 1,
				mb: 2,
				borderRadius: 2,
				border: `1px solid ${theme.palette.divider}`,
				bgcolor: alpha(BRAND_BLUE, theme.palette.mode === "dark" ? 0.08 : 0.04),
			}}
		>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Hierarchy size={16} color={BRAND_BLUE} />
				<Typography variant="caption" color="text.secondary">
					<strong>{current}</strong> es uno de los flujos del ecosistema.
				</Typography>
				<Typography
					variant="caption"
					component={RouterLink}
					to="/admin/flujos"
					sx={{ color: BRAND_BLUE, fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
				>
					Verlos todos juntos →
				</Typography>
			</Stack>
		</Box>
	);
};

export default FlowsHubLink;
