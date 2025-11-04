import React from "react";
import { Typography, Box, Alert } from "@mui/material";

const CleanupWorker = () => {
	return (
		<Box>
			<Alert severity="warning" sx={{ mb: 2 }}>
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Limpieza
				</Typography>
				<Typography variant="body2">
					Este worker está en desarrollo. Se encargará de las tareas de mantenimiento y limpieza del sistema.
				</Typography>
			</Alert>

			<Typography variant="body2" color="text.secondary">
				Próximamente podrás configurar:
			</Typography>
			<ul>
				<li>Retención de datos temporales</li>
				<li>Limpieza de logs</li>
				<li>Archivado automático</li>
				<li>Optimización de base de datos</li>
				<li>Programación de tareas</li>
			</ul>
		</Box>
	);
};

export default CleanupWorker;
