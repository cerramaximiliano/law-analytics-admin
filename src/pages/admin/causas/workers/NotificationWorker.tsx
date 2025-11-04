import React from "react";
import { Typography, Box, Alert } from "@mui/material";

const NotificationWorker = () => {
	return (
		<Box>
			<Alert severity="warning" sx={{ mb: 2 }}>
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Notificaciones
				</Typography>
				<Typography variant="body2">
					Este worker está en desarrollo. Gestionará el envío de notificaciones automáticas sobre cambios en las causas.
				</Typography>
			</Alert>

			<Typography variant="body2" color="text.secondary">
				Próximamente podrás configurar:
			</Typography>
			<ul>
				<li>Tipos de notificaciones</li>
				<li>Canales de envío (email, SMS, push)</li>
				<li>Horarios de envío</li>
				<li>Plantillas de mensajes</li>
				<li>Reglas de notificación</li>
			</ul>
		</Box>
	);
};

export default NotificationWorker;
