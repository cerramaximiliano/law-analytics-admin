import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	LinearProgress,
	Paper,
	Skeleton,
	Stack,
	Switch,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, Refresh, Scanner, TickCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import SentenciasService, { OcrStatus, SentenciaCapturada, SentenciasStats, SentenciaTipo, Fuero } from "api/sentenciasCapturadas";
import CollectorService, { CollectorConfig, FueroConfig } from "api/sentenciasCollector";

// ── Helpers ───────────────────────────────────────────────────────────────────

const FUERO_LABELS: Record<Fuero, string> = { CIV: "Civil", CSS: "Seg. Social", CNT: "Trabajo", COM: "Comercial" };
const TIPO_LABELS: Record<SentenciaTipo, string> = {
	primera_instancia: "Primera Instancia",
	camara: "Cámara",
	interlocutoria: "Interlocutoria",
	honorarios: "Honorarios",
	definitiva: "Definitiva",
	resolucion: "Resolución",
	otro: "Otro",
};
const TIPO_COLORS: Record<SentenciaTipo, string> = {
	primera_instancia: "#1976d2",
	camara: "#7b1fa2",
	interlocutoria: "#0288d1",
	honorarios: "#f57c00",
	definitiva: "#c62828",
	resolucion: "#388e3c",
	otro: "#616161",
};
const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
	processed: "success",
	extracted_needs_ocr: "warning",
	pending: "default",
	processing: "info",
	error: "error",
};
const OCR_STATUS_COLOR: Record<OcrStatus, "success" | "warning" | "error" | "default" | "info"> = {
	not_needed: "default",
	pending: "warning",
	processing: "info",
	completed: "success",
	error: "error",
};
const OCR_STATUS_LABEL: Record<OcrStatus, string> = {
	not_needed: "No necesita",
	pending: "Pendiente",
	processing: "Procesando",
	completed: "Completado",
	error: "Error",
};

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtNum(n?: number) {
	if (n == null) return "—";
	return n.toLocaleString("es-AR");
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: number | string; color?: string; sub?: string; }
function StatCard({ label, value, color, sub }: StatCardProps) {
	const theme = useTheme();
	return (
		<Paper variant="outlined" sx={{ p: 2, textAlign: "center", borderColor: color ? alpha(color, 0.4) : undefined, bgcolor: color ? alpha(color, 0.04) : undefined }}>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>{value}</Typography>
			<Typography variant="body2" color="text.secondary" mt={0.5}>{label}</Typography>
			{sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
		</Paper>
	);
}

// ── SentenciaRow ──────────────────────────────────────────────────────────────
interface SentenciaRowProps {
	doc: SentenciaCapturada;
	onDetail: (doc: SentenciaCapturada) => void;
	onRetry?: (id: string) => void;
	onRetryOcr?: (id: string) => void;
}
function SentenciaRow({ doc, onDetail, onRetry, onRetryOcr }: SentenciaRowProps) {
	const color = TIPO_COLORS[doc.sentenciaTipo] || "#616161";
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, px: 1, borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}>
			<Box sx={{ width: 4, height: 40, borderRadius: 2, bgcolor: color, flexShrink: 0 }} />
			<Box flex={1} minWidth={0}>
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
					<Typography variant="body2" fontWeight={600} noWrap>
						{doc.number}/{doc.year} [{doc.fuero}]
					</Typography>
					<Chip label={TIPO_LABELS[doc.sentenciaTipo]} size="small" sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: 11 }} />
					<Chip label={doc.processingStatus} size="small" color={STATUS_COLOR[doc.processingStatus] || "default"} variant="outlined" sx={{ fontSize: 11 }} />
					{doc.ocrStatus && doc.ocrStatus !== "not_needed" && (
						<Chip label={`OCR: ${OCR_STATUS_LABEL[doc.ocrStatus]}`} size="small" color={OCR_STATUS_COLOR[doc.ocrStatus]} sx={{ fontSize: 11 }} />
					)}
				</Stack>
				<Typography variant="caption" color="text.secondary" noWrap display="block">
					{doc.caratula || "Sin carátula"} · {fmtDate(doc.processedAt || doc.detectedAt)}
				</Typography>
				{doc.processingResult && (
					<Typography variant="caption" color="text.disabled">
						{fmtNum(doc.processingResult.charCount)} chars · {doc.processingResult.pageCount} pág · {doc.processingResult.method}
						{doc.processingResult.isScanned ? " · escaneado" : ""}
					</Typography>
				)}
				{doc.ocrResult?.charCount && (
					<Typography variant="caption" color="text.disabled" display="block">
						OCR: {fmtNum(doc.ocrResult.charCount)} chars · {doc.ocrResult.pageCount} pág · {doc.ocrResult.method}
						{doc.ocrResult.processingTimeMs ? ` · ${(doc.ocrResult.processingTimeMs / 1000).toFixed(1)}s` : ""}
					</Typography>
				)}
				{doc.processingError && (
					<Typography variant="caption" color="error.main" noWrap display="block">{doc.processingError}</Typography>
				)}
			</Box>
			<Stack direction="row" spacing={0.5} flexShrink={0}>
				<Tooltip title="Ver detalle">
					<IconButton size="small" onClick={() => onDetail(doc)}><DocumentText size={16} /></IconButton>
				</Tooltip>
				{onRetry && doc.processingStatus === "error" && (
					<Tooltip title="Reintentar desde PDF">
						<IconButton size="small" color="warning" onClick={() => onRetry(doc._id)}><Refresh size={16} /></IconButton>
					</Tooltip>
				)}
				{onRetryOcr && doc.ocrStatus === "error" && (
					<Tooltip title="Reintentar OCR">
						<IconButton size="small" color="info" onClick={() => onRetryOcr(doc._id)}><Scanner size={16} /></IconButton>
					</Tooltip>
				)}
			</Stack>
		</Box>
	);
}

