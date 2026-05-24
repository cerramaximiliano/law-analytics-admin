import { useState, useEffect, useCallback } from "react";
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
	Skeleton,
	Alert,
	InputAdornment,
	Divider,
} from "@mui/material";
import { Refresh, Trash, SearchNormal1, Filter, CloseCircle, Eye, Add, Copy, Forbidden2, Link21 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import FeedbackInvitesService, { FeedbackInvite, InviteFilters, InviteStatus, InviteType, InviteCreatePayload } from "api/feedbackInvites";
import SurveyAdminService, { Survey } from "api/surveys";

const STATUS_CONFIG: Record<InviteStatus, { color: "success" | "info" | "warning" | "error" | "default"; label: string }> = {
	active: { color: "success", label: "Activo" },
	used: { color: "info", label: "Usado" },
	expired: { color: "warning", label: "Expirado" },
	revoked: { color: "error", label: "Revocado" },
};

const TYPE_LABEL: Record<InviteType, string> = {
	comment: "Comentario",
	survey: "Encuesta",
};

const formatDate = (s?: string | null) => {
	if (!s) return "—";
	const d = new Date(s);
	return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
};

const FeedbackInvitesPage = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [items, setItems] = useState<FeedbackInvite[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	const [filterStatus, setFilterStatus] = useState<InviteStatus | "">("");
	const [filterType, setFilterType] = useState<InviteType | "">("");
	const [searchTerm, setSearchTerm] = useState("");

	const [createOpen, setCreateOpen] = useState(false);
	const [form, setForm] = useState<InviteCreatePayload>({
		type: "comment",
		expiresInDays: 7,
	});
	const [busy, setBusy] = useState(false);

	const [activeSurveys, setActiveSurveys] = useState<Survey[]>([]);

	const [showUrlDialog, setShowUrlDialog] = useState(false);
	const [newlyCreatedUrl, setNewlyCreatedUrl] = useState<string>("");

	const [detailOpen, setDetailOpen] = useState(false);
	const [selected, setSelected] = useState<FeedbackInvite | null>(null);

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [revokeOpen, setRevokeOpen] = useState(false);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const filters: InviteFilters = {
				page: page + 1,
				limit: rowsPerPage,
			};
			if (filterStatus) filters.status = filterStatus;
			if (filterType) filters.type = filterType;
			if (searchTerm) filters.search = searchTerm;
			const res = await FeedbackInvitesService.list(filters);
			if (res.success) {
				setItems(res.items);
				setTotal(res.total);
			}
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al listar invites", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, filterType, searchTerm, enqueueSnackbar]);

	// Cargar encuestas activas para el dropdown de creación
	const fetchSurveys = useCallback(async () => {
		try {
			const res = await SurveyAdminService.list({ status: "active", limit: 100 });
			if (res.success) setActiveSurveys(res.items);
		} catch {
			// silencioso
		}
	}, []);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	useEffect(() => {
		fetchSurveys();
	}, [fetchSurveys]);

	const handleClearFilters = () => {
		setFilterStatus("");
		setFilterType("");
		setSearchTerm("");
		setPage(0);
	};

	const openCreate = () => {
		setForm({ type: "comment", expiresInDays: 7 });
		setCreateOpen(true);
	};

	const handleCreate = async () => {
		if (!form.recipientName?.trim()) {
			enqueueSnackbar("Ingresá el nombre del destinatario", { variant: "warning" });
			return;
		}
		if (form.type === "survey" && !form.surveyId) {
			enqueueSnackbar("Seleccioná una encuesta", { variant: "warning" });
			return;
		}
		try {
			setBusy(true);
			const res = await FeedbackInvitesService.create(form);
			enqueueSnackbar("Invite creado", { variant: "success" });
			setCreateOpen(false);
			setNewlyCreatedUrl(res.url);
			setShowUrlDialog(true);
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e?.message || "Error al crear invite", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			enqueueSnackbar("URL copiada al portapapeles", { variant: "success" });
		} catch {
			enqueueSnackbar("No se pudo copiar — copialo manualmente", { variant: "warning" });
		}
	};

	const openDetail = async (it: FeedbackInvite) => {
		setSelected(it);
		setDetailOpen(true);
		try {
			const res = await FeedbackInvitesService.getById(it._id);
			if (res.success) setSelected(res.invite);
		} catch {
			// stale data ok
		}
	};

	const doRevoke = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackInvitesService.revoke(selected._id);
			enqueueSnackbar("Invite revocado", { variant: "success" });
			setRevokeOpen(false);
			setDetailOpen(false);
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al revocar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	const doDelete = async () => {
		if (!selected) return;
		try {
			setBusy(true);
			await FeedbackInvitesService.remove(selected._id);
			enqueueSnackbar("Invite eliminado", { variant: "success" });
			setDeleteOpen(false);
			setDetailOpen(false);
			fetchList();
		} catch (e: any) {
			enqueueSnackbar(e?.message || "Error al eliminar", { variant: "error" });
		} finally {
			setBusy(false);
		}
	};

	return (
		<MainCard
			title="Links de Invitación"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="contained" size="small" startIcon={<Add size={16} />} onClick={openCreate}>
						Generar link
					</Button>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={() => fetchList()}>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				<Alert severity="info" icon={<Link21 size={18} />}>
					Generá links únicos para que personas (usuarios o no) puedan dejar un comentario o responder una encuesta sin necesidad de cuenta.
					Cada link sirve para una sola respuesta y expira automáticamente.
				</Alert>

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
										setFilterStatus(e.target.value as InviteStatus | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="active">Activo</MenuItem>
									<MenuItem value="used">Usado</MenuItem>
									<MenuItem value="expired">Expirado</MenuItem>
									<MenuItem value="revoked">Revocado</MenuItem>
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
										setFilterType(e.target.value as InviteType | "");
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="comment">Comentario</MenuItem>
									<MenuItem value="survey">Encuesta</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={7}>
							<TextField
								fullWidth
								size="small"
								placeholder="Buscar por destinatario o mensaje..."
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
								<TableCell>Creado</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Encuesta</TableCell>
								<TableCell>Destinatario</TableCell>
								<TableCell>Expira</TableCell>
								<TableCell align="center">Estado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 7 }).map((__, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : items.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} align="center">
										<Alert severity="info" sx={{ justifyContent: "center" }}>
											No hay invites. Generá uno con el botón "Generar link".
										</Alert>
									</TableCell>
								</TableRow>
							) : (
								items.map((it) => (
									<TableRow key={it._id} hover>
										<TableCell>
											<Typography variant="body2">{formatDate(it.createdAt)}</Typography>
										</TableCell>
										<TableCell>
											<Chip label={TYPE_LABEL[it.type]} size="small" variant="outlined" />
										</TableCell>
										<TableCell>
											{typeof it.surveyId === "object" && it.surveyId ? (
												<Typography variant="body2">{it.surveyId.title}</Typography>
											) : (
												<Typography variant="caption" color="textSecondary">
													—
												</Typography>
											)}
										</TableCell>
										<TableCell>
											{it.recipientName || it.recipientEmail ? (
												<>
													<Typography variant="body2" fontWeight={500}>
														{it.recipientName || "—"}
													</Typography>
													<Typography variant="caption" color="textSecondary">
														{it.recipientEmail || ""}
													</Typography>
												</>
											) : (
												<Typography variant="caption" color="textSecondary">
													(genérico)
												</Typography>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="body2">{formatDate(it.expiresAt)}</Typography>
										</TableCell>
										<TableCell align="center">
											<Chip label={STATUS_CONFIG[it.status]?.label} size="small" color={STATUS_CONFIG[it.status]?.color} />
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Copiar URL">
													<IconButton size="small" color="primary" onClick={() => copyToClipboard(it.url)}>
														<Copy size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Ver detalle">
													<IconButton size="small" color="info" onClick={() => openDetail(it)}>
														<Eye size={16} />
													</IconButton>
												</Tooltip>
												{it.status === "active" && (
													<Tooltip title="Revocar">
														<IconButton
															size="small"
															color="warning"
															onClick={() => {
																setSelected(it);
																setRevokeOpen(true);
															}}
														>
															<Forbidden2 size={16} />
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
						onPageChange={(_, p) => setPage(p)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas por página:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</TableContainer>
			</Stack>

			{/* Create dialog */}
			<Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Generar link de invitación</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<FormControl fullWidth>
							<InputLabel>Tipo</InputLabel>
							<Select
								value={form.type}
								label="Tipo"
								onChange={(e) => setForm({ ...form, type: e.target.value as InviteType, surveyId: undefined })}
							>
								<MenuItem value="comment">Comentario libre</MenuItem>
								<MenuItem value="survey">Encuesta</MenuItem>
							</Select>
						</FormControl>

						{form.type === "survey" && (
							<FormControl fullWidth>
								<InputLabel>Encuesta activa</InputLabel>
								<Select
									value={form.surveyId || ""}
									label="Encuesta activa"
									onChange={(e) => setForm({ ...form, surveyId: e.target.value })}
								>
									{activeSurveys.length === 0 ? (
										<MenuItem disabled value="">
											No hay encuestas activas
										</MenuItem>
									) : (
										activeSurveys.map((s) => (
											<MenuItem key={s._id} value={s._id}>
												{s.title}
											</MenuItem>
										))
									)}
								</Select>
							</FormControl>
						)}

						<TextField
							fullWidth
							required
							label="Nombre del destinatario"
							value={form.recipientName || ""}
							onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
							error={!form.recipientName?.trim()}
							helperText={!form.recipientName?.trim() ? "Campo obligatorio" : "Solo informativo — no se envía email automático"}
						/>
						<TextField
							fullWidth
							label="Email del destinatario (opcional)"
							value={form.recipientEmail || ""}
							onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
						/>
						<TextField
							fullWidth
							multiline
							rows={3}
							label="Mensaje personalizado (opcional)"
							value={form.message || ""}
							onChange={(e) => setForm({ ...form, message: e.target.value })}
							helperText="Aparece en la landing del invite. Ej: 'Hola Juan, nos encantaría tu opinión sobre...'"
						/>
						<TextField
							fullWidth
							type="number"
							label="Expira en (días)"
							value={form.expiresInDays || 7}
							onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
							inputProps={{ min: 1, max: 365 }}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCreateOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={handleCreate} disabled={busy || !form.recipientName?.trim()}>
						{busy ? "Generando..." : "Generar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* URL display dialog after creation */}
			<Dialog open={showUrlDialog} onClose={() => setShowUrlDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Link generado</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={2}>
						<Alert severity="success">
							Compartí este link con el destinatario. Funciona <strong>una sola vez</strong> y expira automáticamente.
						</Alert>
						<TextField
							fullWidth
							value={newlyCreatedUrl}
							InputProps={{
								readOnly: true,
								endAdornment: (
									<InputAdornment position="end">
										<IconButton onClick={() => copyToClipboard(newlyCreatedUrl)}>
											<Copy size={18} />
										</IconButton>
									</InputAdornment>
								),
							}}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => copyToClipboard(newlyCreatedUrl)} startIcon={<Copy size={16} />}>
						Copiar
					</Button>
					<Button variant="contained" onClick={() => setShowUrlDialog(false)}>
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Detail dialog */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Detalle del invite</DialogTitle>
				<DialogContent dividers>
					{selected && (
						<Stack spacing={3}>
							<Paper variant="outlined" sx={{ p: 2 }}>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="textSecondary">
											Tipo
										</Typography>
										<Typography variant="body1">{TYPE_LABEL[selected.type]}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="caption" color="textSecondary">
											Estado
										</Typography>
										<Box mt={0.5}>
											<Chip label={STATUS_CONFIG[selected.status]?.label} size="small" color={STATUS_CONFIG[selected.status]?.color} />
										</Box>
									</Grid>
									<Grid item xs={12}>
										<Typography variant="caption" color="textSecondary">
											URL
										</Typography>
										<TextField
											fullWidth
											size="small"
											value={selected.url}
											InputProps={{
												readOnly: true,
												endAdornment: (
													<InputAdornment position="end">
														<IconButton size="small" onClick={() => copyToClipboard(selected.url)}>
															<Copy size={16} />
														</IconButton>
													</InputAdornment>
												),
											}}
										/>
									</Grid>
									{selected.recipientName && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="textSecondary">
												Destinatario
											</Typography>
											<Typography variant="body2">{selected.recipientName}</Typography>
										</Grid>
									)}
									{selected.recipientEmail && (
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="textSecondary">
												Email
											</Typography>
											<Typography variant="body2">{selected.recipientEmail}</Typography>
										</Grid>
									)}
									{selected.message && (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Mensaje
											</Typography>
											<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
												{selected.message}
											</Typography>
										</Grid>
									)}
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Creado
										</Typography>
										<Typography variant="body2">{formatDate(selected.createdAt)}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Expira
										</Typography>
										<Typography variant="body2">{formatDate(selected.expiresAt)}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="caption" color="textSecondary">
											Usos
										</Typography>
										<Typography variant="body2">
											{selected.usedCount} / {selected.maxUses}
										</Typography>
									</Grid>
									{selected.revokedAt && (
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="textSecondary">
												Revocado
											</Typography>
											<Typography variant="body2">{formatDate(selected.revokedAt)}</Typography>
										</Grid>
									)}
								</Grid>
							</Paper>

							{selected.uses && selected.uses.length > 0 && (
								<Box>
									<Divider sx={{ mb: 2 }} />
									<Typography variant="subtitle2" gutterBottom>
										Historial de uso
									</Typography>
									<Stack spacing={1}>
										{selected.uses.map((u, i) => (
											<Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
												<Typography variant="body2">
													<strong>{formatDate(u.usedAt)}</strong>
													{u.submittedBy?.name && ` · ${u.submittedBy.name}`}
													{u.submittedBy?.email && ` (${u.submittedBy.email})`}
												</Typography>
												{u.ip && (
													<Typography variant="caption" color="textSecondary">
														IP: {u.ip}
													</Typography>
												)}
												{typeof u.feedbackId === "object" && u.feedbackId && (
													<Typography variant="caption" display="block">
														Feedback: <em>{u.feedbackId.title || (u.feedbackId.content || "").slice(0, 80)}</em>
													</Typography>
												)}
											</Paper>
										))}
									</Stack>
								</Box>
							)}
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
					{selected?.status === "active" && (
						<Button color="warning" onClick={() => setRevokeOpen(true)}>
							Revocar
						</Button>
					)}
					<Button color="error" onClick={() => setDeleteOpen(true)}>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Revoke */}
			<Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)}>
				<DialogTitle>Revocar invite</DialogTitle>
				<DialogContent>
					<Typography>El link dejará de funcionar inmediatamente. ¿Confirmás?</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setRevokeOpen(false)} disabled={busy}>
						Cancelar
					</Button>
					<Button variant="contained" color="warning" onClick={doRevoke} disabled={busy}>
						Revocar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete */}
			<Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
				<DialogTitle>Eliminar invite</DialogTitle>
				<DialogContent>
					<Typography>¿Eliminar este invite? El feedback asociado (si lo hay) no se borra.</Typography>
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
		</MainCard>
	);
};

export default FeedbackInvitesPage;
