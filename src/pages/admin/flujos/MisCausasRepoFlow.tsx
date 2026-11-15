// Diagrama general del repositorio pjn-mis-causas. A diferencia del de los dos
// workers de sync, este no lee config: es el mapa estructural del repo, y su
// forma solo cambia si se agrega o saca un proceso.
import React from "react";
import { Box, Typography } from "@mui/material";
import LiveFlowDiagram from "./live/LiveFlowDiagram";
import { misCausasLiveMetrics } from "./misCausasLiveMetrics";
import { buildMisCausasRepoSpec } from "./misCausasRepoFlowData";

// El spec es estático: se arma una vez para que el hook del modo en vivo no lo vea cambiar en cada render.
const SPEC = buildMisCausasRepoSpec();

const MisCausasRepoFlow: React.FC = () => (
	<Box>
		<LiveFlowDiagram spec={SPEC} metrics={misCausasLiveMetrics} />
		<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
			Los workers del ciclo de la credencial corren con <code>autorestart:false</code>: su ciclo de vida lo controla el manager, no PM2. Los
			seis de vigilancia, pasada-nocturna, intervinientes, actos-letrado, huecos-backfill y bandeja-sync tienen <code>cron_restart</code>{" "}
			propio y los tres de PDFs y expediente-export son always-on: corren aunque el manager esté caído, que es cuando más falta hacen. Los
			flags de la API del SCW nuevo se operan en Workers → Mis Causas updates y por credencial en Credenciales PJN.
		</Typography>
	</Box>
);

export default MisCausasRepoFlow;
