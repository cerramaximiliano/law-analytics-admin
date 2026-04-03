import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Stack,
	Chip,
	Card,
	CardContent,
	Grid,
	Button,
	IconButton,
	Tooltip,
	Skeleton,
	Alert,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TablePagination,
	Collapse,
	Tab,
	Tabs,
	CircularProgress,
	alpha,
	useTheme,
	Divider,
} from "@mui/material";
import { Refresh2, ExportSquare, TickCircle, Calendar, Building, Judge, InfoCircle, ArrowUp2, Flash, Clock, DocumentText, ArrowRotateLeft, Archive, ArrowUp3, ArrowDown3, Magicpen, TickSquare } from "iconsax-react";
import { useSnackbar } from "notistack";
import SentenciasService, { AiSummary, SentenciaCapturada, Fuero, SentenciaTipo, PublicationStatus } from "api/sentenciasCapturadas";

const FUERO_LABELS: Record<string, string> = { CIV: "Civil", CSS: "Seg. Social", CNT: "Trabajo", COM: "Comercial" };
const FUERO_COLORS: Record<string, "primary" | "warning" | "error" | "success"> = {
	CIV: "primary", CSS: "warning", CNT: "error", COM: "success",
};

const TIPO_LABELS: Record<string, string> = {
	primera_instancia: "1ª Instancia",
	camara: "Cámara",
	interlocutoria: "Interlocutoria",
	honorarios: "Honorarios",
	definitiva: "Definitiva",
	resolucion: "Resolución",
	otro: "Otro",
};

