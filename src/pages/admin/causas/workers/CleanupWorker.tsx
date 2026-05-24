import React from "react";
import { Typography, Box, Stack } from "@mui/material";
import { Brush } from "iconsax-react";
import EmptyStateCard from "components/EmptyStateCard";

const CleanupWorker = () => {
	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<EmptyStateCard
				icon={<Brush />}
				title="Worker de limpieza"
				subtitle="En desarrollo — se encargará de las tareas de mantenimiento y limpieza del sistema."
				iconColor="warning"
			/>
			<Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center" }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Próximamente podrás configurar
				</Typography>
				<Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8 }}>
					Retención de datos temporales · Limpieza de logs · Archivado automático · Optimización de base de datos · Programación de tareas
				</Typography>
			</Box>
		</Stack>
	);
};

export default CleanupWorker;
