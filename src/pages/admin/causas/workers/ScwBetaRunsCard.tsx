import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { CausasUpdateConfig, CausasUpdateService, HuecosBackfillRun, ScwBetaPanel, ScwBetaProbeRun } from "api/causasUpdate";

// API del SCW nuevo en pjn-mis-causas: la sonda diaria (pjn-scw-beta-probe, 06:40 ART) que verifica contrato,
// sesión, listado, una causa de control y un PDF, y el backfill de huecos (pjn-huecos-backfill, cada 3 h) que
// completa por el SCW clásico las históricas que la API no pudo dar. Hasta el 10/11/2026 sus corridas solo se
// veían en Mongo (scw-beta-probe-runs, huecos-backfill-runs).

const PASOS = ["contrato", "sesion", "listado", "causa", "documento"] as const;
const PASO_LABEL: Record<(typeof PASOS)[number], string> = {
	contrato: "Contrato",
	sesion: "Sesión",
	listado: "Listado",
	causa: "Causa",
	documento: "PDF",
};
const FLAG_LABEL: Record<string, string> = {
	listadoApiScwBeta: "Listado",
	cargaInicialApi: "Carga inicial",
	movimientosApiInicial: "Primera lectura",
};

const fecha = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");
const duracion = (ms?: number) => {
	if (!ms && ms !== 0) return "—";
	if (ms < 1000) return `${ms} ms`;
	if (ms < 90_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
	return `${Math.round(ms / 60_000)} min`;
};
const num = (n?: number) => (typeof n === "number" ? n.toLocaleString("es-AR") : "—");

const resultadoSonda = (r: ScwBetaProbeRun) => {
	if (r.abortado) return { label: "Sin evaluar", color: "default" as const, detalle: r.abortado };
	if (r.ok) return { label: r.avisos?.length ? "OK con avisos" : "OK", color: "success" as const, detalle: r.avisos?.join(" · ") || "" };
	return { label: r.flagsApagados ? "Falla · flags apagados" : "Falla", color: "error" as const, detalle: r.duras?.join(" · ") || "" };
};

const ScwBetaRunsCard = () => {
	const [data, setData] = useState<ScwBetaPanel | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState<string | null>(null);
	const [dialog, setDialog] = useState<"sonda" | "huecos" | null>(null);

	const cargar = useCallback(async () => {
		try {
			setError(null);
			const r = await CausasUpdateService.getScwBeta({ limit: 40 });
			setData(r.data);
		} catch (e: any) {
			setError(e?.message || "No se pudo cargar el estado de la API del SCW nuevo");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const setFlag = async (key: string, value: boolean, mensaje: string) => {
		setSaving(key);
		try {
			await CausasUpdateService.updateConfig({ worker: { [key]: value } } as unknown as Partial<CausasUpdateConfig>);
			enqueueSnackbar(mensaje, { variant: "success" });
			await cargar();
		} catch (e) {
			console.error(`Error actualizando ${key}:`, e);
			enqueueSnackbar("No se pudo guardar el cambio", { variant: "error" });
		} finally {
			setSaving(null);
		}
	};

	const sonda = data?.sonda;
	const huecos = data?.huecos;
	const ultimaSonda = sonda?.corridas?.[0];
	const ultimoHueco = huecos?.corridas?.[0];
	const flagsOn = sonda ? Object.values(sonda.flags).filter(Boolean).length : 0;
	const flagsTotal = sonda ? Object.keys(sonda.flags).length : 0;

	return (
		<Card variant="outlined">
			<CardContent>
				<Stack
					direction={{ xs: "column", sm: "row" }}
					justifyContent="space-between"
					alignItems={{ sm: "center" }}
					spacing={1}
					sx={{ mb: 1.5 }}
				>
					<Box>
						<Typography variant="body2" fontWeight={600}>
							API del SCW nuevo: sonda diaria y backfill de huecos
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Qué vigila a la API de <code>scw-beta.pjn.gov.ar</code> y qué completa por el SCW clásico lo que la API no da.
						</Typography>
					</Box>
					<Button size="small" onClick={cargar} disabled={loading}>
						Actualizar
					</Button>
				</Stack>

				{loading && (
					<Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
						<CircularProgress size={18} />
						<Typography variant="body2" color="text.secondary">
							Cargando…
						</Typography>
					</Stack>
				)}
				{error && !loading && (
					<Alert severity="error" sx={{ mb: 1 }}>
						{error}
					</Alert>
				)}

				{sonda && huecos && !loading && (
					<Stack spacing={2}>
						{/* Sonda */}
						<Box>
							<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
									<Switch
										checked={sonda.enabled}
										disabled={saving !== null}
										onChange={(e) =>
											setFlag(
												"scwBetaProbeEnabled",
												e.target.checked,
												e.target.checked ? "Sonda diaria activada" : "Sonda diaria desactivada",
											)
										}
										inputProps={{ "aria-label": "Sonda diaria de la API del SCW nuevo" }}
									/>
									<Chip size="small" label={sonda.enabled ? "Activa" : "Apagada"} color={sonda.enabled ? "info" : "default"} />
								</Stack>
								<Box sx={{ flex: 1 }}>
									<Typography variant="body2" fontWeight={600}>
										Sonda diaria (pjn-scw-beta-probe, 06:40 ART)
									</Typography>
									<Typography variant="caption" color="text.secondary" display="block">
										Con una credencial real verifica el contrato <code>/v3/api-docs</code>, la sesión, el listado, una causa de control
										contra nuestra base y la descarga de un PDF. Una falla dura avisa al admin y, si el apagado automático está activo,
										apaga los flags de la API; los fallbacks al SCW clásico siguen solos.
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
										{ultimaSonda ? (
											<>
												<Chip
													size="small"
													color={resultadoSonda(ultimaSonda).color}
													label={`Última: ${resultadoSonda(ultimaSonda).label}`}
												/>
												<Typography variant="caption" color="text.secondary">
													{fecha(ultimaSonda.at)} · {duracion(ultimaSonda.ms)}
													{ultimaSonda.credentialEmail ? ` · ${ultimaSonda.credentialEmail}` : ""}
												</Typography>
											</>
										) : (
											<Chip size="small" variant="outlined" label="Sin corridas todavía" />
										)}
										<Chip
											size="small"
											variant="outlined"
											color={flagsOn === flagsTotal ? "success" : flagsOn === 0 ? "warning" : "default"}
											label={`Flags de la API: ${flagsOn}/${flagsTotal} activos`}
										/>
										<Tooltip title="Ante una falla dura la sonda apaga los flags de la API (listado, carga inicial, primera lectura)">
											<Stack direction="row" spacing={0.5} alignItems="center">
												<Switch
													size="small"
													checked={sonda.autoOff}
													disabled={saving !== null}
													onChange={(e) =>
														setFlag(
															"scwBetaProbeAutoOff",
															e.target.checked,
															e.target.checked
																? "Apagado automático de flags activado"
																: "Apagado automático de flags desactivado: la sonda solo avisa",
														)
													}
													inputProps={{ "aria-label": "Apagar los flags de la API ante una falla dura" }}
												/>
												<Typography variant="caption">Apagado automático</Typography>
											</Stack>
										</Tooltip>
										<Button size="small" onClick={() => setDialog("sonda")} disabled={!sonda.corridas.length}>
											Ver corridas ({sonda.corridas.length})
										</Button>
									</Stack>
									{ultimaSonda && resultadoSonda(ultimaSonda).detalle && (
										<Typography variant="caption" color={ultimaSonda.ok ? "text.secondary" : "error.main"} display="block" sx={{ mt: 0.5 }}>
											{resultadoSonda(ultimaSonda).detalle}
										</Typography>
									)}
									{sonda.apagadoAutomatico && (
										<Alert severity="warning" sx={{ mt: 1, py: 0 }}>
											La sonda apagó los flags el {fecha(sonda.apagadoAutomatico.at)}: {sonda.apagadoAutomatico.motivo}. Se restauran a mano
											(estaban:{" "}
											{Object.entries(sonda.apagadoAutomatico.previos || {})
												.map(([k, v]) => `${FLAG_LABEL[k] || k} ${v ? "ON" : "OFF"}`)
												.join(", ")}
											).
										</Alert>
									)}
									<Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
										Credencial: {sonda.credencialEmail || sonda.credencialId || "ninguna (la lista del listado por API está vacía)"}
										{sonda.credencialPorDefecto
											? " (la primera de la lista del listado por API)"
											: " (configurada: worker.scwBetaProbeCredencial)"}
									</Typography>
								</Box>
							</Stack>
						</Box>

						<Divider />

						{/* Backfill de huecos */}
						<Box>
							<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-start" }}>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
									<Switch
										checked={huecos.enabled}
										disabled={saving !== null}
										onChange={(e) =>
											setFlag(
												"huecosBackfillEnabled",
												e.target.checked,
												e.target.checked
													? "Backfill de huecos activado"
													: "Backfill de huecos desactivado: las históricas incompletas quedan pendientes",
											)
										}
										inputProps={{ "aria-label": "Backfill de huecos de históricas por el SCW clásico" }}
									/>
									<Chip size="small" label={huecos.enabled ? "Activo" : "Apagado"} color={huecos.enabled ? "info" : "default"} />
								</Stack>
								<Box sx={{ flex: 1 }}>
									<Typography variant="body2" fontWeight={600}>
										Backfill de huecos (pjn-huecos-backfill, cada 3 h)
									</Typography>
									<Typography variant="caption" color="text.secondary" display="block">
										Las causas cuya primera lectura por API dejó históricas sin leer (páginas con error 500, marca{" "}
										<code>historicasIncompletas</code>) se completan por el SCW clásico, con login propio y sesión nueva cada{" "}
										{huecos.causasPorSesion} causas. Tope {huecos.maxCausas} causas por corrida, {huecos.maxIntentos} intentos por causa.
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
										{ultimoHueco ? (
											<>
												<Chip
													size="small"
													color={ultimoHueco.errores || ultimoHueco.credencialesConError ? "warning" : "success"}
													label={
														ultimoHueco.pendientesAlInicio
															? `Última: ${num(ultimoHueco.pendientesAlInicio)} pendientes · ${num(
																	ultimoHueco.agregados,
															  )} movimientos agregados`
															: "Última: sin pendientes"
													}
												/>
												<Typography variant="caption" color="text.secondary">
													{fecha(ultimoHueco.at)} · {duracion(ultimoHueco.ms)}
												</Typography>
											</>
										) : (
											<Chip size="small" variant="outlined" label="Sin corridas registradas" />
										)}
										<Button size="small" onClick={() => setDialog("huecos")} disabled={!huecos.corridas.length}>
											Ver corridas ({huecos.corridas.length})
										</Button>
									</Stack>
								</Box>
							</Stack>
						</Box>
					</Stack>
				)}

				{/* Corridas de la sonda */}
				<Dialog open={dialog === "sonda"} onClose={() => setDialog(null)} maxWidth="lg" fullWidth>
					<DialogTitle>Corridas de la sonda diaria de la API</DialogTitle>
					<DialogContent dividers sx={{ p: 0 }}>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Resultado</TableCell>
										<TableCell>Pasos</TableCell>
										<TableCell>Causa de control</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell>Detalle</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{(sonda?.corridas || []).map((r) => {
										const res = resultadoSonda(r);
										const causa = r.pasos?.causa;
										return (
											<TableRow key={r._id} hover>
												<TableCell sx={{ whiteSpace: "nowrap" }}>
													{fecha(r.at)}
													{r.credentialEmail && (
														<Typography variant="caption" color="text.secondary" display="block">
															{r.credentialEmail}
														</Typography>
													)}
												</TableCell>
												<TableCell>
													<Chip size="small" color={res.color} label={res.label} />
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
														{PASOS.map((p) => {
															const paso = r.pasos?.[p];
															if (!paso) return <Chip key={p} size="small" variant="outlined" label={`${PASO_LABEL[p]} —`} />;
															const titulo = paso.omitido
																? `Omitido: ${paso.omitido}`
																: paso.error
																? String(paso.error)
																: Object.entries(paso)
																		.filter(([k]) => !["ok", "ms", "diff"].includes(k))
																		.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
																		.join(" · ");
															return (
																<Tooltip key={p} title={titulo || ""}>
																	<Chip
																		size="small"
																		variant={paso.omitido ? "outlined" : "filled"}
																		color={paso.ok ? "success" : "error"}
																		label={`${PASO_LABEL[p]}${paso.ms ? ` ${duracion(paso.ms)}` : ""}`}
																	/>
																</Tooltip>
															);
														})}
													</Stack>
												</TableCell>
												<TableCell sx={{ whiteSpace: "nowrap" }}>
													{causa && !causa.omitido ? (
														<>
															{String(causa.clave)}
															<Typography variant="caption" color="text.secondary" display="block">
																API {num(causa.api as number)} · nuestra {num(causa.nuestras as number)}
																{(causa.huecos as number) ? ` · huecos ${num(causa.huecos as number)}` : ""}
															</Typography>
														</>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
													{duracion(r.ms)}
												</TableCell>
												<TableCell sx={{ maxWidth: 360 }}>
													<Typography variant="caption" color={r.ok || r.abortado ? "text.secondary" : "error.main"}>
														{res.detalle || (r.swagger?.hash ? `contrato ${r.swagger.hash}` : "")}
													</Typography>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDialog(null)}>Cerrar</Button>
					</DialogActions>
				</Dialog>

				{/* Corridas del backfill */}
				<Dialog open={dialog === "huecos"} onClose={() => setDialog(null)} maxWidth="md" fullWidth>
					<DialogTitle>Corridas del backfill de huecos</DialogTitle>
					<DialogContent dividers sx={{ p: 0 }}>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell align="right">Pendientes</TableCell>
										<TableCell align="right">Credenciales</TableCell>
										<TableCell align="right">Causas</TableCell>
										<TableCell align="right">Agregados</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell align="right">Sin históricas</TableCell>
										<TableCell align="right">No en listado</TableCell>
										<TableCell align="right">Duración</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{(huecos?.corridas || []).map((r: HuecosBackfillRun) => (
										<TableRow key={r._id} hover>
											<TableCell sx={{ whiteSpace: "nowrap" }}>
												{fecha(r.at)}
												{r.dryRun && <Chip size="small" variant="outlined" label="dry-run" sx={{ ml: 1 }} />}
											</TableCell>
											<TableCell align="right">{num(r.pendientesAlInicio)}</TableCell>
											<TableCell align="right">
												<Tooltip title={`ocupadas ${num(r.credencialesOcupadas)} · con error ${num(r.credencialesConError)}`}>
													<span>{num(r.credenciales)}</span>
												</Tooltip>
											</TableCell>
											<TableCell align="right">{num(r.causas)}</TableCell>
											<TableCell align="right">{num(r.agregados)}</TableCell>
											<TableCell align="right" sx={{ color: r.errores ? "error.main" : undefined }}>
												{num(r.errores)}
											</TableCell>
											<TableCell align="right">{num(r.sinBotonHistoricas)}</TableCell>
											<TableCell align="right">{num(r.noEnListado)}</TableCell>
											<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
												{duracion(r.ms)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDialog(null)}>Cerrar</Button>
					</DialogActions>
				</Dialog>
			</CardContent>
		</Card>
	);
};

export default ScwBetaRunsCard;
