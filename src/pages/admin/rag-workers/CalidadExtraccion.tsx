import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	IconButton,
	Paper,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Refresh } from "iconsax-react";
import RagExtraccionService, { CalidadExtraccion as DatosCalidad, EtapaAvance, MetricasCalidad } from "api/ragExtraccion";

// Calidad de la extracción (F2): censo diario que pjn-rag-workers (scripts/censo-calidad.js, cron 04:30 UTC) guarda en
// rs0 `rag-calidad` y sirve pjn-rag-api (/rag/admin/extraccion/calidad). Última corrida por etapa y la curva de 14 días
// de las dos métricas que disparan la alerta `calidad_baja` (páginas sin texto tras OCR y documentos casi vacíos).

const ETAPAS: Array<{ k: EtapaAvance; corto: string }> = [
	{ k: "cedulas", corto: "Cédulas" },
	{ k: "escritos", corto: "Escritos" },
	{ k: "deo", corto: "DEO" },
];
const DIAS = 14;

const n = (v?: number | null) => (typeof v === "number" ? Math.round(v).toLocaleString("es-AR") : "—");
const pct = (v?: number | null) => (typeof v === "number" ? `${v.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %` : "—");
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
const diaHora = (iso: string) =>
	new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

type Punto = { t: number; cedulas?: number; escritos?: number; deo?: number };

const TooltipPct = ({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ name: string; value: number; color: string }>;
	label?: number;
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
						{p.name}: {pct(p.value)}
					</Typography>
				</Stack>
			))}
		</Paper>
	);
};

