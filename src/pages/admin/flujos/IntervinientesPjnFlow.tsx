// Diagrama del pipeline de intervinientes PJN, data-driven: lee la config y el
// estado vigentes de pjn-extra-info (configuracion-extra-info, vía pjn-api) y
// refleja el cron, los fueros que cubre (processing_mode), la relectura y si
// está habilitado o corriendo. El worker de pjn-mis-causas no expone config por
// API, así que su rama es descriptiva (valores de pm2 + doc del repo).
// Si la config no se puede leer, dibuja igual con etiquetas genéricas.
//
// Reusa DiagramCard (navegación por pasos) sobre el motor FlowDiagram de
// causas/flujos. Se embebe en el hub de flujos y en la pestaña del worker
// (causas/workers → Intervinientes → Flujo) sin duplicar la fuente.
import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import DiagramCard from "../causas/flujos/DiagramCard";
import { buildIntervinientesPjnSpec, describirCron, IntervinientesPjnInfo } from "./intervinientesPjnFlowData";
import ExtraInfoConfigService from "api/extraInfoConfig";

const IntervinientesPjnFlow: React.FC = () => {
	const [info, setInfo] = useState<IntervinientesPjnInfo | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.all([ExtraInfoConfigService.getConfig(), ExtraInfoConfigService.getStatus()])
			.then(([cfgRes, stRes]) => {
				if (cancelled) return;
				const cfg = cfgRes?.data;
				const st = stRes?.data;
				setInfo({
					extraInfoCron: cfg?.schedule?.cronExpression,
					processingMode: cfg?.processing_mode,
					reextractAfterDays: cfg?.eligibility?.reextractAfterDays,
					extraInfoEnabled: cfg?.enabled,
					extraInfoRunning: st?.isRunning,
				});
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true);
					setInfo({});
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (info === null) {
		return <Skeleton variant="rectangular" width="100%" height={420} sx={{ borderRadius: 2 }} />;
	}

	const spec = buildIntervinientesPjnSpec(info);
	const mono = { fontFamily: "monospace", fontSize: "0.7rem" } as const;

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip
					size="small"
					label={`pjn-extra-info ${describirCron(info.extraInfoCron)}`}
					color={info.extraInfoEnabled === false ? "error" : "default"}
					sx={mono}
				/>
				{info.processingMode && <Chip size="small" label={`processing_mode: ${info.processingMode}`} sx={mono} />}
				<Chip
					size="small"
					label={
						info.reextractAfterDays && info.reextractAfterDays > 0 ? `relectura: ${info.reextractAfterDays} días` : "relectura: desactivada"
					}
					color={info.reextractAfterDays && info.reextractAfterDays > 0 ? "success" : "warning"}
					sx={mono}
				/>
				{info.extraInfoRunning && <Chip size="small" label="ciclo en curso" color="info" sx={mono} />}
				<Chip size="small" label="pjn-mis-causas-intervinientes diario 05:00 ART" sx={mono} />
				{failed && (
					<Chip
						size="small"
						variant="outlined"
						color="warning"
						label="no se pudo leer la config de extra-info"
						sx={{ fontSize: "0.7rem" }}
					/>
				)}
			</Stack>
			<DiagramCard spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				Los dos workers solo leen partes y letrados: no bajan movimientos ni notifican. La preferencia que habilita los contactos es{" "}
				<code>preferences.pjn.syncContactsFromIntervinientes</code> (Perfil → Integraciones PJN del usuario); sin ella la carpeta igual
				muestra las partes. Fuente: <code>pjn-workers/docs/SINCRONIZACION_INTERVINIENTES_CONTACTOS.md</code> §0 y{" "}
				<code>pjn-mis-causas/docs/intervinientes-worker.md</code>.
			</Typography>
		</Box>
	);
};

export default IntervinientesPjnFlow;
