/**
 * Marketing → Promociones (Meta Ads)
 *
 * Pantalla propia de las campañas de Meta creadas desde el Studio: listado con
 * estado real, presupuesto, período y totales del seguimiento (cron
 * meta-ads-seguimiento), acciones rápidas (activar / pausar) y el detalle de
 * cada una (MetaPromocionPanel). Además, "Nueva promoción" para promocionar
 * cualquier post ya publicado sin pasar por el editor del Studio.
 *
 * Backend: la-marketing-service, GET /api/social/promociones + los endpoints
 * de /posts/:id/promocion*.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	IconButton,
	InputLabel,
	Link,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ArrowDown2, ArrowUp2, PauseCircle, PlayCircle, Refresh } from "iconsax-react";

import MainCard from "components/MainCard";
import MetaPromocionPanel from "./MetaPromocionPanel";
import {
	activarPromocion,
	getPost,
	listPosts,
	listPromociones,
	pausarPromocion,
	type PromocionResumen,
	type SocialPost,
} from "api/socialPosts";

const ars = (n?: number | null) =>
	n === null || n === undefined ? "—" : `ARS ${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—");
const num = (n?: number | null) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR"));
const dec = (n?: number | null, d = 1) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-AR", { maximumFractionDigits: d }));
const pct = (n?: number | null) => (n === null || n === undefined ? "—" : `${(n * 100).toFixed(2)} %`);
/** "1 d 12 h" / "9 h" a partir de horas corridas. */
const duracion = (horas?: number | null) => {
	if (horas === null || horas === undefined) return "—";
	const d = Math.floor(horas / 24);
	const h = Math.round(horas - d * 24);
	return d > 0 ? `${d} d ${h} h` : `${h} h`;
};
const fechaHora = (iso?: string | null) =>
	iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const ESTADO: Record<string, { label: string; color: "success" | "warning" | "info" | "default" }> = {
	activa: { label: "Activa", color: "success" },
	pausada: { label: "Pausada", color: "warning" },
	finalizada: { label: "Finalizada", color: "info" },
};

