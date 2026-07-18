/**
 * Estudio de posts sociales
 * =========================
 * Genera posts para Instagram / Facebook a partir de un prompt.
 *
 * El flujo es: prompt -> Claude devuelve JSON estructurado -> plantilla HTML
 * fija -> render headless a PNG. El modelo aporta el copy; la plantilla aporta
 * el diseno, asi que todo post sale on-brand por construccion.
 *
 * La imagen no se persiste: es derivada del JSON y se regenera siempre. Eso
 * permite rehacer el catalogo entero si cambia un token de marca.
 *
 * Backend: la-marketing-service, /api/social/* (via mktAxios).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

// material-ui
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
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { Add, Copy, DocumentDownload, Gallery, Magicpen, Refresh, Trash, VideoPlay } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import {
	ContenidoPost,
	FormatoId,
	FormatoInfo,
	SocialPost,
	TemplateId,
	TemplateInfo,
	VarianteFormato,
	VideoResponse,
	AnimacionInfo,
	createPost,
	deletePost,
	downloadImage,
	duplicatePost,
	generateContent,
	getHealth,
	getTemplates,
	listPosts,
	renderAllFormats,
	renderContent,
	renderVideo,
	downloadVideo,
	updatePost,
} from "api/socialPosts";

// ==============================|| HELPERS ||============================== //

const ESTADO_COLOR: Record<string, "default" | "info" | "success"> = {
	borrador: "default",
	aprobado: "info",
	publicado: "success",
};

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

/** Campos que son arrays de strings simples (chips, tools, hashtags). */
const isStringArrayField = (schemaType: string | undefined) => schemaType === "array";

/** Contenido inicial vacio derivado del schema de la plantilla. */
const emptyContent = (tpl: TemplateInfo): ContenidoPost => {
	const out: ContenidoPost = {};
	for (const [field, def] of Object.entries(tpl.schema.properties || {})) {
		if (field === "slides")
			out[field] = [
				{ titulo: "", texto: "" },
				{ titulo: "", texto: "" },
			];
		else if (isStringArrayField(def.type)) out[field] = [];
		else out[field] = "";
	}
	return out;
};

// ==============================|| EDITOR DE CAMPOS ||============================== //

/**
 * Campos editables derivados del schema de una plantilla.
 * Lo comparten el estudio y el modal de duplicado, para que editar el
 * contenido sea la misma experiencia en los dos lugares.
 */
