import React from "react";
import { Typography, Box, Stack } from "@mui/material";
import { Notification } from "iconsax-react";
import EmptyStateCard from "components/EmptyStateCard";

const NotificationWorker = () => {
	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<EmptyStateCard
				icon={<Notification />}
				title="Worker de notificaciones"
				subtitle="En desarrollo — gestionará el envío de notificaciones automáticas sobre cambios en las causas."
				iconColor="warning"
			/>
			<Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center" }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Próximamente podrás configurar
				</Typography>
				<Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8 }}>
					Tipos de notificaciones · Canales de envío (email, SMS, push) · Horarios de envío · Plantillas de mensajes · Reglas de notificación
				</Typography>
			</Box>
		</Stack>
	);
};

export default NotificationWorker;
