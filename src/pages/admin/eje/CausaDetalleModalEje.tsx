import { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
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
	IconButton,
	Tooltip,
	TextField,
	Switch,
	FormControlLabel,
	CircularProgress,
} from "@mui/material";
import { CausaEje, CausasEjeService, MovimientoEje, IntervinienteEje, CausaRelacionada, UpdateHistoryEntry } from "api/causasEje";
import {
	CloseCircle,
	CloseSquare,
	TickCircle,
	ArrowDown2,
	ArrowUp2,
	Copy,
	Edit,
	Save2,
	Lock1,
	Repeat,
} from "iconsax-react";
import { useSnackbar } from "notistack";

interface CausaDetalleModalEjeProps {
	open: boolean;
	onClose: () => void;
	causa: CausaEje | null;
	onCausaUpdated?: () => void;
}

const CausaDetalleModalEje = ({ open, onClose, causa, onCausaUpdated }: CausaDetalleModalEjeProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Estado para el tab activo
	const [activeTab, setActiveTab] = useState(0);

	// Estados para movimientos paginados
	const [movimientosPage, setMovimientosPage] = useState(0);
	const [movimientosRowsPerPage, setMovimientosRowsPerPage] = useState(10);

	// Estados para edición
	const [isEditing, setIsEditing] = useState(false);
	const [editedCausa, setEditedCausa] = useState<Partial<CausaEje>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Estados para la lista de movimientos
	const [currentMovimientos, setCurrentMovimientos] = useState<MovimientoEje[]>([]);

	// Estados para historial de actualizaciones
	const [updateHistory, setUpdateHistory] = useState<UpdateHistoryEntry[]>([]);
	const [historyPage, setHistoryPage] = useState(0);
	const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
	const [historyOrderBy, setHistoryOrderBy] = useState<"asc" | "desc">("desc");

	// Resetear estados cuando se abre el modal
	useEffect(() => {
		if (open && causa) {
			setActiveTab(0);
			setMovimientosPage(0);
			setHistoryPage(0);
			setIsEditing(false);
			setEditedCausa({});
			setCurrentMovimientos(causa.movimientos || []);
			setUpdateHistory(causa.updateHistory || []);
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

	// Formatear solo fecha (sin hora)
	const formatDateOnly = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
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

	// Convertir fecha para input date
	const toDateLocal = (date: { $date: string } | string | undefined): string => {
		if (!date) return "";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		const year = dateObj.getUTCFullYear();
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Formatear monto
	const formatMonto = (monto: number | undefined, moneda: string = "ARS"): string => {
		if (!monto) return "N/A";
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: moneda,
		}).format(monto);
	};

	// Obtener movimientos paginados
	const paginatedMovimientos = currentMovimientos.slice(
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

	// Paginación y ordenamiento para historial de actualizaciones
	const sortedHistory = [...updateHistory].sort((a, b) => {
		const dateA = new Date(typeof a.timestamp === "string" ? a.timestamp : a.timestamp.$date).getTime();
		const dateB = new Date(typeof b.timestamp === "string" ? b.timestamp : b.timestamp.$date).getTime();
		return historyOrderBy === "desc" ? dateB - dateA : dateA - dateB;
	});

	const paginatedHistory = sortedHistory.slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage);

	const handleChangeHistoryPage = (_event: unknown, newPage: number) => {
		setHistoryPage(newPage);
	};

	const handleChangeHistoryRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setHistoryRowsPerPage(parseInt(event.target.value, 10));
		setHistoryPage(0);
	};

	const handleToggleHistoryOrder = () => {
		setHistoryOrderBy((prev) => (prev === "desc" ? "asc" : "desc"));
		setHistoryPage(0);
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
			estado: causa.estado,
			lastUpdate: causa.lastUpdate,
			ultimoMovimiento: causa.ultimoMovimiento,
			update: causa.update,
			isValid: causa.isValid,
			isPrivate: causa.isPrivate,
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

			// Preparar datos para enviar
			const dataToUpdate = { ...editedCausa };

			// Convertir lastUpdate si fue editado
			if (dataToUpdate.lastUpdate) {
				const dateStr = typeof dataToUpdate.lastUpdate === "string" ? dataToUpdate.lastUpdate : dataToUpdate.lastUpdate.$date;
				dataToUpdate.lastUpdate = new Date(dateStr).toISOString();
			}

			// Convertir ultimoMovimiento si fue editado
			if (dataToUpdate.ultimoMovimiento) {
				const dateValue = dataToUpdate.ultimoMovimiento;
				const dateStr = typeof dateValue === "string" ? dateValue : dateValue.$date;
				if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
					dataToUpdate.ultimoMovimiento = `${dateStr}T00:00:00.000Z`;
				} else {
					dataToUpdate.ultimoMovimiento = new Date(dateStr).toISOString();
				}
			}

			const response = await CausasEjeService.updateCausa(causaId, dataToUpdate);

			if (response.success) {
				enqueueSnackbar("Causa EJE actualizada correctamente", {
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
			enqueueSnackbar("Error al actualizar la causa EJE", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	// Obtener estadísticas de actualización
	const getUpdateStatsDisplay = () => {
		const stats = causa.updateStats;
		if (!stats) return null;

		return (
			<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
				{stats.count !== undefined && (
					<Chip
						icon={<Repeat size={14} />}
						label={`${stats.count} actualizaciones`}
						size="small"
						variant="outlined"
					/>
				)}
				{stats.avgMs !== undefined && (
					<Chip
						label={`Promedio: ${(stats.avgMs / 1000).toFixed(1)}s`}
						size="small"
						variant="outlined"
					/>
				)}
				{stats.newMovs !== undefined && stats.newMovs > 0 && (
					<Chip
						label={`+${stats.newMovs} movimientos`}
						size="small"
						color="success"
						variant="outlined"
					/>
				)}
				{stats.errors !== undefined && stats.errors > 0 && (
					<Chip
						label={`${stats.errors} errores`}
						size="small"
						color="error"
						variant="outlined"
					/>
				)}
			</Stack>
		);
	};

	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
						<Box sx={{ flex: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
								<Typography variant="h5">
									Expediente: {causa.numero}/{causa.anio}
								</Typography>
								<Chip
									label="EJE"
									color="primary"
									size="small"
								/>
								{causa.isPrivate && (
									<Chip
										icon={<Lock1 size={14} />}
										label="Privado"
										color="warning"
										size="small"
									/>
								)}
							</Stack>
							<Typography variant="body2" color="textSecondary" sx={{ fontFamily: "monospace" }}>
								CUIJ: {causa.cuij}
							</Typography>
							<Typography variant="body2" color="textSecondary" noWrap>
								{causa.caratula || "Sin carátula"}
							</Typography>
						</Box>
						{!isEditing && activeTab === 0 && (
							<Stack direction="row" spacing={0.5}>
								<Tooltip title="Editar causa">
									<IconButton onClick={handleEditClick} color="primary" size="small">
										<Edit size={20} />
									</IconButton>
								</Tooltip>
							</Stack>
						)}
					</Stack>
				</DialogTitle>

				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={activeTab} onChange={handleTabChange} aria-label="causa eje detail tabs">
						<Tab label="Información General" />
						<Tab label={`Movimientos (${currentMovimientos.length})`} />
						<Tab label={`Intervinientes (${causa.intervinientes?.length || 0})`} />
						<Tab label={`Historial (${updateHistory.length})`} />
						<Tab label="JSON" />
					</Tabs>
				</Box>

				<DialogContent dividers sx={{ height: "500px", overflowY: "auto" }}>
					{/* Tab Panel 0: Información General */}
					{activeTab === 0 && (
						<Grid container spacing={2}>
							{/* Información principal */}
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Información Principal
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} sm={6} md={4}>
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
									{causa.numero}
								</Typography>
							</Grid>

							<Grid item xs={6} sm={3} md={2}>
								<Typography variant="caption" color="textSecondary">
									Año
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{causa.anio}
								</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={4}>
								<Typography variant="caption" color="textSecondary">
									CUIJ
								</Typography>
								<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
									{causa.cuij}
								</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={6}>
								<Typography variant="caption" color="textSecondary">
									Estado
								</Typography>
								<Box>
									<Chip
										label={causa.verified ? "Verificada" : "No verificada"}
										color={causa.verified ? "success" : "default"}
										size="small"
										variant={causa.verified ? "filled" : "outlined"}
										sx={{ mr: 0.5, mb: 0.5 }}
									/>
									{isEditing ? (
										<FormControlLabel
											control={
												<Switch
													checked={editedCausa.isValid ?? causa.isValid ?? false}
													onChange={(e) => setEditedCausa({ ...editedCausa, isValid: e.target.checked })}
													color="primary"
													size="small"
												/>
											}
											label="Válida"
											sx={{ mr: 1 }}
										/>
									) : (
										<Chip
											label={causa.isValid ? "Válida" : "No válida"}
											color={causa.isValid ? "primary" : "default"}
											size="small"
											variant={causa.isValid ? "filled" : "outlined"}
											sx={{ mr: 0.5, mb: 0.5 }}
										/>
									)}
									{isEditing ? (
										<FormControlLabel
											control={
												<Switch
													checked={editedCausa.update ?? causa.update ?? false}
													onChange={(e) => setEditedCausa({ ...editedCausa, update: e.target.checked })}
													color="warning"
													size="small"
												/>
											}
											label="Con actualización"
										/>
									) : (
										<Chip
											label={causa.update ? "Con actualización" : "Sin actualización"}
											color={causa.update ? "warning" : "default"}
											size="small"
											variant={causa.update ? "filled" : "outlined"}
											sx={{ mb: 0.5, ...(causa.update && { color: "text.primary" }) }}
										/>
									)}
								</Box>
							</Grid>

							<Grid item xs={12} sm={6} md={6}>
								<Typography variant="caption" color="textSecondary">
									Privacidad
								</Typography>
								<Box>
									{isEditing ? (
										<FormControlLabel
											control={
												<Switch
													checked={editedCausa.isPrivate ?? causa.isPrivate ?? false}
													onChange={(e) => setEditedCausa({ ...editedCausa, isPrivate: e.target.checked })}
													color="error"
													size="small"
												/>
											}
											label="Expediente privado"
										/>
									) : (
										<Chip
											label={causa.isPrivate ? "Privada" : "Pública"}
											color={causa.isPrivate ? "error" : "success"}
											size="small"
											variant="filled"
										/>
									)}
								</Box>
							</Grid>

							{causa.source && (
								<Grid item xs={12} sm={6} md={3}>
									<Typography variant="caption" color="textSecondary">
										Origen
									</Typography>
									<Box>
										<Chip label={causa.source} size="small" variant="outlined" color="secondary" />
									</Box>
								</Grid>
							)}

							{causa.detailsLoaded !== undefined && (
								<Grid item xs={12} sm={6} md={3}>
									<Typography variant="caption" color="textSecondary">
										Detalles Cargados
									</Typography>
									<Box>
										<Chip
											label={causa.detailsLoaded ? "Sí" : "No"}
											size="small"
											color={causa.detailsLoaded ? "success" : "default"}
											variant={causa.detailsLoaded ? "filled" : "outlined"}
										/>
									</Box>
								</Grid>
							)}

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

							{causa.sala && (
								<Grid item xs={12} md={6}>
									<Typography variant="caption" color="textSecondary">
										Sala
									</Typography>
									<Typography variant="body2">{causa.sala}</Typography>
								</Grid>
							)}

							{causa.tribunalSuperior && (
								<Grid item xs={12} md={6}>
									<Typography variant="caption" color="textSecondary">
										Tribunal Superior
									</Typography>
									<Typography variant="body2">{causa.tribunalSuperior}</Typography>
								</Grid>
							)}

							{causa.ubicacionActual && (
								<Grid item xs={12} md={6}>
									<Typography variant="caption" color="textSecondary">
										Ubicación Actual
									</Typography>
									<Typography variant="body2">{causa.ubicacionActual}</Typography>
								</Grid>
							)}

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

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Estado Expediente
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.estado || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, estado: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									causa.estado ? (
										<Chip label={causa.estado} size="small" color="info" variant="outlined" />
									) : (
										<Typography variant="body2">N/A</Typography>
									)
								)}
							</Grid>

							{(causa.monto || causa.montoMoneda) && (
								<Grid item xs={12} md={6}>
									<Typography variant="caption" color="textSecondary">
										Monto
									</Typography>
									<Typography variant="body2">{formatMonto(causa.monto, causa.montoMoneda)}</Typography>
								</Grid>
							)}

							{/* Fechas */}
							<Grid item xs={12} sx={{ mt: 1 }}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Fechas
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									Fecha Inicio
								</Typography>
								<Typography variant="body2">{formatDateOnly(causa.fechaInicio)}</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
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

							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									Último Movimiento
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										type="date"
										size="small"
										value={toDateLocal(editedCausa.ultimoMovimiento || causa.ultimoMovimiento)}
										onChange={(e) => setEditedCausa({ ...editedCausa, ultimoMovimiento: e.target.value })}
										sx={{ mt: 0.5 }}
										InputLabelProps={{ shrink: true }}
									/>
								) : (
									<Typography variant="body2">{formatDateOnly(causa.ultimoMovimiento)}</Typography>
								)}
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									Verificado
								</Typography>
								<Typography variant="body2">{formatDate(causa.verifiedAt)}</Typography>
							</Grid>

							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="textSecondary">
									Creado
								</Typography>
								<Typography variant="body2">{formatDate(causa.createdAt)}</Typography>
							</Grid>

							<Grid item xs={6} sm={3}>
								<Typography variant="caption" color="textSecondary">
									Modificado
								</Typography>
								<Typography variant="body2">{formatDate(causa.updatedAt)}</Typography>
							</Grid>

							{causa.detailsLastUpdate && (
								<Grid item xs={6} sm={3}>
									<Typography variant="caption" color="textSecondary">
										Detalles Actualizados
									</Typography>
									<Typography variant="body2">{formatDate(causa.detailsLastUpdate)}</Typography>
								</Grid>
							)}

							{/* Estadísticas de actualización */}
							{causa.updateStats && (
								<>
									<Grid item xs={12} sx={{ mt: 1 }}>
										<Typography variant="subtitle2" color="primary" gutterBottom>
											Estadísticas de Actualización
										</Typography>
										<Divider sx={{ mb: 1.5 }} />
									</Grid>

									<Grid item xs={12}>
										{getUpdateStatsDisplay()}
									</Grid>

									{causa.updateStats.last && (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Última actualización stats
											</Typography>
											<Typography variant="body2">{formatDate(causa.updateStats.last)}</Typography>
										</Grid>
									)}

									{causa.updateStats.today && (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Hoy ({causa.updateStats.today.date})
											</Typography>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip
													label={`${causa.updateStats.today.count} actualizaciones`}
													size="small"
													color="success"
													variant="outlined"
												/>
												{causa.updateStats.today.hours && causa.updateStats.today.hours.length > 0 && (
													<Typography variant="caption" color="textSecondary">
														Horas: {causa.updateStats.today.hours.map(h => `${h}:00`).join(", ")}
													</Typography>
												)}
											</Stack>
										</Grid>
									)}
								</>
							)}

							{/* Vínculos */}
							<Grid item xs={12} sx={{ mt: 1 }}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Vínculos
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Carpetas Vinculadas
								</Typography>
								<Box>
									{causa.folderIds && causa.folderIds.length > 0 ? (
										<Chip label={`${causa.folderIds.length} carpetas`} size="small" />
									) : (
										<Typography variant="body2" color="textSecondary">Sin carpetas</Typography>
									)}
								</Box>
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Usuarios Vinculados
								</Typography>
								<Box>
									{causa.userCausaIds && causa.userCausaIds.length > 0 ? (
										<Chip label={`${causa.userCausaIds.length} usuarios`} size="small" />
									) : (
										<Typography variant="body2" color="textSecondary">Sin usuarios</Typography>
									)}
								</Box>
							</Grid>

							{/* Errores */}
							{(causa.lastError || causa.errorCount > 0) && (
								<>
									<Grid item xs={12} sx={{ mt: 1 }}>
										<Typography variant="subtitle2" color="error" gutterBottom>
											Errores
										</Typography>
										<Divider sx={{ mb: 1.5 }} />
									</Grid>

									{causa.errorCount > 0 && (
										<Grid item xs={6}>
											<Typography variant="caption" color="textSecondary">
												Contador de Errores
											</Typography>
											<Typography variant="body2">
												<Chip label={causa.errorCount} size="small" color="error" />
											</Typography>
										</Grid>
									)}

									{causa.lastError && (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Último Error
											</Typography>
											<Alert severity="error" sx={{ mt: 0.5 }}>
												{causa.lastError}
											</Alert>
										</Grid>
									)}

									{causa.stuckSince && (
										<Grid item xs={6}>
											<Typography variant="caption" color="textSecondary">
												Stuck desde
											</Typography>
											<Typography variant="body2">{formatDate(causa.stuckSince)}</Typography>
										</Grid>
									)}
								</>
							)}

							{/* Causas Relacionadas */}
							{causa.causasRelacionadas && causa.causasRelacionadas.length > 0 && (
								<>
									<Grid item xs={12} sx={{ mt: 1 }}>
										<Typography variant="subtitle2" color="primary" gutterBottom>
											Causas Relacionadas ({causa.causasRelacionadas.length})
										</Typography>
										<Divider sx={{ mb: 1.5 }} />
									</Grid>

									<Grid item xs={12}>
										<TableContainer>
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>CUIJ</TableCell>
														<TableCell>Carátula</TableCell>
														<TableCell>Relación</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{causa.causasRelacionadas.map((rel: CausaRelacionada, index: number) => (
														<TableRow key={index}>
															<TableCell>
																<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
																	{rel.cuij}
																</Typography>
															</TableCell>
															<TableCell>{rel.caratula || "N/A"}</TableCell>
															<TableCell>
																<Chip label={rel.relacion} size="small" variant="outlined" />
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</Grid>
								</>
							)}
						</Grid>
					)}

					{/* Tab Panel 1: Movimientos */}
					{activeTab === 1 && (
						<Box>
							{currentMovimientos.length > 0 ? (
								<>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width="12%">Fecha</TableCell>
													<TableCell width="15%">Tipo</TableCell>
													<TableCell>Descripción</TableCell>
													<TableCell width="15%">Firmante</TableCell>
													<TableCell width="10%">Número</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{paginatedMovimientos.map((mov: MovimientoEje, index: number) => (
													<TableRow key={index} hover>
														<TableCell>
															<Typography variant="caption">{formatDateOnly(mov.fecha)}</Typography>
														</TableCell>
														<TableCell>
															{mov.tipo && <Chip label={mov.tipo} size="small" variant="outlined" />}
														</TableCell>
														<TableCell>
															<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
																{mov.descripcion || "Sin descripción"}
															</Typography>
															{mov.detalle && (
																<Typography variant="caption" color="textSecondary" display="block">
																	{mov.detalle}
																</Typography>
															)}
														</TableCell>
														<TableCell>
															<Typography variant="caption">{mov.firmante || "N/A"}</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="caption">{mov.numero || "N/A"}</Typography>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
									<TablePagination
										rowsPerPageOptions={[5, 10, 25, 50]}
										component="div"
										count={currentMovimientos.length}
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

					{/* Tab Panel 2: Intervinientes */}
					{activeTab === 2 && (
						<Box>
							{causa.intervinientes && causa.intervinientes.length > 0 ? (
								<TableContainer>
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell width="20%">Tipo</TableCell>
												<TableCell>Nombre</TableCell>
												<TableCell width="30%">Representante</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{causa.intervinientes.map((interv: IntervinienteEje, index: number) => (
												<TableRow key={index} hover>
													<TableCell>
														<Chip label={interv.tipo} size="small" variant="outlined" color="primary" />
													</TableCell>
													<TableCell>
														<Typography variant="body2">{interv.nombre}</Typography>
													</TableCell>
													<TableCell>
														<Typography variant="caption">{interv.representante || "N/A"}</Typography>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							) : (
								<Alert severity="info">Esta causa no tiene intervinientes registrados</Alert>
							)}
						</Box>
					)}

					{/* Tab Panel 3: Historial de Actualizaciones */}
					{activeTab === 3 && (
						<Box>
							<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
								<Typography variant="h6">Historial de Actualizaciones</Typography>
								{updateHistory.length > 0 && (
									<Button
										variant="outlined"
										color="primary"
										size="small"
										startIcon={historyOrderBy === "desc" ? <ArrowDown2 size={18} /> : <ArrowUp2 size={18} />}
										onClick={handleToggleHistoryOrder}
									>
										{historyOrderBy === "desc" ? "Más recientes" : "Más antiguos"}
									</Button>
								)}
							</Box>

							{updateHistory.length > 0 ? (
								<>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width="20%">Fecha/Hora</TableCell>
													<TableCell width="15%">Tipo</TableCell>
													<TableCell width="10%" align="center">Estado</TableCell>
													<TableCell width="12%" align="center">Mov. Added</TableCell>
													<TableCell width="12%" align="center">Mov. Total</TableCell>
													<TableCell width="15%">Origen</TableCell>
													<TableCell>Detalles</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{paginatedHistory.map((entry: UpdateHistoryEntry, index: number) => (
													<TableRow key={index} hover>
														<TableCell>
															<Typography variant="caption">{formatDate(entry.timestamp)}</Typography>
														</TableCell>
														<TableCell>
															{entry.updateType && (
																<Chip label={entry.updateType} size="small" variant="outlined" color="primary" />
															)}
														</TableCell>
														<TableCell align="center">
															<Tooltip title={entry.success ? "Exitoso" : "Fallido"}>
																{entry.success ? (
																	<TickCircle size={20} color={theme.palette.success.main} variant="Bold" />
																) : (
																	<CloseCircle size={20} color={theme.palette.error.main} variant="Bold" />
																)}
															</Tooltip>
														</TableCell>
														<TableCell align="center">
															<Chip
																label={entry.movimientosAdded > 0 ? `+${entry.movimientosAdded}` : entry.movimientosAdded}
																size="small"
																color={entry.movimientosAdded > 0 ? "success" : entry.movimientosAdded < 0 ? "error" : "default"}
																variant="filled"
															/>
														</TableCell>
														<TableCell align="center">
															<Typography variant="body2" fontWeight={600}>
																{entry.movimientosTotal}
															</Typography>
														</TableCell>
														<TableCell>
															<Typography variant="body2">{entry.source || "N/A"}</Typography>
														</TableCell>
														<TableCell>
															{entry.details?.message && (
																<Typography variant="caption" color="textSecondary">
																	{entry.details.message}
																</Typography>
															)}
															{entry.details?.error && (
																<Typography variant="caption" color="error">
																	{entry.details.error}
																</Typography>
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
									<TablePagination
										rowsPerPageOptions={[5, 10, 25, 50]}
										component="div"
										count={updateHistory.length}
										rowsPerPage={historyRowsPerPage}
										page={historyPage}
										onPageChange={handleChangeHistoryPage}
										onRowsPerPageChange={handleChangeHistoryRowsPerPage}
										labelRowsPerPage="Filas por página:"
										labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
									/>
								</>
							) : (
								<Alert severity="info">No hay entradas en el historial de actualizaciones</Alert>
							)}
						</Box>
					)}

					{/* Tab Panel 4: JSON Raw */}
					{activeTab === 4 && (
						<Box sx={{ position: "relative", height: "100%" }}>
							<Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
								<Tooltip title="Copiar JSON">
									<IconButton
										onClick={() => {
											navigator.clipboard.writeText(JSON.stringify(causa, null, 2));
											enqueueSnackbar("JSON copiado al portapapeles", {
												variant: "success",
												anchorOrigin: { vertical: "bottom", horizontal: "right" },
											});
										}}
									>
										<Copy size={20} />
									</IconButton>
								</Tooltip>
							</Box>
							<Box
								component="pre"
								sx={{
									backgroundColor: "grey.100",
									p: 2,
									borderRadius: 1,
									overflow: "auto",
									fontSize: "0.75rem",
									fontFamily: "monospace",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									maxHeight: "100%",
								}}
							>
								{JSON.stringify(causa, null, 2)}
							</Box>
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
								{isSaving ? <CircularProgress size={20} /> : "Guardar"}
							</Button>
						</>
					) : (
						<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined">
							Cerrar
						</Button>
					)}
				</DialogActions>
			</Dialog>
		</>
	);
};

export default CausaDetalleModalEje;
