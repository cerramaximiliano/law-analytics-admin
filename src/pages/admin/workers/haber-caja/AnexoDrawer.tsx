import { useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
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
	TableContainer,
	TableHead,
	TableRow,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, ExportSquare } from "iconsax-react";
import { useSnackbar } from "notistack";
import HcRelevamientoService, { AnexoDetalle, Componente } from "api/hcRelevamiento";
import { LIVE_GREEN, headerBorder } from "themes/dashboardTokens";
import { COLOR_ESTADO, EstadoChip, GRIS, ROJO, fmtFechaHora, fmtNum, headSx, isoDia } from "./comun";

interface Props {
	id: string | null;
	onClose: () => void;
}

const COMPONENTES_PROGRAMA: Componente[] = ["sumatoria", "W", "PBU", "PC", "PAP"];
const FECHAS = [
	["fad", "FAD"],
	["solicitud", "Solicitud"],
	["cese", "Cese"],
	["alta", "Alta"],
] as const;

const mono = { fontFamily: "monospace", fontSize: "0.75rem" };

export default function AnexoDrawer({ id, onClose }: Props) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [data, setData] = useState<AnexoDetalle | null>(null);
	const [loading, setLoading] = useState(false);
	const [soloDistintas, setSoloDistintas] = useState(false);

	useEffect(() => {
		if (!id) {
			setData(null);
			return;
		}
		let vivo = true;
		setLoading(true);
		HcRelevamientoService.getProgramaAnexo(id)
			.then((d) => vivo && setData(d))
			.catch((err: any) => enqueueSnackbar(err?.response?.data?.message || "Error obteniendo el anexo", { variant: "error" }))
			.finally(() => vivo && setLoading(false));
		return () => {
			vivo = false;
		};
	}, [id, enqueueSnackbar]);

	const ev = data?.evaluacion;
	const p = data?.prpa;
	const a = p?.anexo || {};
	const distintas = useMemo(() => new Map((ev?.filasTope14 || []).map((f) => [f.periodo, f])), [ev]);
	const filas = useMemo(() => {
		const todas = p?.prpa || [];
		return soloDistintas
			? todas.filter(
					(f) => distintas.has(f.periodo) || (Number.isFinite(f.computada) && (f.computada as number) < (f.actualizada || 0) - 0.02),
			  )
			: todas;
	}, [p, soloDistintas, distintas]);
	const sinFad = !p?.fechas?.fad;

	const seccion = (titulo: string, extra?: React.ReactNode) => (
		<Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2.5, mb: 1 }}>
			<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
				{titulo}
			</Typography>
			{extra}
		</Stack>
	);

	return (
		<Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: 900 } } }}>
			<Box sx={{ p: { xs: 2, md: 3 } }}>
				<Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
					<Box>
						<Typography variant="h4">Anexo BlueCorp · haber de caja {ev?.fadMes ? `· FAD ${ev.fadMes}` : ""}</Typography>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
							{ev && <EstadoChip estado={ev.estado} isDark={isDark} />}
							{(ev?.causas || []).map((c) => (
								<Chip key={c} size="small" variant="outlined" label={c} sx={{ height: 22, fontSize: "0.68rem" }} />
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
								{p?.causaNumber ? `Causa ${p.causaNumber}/${p.causaYear}` : ""} · extractor {p?.version || "—"} · bloque{" "}
								{a.bloqueIdx ?? "—"} (por{" "}
								{a.tipoPor === "linea" ? "la línea de actualización" : a.tipoPor === "seccion" ? "la sección" : "—"}) · columna que suma:{" "}
								{a.columnaComputada || "—"}
								{a.cierraContra ? ` (cierra contra el ${a.cierraContra})` : ""} · extraído {fmtFechaHora(p?.extraidoEn)} · evaluado{" "}
								{fmtFechaHora(ev?.evaluadoEn)}
							</Typography>
						</Stack>

						{sinFad && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								Sin FAD: el anexo no se emparejó con su sección &quot;Haber Caja&quot; (FAD, tiempos, PBU, PC y PAP). El emparejamiento
								busca una sección cuyo &quot;Haber Relación Dep.&quot; sea igual al W computado de este anexo ({fmtNum(p?.impresos?.W)}); si
								no la encuentra, toma la de la misma posición. Abrí el PDF y fijate qué W imprime la sección.
							</Alert>
						)}

						{seccion("Fechas")}
						<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
							{FECHAS.map(([k, label]) => (
								<Box key={k}>
									<Typography variant="caption" color="text.secondary">
										{label}
									</Typography>
									<Typography sx={mono}>{isoDia(p?.fechas?.[k] as string) || (p?.fechas?.[k] as string) || "—"}</Typography>
								</Box>
							))}
						</Stack>

						{seccion("Impresos frente al motor (perfil bluecorp)")}
						<Table size="small">
							<TableHead>
								<TableRow sx={headSx(isDark)}>
									<TableCell>Componente</TableCell>
									<TableCell align="right">Impreso</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell align="right">Diferencia</TableCell>
									<TableCell>Regla / nota</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{COMPONENTES_PROGRAMA.map((k) => {
									const c = ev?.componentes?.[k];
									const imp = k === "sumatoria" ? ev?.impresos?.sumatoria : (ev?.impresos as any)?.[k];
									return (
										<TableRow key={k}>
											<TableCell sx={mono}>{k}</TableCell>
											<TableCell align="right" sx={mono}>
												{fmtNum(imp)}
												{k === "W" && ev?.impresos?.Wactualizado ? (
													<Typography component="div" variant="caption" color="text.secondary">
														sin tope {fmtNum(ev.impresos.Wactualizado)}
													</Typography>
												) : null}
											</TableCell>
											<TableCell>{c ? <EstadoChip estado={c.estado} isDark={isDark} /> : "—"}</TableCell>
											<TableCell align="right" sx={mono}>
												{c?.e === null || c?.e === undefined ? "—" : `${(c.e * 100).toFixed(3)} %`}
											</TableCell>
											<TableCell sx={{ fontSize: "0.72rem" }}>
												{[c?.regla ? `${c.regla}=${String(c.valor)}` : "", c?.nota || ""].filter(Boolean).join(" · ") || "—"}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>

						{ev?.filas && (
							<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
								Filas: {ev.filas.filas} · coeficiente igual al motor {ev.filas.ok} · coeficiente distinto {ev.filas.coefDistinto} · tope
								art. 9 {ev.filas.tope9} · tope sobre la actualizada: igual {ev.filas.tope14}, solo el motor {ev.filas.sinTope14}, solo
								BlueCorp {ev.filas.tope14SinNorma}
							</Typography>
						)}

						{(ev?.filasTope14 || []).length > 0 &&
							seccion(
								"Filas donde el motor y BlueCorp topean distinto",
								<Chip
									size="small"
									label={ev!.filasTope14!.length}
									sx={{ height: 20, fontSize: "0.68rem", bgcolor: alpha(ROJO, 0.12), color: ROJO }}
								/>,
							)}
						{(ev?.filasTope14 || []).length > 0 && (
							<>
								<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
									&quot;Solo el motor&quot;: la actualizada supera el máximo a la cesación y el computado de BlueCorp no la topea.
									&quot;Solo BlueCorp&quot;: BlueCorp la topea y el motor no.
								</Typography>
								<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark), maxHeight: 320 }}>
									<Table size="small" stickyHeader>
										<TableHead>
											<TableRow sx={headSx(isDark)}>
												<TableCell>Mes</TableCell>
												<TableCell>Quién topea</TableCell>
												<TableCell align="right">Importe</TableCell>
												<TableCell align="right">Coef. BlueCorp</TableCell>
												<TableCell align="right">Coef. motor</TableCell>
												<TableCell align="right">Actualizada BlueCorp</TableCell>
												<TableCell align="right">Otros Topes</TableCell>
												<TableCell align="right">Computado</TableCell>
												<TableCell align="right">Tope motor</TableCell>
												<TableCell align="right">Actualizada motor</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{ev!.filasTope14!.map((f) => (
												<TableRow key={f.periodo}>
													<TableCell sx={mono}>{f.periodo}</TableCell>
													<TableCell sx={{ fontSize: "0.72rem", color: f.clase === "sinTope14" ? ROJO : GRIS, fontWeight: 600 }}>
														{f.clase === "sinTope14" ? "solo el motor" : "solo BlueCorp"}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.importe)}
														{f.topeArt9 ? (
															<Typography component="div" variant="caption" color="text.secondary">
																art. 9 {fmtNum(f.topeArt9)}
															</Typography>
														) : null}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.coeficiente, 6)}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.coeficienteMotor, 6)}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.actualizada)}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.otrosTopes)}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.computada)}
													</TableCell>
													<TableCell align="right" sx={{ ...mono, color: COLOR_ESTADO.explicado }}>
														{typeof f.topeMotor === "number" ? fmtNum(f.topeMotor) : "—"}
													</TableCell>
													<TableCell align="right" sx={mono}>
														{fmtNum(f.actualizadaMotor)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							</>
						)}

						{seccion(
							`Filas del anexo (${(p?.prpa || []).length})`,
							<FormControlLabel
								sx={{ ml: 1 }}
								control={<Switch size="small" checked={soloDistintas} onChange={(e) => setSoloDistintas(e.target.checked)} />}
								label={<Typography variant="caption">solo las topeadas o con tope distinto</Typography>}
							/>,
						)}
						<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark), maxHeight: 460 }}>
							<Table size="small" stickyHeader>
								<TableHead>
									<TableRow sx={headSx(isDark)}>
										<TableCell>Mes</TableCell>
										<TableCell align="right">Días</TableCell>
										<TableCell align="right">Importe</TableCell>
										<TableCell>Moneda</TableCell>
										<TableCell align="right">Tope art. 9</TableCell>
										<TableCell align="right">Coeficiente</TableCell>
										<TableCell align="right">Actualizada</TableCell>
										<TableCell align="right">Otros Topes</TableCell>
										<TableCell align="right">Computado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{filas.map((f, i) => {
										const topeada = Number.isFinite(f.computada) && (f.computada as number) < (f.actualizada || 0) - 0.02;
										const distinta = distintas.get(f.periodo);
										const bg = distinta ? alpha(ROJO, isDark ? 0.14 : 0.07) : topeada ? alpha(LIVE_GREEN, isDark ? 0.12 : 0.06) : undefined;
										return (
											<TableRow key={`${f.periodo}-${i}`} sx={{ bgcolor: bg }}>
												<TableCell sx={mono}>{f.periodo}</TableCell>
												<TableCell align="right" sx={mono}>
													{f.dias ?? "—"}
												</TableCell>
												<TableCell align="right" sx={mono}>
													{fmtNum(f.importe)}
												</TableCell>
												<TableCell sx={{ fontSize: "0.72rem" }}>{f.moneda || "—"}</TableCell>
												<TableCell align="right" sx={mono}>
													{f.topeArt9 ? fmtNum(f.topeArt9) : "—"}
												</TableCell>
												<TableCell align="right" sx={mono}>
													{fmtNum(f.coeficiente, 6)}
												</TableCell>
												<TableCell align="right" sx={mono}>
													{fmtNum(f.actualizada)}
												</TableCell>
												<TableCell align="right" sx={mono}>
													{f.actualizadaTopeada ? fmtNum(f.actualizadaTopeada) : "—"}
												</TableCell>
												<TableCell align="right" sx={{ ...mono, fontWeight: topeada ? 700 : 400 }}>
													{fmtNum(f.computada)}
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
							Verde: BlueCorp topea la fila (computado menor que la actualizada). Rojo: el motor y BlueCorp topean distinto. Promedio
							impreso: computado {fmtNum(a.promedio)}
							{a.promedioActualizado ? `, actualizado ${fmtNum(a.promedioActualizado)}` : ""} · divisor {a.divisor ?? "—"} · total{" "}
							{fmtNum(a.total)}
						</Typography>
					</>
				)}
			</Box>
		</Drawer>
	);
}
