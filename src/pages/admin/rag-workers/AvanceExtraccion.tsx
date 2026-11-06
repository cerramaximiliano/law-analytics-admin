import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Grid, IconButton, LinearProgress, Paper, Skeleton, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import { Area, AreaChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Refresh } from "iconsax-react";
import RagExtraccionService, { AvanceEtapa, AvanceExtraccion as DatosAvance, EtapaAvance } from "api/ragExtraccion";

// Avance de la extracción por etapa: foto horaria que guarda pjn-rag-workers (scripts/avance.js --guardar) en rs0
// `rag-avance` y sirve pjn-rag-api (/rag/admin/extraccion/avance). El mismo resumen va a Telegram cada 6 h.

const ETAPAS: Array<{ k: EtapaAvance; titulo: string; docs: string }> = [
	{ k: "cedulas", titulo: "Cédulas electrónicas", docs: "cédulas" },
	{ k: "escritos", titulo: "Escritos de parte", docs: "escritos" },
	{ k: "deo", titulo: "DEO", docs: "documentos" },
];
const HORAS = 48;

const n = (v?: number | null) => (typeof v === "number" ? Math.round(v).toLocaleString("es-AR") : "—");
const gb = (bytes?: number) => `${((bytes || 0) / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 1 })} GB`;
const eta = (h: number | null | undefined, cola: number) => {
	if (cola === 0 || h === 0) return "al día";
	if (h === null || h === undefined) return "sin ritmo";
	if (h < 1) return `${Math.round(h * 60)} min`;
	if (h < 48) return `${h.toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`;
	return `${(h / 24).toLocaleString("es-AR", { maximumFractionDigits: 1 })} d`;
};
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
const hace = (iso: string) => {
	const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
	if (min < 1) return "recién";
	if (min < 120) return `hace ${min} min`;
	return `hace ${(min / 60).toLocaleString("es-AR", { maximumFractionDigits: 1 })} h`;
};
const diaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

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

const TooltipCola = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
	if (!active || !payload?.length || !label) return null;
	return (
		<Paper variant="outlined" sx={{ px: 1, py: 0.5 }}>
			<Typography variant="caption" color="text.secondary">
				{diaHora(label)}
			</Typography>
			<Typography variant="caption" display="block">
				cola {n(payload[0].value)}
			</Typography>
		</Paper>
	);
};

const TarjetaEtapa = ({
	titulo,
	docs,
	r,
	serie,
}: {
	titulo: string;
	docs: string;
	r: AvanceEtapa;
	serie: Array<{ at: string; cola: number }>;
}) => {
	const theme = useTheme();
	const color = r.pct >= 95 ? theme.palette.success.main : theme.palette.primary.main;
	const aparte: string[] = [];
	if (r.deOtraEtapa) aparte.push(`${n(r.deOtraEtapa)} de cédulas en papel diligenciadas (etapa apagada)`);
	if (r.sinS3) aparte.push(`${n(r.sinS3)} pendientes sin PDF en S3`);
	if (r.otros) aparte.push(`${n(r.otros)} esperando OCR`);
	return (
		<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
			<Stack spacing={1}>
				<Box>
					<Typography variant="caption" color="text.secondary">
						{titulo}
					</Typography>
					<Stack direction="row" alignItems="baseline" spacing={1}>
						<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums" }}>
							{r.pct.toLocaleString("es-AR", { maximumFractionDigits: 1 })} %
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
					<Dato k="Promedio 24 h" v={`${n((r.ritmo?.h24 || 0) / 24)}/h`} />
					<Dato k="Entraron en 24 h" v={n(r.entrada24h)} />
					<Dato k="Tiempo para vaciar la cola" v={<strong>{eta(r.etaHoras, r.cola)}</strong>} />
				</Stack>
				{serie.length > 1 && (
					<Box sx={{ height: 72 }} aria-label={`Cola de ${docs} en las últimas ${HORAS} h`}>
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={serie} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
								<XAxis dataKey="at" hide />
								<YAxis hide domain={[0, "auto"]} />
								<RechartsTooltip content={<TooltipCola />} cursor={{ stroke: theme.palette.divider }} />
								<Area
									type="monotone"
									dataKey="cola"
									stroke={theme.palette.primary.main}
									strokeWidth={2}
									fill={theme.palette.primary.main}
									fillOpacity={0.12}
									dot={false}
									activeDot={{ r: 4 }}
									isAnimationActive={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
						<Typography variant="caption" color="text.secondary">
							cola en las últimas {HORAS} h
						</Typography>
					</Box>
				)}
				{aparte.length > 0 && (
					<Typography variant="caption" color="text.secondary">
						Aparte: {aparte.join(" · ")}.
					</Typography>
				)}
			</Stack>
		</Paper>
	);
};

const AvanceExtraccion = () => {
	const [datos, setDatos] = useState<DatosAvance | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setDatos(await RagExtraccionService.avance(HORAS));
			setError(null);
		} catch (e: any) {
			setError(e?.response?.data?.error || "No se pudo cargar el avance");
		} finally {
			setCargando(false);
		}
	}, []);
	useEffect(() => {
		cargar();
	}, [cargar]);

	const series = useMemo(() => {
		const out: Record<EtapaAvance, Array<{ at: string; cola: number }>> = { cedulas: [], escritos: [], deo: [] };
		for (const p of datos?.historial || []) {
			for (const e of ETAPAS) {
				const x = p.etapas[e.k];
				if (x) out[e.k].push({ at: p.at, cola: x.cola });
			}
		}
		return out;
	}, [datos]);

	if (error) return <Alert severity="warning">{error}</Alert>;
	if (!datos) return <Skeleton variant="rectangular" height={230} />;
	if (!datos.ultimo)
		return <Alert severity="info">Todavía no hay fotos del avance (pjn-rag-avance en worker_02 las guarda cada hora).</Alert>;
	const u = datos.ultimo;
	return (
		<Stack spacing={1}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="subtitle1">Avance de la extracción</Typography>
				<Stack direction="row" alignItems="center" spacing={0.5}>
					<Typography variant="caption" color="text.secondary">
						Foto de las {hora(u.at)} ({hace(u.at)}) · se toma cada hora en {u.host || "worker_02"}; el mismo resumen va a Telegram a las
						00/06/12/18 UTC
					</Typography>
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
							<TarjetaEtapa titulo={e.titulo} docs={e.docs} r={r} serie={series[e.k]} />
						</Grid>
					) : null;
				})}
			</Grid>
		</Stack>
	);
};

export default AvanceExtraccion;
