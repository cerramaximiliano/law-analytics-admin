import React from "react";
import { Typography, Box, Alert } from "@mui/material";

const SyncWorker = () => {
	return (
		<Box>
			<Alert severity="warning" sx={{ mb: 2 }}>
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Sincronización
				</Typography>
				<Typography variant="body2">
					Este worker está en desarrollo. Permitirá sincronizar datos con sistemas externos del Poder Judicial.
				</Typography>
			</Alert>

			<Typography variant="body2" color="text.secondary">
				Próximamente podrás configurar:
			</Typography>
			<ul>
				<li>Frecuencia de sincronización</li>
				<li>Sistemas externos a sincronizar</li>
				<li>Mapeo de campos</li>
				<li>Manejo de conflictos</li>
			</ul>
		</Box>
	);
};

export default SyncWorker;
