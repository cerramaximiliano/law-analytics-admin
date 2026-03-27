import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import MainCard from "components/MainCard";
import EscritosWorkerTab from "pages/admin/rag-workers/EscritosWorkerTab";

const EscritosWorkerPage = () => {
	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Box>
					<Typography variant="h3">Workers Escritos (IA)</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Pipeline de extracción, chunking semántico y detección de novedad de escritos judiciales
					</Typography>
				</Box>
				<EscritosWorkerTab />
			</Stack>
		</MainCard>
	);
};

export default EscritosWorkerPage;
