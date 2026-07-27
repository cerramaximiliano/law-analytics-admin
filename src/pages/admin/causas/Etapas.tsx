import { useEffect, useState } from "react";
import {
	Box,
	Stack,
	Grid,
	Typography,
	Chip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	InputAdornment,
	CircularProgress,
	Alert,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { ArrowDown2, SearchNormal1, Flag, PauseCircle, ArrowRight } from "iconsax-react";
import MainCard from "components/MainCard";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { enqueueSnackbar } from "notistack";
import EtapaStatsService, { CausaConEtapa, CausaContexto, SegmentoEtapa, ResumenDuracion } from "api/etapaStats";

const FUEROS = [
	{ value: "CNT", label: "Trabajo", causaType: "CausasTrabajo" },
	{ value: "CSS", label: "Seguridad Social", causaType: "CausasSegSoc" },
	{ value: "CIV", label: "Civil", causaType: "CausasCivil" },
	{ value: "COM", label: "Comercial", causaType: "CausasComercial" },
	{ value: "CAF", label: "Contencioso Adm. Federal", causaType: "CausasCAF" },
	{ value: "CCF", label: "Civil y Comercial Federal", causaType: "CausasCCF" },
];

// Color por fase (rank): primera instancia, sentencia, revisión, ejecución, terminada.
function faseColor(rank?: number | null): string {
	if (rank == null) return "#757575";
	if (rank < 60) return "#2962ff";
	if (rank < 70) return "#2e7d32";
	if (rank < 90) return "#7b1fa2";
	if (rank < 95) return "#ef6c00";
	return "#757575";
}

const FASES = [
	{ value: "primera_instancia", label: "Primera instancia" },
	{ value: "sentencia", label: "Sentencia" },
	{ value: "revision", label: "Revisión" },
	{ value: "ejecucion", label: "Ejecución" },
	{ value: "terminada", label: "Terminada" },
];

function fmt(d?: string | null): string {
	if (!d) return "—";
	try {
		return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return "—";
	}
}

// Busca la referencia de duración para una etapa (la más específica disponible).
function refPara(ctx: CausaContexto, etapa: string): { fuente: string; ref: ResumenDuracion } | null {
	const buscar = (rows: ResumenDuracion[], fuente: string) => {
		const r = rows.find((x) => x.etapa === etapa);
		return r ? { fuente, ref: r } : null;
	};
	return (
		buscar(ctx.referencia.porJuzgado, "juzgado") ||
		buscar(ctx.referencia.porSala, "sala") ||
		buscar(ctx.referencia.porObjeto, "objeto") ||
		buscar(ctx.referencia.porEtapa, "fuero")
	);
}

// Timeline vertical de etapas con comparativa contra las referencias.
function TimelineEtapas({ ctx }: { ctx: CausaContexto }) {
	const theme = useTheme();
	const tl: SegmentoEtapa[] = ctx.causa.etapaProcesal?.timeline || [];
	if (!tl.length) return <Typography variant="body2">Sin timeline de etapas.</Typography>;
	const etiqueta = (k?: string) => (k ? ctx.etiquetas[k] || k : "—");
	return (
		<Stack sx={{ pl: 1 }}>
			{tl.map((s, i) => {
				const color = faseColor(s.rank);
				const last = i === tl.length - 1;
				const abierto = !s.hasta;
				const ref = refPara(ctx, s.etapa);
				const excedeP90 = ref && s.dias != null && ref.ref.p90 != null && s.dias > ref.ref.p90;
				return (
					<Stack key={i} direction="row" spacing={1.5} sx={{ position: "relative" }}>
						<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24 }}>
							<Box
								sx={{
									width: 18,
									height: 18,
									borderRadius: "50%",
									bgcolor: alpha(color, abierto ? 0.9 : 0.18),
									border: `2px solid ${color}`,
									flexShrink: 0,
								}}
							/>
							{!last && <Box sx={{ flexGrow: 1, width: 2, bgcolor: alpha(theme.palette.divider, 0.6), minHeight: 20 }} />}
						</Box>
						<Box sx={{ pb: last ? 0 : 1.5, flexGrow: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
								<Chip
									size="small"
									label={etiqueta(s.etapa)}
									sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, height: 22 }}
								/>
								{s.retroceso && <Chip size="small" label="retroceso" color="warning" variant="outlined" sx={{ height: 20 }} />}
								{abierto && <Chip size="small" label="vigente" color="success" variant="outlined" sx={{ height: 20 }} />}
								<Typography variant="caption" sx={{ color: "text.secondary" }}>
									{fmt(s.desde)} → {abierto ? "…" : fmt(s.hasta)}
								</Typography>
								<Typography variant="caption" sx={{ fontWeight: 700, color: excedeP90 ? theme.palette.error.main : "text.primary" }}>
									{s.dias != null ? `${s.dias} d` : ""}
								</Typography>
								{ref && (
									<Typography variant="caption" sx={{ color: "text.secondary" }}>
										· referencia ({ref.fuente}): p50 {ref.ref.p50 ?? "—"} d / p90 {ref.ref.p90 ?? "—"} d ({ref.ref.n.toLocaleString("es-AR")}{" "}
										casos)
									</Typography>
								)}
							</Stack>
						</Box>
					</Stack>
				);
			})}
		</Stack>
	);
}

