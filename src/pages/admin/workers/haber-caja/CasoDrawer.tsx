import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	Drawer,
	FormControlLabel,
	IconButton,
	Link,
	Paper,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { Add, CloseCircle, ExportSquare, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, { CasoDetalle, COMPONENTES, Correcciones, EstadoRevision, Tiempo, Tiempos } from "api/hcRelevamiento";
import { STALE_AMBER, headerBorder } from "themes/dashboardTokens";
import { EstadoChip, MotivoChip, fmtFechaHora, fmtNum, headSx, isoDia, COLOR_ESTADO, GRIS } from "./comun";
import { ListaCargas, SubirPrpa } from "./CargaPrpa";

interface Props {
	id: string | null;
	onClose: () => void;
	onGuardado: () => void;
}

const FECHAS = [
	["fad", "FAD"],
	["cese", "Cese"],
	["solicitud", "Solicitud"],
	["alta", "Alta"],
	["acuerdo", "Acuerdo"],
] as const;
const IMPRESOS = [
	["sumatoriaDep", "Sumatoria"],
	["W", "W"],
	["R", "R"],
	["PBU", "PBU"],
	["PC", "PC"],
	["PAP", "PAP"],
] as const;
const TRAMOS = [
	["antes", "Antes 7/1994"],
	["despues", "Después 7/1994"],
] as const;
const CLASES = [
	["dep", "Dependencia"],
	["aut", "Autónomo"],
	["sim", "Simultáneos"],
] as const;

type FilaForm = { periodo: string; hasta: string; meses: string; importe: string; moneda: string; dudosa?: boolean; pagina?: number };
type TiempoForm = { a: string; m: string; d: string };
type TiemposForm = Record<"antes" | "despues", Record<"dep" | "aut" | "sim", TiempoForm>> & { total: TiempoForm };

const tf = (t?: Tiempo | null): TiempoForm => ({ a: String(t?.a ?? 0), m: String(t?.m ?? 0), d: String(t?.d ?? 0) });
const mesesDe = (t: TiempoForm) => (Number(t.a) || 0) * 12 + (Number(t.m) || 0) + (Number(t.d) || 0) / 30;

function tiemposForm(t?: Tiempos): TiemposForm {
	return {
		antes: { dep: tf(t?.antes?.dep), aut: tf(t?.antes?.aut), sim: tf(t?.antes?.sim) },
		despues: { dep: tf(t?.despues?.dep), aut: tf(t?.despues?.aut), sim: tf(t?.despues?.sim) },
		total: tf(t?.total),
	};
}

export default function CasoDrawer({ id: idInicial, onClose, onGuardado }: Props) {
	// el caso que se ve puede cambiar dentro del panel (p. ej. al seguir a la lectura que reemplazó a esta)
	const [id, setId] = useState<string | null>(idInicial);
	useEffect(() => setId(idInicial), [idInicial]);
	const [recarga, setRecarga] = useState(0);
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [data, setData] = useState<CasoDetalle | null>(null);
	const [loading, setLoading] = useState(false);
	const [guardando, setGuardando] = useState(false);

	// formulario de corrección (cada sección se manda solo si se tocó)
	const [fechas, setFechas] = useState<Record<string, string>>({});
	const [impresos, setImpresos] = useState<Record<string, string>>({});
	const [periodo, setPeriodo] = useState({ desde: "", hasta: "" });
	const [tiempos, setTiempos] = useState<TiemposForm>(tiemposForm());
	const [moratoria, setMoratoria] = useState(false);
	const [filas, setFilas] = useState<FilaForm[]>([]);
	const [nota, setNota] = useState("");
	const [tocado, setTocado] = useState<Record<string, boolean>>({});
	const tocar = (k: string) => setTocado((x) => ({ ...x, [k]: true }));

	useEffect(() => {
		if (!id) return;
		let vivo = true;
		(async () => {
			try {
				setLoading(true);
				const d = await HcRelevamientoService.getCaso(id);
				if (!vivo) return;
				setData(d);
				const p = d.prpa;
				const c = d.revision?.estado === "corregida" ? d.revision.correcciones || {} : {};
				const f: Record<string, string> = {};
				for (const [k] of FECHAS) f[k] = c.fechas?.[k] || isoDia(p?.fechas?.[k]);
				setFechas(f);
				const im: Record<string, string> = {};
				for (const [k] of IMPRESOS) {
					const v = c.impresos?.[k] ?? (p?.impresos as any)?.[k];
					im[k] = v === null || v === undefined ? "" : String(v);
				}
				setImpresos(im);
				const per = c.periodoDep || p?.impresos?.periodoDep;
				setPeriodo({ desde: per?.desde || "", hasta: per?.hasta || "" });
				setTiempos(tiemposForm(c.tiempos || p?.tiempos?.tomado || p?.tiempos?.informado));
				setMoratoria(typeof c.moratoria === "boolean" ? c.moratoria : !!p?.moratoria);
				const fl = c.filas?.length
					? c.filas.map((r) => ({
							periodo: r.periodo,
							hasta: r.hasta || "",
							meses: r.meses ? String(r.meses) : "",
							importe: String(r.importe),
							moneda: r.moneda || "",
					  }))
					: (p?.prpa || []).map((r) => ({
							periodo: r.periodo,
							hasta: r.meses && r.meses > 1 && r.hasta ? String(r.hasta).slice(0, 7) : "",
							meses: r.meses && r.meses > 1 ? String(r.meses) : "",
							importe: String(r.importe ?? ""),
							moneda: r.moneda || "",
							dudosa: r.dudosa,
							pagina: r.pagina,
					  }));
				setFilas(fl);
				setNota(d.revision?.nota || "");
				setTocado(Object.fromEntries(Object.keys(c).map((k) => [k === "periodoDep" ? "periodo" : k, true])));
			} catch (err: any) {
				enqueueSnackbar(err?.response?.data?.message || "Error cargando el caso", { variant: "error" });
			} finally {
				if (vivo) setLoading(false);
			}
		})();
		return () => {
			vivo = false;
		};
	}, [id, recarga, enqueueSnackbar]);

	const sumaFilas = useMemo(() => filas.reduce((s, f) => s + (Number(f.importe) || 0), 0), [filas]);
	const sumaTramos = useMemo(() => TRAMOS.reduce((s, [t]) => s + CLASES.reduce((x, [k]) => x + mesesDe(tiempos[t][k]), 0), 0), [tiempos]);
	const totalTiempos = mesesDe(tiempos.total);

	const ev = data?.evaluacion;
	const p = data?.prpa;
	const huecos: string[] = p?.calidad?.controles?.filas?.huecos || [];

	const guardar = async (estado: EstadoRevision) => {
		if (!id) return;
		const body: { estado: EstadoRevision; correcciones?: Correcciones; nota?: string } = { estado, nota: nota || undefined };
		if (estado === "corregida") {
			const c: Correcciones = {};
			if (tocado.fechas) c.fechas = Object.fromEntries(Object.entries(fechas).filter(([, v]) => v)) as Correcciones["fechas"];
			if (tocado.impresos)
				c.impresos = Object.fromEntries(
					Object.entries(impresos)
						.filter(([, v]) => v !== "")
						.map(([k, v]) => [k, Number(v)]),
				) as Correcciones["impresos"];
			if (tocado.periodo && periodo.desde && periodo.hasta) c.periodoDep = periodo;
			if (tocado.tiempos) {
				const n = (t: TiempoForm) => ({ a: Number(t.a) || 0, m: Number(t.m) || 0, d: Number(t.d) || 0 });
				c.tiempos = {
					antes: { dep: n(tiempos.antes.dep), aut: n(tiempos.antes.aut), sim: n(tiempos.antes.sim) },
					despues: { dep: n(tiempos.despues.dep), aut: n(tiempos.despues.aut), sim: n(tiempos.despues.sim) },
					total: n(tiempos.total),
				};
			}
			if (tocado.moratoria) c.moratoria = moratoria;
			if (tocado.filas)
				c.filas = filas
					.filter((f) => f.periodo && Number(f.importe) > 0)
					.map((f) => ({
						periodo: f.periodo,
						importe: Number(f.importe),
						moneda: f.moneda || undefined,
						hasta: f.hasta || undefined,
						meses: Number(f.meses) > 1 ? Number(f.meses) : undefined,
					}));
			if (!Object.keys(c).length) {
				enqueueSnackbar("No hay correcciones: modificá algún dato antes de guardar", { variant: "warning" });
				return;
			}
			body.correcciones = c;
		}
		try {
			setGuardando(true);
			await HcRelevamientoService.guardarRevision(id, body);
			enqueueSnackbar("Revisión guardada. La próxima pasada (minuto 17 de cada hora) reevalúa el caso.", { variant: "success" });
			onGuardado();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error guardando la revisión", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const seccion = (titulo: string, extra?: React.ReactNode) => (
		<Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2.5, mb: 1 }}>
			<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
				{titulo}
			</Typography>
			{extra}
		</Stack>
	);
	const marcaTocado = (k: string) =>
		tocado[k] ? (
			<Chip
				size="small"
				label="corregido"
				sx={{ height: 18, fontSize: "0.62rem", bgcolor: alpha(STALE_AMBER, 0.2), color: isDark ? STALE_AMBER : "#5C3D00" }}
			/>
		) : null;
	const numSx = { "& input": { fontFamily: "monospace", fontSize: "0.8rem" } };

	return (
		<Drawer anchor="right" open={!!idInicial} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 860 } } }}>
			<Box sx={{ p: { xs: 2, md: 3 } }}>
				<Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
					<Box>
						<Typography variant="h4">Constancia {ev?.fadMes ? `· FAD ${ev.fadMes}` : ""}</Typography>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
							{ev && <EstadoChip estado={ev.estado} isDark={isDark} />}
							{ev?.revision?.estado && <EstadoChip estado={ev.revision.estado} isDark={isDark} label={`revisión: ${ev.revision.estado}`} />}
							{(ev?.revision?.motivos || []).map((m) => (
								<MotivoChip key={m} motivo={m} isDark={isDark} />
							))}
						</Stack>
					</Box>
					<IconButton onClick={onClose}>
						<CloseCircle size={20} />
					</IconButton>
				</Stack>

				{loading || !data ? (
					<Box sx={{ py: 6, textAlign: "center" }}>
						<CircularProgress size={28} />
					</Box>
				) : (
					<>
						<Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap alignItems="center">
							{p?.url && /^https?:/.test(p.url) && (
								<Link
									href={p.url}
									target="_blank"
									rel="noopener noreferrer"
									underline="hover"
									sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
								>
									<ExportSquare size={16} /> Abrir el PDF en el PJN
								</Link>
							)}
							<Typography variant="caption" color="text.secondary">
								{p?.causaNumber ? `Causa ${p.causaNumber}/${p.causaYear}` : ""}{" "}
								{p?.ocr?.paginas ? `· ${p.ocr.paginas} páginas con OCR` : ""} · extraído {fmtFechaHora(p?.extraidoEn)} · evaluado{" "}
								{fmtFechaHora(ev?.evaluadoEn)}
							</Typography>
						</Stack>

						{data.reemplazo && (
							<Alert
								severity="info"
								sx={{ mt: 2 }}
								action={
									<Button size="small" onClick={() => setId(data.reemplazo!)}>
										Ver el caso nuevo
									</Button>
								}
							>
								Esta lectura fue reemplazada por un PRPA original cargado a mano.
							</Alert>
						)}

						{seccion("PRPA original")}
						<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
							Si conseguiste el PRPA original (PDF de ANSES o una foto mejor), cargalo: se procesa en unos minutos y reemplaza a esta
							lectura.
						</Typography>
						{p?._id && <SubirPrpa prpaId={p._id} onSubida={() => setRecarga((n) => n + 1)} />}
						<Box sx={{ mt: 1 }}>
							<ListaCargas cargas={data.cargas || []} isDark={isDark} onAbrir={(x) => setId(x)} />
						</Box>

						{ev?.revision?.detalle && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								Filas leídas {ev.revision.detalle.filasLeidas ?? "—"} de {ev.revision.detalle.filasEsperadas ?? "—"} ·{" "}
								{ev.revision.detalle.huecos} meses sin fila · {ev.revision.detalle.dudosas} filas dudosas · diferencia con la sumatoria
								impresa {fmtNum(ev.revision.detalle.difSumaDep)}
							</Alert>
						)}

						{seccion("Resultado del motor")}
						<Paper variant="outlined" sx={{ borderColor: headerBorder(isDark) }}>
							<Table size="small">
								<TableHead>
									<TableRow sx={headSx(isDark)}>
										<TableCell>Componente</TableCell>
										<TableCell align="right">Impreso</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="right">Diferencia</TableCell>
										<TableCell>Nota</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{COMPONENTES.filter((k) => ev?.componentes?.[k]).map((k) => {
										const c = ev!.componentes[k]!;
										return (
											<TableRow key={k}>
												<TableCell sx={{ fontFamily: "monospace" }}>{k}</TableCell>
												<TableCell align="right" sx={{ fontFamily: "monospace" }}>
													{fmtNum((ev?.impresos as any)?.[k])}
												</TableCell>
												<TableCell>
													<Chip
														size="small"
														label={c.estado}
														sx={{ height: 20, fontSize: "0.66rem", bgcolor: alpha(COLOR_ESTADO[c.estado] || GRIS, 0.15) }}
													/>
												</TableCell>
												<TableCell align="right" sx={{ fontFamily: "monospace" }}>
													{c.e === null || c.e === undefined ? "—" : `${(c.e * 100).toFixed(4)} %`}
												</TableCell>
												<TableCell sx={{ fontSize: "0.75rem" }}>
													{[c.regla ? `${c.regla}=${String(c.valor)}` : "", c.nota || ""].filter(Boolean).join(" · ")}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</Paper>
						{!!ev?.causas?.length && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
								Causas: {ev.causas.join(" · ")}
							</Typography>
						)}
						{(() => {
							const rg = ev?.docente || ev?.investigador;
							if (!rg) return null;
							return (
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
									{ev?.docente ? "Jubilación docente" : "Jubilación de investigador científico"} (sección aparte, insumo para el motor del
									régimen
									{rg.detectadoPor === "prestacion" ? "; detectada por la prestación" : ""}
									{ev?.estadoReferencia ? `; ley general: ${ev.estadoReferencia}` : ""}): suplemento {fmtNum(rg.suplementoMensual)}
									{rg.suplementoRetroactivo ? ` (retroactivo ${fmtNum(rg.suplementoRetroactivo)})` : ""} · haber en actividad{" "}
									{fmtNum(rg.totalHaberActividad)} · total {fmtNum(rg.totalHaber)}
									{rg.porcentaje ? ` (${fmtNum(rg.porcentaje * 100)} %)` : ""} · mensual {fmtNum(rg.sumaHaber)}
									{rg.factorTotal ? ` (×${fmtNum(rg.factorTotal, 4)})` : ""}
									{rg.totalMovido ? ` · total con movilidad general ${fmtNum(rg.totalMovido)}` : ""}
									{rg.factorPC ? ` · PC ×${fmtNum(rg.factorPC, 4)} · PAP ×${fmtNum(rg.factorPAP, 4)}` : ""}
									{rg.factorMotor ? ` (ley general ×${fmtNum(rg.factorMotor, 4)})` : ""} · controles:{" "}
									{Object.entries(rg.controles)
										.map(([k, v]) => `${k} ${v === null ? "sin dato" : v ? "sí" : "no"}`)
										.join(", ")}
								</Typography>
							);
						})()}
						{ev?.filas && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
								Filas contra el actualizado impreso: {ev.filas.ok} exactas
								{ev.filas.sinTope14 ? ` · ${ev.filas.sinTope14} sin el tope sobre la actualizada` : ""}
								{ev.filas.sinTope9 ? ` · ${ev.filas.sinTope9} sin el tope del art. 9` : ""}
								{ev.filas.alAcuerdo ? ` · ${ev.filas.alAcuerdo} actualizadas al acuerdo (× ${ev.filas.factorAcuerdo})` : ""}
								{ev.filas.corregida ? ` · ${ev.filas.corregida} con importe corregido` : ""}
								{ev.filas.moneda ? ` (${ev.filas.moneda} por moneda)` : ""}
								{ev.filas.renglones ? ` · ${ev.filas.renglones} renglones de varios meses` : ""}
								{ev.filas.desalineada ? ` · ${ev.filas.desalineada} con columnas corridas` : ""}
								{ev.filas.sinExplicar ? ` · ${ev.filas.sinExplicar} sin explicar` : ""}
							</Typography>
						)}
						{!!ev?.correccionesFecha?.length && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
								Fechas del OCR:{" "}
								{ev.correccionesFecha.map((c) => `${c.campo} ${c.leido} → ${c.corregido || "fuera del cálculo"}`).join(" · ")}
							</Typography>
						)}

						<Divider sx={{ my: 3 }} />
						<Typography variant="h5">Corrección manual</Typography>
						<Typography variant="body2" color="text.secondary">
							Cargá lo que se lee en la constancia. Solo se guardan las secciones que modifiques; el resto sigue con lo leído por el OCR.
						</Typography>

						{seccion("Fechas", marcaTocado("fechas"))}
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							{FECHAS.map(([k, label]) => (
								<TextField
									key={k}
									size="small"
									type="date"
									label={label}
									value={fechas[k] || ""}
									onChange={(e) => {
										setFechas((x) => ({ ...x, [k]: e.target.value }));
										tocar("fechas");
									}}
									InputLabelProps={{ shrink: true }}
									sx={{ width: 160 }}
								/>
							))}
						</Stack>

						{seccion("Importes impresos", marcaTocado("impresos"))}
						<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
							{IMPRESOS.map(([k, label]) => (
								<TextField
									key={k}
									size="small"
									type="number"
									label={label}
									value={impresos[k] ?? ""}
									onChange={(e) => {
										setImpresos((x) => ({ ...x, [k]: e.target.value }));
										tocar("impresos");
									}}
									inputProps={{ step: "any" }}
									sx={{ width: 150, ...numSx }}
								/>
							))}
						</Stack>

						{seccion("Período del promedio (Dde/Hasta)", marcaTocado("periodo"))}
						<Stack direction="row" spacing={1}>
							{(["desde", "hasta"] as const).map((k) => (
								<TextField
									key={k}
									size="small"
									type="month"
									label={k === "desde" ? "Desde" : "Hasta"}
									value={periodo[k]}
									onChange={(e) => {
										setPeriodo((x) => ({ ...x, [k]: e.target.value }));
										tocar("periodo");
									}}
									InputLabelProps={{ shrink: true }}
									sx={{ width: 170 }}
								/>
							))}
						</Stack>

						{seccion(
							"Tiempos de servicio",
							<>
								{marcaTocado("tiempos")}
								<Typography variant="caption" color={Math.abs(sumaTramos - totalTiempos) <= 1 ? "text.secondary" : "error"}>
									suma de tramos {Math.floor(sumaTramos / 12)}a {Math.round(sumaTramos % 12)}m · total {tiempos.total.a}a {tiempos.total.m}m
								</Typography>
							</>,
						)}
						<Paper variant="outlined" sx={{ borderColor: headerBorder(isDark), overflowX: "auto" }}>
							<Table size="small">
								<TableHead>
									<TableRow sx={headSx(isDark)}>
										<TableCell />
										{CLASES.map(([k, label]) => (
											<TableCell key={k} align="center">
												{label} (a · m · d)
											</TableCell>
										))}
									</TableRow>
								</TableHead>
								<TableBody>
									{TRAMOS.map(([t, label]) => (
										<TableRow key={t}>
											<TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>{label}</TableCell>
											{CLASES.map(([k]) => (
												<TableCell key={k} align="center">
													<Stack direction="row" spacing={0.5} justifyContent="center">
														{(["a", "m", "d"] as const).map((u) => (
															<TextField
																key={u}
																size="small"
																type="number"
																value={tiempos[t][k][u]}
																onChange={(e) => {
																	const v = e.target.value;
																	setTiempos((x) => ({ ...x, [t]: { ...x[t], [k]: { ...x[t][k], [u]: v } } }));
																	tocar("tiempos");
																}}
																inputProps={{ min: 0, max: 99 }}
																sx={{ width: 58, ...numSx }}
															/>
														))}
													</Stack>
												</TableCell>
											))}
										</TableRow>
									))}
									<TableRow>
										<TableCell sx={{ fontSize: "0.75rem", fontWeight: 700 }}>Total impreso</TableCell>
										<TableCell colSpan={3}>
											<Stack direction="row" spacing={0.5}>
												{(["a", "m", "d"] as const).map((u) => (
													<TextField
														key={u}
														size="small"
														type="number"
														value={tiempos.total[u]}
														onChange={(e) => {
															const v = e.target.value;
															setTiempos((x) => ({ ...x, total: { ...x.total, [u]: v } }));
															tocar("tiempos");
														}}
														sx={{ width: 58, ...numSx }}
													/>
												))}
											</Stack>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						</Paper>
						<FormControlLabel
							sx={{ mt: 1 }}
							control={
								<Switch
									size="small"
									checked={moratoria}
									onChange={(e) => {
										setMoratoria(e.target.checked);
										tocar("moratoria");
									}}
								/>
							}
							label={<Typography variant="body2">Tiene moratoria {marcaTocado("moratoria")}</Typography>}
						/>

						{seccion(
							`Remuneraciones (${filas.length} filas)`,
							<>
								{marcaTocado("filas")}
								<Typography variant="caption" color="text.secondary">
									suma {fmtNum(sumaFilas)} · sumatoria impresa {fmtNum(Number(impresos.sumatoriaDep) || null)}
								</Typography>
							</>,
						)}
						{!!huecos.length && (
							<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
								Meses del período sin fila leída: {huecos.join(", ")}
							</Typography>
						)}
						<Paper variant="outlined" sx={{ borderColor: headerBorder(isDark), maxHeight: 420, overflow: "auto" }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow sx={headSx(isDark)}>
										<TableCell>Período</TableCell>
										<TableCell>Hasta</TableCell>
										<TableCell>Meses</TableCell>
										<TableCell>Importe</TableCell>
										<TableCell>Moneda</TableCell>
										<TableCell>Pág.</TableCell>
										<TableCell />
									</TableRow>
								</TableHead>
								<TableBody>
									{filas.map((f, i) => {
										const set = (k: keyof FilaForm, v: string) => {
											setFilas((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
											tocar("filas");
										};
										return (
											<TableRow key={i} sx={f.dudosa ? { bgcolor: alpha(STALE_AMBER, isDark ? 0.14 : 0.1) } : undefined}>
												<TableCell>
													<TextField
														size="small"
														type="month"
														value={f.periodo}
														onChange={(e) => set("periodo", e.target.value)}
														sx={{ width: 150, ...numSx }}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="month"
														value={f.hasta}
														onChange={(e) => set("hasta", e.target.value)}
														sx={{ width: 150, ...numSx }}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="number"
														value={f.meses}
														onChange={(e) => set("meses", e.target.value)}
														sx={{ width: 70, ...numSx }}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														type="number"
														value={f.importe}
														onChange={(e) => set("importe", e.target.value)}
														inputProps={{ step: "any" }}
														sx={{ width: 140, ...numSx }}
													/>
												</TableCell>
												<TableCell>
													<TextField
														size="small"
														value={f.moneda}
														onChange={(e) => set("moneda", e.target.value)}
														sx={{ width: 80, ...numSx }}
													/>
												</TableCell>
												<TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{f.pagina ?? ""}
													{f.dudosa ? " ⚠" : ""}
												</TableCell>
												<TableCell>
													<Tooltip title="Quitar fila">
														<IconButton
															size="small"
															onClick={() => {
																setFilas((xs) => xs.filter((_, j) => j !== i));
																tocar("filas");
															}}
														>
															<Trash size={14} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</Paper>
						<Button
							size="small"
							startIcon={<Add size={16} />}
							sx={{ mt: 1 }}
							onClick={() => {
								setFilas((xs) => [...xs, { periodo: "", hasta: "", meses: "", importe: "", moneda: "" }]);
								tocar("filas");
							}}
						>
							Agregar fila
						</Button>

						{seccion("Nota")}
						<TextField
							fullWidth
							multiline
							minRows={2}
							size="small"
							value={nota}
							onChange={(e) => setNota(e.target.value)}
							placeholder="Qué se corrigió o por qué se descarta"
						/>

						<Stack direction="row" spacing={1} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
							<Button variant="contained" disabled={guardando} onClick={() => guardar("corregida")}>
								Guardar corrección
							</Button>
							<Tooltip title="La lectura del OCR es correcta: lo que no cierre es del cálculo">
								<span>
									<Button variant="outlined" color="success" disabled={guardando} onClick={() => guardar("validada")}>
										Validar lectura
									</Button>
								</span>
							</Tooltip>
							<Tooltip title="Ilegible o no es una constancia de primeros pagos: sale del cierre">
								<span>
									<Button variant="outlined" color="inherit" disabled={guardando} onClick={() => guardar("descartada")}>
										Descartar
									</Button>
								</span>
							</Tooltip>
							{data.revision && (
								<Button variant="text" disabled={guardando} onClick={() => guardar("pendiente")}>
									Volver a pendiente
								</Button>
							)}
						</Stack>

						{!!data.revision?.historial?.length && (
							<>
								{seccion("Historial de la revisión")}
								<Stack spacing={0.5}>
									{[...data.revision.historial].reverse().map((h, i) => (
										<Typography key={i} variant="caption" color="text.secondary">
											{fmtFechaHora(h.en)} · {h.estado}
											{h.nota ? ` · ${h.nota}` : ""}
										</Typography>
									))}
								</Stack>
							</>
						)}
					</>
				)}
			</Box>
		</Drawer>
	);
}
