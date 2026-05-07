import { Box, Chip, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import SentenciasWorkerTab from "./SentenciasWorkerTab";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";

export default function SentenciasWorkerPage() {
	const theme = useTheme();
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
						<Box
							component="span"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								px: 1,
								py: 0.25,
								borderRadius: 1,
								bgcolor: theme.palette.grey[800],
								color: theme.palette.common.white,
								fontSize: "0.65rem",
								fontWeight: 500,
								fontFamily: "monospace",
								letterSpacing: "0.5px",
							}}
						>
							worker_01
						</Box>
						<Box
							component="span"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								px: 0.75,
								py: 0.25,
								borderRadius: 1,
								bgcolor: alpha(theme.palette.info.main, 0.1),
								color: theme.palette.info.main,
								fontSize: "0.6rem",
								fontWeight: 500,
								fontFamily: "monospace",
							}}
						>
							100.111.73.56
						</Box>
						<Chip
							label="pjn-sentencias-v1 · sentencias-corpus"
							size="small"
							color="secondary"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
						<Chip
							label="sentencias-capturadas · Atlas"
							size="small"
							color="info"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
						<Chip
							label="CausasCIV/CNT/CSS/COM · local"
							size="small"
							color="default"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
					</Stack>
				</Stack>
				<RepoBadgeGroup
					repos={[
						{
							localName: "pjn-workers-scraping",
							role: "Workers (×4)",
							description:
								"Aloja sentencias-worker, sentencias-collector, sentencias-semantic-worker y sentencias-embeddings en src/tasks/. Cada uno con su pm2.*.config.js.",
						},
						{
							localName: "pjn-api",
							role: "API config",
							description:
								"Endpoints /api/sentencias-capturadas, /api/configuracion-sentencias-collector y /api/configuracion-semantic-worker en src/controllers/.",
						},
						{
							localName: "pjn-rag-api",
							githubName: "pjn-rag-service",
							role: "API publicaciones",
							description: "Endpoints /rag/admin/sentencias-worker/* del tab 'Publicaciones' (sin worker separado).",
						},
					]}
				/>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<SentenciasWorkerTab />
				</Paper>
			</Stack>
		</MainCard>
	);
}
