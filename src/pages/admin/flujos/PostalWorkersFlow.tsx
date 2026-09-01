// Diagrama del pipeline del worker postal (Correo Argentino), CONFIG-AWARE:
// lee la configuración viva del scraper (scraper-config vía admin-api) y
// refleja en los nodos el intervalo de checks, el horario de scraping y el
// estado del detector stale-alert — si el detector está apagado, la arista
// del admin-alert se dibuja en rojo.
//
// Reusa el motor FlowDiagram de causas/flujos (specs como data → SVG), el
// mismo lenguaje visual que el resto de los diagramas del ecosistema. Se
// embebe en dos lugares (hub /admin/flujos y tab Flujo del worker postal)
// sin duplicar: un solo componente, una sola fuente.

import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import CrossViewPair from "components/admin/CrossViewLink";
import FlowDiagram from "../causas/flujos/FlowDiagram";
import { buildPostalWorkersSpec, PostalFlowLiveConfig } from "./postalWorkersFlowData";
import ScraperService from "api/scraperService";

const DEFAULTS: PostalFlowLiveConfig = {
	checkIntervalHours: 3,
	scheduleEnabled: false,
	workingHoursStart: 8,
	workingHoursEnd: 20,
	staleAlertEnabled: true,
	staleAfterHours: 24,
};

const PostalWorkersFlow: React.FC = () => {
	const [cfg, setCfg] = useState<PostalFlowLiveConfig | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		ScraperService.getConfig()
			.then((r) => {
				if (cancelled) return;
				const c = r.data;
				setCfg({
					checkIntervalHours: c.scraping?.checkIntervalHours ?? DEFAULTS.checkIntervalHours,
					// `enabled` ausente ⇒ el manager ignora la ventana y corre 24/7.
					scheduleEnabled: c.scraping?.schedule?.enabled === true,
					workingHoursStart: c.scraping?.schedule?.workingHoursStart ?? DEFAULTS.workingHoursStart,
					workingHoursEnd: c.scraping?.schedule?.workingHoursEnd ?? DEFAULTS.workingHoursEnd,
					staleAlertEnabled: c.alerts?.staleTracking?.enabled !== false,
					staleAfterHours: c.alerts?.staleTracking?.staleAfterHours ?? DEFAULTS.staleAfterHours,
				});
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true);
					setCfg(DEFAULTS);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (cfg === null) {
		return <Skeleton variant="rectangular" width="100%" height={320} sx={{ borderRadius: 2 }} />;
	}

	const spec = buildPostalWorkersSpec(cfg);

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				<Chip
					size="small"
					label={`checks cada ${cfg.checkIntervalHours}h · ${
						cfg.scheduleEnabled ? `${cfg.workingHoursStart}-${cfg.workingHoursEnd} ART lun-vie` : "24/7"
					}${failed ? " (no se pudo leer la config — defaults)" : ""}`}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				<Chip
					size="small"
					label={cfg.staleAlertEnabled ? `stale-alert: >${cfg.staleAfterHours}h sin consulta` : "stale-alert APAGADO"}
					color={cfg.staleAlertEnabled ? "default" : "error"}
					sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
				/>
				<Typography variant="caption" color="text.secondary">
					El diagrama refleja la configuración en vivo (tab Configuración de este worker) y se redibuja al refrescar.
				</Typography>
			</Stack>
			<FlowDiagram spec={spec} />
			<Stack
				direction={{ xs: "column", sm: "row" }}
				spacing={1.5}
				alignItems={{ xs: "flex-start", sm: "center" }}
				justifyContent="space-between"
				sx={{ mt: 1 }}
			>
				<Typography variant="caption" color="text.secondary" sx={{ maxWidth: 720 }}>
					Los seguimientos y su historial completo (estados, screenshots, auditoría de cierres, salud del pipeline) se operan en la vista de
					datos postales. El envío de emails y sus destinatarios se administran en Notificaciones → Seguimiento postal.
				</Typography>
				<CrossViewPair
					side="worker"
					to="/admin/postal-tracking"
					tooltip="Ir a seguimientos, historial, screenshots y salud del pipeline postal"
				/>
			</Stack>
		</Box>
	);
};

export default PostalWorkersFlow;
