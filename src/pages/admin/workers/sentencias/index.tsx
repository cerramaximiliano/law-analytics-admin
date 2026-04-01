import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import MainCard from "components/MainCard";
import SentenciasWorkerTab from "./SentenciasWorkerTab";

export default function SentenciasWorkerPage() {
	return (
		<MainCard>
			<Stack spacing={2}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
					<Box>
						<Typography variant="h3">Worker Sentencias (IA)</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
							Pipeline de captura, extracción OCR, embeddings y detección de novedad de sentencias judiciales
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
						<Chip label="worker_01" size="small" color="default" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }} />
						<Chip label="pjn-style-corpus-v2 · sentencias-corpus" size="small" color="secondary" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
						<Chip label="sentencias-capturadas · Atlas" size="small" color="info" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
						<Chip label="CausasCIV/CNT/CSS/COM · local" size="small" color="default" variant="outlined" sx={{ fontFamily: "monospace", fontSize: "0.72rem" }} />
					</Stack>
				</Stack>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<SentenciasWorkerTab />
				</Paper>
			</Stack>
		</MainCard>
	);
}
