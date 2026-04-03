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
	alpha,
	useTheme,
	Divider,
} from "@mui/material";
import { Refresh2, ExportSquare, TickCircle, CloseCircle, Calendar, Building, Judge } from "iconsax-react";
import { useSnackbar } from "notistack";
import SentenciasService, { SentenciaCapturada, Fuero, SentenciaTipo } from "api/sentenciasCapturadas";

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
			<DialogTitle>Descartar sentencia</DialogTitle>
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
				<Button variant="contained" color="error" onClick={() => onConfirm(notes)}>
					Descartar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default function PublicacionesSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [docs, setDocs] = useState<SentenciaCapturada[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [tipoFilter, setTipoFilter] = useState<string>("");

	const [skipDialog, setSkipDialog] = useState<{ open: boolean; doc: SentenciaCapturada | null }>({ open: false, doc: null });

	const load = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		try {
			const res = await SentenciasService.getPublicationQueue({
				...(fueroFilter ? { fuero: fueroFilter as Fuero } : {}),
				...(tipoFilter ? { tipo: tipoFilter as SentenciaTipo } : {}),
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
	}, [fueroFilter, tipoFilter, page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

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

	const handleSkipConfirm = async (notes: string) => {
		const doc = skipDialog.doc;
		if (!doc) return;
		setSkipDialog({ open: false, doc: null });
		setActionLoading(doc._id);
		try {
			await SentenciasService.updatePublicationStatus(doc._id, "skipped", notes);
			enqueueSnackbar("Sentencia descartada", { variant: "info", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			load(false);
		} catch {
			enqueueSnackbar("Error al actualizar", { variant: "error", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
		} finally {
			setActionLoading(null);
		}
	};

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
				<Box>
					<Stack direction="row" spacing={1} alignItems="center">
						<Typography variant="h6">Cola de Publicaciones</Typography>
						{total > 0 && (
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
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={() => load()} disabled={loading}>
						<Refresh2 size={18} />
					</IconButton>
				</Tooltip>
			</Box>

			{/* Filters */}
			<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
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
				<Alert severity="success" sx={{ borderRadius: 2 }}>
					No hay sentencias pendientes de publicación{fueroFilter || tipoFilter ? " con los filtros aplicados" : ""}.
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
												</Stack>

												{/* Detalle del movimiento */}
												{doc.movimientoDetalle && (
													<Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
														{doc.movimientoDetalle.slice(0, 120)}{doc.movimientoDetalle.length > 120 ? "…" : ""}
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
													color="error"
													startIcon={<CloseCircle size={16} />}
													disabled={isActing}
													onClick={() => setSkipDialog({ open: true, doc })}
													sx={{ whiteSpace: "nowrap", minWidth: 110 }}
												>
													Descartar
												</Button>
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
		</Stack>
	);
}