// ── DetailDialog ──────────────────────────────────────────────────────────────
function DetailDialog({ doc, open, onClose }: { doc: SentenciaCapturada | null; open: boolean; onClose: () => void }) {
	const [full, setFull] = useState<SentenciaCapturada | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !doc) return;
		setFull(null);
		setLoading(true);
		SentenciasService.findById(doc._id)
			.then(setFull)
			.catch(() => setFull(doc))
			.finally(() => setLoading(false));
	}, [open, doc]);

	const data = full || doc;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<Box>
					<Typography variant="h6" component="span">
						{data?.number}/{data?.year} [{data?.fuero}]
					</Typography>
					{data && <Chip label={TIPO_LABELS[data.sentenciaTipo]} size="small" sx={{ ml: 1, bgcolor: alpha(TIPO_COLORS[data.sentenciaTipo], 0.12), color: TIPO_COLORS[data.sentenciaTipo], fontWeight: 600 }} />}
				</Box>
				<IconButton onClick={onClose} size="small"><CloseCircle size={20} /></IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{loading && <CircularProgress size={24} />}
				{data && (
					<Stack spacing={2}>
						<Box>
							<Typography variant="caption" color="text.secondary">Carátula</Typography>
							<Typography variant="body2">{data.caratula || "—"}</Typography>
						</Box>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Tipo</Typography><Typography variant="body2">{data.movimientoTipo || "—"}</Typography></Grid>
							<Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Detectado</Typography><Typography variant="body2">{fmtDate(data.detectedAt)}</Typography></Grid>
							<Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Procesado</Typography><Typography variant="body2">{fmtDate(data.processedAt)}</Typography></Grid>
							<Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Status</Typography><Chip label={data.processingStatus} size="small" color={STATUS_COLOR[data.processingStatus] || "default"} /></Grid>
						</Grid>
						{data.processingResult && (
							<>
								<Divider />
								<Grid container spacing={2}>
									<Grid item xs={4}><StatCard label="Páginas" value={data.processingResult.pageCount || 0} /></Grid>
									<Grid item xs={4}><StatCard label="Caracteres" value={fmtNum(data.processingResult.charCount)} /></Grid>
									<Grid item xs={4}><StatCard label="Tamaño PDF" value={`${Math.round((data.processingResult.pdfSizeBytes || 0) / 1024)} KB`} /></Grid>
								</Grid>
								{data.processingResult.text && (
									<Box>
										<Typography variant="caption" color="text.secondary" mb={0.5} display="block">Texto extraído</Typography>
										<Box sx={{ bgcolor: "grey.50", borderRadius: 1, p: 1.5, maxHeight: 300, overflow: "auto", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid", borderColor: "divider" }}>
											{data.processingResult.text}
										</Box>
									</Box>
								)}
							</>
						)}
						{/* OCR Result */}
						{data.ocrResult?.text && (
							<>
								<Divider />
								<Box>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Scanner size={16} />
										<Typography variant="subtitle2">Texto extraído por OCR</Typography>
										<Chip label={`${fmtNum(data.ocrResult.charCount)} chars`} size="small" color="info" />
										{data.ocrResult.processingTimeMs && (
											<Chip label={`${(data.ocrResult.processingTimeMs / 1000).toFixed(1)}s`} size="small" variant="outlined" />
										)}
									</Stack>
									<Box sx={{ bgcolor: "grey.50", borderRadius: 1, p: 1.5, maxHeight: 200, overflow: "auto", fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", border: "1px solid", borderColor: "info.light" }}>
										{data.ocrResult.text}
									</Box>
								</Box>
							</>
						)}

						{data.processingError && (
							<Alert severity="error"><strong>Error:</strong> {data.processingError}</Alert>
						)}
						{data.ocrResult?.error && (
							<Alert severity="warning"><strong>Error OCR:</strong> {data.ocrResult.error}</Alert>
						)}

						{/* Historial de transiciones */}
						{data.processingHistory && data.processingHistory.length > 0 && (
							<>
								<Divider />
								<Box>
									<Typography variant="subtitle2" mb={1}>Historial de procesamiento</Typography>
									<Stack spacing={0.5}>
										{data.processingHistory.map((entry, idx) => (
											<Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 0.5, px: 1, bgcolor: "action.hover", borderRadius: 1 }}>
												<Chip label={entry.status} size="small" color={STATUS_COLOR[entry.status] || "default"} sx={{ fontSize: 10, minWidth: 80 }} />
												<Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>{fmtDate(entry.at)}</Typography>
												{entry.method && <Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>{entry.method}</Typography>}
												{entry.notes && <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{entry.notes}</Typography>}
											</Stack>
										))}
									</Stack>
								</Box>
							</>
						)}

						<Box>
							<Typography variant="caption" color="text.secondary">URL Viewer</Typography>
							<Typography variant="body2" sx={{ wordBreak: "break-all", fontSize: 11 }}>{data.url}</Typography>
						</Box>
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ── Main tab sections ─────────────────────────────────────────────────────────

interface TabPanelProps { children: React.ReactNode; value: number; index: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
	return <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>{value === index && children}</Box>;
}

// ── Estado Section ────────────────────────────────────────────────────────────
function EstadoSection({ stats, loading, onRefresh, onRetry }: { stats: SentenciasStats | null; loading: boolean; onRefresh: () => void; onRetry: (id: string) => void }) {
	const theme = useTheme();
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleDetail = (doc: SentenciaCapturada) => { setSelectedDoc(doc); setDialogOpen(true); };

	const processed = stats?.totals.processed || 0;
	const total = stats?.totals.total || 0;
	const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Estado del pipeline</Typography>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={onRefresh} disabled={loading}>
					Actualizar
				</Button>
			</Stack>

			{loading && !stats ? (
				<Grid container spacing={2}>{[...Array(6)].map((_, i) => <Grid item xs={6} sm={4} md={2} key={i}><Skeleton height={80} variant="rounded" /></Grid>)}</Grid>
			) : stats ? (
				<>
					{/* Totales */}
					<Grid container spacing={2}>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Total" value={stats.totals.total} /></Grid>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Procesadas" value={stats.totals.processed} color={theme.palette.success.main} /></Grid>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Pendientes" value={stats.totals.pending} color={theme.palette.text.secondary} /></Grid>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Procesando" value={stats.totals.processing} color={theme.palette.info.main} /></Grid>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Necesita OCR" value={stats.totals.needsOcr} color={theme.palette.warning.main} /></Grid>
						<Grid item xs={6} sm={4} md={2}><StatCard label="Errores" value={stats.totals.error} color={theme.palette.error.main} /></Grid>
					</Grid>

					{/* Barra de progreso */}
					<Box>
						<Stack direction="row" justifyContent="space-between" mb={0.5}>
							<Typography variant="body2" color="text.secondary">Progreso total</Typography>
							<Typography variant="body2" fontWeight={600}>{pct}%</Typography>
						</Stack>
						<LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} color="success" />
					</Box>

					{/* Por fuero */}
					<Box>
						<Typography variant="subtitle2" mb={1}>Por fuero</Typography>
						<Grid container spacing={1.5}>
							{stats.byFuero.map(f => (
								<Grid item xs={6} sm={3} key={f._id}>
									<Paper variant="outlined" sx={{ p: 1.5 }}>
										<Typography variant="body2" fontWeight={700}>{FUERO_LABELS[f._id] || f._id}</Typography>
										<Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
											<Typography variant="caption" color="success.main">{f.processed} proc.</Typography>
											<Typography variant="caption" color="text.secondary">{f.pending} pend.</Typography>
											{f.error > 0 && <Typography variant="caption" color="error.main">{f.error} err.</Typography>}
										</Stack>
										<LinearProgress
											variant="determinate"
											value={f.total > 0 ? Math.round((f.processed / f.total) * 100) : 0}
											sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
											color="success"
										/>
									</Paper>
								</Grid>
							))}
						</Grid>
					</Box>

					{/* Por tipo */}
					{stats.byTipo.length > 0 && (
						<Box>
							<Typography variant="subtitle2" mb={1}>Por tipo de sentencia (procesadas)</Typography>
							<Stack spacing={1}>
								{stats.byTipo.map(t => {
									const color = TIPO_COLORS[t._id] || "#616161";
									return (
										<Stack key={t._id} direction="row" alignItems="center" spacing={1.5}>
											<Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
											<Typography variant="body2" width={160} flexShrink={0}>{TIPO_LABELS[t._id] || t._id}</Typography>
											<LinearProgress
												variant="determinate"
												value={stats.totals.processed > 0 ? (t.count / stats.totals.processed) * 100 : 0}
												sx={{ flex: 1, height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { bgcolor: color } }}
											/>
											<Typography variant="body2" width={28} textAlign="right" fontWeight={600}>{t.count}</Typography>
											<Typography variant="caption" color="text.secondary" width={100} textAlign="right">
												~{fmtNum(Math.round(t.avgChars))} chars
											</Typography>
										</Stack>
									);
								})}
							</Stack>
						</Box>
					)}

					{/* Últimas procesadas */}
					{stats.recientes.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<TickCircle size={16} color={theme.palette.success.main} />
								<Typography variant="subtitle2">Últimas procesadas</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1 }}>
								{stats.recientes.map((doc, i) => (
									<Box key={doc._id}>
										{i > 0 && <Divider sx={{ my: 0.5 }} />}
										<SentenciaRow doc={doc} onDetail={handleDetail} />
									</Box>
								))}
							</Paper>
						</Box>
					)}

					{/* Errores */}
					{stats.errores.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<Warning2 size={16} color={theme.palette.error.main} />
								<Typography variant="subtitle2" color="error">Errores</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1, borderColor: alpha(theme.palette.error.main, 0.3) }}>
								{stats.errores.map((doc, i) => (
									<Box key={doc._id}>
										{i > 0 && <Divider sx={{ my: 0.5 }} />}
										<SentenciaRow doc={doc} onDetail={handleDetail} onRetry={onRetry} />
									</Box>
								))}
							</Paper>
						</Box>
					)}
				</>
			) : null}

			<DetailDialog doc={selectedDoc} open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</Stack>
	);
}

