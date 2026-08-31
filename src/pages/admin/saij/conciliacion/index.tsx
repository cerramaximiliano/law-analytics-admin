import { useCallback, useEffect, useMemo, useState } from "react";
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
	FormControlLabel,
	Grid,
	InputLabel,
	LinearProgress,
	Link,
	MenuItem,
	Paper,
	Select,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, Link21, Refresh, SearchNormal1, TickCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import {
	CandidatoConciliacion,
	DetalleConciliacion,
	LoteDryRun,
	LoteResultado,
	EstadoConciliacion,
	FlagConciliacion,
	ResumenConciliacion,
	buscarCausa,
	confirmar as apiConfirmar,
	desvincular as apiDesvincular,
	escanear as apiEscanear,
	ignorar as apiIgnorar,
	desvincularLote as apiDesvincularLote,
	listarCandidatos,
	obtenerDetalle,
	obtenerResumen,
	reaparear as apiReaparear,
} from "api/saijConciliacion";

const FUEROS = ["CIV", "COM", "CSS", "CNT"];

/**
 * Qué significa cada bandera, en la vista. Las cuatro primeras son las que
 * marcan un caso como sospechoso; INSTANCIA y las dos de "no se puede
 * comparar" son contexto para leer el caso, no acusaciones.
 */
const FLAGS: Record<FlagConciliacion, { label: string; color: "error" | "warning" | "info" | "default"; ayuda: string }> = {
	CARATULA: { label: "Carátula distinta", color: "error", ayuda: "Las carátulas de la causa y del fallo no tienen relación" },
	FUERO: { label: "Fuero", color: "error", ayuda: "El expediente del fallo declara otro fuero que el de la causa" },
	NUMERO: { label: "Número", color: "error", ayuda: "El expediente del fallo declara otro número" },
	ANIO: { label: "Año", color: "error", ayuda: "El expediente del fallo declara otro año" },
	INSTANCIA: { label: "Queja/RH", color: "warning", ayuda: "Número de Cámara o CSJN apareado contra primera instancia — revisar, no siempre es error" },
	CARATULA_PLACEHOLDER: { label: "Sin carátula", color: "info", ayuda: 'La causa tiene carátula "N/A" o "ERROR: Scraping fallido": no se puede comparar' },
	FALLO_ANONIMIZADO: { label: "Anonimizado", color: "info", ayuda: "El fallo tiene las partes en iniciales; se comparó el objeto procesal" },
	SIN_COMPARABLE: { label: "Sin texto", color: "default", ayuda: "No hay texto comparable de ninguno de los dos lados" },
};

const pct = (n?: number | null) => (n === null || n === undefined ? "—" : n.toFixed(2));

/** Verde arriba de 0.35, rojo en 0, ámbar en el medio. */
const colorSimilitud = (j?: number | null) => {
	if (j === null || j === undefined) return "default" as const;
	if (j >= 0.35) return "success" as const;
	if (j > 0) return "warning" as const;
	return "error" as const;
};

