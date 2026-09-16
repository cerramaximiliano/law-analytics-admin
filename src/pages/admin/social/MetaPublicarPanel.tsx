/**
 * Panel "Publicar en Meta" del editor de posts sociales.
 *
 * Programa o publica un post guardado en la página de Facebook y en Instagram
 * a través de la-marketing-service (services/social/metaPublisher.js), que
 * habla con Graph API. La programación queda en el post (`programadoPara`,
 * estado 'programado') y la ejecuta el cron `social-publisher-prod` cada 5 min.
 * "Publicar ahora" responde 202 y corre en segundo plano: acá se consulta el
 * post cada 3 s hasta que `publicacion.estado` deje de ser 'publicando'.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	FormGroup,
	Link,
	Stack,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Calendar, CloseCircle, Link21, Refresh, Send2 } from "iconsax-react";

import {
	cancelarProgramacionPost,
	desvincularRedPost,
	getMetaWhoami,
	getPost,
	programarPost,
	publicarPostAhora,
	type DestinoMeta,
	type MetaWhoami,
	type SocialPost,
} from "api/socialPosts";
import MetaPromocionPanel from "./MetaPromocionPanel";

interface Props {
	postId: string;
	/** Avisa al padre cuando el estado del post cambió (para refrescar la lista). */
	onChange?: (post: SocialPost) => void;
}

const POLL_MS = 3000;
const POLL_MAX = 60; // 3 minutos

