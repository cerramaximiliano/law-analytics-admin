import React from "react";
import { Chip, Tooltip } from "@mui/material";
import { JourneyEnrollmentPaused } from "api/journey";
import { describeEnrollmentPaused } from "utils/campaignCoordination";

// Chip "Ingresos frenados" para las campañas del recorrido. Si el servicio no manda el campo, no dibuja nada.
const DARK = "#1f1f1f"; // chips ocres siempre con letra oscura

const EnrollmentPausedChip: React.FC<{ paused?: JourneyEnrollmentPaused | null }> = ({ paused }) => {
	if (!paused || !paused.reason) return null;
	const desde = paused.since ? new Date(paused.since).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
	return (
		<Tooltip title={`desde ${desde}: ${describeEnrollmentPaused(paused)}`} arrow>
			<Chip size="small" label="Ingresos frenados" sx={{ bgcolor: "#fdba74", color: DARK, fontWeight: 600 }} />
		</Tooltip>
	);
};

export default EnrollmentPausedChip;
