import { useState } from "react";
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { Global, Lock1 } from "iconsax-react";

import DualWritePublicFlow from "./DualWritePublicFlow";
import DualWriteMisCausasFlow from "./DualWriteMisCausasFlow";
import "./flow-diagrams.css";

// Segmento de documentación de los workers PJN: diagramas de arquitectura
// (flujo dual-write de movimientos) en vez de más tabs de configuración.

type FlowKey = "public" | "mis-causas";

const DocumentationTab = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [flow, setFlow] = useState<FlowKey>("public");

	return (
		<Box sx={{ p: { xs: 2, sm: 3 } }}>
			<Stack spacing={3}>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					spacing={2}
					alignItems={{ xs: "flex-start", sm: "center" }}
					justifyContent="space-between"
				>
					<Box>
						<Typography variant="h5">Documentación — flujo de movimientos</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
							Cómo los workers PJN escriben cada movimiento en el archivo documental (<code>pjn-movements</code>) y en la cola de avisos (
							<code>judicialmovements</code>)
						</Typography>
					</Box>
					<ToggleButtonGroup
						exclusive
						size="small"
						value={flow}
						onChange={(_e, value: FlowKey | null) => {
							if (value) setFlow(value);
						}}
						sx={{ flexShrink: 0, "& .MuiToggleButton-root": { textTransform: "none", px: 2, gap: 0.75 } }}
					>
						<ToggleButton value="public">
							<Global size={16} /> Workers públicos
						</ToggleButton>
						<ToggleButton value="mis-causas">
							<Lock1 size={16} /> Mis Causas (SSO)
						</ToggleButton>
					</ToggleButtonGroup>
				</Stack>

				<div className={`flowdoc${isDark ? " flowdoc--dark" : ""}`}>
					{flow === "public" ? <DualWritePublicFlow /> : <DualWriteMisCausasFlow />}
				</div>
			</Stack>
		</Box>
	);
};

export default DocumentationTab;
