import { useEffect, useState } from "react";
import { Chip, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { getPlazosBeta, PlazosBeta } from "api/plazos";

// Seguimiento de la beta de vencimientos automáticos (F5): cuántos usuarios la activaron, cuántas
// cédulas de sus causas se detectaron, qué se les propuso y qué dijeron. Datos de la base "usuarios".
const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)} %`);
const ACCION: Record<string, string> = {
	evento: "En calendario",
	aviso_otra_parte: "Cédula a otra parte",
	sugerencia_sin_confirmar: "Sin CUIT / sin destinatario",
};

export default function BetaPanel() {
	const [d, setD] = useState<PlazosBeta | null>(null);
	const [error, setError] = useState(false);
	useEffect(() => {
		getPlazosBeta()
			.then(setD)
			.catch(() => setError(true));
	}, []);
	if (error)
		return (
			<Typography variant="body2" color="error">
				No se pudieron leer las métricas de la beta.
			</Typography>
		);
	if (!d) return <Skeleton variant="rounded" height={90} />;
	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle1" sx={{ mb: 1 }}>
				Beta de vencimientos automáticos
			</Typography>
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
				<Chip size="small" label={`${d.usuarios.activos} usuarios activos (${d.usuarios.conCuit} con CUIT)`} />
				<Chip size="small" variant="outlined" label={`${d.cedulas.total} cédulas detectadas (${d.cedulas.ultimos7d} en 7 días)`} />
				{Object.entries(d.cedulas.porStatus).map(([k, v]) => (
					<Chip key={k} size="small" variant="outlined" label={`${k}: ${v}`} />
				))}
				<Chip
					size="small"
					variant="outlined"
					label={`${d.sugerencias.eventos} en calendario (${d.sugerencias.eventosArchivados} descartados)`}
				/>
				{Object.entries(d.sugerencias.porAccion).map(([k, v]) => (
					<Chip key={k} size="small" variant="outlined" label={`${ACCION[k] || k}: ${v}`} />
				))}
				<Chip
					size="small"
					color={
						d.feedback.precision == null
							? "default"
							: d.feedback.precision >= 0.95
							? "success"
							: d.feedback.precision >= 0.8
							? "warning"
							: "error"
					}
					label={`Feedback: ${d.feedback.correctos} correctos / ${d.feedback.incorrectos} incorrectos · ${pct(d.feedback.precision)}`}
				/>
			</Stack>
			{d.feedback.negativos.length > 0 && (
				<>
					<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
						Últimos marcados como incorrectos
					</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Fuero</TableCell>
								<TableCell>Regla / fuente</TableCell>
								<TableCell>Vencía</TableCell>
								<TableCell>Comentario</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{d.feedback.negativos.map((x) => (
								<TableRow key={`${x._id}-${x.at}`}>
									<TableCell>{String(x.at).slice(0, 10)}</TableCell>
									<TableCell>{x.fuero}</TableCell>
									<TableCell>{x.regla || x.fuente || "—"}</TableCell>
									<TableCell>{x.vencimiento || "—"}</TableCell>
									<TableCell sx={{ maxWidth: 360 }}>{x.comentario || "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</>
			)}
		</Paper>
	);
}
