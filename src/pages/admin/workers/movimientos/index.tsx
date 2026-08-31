import { useState } from "react";
import { Box, Chip, Collapse, Stack, Typography, alpha, useMediaQuery, useTheme } from "@mui/material";
import { ArrowDown2, ArrowUp2 } from "iconsax-react";
import MainCard from "components/MainCard";
import UpdateMovimientosWorkerTab from "./UpdateMovimientosWorkerTab";
import RepoBadgeGroup from "components/admin/RepoBadgeGroup";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Encabezado de la vista. Mismo patrón que la vista de sentencias: título,
 * bajada, y la identificación técnica plegada abajo de md.
 *
 * Antes esto envolvía el contenido en un `<Tabs>` de una sola pestaña
 * ("Update Movimientos"): 56px de cromo de navegación que no navegaba a
 * ningún lado. Las pestañas reales viven adentro del componente.
 */

export default function MovimientosWorkerPage() {
	const theme = useTheme();
	const esEscritorio = useMediaQuery(theme.breakpoints.up("md"));
	const [detallesAbiertos, setDetallesAbiertos] = useState(false);
	const mostrarDetalles = esEscritorio || detallesAbiertos;

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
					<Box sx={{ maxWidth: 720 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Worker Update (IA)
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Relee las causas que el pipeline de novedad marca para revisar y guarda los movimientos nuevos que aparecieron
						</Typography>
					</Box>
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
								label="CausasCIV/CNT/CSS/COM · local"
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
								label="manager + workers dinámicos"
								size="small"
								color="warning"
								variant="outlined"
								sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
							/>
							<Chip
								label="sin Pinecone"
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
									role: "Worker + Manager",
									description:
										"src/tasks/update-movimientos-manager.js (escala) + src/tasks/update-movimientos-worker.js (uno por fuero). PM2: pm2.update-movimientos.config.js. Lee config de configuracion-update-movimientos[-manager] en law_analytics.",
								},
								{
									localName: "pjn-api",
									role: "API config",
									description:
										"Endpoints /api/configuracion-update-movimientos/ y /manager (CRUD de la config que lee el worker). Controllers y rutas en src/controllers + src/routes.",
								},
							]}
						/>
					</Stack>
				</Collapse>

				<UpdateMovimientosWorkerTab />
			</Stack>
		</MainCard>
	);
}
