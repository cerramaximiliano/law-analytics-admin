// Detalle unificado de una cédula de usuario (base de usuarios, Atlas): todo lo que el
// flujo de plazos automáticos sabe de ESA cédula en un solo lugar — causa y movimiento,
// PDF (de S3, vía pjn-rag-api), texto y ficha de pjn-rag-cedulas, recepción por la bandeja
// del PJN, plazo calculado (con reprocesar), entrega del hub por carpeta y usuario, y el
// correo del movimiento. Se abre por movementId ("causaId:sourceId") o por id del plazo;
// Plazos procesales lo monta con ?cedula= / ?plazo= en la URL, así cualquier vista enlaza.

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
	Grid,
	Link,
	Stack,
	ToggleButton,
	ToggleButtonGroup,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	Tabs,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { fijarTipoProceso, getCedulaDetalle, reprocessNotificacion, CedulaDetalle as Detalle, TipoProceso } from "api/plazos";
import RagExtraccionService from "api/ragExtraccion";
import PdfCanvasViewer from "components/PdfCanvasViewer";
import CausaUserViewDialog from "../CausaUserViewDialog";
import { CalendarioChip } from "./plazosCeldas";

const fmtFecha = (v?: string | null) => (v ? new Date(v).toLocaleString("es-AR") : "—");
const fmtDia = (v?: string | null) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");

const COLOR_ESTADO: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
	computed: "success",
	pending: "info",
	processing: "info",
	no_url: "info",
	esperando_documento: "info",
	parsed: "warning",
	extracted: "warning",
	revision_manual: "warning",
	failed: "error",
	not_pdf: "error",
	validada: "success",
	sin_carpeta: "warning",
	rechazada: "error",
	sent: "success",
	pending_mail: "info",
	skipped: "default",
};

const ACCION_LABEL: Record<string, string> = {
	evento: "evento + aviso",
	aviso_otra_parte: "aviso (otra parte)",
	sugerencia_sin_confirmar: "sugerencia sin confirmar",
	omitido_preferencia: "omitido (sin plazos automáticos)",
	omitido_carpeta: "omitido (carpeta)",
	omitido_duplicado: "ya entregado",
};

const TABS = ["resumen", "pdf", "texto", "resolucion", "ficha", "bandeja", "plazo", "entrega", "json"] as const;
type TabId = (typeof TABS)[number];
const TAB_LABEL: Record<TabId, string> = {
	resumen: "Resumen",
	pdf: "PDF",
	texto: "Texto",
	resolucion: "Resolución notificada",
	ficha: "Ficha (RAG)",
	bandeja: "Bandeja",
	plazo: "Plazo",
	entrega: "Entrega y correo",
	json: "JSON",
};

const METODO_VINCULO: Record<string, string> = {
	texto: "por el texto",
	fecha: "por la fecha (única resolución de ese día)",
	adjunto: "por las páginas adjuntas",
};
const FUENTE_TIPO_PROCESO: Record<string, string> = {
	expreso: "lo declara la resolución",
	plazo_demanda: "plazo del traslado de demanda",
	plazo_agravios: "plazo del traslado de agravios",
	objeto: "objeto del juicio",
	objeto_especial: "objeto: proceso especial",
	norma: "norma del fuero (CNT: ley 18.345)",
	operador: "operador",
};

const FUENTE_RESOLUCION: Record<string, string> = {
	transcripcion: "La cédula transcribe la resolución.",
	copia_adjunta: "La resolución va como copia adjunta a la cédula.",
};
const vinculoTexto = (r: { metodo: string | null; cobertura: number | null }) =>
	r.metodo
		? `vinculada ${METODO_VINCULO[r.metodo] || r.metodo}${
				r.metodo === "texto" && r.cobertura != null ? ` (${Math.round(r.cobertura * 100)} % del texto coincide)` : ""
		  }`
		: "vinculada";

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<Stack direction="row" spacing={1} sx={{ py: 0.25 }}>
			<Typography variant="body2" color="text.secondary" sx={{ minWidth: 170, flexShrink: 0 }}>
				{label}
			</Typography>
			<Box sx={{ minWidth: 0, typography: "body2" }}>{children}</Box>
		</Stack>
	);
}