// ── OCR Section ───────────────────────────────────────────────────────────────
function OcrSection({ stats, loading, onRefresh, onRetryOcr }: { stats: SentenciasStats | null; loading: boolean; onRefresh: () => void; onRetryOcr: (id: string) => void }) {
	const theme = useTheme();
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleDetail = (doc: SentenciaCapturada) => { setSelectedDoc(doc); setDialogOpen(true); };
	const ocr = stats?.ocr;

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Pipeline OCR — PDFs Escaneados</Typography>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={onRefresh} disabled={loading}>Actualizar</Button>
			</Stack>

			{loading && !stats ? (
				<Grid container spacing={2}>{[...Array(4)].map((_, i) => <Grid item xs={6} sm={3} key={i}><Skeleton height={80} variant="rounded" /></Grid>)}</Grid>
			) : ocr ? (
				<>
					{/* Stats por estado OCR */}
					<Grid container spacing={2}>
						{(["pending", "processing", "completed", "error"] as OcrStatus[]).map(st => {
							const entry = ocr.byStatus.find(b => b._id === st);
							return (
								<Grid item xs={6} sm={3} key={st}>
									<StatCard
										label={OCR_STATUS_LABEL[st]}
										value={entry?.count || 0}
										color={(() => { const c = OCR_STATUS_COLOR[st]; return c !== "default" ? theme.palette[c]?.main : undefined; })()}
										sub={entry?.avgMs ? `~${(entry.avgMs / 1000).toFixed(0)}s prom.` : undefined}
									/>
								</Grid>
							);
						})}
					</Grid>

					{/* Información sobre dependencias requeridas */}
					{stats && stats.totals.needsOcr === 0 && (!ocr.byStatus.length) && (
						<Alert severity="info" icon={<Scanner size={20} />}>
							No hay documentos escaneados detectados aún. El worker OCR procesará automáticamente los PDFs
							que no puedan ser extraídos por texto (PDFs escaneados o imágenes).
							<br />
							<strong>Requisito:</strong> <code>sudo apt-get install -y tesseract-ocr tesseract-ocr-spa poppler-utils</code>
						</Alert>
					)}

					{/* Últimos procesados por OCR */}
					{ocr.recientes.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<TickCircle size={16} color={theme.palette.success.main} />
								<Typography variant="subtitle2">Últimos procesados por OCR</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1 }}>
								{ocr.recientes.map((doc, i) => (
									<Box key={doc._id}>
										{i > 0 && <Divider sx={{ my: 0.5 }} />}
										<SentenciaRow doc={doc} onDetail={handleDetail} />
									</Box>
								))}
							</Paper>
						</Box>
					)}

					{/* Errores de OCR */}
					{ocr.byStatus.find(b => b._id === "error")?.count ? (
						<Alert severity="warning" icon={<Warning2 size={20} />}>
							Hay documentos con errores en OCR. Usa el botón <Scanner size={14} style={{ verticalAlign: "middle" }} /> en la lista para reintentarlos.
						</Alert>
					) : null}

					{/* Nota de instalación */}
					<Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}>
						<Typography variant="subtitle2" gutterBottom>Configuración requerida en el servidor</Typography>
						<Typography variant="body2" color="text.secondary" mb={1}>
							Ejecutar una sola vez en worker_01 para habilitar OCR de PDFs escaneados:
						</Typography>
						<Box sx={{ bgcolor: "grey.900", borderRadius: 1, p: 1.5, fontFamily: "monospace", fontSize: 12, color: "grey.100" }}>
							sudo apt-get install -y tesseract-ocr tesseract-ocr-spa poppler-utils
						</Box>
					</Paper>
				</>
			) : (
				<Alert severity="info">No hay datos de OCR disponibles aún.</Alert>
			)}

			<DetailDialog doc={selectedDoc} open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</Stack>
	);
}

