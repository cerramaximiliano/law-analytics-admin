// Flujo de plazos automáticos (base de usuarios), CONFIG-AWARE: lee el monitor de
// pjn-api contra Atlas (workers de worker_02, alcance, dry run, cola por estado y por
// fuente) y la config de la bandeja, y redibuja el diagrama con ese estado. Se embebe
// en el hub /admin/flujos?tab=plazos.

import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import CrossViewLinks from "components/admin/CrossViewLink";
import DiagramCard from "../causas/flujos/DiagramCard";
import { buildPlazosSpec, PlazosFlowLive } from "./plazosFlowData";
import { getMonitorDe } from "api/plazos";
import BandejaSyncConfigService from "api/bandejaSyncConfig";

const DEFAULTS: PlazosFlowLive = {
	calculoAlive: true,
	calculoEnabled: true,
	filtroUsuarios: null,
	entregaAlive: true,
	entregaEnabled: true,
	dryRun: true,
	userFilter: { isTestAccount: true },
	bandejaEnabled: true,
	cola: {},
	porFuente: {},
	sinDatos: true,
};

const PlazosFlow: React.FC = () => {
	const [live, setLive] = useState<PlazosFlowLive | null>(null);

	useEffect(() => {
		let cancelled = false;
		Promise.allSettled([getMonitorDe("usuarios"), BandejaSyncConfigService.getConfig()]).then(([mon, band]) => {
			if (cancelled) return;
			if (mon.status !== "fulfilled") {
				setLive(DEFAULTS);
				return;
			}
			const m = mon.value;
			const f = m.workers.foldersWorker;
			const bandejaData: any = band.status === "fulfilled" ? (band.value as any)?.data ?? band.value : null;
			setLive({
				calculoAlive: m.workers.plazosWorker.alive,
				calculoEnabled: m.workers.plazosWorker.enabled,
				filtroUsuarios: m.workers.plazosWorker.filtroUsuarios ?? null,
				entregaAlive: f ? f.alive : false,
				entregaEnabled: f ? f.enabled : false,
				dryRun: f ? f.dryRun : true,
				userFilter: f?.userFilter ?? null,
				bandejaEnabled: bandejaData ? bandejaData.enabled !== false : true,
				cola: m.cola || {},
				porFuente: m.porFuente || {},
				sinDatos: false,
			});
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (live === null) {
		return <Skeleton variant="rectangular" width="100%" height={360} sx={{ borderRadius: 2 }} />;
	}

	const spec = buildPlazosSpec(live);
	const alcanceTodos = live.filtroUsuarios !== null && !Object.keys(live.filtroUsuarios).length;

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
				{live.sinDatos ? (
					<Chip size="small" color="warning" label="no se pudo leer el estado — diagrama con valores por defecto" />
				) : (
					<>
						<Chip
							size="small"
							color={alcanceTodos ? "success" : "warning"}
							variant="outlined"
							label={alcanceTodos ? "cálculo: todas las causas" : "cálculo: solo cuentas de prueba"}
						/>
						<Chip size="small" color={live.dryRun ? "warning" : "success"} label={live.dryRun ? "entrega: DRY RUN" : "entrega: real"} />
						{!live.calculoAlive && <Chip size="small" color="error" label="plazos-worker-usuarios sin heartbeat" />}
						{!live.entregaAlive && <Chip size="small" color="error" label="plazos-folders-worker sin heartbeat" />}
						{!live.bandejaEnabled && <Chip size="small" color="warning" label="bandeja apagada" />}
					</>
				)}
				<Typography variant="caption" color="text.secondary">
					El diagrama refleja el estado de la base de usuarios (Atlas) al abrir la pestaña.
				</Typography>
			</Stack>
			<DiagramCard spec={spec} />
			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={1.5}
				alignItems={{ xs: "flex-start", sm: "center" }}
				justifyContent="space-between"
				sx={{ mt: 1.5 }}
			>
				<Typography variant="caption" color="text.secondary" sx={{ maxWidth: 720 }}>
					Las cédulas, sus vencimientos, el monitoreo y la revisión legal están en Plazos procesales (base “Usuarios”); la configuración y
					el estado del worker, en Workers → Plazos. Las etapas (prueba → cálculo para todos → entrega para todos) se abren por
					configuración.
				</Typography>
				<CrossViewLinks
					current="flujo"
					to={{ datos: "/admin/causas/plazos?tab=monitoreo&base=usuarios", worker: "/admin/workers/plazos" }}
					tooltips={{
						datos: "Cédulas, vencimientos, monitoreo y revisión legal (base usuarios)",
						worker: "Configuración y estado del plazos-worker",
					}}
				/>
			</Stack>
		</Box>
	);
};

export default PlazosFlow;