/** Recorrido de la cédula en chips: cada etapa del flujo con su estado. */
function Recorrido({ d }: { d: Detalle }) {
	const c = d.movimiento?.cedula || {};
	const pasos: Array<{ label: string; color: "default" | "success" | "warning" | "error" | "info" }> = [
		{
			label: d.movimiento ? `movimiento · PDF ${d.movimiento.pdfStatus || "—"}` : "sin movimiento espejado",
			color: d.movimiento?.pdfStatus === "downloaded" ? "success" : "default",
		},
		{
			label: c.documento ? "ficha RAG" : d.movimiento?.textoStatus === "extracted" ? "texto RAG" : "sin ficha",
			color: c.documento ? "success" : "default",
		},
		{
			label: d.bandeja.length ? `bandeja · ${d.bandeja.length} credencial(es)` : "no llegó por la bandeja",
			color: d.bandeja.length ? "success" : "default",
		},
		{
			label: d.plazo ? `plazo · ${d.plazo.processingStatus}` : "sin registro de plazo",
			color: d.plazo ? COLOR_ESTADO[d.plazo.processingStatus] || "default" : "default",
		},
		{
			label: `entrega · ${d.entrega.estado || "sin entregar"}`,
			color: d.entrega.estado ? COLOR_ESTADO[d.entrega.estado] || "default" : "default",
		},
		{
			label: d.correos.length ? `correo · ${d.correos.map((x) => x.notificationStatus).join(", ")}` : "sin correo",
			color: d.correos.some((x) => x.notificationStatus === "sent") ? "success" : d.correos.length ? "info" : "default",
		},
	];
	return (
		<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
			{pasos.map((p, i) => (
				<Chip key={i} size="small" variant={p.color === "default" ? "outlined" : "filled"} color={p.color} label={`${i + 1}. ${p.label}`} />
			))}
		</Stack>
	);
}

function PdfTab({ movementId }: { movementId: string }) {
	const [data, setData] = useState<ArrayBuffer | null>(null);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let cancel = false;
		RagExtraccionService.pdf(movementId)
			.then((b) => !cancel && setData(b))
			.catch((e) => !cancel && setError(e?.response?.status === 404 ? "El movimiento no tiene PDF en S3." : "No se pudo bajar el PDF."));
		return () => {
			cancel = true;
		};
	}, [movementId]);
	if (error) return <Alert severity="info">{error}</Alert>;
	if (!data) return <CircularProgress size={22} />;
	return <PdfCanvasViewer data={data} />;
}

const cajaTexto = {
	whiteSpace: "pre-wrap",
	fontSize: 12.5,
	maxHeight: 520,
	overflow: "auto",
	p: 1.5,
	bgcolor: "action.hover",
	borderRadius: 1,
} as const;

/**
 * La resolución que notifica la cédula: la vincula pjn-rag-cedulas (por el texto transcripto o la copia adjunta,
 * por la fecha, o por las páginas adjuntas). Sirve para revisar el plazo: si es sentencia o interlocutoria, si
 * fija su propio plazo, si trae honorarios con plazo de pago.
 */
