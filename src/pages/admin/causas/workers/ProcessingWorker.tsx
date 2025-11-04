import React from "react";
import { Typography, Box, Alert } from "@mui/material";

const ProcessingWorker = () => {
	return (
		<Box>
			<Alert severity="warning" sx={{ mb: 2 }}>
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Procesamiento
				</Typography>
				<Typography variant="body2">
					Este worker está en desarrollo. Se encargará del procesamiento automático de documentos judiciales.
				</Typography>
			</Alert>

			<Typography variant="body2" color="text.secondary">
				Próximamente podrás configurar:
			</Typography>
			<ul>
				<li>Tipos de documentos a procesar</li>
				<li>Reglas de extracción de datos</li>
				<li>Prioridades de procesamiento</li>
				<li>Límites de procesamiento por día</li>
			</ul>
		</Box>
	);
};

export default ProcessingWorker;
