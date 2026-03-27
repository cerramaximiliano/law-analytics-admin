import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import MainCard from "components/MainCard";
import StyleCorpusTab from "pages/admin/rag-workers/StyleCorpusTab";

const CorpusWorkerPage = () => {
	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				<Box>
					<Typography variant="h3">Workers Corpus (IA)</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Gestión del corpus de estilo jurídico para few-shot retrieval y generación de documentos
					</Typography>
				</Box>
				<StyleCorpusTab />
			</Stack>
		</MainCard>
	);
};

export default CorpusWorkerPage;