// Proyección: transiciones históricas desde la etapa actual.
function Proyeccion({ ctx }: { ctx: CausaContexto }) {
	const ep = ctx.causa.etapaProcesal;
	const etiqueta = (k?: string) => (k ? ctx.etiquetas[k] || k : "—");
	if (!ep?.etapaActual || ep.terminal) return null;
	const total = ctx.transiciones.reduce((a, t) => a + t.n, 0);
	if (!total) return null;
	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				Proyección desde “{etiqueta(ep.etapaActual)}” (histórico del fuero)
			</Typography>
			<Stack spacing={0.5}>
				{ctx.transiciones.slice(0, 5).map((t) => (
					<Stack key={t._id} direction="row" spacing={1} alignItems="center">
						<ArrowRight size={14} />
						<Typography variant="body2" sx={{ minWidth: 210, fontWeight: 600 }}>
							{etiqueta(t.etapaSiguiente)}
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							{Math.round((100 * t.n) / total)}% de los casos · {t.diasMean} d promedio en la etapa actual · n=
							{t.n.toLocaleString("es-AR")}
						</Typography>
					</Stack>
				))}
			</Stack>
		</Box>
	);
}

// Resultados históricos frecuentes para el objeto de la causa.
function ResultadosFrecuentes({ ctx }: { ctx: CausaContexto }) {
	if (!ctx.resultados.length) return null;
	const total = ctx.resultados.reduce((a, r) => a + r.n, 0);
	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				Cómo suelen terminar las causas de “{ctx.causa.objeto}”
			</Typography>
			<Stack spacing={0.5}>
				{ctx.resultados.slice(0, 5).map((r) => (
					<Stack key={r._id} direction="row" spacing={1} alignItems="center">
						<Flag size={14} />
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							<b>{Math.round((100 * r.n) / total)}%</b> {(r.detalle || r.resultado || "").toLowerCase()} · {r.diasTotalesMean ?? "—"} d
							totales promedio
						</Typography>
					</Stack>
				))}
			</Stack>
		</Box>
	);
}

function DetalleCausa({ causaType, causaId }: { causaType: string; causaId: string }) {
	const [ctx, setCtx] = useState<CausaContexto | null>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		let active = true;
		setLoading(true);
		EtapaStatsService.causaContext(causaType, causaId)
			.then((r) => active && setCtx(r.data))
			.catch(() => active && enqueueSnackbar("Error al cargar el detalle de la causa", { variant: "error" }))
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [causaType, causaId]);

	if (loading)
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
				<CircularProgress size={22} />
			</Box>
		);
	if (!ctx) return <Alert severity="warning">No se pudo cargar el contexto.</Alert>;
	const ep = ctx.causa.etapaProcesal;
	return (
		<Stack spacing={2}>
			<TimelineEtapas ctx={ctx} />
			{ep?.terminal && ep.resultado && (
				<Alert severity="info" icon={<Flag size={18} />}>
					Terminada: <b>{ep.resultado.detalle || ep.resultado.etapa}</b>
				</Alert>
			)}
			{(!ep?.terminal || ctx.resultados.length > 0) && <Divider />}
			<Proyeccion ctx={ctx} />
			<ResultadosFrecuentes ctx={ctx} />
			<Typography variant="caption" sx={{ color: "text.secondary" }}>
				Datos al {fmt(ep?.asOf)} (último movimiento conocido) · confianza de clasificación {Math.round((ep?.confianza || 0) * 100)}% · reglas
				v{ep?.version}
			</Typography>
		</Stack>
	);
}