// ── Lista Section ─────────────────────────────────────────────────────────────
function ListaSection() {
	const [docs, setDocs] = useState<SentenciaCapturada[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const load = async (p = page) => {
		setLoading(true);
		try {
			const res = await SentenciasService.findAll({ page: p, limit: 20 });
			setDocs(res.data);
			setTotal(res.total);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, [page]);

	const handleDetail = (doc: SentenciaCapturada) => { setSelectedDoc(doc); setDialogOpen(true); };
	const totalPages = Math.ceil(total / 20);

	return (
		<Stack spacing={2}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Todas las sentencias ({fmtNum(total)})</Typography>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={() => load()} disabled={loading}>Actualizar</Button>
			</Stack>

			{loading ? (
				<Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} height={60} variant="rounded" />)}</Stack>
			) : (
				<Paper variant="outlined" sx={{ p: 1 }}>
					{docs.map((doc, i) => (
						<Box key={doc._id}>
							{i > 0 && <Divider sx={{ my: 0.5 }} />}
							<SentenciaRow doc={doc} onDetail={handleDetail} />
						</Box>
					))}
				</Paper>
			)}

			{totalPages > 1 && (
				<Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
					<Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
					<Typography variant="body2">{page} / {totalPages}</Typography>
					<Button size="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
				</Stack>
			)}

			<DetailDialog doc={selectedDoc} open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</Stack>
	);
}

