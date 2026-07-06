import { useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Collapse,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	Grid,
	IconButton,
	InputAdornment,
	LinearProgress,
	MenuItem,
	Pagination,
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
import {
	Activity,
	ArrowDown2,
	CloseCircle,
	Data,
	DocumentText,
	InfoCircle,
	Refresh,
	Scanner,
	SearchNormal1,
	Setting3,
	TickCircle,
	Warning2,
	Notification,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import SentenciasService, {
	Category,
	EmbeddingStatus,
	NoveltyCheckStatus,
	OcrStatus,
	SentenciaCapturada,
	SentenciasStats,
	SentenciaTipo,
	Fuero,
} from "api/sentenciasCapturadas";
import CollectorService, { CollectorConfig, FueroConfig } from "api/sentenciasCollector";
import SemanticWorkerService, { SemanticWorkerConfig } from "api/semanticWorker";
import RagWorkersService, { PineconeStats, SentenciasWorkerConfig } from "api/ragWorkers";
import WorkerControlPanel from "components/WorkerControlPanel";
import CronSelector from "components/admin/CronSelector";
import PublicacionesSection from "./PublicacionesSection";

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

function timeAgo(d?: string): string {
	if (!d) return "—";
	const diffMs = Date.now() - new Date(d).getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return "hace un momento";
	if (diffMin < 60) return `hace ${diffMin} min`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `hace ${diffH}h`;
	const diffD = Math.floor(diffH / 24);
	return `hace ${diffD}d`;
}

function fmtNum(n?: number) {
	if (n == null) return "—";
	return n.toLocaleString("es-AR");
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps {
	label: string;
	value: number | string;
	color?: string;
	sub?: string;
}
function StatCard({ label, value, color, sub }: StatCardProps) {
	const theme = useTheme();
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				textAlign: "center",
				borderColor: color ? alpha(color, 0.4) : undefined,
				bgcolor: color ? alpha(color, 0.04) : undefined,
			}}
		>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>
				{value}
			</Typography>
			<Typography variant="body2" color="text.secondary" mt={0.5}>
				{label}
			</Typography>
			{sub && (
				<Typography variant="caption" color="text.disabled">
					{sub}
				</Typography>
			)}
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
					<Chip
						label={TIPO_LABELS[doc.sentenciaTipo]}
						size="small"
						sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: 11 }}
					/>
					<Chip
						label={doc.processingStatus}
						size="small"
						color={STATUS_COLOR[doc.processingStatus] || "default"}
						variant="outlined"
						sx={{ fontSize: 11 }}
					/>
					{doc.category && (
						<Chip
							label={CATEGORY_LABEL[doc.category]}
							size="small"
							sx={{
								bgcolor: alpha(CATEGORY_COLOR[doc.category], 0.12),
								color: CATEGORY_COLOR[doc.category],
								fontWeight: 600,
								fontSize: 10,
							}}
						/>
					)}
					{doc.ocrStatus && doc.ocrStatus !== "not_needed" && (
						<Chip
							label={`OCR: ${OCR_STATUS_LABEL[doc.ocrStatus]}`}
							size="small"
							color={OCR_STATUS_COLOR[doc.ocrStatus]}
							sx={{ fontSize: 11 }}
						/>
					)}
				</Stack>
				<Typography variant="caption" color="text.secondary" noWrap display="block">
					{doc.caratula || "Sin carátula"} ·{" "}
					<Tooltip title={fmtDate(doc.processedAt || doc.detectedAt)}>
						<span>{timeAgo(doc.processedAt || doc.detectedAt)}</span>
					</Tooltip>
				</Typography>
				<Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace", fontSize: 10 }} display="block">
					{doc._id}
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
					<Typography variant="caption" color="error.main" noWrap display="block">
						{doc.processingError}
					</Typography>
				)}
			</Box>
			<Stack direction="row" spacing={0.5} flexShrink={0}>
				<Tooltip title="Ver detalle">
					<IconButton size="small" onClick={() => onDetail(doc)}>
						<DocumentText size={16} />
					</IconButton>
				</Tooltip>
				{onRetry && doc.processingStatus === "error" && (
					<Tooltip title="Reintentar desde PDF">
						<IconButton size="small" color="warning" onClick={() => onRetry(doc._id)}>
							<Refresh size={16} />
						</IconButton>
					</Tooltip>
				)}
				{onRetryOcr && doc.ocrStatus === "error" && (
					<Tooltip title="Reintentar OCR">
						<IconButton size="small" color="info" onClick={() => onRetryOcr(doc._id)}>
							<Scanner size={16} />
						</IconButton>
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
					{data && (
						<Chip
							label={TIPO_LABELS[data.sentenciaTipo]}
							size="small"
							sx={{ ml: 1, bgcolor: alpha(TIPO_COLORS[data.sentenciaTipo], 0.12), color: TIPO_COLORS[data.sentenciaTipo], fontWeight: 600 }}
						/>
					)}
				</Box>
				<IconButton onClick={onClose} size="small">
					<CloseCircle size={20} />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				{loading && <CircularProgress size={24} />}
				{data && (
					<Stack spacing={2}>
						<Box>
							<Typography variant="caption" color="text.secondary">
								Carátula
							</Typography>
							<Typography variant="body2">{data.caratula || "—"}</Typography>
						</Box>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Tipo
								</Typography>
								<Typography variant="body2">{data.movimientoTipo || "—"}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Detectado
								</Typography>
								<Typography variant="body2">{fmtDate(data.detectedAt)}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Procesado
								</Typography>
								<Typography variant="body2">{fmtDate(data.processedAt)}</Typography>
							</Grid>
							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="text.secondary">
									Status
								</Typography>
								<Chip label={data.processingStatus} size="small" color={STATUS_COLOR[data.processingStatus] || "default"} />
							</Grid>
						</Grid>
						{data.processingResult && (
							<>
								<Divider />
								<Grid container spacing={2}>
									<Grid item xs={4}>
										<StatCard label="Páginas" value={data.processingResult.pageCount || 0} />
									</Grid>
									<Grid item xs={4}>
										<StatCard label="Caracteres" value={fmtNum(data.processingResult.charCount)} />
									</Grid>
									<Grid item xs={4}>
										<StatCard label="Tamaño PDF" value={`${Math.round((data.processingResult.pdfSizeBytes || 0) / 1024)} KB`} />
									</Grid>
								</Grid>
								{data.processingResult.text && (
									<Box>
										<Typography variant="caption" color="text.secondary" mb={0.5} display="block">
											Texto extraído
										</Typography>
										<Box
											sx={(theme) => ({
												bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.grey[900], 0.5) : "grey.50",
												color: "text.primary",
												borderRadius: 1,
												p: 1.5,
												maxHeight: 300,
												overflow: "auto",
												fontFamily: "monospace",
												fontSize: 12,
												whiteSpace: "pre-wrap",
												border: "1px solid",
												borderColor: "divider",
											})}
										>
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
									<Box
										sx={(theme) => ({
											bgcolor: theme.palette.mode === "dark" ? alpha(theme.palette.grey[900], 0.5) : "grey.50",
											color: "text.primary",
											borderRadius: 1,
											p: 1.5,
											maxHeight: 200,
											overflow: "auto",
											fontFamily: "monospace",
											fontSize: 12,
											whiteSpace: "pre-wrap",
											border: "1px solid",
											borderColor: "info.light",
										})}
									>
										{data.ocrResult.text}
									</Box>
								</Box>
							</>
						)}

						{data.processingError && (
							<Alert severity="error">
								<strong>Error:</strong> {data.processingError}
							</Alert>
						)}
						{data.ocrResult?.error && (
							<Alert severity="warning">
								<strong>Error OCR:</strong> {data.ocrResult.error}
							</Alert>
						)}

						{/* Historial de transiciones */}
						{data.processingHistory && data.processingHistory.length > 0 && (
							<>
								<Divider />
								<Box>
									<Typography variant="subtitle2" mb={1}>
										Historial de procesamiento
									</Typography>
									<Stack spacing={0.5}>
										{data.processingHistory.map((entry, idx) => (
											<Stack
												key={idx}
												direction="row"
												spacing={1.5}
												alignItems="flex-start"
												sx={{ py: 0.5, px: 1, bgcolor: "action.hover", borderRadius: 1 }}
											>
												<Chip
													label={entry.status}
													size="small"
													color={STATUS_COLOR[entry.status] || "default"}
													sx={{ fontSize: 10, minWidth: 80 }}
												/>
												<Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
													{fmtDate(entry.at)}
												</Typography>
												{entry.method && (
													<Typography variant="caption" color="text.disabled" sx={{ fontFamily: "monospace" }}>
														{entry.method}
													</Typography>
												)}
												{entry.notes && (
													<Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
														{entry.notes}
													</Typography>
												)}
											</Stack>
										))}
									</Stack>
								</Box>
							</>
						)}

						<Box>
							<Typography variant="caption" color="text.secondary">
								URL Viewer
							</Typography>
							<Typography variant="body2" sx={{ wordBreak: "break-all", fontSize: 11 }}>
								{data.url}
							</Typography>
						</Box>
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ── Main tab sections ─────────────────────────────────────────────────────────

interface TabPanelProps {
	children: React.ReactNode;
	value: number;
	index: number;
}
function TabPanel({ children, value, index }: TabPanelProps) {
	return (
		<Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
			{value === index && children}
		</Box>
	);
}

// ── Estado Section ────────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<Category, string> = { novelty: "#7b1fa2", rutina: "#1565c0" };
const CATEGORY_LABEL: Record<Category, string> = { novelty: "Novelty", rutina: "Rutina" };

function EstadoSection({
	stats,
	loading,
	onRefresh,
	onRetry,
}: {
	stats: SentenciasStats | null;
	loading: boolean;
	onRefresh: () => void;
	onRetry: (id: string) => void;
}) {
	const theme = useTheme();
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleDetail = (doc: SentenciaCapturada) => {
		setSelectedDoc(doc);
		setDialogOpen(true);
	};

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
				<Grid container spacing={2}>
					{[...Array(6)].map((_, i) => (
						<Grid item xs={6} sm={4} md={2} key={i}>
							<Skeleton height={80} variant="rounded" />
						</Grid>
					))}
				</Grid>
			) : stats ? (
				<>
					{/* Totales */}
					<Grid container spacing={2}>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Total" value={stats.totals.total} />
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Procesadas" value={stats.totals.processed} color={theme.palette.success.main} />
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Pendientes" value={stats.totals.pending} color={theme.palette.text.secondary} />
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Procesando" value={stats.totals.processing} color={theme.palette.info.main} />
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Necesita OCR" value={stats.totals.needsOcr} color={theme.palette.warning.main} />
						</Grid>
						<Grid item xs={6} sm={4} md={2}>
							<StatCard label="Errores" value={stats.totals.error} color={theme.palette.error.main} />
						</Grid>
					</Grid>

					{/* Barra de progreso */}
					<Box>
						<Stack direction="row" justifyContent="space-between" mb={0.5}>
							<Typography variant="body2" color="text.secondary">
								Progreso total
							</Typography>
							<Typography variant="body2" fontWeight={600}>
								{pct}%
							</Typography>
						</Stack>
						<LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} color="success" />
					</Box>

					{/* Por fuero */}
					<Box>
						<Typography variant="subtitle2" mb={1}>
							Por fuero
						</Typography>
						<Grid container spacing={1.5}>
							{stats.byFuero.map((f) => (
								<Grid item xs={6} sm={3} key={f._id}>
									<Paper variant="outlined" sx={{ p: 1.5 }}>
										<Typography variant="body2" fontWeight={700}>
											{FUERO_LABELS[f._id] || f._id}
										</Typography>
										<Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
											<Typography variant="caption" color="success.main">
												{f.processed} proc.
											</Typography>
											<Typography variant="caption" color="text.secondary">
												{f.pending} pend.
											</Typography>
											{f.error > 0 && (
												<Typography variant="caption" color="error.main">
													{f.error} err.
												</Typography>
											)}
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
							<Typography variant="subtitle2" mb={1}>
								Por tipo de sentencia (procesadas)
							</Typography>
							<Stack spacing={1}>
								{stats.byTipo.map((t) => {
									const color = TIPO_COLORS[t._id] || "#616161";
									return (
										<Stack key={t._id} direction="row" alignItems="center" spacing={1.5}>
											<Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
											<Typography variant="body2" width={160} flexShrink={0}>
												{TIPO_LABELS[t._id] || t._id}
											</Typography>
											<LinearProgress
												variant="determinate"
												value={stats.totals.processed > 0 ? (t.count / stats.totals.processed) * 100 : 0}
												sx={{ flex: 1, height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { bgcolor: color } }}
											/>
											<Typography variant="body2" width={28} textAlign="right" fontWeight={600}>
												{t.count}
											</Typography>
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

					{/* Por categoría */}
					{stats.byCategory && stats.byCategory.length > 0 && (
						<Box>
							<Typography variant="subtitle2" mb={1}>
								Por categoría
							</Typography>
							<Grid container spacing={2}>
								{(["novelty", "rutina"] as Category[]).map((cat) => {
									const entry = stats.byCategory.find((c) => c._id === cat);
									const color = CATEGORY_COLOR[cat];
									return (
										<Grid item xs={12} sm={6} key={cat}>
											<Paper variant="outlined" sx={{ p: 2, borderColor: alpha(color, 0.4), bgcolor: alpha(color, 0.04) }}>
												<Stack direction="row" alignItems="center" spacing={1} mb={1}>
													<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
													<Typography variant="body2" fontWeight={700} color={color}>
														{CATEGORY_LABEL[cat]}
													</Typography>
												</Stack>
												<Grid container spacing={1}>
													<Grid item xs={4}>
														<Typography variant="caption" color="text.secondary" display="block">
															Total
														</Typography>
														<Typography variant="body2" fontWeight={600}>
															{(entry?.total || 0).toLocaleString("es-AR")}
														</Typography>
													</Grid>
													<Grid item xs={4}>
														<Typography variant="caption" color="text.secondary" display="block">
															Procesadas
														</Typography>
														<Typography variant="body2" fontWeight={600} color="success.main">
															{(entry?.processed || 0).toLocaleString("es-AR")}
														</Typography>
													</Grid>
													<Grid item xs={4}>
														<Typography variant="caption" color="text.secondary" display="block">
															Pendientes
														</Typography>
														<Typography variant="body2" fontWeight={600}>
															{(entry?.pending || 0).toLocaleString("es-AR")}
														</Typography>
													</Grid>
												</Grid>
											</Paper>
										</Grid>
									);
								})}
							</Grid>
						</Box>
					)}

					{/* Últimas novelty procesadas */}
					{stats.noveltyRecientes && stats.noveltyRecientes.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: CATEGORY_COLOR.novelty }} />
								<Typography variant="subtitle2" color={CATEGORY_COLOR.novelty}>
									Últimas Novelty (newsletter)
								</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1, borderColor: alpha(CATEGORY_COLOR.novelty, 0.3) }}>
								{stats.noveltyRecientes.map((doc, i) => (
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
								<Typography variant="subtitle2" color="error">
									Errores
								</Typography>
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
function OcrSection({
	stats,
	loading,
	onRefresh,
	onRetryOcr,
}: {
	stats: SentenciasStats | null;
	loading: boolean;
	onRefresh: () => void;
	onRetryOcr: (id: string) => void;
}) {
	const theme = useTheme();
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const handleDetail = (doc: SentenciaCapturada) => {
		setSelectedDoc(doc);
		setDialogOpen(true);
	};
	const ocr = stats?.ocr;

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Pipeline OCR — PDFs Escaneados</Typography>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={onRefresh} disabled={loading}>
					Actualizar
				</Button>
			</Stack>

			{loading && !stats ? (
				<Grid container spacing={2}>
					{[...Array(4)].map((_, i) => (
						<Grid item xs={6} sm={3} key={i}>
							<Skeleton height={80} variant="rounded" />
						</Grid>
					))}
				</Grid>
			) : ocr ? (
				<>
					{/* Stats por estado OCR */}
					<Grid container spacing={2}>
						{(["pending", "processing", "completed", "error"] as OcrStatus[]).map((st) => {
							const entry = ocr.byStatus.find((b) => b._id === st);
							return (
								<Grid item xs={6} sm={3} key={st}>
									<StatCard
										label={OCR_STATUS_LABEL[st]}
										value={entry?.count || 0}
										color={(() => {
											const c = OCR_STATUS_COLOR[st];
											return c !== "default" ? theme.palette[c]?.main : undefined;
										})()}
										sub={entry?.avgMs ? `~${(entry.avgMs / 1000).toFixed(0)}s prom.` : undefined}
									/>
								</Grid>
							);
						})}
					</Grid>

					{/* Información sobre dependencias requeridas */}
					{stats && stats.totals.needsOcr === 0 && !ocr.byStatus.length && (
						<Alert severity="info" icon={<Scanner size={20} />}>
							No hay documentos escaneados detectados aún. El worker OCR procesará automáticamente los PDFs que no puedan ser extraídos por
							texto (PDFs escaneados o imágenes).
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
					{ocr.byStatus.find((b) => b._id === "error")?.count ? (
						<Alert severity="warning" icon={<Warning2 size={20} />}>
							Hay documentos con errores en OCR. Usa el botón <Scanner size={14} style={{ verticalAlign: "middle" }} /> en la lista para
							reintentarlos.
						</Alert>
					) : null}

					{/* Nota de instalación */}
					<Paper
						variant="outlined"
						sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}
					>
						<Typography variant="subtitle2" gutterBottom>
							Configuración requerida en el servidor
						</Typography>
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

// ── Embeddings Section ────────────────────────────────────────────────────────

const EMBEDDING_STATUS_LABEL: Record<EmbeddingStatus, string> = {
	pending: "Pendiente",
	processing: "Procesando",
	completed: "Indexado",
	error: "Error",
	skipped: "Omitido",
};
const EMBEDDING_STATUS_COLOR: Record<EmbeddingStatus, "success" | "warning" | "error" | "default" | "info"> = {
	pending: "warning",
	processing: "info",
	completed: "success",
	error: "error",
	skipped: "default",
};

const NOVELTY_CHECK_LABEL: Record<NoveltyCheckStatus, string> = {
	single: "Verificación simple",
	double: "Doble verificación",
	rejected: "Rechazada (formulaica)",
	pending_semantic: "Pendiente semántica",
};
const NOVELTY_CHECK_COLOR: Record<NoveltyCheckStatus, "success" | "warning" | "error" | "default" | "info"> = {
	single: "info",
	double: "success",
	rejected: "error",
	pending_semantic: "warning",
};

function NoveltySection({ stats, loading, onRefresh }: { stats: SentenciasStats | null; loading: boolean; onRefresh: () => void }) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [config, setConfig] = useState<SemanticWorkerConfig | null>(null);
	const [configLoading, setConfigLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [draft, setDraft] = useState<Partial<SemanticWorkerConfig>>({});

	const nc = stats?.noveltyCheck;
	const byCategory = stats?.byCategory ?? [];

	const noveltyTotal = byCategory.find((b) => b._id === "novelty")?.total ?? 0;
	const single = nc?.byStatus.find((b) => b._id === "single")?.count ?? 0;
	const doublev = nc?.byStatus.find((b) => b._id === "double")?.count ?? 0;
	const rejected = nc?.byStatus.find((b) => b._id === "rejected")?.count ?? 0;
	const pendingSemantic = nc?.byStatus.find((b) => b._id === "pending_semantic")?.count ?? 0;
	const unverified = nc?.byStatus.find((b) => b._id === null)?.count ?? 0;

	const corpusCompleted = stats?.embeddings.byStatus.find((b) => b._id === "completed")?.count ?? 0;
	const minCorpus = config?.minCorpusSize ?? 5000;
	const layer2Enabled = config?.enabled ?? true;
	const layer2Active = layer2Enabled && corpusCompleted >= minCorpus;
	const layer2Pct = Math.min(100, Math.round((corpusCompleted / minCorpus) * 100));

	const layer1Verified = single + doublev + rejected + pendingSemantic;
	const layer2Verified = doublev + rejected;
	const layer1Pct = noveltyTotal > 0 ? Math.round((layer1Verified / noveltyTotal) * 100) : 0;

	const loadConfig = async () => {
		setConfigLoading(true);
		try {
			const c = await SemanticWorkerService.getConfig();
			setConfig(c);
			setDraft(c);
		} catch {
			enqueueSnackbar("Error cargando configuración", { variant: "error" });
		} finally {
			setConfigLoading(false);
		}
	};

	useEffect(() => {
		loadConfig();
	}, []);

	const handleSave = async () => {
		setSaving(true);
		try {
			const updated = await SemanticWorkerService.updateConfig({
				enabled: draft.enabled,
				minCorpusSize: draft.minCorpusSize,
				similarityThreshold: draft.similarityThreshold,
				filterByFuero: draft.filterByFuero,
				filterBySentenciaTipo: draft.filterBySentenciaTipo,
				topK: draft.topK,
				batchSize: draft.batchSize,
				searchQueryPlanner: draft.searchQueryPlanner,
				searchLexicalLayer: draft.searchLexicalLayer,
			});
			setConfig(updated);
			setDraft(updated);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch {
			enqueueSnackbar("Error guardando configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const isDirty =
		config &&
		(draft.enabled !== config.enabled ||
			draft.minCorpusSize !== config.minCorpusSize ||
			draft.similarityThreshold !== config.similarityThreshold ||
			draft.filterByFuero !== config.filterByFuero ||
			draft.filterBySentenciaTipo !== config.filterBySentenciaTipo ||
			draft.topK !== config.topK ||
			draft.batchSize !== config.batchSize ||
			(draft.searchQueryPlanner?.enabled ?? false) !== (config.searchQueryPlanner?.enabled ?? false) ||
			(draft.searchLexicalLayer?.enabled ?? false) !== (config.searchLexicalLayer?.enabled ?? false));

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Stack direction="row" spacing={1.5} alignItems="center">
					<Typography variant="h6">Verificación de Novedad</Typography>
					<Chip
						label={
							!layer2Enabled
								? "Layer 2 deshabilitado"
								: layer2Active
								? "Layer 2 activo"
								: `Layer 2: ${corpusCompleted.toLocaleString("es-AR")}/${minCorpus.toLocaleString("es-AR")}`
						}
						size="small"
						color={!layer2Enabled ? "error" : layer2Active ? "success" : "default"}
						variant={layer2Active ? "filled" : "outlined"}
					/>
				</Stack>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={onRefresh} disabled={loading}>
					Actualizar
				</Button>
			</Stack>

			{loading && !stats ? (
				<Grid container spacing={2}>
					{[...Array(4)].map((_, i) => (
						<Grid item xs={6} sm={3} key={i}>
							<Skeleton height={80} variant="rounded" />
						</Grid>
					))}
				</Grid>
			) : nc ? (
				<>
					{/* Cards por estado */}
					<Grid container spacing={2}>
						{(["single", "double", "rejected", "pending_semantic"] as NoveltyCheckStatus[]).map((st) => {
							const entry = nc.byStatus.find((b) => b._id === st);
							const color = NOVELTY_CHECK_COLOR[st];
							return (
								<Grid item xs={6} sm={3} key={st}>
									<StatCard
										label={NOVELTY_CHECK_LABEL[st]}
										value={entry?.count ?? 0}
										color={color !== "default" ? theme.palette[color]?.main : undefined}
									/>
								</Grid>
							);
						})}
					</Grid>

					{/* Sin verificar */}
					{unverified > 0 && (
						<Paper
							variant="outlined"
							sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.04), borderColor: alpha(theme.palette.warning.main, 0.2) }}
						>
							<Stack direction="row" spacing={1} alignItems="center">
								<Warning2 size={16} color={theme.palette.warning.main} />
								<Typography variant="body2">
									<strong>{unverified.toLocaleString("es-AR")}</strong> sentencias novelty sin verificación asignada (pendientes de
									embedding).
								</Typography>
							</Stack>
						</Paper>
					)}

					{/* Progreso layer 1 */}
					{noveltyTotal > 0 && (
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={0.5}>
								<Typography variant="body2" color="text.secondary">
									Layer 1 — {layer1Verified.toLocaleString("es-AR")} de {noveltyTotal.toLocaleString("es-AR")} novelties verificadas
									estructuralmente
								</Typography>
								<Typography variant="body2" fontWeight={700} color={theme.palette.info.main}>
									{layer1Pct}%
								</Typography>
							</Stack>
							<LinearProgress variant="determinate" value={layer1Pct} sx={{ height: 6, borderRadius: 4 }} color="info" />
						</Box>
					)}

					{/* Progreso layer 2 */}
					<Box>
						<Stack direction="row" justifyContent="space-between" mb={0.5}>
							<Typography variant="body2" color="text.secondary">
								{!layer2Enabled
									? "Layer 2 — deshabilitado manualmente"
									: layer2Active
									? `Layer 2 — ${layer2Verified.toLocaleString("es-AR")} verificadas semánticamente (${single.toLocaleString(
											"es-AR",
									  )} pendientes)`
									: `Layer 2 — corpus: ${corpusCompleted.toLocaleString("es-AR")} / ${minCorpus.toLocaleString(
											"es-AR",
									  )} sentencias embebidas`}
							</Typography>
							<Typography
								variant="body2"
								fontWeight={700}
								color={!layer2Enabled ? theme.palette.error.main : layer2Active ? theme.palette.success.main : theme.palette.text.secondary}
							>
								{!layer2Enabled ? "off" : layer2Active ? "activo" : `${layer2Pct}%`}
							</Typography>
						</Stack>
						<LinearProgress
							variant="determinate"
							value={!layer2Enabled ? 0 : layer2Active ? 100 : layer2Pct}
							sx={{ height: 6, borderRadius: 4 }}
							color={!layer2Enabled ? "error" : layer2Active ? "success" : "inherit"}
						/>
					</Box>

					{/* Configuración del worker */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
							<Typography variant="subtitle2">Configuración — sentencias-semantic-worker</Typography>
							{configLoading && <CircularProgress size={14} />}
						</Stack>

						{config ? (
							<Stack spacing={2}>
								{/* Habilitado */}
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Box>
										<Typography variant="body2" fontWeight={600}>
											Layer 2 habilitado
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Desactivar detiene completamente la verificación semántica
										</Typography>
									</Box>
									<Switch
										checked={draft.enabled ?? true}
										onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
										disabled={saving}
									/>
								</Stack>

								<Divider />

								{/* Parámetros numéricos */}
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<TextField
											label="Corpus mínimo (sentencias embebidas)"
											type="number"
											size="small"
											fullWidth
											value={draft.minCorpusSize ?? 5000}
											onChange={(e) => setDraft((d) => ({ ...d, minCorpusSize: parseInt(e.target.value) || 1 }))}
											disabled={saving}
											inputProps={{ min: 1 }}
											helperText="El layer 2 no procesa hasta alcanzar este umbral"
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField
											label="Umbral de similitud"
											type="number"
											size="small"
											fullWidth
											value={draft.similarityThreshold ?? 0.88}
											onChange={(e) => setDraft((d) => ({ ...d, similarityThreshold: parseFloat(e.target.value) || 0 }))}
											disabled={saving}
											inputProps={{ min: 0, max: 1, step: 0.01 }}
											helperText="Score ≥ umbral → rechazada · Score < umbral → doble verificada"
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField
											label="Top K (resultados Pinecone)"
											type="number"
											size="small"
											fullWidth
											value={draft.topK ?? 10}
											onChange={(e) => setDraft((d) => ({ ...d, topK: parseInt(e.target.value) || 1 }))}
											disabled={saving}
											inputProps={{ min: 1, max: 100 }}
											helperText="Cantidad de matches a recuperar por consulta"
										/>
									</Grid>
									<Grid item xs={12} sm={6}>
										<TextField
											label="Batch size (docs por ciclo)"
											type="number"
											size="small"
											fullWidth
											value={draft.batchSize ?? 10}
											onChange={(e) => setDraft((d) => ({ ...d, batchSize: parseInt(e.target.value) || 1 }))}
											disabled={saving}
											inputProps={{ min: 1, max: 100 }}
										/>
									</Grid>
								</Grid>

								{/* Filtros */}
								<Stack direction="row" spacing={3}>
									<Stack direction="row" alignItems="center" spacing={1}>
										<Switch
											checked={draft.filterByFuero ?? true}
											onChange={(e) => setDraft((d) => ({ ...d, filterByFuero: e.target.checked }))}
											disabled={saving}
											size="small"
										/>
										<Box>
											<Typography variant="body2">Filtrar por fuero</Typography>
											<Typography variant="caption" color="text.secondary">
												Compara solo contra sentencias del mismo fuero
											</Typography>
										</Box>
									</Stack>
									<Stack direction="row" alignItems="center" spacing={1}>
										<Switch
											checked={draft.filterBySentenciaTipo ?? true}
											onChange={(e) => setDraft((d) => ({ ...d, filterBySentenciaTipo: e.target.checked }))}
											disabled={saving}
											size="small"
										/>
										<Box>
											<Typography variant="body2">Filtrar por tipo</Typography>
											<Typography variant="caption" color="text.secondary">
												Compara solo contra el mismo sentenciaTipo
											</Typography>
										</Box>
									</Stack>
								</Stack>

								{/* Query planner de búsqueda (experimental) */}
								<Stack direction="row" alignItems="center" spacing={1}>
									<Switch
										checked={draft.searchQueryPlanner?.enabled ?? false}
										onChange={(e) =>
											setDraft((d) => ({
												...d,
												searchQueryPlanner: { model: d.searchQueryPlanner?.model ?? "gpt-4o-mini", enabled: e.target.checked },
											}))
										}
										disabled={saving}
										size="small"
										color="warning"
									/>
									<Box>
										<Typography variant="body2">Query planner en búsqueda (experimental)</Typography>
										<Typography variant="caption" color="text.secondary">
											POST /sentencias/ask interpreta el prompt del usuario (deriva juzgado/sala/fecha + estrategia) con LLM. ON/OFF para evaluar y desactivar si no rinde.
										</Typography>
									</Box>
								</Stack>

								{/* Capa léxica de citas (experimental) */}
								<Stack direction="row" alignItems="center" spacing={1}>
									<Switch
										checked={draft.searchLexicalLayer?.enabled ?? false}
										onChange={(e) => setDraft((d) => ({ ...d, searchLexicalLayer: { enabled: e.target.checked } }))}
										disabled={saving}
										size="small"
										color="warning"
									/>
									<Box>
										<Typography variant="body2">Capa léxica de citas (experimental)</Typography>
										<Typography variant="caption" color="text.secondary">
											Filtra por citas exactas (art./ley) detectadas en el prompt. Requiere el query planner activo.
										</Typography>
									</Box>
								</Stack>

								{/* Último ciclo */}
								{config.currentState?.lastRunAt && (
									<Typography variant="caption" color="text.secondary">
										Último ciclo: {fmtDate(config.currentState.lastRunAt)} · doubles={config.currentState.lastRunDoubles} · rejected=
										{config.currentState.lastRunRejected}
										{config.currentState.isRunning && " · corriendo ahora"}
									</Typography>
								)}

								{/* Guardar */}
								<Box>
									<Button variant="contained" size="small" onClick={handleSave} disabled={saving || !isDirty}>
										{saving ? "Guardando..." : "Guardar configuración"}
									</Button>
								</Box>
							</Stack>
						) : (
							<Skeleton height={200} variant="rounded" />
						)}
					</Paper>
				</>
			) : (
				<Typography color="text.secondary">Sin datos disponibles</Typography>
			)}
		</Stack>
	);
}

/**
 * Card para configurar el ritmo del sentencias-embeddings-worker.
 * Expone cronPattern / batchSize / embedBatchSize que viven en
 * pipeline-config.sentenciasWorker y se setean vía PATCH /sentencias-worker/config.
 *
 * Misma forma visual que ConfigGeneral del tab Escritos para consistencia UX.
 */
function EmbeddingsConfigCard() {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<SentenciasWorkerConfig | null>(null);
	const [draft, setDraft] = useState<{ cronPattern?: string; batchSize?: number; embedBatchSize?: number }>({});
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);

	const loadCfg = async () => {
		setLoading(true);
		try {
			const cfg = await RagWorkersService.getSentenciasWorkerConfig();
			setConfig(cfg);
			setDraft({ cronPattern: cfg.cronPattern, batchSize: cfg.batchSize, embedBatchSize: cfg.embedBatchSize });
		} catch {
			/* silently */
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCfg();
	}, []);

	const dirty = !!config && (
		draft.cronPattern !== config.cronPattern ||
		draft.batchSize !== config.batchSize ||
		draft.embedBatchSize !== config.embedBatchSize
	);

	const handleSave = async () => {
		setSaving(true);
		try {
			const updated = await RagWorkersService.updateSentenciasWorkerConfig({
				cronPattern: draft.cronPattern,
				batchSize: draft.batchSize,
				embedBatchSize: draft.embedBatchSize,
			});
			setConfig(updated);
			setDraft({ cronPattern: updated.cronPattern, batchSize: updated.batchSize, embedBatchSize: updated.embedBatchSize });
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch {
			enqueueSnackbar("Error guardando configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
			<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
				<Box>
					<Typography variant="subtitle2" fontWeight={600}>
						Configuración del ritmo (sentencias-embeddings-worker)
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Pinecone factura por vector upserted y por match retornado, no por call.
					</Typography>
				</Box>
			</Stack>

			<Alert severity="info" variant="outlined" sx={{ mb: 2, py: 0.5 }}>
				<Typography variant="caption" component="div">
					<strong>Para reducir costos:</strong> espaciar <code>cronPattern</code> o bajar <code>batchSize</code> reduce
					la cantidad de sentencias procesadas/hora → menos vectors upserted → menos $$.
					<br />
					<strong>Para tunning de performance:</strong> <code>embedBatchSize</code> sólo cambia el shape de los calls
					a Pinecone (1×50 vs 5×10) — el total facturado es el mismo.
				</Typography>
			</Alert>

			<Grid container spacing={2}>
				<Grid item xs={12} sm={4}>
					<CronSelector
						label="Cron pattern"
						value={draft.cronPattern ?? ""}
						onChange={(v) => setDraft((d) => ({ ...d, cronPattern: v }))}
						helperText="↓ ritmo = ↓ costo"
					/>
				</Grid>
				<Grid item xs={6} sm={4}>
					<TextField
						label="Batch size (docs por ciclo)"
						type="number"
						size="small"
						fullWidth
						value={draft.batchSize ?? 50}
						onChange={(e) => setDraft((d) => ({ ...d, batchSize: parseInt(e.target.value) || 1 }))}
						disabled={saving || loading}
						inputProps={{ min: 1, max: 500 }}
						helperText="Sentencias por ciclo · ↓ batch = ↓ costo"
					/>
				</Grid>
				<Grid item xs={6} sm={4}>
					<TextField
						label="Embed batch size"
						type="number"
						size="small"
						fullWidth
						value={draft.embedBatchSize ?? 50}
						onChange={(e) => setDraft((d) => ({ ...d, embedBatchSize: parseInt(e.target.value) || 1 }))}
						disabled={saving || loading}
						inputProps={{ min: 1, max: 200 }}
						helperText="Vectors por call · NO afecta costo, sólo throughput"
					/>
				</Grid>
			</Grid>

			<Stack direction="row" justifyContent="flex-end" mt={2} spacing={1}>
				<Button size="small" onClick={loadCfg} disabled={saving || loading} sx={{ textTransform: "none" }}>
					Descartar
				</Button>
				<Button variant="contained" size="small" onClick={handleSave} disabled={!dirty || saving || loading} sx={{ textTransform: "none" }}>
					{saving ? "Guardando..." : "Guardar"}
				</Button>
			</Stack>
		</Paper>
	);
}

function EmbeddingsSection({
	stats,
	loading,
	onRefresh,
	onRetryEmbedding,
}: {
	stats: SentenciasStats | null;
	loading: boolean;
	onRefresh: () => void;
	onRetryEmbedding: (id: string) => void;
}) {
	const theme = useTheme();
	const emb = stats?.embeddings;

	const total = emb?.byStatus.reduce((acc, b) => acc + b.count, 0) ?? 0;
	const completed = emb?.byStatus.find((b) => b._id === "completed")?.count ?? 0;
	const pending = emb?.byStatus.find((b) => b._id === "pending")?.count ?? 0;
	const errors = emb?.byStatus.find((b) => b._id === "error")?.count ?? 0;
	const skipped = emb?.byStatus.find((b) => b._id === "skipped")?.count ?? 0;
	const avgChunks = emb?.byStatus.find((b) => b._id === "completed")?.avgChunks;
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

	return (
		<Stack spacing={3}>
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Pipeline Embeddings — Pinecone</Typography>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={onRefresh} disabled={loading}>
					Actualizar
				</Button>
			</Stack>

			{/* Config del ritmo del worker (cron + batch sizes) */}
			<EmbeddingsConfigCard />

			{loading && !stats ? (
				<Grid container spacing={2}>
					{[...Array(4)].map((_, i) => (
						<Grid item xs={6} sm={3} key={i}>
							<Skeleton height={80} variant="rounded" />
						</Grid>
					))}
				</Grid>
			) : emb ? (
				<>
					{/* Stats cards */}
					<Grid container spacing={2}>
						{(["completed", "pending", "error", "skipped"] as EmbeddingStatus[]).map((st) => {
							const entry = emb.byStatus.find((b) => b._id === st);
							return (
								<Grid item xs={6} sm={3} key={st}>
									<StatCard
										label={EMBEDDING_STATUS_LABEL[st]}
										value={entry?.count ?? 0}
										color={(() => {
											const c = EMBEDDING_STATUS_COLOR[st];
											return c !== "default" ? theme.palette[c]?.main : undefined;
										})()}
										sub={st === "completed" && entry?.avgChunks ? `~${entry.avgChunks.toFixed(1)} chunks prom.` : undefined}
									/>
								</Grid>
							);
						})}
					</Grid>

					{/* Barra de progreso */}
					{total > 0 && (
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={0.5}>
								<Typography variant="body2" color="text.secondary">
									{completed} de {total} indexados en Pinecone
									{avgChunks ? ` · ~${avgChunks.toFixed(1)} chunks/doc` : ""}
								</Typography>
								<Typography variant="body2" fontWeight={700} color={theme.palette.success.main}>
									{pct}%
								</Typography>
							</Stack>
							<LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} color="success" />
						</Box>
					)}

					{/* Info Pinecone */}
					<Paper
						variant="outlined"
						sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), borderColor: alpha(theme.palette.primary.main, 0.2) }}
					>
						<Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
							<Data size={16} color={theme.palette.primary.main} />
							<Typography variant="subtitle2">Pinecone — índice pjn-sentencias-v1</Typography>
						</Stack>
						<Typography variant="body2" color="text.secondary">
							Namespace: <code>sentencias-corpus</code> · Modelo: <code>text-embedding-3-large</code> (3072 dims)
							{pending > 0 && ` · ${pending} docs esperando indexación`}
							{skipped > 0 && ` · ${skipped} omitidos (sin texto)`}
						</Typography>
					</Paper>

					{/* Últimos indexados */}
					{emb.recientes.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<TickCircle size={16} color={theme.palette.success.main} />
								<Typography variant="subtitle2">Últimos indexados en Pinecone</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1 }}>
								{emb.recientes.map((doc, i) => (
									<Box key={doc._id}>
										{i > 0 && <Divider sx={{ my: 0.5 }} />}
										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, py: 0.5 }}>
											<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
												<Typography variant="body2" fontWeight={600}>
													{doc.number}/{doc.year}
												</Typography>
												<Chip label={doc.fuero} size="small" variant="outlined" sx={{ fontSize: 10 }} />
												<Chip
													label={TIPO_LABELS[doc.sentenciaTipo] ?? doc.sentenciaTipo}
													size="small"
													sx={{
														fontSize: 10,
														bgcolor: alpha(TIPO_COLORS[doc.sentenciaTipo] ?? "#616161", 0.1),
														color: TIPO_COLORS[doc.sentenciaTipo] ?? "#616161",
														fontWeight: 600,
													}}
												/>
												{doc.category === "novelty" && <Chip label="Novelty" size="small" color="secondary" sx={{ fontSize: 10 }} />}
											</Stack>
											<Stack direction="row" spacing={1} alignItems="center">
												{doc.embeddingChunksCount != null && (
													<Chip
														label={`${doc.embeddingChunksCount} chunks`}
														size="small"
														color="success"
														variant="outlined"
														sx={{ fontSize: 10 }}
													/>
												)}
												<Typography variant="caption" color="text.disabled" noWrap>
													{fmtDate(doc.embeddedAt)}
												</Typography>
											</Stack>
										</Stack>
										{doc.caratula && (
											<Typography variant="caption" color="text.secondary" sx={{ px: 1, display: "block" }} noWrap>
												{doc.caratula}
											</Typography>
										)}
									</Box>
								))}
							</Paper>
						</Box>
					)}

					{/* Errores de embedding */}
					{emb.errors.length > 0 && (
						<Box>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<Warning2 size={16} color={theme.palette.error.main} />
								<Typography variant="subtitle2" color="error">
									Errores de embedding
								</Typography>
							</Stack>
							<Paper variant="outlined" sx={{ p: 1, borderColor: alpha(theme.palette.error.main, 0.3) }}>
								{emb.errors.map((doc, i) => (
									<Box key={doc._id}>
										{i > 0 && <Divider sx={{ my: 0.5 }} />}
										<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, py: 0.5 }}>
											<Stack>
												<Stack direction="row" spacing={1} alignItems="center">
													<Typography variant="body2" fontWeight={600}>
														{doc.number}/{doc.year}
													</Typography>
													<Chip label={doc.fuero} size="small" variant="outlined" sx={{ fontSize: 10 }} />
												</Stack>
												{doc.embeddingError && (
													<Typography variant="caption" color="error" noWrap sx={{ maxWidth: 400 }}>
														{doc.embeddingError}
													</Typography>
												)}
											</Stack>
											<Tooltip title="Reintentar embedding">
												<IconButton size="small" color="warning" onClick={() => onRetryEmbedding(doc._id)}>
													<Refresh size={14} />
												</IconButton>
											</Tooltip>
										</Stack>
									</Box>
								))}
							</Paper>
						</Box>
					)}

					{errors === 0 && completed > 0 && (
						<Alert severity="success" icon={<TickCircle size={20} />}>
							Pipeline de embeddings funcionando correctamente. {completed} sentencias indexadas en Pinecone.
						</Alert>
					)}
				</>
			) : (
				<Alert severity="info">No hay datos de embeddings disponibles aún.</Alert>
			)}
		</Stack>
	);
}

// ── Lista Section ─────────────────────────────────────────────────────────────
const LISTA_LIMIT = 12;
type SortByOpt = "detectedAt" | "processedAt" | "movimientoFecha" | "embeddedAt" | "publishedAt";

function ListaSection() {
	const [docs, setDocs] = useState<SentenciaCapturada[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [selectedDoc, setSelectedDoc] = useState<SentenciaCapturada | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Filtros
	const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
	const [fueroFilter, setFueroFilter] = useState<Fuero | "all">("all");
	const [tipoFilter, setTipoFilter] = useState<SentenciaTipo | "all">("all");
	const [noveltyFilter, setNoveltyFilter] = useState<NoveltyCheckStatus | "all">("all");
	const [sortBy, setSortBy] = useState<SortByOpt>("detectedAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [searchInput, setSearchInput] = useState("");
	const [search, setSearch] = useState("");

	const load = async (p: number) => {
		setLoading(true);
		try {
			const res = await SentenciasService.findAll({
				page: p,
				limit: LISTA_LIMIT,
				category: categoryFilter === "all" ? undefined : categoryFilter,
				fuero: fueroFilter === "all" ? undefined : fueroFilter,
				tipo: tipoFilter === "all" ? undefined : tipoFilter,
				noveltyStatus: noveltyFilter === "all" ? undefined : noveltyFilter,
				search: search || undefined,
				sortBy,
				sortOrder,
			});
			setDocs(res.data);
			setTotal(res.total);
		} finally {
			setLoading(false);
		}
	};

	// Reset a página 1 al cambiar cualquier filtro/orden
	useEffect(() => {
		setPage(1);
		load(1);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [categoryFilter, fueroFilter, tipoFilter, noveltyFilter, sortBy, sortOrder, search]);

	useEffect(() => {
		load(page);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	const handleDetail = (doc: SentenciaCapturada) => {
		setSelectedDoc(doc);
		setDialogOpen(true);
	};
	const handleSearch = () => setSearch(searchInput.trim());
	const handleResetFilters = () => {
		setCategoryFilter("all");
		setFueroFilter("all");
		setTipoFilter("all");
		setNoveltyFilter("all");
		setSortBy("detectedAt");
		setSortOrder("desc");
		setSearch("");
		setSearchInput("");
	};

	const totalPages = Math.ceil(total / LISTA_LIMIT);
	const activeFiltersCount =
		(categoryFilter !== "all" ? 1 : 0) +
		(fueroFilter !== "all" ? 1 : 0) +
		(tipoFilter !== "all" ? 1 : 0) +
		(noveltyFilter !== "all" ? 1 : 0) +
		(search ? 1 : 0);

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="h6">Sentencias ({fmtNum(total)})</Typography>
					{activeFiltersCount > 0 && (
						<Chip
							label={`${activeFiltersCount} filtro${activeFiltersCount > 1 ? "s" : ""} activo${activeFiltersCount > 1 ? "s" : ""}`}
							size="small"
							color="info"
							variant="outlined"
							onDelete={handleResetFilters}
						/>
					)}
				</Stack>
				<Button startIcon={<Refresh size={16} />} size="small" onClick={() => load(page)} disabled={loading}>
					Actualizar
				</Button>
			</Stack>

			{/* Chips de Category */}
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				{(
					[
						["all", "Todas"],
						["novelty", "Novelty"],
						["rutina", "Rutina"],
					] as [Category | "all", string][]
				).map(([val, label]) => {
					const isActive = categoryFilter === val;
					const chip = (
						<Chip
							key={val}
							label={label}
							size="small"
							onClick={() => setCategoryFilter(val)}
							variant={isActive ? "filled" : "outlined"}
							sx={
								isActive && val !== "all"
									? {
											bgcolor: CATEGORY_COLOR[val as Category],
											color: "white",
											fontWeight: 700,
											"&:hover": { bgcolor: CATEGORY_COLOR[val as Category] },
									  }
									: {}
							}
							color={isActive && val === "all" ? "primary" : "default"}
						/>
					);
					if (val === "novelty") {
						return (
							<Stack direction="row" spacing={0.5} alignItems="center" key={val}>
								{chip}
								<Tooltip
									arrow
									title={
										<Box sx={{ maxWidth: 320 }}>
											<Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: 0.5 }}>
												¿Por qué Novelty y Publicaciones muestran cantidades distintas?
											</Typography>
											<Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
												<strong>Novelty</strong> en esta Lista ={" "}
												<code>category: &apos;novelty&apos;</code> (todas las sentencias detectadas como novedad, en
												cualquier estado del pipeline: pendientes, OCR, error, procesadas...).
											</Typography>
											<Typography variant="caption" sx={{ display: "block" }}>
												<strong>Publicaciones</strong> es un subconjunto: <code>novelty + embeddingStatus: completed + publicationStatus: pending</code>.
												Es decir, solo las que llegaron al final del pipeline y están listas para publicar.
											</Typography>
										</Box>
									}
								>
									<InfoCircle size={14} style={{ opacity: 0.55, cursor: "help" }} />
								</Tooltip>
							</Stack>
						);
					}
					return chip;
				})}
			</Stack>

			{/* Toolbar de filtros */}
			<Paper variant="outlined" sx={{ p: 1.5 }}>
				<Grid container spacing={1.5} alignItems="center">
					<Grid item xs={12} sm={6} md={3}>
						<TextField
							fullWidth
							size="small"
							placeholder="Buscar por carátula o número..."
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSearch()}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchNormal1 size={14} />
									</InputAdornment>
								),
								endAdornment: search && (
									<IconButton size="small" onClick={() => { setSearch(""); setSearchInput(""); }}>
										<CloseCircle size={14} />
									</IconButton>
								),
							}}
						/>
					</Grid>
					<Grid item xs={6} sm={3} md={2}>
						<TextField select fullWidth size="small" label="Fuero" value={fueroFilter} onChange={(e) => setFueroFilter(e.target.value as any)}>
							<MenuItem value="all">Todos</MenuItem>
							{(Object.keys(FUERO_LABELS) as Fuero[]).map((f) => (
								<MenuItem key={f} value={f}>{FUERO_LABELS[f]}</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={6} sm={3} md={2}>
						<TextField select fullWidth size="small" label="Tipo" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value as any)}>
							<MenuItem value="all">Todos</MenuItem>
							{(Object.keys(TIPO_LABELS) as SentenciaTipo[]).map((t) => (
								<MenuItem key={t} value={t}>{TIPO_LABELS[t]}</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={6} sm={3} md={2}>
						<TextField
							select
							fullWidth
							size="small"
							label="Novelty status"
							value={noveltyFilter}
							onChange={(e) => setNoveltyFilter(e.target.value as any)}
						>
							<MenuItem value="all">Todos</MenuItem>
							{(Object.keys(NOVELTY_CHECK_LABEL) as NoveltyCheckStatus[]).map((s) => (
								<MenuItem key={s} value={s}>{NOVELTY_CHECK_LABEL[s]}</MenuItem>
							))}
						</TextField>
					</Grid>
					<Grid item xs={6} sm={3} md={2}>
						<TextField select fullWidth size="small" label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortByOpt)}>
							<MenuItem value="detectedAt">Detección</MenuItem>
							<MenuItem value="processedAt">Procesado</MenuItem>
							<MenuItem value="movimientoFecha">Fecha movimiento</MenuItem>
							<MenuItem value="embeddedAt">Embeddings</MenuItem>
							<MenuItem value="publishedAt">Publicación</MenuItem>
						</TextField>
					</Grid>
					<Grid item xs={6} sm={3} md={1}>
						<TextField
							select
							fullWidth
							size="small"
							label="Orden"
							value={sortOrder}
							onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
						>
							<MenuItem value="desc">↓ Desc</MenuItem>
							<MenuItem value="asc">↑ Asc</MenuItem>
						</TextField>
					</Grid>
				</Grid>
			</Paper>

			{/* Grid de cards */}
			{loading ? (
				<Grid container spacing={2}>
					{[...Array(LISTA_LIMIT)].map((_, i) => (
						<Grid item xs={12} md={6} key={i}>
							<Skeleton height={170} variant="rounded" />
						</Grid>
					))}
				</Grid>
			) : docs.length === 0 ? (
				<Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
					<Typography variant="body2" color="text.secondary">
						No hay sentencias que coincidan con los filtros.
					</Typography>
				</Paper>
			) : (
				<Grid container spacing={2}>
					{docs.map((doc) => (
						<Grid item xs={12} md={6} key={doc._id}>
							<SentenciaCard doc={doc} onDetail={handleDetail} />
						</Grid>
					))}
				</Grid>
			)}

			{totalPages > 1 && (
				<Stack alignItems="center">
					<Pagination
						count={totalPages}
						page={page}
						onChange={(_, p) => setPage(p)}
						size="small"
						color="primary"
						showFirstButton
						showLastButton
					/>
				</Stack>
			)}

			<DetailDialog doc={selectedDoc} open={dialogOpen} onClose={() => setDialogOpen(false)} />
		</Stack>
	);
}

// ── SentenciaCard ─────────────────────────────────────────────────────────────
// Card más rica que SentenciaRow — destaca movimientoFecha, novelty status,
// embeddings y stats. Usada en ListaSection (grid 2 cols desktop).
interface SentenciaCardProps {
	doc: SentenciaCapturada;
	onDetail: (doc: SentenciaCapturada) => void;
}
function SentenciaCard({ doc, onDetail }: SentenciaCardProps) {
	const color = TIPO_COLORS[doc.sentenciaTipo] || "#616161";
	const novelty = doc.noveltyCheck?.status;
	return (
		<Paper
			variant="outlined"
			sx={{
				p: 1.5,
				borderLeft: `4px solid ${color}`,
				borderRadius: 1.5,
				transition: "box-shadow 0.15s",
				"&:hover": { boxShadow: 2, cursor: "pointer" },
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
			onClick={() => onDetail(doc)}
		>
			{/* Header: expediente + tipo + categoría */}
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={1}>
				<Typography variant="body2" fontWeight={700}>
					{doc.number}/{doc.year}
				</Typography>
				<Chip label={doc.fuero} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
				<Chip
					label={TIPO_LABELS[doc.sentenciaTipo]}
					size="small"
					sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: 10, height: 18 }}
				/>
				{doc.category && (
					<Chip
						label={CATEGORY_LABEL[doc.category]}
						size="small"
						sx={{
							bgcolor: alpha(CATEGORY_COLOR[doc.category], 0.12),
							color: CATEGORY_COLOR[doc.category],
							fontWeight: 600,
							fontSize: 10,
							height: 18,
						}}
					/>
				)}
				<Box sx={{ flex: 1 }} />
				<Chip
					label={doc.processingStatus}
					size="small"
					color={STATUS_COLOR[doc.processingStatus] || "default"}
					variant="outlined"
					sx={{ fontSize: 10, height: 18 }}
				/>
			</Stack>

			{/* Carátula */}
			<Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500, lineHeight: 1.35 }}>
				{doc.caratula || (
					<Box component="span" sx={{ fontStyle: "italic", color: "text.disabled" }}>
						Sin carátula
					</Box>
				)}
			</Typography>

			{/* Stats grid: fecha movimiento + tipo movimiento + juzgado */}
			<Grid container spacing={1} sx={{ mt: 0.5, mb: 1 }}>
				<Grid item xs={6}>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
						Fecha movimiento
					</Typography>
					<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
						{doc.movimientoFecha ? fmtDate(doc.movimientoFecha) : "—"}
					</Typography>
				</Grid>
				<Grid item xs={6}>
					<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
						Detectada
					</Typography>
					<Tooltip title={fmtDate(doc.detectedAt)}>
						<Typography variant="caption" sx={{ fontWeight: 600 }}>
							{timeAgo(doc.detectedAt)}
						</Typography>
					</Tooltip>
				</Grid>
				{doc.movimientoTipo && (
					<Grid item xs={6}>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
							Tipo movimiento
						</Typography>
						<Typography variant="caption">{doc.movimientoTipo}</Typography>
					</Grid>
				)}
				{doc.juzgado != null && (
					<Grid item xs={6}>
						<Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
							Juzgado
						</Typography>
						<Typography variant="caption">
							Juzg. {doc.juzgado}
							{doc.secretaria != null ? ` · Sec. ${doc.secretaria}` : ""}
						</Typography>
					</Grid>
				)}
			</Grid>

			{/* Footer: pipeline status (OCR, embeddings, novelty, publicación) */}
			<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: "auto", pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
				{doc.ocrStatus && doc.ocrStatus !== "not_needed" && (
					<Tooltip title={`OCR: ${OCR_STATUS_LABEL[doc.ocrStatus]}`}>
						<Chip
							icon={<Scanner size={12} />}
							label={OCR_STATUS_LABEL[doc.ocrStatus]}
							size="small"
							color={OCR_STATUS_COLOR[doc.ocrStatus]}
							sx={{ height: 18, fontSize: 10 }}
						/>
					</Tooltip>
				)}
				{doc.embeddingStatus && doc.embeddingStatus !== "skipped" && (
					<Tooltip title={`Embeddings: ${doc.embeddingStatus}`}>
						<Chip
							label={`emb: ${doc.embeddingStatus}`}
							size="small"
							color={doc.embeddingStatus === "completed" ? "success" : doc.embeddingStatus === "error" ? "error" : "default"}
							variant="outlined"
							sx={{ height: 18, fontSize: 10 }}
						/>
					</Tooltip>
				)}
				{novelty && (
					<Tooltip title={`Novelty L2: ${NOVELTY_CHECK_LABEL[novelty]}`}>
						<Chip
							label={NOVELTY_CHECK_LABEL[novelty]}
							size="small"
							color={NOVELTY_CHECK_COLOR[novelty]}
							variant="outlined"
							sx={{ height: 18, fontSize: 10 }}
						/>
					</Tooltip>
				)}
				{doc.publicationStatus && doc.publicationStatus !== "pending" && (
					<Chip
						label={`pub: ${doc.publicationStatus}`}
						size="small"
						color={doc.publicationStatus === "published" ? "success" : "default"}
						variant="outlined"
						sx={{ height: 18, fontSize: 10 }}
					/>
				)}
				{doc.processingResult?.charCount && (
					<Tooltip title={`${doc.processingResult.pageCount} pág · ${doc.processingResult.method}`}>
						<Chip
							label={`${fmtNum(doc.processingResult.charCount)} chars`}
							size="small"
							variant="outlined"
							sx={{ height: 18, fontSize: 10 }}
						/>
					</Tooltip>
				)}
				<Box sx={{ flex: 1 }} />
				<Tooltip title="Ver detalle">
					<IconButton size="small" onClick={(e) => { e.stopPropagation(); onDetail(doc); }}>
						<DocumentText size={14} />
					</IconButton>
				</Tooltip>
			</Stack>

			{doc.processingError && (
				<Alert severity="error" sx={{ mt: 0.5, py: 0.25, fontSize: 10, "& .MuiAlert-message": { py: 0 } }}>
					{doc.processingError.slice(0, 100)}
				</Alert>
			)}
		</Paper>
	);
}

// ── AI Summary Config Panel ───────────────────────────────────────────────────

const DEFAULT_PROMPT_PLACEHOLDER = `Eres un asistente jurídico especializado en derecho argentino. Tu tarea es analizar fallos judiciales y producir un resumen estructurado...

(Dejá vacío para usar el prompt por defecto del sistema)`;

interface AiSummaryConfigPanelProps {
	config: CollectorConfig;
	saving: boolean;
	onSave: (payload: Parameters<typeof CollectorService.updateConfig>[0]) => void;
}

function AiSummaryConfigPanel({ config, saving, onSave }: AiSummaryConfigPanelProps) {
	const theme = useTheme();
	const [prompt, setPrompt] = useState(config.aiSummary?.systemPrompt || "");
	const [model, setModel] = useState(config.aiSummary?.model || "gpt-4o-mini");
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setPrompt(config.aiSummary?.systemPrompt || "");
		setModel(config.aiSummary?.model || "gpt-4o-mini");
	}, [config]);

	const handleSave = () => {
		onSave({ aiSummary: { systemPrompt: prompt.trim() || null, model } });
	};

	const handleReset = () => {
		setPrompt("");
		onSave({ aiSummary: { systemPrompt: null, model } });
	};

	const isDirty = prompt !== (config.aiSummary?.systemPrompt || "") || model !== (config.aiSummary?.model || "gpt-4o-mini");

	return (
		<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				onClick={() => setOpen((v) => !v)}
				sx={{ cursor: "pointer" }}
			>
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="subtitle2">Configuración de resumen IA</Typography>
					<Chip
						label={config.aiSummary?.systemPrompt ? "Prompt personalizado" : "Prompt por defecto"}
						size="small"
						color={config.aiSummary?.systemPrompt ? "secondary" : "default"}
						sx={{ height: 18, fontSize: "0.65rem" }}
					/>
					<Chip label={config.aiSummary?.model || "gpt-4o-mini"} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
				</Stack>
				<IconButton size="small">
					{open ? <ArrowDown2 size={16} /> : <ArrowDown2 size={16} style={{ transform: "rotate(-90deg)" }} />}
				</IconButton>
			</Stack>

			<Collapse in={open}>
				<Stack spacing={2} mt={2}>
					<Typography variant="caption" color="text.secondary">
						Este prompt se usa para generar el resumen de cada sentencia en la cola de publicaciones. Si se deja vacío, se usa el prompt por
						defecto del sistema.
					</Typography>

					<TextField select size="small" label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} sx={{ maxWidth: 220 }}>
						{["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"].map((m) => (
							<MenuItem key={m} value={m}>
								{m}
							</MenuItem>
						))}
					</TextField>

					<TextField
						multiline
						fullWidth
						minRows={6}
						maxRows={20}
						label="System prompt"
						placeholder={DEFAULT_PROMPT_PLACEHOLDER}
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						size="small"
						helperText={`${prompt.length} caracteres · Dejá vacío para usar el prompt por defecto`}
						inputProps={{ style: { fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.6 } }}
						sx={{ "& .MuiOutlinedInput-root": { bgcolor: alpha(theme.palette.background.default, 0.5) } }}
					/>

					<Stack direction="row" spacing={1} justifyContent="flex-end">
						{config.aiSummary?.systemPrompt && (
							<Button size="small" color="error" variant="outlined" onClick={handleReset} disabled={saving}>
								Restaurar por defecto
							</Button>
						)}
						<Button size="small" variant="contained" onClick={handleSave} disabled={saving || !isDirty}>
							Guardar
						</Button>
					</Stack>
				</Stack>
			</Collapse>
		</Paper>
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
	const scannedPct = fuero.totalScanned > 0 ? Math.min(100, (fuero.totalScanned / 10000) * 100) : 0;

	return (
		<Paper
			variant="outlined"
			sx={{
				p: 2,
				borderColor: fuero.enabled ? alpha(theme.palette.primary.main, 0.3) : undefined,
				bgcolor: fuero.enabled ? alpha(theme.palette.primary.main, 0.02) : undefined,
			}}
		>
			<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
				{/* Label + toggle */}
				<Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 120 }}>
					<Switch size="small" checked={fuero.enabled} onChange={(e) => onToggle(fuero.fuero, e.target.checked)} disabled={saving} />
					<Typography variant="body2" fontWeight={700}>
						{fuero.fuero}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{label}
					</Typography>
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
						<Typography variant="caption" color="text.secondary" display="block">
							Escaneadas
						</Typography>
						<Typography variant="body2" fontWeight={600}>
							{fuero.totalScanned.toLocaleString("es-AR")}
						</Typography>
					</Box>
					<Box textAlign="center" minWidth={60}>
						<Typography variant="caption" color="text.secondary" display="block">
							Encoladas
						</Typography>
						<Typography variant="body2" fontWeight={600} color="primary.main">
							{fuero.totalEnqueued.toLocaleString("es-AR")}
						</Typography>
					</Box>
					{fuero.completedFullScan && (
						<Chip label="Scan completo" size="small" color="success" variant="outlined" icon={<TickCircle size={12} />} />
					)}
					{fuero.lastScannedId && <Chip label="En progreso" size="small" color="info" variant="outlined" />}
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

	useEffect(() => {
		load();
	}, []);

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

	const handleToggleFuero = (fuero: Fuero, val: boolean) => saveField({ fueros: [{ fuero, enabled: val }] });

	const handleYearChange = (fuero: Fuero, field: "yearFrom" | "yearTo", val: number) => {
		setLocalFueros((prev) => prev.map((f) => (f.fuero === fuero ? { ...f, [field]: val } : f)));
	};

	const handleSaveYears = (fuero: Fuero) => {
		const f = localFueros.find((x) => x.fuero === fuero);
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

	if (loading)
		return (
			<Stack spacing={2}>
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} height={80} variant="rounded" />
				))}
			</Stack>
		);
	if (!config) return <Alert severity="error">No se pudo cargar la configuración.</Alert>;

	const { currentState, stats } = config;

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Sentencias Collector — Corpus Histórico</Typography>
				<Stack direction="row" spacing={1}>
					<Button startIcon={<Refresh size={16} />} size="small" onClick={load} disabled={loading || saving}>
						Actualizar
					</Button>
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
						<Switch checked={config.enabled} onChange={(e) => handleToggleGlobal(e.target.checked)} disabled={saving} />
						<Typography variant="body2" fontWeight={600}>
							Worker {config.enabled ? "habilitado" : "deshabilitado"}
						</Typography>
						{config.enabled ? <Chip label="ON" size="small" color="success" /> : <Chip label="OFF" size="small" color="default" />}
					</Stack>
					<Divider orientation="vertical" flexItem />
					<Box>
						<Typography variant="caption" color="text.secondary">
							Cron
						</Typography>
						<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
							{config.cronPattern}
						</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Batch size
						</Typography>
						<Typography variant="body2">{config.batchSize} causas/ciclo</Typography>
					</Box>
					<Box>
						<Typography variant="caption" color="text.secondary">
							Max pending queue
						</Typography>
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
					<StatCard
						label="Último ciclo — escaneadas"
						value={stats.lastRunScanned}
						sub={stats.lastRunAt ? fmtDate(stats.lastRunAt) : undefined}
					/>
				</Grid>
				<Grid item xs={6} sm={3}>
					<StatCard
						label="Último ciclo — encoladas"
						value={stats.lastRunEnqueued}
						color={stats.lastRunEnqueued > 0 ? theme.palette.success.main : undefined}
					/>
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

			{/* AI Summary config */}
			<AiSummaryConfigPanel config={config} saving={saving} onSave={saveField} />

			{/* Info */}
			<Paper
				variant="outlined"
				sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.2) }}
			>
				<Typography variant="subtitle2" gutterBottom>
					Cómo iniciar el worker en el servidor
				</Typography>
				<Box sx={{ bgcolor: "grey.900", borderRadius: 1, p: 1.5, fontFamily: "monospace", fontSize: 12, color: "grey.100" }}>
					{`cd /var/www/pjn-workers-scraping\npm2 start pm2.collector.config.js\npm2 save`}
				</Box>
				<Typography variant="caption" color="text.secondary" display="block" mt={1}>
					El worker lee causas de MongoDB local (worker_01) y encola sentencias en Atlas con <code>category: 'rutina'</code>. Solo procesa
					causas con movimientos de tipo sentencia no capturadas aún.
				</Typography>
			</Paper>
		</Stack>
	);
}