const Etapas = () => {
	const theme = useTheme();
	const [fuero, setFuero] = useState("CNT");
	const [fase, setFase] = useState("");
	const [etapaActual, setEtapaActual] = useState("");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [etapas, setEtapas] = useState<string[]>([]);
	const [etiquetas, setEtiquetas] = useState<Record<string, string>>({});
	const [data, setData] = useState<CausaConEtapa[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [loading, setLoading] = useState(false);

	const causaType = FUEROS.find((f) => f.value === fuero)?.causaType || "CausasTrabajo";

	useEffect(() => {
		EtapaStatsService.filtros(fuero)
			.then((r) => {
				setEtapas(r.data.etapas || []);
				setEtiquetas(r.data.etiquetas || {});
			})
			.catch(() => {});
	}, [fuero]);

	useEffect(() => {
		const t = setTimeout(() => setSearch(searchInput), 450);
		return () => clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		let active = true;
		setLoading(true);
		EtapaStatsService.causas({ fuero, etapaActual: etapaActual || undefined, fase: fase || undefined, search: search || undefined, page: page + 1, limit: rowsPerPage })
			.then((r) => {
				if (!active) return;
				setData(r.data || []);
				setTotal(r.count || 0);
			})
			.catch(() => {
				if (!active) return;
				enqueueSnackbar("Error al cargar las causas", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			})
			.finally(() => active && setLoading(false));
		return () => {
			active = false;
		};
	}, [fuero, etapaActual, fase, search, page, rowsPerPage]);

	const etiqueta = (k?: string | null) => (k ? etiquetas[k] || k : "—");

	return (
		<MainCard title="Etapas procesales por causa (PJN)" content={false}>
			<Box sx={{ p: 2 }}>
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
					<FormControl size="small" sx={{ minWidth: 170 }}>
						<InputLabel>Fuero</InputLabel>
						<Select
							value={fuero}
							label="Fuero"
							onChange={(e) => {
								setPage(0);
								setEtapaActual("");
								setFuero(e.target.value);
							}}
						>
							{FUEROS.map((f) => (
								<MenuItem key={f.value} value={f.value}>
									{f.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 180 }}>
						<InputLabel>Fase</InputLabel>
						<Select
							value={fase}
							label="Fase"
							onChange={(e) => {
								setPage(0);
								setFase(e.target.value);
							}}
						>
							<MenuItem value="">Todas</MenuItem>
							{FASES.map((f) => (
								<MenuItem key={f.value} value={f.value}>
									{f.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 200 }}>
						<InputLabel>Etapa actual</InputLabel>
						<Select
							value={etapaActual}
							label="Etapa actual"
							onChange={(e) => {
								setPage(0);
								setEtapaActual(e.target.value);
							}}
						>
							<MenuItem value="">Todas</MenuItem>
							{etapas.map((et) => (
								<MenuItem key={et} value={et}>
									{etiqueta(et)}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<TextField
						size="small"
						placeholder="Buscar por carátula…"
						value={searchInput}
						onChange={(e) => {
							setPage(0);
							setSearchInput(e.target.value);
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={16} />
								</InputAdornment>
							),
						}}
						sx={{ minWidth: 240 }}
					/>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{total.toLocaleString("es-AR")} causa{total === 1 ? "" : "s"}
					</Typography>
				</Stack>

				<Alert severity="info" sx={{ mb: 2 }}>
					Timeline de etapas derivado de los movimientos de cada expediente, comparado contra las estadísticas del corpus completo (~2.7M
					causas): cada etapa muestra su duración y la referencia p50/p90 más específica disponible (juzgado/sala → objeto → fuero). Los
					datos reflejan el estado al último movimiento conocido.
				</Alert>

				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : data.length === 0 ? (
					<Alert severity="warning">No hay causas con etapa computada para este filtro.</Alert>
				) : (
					<Grid container spacing={1.5}>
						{data.map((c) => {
							const ep = c.etapaProcesal;
							const color = faseColor(ep?.rankActual);
							const seg = (ep?.timeline || [])[ep?.timeline ? ep.timeline.length - 1 : 0];
							return (
								<Grid item xs={12} key={c._id}>
									<Accordion
										disableGutters
										TransitionProps={{ unmountOnExit: true }}
										sx={{
											border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
											borderRadius: 1.5,
											"&:before": { display: "none" },
											bgcolor: theme.palette.background.paper,
										}}
									>
										<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
											<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ width: "100%" }}>
												<Typography sx={{ fontWeight: 700 }}>
													{c.number}/{c.year}
												</Typography>
												<Typography variant="body2" sx={{ color: "text.secondary", flexGrow: 1, minWidth: 160 }} noWrap>
													{c.caratula || "—"}
												</Typography>
												<Chip
													size="small"
													label={etiqueta(ep?.etapaActual)}
													sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 700, height: 22 }}
												/>
												{seg?.dias != null && <Chip size="small" variant="outlined" label={`${seg.dias} d en etapa`} sx={{ height: 22 }} />}
												{ep?.terminal && <Chip size="small" label="terminada" sx={{ height: 22 }} />}
												{ep?.paralizado && (
													<Chip size="small" icon={<PauseCircle size={12} />} label="paralizada" color="warning" variant="outlined" sx={{ height: 22 }} />
												)}
												{c.objeto && <Chip size="small" variant="outlined" label={c.objeto.slice(0, 32)} sx={{ height: 22, maxWidth: 260 }} />}
												{c.juzgado != null && <Chip size="small" label={`Juz. ${c.juzgado}`} sx={{ height: 22 }} />}
											</Stack>
										</AccordionSummary>
										<AccordionDetails sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`, pt: 2 }}>
											<DetalleCausa causaType={causaType} causaId={c._id} />
										</AccordionDetails>
									</Accordion>
								</Grid>
							);
						})}
					</Grid>
				)}

				<Box sx={{ mt: 2 }}>
					<EnhancedTablePagination
						count={total}
						page={page}
						rowsPerPage={rowsPerPage}
						onPageChange={(_e, p) => setPage(p)}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 25, 50]}
					/>
				</Box>
			</Box>
		</MainCard>
	);
};

export default Etapas;
