import React from "react";
import { Box, Chip, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { JourneyLookup } from "api/journey";

const dateFmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR") : "—");
const DARK = "#1f1f1f";
const ENROLL_BG: Record<string, string> = {
	active: "#86efac",
	completed: "#93c5fd",
	removed: "#fca5a5",
	skipped: "#e2e8f0",
	paused: "#fde047",
};
const ENROLL_LABEL: Record<string, string> = {
	active: "Activa",
	completed: "Completó",
	removed: "Salió",
	skipped: "Omitida",
	paused: "Pausada",
};
const ETAPA_LABEL: Record<string, string> = {
	captacion: "Captación (no es usuario)",
	onboarding: "Onboarding",
	conversion: "Conversión",
	cliente: "Cliente",
	inactivo: "Inactivo",
	activo_free: "Activo free",
	sin_etapa: "Sin etapa calculada",
};

const JourneyLookupCard: React.FC<{ data: JourneyLookup }> = ({ data }) => {
	const c = data.contact;
	return (
		<Paper variant="outlined" sx={{ p: 2, borderColor: "#F59E0B", borderWidth: 2 }}>
			<Typography variant="h6" gutterBottom>
				Recorrido de {c.email}
			</Typography>
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
				<Chip
					label={`Etapa: ${ETAPA_LABEL[c.etapa] || c.etapa}${c.subetapa ? ` · ${c.subetapa}` : ""}`}
					sx={{ bgcolor: "#fde047", color: DARK, fontWeight: 600 }}
				/>
				{c.etapaDesde && <Chip variant="outlined" label={`Desde ${dateFmt(c.etapaDesde)}`} />}
				<Chip variant="outlined" label={c.isAppUser ? "Usuario de la app" : "No es usuario"} />
				<Chip variant="outlined" label={`Estado: ${c.status}`} />
				{c.neverBounce && <Chip variant="outlined" label={`NeverBounce: ${c.neverBounce}`} />}
				<Chip variant="outlined" label={`contactId ${c.contactId}`} />
				{c.userId && <Chip variant="outlined" label={`userId ${c.userId}`} />}
			</Box>

			<Typography variant="subtitle2" gutterBottom>
				Coordinador de frecuencia
			</Typography>
			<Typography variant="body2" sx={{ mb: 2 }}>
				{data.coordinator.enabled ? (data.coordinator.dryRun ? "En prueba (solo registra)" : "Activo") : "Apagado"} · recibió{" "}
				{data.coordinator.sentToday} hoy (tope {data.coordinator.maxPerDay}) y {data.coordinator.sentLast7Days} en 7 días (tope{" "}
				{data.coordinator.maxPerWeek}).
			</Typography>

			{data.exclusions.length > 0 && (
				<Box sx={{ mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Exclusiones que le aplican
					</Typography>
					<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
						{data.exclusions.map((e) => (
							<Chip key={e.key} label={e.text} sx={{ bgcolor: "#fca5a5", color: DARK, fontWeight: 600 }} />
						))}
					</Box>
				</Box>
			)}

			<Typography variant="subtitle2" gutterBottom>
				Campañas en las que está o estuvo
			</Typography>
			{data.enrollments.length === 0 ? (
				<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
					No está inscripto en ninguna campaña.
				</Typography>
			) : (
				<Table size="small" sx={{ mb: 2 }}>
					<TableHead>
						<TableRow>
							<TableCell>Campaña</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell align="right">Paso actual</TableCell>
							<TableCell>Ingresó</TableCell>
							<TableCell>Salió / motivo</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data.enrollments.map((e) => (
							<TableRow key={e.campaignId} hover>
								<TableCell>
									{e.name}
									{e.tipo && (
										<Typography variant="caption" color="textSecondary" display="block">
											{e.tipo}
											{e.subtipo ? ` · ${e.subtipo}` : ""}
										</Typography>
									)}
								</TableCell>
								<TableCell>
									<Chip
										size="small"
										label={ENROLL_LABEL[e.status] || e.status}
										sx={{ bgcolor: ENROLL_BG[e.status], color: DARK, fontWeight: 600 }}
									/>
								</TableCell>
								<TableCell align="right">{e.currentStep + 1}</TableCell>
								<TableCell>{dateFmt(e.joinedAt)}</TableCell>
								<TableCell>
									{e.removedAt ? `${dateFmt(e.removedAt)} · ${e.removalReason || "—"}` : e.completedAt ? dateFmt(e.completedAt) : "—"}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			{data.evaluated.length > 0 && (
				<Box>
					<Typography variant="subtitle2" gutterBottom>
						Filtros de las campañas de su etapa
					</Typography>
					{data.evaluated.map((ev) => (
						<Paper key={ev.campaignId} variant="outlined" sx={{ p: 1.5, mb: 1, borderColor: ev.enrolled ? "#16A34A" : undefined }}>
							<Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
								<Typography variant="subtitle2">{ev.name}</Typography>
								<Chip
									size="small"
									label={
										ev.enrolled
											? "Inscripto"
											: ev.matches
											? ev.acceptsNew
												? "Cumple, falta que lo inscriba la sincronización"
												: "Cumple, pero la campaña ya no inscribe nuevos"
											: "No cumple"
									}
									sx={{ bgcolor: ev.enrolled ? "#86efac" : ev.matches ? "#fde047" : "#fca5a5", color: DARK, fontWeight: 600 }}
								/>
							</Box>
							<ul style={{ margin: "4px 0 0 18px", padding: 0, listStyle: "none" }}>
								{ev.filters.map((f, i) => (
									<li key={i}>
										<Typography variant="caption" sx={{ color: f.ok ? "success.main" : "error.main", fontWeight: f.ok ? 400 : 700 }}>
											{f.ok ? "✓" : "✗"} {f.text}
										</Typography>
									</li>
								))}
							</ul>
							{ev.nextStepFilter && (
								<Typography variant="caption" color="textSecondary" display="block">
									Filtro del próximo paso: {ev.nextStepFilter.join("; ")}
								</Typography>
							)}
						</Paper>
					))}
				</Box>
			)}
		</Paper>
	);
};

export default JourneyLookupCard;