const CamposPlantilla = ({
	tpl,
	contenido,
	setCampo,
}: {
	tpl: TemplateInfo;
	contenido: ContenidoPost;
	setCampo: (field: string, value: unknown) => void;
}) => {
	const props = tpl.schema.properties || {};

	return (
		<>
			{Object.entries(props).map(([field, def]) => {
				const limite = tpl.limits?.[field];
				const value = contenido[field];

				// Carrusel: los slides son un array de objetos.
				if (field === "slides") {
					const slides = Array.isArray(value) ? (value as Array<{ titulo: string; texto: string }>) : [];
					return (
						<Box key={field} sx={{ mt: 1 }}>
							<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
								<Typography variant="subtitle2">Slides ({slides.length})</Typography>
								<Button
									size="small"
									startIcon={<Add size={16} />}
									disabled={slides.length >= 7}
									onClick={() => setCampo("slides", [...slides, { titulo: "", texto: "" }])}
								>
									Agregar
								</Button>
							</Stack>
							<Stack spacing={1.5}>
								{slides.map((s, i) => (
									<MainCard key={i} content={false} sx={{ p: 1.5 }}>
										<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
											<Typography variant="caption" color="text.secondary">
												Paso {i + 1}
											</Typography>
											<IconButton
												size="small"
												disabled={slides.length <= 2}
												onClick={() =>
													setCampo(
														"slides",
														slides.filter((_, idx) => idx !== i),
													)
												}
											>
												<Trash size={16} />
											</IconButton>
										</Stack>
										<Stack spacing={1}>
											<TextField
												size="small"
												label="Título"
												fullWidth
												value={s.titulo}
												error={s.titulo.length > 48}
												helperText={`${s.titulo.length}/48`}
												onChange={(e) =>
													setCampo(
														"slides",
														slides.map((sl, idx) => (idx === i ? { ...sl, titulo: e.target.value } : sl)),
													)
												}
											/>
											<TextField
												size="small"
												label="Texto"
												fullWidth
												multiline
												minRows={2}
												value={s.texto}
												error={s.texto.length > 160}
												helperText={`${s.texto.length}/160`}
												onChange={(e) =>
													setCampo(
														"slides",
														slides.map((sl, idx) => (idx === i ? { ...sl, texto: e.target.value } : sl)),
													)
												}
											/>
										</Stack>
									</MainCard>
								))}
							</Stack>
						</Box>
					);
				}

				// Arrays simples: se editan como lista separada por comas.
				if (isStringArrayField(def.type)) {
					const arr = Array.isArray(value) ? (value as string[]) : [];
					return (
						<TextField
							key={field}
							label={field}
							fullWidth
							size="small"
							value={arr.join(", ")}
							helperText={def.description || "Separá los items con comas"}
							onChange={(e) =>
								setCampo(
									field,
									e.target.value
										.split(",")
										.map((s) => s.trim())
										.filter(Boolean),
								)
							}
						/>
					);
				}

				const str = typeof value === "string" ? value : "";
				const excedido = Boolean(limite && str.length > limite);
				const largo = str.length > 90;

				return (
					<TextField
						key={field}
						label={field}
						fullWidth
						size="small"
						multiline={largo}
						minRows={largo ? 2 : undefined}
						value={str}
						error={excedido}
						helperText={limite ? `${str.length}/${limite}` : def.description}
						onChange={(e) => setCampo(field, e.target.value)}
					/>
				);
			})}
		</>
	);
};

// ==============================|| PAGINA ||============================== //

