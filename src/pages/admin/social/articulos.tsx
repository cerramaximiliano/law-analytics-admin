/**
 * Artículos del blog educativo
 * ============================
 * Revisión editorial de los artículos que genera el cron educativo
 * (la-marketing-service). Cada artículo nace en borrador junto al carrusel de
 * IG del mismo tema; acá se corrige el texto, se ajustan los comentarios de la
 * jurisprudencia citada (o se quitan fallos) y se decide la publicación.
 *
 * La jurisprudencia no se puede inventar desde acá: el backend solo acepta
 * editar el comentario de cada fallo o quitarlo del artículo.
 *
 * Backend: la-marketing-service, /api/educativo/* (via mktAxios).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Divider,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Pagination,
	Select,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { CloseCircle, Edit2, ExportSquare, Eye, Refresh, Trash } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import {
	EducativoArticulo,
	EstadoArticulo,
	JurisprudenciaRef,
	UpdateArticuloPayload,
	deleteArticulo,
	getArticulo,
	listArticulos,
	updateArticulo,
} from "api/educativoArticulos";

// ==============================|| HELPERS ||============================== //

const ESTADO_COLOR: Record<EstadoArticulo, "default" | "success"> = {
	borrador: "default",
	publicado: "success",
};

const ESTADO_LABEL: Record<EstadoArticulo, string> = {
	borrador: "Borrador",
	publicado: "Publicado",
};

const ORIGEN_LABEL: Record<string, string> = {
	"saij-texto": "SAIJ (texto)",
	"saij-semantica": "SAIJ (semántica)",
	corpus: "Corpus PJN",
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—");

const contarPalabras = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;

/** Fallo del editor: el guardado + flags locales de la sesión de edición. */
// ==============================|| VISTA PREVIA ||============================== //
// Render aproximado de cómo se ve el artículo en lawanalytics.app/educativo:
// mismo parseo de markdown acotado (##, ###, listas, **negritas**) y la
// identidad "Apuntes" (resaltador amarillo en títulos, margen de cuaderno).

const EDU_RESALTADOR = "#FDE047";
const EDU_TINTA = "#16203A";

const renderNegritas = (texto: string) =>
	texto
		.split(/(\*\*[^*]+\*\*)/g)
		.map((parte, i) =>
			parte.startsWith("**") && parte.endsWith("**") ? <strong key={i}>{parte.slice(2, -2)}</strong> : <span key={i}>{parte}</span>,
		);

const CuerpoPreview = ({ cuerpo }: { cuerpo: string }) => {
	// Parseo idéntico al ArticleContent del front (formato acotado del backend).
	const bloques: Array<{ tipo: "h2" | "h3" | "p" | "li"; texto: string }> = [];
	for (const cruda of cuerpo.split("\n")) {
		const linea = cruda.trim();
		if (!linea) continue;
		if (linea.startsWith("### ")) bloques.push({ tipo: "h3", texto: linea.slice(4) });
		else if (linea.startsWith("## ")) bloques.push({ tipo: "h2", texto: linea.slice(3) });
		else if (/^[-*]\s+/.test(linea)) bloques.push({ tipo: "li", texto: linea.replace(/^[-*]\s+/, "") });
		else bloques.push({ tipo: "p", texto: linea });
	}
	let apunte = 0;
	return (
		<Stack spacing={1.5} sx={{ borderLeft: "2px solid rgba(58,123,255,0.28)", pl: 3 }}>
			{bloques.map((b, i) => {
				if (b.tipo === "h2") {
					apunte += 1;
					return (
						<Typography key={i} component="h2" sx={{ fontSize: "1.1rem", fontWeight: 600, mt: i === 0 ? 0 : 1.5, lineHeight: 1.5 }}>
							<Box component="span" sx={{ color: "primary.main", fontFamily: "monospace", fontSize: "0.75rem", mr: 1 }}>
								{String(apunte).padStart(2, "0")}
							</Box>
							<Box component="span" sx={{ backgroundColor: EDU_RESALTADOR, color: EDU_TINTA, px: 0.75, py: 0.25 }}>
								{b.texto}
							</Box>
						</Typography>
					);
				}
				if (b.tipo === "h3") {
					return (
						<Typography key={i} component="h3" sx={{ fontSize: "0.95rem", fontWeight: 600, mt: 1 }}>
							{b.texto}
						</Typography>
					);
				}
				if (b.tipo === "li") {
					return (
						<Typography key={i} component="li" variant="body2" color="text.secondary" sx={{ ml: 3, lineHeight: 1.6 }}>
							{renderNegritas(b.texto)}
						</Typography>
					);
				}
				return (
					<Typography key={i} variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
						{renderNegritas(b.texto)}
					</Typography>
				);
			})}
		</Stack>
	);
};

