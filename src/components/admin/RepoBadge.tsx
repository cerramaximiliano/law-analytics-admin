import { Box, Chip, Stack, SvgIcon, Tooltip, Typography } from "@mui/material";

/**
 * Logo de GitHub (Octocat) — SVG inline para no depender de un paquete extra
 * de iconos. Soporta currentColor.
 */
const GitHubIcon = (props: any) => (
	<SvgIcon viewBox="0 0 24 24" {...props}>
		<path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.78-.25.78-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.45.11-3.02 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.57.23 2.73.11 3.02.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.07.78 2.16 0 1.56-.01 2.82-.01 3.2 0 .31.21.68.79.56C20.71 21.39 24 17.07 24 12 24 5.65 18.85.5 12 .5Z" />
	</SvgIcon>
);

export interface RepoBadgeProps {
	/**
	 * Nombre local del repo en /home/mcerra/www/<localName>. También se usa como
	 * label visible si no se pasa `displayName`.
	 */
	localName: string;
	/**
	 * Nombre del repo en github (si difiere del localName). Default = localName.
	 * Ej: pjn-rag-api (local) vs pjn-rag-service (github).
	 */
	githubName?: string;
	/** Owner de github. Default: cerramaximiliano */
	owner?: string;
	/** Etiqueta del rol del repo, ej: "Worker", "API", "Backend (config)". Opcional. */
	role?: string;
	/** Tooltip extra opcional con descripción de qué hace el repo en este contexto. */
	description?: string;
	/** Tamaño del chip. */
	size?: "small" | "medium";
}

/**
 * Badge clickeable con logo de GitHub + nombre del repo. Abre el repo en una
 * pestaña nueva. Incluye tooltip con descripción opcional y rol (worker/api/etc).
 *
 * Uso típico al inicio de una vista de admin de workers para que se identifique
 * en qué repo vive el código que la respalda.
 */
const RepoBadge = ({ localName, githubName, owner = "cerramaximiliano", role, description, size = "small" }: RepoBadgeProps) => {
	const ghName = githubName || localName;
	const url = `https://github.com/${owner}/${ghName}`;
	const tooltipBody = (
		<Box>
			<Typography variant="caption" sx={{ display: "block", fontWeight: 600 }}>
				{owner}/{ghName}
			</Typography>
			{role && (
				<Typography variant="caption" sx={{ display: "block", opacity: 0.85 }}>
					Rol: {role}
				</Typography>
			)}
			{description && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.85 }}>
					{description}
				</Typography>
			)}
			{githubName && githubName !== localName && (
				<Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.7, fontStyle: "italic" }}>
					(local: {localName})
				</Typography>
			)}
			<Typography variant="caption" sx={{ display: "block", mt: 0.5, opacity: 0.7 }}>
				Click para abrir en GitHub →
			</Typography>
		</Box>
	);

	return (
		<Tooltip title={tooltipBody} arrow>
			<Chip
				icon={<GitHubIcon sx={{ fontSize: 16 }} />}
				label={
					<Stack direction="row" spacing={0.5} alignItems="center" component="span">
						<Typography variant="caption" component="span" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
							{localName}
						</Typography>
						{role && (
							<Typography variant="caption" component="span" sx={{ opacity: 0.7, ml: 0.5 }}>
								· {role}
							</Typography>
						)}
					</Stack>
				}
				size={size}
				variant="outlined"
				clickable
				component="a"
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				sx={{
					"& .MuiChip-icon": { color: "inherit" },
					textDecoration: "none",
				}}
			/>
		</Tooltip>
	);
};

export default RepoBadge;
