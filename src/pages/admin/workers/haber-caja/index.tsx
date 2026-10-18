import { Box, Chip, Stack, Tab, Tabs, Typography, alpha } from "@mui/material";
import MainCard from "components/MainCard";
import { useTabParam } from "hooks/useTabParam";
import { BRAND_BLUE } from "themes/dashboardTokens";
import { CasosParams } from "api/hcRelevamiento";
import ResumenTab from "./ResumenTab";
import CasosTable from "./CasosTable";
import ReglasTab from "./ReglasTab";
import CargasTab from "./CargasTab";
import BlueCorpTab from "./BlueCorpTab";

// Slugs del tab en la URL (?tab=...)
const TABS = ["resumen", "revision", "casos", "bluecorp", "cargas", "reglas"] as const;
const BASE_REVISION: CasosParams = { fuente: "detalleBeneficio", revision: "requerida" };
const BASE_CASOS: CasosParams = {};

export default function HaberCajaRelevamientoPage() {
	const [tab, setTab] = useTabParam("tab", TABS);

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, md: 3 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5}>
					<Box sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.75 }}>
							Haber de caja · relevamiento
						</Typography>
						<Typography variant="body1" color="text.secondary">
							Evaluación horaria del motor contra las constancias de primeros pagos de ANSES (lo que ANSES calcula siguiendo la norma). Los
							casos donde la lectura del OCR explica el resultado quedan para revisión manual; las hojas SICA de reliquidación por sentencia
							quedan solo como referencia.
						</Typography>
					</Box>
					<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
						<Chip
							label="worker_02 · cron 17 * * * *"
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem" }}
						/>
						<Chip
							label="previsional-hc-* · rs0"
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: BRAND_BLUE, borderColor: alpha(BRAND_BLUE, 0.4) }}
						/>
					</Stack>
				</Stack>
				<Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
					<Tab value="resumen" label="Resumen" />
					<Tab value="revision" label="Revisión manual" />
					<Tab value="casos" label="Casos" />
					<Tab value="bluecorp" label="BlueCorp" />
					<Tab value="cargas" label="PRPA originales" />
					<Tab value="reglas" label="Reglas y desvíos" />
				</Tabs>
				{tab === "resumen" && <ResumenTab />}
				{tab === "revision" && <CasosTable base={BASE_REVISION} modoRevision />}
				{tab === "casos" && <CasosTable base={BASE_CASOS} />}
				{tab === "bluecorp" && <BlueCorpTab />}
				{tab === "cargas" && <CargasTab />}
				{tab === "reglas" && <ReglasTab />}
			</Stack>
		</MainCard>
	);
}
