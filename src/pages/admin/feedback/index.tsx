import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useTheme, alpha } from "@mui/material/styles";
import { BRAND_BLUE } from "themes/dashboardTokens";
import {
	Box,
	Grid,
	Typography,
	Button,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Paper,
	Chip,
	TextField,
	MenuItem,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	FormControl,
	InputLabel,
	Select,
	Stack,
	Card,
	CardContent,
	Skeleton,
	Alert,
	InputAdornment,
	Checkbox,
	Divider,
	Rating,
} from "@mui/material";
import {
	Refresh,
	Trash,
	SearchNormal1,
	Filter,
	CloseCircle,
	Eye,
	TickCircle,
	CloseSquare,
	Clock,
	MessageQuestion,
	Send2,
	Star1,
	GlobalEdit,
	Lock1,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import FeedbackService, { UserFeedback, FeedbackFilters, FeedbackStatus, FeedbackType } from "api/feedback";

const STATUS_CONFIG: Record<FeedbackStatus, { color: "warning" | "info" | "success" | "default" | "error"; label: string }> = {
	pending: { color: "warning", label: "Pendiente" },
	approved: { color: "info", label: "Aprobado" },
	published: { color: "success", label: "Publicado" },
	rejected: { color: "error", label: "Rechazado" },
	archived: { color: "default", label: "Archivado" },
};

const TYPE_LABEL: Record<FeedbackType, string> = {
	comment: "Comentario",
	survey_response: "Respuesta",
	nps: "NPS",
	rating: "Rating",
	suggestion: "Sugerencia",
	bug: "Bug",
};

const formatDate = (s?: string | null) => {
	if (!s) return "—";
	const d = new Date(s);
	return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
};

const getAuthorName = (f: UserFeedback) => {
	if (typeof f.userId === "object" && f.userId) {
		const u = f.userId;
		return u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.firstName || u.email || "—";
	}
	return f.authorSnapshot?.name || "Anónimo";
};

const getAuthorEmail = (f: UserFeedback) => {
	if (typeof f.userId === "object" && f.userId) return f.userId.email || "—";
	return f.authorSnapshot?.email || "—";
};

const FeedbackAdminPage = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<UserFeedback[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "">("");
	const [filterType, setFilterType] = useState<FeedbackType | "">("");
	const [filterConsent, setFilterConsent] = useState<"" | "true" | "false">("");
	const [searchTerm, setSearchTerm] = useState("");

	const [stats, setStats] = useState<{
		byStatus: Array<{ _id: FeedbackStatus; count: number }>;
		byType: Array<{ _id: FeedbackType; count: number }>;
		avgRating: { avg: number | null; count: number };
	} | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);

	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const [detailOpen, setDetailOpen] = useState(false);
	const [selected, setSelected] = useState<UserFeedback | null>(null);
	const [busy, setBusy] = useState(false);

	const [rejectOpen, setRejectOpen] = useState(false);
	const [rejectReason, setRejectReason] = useState("");

	const [editOpen, setEditOpen] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editContent, setEditContent] = useState("");
	const [editTags, setEditTags] = useState("");
	const [editNotes, setEditNotes] = useState("");

	const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
	const [bulkStatus, setBulkStatus] = useState<FeedbackStatus | "">("");

	const [deleteOpen, setDeleteOpen] = useState(false);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const filters: FeedbackFilters = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: "createdAt",
				sortOrder: "desc",
			};
			if (filterStatus) filters.status = filterStatus;
			if (filterType) filters.type = filterType;
			if (filterConsent === "true") filters.consentPublish = true;
			if (filterConsent === "false") filters.consentPublish = false;
			if (searchTerm) filters.search = searchTerm;

			const res = await FeedbackService.list(filters);
			if (res.success) {
				setItems(res.items);
				setTotal(res.total);
			}
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al cargar feedback", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, filterType, filterConsent, searchTerm, enqueueSnackbar]);

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const res = await FeedbackService.stats();
			if (res.success) {
				setStats({ byStatus: res.byStatus, byType: res.byType, avgRating: res.avgRating });
			}
		} catch {
			// silencioso
		} finally {
			setLoadingStats(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const countByStatus = (s: FeedbackStatus) => stats?.byStatus?.find((x) => x._id === s)?.count || 0;
	const totalCount = (stats?.byStatus || []).reduce((acc, x) => acc + (x.count || 0), 0);

	const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
		setSelectedIds(e.target.checked ? items.map((i) => i._id) : []);
	};

	const handleSelectOne = (id: string) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	const openDetail = async (item: UserFeedback) => {
		setSelected(item);
		setDetailOpen(true);
		try {
			const res = await FeedbackService.getById(item._id);
			if (res.success) setSelected(res.feedback);
		} catch {
			// nada — se queda con lo de la lista
		}
	};

	const openEdit = (item: UserFeedback) => {
		setSelected(item);
		setEditTitle(item.title || "");
		setEditContent(item.content || "");
		setEditTags((item.tags || []).join(", "));
		setEditNotes(item.moderation?.notes || "");
		setEditOpen(true);
	};

	const doApprove = async (force?: boolean) => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackService.approve(selected._id);
			enqueueSnackbar("Feedback aprobado", { variant: "success" });
			void force;
			fetchList();
			fetchStats();
			setDetailOpen(false);
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al aprobar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doPublish = async (force = false) => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackService.publish(selected._id, force);
			enqueueSnackbar("Feedback publicado", { variant: "success" });
			fetchList();
			fetchStats();
			setDetailOpen(false);
		} catch (e: any) {
			const msg: string = e?.response?.data?.message || e?.message || "Error al publicar";
			if (msg.includes("consentimiento") && !force) {
				if (window.confirm(`${msg}\n\n¿Forzar publicación de todos modos?`)) {
					await doPublish(true);
				}
			} else {
				enqueueSnackbar(msg, { variant: "error" });
			}
		} finally {
			setBusy(false);
		}
	};

	const doUnpublish = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackService.unpublish(selected._id);
			enqueueSnackbar("Feedback despublicado", { variant: "success" });
			fetchList();
			fetchStats();
			setDetailOpen(false);
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al despublicar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doReject = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackService.reject(selected._id, rejectReason);
			enqueueSnackbar("Feedback rechazado", { variant: "success" });
			setRejectOpen(false);
			setRejectReason("");
			setDetailOpen(false);
			fetchList();
			fetchStats();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al rechazar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doDelete = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackService.remove(selected._id);
			enqueueSnackbar("Feedback eliminado", { variant: "success" });
			setDeleteOpen(false);
			setDetailOpen(false);
			fetchList();
			fetchStats();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al eliminar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doEdit = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			const tagsArr = editTags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean);
			await FeedbackService.update(selected._id, {
				title: editTitle || null,
				content: editContent,
				tags: tagsArr,
				moderation: { notes: editNotes || undefined },
			});
			enqueueSnackbar("Feedback actualizado", { variant: "success" });
			setEditOpen(false);
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al actualizar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doBulkStatus = async () => {
		if (!bulkStatus || selectedIds.length === 0) return;
		try {
			setBusy(true);
			const res = await FeedbackService.bulkStatus(selectedIds, bulkStatus);
			enqueueSnackbar(`${res.modified} feedbacks actualizados`, { variant: "success" });
			setBulkStatusOpen(false);
			setBulkStatus("");
			setSelectedIds([]);
			fetchList();
			fetchStats();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error en bulk", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const handleClearFilters = () => {
		setFilterStatus("");
		setFilterType("");
		setFilterConsent("");
		setSearchTerm("");
		setPage(0);
	};

	return (
		<MainCard
			title="Feedback de Usuarios"
			secondary={
				<Stack direction="row" spacing={1}>
					{selectedIds.length > 0 && (
						<Button variant="outlined" size="small" onClick={() => setBulkStatusOpen(true)}>
							Cambiar estado ({selectedIds.length})
						</Button>
					)}
					<Button
						variant="outlined"
						size="small"
						startIcon={<Refresh size={16} />}
						onClick={() => {
							fetchList();
							fetchStats();
						}}
					>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Stats */}
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={2.4}>
						<Card variant="outlined" sx={{ height: "100%", borderColor: alpha(BRAND_BLUE, 0.2) }}>
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center" mb={1}>
									<MessageQuestion size={18} color={BRAND_BLUE} />
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
										Total
									</Typography>
								</Stack>
								{loadingStats ? (
									<Skeleton variant="text" width={60} height={40} />
								) : (
									<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums", color: BRAND_BLUE }}>
										{totalCount.toLocaleString("es-AR")}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={2.4}>
						<Card variant="outlined" sx={{ height: "100%" }}>
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center" mb={1}>
									<Clock size={18} color={theme.palette.warning.main} />
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
										Pendientes
									</Typography>
								</Stack>
								{loadingStats ? (
									<Skeleton variant="text" width={60} height={40} />
								) : (
									<Typography variant="h4" color="warning.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{countByStatus("pending").toLocaleString("es-AR")}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={2.4}>
						<Card variant="outlined" sx={{ height: "100%" }}>
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center" mb={1}>
									<TickCircle size={18} color={theme.palette.success.main} />
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
										Publicados
									</Typography>
								</Stack>
								{loadingStats ? (
									<Skeleton variant="text" width={60} height={40} />
								) : (
									<Typography variant="h4" color="success.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{countByStatus("published").toLocaleString("es-AR")}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={2.4}>
						<Card variant="outlined" sx={{ height: "100%" }}>
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center" mb={1}>
									<CloseSquare size={18} color={theme.palette.error.main} />
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
										Rechazados
									</Typography>
								</Stack>
								{loadingStats ? (
									<Skeleton variant="text" width={60} height={40} />
								) : (
									<Typography variant="h4" color="error.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{countByStatus("rejected").toLocaleString("es-AR")}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={2.4}>
						<Card variant="outlined" sx={{ height: "100%" }}>
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center" mb={1}>
									<Star1 size={18} color={theme.palette.secondary.main} />
									<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
										Rating promedio
									</Typography>
								</Stack>
								{loadingStats ? (
									<Skeleton variant="text" width={60} height={40} />
								) : (
									<Stack direction="row" alignItems="baseline" spacing={1}>
										<Typography variant="h4" sx={{ fontVariantNumeric: "tabular-nums" }}>
											{stats?.avgRating?.avg ? Number(stats.avgRating.avg).toFixed(2) : "—"}
										</Typography>
										<Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
											({stats?.avgRating?.count || 0})
										</Typography>
									</Stack>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Filtros */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center" mb={2}>
						<Filter size={18} />
						<Typography variant="subtitle2" sx={{ textTransform: "uppercase", letterSpacing: 0.4, fontSize: "0.72rem" }}>
							Filtros
						</Typography>
					</Stack>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={filterStatus}
									label="Estado"
									onChange={(e) => {
										setFilterStatus(e.target.value as FeedbackStatus | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="pending">Pendiente</MenuItem>
									<MenuItem value="approved">Aprobado</MenuItem>
									<MenuItem value="published">Publicado</MenuItem>
									<MenuItem value="rejected">Rechazado</MenuItem>
									<MenuItem value="archived">Archivado</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Tipo</InputLabel>
								<Select
									value={filterType}
									label="Tipo"
									onChange={(e) => {
										setFilterType(e.target.value as FeedbackType | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="comment">Comentario</MenuItem>
									<MenuItem value="survey_response">Respuesta encuesta</MenuItem>
									<MenuItem value="nps">NPS</MenuItem>
									<MenuItem value="rating">Rating</MenuItem>
									<MenuItem value="suggestion">Sugerencia</MenuItem>
									<MenuItem value="bug">Bug</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Consentimiento</InputLabel>
								<Select
									value={filterConsent}
									label="Consentimiento"
									onChange={(e) => {
										setFilterConsent(e.target.value as "" | "true" | "false");
										setPage(0);
									}}
								>
									<MenuItem value="">Cualquiera</MenuItem>
									<MenuItem value="true">Permite publicar</MenuItem>
									<MenuItem value="false">No permite publicar</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={5}>
							<TextField
								fullWidth
								size="small"
								placeholder="Buscar por contenido, nombre o email..."
								value={searchTerm}
								onChange={(e) => {
									setSearchTerm(e.target.value);
									setPage(0);
								}}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchNormal1 size={18} />
										</InputAdornment>
									),
								}}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={1}>
							<Tooltip title="Limpiar filtros">
								<IconButton onClick={handleClearFilters} color="error">
									<CloseCircle size={20} />
								</IconButton>
							</Tooltip>
						</Grid>
					</Grid>
				</Paper>

				{/* Tabla */}
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell padding="checkbox">
									<Checkbox
										indeterminate={selectedIds.length > 0 && selectedIds.length < items.length}
										checked={items.length > 0 && selectedIds.length === items.length}
										onChange={handleSelectAll}
									/>
								</TableCell>
								<TableCell>Fecha</TableCell>
								<TableCell>Autor</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Contenido</TableCell>
								<TableCell align="center">Rating</TableCell>
								<TableCell align="center">Consent.</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 9 }).map((__, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} align="center">
										<Alert severity="info" sx={{ justifyContent: "center" }}>
											No se encontraron feedbacks
										</Alert>
									</TableCell>
								</TableRow>
							) : (
								items.map((it) => (
									<TableRow key={it._id} hover selected={selectedIds.includes(it._id)}>
										<TableCell padding="checkbox">
											<Checkbox checked={selectedIds.includes(it._id)} onChange={() => handleSelectOne(it._id)} />
										</TableCell>
										<TableCell>
											<Typography variant="body2">{formatDate(it.createdAt)}</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2" fontWeight={500}>
												{getAuthorName(it)}
											</Typography>
											<Typography variant="caption" color="textSecondary">
												{getAuthorEmail(it)}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip label={TYPE_LABEL[it.type] || it.type} size="small" variant="outlined" />
										</TableCell>
										<TableCell>
											<Typography variant="body2" sx={{ maxWidth: 280 }} noWrap title={it.content}>
												{it.title ? <strong>{it.title}: </strong> : null}
												{it.content || "(sin texto)"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											{it.rating !== null && it.rating !== undefined ? (
												<Chip label={it.rating} size="small" color="secondary" icon={<Star1 size={12} />} />
											) : (
												<Typography variant="caption" color="textSecondary">
													—
												</Typography>
											)}
										</TableCell>
										<TableCell align="center">
											{it.consent?.allowPublish ? (
												<Tooltip title="Permite publicar">
													<GlobalEdit size={16} color={theme.palette.success.main} />
												</Tooltip>
											) : (
												<Tooltip title="No permite publicar">
													<Lock1 size={16} color={theme.palette.text.secondary} />
												</Tooltip>
											)}
										</TableCell>
										<TableCell align="center">
											<Chip
												label={STATUS_CONFIG[it.status]?.label || it.status}
												size="small"
												color={STATUS_CONFIG[it.status]?.color || "default"}
											/>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Ver detalle">
													<IconButton size="small" color="info" onClick={() => openDetail(it)}>
														<Eye size={16} />
													</IconButton>
												</Tooltip>
												{it.status === "pending" && (
													<Tooltip title="Aprobar">
														<IconButton
															size="small"
															color="success"
															onClick={() => {
																setSelected(it);
																setTimeout(doApprove, 0);
															}}
														>
															<TickCircle size={16} />
														</IconButton>
													</Tooltip>
												)}
												{it.status !== "published" && (
													<Tooltip title="Publicar">
														<IconButton
															size="small"
															color="primary"
															onClick={() => {
																setSelected(it);
																setTimeout(() => doPublish(false), 0);
															}}
														>
															<Send2 size={16} />
														</IconButton>
													</Tooltip>
												)}
												{it.status === "published" && (
													<Tooltip title="Despublicar">
														<IconButton
															size="small"
															color="warning"
															onClick={() => {
																setSelected(it);
																setTimeout(doUnpublish, 0);
															}}
														>
															<Lock1 size={16} />
														</IconButton>
													</Tooltip>
												)}
												{it.status !== "rejected" && (
													<Tooltip title="Rechazar">
														<IconButton
															size="small"
															color="error"
															onClick={() => {
																setSelected(it);
																setRejectOpen(true);
															}}
														>
															<CloseSquare size={16} />
														</IconButton>
													</Tooltip>
												)}
												<Tooltip title="Eliminar">
													<IconButton
														size="small"
														color="error"
														onClick={() => {
															setSelected(it);
															setDeleteOpen(true);
														}}
													>
														<Trash size={16} />
													</IconButton>
												</Tooltip>
											</Stack>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={total}
						page={page}
						onPageChange={(_, p) => {
							setPage(p);
							setSelectedIds([]);
						}}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
							setSelectedIds([]);
						}}
						rowsPerPageOptions={[10, 20, 50, 100]}
						labelRowsPerPage="Filas por página:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</TableContainer>
			</Stack>

			{/* Detail */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Detalle del feedback</DialogTitle>
				<DialogContent dividers>
					{selected && (
						<Stack spacing={3}>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="textSecondary">
											Autor
										</Typography>
										<Typography variant="body1" fontWeight={500}>
											{getAuthorName(selected)}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											{getAuthorEmail(selected)}
										</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Tipo
										</Typography>
										<Box mt={0.5}>
											<Chip label={TYPE_LABEL[selected.type] || selected.type} size="small" variant="outlined" />
										</Box>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Estado
										</Typography>
										<Box mt={0.5}>
											<Chip label={STATUS_CONFIG[selected.status]?.label} size="small" color={STATUS_CONFIG[selected.status]?.color} />
										</Box>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Creado
										</Typography>
										<Typography variant="body2">{formatDate(selected.createdAt)}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Publicado
										</Typography>
										<Typography variant="body2">{formatDate(selected.moderation?.publishedAt)}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Rating
										</Typography>
										<Box mt={0.5}>
											{selected.rating !== null && selected.rating !== undefined ? (
												<Rating value={Math.min(5, Math.max(0, selected.rating))} readOnly precision={0.5} size="small" />
											) : (
												<Typography variant="caption" color="textSecondary">
													—
												</Typography>
											)}
										</Box>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Consentimiento publicar
										</Typography>
										<Typography variant="body2">{selected.consent?.allowPublish ? "Sí" : "No"}</Typography>
									</Grid>
								</Grid>
							</Paper>

							{selected.title && (
								<Box>
									<Typography variant="caption" color="textSecondary">
										Título
									</Typography>
									<Typography variant="h6">{selected.title}</Typography>
								</Box>
							)}

							<Box>
								<Typography variant="caption" color="textSecondary">
									Contenido
								</Typography>
								<Paper variant="outlined" sx={{ p: 2, mt: 0.5, bgcolor: "background.default" }}>
									<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
										{selected.content || "(sin texto)"}
									</Typography>
								</Paper>
							</Box>

							{selected.answers && selected.answers.length > 0 && (
								<Box>
									<Divider sx={{ mb: 2 }} />
									<Typography variant="subtitle2" gutterBottom>
										Respuestas a la encuesta
									</Typography>
									<Stack spacing={1}>
										{selected.answers.map((a, idx) => {
											const q =
												typeof selected.surveyId === "object" && selected.surveyId
													? selected.surveyId.questions?.find((qq) => qq.id === a.questionId)
													: null;
											const val =
												a.valueText ??
												(a.valueNumber !== null && a.valueNumber !== undefined ? String(a.valueNumber) : null) ??
												(a.valueArray ? a.valueArray.join(", ") : null) ??
												(a.valueBoolean !== null && a.valueBoolean !== undefined ? (a.valueBoolean ? "Sí" : "No") : null);
											return (
												<Paper variant="outlined" key={idx} sx={{ p: 1.5 }}>
													<Typography variant="caption" color="textSecondary">
														{q?.question || a.questionId}
													</Typography>
													<Typography variant="body2">{val ?? "—"}</Typography>
												</Paper>
											);
										})}
									</Stack>
								</Box>
							)}

							{selected.tags && selected.tags.length > 0 && (
								<Box>
									<Typography variant="caption" color="textSecondary">
										Tags
									</Typography>
									<Stack direction="row" spacing={1} mt={0.5}>
										{selected.tags.map((t) => (
											<Chip key={t} label={t} size="small" />
										))}
									</Stack>
								</Box>
							)}

							{selected.moderation?.notes && (
								<Box>
									<Typography variant="caption" color="textSecondary">
										Notas internas
									</Typography>
									<Typography variant="body2">{selected.moderation.notes}</Typography>
								</Box>
							)}

							{selected.moderation?.rejectionReason && (
								<Alert severity="error">
									<Typography variant="caption">Motivo de rechazo: </Typography>
									{selected.moderation.rejectionReason}
								</Alert>
							)}

							{selected.context && (selected.context.page || selected.context.feature) && (
								<Box>
									<Typography variant="caption" color="textSecondary">
										Contexto: {selected.context.page || "—"} {selected.context.feature ? `· ${selected.context.feature}` : ""}
									</Typography>
								</Box>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)} disabled={busy}>
						Cerrar
					</Button>
					<Button color="info" onClick={() => selected && openEdit(selected)} disabled={busy}>
						Editar
					</Button>
					{selected?.status !== "rejected" && (
						<Button color="error" onClick={() => setRejectOpen(true)} disabled={busy}>
							Rechazar
						</Button>
					)}
					{selected?.status === "pending" && (
						<Button color="info" variant="outlined" onClick={() => doApprove()} disabled={busy}>
							Aprobar
						</Button>
					)}
					{selected?.status === "published" ? (
						<Button color="warning" variant="outlined" onClick={doUnpublish} disabled={busy}>
							Despublicar
						</Button>
					) : (
						<Button variant="contained" onClick={() => doPublish(false)} disabled={busy}>
							Publicar
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* Reject */}
			<Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Rechazar feedback</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						fullWidth
						multiline
						rows={3}
						label="Motivo (opcional)"
						value={rejectReason}
						onChange={(e) => setRejectReason(e.target.value)}
						sx={{ mt: 1 }}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRejectOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={doReject} disabled={busy}>
						Rechazar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit */}
			<Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Editar feedback</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField label="Título" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} fullWidth />
						<TextField
							label="Contenido"
							value={editContent}
							onChange={(e) => setEditContent(e.target.value)}
							fullWidth
							multiline
							rows={5}
						/>
						<TextField label="Tags (separados por coma)" value={editTags} onChange={(e) => setEditTags(e.target.value)} fullWidth />
						<TextField
							label="Notas internas (no visible para el usuario)"
							value={editNotes}
							onChange={(e) => setEditNotes(e.target.value)}
							fullWidth
							multiline
							rows={2}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={doEdit} disabled={busy}>
						Guardar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete */}
			<Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
				<DialogTitle>Eliminar feedback</DialogTitle>
				<DialogContent>
					<Typography>¿Eliminar este feedback permanentemente?</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						Esta acción no se puede deshacer.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={doDelete} disabled={busy}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Bulk status */}
			<Dialog open={bulkStatusOpen} onClose={() => setBulkStatusOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Cambiar estado masivo</DialogTitle>
				<DialogContent>
					<Typography sx={{ mb: 2 }}>
						Cambiar estado de <strong>{selectedIds.length}</strong> feedbacks:
					</Typography>
					<FormControl fullWidth size="small">
						<InputLabel>Nuevo estado</InputLabel>
						<Select value={bulkStatus} label="Nuevo estado" onChange={(e) => setBulkStatus(e.target.value as FeedbackStatus)}>
							<MenuItem value="pending">Pendiente</MenuItem>
							<MenuItem value="approved">Aprobado</MenuItem>
							<MenuItem value="published">Publicado</MenuItem>
							<MenuItem value="rejected">Rechazado</MenuItem>
							<MenuItem value="archived">Archivado</MenuItem>
						</Select>
					</FormControl>
					{bulkStatus === "published" && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							Cuidado: esta acción publica todos los seleccionados sin chequear el consentimiento individual.
						</Alert>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setBulkStatusOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={doBulkStatus} disabled={busy || !bulkStatus}>
						Aplicar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default FeedbackAdminPage;
