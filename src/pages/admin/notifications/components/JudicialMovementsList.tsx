import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Paper,
	Chip,
	IconButton,
	Tooltip,
	Typography,
	Stack,
	TextField,
	Grid,
	MenuItem,
	Button,
	Card,
	CardContent,
	Collapse,
	CircularProgress,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
} from "@mui/material";
import {
	RefreshSquare,
	Eye,
	Trash,
	FilterSearch,
	Calendar,
	User,
	DocumentText,
	NotificationBing,
	ArrowDown2,
	ArrowUp2,
	InfoCircle,
	Clock,
} from "iconsax-react";
import dayjs from "utils/dayjs-config";
import judicialMovementsService, {
	JudicialMovement,
	JudicialMovementFilters,
	JudicialMovementStats,
} from "services/judicialMovementsService";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";

const JudicialMovementsList = () => {
	const [movements, setMovements] = useState<JudicialMovement[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalItems, setTotalItems] = useState(0);
	const [stats, setStats] = useState<JudicialMovementStats | null>(null);
	const [expandedRow, setExpandedRow] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(false);
	const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; movementId: string | null; movementInfo: any }>({
		open: false,
		movementId: null,
		movementInfo: null,
	});
	const [showRetentionInfo, setShowRetentionInfo] = useState(false);

	// Filters state
	const [filters, setFilters] = useState<JudicialMovementFilters>({
		notificationStatus: undefined,
		movementDateFrom: "",
		movementDateTo: "",
		notifyAtFrom: "",
		notifyAtTo: "",
		fuero: "",
		movementType: "",
		sortBy: "createdAt",
		sortOrder: "desc",
	});

	const fetchMovements = useCallback(async () => {
		setLoading(true);
		try {
			const response = await judicialMovementsService.getMovements({
				...filters,
				page: page + 1,
				limit: rowsPerPage,
			});

			if (response.success) {
				setMovements(response.data.movements);
				setTotalItems(response.data.pagination.totalItems);
				setStats(response.data.stats);
			}
		} catch (error: any) {
			dispatch(
				openSnackbar({
					open: true,
					message: "Error al cargar los movimientos judiciales",
					variant: "error",
					alert: { color: "error" },
					close: false,
				}),
			);
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filters]);

	useEffect(() => {
		fetchMovements();
	}, [fetchMovements]);

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleFilterChange =
		(field: keyof JudicialMovementFilters) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			setFilters((prev) => ({
				...prev,
				[field]: event.target.value,
			}));
		};

	const handleApplyFilters = () => {
		setPage(0);
		fetchMovements();
	};

	const handleClearFilters = () => {
		setFilters({
			notificationStatus: undefined,
			movementDateFrom: "",
			movementDateTo: "",
			notifyAtFrom: "",
			notifyAtTo: "",
			fuero: "",
			movementType: "",
			sortBy: "createdAt",
			sortOrder: "desc",
		});
		setPage(0);
	};

	const handleRetryNotification = async (id: string) => {
		try {
			await judicialMovementsService.retryNotification(id);
			dispatch(
				openSnackbar({
					open: true,
					message: "Notificación reenviada exitosamente",
					variant: "success",
					alert: { color: "success" },
					close: false,
				}),
			);
			fetchMovements();
		} catch (error) {
			dispatch(
				openSnackbar({
					open: true,
					message: "Error al reenviar la notificación",
					variant: "error",
					alert: { color: "error" },
					close: false,
				}),
			);
		}
	};

	const handleOpenDeleteDialog = (movement: JudicialMovement) => {
		setDeleteDialog({
			open: true,
			movementId: movement._id,
			movementInfo: {
				expediente: `${movement.expediente?.number || "-"}/${movement.expediente?.year || "-"}`,
				movimiento: movement.movimiento?.tipo || "-",
				status: movement.notificationStatus,
			},
		});
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialog({ open: false, movementId: null, movementInfo: null });
	};

	const handleConfirmDelete = async () => {
		if (!deleteDialog.movementId) return;

		try {
			const response = await judicialMovementsService.deleteMovement(deleteDialog.movementId);
			dispatch(
				openSnackbar({
					open: true,
					message: "Movimiento judicial eliminado exitosamente",
					variant: "success",
					alert: { color: "success" },
					close: false,
				}),
			);
			handleCloseDeleteDialog();
			fetchMovements();
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || "Error al eliminar el movimiento judicial";
			dispatch(
				openSnackbar({
					open: true,
					message: errorMessage,
					variant: "error",
					alert: { color: "error" },
					close: false,
				}),
			);
			handleCloseDeleteDialog();
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "pending":
				return "warning";
			case "sent":
				return "success";
			case "failed":
				return "error";
			default:
				return "default";
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case "pending":
				return "Pendiente";
			case "sent":
				return "Enviado";
			case "failed":
				return "Fallido";
			default:
				return status;
		}
	};

	const formatDate = (date: string) => {
		if (!date) return "-";
		return dayjs(date).format("DD/MM/YYYY HH:mm");
	};

	return (
		<Box>
			{/* Stats Cards */}
			{stats && (
				<Grid container spacing={2} sx={{ mb: 3 }}>
					<Grid item xs={12} sm={4}>
						<Card>
							<CardContent>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Box>
										<Typography color="text.secondary" variant="caption">
											Pendientes
										</Typography>
										<Typography variant="h4">{stats.totalPending}</Typography>
									</Box>
									<NotificationBing size={32} color="#fa8c16" />
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={4}>
						<Card>
							<CardContent>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Box>
										<Typography color="text.secondary" variant="caption">
											Enviados
										</Typography>
										<Typography variant="h4">{stats.totalSent}</Typography>
									</Box>
									<NotificationBing size={32} color="#52c41a" />
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={4}>
						<Card>
							<CardContent>
								<Stack direction="row" alignItems="center" justifyContent="space-between">
									<Box>
										<Typography color="text.secondary" variant="caption">
											Fallidos
										</Typography>
										<Typography variant="h4">{stats.totalFailed}</Typography>
									</Box>
									<NotificationBing size={32} color="#ff4d4f" />
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			)}

			{/* Información de Retención */}
			<Box sx={{ mb: 3 }}>
				<Button
					startIcon={<InfoCircle />}
					onClick={() => setShowRetentionInfo(!showRetentionInfo)}
					variant="text"
					color="info"
					sx={{ mb: 1 }}
				>
					{showRetentionInfo ? "Ocultar Información de Retención" : "Ver Información de Retención"}
				</Button>

				<Collapse in={showRetentionInfo}>
					<Paper sx={{ p: 3, backgroundColor: "action.hover" }}>
						<Stack spacing={2}>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Clock size={24} color="#1890ff" />
								<Typography variant="h6" color="primary">
									Política de Retención de Movimientos Judiciales
								</Typography>
							</Stack>

							<Grid container spacing={2}>
								<Grid item xs={12} md={6}>
									<Box>
										<Typography variant="subtitle2" gutterBottom fontWeight="bold">
											Duración de Retención
										</Typography>
										<Stack spacing={1}>
											<Typography variant="body2">
												• <strong>Período actual:</strong> 60 días (configurable)
											</Typography>
											<Typography variant="body2">
												• <strong>Variable de entorno:</strong> JUDICIAL_MOVEMENT_RETENTION_DAYS
											</Typography>
											<Typography variant="body2" color="text.secondary">
												• <strong>Proceso automático:</strong> Limpieza diaria de registros antiguos
											</Typography>
										</Stack>
									</Box>
								</Grid>

								<Grid item xs={12} md={6}>
									<Box>
										<Typography variant="subtitle2" gutterBottom fontWeight="bold">
											Condiciones de Eliminación Automática
										</Typography>
										<Stack spacing={1}>
											<Typography variant="body2">Los movimientos se eliminan cuando:</Typography>
											<Typography variant="body2" color="success.main">
												✓ Estado = "Enviado" (sent)
											</Typography>
											<Typography variant="body2" color="success.main">
												✓ Han pasado más de 60 días desde la última actualización
											</Typography>
										</Stack>
									</Box>
								</Grid>

								<Grid item xs={12}>
									<Alert severity="info" icon={<InfoCircle />}>
										<Typography variant="body2" paragraph>
											<strong>Movimientos que NO se eliminan automáticamente:</strong>
										</Typography>
										<Stack spacing={0.5}>
											<Typography variant="body2">
												• Movimientos con estado <Chip label="Pendiente" size="small" color="warning" /> - Se conservan hasta ser procesados
											</Typography>
											<Typography variant="body2">
												• Movimientos con estado <Chip label="Fallido" size="small" color="error" /> - Se conservan para reintentar o
												revisar
											</Typography>
											<Typography variant="body2">• Movimientos actualizados en los últimos 60 días (independiente del estado)</Typography>
										</Stack>
									</Alert>
								</Grid>

								<Grid item xs={12}>
									<Box sx={{ p: 2, backgroundColor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
										<Typography variant="caption" color="text.secondary">
											<strong>Nota para administradores:</strong> Para modificar el período de retención, establezca la variable de entorno
											JUDICIAL_MOVEMENT_RETENTION_DAYS con el número de días deseado (ej: 90 para 90 días). Los movimientos pendientes o
											fallidos se conservan indefinidamente hasta ser procesados exitosamente o eliminados manualmente.
										</Typography>
									</Box>
								</Grid>
							</Grid>
						</Stack>
					</Paper>
				</Collapse>
			</Box>

			{/* Filters */}
			<Box sx={{ mb: 2 }}>
				<Button startIcon={<FilterSearch />} onClick={() => setShowFilters(!showFilters)} variant="outlined" sx={{ mb: 2 }}>
					{showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
				</Button>

				<Collapse in={showFilters}>
					<Paper sx={{ p: 2, mb: 2 }}>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									select
									fullWidth
									label="Estado"
									value={filters.notificationStatus || ""}
									onChange={handleFilterChange("notificationStatus")}
									size="small"
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="pending">Pendiente</MenuItem>
									<MenuItem value="sent">Enviado</MenuItem>
									<MenuItem value="failed">Fallido</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Fecha Movimiento Desde"
									type="date"
									value={filters.movementDateFrom}
									onChange={handleFilterChange("movementDateFrom")}
									InputLabelProps={{ shrink: true }}
									size="small"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Fecha Movimiento Hasta"
									type="date"
									value={filters.movementDateTo}
									onChange={handleFilterChange("movementDateTo")}
									InputLabelProps={{ shrink: true }}
									size="small"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField fullWidth label="Fuero" value={filters.fuero} onChange={handleFilterChange("fuero")} size="small" />
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									label="Tipo de Movimiento"
									value={filters.movementType}
									onChange={handleFilterChange("movementType")}
									size="small"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField select fullWidth label="Ordenar por" value={filters.sortBy} onChange={handleFilterChange("sortBy")} size="small">
									<MenuItem value="createdAt">Fecha de Creación</MenuItem>
									<MenuItem value="movementDate">Fecha del Movimiento</MenuItem>
									<MenuItem value="notifyAt">Fecha de Notificación</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField select fullWidth label="Orden" value={filters.sortOrder} onChange={handleFilterChange("sortOrder")} size="small">
									<MenuItem value="desc">Descendente</MenuItem>
									<MenuItem value="asc">Ascendente</MenuItem>
								</TextField>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack direction="row" spacing={1}>
									<Button fullWidth variant="contained" onClick={handleApplyFilters} startIcon={<FilterSearch />}>
										Aplicar
									</Button>
									<Button fullWidth variant="outlined" onClick={handleClearFilters}>
										Limpiar
									</Button>
								</Stack>
							</Grid>
						</Grid>
					</Paper>
				</Collapse>
			</Box>

			{/* Table */}
			<TableContainer component={Paper}>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
						<CircularProgress />
					</Box>
				) : movements.length === 0 ? (
					<Box sx={{ p: 3 }}>
						<Alert severity="info">No se encontraron movimientos judiciales</Alert>
					</Box>
				) : (
					<Table>
						<TableHead>
							<TableRow>
								<TableCell />
								<TableCell>Usuario</TableCell>
								<TableCell>Expediente</TableCell>
								<TableCell>Movimiento</TableCell>
								<TableCell>Fecha Movimiento</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell>Notificar en</TableCell>
								<TableCell align="right">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{movements.map((movement) => (
								<React.Fragment key={movement._id}>
									<TableRow hover>
										<TableCell>
											<IconButton size="small" onClick={() => setExpandedRow(expandedRow === movement._id ? null : movement._id)}>
												{expandedRow === movement._id ? <ArrowUp2 /> : <ArrowDown2 />}
											</IconButton>
										</TableCell>
										<TableCell>
											<Stack>
												<Typography variant="body2" fontWeight="medium">
													{movement.userId?.name || "Usuario desconocido"}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{movement.userId?.email || "-"}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell>
											<Stack>
												<Typography variant="body2" fontWeight="medium">
													{movement.expediente?.number || "-"}/{movement.expediente?.year || "-"}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{movement.expediente?.fuero || "-"}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell>
											<Stack>
												<Typography variant="body2" fontWeight="medium">
													{movement.movimiento?.tipo || "-"}
												</Typography>
												<Typography
													variant="caption"
													color="text.secondary"
													sx={{
														display: "-webkit-box",
														WebkitLineClamp: 2,
														WebkitBoxOrient: "vertical",
														overflow: "hidden",
													}}
												>
													{movement.movimiento?.detalle || "-"}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell>{formatDate(movement.movimiento?.fecha || "")}</TableCell>
										<TableCell>
											<Chip
												label={getStatusLabel(movement.notificationStatus)}
												color={getStatusColor(movement.notificationStatus)}
												size="small"
											/>
										</TableCell>
										<TableCell>{formatDate(movement.notificationSettings?.notifyAt || "")}</TableCell>
										<TableCell align="right">
											<Stack direction="row" spacing={1} justifyContent="flex-end">
												{movement.notificationStatus === "failed" && (
													<Tooltip title="Reintentar notificación">
														<IconButton size="small" onClick={() => handleRetryNotification(movement._id)}>
															<RefreshSquare size={18} />
														</IconButton>
													</Tooltip>
												)}
												{movement.movimiento?.url && (
													<Tooltip title="Ver en sistema judicial">
														<IconButton size="small" component="a" href={movement.movimiento.url} target="_blank" rel="noopener noreferrer">
															<Eye size={18} />
														</IconButton>
													</Tooltip>
												)}
												<Tooltip title="Eliminar">
													<IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(movement)}>
														<Trash size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
											<Collapse in={expandedRow === movement._id} timeout="auto" unmountOnExit>
												<Box sx={{ margin: 2 }}>
													<Typography variant="h6" gutterBottom>
														Detalles del Movimiento
													</Typography>
													<Grid container spacing={2}>
														<Grid item xs={12} md={6}>
															<Paper sx={{ p: 2 }}>
																<Typography variant="subtitle2" color="text.secondary" gutterBottom>
																	Expediente
																</Typography>
																<Stack spacing={1}>
																	<Typography variant="body2">
																		<strong>Carátula:</strong> {movement.expediente.caratula}
																	</Typography>
																	<Typography variant="body2">
																		<strong>Objeto:</strong> {movement.expediente.objeto}
																	</Typography>
																	<Typography variant="body2">
																		<strong>ID:</strong> {movement.expediente.id}
																	</Typography>
																</Stack>
															</Paper>
														</Grid>
														<Grid item xs={12} md={6}>
															<Paper sx={{ p: 2 }}>
																<Typography variant="subtitle2" color="text.secondary" gutterBottom>
																	Configuración de Notificación
																</Typography>
																<Stack spacing={1}>
																	<Typography variant="body2">
																		<strong>Canales:</strong> {movement.notificationSettings.channels.join(", ")}
																	</Typography>
																	<Typography variant="body2">
																		<strong>Creado:</strong> {formatDate(movement.createdAt)}
																	</Typography>
																	<Typography variant="body2">
																		<strong>Actualizado:</strong> {formatDate(movement.updatedAt)}
																	</Typography>
																</Stack>
															</Paper>
														</Grid>
														{movement.notifications.length > 0 && (
															<Grid item xs={12}>
																<Paper sx={{ p: 2 }}>
																	<Typography variant="subtitle2" color="text.secondary" gutterBottom>
																		Historial de Notificaciones
																	</Typography>
																	<Table size="small">
																		<TableHead>
																			<TableRow>
																				<TableCell>Fecha</TableCell>
																				<TableCell>Tipo</TableCell>
																				<TableCell>Estado</TableCell>
																				<TableCell>Detalles</TableCell>
																			</TableRow>
																		</TableHead>
																		<TableBody>
																			{movement.notifications?.map((notif, index) => (
																				<TableRow key={index}>
																					<TableCell>{formatDate(notif.date)}</TableCell>
																					<TableCell>{notif.type}</TableCell>
																					<TableCell>
																						<Chip
																							label={notif.success ? "Exitoso" : "Fallido"}
																							color={notif.success ? "success" : "error"}
																							size="small"
																						/>
																					</TableCell>
																					<TableCell>{notif.details}</TableCell>
																				</TableRow>
																			))}
																		</TableBody>
																	</Table>
																</Paper>
															</Grid>
														)}
													</Grid>
												</Box>
											</Collapse>
										</TableCell>
									</TableRow>
								</React.Fragment>
							))}
						</TableBody>
					</Table>
				)}
				<TablePagination
					rowsPerPageOptions={[5, 10, 25, 50]}
					component="div"
					count={totalItems}
					rowsPerPage={rowsPerPage}
					page={page}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					labelRowsPerPage="Filas por página"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
				/>
			</TableContainer>

			{/* Dialog de confirmación para eliminar */}
			<Dialog open={deleteDialog.open} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
				<DialogTitle>Confirmar Eliminación</DialogTitle>
				<DialogContent>
					<DialogContentText>
						<Typography variant="body1" paragraph>
							¿Está seguro que desea eliminar este movimiento judicial?
						</Typography>
						{deleteDialog.movementInfo && (
							<Box sx={{ mb: 2 }}>
								<Typography variant="body2" color="text.secondary">
									<strong>Expediente:</strong> {deleteDialog.movementInfo.expediente}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									<strong>Tipo de Movimiento:</strong> {deleteDialog.movementInfo.movimiento}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									<strong>Estado:</strong> {getStatusLabel(deleteDialog.movementInfo.status)}
								</Typography>
							</Box>
						)}
						<Alert severity="warning">
							<Typography variant="body2">
								<strong>Advertencia:</strong> El movimiento eliminado no se podrá notificar si aún no ha sido notificado. Esta acción no se
								puede deshacer.
							</Typography>
						</Alert>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteDialog} color="primary">
						Cancelar
					</Button>
					<Button onClick={handleConfirmDelete} color="error" variant="contained" autoFocus>
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default JudicialMovementsList;
