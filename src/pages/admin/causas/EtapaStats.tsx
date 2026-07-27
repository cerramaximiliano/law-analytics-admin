import { useEffect, useMemo, useState } from "react";
import {
	Box,
	Stack,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	CircularProgress,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	useTheme,
	alpha,
} from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import MainCard from "components/MainCard";
import { enqueueSnackbar } from "notistack";
import EtapaStatsService, { ResumenDuracion, FiltrosEtapaStats, TipoResumen } from "api/etapaStats";

const FUEROS = [
	{ value: "CNT", label: "Trabajo" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CIV", label: "Civil" },
	{ value: "COM", label: "Comercial" },
	{ value: "CAF", label: "Contencioso Adm. Federal" },
	{ value: "CCF", label: "Civil y Comercial Federal" },
];

type VistaValue = TipoResumen | "patron";

const VISTAS: { value: VistaValue; label: string }[] = [
	{ value: "patron", label: "Patrón por objeto (abstracto)" },
	{ value: "duracion-fuero-etapa", label: "Duración por etapa" },
	{ value: "duracion-objeto-etapa", label: "Duración por objeto" },
	{ value: "duracion-juzgado-etapa", label: "Duración por juzgado" },
	{ value: "duracion-sala-etapa", label: "Duración por sala" },
	{ value: "transicion", label: "Transiciones entre etapas" },
	{ value: "resultado", label: "Resultados de terminación" },
	{ value: "conformidad", label: "Conformidad con el patrón" },
	{ value: "firma", label: "Flujos completos (firmas)" },
];

// Vista especial (no es un tipo de resumen directo): modelo abstracto del
// proceso para un objeto — etapas posibles con sus salidas.
const VISTA_PATRON = "patron";

const CONFORMIDAD_META: Record<string, { label: string; color: "success" | "info" | "warning" | "error" }> = {
	"con-merito": { label: "Con resolución de mérito", color: "success" },
	anticipada: { label: "Terminación anticipada (legítima)", color: "info" },
	gap: { label: "Gap observacional (etapa faltante)", color: "warning" },
	reapertura: { label: "Reapertura post-terminal", color: "error" },
};

// Orden canónico de etapas (rank de pjn-models etapa-procesal).
const ETAPA_RANK: Record<string, number> = {
	demanda: 10,
	apertura_sucesion: 10,
	traba_litis: 20,
	apertura_concurso: 20,
	prueba: 30,
	edictos: 30,
	verificacion: 30,
	alegatos: 40,
	informe_general: 40,
	puro_derecho: 45,
	categorizacion: 45,
	autos_sentencia: 50,
	acuerdo: 50,
	sentencia_primera: 60,
	declaratoria: 60,
	homologacion: 60,
	sentencia_remate: 60,
	segunda_instancia: 70,
	sentencia_camara: 75,
	recurso_extraordinario: 80,
	sentencia_firme: 85,
	ejecucion: 90,
	inscripcion: 90,
	fin_litigio: 95,
	archivo: 100,
};

const fmtDias = (v?: number | null) => (v == null ? "—" : `${v} d`);

// ── Vista "Patrón por objeto": modelo abstracto del proceso ────────────────────
// Para cada etapa presente en las causas del objeto: cuántos casos la
// transitaron, cuánto duró (p50/p90) y hacia dónde salieron (avances vs
// salidas de terminación), más los resultados finales.
function PatronObjeto({ fuero, objeto, etiquetas }: { fuero: string; objeto: string; etiquetas: Record<string, string> }) {
	const theme = useTheme();
	const [trans, setTrans] = useState<ResumenDuracion[]>([]);
	const [dur, setDur] = useState<ResumenDuracion[]>([]);
	const [res, setRes] = useState<ResumenDuracion[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!objeto) return;
		let active = true;
		setLoading(true);
		Promise.all([
			EtapaStatsService.resumen({ tipo: "transicion-objeto", fuero, objeto, limit: 500 }),
			EtapaStatsService.resumen({ tipo: "duracion-objeto-etapa", fuero, objeto, limit: 100 }),
			EtapaStatsService.resumen({ tipo: "resultado", fuero, objeto, limit: 50 }),
		])
			.then(([t, d, r]) => {
				if (!active) return;
				setTrans(t.data || []);
				setDur(d.data || []);
				setRes(r.data || []);
			})
			.catch(() => active && enqueueSnackbar("Error al cargar el patrón del objeto", { variant: "error" }))
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [fuero, objeto]);

	const etiqueta = (k?: string) => (k ? etiquetas[k] || k : "—");

	const filas = useMemo(() => {
		const porEtapa = new Map<string, { etapa: string; total: number; destinos: { etapa: string; n: number; salida: boolean }[] }>();
		for (const t of trans) {
			if (!t.etapa || !t.etapaSiguiente) continue;
			const row = porEtapa.get(t.etapa) || { etapa: t.etapa, total: 0, destinos: [] };
			const salida = t.etapaSiguiente === "fin_litigio" || t.etapaSiguiente === "archivo";
			row.total += t.n;
			row.destinos.push({ etapa: t.etapaSiguiente, n: t.n, salida });
			porEtapa.set(t.etapa, row);
		}
		return [...porEtapa.values()]
			.map((r) => ({ ...r, destinos: r.destinos.sort((a, b) => b.n - a.n), dur: dur.find((d) => d.etapa === r.etapa) }))
			.sort((a, b) => (ETAPA_RANK[a.etapa] || 999) - (ETAPA_RANK[b.etapa] || 999));
	}, [trans, dur]);

	const totalRes = res.reduce((a, r) => a + r.n, 0);

	if (!objeto) return <Alert severity="info">Elegí un objeto para ver su patrón abstracto de etapas y salidas.</Alert>;
	if (loading)
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
				<CircularProgress />
			</Box>
		);
	if (!filas.length) return <Alert severity="warning">Sin transiciones suficientes para este objeto (se requieren ≥5 casos por transición).</Alert>;

	return (
		<Stack spacing={2}>
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Etapa</TableCell>
							<TableCell align="right">Casos</TableCell>
							<TableCell align="right">p50 / p90</TableCell>
							<TableCell>Salidas (a dónde pasa el expediente)</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filas.map((f) => (
							<TableRow key={f.etapa} hover>
								<TableCell>
									<Chip size="small" label={etiqueta(f.etapa)} sx={{ height: 22, fontWeight: 700 }} />
								</TableCell>
								<TableCell align="right">{f.total.toLocaleString("es-AR")}</TableCell>
								<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
									{f.dur ? `${f.dur.p50 ?? "—"} / ${f.dur.p90 ?? "—"} d` : "—"}
								</TableCell>
								<TableCell>
									<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
										{f.destinos.map((d) => (
											<Chip
												key={d.etapa}
												size="small"
												variant="outlined"
												color={d.salida ? "warning" : "default"}
												label={`→ ${etiqueta(d.etapa)} ${Math.round((100 * d.n) / f.total)}%`}
												sx={{ height: 21, fontSize: 11, fontWeight: d.salida ? 700 : 500 }}
											/>
										))}
									</Stack>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>

			{res.length > 0 && (
				<Box>
					<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
						Resultados finales ({totalRes.toLocaleString("es-AR")} causas terminadas)
					</Typography>
					<Stack spacing={0.25}>
						{res.slice(0, 8).map((r) => (
							<Typography key={r._id} variant="body2" sx={{ color: "text.secondary" }}>
								<b>{Math.round((100 * r.n) / totalRes)}%</b> {(r.detalle || r.resultado || "").toLowerCase().slice(0, 70)} ·{" "}
								{fmtDias(r.diasTotalesMean)} totales promedio
							</Typography>
						))}
					</Stack>
				</Box>
			)}
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				Las salidas en naranja son terminaciones (fin del litigio / archivo) desde esa etapa; el resto, avances. Basado en segmentos
				cerrados del corpus; grupos con menos de 5 casos excluidos.
			</Typography>
		</Stack>
	);
}

const EtapaStats = () => {
	const theme = useTheme();
	const [vista, setVista] = useState<VistaValue>("duracion-fuero-etapa");
	const [fuero, setFuero] = useState("CNT");
	const [objeto, setObjeto] = useState("");
	const [juzgado, setJuzgado] = useState("");
	const [sala, setSala] = useState("");
	const [etapa, setEtapa] = useState("");
	const [filtros, setFiltros] = useState<FiltrosEtapaStats | null>(null);
	const [rows, setRows] = useState<ResumenDuracion[]>([]);
	const [updatedAt, setUpdatedAt] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		EtapaStatsService.filtros(fuero)
			.then((r) => setFiltros(r.data))
			.catch(() => {});
	}, [fuero]);

	useEffect(() => {
		if (vista === VISTA_PATRON) return; // la vista patrón hace sus propios fetches
		let active = true;
		setLoading(true);
		const params: any = { tipo: vista, fuero, limit: 500 };
		if (vista === "duracion-objeto-etapa" && objeto) params.objeto = objeto;
		if (vista === "duracion-juzgado-etapa" && juzgado !== "") params.juzgado = juzgado;
		if (vista === "duracion-sala-etapa" && sala !== "") params.sala = sala;
		if (etapa && vista.startsWith("duracion")) params.etapa = etapa;
		if (etapa && vista === "transicion") params.etapa = etapa;
		EtapaStatsService.resumen(params)
			.then((r) => {
				if (!active) return;
				setRows(r.data || []);
				setUpdatedAt(r.updatedAt);
			})
			.catch(() => {
				if (!active) return;
				enqueueSnackbar("Error al cargar las estadísticas de etapas", {
					variant: "error",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [vista, fuero, objeto, juzgado, sala, etapa]);

	const etiqueta = (key?: string) => (key ? filtros?.etiquetas?.[key] || key : "—");

	const esDuracion = vista.startsWith("duracion");

	// Filas ordenadas: duración por rank canónico de etapa; el resto por n.
	const sorted = useMemo(() => {
		const r = [...rows];
		if (esDuracion && vista === "duracion-fuero-etapa") {
			r.sort((a, b) => (ETAPA_RANK[a.etapa || ""] || 999) - (ETAPA_RANK[b.etapa || ""] || 999));
		} else {
			r.sort((a, b) => b.n - a.n);
		}
		return r;
	}, [rows, vista, esDuracion]);

	// Datos del gráfico (solo vistas de duración): p50 y p90 por etapa.
	const chartData = useMemo(() => {
		if (!esDuracion) return [];
		const porEtapa = new Map<string, { etapa: string; p50: number; p90: number; n: number }>();
		for (const r of sorted) {
			if (!r.etapa || r.p50 == null) continue;
			const prev = porEtapa.get(r.etapa);
			// Con dimensión extra sin filtrar (todos los objetos/juzgados) promediamos ponderado.
			if (!prev) porEtapa.set(r.etapa, { etapa: r.etapa, p50: r.p50, p90: r.p90 || 0, n: r.n });
			else {
				const nt = prev.n + r.n;
				prev.p50 = Math.round((prev.p50 * prev.n + (r.p50 || 0) * r.n) / nt);
				prev.p90 = Math.round((prev.p90 * prev.n + (r.p90 || 0) * r.n) / nt);
				prev.n = nt;
			}
		}
		return [...porEtapa.values()]
			.sort((a, b) => (ETAPA_RANK[a.etapa] || 999) - (ETAPA_RANK[b.etapa] || 999))
			.map((d) => ({ ...d, label: etiqueta(d.etapa) }));
	}, [sorted, esDuracion, filtros]);

	const colP50 = theme.palette.primary.main;
	const colP90 = alpha(theme.palette.primary.main, 0.35);

	return (
		<MainCard title="Estadísticas de etapas procesales (PJN)" content={false}>
			<Box sx={{ p: 2 }}>
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<InputLabel>Vista</InputLabel>
						<Select value={vista} label="Vista" onChange={(e) => setVista(e.target.value as VistaValue)}>
							{VISTAS.map((v) => (
								<MenuItem key={v.value} value={v.value}>
									{v.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 180 }}>
						<InputLabel>Fuero</InputLabel>
						<Select
							value={fuero}
							label="Fuero"
							onChange={(e) => {
								setFuero(e.target.value);
								setObjeto("");
								setJuzgado("");
								setSala("");
								setEtapa("");
							}}
						>
							{FUEROS.map((f) => (
								<MenuItem key={f.value} value={f.value}>
									{f.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					{(vista === "duracion-objeto-etapa" || vista === VISTA_PATRON) && (
						<FormControl size="small" sx={{ minWidth: 260 }}>
							<InputLabel>Objeto</InputLabel>
							<Select value={objeto} label="Objeto" onChange={(e) => setObjeto(e.target.value)}>
								<MenuItem value="">Todos</MenuItem>
								{(filtros?.objetos || []).map((o) => (
									<MenuItem key={o} value={o}>
										{o}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
					{vista === "duracion-juzgado-etapa" && (
						<FormControl size="small" sx={{ minWidth: 140 }}>
							<InputLabel>Juzgado</InputLabel>
							<Select value={juzgado} label="Juzgado" onChange={(e) => setJuzgado(e.target.value)}>
								<MenuItem value="">Todos</MenuItem>
								{(filtros?.juzgados || []).map((j) => (
									<MenuItem key={j} value={String(j)}>
										Juzgado {j}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
					{vista === "duracion-sala-etapa" && (
						<FormControl size="small" sx={{ minWidth: 140 }}>
							<InputLabel>Sala</InputLabel>
							<Select value={sala} label="Sala" onChange={(e) => setSala(e.target.value)}>
								<MenuItem value="">Todas</MenuItem>
								{(filtros?.salas || []).map((s) => (
									<MenuItem key={s} value={String(s)}>
										Sala {s}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
					{(esDuracion || vista === "transicion") && (
						<FormControl size="small" sx={{ minWidth: 200 }}>
							<InputLabel>Etapa</InputLabel>
							<Select value={etapa} label="Etapa" onChange={(e) => setEtapa(e.target.value)}>
								<MenuItem value="">Todas</MenuItem>
								{(filtros?.etapas || []).map((et) => (
									<MenuItem key={et} value={et}>
										{etiqueta(et)}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}
					<Box sx={{ flexGrow: 1 }} />
					{updatedAt && (
						<Typography variant="caption" sx={{ color: "text.secondary" }}>
							Actualizado: {new Date(updatedAt).toLocaleString("es-AR")}
						</Typography>
					)}
				</Stack>

				<Alert severity="info" sx={{ mb: 2 }}>
					Estadísticas calculadas sobre <b>etapas cerradas</b> (con inicio y fin) de ~2.7M causas del corpus PJN. Los grupos con menos de 5
					casos se excluyen. Duraciones en días corridos.
				</Alert>

				{vista === VISTA_PATRON ? (
					<PatronObjeto fuero={fuero} objeto={objeto} etiquetas={filtros?.etiquetas || {}} />
				) : loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : rows.length === 0 ? (
					<Alert severity="warning">Sin datos para este filtro.</Alert>
				) : (
					<>
						{esDuracion && chartData.length > 0 && (
							<Box sx={{ height: 300, mb: 3 }}>
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} vertical={false} />
										<XAxis
											dataKey="label"
											tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
											angle={-30}
											textAnchor="end"
											interval={0}
										/>
										<YAxis tick={{ fontSize: 11, fill: theme.palette.text.secondary }} unit=" d" width={56} />
										<Tooltip
											formatter={(value: any, name: any) => [`${value} días`, name === "p50" ? "Mediana (p50)" : "Percentil 90"]}
											labelStyle={{ color: theme.palette.text.primary }}
											contentStyle={{
												backgroundColor: theme.palette.background.paper,
												border: `1px solid ${theme.palette.divider}`,
												borderRadius: 8,
												fontSize: 12,
											}}
										/>
										<Legend formatter={(v) => (v === "p50" ? "Mediana (p50)" : "Percentil 90")} wrapperStyle={{ fontSize: 12 }} />
										<Bar dataKey="p50" fill={colP50} radius={[4, 4, 0, 0]} maxBarSize={26} />
										<Bar dataKey="p90" fill={colP90} radius={[4, 4, 0, 0]} maxBarSize={26} />
									</BarChart>
								</ResponsiveContainer>
							</Box>
						)}

						<TableContainer sx={{ maxHeight: 560 }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow>
										{esDuracion && (
											<>
												<TableCell>Etapa</TableCell>
												{vista === "duracion-objeto-etapa" && <TableCell>Objeto</TableCell>}
												{vista === "duracion-juzgado-etapa" && <TableCell>Juzgado</TableCell>}
												{vista === "duracion-sala-etapa" && <TableCell>Sala</TableCell>}
												<TableCell align="right">Casos</TableCell>
												<TableCell align="right">Media</TableCell>
												<TableCell align="right">p25</TableCell>
												<TableCell align="right">p50</TableCell>
												<TableCell align="right">p75</TableCell>
												<TableCell align="right">p90</TableCell>
											</>
										)}
										{vista === "transicion" && (
											<>
												<TableCell>Desde</TableCell>
												<TableCell>Hacia</TableCell>
												<TableCell align="right">Casos</TableCell>
												<TableCell align="right">Duración media de la etapa</TableCell>
											</>
										)}
										{vista === "resultado" && (
											<>
												<TableCell>Objeto</TableCell>
												<TableCell>Resultado</TableCell>
												<TableCell align="right">Casos</TableCell>
												<TableCell align="right">Duración total media</TableCell>
												<TableCell align="right">Hasta sentencia (media)</TableCell>
											</>
										)}
										{vista === "conformidad" && (
											<>
												<TableCell>Objeto</TableCell>
												<TableCell>Conformidad</TableCell>
												<TableCell align="right">Casos</TableCell>
											</>
										)}
										{vista === "firma" && (
											<>
												<TableCell>Objeto</TableCell>
												<TableCell>Flujo (secuencia de etapas)</TableCell>
												<TableCell align="right">Casos</TableCell>
												<TableCell align="right">Duración total media</TableCell>
											</>
										)}
									</TableRow>
								</TableHead>
								<TableBody>
									{sorted.map((r) => (
										<TableRow key={r._id} hover>
											{esDuracion && (
												<>
													<TableCell>
														<Chip size="small" label={etiqueta(r.etapa)} sx={{ height: 22, fontWeight: 600 }} />
													</TableCell>
													{vista === "duracion-objeto-etapa" && (
														<TableCell sx={{ maxWidth: 280 }}>
															<Typography variant="body2" noWrap>
																{r.objeto || "—"}
															</Typography>
														</TableCell>
													)}
													{vista === "duracion-juzgado-etapa" && <TableCell>Juzgado {r.juzgado}</TableCell>}
													{vista === "duracion-sala-etapa" && <TableCell>Sala {r.sala}</TableCell>}
													<TableCell align="right">{r.n.toLocaleString("es-AR")}</TableCell>
													<TableCell align="right">{fmtDias(r.mean)}</TableCell>
													<TableCell align="right">{fmtDias(r.p25)}</TableCell>
													<TableCell align="right" sx={{ fontWeight: 700 }}>
														{fmtDias(r.p50)}
													</TableCell>
													<TableCell align="right">{fmtDias(r.p75)}</TableCell>
													<TableCell align="right">{fmtDias(r.p90)}</TableCell>
												</>
											)}
											{vista === "transicion" && (
												<>
													<TableCell>
														<Chip size="small" label={etiqueta(r.etapa)} sx={{ height: 22, fontWeight: 600 }} />
													</TableCell>
													<TableCell>
														<Chip size="small" variant="outlined" label={etiqueta(r.etapaSiguiente)} sx={{ height: 22 }} />
													</TableCell>
													<TableCell align="right">{r.n.toLocaleString("es-AR")}</TableCell>
													<TableCell align="right">{fmtDias(r.diasMean)}</TableCell>
												</>
											)}
											{vista === "resultado" && (
												<>
													<TableCell sx={{ maxWidth: 240 }}>
														<Typography variant="body2" noWrap>
															{r.objeto || "—"}
														</Typography>
													</TableCell>
													<TableCell sx={{ maxWidth: 340 }}>
														<Typography variant="body2" noWrap title={r.detalle || r.resultado}>
															{r.detalle || r.resultado}
														</Typography>
													</TableCell>
													<TableCell align="right">{r.n.toLocaleString("es-AR")}</TableCell>
													<TableCell align="right">{fmtDias(r.diasTotalesMean)}</TableCell>
													<TableCell align="right">{fmtDias(r.diasHastaSentenciaMean)}</TableCell>
												</>
											)}
											{vista === "conformidad" && (
												<>
													<TableCell sx={{ maxWidth: 280 }}>
														<Typography variant="body2" noWrap>
															{r.objeto || "—"}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip
															size="small"
															label={CONFORMIDAD_META[r.conformidad || ""]?.label || r.conformidad}
															color={CONFORMIDAD_META[r.conformidad || ""]?.color || "default"}
															variant="outlined"
															sx={{ height: 22, fontWeight: 600 }}
														/>
													</TableCell>
													<TableCell align="right">{r.n.toLocaleString("es-AR")}</TableCell>
												</>
											)}
											{vista === "firma" && (
												<>
													<TableCell sx={{ maxWidth: 220 }}>
														<Typography variant="body2" noWrap>
															{r.objeto || "—"}
														</Typography>
													</TableCell>
													<TableCell sx={{ maxWidth: 480 }}>
														<Typography variant="body2" noWrap title={r.firma}>
															{(r.firma || "").split(" > ").map((e) => etiqueta(e)).join(" → ")}
														</Typography>
													</TableCell>
													<TableCell align="right">{r.n.toLocaleString("es-AR")}</TableCell>
													<TableCell align="right">{fmtDias(r.diasTotalesMean)}</TableCell>
												</>
											)}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}
			</Box>
		</MainCard>
	);
};

export default EtapaStats;
