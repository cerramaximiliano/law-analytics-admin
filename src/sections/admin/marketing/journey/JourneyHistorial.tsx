import React, { useMemo, useState } from "react";
import { Box, Chip, Collapse, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { JourneyCampaignStats, JourneyV2 } from "api/journey";
import { dateShort, fmt } from "./journeyFormat";

const DARK = "#1f1f1f";
const STATUS_LABEL: Record<string, string> = { paused: "Pausada", completed: "Completada", archived: "Archivada" };
const STATUS_BG: Record<string, string> = { paused: "#fde047", completed: "#93c5fd", archived: "#e2e8f0" };

interface Props {
	v2: JourneyV2;
	onOpen: (id: string) => void;
}

// Carril de historial: campañas pausadas, completadas y archivadas con sus datos históricos y su lapso de duración.
const JourneyHistorial: React.FC<Props> = ({ v2, onOpen }) => {
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
	const groups = useMemo(() => {
		const map = new Map<string, Array<[string, JourneyCampaignStats]>>();
		Object.entries(v2.campaigns)
			.filter(([, c]) => ["paused", "completed", "archived"].includes(c.status))
			.forEach(([id, c]) => {
				const key = `${c.tipo}${c.subtipo ? ` · ${c.subtipo}` : ""}`;
				map.set(key, [...(map.get(key) || []), [id, c]]);
			});
		return [...map.entries()]
			.map(([key, list]) => ({ key, list: list.sort((a, b) => String(b[1].lastSend || "").localeCompare(String(a[1].lastSend || ""))) }))
			.sort((a, b) => b.list.length - a.list.length);
	}, [v2]);

	if (!groups.length) return <Typography variant="body2">No hay campañas desactivadas.</Typography>;
	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
				Historial de campañas desactivadas
			</Typography>
			{groups.map((g) => {
				const many = g.list.length > 4;
				const open = !many || openGroups[g.key];
				return (
					<Box key={g.key} sx={{ mb: 1.5 }}>
						<Box
							sx={{ display: "flex", gap: 1, alignItems: "center", cursor: many ? "pointer" : "default" }}
							onClick={() => many && setOpenGroups((o) => ({ ...o, [g.key]: !o[g.key] }))}
						>
							<Chip size="small" label={g.key} />
							<Typography variant="caption" color="textSecondary">
								{g.list.length} campañas {many ? (open ? "(ocultar)" : "(mostrar)") : ""}
							</Typography>
						</Box>
						<Collapse in={open}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Campaña</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Creada</TableCell>
										<TableCell>Primer envío</TableCell>
										<TableCell>Último envío</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell align="right">Envíos</TableCell>
										<TableCell align="right">Inscripciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{g.list.map(([id, c]) => (
										<TableRow key={id} hover onClick={() => onOpen(id)} sx={{ cursor: "pointer" }}>
											<TableCell>{c.name}</TableCell>
											<TableCell>
												<Chip
													size="small"
													label={STATUS_LABEL[c.status] || c.status}
													sx={{ bgcolor: STATUS_BG[c.status], color: DARK, fontWeight: 600 }}
												/>
											</TableCell>
											<TableCell>{dateShort(c.createdAt)}</TableCell>
											<TableCell>{dateShort(c.firstSend)}</TableCell>
											<TableCell>{dateShort(c.lastSend)}</TableCell>
											<TableCell align="right">{c.durationDays ? `${c.durationDays} días` : "—"}</TableCell>
											<TableCell align="right">{fmt(c.totalSent)}</TableCell>
											<TableCell align="right">{fmt(c.enrollment?.everEnrolled)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Collapse>
					</Box>
				);
			})}
		</Paper>
	);
};

export default JourneyHistorial;
