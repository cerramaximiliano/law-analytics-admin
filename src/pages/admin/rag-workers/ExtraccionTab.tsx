import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	LinearProgress,
	MenuItem,
	Paper,
	Skeleton,
	Stack,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, Link21, Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagExtraccionService, {
	ExtraccionDetalle,
	ExtraccionFiltros,
	ExtraccionItem,
	ExtraccionResumen,
	FichaCedula,
} from "api/ragExtraccion";
import { headerBorder } from "themes/dashboardTokens";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtFecha = (v?: string | null, conHora = false) => {
	if (!v) return "—";
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	return d.toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
		timeZone: "America/Argentina/Buenos_Aires",
	});
};
// Fechas "YYYY-MM-DD" sin hora: se muestran tal cual, sin pasar por la zona horaria.
const fmtDia = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split("-").reverse().join("/") : fmtFecha(v));
const n = (v?: number) => (typeof v === "number" ? v.toLocaleString("es-AR") : "0");
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");

const STATUS_COLOR: Record<string, "success" | "warning" | "default" | "error"> = {
	extracted: "success",
	needs_ocr: "warning",
	skipped: "default",
	failed: "error",
};
const STATUS_LABEL: Record<string, string> = { extracted: "Extraído", needs_ocr: "Necesita OCR", skipped: "Omitido", failed: "Falló" };
const TIPO_CORTO: Record<string, string> = {
	"CEDULA ELECTRONICA TRIBUNAL": "Electrónica · tribunal",
	"CEDULA ELECTRONICA PARTE": "Electrónica · parte",
	CEDULA: "Papel · juzgado",
};

// ── Resumen ──────────────────────────────────────────────────────────────────

const Cifra = ({ titulo, valor, sub }: { titulo: string; valor: React.ReactNode; sub?: React.ReactNode }) => (
	<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
		<Typography variant="caption" color="text.secondary">
			{titulo}
		</Typography>
		<Typography variant="h4" sx={{ mt: 0.25 }}>
			{valor}
		</Typography>
		{sub && (
			<Typography variant="caption" color="text.secondary">
				{sub}
			</Typography>
		)}
	</Paper>
);

