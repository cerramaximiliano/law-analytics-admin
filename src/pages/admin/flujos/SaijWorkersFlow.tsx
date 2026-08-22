// Diagrama de los workers SAIJ. Reusa el motor FlowDiagram de causas/flujos
// (specs como data → SVG), así el lenguaje visual es el mismo que el resto de
// los diagramas del ecosistema.
//
// Se embebe en dos lugares —el hub /admin/flujos y el tab Flujo de la vista de
// workers SAIJ— sin duplicar: un solo componente, una sola fuente.
//
// El diagrama es estructural, no de estado en vivo: qué canal alimenta qué. Los
// números y el avance de cada worker están en el tab Estado (ProgresoPanel).

import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildSaijWorkersSpec } from "./saijWorkersFlowData";

const SaijWorkersFlow: React.FC = () => {
	const spec = buildSaijWorkersSpec();

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip size="small" label="4 canales · 1 código" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
				<Typography variant="caption" color="text.secondary">
					Los cuatro workers ejecutan el mismo <code>worker.js</code> y se diferencian solo por su configuración en Mongo. La
					bifurcación real es nacional vs. el resto: solo el nacional alimenta el pipeline PJN y las campañas a usuarios.
				</Typography>
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				El rate limit de SAIJ es por IP y lo comparten los cuatro workers, pero el limitador de velocidad es una instancia por
				proceso: ninguno ve el tráfico agregado. El ritmo sumado y los rechazos 403 se siguen en el tab Estado.
			</Typography>
		</Box>
	);
};

export default SaijWorkersFlow;