const VistaPreviaArticulo = ({
	titulo,
	resumen,
	cuerpo,
	fallos,
	onClose,
}: {
	titulo: string;
	resumen: string;
	cuerpo: string;
	fallos: JurisprudenciaRef[];
	onClose: () => void;
}) => (
	<Dialog open onClose={onClose} maxWidth="md" fullWidth>
		<DialogTitle>
			<Stack direction="row" alignItems="center" justifyContent="space-between">
				<Typography variant="h5">Vista previa</Typography>
				<IconButton onClick={onClose}>
					<CloseCircle />
				</IconButton>
			</Stack>
		</DialogTitle>
		<DialogContent dividers>
			<Stack spacing={3} sx={{ py: 1 }}>
				<Box>
					<Typography
						variant="caption"
						sx={{ backgroundColor: EDU_RESALTADOR, color: EDU_TINTA, px: 0.75, py: 0.25, fontWeight: 700, letterSpacing: "0.14em" }}
					>
						APUNTES
					</Typography>
					<Typography variant="h3" sx={{ mt: 1.5, lineHeight: 1.4 }}>
						<Box
							component="span"
							sx={{
								backgroundColor: EDU_RESALTADOR,
								color: EDU_TINTA,
								px: 0.75,
								py: 0.25,
								boxDecorationBreak: "clone",
								WebkitBoxDecorationBreak: "clone",
							}}
						>
							{titulo}
						</Box>
					</Typography>
					{resumen && (
						<Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
							{resumen}
						</Typography>
					)}
				</Box>
				<CuerpoPreview cuerpo={cuerpo} />
				{fallos.length > 0 && (
					<Box>
						<Typography variant="h5" sx={{ mb: 1.5 }}>
							§ Jurisprudencia sobre el tema
						</Typography>
						<Stack spacing={1.5}>
							{fallos.map((f) => (
								<MainCard key={f.sentenciaId} content={false} sx={{ p: 2 }}>
									<Typography variant="subtitle2">{f.caratula}</Typography>
									{f.tribunal && (
										<Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
											{f.tribunal.toLowerCase()}
										</Typography>
									)}
									<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
										{f.comentario}
									</Typography>
									<Typography variant="caption" color={f.enlazable ? "primary" : "text.secondary"} sx={{ display: "block", mt: 1 }}>
										{f.enlazable ? "Enlaza a la ficha pública del fallo" : "Se cita sin enlace (invita a buscar desde la cuenta)"}
									</Typography>
								</MainCard>
							))}
						</Stack>
					</Box>
				)}
			</Stack>
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose}>Cerrar</Button>
		</DialogActions>
	</Dialog>
);

interface FalloEditable extends JurisprudenciaRef {
	/** true = se quita del artículo al guardar. */
	quitar: boolean;
}

// ==============================|| EDITOR DE UN ARTICULO ||============================== //

