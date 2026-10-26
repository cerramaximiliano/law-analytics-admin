import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";

// material-ui
import { Box, Button, Chip, Divider, Popover, Stack, Tooltip, Typography } from "@mui/material";

// project-imports
import InfrastructureService, { BoxState, InfraBox, getBoxState } from "api/infrastructure";
import { LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";

const REFRESH_MS = 60 * 1000;
const STATE_COLOR: Record<BoxState, string> = { up: LIVE_GREEN, degraded: STALE_AMBER, down: "#EF4444", unknown: "#94A3B8" };
const STATE_LABEL: Record<BoxState, string> = {
	up: "online",
	degraded: "online, agente sin respuesta",
	down: "offline",
	unknown: "sin dato",
};

const lastSeenLabel = (iso: string | null | undefined) => {
	if (!iso) return null;
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 1) return "hace instantes";
	if (min < 60) return `hace ${min} min`;
	if (min < 60 * 24) return `hace ${Math.round(min / 60)} h`;
	return `hace ${Math.round(min / 1440)} d`;
};

// ==============================|| HEADER - ESTADO DE SERVIDORES ||============================== //

const ServerStatus = () => {
	const [boxes, setBoxes] = useState<InfraBox[] | null>(null);
	const [failed, setFailed] = useState(false);
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	const load = useCallback(async () => {
		try {
			const res = await InfrastructureService.getInventory();
			// Los boxes sin producción no cuentan: estar apagados es lo esperado.
			setBoxes(res.boxes.filter((b) => !b.retired));
			setFailed(false);
		} catch (error) {
			console.error("Error al cargar el estado de servidores:", error);
			setFailed(true);
		}
	}, []);

	useEffect(() => {
		load();
		const id = setInterval(load, REFRESH_MS);
		return () => clearInterval(id);
	}, [load]);

	const states = (boxes || []).map((b) => ({ box: b, state: getBoxState(b) }));
	const down = states.filter((s) => s.state === "down").length;
	const degraded = states.filter((s) => s.state === "degraded").length;
	const up = states.filter((s) => s.state === "up").length;
	const known = states.filter((s) => s.state !== "unknown").length;
	const overall: BoxState = failed || !boxes ? "unknown" : down > 0 ? "down" : degraded > 0 ? "degraded" : "up";

	return (
		<>
			<Tooltip title={failed ? "No se pudo leer el estado de los servidores" : "Estado de los servidores"}>
				<Chip
					size="small"
					variant="outlined"
					onClick={(e) => setAnchor(e.currentTarget)}
					icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATE_COLOR[overall], ml: "8px !important" }} />}
					label={failed || !boxes ? "Servidores" : `${up + degraded}/${known} online`}
					sx={{ mr: 1, cursor: "pointer" }}
				/>
			</Tooltip>
			<Popover
				open={Boolean(anchor)}
				anchorEl={anchor}
				onClose={() => setAnchor(null)}
				anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
				transformOrigin={{ vertical: "top", horizontal: "right" }}
			>
				<Stack spacing={1} sx={{ p: 2, minWidth: 300 }}>
					<Typography variant="subtitle1">Servidores (Tailscale)</Typography>
					<Divider />
					{states.map(({ box, state }) => (
						<Stack key={box.key} direction="row" spacing={1} alignItems="center">
							<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: STATE_COLOR[state], flexShrink: 0 }} />
							<Typography variant="body2" sx={{ fontFamily: "monospace", flexGrow: 1 }}>
								{box.name}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								{state === "down" && lastSeenLabel(box.net?.lastSeen)
									? `offline · ${lastSeenLabel(box.net?.lastSeen)}`
									: STATE_LABEL[state]}
							</Typography>
						</Stack>
					))}
					<Divider />
					<Button size="small" component={RouterLink} to="/admin/infrastructure" onClick={() => setAnchor(null)}>
						Ver infraestructura
					</Button>
				</Stack>
			</Popover>
		</>
	);
};

export default ServerStatus;
