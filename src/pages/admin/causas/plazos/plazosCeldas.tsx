import { Chip, Stack, Tooltip } from "@mui/material";
import type { PlazoNotificacion } from "api/plazos";

// Celdas compartidas por Notificaciones y Vencimientos (base de usuarios).

const WORKER: Record<string, string> = { "app-update": "app-update", "mis-causas": "Mis Causas", bandeja: "bandeja" };
const TEXTO: Record<string, string> = { resolucion: "resolución", cuerpo_cedula: "cuerpo de la cédula", cedula: "cédula entera" };

/** Quién creó el registro, si pasó por la bandeja, de qué texto salió el plazo y su fuente. */
export function FuenteChips({ r }: { r: PlazoNotificacion }) {
	const worker = r.fuente === "bandeja" ? "bandeja" : r.source?.worker;
	const porBandeja = !!r.bandeja && worker !== "bandeja";
	const texto = r.extraccion?.textoFuente;
	return (
		<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
			{worker && <Chip size="small" variant="outlined" label={WORKER[worker] || worker} />}
			{porBandeja && (
				<Tooltip title="La creó otro worker y la bandeja del PJN la reconcilió">
					<Chip size="small" color="info" variant="outlined" label="bandeja" />
				</Tooltip>
			)}
			{texto && (
				<Tooltip title={`El plazo se leyó de: ${TEXTO[texto] || texto}`}>
					<Chip size="small" variant="outlined" label={TEXTO[texto] || texto} />
				</Tooltip>
			)}
			{r.plazo?.fuente && (
				<Chip
					size="small"
					color={r.plazo.fuente === "texto" ? "primary" : "default"}
					variant="outlined"
					label={r.plazo.fuente === "texto" ? "plazo del texto" : "plazo por norma"}
				/>
			)}
		</Stack>
	);
}

/** Correos de los usuarios de la causa: el primero y «+N» con el resto en el tooltip. */
export function UsuariosChips({ r }: { r: PlazoNotificacion }) {
	const us = r.usuarios || [];
	if (!us.length) return <span>—</span>;
	const nombre = (u: { userId: string; email: string | null }) => u.email || u.userId.slice(-6);
	return (
		<Stack direction="row" spacing={0.5} alignItems="center">
			<Tooltip title={us[0].userId}>
				<Chip size="small" label={nombre(us[0])} sx={{ maxWidth: 200 }} />
			</Tooltip>
			{us.length > 1 && (
				<Tooltip title={us.slice(1).map(nombre).join(", ")}>
					<Chip size="small" variant="outlined" label={`+${us.length - 1}`} />
				</Tooltip>
			)}
		</Stack>
	);
}
