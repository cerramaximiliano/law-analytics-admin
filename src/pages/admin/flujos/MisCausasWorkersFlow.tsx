// Diagrama de los dos workers de sincronización de pjn-mis-causas, data-driven:
// lee la config vigente del manager (scraping-manager-state → workers.update-sync)
// y la de los workers (causas-update-config.worker) y refleja la hora de la pasada
// diaria, el paralelismo, si el alta por reconciliación está habilitada y si el
// listado se lee por la API del SCW nuevo (y para cuántas credenciales). Si una
// config no se puede leer, dibuja igual con etiquetas genéricas en vez de inventar
// valores.
//
// Reusa el motor FlowDiagram de causas/flujos, como el resto de los diagramas
// del ecosistema. Se puede embeber en el hub de flujos y en la pestaña de los
// workers sin duplicar la fuente.
import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildMisCausasWorkersSpec, describirListadoApi, MisCausasScheduleInfo } from "./misCausasWorkersFlowData";
import ScrapingManagerService from "api/scrapingManager";
import { CausasUpdateService } from "api/causasUpdate";

const MisCausasWorkersFlow: React.FC = () => {
	const [schedule, setSchedule] = useState<MisCausasScheduleInfo | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		Promise.allSettled([ScrapingManagerService.getConfig(), CausasUpdateService.getConfig()]).then(([manager, workers]) => {
			if (cancelled) return;
			const info: MisCausasScheduleInfo = {};
			if (manager.status === "fulfilled") {
				const w = (manager.value as any)?.data?.workers?.["update-sync"] ?? {};
				info.dailyRunAt = w.schedule?.mode === "daily" ? w.schedule?.dailyRunAt : undefined;
				info.maxInstances = w.scaling?.maxInstances;
				info.createFromReconciliation = w.processing?.createFromReconciliation;
			}
			if (workers.status === "fulfilled") {
				const w = ((workers.value as any)?.data?.worker ?? {}) as Record<string, unknown>;
				const lista = Array.isArray(w.listadoApiScwBetaCredenciales) ? (w.listadoApiScwBetaCredenciales as unknown[]) : [];
				info.listadoApi = { global: w.listadoApiScwBeta === true, credenciales: lista.length };
				info.cargaInicialApi = w.cargaInicialApi === true;
			}
			setFailed(manager.status !== "fulfilled" || workers.status !== "fulfilled");
			setSchedule(info);
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
	const apiOn = schedule.listadoApi?.global === true;

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
				<Chip
					size="small"
					label={describirListadoApi(schedule.listadoApi)}
					color={schedule.listadoApi ? (apiOn ? "success" : "default") : "default"}
					variant={schedule.listadoApi ? "filled" : "outlined"}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				{schedule.cargaInicialApi !== undefined && (
					<Chip
						size="small"
						label={`carga inicial por API: ${schedule.cargaInicialApi ? "ON" : "OFF"}`}
						color={schedule.cargaInicialApi ? "success" : "default"}
						sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
					/>
				)}
				{failed && (
					<Chip size="small" variant="outlined" color="warning" label="no se pudo leer parte de la config" sx={{ fontSize: "0.7rem" }} />
				)}
			</Stack>
			<FlowDiagram spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				Los dos workers crean causas y carpetas, pero no bajan movimientos ni notifican: eso es de{" "}
				<code>private-causas-update</code>, que decide qué avisar según <code>firstSyncPolicy</code> (Notificaciones → Movimientos
				judiciales). El digest de altas y bajas de causas es otra cosa (<code>pjnCausaChanges</code>, barrido del manager). El listado por
				la API se enciende en Workers → Mis Causas updates y se acota por credencial en Credenciales PJN (columna “Listado API”, con la
				fuente y la evidencia JSON de cada corrida en el historial).
			</Typography>
		</Box>
	);
};

export default MisCausasWorkersFlow;
