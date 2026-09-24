/**
 * Publicaciones — los trabajos terminados
 * =======================================
 * La "revista": cada investigación propia con sus variantes de diseño, su PDF
 * y los números que la sostienen. Un trabajo es uno, las piezas son varias
 * (informe largo, ficha de consulta, carrusel), por eso cada publicación
 * agrupa varias URLs en vez de ser una sola.
 *
 * Backend: la-marketing-service, /api/publicaciones (vía mktAxios).
 * Lectura pública: /api/public/publicaciones.
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
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { Add, DocumentText, Edit2, ExportSquare, Refresh, Trash } from "iconsax-react";

// project imports
import MainCard from "components/MainCard";
import {
	Publicacion,
	PublicacionEstado,
	PublicacionPayload,
	PublicacionVariante,
	VarianteTipo,
	createPublicacion,
	deletePublicacion,
	listPublicaciones,
	updatePublicacion,
} from "api/publicaciones";

const TIPOS: { id: VarianteTipo; label: string }[] = [
	{ id: "informe", label: "Informe" },
	{ id: "ficha", label: "Ficha de consulta" },
	{ id: "carrusel", label: "Carrusel" },
	{ id: "resumen", label: "Resumen" },
	{ id: "otro", label: "Otro" },
];

const ESTADO_COLOR: Record<PublicacionEstado, "default" | "success" | "warning"> = {
	borrador: "warning",
	publicada: "success",
	archivada: "default",
};

const VACIA: PublicacionPayload & { titulo: string; slug: string; bajada: string } = {
	titulo: "",
	slug: "",
	bajada: "",
	categoria: "",
	fuero: "",
	estado: "borrador",
	destacada: false,
	listada: false,
	orden: 0,
	variantes: [],
	base: { descripcion: "", periodo: "" },
	fuente: { repo: "", rama: "", scripts: "", documentos: "" },
};

/** Título → slug, con la misma forma que valida el backend. */
const aSlug = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 120);

