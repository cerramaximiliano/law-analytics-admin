import React from "react";
import { Typography, Box, Stack } from "@mui/material";
import { Refresh2 } from "iconsax-react";
import EmptyStateCard from "components/EmptyStateCard";

const SyncWorker = () => {
	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<EmptyStateCard
				icon={<Refresh2 />}
				title="Worker de sincronización"
				subtitle="En desarrollo — permitirá sincronizar datos con sistemas externos del Poder Judicial."
				iconColor="warning"
			/>
			<Box sx={{ maxWidth: 520, mx: "auto", textAlign: "center" }}>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
					Próximamente podrás configurar
				</Typography>
				<Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.8 }}>
					Frecuencia de sincronización · Sistemas externos a sincronizar · Mapeo de campos · Manejo de conflictos
				</Typography>
			</Box>
		</Stack>
	);
};

export default SyncWorker;