const Resumen = ({ r }: { r: ExtraccionResumen }) => {
	const pendientes = (r.atlas.not_applicable || 0) + (r.atlas.pending || 0) + (r.atlas.sin_estado || 0);
	const hechos = (r.atlas.extracted || 0) + (r.atlas.ocr_done || 0);
	const total = Object.values(r.atlas).reduce((a, b) => a + b, 0);
	const p = r.procesados;
	const procesados = Object.values(p.porStatus).reduce((a, b) => a + b, 0);
	return (
		<Stack spacing={1.5}>
			<Grid container spacing={1.5}>
				<Grid item xs={6} md={3}>
					<Cifra titulo="Cédulas con PDF en S3 (Atlas)" valor={n(total)} sub={`${n(hechos)} con texto · ${n(pendientes)} pendientes`} />
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Procesadas por el worker"
						valor={n(procesados)}
						sub={`${n(p.porStatus.extracted)} extraídas · ${n(p.porStatus.needs_ocr)} OCR · ${n(p.porStatus.failed)} fallas`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Vinculadas a su resolución"
						valor={pct(p.vinculadas, p.conTranscripcion)}
						sub={`${n(p.vinculadas)} de ${n(p.conTranscripcion)} que transcriben la resolución`}
					/>
				</Grid>
				<Grid item xs={6} md={3}>
					<Cifra
						titulo="Worker"
						valor={
							<Chip
								size="small"
								color={r.worker?.activo ? "success" : "default"}
								label={r.worker ? (r.worker.activo ? "Activo" : "Detenido") : "Sin datos"}
							/>
						}
						sub={
							r.worker
								? `${r.worker.host} · ${r.worker.version} · último ciclo ${fmtFecha(r.worker.ultimoCicloAt, true)}`
								: "Todavía no corrió"
						}
					/>
				</Grid>
			</Grid>
			{total > 0 && (
				<LinearProgress variant="determinate" value={Math.min(100, (100 * hechos) / total)} sx={{ height: 6, borderRadius: 3 }} />
			)}
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
				{Object.entries(p.porFuero).map(([k, v]) => (
					<Chip key={`f-${k}`} size="small" variant="outlined" label={`${k}: ${n(v)}`} />
				))}
				{Object.entries(p.porFamilia).map(([k, v]) => (
					<Chip key={`p-${k}`} size="small" variant="outlined" color="primary" label={`plantilla ${k}: ${n(v)}`} />
				))}
				{Object.entries(p.porClase).map(([k, v]) => (
					<Chip key={`c-${k}`} size="small" variant="outlined" color="secondary" label={`${k}: ${n(v)}`} />
				))}
			</Stack>
		</Stack>
	);
};

// ── Detalle ──────────────────────────────────────────────────────────────────

const Campo = ({ k, v }: { k: string; v: React.ReactNode }) => (
	<>
		<Grid item xs={4} sm={3}>
			<Typography variant="caption" color="text.secondary">
				{k}
			</Typography>
		</Grid>
		<Grid item xs={8} sm={9}>
			<Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
				{v === null || v === undefined || v === "" ? <span style={{ opacity: 0.5 }}>—</span> : v}
			</Typography>
		</Grid>
	</>
);

const FichaVista = ({ f, causa }: { f: FichaCedula; causa: ExtraccionDetalle["causa"] }) => {
	const expLeido = f.expediente ? `${f.expediente.numero}/${f.expediente.anio || "????"}` : null;
	const expCausa = causa ? `${causa.number}/${causa.year}` : null;
	const expDistinto = expLeido && expCausa && f.expediente && String(f.expediente.numero) !== String(causa?.number);
	return (
		<Grid container spacing={0.75}>
			<Campo
				k="Plantilla"
				v={`${f.familia || "—"} · emitida por ${f.emisor || "—"}${
					f.instrumento && f.instrumento !== "cedula" ? ` · ${f.instrumento}` : ""
				}`}
			/>
			<Campo k="N° de cédula" v={f.numeroCedula} />
			<Campo k="Notificada" v={f.notificadoEl ? fmtFecha(f.notificadoEl, true) : null} />
			<Campo k="Emisión" v={fmtDia(f.fechaEmision)} />
			<Campo
				k="Destinatario"
				v={f.destinatario ? `${f.destinatario}${f.destinatarioLetrado ? ` (letrado: ${f.destinatarioLetrado})` : ""}` : null}
			/>
			{f.destinatarios && f.destinatarios.length > 1 && (
				<Campo
					k="Destinatarios"
					v={f.destinatarios.map((d) => `${d.nombre}${d.domicilio ? ` — ${d.domicilio}` : ""} (pág. ${d.paginas.join(",")})`).join(" · ")}
				/>
			)}
			<Campo
				k="Domicilio"
				v={
					f.domicilio
						? `${f.domicilio}${f.tipoDomicilio ? ` (${f.tipoDomicilio}${f.zona ? `, zona ${f.zona}` : ""})` : ""}`
						: f.tipoDomicilio
				}
			/>
			<Campo k="Tribunal" v={f.tribunal ? `${f.tribunal}${f.tribunalDireccion ? ` — ${f.tribunalDireccion}` : ""}` : null} />
			<Campo
				k="Expediente"
				v={
					expLeido ? (
						<>
							{expLeido}
							{expDistinto && <Chip size="small" color="warning" sx={{ ml: 1 }} label={`causa ${expCausa} (¿incidente?)`} />}
						</>
					) : null
				}
			/>
			<Campo k="Carátula" v={f.caratula} />
			{causa && <Campo k="Carátula de la causa" v={causa.caratula} />}
			<Campo
				k="Firmante"
				v={
					f.firmante
						? [f.firmante.nombre, f.firmante.cargo, f.firmante.cuit && `CUIT ${f.firmante.cuit}`].filter(Boolean).join(" · ")
						: null
				}
			/>
			<Campo k="Copias" v={f.copias === true ? "Sí" : f.copias === false ? "No" : null} />
			<Campo k="Observaciones" v={[f.caracter, f.observaciones].filter(Boolean).join(" · ") || null} />
			<Campo
				k="Páginas"
				v={`cédula ${f.paginasCedula?.join(",") || "—"}${
					f.paginasDorsoFormulario?.length ? ` (dorso en blanco ${f.paginasDorsoFormulario.join(",")})` : ""
				} · copias ${(f.paginasAdjuntas || []).length}${
					(f.paginasAdjuntas || []).some((p) => !p.conTexto)
						? ` (${(f.paginasAdjuntas || []).filter((p) => !p.conTexto).length} escaneadas)`
						: ""
				}`}
			/>
			{f.camposFaltantes && f.camposFaltantes.length > 0 && (
				<Campo k="Faltan" v={<Chip size="small" color="warning" label={f.camposFaltantes.join(", ")} />} />
			)}
			<Grid item xs={12}>
				<Typography variant="caption" color="text.secondary">
					Resolución transcripta {f.resolucionEnAdjunto && !f.transcripcion ? "(no está en la cédula: va en la copia adjunta)" : ""}
				</Typography>
				{f.transcripcion && (
					<Paper variant="outlined" sx={{ p: 1, mt: 0.5, maxHeight: 220, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 13 }}>
						{f.transcripcion}
					</Paper>
				)}
			</Grid>
		</Grid>
	);
};

const DetalleDialog = ({ id, onClose }: { id: string | null; onClose: () => void }) => {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();
	const [d, setD] = useState<ExtraccionDetalle | null>(null);
	const [cargando, setCargando] = useState(false);
	const [vista, setVista] = useState<"ficha" | "texto" | "pdf" | "vinculos">("ficha");
	const [pdf, setPdf] = useState<string | null>(null);

	useEffect(() => {
		if (!id) return;
		setD(null);
		setVista("ficha");
		setPdf(null);
		setCargando(true);
		RagExtraccionService.detalle(id)
			.then(setD)
			.catch((e) => enqueueSnackbar(e?.response?.data?.error || "No se pudo cargar el detalle", { variant: "error" }))
			.finally(() => setCargando(false));
	}, [id, enqueueSnackbar]);

	useEffect(() => {
		if (vista !== "pdf" || !id || pdf) return;
		RagExtraccionService.pdfUrl(id)
			.then(setPdf)
			.catch(() => enqueueSnackbar("No se pudo bajar el PDF", { variant: "error" }));
	}, [vista, id, pdf, enqueueSnackbar]);

	useEffect(
		() => () => {
			if (pdf) URL.revokeObjectURL(pdf);
		},
		[pdf],
	);

	const e = d?.estado;
	const res = e?.vinculos?.resolucion;
	return (
		<Dialog open={!!id} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
			<DialogTitle sx={{ pr: 6 }}>
				<Typography variant="h5">
					{d?.movimiento ? `${TIPO_CORTO[d.movimiento.tipo] || d.movimiento.tipo} · ${fmtFecha(d.movimiento.fecha)}` : "Detalle"}
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
					{id} {d?.movimiento?.detalle ? `· ${d.movimiento.detalle}` : ""}
				</Typography>
				<IconButton onClick={onClose} sx={{ position: "absolute", right: 8, top: 8 }} aria-label="Cerrar">
					<CloseCircle size={20} />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{cargando && <LinearProgress />}
				{d && (
					<Stack spacing={1.5}>
						<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
							{e && <Chip size="small" color={STATUS_COLOR[e.status]} label={STATUS_LABEL[e.status] || e.status} />}
							{e?.clase && (
								<Chip
									size="small"
									variant="outlined"
									label={`${e.clase} · ${e.paginas || 0} págs${
										e.paginasSinTexto?.length ? ` (${e.paginasSinTexto.length} sin texto)` : ""
									}`}
								/>
							)}
							{d.movimiento?.textoStatus && (
								<Chip
									size="small"
									variant="outlined"
									label={`Atlas: ${d.movimiento.textoStatus}${d.movimiento.textoMethod ? ` / ${d.movimiento.textoMethod}` : ""}`}
								/>
							)}
							{e?.aliasDe && <Chip size="small" color="info" label={`Duplicado de ${e.aliasDe.split(":")[1]}`} />}
							{e?.skipReason && <Chip size="small" label={`Omitido: ${e.skipReason}`} />}
							{e?.error && <Chip size="small" color="error" label={e.error} />}
							{res?.movementId ? (
								<Chip
									size="small"
									color="success"
									icon={<Link21 size={14} />}
									label={`Vinculada (${res.metodo === "fecha" ? "por fecha" : `${Math.round(res.cobertura * 100)}%`})`}
								/>
							) : (
								e?.ficha?.esCedula && <Chip size="small" variant="outlined" label="Sin resolución vinculada" />
							)}
							{e?.parserVersion && (
								<Chip size="small" variant="outlined" label={`${e.parserVersion} · ${e.ms ?? "?"} ms · ${fmtFecha(e.procesadoAt, true)}`} />
							)}
						</Stack>
						<Tabs
							value={vista}
							onChange={(_, v) => setVista(v)}
							sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40, textTransform: "none" } }}
						>
							<Tab value="ficha" label="Ficha" />
							<Tab value="texto" label={`Texto${d.texto ? ` (${n(d.texto.length)})` : ""}`} />
							<Tab value="pdf" label="PDF original" />
							<Tab value="vinculos" label={`Vinculados (${d.vinculados.length})`} />
						</Tabs>
						{vista === "ficha" &&
							(e?.ficha?.esCedula ? (
								<FichaVista f={e.ficha} causa={d.causa} />
							) : (
								<Alert severity="info">
									No se reconoció la plantilla de cédula{e?.ficha?.camposFaltantes ? ` (${e.ficha.camposFaltantes.join(", ")})` : ""}.
								</Alert>
							))}
						{vista === "texto" &&
							(d.texto ? (
								<Paper
									variant="outlined"
									sx={{ p: 1.25, maxHeight: "60vh", overflow: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: 12.5 }}
								>
									{d.texto}
									{d.textoTruncado && "\n\n[… recortado para la vista]"}
								</Paper>
							) : (
								<Alert severity="warning">Sin texto extraído.</Alert>
							))}
						{vista === "pdf" &&
							(pdf ? (
								<Box component="iframe" src={pdf} title="PDF" sx={{ width: "100%", height: "70vh", border: 0 }} />
							) : (
								<Skeleton variant="rectangular" height={400} />
							))}
						{vista === "vinculos" &&
							(d.vinculados.length ? (
								<Stack spacing={1}>
									{d.vinculados.map((v) => {
										const esRes = res?.movementId === v._id;
										const adj = e?.vinculos?.adjuntos?.find((a) => a.movementId === v._id);
										return (
											<Paper key={v._id} variant="outlined" sx={{ p: 1.25 }}>
												<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
													<Typography variant="subtitle2">
														{v.tipo} · {fmtFecha(v.fecha)}
													</Typography>
													{esRes && (
														<Chip
															size="small"
															color="success"
															label={`resolución notificada · ${
																res?.metodo === "fecha" ? "por fecha" : `${Math.round((res?.cobertura || 0) * 100)}%`
															}`}
														/>
													)}
													{adj && (
														<Chip
															size="small"
															color="info"
															label={`copia adjunta pág. ${adj.pagina} · ${Math.round(adj.cobertura * 100)}%`}
														/>
													)}
													{e?.aliasDe === v._id && <Chip size="small" label="mismo documento" />}
												</Stack>
												<Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
													{v._id} · {v.detalle}
												</Typography>
												<Paper
													variant="outlined"
													sx={{ p: 1, mt: 0.75, maxHeight: 200, overflow: "auto", whiteSpace: "pre-wrap", fontSize: 12.5 }}
												>
													{v.extracto || "(sin texto)"}
												</Paper>
											</Paper>
										);
									})}
								</Stack>
							) : (
								<Alert severity="info">Sin movimientos vinculados.</Alert>
							))}
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
};

// ── Tab ──────────────────────────────────────────────────────────────────────

const ExtraccionTab = () => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [resumen, setResumen] = useState<ExtraccionResumen | null>(null);
	const [items, setItems] = useState<ExtraccionItem[]>([]);
	const [total, setTotal] = useState(0);
	const [cargando, setCargando] = useState(false);
	const [filtros, setFiltros] = useState<ExtraccionFiltros>({
		etapa: "cedulas",
		status: "",
		clase: "",
		familia: "",
		vinculo: "",
		fuero: "",
		q: "",
	});
	const [busqueda, setBusqueda] = useState("");
	const [page, setPage] = useState(0);
	const [limit, setLimit] = useState(25);
	const [abierto, setAbierto] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			const [r, l] = await Promise.all([
				RagExtraccionService.resumen(filtros.etapa),
				RagExtraccionService.documentos({ ...filtros, page: page + 1, limit }),
			]);
			setResumen(r);
			setItems(l.data);
			setTotal(l.pagination.total);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.error || "No se pudo cargar la extracción", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [filtros, page, limit, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const set = (k: keyof ExtraccionFiltros) => (ev: React.ChangeEvent<HTMLInputElement>) => {
		setPage(0);
		setFiltros((f) => ({ ...f, [k]: ev.target.value }));
	};
	const fueros = useMemo(() => Object.keys(resumen?.procesados.porFuero || {}).filter((f) => f !== "sin_dato"), [resumen]);
	const familias = useMemo(() => Object.keys(resumen?.procesados.porFamilia || {}).filter((f) => f !== "sin_dato"), [resumen]);

	return (
		<Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
			<Stack spacing={2}>
				<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
					<Box>
						<Typography variant="h5">Extracción de cédulas</Typography>
						<Typography variant="body2" color="text.secondary">
							Texto, ficha y vínculo con la resolución notificada, por cada cédula de pjn-movements. Lo escribe el worker pjn-rag-cedulas
							(worker_02).
						</Typography>
					</Box>
					<Tooltip title="Actualizar">
						<span>
							<IconButton onClick={cargar} disabled={cargando}>
								<Refresh size={18} />
							</IconButton>
						</span>
					</Tooltip>
				</Stack>

				{resumen ? <Resumen r={resumen} /> : <Skeleton variant="rectangular" height={110} />}

				<Stack direction={{ xs: "column", md: "row" }} spacing={1}>
					<TextField select size="small" label="Estado" value={filtros.status} onChange={set("status")} sx={{ minWidth: 140 }}>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(STATUS_LABEL).map(([k, v]) => (
							<MenuItem key={k} value={k}>
								{v}
							</MenuItem>
						))}
					</TextField>
					<TextField select size="small" label="Vínculo" value={filtros.vinculo} onChange={set("vinculo")} sx={{ minWidth: 150 }}>
						<MenuItem value="">Todos</MenuItem>
						<MenuItem value="si">Con resolución</MenuItem>
						<MenuItem value="no">Sin resolución</MenuItem>
					</TextField>
					<TextField select size="small" label="Fuero" value={filtros.fuero} onChange={set("fuero")} sx={{ minWidth: 110 }}>
						<MenuItem value="">Todos</MenuItem>
						{fueros.map((f) => (
							<MenuItem key={f} value={f}>
								{f}
							</MenuItem>
						))}
					</TextField>
					<TextField select size="small" label="Plantilla" value={filtros.familia} onChange={set("familia")} sx={{ minWidth: 130 }}>
						<MenuItem value="">Todas</MenuItem>
						{familias.map((f) => (
							<MenuItem key={f} value={f}>
								{f}
							</MenuItem>
						))}
					</TextField>
					<TextField select size="small" label="Capa de texto" value={filtros.clase} onChange={set("clase")} sx={{ minWidth: 140 }}>
						<MenuItem value="">Todas</MenuItem>
						<MenuItem value="digital">Digital</MenuItem>
						<MenuItem value="mixto">Mixto</MenuItem>
						<MenuItem value="escaneado">Escaneado</MenuItem>
					</TextField>
					<TextField
						size="small"
						label="Buscar (destinatario, carátula, N°, tribunal)"
						value={busqueda}
						onChange={(ev) => setBusqueda(ev.target.value)}
						onKeyDown={(ev) => {
							if (ev.key === "Enter") {
								setPage(0);
								setFiltros((f) => ({ ...f, q: busqueda.trim() }));
							}
						}}
						sx={{ flex: 1, minWidth: 200 }}
					/>
					<TextField
						size="small"
						label="Causa (id)"
						value={filtros.causaId || ""}
						onChange={set("causaId")}
						sx={{ minWidth: 220 }}
						error={!!filtros.causaId && !/^[a-f0-9]{24}$/i.test(filtros.causaId)}
					/>
				</Stack>

				<TableContainer component={Paper} variant="outlined" sx={{ borderColor: headerBorder(isDark) }}>
					{cargando && <LinearProgress />}
					<Table size="small">
						<TableHead>
							<TableRow sx={{ "& th": { bgcolor: alpha(theme.palette.primary.main, 0.04), fontWeight: 600 } }}>
								<TableCell>Fecha</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Destinatario</TableCell>
								<TableCell>Notificada</TableCell>
								<TableCell>Expediente</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Resolución</TableCell>
								<TableCell align="right">Págs</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{items.map((it) => {
								const r = it.vinculos?.resolucion;
								const f = it.ficha || {};
								return (
									<TableRow key={it._id} hover sx={{ cursor: "pointer" }} onClick={() => setAbierto(it._id)}>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{fmtFecha(it.fecha)}</TableCell>
										<TableCell>
											<Typography variant="body2">{TIPO_CORTO[it.tipo] || it.tipo}</Typography>
											<Typography variant="caption" color="text.secondary">
												{[it.fuero, f.familia].filter(Boolean).join(" · ")}
											</Typography>
										</TableCell>
										<TableCell sx={{ maxWidth: 240 }}>
											<Typography variant="body2" noWrap title={f.destinatario || ""}>
												{f.destinatario || "—"}
											</Typography>
											<Typography variant="caption" color="text.secondary" noWrap display="block" title={f.tribunal || ""}>
												{f.tribunal || ""}
											</Typography>
										</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>{f.notificadoEl ? fmtFecha(f.notificadoEl, true) : "—"}</TableCell>
										<TableCell sx={{ whiteSpace: "nowrap" }}>
											{f.expediente ? `${f.expediente.numero}/${f.expediente.anio || "?"}` : "—"}
										</TableCell>
										<TableCell>
											<Stack direction="row" spacing={0.5}>
												<Chip size="small" color={STATUS_COLOR[it.status]} label={STATUS_LABEL[it.status] || it.status} />
												{f.camposFaltantes && f.camposFaltantes.length > 0 && (
													<Tooltip title={`Faltan: ${f.camposFaltantes.join(", ")}`}>
														<Chip size="small" color="warning" variant="outlined" label="!" />
													</Tooltip>
												)}
												{it.aliasDe && <Chip size="small" variant="outlined" label="dup" />}
											</Stack>
										</TableCell>
										<TableCell>
											{r?.movementId ? (
												<Chip
													size="small"
													color="success"
													variant="outlined"
													icon={<Link21 size={12} />}
													label={r.metodo === "fecha" ? "por fecha" : `${Math.round(r.cobertura * 100)}%`}
												/>
											) : f.resolucionEnAdjunto ? (
												<Typography variant="caption" color="text.secondary">
													en copia
												</Typography>
											) : (
												"—"
											)}
										</TableCell>
										<TableCell align="right">
											{it.paginas ?? "—"}
											{it.clase && it.clase !== "digital" && (
												<Typography variant="caption" color="text.secondary" display="block">
													{it.clase}
												</Typography>
											)}
										</TableCell>
									</TableRow>
								);
							})}
							{!cargando && items.length === 0 && (
								<TableRow>
									<TableCell colSpan={8}>
										<Stack alignItems="center" spacing={0.5} sx={{ py: 3 }}>
											<DocumentText size={28} />
											<Typography variant="body2" color="text.secondary">
												No hay documentos procesados con esos filtros.
											</Typography>
										</Stack>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
					<Divider />
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={limit}
						onRowsPerPageChange={(ev) => {
							setLimit(parseInt(ev.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[25, 50, 100]}
						labelRowsPerPage="Por página"
					/>
				</TableContainer>
				<Button
					size="small"
					variant="text"
					sx={{ alignSelf: "flex-start" }}
					onClick={() => setFiltros({ etapa: "cedulas", status: "", clase: "", familia: "", vinculo: "", fuero: "", q: "", causaId: "" })}
				>
					Limpiar filtros
				</Button>
			</Stack>
			<DetalleDialog id={abierto} onClose={() => setAbierto(null)} />
		</Box>
	);
};

export default ExtraccionTab;
