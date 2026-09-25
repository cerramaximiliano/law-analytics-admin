/**
 * Marketing → Imágenes para Google Ads
 *
 * Google rechaza las imágenes con "superposiciones gráficas o de texto": las 26
 * que se cargaron hasta el 25/9/2026 (piezas de redes y maquetas con la
 * interfaz legible) quedaron todas "Entidad no apta". Esta pantalla genera
 * variantes SIN texto con el mismo motor de render de los posts (laptops,
 * teléfonos, escritorio y tarjetas del producto dibujados con formas), permite
 * elegir las que van, descargarlas para subirlas a Google Ads y registrar qué
 * aprobó y qué rechazó Google, que es el dato que dice qué tipo de pieza pasa.
 *
 * Backend: la-marketing-service, /api/google-ads/* (colección
 * googleads-creativos, PNG en S3 bajo googleads/creativos).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	FormControl,
	IconButton,
	InputLabel,
	LinearProgress,
	MenuItem,
	Pagination,
	Select,
	Stack,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { CloseCircle, DocumentDownload, Magicpen, Refresh, Send2, Star1, TickCircle, Trash, Danger } from "iconsax-react";

import MainCard from "components/MainCard";
import {
	actualizarCreativo,
	actualizarVariosCreativos,
	borrarCreativo,
	descargaCreativo,
	generarCreativos,
	getCatalogoGAds,
	getProgresoLote,
	listCreativos,
	type CatalogoGAds,
	type CreativoGAds,
	type EstadoCreativo,
	type FormatoGAds,
	type ProgresoLote,
} from "api/googleAdsCreativos";

const ESTADO_INFO: Record<EstadoCreativo, { label: string; color: "default" | "primary" | "success" | "warning" | "error" | "info" }> = {
	nueva: { label: "Nueva", color: "default" },
	elegida: { label: "Elegida", color: "primary" },
	subida: { label: "Subida", color: "info" },
	aprobada: { label: "Aprobada", color: "success" },
	rechazada: { label: "Rechazada", color: "error" },
	descartada: { label: "Descartada", color: "warning" },
};

const PESTANIAS: { id: EstadoCreativo | ""; label: string }[] = [
	{ id: "", label: "Todas" },
	{ id: "nueva", label: "Nuevas" },
	{ id: "elegida", label: "Elegidas" },
	{ id: "subida", label: "Subidas" },
	{ id: "aprobada", label: "Aprobadas" },
	{ id: "rechazada", label: "Rechazadas" },
	{ id: "descartada", label: "Descartadas" },
];

const POR_PAGINA = 36;

/** Descarga por URL prefirmada (el backend la firma con content-disposition). */
const bajar = (url: string, nombre: string) => {
	const a = document.createElement("a");
	a.href = url;
	a.download = nombre;
	a.rel = "noopener";
	document.body.appendChild(a);
	a.click();
	a.remove();
};

