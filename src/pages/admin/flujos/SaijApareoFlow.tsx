// Diagrama del apareo SAIJ ↔ causas PJN y su conciliación. Reusa el motor
// FlowDiagram de causas/flujos, como el resto de los diagramas del ecosistema.
//
// Complementa al de Workers SAIJ: aquél muestra los canales de captura; éste
// hace zoom en lo que pasa DESPUÉS con un fallo nacional — el linker con sus
// gates, la herencia de identidad hacia SentenciaCapturada, y el circuito de
// conciliación que deshace apareos equivocados.

import React from "react";
import { Box, Chip, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildSaijApareoSpec } from "./saijApareoFlowData";

const SaijApareoFlow: React.FC = () => {
	const spec = buildSaijApareoSpec();

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip size="small" label="apareo + conciliación" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }} />
				<Typography variant="caption" color="text.secondary">
					La clave del diagrama: la SentenciaCapturada toma el <strong>texto</strong> del fallo pero la{" "}
					<strong>identidad</strong> (carátula, expediente, causaId) de la causa apareada. Un apareo malo contamina hasta la
					metadata del vector — y desvincular lo revierte entero, embedding incluido.
				</Typography>
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				Al desvincular, la carátula de la SC no "vuelve" de un backup: se reconstruye desde el propio fallo (titulo, o actor c/
				demandado s/ sobre). El estado previo sí queda respaldado en saij-desvinculacion-backup por si hay que deshacer la
				desvinculación misma.
			</Typography>
		</Box>
	);
};

export default SaijApareoFlow;
