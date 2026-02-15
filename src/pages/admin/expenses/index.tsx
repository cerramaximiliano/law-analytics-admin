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
	FormControlLabel,
	Switch,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { Add, Refresh, Edit2, Trash, SearchNormal1, DollarCircle, Calendar, Filter, CloseCircle, Setting2, Wallet2, RefreshCircle } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { ExpensesService, Expense, ExpenseType, CreateExpenseData } from "api/expenses";
import OpenAIService, { OpenAIBalanceResponse } from "api/openai";

// Status colors and labels
const STATUS_CONFIG: Record<string, { color: "success" | "warning" | "error" | "default"; label: string }> = {
	paid: { color: "success", label: "Pagado" },
	pending: { color: "warning", label: "Pendiente" },
	cancelled: { color: "error", label: "Cancelado" },
};

// Currency symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: "$",
	ARS: "$",
	EUR: "€",
};

const ExpensesPage = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State for expenses list
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);

	// State for filters
	const [filterType, setFilterType] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterStartDate, setFilterStartDate] = useState<Dayjs | null>(null);
	const [filterEndDate, setFilterEndDate] = useState<Dayjs | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	// State for expense types
	const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

	// State for stats
	const [stats, setStats] = useState<any>(null);
	const [loadingStats, setLoadingStats] = useState(true);

	// State for dialog
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [saving, setSaving] = useState(false);

	// State for delete confirmation
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Form state
	const [formData, setFormData] = useState<CreateExpenseData>({
		date: dayjs().format("YYYY-MM-DD"),
		amount: 0,
		currency: "USD",
		type: "",
		description: "",
		notes: "",
		provider: "",
		reference: "",
		isRecurring: false,
		recurringPeriod: "",
		status: "paid",
		tags: [],
	});

	// OpenAI Balance State
	const [openaiBalance, setOpenaiBalance] = useState<OpenAIBalanceResponse["data"] | null>(null);
	const [loadingOpenai, setLoadingOpenai] = useState(false);
	const [openaiConfigOpen, setOpenaiConfigOpen] = useState(false);
	const [savingOpenaiConfig, setSavingOpenaiConfig] = useState(false);
	const [syncingOpenai, setSyncingOpenai] = useState(false);
	const [openaiConfigForm, setOpenaiConfigForm] = useState({
		initialBalance: 0,
		initialBalanceDate: dayjs().format("YYYY-MM-DD"),
	});

	// Fetch expense types
	const fetchExpenseTypes = useCallback(async () => {
		try {
			const response = await ExpensesService.getExpenseTypes();
			if (response.success) {
				setExpenseTypes(response.data);
			}
		} catch (error) {
			console.error("Error fetching expense types:", error);
		}
	}, []);

	// Fetch expenses
	const fetchExpenses = useCallback(async () => {
		try {
			setLoading(true);
			const response = await ExpensesService.getExpenses({
				page: page + 1,
				limit: rowsPerPage,
				type: filterType || undefined,
				status: filterStatus || undefined,
				startDate: filterStartDate?.format("YYYY-MM-DD") || undefined,
				endDate: filterEndDate?.format("YYYY-MM-DD") || undefined,
				search: searchTerm || undefined,
				sortBy: "date",
				sortOrder: "desc",
			});
			if (response.success) {
				setExpenses(response.data);
				setTotal(response.pagination.total);
			}
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar los gastos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterType, filterStatus, filterStartDate, filterEndDate, searchTerm, enqueueSnackbar]);

	// Fetch stats
	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const response = await ExpensesService.getExpenseStats({ year: dayjs().year() });
			if (response.success) {
				setStats(response.data);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	// Fetch OpenAI balance
	const fetchOpenaiBalance = useCallback(async () => {
		try {
			setLoadingOpenai(true);
			const response = await OpenAIService.getBalance();
			if (response.success) {
				setOpenaiBalance(response.data);
				if (response.data.configured) {
					setOpenaiConfigForm({
						initialBalance: response.data.initialBalance,
						initialBalanceDate: dayjs(response.data.initialBalanceDate).format("YYYY-MM-DD"),
					});
				}
			}
		} catch (error) {
			console.error("Error fetching OpenAI balance:", error);
		} finally {
			setLoadingOpenai(false);
		}
	}, []);

	// Save OpenAI config
	const handleSaveOpenaiConfig = async () => {
		try {
			setSavingOpenaiConfig(true);
			await OpenAIService.updateConfig({
				initialBalance: openaiConfigForm.initialBalance,
				initialBalanceDate: openaiConfigForm.initialBalanceDate,
			});
			enqueueSnackbar("Configuración de OpenAI actualizada", { variant: "success" });
			setOpenaiConfigOpen(false);
			fetchOpenaiBalance();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al guardar configuración", { variant: "error" });
		} finally {
			setSavingOpenaiConfig(false);
		}
	};

	// Sync OpenAI costs
	const handleSyncOpenai = async () => {
		try {
			setSyncingOpenai(true);
			const response = await OpenAIService.syncCosts();
			if (response.success) {
				enqueueSnackbar("Costos de OpenAI sincronizados", { variant: "success" });
				fetchOpenaiBalance();
			}
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al sincronizar", { variant: "error" });
		} finally {
			setSyncingOpenai(false);
		}
	};

	// Initial load
	useEffect(() => {
		fetchExpenseTypes();
		fetchStats();
		fetchOpenaiBalance();
	}, [fetchExpenseTypes, fetchStats, fetchOpenaiBalance]);

	// Fetch expenses when filters change
	useEffect(() => {
		fetchExpenses();
	}, [fetchExpenses]);

	// Handle page change
	const handleChangePage = (_: unknown, newPage: number) => {
		setPage(newPage);
	};

	// Handle rows per page change
	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Open dialog for create/edit
	const handleOpenDialog = (expense?: Expense) => {
		if (expense) {
			setEditingExpense(expense);
			setFormData({
				date: dayjs(expense.date).format("YYYY-MM-DD"),
				amount: expense.amount,
				currency: expense.currency,
				type: expense.type,
				description: expense.description,
				notes: expense.notes || "",
				provider: expense.provider || "",
				reference: expense.reference || "",
				isRecurring: expense.isRecurring,
				recurringPeriod: expense.recurringPeriod || "",
				status: expense.status,
				tags: expense.tags || [],
			});
		} else {
			setEditingExpense(null);
			setFormData({
				date: dayjs().format("YYYY-MM-DD"),
				amount: 0,
				currency: "USD",
				type: "",
				description: "",
				notes: "",
				provider: "",
				reference: "",
				isRecurring: false,
				recurringPeriod: "",
				status: "paid",
				tags: [],
			});
		}
		setDialogOpen(true);
	};

	// Close dialog
	const handleCloseDialog = () => {
		setDialogOpen(false);
		setEditingExpense(null);
	};

	// Handle form submit
	const handleSubmit = async () => {
		try {
			setSaving(true);

			if (!formData.type || !formData.description || !formData.amount) {
				enqueueSnackbar("Completa los campos requeridos", { variant: "warning" });
				return;
			}

			if (editingExpense) {
				await ExpensesService.updateExpense(editingExpense._id, formData);
				enqueueSnackbar("Gasto actualizado exitosamente", { variant: "success" });
			} else {
				await ExpensesService.createExpense(formData);
				enqueueSnackbar("Gasto creado exitosamente", { variant: "success" });
			}

			handleCloseDialog();
			fetchExpenses();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al guardar el gasto", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	// Handle delete
	const handleDeleteClick = (expense: Expense) => {
		setExpenseToDelete(expense);
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!expenseToDelete) return;

		try {
			setDeleting(true);
			await ExpensesService.deleteExpense(expenseToDelete._id);
			enqueueSnackbar("Gasto eliminado exitosamente", { variant: "success" });
			setDeleteDialogOpen(false);
			setExpenseToDelete(null);
			fetchExpenses();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al eliminar el gasto", { variant: "error" });
		} finally {
			setDeleting(false);
		}
	};

	// Clear filters
	const handleClearFilters = () => {
		setFilterType("");
		setFilterStatus("");
		setFilterStartDate(null);
		setFilterEndDate(null);
		setSearchTerm("");
		setPage(0);
	};

	// Format currency
	const formatCurrency = (amount: number, currency: string) => {
		return `${CURRENCY_SYMBOLS[currency] || "$"}${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	// Format date
	const formatDate = (dateString: string) => {
		return dayjs(dateString).format("DD/MM/YYYY");
	};

	// Get type label
	const getTypeLabel = (type: string) => {
		const found = expenseTypes.find((t) => t.value === type);
		return found?.label || type;
	};

	return (
		<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
			<MainCard
				title="Gestión de Gastos"
				secondary={
					<Stack direction="row" spacing={1}>
						<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={() => { fetchExpenses(); fetchStats(); }}>
							Actualizar
						</Button>
						<Button variant="contained" size="small" startIcon={<Add size={16} />} onClick={() => handleOpenDialog()}>
							Nuevo Gasto
						</Button>
					</Stack>
				}
			>
				<Stack spacing={3}>
					{/* Stats Cards */}
					<Grid container spacing={2}>
						<Grid item xs={12} sm={6} md={3}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<DollarCircle size={20} color={theme.palette.primary.main} />
										<Typography variant="body2" color="textSecondary">
											Total Gastos ({dayjs().year()})
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={100} height={40} />
									) : (
										<Typography variant="h4" color="primary">
											{formatCurrency(stats?.totals?.totalAmount || 0, "USD")}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<Calendar size={20} color={theme.palette.success.main} />
										<Typography variant="body2" color="textSecondary">
											Cantidad de Gastos
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={60} height={40} />
									) : (
										<Typography variant="h4" color="success.main">
											{stats?.totals?.totalCount || 0}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<DollarCircle size={20} color={theme.palette.warning.main} />
										<Typography variant="body2" color="textSecondary">
											Promedio por Gasto
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={80} height={40} />
									) : (
										<Typography variant="h4" color="warning.main">
											{formatCurrency(stats?.totals?.avgAmount || 0, "USD")}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Card variant="outlined">
								<CardContent>
									<Stack direction="row" spacing={1} alignItems="center" mb={1}>
										<DollarCircle size={20} color={theme.palette.error.main} />
										<Typography variant="body2" color="textSecondary">
											Gasto Máximo
										</Typography>
									</Stack>
									{loadingStats ? (
										<Skeleton variant="text" width={80} height={40} />
									) : (
										<Typography variant="h4" color="error.main">
											{formatCurrency(stats?.totals?.maxAmount || 0, "USD")}
										</Typography>
									)}
								</CardContent>
							</Card>
						</Grid>
					</Grid>

					{/* OpenAI Balance Section */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={2}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Wallet2 size={20} color={theme.palette.success.main} />
								<Typography variant="subtitle1" fontWeight={600}>Saldo OpenAI</Typography>
							</Stack>
							<Stack direction="row" spacing={1}>
								<Tooltip title="Sincronizar costos">
									<IconButton size="small" onClick={handleSyncOpenai} disabled={syncingOpenai || !openaiBalance?.configured}>
										<RefreshCircle size={18} className={syncingOpenai ? "rotating" : ""} />
									</IconButton>
								</Tooltip>
								<Tooltip title="Configurar saldo inicial">
									<IconButton size="small" onClick={() => setOpenaiConfigOpen(true)}>
										<Setting2 size={18} />
									</IconButton>
								</Tooltip>
							</Stack>
						</Stack>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={3}>
								<Box>
									<Typography variant="body2" color="textSecondary" gutterBottom>
										Saldo Inicial
									</Typography>
									{loadingOpenai ? (
										<Skeleton variant="text" width={80} height={32} />
									) : (
										<Typography variant="h5" color="primary">
											${openaiBalance?.initialBalance?.toFixed(2) || "0.00"}
										</Typography>
									)}
								</Box>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Box>
									<Typography variant="body2" color="textSecondary" gutterBottom>
										Costos Consumidos
									</Typography>
									{loadingOpenai ? (
										<Skeleton variant="text" width={80} height={32} />
									) : (
										<Typography variant="h5" color="error.main">
											${openaiBalance?.totalCosts?.toFixed(2) || "0.00"}
										</Typography>
									)}
								</Box>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Box>
									<Typography variant="body2" color="textSecondary" gutterBottom>
										Saldo Estimado
									</Typography>
									{loadingOpenai ? (
										<Skeleton variant="text" width={80} height={32} />
									) : (
										<Typography
											variant="h5"
											color={openaiBalance?.estimatedBalance && openaiBalance.estimatedBalance > 0 ? "success.main" : "warning.main"}
										>
											${openaiBalance?.estimatedBalance?.toFixed(2) || "0.00"}
										</Typography>
									)}
								</Box>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Box>
									<Typography variant="body2" color="textSecondary" gutterBottom>
										Última Sincronización
									</Typography>
									{loadingOpenai ? (
										<Skeleton variant="text" width={120} height={32} />
									) : (
										<Typography variant="body1">
											{openaiBalance?.lastSyncAt ? dayjs(openaiBalance.lastSyncAt).format("DD/MM/YYYY HH:mm") : "Nunca"}
										</Typography>
									)}
								</Box>
							</Grid>
						</Grid>
						{!openaiBalance?.configured && !loadingOpenai && (
							<Alert severity="info" sx={{ mt: 2 }}>
								Configura un saldo inicial para comenzar a trackear los costos de OpenAI.
								<Button size="small" onClick={() => setOpenaiConfigOpen(true)} sx={{ ml: 1 }}>
									Configurar
								</Button>
							</Alert>
						)}
					</Paper>

					{/* Filters */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center" mb={2}>
							<Filter size={18} />
							<Typography variant="subtitle2">Filtros</Typography>
						</Stack>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Tipo</InputLabel>
									<Select value={filterType} label="Tipo" onChange={(e) => { setFilterType(e.target.value); setPage(0); }}>
										<MenuItem value="">Todos</MenuItem>
										{expenseTypes.map((type) => (
											<MenuItem key={type.value} value={type.value}>
												{type.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<FormControl fullWidth size="small">
									<InputLabel>Estado</InputLabel>
									<Select value={filterStatus} label="Estado" onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
										<MenuItem value="">Todos</MenuItem>
										<MenuItem value="paid">Pagado</MenuItem>
										<MenuItem value="pending">Pendiente</MenuItem>
										<MenuItem value="cancelled">Cancelado</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Desde"
									value={filterStartDate}
									onChange={(date) => { setFilterStartDate(date); setPage(0); }}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<DatePicker
									label="Hasta"
									value={filterEndDate}
									onChange={(date) => { setFilterEndDate(date); setPage(0); }}
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<TextField
									fullWidth
									size="small"
									placeholder="Buscar..."
									value={searchTerm}
									onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
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
									<TableCell>Fecha</TableCell>
									<TableCell>Tipo</TableCell>
									<TableCell>Descripción</TableCell>
									<TableCell>Proveedor</TableCell>
									<TableCell align="right">Monto</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									Array.from({ length: 5 }).map((_, index) => (
										<TableRow key={index}>
											{Array.from({ length: 7 }).map((_, cellIndex) => (
												<TableCell key={cellIndex}>
													<Skeleton variant="text" />
												</TableCell>
											))}
										</TableRow>
									))
								) : expenses.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} align="center">
											<Alert severity="info" sx={{ justifyContent: "center" }}>
												No se encontraron gastos
											</Alert>
										</TableCell>
									</TableRow>
								) : (
									expenses.map((expense) => (
										<TableRow key={expense._id} hover>
											<TableCell>
												<Typography variant="body2">{formatDate(expense.date)}</Typography>
											</TableCell>
											<TableCell>
												<Chip label={getTypeLabel(expense.type)} size="small" variant="outlined" color="primary" />
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ maxWidth: 200 }} noWrap title={expense.description}>
													{expense.description}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" color="textSecondary">
													{expense.provider || "-"}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" fontWeight={600}>
													{formatCurrency(expense.amount, expense.currency)}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Chip
													label={STATUS_CONFIG[expense.status]?.label || expense.status}
													size="small"
													color={STATUS_CONFIG[expense.status]?.color || "default"}
												/>
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip title="Editar">
														<IconButton size="small" color="primary" onClick={() => handleOpenDialog(expense)}>
															<Edit2 size={16} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Eliminar">
														<IconButton size="small" color="error" onClick={() => handleDeleteClick(expense)}>
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
							labelRowsPerPage="Filas por página:"
							labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
						/>
					</TableContainer>
				</Stack>

				{/* Create/Edit Dialog */}
				<Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
					<DialogTitle>{editingExpense ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
					<DialogContent dividers>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<DatePicker
										label="Fecha *"
										value={dayjs(formData.date)}
										onChange={(date) => setFormData({ ...formData, date: date?.format("YYYY-MM-DD") || "" })}
										slotProps={{ textField: { size: "small", fullWidth: true } }}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<FormControl fullWidth size="small" required>
										<InputLabel>Tipo *</InputLabel>
										<Select
											value={formData.type}
											label="Tipo *"
											onChange={(e) => setFormData({ ...formData, type: e.target.value })}
										>
											{expenseTypes.map((type) => (
												<MenuItem key={type.value} value={type.value}>
													{type.label}
												</MenuItem>
											))}
										</Select>
									</FormControl>
								</Grid>
							</Grid>

							<TextField
								fullWidth
								size="small"
								label="Descripción *"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								required
							/>

							<Grid container spacing={2}>
								<Grid item xs={12} sm={4}>
									<TextField
										fullWidth
										size="small"
										label="Monto *"
										type="number"
										value={formData.amount}
										onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
										InputProps={{
											startAdornment: <InputAdornment position="start">$</InputAdornment>,
										}}
										required
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<FormControl fullWidth size="small">
										<InputLabel>Moneda</InputLabel>
										<Select
											value={formData.currency}
											label="Moneda"
											onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
										>
											<MenuItem value="USD">USD</MenuItem>
											<MenuItem value="ARS">ARS</MenuItem>
											<MenuItem value="EUR">EUR</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={12} sm={4}>
									<FormControl fullWidth size="small">
										<InputLabel>Estado</InputLabel>
										<Select
											value={formData.status}
											label="Estado"
											onChange={(e) => setFormData({ ...formData, status: e.target.value })}
										>
											<MenuItem value="paid">Pagado</MenuItem>
											<MenuItem value="pending">Pendiente</MenuItem>
											<MenuItem value="cancelled">Cancelado</MenuItem>
										</Select>
									</FormControl>
								</Grid>
							</Grid>

							<TextField
								fullWidth
								size="small"
								label="Proveedor"
								value={formData.provider}
								onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
								helperText="Nombre de la empresa o servicio"
							/>

							<TextField
								fullWidth
								size="small"
								label="Referencia"
								value={formData.reference}
								onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
								helperText="Número de factura, orden, etc."
							/>

							<TextField
								fullWidth
								size="small"
								label="Notas"
								value={formData.notes}
								onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
								multiline
								rows={2}
							/>

							<FormControlLabel
								control={
									<Switch
										checked={formData.isRecurring}
										onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
									/>
								}
								label="Gasto recurrente"
							/>

							{formData.isRecurring && (
								<FormControl fullWidth size="small">
									<InputLabel>Periodicidad</InputLabel>
									<Select
										value={formData.recurringPeriod}
										label="Periodicidad"
										onChange={(e) => setFormData({ ...formData, recurringPeriod: e.target.value })}
									>
										<MenuItem value="daily">Diario</MenuItem>
										<MenuItem value="weekly">Semanal</MenuItem>
										<MenuItem value="monthly">Mensual</MenuItem>
										<MenuItem value="quarterly">Trimestral</MenuItem>
										<MenuItem value="yearly">Anual</MenuItem>
									</Select>
								</FormControl>
							)}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCloseDialog} disabled={saving}>
							Cancelar
						</Button>
						<Button variant="contained" onClick={handleSubmit} disabled={saving}>
							{saving ? "Guardando..." : editingExpense ? "Actualizar" : "Crear"}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Delete Confirmation Dialog */}
				<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
					<DialogTitle>Confirmar Eliminación</DialogTitle>
					<DialogContent>
						<Typography>
							¿Estás seguro de que querés eliminar este gasto?
						</Typography>
						{expenseToDelete && (
							<Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
								<Typography variant="body2">
									<strong>Fecha:</strong> {formatDate(expenseToDelete.date)}
								</Typography>
								<Typography variant="body2">
									<strong>Tipo:</strong> {getTypeLabel(expenseToDelete.type)}
								</Typography>
								<Typography variant="body2">
									<strong>Monto:</strong> {formatCurrency(expenseToDelete.amount, expenseToDelete.currency)}
								</Typography>
								<Typography variant="body2">
									<strong>Descripción:</strong> {expenseToDelete.description}
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

				{/* OpenAI Config Dialog */}
				<Dialog open={openaiConfigOpen} onClose={() => setOpenaiConfigOpen(false)} maxWidth="sm" fullWidth>
					<DialogTitle>Configurar Saldo OpenAI</DialogTitle>
					<DialogContent>
						<Stack spacing={3} sx={{ mt: 1 }}>
							<Alert severity="info">
								Configura el saldo inicial y la fecha desde la cual comenzar a trackear los costos.
								El sistema calculará automáticamente el saldo restante basado en los costos reportados por la API de OpenAI.
							</Alert>
							<TextField
								label="Saldo Inicial (USD)"
								type="number"
								fullWidth
								value={openaiConfigForm.initialBalance}
								onChange={(e) => setOpenaiConfigForm({ ...openaiConfigForm, initialBalance: parseFloat(e.target.value) || 0 })}
								InputProps={{
									startAdornment: <InputAdornment position="start">$</InputAdornment>,
								}}
								helperText="Ingresa el monto que cargaste en tu cuenta de OpenAI"
							/>
							<DatePicker
								label="Fecha de Inicio"
								value={dayjs(openaiConfigForm.initialBalanceDate)}
								onChange={(date) => setOpenaiConfigForm({ ...openaiConfigForm, initialBalanceDate: date?.format("YYYY-MM-DD") || dayjs().format("YYYY-MM-DD") })}
								slotProps={{
									textField: {
										fullWidth: true,
										helperText: "Fecha desde la cual calcular los costos consumidos",
									},
								}}
							/>
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setOpenaiConfigOpen(false)} disabled={savingOpenaiConfig}>
							Cancelar
						</Button>
						<Button variant="contained" onClick={handleSaveOpenaiConfig} disabled={savingOpenaiConfig}>
							{savingOpenaiConfig ? "Guardando..." : "Guardar"}
						</Button>
					</DialogActions>
				</Dialog>
			</MainCard>
		</LocalizationProvider>
	);
};

export default ExpensesPage;