const PromocionesMeta = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [items, setItems] = useState<PromocionResumen[]>([]);
	const [cargando, setCargando] = useState(true);
	const [abierto, setAbierto] = useState<string | null>(null);
	const [detalle, setDetalle] = useState<Record<string, SocialPost>>({});
	// "porDia" divide los totales por el tiempo corrido de cada campaña: así se
	// comparan campañas que llevan distinto tiempo (pedido del 2026-09-17).
	const [vista, setVista] = useState<"totales" | "porDia">("totales");
	const [accion, setAccion] = useState<string | null>(null);
	const [confirmar, setConfirmar] = useState<PromocionResumen | null>(null);
	// Nueva promoción: posts publicados sin campaña.
	const [candidatos, setCandidatos] = useState<SocialPost[]>([]);
	const [nuevoId, setNuevoId] = useState("");
	const [nuevoPost, setNuevoPost] = useState<SocialPost | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const [lista, publicados] = await Promise.all([listPromociones(), listPosts({ estado: "publicado", limit: 100 })]);
			setItems(lista);
			const conCampana = new Set(lista.map((i) => i._id));
			setCandidatos(publicados.posts.filter((p) => !conCampana.has(p._id)));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar las promociones", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const abrirDetalle = async (id: string) => {
		if (abierto === id) return setAbierto(null);
		setAbierto(id);
		if (!detalle[id]) {
			try {
				const p = await getPost(id);
				setDetalle((d) => ({ ...d, [id]: p }));
			} catch (err: any) {
				enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el post", { variant: "error" });
			}
		}
	};

	const elegirNuevo = async (id: string) => {
		setNuevoId(id);
		setNuevoPost(null);
		if (!id) return;
		try {
			setNuevoPost(await getPost(id));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el post", { variant: "error" });
		}
	};

	const cambiarEstado = async (item: PromocionResumen, activar: boolean) => {
		setConfirmar(null);
		setAccion(item._id);
		try {
			const p = activar ? await activarPromocion(item._id, item.pieza) : await pausarPromocion(item._id, item.pieza);
			setDetalle((d) => ({ ...d, [item._id]: p }));
			enqueueSnackbar(activar ? "Campaña activada" : "Campaña pausada", { variant: "success" });
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Meta rechazó la operación", { variant: "error" });
		} finally {
			setAccion(null);
		}
	};

	const totales = useMemo(() => {
		const activas = items.filter((i) => i.promocion.estado === "activa");
		const gasto = items.reduce((a, i) => a + (i.totales?.spend || 0), 0);
		const diario = activas.reduce((a, i) => a + (i.promocion.presupuestoDiarioARS || 0), 0);
		return { activas: activas.length, gasto, diario };
	}, [items]);

	return (
		<MainCard
			title="Promociones en Meta (Instagram)"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<Chip size="small" variant="outlined" label={`${totales.activas} activa(s) · ${ars(totales.diario)}/día`} />
					<Chip size="small" variant="outlined" label={`Gastado: ${ars(totales.gasto)}`} />
					<ToggleButtonGroup size="small" exclusive value={vista} onChange={(_e, v) => v && setVista(v)}>
						<ToggleButton value="totales">Totales</ToggleButton>
						<ToggleButton value="porDia">Por día</ToggleButton>
					</ToggleButtonGroup>
					<Button size="small" startIcon={<Refresh size={16} />} onClick={cargar} disabled={cargando}>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				<Typography variant="body2" color="text.secondary">
					Campañas creadas desde la admin sobre publicaciones de Instagram. Los totales salen del seguimiento cada 6 horas (resumen diario
					en Telegram, tema Meta Ads); el detalle de cada fila consulta Meta en el momento.
				</Typography>

				{cargando && items.length === 0 ? (
					<Stack alignItems="center" sx={{ py: 4 }}>
						<CircularProgress />
					</Stack>
				) : items.length === 0 ? (
					<Alert severity="info" variant="outlined">
						Todavía no hay campañas. Creá la primera desde "Nueva promoción", más abajo.
					</Alert>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell />
									<TableCell>Post</TableCell>
									<TableCell>Objetivo</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell>Presupuesto</TableCell>
									<TableCell>Corrida</TableCell>
									<TableCell align="right">{vista === "porDia" ? "Impr./día" : "Impresiones"}</TableCell>
									<TableCell align="right">{vista === "porDia" ? "Resultado/día" : "Resultado"}</TableCell>
									<TableCell align="right">CTR · CPC</TableCell>
									<TableCell align="right">{vista === "porDia" ? "Gasto/día" : "Gasto"}</TableCell>
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{items.map((it) => {
									const p = it.promocion;
									const t = it.totales;
									const interaccion = p.objetivo === "interaccion";
									const est = ESTADO[p.estado || "pausada"] || ESTADO.pausada;
									const ocupado = accion === it._id;
									const porDia = vista === "porDia";
									const v = porDia ? it.porDia : t;
									const r = it.ratios;
									return (
										<Fragment key={`${it._id}-${it.pieza || "post"}`}>
											<TableRow hover>
												<TableCell padding="checkbox">
													<IconButton size="small" onClick={() => abrirDetalle(it._id)}>
														{abierto === it._id ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
													</IconButton>
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={1} alignItems="center">
														<Typography variant="body2">{it.titulo}</Typography>
														{it.pieza === "reel" && <Chip size="small" color="secondary" variant="outlined" label="Reel" />}
													</Stack>
													<Typography variant="caption" color="text.secondary">
														Publicado {fecha(it.publicadoEn)}
														{it.pieza === "reel"
															? it.publicacion?.reel?.instagramReelId
																? ` · Reel IG ${it.publicacion.reel.instagramReelId}`
																: ""
															: it.publicacion?.instagramMediaId
																? ` · IG ${it.publicacion.instagramMediaId}`
																: ""}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip size="small" variant="outlined" label={interaccion ? "Interacción" : "Tráfico"} />
												</TableCell>
												<TableCell>
													<Chip size="small" color={est.color} label={est.label} />
													<Typography variant="caption" color="text.secondary" display="block">
														{fecha(p.inicio)} → {fecha(p.fin)}
													</Typography>
												</TableCell>
												<TableCell>
													{ars(p.presupuestoDiarioARS)}/día
													<Typography variant="caption" color="text.secondary" display="block">
														{p.dias} días · tope {ars((p.presupuestoDiarioARS || 0) * (p.dias || 0))}
													</Typography>
												</TableCell>
												<TableCell>
													<Tooltip title={it.corrida ? `Activada ${fechaHora(it.corrida.desde)}` : "Nunca se activó"}>
														<span>{duracion(it.corrida?.horas)}</span>
													</Tooltip>
													{it.corrida && (
														<Typography variant="caption" color="text.secondary" display="block">
															{dec(it.corrida.dias, 2)} día(s)
														</Typography>
													)}
												</TableCell>
												<TableCell align="right">{porDia ? dec(v?.impressions, 0) : num(t?.impressions)}</TableCell>
												<TableCell align="right">
													{interaccion ? (
														<Tooltip title={`${num(t?.likes)} likes · ${num(t?.comentarios)} comentarios · ${num(t?.guardados)} guardados`}>
															<span>{porDia ? dec(v?.interacciones, 1) : num(t?.interacciones)} interacc.</span>
														</Tooltip>
													) : (
														<Tooltip title={`${num(t?.registros)} registro(s) atribuido(s)`}>
															<span>
																{porDia ? dec(v?.inlineLinkClicks, 1) : num(t?.inlineLinkClicks)} clics ·{" "}
																{porDia ? dec(v?.registros, 2) : num(t?.registros)} reg.
															</span>
														</Tooltip>
													)}
												</TableCell>
												<TableCell align="right">
													{interaccion ? (
														<Tooltip title="Costo por interacción">
															<span>{r?.costoPorInteraccion ? ars(r.costoPorInteraccion) : "—"}</span>
														</Tooltip>
													) : (
														<Tooltip title={`CTR ${pct(r?.ctr)} · CPC ${r?.cpc ? ars(r.cpc) : "—"} · CPM ${r?.cpm ? ars(r.cpm) : "—"}${r?.costoPorRegistro ? ` · ${ars(r.costoPorRegistro)} por registro` : ""}`}>
															<span>
																{pct(r?.ctr)} · {r?.cpc ? ars(r.cpc) : "—"}
															</span>
														</Tooltip>
													)}
												</TableCell>
												<TableCell align="right">{porDia ? ars(v?.spend) : ars(t?.spend)}</TableCell>
												<TableCell align="right">
													{p.estado === "activa" ? (
														<Tooltip title="Pausar">
															<span>
																<IconButton size="small" color="warning" disabled={ocupado} onClick={() => cambiarEstado(it, false)}>
																	{ocupado ? <CircularProgress size={14} /> : <PauseCircle size={18} />}
																</IconButton>
															</span>
														</Tooltip>
													) : p.estado === "pausada" ? (
														<Tooltip title="Activar (empieza el gasto)">
															<span>
																<IconButton size="small" color="success" disabled={ocupado} onClick={() => setConfirmar(it)}>
																	{ocupado ? <CircularProgress size={14} /> : <PlayCircle size={18} />}
																</IconButton>
															</span>
														</Tooltip>
													) : null}
													<Link
														href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=880272417776246&selected_campaign_ids=${p.campaignId}`}
														target="_blank"
														rel="noreferrer"
														variant="caption"
														sx={{ ml: 1 }}
													>
														Ads Manager
													</Link>
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell colSpan={11} sx={{ p: 0, borderBottom: abierto === it._id ? undefined : "none" }}>
													<Collapse in={abierto === it._id} unmountOnExit>
														<Box sx={{ px: 3, py: 1, bgcolor: "background.default" }}>
															{detalle[it._id] ? (
																<MetaPromocionPanel
																	post={detalle[it._id]}
																	pieza={it.pieza}
																	onChange={(np) => {
																		setDetalle((d) => ({ ...d, [it._id]: np }));
																		cargar();
																	}}
																/>
															) : (
																<CircularProgress size={18} />
															)}
														</Box>
													</Collapse>
												</TableCell>
											</TableRow>
										</Fragment>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
				)}

				<MainCard title="Nueva promoción" contentSX={{ p: 2 }}>
					<Stack spacing={1.5}>
						<Typography variant="caption" color="text.secondary">
							Elegí un post ya publicado. Si se publicó a mano (antes de la integración), el panel pide vincular la publicación de
							Instagram. Solo son promocionables las imágenes entre 4:5 y 1,91:1 (las 3:4 no).
						</Typography>
						<FormControl size="small" sx={{ maxWidth: 640 }}>
							<InputLabel>Post publicado</InputLabel>
							<Select value={nuevoId} label="Post publicado" onChange={(e) => elegirNuevo(String(e.target.value))}>
								<MenuItem value="">
									<em>Elegir…</em>
								</MenuItem>
								{candidatos.map((c) => (
									<MenuItem key={c._id} value={c._id}>
										{fecha(c.publicadoEn)} ·{" "}
										{c.formato === "feed45" ? "4:5" : c.formato === "square" ? "1:1" : c.formato === "feed34" ? "3:4" : c.formato} ·{" "}
										{c.titulo}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						{nuevoPost && (
							<MetaPromocionPanel
								key={nuevoPost._id}
								post={nuevoPost}
								onChange={(np) => {
									setNuevoPost(np);
									cargar();
								}}
							/>
						)}
					</Stack>
				</MainCard>
			</Stack>

			<Dialog open={confirmar !== null} onClose={() => setConfirmar(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Activar la campaña</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						{confirmar
							? `"${confirmar.titulo}": Meta cobra hasta ${ars(confirmar.promocion.presupuestoDiarioARS)} por día hasta el ${fecha(
									confirmar.promocion.fin,
							  )}. Se puede pausar en cualquier momento.`
							: ""}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmar(null)}>Cancelar</Button>
					<Button variant="contained" color="success" onClick={() => confirmar && cambiarEstado(confirmar, true)}>
						Activar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default PromocionesMeta;