function ResolucionTab({ d }: { d: Detalle }) {
	const [verPdf, setVerPdf] = useState(false);
	const r = d.resolucion || null;
	const rn = d.resolucionNotificada || null;
	// La transcripción de la cédula, si no hay texto de la resolución vinculada (o no hay vínculo).
	const transcripcion = rn?.fuente === "transcripcion" && rn.texto ? rn.texto : null;
	const adjuntos = (d.adjuntosRemitidos || []).filter((a) => a.movementId !== r?.movementId);
	return (
		<Stack spacing={1.5}>
			{r ? (
				<Box>
					<Fila label="Resolución">{`${r.tipo || "—"} · ${fmtDia(r.fecha)}`}</Fila>
					{r.detalle && <Fila label="Detalle">{r.detalle}</Fila>}
					<Fila label="Vínculo">{vinculoTexto(r)}</Fila>
					<Fila label="Movimiento">
						<Box component="span" sx={{ fontFamily: "monospace", fontSize: 12.5 }}>
							{r.movementId}
						</Box>
					</Fila>
					{rn?.fuente && <Fila label="En la cédula">{FUENTE_RESOLUCION[rn.fuente]}</Fila>}
				</Box>
			) : (
				<Alert severity="info">
					No se encontró la resolución en la causa.{transcripcion ? " Se muestra lo que transcribe la cédula." : ""}
				</Alert>
			)}

			{r?.texto ? (
				<Box>
					<Typography variant="caption" color="text.secondary">
						Texto de la resolución ({r.texto.chars.toLocaleString("es-AR")} caracteres
						{r.texto.chars > r.texto.texto.length ? ", se muestran los primeros 30.000" : ""}).
					</Typography>
					<Box component="pre" sx={cajaTexto}>
						{r.texto.texto}
					</Box>
				</Box>
			) : transcripcion ? (
				<Box>
					<Typography variant="caption" color="text.secondary">
						Transcripción en la cédula ({(rn?.chars || transcripcion.length).toLocaleString("es-AR")} caracteres
						{(rn?.chars || 0) > transcripcion.length ? ", se muestran los primeros 20.000" : ""}).
					</Typography>
					<Box component="pre" sx={cajaTexto}>
						{transcripcion}
					</Box>
				</Box>
			) : (
				r && <Alert severity="info">La resolución todavía no tiene texto extraído.</Alert>
			)}

			{r && (
				<Box>
					<Button size="small" variant="outlined" onClick={() => setVerPdf((v) => !v)}>
						{verPdf ? "Ocultar el PDF de la resolución" : "Ver el PDF de la resolución"}
					</Button>
					{verPdf && (
						<Box sx={{ mt: 1 }}>
							<PdfTab movementId={r.movementId} />
						</Box>
					)}
				</Box>
			)}

			{adjuntos.length > 0 && (
				<Box>
					<Typography variant="subtitle2">Otros adjuntos de la cédula</Typography>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Tipo</TableCell>
								<TableCell>Fecha</TableCell>
								<TableCell>Detalle</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{adjuntos.map((a) => (
								<TableRow key={a.movementId}>
									<TableCell>{a.tipo || "—"}</TableCell>
									<TableCell>{fmtDia(a.fecha)}</TableCell>
									<TableCell>{a.detalle || "—"}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Box>
			)}
		</Stack>
	);
}

export default function CedulaDetalle({
	movementId,
	plazoId,
	open,
	onClose,
}: {
	movementId?: string | null;
	plazoId?: string | null;
	open: boolean;
	onClose: () => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [d, setD] = useState<Detalle | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<TabId>("resumen");
	const [vista, setVista] = useState<{ folderId?: string } | null>(null);

	const cargar = useCallback(async () => {
		if (!movementId && !plazoId) return;
		setError(null);
		try {
			setD(await getCedulaDetalle(movementId ? { movementId } : { plazoId: plazoId as string }));
		} catch (e: any) {
			setError(e?.response?.data?.message || "No se pudo cargar la cédula");
		}
	}, [movementId, plazoId]);

	useEffect(() => {
		if (open) {
			setD(null);
			setTab("resumen");
			cargar();
		}
	}, [open, cargar]);

	const reprocesar = async () => {
		if (!d?.plazo?._id) return;
		try {
			await reprocessNotificacion(d.plazo._id);
			enqueueSnackbar("Vuelve a la cola: plazos-worker-usuarios la recalcula en el próximo ciclo", { variant: "success" });
			cargar();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "No se pudo reprocesar", { variant: "error" });
		}
	};

	const usuario = (id?: string) => {
		const u = d?.usuarios.find((x) => String(x._id) === String(id));
		if (!u) return id ? `${String(id).slice(-6)}` : "—";
		return `${u.email || [u.firstName, u.lastName].filter(Boolean).join(" ") || String(u._id).slice(-6)}${
			u.isTestAccount ? " · prueba" : ""
		}`;
	};
	const carpeta = (id?: string) => d?.folders.find((f) => String(f._id) === String(id))?.folderName || (id ? String(id).slice(-6) : "—");

	const mov = d?.movimiento;
	const c = mov?.cedula || {};
	const p = d?.plazo;
	const titulo = d?.causa ? `${d.causa.fuero || ""} ${d.causa.number}/${d.causa.year} — ${d.causa.caratula || ""}` : "Cédula";

	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
				<DialogTitle sx={{ pb: 1 }}>
					<Typography variant="h5" component="div" sx={{ lineHeight: 1.3 }}>
						{titulo}
					</Typography>
					<Typography variant="caption" color="text.secondary" component="div">
						{mov ? `${mov.tipo || ""} · ${fmtDia(mov.fecha)}` : p ? `${p.movimiento?.tipo || ""} · ${fmtDia(p.movimiento?.fecha)}` : ""}
						{d?.movementId ? ` · ${d.movementId}` : ""}
					</Typography>
				</DialogTitle>
				<DialogContent dividers sx={{ minHeight: 420 }}>
					{error && <Alert severity="error">{error}</Alert>}
					{!d && !error && <CircularProgress size={24} />}
					{d && (
						<Stack spacing={2}>
							<Recorrido d={d} />
							<Tabs
								value={tab}
								onChange={(_, v) => setTab(v)}
								variant="scrollable"
								scrollButtons="auto"
								sx={{ "& .MuiTab-root": { textTransform: "none" } }}
							>
								{TABS.map((t) => (
									<Tab
										key={t}
										value={t}
										label={TAB_LABEL[t]}
										disabled={
											(t === "pdf" && !d.movementId) ||
											(t === "texto" && !d.texto) ||
											(t === "resolucion" && !d.resolucion && !d.resolucionNotificada?.texto)
										}
									/>
								))}
							</Tabs>

							{tab === "resumen" && (
								<Grid container spacing={2}>
									<Grid item xs={12} md={6}>
										<Typography variant="subtitle2" gutterBottom>
											Causa y movimiento
										</Typography>
										<Fila label="Carátula">{d.causa?.caratula || p?.caratula || "—"}</Fila>
										<Fila label="Expediente">{d.causa ? `${d.causa.fuero} ${d.causa.number}/${d.causa.year}` : "—"}</Fila>
										<Fila label="Juzgado">{d.causa?.juzgado || "—"}</Fila>
										<Fila label="Movimiento">{mov?.detalle || p?.movimiento?.detalle || "—"}</Fila>
										<Fila label="Portal PJN">
											{mov?.url ? (
												<a href={mov.url} target="_blank" rel="noreferrer">
													abrir el documento en el PJN
												</a>
											) : (
												"—"
											)}
										</Fila>
										<Fila label="Entró por">{p?.fuente === "bandeja" ? "bandeja del PJN" : p?.source?.worker || "—"}</Fila>
									</Grid>
									<Grid item xs={12} md={6}>
										<Typography variant="subtitle2" gutterBottom>
											Plazo
										</Typography>
										{p?.plazo ? (
											<>
												<Fila label="Vence">
													<b>{fmtDia(p.plazo.vencimiento)}</b>
													{p.plazo.vencimientoConGracia ? ` (cargo: ${fmtDia(p.plazo.vencimientoConGracia)})` : ""}
												</Fila>
												<Fila label="Plazo">{`${p.plazo.plazoDias} días ${p.plazo.tipoPlazo}`}</Fila>
												{p.plazo.norma && (p.plazo.norma as any).tipoProceso && (
													<Fila label="Variante">regla para proceso {(p.plazo.norma as any).tipoProceso}</Fila>
												)}
												{p.plazo.calendario && p.plazo.calendario.estado !== "ok" && (
													<Fila label="Calendario">
														<CalendarioChip calendario={p.plazo.calendario} />
													</Fila>
												)}
												<Fila label="Fundamento">
													{p.plazo.fuente === "texto"
														? "plazo expreso en la cédula"
														: `${p.plazo.norma?.label || ""} — ${p.plazo.norma?.cita || ""}${
																p.plazo.norma?.verificado ? "" : " (regla sin verificar)"
														  }`}
												</Fila>
												<Fila label="Notificada">{`${fmtDia(p.plazo.fechaNotificacion)} (fuente: ${
													p.plazo.fechaNotificacionFuente
												})`}</Fila>
											</>
										) : (
											<Typography variant="body2" color="text.secondary">
												{p
													? `Sin vencimiento todavía (${p.processingStatus}).`
													: "Esta cédula no tiene registro de plazo (fuero sin reglas, fuera de la ventana o anterior a la detección)."}
											</Typography>
										)}
										{(p?.processingStatus === "requiere_tipo_proceso" || d.tipoProceso) && (
											<Box sx={{ mt: 1.5 }}>
												<Typography variant="subtitle2" gutterBottom>
													Tipo de proceso de la causa
												</Typography>
												{p?.processingStatus === "requiere_tipo_proceso" && (
													<Fila label="Estado">
														<Chip size="small" color="warning" label="requiere tipo de proceso: sin vencimiento hasta saberlo" />
													</Fila>
												)}
												{(p?.extraccion as any)?.tipoProceso?.label && (
													<Fila label="Acto">
														{(p?.extraccion as any).tipoProceso.label}
														{(p?.extraccion as any).tipoProceso.snippet ? ` — «${(p?.extraccion as any).tipoProceso.snippet}»` : ""}
													</Fila>
												)}
												{d.tipoProceso ? (
													<>
														<Fila label="Tipo">
															{d.tipoProceso.tipo ? <b>{d.tipoProceso.tipo}</b> : "sin determinar"}
															{d.tipoProceso.fuente ? ` (${FUENTE_TIPO_PROCESO[d.tipoProceso.fuente] || d.tipoProceso.fuente})` : ""}
															{d.tipoProceso.conflicto ? " · evidencias en conflicto" : ""}
														</Fila>
														{!d.tipoProceso.tipo && d.tipoProceso.sugerencia && (
															<Fila label="Sugerencia">
																<Chip size="small" color="info" variant="outlined" label={d.tipoProceso.sugerencia.tipo} />
																{d.tipoProceso.sugerencia.motivo ? ` ${d.tipoProceso.sugerencia.motivo}` : ""} (no vale hasta confirmarla)
															</Fila>
														)}
														{d.tipoProceso.evidencias.map((e, i) => (
															<Fila key={i} label={`Evidencia ${i + 1}`}>
																{e.tipo} · {FUENTE_TIPO_PROCESO[e.fuente] || e.fuente}
																{e.operador ? ` · ${e.operador}` : ""}
																{e.frase ? ` «${e.frase}»` : ""}
																{e.movementId && (
																	<>
																		{" · "}
																		<Link href={`/admin/causas/plazos?base=usuarios&cedula=${encodeURIComponent(e.movementId)}`} underline="hover">
																			ver movimiento
																		</Link>
																	</>
																)}
															</Fila>
														))}
													</>
												) : (
													<Typography variant="body2" color="text.secondary">
														Ninguna resolución declaró el tipo todavía. Podés fijarlo acá abajo.
													</Typography>
												)}
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
													<Typography variant="caption" color="text.secondary">
														Fijar como operador:
													</Typography>
													<ToggleButtonGroup
														size="small"
														exclusive
														value={d.tipoProceso?.fuente === "operador" ? d.tipoProceso.tipo : null}
														onChange={async (_, v: TipoProceso | null) => {
															try {
																const r = await fijarTipoProceso(String(d.plazo?.causaId ?? d.movementId?.split(":")[0]), v);
																enqueueSnackbar(v ? `Tipo fijado: ${v}. ${r.reencoladas} cédula(s) vuelven a calcularse.` : "Se quitó el dato del operador", { variant: "success" });
																cargar();
															} catch (err: any) {
																enqueueSnackbar(err?.response?.data?.message || "No se pudo fijar el tipo", { variant: "error" });
															}
														}}
													>
														<ToggleButton value="ordinario" sx={{ textTransform: "none", py: 0.25 }}>
															Ordinario
														</ToggleButton>
														<ToggleButton value="sumario" sx={{ textTransform: "none", py: 0.25 }}>
															Sumario
														</ToggleButton>
														<ToggleButton value="especial" sx={{ textTransform: "none", py: 0.25 }}>
															Especial
														</ToggleButton>
													</ToggleButtonGroup>
												</Stack>
											</Box>
										)}
										<Divider sx={{ my: 1.5 }} />
										<Typography variant="subtitle2" gutterBottom>
											Carpetas de la causa
										</Typography>
										{d.folders.length === 0 && (
											<Typography variant="body2" color="text.secondary">
												Ningún usuario tiene esta causa.
											</Typography>
										)}
										{d.folders.map((f) => (
											<Stack key={f._id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
												<Typography variant="body2" sx={{ minWidth: 0, flex: 1 }} noWrap>
													{f.folderName || "Carpeta"} · {usuario(f.userId)}
													{f.archived ? " · archivada" : ""}
												</Typography>
												<Button size="small" onClick={() => setVista({ folderId: f._id })}>
													Ver como el usuario
												</Button>
											</Stack>
										))}
									</Grid>
								</Grid>
							)}

							{tab === "pdf" && d.movementId && <PdfTab movementId={d.movementId} />}

							{tab === "texto" && d.texto && (
								<Box>
									<Typography variant="caption" color="text.secondary">
										Texto indexable de pjn-rag-cedulas ({d.texto.chars.toLocaleString("es-AR")} caracteres
										{d.texto.chars > d.texto.texto.length ? ", se muestran los primeros 30.000" : ""}).
									</Typography>
									<Box
										component="pre"
										sx={{
											whiteSpace: "pre-wrap",
											fontSize: 12.5,
											maxHeight: 520,
											overflow: "auto",
											p: 1.5,
											bgcolor: "action.hover",
											borderRadius: 1,
										}}
									>
										{d.texto.texto}
									</Box>
								</Box>
							)}

							{tab === "resolucion" && <ResolucionTab d={d} />}

							{tab === "ficha" &&
								(c.documento ? (
									<Box>
										<Fila label="Número">{c.documento.numero || "—"}</Fila>
										<Fila label="Emisor">{c.documento.emisor || "—"}</Fila>
										<Fila label="Tribunal">{c.documento.tribunal || "—"}</Fila>
										<Fila label="Emitida">{fmtDia(c.documento.fechaEmision)}</Fila>
										<Fila label="Resolución">
											{c.documento.resolucion ? (
												<>
													{`${c.documento.resolucion.tipo || ""} ${fmtDia(c.documento.resolucion.fecha)} · ${vinculoTexto(
														c.documento.resolucion,
													)} · `}
													<Link component="button" variant="body2" onClick={() => setTab("resolucion")}>
														ver la resolución
													</Link>
												</>
											) : (
												"—"
											)}
										</Fila>
										<Fila label="Firmante">
											{c.documento.firmante ? `${c.documento.firmante.nombre || ""} (${c.documento.firmante.cargo || ""})` : "—"}
										</Fila>
										<Typography variant="subtitle2" sx={{ mt: 1.5 }}>
											Destinatarios
										</Typography>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Nombre</TableCell>
													<TableCell>Domicilio</TableCell>
													<TableCell>CUIT</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{(c.documento.destinatarios || []).map((x: any, i: number) => (
													<TableRow key={i}>
														<TableCell>{x.nombre || "—"}</TableCell>
														<TableCell>{x.domicilio || "—"}</TableCell>
														<TableCell sx={{ fontFamily: "monospace" }}>{x.cuit || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
										<Typography variant="caption" color="text.secondary">
											Versión {c.documento.version || "—"} · {fmtFecha(c.documento.at)}
										</Typography>
									</Box>
								) : (
									<Alert severity="info">
										pjn-rag-cedulas todavía no procesó esta cédula (corre en worker_02, backfill y después continuo). El cálculo lee el PDF
										de S3 igual.
									</Alert>
								))}

							{tab === "bandeja" &&
								(d.bandeja.length || c.recepcion ? (
									<Box>
										{c.recepcion && (
											<>
												<Fila label="Fecha exacta">{fmtFecha(c.recepcion.fechaNotificacion)}</Fila>
												<Fila label="Destinatarios">
													{(c.recepcion.destinatarios || []).map((x: any) => `${x.nombre || "—"} (${x.cuit})`).join(" · ") || "—"}
												</Fila>
												<Fila label="Recibida por">{(c.recepcion.userIds || []).map((u: string) => usuario(u)).join(" · ") || "—"}</Fila>
											</>
										)}
										<Table size="small" sx={{ mt: 1 }}>
											<TableHead>
												<TableRow>
													<TableCell>Usuario</TableCell>
													<TableCell>Fecha</TableCell>
													<TableCell>Vínculo</TableCell>
													<TableCell>Correo de cédula</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{d.bandeja.map((b) => (
													<TableRow key={b._id}>
														<TableCell>{usuario(b.userId)}</TableCell>
														<TableCell>{fmtFecha(b.fecha)}</TableCell>
														<TableCell>{b.vinculo?.estado || "—"}</TableCell>
														<TableCell>{b.notified ? `coordinado ${fmtFecha(b.notifiedAt)}` : "pendiente"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</Box>
								) : (
									<Alert severity="info">Esta cédula no llegó por la bandeja del PJN de ningún usuario.</Alert>
								))}

							{tab === "plazo" &&
								(p ? (
									<Box>
										<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
											<Chip size="small" color={COLOR_ESTADO[p.processingStatus] || "default"} label={p.processingStatus} />
											{p.lastError && <Chip size="small" color="error" variant="outlined" label={p.lastError} />}
											<Box sx={{ flex: 1 }} />
											<Button size="small" variant="outlined" onClick={reprocesar}>
												Reprocesar
											</Button>
										</Stack>
										{p.plazo && (
											<>
												<Fila label="Inicio del plazo">{fmtDia(p.plazo.inicioPlazo)}</Fila>
												<Fila label="Perfeccionamiento">{p.plazo.perfeccionamiento || "—"}</Fila>
												<Fila label="Feriados aplicados">{(p.plazo.feriadosAplicados || []).map(fmtDia).join(", ") || "ninguno"}</Fila>
												{p.plazo.norma?.snippet && <Fila label="Fragmento">«{p.plazo.norma.snippet}»</Fila>}
											</>
										)}
										<Fila label="Destinatarios (unidos)">
											{(p.extraccion as any)?.destinatarios?.map((x: any) => `${x.nombre || "—"} (${x.cuit})`).join(" · ") || "—"}
										</Fila>
										<Fila label="PDF leído de">
											{(p.extraccion as any)?.pdfFuente ||
												((p.extraccion as any)?.sinDocumento ? "sin documento (norma sobre el detalle)" : "—")}
										</Fila>
										<Fila label="Detectada">{fmtFecha(p.detectedAt)}</Fila>
									</Box>
								) : (
									<Alert severity="info">Sin registro en plazos-notificaciones.</Alert>
								))}

							{tab === "entrega" && (
								<Box>
									<Typography variant="subtitle2" gutterBottom>
										Lo que decidió el hub, por carpeta
									</Typography>
									{d.entrega.resultados.length === 0 ? (
										<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
											Todavía no se entregó (cálculo pendiente, fuera de alcance, sin usuarios con plazos automáticos o entrega en dry run).
										</Typography>
									) : (
										<Table size="small" sx={{ mb: 2 }}>
											<TableHead>
												<TableRow>
													<TableCell>Carpeta</TableCell>
													<TableCell>Usuario</TableCell>
													<TableCell>Acción</TableCell>
													<TableCell>Confirmado por</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{d.entrega.resultados.map((r, i) => (
													<TableRow key={i}>
														<TableCell>{carpeta(r.folderId)}</TableCell>
														<TableCell>{usuario(r.userId)}</TableCell>
														<TableCell>{ACCION_LABEL[r.accion] || r.accion}</TableCell>
														<TableCell>{r.confirmadoPor || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									)}
									<Fila label="Eventos en el calendario">
										{d.entrega.eventos
											.map(
												(e) =>
													`${usuario(e.userId)} · ${fmtDia(e.start)}${e.archivedAt ? " · archivado por el usuario" : ""}${
														e.googleEventId ? " · en Google" : ""
													}`,
											)
											.join(" | ") || "—"}
									</Fila>
									<Fila label="Avisos en carpetas">
										{d.entrega.avisos
											.map((a) => `${carpeta(a.folderId)} · ${a.code.replace("plazo-", "")}${a.read ? " · leído" : ""}`)
											.join(" | ") || "—"}
									</Fila>
									<Divider sx={{ my: 1.5 }} />
									<Typography variant="subtitle2" gutterBottom>
										Correo del movimiento (JudicialMovement)
									</Typography>
									{d.correos.length === 0 ? (
										<Typography variant="body2" color="text.secondary">
											Sin notificación del movimiento para ningún usuario.
										</Typography>
									) : (
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Usuario</TableCell>
													<TableCell>Estado</TableCell>
													<TableCell>Programado</TableCell>
													<TableCell>Último intento</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{d.correos.map((m) => {
													const ult = m.notifications?.[m.notifications.length - 1];
													return (
														<TableRow key={m._id}>
															<TableCell>{usuario(m.userId)}</TableCell>
															<TableCell>
																<Chip
																	size="small"
																	color={
																		COLOR_ESTADO[m.notificationStatus === "pending" ? "pending_mail" : m.notificationStatus] || "default"
																	}
																	label={m.notificationStatus}
																/>
															</TableCell>
															<TableCell>{fmtFecha(m.notificationSettings?.notifyAt)}</TableCell>
															<TableCell>{ult ? `${ult.type} · ${ult.success ? "ok" : "falló"} · ${fmtFecha(ult.date)}` : "—"}</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									)}
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
										El correo muestra el plazo solo a los usuarios a los que el hub se lo entregó (evento, aviso o sugerencia).
									</Typography>
								</Box>
							)}

							{tab === "json" && (
								<Box
									component="pre"
									sx={{ fontSize: 11.5, maxHeight: 560, overflow: "auto", p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}
								>
									{JSON.stringify({ ...d, texto: d.texto ? { chars: d.texto.chars } : null }, null, 2)}
								</Box>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					{d?.causa && d.coleccion && <Button onClick={() => setVista({})}>Ver la causa como la ven los usuarios</Button>}
					<Box sx={{ flex: 1 }} />
					<Button onClick={onClose}>Cerrar</Button>
				</DialogActions>
			</Dialog>
			{vista && d && (
				<CausaUserViewDialog
					open
					onClose={() => setVista(null)}
					collection={vista.folderId ? null : d.coleccion}
					causaId={vista.folderId ? null : d.causa?._id || null}
					folderId={vista.folderId || null}
				/>
			)}
		</>
	);
}
