import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Grid,
	IconButton,
	LinearProgress,
	Paper,
	Skeleton,
	Stack,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Refresh } from "iconsax-react";
import RagExtraccionService, { AvanceEtapa, AvanceExtraccion as DatosAvance, EtapaAvance } from "api/ragExtraccion";

// Avance de la extracción por etapa: foto horaria que guarda pjn-rag-workers (scripts/avance.js --guardar) en rs0
// `rag-avance` y sirve pjn-rag-api (/rag/admin/extraccion/avance). Tarjetas con el estado actual y tres curvas:
// completitud por etapa, cola y ritmo de la etapa elegida. Se vuelve a pedir sola cada 5 minutos.

const ETAPAS: Array<{ k: EtapaAvance; titulo: string; corto: string; docs: string }> = [
	{ k: "cedulas", titulo: "Cédulas electrónicas", corto: "Cédulas", docs: "cédulas" },
	{ k: "escritos", titulo: "Escritos de parte", corto: "Escritos", docs: "escritos" },
	{ k: "deo", titulo: "DEO", corto: "DEO", docs: "documentos" },
];
const VENTANAS: Array<{ horas: number; label: string }> = [
	{ horas: 24, label: "24 h" },
	{ horas: 48, label: "48 h" },
	{ horas: 24 * 7, label: "7 d" },
	{ horas: 24 * 30, label: "30 d" },
];
const REFRESCO_MS = 5 * 60 * 1000;

const n = (v?: number | null) => (typeof v === "number" ? Math.round(v).toLocaleString("es-AR") : "—");
const pct = (v?: number | null) => (typeof v === "number" ? `${v.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %` : "—");
const gb = (bytes?: number) => `${((bytes || 0) / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 1 })} GB`;
const eta = (h: number | null | undefined, cola: number) => {
	if (cola === 0 || h === 0) return "al día";
	if (h === null || h === undefined) return "sin ritmo";
	if (h < 1) return `${Math.round(h * 60)} min`;
	if (h < 48) return `${h.toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`;
	return `${(h / 24).toLocaleString("es-AR", { maximumFractionDigits: 1 })} d`;
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const diaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const hace = (iso: string) => {
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 1) return "recién";
	if (min < 120) return `hace ${min} min`;
	return `hace ${(min / 60).toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`;
};

type Punto = { at: string; t: number; cedulas?: number; escritos?: number; deo?: number; cola?: number; h1?: number | null };

const Dato = ({ k, v }: { k: string; v: React.ReactNode }) => (
	<Stack direction="row" justifyContent="space-between" spacing={1}>
		<Typography variant="caption" color="text.secondary">
			{k}
		</Typography>
		<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
			{v}
		</Typography>
	</Stack>
);

const TarjetaEtapa = ({ titulo, docs, r, color }: { titulo: string; docs: string; r: AvanceEtapa; color: string }) => {
	const aparte: string[] = [];
	if (r.deOtraEtapa) aparte.push(`${n(r.deOtraEtapa)} de cédulas en papel diligenciadas (etapa apagada)`);
	if (r.sinS3) aparte.push(`${n(r.sinS3)} pendientes sin PDF en S3`);
	if (r.otros) aparte.push(`${n(r.otros)} esperando OCR o sin acceso`);
	return (
		<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
			<Stack spacing={1}>
				<Box>
					<Stack direction="row" alignItems="center" spacing={0.75}>
						<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
						<Typography variant="caption" color="text.secondary">
							{titulo}
						</Typography>
					</Stack>
					<Stack direction="row" alignItems="baseline" spacing={1}>
						<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{pct(r.pct)}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{n(r.hecho)} de {n(r.total)} {docs}
						</Typography>
					</Stack>
					<LinearProgress
						variant="determinate"
						value={Math.min(100, r.pct)}
						aria-label={`${titulo}: ${Math.round(r.pct)} % terminado`}
						sx={{ height: 6, borderRadius: 3, mt: 0.5, "& .MuiLinearProgress-bar": { backgroundColor: color } }}
					/>
				</Box>
				<Stack spacing={0.25}>
					<Dato k="En cola" v={`${n(r.cola)} · ${gb(r.colaBytes)}`} />
					<Dato k="Ritmo última hora" v={`${n(r.ritmo?.h1)}/h`} />
					<Dato k="Entraron en 24 h" v={n(r.entrada24h)} />
					<Dato k="Tiempo para vaciar la cola" v={<strong>{eta(r.etaHoras, r.cola)}</strong>} />
				</Stack>
				{aparte.length > 0 && (
					<Typography variant="caption" color="text.secondary">
						Aparte: {aparte.join(" · ")}.
					</Typography>
				)}
			</Stack>
		</Paper>
	);
};