// ── Root component ────────────────────────────────────────────────────────────

// Tabs agrupados visualmente: 'config' (operativa del pipeline) y 'data' (datos
// que el pipeline genera y publica). El orden importa porque el `value` del Tab
// es su índice — los componentes del switch abajo deben mapear los índices.
type SectionGroup = "config" | "data";
const SECTIONS: { label: string; icon: React.ReactElement; group: SectionGroup }[] = [
	// Grupo configuración / operativa
	{ label: "Estado general", icon: <Activity size={16} />, group: "config" },
	{ label: "Collector", icon: <Setting3 size={16} />, group: "config" },
	{ label: "OCR", icon: <Scanner size={16} />, group: "config" },
	{ label: "Embeddings", icon: <Data size={16} />, group: "config" },
	// Grupo datos / resultados
	{ label: "Lista", icon: <DocumentText size={16} />, group: "data" },
	{ label: "Publicaciones", icon: <Notification size={16} />, group: "data" },
	{ label: "Novedades", icon: <TickCircle size={16} />, group: "data" },
];

export default function SentenciasWorkerTab() {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const { enqueueSnackbar } = useSnackbar();
	const [section, setSection] = useState(0);
	const [stats, setStats] = useState<SentenciasStats | null>(null);
	const [loading, setLoading] = useState(false);

	// ── Worker control state ──────────────────────────────────────────────────
	const [embEnabled, setEmbEnabled] = useState<boolean | null>(null);
	const [collectorEnabled, setCollectorEnabled] = useState<boolean | null>(null);
	const [semanticEnabled, setSemanticEnabled] = useState<boolean | null>(null);
	const [togglingEmb, setTogglingEmb] = useState(false);
	const [togglingCollector, setTogglingCollector] = useState(false);
	// Sub-flags individuales del grupo pipeline (granularidad).
	// Regla efectiva: embEnabled (master) AND pipelineWorkers[name].
	const [pipelineWorkers, setPipelineWorkers] = useState<Record<string, boolean | null>>({
		"sentencias-worker": null,
		"sentencias-worker-2": null,
		"sentencias-embeddings": null,
		"ocr-worker": null,
		"sentencias-retry": null,
	});
	const [togglingPipelineWorker, setTogglingPipelineWorker] = useState<Record<string, boolean>>({});
	// Pinecone usage stats (cargado bajo demanda y refrescable)
	const [pineconeStats, setPineconeStats] = useState<PineconeStats | null>(null);
	const [pineconeStatsLoading, setPineconeStatsLoading] = useState(false);
	const [togglingSemantic, setTogglingSemantic] = useState(false);

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

	const loadControlStates = async () => {
		try {
			const [embCfg, collCfg, semCfg] = await Promise.allSettled([
				RagWorkersService.getSentenciasWorkerConfig(),
				CollectorService.getConfig(),
				SemanticWorkerService.getConfig(),
			]);
			if (embCfg.status === "fulfilled") {
				setEmbEnabled(embCfg.value.enabled);
				const workers: Record<string, boolean> = {};
				for (const [name, cfg] of Object.entries(embCfg.value.workers || {})) {
					workers[name] = (cfg as { enabled: boolean }).enabled;
				}
				setPipelineWorkers((prev) => ({ ...prev, ...workers }));
			}
			if (collCfg.status === "fulfilled") setCollectorEnabled(collCfg.value.enabled);
			if (semCfg.status === "fulfilled") setSemanticEnabled(semCfg.value.enabled);
		} catch {
			/* silently ignore */
		}
	};

	const handleTogglePipelineWorker = async (name: string, val: boolean) => {
		setTogglingPipelineWorker((s) => ({ ...s, [name]: true }));
		try {
			const updated = await RagWorkersService.updateSentenciasWorkerConfig({
				workers: { [name]: { enabled: val } } as never,
			});
			const newWorkers: Record<string, boolean> = {};
			for (const [n, cfg] of Object.entries(updated.workers || {})) {
				newWorkers[n] = (cfg as { enabled: boolean }).enabled;
			}
			setPipelineWorkers((prev) => ({ ...prev, ...newWorkers }));
			enqueueSnackbar(`${name} ${val ? "habilitado" : "deshabilitado"}`, { variant: val ? "success" : "warning" });
		} catch {
			enqueueSnackbar(`Error actualizando ${name}`, { variant: "error" });
		} finally {
			setTogglingPipelineWorker((s) => ({ ...s, [name]: false }));
		}
	};

	const handleToggleEmb = async (val: boolean) => {
		setTogglingEmb(true);
		try {
			const updated = await RagWorkersService.updateSentenciasWorkerConfig({ enabled: val });
			setEmbEnabled(updated.enabled);
			enqueueSnackbar(`PDF · Embeddings ${val ? "habilitados" : "deshabilitados"}`, { variant: val ? "success" : "warning" });
		} catch {
			enqueueSnackbar("Error actualizando", { variant: "error" });
		} finally {
			setTogglingEmb(false);
		}
	};

	const handleToggleCollector = async (val: boolean) => {
		setTogglingCollector(true);
		try {
			const updated = await CollectorService.updateConfig({ enabled: val });
			setCollectorEnabled(updated.enabled);
			enqueueSnackbar(`Collector ${val ? "habilitado" : "deshabilitado"}`, { variant: val ? "success" : "warning" });
		} catch {
			enqueueSnackbar("Error actualizando", { variant: "error" });
		} finally {
			setTogglingCollector(false);
		}
	};

	const handleToggleSemantic = async (val: boolean) => {
		setTogglingSemantic(true);
		try {
			const updated = await SemanticWorkerService.updateConfig({ enabled: val });
			setSemanticEnabled(updated.enabled);
			enqueueSnackbar(`Layer 2 Semántico ${val ? "habilitado" : "deshabilitado"}`, { variant: val ? "success" : "warning" });
		} catch {
			enqueueSnackbar("Error actualizando", { variant: "error" });
		} finally {
			setTogglingSemantic(false);
		}
	};

	const loadPineconeStats = async () => {
		setPineconeStatsLoading(true);
		try {
			setPineconeStats(await RagWorkersService.getSentenciasPineconeStats());
		} catch {
			/* silently ignore */
		} finally {
			setPineconeStatsLoading(false);
		}
	};

	useEffect(() => {
		loadStats();
		loadControlStates();
		loadPineconeStats();
	}, []);

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

	const handleRetryEmbedding = async (id: string) => {
		try {
			await SentenciasService.retryEmbedding(id);
			enqueueSnackbar("Reencolada para embedding", { variant: "success" });
			loadStats();
		} catch {
			enqueueSnackbar("Error al reintentar embedding", { variant: "error" });
		}
	};

	return (
		<Stack spacing={2}>
			{/* ── Worker Control Panel ── */}
			<WorkerControlPanel
				processes={[
					{
						label: "PDF · OCR · Embeddings",
						description: "sentencias-worker · sentencias-embeddings-worker",
						enabled: embEnabled,
						toggling: togglingEmb,
						onToggle: handleToggleEmb,
					},
					{
						label: "Collector",
						description: "sentencias-collector-worker",
						enabled: collectorEnabled,
						toggling: togglingCollector,
						onToggle: handleToggleCollector,
					},
					{
						label: "Layer 2 Semántico",
						description: "sentencias-semantic-worker",
						enabled: semanticEnabled,
						toggling: togglingSemantic,
						onToggle: handleToggleSemantic,
					},
				]}
			/>

			{/* ── Granularidad: sub-flags individuales del grupo "PDF · OCR · Embeddings" ──
			    Cada uno controla un proceso PM2 específico. La regla efectiva es
			    embEnabled (master) AND el sub-flag individual: si el master está OFF,
			    todos los workers quedan OFF aunque su sub-flag esté ON. */}
			<Box>
				<Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, mb: 0.5, display: "block" }}>
					Control individual del grupo PDF · OCR · Embeddings (queda anulado si el master está OFF)
				</Typography>
				<WorkerControlPanel
					processes={[
						{
							label: "sentencias-worker",
							description: "PDF download + extracción",
							enabled: pipelineWorkers["sentencias-worker"] ?? null,
							toggling: togglingPipelineWorker["sentencias-worker"],
							onToggle: (v) => handleTogglePipelineWorker("sentencias-worker", v),
						},
						{
							label: "sentencias-worker-2",
							description: "PDF download + extracción (instancia 2)",
							enabled: pipelineWorkers["sentencias-worker-2"] ?? null,
							toggling: togglingPipelineWorker["sentencias-worker-2"],
							onToggle: (v) => handleTogglePipelineWorker("sentencias-worker-2", v),
						},
						{
							label: "sentencias-embeddings",
							description: "Generación de embeddings + upsert Pinecone",
							enabled: pipelineWorkers["sentencias-embeddings"] ?? null,
							toggling: togglingPipelineWorker["sentencias-embeddings"],
							onToggle: (v) => handleTogglePipelineWorker("sentencias-embeddings", v),
						},
						{
							label: "ocr-worker",
							description: "OCR para PDFs escaneados",
							enabled: pipelineWorkers["ocr-worker"] ?? null,
							toggling: togglingPipelineWorker["ocr-worker"],
							onToggle: (v) => handleTogglePipelineWorker("ocr-worker", v),
						},
						{
							label: "sentencias-retry",
							description: "Reintentos de sentencias fallidas",
							enabled: pipelineWorkers["sentencias-retry"] ?? null,
							toggling: togglingPipelineWorker["sentencias-retry"],
							onToggle: (v) => handleTogglePipelineWorker("sentencias-retry", v),
						},
					]}
				/>
			</Box>

			{/* ── Consumo Pinecone (queries, upserts, vectors, index size) ── */}
			<Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
					<Box>
						<Typography variant="subtitle2" fontWeight={600}>
							Consumo Pinecone
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{pineconeStats?.lastUpdated
								? `Última actualización: ${new Date(pineconeStats.lastUpdated).toLocaleString("es-AR")}`
								: "Sin datos aún"}
						</Typography>
					</Box>
					<Button size="small" onClick={loadPineconeStats} disabled={pineconeStatsLoading} sx={{ textTransform: "none" }}>
						{pineconeStatsLoading ? "Cargando..." : "Refrescar"}
					</Button>
				</Stack>

				{(() => {
					const fmt = (n: number) => n.toLocaleString("es-AR");
					const cells: { label: string; data?: { queries: number; upsertCalls: number; vectorsUpserted: number } }[] = [
						{ label: "All-time", data: pineconeStats?.totals },
						{ label: "Últimas 24h", data: pineconeStats?.last24h },
						{ label: "Últimos 7d", data: pineconeStats?.last7d },
						{ label: "Últimos 30d", data: pineconeStats?.last30d },
					];
					return (
						<Stack
							direction={{ xs: "column", sm: "row" }}
							spacing={1.5}
							divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />}
						>
							{cells.map((c) => (
								<Box key={c.label} flex={1}>
									<Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
										{c.label}
									</Typography>
									<Stack direction="row" spacing={2}>
										<Box>
											<Typography variant="caption" color="text.secondary" display="block">
												Queries
											</Typography>
											<Typography variant="body2" fontWeight={600}>
												{c.data ? fmt(c.data.queries) : "—"}
											</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary" display="block">
												Upserts
											</Typography>
											<Typography variant="body2" fontWeight={600}>
												{c.data ? fmt(c.data.upsertCalls) : "—"}
											</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary" display="block">
												Vectors
											</Typography>
											<Typography variant="body2" fontWeight={600}>
												{c.data ? fmt(c.data.vectorsUpserted) : "—"}
											</Typography>
										</Box>
									</Stack>
								</Box>
							))}
						</Stack>
					);
				})()}

				{pineconeStats?.indexStats && (
					<>
						<Divider sx={{ my: 1.5 }} />
						<Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ sm: "center" }}>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Tamaño índice (records)
								</Typography>
								<Typography variant="body2" fontWeight={600}>
									{pineconeStats.indexStats.totalRecordCount != null
										? pineconeStats.indexStats.totalRecordCount.toLocaleString("es-AR")
										: "—"}
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary" display="block">
									Dimensión
								</Typography>
								<Typography variant="body2" fontWeight={600}>
									{pineconeStats.indexStats.dimension ?? "—"}
								</Typography>
							</Box>
							{pineconeStats.indexStats.indexFullness != null && (
								<Box>
									<Typography variant="caption" color="text.secondary" display="block">
										Fullness
									</Typography>
									<Typography variant="body2" fontWeight={600}>
										{(pineconeStats.indexStats.indexFullness * 100).toFixed(2)}%
									</Typography>
								</Box>
							)}
							{pineconeStats.indexStats.namespaces && Object.keys(pineconeStats.indexStats.namespaces).length > 0 && (
								<Box flex={1} minWidth={0}>
									<Typography variant="caption" color="text.secondary" display="block">
										Namespaces
									</Typography>
									<Typography
										variant="caption"
										sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
									>
										{Object.entries(pineconeStats.indexStats.namespaces)
											.map(([n, v]) => `${n}: ${(v.recordCount ?? v.vectorCount ?? 0).toLocaleString("es-AR")}`)
											.join(" · ")}
									</Typography>
								</Box>
							)}
						</Stack>
					</>
				)}
			</Paper>

			<Stack direction="row" sx={{ minHeight: 500 }}>
				{/* Vertical tabs on left — 2 grupos: config (gestión del pipeline) y data (resultados) */}
				<Box sx={{ borderRight: 1, borderColor: "divider", flexShrink: 0, width: 170 }}>
					{/* Grupo 1: Operativa del pipeline */}
					<Typography
						variant="overline"
						sx={{
							display: "block",
							px: 2,
							pt: 1.5,
							pb: 0.5,
							color: "text.secondary",
							fontSize: "0.65rem",
							fontWeight: 700,
							letterSpacing: "0.08em",
						}}
					>
						Configuración
					</Typography>
					<Box sx={{ bgcolor: alpha(BRAND_BLUE, isDark ? 0.06 : 0.03) }}>
						<Tabs
							orientation="vertical"
							value={SECTIONS[section]?.group === "config" ? section : false}
							onChange={(_, v) => setSection(v)}
							TabIndicatorProps={{ sx: { width: 2.5, bgcolor: BRAND_BLUE } }}
							sx={{
								"& .MuiTab-root": {
									alignItems: "flex-start",
									textAlign: "left",
									minHeight: 44,
									pl: 2,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
									transition: "color 200ms ease, background-color 200ms ease",
									"&.Mui-selected": { color: BRAND_BLUE, fontWeight: 600 },
								},
							}}
						>
							{SECTIONS.map((s, i) =>
								s.group === "config" ? (
									<Tab
										key={i}
										value={i}
										label={
											<Stack direction="row" spacing={1} alignItems="center">
												<Box sx={{ color: theme.palette.primary.main, display: "flex", flexShrink: 0 }}>{s.icon}</Box>
												<span>{s.label}</span>
											</Stack>
										}
									/>
								) : null,
							)}
						</Tabs>
					</Box>

					{/* Divider entre grupos */}
					<Divider sx={{ my: 1 }} />

					{/* Grupo 2: Resultados / datos del pipeline */}
					<Typography
						variant="overline"
						sx={{
							display: "block",
							px: 2,
							pt: 0.5,
							pb: 0.5,
							color: "text.secondary",
							fontSize: "0.65rem",
							fontWeight: 700,
							letterSpacing: "0.08em",
						}}
					>
						Datos
					</Typography>
					<Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.04) }}>
						<Tabs
							orientation="vertical"
							value={SECTIONS[section]?.group === "data" ? section : false}
							onChange={(_, v) => setSection(v)}
							sx={{
								"& .MuiTab-root": {
									alignItems: "flex-start",
									textAlign: "left",
									minHeight: 44,
									pl: 2,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
								},
								"& .MuiTabs-indicator": { bgcolor: theme.palette.success.main },
							}}
						>
							{SECTIONS.map((s, i) =>
								s.group === "data" ? (
									<Tab
										key={i}
										value={i}
										label={
											<Stack direction="row" spacing={1} alignItems="center">
												<Box sx={{ color: theme.palette.success.main, display: "flex", flexShrink: 0 }}>{s.icon}</Box>
												<span>{s.label}</span>
											</Stack>
										}
									/>
								) : null,
							)}
						</Tabs>
					</Box>
				</Box>

				{/* Content on right — orden debe matchear SECTIONS arriba */}
				<Box sx={{ flex: 1, minWidth: 0, pl: 3, pt: 1 }}>
					{/* Grupo CONFIG */}
					<TabPanel value={section} index={0}>
						<EstadoSection stats={stats} loading={loading} onRefresh={loadStats} onRetry={handleRetry} />
					</TabPanel>
					<TabPanel value={section} index={1}>
						<CollectorSection />
					</TabPanel>
					<TabPanel value={section} index={2}>
						<OcrSection stats={stats} loading={loading} onRefresh={loadStats} onRetryOcr={handleRetryOcr} />
					</TabPanel>
					<TabPanel value={section} index={3}>
						<EmbeddingsSection stats={stats} loading={loading} onRefresh={loadStats} onRetryEmbedding={handleRetryEmbedding} />
					</TabPanel>
					{/* Grupo DATA */}
					<TabPanel value={section} index={4}>
						<ListaSection />
					</TabPanel>
					<TabPanel value={section} index={5}>
						<PublicacionesSection />
					</TabPanel>
					<TabPanel value={section} index={6}>
						<NoveltySection stats={stats} loading={loading} onRefresh={loadStats} />
					</TabPanel>
				</Box>
			</Stack>
		</Stack>
	);
}
