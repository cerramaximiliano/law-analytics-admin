// Diagrama de los procesos del hub. Como el del repo pjn-mis-causas, no lee
// config: es el mapa estructural y solo cambia si se agrega o saca un proceso.
import React from "react";
import { Box, Typography } from "@mui/material";
import LiveFlowDiagram from "./live/LiveFlowDiagram";
import { buildHubProcesosSpec } from "./hubProcesosFlowData";

const SPEC = buildHubProcesosSpec();

const HubProcesosFlow: React.FC = () => (
	<Box>
		<LiveFlowDiagram spec={SPEC} />
		<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
			Los cinco crons PM2 corren con <code>autorestart:false</code> y <code>cron_restart</code>: figuran stopped entre corridas y
			cross-monitor solo alerta si desaparecen de PM2. Los crons que corren dentro de las dos APIs no son procesos aparte; su salud se ve en
			Estado del servidor. Las demás APIs del box (pjn-api, eje-api, las de IOL, la-mcp-server, Hydra) tienen su propio flujo o figuran en
			Infraestructura.
		</Typography>
	</Box>
);

export default HubProcesosFlow;
