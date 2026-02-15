import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
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
	FormControlLabel,
	Divider,
	Avatar,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import {
	Refresh,
	Trash,
	SearchNormal1,
	Filter,
	CloseCircle,
	Eye,
	MessageQuestion,
	Clock,
	TickCircle,
	CloseSquare,
	Warning2,
	Danger,
	UserRemove,
	Send2,
	Message,
	TickSquare,
	CloseSquare as CloseSquareIcon,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import SupportContactsService, { SupportContact, SupportContactFilters, UpdateSupportContactData, SupportContactReply } from "api/supportContacts";

// Status configuration
const STATUS_CONFIG: Record<string, { color: "warning" | "info" | "success" | "default"; label: string; icon: React.ReactNode }> = {
	pending: { color: "warning", label: "Pendiente", icon: <Clock size={14} /> },
	"in-progress": { color: "info", label: "En Progreso", icon: <MessageQuestion size={14} /> },
	resolved: { color: "success", label: "Resuelto", icon: <TickCircle size={14} /> },
	closed: { color: "default", label: "Cerrado", icon: <CloseSquare size={14} /> },
};

// Priority configuration
const PRIORITY_CONFIG: Record<string, { color: "default" | "info" | "warning" | "error"; label: string }> = {
	low: { color: "default", label: "Baja" },
	medium: { color: "info", label: "Media" },
	high: { color: "warning", label: "Alta" },
	urgent: { color: "error", label: "Urgente" },
};

const SupportContactsPage = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State for contacts list
	const [contacts, setContacts] = useState<SupportContact[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	// State for filters
	const [filterStatus, setFilterStatus] = useState("");
	const [filterPriority, setFilterPriority] = useState("");
	const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
	const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	// State for stats
	const [stats, setStats] = useState<any>(null);
	const [loadingStats, setLoadingStats] = useState(true);

	// State for selected items (bulk actions)
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// State for detail dialog
	const [detailDialogOpen, setDetailDialogOpen] = useState(false);
	const [selectedContact, setSelectedContact] = useState<SupportContact | null>(null);

	// State for update dialog
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [updateData, setUpdateData] = useState<UpdateSupportContactData>({});
	const [updating, setUpdating] = useState(false);

	// State for delete confirmation
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [contactToDelete, setContactToDelete] = useState<SupportContact | null>(null);
	const [deleting, setDeleting] = useState(false);

	// State for bulk delete confirmation
	const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
	const [bulkDeleting, setBulkDeleting] = useState(false);

	// State for bulk status update
	const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
	const [bulkStatus, setBulkStatus] = useState("");
	const [bulkUpdating, setBulkUpdating] = useState(false);

	// State for reply dialog
	const [replyDialogOpen, setReplyDialogOpen] = useState(false);
	const [replyMessage, setReplyMessage] = useState("");
	const [replyChangeStatus, setReplyChangeStatus] = useState(true);
	const [replying, setReplying] = useState(false);

	// Fetch contacts
	const fetchContacts = useCallback(async () => {
		try {
			setLoading(true);
			const filters: SupportContactFilters = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: "createdAt",
				sortOrder: "desc",
			};

			if (filterStatus) filters.status = filterStatus;
			if (filterPriority) filters.priority = filterPriority;
			if (filterStartDate) filters.startDate = filterStartDate.toISOString();
			if (filterEndDate) filters.endDate = filterEndDate.toISOString();
			if (searchTerm) filters.search = searchTerm;

			const response = await SupportContactsService.getSupportContacts(filters);
			if (response.success) {
				setContacts(response.data);
				setTotal(response.pagination.totalItems);
			}
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar los contactos de soporte", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, filterPriority, filterStartDate, filterEndDate, searchTerm, enqueueSnackbar]);

	// Fetch stats
	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const response = await SupportContactsService.getSupportStats();
			if (response.success) {
				setStats(response.data);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	// Initial load
	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	// Fetch contacts when filters change
	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	// Handle page change
	const handleChangePage = (_: unknown, newPage: number) => {
		setPage(newPage);
		setSelectedIds([]);
	};

	// Handle rows per page change
	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
		setSelectedIds([]);
	};

	// Handle select all
	const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.checked) {
			setSelectedIds(contacts.map((c) => c._id));
		} else {
			setSelectedIds([]);
		}
	};

	// Handle select one
	const handleSelectOne = (id: string) => {
		setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
	};

	// Open detail dialog
	const handleOpenDetail = (contact: SupportContact) => {
		setSelectedContact(contact);
		setDetailDialogOpen(true);
	};

	// Open update dialog
	const handleOpenUpdate = (contact: SupportContact) => {
		setSelectedContact(contact);
		setUpdateData({ status: contact.status, priority: contact.priority });
		setUpdateDialogOpen(true);
	};

	// Open reply dialog
	const handleOpenReply = (contact: SupportContact) => {
		setSelectedContact(contact);
		setReplyMessage("");
		setReplyChangeStatus(contact.status === "pending");
		setReplyDialogOpen(true);
	};

	// Handle reply
	const handleReply = async () => {
		if (!selectedContact || !replyMessage.trim()) return;
		try {
			setReplying(true);
			const response = await SupportContactsService.replySupportContact(selectedContact._id, {
				replyMessage: replyMessage.trim(),
				changeStatus: replyChangeStatus,
			});

			if (response.emailSent) {
				enqueueSnackbar("Respuesta enviada y guardada exitosamente", { variant: "success" });
			} else {
				enqueueSnackbar("Respuesta guardada (el email no pudo ser enviado)", { variant: "warning" });
			}

			// Update the selected contact with the new data
			setSelectedContact(response.data);
			setReplyDialogOpen(false);
			setReplyMessage("");
			fetchContacts();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al enviar la respuesta", { variant: "error" });
		} finally {
			setReplying(false);
		}
	};

	// Handle update
	const handleUpdate = async () => {
		if (!selectedContact) return;
		try {
			setUpdating(true);
			await SupportContactsService.updateSupportContact(selectedContact._id, updateData);
			enqueueSnackbar("Contacto actualizado exitosamente", { variant: "success" });
			setUpdateDialogOpen(false);
			fetchContacts();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al actualizar el contacto", { variant: "error" });
		} finally {
			setUpdating(false);
		}
	};

	// Handle delete click
	const handleDeleteClick = (contact: SupportContact) => {
		setContactToDelete(contact);
		setDeleteDialogOpen(true);
	};

	// Handle confirm delete
	const handleConfirmDelete = async () => {
		if (!contactToDelete) return;
		try {
			setDeleting(true);
			await SupportContactsService.deleteSupportContact(contactToDelete._id);
			enqueueSnackbar("Contacto eliminado exitosamente", { variant: "success" });
			setDeleteDialogOpen(false);
			setContactToDelete(null);
			fetchContacts();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al eliminar el contacto", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	// Handle bulk delete
	const handleBulkDelete = async () => {
		try {
			setBulkDeleting(true);
			const response = await SupportContactsService.bulkDeleteSupportContacts(selectedIds);
			enqueueSnackbar(`${response.data.deleted} contactos eliminados exitosamente`, { variant: "success" });
			setBulkDeleteDialogOpen(false);
			setSelectedIds([]);
			fetchContacts();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al eliminar los contactos", { variant: "error" });
		} finally {
			setBulkDeleting(false);
		}
	};

	// Handle bulk status update
	const handleBulkStatusUpdate = async () => {
		if (!bulkStatus) return;
		try {
			setBulkUpdating(true);
			const response = await SupportContactsService.bulkUpdateStatus(selectedIds, bulkStatus);
			enqueueSnackbar(`${response.data.modified} contactos actualizados exitosamente`, { variant: "success" });
			setBulkStatusDialogOpen(false);
			setBulkStatus("");
			setSelectedIds([]);
			fetchContacts();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al actualizar los contactos", { variant: "error" });
		} finally {
			setBulkUpdating(false);
		}
	};

	// Clear filters
	const handleClearFilters = () => {
		setFilterStatus("");
		setFilterPriority("");
		setFilterStartDate(null);
		setFilterEndDate(null);
		setSearchTerm("");
		setPage(0);
	};

	// Format date
	const formatDate = (dateString: string) => {
		return dayjs(dateString).format("DD/MM/YYYY HH:mm");
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<MainCard
				title="Contactos de Soporte"
				secondary={
					<Stack direction="row" spacing={1}>
						{selectedIds.length > 0 && (
							<>
								<Button
									variant="outlined"
									color="primary"
									size="small"
									onClick={() => setBulkStatusDialogOpen(true)}
								>
									Cambiar Estado ({selectedIds.length})
								</Button>
								<Button
									variant="outlined"
									color="error"
									size="small"
									startIcon={<Trash size={16} />}
									onClick={() => setBulkDeleteDialogOpen(true)}
								>
									Eliminar ({selectedIds.length})
								</Button>
							</>
						)}
						<Button
							variant="outlined"
							size="small"
							startIcon={<Refresh size={16} />}
							onClick={() => {
								fetchContacts();
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
						<Grid item xs={12} sm={6} md={2.4}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<MessageQuestion size={20} color={theme.palette.primary.main} />
										<Typography variant="body2" color="textSecondary">
											Total
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="primary">
											{stats?.general?.total || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Clock size={20} color={theme.palette.warning.main} />
										<Typography variant="body2" color="textSecondary">
											Pendientes
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="warning.main">
											{stats?.general?.pending || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Danger size={20} color={theme.palette.error.main} />
										<Typography variant="body2" color="textSecondary">
											Urgentes Pendientes
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="error.main">
											{stats?.urgentPending || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<UserRemove size={20} color={theme.palette.secondary.main} />
										<Typography variant="body2" color="textSecondary">
											Sin Asignar
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="secondary.main">
											{stats?.unassigned || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={2.4}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<TickCircle size={20} color={theme.palette.success.dark} />
										<Typography variant="body2" color="textSecondary">
											Resueltos
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="success.main">
											{stats?.general?.resolved || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
					</Grid>

					{/* Filters */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center" mb={2}>
							<Filter size={18} />
							<Typography variant="subtitle2">Filtros</Typography>
						</Stack>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Estado</InputLabel>
									<Select
										value={filterStatus}
										label="Estado"
										onChange={(e) => {
											setFilterStatus(e.target.value);
											setPage(0);
										}}
									>
										<MenuItem value="">Todos</MenuItem>
										<MenuItem value="pending">Pendiente</MenuItem>
										<MenuItem value="in-progress">En Progreso</MenuItem>
										<MenuItem value="resolved">Resuelto</MenuItem>
										<MenuItem value="closed">Cerrado</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Prioridad</InputLabel>
									<Select
										value={filterPriority}
										label="Prioridad"
										onChange={(e) => {
											setFilterPriority(e.target.value);
											setPage(0);
										}}
									>
										<MenuItem value="">Todas</MenuItem>
										<MenuItem value="low">Baja</MenuItem>
										<MenuItem value="medium">Media</MenuItem>
										<MenuItem value="high">Alta</MenuItem>
										<MenuItem value="urgent">Urgente</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Desde"
									value={filterStartDate}
									onChange={(date) => {
										setFilterStartDate(date);
										setPage(0);
									}}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Hasta"
									value={filterEndDate}
									onChange={(date) => {
										setFilterEndDate(date);
										setPage(0);
									}}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									placeholder="Buscar por nombre, email o asunto..."
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
									<TableCell padding="checkbox">
										<Checkbox
											indeterminate={selectedIds.length > 0 && selectedIds.length < contacts.length}
											checked={contacts.length > 0 && selectedIds.length === contacts.length}
											onChange={handleSelectAll}
										/>
									</TableCell>
									<TableCell>Fecha</TableCell>
									<TableCell>Nombre</TableCell>
									<TableCell>Email</TableCell>
									<TableCell>Asunto</TableCell>
									<TableCell align="center">Prioridad</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									Array.from({ length: 5 }).map((_, index) => (
										<TableRow key={index}>
											{Array.from({ length: 8 }).map((_, cellIndex) => (
												<TableCell key={cellIndex}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
									))
								) : contacts.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} align="center">
											<Alert severity="info" sx={{ justifyContent: "center" }}>
												No se encontraron contactos de soporte
											</Alert>
										</TableCell>
									</TableRow>
								) : (
									contacts.map((contact) => (
										<TableRow key={contact._id} hover selected={selectedIds.includes(contact._id)}>
											<TableCell padding="checkbox">
												<Checkbox
													checked={selectedIds.includes(contact._id)}
													onChange={() => handleSelectOne(contact._id)}
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2">{formatDate(contact.createdAt)}</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontWeight={500}>
													{contact.name}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" color="textSecondary">
													{contact.email}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={contact.subject}>
													{contact.subject}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={PRIORITY_CONFIG[contact.priority]?.label || contact.priority}
													size="small"
													color={PRIORITY_CONFIG[contact.priority]?.color || "default"}
													icon={contact.priority === "urgent" ? <Warning2 size={14} /> : undefined}
												/>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={STATUS_CONFIG[contact.status]?.label || contact.status}
													size="small"
													color={STATUS_CONFIG[contact.status]?.color || "default"}
													icon={STATUS_CONFIG[contact.status]?.icon as React.ReactElement}
												/>
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip title="Ver detalle">
														<IconButton size="small" color="info" onClick={() => handleOpenDetail(contact)}>
															<Eye size={16} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Editar estado">
														<IconButton size="small" color="primary" onClick={() => handleOpenUpdate(contact)}>
															<MessageQuestion size={16} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Responder">
														<IconButton size="small" color="success" onClick={() => handleOpenReply(contact)}>
															<Send2 size={16} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Eliminar">
														<IconButton size="small" color="error" onClick={() => handleDeleteClick(contact)}>
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
							onPageChange={handleChangePage}
							rowsPerPage={rowsPerPage}
							onRowsPerPageChange={handleChangeRowsPerPage}
							rowsPerPageOptions={[10, 20, 50, 100]}
							labelRowsPerPage="Filas por pagina:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</TableContainer>
				</Stack>

				{/* Detail Dialog */}
				<Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
					<DialogTitle>Detalle del Contacto</DialogTitle>
					<DialogContent dividers>
						{selectedContact && (
							<Stack spacing={3}>
								{/* Contact Info */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="textSecondary">
												Nombre
											</Typography>
											<Typography variant="body1" fontWeight={500}>
												{selectedContact.name}
											</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="caption" color="textSecondary">
												Email
											</Typography>
											<Typography variant="body1">{selectedContact.email}</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Asunto
											</Typography>
											<Typography variant="body1">{selectedContact.subject}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="textSecondary">
												Prioridad
											</Typography>
											<Box mt={0.5}>
												<Chip
													label={PRIORITY_CONFIG[selectedContact.priority]?.label}
													size="small"
													color={PRIORITY_CONFIG[selectedContact.priority]?.color}
												/>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="textSecondary">
												Estado
											</Typography>
											<Box mt={0.5}>
												<Chip
													label={STATUS_CONFIG[selectedContact.status]?.label}
													size="small"
													color={STATUS_CONFIG[selectedContact.status]?.color}
												/>
											</Box>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="textSecondary">
												Fecha de creacion
											</Typography>
											<Typography variant="body2">{formatDate(selectedContact.createdAt)}</Typography>
										</Grid>
										<Grid item xs={6} sm={3}>
											<Typography variant="caption" color="textSecondary">
												Ultima actualizacion
											</Typography>
											<Typography variant="body2">{formatDate(selectedContact.updatedAt)}</Typography>
										</Grid>
										{selectedContact.assignedTo && (
											<Grid item xs={12}>
												<Typography variant="caption" color="textSecondary">
													Asignado a
												</Typography>
												<Typography variant="body2">
													{selectedContact.assignedTo.firstName || selectedContact.assignedTo.name || selectedContact.assignedTo.email}
												</Typography>
											</Grid>
										)}
									</Grid>
								</Paper>

								{/* Conversation History */}
								<Box>
									<Stack direction="row" spacing={1} alignItems="center" mb={2}>
										<Message size={20} />
										<Typography variant="subtitle1" fontWeight={600}>
											Historial de Conversacion
										</Typography>
										<Chip
											label={`${1 + (selectedContact.replies?.length || 0)} mensajes`}
											size="small"
											variant="outlined"
										/>
									</Stack>

									<Stack spacing={2}>
										{/* Original Message */}
										<Paper
											variant="outlined"
											sx={{
												p: 2,
												bgcolor: "primary.50",
												borderColor: "primary.200",
												borderLeft: 4,
												borderLeftColor: "primary.main"
											}}
										>
											<Stack direction="row" spacing={2} alignItems="flex-start">
												<Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
													{selectedContact.name.charAt(0).toUpperCase()}
												</Avatar>
												<Box flex={1}>
													<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
														<Typography variant="subtitle2" fontWeight={600}>
															{selectedContact.name}
														</Typography>
														<Typography variant="caption" color="textSecondary">
															{formatDate(selectedContact.createdAt)}
														</Typography>
													</Stack>
													<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
														{selectedContact.message}
													</Typography>
												</Box>
											</Stack>
										</Paper>

										{/* Replies */}
										{selectedContact.replies && selectedContact.replies.length > 0 && (
											<>
												{selectedContact.replies.map((reply, index) => (
													<Paper
														key={reply._id || index}
														variant="outlined"
														sx={{
															p: 2,
															bgcolor: "success.50",
															borderColor: "success.200",
															borderLeft: 4,
															borderLeftColor: "success.main",
															ml: 3
														}}
													>
														<Stack direction="row" spacing={2} alignItems="flex-start">
															<Avatar sx={{ bgcolor: "success.main", width: 36, height: 36 }}>
																{(reply.createdByName || "A").charAt(0).toUpperCase()}
															</Avatar>
															<Box flex={1}>
																<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
																	<Stack direction="row" spacing={1} alignItems="center">
																		<Typography variant="subtitle2" fontWeight={600}>
																			{reply.createdByName || reply.createdBy?.name || reply.createdBy?.email || "Administrador"}
																		</Typography>
																		<Chip
																			label="Soporte"
																			size="small"
																			color="success"
																			sx={{ height: 20, fontSize: "0.7rem" }}
																		/>
																		{reply.emailSent ? (
																			<Tooltip title="Email enviado">
																				<TickSquare size={16} color={theme.palette.success.dark} />
																			</Tooltip>
																		) : (
																			<Tooltip title="Email no enviado">
																				<CloseSquareIcon size={16} color={theme.palette.error.main} />
																			</Tooltip>
																		)}
																	</Stack>
																	<Typography variant="caption" color="textSecondary">
																		{formatDate(reply.createdAt)}
																	</Typography>
																</Stack>
																<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
																	{reply.message}
																</Typography>
															</Box>
														</Stack>
													</Paper>
												))}
											</>
										)}

										{/* No replies message */}
										{(!selectedContact.replies || selectedContact.replies.length === 0) && (
											<Alert severity="info" sx={{ mt: 1 }}>
												No hay respuestas registradas para este ticket.
											</Alert>
										)}
									</Stack>
								</Box>
							</Stack>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
						<Button
							variant="outlined"
							color="success"
							startIcon={<Send2 size={16} />}
							onClick={() => {
								setDetailDialogOpen(false);
								if (selectedContact) handleOpenReply(selectedContact);
							}}
						>
							Responder
						</Button>
						<Button
							variant="contained"
							onClick={() => {
								setDetailDialogOpen(false);
								if (selectedContact) handleOpenUpdate(selectedContact);
							}}
						>
							Editar
						</Button>
					</DialogActions>
				</Dialog>

				{/* Update Dialog */}
				<Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="xs" fullWidth>
					<DialogTitle>Actualizar Contacto</DialogTitle>
					<DialogContent dividers>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={updateData.status || ""}
									label="Estado"
									onChange={(e) => setUpdateData({ ...updateData, status: e.target.value as UpdateSupportContactData["status"] })}
								>
									<MenuItem value="pending">Pendiente</MenuItem>
									<MenuItem value="in-progress">En Progreso</MenuItem>
									<MenuItem value="resolved">Resuelto</MenuItem>
									<MenuItem value="closed">Cerrado</MenuItem>
								</Select>
							</FormControl>
							<FormControl fullWidth size="small">
								<InputLabel>Prioridad</InputLabel>
								<Select
									value={updateData.priority || ""}
									label="Prioridad"
									onChange={(e) => setUpdateData({ ...updateData, priority: e.target.value as UpdateSupportContactData["priority"] })}
								>
									<MenuItem value="low">Baja</MenuItem>
									<MenuItem value="medium">Media</MenuItem>
									<MenuItem value="high">Alta</MenuItem>
									<MenuItem value="urgent">Urgente</MenuItem>
								</Select>
							</FormControl>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setUpdateDialogOpen(false)} disabled={updating}>
							Cancelar
						</Button>
						<Button variant="contained" onClick={handleUpdate} disabled={updating}>
							{updating ? "Guardando..." : "Guardar"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Delete Confirmation Dialog */}
				<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
					<DialogTitle>Confirmar Eliminacion</DialogTitle>
					<DialogContent>
						<Typography>Estas seguro de que queres eliminar este contacto de soporte?</Typography>
						{contactToDelete && (
							<Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
								<Typography variant="body2">
									<strong>Nombre:</strong> {contactToDelete.name}
								</Typography>
								<Typography variant="body2">
									<strong>Email:</strong> {contactToDelete.email}
								</Typography>
								<Typography variant="body2">
									<strong>Asunto:</strong> {contactToDelete.subject}
								</Typography>
							</Box>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
							Cancelar
						</Button>
						<Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting}>
							{deleting ? "Eliminando..." : "Eliminar"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Bulk Delete Confirmation Dialog */}
				<Dialog open={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)}>
					<DialogTitle>Confirmar Eliminacion Masiva</DialogTitle>
					<DialogContent>
						<Typography>
							Estas seguro de que queres eliminar <strong>{selectedIds.length}</strong> contactos de soporte?
						</Typography>
						<Alert severity="warning" sx={{ mt: 2 }}>
							Esta accion no se puede deshacer.
						</Alert>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleting}>
							Cancelar
						</Button>
						<Button variant="contained" color="error" onClick={handleBulkDelete} disabled={bulkDeleting}>
							{bulkDeleting ? "Eliminando..." : `Eliminar ${selectedIds.length} contactos`}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Bulk Status Update Dialog */}
				<Dialog open={bulkStatusDialogOpen} onClose={() => setBulkStatusDialogOpen(false)} maxWidth="xs" fullWidth>
					<DialogTitle>Cambiar Estado Masivo</DialogTitle>
					<DialogContent>
						<Typography sx={{ mb: 2 }}>
							Cambiar el estado de <strong>{selectedIds.length}</strong> contactos seleccionados:
						</Typography>
						<FormControl fullWidth size="small">
							<InputLabel>Nuevo Estado</InputLabel>
							<Select value={bulkStatus} label="Nuevo Estado" onChange={(e) => setBulkStatus(e.target.value)}>
								<MenuItem value="pending">Pendiente</MenuItem>
								<MenuItem value="in-progress">En Progreso</MenuItem>
								<MenuItem value="resolved">Resuelto</MenuItem>
								<MenuItem value="closed">Cerrado</MenuItem>
							</Select>
						</FormControl>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setBulkStatusDialogOpen(false)} disabled={bulkUpdating}>
							Cancelar
						</Button>
						<Button variant="contained" onClick={handleBulkStatusUpdate} disabled={bulkUpdating || !bulkStatus}>
							{bulkUpdating ? "Actualizando..." : "Actualizar"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Reply Dialog */}
				<Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="md" fullWidth>
					<DialogTitle>Responder al Contacto</DialogTitle>
					<DialogContent dividers>
						{selectedContact && (
							<Stack spacing={3}>
								{/* Contact Info */}
								<Paper variant="outlined" sx={{ p: 2 }}>
									<Grid container spacing={2}>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2">
												<strong>Nombre:</strong> {selectedContact.name}
											</Typography>
										</Grid>
										<Grid item xs={12} sm={6}>
											<Typography variant="body2">
												<strong>Email:</strong> {selectedContact.email}
											</Typography>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="body2">
												<strong>Asunto:</strong> {selectedContact.subject}
											</Typography>
										</Grid>
									</Grid>
								</Paper>

								{/* Conversation History */}
								<Box>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Message size={18} />
										<Typography variant="subtitle2" color="textSecondary">
											Historial de conversacion
										</Typography>
									</Stack>
									<Paper variant="outlined" sx={{ p: 2, maxHeight: 250, overflow: "auto", bgcolor: "grey.50" }}>
										<Stack spacing={2}>
											{/* Original Message */}
											<Box sx={{ borderLeft: 3, borderColor: "primary.main", pl: 2 }}>
												<Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
													<Typography variant="caption" fontWeight={600} color="primary">
														{selectedContact.name}
													</Typography>
													<Typography variant="caption" color="textSecondary">
														{formatDate(selectedContact.createdAt)}
													</Typography>
												</Stack>
												<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
													{selectedContact.message}
												</Typography>
											</Box>

											{/* Previous Replies */}
											{selectedContact.replies && selectedContact.replies.length > 0 && (
												<>
													<Divider />
													{selectedContact.replies.map((reply, index) => (
														<Box key={reply._id || index} sx={{ borderLeft: 3, borderColor: "success.main", pl: 2 }}>
															<Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
																<Stack direction="row" spacing={1} alignItems="center">
																	<Typography variant="caption" fontWeight={600} color="success.main">
																		{reply.createdByName || "Soporte"}
																	</Typography>
																	{reply.emailSent ? (
																		<TickSquare size={12} color={theme.palette.success.dark} />
																	) : (
																		<CloseSquareIcon size={12} color={theme.palette.error.main} />
																	)}
																</Stack>
																<Typography variant="caption" color="textSecondary">
																	{formatDate(reply.createdAt)}
																</Typography>
															</Stack>
															<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
																{reply.message}
															</Typography>
														</Box>
													))}
												</>
											)}
										</Stack>
									</Paper>
								</Box>

								{/* Reply Input */}
								<Box>
									<Typography variant="subtitle2" color="textSecondary" gutterBottom>
										Tu respuesta
									</Typography>
									<TextField
										fullWidth
										multiline
										rows={5}
										placeholder="Escribe tu respuesta aqui..."
										value={replyMessage}
										onChange={(e) => setReplyMessage(e.target.value)}
										variant="outlined"
									/>
								</Box>

								{selectedContact.status === "pending" && (
									<FormControlLabel
										control={
											<Checkbox
												checked={replyChangeStatus}
												onChange={(e) => setReplyChangeStatus(e.target.checked)}
											/>
										}
										label="Cambiar estado a 'En Progreso' automaticamente"
									/>
								)}
							</Stack>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setReplyDialogOpen(false)} disabled={replying}>
							Cancelar
						</Button>
						<Button
							variant="contained"
							color="success"
							startIcon={<Send2 size={18} />}
							onClick={handleReply}
							disabled={replying || !replyMessage.trim()}
						>
							{replying ? "Enviando..." : "Enviar Respuesta"}
						</Button>
					</DialogActions>
				</Dialog>
			</MainCard>
		</LocalizationProvider>
	);
};

export default SupportContactsPage;
