// Diagrama del circuito "Presentaciones del letrado" (pjn-bandeja-sync + pjn-actos-letrado).
// Lee el estado en vivo (admin-api /actos-letrado/estado) para los chips de arriba y para pintar
// en rojo los procesos si la lectura de actos está apagada; si no responde, dibuja igual.
// Se embebe en el hub de flujos y en la pestaña Flujo del worker (causas/workers → Presentaciones).
import React, { useEffect, useState } from "react";
import { Box, Chip, Skeleton, Stack, Typography } from "@mui/material";
import { LiveDiagramCard } from "./live/LiveFlowDiagram";
import { buildPresentacionesLetradoSpec } from "./presentacionesLetradoFlowData";
import ActosLetradoService, { EstadoActosLetrado } from "api/actosLetrado";

const hace = (iso?: string | null) => {
	if (!iso) return "sin registro";
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 60) return `hace ${min} min`;
	const h = Math.round(min / 60);
	return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};

const PresentacionesLetradoFlow: React.FC = () => {
	const [estado, setEstado] = useState<EstadoActosLetrado | null>(null);
	const [cargando, setCargando] = useState(true);

	useEffect(() => {
		let cancelado = false;
		ActosLetradoService.getEstado(1)
			.then((d) => !cancelado && setEstado(d))
			.catch(() => {})
			.finally(() => !cancelado && setCargando(false));
		return () => {
			cancelado = true;
		};
	}, []);

	if (cargando) return <Skeleton variant="rectangular" width="100%" height={420} sx={{ borderRadius: 2 }} />;

	const spec = buildPresentacionesLetradoSpec({
		lecturaActos: estado?.config.lecturaActos,
		bandejaSync: estado?.config.bandejaSync,
		pendientes: estado?.pendientes.total,
		credenciales: estado?.cobertura.credenciales,
	});
	const mono = { fontFamily: "monospace", fontSize: "0.7rem" } as const;

	return (
		<Box>
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
				{estado ? (
					<>
						<Chip
							size="small"
							label={estado.config.lecturaActos ? "lectura de actos: ON" : "lectura de actos: OFF"}
							color={estado.config.lecturaActos ? "success" : "error"}
							sx={mono}
						/>
						<Chip size="small" label={`última lectura ${hace(estado.ultima.lectura?.fin)}`} sx={mono} />
						<Chip size="small" label={`último recálculo ${hace(estado.ultima.recalculo?.fin)}`} sx={mono} />
						<Chip size="small" label={`${estado.pendientes.total.toLocaleString("es-AR")} escritos sin movimiento`} sx={mono} />
					</>
				) : (
					<Chip size="small" variant="outlined" color="warning" label="no se pudo leer el estado" sx={{ fontSize: "0.7rem" }} />
				)}
			</Stack>
			<LiveDiagramCard spec={spec} />
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
				Fuente: <code>pjn-mis-causas/docs/plan-actividad-letrados.md</code>, <code>src/services/actos-letrado.js</code> y{" "}
				<code>src/tasks/actos-letrado-worker.js</code>. Interruptor: <code>bandeja-sync-config.actosLetrado</code> (Mis Causas · Scraping → Bandeja).
			</Typography>
		</Box>
	);
};

export default PresentacionesLetradoFlow;