const Publicaciones = () => {
	const theme = useTheme();
	const esMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<Publicacion[]>([]);
	const [cargando, setCargando] = useState(true);
	const [guardando, setGuardando] = useState(false);
	const [filtro, setFiltro] = useState<PublicacionEstado | "todas">("todas");
	// null = cerrado; "nueva" = alta; Publicacion = edición.
	const [editando, setEditando] = useState<Publicacion | "nueva" | null>(null);
	const [form, setForm] = useState(VACIA);
	const [aEliminar, setAEliminar] = useState<Publicacion | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setItems(await listPublicaciones());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudieron cargar las publicaciones", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const visibles = useMemo(() => (filtro === "todas" ? items : items.filter((p) => p.estado === filtro)), [items, filtro]);

	const abrirNueva = () => {
		setForm(VACIA);
		setEditando("nueva");
	};

	const abrirEdicion = (p: Publicacion) => {
		setForm({
			titulo: p.titulo,
			slug: p.slug,
			bajada: p.bajada,
			categoria: p.categoria || "",
			fuero: p.fuero || "",
			estado: p.estado,
			destacada: p.destacada,
			listada: p.listada,
			orden: p.orden,
			variantes: p.variantes || [],
			base: p.base || {},
			pdf: p.pdf || {},
			fuente: p.fuente || {},
		});
		setEditando(p);
	};

	const guardar = async () => {
		if (!form.titulo.trim() || !form.bajada.trim()) {
			enqueueSnackbar("Título y bajada son obligatorios", { variant: "warning" });
			return;
		}
		const slug = form.slug?.trim() || aSlug(form.titulo);
		setGuardando(true);
		try {
			if (editando === "nueva") {
				await createPublicacion({ ...form, slug });
				enqueueSnackbar("Publicación creada", { variant: "success" });
			} else if (editando) {
				await updatePublicacion(editando._id, { ...form, slug });
				enqueueSnackbar("Publicación actualizada", { variant: "success" });
			}
			setEditando(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	const eliminar = async () => {
		if (!aEliminar) return;
		try {
			await deletePublicacion(aEliminar._id);
			enqueueSnackbar("Publicación eliminada", { variant: "success" });
			setAEliminar(null);
			cargar();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo eliminar", { variant: "error" });
		}
	};

	// ---- variantes dentro del formulario ----
	const setVariante = (i: number, campo: keyof PublicacionVariante, valor: any) => {
		const vs = [...(form.variantes || [])];
		vs[i] = { ...vs[i], [campo]: valor };
		// La principal es una sola: marcar una desmarca el resto.
		if (campo === "principal" && valor) vs.forEach((v, j) => (vs[j] = { ...v, principal: j === i }));
		setForm({ ...form, variantes: vs });
	};
	const agregarVariante = () =>
		setForm({
			...form,
			variantes: [...(form.variantes || []), { tipo: "informe", label: "", url: "https://", principal: (form.variantes || []).length === 0 }],
		});
	const quitarVariante = (i: number) => setForm({ ...form, variantes: (form.variantes || []).filter((_, j) => j !== i) });

	return (
		<MainCard
			title="Publicaciones"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<ToggleButtonGroup
						size="small"
						exclusive
						value={filtro}
						onChange={(_e, v) => v && setFiltro(v)}
						sx={{ display: esMobile ? "none" : "flex" }}
					>
						<ToggleButton value="todas">Todas</ToggleButton>
						<ToggleButton value="publicada">Publicadas</ToggleButton>
						<ToggleButton value="borrador">Borradores</ToggleButton>
						<ToggleButton value="archivada">Archivadas</ToggleButton>
					</ToggleButtonGroup>
					<Tooltip title="Recargar">
						<IconButton onClick={cargar} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
					<Button variant="contained" startIcon={<Add size={16} />} onClick={abrirNueva}>
						Nueva
					</Button>
				</Stack>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
				Los trabajos terminados. Cada publicación reúne las distintas presentaciones de una misma investigación —el informe largo, la ficha
				de consulta, el carrusel para redes— y el PDF que se envía a quien lo pide.
			</Typography>

			{cargando ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : visibles.length === 0 ? (
				<Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
					<DocumentText size={34} variant="Bulk" />
					<Typography variant="body2" sx={{ mt: 1 }}>
						No hay publicaciones {filtro !== "todas" ? "en este estado" : "todavía"}.
					</Typography>
				</Box>
			) : (
				<Grid container spacing={2}>
					{visibles.map((p) => (
						<Grid item xs={12} md={6} key={p._id}>
							<Box
								sx={{
									border: `1px solid ${theme.palette.divider}`,
									borderRadius: 1.5,
									p: 2,
									height: "100%",
									display: "flex",
									flexDirection: "column",
									gap: 1,
									...(p.destacada && { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.03) }),
								}}
							>
								<Stack direction="row" spacing={1} alignItems="flex-start">
									<Box sx={{ flex: 1, minWidth: 0 }}>
										<Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
											<Chip size="small" label={p.estado} color={ESTADO_COLOR[p.estado]} sx={{ height: 20, fontSize: 11 }} />
											{p.categoria && <Chip size="small" variant="outlined" label={p.categoria} sx={{ height: 20, fontSize: 11 }} />}
											{p.destacada && <Chip size="small" color="primary" label="destacada" sx={{ height: 20, fontSize: 11 }} />}
											{p.estado === "publicada" && !p.listada && (
												<Chip size="small" variant="outlined" label="sólo con el link" sx={{ height: 20, fontSize: 11 }} />
											)}
										</Stack>
										<Typography variant="subtitle1" sx={{ lineHeight: 1.25 }}>
											{p.titulo}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
											{p.bajada}
										</Typography>
									</Box>
									<Stack direction="row" spacing={0.25}>
										<Tooltip title="Editar">
											<IconButton size="small" onClick={() => abrirEdicion(p)}>
												<Edit2 size={16} />
											</IconButton>
										</Tooltip>
										<Tooltip title="Eliminar">
											<IconButton size="small" color="error" onClick={() => setAEliminar(p)}>
												<Trash size={16} />
											</IconButton>
										</Tooltip>
									</Stack>
								</Stack>

								{(p.base?.documentosLeidos || p.base?.pronunciamientos || p.base?.periodo) && (
									<Stack direction="row" spacing={2} sx={{ color: "text.secondary", fontSize: 12, flexWrap: "wrap" }}>
										{p.base?.documentosLeidos ? <span>{p.base.documentosLeidos.toLocaleString("es-AR")} documentos</span> : null}
										{p.base?.pronunciamientos ? <span>{p.base.pronunciamientos.toLocaleString("es-AR")} pronunciamientos</span> : null}
										{p.base?.periodo ? <span>{p.base.periodo}</span> : null}
									</Stack>
								)}

								<Divider sx={{ my: 0.5 }} />

								<Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap", gap: 0.75 }}>
									{(p.variantes || []).map((v, i) => (
										<Button
											key={i}
											size="small"
											variant={v.principal ? "contained" : "outlined"}
											endIcon={<ExportSquare size={13} />}
											href={v.url}
											target="_blank"
											rel="noopener noreferrer"
											sx={{ textTransform: "none", py: 0.25 }}
										>
											{v.label || TIPOS.find((t) => t.id === v.tipo)?.label}
										</Button>
									))}
									{p.pdf?.url && (
										<Button
											size="small"
											variant="outlined"
											color="secondary"
											endIcon={<ExportSquare size={13} />}
											href={p.pdf.url}
											target="_blank"
											rel="noopener noreferrer"
											sx={{ textTransform: "none", py: 0.25 }}
										>
											PDF
										</Button>
									)}
									{(p.variantes || []).length === 0 && !p.pdf?.url && (
										<Typography variant="caption" color="text.secondary">
											Sin piezas cargadas
										</Typography>
									)}
								</Stack>
							</Box>
						</Grid>
					))}
				</Grid>
			)}

			{/* ---------- alta / edición ---------- */}
			<Dialog open={editando !== null} onClose={() => setEditando(null)} maxWidth="md" fullWidth fullScreen={esMobile}>
				<DialogTitle>{editando === "nueva" ? "Nueva publicación" : "Editar publicación"}</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2} sx={{ mt: 0 }}>
						<Grid item xs={12} md={8}>
							<TextField
								label="Título"
								fullWidth
								size="small"
								value={form.titulo}
								onChange={(e) =>
									setForm({ ...form, titulo: e.target.value, slug: editando === "nueva" ? aSlug(e.target.value) : form.slug })
								}
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<TextField
								label="Slug"
								fullWidth
								size="small"
								value={form.slug}
								onChange={(e) => setForm({ ...form, slug: aSlug(e.target.value) })}
								helperText="Va en la URL pública: no lo cambies una vez repartida"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Bajada"
								fullWidth
								size="small"
								multiline
								minRows={2}
								value={form.bajada}
								onChange={(e) => setForm({ ...form, bajada: e.target.value })}
							/>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField label="Categoría" fullWidth size="small" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
						</Grid>
						<Grid item xs={6} md={2}>
							<TextField label="Fuero" fullWidth size="small" value={form.fuero} onChange={(e) => setForm({ ...form, fuero: e.target.value })} />
						</Grid>
						<Grid item xs={6} md={3}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value as PublicacionEstado })}>
									<MenuItem value="borrador">Borrador</MenuItem>
									<MenuItem value="publicada">Publicada</MenuItem>
									<MenuItem value="archivada">Archivada</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={2}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={!!form.destacada} onChange={(e) => setForm({ ...form, destacada: e.target.checked })} />
								<Typography variant="body2">Destacada</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={5}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={!!form.listada} onChange={(e) => setForm({ ...form, listada: e.target.checked })} />
								<Tooltip title="Apagado: la publicación existe y se abre con su link, pero no figura en /informes ni la indexan los buscadores. Es lo que corresponde cuando el link se reparte por privado y no querés que se pueda recorrer el resto de las campañas.">
									<Typography variant="body2">Aparece en el listado público</Typography>
								</Tooltip>
							</Stack>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									La base del trabajo
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField
								label="Documentos leídos"
								type="number"
								fullWidth
								size="small"
								value={form.base?.documentosLeidos ?? ""}
								onChange={(e) => setForm({ ...form, base: { ...form.base, documentosLeidos: e.target.value ? Number(e.target.value) : null } })}
							/>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField
								label="Pronunciamientos"
								type="number"
								fullWidth
								size="small"
								value={form.base?.pronunciamientos ?? ""}
								onChange={(e) => setForm({ ...form, base: { ...form.base, pronunciamientos: e.target.value ? Number(e.target.value) : null } })}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="Período"
								fullWidth
								size="small"
								placeholder="ene 2025 – sep 2026"
								value={form.base?.periodo ?? ""}
								onChange={(e) => setForm({ ...form, base: { ...form.base, periodo: e.target.value } })}
							/>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									Piezas
								</Typography>
							</Divider>
						</Grid>
						{(form.variantes || []).map((v, i) => (
							<Grid item xs={12} key={i}>
								<Stack direction={esMobile ? "column" : "row"} spacing={1} alignItems={esMobile ? "stretch" : "center"}>
									<FormControl size="small" sx={{ minWidth: 150 }}>
										<InputLabel>Tipo</InputLabel>
										<Select label="Tipo" value={v.tipo} onChange={(e) => setVariante(i, "tipo", e.target.value)}>
											{TIPOS.map((t) => (
												<MenuItem key={t.id} value={t.id}>
													{t.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>
									<TextField label="Nombre" size="small" sx={{ minWidth: 170 }} value={v.label} onChange={(e) => setVariante(i, "label", e.target.value)} />
									<TextField label="URL" size="small" fullWidth value={v.url} onChange={(e) => setVariante(i, "url", e.target.value)} />
									<Tooltip title="Es la principal">
										<Switch checked={!!v.principal} onChange={(e) => setVariante(i, "principal", e.target.checked)} />
									</Tooltip>
									<IconButton size="small" color="error" onClick={() => quitarVariante(i)}>
										<Trash size={16} />
									</IconButton>
								</Stack>
							</Grid>
						))}
						<Grid item xs={12}>
							<Button size="small" startIcon={<Add size={14} />} onClick={agregarVariante} sx={{ textTransform: "none" }}>
								Agregar pieza
							</Button>
						</Grid>

						<Grid item xs={12}>
							<Divider textAlign="left" sx={{ my: 0.5 }}>
								<Typography variant="caption" color="text.secondary">
									PDF y trazabilidad
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="URL del PDF"
								fullWidth
								size="small"
								value={form.pdf?.url ?? ""}
								onChange={(e) => setForm({ ...form, pdf: { ...form.pdf, url: e.target.value } })}
								helperText="Es lo que se manda por privado a quien comenta"
							/>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField
								label="Repo"
								fullWidth
								size="small"
								value={form.fuente?.repo ?? ""}
								onChange={(e) => setForm({ ...form, fuente: { ...form.fuente, repo: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField
								label="Rama"
								fullWidth
								size="small"
								value={form.fuente?.rama ?? ""}
								onChange={(e) => setForm({ ...form, fuente: { ...form.fuente, rama: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="Scripts"
								fullWidth
								size="small"
								value={form.fuente?.scripts ?? ""}
								onChange={(e) => setForm({ ...form, fuente: { ...form.fuente, scripts: e.target.value } })}
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="Documentos de trabajo"
								fullWidth
								size="small"
								value={form.fuente?.documentos ?? ""}
								onChange={(e) => setForm({ ...form, fuente: { ...form.fuente, documentos: e.target.value } })}
							/>
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

			{/* ---------- confirmar borrado ---------- */}
			<Dialog open={!!aEliminar} onClose={() => setAEliminar(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Eliminar publicación</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Se elimina <strong>{aEliminar?.titulo}</strong>. Las piezas publicadas siguen existiendo en sus URLs; lo que se borra es la
						ficha que las agrupa.
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

export default Publicaciones;
