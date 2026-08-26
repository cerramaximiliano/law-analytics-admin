// Diagrama de los dos workers de sincronización de pjn-mis-causas, data-driven:
// lee la config vigente del manager (scraping-manager-state → workers.update-sync)
// y refleja la hora de la pasada diaria, el paralelismo y si el alta por
// reconciliación está habilitada. Si la config no se puede leer, dibuja igual
// con etiquetas genéricas en vez de inventar valores.
//
// Reusa el motor FlowDiagram de causas/flujos, como el resto de los diagramas
// del ecosistema. Se puede embeber en el hub de flujos y en la pestaña de los
// workers sin duplicar la fuente.
import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildMisCausasWorkersSpec, MisCausasScheduleInfo } from "./misCausasWorkersFlowData";
import ScrapingManagerService from "api/scrapingManager";

const MisCausasWorkersFlow: React.FC = () => {
	const [schedule, setSchedule] = useState<MisCausasScheduleInfo | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		ScrapingManagerService.getConfig()
			.then((r: any) => {
				if (cancelled) return;
				const w = r?.data?.workers?.["update-sync"] ?? {};
				setSchedule({
					dailyRunAt: w.schedule?.mode === "daily" ? w.schedule?.dailyRunAt : undefined,
					maxInstances: w.scaling?.maxInstances,
					createFromReconciliation: w.processing?.createFromReconciliation,
				});
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true);
					setSchedule({});
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (schedule === null) {
		return <Skeleton variant="rectangular" width="100%" height={360} sx={{ borderRadius: 2 }} />;
	}

	const spec = buildMisCausasWorkersSpec(schedule);
	const reconOn = schedule.createFromReconciliation !== false;

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip
					size="small"
					label={schedule.dailyRunAt ? `update-sync diario ${schedule.dailyRunAt}` : "update-sync (horario en config)"}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				<Chip
					size="small"
					label={`alta por reconciliación: ${reconOn ? "ON" : "OFF"}`}
					color={reconOn ? "success" : "warning"}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				{failed && (
					<Chip size="small" variant="outlined" color="warning" label="no se pudo leer la config" sx={{ fontSize: "0.7rem" }} />
				)}
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				Los dos workers crean causas y carpetas, pero no bajan movimientos ni notifican: eso es de{" "}
				<code>private-causas-update</code>, que decide qué avisar según <code>firstSyncPolicy</code> (Notificaciones → Movimientos
				judiciales). El aviso de “carpetas nuevas” es otra cosa y lo controla <code>processing.notifyNewFolders</code> en el manager.
			</Typography>
		</Box>
	);
};

export default MisCausasWorkersFlow;
