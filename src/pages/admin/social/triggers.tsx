/**
 * Automatizaciones por comentario
 * ===============================
 * "Comentá una palabra y te mando el material". Cada trigger se ata a un post
 * publicado en Instagram: cuando alguien comenta la palabra, el sistema le
 * responde en privado con un botón; al tocarlo se le entrega el material.
 *
 * El rodeo del botón lo impone Meta: sólo permite UNA respuesta privada por
 * comentario, y la ventana para seguir hablando se abre cuando el usuario
 * interactúa. Pedir el follow ahí le da un motivo para tocarlo.
 *
 * Backend: la-marketing-service, /api/comment-triggers (vía mktAxios).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

// material-ui
import {
	Alert,
	AlertTitle,
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
	LinearProgress,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { Add, Edit2, ExportSquare, Messages2, Refresh, Trash } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import {
	CommentTrigger,
	CommentTriggerPayload,
	LeadEstado,
	TriggerEstado,
	TriggerLeads,
	createTrigger,
	deleteTrigger,
	getTriggerEstado,
	getTriggerLeads,
	listTriggers,
	updateTrigger,
} from "api/commentTriggers";
import { InstagramMedia, getInstagramMedia } from "api/socialPosts";

const ESTADO_LEAD: Record<LeadEstado, { label: string; color: "default" | "info" | "primary" | "success" | "error" }> = {
	comentado: { label: "Comentó", color: "default" },
	respondido: { label: "Le respondimos", color: "info" },
	abrio: { label: "Abrió el material", color: "primary" },
	email: { label: "Dejó el mail", color: "success" },
	error: { label: "Error", color: "error" },
};

const VACIO: CommentTriggerPayload & { nombre: string } = {
	nombre: "",
	instagramMediaId: "",
	palabras: [],
	exacta: false,
	mensajeInicial: {
		texto: "¡Gracias por comentar! Te mando el material acá abajo.\n\nSi te sirve, seguinos así te llegan los próximos.",
		boton: "VER EL MATERIAL",
	},
	mensajeMaterial: { texto: "Acá lo tenés. Es de lectura libre, sin registro.", boton: "ABRIR", url: "https://" },
	pedirEmail: true,
	mensajeEmail: {
		texto: "¿Querés que te avisemos cuando publiquemos el próximo? Dejame tu mail.",
		confirmacion: "¡Anotado! Te escribimos cuando salga el próximo.",
	},
	activo: false,
};

const Triggers = () => {
	const theme = useTheme();
	const esMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();

	const [triggers, setTriggers] = useState<CommentTrigger[]>([]);
	const [medias, setMedias] = useState<InstagramMedia[]>([]);
	const [estado, setEstado] = useState<TriggerEstado | null>(null);
	const [cargando, setCargando] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [editando, setEditando] = useState<CommentTrigger | "nuevo" | null>(null);
	const [form, setForm] = useState(VACIO);
	const [palabrasTexto, setPalabrasTexto] = useState("");
	const [aEliminar, setAEliminar] = useState<CommentTrigger | null>(null);
	const [verLeads, setVerLeads] = useState<CommentTrigger | null>(null);
	const [leads, setLeads] = useState<TriggerLeads | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const [t, e] = await Promise.all([listTriggers(), getTriggerEstado().catch(() => null)]);
			setTriggers(t);
			setEstado(e);
			// Los medias son para el selector: si falla, se puede pegar el id igual.
			getInstagramMedia()
				.then(setMedias)
				.catch(() => setMedias([]));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar las automatizaciones", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	useEffect(() => {
		if (!verLeads) return;
		setLeads(null);
		getTriggerLeads(verLeads._id)
			.then(setLeads)
			.catch(() => setLeads({ embudo: {}, ultimos: [] }));
	}, [verLeads]);

	const bloqueo = useMemo(() => {
		if (!estado) return null;
		const faltanPermisos = estado.permisos?.faltantes || [];
		if (estado.variablesFaltantes.length) return `Faltan variables de entorno: ${estado.variablesFaltantes.join(", ")}`;
		if (faltanPermisos.length) return `La app de Meta todavía no tiene: ${faltanPermisos.join(", ")}`;
		return null;
	}, [estado]);

	const abrirNuevo = () => {
		setForm(VACIO);
		setPalabrasTexto("");
		setEditando("nuevo");
	};

	const abrirEdicion = (t: CommentTrigger) => {
		setForm({
			nombre: t.nombre,
			instagramMediaId: t.instagramMediaId || "",
			palabras: t.palabras,
			exacta: t.exacta,
			mensajeInicial: t.mensajeInicial,
			mensajeMaterial: t.mensajeMaterial,
			pedirEmail: t.pedirEmail,
			mensajeEmail: t.mensajeEmail || {},
			activo: t.activo,
		});
		setPalabrasTexto((t.palabras || []).join(", "));
		setEditando(t);
	};

	const guardar = async () => {
		const palabras = palabrasTexto
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean);
		if (!form.nombre.trim() || !palabras.length) {
			enqueueSnackbar("Hace falta un nombre y al menos una palabra", { variant: "warning" });
			return;
		}
		if (!form.mensajeMaterial?.url?.startsWith("https://")) {
			enqueueSnackbar("El link del material tiene que ser https", { variant: "warning" });
			return;
		}
		setGuardando(true);
		try {
			const payload = { ...form, palabras };
			if (editando === "nuevo") await createTrigger(payload);
			else if (editando) await updateTrigger(editando._id, payload);
			enqueueSnackbar(editando === "nuevo" ? "Automatización creada" : "Automatización actualizada", { variant: "success" });
			setEditando(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const alternarActivo = async (t: CommentTrigger) => {
		try {
			await updateTrigger(t._id, { activo: !t.activo });
			setTriggers((prev) => prev.map((x) => (x._id === t._id ? { ...x, activo: !t.activo } : x)));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo cambiar el estado", { variant: "error" });
		}
	};

	const eliminar = async () => {
		if (!aEliminar) return;
		try {
			await deleteTrigger(aEliminar._id);
			enqueueSnackbar("Automatización eliminada", { variant: "success" });
			setAEliminar(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo eliminar", { variant: "error" });
		}
	};

	const mediaDe = (id: string | null) => medias.find((m) => m.id === id);

	return (
		<MainCard
			title="Automatizaciones por comentario"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<Tooltip title="Recargar">
						<IconButton onClick={cargar} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
					<Button variant="contained" startIcon={<Add size={16} />} onClick={abrirNuevo}>
						Nueva
					</Button>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Cuando alguien comenta la palabra en el post elegido, le llega un privado con un botón; al tocarlo recibe el material. El pedido de
				seguir la cuenta va en ese primer mensaje: además de lo obvio, le da un motivo para tocar el botón, que es lo que Meta necesita
				para permitirnos seguir escribiendo.
			</Typography>

			{bloqueo && (
				<Alert severity="warning" sx={{ mb: 2 }}>
					<AlertTitle>Las respuestas todavía no se pueden enviar</AlertTitle>
					{bloqueo}. Los comentarios se siguen registrando y se pueden reintentar después: Meta admite responder en privado hasta 7 días
					después del comentario.
				</Alert>
			)}

			{cargando ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : triggers.length === 0 ? (
				<Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
					<Messages2 size={34} variant="Bulk" />
					<Typography variant="body2" sx={{ mt: 1 }}>
						No hay automatizaciones todavía.
					</Typography>
				</Box>
			) : (
				<Grid container spacing={2}>
					{triggers.map((t) => {
						const m = mediaDe(t.instagramMediaId);
						const mt = t.metricas || ({} as CommentTrigger["metricas"]);
						const total = mt.comentarios || 0;
						const pct = (n: number) => (total ? Math.round((100 * n) / total) : 0);
						return (
							<Grid item xs={12} md={6} key={t._id}>
								<Box
									sx={{
										border: `1px solid ${t.activo ? theme.palette.primary.main : theme.palette.divider}`,
										bgcolor: t.activo ? alpha(theme.palette.primary.main, 0.03) : "transparent",
										borderRadius: 1.5,
										p: 2,
										height: "100%",
									}}
								>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography variant="subtitle1" sx={{ lineHeight: 1.25 }}>
												{t.nombre}
											</Typography>
											<Stack direction="row" spacing={0.5} sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
												{t.palabras.map((p) => (
													<Chip key={p} size="small" label={p} sx={{ height: 20, fontSize: 11, fontWeight: 600 }} />
												))}
												{t.exacta && <Chip size="small" variant="outlined" label="exacta" sx={{ height: 20, fontSize: 11 }} />}
											</Stack>
										</Box>
										<Stack direction="row" spacing={0.25} alignItems="center">
											<Tooltip title={t.activo ? "Activa" : "Inactiva"}>
												<Switch size="small" checked={t.activo} onChange={() => alternarActivo(t)} />
											</Tooltip>
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => abrirEdicion(t)}>
													<Edit2 size={16} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setAEliminar(t)}>
													<Trash size={16} />
												</IconButton>
											</Tooltip>
										</Stack>
									</Stack>

									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
										{m ? (
											<>
												{m.titulo?.slice(0, 60)}{" "}
												<a href={m.permalink} target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main }}>
													ver post <ExportSquare size={11} style={{ verticalAlign: -1 }} />
												</a>
											</>
										) : (
											<>media {t.instagramMediaId || "—"}</>
										)}
									</Typography>

									<Divider sx={{ my: 1.25 }} />

									{/* embudo */}
									<Stack spacing={0.75}>
										{(
											[
												["Comentaron", mt.comentarios || 0],
												["Les respondimos", mt.respondidos || 0],
												["Abrieron", mt.abrieron || 0],
												["Dejaron mail", mt.emails || 0],
											] as [string, number][]
										).map(([label, n]) => (
											<Box key={label}>
												<Stack direction="row" justifyContent="space-between">
													<Typography variant="caption" color="text.secondary">
														{label}
													</Typography>
													<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
														{n}
													</Typography>
												</Stack>
												<LinearProgress variant="determinate" value={pct(n)} sx={{ height: 4, borderRadius: 2 }} />
											</Box>
										))}
									</Stack>

									<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
										{(mt.errores || 0) > 0 && <Chip size="small" color="error" label={`${mt.errores} errores`} sx={{ height: 20, fontSize: 11 }} />}
										<Button size="small" onClick={() => setVerLeads(t)} sx={{ textTransform: "none", ml: "auto" }}>
											Ver quiénes comentaron
										</Button>
									</Stack>
								</Box>
							</Grid>
						);
					})}
				</Grid>
			)}

			{/* ---------- alta / edición ---------- */}
			<Dialog open={editando !== null} onClose={() => setEditando(null)} maxWidth="md" fullWidth fullScreen={esMobile}>
				<DialogTitle>{editando === "nuevo" ? "Nueva automatización" : "Editar automatización"}</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2} sx={{ mt: 0 }}>
						<Grid item xs={12} md={7}>
							<TextField label="Nombre" fullWidth size="small" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
						</Grid>
						<Grid item xs={12} md={5}>
							<FormControl fullWidth size="small">
								<InputLabel>Post de Instagram</InputLabel>
								<Select
									label="Post de Instagram"
									value={form.instagramMediaId || ""}
									onChange={(e) => setForm({ ...form, instagramMediaId: e.target.value })}
								>
									{medias.length === 0 && <MenuItem value="">(no se pudieron cargar)</MenuItem>}
									{medias.map((m) => (
										<MenuItem key={m.id} value={m.id}>
											{new Date(m.fecha).toLocaleDateString("es-AR")} · {m.titulo?.slice(0, 40)}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</Grid>

						<Grid item xs={12} md={8}>
							<TextField
								label="Palabras que disparan"
								fullWidth
								size="small"
								value={palabrasTexto}
								onChange={(e) => setPalabrasTexto(e.target.value)}
								helperText="Separadas por coma. No distingue mayúsculas ni acentos."
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={!!form.exacta} onChange={(e) => setForm({ ...form, exacta: e.target.checked })} />
								<Tooltip title="Si está activo, la palabra tiene que ser el comentario entero. Evita disparar con frases que la contienen de paso.">
									<Typography variant="body2">Coincidencia exacta</Typography>
								</Tooltip>
							</Stack>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									Paso 1 · respuesta privada al comentario
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Mensaje"
								fullWidth
								size="small"
								multiline
								minRows={3}
								value={form.mensajeInicial?.texto || ""}
								onChange={(e) => setForm({ ...form, mensajeInicial: { ...form.mensajeInicial!, texto: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField
								label="Botón"
								fullWidth
								size="small"
								inputProps={{ maxLength: 20 }}
								value={form.mensajeInicial?.boton || ""}
								onChange={(e) => setForm({ ...form, mensajeInicial: { ...form.mensajeInicial!, boton: e.target.value } })}
								helperText="Máx. 20"
							/>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									Paso 2 · al tocar el botón
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Mensaje"
								fullWidth
								size="small"
								multiline
								minRows={2}
								value={form.mensajeMaterial?.texto || ""}
								onChange={(e) => setForm({ ...form, mensajeMaterial: { ...form.mensajeMaterial!, texto: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField
								label="Botón"
								fullWidth
								size="small"
								inputProps={{ maxLength: 20 }}
								value={form.mensajeMaterial?.boton || ""}
								onChange={(e) => setForm({ ...form, mensajeMaterial: { ...form.mensajeMaterial!, boton: e.target.value } })}
								helperText="Máx. 20"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Link del material"
								fullWidth
								size="small"
								value={form.mensajeMaterial?.url || ""}
								onChange={(e) => setForm({ ...form, mensajeMaterial: { ...form.mensajeMaterial!, url: e.target.value } })}
								helperText="Tiene que ser https. Instagram no admite adjuntar documentos: el material va como link."
							/>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									Paso 3 · pedido de mail (no bloquea la entrega)
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={3}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={!!form.pedirEmail} onChange={(e) => setForm({ ...form, pedirEmail: e.target.checked })} />
								<Typography variant="body2">Pedir mail</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Cómo se lo pedimos"
								fullWidth
								size="small"
								disabled={!form.pedirEmail}
								value={form.mensajeEmail?.texto || ""}
								onChange={(e) => setForm({ ...form, mensajeEmail: { ...form.mensajeEmail, texto: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Confirmación al recibirlo"
								fullWidth
								size="small"
								disabled={!form.pedirEmail}
								value={form.mensajeEmail?.confirmacion || ""}
								onChange={(e) => setForm({ ...form, mensajeEmail: { ...form.mensajeEmail, confirmacion: e.target.value } })}
								helperText="Prometer sólo lo que el sistema cumple: hoy el mail se guarda como contacto, no se envía nada automáticamente."
							/>
						</Grid>

						<Grid item xs={12}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Switch checked={!!form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
								<Typography variant="body2">Activa — responde a partir de ahora</Typography>
							</Stack>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditando(null)}>Cancelar</Button>
					<Button variant="contained" onClick={guardar} disabled={guardando}>
						{guardando ? "Guardando…" : "Guardar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* ---------- leads ---------- */}
			<Dialog open={!!verLeads} onClose={() => setVerLeads(null)} maxWidth="sm" fullWidth>
				<DialogTitle>{verLeads?.nombre}</DialogTitle>
				<DialogContent dividers>
					{!leads ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress size={24} />
						</Box>
					) : leads.ultimos.length === 0 ? (
						<Typography variant="body2" color="text.secondary">
							Todavía no comentó nadie con esa palabra.
						</Typography>
					) : (
						<Stack spacing={1}>
							{leads.ultimos.map((l) => (
								<Stack key={l._id} direction="row" spacing={1} alignItems="center">
									<Chip size="small" color={ESTADO_LEAD[l.estado].color} label={ESTADO_LEAD[l.estado].label} sx={{ height: 20, fontSize: 11, minWidth: 128 }} />
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Typography variant="body2" noWrap>
											@{l.username || "?"} {l.email ? `· ${l.email}` : ""}
										</Typography>
										{l.ultimoError && (
											<Typography variant="caption" color="error" noWrap sx={{ display: "block" }}>
												{l.ultimoError}
											</Typography>
										)}
									</Box>
									<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
										{new Date(l.createdAt).toLocaleDateString("es-AR")}
									</Typography>
								</Stack>
							))}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setVerLeads(null)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* ---------- confirmar borrado ---------- */}
			<Dialog open={!!aEliminar} onClose={() => setAEliminar(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Eliminar automatización</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Se elimina <strong>{aEliminar?.nombre}</strong>. Los registros de quiénes comentaron se conservan: son la medición de lo que
						ya pasó.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAEliminar(null)}>Cancelar</Button>
					<Button color="error" variant="contained" onClick={eliminar}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default Triggers;
