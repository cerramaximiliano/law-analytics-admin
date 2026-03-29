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
	Tab,
	Tabs,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentText, Refresh, TickCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import SentenciasService, { SentenciaCapturada, SentenciasStats, SentenciaTipo, Fuero } from "api/sentenciasCapturadas";

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
interface SentenciaRowProps { doc: SentenciaCapturada; onDetail: (doc: SentenciaCapturada) => void; onRetry?: (id: string) => void; }
function SentenciaRow({ doc, onDetail, onRetry }: SentenciaRowProps) {
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
				</Stack>
				<Typography variant="caption" color="text.secondary" noWrap display="block">
					{doc.caratula || "Sin carátula"} · {fmtDate(doc.processedAt || doc.detectedAt)}
				</Typography>
				{doc.processingResult && (
					<Typography variant="caption" color="text.disabled">
						{fmtNum(doc.processingResult.charCount)} chars · {doc.processingResult.pageCount} pág · {doc.processingResult.method}
						{doc.processingResult.isScanned ? " · 🖨 escaneado" : ""}
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
					<Tooltip title="Reintentar">
						<IconButton size="small" color="warning" onClick={() => onRetry(doc._id)}><Refresh size={16} /></IconButton>
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
						{data.processingError && (
							<Alert severity="error"><strong>Error:</strong> {data.processingError}</Alert>
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

// ── Root component ────────────────────────────────────────────────────────────

const SECTIONS = ["Estado", "Lista"];

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

	return (
		<Box>
			<Tabs value={section} onChange={(_, v) => setSection(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				{SECTIONS.map((s, i) => <Tab key={i} label={s} />)}
			</Tabs>
			<TabPanel value={section} index={0}>
				<EstadoSection stats={stats} loading={loading} onRefresh={loadStats} onRetry={handleRetry} />
			</TabPanel>
			<TabPanel value={section} index={1}>
				<ListaSection />
			</TabPanel>
		</Box>
	);
}
