// Diagrama del worker CIJur. Reusa el motor FlowDiagram de causas/flujos, el
// mismo que SCBA, sentencias y SAIJ, así el lenguaje visual es consistente.
//
// Se embebe en el hub /admin/flujos y en el tab Flujo de la vista del worker,
// sin duplicar: un solo componente, una sola fuente.

import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildCijurWorkersSpec } from "./cijurWorkersFlowData";

const CijurWorkersFlow: React.FC = () => {
	const spec = buildCijurWorkersSpec();

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip size="small" label="curado · ~1 fallo/mes" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
				<Typography variant="caption" color="text.secondary">
					97 fallos en ocho años: el valor está en el criterio editorial de la Procuración y en que cada entrada trae el PDF
					completo, no en el volumen.
				</Typography>
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				El campo <code>voces</code> es redacción editorial de la Procuración y no se republica, igual que los sumarios de SAIJ. Lo
				publicable es el PDF —sentencia pública— y los resúmenes propios que se generen sobre su texto.
			</Typography>
		</Box>
	);
};

export default CijurWorkersFlow;
