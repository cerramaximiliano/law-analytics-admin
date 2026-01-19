import React, { useCallback, useEffect, useState } from "react";

// material-ui
import {
	Box,
	Button,
	Card,
	CardContent,
	Checkbox,
	Chip,
	FormControl,
	Grid,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Select,
	SelectChangeEvent,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TableSortLabel,
	TextField,
	Tooltip,
	Typography,
	useTheme,
	CircularProgress,
	Alert,
	Collapse,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	DialogContentText,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";

// project imports
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";
import EmailLogsService from "api/emailLogs";
import {
	EmailLog,
	EmailLogPagination,
	EmailLogsQueryParams,
	EmailLogGeneralStats,
	EmailLogTemplateOption,
} from "types/email-log";

// assets
import {
	SearchNormal1,
	CloseCircle,
	Refresh,
	Filter,
	Sms,
	TickCircle,
	CloseSquare,
	Warning2,
	Copy,
	Eye,
	Trash,
} from "iconsax-react";

// Status chip colors
const getStatusColor = (status: string) => {
	switch (status) {
		case "sent":
			return "primary";
		case "delivered":
			return "success";
		case "failed":
			return "error";
		case "bounced":
			return "warning";
		case "complained":
			return "error";
		default:
			return "default";
	}
};

const getStatusLabel = (status: string) => {
	switch (status) {
		case "sent":
			return "Enviado";
		case "delivered":
			return "Entregado";
		case "failed":
			return "Fallido";
		case "bounced":
			return "Rebotado";
		case "complained":
			return "Queja";
		default:
			return status;
	}
};

// Table headers
const headCells = [
	{ id: "checkbox", label: "", sortable: false, width: 50 },
	{ id: "createdAt", label: "Fecha", sortable: true, width: 160 },
	{ id: "to", label: "Destinatario", sortable: true, width: 200 },
	{ id: "subject", label: "Asunto", sortable: false, width: 250 },
	{ id: "templateCategory", label: "Categoria", sortable: true, width: 120 },
	{ id: "templateName", label: "Plantilla", sortable: true, width: 150 },
	{ id: "status", label: "Estado", sortable: true, width: 100 },
	{ id: "actions", label: "Acciones", sortable: false, width: 120 },
];

// ==============================|| EMAIL LOGS PAGE ||============================== //

const EmailLogsPage = () => {
	const theme = useTheme();

	// Data state
	const [logs, setLogs] = useState<EmailLog[]>([]);
	const [pagination, setPagination] = useState<EmailLogPagination | null>(null);
	const [stats, setStats] = useState<EmailLogGeneralStats | null>(null);
	const [templates, setTemplates] = useState<EmailLogTemplateOption[]>([]);
	const [categories, setCategories] = useState<string[]>([]);

	// Loading states
	const [loading, setLoading] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Filter states
	const [showFilters, setShowFilters] = useState(false);
	const [searchEmail, setSearchEmail] = useState("");
	const [searchSesId, setSearchSesId] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [categoryFilter, setCategoryFilter] = useState<string>("");
	const [templateFilter, setTemplateFilter] = useState<string>("");
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	// Pagination and sorting state
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [orderBy, setOrderBy] = useState<string>("createdAt");
	const [order, setOrder] = useState<"asc" | "desc">("desc");

	// Detail modal state
	const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
	const [detailModalOpen, setDetailModalOpen] = useState(false);

	// Selection state
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Delete dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteType, setDeleteType] = useState<"single" | "multiple" | "all">("single");
	const [logToDelete, setLogToDelete] = useState<EmailLog | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Fetch logs
	const fetchLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const params: EmailLogsQueryParams = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: orderBy as any,
				sortOrder: order,
			};

			if (searchEmail) params.to = searchEmail;
			if (searchSesId) params.sesMessageId = searchSesId;
			if (statusFilter) params.status = statusFilter as any;
			if (categoryFilter) params.templateCategory = categoryFilter;
			if (templateFilter) params.templateName = templateFilter;
			if (startDate) params.startDate = startDate.toISOString();
			if (endDate) params.endDate = endDate.toISOString();

			const response = await EmailLogsService.getEmailLogs(params);
			setLogs(response.data);
			setPagination(response.pagination);
		} catch (err: any) {
			setError(err.message || "Error al cargar los logs de correos");
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, orderBy, order, searchEmail, searchSesId, statusFilter, categoryFilter, templateFilter, startDate, endDate]);

	// Fetch stats
	const fetchStats = useCallback(async () => {
		setLoadingStats(true);
		try {
			const response = await EmailLogsService.getEmailStats();
			setStats(response.data.general);
		} catch (err) {
			console.error("Error fetching stats:", err);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	// Fetch template options
	const fetchTemplateOptions = useCallback(async () => {
		try {
			const response = await EmailLogsService.getTemplateOptions();
			setCategories(response.data.categories);
			setTemplates(response.data.templates);
		} catch (err) {
			console.error("Error fetching template options:", err);
		}
	}, []);

	useEffect(() => {
		fetchLogs();
	}, [fetchLogs]);

	useEffect(() => {
		fetchStats();
		fetchTemplateOptions();
	}, [fetchStats, fetchTemplateOptions]);

	// Handlers
	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleSort = (property: string) => {
		const isAsc = orderBy === property && order === "asc";
		setOrder(isAsc ? "desc" : "asc");
		setOrderBy(property);
	};

	const handleClearFilters = () => {
		setSearchEmail("");
		setSearchSesId("");
		setStatusFilter("");
		setCategoryFilter("");
		setTemplateFilter("");
		setStartDate(null);
		setEndDate(null);
		setPage(0);
	};

	const handleRefresh = () => {
		fetchLogs();
		fetchStats();
	};

	const handleCopyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	const handleViewDetail = (log: EmailLog) => {
		setSelectedLog(log);
		setDetailModalOpen(true);
	};

	// Selection handlers
	const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.checked) {
			setSelectedIds(logs.map((log) => log._id));
		} else {
			setSelectedIds([]);
		}
	};

	const handleSelectOne = (id: string) => {
		const selectedIndex = selectedIds.indexOf(id);
		let newSelected: string[] = [];

		if (selectedIndex === -1) {
			newSelected = [...selectedIds, id];
		} else {
			newSelected = selectedIds.filter((selectedId) => selectedId !== id);
		}

		setSelectedIds(newSelected);
	};

	const isSelected = (id: string) => selectedIds.indexOf(id) !== -1;

	// Delete handlers
	const handleOpenDeleteDialog = (type: "single" | "multiple" | "all", log?: EmailLog) => {
		setDeleteType(type);
		setLogToDelete(log || null);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setLogToDelete(null);
	};

	const handleConfirmDelete = async () => {
		setDeleting(true);
		try {
			if (deleteType === "single" && logToDelete) {
				await EmailLogsService.deleteEmailLog(logToDelete._id);
			} else if (deleteType === "multiple") {
				await EmailLogsService.deleteMultipleEmailLogs(selectedIds);
				setSelectedIds([]);
			} else if (deleteType === "all") {
				await EmailLogsService.deleteAllEmailLogs();
				setSelectedIds([]);
			}
			handleCloseDeleteDialog();
			fetchLogs();
			fetchStats();
		} catch (err: any) {
			setError(err.message || "Error al eliminar logs");
		} finally {
			setDeleting(false);
		}
	};

	const getDeleteDialogMessage = () => {
		if (deleteType === "single" && logToDelete) {
			return `¿Está seguro que desea eliminar el log de correo enviado a "${logToDelete.to}"?`;
		} else if (deleteType === "multiple") {
			return `¿Está seguro que desea eliminar ${selectedIds.length} logs de correo seleccionados?`;
		} else if (deleteType === "all") {
			return `¿Está seguro que desea eliminar TODOS los logs de correo? Esta acción no se puede deshacer.`;
		}
		return "";
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getUserDisplay = (log: EmailLog) => {
		if (log.userId && typeof log.userId === "object") {
			return log.userId.name || log.userId.email || "-";
		}
		return "-";
	};

	// Stats cards
	const renderStatsCards = () => {
		if (loadingStats || !stats) {
			return (
				<Box display="flex" justifyContent="center" py={2}>
					<CircularProgress size={24} />
				</Box>
			);
		}

		const statCards = [
			{ label: "Total", value: stats.total, color: theme.palette.primary.main, icon: Sms },
			{ label: "Enviados", value: stats.sent, color: theme.palette.info.main, icon: TickCircle },
			{ label: "Entregados", value: stats.delivered, color: theme.palette.success.main, icon: TickCircle },
			{ label: "Fallidos", value: stats.failed, color: theme.palette.error.main, icon: CloseSquare },
			{ label: "Rebotados", value: stats.bounced, color: theme.palette.warning.main, icon: Warning2 },
			{ label: "Quejas", value: stats.complained, color: theme.palette.error.dark, icon: Warning2 },
		];

		return (
			<Grid container spacing={2} sx={{ mb: 3 }}>
				{statCards.map((stat) => (
					<Grid item xs={6} sm={4} md={2} key={stat.label}>
						<Card sx={{ height: "100%" }}>
							<CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
								<Stack direction="row" alignItems="center" spacing={1}>
									<stat.icon size={20} color={stat.color} variant="Bold" />
									<Box>
										<Typography variant="h5" fontWeight={600}>
											{stat.value.toLocaleString()}
										</Typography>
										<Typography variant="caption" color="textSecondary">
											{stat.label}
										</Typography>
									</Box>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>
		);
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
			<MainCard
				title="Logs de Correos Electrónicos"
				secondary={
					<Stack direction="row" spacing={1}>
						{selectedIds.length > 0 && (
							<Button
								variant="contained"
								color="error"
								size="small"
								startIcon={<Trash size={18} />}
								onClick={() => handleOpenDeleteDialog("multiple")}
							>
								Eliminar ({selectedIds.length})
							</Button>
						)}
						<Tooltip title="Eliminar todos los logs">
							<IconButton color="error" onClick={() => handleOpenDeleteDialog("all")}>
								<Trash size={20} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Filtros">
							<IconButton color={showFilters ? "primary" : "default"} onClick={() => setShowFilters(!showFilters)}>
								<Filter size={20} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Actualizar">
							<IconButton onClick={handleRefresh}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				}
			>
				{/* Stats Cards */}
				{renderStatsCards()}

				{/* Filters */}
				<Collapse in={showFilters}>
					<Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									label="Buscar por email"
									value={searchEmail}
									onChange={(e) => setSearchEmail(e.target.value)}
									InputProps={{
										startAdornment: (
											<InputAdornment position="start">
												<SearchNormal1 size={18} />
											</InputAdornment>
										),
										endAdornment: searchEmail && (
											<InputAdornment position="end">
												<IconButton size="small" onClick={() => setSearchEmail("")}>
													<CloseCircle size={16} />
												</IconButton>
											</InputAdornment>
										),
									}}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									label="Buscar por SES ID"
									value={searchSesId}
									onChange={(e) => setSearchSesId(e.target.value)}
									InputProps={{
										endAdornment: searchSesId && (
											<InputAdornment position="end">
												<IconButton size="small" onClick={() => setSearchSesId("")}>
													<CloseCircle size={16} />
												</IconButton>
											</InputAdornment>
										),
									}}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Estado</InputLabel>
									<Select
										value={statusFilter}
										label="Estado"
										onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
									>
										<MenuItem value="">Todos</MenuItem>
										<MenuItem value="sent">Enviado</MenuItem>
										<MenuItem value="delivered">Entregado</MenuItem>
										<MenuItem value="failed">Fallido</MenuItem>
										<MenuItem value="bounced">Rebotado</MenuItem>
										<MenuItem value="complained">Queja</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Categoria</InputLabel>
									<Select
										value={categoryFilter}
										label="Categoria"
										onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
									>
										<MenuItem value="">Todas</MenuItem>
										{categories.map((cat) => (
											<MenuItem key={cat} value={cat}>
												{cat}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Plantilla</InputLabel>
									<Select
										value={templateFilter}
										label="Plantilla"
										onChange={(e: SelectChangeEvent) => setTemplateFilter(e.target.value)}
									>
										<MenuItem value="">Todas</MenuItem>
										{templates
											.filter((t) => !categoryFilter || t.category === categoryFilter)
											.map((t) => (
												<MenuItem key={`${t.category}-${t.name}`} value={t.name}>
													{t.name} ({t.count})
												</MenuItem>
											))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Desde"
									value={startDate}
									onChange={(date) => setStartDate(date)}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Hasta"
									value={endDate}
									onChange={(date) => setEndDate(date)}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Button
									fullWidth
									variant="outlined"
									color="secondary"
									onClick={handleClearFilters}
									startIcon={<CloseCircle size={18} />}
								>
									Limpiar
								</Button>
							</Grid>
						</Grid>
					</Box>
				</Collapse>

				{/* Error Alert */}
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{/* Table */}
				<ScrollX>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell padding="checkbox" sx={{ width: 50 }}>
										<Checkbox
											indeterminate={selectedIds.length > 0 && selectedIds.length < logs.length}
											checked={logs.length > 0 && selectedIds.length === logs.length}
											onChange={handleSelectAll}
										/>
									</TableCell>
									{headCells
										.filter((cell) => cell.id !== "checkbox")
										.map((cell) => (
											<TableCell
												key={cell.id}
												sx={{ width: cell.width }}
												sortDirection={orderBy === cell.id ? order : false}
											>
												{cell.sortable ? (
													<TableSortLabel
														active={orderBy === cell.id}
														direction={orderBy === cell.id ? order : "asc"}
														onClick={() => handleSort(cell.id)}
													>
														{cell.label}
													</TableSortLabel>
												) : (
													cell.label
												)}
											</TableCell>
										))}
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={headCells.length} align="center" sx={{ py: 6 }}>
											<CircularProgress />
										</TableCell>
									</TableRow>
								) : logs.length === 0 ? (
									<TableRow>
										<TableCell colSpan={headCells.length} align="center" sx={{ py: 6 }}>
											<Typography color="textSecondary">No se encontraron logs de correos</Typography>
										</TableCell>
									</TableRow>
								) : (
									logs.map((log) => {
										const isItemSelected = isSelected(log._id);
										return (
											<TableRow key={log._id} hover selected={isItemSelected}>
												<TableCell padding="checkbox">
													<Checkbox
														checked={isItemSelected}
														onChange={() => handleSelectOne(log._id)}
													/>
												</TableCell>
												<TableCell>
													<Typography variant="body2">{formatDate(log.createdAt)}</Typography>
												</TableCell>
												<TableCell>
													<Stack>
														<Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
															{log.to}
														</Typography>
														{log.userId && typeof log.userId === "object" && (
															<Typography variant="caption" color="textSecondary">
																{log.userId.name || log.userId.firstName}
															</Typography>
														)}
													</Stack>
												</TableCell>
												<TableCell>
													<Tooltip title={log.subject}>
														<Typography variant="body2" noWrap sx={{ maxWidth: 230 }}>
															{log.subject}
														</Typography>
													</Tooltip>
												</TableCell>
												<TableCell>
													<Chip
														label={log.templateCategory || "-"}
														size="small"
														variant="outlined"
													/>
												</TableCell>
												<TableCell>
													<Typography variant="body2">{log.templateName || "-"}</Typography>
												</TableCell>
												<TableCell>
													<Chip
														label={getStatusLabel(log.status)}
														size="small"
														color={getStatusColor(log.status) as any}
													/>
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5}>
														<Tooltip title="Ver detalle">
															<IconButton size="small" onClick={() => handleViewDetail(log)}>
																<Eye size={18} />
															</IconButton>
														</Tooltip>
														{log.sesMessageId && (
															<Tooltip title="Copiar SES ID">
																<IconButton
																	size="small"
																	onClick={() => handleCopyToClipboard(log.sesMessageId!)}
																>
																	<Copy size={18} />
																</IconButton>
															</Tooltip>
														)}
														<Tooltip title="Eliminar">
															<IconButton
																size="small"
																color="error"
																onClick={() => handleOpenDeleteDialog("single", log)}
															>
																<Trash size={18} />
															</IconButton>
														</Tooltip>
													</Stack>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</ScrollX>

				{/* Pagination */}
				{pagination && (
					<TablePagination
						component="div"
						count={pagination.totalItems}
						page={page}
						onPageChange={handleChangePage}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={handleChangeRowsPerPage}
						rowsPerPageOptions={[10, 20, 50, 100]}
						labelRowsPerPage="Filas por pagina:"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				)}

				{/* Detail Modal */}
				<Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
					<DialogTitle>Detalle del Correo</DialogTitle>
					<DialogContent dividers>
						{selectedLog && (
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Destinatario
									</Typography>
									<Typography variant="body1">{selectedLog.to}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Usuario
									</Typography>
									<Typography variant="body1">{getUserDisplay(selectedLog)}</Typography>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="subtitle2" color="textSecondary">
										Asunto
									</Typography>
									<Typography variant="body1">{selectedLog.subject}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Categoria
									</Typography>
									<Typography variant="body1">{selectedLog.templateCategory || "-"}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Plantilla
									</Typography>
									<Typography variant="body1">{selectedLog.templateName || "-"}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Estado
									</Typography>
									<Chip
										label={getStatusLabel(selectedLog.status)}
										size="small"
										color={getStatusColor(selectedLog.status) as any}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="subtitle2" color="textSecondary">
										Fecha
									</Typography>
									<Typography variant="body1">{formatDate(selectedLog.createdAt)}</Typography>
								</Grid>
								{selectedLog.sesMessageId && (
									<Grid item xs={12}>
										<Typography variant="subtitle2" color="textSecondary">
											SES Message ID
										</Typography>
										<Stack direction="row" alignItems="center" spacing={1}>
											<Typography
												variant="body2"
												sx={{
													fontFamily: "monospace",
													bgcolor: "grey.100",
													px: 1,
													py: 0.5,
													borderRadius: 1,
												}}
											>
												{selectedLog.sesMessageId}
											</Typography>
											<IconButton
												size="small"
												onClick={() => handleCopyToClipboard(selectedLog.sesMessageId!)}
											>
												<Copy size={16} />
											</IconButton>
										</Stack>
									</Grid>
								)}
								{selectedLog.errorMessage && (
									<Grid item xs={12}>
										<Typography variant="subtitle2" color="error">
											Error
										</Typography>
										<Alert severity="error" sx={{ mt: 0.5 }}>
											{selectedLog.errorMessage}
										</Alert>
									</Grid>
								)}
								{selectedLog.requestIp && (
									<Grid item xs={12} sm={6}>
										<Typography variant="subtitle2" color="textSecondary">
											IP de solicitud
										</Typography>
										<Typography variant="body2">{selectedLog.requestIp}</Typography>
									</Grid>
								)}
								{selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
									<Grid item xs={12}>
										<Typography variant="subtitle2" color="textSecondary">
											Metadata
										</Typography>
										<Box
											sx={{
												bgcolor: "grey.100",
												p: 1.5,
												borderRadius: 1,
												mt: 0.5,
												fontFamily: "monospace",
												fontSize: "0.85rem",
												overflow: "auto",
												maxHeight: 200,
											}}
										>
											<pre style={{ margin: 0 }}>
												{JSON.stringify(selectedLog.metadata, null, 2)}
											</pre>
										</Box>
									</Grid>
								)}
							</Grid>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDetailModalOpen(false)}>Cerrar</Button>
					</DialogActions>
				</Dialog>

				{/* Delete Confirmation Dialog */}
				<Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
					<DialogTitle>
						{deleteType === "all" ? "Eliminar todos los logs" : "Confirmar eliminación"}
					</DialogTitle>
					<DialogContent>
						<DialogContentText>{getDeleteDialogMessage()}</DialogContentText>
						{deleteType === "all" && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								Esta acción eliminará permanentemente todos los registros de logs de correo. Esta operación no
								se puede deshacer.
							</Alert>
						)}
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCloseDeleteDialog} disabled={deleting}>
							Cancelar
						</Button>
						<Button
							onClick={handleConfirmDelete}
							color="error"
							variant="contained"
							disabled={deleting}
							startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Trash size={16} />}
						>
							{deleting ? "Eliminando..." : "Eliminar"}
						</Button>
					</DialogActions>
				</Dialog>
			</MainCard>
		</LocalizationProvider>
	);
};

export default EmailLogsPage;
