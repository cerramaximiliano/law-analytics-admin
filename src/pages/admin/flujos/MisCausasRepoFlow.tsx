// Diagrama general del repositorio pjn-mis-causas. A diferencia del de los dos
// workers de sync, este no lee config: es el mapa estructural del repo, y su
// forma solo cambia si se agrega o saca un proceso.
import React from "react";
import { Box, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildMisCausasRepoSpec } from "./misCausasRepoFlowData";

const MisCausasRepoFlow: React.FC = () => (
	<Box>
		<FlowDiagram spec={buildMisCausasRepoSpec()} />
		<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
			Los workers corren con <code>autorestart:false</code>: su ciclo de vida lo controla el manager, no PM2. Los cuatro de vigilancia son la
			excepción — tienen <code>cron_restart</code> propio y corren aunque el manager esté caído, que es cuando más falta hacen.
		</Typography>
	</Box>
);

export default MisCausasRepoFlow;
