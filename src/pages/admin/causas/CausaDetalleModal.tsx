import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Box,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Alert,
	Divider,
	Stack,
	Tabs,
	Tab,
	Link,
	IconButton,
	Tooltip,
	TextField,
	Dialog as ConfirmDialog,
	DialogTitle as ConfirmDialogTitle,
	DialogContent as ConfirmDialogContent,
	DialogActions as ConfirmDialogActions,
	Checkbox,
	FormControlLabel,
} from "@mui/material";
import { Causa } from "api/causasPjn";
import { CausasPjnService } from "api/causasPjn";
import CausasService from "api/causas";
import { CloseCircle, Link as LinkIcon, Trash, Edit, Save2, CloseSquare, TickCircle, AddCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import useAuth from "hooks/useAuth";

interface CausaDetalleModalProps {
	open: boolean;
	onClose: () => void;
	causa: Causa | null;
	onCausaUpdated?: () => void;
	apiService?: "pjn" | "workers"; // Especifica qué servicio usar
}

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

// Función helper para normalizar fuero a código
const normalizeFuero = (fuero: string | undefined): "CIV" | "COM" | "CSS" | "CNT" => {
	if (!fuero) return "CIV";

	// Si ya es un código válido, devolverlo
	if (["CIV", "COM", "CSS", "CNT"].includes(fuero)) {
		return fuero as "CIV" | "COM" | "CSS" | "CNT";
	}

	// Mapear nombres legibles a códigos
	const mapping: Record<string, "CIV" | "COM" | "CSS" | "CNT"> = {
		Civil: "CIV",
		Comercial: "COM",
		"Seguridad Social": "CSS",
		Trabajo: "CNT",
	};

	return mapping[fuero] || "CIV";
};

const CausaDetalleModal = ({ open, onClose, causa, onCausaUpdated, apiService = "pjn" }: CausaDetalleModalProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const { user } = useAuth();

	// Seleccionar el servicio apropiado
	const ServiceAPI = apiService === "pjn" ? CausasPjnService : CausasService;

	// Estado para el tab activo
	const [activeTab, setActiveTab] = useState(0);

	// Estados para movimientos paginados
	const [movimientosPage, setMovimientosPage] = useState(0);
	const [movimientosRowsPerPage, setMovimientosRowsPerPage] = useState(10);

	// Estados para edición
	const [isEditing, setIsEditing] = useState(false);
	const [editedCausa, setEditedCausa] = useState<Partial<Causa>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Estados para confirmación de eliminación de movimiento
	const [deleteMovConfirm, setDeleteMovConfirm] = useState<{ open: boolean; index: number | null }>({
		open: false,
		index: null,
	});
	const [isDeleting, setIsDeleting] = useState(false);

	// Estados para la lista de movimientos (para actualizar después de eliminar)
	const [currentMovimientos, setCurrentMovimientos] = useState<any[]>([]);

	// Estados para agregar movimiento
	const [addMovDialogOpen, setAddMovDialogOpen] = useState(false);
	const [newMovimiento, setNewMovimiento] = useState({
		fecha: "",
		tipo: "",
		detalle: "",
		url: "",
	});
	const [sendNotification, setSendNotification] = useState(false);
	const [isAddingMovimiento, setIsAddingMovimiento] = useState(false);

	// Resetear estados cuando se abre el modal
	useEffect(() => {
		if (open && causa) {
			setActiveTab(0);
			setMovimientosPage(0);
			setIsEditing(false);
			setEditedCausa({});
			setCurrentMovimientos((causa as any).movimientos || []);
		}
	}, [open, causa]);

	if (!causa) return null;

	// Obtener ID como string
	const getId = (id: string | { $oid: string }): string => {
		return typeof id === "string" ? id : id.$oid;
	};

	// Formatear fecha completa (con hora)
	const formatDate = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Formatear solo fecha (sin hora) - para tabla de movimientos
	// Sin conversión de zona horaria - muestra exactamente la fecha guardada
	const formatDateOnly = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);

		// Usar métodos UTC para evitar conversión de zona horaria
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const year = dateObj.getUTCFullYear();

		return `${day}/${month}/${year}`;
	};

	// Convertir fecha para input datetime-local
	const toDateTimeLocal = (date: { $date: string } | string | undefined): string => {
		if (!date) return "";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		const offset = dateObj.getTimezoneOffset();
		const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
		return localDate.toISOString().slice(0, 16);
	};

	// Obtener movimientos paginados
	const movimientos = currentMovimientos;
	const paginatedMovimientos = movimientos.slice(
		movimientosPage * movimientosRowsPerPage,
		movimientosPage * movimientosRowsPerPage + movimientosRowsPerPage,
	);

	const handleChangeMovimientosPage = (_event: unknown, newPage: number) => {
		setMovimientosPage(newPage);
	};

	const handleChangeMovimientosRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMovimientosRowsPerPage(parseInt(event.target.value, 10));
		setMovimientosPage(0);
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Activar modo edición
	const handleEditClick = () => {
		setEditedCausa({
			caratula: causa.caratula,
			juzgado: causa.juzgado,
			objeto: causa.objeto,
			lastUpdate: causa.lastUpdate,
		});
		setIsEditing(true);
	};

	// Cancelar edición
	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditedCausa({});
	};

	// Guardar cambios
	const handleSaveEdit = async () => {
		try {
			setIsSaving(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = await ServiceAPI.updateCausa(fuero, causaId, editedCausa);

			if (response.success) {
				enqueueSnackbar("Causa actualizada correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				setIsEditing(false);
				setEditedCausa({});
				if (onCausaUpdated) {
					onCausaUpdated();
				}
				onClose();
			}
		} catch (error) {
			enqueueSnackbar("Error al actualizar la causa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	// Confirmar eliminación de movimiento
	const handleDeleteMovClick = (index: number) => {
		setDeleteMovConfirm({ open: true, index });
	};

	// Cancelar eliminación
	const handleCancelDelete = () => {
		setDeleteMovConfirm({ open: false, index: null });
	};

	// Eliminar movimiento
	const handleConfirmDelete = async () => {
		if (deleteMovConfirm.index === null) return;

		try {
			setIsDeleting(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = await ServiceAPI.deleteMovimiento(fuero, causaId, deleteMovConfirm.index);

			if (response.success) {
				enqueueSnackbar("Movimiento eliminado correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});

				// Actualizar la lista de movimientos localmente
				const newMovimientos = [...currentMovimientos];
				newMovimientos.splice(deleteMovConfirm.index, 1);
				setCurrentMovimientos(newMovimientos);

				// Resetear página si es necesario
				if (movimientosPage > 0 && newMovimientos.length <= movimientosPage * movimientosRowsPerPage) {
					setMovimientosPage(movimientosPage - 1);
				}

				setDeleteMovConfirm({ open: false, index: null });
				if (onCausaUpdated) {
					onCausaUpdated();
				}
			}
		} catch (error) {
			enqueueSnackbar("Error al eliminar el movimiento", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsDeleting(false);
		}
	};

	// Abrir diálogo para agregar movimiento
	const handleOpenAddMovDialog = () => {
		setNewMovimiento({
			fecha: "",
			tipo: "",
			detalle: "",
			url: "",
		});
		setSendNotification(false);
		setAddMovDialogOpen(true);
	};

	// Cerrar diálogo de agregar movimiento
	const handleCloseAddMovDialog = () => {
		setAddMovDialogOpen(false);
		setNewMovimiento({
			fecha: "",
			tipo: "",
			detalle: "",
			url: "",
		});
		setSendNotification(false);
	};

	// Agregar movimiento
	const handleAddMovimiento = async () => {
		if (!newMovimiento.fecha || !newMovimiento.tipo || !newMovimiento.detalle) {
			enqueueSnackbar("Fecha, tipo y detalle son campos obligatorios", {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		// Validar userId si se va a enviar notificación
		if (sendNotification && !user?._id) {
			enqueueSnackbar("No se puede enviar notificación: usuario no identificado", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setIsAddingMovimiento(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			// Convertir fecha a formato ISO UTC
			const fechaISO = new Date(newMovimiento.fecha).toISOString();

			const response = await ServiceAPI.addMovimiento(fuero, causaId, {
				fecha: fechaISO,
				tipo: newMovimiento.tipo,
				detalle: newMovimiento.detalle,
				url: newMovimiento.url || null,
				sendNotification,
				userId: user?._id,
			});

			if (response.success) {
				let mensaje = "Movimiento agregado correctamente";
				if (sendNotification) {
					mensaje += response.data.notificationSent ? " y notificación enviada" : " (la notificación falló)";
				}

				enqueueSnackbar(mensaje, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});

				// Actualizar la lista de movimientos localmente
				const movimientoAgregado = response.data.nuevoMovimiento;
				const newMovimientos = [...currentMovimientos, movimientoAgregado];
				setCurrentMovimientos(newMovimientos);

				handleCloseAddMovDialog();
				if (onCausaUpdated) {
					onCausaUpdated();
				}
			}
		} catch (error) {
			enqueueSnackbar("Error al agregar el movimiento", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsAddingMovimiento(false);
		}
	};

	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
						<Box sx={{ flex: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
								<Typography variant="h5">
									Expediente: {causa.number}/{causa.year}
								</Typography>
								<Chip
									label={FUERO_LABELS[normalizeFuero(causa.fuero)]}
									color={FUERO_COLORS[normalizeFuero(causa.fuero)]}
									size="small"
									sx={{
										...(normalizeFuero(causa.fuero) === "CSS" && {
											color: "rgba(0, 0, 0, 0.87)",
										}),
									}}
								/>
							</Stack>
							<Typography variant="body2" color="textSecondary">
								{causa.caratula || "Sin carátula"}
							</Typography>
						</Box>
						{!isEditing && (
							<Tooltip title="Editar causa">
								<IconButton onClick={handleEditClick} color="primary" size="small">
									<Edit size={20} />
								</IconButton>
							</Tooltip>
						)}
					</Stack>
				</DialogTitle>

				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={activeTab} onChange={handleTabChange} aria-label="causa detail tabs">
						<Tab label="Información General" />
						<Tab label={`Movimientos (${currentMovimientos.length})`} />
					</Tabs>
				</Box>

				<DialogContent dividers>
					{/* Tab Panel 0: Información General */}
					{activeTab === 0 && (
						<Grid container spacing={2}>
							{/* Información principal - Vista compacta */}
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Información Principal
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									ID
								</Typography>
								<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
									{getId(causa._id)}
								</Typography>
							</Grid>

							<Grid item xs={6} sm={3} md={2}>
								<Typography variant="caption" color="textSecondary">
									Número
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{causa.number}
								</Typography>
							</Grid>

							<Grid item xs={6} sm={3} md={2}>
								<Typography variant="caption" color="textSecondary">
									Año
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{causa.year}
								</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={5}>
								<Typography variant="caption" color="textSecondary">
									Estado
								</Typography>
								<Box>
									{causa.verified && <Chip label="Verificada" color="success" size="small" sx={{ mr: 0.5, mb: 0.5 }} />}
									{causa.isValid && <Chip label="Válida" color="primary" size="small" sx={{ mr: 0.5, mb: 0.5 }} />}
									{causa.update && (
										<Chip
											label="Con actualización"
											color="warning"
											size="small"
											sx={{ mb: 0.5, color: "rgba(0, 0, 0, 0.87)" }}
										/>
									)}
								</Box>
							</Grid>

							<Grid item xs={12}>
								<Typography variant="caption" color="textSecondary">
									Carátula
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.caratula || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, caratula: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.caratula || "Sin carátula"}</Typography>
								)}
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Juzgado
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.juzgado || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, juzgado: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.juzgado || "N/A"}</Typography>
								)}
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Objeto
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.objeto || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, objeto: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.objeto || "Sin objeto"}</Typography>
								)}
							</Grid>

							{/* Fechas */}
							<Grid item xs={12} sx={{ mt: 1 }}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Fechas
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} sm={6} md={4}>
								<Typography variant="caption" color="textSecondary">
									Última Actualización
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										type="datetime-local"
										size="small"
										value={toDateTimeLocal(editedCausa.lastUpdate || causa.lastUpdate)}
										onChange={(e) => setEditedCausa({ ...editedCausa, lastUpdate: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{formatDate(causa.lastUpdate)}</Typography>
								)}
							</Grid>

							<Grid item xs={12} sm={6} md={4}>
								<Typography variant="caption" color="textSecondary">
									Creado
								</Typography>
								<Typography variant="body2">{formatDate(causa.createdAt)}</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={4}>
								<Typography variant="caption" color="textSecondary">
									Modificado
								</Typography>
								<Typography variant="body2">{formatDate(causa.updatedAt)}</Typography>
							</Grid>

							{/* Vínculos */}
							{(causa.folderIds && causa.folderIds.length > 0) || (causa.userCausaIds && causa.userCausaIds.length > 0) ? (
								<>
									<Grid item xs={12} sx={{ mt: 1 }}>
										<Typography variant="subtitle2" color="primary" gutterBottom>
											Vínculos
										</Typography>
										<Divider sx={{ mb: 1.5 }} />
									</Grid>

									{causa.folderIds && causa.folderIds.length > 0 && (
										<Grid item xs={6} md={3}>
											<Typography variant="caption" color="textSecondary">
												Carpetas Vinculadas
											</Typography>
											<Box>
												<Chip label={`${causa.folderIds.length}`} size="small" />
											</Box>
										</Grid>
									)}

									{causa.userCausaIds && causa.userCausaIds.length > 0 && (
										<Grid item xs={6} md={3}>
											<Typography variant="caption" color="textSecondary">
												Usuarios Vinculados
											</Typography>
											<Box>
												<Chip label={`${causa.userCausaIds.length}`} size="small" />
											</Box>
										</Grid>
									)}
								</>
							) : null}
						</Grid>
					)}

					{/* Tab Panel 1: Movimientos */}
					{activeTab === 1 && (
						<Box>
							<Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
								<Button variant="contained" startIcon={<AddCircle size={18} />} onClick={handleOpenAddMovDialog} size="small">
									Agregar Movimiento
								</Button>
							</Box>
							{movimientos.length > 0 ? (
								<>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width="12%">Fecha</TableCell>
													<TableCell>Descripción</TableCell>
													<TableCell width="12%">Tipo</TableCell>
													<TableCell width="10%" align="center">
														Enlace
													</TableCell>
													<TableCell width="8%" align="center">
														Acciones
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{paginatedMovimientos.map((mov: any, index: number) => {
													const actualIndex = movimientosPage * movimientosRowsPerPage + index;
													return (
														<TableRow key={actualIndex} hover>
															<TableCell>
																<Typography variant="caption">{formatDateOnly(mov.fecha || mov.createdAt)}</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
																	{mov.detalle || mov.descripcion || mov.texto || "Sin descripción"}
																</Typography>
															</TableCell>
															<TableCell>{mov.tipo && <Chip label={mov.tipo} size="small" variant="outlined" />}</TableCell>
															<TableCell align="center">
																{mov.url ? (
																	<Link href={mov.url} target="_blank" rel="noopener noreferrer" underline="none">
																		<Tooltip title="Ver documento">
																			<IconButton size="small" color="primary">
																				<LinkIcon size={16} />
																			</IconButton>
																		</Tooltip>
																	</Link>
																) : (
																	<Typography variant="caption" color="textSecondary">
																		N/A
																	</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																<Tooltip title="Eliminar movimiento">
																	<IconButton size="small" color="error" onClick={() => handleDeleteMovClick(actualIndex)}>
																		<Trash size={16} />
																	</IconButton>
																</Tooltip>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</TableContainer>
									<TablePagination
										rowsPerPageOptions={[5, 10, 25, 50]}
										component="div"
										count={movimientos.length}
										rowsPerPage={movimientosRowsPerPage}
										page={movimientosPage}
										onPageChange={handleChangeMovimientosPage}
										onRowsPerPageChange={handleChangeMovimientosRowsPerPage}
										labelRowsPerPage="Filas por página:"
										labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
									/>
								</>
							) : (
								<Alert severity="info">Esta causa no tiene movimientos registrados</Alert>
							)}
						</Box>
					)}
				</DialogContent>

				<DialogActions>
					{isEditing ? (
						<>
							<Button onClick={handleCancelEdit} startIcon={<CloseSquare size={18} />} variant="outlined" disabled={isSaving}>
								Cancelar
							</Button>
							<Button onClick={handleSaveEdit} startIcon={<Save2 size={18} />} variant="contained" disabled={isSaving}>
								{isSaving ? "Guardando..." : "Guardar"}
							</Button>
						</>
					) : (
						<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined">
							Cerrar
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación para eliminar movimiento */}
			<ConfirmDialog open={deleteMovConfirm.open} onClose={handleCancelDelete}>
				<ConfirmDialogTitle>Confirmar Eliminación</ConfirmDialogTitle>
				<ConfirmDialogContent>
					<Typography>¿Está seguro que desea eliminar este movimiento? Esta acción no se puede deshacer.</Typography>
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={handleCancelDelete} variant="outlined" disabled={isDeleting}>
						Cancelar
					</Button>
					<Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={isDeleting} startIcon={<Trash size={18} />}>
						{isDeleting ? "Eliminando..." : "Eliminar"}
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>

			{/* Dialog para agregar movimiento */}
			<ConfirmDialog open={addMovDialogOpen} onClose={handleCloseAddMovDialog} maxWidth="sm" fullWidth>
				<ConfirmDialogTitle>Agregar Movimiento</ConfirmDialogTitle>
				<ConfirmDialogContent>
					<Grid container spacing={2} sx={{ mt: 1 }}>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Fecha"
								type="date"
								value={newMovimiento.fecha}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, fecha: e.target.value })}
								InputLabelProps={{
									shrink: true,
								}}
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Tipo"
								value={newMovimiento.tipo}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, tipo: e.target.value })}
								placeholder="Ej: MOVIMIENTO, CEDULA ELECTRONICA TRIBUNAL"
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Detalle"
								value={newMovimiento.detalle}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, detalle: e.target.value })}
								placeholder="Descripción del movimiento"
								multiline
								rows={3}
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="URL (opcional)"
								value={newMovimiento.url}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, url: e.target.value })}
								placeholder="https://..."
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<FormControlLabel
								control={<Checkbox checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} color="primary" />}
								label="Enviar notificación"
							/>
							{sendNotification && !user?._id && (
								<Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
									Advertencia: No se puede enviar notificación sin usuario identificado
								</Typography>
							)}
						</Grid>
					</Grid>
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={handleCloseAddMovDialog} variant="outlined" disabled={isAddingMovimiento}>
						Cancelar
					</Button>
					<Button onClick={handleAddMovimiento} variant="contained" disabled={isAddingMovimiento} startIcon={<AddCircle size={18} />}>
						{isAddingMovimiento ? "Agregando..." : "Agregar"}
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>
		</>
	);
};

export default CausaDetalleModal;
