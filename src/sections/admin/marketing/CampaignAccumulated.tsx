import React from "react";
import { Box, Chip, Paper, Tooltip, Typography, useTheme } from "@mui/material";
import { AudienceTotals } from "types/campaign";
import { reasonLabel } from "./campaignReasons";

const fmt = (n: number) => n.toLocaleString("es-AR");
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

// Histórico completo de la campaña (sin ventana de días): cuántos pasaron por ella y cómo terminaron.
const ReasonChips: React.FC<{ data: Record<string, number> }> = ({ data }) => (
	<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
		{Object.entries(data)
			.sort(([, a], [, b]) => b - a)
			.map(([k, n]) => (
				<Tooltip key={k} title={k}>
					<Chip size="small" variant="outlined" label={`${reasonLabel(k)}: ${fmt(n)}`} />
				</Tooltip>
			))}
	</Box>
);

const CampaignAccumulated: React.FC<{ totals: AudienceTotals }> = ({ totals }) => {
	const theme = useTheme();
	const completed = sum(totals.completedByReason);
	const removed = sum(totals.removedByReason);
	const skipped = sum(totals.skippedByReason);
	const block = (label: string, value: number, color: string, children?: React.ReactNode) => (
		<Box sx={{ minWidth: 150, flex: 1 }}>
			<Typography variant="caption" color="textSecondary">
				{label}
			</Typography>
			<Typography variant="h4" sx={{ color, lineHeight: 1.2 }}>
				{fmt(value)}
			</Typography>
			{children}
		</Box>
	);
	return (
		<Paper variant="outlined" sx={{ p: 2, mb: 2, borderLeft: `4px solid ${theme.palette.primary.main}` }}>
			<Typography variant="subtitle2" gutterBottom>
				Acumulado (histórico completo)
			</Typography>
			<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
				{block("Pasaron por la campaña", totals.everEnrolled, theme.palette.primary.main)}
				{block("Activos hoy", totals.active + totals.paused, theme.palette.success.main)}
				{block("Completaron", completed, theme.palette.info.main, <ReasonChips data={totals.completedByReason} />)}
				{block("Salieron", removed, theme.palette.warning.dark, <ReasonChips data={totals.removedByReason} />)}
				{skipped > 0 && block("Omitidos", skipped, theme.palette.grey[600], <ReasonChips data={totals.skippedByReason} />)}
			</Box>
		</Paper>
	);
};

export default CampaignAccumulated;
