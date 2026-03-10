import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import { Refresh, Trash, SearchNormal1, Eye, Play, Pause, Send2, Add, CloseCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import ScraperService, { PostalTracking, PostalTrackingStats, PostalTrackingFilters } from "api/scraperService";
import dayjs from "dayjs";

const PROCESSING_STATUS_CONFIG: Record<string, { color: "default" | "warning" | "info" | "success" | "error"; label: string }> = {
	pending: { color: "warning", label: "Pendiente" },
	active: { color: "info", label: "Activo" },
	paused: { color: "default", label: "Pausado" },
	completed: { color: "success", label: "Completado" },
	error: { color: "error", label: "Error" },
};

const formatDate = (dateString?: string) => {
	if (!dateString) return "-";
	return dayjs(dateString).format("DD/MM/YYYY HH:mm");
};

const PostalTrackingPage = () => {
	const { enqueueSnackbar } = useSnackbar();

	// List state
	const [trackings, setTrackings] = useState<PostalTracking[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	// Stats
	const [stats, setStats] = useState<PostalTrackingStats | null>(null);
	const [loadingStats, setLoadingStats] = useState(true);

	// Filters
	const [filterProcessingStatus, setFilterProcessingStatus] = useState("");
	const [filterCodeId, setFilterCodeId] = useState("");
	const [searchTerm, setSearchTerm] = useState("");

	// Detail dialog
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailTracking, setDetailTracking] = useState<PostalTracking | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Create dialog
	const [createOpen, setCreateOpen] = useState(false);
	const [newCodeId, setNewCodeId] = useState("CD");
	const [newNumberId, setNewNumberId] = useState("");
	const [newLabel, setNewLabel] = useState("");
	const [creating, setCreating] = useState(false);

	// Delete dialog
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [trackingToDelete, setTrackingToDelete] = useState<PostalTracking | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Action loading states
	const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

	const fetchTrackings = useCallback(async () => {
		try {
			setLoading(true);
			const filters: PostalTrackingFilters = {
				page: page + 1,
				limit: rowsPerPage,
			};
			if (filterProcessingStatus) filters.processingStatus = filterProcessingStatus;
			if (filterCodeId) filters.codeId = filterCodeId;
			if (searchTerm) filters.search = searchTerm;

			const response = await ScraperService.getPostalTrackings(filters);
			setTrackings(response.data);
			setTotal((response as any).count || response.pagination?.total || 0);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar los seguimientos postales", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterProcessingStatus, filterCodeId, searchTerm, enqueueSnackbar]);

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const response = await ScraperService.getPostalTrackingStats();
			setStats(response.data);
		} catch (error: any) {
			console.error("Error fetching stats:", error);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchTrackings();
	}, [fetchTrackings]);

	const handleOpenDetail = async (tracking: PostalTracking) => {
		try {
			setLoadingDetail(true);
			setDetailOpen(true);
			const response = await ScraperService.getPostalTrackingById(tracking._id);
			setDetailTracking(response.data);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar el detalle", { variant: "error" });
			setDetailOpen(false);
		} finally {
			setLoadingDetail(false);
		}
	};

	const handleEnqueue = async (id: string) => {
		try {
			setActionLoadingId(id);
			await ScraperService.enqueuePostalTracking(id);
			enqueueSnackbar("Seguimiento encolado para procesamiento inmediato", { variant: "success" });
			fetchTrackings();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al encolar el seguimiento", { variant: "error" });
		} finally {
			setActionLoadingId(null);
		}
	};

	const handlePause = async (id: string) => {
		try {
			setActionLoadingId(id);
			await ScraperService.pausePostalTracking(id);
			enqueueSnackbar("Seguimiento pausado", { variant: "success" });
			fetchTrackings();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al pausar el seguimiento", { variant: "error" });
		} finally {
			setActionLoadingId(null);
		}
	};

	const handleResume = async (id: string) => {
		try {
			setActionLoadingId(id);
			await ScraperService.resumePostalTracking(id);
			enqueueSnackbar("Seguimiento reanudado", { variant: "success" });
			fetchTrackings();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al reanudar el seguimiento", { variant: "error" });
		} finally {
			setActionLoadingId(null);
		}
	};

	const handleCreate = async () => {
		if (!newNumberId.trim()) {
			enqueueSnackbar("El numero de envio es requerido", { variant: "warning" });
			return;
		}
		try {
			setCreating(true);
			await ScraperService.createPostalTracking({
				codeId: newCodeId,
				numberId: newNumberId.trim(),
				...(newLabel.trim() && { label: newLabel.trim() }),
			});
			enqueueSnackbar("Seguimiento postal creado exitosamente", { variant: "success" });
			setCreateOpen(false);
			setNewNumberId("");
			setNewLabel("");
			fetchTrackings();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al crear el seguimiento postal", { variant: "error" });
		} finally {
			setCreating(false);
		}
	};

	const handleDeleteClick = (tracking: PostalTracking) => {
		setTrackingToDelete(tracking);
		setDeleteOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!trackingToDelete) return;
		try {
			setDeleting(true);
			await ScraperService.deletePostalTracking(trackingToDelete._id);
			enqueueSnackbar("Seguimiento postal eliminado", { variant: "success" });
			setDeleteOpen(false);
			setTrackingToDelete(null);
			fetchTrackings();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al eliminar el seguimiento postal", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	const handleClearFilters = () => {
		setFilterProcessingStatus("");
		setFilterCodeId("");
		setSearchTerm("");
		setPage(0);
	};

	return (
		<MainCard
			title="Seguimientos Postales"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="contained" size="small" startIcon={<Add size={16} />} onClick={() => setCreateOpen(true)}>
						Nuevo Seguimiento
					</Button>
					<Button
						variant="outlined"
						size="small"
						startIcon={<Refresh size={16} />}
						onClick={() => {
							fetchTrackings();
							fetchStats();
						}}
					>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Stats Cards */}
				<Grid container spacing={2}>
					<Grid item xs={6} sm={3}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									Total
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={50} height={36} />
								) : (
									<Typography variant="h4" color="primary.main">
										{stats?.metrics?.total ?? 0}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									Con Errores
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={50} height={36} />
								) : (
									<Typography variant="h4" color="error.main">
										{stats?.metrics?.withErrors ?? 0}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									Estado Final
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={50} height={36} />
								) : (
									<Typography variant="h4" color="success.main">
										{stats?.metrics?.finalStatuses ?? 0}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={6} sm={3}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									Actualizados hoy
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={50} height={36} />
								) : (
									<Typography variant="h4" color="info.main">
										{stats?.recentlyUpdatedToday ?? 0}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Filters */}
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={3}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado de Procesamiento</InputLabel>
								<Select
									value={filterProcessingStatus}
									label="Estado de Procesamiento"
									onChange={(e) => {
										setFilterProcessingStatus(e.target.value);
										setPage(0);
									}}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="pending">Pendiente</MenuItem>
									<MenuItem value="active">Activo</MenuItem>
									<MenuItem value="paused">Pausado</MenuItem>
									<MenuItem value="completed">Completado</MenuItem>
									<MenuItem value="error">Error</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<TextField
								fullWidth
								size="small"
								label="Codigo (ej: CD, CP)"
								value={filterCodeId}
								onChange={(e) => {
									setFilterCodeId(e.target.value.toUpperCase());
									setPage(0);
								}}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>
							<TextField
								fullWidth
								size="small"
								placeholder="Buscar por numero, estado..."
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

				{/* Table */}
				<TableContainer component={Paper} variant="outlined">
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Codigo / Numero</TableCell>
								<TableCell>Etiqueta</TableCell>
								<TableCell align="center">Estado proceso</TableCell>
								<TableCell>Estado rastreo</TableCell>
								<TableCell align="center">Errores</TableCell>
								<TableCell>Proximo check</TableCell>
								<TableCell>Actualizado</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{loading ? (
								Array.from({ length: 5 }).map((_, i) => (
									<TableRow key={i}>
										{Array.from({ length: 8 }).map((_, j) => (
											<TableCell key={j}>
												<Skeleton variant="text" />
											</TableCell>
										))}
									</TableRow>
								))
							) : trackings.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} align="center">
										<Alert severity="info" sx={{ justifyContent: "center" }}>
											No se encontraron seguimientos postales
										</Alert>
									</TableCell>
								</TableRow>
							) : (
								trackings.map((tracking) => (
									<TableRow key={tracking._id} hover>
										<TableCell>
											<Stack>
												<Typography variant="body2" fontWeight={500} fontFamily="monospace">
													{tracking.codeId} {tracking.numberId}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												{tracking.label || "-"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
												<Chip
													label={PROCESSING_STATUS_CONFIG[tracking.processingStatus]?.label || tracking.processingStatus}
													size="small"
													color={PROCESSING_STATUS_CONFIG[tracking.processingStatus]?.color || "default"}
												/>
												{tracking.isFinalStatus && <Chip label="Final" size="small" color="success" variant="outlined" />}
											</Stack>
										</TableCell>
										<TableCell>
											<Typography
												variant="body2"
												color="textSecondary"
												sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
												title={tracking.trackingStatus}
											>
												{tracking.trackingStatus || "-"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											{tracking.consecutiveErrors > 0 ? (
												<Chip label={tracking.consecutiveErrors} size="small" color="error" variant="outlined" />
											) : (
												<Typography variant="body2" color="textSecondary">
													0
												</Typography>
											)}
										</TableCell>
										<TableCell>
											<Typography variant="body2" fontSize="0.75rem" color="textSecondary">
												{formatDate(tracking.nextCheckAt)}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2" fontSize="0.75rem" color="textSecondary">
												{formatDate(tracking.updatedAt)}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Ver historial">
													<IconButton size="small" color="info" onClick={() => handleOpenDetail(tracking)}>
														<Eye size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Procesar ahora">
													<IconButton
														size="small"
														color="success"
														disabled={actionLoadingId === tracking._id || tracking.processingStatus === "paused"}
														onClick={() => handleEnqueue(tracking._id)}
													>
														<Send2 size={16} />
													</IconButton>
												</Tooltip>
												{tracking.processingStatus === "paused" ? (
													<Tooltip title="Reanudar">
														<IconButton
															size="small"
															color="primary"
															disabled={actionLoadingId === tracking._id}
															onClick={() => handleResume(tracking._id)}
														>
															<Play size={16} />
														</IconButton>
													</Tooltip>
												) : (
													<Tooltip title="Pausar">
														<IconButton
															size="small"
															color="warning"
															disabled={actionLoadingId === tracking._id || tracking.isFinalStatus}
															onClick={() => handlePause(tracking._id)}
														>
															<Pause size={16} />
														</IconButton>
													</Tooltip>
												)}
												<Tooltip title="Eliminar">
													<IconButton size="small" color="error" onClick={() => handleDeleteClick(tracking)}>
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
						onPageChange={(_, newPage) => setPage(newPage)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 20, 50, 100]}
						labelRowsPerPage="Filas por pagina:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</TableContainer>
			</Stack>

			{/* Detail Dialog */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>{detailTracking ? `${detailTracking.codeId} ${detailTracking.numberId}` : "Detalle del Seguimiento"}</DialogTitle>
				<DialogContent dividers>
					{loadingDetail ? (
						<Stack spacing={2}>
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} variant="rectangular" height={48} />
							))}
						</Stack>
					) : detailTracking ? (
						<Stack spacing={3}>
							{/* Info */}
							<Grid container spacing={2}>
								<Grid item xs={6} sm={3}>
									<Typography variant="caption" color="textSecondary">
										Codigo
									</Typography>
									<Typography variant="body1" fontWeight={600} fontFamily="monospace">
										{detailTracking.codeId}
									</Typography>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="caption" color="textSecondary">
										Numero
									</Typography>
									<Typography variant="body1" fontWeight={600} fontFamily="monospace">
										{detailTracking.numberId}
									</Typography>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="caption" color="textSecondary">
										Estado proceso
									</Typography>
									<Box mt={0.5}>
										<Chip
											label={PROCESSING_STATUS_CONFIG[detailTracking.processingStatus]?.label}
											size="small"
											color={PROCESSING_STATUS_CONFIG[detailTracking.processingStatus]?.color || "default"}
										/>
									</Box>
								</Grid>
								<Grid item xs={6} sm={3}>
									<Typography variant="caption" color="textSecondary">
										Errores consecutivos
									</Typography>
									<Typography variant="body1" color={detailTracking.consecutiveErrors > 0 ? "error.main" : "textPrimary"}>
										{detailTracking.consecutiveErrors}
									</Typography>
								</Grid>
								{detailTracking.trackingStatus && (
									<Grid item xs={12}>
										<Typography variant="caption" color="textSecondary">
											Estado de rastreo
										</Typography>
										<Typography variant="body2">{detailTracking.trackingStatus}</Typography>
									</Grid>
								)}
								{detailTracking.lastError && (
									<Grid item xs={12}>
										<Alert severity="error">{detailTracking.lastError}</Alert>
									</Grid>
								)}
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										Ultimo check
									</Typography>
									<Typography variant="body2">{formatDate(detailTracking.lastCheckedAt)}</Typography>
								</Grid>
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										Proximo check
									</Typography>
									<Typography variant="body2">{formatDate(detailTracking.nextCheckAt)}</Typography>
								</Grid>
							</Grid>

							{/* History */}
							<Box>
								<Typography variant="subtitle2" mb={1}>
									Historial ({detailTracking.history?.length || 0} eventos)
								</Typography>
								{detailTracking.history && detailTracking.history.length > 0 ? (
									<Stack spacing={1}>
										{[...detailTracking.history].reverse().map((event, index) => (
											<Paper key={index} variant="outlined" sx={{ p: 1.5 }}>
												<Stack direction="row" spacing={2} alignItems="flex-start">
													<Box flex={1}>
														<Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
															<Chip label={event.status} size="small" variant="outlined" color="primary" />
															{event.location && (
																<Typography variant="caption" color="textSecondary">
																	📍 {event.location}
																</Typography>
															)}
														</Stack>
														{event.description && (
															<Typography variant="body2" color="textSecondary">
																{event.description}
															</Typography>
														)}
													</Box>
													<Stack alignItems="flex-end">
														{event.eventDate && (
															<Typography variant="caption" color="textSecondary">
																{formatDate(event.eventDate)}
															</Typography>
														)}
														<Typography variant="caption" color="textSecondary" fontSize="0.65rem">
															Scrapeado: {formatDate(event.scrapedAt)}
														</Typography>
													</Stack>
												</Stack>
											</Paper>
										))}
									</Stack>
								) : (
									<Alert severity="info">No hay eventos en el historial</Alert>
								)}
							</Box>
						</Stack>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
					{detailTracking && (
						<Button
							variant="outlined"
							color="success"
							startIcon={<Send2 size={16} />}
							onClick={() => {
								setDetailOpen(false);
								handleEnqueue(detailTracking._id);
							}}
						>
							Procesar ahora
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* Create Dialog */}
			<Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Nuevo Seguimiento Postal</DialogTitle>
				<DialogContent dividers>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							fullWidth
							size="small"
							label="Codigo de servicio (ej: CD, CP, AR)"
							value={newCodeId}
							onChange={(e) => setNewCodeId(e.target.value.toUpperCase())}
							helperText="Codigo del tipo de envio de Correo Argentino"
						/>
						<TextField
							fullWidth
							size="small"
							label="Numero de envio (9 digitos)"
							value={newNumberId}
							onChange={(e) => setNewNumberId(e.target.value.replace(/\D/g, "").slice(0, 9))}
							helperText="Solo numeros, exactamente 9 digitos"
							inputProps={{ maxLength: 9 }}
						/>
						<TextField
							fullWidth
							size="small"
							label="Etiqueta (opcional)"
							value={newLabel}
							onChange={(e) => setNewLabel(e.target.value)}
							placeholder="Descripcion para identificar el envio"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCreateOpen(false)} disabled={creating}>
						Cancelar
					</Button>
					<Button variant="contained" onClick={handleCreate} disabled={creating || !newCodeId.trim() || newNumberId.length !== 9}>
						{creating ? "Creando..." : "Crear"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Dialog */}
			<Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
				<DialogTitle>Confirmar Eliminacion</DialogTitle>
				<DialogContent>
					<Typography>Estas seguro de que queres eliminar este seguimiento postal?</Typography>
					{trackingToDelete && (
						<Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
							<Typography variant="body2" fontFamily="monospace">
								{trackingToDelete.codeId} {trackingToDelete.numberId}
							</Typography>
							{trackingToDelete.label && (
								<Typography variant="body2" color="textSecondary">
									{trackingToDelete.label}
								</Typography>
							)}
						</Box>
					)}
					<Alert severity="warning" sx={{ mt: 2 }}>
						Se eliminara tambien todo el historial de rastreo.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting}>
						{deleting ? "Eliminando..." : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default PostalTrackingPage;
