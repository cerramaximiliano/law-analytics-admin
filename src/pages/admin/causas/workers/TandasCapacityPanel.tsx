import React, { useState, useEffect, useCallback } from "react";
import {
	Alert,
	Box,
	Card,
	CardContent,
	Chip,
	Grid,
	IconButton,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Activity, Clock, Cpu, Refresh2, Timer, TickCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import { formatInTimezone } from "utils/dayjs-config";
import { WorkersService, TandasCapacityData, AppUpdateTanda, TandaAlerta, TandaFueroCapacity } from "api/workers";

/**
 * Tab "Capacidad" del app-update: reemplaza al simulador teórico por lo que
 * la flota mide de verdad. Una tanda es el drenado completo de los elegibles
 * de un fuero; la de apertura (08:00 ART, todo el pool vencido) dice cuánto
 * tarda la flota en pasar una vez por todos los documentos, y de ahí salen
 * las alertas para tocar umbral, procesos o servidor.
 */

const FUERO_LABEL: Record<string, string> = { civil: "Civil", ss: "Seg. Social", trabajo: "Trabajo", comercial: "Comercial" };
const CIERRE_LABEL: Record<string, string> = {
	sin_elegibles: "sin elegibles",
	gap: "gap 10 min",
	cierre_horario: "fin de horario",
	manual: "manual",
};

const hhmm = (d?: string | null) => (d ? formatInTimezone(d, "HH:mm") : "--:--");
const num = (n: number | null | undefined, suf = "") => (n === null || n === undefined ? "—" : `${n.toLocaleString("es-AR")}${suf}`);

interface StatCardProps {
	title: string;
	value: string;
	subtitle?: string;
	icon: React.ReactNode;
	color: string;
	loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, loading }) => (
	<Card sx={{ height: "100%", bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.2)}` }}>
		<CardContent sx={{ py: 1.5 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
				<Box>
					<Typography variant="caption" color="text.secondary">
						{title}
					</Typography>
					{loading ? (
						<Skeleton width={60} height={32} />
					) : (
						<Typography variant="h4" fontWeight={600} color={color} sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
							{value}
						</Typography>
					)}
					{subtitle && (
						<Typography variant="caption" color="text.secondary">
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(color, 0.1), color }}>{icon}</Box>
			</Stack>
		</CardContent>
	</Card>
);

const TandasCapacityPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [data, setData] = useState<TandasCapacityData | null>(null);
	const [recientes, setRecientes] = useState<AppUpdateTanda[]>([]);

	const fetchData = useCallback(async () => {
		try {
			setRefreshing(true);
			const [cap, last] = await Promise.all([WorkersService.getTandasCapacity(), WorkersService.getTandasLast({ n: 30 })]);
			if (cap.success) setData(cap.data);
			if (last.success) setRecientes(last.data);
		} catch (err: any) {
			enqueueSnackbar(err?.message || "Error al cargar la capacidad", { variant: "error" });
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Semáforo de utilización: verde en el rango sano, ámbar cerca de los umbrales de alerta, rojo saturado
	const colorUtilizacion = (pct: number | null) => {
		if (pct === null) return theme.palette.grey[500];
		if (pct > 100) return theme.palette.error.main;
		if (pct > (data?.umbralesAlerta.utilizacionAltaPct ?? 70)) return theme.palette.warning.main;
		return theme.palette.success.main;
	};
	const colorPctUmbral = (pct: number | null) => {
		if (pct === null) return "default" as const;
		if (pct > 100) return "error" as const;
		if (pct > (data?.umbralesAlerta.tandaVsUmbralPct ?? 80)) return "warning" as const;
		return "success" as const;
	};

	const alertas: Array<TandaAlerta & { fuero?: string }> = data
		? [...data.flota.alertas, ...data.fueros.flatMap((f) => f.alertas.map((a) => ({ ...a, fuero: f.fuero })))]
		: [];

	const flota = data?.flota;
	const config = data?.config;

	return (
		<Stack spacing={2.5}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Box>
					<Typography variant="h5" fontWeight={600}>
						Capacidad real de la flota
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Medida sobre tandas: cada vez que un fuero drena todos sus elegibles.{" "}
						{config && (
							<>
								{config.procesosFlota} procesos ({config.maxWorkers} por fuero), horario {String(config.workStartHour).padStart(2, "0")}:00–
								{String(config.workEndHour).padStart(2, "0")}:00 ART ({config.horasLaborales} h), ayuda entre fueros activa.
							</>
						)}
						{data && ` Generado ${formatInTimezone(data.generadoEn, "DD/MM HH:mm")}.`}
					</Typography>
				</Box>
				<Tooltip title="Actualizar">
					<IconButton onClick={fetchData} disabled={refreshing} size="small">
						<Refresh2 size={20} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Alertas */}
			{!loading &&
				(alertas.length === 0 ? (
					<Alert severity="success" icon={<TickCircle size={20} />}>
						Sin alertas: la configuración actual cubre la demanda.
					</Alert>
				) : (
					<Stack spacing={1}>
						{alertas.map((a, i) => (
							<Alert key={`${a.codigo}-${a.fuero ?? "flota"}-${i}`} severity={a.nivel}>
								<strong>{a.fuero ? FUERO_LABEL[a.fuero] ?? a.fuero : "Flota"}:</strong> {a.mensaje}
							</Alert>
						))}
					</Stack>
				))}

			{/* Flota */}
			<Grid container spacing={2}>
				<Grid item xs={6} md={3}>
					<StatCard
						title="Utilización diaria"
						value={num(flota?.utilizacionPct, " %")}
						subtitle={flota ? `${num(flota.demandaDiaria)} updates/día pedidos de ${num(flota.capacidadDiaria)} posibles` : undefined}
						icon={<Activity size={20} />}
						color={colorUtilizacion(flota?.utilizacionPct ?? null)}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						title="Ritmo de la flota"
						value={num(flota?.docsPorMinFlota, " docs/min")}
						subtitle={flota ? `${flota.segPorDocFlota} s por documento y proceso` : undefined}
						icon={<Timer size={20} />}
						color={theme.palette.primary.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						title="Pool total"
						value={num(flota?.poolTotal)}
						subtitle="causas con update activo en los 4 fueros"
						icon={<Cpu size={20} />}
						color={theme.palette.info.main}
						loading={loading}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<StatCard
						title="Procesados hoy"
						value={num(data?.fueros.reduce((s, f) => s + f.procesadosHoy, 0))}
						subtitle={data ? `${data.fueros.reduce((s, f) => s + f.tandasHoy, 0)} tandas registradas hoy` : undefined}
						icon={<Clock size={20} />}
						color={theme.palette.success.main}
						loading={loading}
					/>
				</Grid>
			</Grid>

			{/* Por fuero */}
			<Card>
				<CardContent>
					<Typography variant="h6" fontWeight={600} gutterBottom>
						Por fuero — tanda de apertura más reciente
					</Typography>
					<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
						"% umbral" = duración de la tanda de apertura sobre el umbral del fuero: si supera el 100 %, el fuero no llega a refrescar todo
						su pool antes de que vuelva a vencer. "Pool máx." es cuántas causas drenan los procesos propios dentro del umbral, sin ayuda de
						otros fueros.
					</Typography>
					{loading ? (
						<Skeleton variant="rectangular" height={200} />
					) : (
						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fuero</TableCell>
										<TableCell align="right">Procesos</TableCell>
										<TableCell align="right">Pool</TableCell>
										<TableCell align="right">Elegibles ahora</TableCell>
										<TableCell align="right">Umbral</TableCell>
										<TableCell>Tanda de apertura</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell align="right">% umbral</TableCell>
										<TableCell align="right">s/doc (p90)</TableCell>
										<TableCell align="right">Éxito</TableCell>
										<TableCell align="right">Ayuda</TableCell>
										<TableCell align="right">Load</TableCell>
										<TableCell align="right">Pool máx.</TableCell>
										<TableCell align="right">Hoy</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data?.fueros.map((f: TandaFueroCapacity) => {
										const t = f.tandaApertura;
										const r = t?.resumen;
										return (
											<TableRow key={f.fuero} hover>
												<TableCell>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<Typography variant="body2" fontWeight={600}>
															{FUERO_LABEL[f.fuero] ?? f.fuero}
														</Typography>
														{f.abierta && <Chip size="small" color="info" label={`abierta #${f.abierta.numero}`} />}
														{!f.config && <Chip size="small" color="error" label="sin config" />}
													</Stack>
												</TableCell>
												<TableCell align="right">{f.procesosPropios}</TableCell>
												<TableCell align="right">{num(f.pool)}</TableCell>
												<TableCell align="right">
													{num(f.elegiblesAhora)}
													{f.enProceso > 0 && (
														<Typography component="span" variant="caption" color="text.secondary">
															{" "}
															(+{f.enProceso} en curso)
														</Typography>
													)}
												</TableCell>
												<TableCell align="right">{num(f.kpis.umbralHoras, " h")}</TableCell>
												<TableCell>
													{t ? (
														<Typography variant="body2">
															{formatInTimezone(t.inicio, "DD/MM")} {hhmm(t.inicio)}–{hhmm(t.fin ?? t.ultimoDocAt)} · {t.procesados} docs
														</Typography>
													) : (
														<Typography variant="caption" color="text.secondary">
															todavía sin tanda de apertura
														</Typography>
													)}
												</TableCell>
												<TableCell align="right">{num(r?.duracionMin, " min")}</TableCell>
												<TableCell align="right">
													{f.kpis.duracionVsUmbralPct !== null ? (
														<Chip
															size="small"
															color={colorPctUmbral(f.kpis.duracionVsUmbralPct)}
															label={`${f.kpis.duracionVsUmbralPct} %`}
														/>
													) : (
														"—"
													)}
												</TableCell>
												<TableCell align="right">
													{r ? `${r.segPorDocPromedio ?? "—"} (${r.segPorDocP90 ?? "—"})` : `${f.kpis.segPorDoc} est.`}
												</TableCell>
												<TableCell align="right">{num(r?.tasaExito, " %")}</TableCell>
												<TableCell align="right">{f.kpis.ayudaPct !== null ? `${f.kpis.ayudaPct} %` : "—"}</TableCell>
												<TableCell align="right">{num(r?.loadPromedio)}</TableCell>
												<TableCell align="right">{num(f.kpis.poolMaxPropio)}</TableCell>
												<TableCell align="right">
													{f.tandasHoy} t. / {f.procesadosHoy} docs
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</CardContent>
			</Card>

			{/* Tandas recientes */}
			<Card>
				<CardContent>
					<Typography variant="h6" fontWeight={600} gutterBottom>
						Últimas tandas
					</Typography>
					{loading ? (
						<Skeleton variant="rectangular" height={200} />
					) : recientes.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Todavía no hay tandas registradas. Se escriben desde el worker con cada documento procesado; la primera aparece con la próxima
							ronda de elegibles.
						</Typography>
					) : (
						<TableContainer sx={{ overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell align="right">#</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Horario</TableCell>
										<TableCell align="right">Elegibles / pool</TableCell>
										<TableCell align="right">Docs (ok / fall / om)</TableCell>
										<TableCell align="right">Movs</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell align="right">s/doc (p50 / p90)</TableCell>
										<TableCell align="right">docs/min</TableCell>
										<TableCell align="right">Éxito</TableCell>
										<TableCell align="right">Procesos</TableCell>
										<TableCell align="right">Load</TableCell>
										<TableCell>Cierre</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{recientes.map((t) => {
										const r = t.resumen;
										return (
											<TableRow key={t._id} hover>
												<TableCell>{formatInTimezone(t.inicio, "DD/MM")}</TableCell>
												<TableCell>{FUERO_LABEL[t.fuero] ?? t.fuero}</TableCell>
												<TableCell align="right">{t.numero}</TableCell>
												<TableCell>
													<Chip
														size="small"
														variant="outlined"
														color={r.esDeApertura ? "primary" : "default"}
														label={r.esDeApertura ? "apertura" : "goteo"}
													/>
												</TableCell>
												<TableCell>
													{hhmm(t.inicio)}–{hhmm(t.fin ?? t.ultimoDocAt)}
												</TableCell>
												<TableCell align="right">
													{t.elegiblesAlInicio} / {t.pool}
												</TableCell>
												<TableCell align="right">
													{t.procesados} ({t.ok} / {t.fallidos} / {t.omitidos})
												</TableCell>
												<TableCell align="right">{t.movimientosFound}</TableCell>
												<TableCell align="right">{num(r.duracionMin, " min")}</TableCell>
												<TableCell align="right">
													{r.segPorDocPromedio ?? "—"} ({r.segPorDocP50 ?? "—"} / {r.segPorDocP90 ?? "—"})
												</TableCell>
												<TableCell align="right">{num(r.docsPorMin)}</TableCell>
												<TableCell align="right">{num(r.tasaExito, " %")}</TableCell>
												<TableCell align="right">
													{r.procesos}
													{r.procesosAyuda > 0 && (
														<Typography component="span" variant="caption" color="text.secondary">
															{" "}
															({r.procesosAyuda} ayuda, {r.docsAyuda} docs)
														</Typography>
													)}
												</TableCell>
												<TableCell align="right">{num(r.loadPromedio)}</TableCell>
												<TableCell>
													{t.estado === "abierta" ? (
														<Chip size="small" color="info" label="abierta" />
													) : (
														<Chip
															size="small"
															variant="outlined"
															color={t.motivoCierre === "cierre_horario" ? "warning" : "default"}
															label={CIERRE_LABEL[t.motivoCierre ?? ""] ?? t.motivoCierre}
														/>
													)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</CardContent>
			</Card>

			{data && (
				<Typography variant="caption" color="text.secondary">
					Alertas: tanda de apertura &gt; {data.umbralesAlerta.tandaVsUmbralPct} % del umbral · utilización &gt;{" "}
					{data.umbralesAlerta.utilizacionAltaPct} % o &lt; {data.umbralesAlerta.utilizacionBajaPct} % · s/doc &gt;{" "}
					{data.umbralesAlerta.segPorDocFactor}× el baseline del fuero · éxito &lt; {data.umbralesAlerta.tasaExitoMinPct} % · load &gt;{" "}
					{data.umbralesAlerta.loadAlto} por CPU · ayuda &gt; {data.umbralesAlerta.ayudaMaxPct} % · última tanda cerrada por fin de horario.
					Utilización = (pool × rondas que exige el umbral por jornada) / (procesos × horas × 3600 / s por doc).
				</Typography>
			)}
		</Stack>
	);
};

export default TandasCapacityPanel;