/** `2026-09-16T10:30` (hora local) para el input datetime-local. */
const aInputLocal = (d: Date) => {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Misma regla que captionParaFacebook() en la-marketing-service: sin la línea "Link in BIO". */
const captionParaFacebook = (caption: string) =>
	caption
		.split("\n")
		.filter((l) => !/^\s*link\s+in\s+bio\s*$/i.test(l))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

const PUBLICACION_LABEL: Record<string, { label: string; color: "default" | "info" | "success" | "warning" | "error" }> = {
	pendiente: { label: "Pendiente", color: "info" },
	publicando: { label: "Publicando…", color: "warning" },
	publicado: { label: "Publicado", color: "success" },
	parcial: { label: "Parcial", color: "warning" },
	error: { label: "Error", color: "error" },
};

const MetaPublicarPanel = ({ postId, onChange }: Props) => {
	const { enqueueSnackbar } = useSnackbar();
	const [post, setPost] = useState<SocialPost | null>(null);
	const [whoami, setWhoami] = useState<MetaWhoami | null>(null);
	const [cargando, setCargando] = useState(false);
	const [accion, setAccion] = useState<"programar" | "publicar" | "cancelar" | null>(null);
	const [confirmarPublicar, setConfirmarPublicar] = useState(false);
	const [desvincular, setDesvincular] = useState<DestinoMeta | null>(null);
	const [destinos, setDestinos] = useState<DestinoMeta[]>(["facebook", "instagram"]);
	// Caption propio para Facebook. Vacío = el backend usa el de Instagram sin "Link in BIO".
	const [captionFacebook, setCaptionFacebook] = useState("");
	// Default: mañana a las 10:00 hora local.
	const [fecha, setFecha] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		d.setHours(10, 0, 0, 0);
		return aInputLocal(d);
	});
	const pollRef = useRef<number | null>(null);
	// Las casillas y la fecha se toman del post una sola vez: si cada consulta
	// (polling, botón Estado) las pisara, la elección del usuario se perdería.
	// Eso pasó el 2026-09-16: tras un intento fallido solo en Facebook, el
	// polling volvió a tildar Instagram y el reintento salió en las dos redes.
	const formularioInicializado = useRef(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const p = await getPost(postId);
			setPost(p);
			if (!formularioInicializado.current) {
				formularioInicializado.current = true;
				if (p.destinos?.length) setDestinos(p.destinos);
				setCaptionFacebook(p.captionFacebook || "");
				if (p.programadoPara) setFecha(aInputLocal(new Date(p.programadoPara)));
			}
			return p;
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el post", { variant: "error" });
			return null;
		} finally {
			setCargando(false);
		}
	}, [postId, enqueueSnackbar]);

	useEffect(() => {
		cargar();
		getMetaWhoami()
			.then(setWhoami)
			.catch((err) => setWhoami({ configurado: false, graphVersion: "", error: err?.response?.data?.error || err?.message }));
		return () => {
			if (pollRef.current) window.clearInterval(pollRef.current);
		};
	}, [cargar]);

	// Mientras el backend publica, consultamos el post hasta que termine.
	const esperarPublicacion = useCallback(() => {
		if (pollRef.current) window.clearInterval(pollRef.current);
		let vueltas = 0;
		pollRef.current = window.setInterval(async () => {
			vueltas += 1;
			const p = await cargar();
			const terminado = p && p.publicacion?.estado !== "publicando";
			if (terminado || vueltas >= POLL_MAX) {
				if (pollRef.current) window.clearInterval(pollRef.current);
				pollRef.current = null;
				setAccion(null);
				if (p) {
					onChange?.(p);
					if (p.publicacion?.estado === "publicado") enqueueSnackbar("Publicado en Meta", { variant: "success" });
					else if (p.publicacion?.estado === "parcial") enqueueSnackbar("Publicación parcial: revisá el error", { variant: "warning" });
					else if (p.publicacion?.estado === "error") enqueueSnackbar("La publicación falló: revisá el error", { variant: "error" });
					else if (vueltas >= POLL_MAX) enqueueSnackbar("Sigue publicando; volvé a consultar en un rato", { variant: "info" });
				}
			}
		}, POLL_MS);
	}, [cargar, onChange, enqueueSnackbar]);

	useEffect(() => {
		if (post?.publicacion?.estado === "publicando" && !pollRef.current) {
			setAccion("publicar");
			esperarPublicacion();
		}
	}, [post?.publicacion?.estado, esperarPublicacion]);

	const toggleDestino = (d: DestinoMeta) => setDestinos((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

	const handleProgramar = async () => {
		if (!destinos.length) return enqueueSnackbar("Elegí al menos una red", { variant: "warning" });
		const cuando = new Date(fecha);
		if (Number.isNaN(cuando.getTime())) return enqueueSnackbar("Fecha inválida", { variant: "warning" });
		setAccion("programar");
		try {
			const p = await programarPost(postId, { programadoPara: cuando.toISOString(), destinos, captionFacebook });
			setPost(p);
			onChange?.(p);
			enqueueSnackbar(`Programado para ${fmt(p.programadoPara)}`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo programar", { variant: "error" });
		} finally {
			setAccion(null);
		}
	};

	const handleCancelar = async () => {
		setAccion("cancelar");
		try {
			const p = await cancelarProgramacionPost(postId);
			setPost(p);
			onChange?.(p);
			enqueueSnackbar("Programación cancelada", { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo cancelar", { variant: "error" });
		} finally {
			setAccion(null);
		}
	};

	const handleDesvincular = async () => {
		if (!desvincular) return;
		const red = desvincular;
		setDesvincular(null);
		setAccion("cancelar");
		try {
			const p = await desvincularRedPost(postId, red);
			setPost(p);
			onChange?.(p);
			setDestinos((prev) => (prev.includes(red) ? prev : [...prev, red]));
			enqueueSnackbar(`${red === "facebook" ? "Facebook" : "Instagram"} desvinculado: se puede volver a publicar`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo desvincular", { variant: "error" });
		} finally {
			setAccion(null);
		}
	};

	const handlePublicarAhora = async () => {
		if (!destinos.length) return enqueueSnackbar("Elegí al menos una red", { variant: "warning" });
		setConfirmarPublicar(false);
		setAccion("publicar");
		try {
			await publicarPostAhora(postId, { destinos, captionFacebook });
			enqueueSnackbar("Publicando en Meta…", { variant: "info" });
			esperarPublicacion();
		} catch (err: any) {
			setAccion(null);
			enqueueSnackbar(err?.response?.data?.error || "No se pudo publicar", { variant: "error" });
		}
	};

	const tienePiezas = Boolean(post?.mediaResumen?.imagenes);
	const tieneCaption = Boolean(post?.caption?.trim());
	const publicado = post?.estado === "publicado";
	const programado = post?.estado === "programado";
	const publicando = post?.publicacion?.estado === "publicando" || accion === "publicar";
	const configurado = whoami?.configurado === true && !whoami?.error;
	const ocupado = accion !== null || publicando;
	const pub = post?.publicacion;
	// Una red ya publicada no se repite; se puede seguir publicando en la otra.
	const yaEnFacebook = Boolean(pub?.facebookPostId);
	const yaEnInstagram = Boolean(pub?.instagramMediaId);
	const pendientes = destinos.filter((d) => (d === "facebook" ? !yaEnFacebook : !yaEnInstagram));
	const listo = configurado && tienePiezas && tieneCaption && !ocupado && pendientes.length > 0;
	const pubInfo = pub?.estado ? PUBLICACION_LABEL[pub.estado] : null;

	return (
		<Stack spacing={1.5} sx={{ mt: 1 }}>
			<Divider>
				<Typography variant="caption" color="text.secondary">
					Publicar en Meta
				</Typography>
			</Divider>

			{whoami === null ? (
				<Typography variant="caption" color="text.secondary">
					Consultando Meta…
				</Typography>
			) : !configurado ? (
				<Alert severity="warning" variant="outlined">
					{whoami.error
						? `Meta respondió con error: ${whoami.error}`
						: "Meta no está configurada en la-marketing-service (falta META_ADS_ACCESS_TOKEN en el secret)."}
				</Alert>
			) : (
				<Typography variant="caption" color="text.secondary">
					Token OK · página <strong>{whoami.pagina?.name}</strong>
					{whoami.instagram ? (
						<>
							{" "}
							· Instagram <strong>@{whoami.instagram.username || whoami.instagram.id}</strong>
						</>
					) : (
						" · sin Instagram vinculado"
					)}
				</Typography>
			)}

			{post && !tienePiezas && (
				<Alert severity="info" variant="outlined">
					Este post no tiene piezas guardadas. Renderizá y apretá "Actualizar post" para archivar la imagen: es lo que se sube a Meta.
				</Alert>
			)}
			{post && !tieneCaption && (
				<Alert severity="info" variant="outlined">
					El post no tiene caption. Meta publica la imagen con ese texto.
				</Alert>
			)}

			<FormGroup row sx={{ alignItems: "center", columnGap: 1 }}>
				<FormControlLabel
					control={
						<Checkbox
							size="small"
							checked={destinos.includes("facebook")}
							onChange={() => toggleDestino("facebook")}
							disabled={ocupado || yaEnFacebook}
						/>
					}
					label={yaEnFacebook ? "Facebook (publicado)" : "Facebook"}
				/>
				{yaEnFacebook && (
					<Tooltip title="Si lo borraste en Facebook, desvinculalo para poder publicarlo de nuevo">
						<span>
							<Button
								size="small"
								variant="text"
								color="warning"
								startIcon={<Link21 size={14} />}
								disabled={ocupado}
								onClick={() => setDesvincular("facebook")}
							>
								Desvincular
							</Button>
						</span>
					</Tooltip>
				)}
				<FormControlLabel
					control={
						<Checkbox
							size="small"
							checked={destinos.includes("instagram")}
							onChange={() => toggleDestino("instagram")}
							disabled={ocupado || yaEnInstagram}
						/>
					}
					label={yaEnInstagram ? "Instagram (publicado)" : "Instagram"}
				/>
				{yaEnInstagram && (
					<Tooltip title="Si lo borraste en Instagram, desvinculalo para poder publicarlo de nuevo">
						<span>
							<Button
								size="small"
								variant="text"
								color="warning"
								startIcon={<Link21 size={14} />}
								disabled={ocupado}
								onClick={() => setDesvincular("instagram")}
							>
								Desvincular
							</Button>
						</span>
					</Tooltip>
				)}
			</FormGroup>

			{destinos.includes("facebook") && (
				<TextField
					label="Caption para Facebook (opcional)"
					size="small"
					fullWidth
					multiline
					minRows={2}
					value={captionFacebook}
					onChange={(e) => setCaptionFacebook(e.target.value)}
					disabled={ocupado || pendientes.length === 0}
					placeholder="Vacío: se usa el caption del post sin la línea Link in BIO"
					maxRows={6}
					helperText={
						captionFacebook.trim()
							? `${captionFacebook.length}/5000 — Instagram sigue usando el caption del post`
							: `Facebook recibiría: "${captionParaFacebook(post?.caption || "")
									.replace(/\s+/g, " ")
									.slice(0, 90)}…"`
					}
				/>
			)}

			<TextField
				label="Publicar el (hora local)"
				type="datetime-local"
				size="small"
				value={fecha}
				onChange={(e) => setFecha(e.target.value)}
				disabled={ocupado || pendientes.length === 0}
				InputLabelProps={{ shrink: true }}
				sx={{ maxWidth: 260 }}
			/>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Button
					variant="contained"
					size="small"
					startIcon={accion === "programar" ? <CircularProgress size={14} color="inherit" /> : <Calendar size={16} />}
					disabled={!listo}
					onClick={handleProgramar}
					sx={{ whiteSpace: "nowrap" }}
				>
					{programado ? "Reprogramar" : "Programar"}
				</Button>
				{programado && (
					<Button
						variant="outlined"
						size="small"
						color="warning"
						startIcon={accion === "cancelar" ? <CircularProgress size={14} color="inherit" /> : <CloseCircle size={16} />}
						disabled={ocupado}
						onClick={handleCancelar}
						sx={{ whiteSpace: "nowrap" }}
					>
						Cancelar programación
					</Button>
				)}
				<Tooltip title="Publica en este momento, sin esperar al cron">
					<span>
						<Button
							variant="outlined"
							size="small"
							startIcon={publicando ? <CircularProgress size={14} color="inherit" /> : <Send2 size={16} />}
							disabled={!listo}
							onClick={() => setConfirmarPublicar(true)}
							sx={{ whiteSpace: "nowrap" }}
						>
							{publicando ? "Publicando…" : "Publicar ahora"}
						</Button>
					</span>
				</Tooltip>
				<Tooltip title="Volver a consultar el estado">
					<span>
						<Button size="small" variant="text" disabled={cargando} onClick={() => cargar()} startIcon={<Refresh size={16} />}>
							Estado
						</Button>
					</span>
				</Tooltip>
			</Stack>

			{post && (programado || pubInfo || publicado) && (
				<Box>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
						{programado && <Chip size="small" color="warning" variant="outlined" label={`Programado · ${fmt(post.programadoPara)}`} />}
						{pubInfo && <Chip size="small" color={pubInfo.color} variant="outlined" label={`Meta: ${pubInfo.label}`} />}
						{publicado && post.publicadoEn && (
							<Chip size="small" color="success" variant="outlined" label={`Publicado · ${fmt(post.publicadoEn)}`} />
						)}
						{typeof pub?.intentos === "number" && pub.intentos > 0 && (
							<Typography variant="caption" color="text.secondary">
								{pub.intentos} intento(s) · último {fmt(pub.ultimoIntentoEn)}
							</Typography>
						)}
					</Stack>
					{(pub?.facebookPostId || pub?.instagramMediaId) && (
						<Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
							{pub?.facebookPostId && (
								<>
									Facebook:{" "}
									<Link href={`https://www.facebook.com/${pub.facebookPostId}`} target="_blank" rel="noreferrer">
										{pub.facebookPostId}
									</Link>
								</>
							)}
							{pub?.facebookPostId && pub?.instagramMediaId && " · "}
							{pub?.instagramMediaId && <>Instagram: {pub.instagramMediaId}</>}
						</Typography>
					)}
					{pub?.error && (
						<Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
							{pub.error}
						</Alert>
					)}
				</Box>
			)}

			{post && (
				<MetaPromocionPanel
					post={post}
					onChange={(p) => {
						setPost(p);
						onChange?.(p);
					}}
				/>
			)}

			<Dialog open={desvincular !== null} onClose={() => setDesvincular(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Desvincular {desvincular === "facebook" ? "Facebook" : "Instagram"}</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Se olvida el id de la publicación en {desvincular === "facebook" ? "Facebook" : "Instagram"} para poder volver a publicarla
						desde acá. No borra nada en la red: si la publicación sigue existiendo allá, va a quedar duplicada.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDesvincular(null)}>Cancelar</Button>
					<Button variant="contained" color="warning" onClick={handleDesvincular}>
						Desvincular
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog open={confirmarPublicar} onClose={() => setConfirmarPublicar(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Publicar ahora en Meta</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Se publica en este momento en{" "}
						<strong>{pendientes.map((d) => (d === "facebook" ? "Facebook" : "Instagram")).join(" e ")}</strong>. No se puede deshacer desde
						acá: si hay que bajarlo, se borra en la red.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmarPublicar(false)}>Cancelar</Button>
					<Button variant="contained" onClick={handlePublicarAhora}>
						Publicar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default MetaPublicarPanel;