const TooltipSerie = ({
	active,
	payload,
	label,
	formato,
}: {
	active?: boolean;
	payload?: Array<{ name: string; value: number; color: string }>;
	label?: number;
	formato: (v: number) => string;
}) => {
	if (!active || !payload?.length || !label) return null;
	return (
		<Paper variant="outlined" sx={{ px: 1, py: 0.5 }}>
			<Typography variant="caption" color="text.secondary" display="block">
				{diaHora(new Date(label).toISOString())}
			</Typography>
			{payload.map((p) => (
				<Stack key={p.name} direction="row" spacing={0.75} alignItems="center">
					<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color }} />
					<Typography variant="caption">
						{p.name}: {formato(p.value)}
					</Typography>
				</Stack>
			))}
		</Paper>
	);
};

const Grafico = ({
	titulo,
	nota,
	children,
	alto = 220,
}: {
	titulo: string;
	nota?: string;
	children: React.ReactElement;
	alto?: number;
}) => (
	<Paper variant="outlined" sx={{ p: 1.5 }}>
		<Typography variant="subtitle2">{titulo}</Typography>
		{nota && (
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
				{nota}
			</Typography>
		)}
		<Box sx={{ height: alto }}>
			<ResponsiveContainer width="100%" height="100%">
				{children}
			</ResponsiveContainer>
		</Box>
	</Paper>
);

