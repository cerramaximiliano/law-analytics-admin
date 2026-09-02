import { useEffect, useState, useCallback } from "react";
import {
	Box, Grid, Stack, Typography, Chip, Paper, Skeleton, Button, IconButton, Tooltip, alpha,
	FormControl, InputLabel, Select, MenuItem, Collapse, Dialog, DialogTitle, DialogContent,
	DialogActions, TextField, useTheme,
} from "@mui/material";
import { ArrowDown2, ArrowRight2, Refresh, TickCircle, VolumeSlash, Danger, Clock } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { LIVE_GREEN, STALE_AMBER } from "themes/dashboardTokens";
import IncidentsService, { Incident, IncidentSeverity, IncidentStatus, IncidentSource } from "api/incidents";

// Vista de detalle del registro de incidentes.
//
// Es la contraparte del widget del dashboard: ahí se ven los 5 más urgentes,
// acá está todo, con lo que hizo falta para actuar — el detalle de la regla que
// lo abrió, el triage del modelo y el runbook que aplica.
//
// El orden por defecto es severidad y después EDAD, porque la edad es la señal
// que faltaba: un incidente de tres meses es peor noticia que tres de ayer.

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
	critical: "Crítico",
	high: "Grave",
	medium: "Medio",
	low: "Menor",
};

const SOURCE_LABEL: Record<IncidentSource, string> = {
	"log-coverage": "Cobertura de logs",
	"health-report": "Salud del servicio",
	"worker-contract": "Contrato de worker",
	manual: "Manual",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
	open: "Abierto",
	acked: "Silenciado",
	resolved: "Resuelto",
};