const SocialStudio = () => {
	const { enqueueSnackbar } = useSnackbar();

	// --- catalogo y estado del servicio
	const [templates, setTemplates] = useState<TemplateInfo[]>([]);
	const [formats, setFormats] = useState<FormatoInfo[]>([]);
	const [health, setHealth] = useState<{ renderer: boolean; claude: boolean } | null>(null);
	const [loadingCatalogo, setLoadingCatalogo] = useState(true);

	// --- estudio
	const [tab, setTab] = useState(0);
	const [templateId, setTemplateId] = useState<TemplateId>("novedad");
	const [formato, setFormato] = useState<FormatoId>("feed45");
	const [prompt, setPrompt] = useState("");
	const [contenido, setContenido] = useState<ContenidoPost>({});
	const [warnings, setWarnings] = useState<string[]>([]);
	const [generando, setGenerando] = useState(false);
	const [renderizando, setRenderizando] = useState(false);
	const [images, setImages] = useState<string[]>([]);
	const [titulo, setTitulo] = useState("");
	const [caption, setCaption] = useState("");
	const [guardando, setGuardando] = useState(false);
	// Variantes: el mismo contenido renderizado en los 4 formatos de una pasada.
	const [variantes, setVariantes] = useState<VarianteFormato[]>([]);
	const [generandoVariantes, setGenerandoVariantes] = useState(false);
	// --- video (story 1080x1920)
	const [animacion, setAnimacion] = useState("entrada");
	const [video, setVideo] = useState<VideoResponse | null>(null);
	const [generandoVideo, setGenerandoVideo] = useState(false);
	const [editandoId, setEditandoId] = useState<string | null>(null);

	// --- guardados
	const [posts, setPosts] = useState<SocialPost[]>([]);
	const [loadingPosts, setLoadingPosts] = useState(false);
	const [aBorrar, setABorrar] = useState<SocialPost | null>(null);

	// --- duplicado (series recurrentes: UMA mes a mes, indices, etc.)
	const [aDuplicar, setADuplicar] = useState<SocialPost | null>(null);
	const [contenidoDup, setContenidoDup] = useState<ContenidoPost>({});
	const [tituloDup, setTituloDup] = useState("");
	const [duplicando, setDuplicando] = useState(false);

	const tplActual = useMemo(() => templates.find((t) => t.id === templateId) || null, [templates, templateId]);
	const animsDisponibles = useMemo<AnimacionInfo[]>(() => tplActual?.animaciones || [], [tplActual]);

	const fmtActual = useMemo(() => formats.find((f) => f.id === formato) || null, [formats, formato]);

	// Limites de caracteres excedidos, calculados en vivo sobre lo que se edita.
	const excesos = useMemo(() => {
		if (!tplActual) return [] as string[];
		const out: string[] = [];
		for (const [field, max] of Object.entries(tplActual.limits || {})) {
			const value = contenido[field];
			if (typeof value === "string" && value.length > max) {
				out.push(`"${field}": ${value.length}/${max} caracteres`);
			}
		}
		return out;
	}, [tplActual, contenido]);

	// --- carga inicial
	useEffect(() => {
		let cancelado = false;
		(async () => {
			try {
				const [cat, hp] = await Promise.all([getTemplates(), getHealth().catch(() => null)]);
				if (cancelado) return;
				setTemplates(cat.templates);
				setFormats(cat.formats);
				setFormato(cat.defaultFormat);
				if (hp) setHealth({ renderer: hp.renderer.online, claude: hp.claudeConfigurado });
			} catch (err: any) {
				if (!cancelado) enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el catálogo de plantillas", { variant: "error" });
			} finally {
				if (!cancelado) setLoadingCatalogo(false);
			}
		})();
		return () => {
			cancelado = true;
		};
	}, [enqueueSnackbar]);

	// Al cambiar de plantilla, resetear el contenido a la forma de la nueva.
	useEffect(() => {
		if (!tplActual) return;
		setContenido(emptyContent(tplActual));
		setImages([]);
		setVariantes([]);
		setVideo(null);
		setWarnings([]);
		setEditandoId(null);
	}, [tplActual]);

	useEffect(() => {
		if (animsDisponibles.length && !animsDisponibles.some((a) => a.id === animacion)) {
			setAnimacion(animsDisponibles[0].id);
		}
	}, [animsDisponibles, animacion]);

	const cargarPosts = useCallback(async () => {
		setLoadingPosts(true);
		try {
			const res = await listPosts({ limit: 50 });
			setPosts(res.posts);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar los posts", { variant: "error" });
		} finally {
			setLoadingPosts(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		if (tab === 1) cargarPosts();
	}, [tab, cargarPosts]);

	// --- acciones
	const handleGenerar = async () => {
		if (!prompt.trim()) {
			enqueueSnackbar("Escribí un prompt antes de generar", { variant: "warning" });
			return;
		}
		setGenerando(true);
		try {
			const res = await generateContent({ templateId, prompt: prompt.trim() });
			setContenido(res.contenido);
			setWarnings(res.warnings);
			setImages([]);
			if (!titulo) setTitulo(prompt.trim().slice(0, 80));
			enqueueSnackbar(`Contenido generado (${res.usage.outputTokens} tokens)`, { variant: "success" });
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Falló la generación", { variant: "error" });
		} finally {
			setGenerando(false);
		}
	};

	const handleRenderizar = async () => {
		setRenderizando(true);
		try {
			const res = await renderContent({ templateId, contenido, formato });
			setImages(res.images);
			enqueueSnackbar(`Render listo en ${res.ms} ms`, { variant: "success" });
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.validationErrors?.length) {
				setWarnings(data.validationErrors);
				enqueueSnackbar("El contenido no pasa la validación de la plantilla", { variant: "warning" });
			} else {
				enqueueSnackbar(data?.error || "Falló el render", { variant: "error" });
			}
		} finally {
			setRenderizando(false);
		}
	};

	// Genera las 4 variantes de una sola vez. Cada formato ajusta su escala
	// tipografica y su zona segura, asi que no es la misma imagen recortada:
	// es el mismo contenido re-maquetado.
	const handleVariantes = async () => {
		setGenerandoVariantes(true);
		try {
			const res = await renderAllFormats({ templateId, contenido });
			setVariantes(res);
			const fallidos = res.filter((v) => v.error);
			if (fallidos.length) {
				enqueueSnackbar(`${fallidos.length} formato(s) fallaron: ${fallidos.map((f) => f.label).join(", ")}`, { variant: "warning" });
			} else {
				enqueueSnackbar(`${res.length} variantes generadas`, { variant: "success" });
			}
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.validationErrors?.length) setWarnings(data.validationErrors);
			enqueueSnackbar(data?.error || "No se pudieron generar las variantes", { variant: "error" });
		} finally {
			setGenerandoVariantes(false);
		}
	};

	/** Descarga todas las imagenes de todas las variantes generadas. */
	const handleDescargarTodo = () => {
		let n = 0;
		for (const v of variantes) {
			(v.images || []).forEach((img, i) => {
				const sufijo = (v.images || []).length > 1 ? `-${i + 1}` : "";
				downloadImage(img, `${templateId}-${v.formato}${sufijo}`);
				n++;
			});
		}
		enqueueSnackbar(`${n} archivo(s) descargados`, { variant: "success" });
	};

	const handleVideo = async () => {
		setGenerandoVideo(true);
		setVideo(null);
		try {
			const r = await renderVideo({ templateId, contenido, animacion });
			setVideo(r);
			enqueueSnackbar(`Video listo: ${r.frames} frames en ${(r.ms / 1000).toFixed(0)}s`, { variant: "success" });
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.validationErrors?.length) setWarnings(data.validationErrors);
			enqueueSnackbar(data?.error || "No se pudo generar el video", { variant: "error" });
		} finally {
			setGenerandoVideo(false);
		}
	};

	const handleGuardar = async () => {
		if (!titulo.trim()) {
			enqueueSnackbar("Poné un título para identificar el post", { variant: "warning" });
			return;
		}
		setGuardando(true);
		try {
			if (editandoId) {
				await updatePost(editandoId, { titulo: titulo.trim(), formato, contenido, caption });
				enqueueSnackbar("Post actualizado", { variant: "success" });
			} else {
				const creado = await createPost({
					titulo: titulo.trim(),
					templateId,
					formato,
					prompt,
					contenido,
					caption,
				});
				setEditandoId(creado._id);
				enqueueSnackbar("Post guardado", { variant: "success" });
			}
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.validationErrors?.length) setWarnings(data.validationErrors);
			enqueueSnackbar(data?.error || "No se pudo guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const handleAbrirPost = (post: SocialPost) => {
		setTemplateId(post.templateId);
		setFormato(post.formato);
		setPrompt(post.prompt || "");
		setTitulo(post.titulo);
		setCaption(post.caption || "");
		// Se setea despues del efecto de reset de plantilla.
		setTimeout(() => {
			setContenido(post.contenido);
			setEditandoId(post._id);
			setImages([]);
			setWarnings([]);
		}, 0);
		setTab(0);
	};

	const handleBorrar = async () => {
		if (!aBorrar) return;
		try {
			await deletePost(aBorrar._id);
			enqueueSnackbar("Post eliminado", { variant: "success" });
			if (editandoId === aBorrar._id) setEditandoId(null);
			cargarPosts();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo eliminar", { variant: "error" });
		} finally {
			setABorrar(null);
		}
	};

	// Abre el modal precargado con el contenido del original. El usuario pisa
	// solo los campos que cambian; el resto se hereda.
	const handleAbrirDuplicar = (post: SocialPost) => {
		setADuplicar(post);
		setContenidoDup({ ...post.contenido });
		setTituloDup(`${post.titulo} (copia)`);
	};

	const handleDuplicar = async () => {
		if (!aDuplicar) return;
		setDuplicando(true);
		try {
			const copia = await duplicatePost(aDuplicar._id, {
				contenido: contenidoDup,
				titulo: tituloDup.trim() || undefined,
			});
			enqueueSnackbar(`Duplicado creado: ${copia.titulo}`, { variant: "success" });
			setADuplicar(null);
			cargarPosts();
		} catch (err: any) {
			const data = err?.response?.data;
			if (data?.validationErrors?.length) {
				enqueueSnackbar(data.validationErrors[0], { variant: "warning" });
			} else {
				enqueueSnackbar(data?.error || "No se pudo duplicar", { variant: "error" });
			}
		} finally {
			setDuplicando(false);
		}
	};

	const handleNuevo = () => {
		if (tplActual) setContenido(emptyContent(tplActual));
		setPrompt("");
		setTitulo("");
		setCaption("");
		setImages([]);
		setVariantes([]);
		setVideo(null);
		setWarnings([]);
		setEditandoId(null);
	};

	const setCampo = (field: string, value: unknown) => setContenido((prev) => ({ ...prev, [field]: value }));

	if (loadingCatalogo) {
		return (
			<MainCard title="Estudio de posts sociales">
				<Stack alignItems="center" sx={{ py: 6 }}>
					<CircularProgress />
				</Stack>
			</MainCard>
		);
	}

	return (
		<MainCard
			title="Estudio de posts sociales"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					{health && !health.claude && <Chip size="small" color="error" variant="outlined" label="Claude sin API key" />}
					{health && !health.renderer && <Chip size="small" color="error" variant="outlined" label="Renderer offline" />}
					{health && health.claude && health.renderer && <Chip size="small" color="success" variant="outlined" label="Servicio OK" />}
				</Stack>
			}
		>
			<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
				<Tab label="Estudio" />
				<Tab label="Guardados" />
			</Tabs>

			{tab === 0 && (
				<Grid container spacing={2}>
					{/* ---------- Panel izquierdo: prompt y campos ---------- */}
					<Grid item xs={12} md={6}>
						<Stack spacing={2}>
							<Stack direction="row" spacing={1}>
								<FormControl fullWidth size="small">
									<InputLabel>Plantilla</InputLabel>
									<Select value={templateId} label="Plantilla" onChange={(e) => setTemplateId(e.target.value as TemplateId)}>
										{templates.map((t) => (
											<MenuItem key={t.id} value={t.id}>
												{t.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<FormControl fullWidth size="small">
									<InputLabel>Formato</InputLabel>
									<Select value={formato} label="Formato" onChange={(e) => setFormato(e.target.value as FormatoId)}>
										{formats.map((f) => (
											<MenuItem key={f.id} value={f.id}>
												{f.label} · {f.width}×{f.height}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Stack>

							{tplActual && (
								<Typography variant="caption" color="text.secondary">
									{tplActual.description}
								</Typography>
							)}

							<TextField
								label="Prompt"
								placeholder="Ej: anunciá que ya cubrimos Catamarca, con tono sobrio"
								fullWidth
								multiline
								minRows={3}
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
							/>

							<Stack direction="row" spacing={1}>
								<Button
									variant="contained"
									startIcon={generando ? <CircularProgress size={16} color="inherit" /> : <Magicpen size={18} />}
									disabled={generando || !health?.claude}
									onClick={handleGenerar}
								>
									{generando ? "Generando…" : "Generar con Claude"}
								</Button>
								<Button variant="outlined" color="secondary" onClick={handleNuevo}>
									Limpiar
								</Button>
							</Stack>

							{warnings.length > 0 && (
								<Alert severity="warning" onClose={() => setWarnings([])}>
									<Typography variant="subtitle2">Revisá estos campos</Typography>
									{warnings.map((w, i) => (
										<Typography key={i} variant="caption" display="block">
											• {w}
										</Typography>
									))}
								</Alert>
							)}

							<Divider>
								<Typography variant="caption" color="text.secondary">
									Contenido
								</Typography>
							</Divider>

							<Stack spacing={1.5}>{tplActual && <CamposPlantilla tpl={tplActual} contenido={contenido} setCampo={setCampo} />}</Stack>

							<Divider>
								<Typography variant="caption" color="text.secondary">
									Publicación
								</Typography>
							</Divider>

							<TextField
								label="Título interno"
								size="small"
								fullWidth
								value={titulo}
								onChange={(e) => setTitulo(e.target.value)}
								helperText="Solo para identificarlo en la lista"
							/>
							<TextField
								label="Caption del post"
								size="small"
								fullWidth
								multiline
								minRows={3}
								value={caption}
								onChange={(e) => setCaption(e.target.value)}
								helperText={`${caption.length}/2200 — el texto que acompaña a la imagen`}
							/>
						</Stack>
					</Grid>

					{/* ---------- Panel derecho: preview ---------- */}
					<Grid item xs={12} md={6}>
						<Stack spacing={2}>
							<Stack direction="row" spacing={1}>
								<Button
									variant="contained"
									fullWidth
									startIcon={renderizando ? <CircularProgress size={16} color="inherit" /> : <Refresh size={18} />}
									disabled={renderizando || excesos.length > 0 || !health?.renderer}
									onClick={handleRenderizar}
								>
									{renderizando ? "Renderizando…" : "Renderizar"}
								</Button>
								<Button variant="outlined" fullWidth disabled={guardando} onClick={handleGuardar}>
									{editandoId ? "Actualizar" : "Guardar"}
								</Button>
							</Stack>

							<Button
								variant="contained"
								color="secondary"
								fullWidth
								startIcon={generandoVariantes ? <CircularProgress size={16} color="inherit" /> : <Gallery size={18} />}
								disabled={generandoVariantes || excesos.length > 0 || !health?.renderer}
								onClick={handleVariantes}
							>
								{generandoVariantes ? "Generando variantes…" : "Generar los 4 formatos"}
							</Button>

							{/* Video: story 1080x1920, que es el formato en que IG publica video */}
							<MainCard content={false} sx={{ p: 2 }}>
								<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
									<VideoPlay size={18} />
									<Typography variant="subtitle2">Video (story 1080×1920)</Typography>
								</Stack>
								<Stack spacing={1.5}>
									<FormControl fullWidth size="small">
										<InputLabel>Animación</InputLabel>
										<Select value={animacion} label="Animación" onChange={(e) => setAnimacion(e.target.value)}>
											{animsDisponibles.map((a) => (
												<MenuItem key={a.id} value={a.id}>
													{a.label} · {a.duracion}s
												</MenuItem>
											))}
										</Select>
									</FormControl>
									{animsDisponibles.find((a) => a.id === animacion) && (
										<Typography variant="caption" color="text.secondary">
											{animsDisponibles.find((a) => a.id === animacion)?.description}
										</Typography>
									)}
									<Button
										variant="contained"
										fullWidth
										startIcon={generandoVideo ? <CircularProgress size={16} color="inherit" /> : <VideoPlay size={18} />}
										disabled={generandoVideo || excesos.length > 0 || !health?.renderer}
										onClick={handleVideo}
									>
										{generandoVideo ? "Renderizando video…" : "Generar video"}
									</Button>
									{generandoVideo && (
										<Typography variant="caption" color="text.secondary">
											El render captura un frame por vez: puede tardar entre 30 y 60 segundos.
										</Typography>
									)}
									{video && (
										<Box>
											<Box
												component="video"
												src={`data:video/mp4;base64,${video.video}`}
												controls
												autoPlay
												loop
												muted
												playsInline
												sx={{ width: "100%", display: "block", borderRadius: 1, boxShadow: 3, bgcolor: "#000" }}
											/>
											<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
												<Typography variant="caption" color="text.secondary">
													{video.width}×{video.height} · {(video.duracionMs / 1000).toFixed(1)}s · {(video.bytes / 1024).toFixed(0)} KB
												</Typography>
												<Button
													size="small"
													startIcon={<DocumentDownload size={16} />}
													onClick={() => downloadVideo(video.video, `${templateId}-${video.animacion}`)}
												>
													Descargar mp4
												</Button>
											</Stack>
										</Box>
									)}
								</Stack>
							</MainCard>

							{excesos.length > 0 && (
								<Alert severity="error">
									<Typography variant="subtitle2">Hay campos que exceden el límite</Typography>
									{excesos.map((e, i) => (
										<Typography key={i} variant="caption" display="block">
											• {e}
										</Typography>
									))}
								</Alert>
							)}

							{variantes.length > 0 && (
								<MainCard content={false} sx={{ p: 2 }}>
									<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
										<Typography variant="subtitle2">Variantes por formato</Typography>
										<Button size="small" startIcon={<DocumentDownload size={16} />} onClick={handleDescargarTodo}>
											Descargar todo
										</Button>
									</Stack>
									<Grid container spacing={1.5}>
										{variantes.map((v) => (
											<Grid item xs={6} key={v.formato}>
												{v.error ? (
													<Alert severity="error">
														<Typography variant="caption">
															{v.label}: {v.error}
														</Typography>
													</Alert>
												) : (
													<Box>
														<Box
															component="img"
															src={`data:image/png;base64,${(v.images || [])[0]}`}
															alt={v.label}
															sx={{ width: "100%", display: "block", borderRadius: 1, boxShadow: 2 }}
														/>
														<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
															<Typography variant="caption" color="text.secondary">
																{v.label} · {v.width}×{v.height}
																{(v.images || []).length > 1 ? ` · ${(v.images || []).length} slides` : ""}
															</Typography>
															<Tooltip title="Descargar">
																<IconButton
																	size="small"
																	onClick={() =>
																		(v.images || []).forEach((img, i) =>
																			downloadImage(img, `${templateId}-${v.formato}${(v.images || []).length > 1 ? `-${i + 1}` : ""}`),
																		)
																	}
																>
																	<DocumentDownload size={16} />
																</IconButton>
															</Tooltip>
														</Stack>
													</Box>
												)}
											</Grid>
										))}
									</Grid>
								</MainCard>
							)}

							{images.length === 0 ? (
								<MainCard content={false} sx={{ p: 4, textAlign: "center", bgcolor: "background.default" }}>
									<Typography variant="body2" color="text.secondary">
										Renderizá para ver el resultado
									</Typography>
									{fmtActual && (
										<Typography variant="caption" color="text.secondary">
											{fmtActual.width}×{fmtActual.height} px
										</Typography>
									)}
								</MainCard>
							) : (
								<Stack spacing={2}>
									{images.map((img, i) => (
										<Box key={i}>
											<Box
												component="img"
												src={`data:image/png;base64,${img}`}
												alt={`Slide ${i + 1}`}
												sx={{ width: "100%", display: "block", borderRadius: 1, boxShadow: 3 }}
											/>
											<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
												<Typography variant="caption" color="text.secondary">
													{images.length > 1 ? `Slide ${i + 1} de ${images.length}` : "Imagen"} ·{" "}
													{fmtActual ? `${fmtActual.width}×${fmtActual.height}` : ""}
												</Typography>
												<Tooltip title="Descargar PNG">
													<IconButton
														size="small"
														onClick={() => downloadImage(img, `${templateId}-${formato}${images.length > 1 ? `-${i + 1}` : ""}`)}
													>
														<DocumentDownload size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										</Box>
									))}
								</Stack>
							)}
						</Stack>
					</Grid>
				</Grid>
			)}

			{tab === 1 && (
				<Box>
					<Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
						<Button size="small" startIcon={<Refresh size={16} />} onClick={cargarPosts} disabled={loadingPosts}>
							Actualizar
						</Button>
					</Stack>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Título</TableCell>
									<TableCell>Plantilla</TableCell>
									<TableCell>Formato</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell>Creado</TableCell>
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loadingPosts && (
									<TableRow>
										<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
											<CircularProgress size={24} />
										</TableCell>
									</TableRow>
								)}
								{!loadingPosts && posts.length === 0 && (
									<TableRow>
										<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
											<Typography variant="body2" color="text.secondary">
												Todavía no hay posts guardados
											</Typography>
										</TableCell>
									</TableRow>
								)}
								{!loadingPosts &&
									posts.map((p) => (
										<TableRow key={p._id} hover>
											<TableCell>{p.titulo}</TableCell>
											<TableCell>{templates.find((t) => t.id === p.templateId)?.label || p.templateId}</TableCell>
											<TableCell>{formats.find((f) => f.id === p.formato)?.label || p.formato}</TableCell>
											<TableCell>
												<Chip size="small" label={p.estado} color={ESTADO_COLOR[p.estado] || "default"} variant="outlined" />
											</TableCell>
											<TableCell>{fmtDate(p.createdAt)}</TableCell>
											<TableCell align="right">
												<Button size="small" onClick={() => handleAbrirPost(p)}>
													Abrir
												</Button>
												<Tooltip title="Duplicar cambiando solo los datos">
													<IconButton size="small" onClick={() => handleAbrirDuplicar(p)}>
														<Copy size={16} />
													</IconButton>
												</Tooltip>
												<IconButton size="small" color="error" onClick={() => setABorrar(p)}>
													<Trash size={16} />
												</IconButton>
											</TableCell>
										</TableRow>
									))}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			{/* Duplicar: para series recurrentes, editar los datos sin pasar por el LLM */}
			<Dialog open={Boolean(aDuplicar)} onClose={() => setADuplicar(null)} maxWidth="sm" fullWidth>
				<DialogTitle>Duplicar post</DialogTitle>
				<DialogContent dividers>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Se crea un post nuevo con la misma plantilla y el mismo caption. Cambiá solo los datos que corresponda; lo que dejes igual se
						hereda del original.
					</Typography>
					<Stack spacing={1.5}>
						<TextField label="Título interno" size="small" fullWidth value={tituloDup} onChange={(e) => setTituloDup(e.target.value)} />
						<Divider>
							<Typography variant="caption" color="text.secondary">
								Contenido
							</Typography>
						</Divider>
						{aDuplicar &&
							(() => {
								const tpl = templates.find((t) => t.id === aDuplicar.templateId);
								if (!tpl) return null;
								return (
									<CamposPlantilla
										tpl={tpl}
										contenido={contenidoDup}
										setCampo={(field, value) => setContenidoDup((prev) => ({ ...prev, [field]: value }))}
									/>
								);
							})()}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setADuplicar(null)}>Cancelar</Button>
					<Button variant="contained" onClick={handleDuplicar} disabled={duplicando}>
						{duplicando ? "Duplicando…" : "Crear duplicado"}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={Boolean(aBorrar)} onClose={() => setABorrar(null)}>
				<DialogTitle>Eliminar post</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						¿Eliminar «{aBorrar?.titulo}»? Se borra el contenido guardado; esta acción no se puede deshacer.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setABorrar(null)}>Cancelar</Button>
					<Button color="error" variant="contained" onClick={handleBorrar}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default SocialStudio;