const EditorArticulo = ({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) => {
	const { enqueueSnackbar } = useSnackbar();

	const [articulo, setArticulo] = useState<EducativoArticulo | null>(null);
	const [cargando, setCargando] = useState(true);

	// Campos editables
	const [titulo, setTitulo] = useState("");
	const [resumen, setResumen] = useState("");
	const [cuerpo, setCuerpo] = useState("");
	const [seoTitle, setSeoTitle] = useState("");
	const [seoDescription, setSeoDescription] = useState("");
	const [fallos, setFallos] = useState<FalloEditable[]>([]);
	// Publicación coordinada: el artículo sale cuando se publica el post de IG.
	const [publicarConPost, setPublicarConPost] = useState(true);

	const [guardando, setGuardando] = useState(false);
	const [confirmPublicar, setConfirmPublicar] = useState(false);
	const [confirmEliminar, setConfirmEliminar] = useState(false);

	// El listado viene sin cuerpo: el detalle completo se pide siempre.
	useEffect(() => {
		let vigente = true;
		setCargando(true);
		getArticulo(id)
			.then((data) => {
				if (!vigente) return;
				setArticulo(data);
				setTitulo(data.titulo);
				setResumen(data.resumen);
				setCuerpo(data.cuerpo || "");
				setSeoTitle(data.seo?.title || "");
				setSeoDescription(data.seo?.description || "");
				setFallos((data.jurisprudencia || []).map((j) => ({ ...j, quitar: false })));
				setPublicarConPost(data.publicarConPost !== false);
			})
			.catch((err) => {
				enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el artículo", { variant: "error" });
				onClose();
			})
			.finally(() => {
				if (vigente) setCargando(false);
			});
		return () => {
			vigente = false;
		};
	}, [id, enqueueSnackbar, onClose]);

	const palabras = useMemo(() => contarPalabras(cuerpo), [cuerpo]);
	const fallosActivos = fallos.filter((f) => !f.quitar);

	const armarPayload = (estado?: EstadoArticulo): UpdateArticuloPayload => ({
		titulo,
		resumen,
		cuerpo,
		seo: { title: seoTitle, description: seoDescription },
		// Solo sentenciaId + comentario: la carátula y el origen los conserva el backend.
		jurisprudencia: fallosActivos.map((f) => ({ sentenciaId: f.sentenciaId, comentario: f.comentario })),
		publicarConPost,
		...(estado ? { estado } : {}),
	});

	const guardar = async (estado?: EstadoArticulo) => {
		if (!articulo) return;
		setGuardando(true);
		try {
			const actualizado = await updateArticulo(articulo._id, armarPayload(estado));
			setArticulo(actualizado);
			setFallos((actualizado.jurisprudencia || []).map((j) => ({ ...j, quitar: false })));
			enqueueSnackbar(
				estado === "publicado" ? "Artículo publicado" : estado === "borrador" ? "Artículo vuelto a borrador" : "Artículo guardado",
				{ variant: "success" },
			);
			onChanged();
			if (estado) setConfirmPublicar(false);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo guardar el artículo", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const eliminar = async () => {
		if (!articulo) return;
		setGuardando(true);
		try {
			await deleteArticulo(articulo._id);
			enqueueSnackbar("Artículo eliminado", { variant: "success" });
			onChanged();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo eliminar el artículo", { variant: "error" });
			setGuardando(false);
		}
	};

	const esPublicado = articulo?.estado === "publicado";
	const [previewAbierta, setPreviewAbierta] = useState(false);

	return (
		<Dialog open fullScreen onClose={onClose}>
			<DialogTitle>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Stack direction="row" alignItems="center" spacing={1.5}>
						<Typography variant="h4">Revisión de artículo</Typography>
						{articulo && <Chip size="small" label={ESTADO_LABEL[articulo.estado]} color={ESTADO_COLOR[articulo.estado]} />}
						{articulo && (
							<Typography variant="caption" color="text.secondary">
								/educativo/{articulo.slug}
							</Typography>
						)}
					</Stack>
					<IconButton onClick={onClose}>
						<CloseCircle />
					</IconButton>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				{cargando || !articulo ? (
					<Stack alignItems="center" sx={{ py: 8 }}>
						<CircularProgress />
					</Stack>
				) : (
					<Stack spacing={3} sx={{ maxWidth: 980, mx: "auto" }}>
						{/* Texto principal */}
						<TextField
							label="Título"
							value={titulo}
							onChange={(e) => setTitulo(e.target.value)}
							fullWidth
							inputProps={{ maxLength: 160 }}
							helperText={`${titulo.length}/160`}
						/>
						<TextField
							label="Resumen (bajada del listado)"
							value={resumen}
							onChange={(e) => setResumen(e.target.value)}
							fullWidth
							multiline
							minRows={2}
							inputProps={{ maxLength: 200 }}
							helperText={`${resumen.length}/200`}
						/>
						<TextField
							label="Cuerpo (markdown)"
							value={cuerpo}
							onChange={(e) => setCuerpo(e.target.value)}
							fullWidth
							multiline
							minRows={18}
							maxRows={40}
							InputProps={{ sx: { fontFamily: "monospace", fontSize: 13 } }}
							helperText={`${palabras} palabras — ${cuerpo.length}/40000 caracteres`}
						/>

						{/* Jurisprudencia citada */}
						<Box>
							<Typography variant="h5" sx={{ mb: 0.5 }}>
								Jurisprudencia citada ({fallosActivos.length}/{fallos.length})
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Solo se puede editar el comentario de cada fallo o quitarlo del artículo. Los datos del fallo vienen de la captura y no se
								modifican desde acá.
							</Typography>
							<Stack spacing={1.5} sx={{ mt: 1.5 }}>
								{fallos.length === 0 && (
									<Typography variant="body2" color="text.secondary">
										Este artículo no cita jurisprudencia.
									</Typography>
								)}
								{fallos.map((fallo, i) => (
									<MainCard key={fallo.sentenciaId} content={false} sx={{ p: 2, opacity: fallo.quitar ? 0.5 : 1 }}>
										<Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
											<Box sx={{ minWidth: 0 }}>
												<Typography variant="subtitle1" sx={{ textDecoration: fallo.quitar ? "line-through" : "none" }}>
													{fallo.caratula}
												</Typography>
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: "wrap" }}>
													<Chip size="small" variant="outlined" label={ORIGEN_LABEL[fallo.origen] || fallo.origen} />
													{fallo.tribunal && (
														<Typography variant="caption" color="text.secondary">
															{fallo.tribunal}
														</Typography>
													)}
													{fallo.fecha && (
														<Typography variant="caption" color="text.secondary">
															{fmtDate(fallo.fecha)}
														</Typography>
													)}
													{fallo.enlazable && <Chip size="small" color="info" variant="outlined" label="Con página pública" />}
												</Stack>
											</Box>
											<Tooltip title={fallo.quitar ? "Se quita al guardar" : "Incluido en el artículo"}>
												<Switch
													checked={!fallo.quitar}
													onChange={(e) => setFallos((prev) => prev.map((f, idx) => (idx === i ? { ...f, quitar: !e.target.checked } : f)))}
												/>
											</Tooltip>
										</Stack>
										<TextField
											label="Comentario"
											value={fallo.comentario}
											disabled={fallo.quitar}
											onChange={(e) => setFallos((prev) => prev.map((f, idx) => (idx === i ? { ...f, comentario: e.target.value } : f)))}
											fullWidth
											multiline
											minRows={2}
											sx={{ mt: 1.5 }}
											inputProps={{ maxLength: 1200 }}
											helperText={`${fallo.comentario.length}/1200`}
										/>
									</MainCard>
								))}
							</Stack>
						</Box>

						{/* SEO */}
						<Box>
							<Typography variant="h5" sx={{ mb: 1.5 }}>
								SEO
							</Typography>
							<Stack spacing={2}>
								<TextField
									label="SEO title"
									value={seoTitle}
									onChange={(e) => setSeoTitle(e.target.value)}
									fullWidth
									inputProps={{ maxLength: 70 }}
									helperText={`${seoTitle.length}/70`}
								/>
								<TextField
									label="SEO description"
									value={seoDescription}
									onChange={(e) => setSeoDescription(e.target.value)}
									fullWidth
									multiline
									minRows={2}
									inputProps={{ maxLength: 170 }}
									helperText={`${seoDescription.length}/170`}
								/>
							</Stack>
						</Box>

						{/* Publicación coordinada con el post de IG */}
						<Box>
							<Typography variant="h5" sx={{ mb: 1.5 }}>
								Publicación
							</Typography>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Switch checked={publicarConPost} onChange={(e) => setPublicarConPost(e.target.checked)} size="small" />
								<Box>
									<Typography variant="body2">Publicar junto con el post de Instagram</Typography>
									<Typography variant="caption" color="text.secondary">
										Al marcar publicado el post de la serie en el Social Studio, este artículo sale automáticamente. Desactivalo para
										manejar la publicación a mano. Volver el post a borrador nunca despublica el artículo.
									</Typography>
								</Box>
							</Stack>
						</Box>

						<Divider />
						<Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
							<Typography variant="caption" color="text.secondary">
								Creado: {fmtDate(articulo.createdAt)}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Publicado: {fmtDate(articulo.publicadoEn)}
							</Typography>
							{articulo.generacion?.modelo && (
								<Typography variant="caption" color="text.secondary">
									Generado con {articulo.generacion.modelo}
								</Typography>
							)}
						</Stack>
					</Stack>
				)}
			</DialogContent>
			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button color="error" startIcon={<Trash size={18} />} disabled={cargando || guardando} onClick={() => setConfirmEliminar(true)}>
					Eliminar
				</Button>
				<Box sx={{ flexGrow: 1 }} />
				{/* La vista previa usa lo que está en pantalla, incluidos cambios sin guardar */}
				<Button startIcon={<Eye size={18} />} disabled={cargando} onClick={() => setPreviewAbierta(true)}>
					Vista previa
				</Button>
				{esPublicado && articulo && (
					<Button
						startIcon={<ExportSquare size={18} />}
						component="a"
						href={`https://lawanalytics.app/educativo/${articulo.slug}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						Ver en el sitio
					</Button>
				)}
				<Button onClick={onClose} disabled={guardando}>
					Cerrar
				</Button>
				<Button variant="outlined" disabled={cargando || guardando} onClick={() => guardar()}>
					Guardar
				</Button>
				<Button
					variant="contained"
					color={esPublicado ? "warning" : "success"}
					disabled={cargando || guardando}
					onClick={() => setConfirmPublicar(true)}
				>
					{esPublicado ? "Volver a borrador" : "Publicar"}
				</Button>
			</DialogActions>

			{/* Vista previa con el estado actual del editor (incluye cambios sin guardar) */}
			{previewAbierta && (
				<VistaPreviaArticulo
					titulo={titulo}
					resumen={resumen}
					cuerpo={cuerpo}
					fallos={fallosActivos}
					onClose={() => setPreviewAbierta(false)}
				/>
			)}

			{/* Confirmación de publicar / despublicar (guarda también los cambios pendientes) */}
			<Dialog open={confirmPublicar} onClose={() => !guardando && setConfirmPublicar(false)}>
				<DialogTitle>{esPublicado ? "¿Volver a borrador?" : "¿Publicar artículo?"}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{esPublicado
							? "El artículo deja de estar visible en el blog público y se limpia la fecha de publicación."
							: "El artículo queda visible en el blog público (lawanalytics.app/educativo). Se guardan también los cambios pendientes."}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmPublicar(false)} disabled={guardando}>
						Cancelar
					</Button>
					<Button
						variant="contained"
						color={esPublicado ? "warning" : "success"}
						disabled={guardando}
						onClick={() => guardar(esPublicado ? "borrador" : "publicado")}
					>
						{esPublicado ? "Volver a borrador" : "Publicar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Confirmación de borrado */}
			<Dialog open={confirmEliminar} onClose={() => !guardando && setConfirmEliminar(false)}>
				<DialogTitle>¿Eliminar artículo?</DialogTitle>
				<DialogContent>
					<DialogContentText>Se elimina definitivamente "{articulo?.titulo}". Esta acción no se puede deshacer.</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmEliminar(false)} disabled={guardando}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" disabled={guardando} onClick={eliminar}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	);
};

// ==============================|| PAGINA: ARTICULOS DEL BLOG ||============================== //

/** Dónde quedan publicados estos artículos, de cara al público. */
const BLOG_PUBLICO = "https://lawanalytics.app/educativo";

const ArticulosBlog = () => {
	const theme = useTheme();
	const esMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();

	const [articulos, setArticulos] = useState<EducativoArticulo[]>([]);
	const [cargando, setCargando] = useState(true);
	const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoArticulo>("todos");
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [abierto, setAbierto] = useState<string | null>(null);
	// Vista previa directa desde la tabla (el listado viene sin cuerpo: se pide el detalle).
	const [preview, setPreview] = useState<EducativoArticulo | null>(null);

	const abrirPreview = useCallback(
		async (id: string) => {
			try {
				setPreview(await getArticulo(id));
			} catch (err: any) {
				enqueueSnackbar(err?.response?.data?.error || "No se pudo cargar el artículo", { variant: "error" });
			}
		},
		[enqueueSnackbar],
	);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const data = await listArticulos({
				estado: filtroEstado === "todos" ? undefined : filtroEstado,
				page,
				limit: 20,
			});
			setArticulos(data.articulos);
			setPages(data.pages);
			setTotal(data.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar los artículos", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [filtroEstado, page, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	return (
		<MainCard
			title={
				<Stack
					direction={{ xs: "column", sm: "row" }}
					alignItems={{ xs: "stretch", sm: "center" }}
					justifyContent="space-between"
					gap={1.5}
				>
					<Box sx={{ minWidth: 0 }}>
						<Typography variant="h4">Artículos del blog</Typography>
						<Typography variant="caption" color="text.secondary" component="div">
							Revisión editorial de los artículos educativos generados por el cron ({total} en total)
						</Typography>
						{/* Dónde termina publicado lo que se revisa acá. */}
						<Typography
							component="a"
							href={BLOG_PUBLICO}
							target="_blank"
							rel="noopener noreferrer"
							variant="caption"
							sx={{
								display: "inline-flex",
								alignItems: "center",
								gap: 0.5,
								mt: 0.4,
								color: "primary.main",
								fontWeight: 600,
								textDecoration: "none",
								"&:hover": { textDecoration: "underline" },
							}}
						>
							lawanalytics.app/educativo
							<ExportSquare size={13} />
						</Typography>
					</Box>
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexShrink: 0 }}>
						<FormControl size="small" sx={{ minWidth: 160, flex: { xs: 1, sm: "initial" } }}>
							<InputLabel>Estado</InputLabel>
							<Select
								label="Estado"
								value={filtroEstado}
								onChange={(e) => {
									setPage(1);
									setFiltroEstado(e.target.value as "todos" | EstadoArticulo);
								}}
							>
								<MenuItem value="todos">Todos</MenuItem>
								<MenuItem value="borrador">Borradores</MenuItem>
								<MenuItem value="publicado">Publicados</MenuItem>
							</Select>
						</FormControl>
						<Tooltip title="Recargar">
							<IconButton onClick={cargar}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>
			}
		>
			{cargando ? (
				<Stack alignItems="center" sx={{ py: 6 }}>
					<CircularProgress />
				</Stack>
			) : articulos.length === 0 ? (
				<Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
					No hay artículos {filtroEstado !== "todos" ? `en estado "${ESTADO_LABEL[filtroEstado]}"` : "todavía"}. El cron educativo los
					genera junto a cada carrusel de IG.
				</Typography>
			) : (
				<>
					{esMobile ? (
						/* Siete columnas no entran en un teléfono. Una tarjeta por artículo,
						   con el título completo en vez de recortado y las fechas en una línea. */
						<Stack spacing={1.25}>
							{articulos.map((art) => (
								<Box
									key={art._id}
									onClick={() => setAbierto(art._id)}
									sx={{
										p: 1.5,
										borderRadius: 1.5,
										border: `1px solid ${theme.palette.divider}`,
										bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.04 : 0.02),
										cursor: "pointer",
									}}
								>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
										<Typography variant="subtitle2" sx={{ minWidth: 0 }}>
											{art.titulo}
										</Typography>
										<Chip size="small" label={ESTADO_LABEL[art.estado]} color={ESTADO_COLOR[art.estado]} sx={{ flexShrink: 0 }} />
									</Stack>
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3, wordBreak: "break-all" }}>
										{art.slug}
									</Typography>
									<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }} gap={1}>
										<Typography variant="caption" color="text.secondary">
											{fmtDate(art.createdAt)}
											{art.publicadoEn ? ` · publicado ${fmtDate(art.publicadoEn)}` : ""}
											{art.jurisprudencia?.length ? ` · ${art.jurisprudencia.length} fallos` : ""}
										</Typography>
										<Stack direction="row" sx={{ flexShrink: 0 }}>
											<IconButton
												size="small"
												onClick={(e) => {
													e.stopPropagation();
													abrirPreview(art._id);
												}}
											>
												<Eye size={17} />
											</IconButton>
											<IconButton
												size="small"
												onClick={(e) => {
													e.stopPropagation();
													setAbierto(art._id);
												}}
											>
												<Edit2 size={17} />
											</IconButton>
										</Stack>
									</Stack>
								</Box>
							))}
						</Stack>
					) : (
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Título</TableCell>
										<TableCell>Slug</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="center">Fallos</TableCell>
										<TableCell>Creado</TableCell>
										<TableCell>Publicado</TableCell>
										<TableCell align="right" />
									</TableRow>
								</TableHead>
								<TableBody>
									{articulos.map((art) => (
										<TableRow key={art._id} hover sx={{ cursor: "pointer" }} onClick={() => setAbierto(art._id)}>
											<TableCell sx={{ maxWidth: 380 }}>
												<Typography variant="subtitle2" noWrap title={art.titulo}>
													{art.titulo}
												</Typography>
											</TableCell>
											<TableCell sx={{ maxWidth: 220 }}>
												<Typography variant="caption" color="text.secondary" noWrap title={art.slug}>
													{art.slug}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip size="small" label={ESTADO_LABEL[art.estado]} color={ESTADO_COLOR[art.estado]} />
											</TableCell>
											<TableCell align="center">{art.jurisprudencia?.length || 0}</TableCell>
											<TableCell>{fmtDate(art.createdAt)}</TableCell>
											<TableCell>{fmtDate(art.publicadoEn)}</TableCell>
											<TableCell align="right">
												<Tooltip title="Ver contenido">
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															abrirPreview(art._id);
														}}
													>
														<Eye size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Revisar y editar">
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															setAbierto(art._id);
														}}
													>
														<Edit2 size={18} />
													</IconButton>
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}
					{pages > 1 && (
						<Stack alignItems="center" sx={{ mt: 2 }}>
							<Pagination count={pages} page={page} onChange={(_e, value) => setPage(value)} />
						</Stack>
					)}
				</>
			)}

			{abierto && <EditorArticulo id={abierto} onClose={() => setAbierto(null)} onChanged={cargar} />}
			{preview && (
				<VistaPreviaArticulo
					titulo={preview.titulo}
					resumen={preview.resumen}
					cuerpo={preview.cuerpo || ""}
					fallos={preview.jurisprudencia || []}
					onClose={() => setPreview(null)}
				/>
			)}
		</MainCard>
	);
};

export default ArticulosBlog;