const GoogleAdsImagenes = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [catalogo, setCatalogo] = useState<CatalogoGAds | null>(null);
	const [plantillas, setPlantillas] = useState<string[]>([]);
	const [formatos, setFormatos] = useState<string[]>(["horizontal", "cuadrado"]);
	const [paletas, setPaletas] = useState<string[]>([]);
	const [cantidad, setCantidad] = useState(24);
	const [lote, setLote] = useState<ProgresoLote | null>(null);
	const sondeo = useRef<number | null>(null);

	const [estado, setEstado] = useState<EstadoCreativo | "">("nueva");
	const [formato, setFormato] = useState<FormatoGAds | "">("");
	const [pagina, setPagina] = useState(1);
	const [items, setItems] = useState<CreativoGAds[]>([]);
	const [paginas, setPaginas] = useState(1);
	const [porEstado, setPorEstado] = useState<Partial<Record<EstadoCreativo, number>>>({});
	const [cargando, setCargando] = useState(false);
	const [seleccion, setSeleccion] = useState<string[]>([]);
	const [grande, setGrande] = useState<CreativoGAds | null>(null);
	const [rechazo, setRechazo] = useState<{ ids: string[]; motivo: string } | null>(null);
	const [aBorrar, setABorrar] = useState<CreativoGAds | null>(null);

	const nombrePlantilla = useMemo(() => {
		const m: Record<string, string> = {};
		catalogo?.plantillas.forEach((p) => (m[p.id] = p.label));
		return m;
	}, [catalogo]);
	const nombrePaleta = useMemo(() => {
		const m: Record<string, string> = {};
		catalogo?.paletas.forEach((p) => (m[p.id] = p.label));
		return m;
	}, [catalogo]);

	useEffect(() => {
		getCatalogoGAds()
			.then((c) => {
				setCatalogo(c);
				setPlantillas(c.plantillas.map((p) => p.id));
				setPaletas(c.paletas.map((p) => p.id));
			})
			.catch((e) => enqueueSnackbar(e?.response?.data?.error || "No se pudo cargar el catálogo", { variant: "error" }));
	}, [enqueueSnackbar]);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const r = await listCreativos({ estado, formato, page: pagina, limit: POR_PAGINA });
			setItems(r.data);
			setPaginas(r.pagination.pages);
			setPorEstado(r.porEstado);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudieron cargar las imágenes", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [estado, formato, pagina, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	useEffect(() => setSeleccion([]), [estado, formato, pagina]);

	useEffect(
		() => () => {
			if (sondeo.current) window.clearInterval(sondeo.current);
		},
		[],
	);

	const alternar = (lista: string[], valor: string, setter: (v: string[]) => void) =>
		setter(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]);

	const generar = async () => {
		try {
			const inicio = await generarCreativos({ plantillas, formatos, paletas, cantidad });
			setLote(inicio);
			if (sondeo.current) window.clearInterval(sondeo.current);
			sondeo.current = window.setInterval(async () => {
				try {
					const p = await getProgresoLote(inicio.lote);
					setLote(p);
					if (p.terminado) {
						if (sondeo.current) window.clearInterval(sondeo.current);
						sondeo.current = null;
						enqueueSnackbar(
							p.fallidas
								? `Listas ${p.hechas} imágenes. ${p.fallidas} fallaron: ${p.errores[0] || ""}`
								: `Listas ${p.hechas} imágenes nuevas.`,
							{ variant: p.fallidas ? "warning" : "success" },
						);
						setEstado("nueva");
						setPagina(1);
						cargar();
					}
				} catch {
					/* el próximo sondeo reintenta */
				}
			}, 1500);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo iniciar la generación", { variant: "error" });
		}
	};

	const cambiarEstado = async (ids: string[], nuevo: EstadoCreativo, motivo?: string) => {
		try {
			if (ids.length === 1) await actualizarCreativo(ids[0], { estado: nuevo, ...(motivo !== undefined ? { motivo } : {}) });
			else {
				await actualizarVariosCreativos(ids, nuevo);
				if (motivo) await Promise.all(ids.map((id) => actualizarCreativo(id, { motivo })));
			}
			enqueueSnackbar(
				`${ids.length === 1 ? "Imagen marcada" : `${ids.length} imágenes marcadas`} como ${ESTADO_INFO[nuevo].label.toLowerCase()}.`,
				{
					variant: "success",
				},
			);
			setSeleccion([]);
			cargar();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo cambiar el estado", { variant: "error" });
		}
	};

	const descargar = async (ids: string[]) => {
		try {
			for (const id of ids) {
				const d = await descargaCreativo(id);
				bajar(d.url, d.nombre);
				// El navegador bloquea ráfagas de descargas: una cada medio segundo.
				await new Promise((r) => setTimeout(r, 500));
			}
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo descargar", { variant: "error" });
		}
	};

	const borrar = async (c: CreativoGAds) => {
		try {
			await borrarCreativo(c._id);
			setABorrar(null);
			enqueueSnackbar("Imagen borrada.", { variant: "success" });
			cargar();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo borrar", { variant: "error" });
		}
	};

	const generando = lote !== null && !lote.terminado;
	const puedeGenerar =
		!!catalogo?.storage && plantillas.length > 0 && formatos.length > 0 && paletas.length > 0 && cantidad >= 1 && !generando;
	const total = Object.values(porEstado).reduce((a, b) => a + (b || 0), 0);

	return (
		<Stack spacing={2.5}>
			<MainCard title="Imágenes para Google Ads">
				<Stack spacing={2}>
					<Alert severity="info" icon={<Danger size={20} />}>
						Google rechaza toda imagen con texto, logo o elementos superpuestos. Estas variantes dibujan el producto sin una sola letra.
						Elegí las mejores, descargalas, subilas en Google Ads (Recursos → Imagen) y después registrá acá si quedaron aprobadas o
						rechazadas. Así sabemos qué tipo de pieza deja pasar Google.
					</Alert>
					{catalogo && !catalogo.storage && <Alert severity="warning">El almacenamiento S3 no está configurado en este entorno.</Alert>}

					<Box>
						<Typography variant="subtitle2" gutterBottom>
							Plantillas
						</Typography>
						<Stack direction="row" flexWrap="wrap" gap={1}>
							{catalogo?.plantillas.map((p) => (
								<Tooltip key={p.id} title={p.descripcion || ""}>
									<Chip
										label={p.label}
										color={plantillas.includes(p.id) ? "primary" : "default"}
										variant={plantillas.includes(p.id) ? "filled" : "outlined"}
										onClick={() => alternar(plantillas, p.id, setPlantillas)}
									/>
								</Tooltip>
							))}
						</Stack>
					</Box>

					<Stack direction={{ xs: "column", md: "row" }} spacing={3}>
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Formatos
							</Typography>
							<Stack direction="row" flexWrap="wrap" gap={1}>
								{catalogo?.formatos.map((f) => (
									<Chip
										key={f.id}
										label={`${f.label} · ${f.width}×${f.height}`}
										color={formatos.includes(f.id) ? "primary" : "default"}
										variant={formatos.includes(f.id) ? "filled" : "outlined"}
										onClick={() => alternar(formatos, f.id, setFormatos)}
									/>
								))}
							</Stack>
						</Box>
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Paletas
							</Typography>
							<Stack direction="row" flexWrap="wrap" gap={1}>
								{catalogo?.paletas.map((p) => (
									<Chip
										key={p.id}
										label={p.label}
										avatar={
											<Box
												component="span"
												sx={{
													width: 16,
													height: 16,
													borderRadius: "50%",
													bgcolor: p.fondo,
													border: `3px solid ${p.acento}`,
													ml: "6px !important",
												}}
											/>
										}
										color={paletas.includes(p.id) ? "primary" : "default"}
										variant={paletas.includes(p.id) ? "filled" : "outlined"}
										onClick={() => alternar(paletas, p.id, setPaletas)}
									/>
								))}
							</Stack>
						</Box>
					</Stack>

					<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
						<TextField
							id="gads-cantidad"
							label="Cantidad"
							type="number"
							size="small"
							value={cantidad}
							onChange={(e) => setCantidad(Math.max(1, Math.min(catalogo?.maxPorLote || 60, Number(e.target.value) || 1)))}
							inputProps={{ min: 1, max: catalogo?.maxPorLote || 60 }}
							sx={{ width: 120 }}
						/>
						<Button variant="contained" startIcon={<Magicpen size={18} />} disabled={!puedeGenerar} onClick={generar}>
							Generar {cantidad} imágenes
						</Button>
						<Typography variant="caption" color="text.secondary">
							Se reparten entre las plantillas, formatos y paletas elegidas, cada una con un diseño distinto.
						</Typography>
					</Stack>

					{lote && (
						<Box>
							<LinearProgress
								variant="determinate"
								value={lote.total ? ((lote.hechas + lote.fallidas) / lote.total) * 100 : 0}
								sx={{ height: 8, borderRadius: 4 }}
							/>
							<Typography variant="caption" color="text.secondary">
								{lote.terminado ? "Terminado" : "Generando"}: {lote.hechas} de {lote.total}
								{lote.fallidas ? ` · ${lote.fallidas} con error` : ""}
							</Typography>
						</Box>
					)}
				</Stack>
			</MainCard>

			<MainCard
				content={false}
				title={
					<Tabs
						value={estado}
						onChange={(_, v) => {
							setEstado(v);
							setPagina(1);
						}}
						variant="scrollable"
						scrollButtons="auto"
					>
						{PESTANIAS.map((t) => (
							<Tab
								key={t.id || "todas"}
								value={t.id}
								label={`${t.label} (${t.id ? porEstado[t.id as EstadoCreativo] || 0 : total})`}
								sx={{ minHeight: 44 }}
							/>
						))}
					</Tabs>
				}
				secondary={
					<Stack direction="row" spacing={1} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel id="gads-formato-label">Formato</InputLabel>
							<Select
								labelId="gads-formato-label"
								id="gads-formato"
								label="Formato"
								value={formato}
								onChange={(e) => {
									setFormato(e.target.value as FormatoGAds | "");
									setPagina(1);
								}}
							>
								<MenuItem value="">Todos</MenuItem>
								{catalogo?.formatos.map((f) => (
									<MenuItem key={f.id} value={f.id}>
										{f.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<Tooltip title="Recargar">
							<IconButton onClick={cargar}>
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					</Stack>
				}
			>
				<Box sx={{ p: 2 }}>
					{seleccion.length > 0 && (
						<Stack
							direction="row"
							spacing={1}
							alignItems="center"
							flexWrap="wrap"
							useFlexGap
							sx={{ mb: 2, p: 1.5, borderRadius: 1, bgcolor: "primary.lighter" }}
						>
							<Typography variant="subtitle2" sx={{ mr: 1 }}>
								{seleccion.length} seleccionadas
							</Typography>
							<Button size="small" startIcon={<Star1 size={16} />} onClick={() => cambiarEstado(seleccion, "elegida")}>
								Elegir
							</Button>
							<Button size="small" startIcon={<DocumentDownload size={16} />} onClick={() => descargar(seleccion)}>
								Descargar
							</Button>
							<Button size="small" startIcon={<Send2 size={16} />} onClick={() => cambiarEstado(seleccion, "subida")}>
								Marcar subidas
							</Button>
							<Button
								size="small"
								color="success"
								startIcon={<TickCircle size={16} />}
								onClick={() => cambiarEstado(seleccion, "aprobada")}
							>
								Aprobadas
							</Button>
							<Button size="small" color="error" onClick={() => setRechazo({ ids: seleccion, motivo: "" })}>
								Rechazadas
							</Button>
							<Button
								size="small"
								color="warning"
								startIcon={<CloseCircle size={16} />}
								onClick={() => cambiarEstado(seleccion, "descartada")}
							>
								Descartar
							</Button>
							<Box sx={{ flex: 1 }} />
							<Button size="small" color="secondary" onClick={() => setSeleccion([])}>
								Quitar selección
							</Button>
						</Stack>
					)}

					{cargando && items.length === 0 ? (
						<Stack alignItems="center" sx={{ py: 6 }}>
							<CircularProgress />
						</Stack>
					) : items.length === 0 ? (
						<Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
							<Typography variant="h5">No hay imágenes en esta vista</Typography>
							<Typography color="text.secondary">Generá una tanda arriba o cambiá de pestaña.</Typography>
						</Stack>
					) : (
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" },
								gap: 2,
							}}
						>
							{items.map((c) => {
								const marcada = seleccion.includes(c._id);
								return (
									<Box
										key={c._id}
										sx={{
											border: 1,
											borderColor: marcada ? "primary.main" : "divider",
											borderRadius: 1.5,
											overflow: "hidden",
											bgcolor: "background.paper",
											display: "flex",
											flexDirection: "column",
										}}
									>
										<Box sx={{ position: "relative", bgcolor: "grey.100", aspectRatio: "1 / 1", display: "flex", alignItems: "center" }}>
											{c.url ? (
												<Box
													component="img"
													src={c.url}
													alt={`${nombrePlantilla[c.plantilla] || c.plantilla}, ${c.formato}, paleta ${nombrePaleta[c.paleta] || c.paleta}`}
													onClick={() => setGrande(c)}
													sx={{ width: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }}
												/>
											) : (
												<Typography sx={{ m: "auto" }} color="text.secondary">
													Sin vista previa
												</Typography>
											)}
											<Checkbox
												checked={marcada}
												onChange={() => alternar(seleccion, c._id, setSeleccion)}
												sx={{
													position: "absolute",
													top: 4,
													left: 4,
													bgcolor: "background.paper",
													borderRadius: 1,
													p: 0.5,
													"&:hover": { bgcolor: "background.paper" },
												}}
												inputProps={{ "aria-label": "Seleccionar imagen" }}
											/>
											<Chip
												size="small"
												label={ESTADO_INFO[c.estado].label}
												color={ESTADO_INFO[c.estado].color}
												sx={{ position: "absolute", top: 8, right: 8 }}
											/>
										</Box>
										<Stack spacing={0.5} sx={{ p: 1.5, flex: 1 }}>
											<Typography variant="subtitle2">{nombrePlantilla[c.plantilla] || c.plantilla}</Typography>
											<Typography variant="caption" color="text.secondary">
												{c.width}×{c.height} · {nombrePaleta[c.paleta] || c.paleta} · lote {c.lote}
											</Typography>
											{c.estado === "rechazada" && c.motivo && (
												<Typography variant="caption" color="error.main">
													Motivo: {c.motivo}
												</Typography>
											)}
										</Stack>
										<Stack direction="row" spacing={0.5} sx={{ px: 1, pb: 1 }}>
											<Tooltip title={c.estado === "elegida" ? "Volver a nueva" : "Elegir"}>
												<IconButton
													size="small"
													color={c.estado === "elegida" ? "primary" : "default"}
													onClick={() => cambiarEstado([c._id], c.estado === "elegida" ? "nueva" : "elegida")}
												>
													<Star1 size={18} variant={c.estado === "elegida" ? "Bold" : "Linear"} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Descargar PNG">
												<IconButton size="small" onClick={() => descargar([c._id])}>
													<DocumentDownload size={18} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Marcar subida a Google Ads">
												<IconButton size="small" onClick={() => cambiarEstado([c._id], "subida")}>
													<Send2 size={18} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Google la aprobó">
												<IconButton size="small" color="success" onClick={() => cambiarEstado([c._id], "aprobada")}>
													<TickCircle size={18} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Google la rechazó">
												<IconButton size="small" color="error" onClick={() => setRechazo({ ids: [c._id], motivo: c.motivo || "" })}>
													<CloseCircle size={18} />
												</IconButton>
											</Tooltip>
											<Box sx={{ flex: 1 }} />
											<Tooltip title="Descartar">
												<IconButton size="small" onClick={() => cambiarEstado([c._id], "descartada")}>
													<CloseCircle size={18} variant="Bulk" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Borrar">
												<IconButton size="small" onClick={() => setABorrar(c)}>
													<Trash size={18} />
												</IconButton>
											</Tooltip>
										</Stack>
									</Box>
								);
							})}
						</Box>
					)}

					{paginas > 1 && (
						<Stack alignItems="center" sx={{ mt: 2 }}>
							<Pagination count={paginas} page={pagina} onChange={(_, p) => setPagina(p)} />
						</Stack>
					)}
				</Box>
			</MainCard>

			<Dialog open={!!grande} onClose={() => setGrande(null)} maxWidth="lg">
				{grande && (
					<>
						<DialogTitle>
							{nombrePlantilla[grande.plantilla] || grande.plantilla} · {grande.width}×{grande.height}
						</DialogTitle>
						<DialogContent>
							<Box
								component="img"
								src={grande.url || ""}
								alt="Vista ampliada"
								sx={{ maxWidth: "100%", maxHeight: "75vh", display: "block" }}
							/>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => descargar([grande._id])} startIcon={<DocumentDownload size={16} />}>
								Descargar
							</Button>
							<Button onClick={() => setGrande(null)}>Cerrar</Button>
						</DialogActions>
					</>
				)}
			</Dialog>

			<Dialog open={!!rechazo} onClose={() => setRechazo(null)} maxWidth="sm" fullWidth>
				<DialogTitle>Rechazada por Google</DialogTitle>
				<DialogContent>
					<TextField
						id="gads-motivo"
						autoFocus
						fullWidth
						margin="dense"
						label="Motivo que dio Google"
						placeholder="Superposiciones gráficas o de texto"
						value={rechazo?.motivo || ""}
						onChange={(e) => setRechazo((r) => (r ? { ...r, motivo: e.target.value } : r))}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRechazo(null)}>Cancelar</Button>
					<Button
						color="error"
						variant="contained"
						onClick={() => {
							if (rechazo) cambiarEstado(rechazo.ids, "rechazada", rechazo.motivo);
							setRechazo(null);
						}}
					>
						Marcar rechazada{rechazo && rechazo.ids.length > 1 ? "s" : ""}
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={!!aBorrar} onClose={() => setABorrar(null)}>
				<DialogTitle>¿Borrar esta imagen?</DialogTitle>
				<DialogContent>
					<Typography>Se borra el archivo y su registro. Si ya está subida a Google Ads, allá sigue.</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setABorrar(null)}>Cancelar</Button>
					<Button color="error" variant="contained" onClick={() => aBorrar && borrar(aBorrar)}>
						Borrar
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

export default GoogleAdsImagenes;