function formatDate(dateStr?: string): string {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface SkipDialogProps {
	open: boolean;
	doc: SentenciaCapturada | null;
	onConfirm: (notes: string) => void;
	onClose: () => void;
}

function SkipDialog({ open, doc, onConfirm, onClose }: SkipDialogProps) {
	const [notes, setNotes] = useState("");
	useEffect(() => { if (open) setNotes(""); }, [open]);
	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Archivar sentencia</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					{doc?.caratula || `Sentencia ${doc?._id.slice(-6)}`}
				</Typography>
				<TextField
					label="Motivo (opcional)"
					fullWidth
					multiline
					rows={3}
					value={notes}
					onChange={e => setNotes(e.target.value)}
					size="small"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" color="warning" onClick={() => onConfirm(notes)}>
					Archivar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ── Summary Dialog ────────────────────────────────────────────────────────────

interface SummaryDialogProps {
	open: boolean;
	doc: SentenciaCapturada | null;
	onClose: () => void;
	onSaved: (id: string, summary: AiSummary) => void;
}

function SummaryDialog({ open, doc, onClose, onSaved }: SummaryDialogProps) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [content, setContent] = useState("");
	const [generating, setGenerating] = useState(false);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (open && doc) {
			setContent(doc.aiSummary?.content || "");
		}
	}, [open, doc]);

	const handleGenerate = async () => {
		if (!doc) return;
		setGenerating(true);
		try {
			const summary = await SentenciasService.generateSummary(doc._id);
			setContent(summary.content);
			onSaved(doc._id, summary);
			enqueueSnackbar("Resumen generado", { variant: "success", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} catch (e: any) {
			const msg = e?.response?.data?.message || "Error al generar el resumen";
			enqueueSnackbar(msg, { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setGenerating(false);
		}
	};

	const handleSave = async (action: "save" | "approve") => {
		if (!doc) return;
		setSaving(true);
		try {
			const summary = await SentenciasService.saveSummary(doc._id, content, action);
			onSaved(doc._id, summary);
			enqueueSnackbar(action === "approve" ? "Resumen aprobado" : "Borrador guardado", {
				variant: action === "approve" ? "success" : "info",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			if (action === "approve") onClose();
		} catch {
			enqueueSnackbar("Error al guardar", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setSaving(false);
		}
	};

	const isApproved = doc?.aiSummary?.status === "approved";

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h6" component="span">Resumen para publicación</Typography>
						{doc?.aiSummary?.status && (
							<Chip
								label={isApproved ? "Aprobado" : "Borrador"}
								size="small"
								color={isApproved ? "success" : "default"}
								sx={{ ml: 1, height: 20, fontSize: "0.68rem" }}
							/>
						)}
					</Box>
					{doc?.aiSummary?.model && (
						<Typography variant="caption" color="text.disabled">
							{doc.aiSummary.model}
						</Typography>
					)}
				</Stack>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
					{doc?.caratula || `Sentencia ${doc?._id.slice(-6)}`}
				</Typography>
			</DialogTitle>

			<DialogContent dividers>
				<Stack spacing={2}>
					{!content && !generating && (
						<Alert severity="info" sx={{ borderRadius: 1.5 }}>
							No hay resumen generado aún. Hacé click en <strong>Generar con IA</strong> para crear uno automáticamente a partir del texto del fallo.
						</Alert>
					)}

					{generating && (
						<Stack alignItems="center" spacing={1.5} py={3}>
							<CircularProgress size={32} />
							<Typography variant="body2" color="text.secondary">
								Analizando el fallo y generando el resumen…
							</Typography>
						</Stack>
					)}

					{!generating && content && (
						<TextField
							multiline
							fullWidth
							minRows={12}
							maxRows={24}
							value={content}
							onChange={e => setContent(e.target.value)}
							variant="outlined"
							size="small"
							label="Resumen (editable)"
							inputProps={{ style: { fontFamily: "monospace", fontSize: "0.82rem", lineHeight: 1.6 } }}
							sx={{ "& .MuiOutlinedInput-root": { bgcolor: alpha(theme.palette.background.default, 0.5) } }}
						/>
					)}

					{doc?.aiSummary?.generatedAt && (
						<Typography variant="caption" color="text.disabled">
							Generado el {new Date(doc.aiSummary.generatedAt).toLocaleString("es-AR")}
							{doc.aiSummary.approvedAt && ` · Aprobado el ${new Date(doc.aiSummary.approvedAt).toLocaleString("es-AR")}`}
						</Typography>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
				<Button
					variant="outlined"
					startIcon={generating ? <CircularProgress size={14} /> : <Magicpen size={16} />}
					onClick={handleGenerate}
					disabled={generating || saving}
					color="secondary"
				>
					{content ? "Regenerar" : "Generar con IA"}
				</Button>
				<Box flex={1} />
				<Button onClick={onClose} disabled={saving}>Cerrar</Button>
				{content && !isApproved && (
					<Button
						variant="outlined"
						onClick={() => handleSave("save")}
						disabled={saving || generating}
					>
						Guardar borrador
					</Button>
				)}
				{content && (
					<Button
						variant="contained"
						color="success"
						startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <TickSquare size={16} />}
						onClick={() => handleSave("approve")}
						disabled={saving || generating}
					>
						{isApproved ? "Actualizar y aprobar" : "Aprobar"}
					</Button>
				)}
			</DialogActions>
		</Dialog>
	);
}

// ─────────────────────────────────────────────────────────────────────────────

type ViewTab = "pending" | "skipped" | "published";

const TAB_LABELS: Record<ViewTab, string> = {
	pending: "Pendientes",
	skipped: "Archivadas",
	published: "Publicadas",
};

export default function PublicacionesSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [activeTab, setActiveTab] = useState<ViewTab>("pending");
	const [docs, setDocs] = useState<SentenciaCapturada[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [tipoFilter, setTipoFilter] = useState<string>("");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [helpOpen, setHelpOpen] = useState(false);

	const [skipDialog, setSkipDialog] = useState<{ open: boolean; doc: SentenciaCapturada | null }>({ open: false, doc: null });
	const [summaryDialog, setSummaryDialog] = useState<{ open: boolean; doc: SentenciaCapturada | null }>({ open: false, doc: null });

	const load = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		try {
			const res = await SentenciasService.getPublicationQueue({
				publicationStatus: activeTab as PublicationStatus,
				...(fueroFilter ? { fuero: fueroFilter as Fuero } : {}),
				...(tipoFilter ? { tipo: tipoFilter as SentenciaTipo } : {}),
				sortOrder,
				page,
				limit: rowsPerPage,
			});
			setDocs(res.data);
			setTotal(res.total);
		} catch {
			enqueueSnackbar("Error al cargar cola de publicaciones", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			if (showLoading) setLoading(false);
		}
	}, [activeTab, fueroFilter, tipoFilter, sortOrder, page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

	// Reset page when tab changes
	const handleTabChange = (_: React.SyntheticEvent, val: ViewTab) => {
		setActiveTab(val);
		setPage(0);
	};

	const handlePublish = async (doc: SentenciaCapturada) => {
		setActionLoading(doc._id);
		try {
			await SentenciasService.updatePublicationStatus(doc._id, "published");
			enqueueSnackbar("Sentencia marcada como publicada", { variant: "success", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			load(false);
		} catch {
			enqueueSnackbar("Error al actualizar", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setActionLoading(null);
		}
	};

	const handleRestore = async (doc: SentenciaCapturada) => {
		setActionLoading(doc._id);
		try {
			await SentenciasService.updatePublicationStatus(doc._id, "pending");
			enqueueSnackbar("Sentencia restaurada a pendientes", { variant: "info", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			load(false);
		} catch {
			enqueueSnackbar("Error al restaurar", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setActionLoading(null);
		}
	};

	const handleSkipConfirm = async (notes: string) => {
		const doc = skipDialog.doc;
		if (!doc) return;
		setSkipDialog({ open: false, doc: null });
		setActionLoading(doc._id);
		try {
			await SentenciasService.updatePublicationStatus(doc._id, "skipped", notes);
			enqueueSnackbar("Sentencia archivada", { variant: "info", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			load(false);
		} catch {
			enqueueSnackbar("Error al archivar", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setActionLoading(null);
		}
	};

	const handleSummaryUpdate = (id: string, summary: AiSummary) => {
		setDocs(prev => prev.map(d => d._id === id ? { ...d, aiSummary: summary } : d));
		setSummaryDialog(prev => prev.doc?._id === id ? { ...prev, doc: { ...prev.doc!, aiSummary: summary } } : prev);
	};

	const isPending = activeTab === "pending";
	const isArchived = activeTab === "skipped";

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
				<Box>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6">Cola de Publicaciones</Typography>
						{activeTab === "pending" && total > 0 && (
							<Chip
								label={total}
								size="small"
								color="warning"
								sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
							/>
						)}
					</Stack>
					<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
						Sentencias de causas con novedad listas para publicar
					</Typography>
				</Box>
				<Stack direction="row" spacing={0.5}>
					<Tooltip title={helpOpen ? "Ocultar ayuda" : "¿Cómo funciona esta sección?"}>
						<IconButton size="small" color="info" onClick={() => setHelpOpen(v => !v)}>
							{helpOpen ? <ArrowUp2 size={18} /> : <InfoCircle size={18} />}
						</IconButton>
					</Tooltip>
					<Tooltip title="Actualizar">
						<IconButton size="small" onClick={() => load()} disabled={loading}>
							<Refresh2 size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Box>

			{/* Help panel */}
			<Collapse in={helpOpen}>
				<Card variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.25) }}>
					<CardContent sx={{ pb: "16px !important" }}>
						<Stack spacing={1.5}>
							<Stack direction="row" spacing={1} alignItems="center">
								<InfoCircle size={16} color={theme.palette.info.main} />
								<Typography variant="subtitle2" color="info.main">
									¿Cuándo aparece una sentencia en esta cola?
								</Typography>
							</Stack>
							<Typography variant="body2" color="text.secondary">
								Una sentencia aparece aquí cuando proviene de una <strong>causa con novedad detectada</strong> (escrito semánticamente distinto al corpus) y ya fue embebida en Pinecone. Hay tres escenarios posibles:
							</Typography>

							<Stack spacing={1.25}>
								{/* Escenario 1 */}
								<Box sx={{ pl: 1.5, borderLeft: `3px solid ${theme.palette.success.main}` }}>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<Flash size={15} color={theme.palette.success.main} style={{ marginTop: 2, flexShrink: 0 }} />
										<Box>
											<Typography variant="caption" fontWeight={700} color="success.main" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
												Escenario 1 — Sentencia nueva post-novedad
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
												El escrito es detectado como novelty → la causa se marca con <code>update=true</code> → el worker de movimientos rastrea la causa y encuentra una <strong>nueva sentencia</strong> → se captura como <code>category='novelty'</code> → una vez embebida aparece aquí automáticamente.
											</Typography>
										</Box>
									</Stack>
								</Box>

								{/* Escenario 2 */}
								<Box sx={{ pl: 1.5, borderLeft: `3px solid ${theme.palette.warning.main}` }}>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<Clock size={15} color={theme.palette.warning.main} style={{ marginTop: 2, flexShrink: 0 }} />
										<Box>
											<Typography variant="caption" fontWeight={700} color="warning.main" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
												Escenario 2 — Sentencia ya estaba en el historial
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
												La causa tiene una sentencia <strong>pre-existente</strong> en su historial al momento de detectarse la novedad. El worker de actualización solo rastrea movimientos nuevos, por lo que no la volvería a capturar. En cambio, al marcar la causa como novelty el <strong>selector worker</strong> busca directamente en <code>sentencias-capturadas</code> y marca las sentencias ya embebidas de esa causa como pendientes de publicación.
											</Typography>
										</Box>
									</Stack>
								</Box>

								{/* Escenario 3 */}
								<Box sx={{ pl: 1.5, borderLeft: `3px solid ${theme.palette.secondary.main}` }}>
									<Stack direction="row" spacing={1} alignItems="flex-start">
										<DocumentText size={15} color={theme.palette.secondary.main} style={{ marginTop: 2, flexShrink: 0 }} />
										<Box>
											<Typography variant="caption" fontWeight={700} color="secondary.main" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
												Escenario 3 — Sentencia capturada como rutina
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
												El collector de sentencias ya había capturado la sentencia como <code>category='rutina'</code> (antes o después de la detección de novedad). Cuando el selector worker identifica la novedad del escrito, busca por <code>causaId</code> en <code>sentencias-capturadas</code> independientemente de la categoría y marca esa sentencia como pendiente de publicación.
											</Typography>
										</Box>
									</Stack>
								</Box>
							</Stack>

							<Divider />
							<Typography variant="caption" color="text.secondary">
								<strong>Publicar</strong> registra la fecha de publicación y saca la sentencia de la cola. <strong>Archivar</strong> la excluye con un motivo opcional. Desde <strong>Archivadas</strong> podés restaurar cualquier sentencia a pendientes.
							</Typography>
						</Stack>
					</CardContent>
				</Card>
			</Collapse>

			{/* Tabs */}
			<Tabs
				value={activeTab}
				onChange={handleTabChange}
				sx={{ borderBottom: 1, borderColor: "divider", minHeight: 36 }}
				TabIndicatorProps={{ style: { height: 2 } }}
			>
				{(["pending", "skipped", "published"] as ViewTab[]).map(tab => (
					<Tab
						key={tab}
						value={tab}
						label={TAB_LABELS[tab]}
						sx={{ minHeight: 36, py: 0.5, fontSize: "0.8rem" }}
					/>
				))}
			</Tabs>

			{/* Filters */}
			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
				<FormControl size="small" sx={{ minWidth: 130 }}>
					<InputLabel>Fuero</InputLabel>
					<Select value={fueroFilter} label="Fuero" onChange={e => { setFueroFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(FUERO_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 150 }}>
					<InputLabel>Tipo</InputLabel>
					<Select value={tipoFilter} label="Tipo" onChange={e => { setTipoFilter(e.target.value); setPage(0); }}>
						<MenuItem value="">Todos</MenuItem>
						{Object.entries(TIPO_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
					</Select>
				</FormControl>
				<Tooltip title={sortOrder === "desc" ? "Más recientes primero (click para invertir)" : "Más antiguas primero (click para invertir)"}>
					<Button
						size="small"
						variant="outlined"
						color="inherit"
						onClick={() => { setSortOrder(o => o === "desc" ? "asc" : "desc"); setPage(0); }}
						startIcon={sortOrder === "desc" ? <ArrowDown3 size={15} /> : <ArrowUp3 size={15} />}
						sx={{ height: 40, borderColor: "divider", color: "text.secondary", fontSize: "0.75rem" }}
					>
						Fecha {sortOrder === "desc" ? "↓" : "↑"}
					</Button>
				</Tooltip>
			</Stack>

			{/* Cards */}
			{loading ? (
				<Grid container spacing={2}>
					{[1, 2, 3].map(i => (
						<Grid item xs={12} key={i}>
							<Skeleton variant="rounded" height={120} />
						</Grid>
					))}
				</Grid>
			) : docs.length === 0 ? (
				<Alert severity={isPending ? "success" : "info"} sx={{ borderRadius: 2 }}>
					{isPending
						? `No hay sentencias pendientes de publicación${fueroFilter || tipoFilter ? " con los filtros aplicados" : ""}.`
						: isArchived
						? `No hay sentencias archivadas${fueroFilter || tipoFilter ? " con los filtros aplicados" : ""}.`
						: `No hay sentencias publicadas${fueroFilter || tipoFilter ? " con los filtros aplicados" : ""}.`}
				</Alert>
			) : (
				<Stack spacing={1.5}>
					{docs.map(doc => {
						const isActing = actionLoading === doc._id;
						const fueroColor = FUERO_COLORS[doc.fuero] || "default";
						return (
							<Card
								key={doc._id}
								variant="outlined"
								sx={{
									borderRadius: 2,
									borderLeft: `4px solid ${theme.palette[fueroColor]?.main || theme.palette.primary.main}`,
									opacity: isActing ? 0.6 : 1,
									transition: "opacity 0.2s",
								}}
							>
								<CardContent sx={{ pb: "12px !important", pt: 1.5 }}>
									<Grid container spacing={1} alignItems="flex-start">
										<Grid item xs={12} sm>
											<Stack spacing={0.75}>
												{/* Caratula */}
												<Typography variant="subtitle2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
													{doc.caratula || `Sentencia #${doc._id.slice(-6)}`}
												</Typography>

												{/* Chips de metadata */}
												<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
													<Chip
														label={FUERO_LABELS[doc.fuero] || doc.fuero}
														size="small"
														color={fueroColor}
														variant="outlined"
														sx={{ height: 20, fontSize: "0.68rem" }}
													/>
													<Chip
														label={TIPO_LABELS[doc.sentenciaTipo] || doc.sentenciaTipo}
														size="small"
														variant="outlined"
														sx={{ height: 20, fontSize: "0.68rem" }}
													/>
													{doc.noveltyCheck?.status === "single" && (
														<Chip
															label="Novelty ✓"
															size="small"
															color="secondary"
															variant="outlined"
															sx={{ height: 20, fontSize: "0.68rem" }}
														/>
													)}
													{doc.aiSummary?.status === "approved" && (
														<Chip
															label="Resumen ✓"
															size="small"
															color="success"
															variant="outlined"
															sx={{ height: 20, fontSize: "0.68rem" }}
														/>
													)}
													{doc.aiSummary?.status === "draft" && (
														<Chip
															label="Resumen borrador"
															size="small"
															color="warning"
															variant="outlined"
															sx={{ height: 20, fontSize: "0.68rem" }}
														/>
													)}
													{isArchived && doc.publicationNotes && (
														<Tooltip title={doc.publicationNotes}>
															<Chip
																label="Con nota"
																size="small"
																variant="outlined"
																sx={{ height: 20, fontSize: "0.68rem" }}
															/>
														</Tooltip>
													)}
												</Stack>

												{/* Detalles */}
												<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
													{doc.movimientoFecha && (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<Calendar size={13} color={theme.palette.text.secondary} />
															<Typography variant="caption" color="text.secondary">
																{formatDate(doc.movimientoFecha)}
															</Typography>
														</Stack>
													)}
													{doc.juzgado && (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<Building size={13} color={theme.palette.text.secondary} />
															<Typography variant="caption" color="text.secondary">
																Juzgado {doc.juzgado}
															</Typography>
														</Stack>
													)}
													{doc.embeddedAt && (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<Judge size={13} color={theme.palette.text.secondary} />
															<Typography variant="caption" color="text.secondary">
																Embebida {formatDate(doc.embeddedAt)}
															</Typography>
														</Stack>
													)}
													{activeTab === "published" && doc.publishedAt && (
														<Stack direction="row" spacing={0.5} alignItems="center">
															<TickCircle size={13} color={theme.palette.success.main} />
															<Typography variant="caption" color="success.main">
																Publicada {formatDate(doc.publishedAt)}
															</Typography>
														</Stack>
													)}
												</Stack>

												{/* Detalle del movimiento */}
												{doc.movimientoDetalle && (
													<Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
														{doc.movimientoDetalle.slice(0, 120)}{doc.movimientoDetalle.length > 120 ? "…" : ""}
													</Typography>
												)}

												{/* Nota de archivo */}
												{isArchived && doc.publicationNotes && (
													<Typography variant="caption" color="text.disabled" sx={{ fontStyle: "italic" }}>
														Motivo: {doc.publicationNotes}
													</Typography>
												)}
											</Stack>
										</Grid>

										{/* Actions */}
										<Grid item xs={12} sm="auto">
											<Stack direction={{ xs: "row", sm: "column" }} spacing={1} alignItems={{ xs: "center", sm: "flex-end" }}>
												{doc.url && (
													<Tooltip title="Ver documento">
														<IconButton
															size="small"
															href={doc.url}
															target="_blank"
															rel="noopener noreferrer"
															component="a"
														>
															<ExportSquare size={16} />
														</IconButton>
													</Tooltip>
												)}
												<Tooltip title={doc.aiSummary ? "Ver / editar resumen IA" : "Generar resumen IA"}>
													<Button
														size="small"
														variant={doc.aiSummary?.status === "approved" ? "contained" : "outlined"}
														color={doc.aiSummary?.status === "approved" ? "success" : "secondary"}
														startIcon={<Magicpen size={15} />}
														disabled={isActing}
														onClick={() => setSummaryDialog({ open: true, doc })}
														sx={{ whiteSpace: "nowrap", minWidth: 110 }}
													>
														{doc.aiSummary ? "Resumen" : "Resumir"}
													</Button>
												</Tooltip>
												{isPending && (
													<>
														<Button
															size="small"
															variant="contained"
															color="success"
															startIcon={<TickCircle size={16} />}
															disabled={isActing}
															onClick={() => handlePublish(doc)}
															sx={{ whiteSpace: "nowrap", minWidth: 110 }}
														>
															Publicar
														</Button>
														<Button
															size="small"
															variant="outlined"
															color="warning"
															startIcon={<Archive size={16} />}
															disabled={isActing}
															onClick={() => setSkipDialog({ open: true, doc })}
															sx={{ whiteSpace: "nowrap", minWidth: 110 }}
														>
															Archivar
														</Button>
													</>
												)}
												{isArchived && (
													<Button
														size="small"
														variant="outlined"
														color="primary"
														startIcon={<ArrowRotateLeft size={16} />}
														disabled={isActing}
														onClick={() => handleRestore(doc)}
														sx={{ whiteSpace: "nowrap", minWidth: 110 }}
													>
														Restaurar
													</Button>
												)}
											</Stack>
										</Grid>
									</Grid>
								</CardContent>
							</Card>
						);
					})}
				</Stack>
			)}

			{total > rowsPerPage && (
				<>
					<Divider />
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Por página:"
					/>
				</>
			)}

			<SkipDialog
				open={skipDialog.open}
				doc={skipDialog.doc}
				onConfirm={handleSkipConfirm}
				onClose={() => setSkipDialog({ open: false, doc: null })}
			/>

			<SummaryDialog
				open={summaryDialog.open}
				doc={summaryDialog.doc}
				onClose={() => setSummaryDialog({ open: false, doc: null })}
				onSaved={handleSummaryUpdate}
			/>
		</Stack>
	);
}
