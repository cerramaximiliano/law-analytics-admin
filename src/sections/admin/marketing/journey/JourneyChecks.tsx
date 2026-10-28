import React, { useState } from "react";
import { Alert, Box, Button, Chip, Collapse, Paper, Typography } from "@mui/material";
import { JourneyCheck } from "api/journey";

const DARK = "#1f1f1f"; // chips ocre/rojos claros con letra oscura

interface Props {
	checks: JourneyCheck[];
	onLookup: (contactId: string) => void;
	onOpenCampaign: (campaignId: string) => void;
}

// Controles fijos de consistencia (snapshot horario): todos deben dar 0.
const JourneyChecks: React.FC<Props> = ({ checks, onLookup, onOpenCampaign }) => {
	const [open, setOpen] = useState<boolean>(false);
	const alerts = checks.filter((c) => c.status === "alert");
	const errors = checks.filter((c) => c.status === "error");

	return (
		<Box sx={{ mb: 2 }}>
			<Alert
				severity={alerts.length ? "error" : errors.length ? "warning" : "success"}
				action={
					<Button color="inherit" size="small" onClick={() => setOpen((o) => !o)}>
						{open ? "Ocultar controles" : "Ver controles"}
					</Button>
				}
			>
				{alerts.length
					? `Controles de consistencia: ${alerts.length} en alerta (${alerts.map((a) => `${a.title}: ${a.count}`).join(" · ")})`
					: errors.length
					? "Controles de consistencia: algunos no se pudieron calcular."
					: `Controles de consistencia: ${checks.length} controles en 0.`}
			</Alert>
			<Collapse in={open} unmountOnExit>
				<Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
					{checks.map((c) => (
						<Box key={c.key} sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: "divider" }}>
							<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
								<Chip
									size="small"
									label={c.status === "alert" ? c.count.toLocaleString("es-AR") : c.status === "error" ? "Error" : "0"}
									sx={{
										bgcolor: c.status === "alert" ? "#fca5a5" : c.status === "error" ? "#fde047" : "#86efac",
										color: DARK,
										fontWeight: 700,
									}}
								/>
								<Typography variant="subtitle2">{c.title}</Typography>
							</Box>
							{(c.status !== "ok" || c.note) && (
								<Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
									{c.note || c.action}
								</Typography>
							)}
							{c.details && c.details.length > 0 && c.status === "alert" && (
								<ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
									{c.details.slice(0, 10).map((d, i) => (
										<li key={i}>
											<Typography variant="caption">
												{Object.entries(d)
													.filter(([k]) => k !== "campaignId")
													.map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" + ") : String(v)}`)
													.join(" · ")}
											</Typography>
										</li>
									))}
								</ul>
							)}
							{c.sample.length > 0 && c.sampleKind && (
								<Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
									{c.sample.slice(0, 20).map((id) => (
										<Button key={id} size="small" onClick={() => (c.sampleKind === "contactId" ? onLookup(id) : onOpenCampaign(id))}>
											{id.slice(-6)}
										</Button>
									))}
								</Box>
							)}
						</Box>
					))}
				</Paper>
			</Collapse>
		</Box>
	);
};

export default JourneyChecks;
