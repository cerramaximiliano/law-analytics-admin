/**
 * Promoción paga del post en Instagram, desde la admin.
 *
 * Crea por Marketing API (la-marketing-service, services/social/metaAds.js) la
 * misma campaña que se armó a mano en Ads Manager el 2026-09-16 (tráfico,
 * clics en el enlace, Argentina 25–60, cargos/estudio/interés de abogados,
 * solo Instagram feed) sobre el post ya publicado. Nace EN PAUSA; "Activar"
 * es el único paso que gasta plata y pide confirmación.
 */
import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	InputLabel,
	Link,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Chart, PauseCircle, PlayCircle, Refresh, Trash } from "iconsax-react";

import {
	activarPromocion,
	eliminarPromocion,
	getEstadoPromocion,
	getInstagramMedia,
	pausarPromocion,
	promocionarPost,
	type EstadoPromocion,
	type InstagramMedia,
	type SocialPost,
} from "api/socialPosts";

interface Props {
	post: SocialPost;
	/** Avisa al padre con el post actualizado. */
	onChange?: (post: SocialPost) => void;
}

const URL_DEFAULT = "https://lawanalytics.app/register";
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");
const ars = (n: number | string | null | undefined) =>
	n === null || n === undefined || n === "" ? "—" : `ARS ${Number(n).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;

const ESTADO_META: Record<string, { label: string; color: "default" | "success" | "warning" | "error" | "info" }> = {
	ACTIVE: { label: "Activa", color: "success" },
	PAUSED: { label: "Pausada", color: "default" },
	CAMPAIGN_PAUSED: { label: "Pausada", color: "default" },
	IN_PROCESS: { label: "En revisión", color: "info" },
	PENDING_REVIEW: { label: "En revisión", color: "info" },
	WITH_ISSUES: { label: "Con problemas", color: "error" },
	DISAPPROVED: { label: "Rechazada", color: "error" },
	COMPLETED: { label: "Finalizada", color: "warning" },
};

const MetaPromocionPanel = ({ post, onChange }: Props) => {
	const { enqueueSnackbar } = useSnackbar();
	const [estado, setEstado] = useState<EstadoPromocion | null>(null);
	const [cargando, setCargando] = useState(false);
	const [accion, setAccion] = useState<"crear" | "activar" | "pausar" | "eliminar" | null>(null);
	const [confirmar, setConfirmar] = useState<"activar" | "eliminar" | null>(null);
	const [presupuesto, setPresupuesto] = useState("2500");
	const [dias, setDias] = useState("7");
	const [url, setUrl] = useState(URL_DEFAULT);
	const [cta, setCta] = useState<"SIGN_UP" | "LEARN_MORE">("SIGN_UP");
	const [objetivo, setObjetivo] = useState<"trafico" | "interaccion">("trafico");
	// Posts publicados a mano (sin id de Instagram): se elige la publicación de la lista.
	const [mediaIg, setMediaIg] = useState<InstagramMedia[] | null>(null);
	const [igMediaId, setIgMediaId] = useState("");

	const tieneCampana = Boolean(post.promocion?.campaignId);
	const enInstagram = Boolean(post.publicacion?.instagramMediaId);
	const esInteraccion = objetivo === "interaccion";

	useEffect(() => {
		if (enInstagram || tieneCampana || mediaIg !== null) return;
		getInstagramMedia()
			.then(setMediaIg)
			.catch(() => setMediaIg([]));
	}, [enInstagram, tieneCampana, mediaIg]);

	const cargar = useCallback(async () => {
		if (!post.promocion?.campaignId) {
			setEstado(null);
			return;
		}
		setCargando(true);
		try {
			setEstado(await getEstadoPromocion(post._id));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo leer la campaña en Meta", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [post._id, post.promocion?.campaignId, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const correr = async (que: "crear" | "activar" | "pausar" | "eliminar") => {
		setConfirmar(null);
		setAccion(que);
		try {
			let p: SocialPost;
			if (que === "crear") {
				const n = Number(presupuesto);
				if (!n || n < 1) return enqueueSnackbar("Poné un presupuesto diario en pesos", { variant: "warning" });
				if (!enInstagram && !igMediaId) return enqueueSnackbar("Elegí la publicación de Instagram a promocionar", { variant: "warning" });
				p = await promocionarPost(post._id, {
					presupuestoDiarioARS: n,
					dias: Number(dias) || 7,
					objetivo,
					...(esInteraccion ? {} : { url, cta }),
					...(enInstagram ? {} : { igMediaId }),
				});
				enqueueSnackbar("Campaña creada en pausa. Revisala y activala cuando quieras.", { variant: "success" });
			} else if (que === "activar") {
				p = await activarPromocion(post._id);
				enqueueSnackbar("Campaña activada: Meta la revisa antes de entregar", { variant: "success" });
			} else if (que === "pausar") {
				p = await pausarPromocion(post._id);
				enqueueSnackbar("Campaña pausada", { variant: "success" });
			} else {
				p = await eliminarPromocion(post._id);
				enqueueSnackbar("Campaña eliminada en Meta", { variant: "success" });
			}
			onChange?.(p);
			// El estado real (chip "Meta: …") sale de Graph: se relee después de cada acción.
			if (que !== "eliminar")
				await getEstadoPromocion(p._id)
					.then(setEstado)
					.catch(() => undefined);
			else setEstado(null);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Meta rechazó la operación", { variant: "error" });
		} finally {
			setAccion(null);
		}
	};

	const ocupado = accion !== null;
	const efectivo = estado?.campana?.effectiveStatus || estado?.campana?.status;
	const chipMeta = efectivo ? ESTADO_META[efectivo] || { label: efectivo, color: "default" as const } : null;
	const activa = post.promocion?.estado === "activa";
	const ins = estado?.insights;

	return (
		<Stack spacing={1.5} sx={{ mt: 1 }}>
			<Divider>
				<Typography variant="caption" color="text.secondary">
					Promocionar en Instagram
				</Typography>
			</Divider>

			{!enInstagram && !tieneCampana && (
				<FormControl size="small" fullWidth>
					<InputLabel>Publicación de Instagram a promocionar</InputLabel>
					<Select
						value={igMediaId}
						label="Publicación de Instagram a promocionar"
						onChange={(e) => setIgMediaId(String(e.target.value))}
						disabled={ocupado || mediaIg === null}
					>
						{(mediaIg || []).map((m) => (
							<MenuItem key={m.id} value={m.id}>
								{fmt(m.fecha).slice(0, 5)} · {m.tipo} · {m.likes} likes · {m.titulo}
							</MenuItem>
						))}
					</Select>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
						Este post se publicó a mano y el Studio no tiene su id de Instagram: elegilo de la lista y queda vinculado al crear la campaña.
					</Typography>
				</FormControl>
			)}

			{!tieneCampana && (
				<>
					<FormControl size="small" sx={{ maxWidth: 360 }}>
						<InputLabel>Objetivo</InputLabel>
						<Select
							value={objetivo}
							label="Objetivo"
							onChange={(e) => setObjetivo(e.target.value as "trafico" | "interaccion")}
							disabled={ocupado}
						>
							<MenuItem value="trafico">Tráfico: clics al sitio (registros)</MenuItem>
							<MenuItem value="interaccion">Interacción: likes, comentarios, guardados</MenuItem>
						</Select>
					</FormControl>
					<Typography variant="caption" color="text.secondary">
						{esInteraccion
							? "Meta muestra el post a quien tiende a interactuar; sin botón ni destino. Sirve para prueba social y seguidores."
							: "Meta muestra el post a quien tiende a hacer clic; botón y destino al sitio con atribución."}{" "}
						Instagram (feed y Explorar), Argentina, 25 a 60 años, abogados por cargo, estudios e interés. Se crea <strong>en pausa</strong>:
						no gasta hasta que la actives.
					</Typography>
					<Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
						<TextField
							label="Presupuesto diario (ARS)"
							size="small"
							type="number"
							value={presupuesto}
							onChange={(e) => setPresupuesto(e.target.value)}
							disabled={ocupado}
							inputProps={{ min: 1, step: 100 }}
							helperText="Meta exige un mínimo (~ARS 1.500)"
							sx={{ minWidth: 190 }}
						/>
						<TextField
							label="Días"
							size="small"
							type="number"
							value={dias}
							onChange={(e) => setDias(e.target.value)}
							disabled={ocupado}
							inputProps={{ min: 1, max: 90 }}
							helperText="Desde hoy"
							sx={{ width: 110 }}
						/>
						{!esInteraccion && (
							<FormControl size="small" sx={{ minWidth: 170 }}>
								<InputLabel>Botón</InputLabel>
								<Select value={cta} label="Botón" onChange={(e) => setCta(e.target.value as "SIGN_UP" | "LEARN_MORE")} disabled={ocupado}>
									<MenuItem value="SIGN_UP">Registrarte</MenuItem>
									<MenuItem value="LEARN_MORE">Más información</MenuItem>
								</Select>
							</FormControl>
						)}
					</Stack>
					{!esInteraccion && (
						<TextField
							label="URL de destino"
							size="small"
							fullWidth
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							disabled={ocupado}
							helperText="Los parámetros de atribución (source=meta_ads, utm_*) se agregan solos"
						/>
					)}
					<Box>
						<Button
							variant="contained"
							size="small"
							startIcon={accion === "crear" ? <CircularProgress size={14} color="inherit" /> : <Chart size={16} />}
							disabled={ocupado}
							onClick={() => correr("crear")}
							sx={{ whiteSpace: "nowrap" }}
						>
							Crear campaña en pausa
						</Button>
					</Box>
				</>
			)}

			{tieneCampana && (
				<>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						{chipMeta ? (
							<Chip size="small" color={chipMeta.color} variant="filled" label={`Meta: ${chipMeta.label}`} />
						) : (
							<Chip size="small" variant="outlined" label={cargando ? "Consultando…" : `Local: ${post.promocion?.estado}`} />
						)}
						<Chip size="small" variant="outlined" label={post.promocion?.objetivo === "interaccion" ? "Interacción" : "Tráfico"} />
						<Typography variant="caption" color="text.secondary">
							{ars(post.promocion?.presupuestoDiarioARS)}/día · {post.promocion?.dias} días · {fmt(post.promocion?.inicio)} →{" "}
							{fmt(post.promocion?.fin)}
						</Typography>
						{estado?.adsManagerUrl && (
							<Link href={estado.adsManagerUrl} target="_blank" rel="noreferrer" variant="caption">
								Ver en Ads Manager
							</Link>
						)}
					</Stack>

					{ins ? (
						<Typography variant="caption" color="text.secondary">
							Impresiones {Number(ins.impressions || 0).toLocaleString("es-AR")} · alcance {Number(ins.reach || 0).toLocaleString("es-AR")}{" "}
							· clics en el enlace {Number(ins.inline_link_clicks || 0).toLocaleString("es-AR")} · CTR{" "}
							{ins.ctr ? `${Number(ins.ctr).toFixed(2)}%` : "—"} · CPC {ars(ins.cpc)} · gastado {ars(ins.spend)}
						</Typography>
					) : (
						<Typography variant="caption" color="text.secondary">
							Sin métricas todavía{activa ? " (Meta tarda unas horas en reportar)" : ""}.
						</Typography>
					)}

					{typeof estado?.registros === "number" && post.promocion?.objetivo !== "interaccion" && (
						<Typography variant="caption" color="text.secondary">
							Registros atribuidos: <strong>{estado.registros}</strong>
							{ins?.spend && estado.registros > 0 ? ` · ${ars(Number(ins.spend) / estado.registros)} por registro` : ""}
						</Typography>
					)}

					{estado?.historial && estado.historial.length > 0 && (
						<Box sx={{ overflowX: "auto" }}>
							<Table size="small" sx={{ minWidth: 520, "& td, & th": { py: 0.25, fontSize: 12 } }}>
								<TableHead>
									<TableRow>
										<TableCell>Día</TableCell>
										<TableCell align="right">Impresiones</TableCell>
										<TableCell align="right">Clics</TableCell>
										<TableCell align="right">CTR</TableCell>
										<TableCell align="right">CPC</TableCell>
										<TableCell align="right">Gasto</TableCell>
										{post.promocion?.objetivo === "interaccion" ? (
											<>
												<TableCell align="right">Interacc.</TableCell>
												<TableCell align="right">Likes</TableCell>
												<TableCell align="right">Guardados</TableCell>
											</>
										) : (
											<TableCell align="right">Registros</TableCell>
										)}
									</TableRow>
								</TableHead>
								<TableBody>
									{estado.historial.map((h) => (
										<TableRow key={h.fecha}>
											<TableCell>{h.fecha.slice(5).split("-").reverse().join("/")}</TableCell>
											<TableCell align="right">{h.impressions.toLocaleString("es-AR")}</TableCell>
											<TableCell align="right">{h.inlineLinkClicks}</TableCell>
											<TableCell align="right">{h.ctr === null ? "—" : `${Number(h.ctr).toFixed(2)}%`}</TableCell>
											<TableCell align="right">{h.cpc === null ? "—" : ars(h.cpc)}</TableCell>
											<TableCell align="right">{ars(h.spend)}</TableCell>
											{post.promocion?.objetivo === "interaccion" ? (
												<>
													<TableCell align="right">{h.interacciones ?? 0}</TableCell>
													<TableCell align="right">{h.likes ?? 0}</TableCell>
													<TableCell align="right">{h.guardados ?? 0}</TableCell>
												</>
											) : (
												<TableCell align="right">{h.registros}</TableCell>
											)}
										</TableRow>
									))}
								</TableBody>
							</Table>
							<Typography variant="caption" color="text.secondary">
								Lo guarda el cron de seguimiento cada 6 horas; Meta ajusta los números del día durante ~48 h. Resumen diario por Telegram a
								las 9:00.
							</Typography>
						</Box>
					)}

					{efectivo === "WITH_ISSUES" || efectivo === "DISAPPROVED" ? (
						<Alert severity="error" variant="outlined">
							Meta marcó la campaña con problemas o rechazó el anuncio. Revisá el detalle en Ads Manager.
						</Alert>
					) : null}

					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						{activa ? (
							<Button
								size="small"
								variant="outlined"
								color="warning"
								startIcon={accion === "pausar" ? <CircularProgress size={14} color="inherit" /> : <PauseCircle size={16} />}
								disabled={ocupado}
								onClick={() => correr("pausar")}
								sx={{ whiteSpace: "nowrap" }}
							>
								Pausar
							</Button>
						) : (
							<Button
								size="small"
								variant="contained"
								color="success"
								startIcon={accion === "activar" ? <CircularProgress size={14} color="inherit" /> : <PlayCircle size={16} />}
								disabled={ocupado}
								onClick={() => setConfirmar("activar")}
								sx={{ whiteSpace: "nowrap" }}
							>
								Activar campaña
							</Button>
						)}
						<Tooltip title="Volver a consultar estado y métricas en Meta">
							<span>
								<Button size="small" variant="text" startIcon={<Refresh size={16} />} disabled={cargando || ocupado} onClick={cargar}>
									Actualizar
								</Button>
							</span>
						</Tooltip>
						<Tooltip title="Borra la campaña en Meta (no el post) para rehacerla con otros valores">
							<span>
								<Button
									size="small"
									variant="text"
									color="error"
									startIcon={accion === "eliminar" ? <CircularProgress size={14} color="inherit" /> : <Trash size={16} />}
									disabled={ocupado || activa}
									onClick={() => setConfirmar("eliminar")}
								>
									Eliminar
								</Button>
							</span>
						</Tooltip>
					</Stack>
				</>
			)}

			<Dialog open={confirmar !== null} onClose={() => setConfirmar(null)} maxWidth="xs" fullWidth>
				<DialogTitle>{confirmar === "activar" ? "Activar la campaña" : "Eliminar la campaña"}</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						{confirmar === "activar"
							? `A partir de ahora Meta cobra hasta ${ars(post.promocion?.presupuestoDiarioARS)} por día hasta el ${fmt(
									post.promocion?.fin,
							  )}. El anuncio pasa por revisión antes de mostrarse. Se puede pausar en cualquier momento.`
							: "Se borra la campaña en Meta con su conjunto y anuncio. El post de Instagram no se toca."}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmar(null)}>Cancelar</Button>
					<Button
						variant="contained"
						color={confirmar === "activar" ? "success" : "error"}
						onClick={() => correr(confirmar as "activar" | "eliminar")}
					>
						{confirmar === "activar" ? "Activar" : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default MetaPromocionPanel;
