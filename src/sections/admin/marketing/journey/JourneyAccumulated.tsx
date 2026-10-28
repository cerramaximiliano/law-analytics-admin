import React from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { JourneyCategoryTotals } from "api/journey";
import { reasonLabel } from "../campaignReasons";
import { fmt } from "./journeyFormat";

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

const Chips: React.FC<{ data: Record<string, number> }> = ({ data }) => (
	<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
		{Object.entries(data)
			.sort(([, a], [, b]) => b - a)
			.map(([k, n]) => (
				<Tooltip key={k} title={k}>
					<Chip size="small" variant="outlined" label={`${reasonLabel(k)}: ${fmt(n)}`} />
				</Tooltip>
			))}
	</Box>
);

// Acumulado histórico de la categoría (todas sus campañas, también las desactivadas) y activos por paso.
const JourneyAccumulated: React.FC<{ title: string; totals: JourneyCategoryTotals | null; convertedLabel: string }> = ({
	title,
	totals,
	convertedLabel,
}) => {
	if (!totals) return null;
	const steps = Object.keys(totals.activeByStep)
		.map(Number)
		.sort((a, b) => a - b);
	return (
		<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
			<Typography variant="subtitle2" gutterBottom>
				Acumulado histórico · {title}
			</Typography>
			<Table size="small">
				<TableBody>
					<TableRow>
						<TableCell>Contactos que alguna vez entraron</TableCell>
						<TableCell align="right">
							<strong>{fmt(totals.contactsEver)}</strong>
						</TableCell>
						<TableCell>
							<Typography variant="caption" color="textSecondary">
								{fmt(totals.everEnrolled)} inscripciones (un contacto puede pasar por varias campañas)
							</Typography>
						</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>Activos ahora</TableCell>
						<TableCell align="right">
							<strong>{fmt(totals.active)}</strong>
						</TableCell>
						<TableCell />
					</TableRow>
					<TableRow>
						<TableCell>Completaron</TableCell>
						<TableCell align="right">
							<strong>{fmt(sum(totals.completedByReason))}</strong>
						</TableCell>
						<TableCell>
							<Chips data={totals.completedByReason} />
						</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>Salieron</TableCell>
						<TableCell align="right">
							<strong>{fmt(sum(totals.removedByReason))}</strong>
						</TableCell>
						<TableCell>
							<Chips data={totals.removedByReason} />
						</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>{convertedLabel}</TableCell>
						<TableCell align="right">
							<strong>{fmt(totals.converted + totals.paid)}</strong>
						</TableCell>
						<TableCell>
							<Typography variant="caption" color="textSecondary">
								{totals.converted ? `${fmt(totals.converted)} altas en la app` : ""}
								{totals.converted && totals.paid ? " · " : ""}
								{totals.paid ? `${fmt(totals.paid)} pasaron a plan pago` : ""}
							</Typography>
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
			{steps.length > 0 && (
				<Box sx={{ mt: 1.5 }}>
					<Typography variant="caption" fontWeight={700}>
						Paso actual de los activos
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
						{steps.map((s) => (
							<Chip key={s} size="small" label={`Paso ${s + 1}: ${fmt(totals.activeByStep[String(s)])}`} />
						))}
					</Box>
				</Box>
			)}
		</Paper>
	);
};

export default JourneyAccumulated;
