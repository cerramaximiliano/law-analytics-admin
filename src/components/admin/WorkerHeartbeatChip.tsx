// Chip de salud de un worker por heartbeat: "VIVO" (verde) / "SIN HEARTBEAT" (rojo),
// con el último ciclo en el tooltip. Reemplaza las copias que repetía cada vista.
import { Chip, Tooltip } from "@mui/material";

interface WorkerHeartbeatChipProps {
	alive: boolean;
	/** Último ciclo registrado (ISO). Se muestra en el tooltip. */
	lastCycleAt?: string | null;
	/** Umbral en minutos que usa la API para decidir "vivo", para explicarlo en el tooltip. */
	umbralMin?: number;
}

const WorkerHeartbeatChip = ({ alive, lastCycleAt, umbralMin }: WorkerHeartbeatChipProps) => {
	const ultimo = lastCycleAt ? new Date(lastCycleAt).toLocaleString("es-AR") : "sin registro";
	const titulo = `Último ciclo: ${ultimo}${umbralMin ? ` · vivo = ciclo hace menos de ${umbralMin} min` : ""}`;
	return (
		<Tooltip title={titulo} arrow enterTouchDelay={0}>
			<Chip size="small" label={alive ? "VIVO" : "SIN HEARTBEAT"} color={alive ? "success" : "error"} />
		</Tooltip>
	);
};

export default WorkerHeartbeatChip;