const CalidadExtraccion = () => {
	const theme = useTheme();
	const [datos, setDatos] = useState<DatosCalidad | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setDatos(await RagExtraccionService.calidad(DIAS));
			setError(null);
		} catch (e: any) {
			setError(e?.response?.data?.error || "No se pudo cargar la calidad");
		} finally {
			setCargando(false);
		}
	}, []);
	useEffect(() => {
		cargar();
	}, [cargar]);

	const colores: Record<EtapaAvance, string> = {
		cedulas: theme.palette.primary.main,
		escritos: theme.palette.warning.main,
		deo: theme.palette.success.main,
	};
	const series = useMemo(() => {
		const porFecha = (campo: keyof MetricasCalidad): Punto[] => {
			const mapa = new Map<number, Punto>();
			for (const h of datos?.historial || []) {
				const t = new Date(h.at).getTime();
				const p = mapa.get(t) || { t };
				p[h.etapa] = h.m[campo] as number;
				mapa.set(t, p);
			}
			return [...mapa.values()].sort((a, b) => a.t - b.t);
		};
		return { sinTexto: porFecha("pctPaginasSinTexto"), casiVacios: porFecha("pctCasiVacios") };
	}, [datos]);

	if (error) return <Alert severity="warning">{error}</Alert>;
	if (!datos) return <Skeleton variant="rectangular" height={260} />;
	const etapas = ETAPAS.filter((e) => datos.ultimo[e.k]);
	if (!etapas.length) return <Alert severity="info">Todavía no hay censo de calidad (pjn-rag-calidad corre a las 04:30 UTC).</Alert>;
	const alertas = etapas.flatMap((e) => datos.ultimo[e.k]?.alertas || []);
	const fecha = datos.ultimo[etapas[0].k]?.at;
	const ejeComun = {
		dataKey: "t",
		type: "number" as const,
		domain: ["dataMin", "dataMax"] as [string, string],
		tickFormatter: (t: number) => dia(new Date(t).toISOString()),
		tick: { fontSize: 11, fill: theme.palette.text.secondary },
		stroke: theme.palette.divider,
		minTickGap: 40,
	};
	const ejeY = { tick: { fontSize: 11, fill: theme.palette.text.secondary }, stroke: theme.palette.divider, width: 48 };
	const grafico = (titulo: string, nota: string, data: Punto[]) => (
		<Paper variant="outlined" sx={{ p: 1.5 }}>
			<Typography variant="subtitle2">{titulo}</Typography>
			<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
				{nota}
			</Typography>
			<Box sx={{ height: 180 }}>
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
						<CartesianGrid vertical={false} stroke={theme.palette.divider} />
						<XAxis {...ejeComun} />
						<YAxis {...ejeY} domain={[0, "auto"]} tickFormatter={(v: number) => `${v} %`} />
						<RechartsTooltip content={<TooltipPct />} cursor={{ stroke: theme.palette.divider }} />
						{etapas.map((e) => (
							<Line
								key={e.k}
								type="monotone"
								dataKey={e.k}
								name={e.corto}
								stroke={colores[e.k]}
								strokeWidth={2}
								dot={data.length < 3}
								activeDot={{ r: 4 }}
								connectNulls
								isAnimationActive={false}
							/>
						))}
					</LineChart>
				</ResponsiveContainer>
			</Box>
		</Paper>
	);

	return (
		<Stack spacing={1.5}>
			<Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1}>
				<Box>
					<Typography variant="subtitle1">Calidad de la extracción</Typography>
					<Typography variant="caption" color="text.secondary">
						Censo de las últimas {datos.ventanaHoras} h por etapa, {fecha ? `del ${diaHora(fecha)}` : ""} · corre a diario a las 04:30 UTC
						en worker_02 · alerta a Telegram si una métrica supera el umbral y duplica la corrida anterior
					</Typography>
				</Box>
				<Stack direction="row" alignItems="center" spacing={1}>
					{alertas.length > 0 ? (
						<Chip size="small" color="warning" label={`calidad_baja: ${alertas.length}`} />
					) : (
						<Chip size="small" color="success" variant="outlined" label="sin alertas" />
					)}
					<Tooltip title="Actualizar">
						<span>
							<IconButton size="small" aria-label="Actualizar calidad" onClick={cargar} disabled={cargando}>
								<Refresh size={16} />
							</IconButton>
						</span>
					</Tooltip>
				</Stack>
			</Stack>
			{alertas.length > 0 && <Alert severity="warning">{alertas.join(" · ")}</Alert>}
			<Paper variant="outlined" sx={{ overflowX: "auto" }}>
				<Table size="small" aria-label="Métricas de calidad por etapa">
					<TableHead>
						<TableRow>
							<TableCell>Etapa</TableCell>
							<TableCell align="right">Docs</TableCell>
							<TableCell align="right">Caracteres por doc</TableCell>
							<TableCell align="right">Por página</TableCell>
							<TableCell align="right">Con OCR</TableCell>
							<TableCell align="right">Páginas sin texto</TableCell>
							<TableCell align="right">Casi vacíos</TableCell>
							<TableCell align="right">Duplicados</TableCell>
							<TableCell align="right">Fallidos</TableCell>
							<TableCell align="right">Tiempo por doc</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{etapas.map((e) => {
							const m = datos.ultimo[e.k]!.metricas;
							return (
								<TableRow key={e.k}>
									<TableCell>
										<Stack direction="row" spacing={0.75} alignItems="center">
											<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colores[e.k] }} />
											<span>{e.corto}</span>
										</Stack>
									</TableCell>
									<TableCell align="right">{n(m.docs)}</TableCell>
									<TableCell align="right">{n(m.charsPorDoc)}</TableCell>
									<TableCell align="right">{n(m.charsPorPagina)}</TableCell>
									<TableCell align="right">{pct(m.pctDocsConOcr)}</TableCell>
									<TableCell align="right">{pct(m.pctPaginasSinTexto)}</TableCell>
									<TableCell align="right">{pct(m.pctCasiVacios)}</TableCell>
									<TableCell align="right">{pct(m.pctDuplicados)}</TableCell>
									<TableCell align="right">{pct(m.pctFallidos)}</TableCell>
									<TableCell align="right">{(m.msPorDoc / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} s</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</Paper>
			<Stack direction="row" spacing={2} sx={{ px: 0.5 }}>
				{etapas.map((e) => (
					<Stack key={e.k} direction="row" spacing={0.75} alignItems="center">
						<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colores[e.k] }} />
						<Typography variant="caption" color="text.secondary">
							{e.corto}
						</Typography>
					</Stack>
				))}
			</Stack>
			<Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
				<Box sx={{ flex: 1 }}>
					{grafico(
						"Páginas sin texto tras OCR",
						`Porcentaje de páginas leídas que quedaron sin texto, últimos ${DIAS} días.`,
						series.sinTexto,
					)}
				</Box>
				<Box sx={{ flex: 1 }}>
					{grafico(
						"Documentos casi vacíos",
						`Porcentaje de documentos con menos de 200 caracteres, últimos ${DIAS} días.`,
						series.casiVacios,
					)}
				</Box>
			</Stack>
		</Stack>
	);
};

export default CalidadExtraccion;