const IncidentsPage = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<Incident[]>([]);
	const [loading, setLoading] = useState(true);
	const [severity, setSeverity] = useState<string>("");
	const [source, setSource] = useState<string>("");
	const [incluirResueltos, setIncluirResueltos] = useState(false);
	const [abierto, setAbierto] = useState<string | null>(null);
	const [ackTarget, setAckTarget] = useState<Incident | null>(null);
	const [ackDays, setAckDays] = useState(7);
	const [ackReason, setAckReason] = useState("");

	const cargar = useCallback(async () => {
		setLoading(true);
		try {
			const res = await IncidentsService.list({
				severity: (severity || undefined) as IncidentSeverity | undefined,
				source: (source || undefined) as IncidentSource | undefined,
				includeResolved: incluirResueltos,
				limit: 300,
			});
			setItems(res.data || []);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo leer el registro de incidentes", { variant: "error" });
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [severity, source, incluirResueltos, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const severityColor = (s: IncidentSeverity) => {
		if (s === "critical" || s === "high") return theme.palette.error.main;
		if (s === "medium") return STALE_AMBER;
		return theme.palette.text.disabled;
	};
	const ageColor = (d: number) => (d >= 30 ? theme.palette.error.main : d >= 7 ? STALE_AMBER : theme.palette.text.secondary);

	const silenciar = async () => {
		if (!ackTarget) return;
		if (!ackReason.trim()) {
			enqueueSnackbar("El motivo es obligatorio: sin él, dentro de un mes no vas a saber si lo silenciaste o lo ignoraste", { variant: "warning" });
			return;
		}
		try {
			await IncidentsService.ack(ackTarget._id, ackDays, ackReason.trim());
			enqueueSnackbar(`Silenciado ${ackDays} días`, { variant: "success" });
			setAckTarget(null);
			setAckReason("");
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo silenciar", { variant: "error" });
		}
	};

	const resolver = async (i: Incident) => {
		try {
			await IncidentsService.resolve(i._id);
			enqueueSnackbar("Marcado como resuelto. Si la condición sigue, la próxima corrida lo reabre.", { variant: "success" });
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo resolver", { variant: "error" });
		}
	};

	const abiertos = items.filter((i) => i.effectiveStatus !== "resolved");
	const graves = abiertos.filter((i) => i.severity === "high" || i.severity === "critical").length;
	const masViejo = abiertos.reduce((m, i) => Math.max(m, i.ageDays), 0);
	const silenciados = items.filter((i) => i.effectiveStatus === "acked").length;

	return (
		<MainCard>
			<Box sx={{ mb: 2.5 }}>
				<Grid container alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
					<Grid item sx={{ maxWidth: 760 }}>
						<Typography variant="h3" sx={{ mb: 0.5 }}>
							Incidentes del ecosistema
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Todo lo que las reglas detectaron y sigue sin resolverse. Un incidente lo cierra la misma regla que lo abrió;
							cerrarlo a mano no tapa nada — si la condición persiste, vuelve.
						</Typography>
						{!loading && (
							<Stack direction="row" spacing={3} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
								<Stack direction="row" spacing={0.75} alignItems="baseline">
									<Typography variant="h4" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{abiertos.length}</Typography>
									<Typography variant="caption" color="text.secondary">abiertos</Typography>
								</Stack>
								{graves > 0 && (
									<Stack direction="row" spacing={0.75} alignItems="baseline">
										<Typography variant="h4" fontWeight={700} color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>{graves}</Typography>
										<Typography variant="caption" color="text.secondary">graves</Typography>
									</Stack>
								)}
								<Stack direction="row" spacing={0.75} alignItems="baseline">
									<Typography variant="h4" fontWeight={700} sx={{ color: ageColor(masViejo), fontVariantNumeric: "tabular-nums" }}>{masViejo}</Typography>
									<Typography variant="caption" color="text.secondary">{masViejo === 1 ? "día el más viejo" : "días el más viejo"}</Typography>
								</Stack>
								{silenciados > 0 && (
									<Stack direction="row" spacing={0.75} alignItems="baseline">
										<Typography variant="h4" fontWeight={700} color="text.disabled" sx={{ fontVariantNumeric: "tabular-nums" }}>{silenciados}</Typography>
										<Typography variant="caption" color="text.secondary">silenciados</Typography>
									</Stack>
								)}
							</Stack>
						)}
					</Grid>
					<Grid item>
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							<FormControl size="small" sx={{ minWidth: 140 }}>
								<InputLabel>Severidad</InputLabel>
								<Select value={severity} label="Severidad" onChange={(e) => setSeverity(e.target.value)}>
									<MenuItem value="">Todas</MenuItem>
									<MenuItem value="critical">Crítico</MenuItem>
									<MenuItem value="high">Grave</MenuItem>
									<MenuItem value="medium">Medio</MenuItem>
									<MenuItem value="low">Menor</MenuItem>
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 190 }}>
								<InputLabel>Fuente</InputLabel>
								<Select value={source} label="Fuente" onChange={(e) => setSource(e.target.value)}>
									<MenuItem value="">Todas</MenuItem>
									<MenuItem value="worker-contract">Contrato de worker</MenuItem>
									<MenuItem value="log-coverage">Cobertura de logs</MenuItem>
									<MenuItem value="health-report">Salud del servicio</MenuItem>
								</Select>
							</FormControl>
							<Button size="small" variant={incluirResueltos ? "contained" : "outlined"} onClick={() => setIncluirResueltos((v) => !v)}>
								Resueltos
							</Button>
							<Tooltip title="Actualizar">
								<IconButton onClick={cargar} disabled={loading} size="small" color="primary">
									<Refresh size={20} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Grid>
				</Grid>
			</Box>

			{loading && [1, 2, 3].map((k) => <Skeleton key={k} variant="rectangular" height={64} sx={{ mb: 1, borderRadius: 1 }} />)}

			{!loading && items.length === 0 && (
				<Paper elevation={0} sx={{ p: 3, textAlign: "center", border: `1px solid ${alpha(LIVE_GREEN, 0.35)}`, bgcolor: alpha(LIVE_GREEN, isDark ? 0.08 : 0.05), borderRadius: 2 }}>
					<TickCircle size={28} color={LIVE_GREEN} variant="Bold" />
					<Typography variant="h5" sx={{ mt: 1 }}>Sin incidentes</Typography>
					<Typography variant="body2" color="text.secondary">
						Ninguna de las tres fuentes reportó problemas con los filtros actuales.
					</Typography>
				</Paper>
			)}

			{!loading &&
				items.map((i) => {
					const esta = abierto === i._id;
					const resuelto = i.effectiveStatus === "resolved";
					return (
						<Paper
							key={i._id}
							elevation={0}
							sx={{
								mb: 1,
								borderRadius: 1.5,
								overflow: "hidden",
								opacity: resuelto ? 0.55 : 1,
								border: `1px solid ${theme.palette.divider}`,
								borderLeft: `3px solid ${resuelto ? theme.palette.text.disabled : severityColor(i.severity)}`,
							}}
						>
							<Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2, py: 1.25, cursor: "pointer" }} onClick={() => setAbierto(esta ? null : i._id)}>
								{esta ? <ArrowDown2 size={16} /> : <ArrowRight2 size={16} />}
								<Chip
									label={SEVERITY_LABEL[i.severity]}
									size="small"
									sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, color: severityColor(i.severity), bgcolor: alpha(severityColor(i.severity), 0.12) }}
								/>
								<Box sx={{ flexGrow: 1, minWidth: 0 }}>
									<Typography variant="body2" fontWeight={600} noWrap>{i.title}</Typography>
									<Typography variant="caption" color="text.secondary" noWrap>
										{SOURCE_LABEL[i.source] || i.source}
										{i.host ? ` · ${i.host}` : ""}
										{i.occurrences > 1 ? ` · ${i.occurrences} detecciones` : ""}
										{i.effectiveStatus !== "open" ? ` · ${STATUS_LABEL[i.effectiveStatus]}` : ""}
									</Typography>
								</Box>
								<Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
									<Clock size={13} color={ageColor(i.ageDays)} />
									<Typography variant="caption" sx={{ color: ageColor(i.ageDays), fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
										{i.ageDays === 0 ? "hoy" : `${i.ageDays}d`}
									</Typography>
								</Stack>
							</Stack>

							<Collapse in={esta}>
								<Box sx={{ px: 2, pb: 2, pt: 0.5, bgcolor: alpha(theme.palette.text.primary, isDark ? 0.03 : 0.02) }}>
									{i.detail && (
										<Typography variant="body2" sx={{ mb: 1.5 }}>{i.detail}</Typography>
									)}

									{i.aiTriage?.summary && (
										<Box sx={{ mb: 1.5, pl: 1.5, borderLeft: `2px solid ${theme.palette.primary.main}` }}>
											<Typography variant="caption" color="primary" fontWeight={700}>Triage</Typography>
											<Typography variant="body2">{i.aiTriage.summary}</Typography>
											{i.aiTriage.rootCause && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{i.aiTriage.rootCause}</Typography>}
											{i.aiTriage.nextStep && <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>▸ {i.aiTriage.nextStep}</Typography>}
										</Box>
									)}

									<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
										{[
											["Tipo", i.type],
											["Servicio", i.service || "—"],
											["Host", i.host || "—"],
											["Primera vez", new Date(i.firstSeenAt).toLocaleString("es-AR")],
											["Última", new Date(i.lastSeenAt).toLocaleString("es-AR")],
											["Runbook", i.runbook || "—"],
										].map(([k, v]) => (
											<Box key={k as string}>
												<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{k}</Typography>
												<Typography variant="caption" fontFamily="monospace">{v}</Typography>
											</Box>
										))}
									</Stack>

									{i.ackReason && (
										<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
											Silenciado hasta {i.ackedUntil ? new Date(i.ackedUntil).toLocaleDateString("es-AR") : "—"}: “{i.ackReason}”
										</Typography>
									)}

									{!resuelto && (
										<Stack direction="row" spacing={1}>
											<Button size="small" variant="outlined" startIcon={<VolumeSlash size={16} />} onClick={() => { setAckTarget(i); setAckDays(7); setAckReason(""); }}>
												Silenciar
											</Button>
											<Button size="small" variant="outlined" color="success" startIcon={<TickCircle size={16} />} onClick={() => resolver(i)}>
												Marcar resuelto
											</Button>
										</Stack>
									)}
								</Box>
							</Collapse>
						</Paper>
					);
				})}

			<Dialog open={Boolean(ackTarget)} onClose={() => setAckTarget(null)} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" spacing={1} alignItems="center">
						<Danger size={20} color={STALE_AMBER} variant="Bold" />
						<span>Silenciar incidente</span>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						{ackTarget?.title}
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
						Sigue existiendo y sigue envejeciendo: sólo deja de reclamar atención hasta la fecha elegida.
					</Typography>
					<Stack spacing={2}>
						<FormControl size="small" fullWidth>
							<InputLabel>Por cuánto tiempo</InputLabel>
							<Select value={ackDays} label="Por cuánto tiempo" onChange={(e) => setAckDays(Number(e.target.value))}>
								{[1, 7, 30, 90].map((d) => (
									<MenuItem key={d} value={d}>{d} día{d !== 1 ? "s" : ""}</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField
							label="Motivo"
							required
							multiline
							minRows={2}
							value={ackReason}
							onChange={(e) => setAckReason(e.target.value)}
							placeholder="Ej: MEV depende de credenciales del usuario; sin credenciales usables no puede actualizar."
							helperText="Obligatorio. Dentro de un mes, esto es lo único que distingue “lo silencié a conciencia” de “lo ignoré”."
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAckTarget(null)}>Cancelar</Button>
					<Button variant="contained" onClick={silenciar} disabled={!ackReason.trim()}>Silenciar</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default IncidentsPage;
