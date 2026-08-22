// Diagrama del pipeline de workers SCBA, MODE-AWARE: consulta el
// updatePolicy.mode vigente (configuracion-scba vía mev-api) y redibuja la
// partición del update en vivo — en 'unified' el update principal cubre
// también las archivadas y el worker archived aparece ocioso, sin aristas.
//
// Reusa el motor FlowDiagram de causas/flujos (specs como data → SVG), así el
// lenguaje visual es el mismo que el resto de los diagramas del ecosistema.
// Se embebe en dos lugares (hub /admin/flujos y tab Info del SCBA manager)
// sin duplicar: un solo componente, una sola fuente.

import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildScbaWorkersSpec } from "./scbaWorkersFlowData";
import ScbaManagerService, { ScbaUpdatePolicyMode } from "api/scbaManager";

const ScbaWorkersFlow: React.FC = () => {
	const [mode, setMode] = useState<ScbaUpdatePolicyMode | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		ScbaManagerService.getSettings()
			.then((r) => {
				if (!cancelled) setMode(r.data?.updatePolicy?.mode ?? "split");
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true);
					setMode("split");
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (mode === null) {
		return <Skeleton variant="rectangular" width="100%" height={320} sx={{ borderRadius: 2 }} />;
	}

	const unified = mode === "unified";
	const spec = buildScbaWorkersSpec(mode);

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip
					size="small"
					label={`updatePolicy: ${mode}${failed ? " (no se pudo leer — mostrando split)" : ""}`}
					color={unified ? "info" : "default"}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				<Typography variant="caption" color="text.secondary">
					{unified
						? "El update principal cubre TODAS las causas con folder (archivadas incluidas) en horario laboral; el worker archived queda ocioso."
						: "Las causas con todos sus folders archivados van al worker diario de 4 ART; el resto al update frecuente."}{" "}
					El modo se cambia en el SCBA manager (Configuración → Política de update) y el diagrama se redibuja al refrescar.
				</Typography>
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				La política de notificación (<code>notifyArchivedFolders</code>, en Notificaciones → Movimientos judiciales) se evalúa por causa
				según el estado real de sus folders, sin importar qué worker la procese. Causas sin folder no se procesan en ningún modo.
			</Typography>
		</Box>
	);
};

export default ScbaWorkersFlow;
