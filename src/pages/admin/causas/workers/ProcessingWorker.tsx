import React from "react";
import { Typography, Box, Stack } from "@mui/material";
import { DocumentText } from "iconsax-react";
import EmptyStateCard from "components/EmptyStateCard";

const ProcessingWorker = () => {
	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<EmptyStateCard
				icon={<DocumentText />}
				title="Worker de procesamiento"
				subtitle="En desarrollo — se encargará del procesamiento automático de documentos judiciales."
				iconColor="warning"
			/>
			<Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center" }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Próximamente podrás configurar
				</Typography>
				<Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8 }}>
					Tipos de documentos a procesar · Reglas de extracción de datos · Prioridades de procesamiento · Límites de procesamiento por día
				</Typography>
			</Box>
		</Stack>
	);
};

export default ProcessingWorker;
