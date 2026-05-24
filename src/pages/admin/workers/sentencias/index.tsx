import { Box, Chip, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import MainCard from "components/MainCard";
import SentenciasWorkerTab from "./SentenciasWorkerTab";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

export default function SentenciasWorkerPage() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ pb: 1 }}>
					<Box sx={{ maxWidth: 720 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Worker Sentencias (IA)
						</Typography>
						<Typography variant="body1" color="text.secondary">
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
								fontVariantNumeric: "tabular-nums",
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
								bgcolor: alpha(BRAND_BLUE, 0.1),
								color: BRAND_BLUE,
								fontSize: "0.6rem",
								fontWeight: 500,
								fontFamily: "monospace",
								fontVariantNumeric: "tabular-nums",
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
							variant="outlined"
							sx={{
								fontFamily: "monospace",
								fontSize: "0.72rem",
								color: BRAND_BLUE,
								borderColor: alpha(BRAND_BLUE, 0.4),
							}}
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
				<Paper
					variant="outlined"
					sx={{
						p: { xs: 1.5, sm: 2 },
						borderRadius: 2,
						borderColor: headerBorder(isDark),
						bgcolor: theme.palette.background.paper,
					}}
				>
					<SentenciasWorkerTab />
				</Paper>
			</Stack>
		</MainCard>
	);
}