const ConciliacionSaijPage = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<CandidatoConciliacion[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(25);
	const [cargando, setCargando] = useState(false);
	const [resumen, setResumen] = useState<ResumenConciliacion | null>(null);
	const [escaneando, setEscaneando] = useState(false);

	// Filtros
	const [estado, setEstado] = useState<EstadoConciliacion | "todos">("pendiente");
	const [fuero, setFuero] = useState("");
	const [flag, setFlag] = useState<FlagConciliacion | "">("");
	const [q, setQ] = useState("");
	const [incluirShells, setIncluirShells] = useState(false);

	// Panel de detalle
	const [detalle, setDetalle] = useState<DetalleConciliacion | null>(null);
	const [cargandoDetalle, setCargandoDetalle] = useState(false);
	const [accionando, setAccionando] = useState(false);

	// Lote de claros
	const [loteAbierto, setLoteAbierto] = useState(false);
	const [lotePreview, setLotePreview] = useState<LoteDryRun | null>(null);
	const [loteResultado, setLoteResultado] = useState<LoteResultado | null>(null);
	const [loteCorriendo, setLoteCorriendo] = useState(false);

	// Re-apareo
	const [reapareoAbierto, setReapareoAbierto] = useState(false);
	const [destino, setDestino] = useState({ fuero: "CIV", number: "", year: "" });
	const [candidataDestino, setCandidataDestino] = useState<Awaited<ReturnType<typeof buscarCausa>> | null>(null);
	const [buscando, setBuscando] = useState(false);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const r = await listarCandidatos({
				estado,
				fuero: fuero || undefined,
				flag: flag || undefined,
				q: q || undefined,
				incluirShells,
				page: page + 1,
				limit,
			});
			setItems(r.data);
			setTotal(r.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "No se pudo cargar la cola de conciliación", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [estado, fuero, flag, q, incluirShells, page, limit, enqueueSnackbar]);

	const cargarResumen = useCallback(async () => {
		try {
			setResumen(await obtenerResumen());
		} catch {
			/* el resumen es informativo: si falla, la tabla sigue sirviendo */
		}
	}, []);

	useEffect(() => {
		cargar();
	}, [cargar]);
	useEffect(() => {
		cargarResumen();
	}, [cargarResumen]);

	const abrirDetalle = async (id: string) => {
		setCargandoDetalle(true);
		setDetalle(null);
		try {
			setDetalle(await obtenerDetalle(id));
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "No se pudo abrir el caso", { variant: "error" });
		} finally {
			setCargandoDetalle(false);
		}
	};

	const refrescarTodo = async () => {
		await Promise.all([cargar(), cargarResumen()]);
	};

	const lanzarEscaneo = async () => {
		setEscaneando(true);
		try {
			const r = await apiEscanear({ soloSospechosos: true });
			enqueueSnackbar(`Escaneo listo: ${r.revisados} pares revisados, ${r.registrados} en cola`, { variant: "success" });
			await refrescarTodo();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "El escaneo falló", { variant: "error" });
		} finally {
			setEscaneando(false);
		}
	};

	const abrirLote = async () => {
		setLoteAbierto(true);
		setLotePreview(null);
		setLoteResultado(null);
		try {
			setLotePreview((await apiDesvincularLote({ dryRun: true })) as LoteDryRun);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "No se pudo previsualizar el lote", { variant: "error" });
			setLoteAbierto(false);
		}
	};

	const ejecutarLote = async () => {
		setLoteCorriendo(true);
		try {
			const r = (await apiDesvincularLote({ dryRun: false })) as LoteResultado;
			setLoteResultado(r);
			enqueueSnackbar(
				`Lote listo: ${r.desvinculados} desvinculados, ${r.reapareados} reapareados a su causa correcta` +
					(r.errores.length ? `, ${r.errores.length} errores` : ""),
				{ variant: r.errores.length ? "warning" : "success" },
			);
			await refrescarTodo();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "El lote falló", { variant: "error" });
		} finally {
			setLoteCorriendo(false);
		}
	};

	const ejecutar = async (fn: () => Promise<unknown>, exito: string) => {
		setAccionando(true);
		try {
			await fn();
			enqueueSnackbar(exito, { variant: "success" });
			setDetalle(null);
			await refrescarTodo();
		} catch (e: any) {
			// 409 = el gate de carátula frenó el apareo manual. No es un error
			// del sistema: es el gate haciendo su trabajo, y se puede forzar.
			if (e?.response?.status === 409) {
				enqueueSnackbar(e.response.data.message, { variant: "warning", autoHideDuration: 12000 });
			} else {
				enqueueSnackbar(e?.response?.data?.message || "La acción falló", { variant: "error" });
			}
		} finally {
			setAccionando(false);
		}
	};

	const buscarDestino = async () => {
		if (!destino.number || !destino.year) return;
		setBuscando(true);
		setCandidataDestino(null);
		try {
			setCandidataDestino(await buscarCausa(destino.fuero, destino.number, destino.year, detalle?.candidato.saijDocId));
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "No se encontró el expediente", { variant: "warning" });
		} finally {
			setBuscando(false);
		}
	};

	const tarjetas = useMemo(
		() => [
			{ label: "Pendientes sospechosos", valor: resumen?.pendientesSospechosos ?? 0, color: theme.palette.error.main },
			{ label: "Confirmados", valor: resumen?.porEstado?.confirmado ?? 0, color: theme.palette.success.main },
			{ label: "Desvinculados", valor: resumen?.porEstado?.desvinculado ?? 0, color: theme.palette.warning.main },
			{ label: "Reapareados", valor: resumen?.porEstado?.reapareado ?? 0, color: theme.palette.info.main },
		],
		[resumen, theme],
	);

	return (
		<MainCard
			title="Conciliación de apareos SAIJ"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button size="small" startIcon={<Refresh size={16} />} onClick={refrescarTodo} disabled={cargando}>
						Refrescar
					</Button>
					<Button size="small" variant="contained" onClick={lanzarEscaneo} disabled={escaneando}>
						{escaneando ? "Escaneando…" : "Escanear apareos"}
					</Button>
					<Button size="small" color="error" variant="outlined" onClick={abrirLote}>
						Desvincular claros…
					</Button>
				</Stack>
			}
		>
			<Alert severity="info" sx={{ mb: 2 }}>
				El apareo automático vincula un fallo con una causa por <strong>fuero + número + año</strong>. Cuando el número de expediente sale de
				una cita del PDF, o el mismo número existe en otro fuero, el fallo termina colgado de una causa ajena — y su carátula se propaga a{" "}
				<code>sentencias-capturadas</code> y a los embeddings. Acá se revisa lo ya apareado y se corrige.
			</Alert>

			<Grid container spacing={2} sx={{ mb: 2 }}>
				{tarjetas.map((t) => (
					<Grid item xs={6} md={3} key={t.label}>
						<Paper variant="outlined" sx={{ p: 2, borderLeft: `3px solid ${t.color}` }}>
							<Typography variant="h4">{t.valor}</Typography>
							<Typography variant="caption" color="text.secondary">
								{t.label}
							</Typography>
						</Paper>
					</Grid>
				))}
			</Grid>

			{resumen?.ultimoEscaneo && (
				<Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
					Último escaneo: {new Date(resumen.ultimoEscaneo).toLocaleString("es-AR")}
				</Typography>
			)}

			{/* Filtros */}
			<Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
				<FormControl size="small" sx={{ minWidth: 150 }}>
					<InputLabel>Estado</InputLabel>
					<Select value={estado} label="Estado" onChange={(e) => { setPage(0); setEstado(e.target.value as any); }}>
						{["pendiente", "confirmado", "desvinculado", "reapareado", "ignorado", "todos"].map((s) => (
							<MenuItem key={s} value={s}>{s}</MenuItem>
						))}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Fuero</InputLabel>
					<Select value={fuero} label="Fuero" onChange={(e) => { setPage(0); setFuero(e.target.value); }}>
						<MenuItem value="">Todos</MenuItem>
						{FUEROS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 190 }}>
					<InputLabel>Bandera</InputLabel>
					<Select value={flag} label="Bandera" onChange={(e) => { setPage(0); setFlag(e.target.value as any); }}>
						<MenuItem value="">Todas</MenuItem>
						{(Object.keys(FLAGS) as FlagConciliacion[]).map((f) => (
							<MenuItem key={f} value={f}>{FLAGS[f].label}</MenuItem>
						))}
					</Select>
				</FormControl>
				<TextField
					size="small"
					placeholder="Nº de expediente o carátula"
					value={q}
					onChange={(e) => setQ(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") { setPage(0); cargar(); } }}
					InputProps={{ startAdornment: <SearchNormal1 size={16} style={{ marginRight: 8 }} /> }}
					sx={{ minWidth: 260 }}
				/>
				<FormControlLabel
					control={<Switch size="small" checked={incluirShells} onChange={(e) => { setPage(0); setIncluirShells(e.target.checked); }} />}
					label={
						<Tooltip title="Causas creadas por SAIJ: su carátula sale del propio fallo, así que coinciden por construcción y no aportan señal">
							<Typography variant="body2">Incluir shells</Typography>
						</Tooltip>
					}
				/>
			</Stack>

			{cargando && <LinearProgress sx={{ mb: 1 }} />}

			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Expediente</TableCell>
							<TableCell>Carátula de la causa</TableCell>
							<TableCell>Carátula del fallo</TableCell>
							<TableCell align="center">Similitud</TableCell>
							<TableCell>Banderas</TableCell>
							<TableCell align="center">Estado</TableCell>
							<TableCell align="right" />
						</TableRow>
					</TableHead>
					<TableBody>
						{items.map((it) => (
							<TableRow key={it._id} hover>
								<TableCell sx={{ whiteSpace: "nowrap" }}>
									<Typography variant="body2" fontWeight={600}>{it.fuero} {it.number}/{it.year}</Typography>
									<Typography variant="caption" color="text.secondary">{it.causaSource}</Typography>
								</TableCell>
								<TableCell sx={{ maxWidth: 280 }}>
									<Typography variant="caption">{it.caratulaCausa || "—"}</Typography>
								</TableCell>
								<TableCell sx={{ maxWidth: 280 }}>
									<Typography variant="caption">{it.caratulaFallo || "—"}</Typography>
								</TableCell>
								<TableCell align="center">
									<Chip size="small" label={pct(it.jaccard)} color={colorSimilitud(it.jaccard)} variant="outlined" />
								</TableCell>
								<TableCell>
									<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
										{it.flags?.map((f) => (
											<Tooltip key={f} title={FLAGS[f]?.ayuda || f}>
												<Chip size="small" label={FLAGS[f]?.label || f} color={FLAGS[f]?.color || "default"} variant="outlined" />
											</Tooltip>
										))}
									</Stack>
								</TableCell>
								<TableCell align="center">
									<Chip
										size="small"
										label={it.estado}
										color={it.estado === "pendiente" ? "default" : it.estado === "confirmado" ? "success" : "info"}
									/>
								</TableCell>
								<TableCell align="right">
									<Button size="small" onClick={() => abrirDetalle(it._id)}>Revisar</Button>
								</TableCell>
							</TableRow>
						))}
						{!cargando && items.length === 0 && (
							<TableRow>
								<TableCell colSpan={7}>
									<Box sx={{ py: 4, textAlign: "center" }}>
										<Typography color="text.secondary">
											No hay casos con estos filtros. Si nunca corriste el escaneo, apretá «Escanear apareos».
										</Typography>
									</Box>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
				<TablePagination
					component="div"
					count={total}
					page={page}
					rowsPerPage={limit}
					onPageChange={(_, p) => setPage(p)}
					onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
					rowsPerPageOptions={[25, 50, 100]}
				/>
			</TableContainer>

			{/* ── Detalle ─────────────────────────────────────────────────────── */}
			<Dialog open={!!detalle || cargandoDetalle} onClose={() => setDetalle(null)} maxWidth="lg" fullWidth>
				<DialogTitle>Revisar apareo</DialogTitle>
				<DialogContent dividers>
					{cargandoDetalle && <CircularProgress />}
					{detalle && (
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
									<Typography variant="subtitle2" gutterBottom>Causa PJN</Typography>
									<Typography variant="h6">{detalle.causa?.fuero} {detalle.causa?.number}/{detalle.causa?.year}</Typography>
									<Typography variant="body2" sx={{ mb: 1 }}>{detalle.causa?.caratula || "—"}</Typography>
									<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
										<Chip size="small" label={`source: ${detalle.causa?.source}`} variant="outlined" />
										<Chip size="small" label={`verified: ${detalle.causa?.verified}`} variant="outlined" />
										<Chip size="small" label={`update: ${detalle.causa?.update}`} variant="outlined" />
										<Chip size="small" label={`${detalle.causa?.movimientosCount ?? 0} movs`} variant="outlined" />
									</Stack>
									{detalle.causa?.juzgado ? (
										<Typography variant="caption" color="text.secondary">
											Juzgado {detalle.causa.juzgado} / Sec {detalle.causa.secretaria} — {detalle.causa.objeto}
										</Typography>
									) : (
										<Typography variant="caption" color="text.secondary">Sin juzgado ni objeto</Typography>
									)}
									<Divider sx={{ my: 1.5 }} />
									<Typography variant="caption" color="text.secondary">
										Movimientos SAIJ dentro de esta causa ({detalle.causa?.movimiento?.length ?? 0})
									</Typography>
									{detalle.causa?.movimiento?.map((m, i) => (
										<Box key={i} sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 1 }}>
											<Typography variant="caption" display="block">
												{m.fecha ? new Date(m.fecha).toLocaleDateString("es-AR") : "sin fecha"} — {m.detalle}
											</Typography>
										</Box>
									))}
								</Paper>
							</Grid>

							<Grid item xs={12} md={6}>
								<Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
									<Typography variant="subtitle2" gutterBottom>Fallo SAIJ</Typography>
									<Typography variant="body2" sx={{ mb: 1 }}>{detalle.fallo?.titulo || "—"}</Typography>
									<Typography variant="caption" color="text.secondary" display="block">{detalle.fallo?.tribunal}</Typography>
									<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
										<Chip
											size="small"
											label={`exp: ${detalle.fallo?.expediente?.fuero || "?"} ${detalle.fallo?.expediente?.numero ?? "?"}/${detalle.fallo?.expediente?.año ?? "?"}`}
											variant="outlined"
										/>
										<Tooltip title="Con qué seguridad el parser sacó el expediente del PDF. `low` es el patrón que tomaba expedientes de citas.">
											<Chip
												size="small"
												label={`confianza: ${detalle.fallo?.expediente?.confidence || "?"}`}
												color={detalle.fallo?.expediente?.confidence === "high" ? "success" : "warning"}
												variant="outlined"
											/>
										</Tooltip>
										<Chip size="small" label={detalle.fallo?.expediente?.source || "?"} variant="outlined" />
									</Stack>
									{detalle.fallo?.url && (
										<Link href={detalle.fallo.url} target="_blank" rel="noopener" variant="caption">
											<DocumentText size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
											Ver el fallo en SAIJ
										</Link>
									)}
									<Divider sx={{ my: 1.5 }} />
									<Typography variant="caption" color="text.secondary">
										Sentencias capturadas ({detalle.sentenciasCapturadas.length})
									</Typography>
									{detalle.sentenciasCapturadas.map((sc) => (
										<Box key={sc._id} sx={{ mt: 1, p: 1, bgcolor: alpha(theme.palette.warning.main, 0.06), borderRadius: 1 }}>
											<Typography variant="caption" display="block">{sc.caratula}</Typography>
											<Typography variant="caption" color="text.secondary">
												{sc.fuero} {sc.number}/{sc.year} · causaId: {sc.causaId ? "sí" : "null"} · embedding: {sc.embeddingStatus} (
												{sc.embeddingChunksCount ?? 0} chunks)
											</Typography>
										</Box>
									))}
									{detalle.sentenciasCapturadas.length > 0 && (
										<Alert severity="warning" sx={{ mt: 1 }} icon={<Warning2 size={16} />}>
											Al desvincular, la carátula de estas sentencias vuelve a salir del fallo y el embedding se re-encola para
											reindexar con la metadata correcta.
										</Alert>
									)}
								</Paper>
							</Grid>

							<Grid item xs={12}>
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
										<Chip label={`veredicto: ${detalle.candidato.veredicto}`} color={detalle.candidato.sospechoso ? "error" : "success"} />
										<Typography variant="body2">jaccard {pct(detalle.candidato.jaccard)}</Typography>
										<Typography variant="body2">containment {pct(detalle.candidato.containment)}</Typography>
										<Typography variant="body2">objeto {pct(detalle.candidato.objetoJaccard)}</Typography>
										{detalle.candidato.flags?.map((f) => (
											<Tooltip key={f} title={FLAGS[f]?.ayuda || f}>
												<Chip size="small" label={FLAGS[f]?.label || f} color={FLAGS[f]?.color || "default"} variant="outlined" />
											</Tooltip>
										))}
									</Stack>
								</Paper>
							</Grid>
						</Grid>
					)}
				</DialogContent>
				<DialogActions sx={{ px: 3, py: 2 }}>
					<Button onClick={() => setDetalle(null)} disabled={accionando}>Cerrar</Button>
					<Box sx={{ flex: 1 }} />
					<Button
						color="inherit"
						disabled={accionando || !detalle}
						onClick={() => ejecutar(() => apiIgnorar(detalle!.candidato._id), "Caso ignorado")}
					>
						Ignorar
					</Button>
					<Button
						color="success"
						startIcon={<TickCircle size={16} />}
						disabled={accionando || !detalle}
						onClick={() => ejecutar(() => apiConfirmar(detalle!.candidato._id), "Apareo confirmado")}
					>
						El apareo está bien
					</Button>
					<Button
						color="primary"
						startIcon={<Link21 size={16} />}
						disabled={accionando || !detalle}
						onClick={() => { setCandidataDestino(null); setDestino({ fuero: detalle!.candidato.fuero, number: "", year: "" }); setReapareoAbierto(true); }}
					>
						Mover a otra causa
					</Button>
					<Button
						color="error"
						variant="contained"
						startIcon={<CloseCircle size={16} />}
						disabled={accionando || !detalle}
						onClick={() => ejecutar(() => apiDesvincular(detalle!.candidato._id), "Apareo deshecho")}
					>
						Desvincular
					</Button>
				</DialogActions>
			</Dialog>

			{/* ── Lote de claros ──────────────────────────────────────────────── */}
			<Dialog open={loteAbierto} onClose={() => !loteCorriendo && setLoteAbierto(false)} maxWidth="md" fullWidth>
				<DialogTitle>Desvincular los casos claros en lote</DialogTitle>
				<DialogContent dividers>
					{!lotePreview && !loteResultado && <CircularProgress size={22} />}
					{lotePreview && !loteResultado && (
						<>
							<Alert severity="warning" sx={{ mb: 2 }}>
								Se van a desvincular <strong>{lotePreview.total}</strong> apareos donde las carátulas no tienen relación y ambas
								tienen nombres completos (sin la excusa de la anonimización ni de una carátula placeholder). Cada uno queda
								respaldado en <code>saij-desvinculacion-backup</code>, la sentencia capturada recupera la carátula del propio
								fallo (queda publicada sin causa) y su embedding se re-encola. Si el expediente actual del fallo apunta a otra
								causa cuya carátula sí coincide, se re-aparea solo.
							</Alert>
							<Typography variant="caption" color="text.secondary" gutterBottom display="block">
								Los peores de la muestra:
							</Typography>
							{lotePreview.muestra.map((m, i) => (
								<Box key={i} sx={{ mb: 1, p: 1, bgcolor: alpha(theme.palette.error.main, 0.04), borderRadius: 1 }}>
									<Typography variant="caption" display="block">
										<strong>{m.fuero} {m.number}/{m.year}</strong> · jaccard {pct(m.jaccard)}
									</Typography>
									<Typography variant="caption" display="block">CAUSA: {m.caratulaCausa}</Typography>
									<Typography variant="caption" display="block" color="text.secondary">FALLO: {m.caratulaFallo}</Typography>
								</Box>
							))}
						</>
					)}
					{loteResultado && (
						<Alert severity={loteResultado.errores.length ? "warning" : "success"}>
							Procesados {loteResultado.procesados}: <strong>{loteResultado.desvinculados} desvinculados</strong> y{" "}
							<strong>{loteResultado.reapareados} re-apareados</strong> a la causa que declara su expediente corregido.
							{loteResultado.errores.length > 0 && (
								<>
									{" "}Errores: {loteResultado.errores.map((e) => `${e.expte} (${e.error})`).join(" · ")}
								</>
							)}
						</Alert>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setLoteAbierto(false)} disabled={loteCorriendo}>
						{loteResultado ? "Cerrar" : "Cancelar"}
					</Button>
					{!loteResultado && (
						<Button color="error" variant="contained" onClick={ejecutarLote} disabled={loteCorriendo || !lotePreview}>
							{loteCorriendo ? "Desvinculando…" : `Desvincular ${lotePreview?.total ?? ""}`}
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* ── Re-apareo ───────────────────────────────────────────────────── */}
			<Dialog open={reapareoAbierto} onClose={() => setReapareoAbierto(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Mover el fallo a otra causa</DialogTitle>
				<DialogContent dividers>
					<Stack direction="row" spacing={1} sx={{ mb: 2 }}>
						<FormControl size="small" sx={{ minWidth: 110 }}>
							<InputLabel>Fuero</InputLabel>
							<Select value={destino.fuero} label="Fuero" onChange={(e) => setDestino({ ...destino, fuero: e.target.value })}>
								{FUEROS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
							</Select>
						</FormControl>
						<TextField size="small" label="Número" value={destino.number} onChange={(e) => setDestino({ ...destino, number: e.target.value })} />
						<TextField size="small" label="Año" value={destino.year} onChange={(e) => setDestino({ ...destino, year: e.target.value })} />
						<Button onClick={buscarDestino} disabled={buscando || !destino.number || !destino.year}>
							{buscando ? "Buscando…" : "Buscar"}
						</Button>
					</Stack>

					{candidataDestino && (
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Typography variant="subtitle2">
								{candidataDestino.causa.fuero} {candidataDestino.causa.number}/{candidataDestino.causa.year}
							</Typography>
							<Typography variant="body2" sx={{ mb: 1 }}>{candidataDestino.causa.caratula}</Typography>
							{candidataDestino.veredicto && (
								<Alert severity={candidataDestino.veredicto.sospechoso ? "warning" : "success"}>
									{candidataDestino.veredicto.sospechoso
										? "Las carátulas tampoco coinciden con esta causa. Se puede mover igual, pero queda registrado como forzado."
										: "Las carátulas coinciden."}{" "}
									jaccard {pct(candidataDestino.veredicto.jaccard)}
								</Alert>
							)}
						</Paper>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setReapareoAbierto(false)}>Cancelar</Button>
					<Button
						variant="contained"
						disabled={!candidataDestino || accionando}
						onClick={() =>
							ejecutar(async () => {
								await apiReaparear(detalle!.candidato._id, {
									...destino,
									// Si el comparador ya avisó que no coinciden, la persona
									// está decidiendo a conciencia: se manda forzado para que
									// el backend no lo rechace con 409.
									forzar: !!candidataDestino?.veredicto?.sospechoso,
								});
								setReapareoAbierto(false);
							}, "Fallo movido a la causa nueva")
						}
					>
						Mover
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default ConciliacionSaijPage;