const AvanceExtraccion = () => {
	const theme = useTheme();
	const [datos, setDatos] = useState<DatosAvance | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);
	const [horas, setHoras] = useState(48);
	const [etapa, setEtapa] = useState<EtapaAvance>("escritos");

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setDatos(await RagExtraccionService.avance(horas));
			setError(null);
		} catch (e: any) {
			setError(e?.response?.data?.error || "No se pudo cargar el avance");
		} finally {
			setCargando(false);
		}
	}, [horas]);
	useEffect(() => {
		cargar();
		const t = setInterval(cargar, REFRESCO_MS);
		return () => clearInterval(t);
	}, [cargar]);

	const colores: Record<EtapaAvance, string> = {
		cedulas: theme.palette.primary.main,
		escritos: theme.palette.warning.main,
		deo: theme.palette.success.main,
	};
	const serie = useMemo<Punto[]>(
		() =>
			(datos?.historial || []).map((p) => {
				const e = p.etapas[etapa];
				return {
					at: p.at,
					t: new Date(p.at).getTime(),
					cedulas: p.etapas.cedulas?.pct,
					escritos: p.etapas.escritos?.pct,
					deo: p.etapas.deo?.pct,
					cola: e?.cola,
					h1: e?.h1 ?? null,
				};
			}),
		[datos, etapa],
	);
	const largo = horas > 48;
	const ejeX = (t: number) => (largo ? diaHora(new Date(t).toISOString()) : hora(new Date(t).toISOString()));
	const ejeComun = {
		dataKey: "t",
		type: "number" as const,
		domain: ["dataMin", "dataMax"] as [string, string],
		tickFormatter: ejeX,
		tick: { fontSize: 11, fill: theme.palette.text.secondary },
		stroke: theme.palette.divider,
		minTickGap: 40,
	};
	const ejeY = { tick: { fontSize: 11, fill: theme.palette.text.secondary }, stroke: theme.palette.divider, width: 56 };
	const minPct = useMemo(() => {
		const v = serie.flatMap((p) => [p.cedulas, p.escritos, p.deo]).filter((x): x is number => typeof x === "number");
		return v.length ? Math.max(0, Math.floor(Math.min(...v) / 10) * 10) : 0;
	}, [serie]);

	if (error) return <Alert severity="warning">{error}</Alert>;
	if (!datos) return <Skeleton variant="rectangular" height={420} />;
	if (!datos.ultimo)
		return <Alert severity="info">Todavía no hay fotos del avance (pjn-rag-avance en worker_02 las guarda cada hora).</Alert>;
	const u = datos.ultimo;
	const nombreEtapa = ETAPAS.find((e) => e.k === etapa)?.corto || etapa;
	return (
		<Stack spacing={1.5}>
			<Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1}>
				<Box>
					<Typography variant="subtitle1">Avance de la extracción</Typography>
					<Typography variant="caption" color="text.secondary">
						Foto de las {hora(u.at)} ({hace(u.at)}) · una por hora en {u.host || "worker_02"} · esta vista se actualiza sola cada 5 min · el
						mismo resumen va a Telegram a las 00/06/12/18 UTC
					</Typography>
				</Box>
				<Stack direction="row" alignItems="center" spacing={1}>
					<ToggleButtonGroup size="small" exclusive value={horas} onChange={(_e, v) => v && setHoras(v)} aria-label="Ventana de tiempo">
						{VENTANAS.map((v) => (
							<ToggleButton key={v.horas} value={v.horas}>
								{v.label}
							</ToggleButton>
						))}
					</ToggleButtonGroup>
					<Tooltip title="Actualizar">
						<span>
							<IconButton size="small" aria-label="Actualizar avance" onClick={cargar} disabled={cargando}>
								<Refresh size={16} />
							</IconButton>
						</span>
					</Tooltip>
				</Stack>
			</Stack>

			<Grid container spacing={1.5}>
				{ETAPAS.map((e) => {
					const r = u.resumenes[e.k];
					return r ? (
						<Grid item xs={12} md={4} key={e.k}>
							<TarjetaEtapa titulo={e.titulo} docs={e.docs} r={r} color={colores[e.k]} />
						</Grid>
					) : null;
				})}
			</Grid>

			<Grafico titulo="Completitud por etapa" nota="Porcentaje de documentos leídos sobre el total con PDF de cada etapa.">
				<LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
					<CartesianGrid vertical={false} stroke={theme.palette.divider} />
					<XAxis {...ejeComun} />
					<YAxis {...ejeY} domain={[minPct, 100]} tickFormatter={(v: number) => `${v} %`} />
					<RechartsTooltip content={<TooltipSerie formato={pct} />} cursor={{ stroke: theme.palette.divider }} />
					{ETAPAS.map((e) => (
						<Line
							key={e.k}
							type="monotone"
							dataKey={e.k}
							name={e.corto}
							stroke={colores[e.k]}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 4 }}
							connectNulls
							isAnimationActive={false}
						/>
					))}
				</LineChart>
			</Grafico>
			<Stack direction="row" spacing={2} sx={{ px: 0.5 }}>
				{ETAPAS.map((e) => (
					<Stack key={e.k} direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colores[e.k] }} />
						<Typography variant="caption" color="text.secondary">
							{e.corto} {pct(u.resumenes[e.k]?.pct)}
						</Typography>
					</Stack>
				))}
			</Stack>

			<Stack direction="row" alignItems="center" spacing={1}>
				<Typography variant="caption" color="text.secondary">
					Cola y ritmo de
				</Typography>
				<ToggleButtonGroup size="small" exclusive value={etapa} onChange={(_e, v) => v && setEtapa(v)} aria-label="Etapa">
					{ETAPAS.map((e) => (
						<ToggleButton key={e.k} value={e.k}>
							{e.corto}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</Stack>
			<Grid container spacing={1.5}>
				<Grid item xs={12} md={6}>
					<Grafico titulo={`Cola de ${nombreEtapa.toLowerCase()}`} nota="Documentos pendientes en cada foto." alto={200}>
						<AreaChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
							<CartesianGrid vertical={false} stroke={theme.palette.divider} />
							<XAxis {...ejeComun} />
							<YAxis {...ejeY} domain={[0, "auto"]} tickFormatter={(v: number) => n(v)} />
							<RechartsTooltip content={<TooltipSerie formato={n} />} cursor={{ stroke: theme.palette.divider }} />
							<Area
								type="monotone"
								dataKey="cola"
								name="Cola"
								stroke={colores[etapa]}
								strokeWidth={2}
								fill={colores[etapa]}
								fillOpacity={0.12}
								dot={false}
								activeDot={{ r: 4 }}
								connectNulls
								isAnimationActive={false}
							/>
						</AreaChart>
					</Grafico>
				</Grid>
				<Grid item xs={12} md={6}>
					<Grafico titulo={`Ritmo de ${nombreEtapa.toLowerCase()}`} nota="Documentos leídos en la hora anterior a cada foto." alto={200}>
						<LineChart data={serie} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
							<CartesianGrid vertical={false} stroke={theme.palette.divider} />
							<XAxis {...ejeComun} />
							<YAxis {...ejeY} domain={[0, "auto"]} tickFormatter={(v: number) => n(v)} />
							<RechartsTooltip content={<TooltipSerie formato={(v) => `${n(v)}/h`} />} cursor={{ stroke: theme.palette.divider }} />
							<Line
								type="monotone"
								dataKey="h1"
								name="Ritmo"
								stroke={colores[etapa]}
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
								connectNulls
								isAnimationActive={false}
							/>
						</LineChart>
					</Grafico>
				</Grid>
			</Grid>
		</Stack>
	);
};

export default AvanceExtraccion;
