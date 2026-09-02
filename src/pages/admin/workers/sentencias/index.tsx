import { useState } from "react";
import { Box, Chip, Collapse, Stack, Typography, alpha, useMediaQuery, useTheme } from "@mui/material";
import { ArrowDown2, ArrowUp2 } from "iconsax-react";
import MainCard from "components/MainCard";
import SentenciasWorkerTab from "./SentenciasWorkerTab";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import CrossViewLinks from "components/admin/CrossViewLink";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Encabezado de la vista. Todo lo demás vive en las pestañas de
 * SentenciasWorkerTab —incluido el flujo del pipeline, que antes se dibujaba
 * acá y por lo tanto había que scrollearlo estuvieras en la pestaña que
 * estuvieras.
 *
 * La identificación técnica (host, colecciones, repos) ocupaba ~430px antes de
 * cualquier dato: en un teléfono era media pantalla de metadata para llegar a
 * la primera cifra. Abajo de md queda plegada detrás de "Detalles técnicos" y
 * en escritorio se muestra siempre, donde el espacio horizontal la absorbe.
 */

export default function SentenciasWorkerPage() {
	const theme = useTheme();
	const esEscritorio = useMediaQuery(theme.breakpoints.up("md"));
	const [detallesAbiertos, setDetallesAbiertos] = useState(false);
	const mostrarDetalles = esEscritorio || detallesAbiertos;

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
					{/* El título lo pone el breadcrumb del layout; acá solo la bajada. */}
					<Typography variant="body1" color="text.secondary" sx={{ maxWidth: 720 }}>
						Pipeline de captura, extracción OCR, embeddings y detección de novedad de sentencias judiciales
					</Typography>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
						<CrossViewLinks current="worker" to={{ flujo: "/admin/flujos?tab=sentencias" }} />
						{!esEscritorio && (
							<Chip
								size="small"
								variant="outlined"
								onClick={() => setDetallesAbiertos((v) => !v)}
								icon={detallesAbiertos ? <ArrowUp2 size={13} /> : <ArrowDown2 size={13} />}
								label="Detalles técnicos"
								sx={{ fontSize: "0.72rem" }}
							/>
						)}
					</Stack>
				</Stack>

				<Collapse in={mostrarDetalles} unmountOnExit>
					<Stack spacing={1.5}>
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
					</Stack>
				</Collapse>

				<SentenciasWorkerTab />
			</Stack>
		</MainCard>
	);
}