// ── Collector Section ─────────────────────────────────────────────────────────

const FUERO_COLLECTION_LABELS: Record<string, string> = {
	"causas-civil": "Civil",
	"causas-segsocial": "Seg. Social",
	"causas-trabajo": "Trabajo",
	"causas-comercial": "Comercial",
};

function FueroRow({
	fuero,
	saving,
	onToggle,
	onYearChange,
	onSaveYears,
	onResetCursor,
}: {
	fuero: FueroConfig;
	saving: boolean;
	onToggle: (f: Fuero, val: boolean) => void;
	onYearChange: (f: Fuero, field: "yearFrom" | "yearTo", val: number) => void;
	onSaveYears: (f: Fuero) => void;
	onResetCursor: (f: Fuero) => void;
}) {
	const theme = useTheme();
	const label = FUERO_COLLECTION_LABELS[fuero.collection || ""] || fuero.fuero;
	const scannedPct = fuero.totalScanned > 0 ? Math.min(100, fuero.totalScanned / 10000 * 100) : 0;

	return (
		<Paper
			variant="outlined"
			sx={{ p: 2, borderColor: fuero.enabled ? alpha(theme.palette.primary.main, 0.3) : undefined, bgcolor: fuero.enabled ? alpha(theme.palette.primary.main, 0.02) : undefined }}
		>
			<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
				{/* Label + toggle */}
				<Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 120 }}>
					<Switch
						size="small"
						checked={fuero.enabled}
						onChange={(e) => onToggle(fuero.fuero, e.target.checked)}
						disabled={saving}
					/>
					<Typography variant="body2" fontWeight={700}>{fuero.fuero}</Typography>
					<Typography variant="caption" color="text.secondary">{label}</Typography>
				</Stack>

				{/* Year range */}
				<Stack direction="row" spacing={1} alignItems="center">
					<TextField
						label="Desde"
						type="number"
						size="small"
						value={fuero.yearFrom}
						onChange={(e) => onYearChange(fuero.fuero, "yearFrom", Number(e.target.value))}
						onBlur={() => onSaveYears(fuero.fuero)}
						disabled={saving}
						sx={{ width: 90 }}
						inputProps={{ min: 2010, max: new Date().getFullYear() }}
					/>
					<TextField
						label="Hasta"
						type="number"
						size="small"
						value={fuero.yearTo}
						onChange={(e) => onYearChange(fuero.fuero, "yearTo", Number(e.target.value))}
						onBlur={() => onSaveYears(fuero.fuero)}
						disabled={saving}
						sx={{ width: 90 }}
						inputProps={{ min: 2010, max: new Date().getFullYear() }}
					/>
				</Stack>

				{/* Stats */}
				<Stack direction="row" spacing={2} flex={1} flexWrap="wrap">
					<Box textAlign="center" minWidth={60}>
						<Typography variant="caption" color="text.secondary" display="block">Escaneadas</Typography>
						<Typography variant="body2" fontWeight={600}>{fuero.totalScanned.toLocaleString("es-AR")}</Typography>
					</Box>
					<Box textAlign="center" minWidth={60}>
						<Typography variant="caption" color="text.secondary" display="block">Encoladas</Typography>
						<Typography variant="body2" fontWeight={600} color="primary.main">{fuero.totalEnqueued.toLocaleString("es-AR")}</Typography>
					</Box>
					{fuero.completedFullScan && (
						<Chip label="Scan completo" size="small" color="success" variant="outlined" icon={<TickCircle size={12} />} />
					)}
					{fuero.lastScannedId && (
						<Chip label="En progreso" size="small" color="info" variant="outlined" />
					)}
				</Stack>

				{/* Reset cursor */}
				<Tooltip title={`Reiniciar cursor de ${fuero.fuero} (comenzar scan desde el principio)`}>
					<span>
						<Button
							size="small"
							variant="outlined"
							color="warning"
							disabled={saving || (!fuero.lastScannedId && !fuero.completedFullScan)}
							onClick={() => onResetCursor(fuero.fuero)}
						>
							Reset
						</Button>
					</span>
				</Tooltip>
			</Stack>

			{/* Progress bar */}
			{fuero.totalScanned > 0 && (
				<Box mt={1}>
					<LinearProgress variant="determinate" value={scannedPct} sx={{ height: 3, borderRadius: 2 }} color="primary" />
				</Box>
			)}

			{fuero.lastScanCompletedAt && (
				<Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
					Último scan completado: {fmtDate(fuero.lastScanCompletedAt)}
				</Typography>
			)}
		</Paper>
	);
}

function CollectorSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<CollectorConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	// Local editable state for fueros year ranges
	const [localFueros, setLocalFueros] = useState<FueroConfig[]>([]);

	const load = async () => {
		setLoading(true);
		try {
			const c = await CollectorService.getConfig();
			setConfig(c);
			setLocalFueros(c.fueros);
		} catch {
			enqueueSnackbar("Error cargando configuración del collector", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	const saveField = async (payload: Parameters<typeof CollectorService.updateConfig>[0]) => {
		setSaving(true);
		try {
			const updated = await CollectorService.updateConfig(payload);
			setConfig(updated);
			setLocalFueros(updated.fueros);
			enqueueSnackbar("Guardado", { variant: "success" });
		} catch {
			enqueueSnackbar("Error guardando configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleToggleGlobal = (val: boolean) => saveField({ enabled: val });

	const handleToggleFuero = (fuero: Fuero, val: boolean) =>
		saveField({ fueros: [{ fuero, enabled: val }] });

	const handleYearChange = (fuero: Fuero, field: "yearFrom" | "yearTo", val: number) => {
		setLocalFueros(prev => prev.map(f => f.fuero === fuero ? { ...f, [field]: val } : f));
	};

	const handleSaveYears = (fuero: Fuero) => {
		const f = localFueros.find(x => x.fuero === fuero);
		if (!f) return;
		saveField({ fueros: [{ fuero, yearFrom: f.yearFrom, yearTo: f.yearTo }] });
	};

	const handleResetCursor = async (fuero: Fuero) => {
		setSaving(true);
		try {
			const updated = await CollectorService.resetFueroCursor(fuero);
			setConfig(updated);
			setLocalFueros(updated.fueros);
			enqueueSnackbar(`Cursor de ${fuero} reiniciado`, { variant: "success" });
		} catch {
			enqueueSnackbar("Error reiniciando cursor", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleResetAll = async () => {
		setSaving(true);
		try {
			const updated = await CollectorService.resetAllCursors();
			setConfig(updated);
			setLocalFueros(updated.fueros);
			enqueueSnackbar("Todos los cursores reiniciados", { variant: "success" });
		} catch {
			enqueueSnackbar("Error reiniciando cursores", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	if (loading) return <Stack spacing={2}>{[...Array(3)].map((_, i) => <Skeleton key={i} height={80} variant="rounded" />)}</Stack>;
	if (!config) return <Alert severity="error">No se pudo cargar la configuración.</Alert>;

	const { currentState, stats } = config;

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Sentencias Collector — Corpus Histórico</Typography>
				<Stack direction="row" spacing={1}>
					<Button startIcon={<Refresh size={16} />} size="small" onClick={load} disabled={loading || saving}>Actualizar</Button>
				</Stack>
			</Stack>

			{/* Estado actual */}
			{currentState.isRunning && (
				<Alert severity="info" icon={<CircularProgress size={16} />}>
					Worker corriendo — fuero actual: <strong>{currentState.currentFuero || "—"}</strong>
					{currentState.startedAt && ` · iniciado ${fmtDate(currentState.startedAt)}`}
				</Alert>
			)}

			{/* Control global */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
					<Stack direction="row" alignItems="center" spacing={1}>
						<Switch
							checked={config.enabled}
							onChange={(e) => handleToggleGlobal(e.target.checked)}
							disabled={saving}
						/>
						<Typography variant="body2" fontWeight={600}>
							Worker {config.enabled ? "habilitado" : "deshabilitado"}
						</Typography>
						{config.enabled ? (
							<Chip label="ON" size="small" color="success" />
						) : (
							<Chip label="OFF" size="small" color="default" />
						)}
					</Stack>
					<Divider orientation="vertical" flexItem />
					<Box>
						<Typography variant="caption" color="text.secondary">Cron</Typography>
						<Typography variant="body2" sx={{ fontFamily: "monospace" }}>{config.cronPattern}</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">Batch size</Typography>
						<Typography variant="body2">{config.batchSize} causas/ciclo</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">Max pending queue</Typography>
						<Typography variant="body2">{config.maxPendingQueue} docs</Typography>
					</Box>
				</Stack>
			</Paper>

			{/* Stats globales */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<StatCard label="Total escaneadas" value={stats.totalScannedAllTime.toLocaleString("es-AR")} />
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard label="Total encoladas" value={stats.totalEnqueuedAllTime.toLocaleString("es-AR")} color={theme.palette.primary.main} />
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard label="Último ciclo — escaneadas" value={stats.lastRunScanned} sub={stats.lastRunAt ? fmtDate(stats.lastRunAt) : undefined} />
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard label="Último ciclo — encoladas" value={stats.lastRunEnqueued} color={stats.lastRunEnqueued > 0 ? theme.palette.success.main : undefined} />
				</Grid>
			</Grid>

			{/* Configuración por fuero */}
			<Box>
				<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
					<Typography variant="subtitle2">Configuración por fuero</Typography>
					<Button size="small" variant="outlined" color="warning" onClick={handleResetAll} disabled={saving}>
						Reset todos los cursores
					</Button>
				</Stack>
				<Stack spacing={1.5}>
					{localFueros.map((f) => (
						<FueroRow
							key={f.fuero}
							fuero={f}
							saving={saving}
							onToggle={handleToggleFuero}
							onYearChange={handleYearChange}
							onSaveYears={handleSaveYears}
							onResetCursor={handleResetCursor}
						/>
					))}
				</Stack>
			</Box>

			{/* Info */}
			<Paper variant="outlined" sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}>
				<Typography variant="subtitle2" gutterBottom>Cómo iniciar el worker en el servidor</Typography>
				<Box sx={{ bgcolor: "grey.900", borderRadius: 1, p: 1.5, fontFamily: "monospace", fontSize: 12, color: "grey.100" }}>
					{`cd /var/www/pjn-workers-scraping\npm2 start pm2.collector.config.js\npm2 save`}
				</Box>
				<Typography variant="caption" color="text.secondary" display="block" mt={1}>
					El worker lee causas de MongoDB local (worker_01) y encola sentencias en Atlas con <code>category: 'rutina'</code>.
					Solo procesa causas con movimientos de tipo sentencia no capturadas aún.
				</Typography>
			</Paper>
		</Stack>
	);
}

// ── Root component ────────────────────────────────────────────────────────────

const SECTIONS = ["Estado", "OCR", "Collector", "Lista"];

export default function SentenciasWorkerTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [section, setSection] = useState(0);
	const [stats, setStats] = useState<SentenciasStats | null>(null);
	const [loading, setLoading] = useState(false);

	const loadStats = async () => {
		setLoading(true);
		try {
			setStats(await SentenciasService.getStats());
		} catch {
			enqueueSnackbar("Error cargando estadísticas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { loadStats(); }, []);

	const handleRetry = async (id: string) => {
		try {
			await SentenciasService.retry(id);
			enqueueSnackbar("Reencolada como pending", { variant: "success" });
			loadStats();
		} catch {
			enqueueSnackbar("Error al reintentar", { variant: "error" });
		}
	};

	const handleRetryOcr = async (id: string) => {
		try {
			await SentenciasService.retryOcr(id);
			enqueueSnackbar("Reencolada para OCR", { variant: "success" });
			loadStats();
		} catch {
			enqueueSnackbar("Error al reintentar OCR", { variant: "error" });
		}
	};

	return (
		<Box>
			<Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				{SECTIONS.map((s, i) => <Tab key={i} label={s} />)}
			</Tabs>
			<TabPanel value={section} index={0}>
				<EstadoSection stats={stats} loading={loading} onRefresh={loadStats} onRetry={handleRetry} />
			</TabPanel>
			<TabPanel value={section} index={1}>
				<OcrSection stats={stats} loading={loading} onRefresh={loadStats} onRetryOcr={handleRetryOcr} />
			</TabPanel>
			<TabPanel value={section} index={2}>
				<CollectorSection />
			</TabPanel>
			<TabPanel value={section} index={3}>
				<ListaSection />
			</TabPanel>
		</Box>
	);
}
