import { Stack, Typography } from "@mui/material";
import RepoBadge, { RepoBadgeProps } from "./RepoBadge";

interface RepoBadgeGroupProps {
	/** Etiqueta antepuesta. Default: "Repos:" */
	label?: string;
	repos: RepoBadgeProps[];
}

/**
 * Banda compacta con un texto "Repos:" y N badges. Pensado para ir al inicio
 * de una vista admin de workers para que el desarrollador sepa de un vistazo
 * en qué proyectos vive el código.
 */
const RepoBadgeGroup = ({ label = "Repos detrás de esta vista:", repos }: RepoBadgeGroupProps) => {
	return (
		<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
			<Typography variant="caption" color="text.secondary" fontWeight={600}>
				{label}
			</Typography>
			{repos.map((r) => (
				<RepoBadge key={`${r.localName}-${r.role || ""}`} {...r} />
			))}
		</Stack>
	);
};

export default RepoBadgeGroup;
