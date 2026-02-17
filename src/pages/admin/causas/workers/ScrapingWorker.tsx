import React from "react";
import { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Switch,
	TextField,
	Button,
	Stack,
	IconButton,
	Tooltip,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Chip,
	Select,
	MenuItem,
	FormControl,
	LinearProgress,
	TablePagination,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	TableSortLabel,
	Popover,
	Tabs,
	Tab,
} from "@mui/material";
import { Edit2, TickCircle, CloseCircle, Refresh, Setting2, Trash, AddCircle, Warning2, SearchNormal1, Code1, InfoCircle, Eye, EyeSlash, Cpu, Setting4, Clock } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, WorkerConfig, ScrapingHistory } from "api/workers";
import AdvancedConfigModal from "./AdvancedConfigModal";
import CreateConfigModal from "./CreateConfigModal";
import TemporaryWorkersModal from "./TemporaryWorkersModal";
import ScrapingManagerPanel from "./ScrapingManagerPanel";
import RangeHistoryPanel from "./RangeHistoryPanel";

// Enums para el worker de scraping
const FUERO_OPTIONS = [
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

// Años disponibles para filtros (de más reciente a más antiguo)
const YEAR_OPTIONS = ["2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"];

const ScrapingWorker = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [configs, setConfigs] = useState<WorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Partial<WorkerConfig>>({});
	const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
	const [selectedConfig, setSelectedConfig] = useState<WorkerConfig | null>(null);
	const [createConfigOpen, setCreateConfigOpen] = useState(false);
	const [temporaryWorkersOpen, setTemporaryWorkersOpen] = useState(false);
	const [scrapingHistory, setScrapingHistory] = useState<ScrapingHistory[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyPage, setHistoryPage] = useState(1);
	const [historyTotal, setHistoryTotal] = useState(0);

	// Estados de filtros y ordenamiento para historial
	const [historyFueroFilter, setHistoryFueroFilter] = useState<string>("TODOS");
	const [historyYearFilter, setHistoryYearFilter] = useState<string>("TODOS");
	const [historySortBy, setHistorySortBy] = useState<string>("completedAt");
	const [historySortOrder, setHistorySortOrder] = useState<"asc" | "desc">("desc");

	const [fueroFilter, setFueroFilter] = useState<string>("TODOS");
	const [yearFilter, setYearFilter] = useState<string>("TODOS");
	const [progresoFilter, setProgresoFilter] = useState<string>("TODOS");
	const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
	const [workerIdInput, setWorkerIdInput] = useState<string>(""); // Valor del input
	const [workerIdFilter, setWorkerIdFilter] = useState<string>(""); // Filtro aplicado

	// Estados de ordenamiento
	const [sortBy, setSortBy] = useState<string>("nombre");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	// Estados de paginación para configuraciones
	const [configPage, setConfigPage] = useState(0); // MUI TablePagination usa índice 0
	const [configRowsPerPage, setConfigRowsPerPage] = useState(10);
	const [configTotal, setConfigTotal] = useState(0);
	const [configTotalSnapshot, setConfigTotalSnapshot] = useState<number | null>(null); // Snapshot para mantener paginación estable

	// Estados para eliminar
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [configToDelete, setConfigToDelete] = useState<WorkerConfig | null>(null);
	const [deleting, setDeleting] = useState(false);

	// Estados para vista raw JSON
	const [rawViewOpen, setRawViewOpen] = useState(false);
	const [rawViewConfig, setRawViewConfig] = useState<WorkerConfig | null>(null);

	// Estado para popovers de información
	const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLButtonElement | null>(null);
	const [notFoundInfoAnchorEl, setNotFoundInfoAnchorEl] = useState<HTMLButtonElement | null>(null);
	const [errorsInfoAnchorEl, setErrorsInfoAnchorEl] = useState<HTMLButtonElement | null>(null);
	const [totalsInfoAnchorEl, setTotalsInfoAnchorEl] = useState<HTMLButtonElement | null>(null);

	// Estado para mostrar/ocultar columnas extra (Balance, Captchas, Proxy)
	const [showExtraColumns, setShowExtraColumns] = useState<boolean>(false);

	// Sub-tabs: Configuraciones vs Manager PM2
	const [subTab, setSubTab] = useState<number>(0);

	// Cargar configuraciones
	const fetchConfigs = async (
		page = 0,
		limit = 20,
		fuero = fueroFilter,
		year = yearFilter,
		progreso = progresoFilter,
		estado = estadoFilter,
		orderBy = sortBy,
		order = sortOrder,
		workerId = workerIdFilter,
	) => {
		try {
			setLoading(true);

			// Si ordenamos por progreso, necesitamos obtener TODOS los datos
			// porque el progreso se calcula en el frontend
			const isProgressSort = orderBy === "progress";

			// La API usa páginas 1-based, pero MUI usa 0-based
			const params: any = {
				page: isProgressSort ? 1 : page + 1,
				limit: isProgressSort ? 1000 : limit, // Límite alto para obtener todos los datos
			};

			// Solo enviar sortBy y sortOrder si NO estamos ordenando por progreso
			if (!isProgressSort) {
				params.sortBy = orderBy;
				params.sortOrder = order;
			}

			if (fuero && fuero !== "TODOS") {
				params.fuero = fuero;
			}
			if (year && year !== "TODOS") {
				params.year = year;
			}
			if (progreso && progreso !== "TODOS") {
				params.progreso = progreso;
			}
			if (estado && estado !== "TODOS") {
				params.enabled = estado === "activo";
			}
			if (workerId && workerId.trim() !== "") {
				params.worker_id = workerId.trim();
			}
			// El backend filtra por isTemporary: false por defecto
			// No es necesario enviar includeTemporary=false explícitamente
			const response = await WorkersService.getScrapingConfigs(params);

			if (response.success && Array.isArray(response.data)) {
				// Capturar snapshot del total en la primera carga
				if (configTotalSnapshot === null) {
					setConfigTotalSnapshot(response.total || 0);
				}

				setConfigs(response.data);
				setConfigTotal(response.total || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las configuraciones de scraping", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	// Cargar historial de scraping
	const fetchScrapingHistory = async (
		page = 1,
		fuero = historyFueroFilter,
		year = historyYearFilter,
		orderBy = historySortBy,
		order = historySortOrder,
	) => {
		try {
			setHistoryLoading(true);

			const params: any = { page, limit: 10, sortBy: orderBy, sortOrder: order };
			if (fuero && fuero !== "TODOS") {
				params.fuero = fuero;
			}
			if (year && year !== "TODOS") {
				params.year = year;
			}

			const response = await WorkersService.getScrapingHistory(params);
			if (response.success) {
				setScrapingHistory(response.data);
				setHistoryTotal(response.total || 0);
				setHistoryPage(page);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar el historial de scraping", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setHistoryLoading(false);
		}
	};

	useEffect(() => {
		// Si estamos ordenando por progreso, solo re-fetch cuando cambian filtros/sort, NO cuando cambia la página
		// porque ya tenemos todos los datos y la paginación se hace client-side
		fetchConfigs(configPage, configRowsPerPage, fueroFilter, yearFilter, progresoFilter, estadoFilter, sortBy, sortOrder, workerIdFilter);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		// Solo incluir configPage en las dependencias si NO estamos ordenando por progreso
		...(sortBy !== "progress" ? [configPage] : []),
		configRowsPerPage,
		fueroFilter,
		yearFilter,
		progresoFilter,
		estadoFilter,
		sortBy,
		sortOrder,
		workerIdFilter,
	]);

	useEffect(() => {
		fetchScrapingHistory(historyPage, historyFueroFilter, historyYearFilter, historySortBy, historySortOrder);
	}, [historyPage, historyFueroFilter, historyYearFilter, historySortBy, historySortOrder]);

	// Handlers de paginación
	const handleChangePage = (_event: unknown, newPage: number) => {
		setConfigPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setConfigRowsPerPage(parseInt(event.target.value, 10));
		setConfigPage(0); // Reset a la primera página
	};

	// Refrescar datos y resetear snapshot
	const handleRefresh = () => {
		setConfigTotalSnapshot(null); // Resetear snapshot
		setConfigPage(0); // Volver a página 1
		fetchConfigs(0, configRowsPerPage, fueroFilter);
		fetchScrapingHistory();
	};

	// Handler para cambio de filtro de fuero
	const handleFueroFilterChange = (newFuero: string) => {
		setFueroFilter(newFuero);
		setConfigTotalSnapshot(null); // Resetear snapshot al cambiar filtro
		setConfigPage(0); // Volver a página 1
	};

	// Handler para cambio de filtro de año
	const handleYearFilterChange = (newYear: string) => {
		setYearFilter(newYear);
		setConfigTotalSnapshot(null);
		setConfigPage(0);
	};

	// Handler para cambio de filtro de progreso
	const handleProgresoFilterChange = (newProgreso: string) => {
		setProgresoFilter(newProgreso);
		setConfigTotalSnapshot(null);
		setConfigPage(0);
	};

	// Handler para cambio de filtro de estado
	const handleEstadoFilterChange = (newEstado: string) => {
		setEstadoFilter(newEstado);
		setConfigTotalSnapshot(null);
		setConfigPage(0);
	};

	// Handler para buscar por worker_id (se ejecuta con el botón)
	const handleWorkerIdSearch = () => {
		setWorkerIdFilter(workerIdInput.trim());
		setConfigTotalSnapshot(null);
		setConfigPage(0);
	};

	// Handler para limpiar la búsqueda de worker_id
	const handleWorkerIdClear = () => {
		setWorkerIdInput("");
		setWorkerIdFilter("");
		setConfigTotalSnapshot(null);
		setConfigPage(0);
	};

	// Handler para ordenamiento de columnas
	const handleSort = (field: string) => {
		if (sortBy === field) {
			// Si ya está ordenado por este campo, cambiar dirección
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			// Nuevo campo, ordenar ascendente
			setSortBy(field);
			setSortOrder("asc");
		}
	};

	// Handlers para historial
	const handleHistorySort = (field: string) => {
		if (historySortBy === field) {
			setHistorySortOrder(historySortOrder === "asc" ? "desc" : "asc");
		} else {
			setHistorySortBy(field);
			setHistorySortOrder("asc");
		}
	};

	const handleHistoryFueroFilterChange = (newFuero: string) => {
		setHistoryFueroFilter(newFuero);
		setHistoryPage(1);
	};

	const handleHistoryYearFilterChange = (newYear: string) => {
		setHistoryYearFilter(newYear);
		setHistoryPage(1);
	};

	// Abrir diálogo de confirmación de eliminación
	const handleOpenDeleteDialog = (config: WorkerConfig) => {
		setConfigToDelete(config);
		setDeleteDialogOpen(true);
	};

	// Cerrar diálogo de confirmación
	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setConfigToDelete(null);
	};

	// Eliminar configuración
	const handleDeleteConfig = async () => {
		if (!configToDelete) return;

		const configId = getConfigId(configToDelete);

		try {
			setDeleting(true);
			await WorkersService.deleteScrapingConfig(configId);

			enqueueSnackbar("Configuración eliminada exitosamente", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});

			handleCloseDeleteDialog();
			// Resetear snapshot ya que el total realmente cambió
			setConfigTotalSnapshot(null);
			setConfigPage(0);
			fetchConfigs(0, configRowsPerPage, fueroFilter);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al eliminar la configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setDeleting(false);
		}
	};

	// Obtener el ID real del documento
	const getConfigId = (config: WorkerConfig): string => {
		if (typeof config._id === "string") {
			return config._id;
		}
		return config._id.$oid;
	};

	// Formatear fecha
	const formatDate = (date: any): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleString("es-ES");
	};

	// Calcular tiempo relativo
	const getRelativeTime = (date: any): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const timestamp = new Date(dateStr).getTime();
		const now = Date.now();
		const diff = now - timestamp;

		// Convertir a segundos
		const seconds = Math.floor(diff / 1000);
		if (seconds < 60) {
			return `hace ${seconds} segundo${seconds !== 1 ? "s" : ""}`;
		}

		// Convertir a minutos
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `hace ${minutes} minuto${minutes !== 1 ? "s" : ""}`;
		}

		// Convertir a horas
		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `hace ${hours} hora${hours !== 1 ? "s" : ""}`;
		}

		// Convertir a días
		const days = Math.floor(hours / 24);
		if (days < 30) {
			return `hace ${days} día${days !== 1 ? "s" : ""}`;
		}

		// Convertir a meses
		const months = Math.floor(days / 30);
		if (months < 12) {
			return `hace ${months} mes${months !== 1 ? "es" : ""}`;
		}

		// Convertir a años
		const years = Math.floor(months / 12);
		return `hace ${years} año${years !== 1 ? "s" : ""}`;
	};

	// Calcular progreso del rango
	const calculateProgress = (config: WorkerConfig): number => {
		if (!config.range_start || !config.range_end || !config.number) return 0;
		const total = config.range_end - config.range_start;
		const current = config.number - config.range_start;
		return Math.min(100, Math.max(0, (current / total) * 100));
	};

	// Manejar edición
	const handleEdit = (config: WorkerConfig) => {
		const id = getConfigId(config);
		setEditingId(id);
		setEditValues({
			worker_id: config.worker_id,
			fuero: config.fuero,
			enabled: config.enabled,
			year: config.year,
			number: config.number,
			max_number: config.max_number,
			range_start: config.range_start,
			range_end: config.range_end,
			captcha: config.captcha,
			proxy: config.proxy,
		});
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditValues({});
	};

	const handleSave = async () => {
		if (!editingId) return;

		try {
			const response = await WorkersService.updateScrapingConfig(editingId, editValues);
			if (response.success) {
				enqueueSnackbar("Configuración actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfigs();
				handleCancelEdit();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar la configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleToggleEnabled = async (config: WorkerConfig) => {
		const id = getConfigId(config);
		try {
			const response = await WorkersService.updateScrapingConfig(id, {
				enabled: !config.enabled,
			});
			if (response.success) {
				enqueueSnackbar(`Worker ${!config.enabled ? "activado" : "desactivado"}`, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfigs();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar el estado", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Manejar configuración avanzada
	const handleAdvancedConfig = (config: WorkerConfig) => {
		setSelectedConfig(config);
		setAdvancedConfigOpen(true);
	};

	const handleCloseAdvancedConfig = () => {
		setAdvancedConfigOpen(false);
		setSelectedConfig(null);
	};

	// Manejar vista raw JSON
	const handleOpenRawView = (config: WorkerConfig) => {
		setRawViewConfig(config);
		setRawViewOpen(true);
	};

	const handleCloseRawView = () => {
		setRawViewOpen(false);
		setRawViewConfig(null);
	};

	// Manejar modal de crear configuración
	const handleOpenCreateConfig = () => {
		setCreateConfigOpen(true);
	};

	const handleCloseCreateConfig = () => {
		setCreateConfigOpen(false);
	};

	const handleCreateSuccess = () => {
		setConfigTotalSnapshot(null);
		setConfigPage(0);
		fetchConfigs(0, configRowsPerPage, fueroFilter);
	};

	if (loading) {
		return (
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{[1, 2, 3, 4].map((item) => (
					<Grid item xs={12} key={item}>
						<Skeleton variant="rectangular" height={80} />
					</Grid>
				))}
			</Grid>
		);
	}

	// El filtrado se hace en el servidor, pero el ordenamiento por progreso se hace localmente
	let filteredConfigs = [...configs];

	// Si se está ordenando por progreso, ordenar localmente y aplicar paginación manual
	if (sortBy === "progress") {
		// Primero ordenar todos los datos
		filteredConfigs = filteredConfigs.sort((a, b) => {
			const progressA = calculateProgress(a);
			const progressB = calculateProgress(b);
			return sortOrder === "asc" ? progressA - progressB : progressB - progressA;
		});

		// Luego aplicar paginación client-side
		const startIndex = configPage * configRowsPerPage;
		const endIndex = startIndex + configRowsPerPage;
		filteredConfigs = filteredConfigs.slice(startIndex, endIndex);
	}

	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Sub-tabs: Configuraciones / Manager PM2 */}
			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="scrollable" scrollButtons="auto">
					<Tab icon={<Setting4 size={18} />} iconPosition="start" label="Configuraciones" />
					<Tab icon={<Cpu size={18} />} iconPosition="start" label="Manager PM2" />
					<Tab icon={<Clock size={18} />} iconPosition="start" label="Historial de Rangos" />
				</Tabs>
			</Box>

			{subTab === 1 && <ScrapingManagerPanel />}

			{subTab === 2 && <RangeHistoryPanel />}

			{subTab === 0 && <>
			{/* Header: Título y Acciones */}
			<Box
				display="flex"
				flexDirection={{ xs: "column", sm: "row" }}
				justifyContent="space-between"
				alignItems={{ xs: "stretch", sm: "center" }}
				gap={2}
			>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Typography variant="h5">Configuración del Worker de Scraping</Typography>
					<Tooltip title="Ver información">
						<IconButton
							size="small"
							color="info"
							onClick={(e) => setInfoAnchorEl(e.currentTarget)}
						>
							<InfoCircle size={20} />
						</IconButton>
					</Tooltip>
					<Popover
						open={Boolean(infoAnchorEl)}
						anchorEl={infoAnchorEl}
						onClose={() => setInfoAnchorEl(null)}
						anchorOrigin={{
							vertical: "bottom",
							horizontal: "left",
						}}
						transformOrigin={{
							vertical: "top",
							horizontal: "left",
						}}
					>
						<Box sx={{ p: 2, maxWidth: 400 }}>
							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
								Worker de Scraping de Causas
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Este worker se encarga de buscar y recopilar automáticamente nuevas causas judiciales desde los sistemas del Poder Judicial,
								procesando rangos de números de expedientes por fuero y año.
							</Typography>
						</Box>
					</Popover>
				</Stack>
				<Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
					<Button variant="contained" color="primary" size="small" startIcon={<AddCircle size={18} />} onClick={handleOpenCreateConfig}>
						Nuevo Worker
					</Button>
					<Button
						variant="outlined"
						color="warning"
						size="small"
						startIcon={<Warning2 size={18} />}
						onClick={() => setTemporaryWorkersOpen(true)}
					>
						Temporarios
					</Button>
				</Stack>
			</Box>

			{/* Búsqueda y Filtros */}
			<Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
				<Grid container spacing={2} alignItems="center">
					{/* Búsqueda por Worker ID */}
					<Grid item xs={12} md={5} lg={4}>
						<Stack spacing={1}>
							<Typography variant="caption" color="text.secondary" fontWeight={500}>
								Búsqueda
							</Typography>
							<Stack direction="row" spacing={1} alignItems="center">
								<TextField
									size="small"
									placeholder="Buscar por Worker ID"
									value={workerIdInput}
									onChange={(e) => setWorkerIdInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") handleWorkerIdSearch();
									}}
									fullWidth
									InputProps={{
										sx: { fontSize: "0.875rem" },
									}}
								/>
								<Button
									variant="contained"
									size="small"
									startIcon={<SearchNormal1 size={16} />}
									onClick={handleWorkerIdSearch}
									disabled={loading}
									sx={{ minWidth: "auto", whiteSpace: "nowrap" }}
								>
									Buscar
								</Button>
								{workerIdFilter && (
									<Button
										variant="outlined"
										size="small"
										color="secondary"
										onClick={handleWorkerIdClear}
										sx={{ minWidth: "auto" }}
									>
										Limpiar
									</Button>
								)}
							</Stack>
						</Stack>
					</Grid>

					{/* Separador vertical en desktop */}
					<Grid item xs={12} md="auto" sx={{ display: { xs: "none", md: "block" } }}>
						<Box sx={{ borderLeft: 1, borderColor: "divider", height: 50, mx: 1 }} />
					</Grid>

					{/* Filtros */}
					<Grid item xs={12} md>
						<Stack spacing={1}>
							<Typography variant="caption" color="text.secondary" fontWeight={500}>
								Filtros
							</Typography>
							<Stack
								direction={{ xs: "column", sm: "row" }}
								spacing={1}
								alignItems={{ xs: "stretch", sm: "center" }}
								flexWrap="wrap"
								useFlexGap
							>
								<FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
									<Select value={fueroFilter} onChange={(e) => handleFueroFilterChange(e.target.value)} displayEmpty>
										<MenuItem value="TODOS">Todos los Fueros</MenuItem>
										{FUERO_OPTIONS.map((option) => (
											<MenuItem key={option.value} value={option.value}>
												{option.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 120 } }}>
									<Select value={yearFilter} onChange={(e) => handleYearFilterChange(e.target.value)} displayEmpty>
										<MenuItem value="TODOS">Todos los Años</MenuItem>
										{YEAR_OPTIONS.map((year) => (
											<MenuItem key={year} value={year}>
												{year}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 130 } }}>
									<Select value={progresoFilter} onChange={(e) => handleProgresoFilterChange(e.target.value)} displayEmpty>
										<MenuItem value="TODOS">Progreso</MenuItem>
										<MenuItem value="completo">
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography variant="body2">Completo</Typography>
												<Chip label="100%" size="small" color="success" />
											</Stack>
										</MenuItem>
										<MenuItem value="incompleto">
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography variant="body2">En Progreso</Typography>
												<Chip label="<100%" size="small" color="warning" />
											</Stack>
										</MenuItem>
									</Select>
								</FormControl>
								<FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 120 } }}>
									<Select value={estadoFilter} onChange={(e) => handleEstadoFilterChange(e.target.value)} displayEmpty>
										<MenuItem value="TODOS">Estado</MenuItem>
										<MenuItem value="activo">
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography variant="body2">Activos</Typography>
												<Chip label="ON" size="small" color="success" />
											</Stack>
										</MenuItem>
										<MenuItem value="inactivo">
											<Stack direction="row" spacing={1} alignItems="center">
												<Typography variant="body2">Inactivos</Typography>
												<Chip label="OFF" size="small" color="default" />
											</Stack>
										</MenuItem>
									</Select>
								</FormControl>
								<Tooltip title="Refrescar datos y actualizar conteo total">
									<Button
										variant="outlined"
										size="small"
										startIcon={<Refresh size={16} />}
										onClick={handleRefresh}
										sx={{ minWidth: { xs: "100%", sm: "auto" } }}
									>
										Actualizar
									</Button>
								</Tooltip>
								<Tooltip title={showExtraColumns ? "Ocultar columnas extra" : "Mostrar Balance, Captchas y Proxy"}>
									<Button
										variant={showExtraColumns ? "contained" : "outlined"}
										size="small"
										color="secondary"
										startIcon={showExtraColumns ? <EyeSlash size={16} /> : <Eye size={16} />}
										onClick={() => setShowExtraColumns(!showExtraColumns)}
										sx={{ minWidth: { xs: "100%", sm: "auto" } }}
									>
										{showExtraColumns ? "Menos columnas" : "Más columnas"}
									</Button>
								</Tooltip>
							</Stack>
						</Stack>
					</Grid>
				</Grid>
			</Paper>

			{/* Tabla de configuraciones */}
			<TableContainer component={Paper} variant="outlined">
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>
								<TableSortLabel
									active={sortBy === "nombre"}
									direction={sortBy === "nombre" ? sortOrder : "asc"}
									onClick={() => handleSort("nombre")}
								>
									Worker ID
								</TableSortLabel>
							</TableCell>
							<TableCell>
								<TableSortLabel
									active={sortBy === "fuero"}
									direction={sortBy === "fuero" ? sortOrder : "asc"}
									onClick={() => handleSort("fuero")}
								>
									Fuero
								</TableSortLabel>
							</TableCell>
							<TableCell align="center">
								<Stack spacing={0}>
									<TableSortLabel
										active={sortBy === "number"}
										direction={sortBy === "number" ? sortOrder : "asc"}
										onClick={() => handleSort("number")}
									>
										Expediente
									</TableSortLabel>
									<Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
										Número / Año
									</Typography>
								</Stack>
							</TableCell>
							<TableCell align="center">
								<TableSortLabel
									active={sortBy === "range_start"}
									direction={sortBy === "range_start" ? sortOrder : "asc"}
									onClick={() => handleSort("range_start")}
								>
									Rango
								</TableSortLabel>
							</TableCell>
							<TableCell align="center">
								<Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
									<Typography variant="body2" fontWeight={500}>
										Totales
									</Typography>
									<Tooltip title="Ver información">
										<IconButton
											size="small"
											color="info"
											onClick={(e) => {
												e.stopPropagation();
												setTotalsInfoAnchorEl(e.currentTarget);
											}}
											sx={{ p: 0.25 }}
										>
											<InfoCircle size={16} />
										</IconButton>
									</Tooltip>
									<Popover
										open={Boolean(totalsInfoAnchorEl)}
										anchorEl={totalsInfoAnchorEl}
										onClose={() => setTotalsInfoAnchorEl(null)}
										anchorOrigin={{
											vertical: "bottom",
											horizontal: "center",
										}}
										transformOrigin={{
											vertical: "top",
											horizontal: "center",
										}}
									>
										<Box sx={{ p: 2, maxWidth: 350 }}>
											<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
												Contadores totales del worker
											</Typography>
											<Stack spacing={1} sx={{ mt: 1 }}>
												<Stack direction="row" spacing={1} alignItems="center">
													<Chip label="V" size="small" color="success" sx={{ minWidth: 24 }} />
													<Typography variant="body2" color="text.secondary">
														<strong>Válidos:</strong> Expedientes encontrados y procesados exitosamente.
													</Typography>
												</Stack>
												<Stack direction="row" spacing={1} alignItems="center">
													<Chip label="I" size="small" color="warning" sx={{ minWidth: 24 }} />
													<Typography variant="body2" color="text.secondary">
														<strong>Inexistentes:</strong> Expedientes que el PJN reporta como no disponibles.
													</Typography>
												</Stack>
												<Stack direction="row" spacing={1} alignItems="center">
													<Chip label="E" size="small" color="error" sx={{ minWidth: 24 }} />
													<Typography variant="body2" color="text.secondary">
														<strong>Errores:</strong> Fallos técnicos (captcha, conexión, timeout).
													</Typography>
												</Stack>
											</Stack>
										</Box>
									</Popover>
								</Stack>
							</TableCell>
							<TableCell align="center">
								<Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
									<TableSortLabel
										active={sortBy === "consecutive_not_found"}
										direction={sortBy === "consecutive_not_found" ? sortOrder : "asc"}
										onClick={() => handleSort("consecutive_not_found")}
										sx={{ "& .MuiTableSortLabel-icon": { opacity: 1 } }}
									>
										<Typography variant="body2" fontWeight={500}>Inválidos Consecutivos</Typography>
									</TableSortLabel>
									<Tooltip title="Ver información">
										<IconButton
											size="small"
											color="info"
											onClick={(e) => {
												e.stopPropagation();
												setNotFoundInfoAnchorEl(e.currentTarget);
											}}
											sx={{ p: 0.25 }}
										>
											<InfoCircle size={16} />
										</IconButton>
									</Tooltip>
									<Popover
										open={Boolean(notFoundInfoAnchorEl)}
										anchorEl={notFoundInfoAnchorEl}
										onClose={() => setNotFoundInfoAnchorEl(null)}
										anchorOrigin={{
											vertical: "bottom",
											horizontal: "center",
										}}
										transformOrigin={{
											vertical: "top",
											horizontal: "center",
										}}
									>
										<Box sx={{ p: 2, maxWidth: 450 }}>
											<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
												Contador de documentos no encontrados consecutivos
											</Typography>
											<Stack component="ul" spacing={1} sx={{ pl: 2, my: 1 }}>
												<Typography component="li" variant="body2" color="text.secondary">
													Se incrementa cuando el PJN responde que el expediente es inexistente o no está disponible para consulta pública.
												</Typography>
												<Typography component="li" variant="body2" color="text.secondary">
													Se resetea a cero cuando se encuentra y procesa exitosamente un expediente válido.
												</Typography>
												<Typography component="li" variant="body2" color="text.secondary">
													No se modifica cuando hay errores técnicos durante el scraping (fallos de captcha, errores de conexión, timeouts, etc.).
												</Typography>
											</Stack>
											<Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
												Sobre el rango mostrado
											</Typography>
											<Typography variant="body2" color="text.secondary">
												El rango indica el primer y último número de expediente marcados como "no encontrados" dentro de la secuencia actual. Si el número actual del worker es mayor al final del rango, significa que los números intermedios tuvieron errores técnicos y no fueron clasificados como existentes ni inexistentes.
											</Typography>
										</Box>
									</Popover>
								</Stack>
							</TableCell>
							<TableCell align="center">
								<Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
									<Typography variant="body2" fontWeight={600}>
										Errores Consecutivos
									</Typography>
									<Tooltip title="Ver información">
										<IconButton
											size="small"
											color="info"
											onClick={(e) => {
												e.stopPropagation();
												setErrorsInfoAnchorEl(e.currentTarget);
											}}
											sx={{ p: 0.25 }}
										>
											<InfoCircle size={16} />
										</IconButton>
									</Tooltip>
									<Popover
										open={Boolean(errorsInfoAnchorEl)}
										anchorEl={errorsInfoAnchorEl}
										onClose={() => setErrorsInfoAnchorEl(null)}
										anchorOrigin={{
											vertical: "bottom",
											horizontal: "center",
										}}
										transformOrigin={{
											vertical: "top",
											horizontal: "center",
										}}
									>
										<Box sx={{ p: 2, maxWidth: 450 }}>
											<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
												Contador de errores técnicos consecutivos
											</Typography>
											<Stack component="ul" spacing={1} sx={{ pl: 2, my: 1 }}>
												<Typography component="li" variant="body2" color="text.secondary">
													Se incrementa cuando ocurre un error técnico durante el scraping (fallos de captcha, errores de conexión, timeouts, etc.).
												</Typography>
												<Typography component="li" variant="body2" color="text.secondary">
													Se resetea a cero cuando se procesa exitosamente un expediente (válido o inexistente).
												</Typography>
												<Typography component="li" variant="body2" color="text.secondary">
													Un valor alto puede indicar problemas con el servicio de captcha, proxy o el servidor del PJN.
												</Typography>
											</Stack>
											<Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
												Sobre el rango mostrado
											</Typography>
											<Typography variant="body2" color="text.secondary">
												El rango indica el primer y último número de expediente donde ocurrieron errores técnicos consecutivos. Útil para identificar rangos problemáticos.
											</Typography>
										</Box>
									</Popover>
								</Stack>
							</TableCell>
							<TableCell align="center">
								<TableSortLabel
									active={sortBy === "progress"}
									direction={sortBy === "progress" ? sortOrder : "asc"}
									onClick={() => handleSort("progress")}
								>
									Progreso
								</TableSortLabel>
							</TableCell>
							{showExtraColumns && <TableCell align="center">Balance</TableCell>}
							{showExtraColumns && <TableCell align="center">Captchas</TableCell>}
							{showExtraColumns && <TableCell align="center">Proxy</TableCell>}
							<TableCell align="center">
								<TableSortLabel
									active={sortBy === "enabled"}
									direction={sortBy === "enabled" ? sortOrder : "asc"}
									onClick={() => handleSort("enabled")}
								>
									Estado
								</TableSortLabel>
							</TableCell>
							<TableCell align="center">
								<TableSortLabel
									active={sortBy === "updatedAt"}
									direction={sortBy === "updatedAt" ? sortOrder : "asc"}
									onClick={() => handleSort("updatedAt")}
								>
									Última Verificación
								</TableSortLabel>
							</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filteredConfigs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={showExtraColumns ? 14 : 11} align="center">
									<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
										{fueroFilter === "TODOS"
											? "No hay configuraciones disponibles"
											: `No hay configuraciones para el fuero ${FUERO_OPTIONS.find((f) => f.value === fueroFilter)?.label || fueroFilter}`}
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							filteredConfigs.map((config) => {
								const configId = getConfigId(config);
								const isEditing = editingId === configId;
								const progress = calculateProgress(config);

								return (
									<TableRow key={configId}>
										<TableCell>
											{isEditing ? (
												<TextField
													size="small"
													value={editValues.worker_id || ""}
													onChange={(e) => setEditValues({ ...editValues, worker_id: e.target.value })}
													fullWidth
												/>
											) : (
												<Stack spacing={0.5}>
													<Typography variant="body2" fontWeight={500}>
														{config.worker_id}
													</Typography>
													<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}>
														{configId}
													</Typography>
												</Stack>
											)}
										</TableCell>
										<TableCell>
											{isEditing ? (
												<FormControl size="small" fullWidth>
													<Select value={editValues.fuero || ""} onChange={(e) => setEditValues({ ...editValues, fuero: e.target.value })}>
														{FUERO_OPTIONS.map((option) => (
															<MenuItem key={option.value} value={option.value}>
																{option.label}
															</MenuItem>
														))}
													</Select>
												</FormControl>
											) : (
												<Chip label={config.fuero || ""} size="small" color="primary" variant="outlined" />
											)}
										</TableCell>
										<TableCell align="center">
											{isEditing ? (
												<Stack spacing={1}>
													<TextField
														size="small"
														type="number"
														value={editValues.number || ""}
														onChange={(e) => setEditValues({ ...editValues, number: Number(e.target.value) })}
														sx={{ width: 100 }}
														placeholder="Número"
													/>
													<TextField
														size="small"
														type="number"
														value={editValues.year || ""}
														onChange={(e) => setEditValues({ ...editValues, year: Number(e.target.value) })}
														sx={{ width: 100 }}
														placeholder="Año"
													/>
												</Stack>
											) : (
												<Stack spacing={0} alignItems="center">
													<Typography variant="body2" fontWeight={600} fontSize="1rem">
														{config.number?.toLocaleString() || 0}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{config.year}
													</Typography>
												</Stack>
											)}
										</TableCell>
										<TableCell align="center">
											{isEditing ? (
												<Stack direction="row" spacing={1}>
													<TextField
														size="small"
														type="number"
														value={editValues.range_start || ""}
														onChange={(e) => setEditValues({ ...editValues, range_start: Number(e.target.value) })}
														sx={{ width: 80 }}
														placeholder="Inicio"
													/>
													<Typography variant="body2" sx={{ alignSelf: "center" }}>
														-
													</Typography>
													<TextField
														size="small"
														type="number"
														value={editValues.range_end || ""}
														onChange={(e) => setEditValues({ ...editValues, range_end: Number(e.target.value) })}
														sx={{ width: 80 }}
														placeholder="Fin"
													/>
												</Stack>
											) : (
												<Typography variant="body2">
													{config.range_start?.toLocaleString()} - {config.range_end?.toLocaleString()}
												</Typography>
											)}
										</TableCell>
										{/* Columna Totales */}
										<TableCell align="center">
											<Stack spacing={0.5} alignItems="center">
												<Typography variant="body2" fontWeight={600} color="text.primary">
													{((config.total_found || 0) + (config.total_not_found || 0) + (config.total_errors || 0)).toLocaleString()}
												</Typography>
												<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
													<Tooltip title="Válidos">
														<Typography variant="caption" color="success.main" fontWeight={500}>
															{config.total_found?.toLocaleString() || 0}
														</Typography>
													</Tooltip>
													<Typography variant="caption" color="text.secondary">/</Typography>
													<Tooltip title="Inválidos">
														<Typography variant="caption" color="warning.main" fontWeight={500}>
															{config.total_not_found?.toLocaleString() || 0}
														</Typography>
													</Tooltip>
													<Typography variant="caption" color="text.secondary">/</Typography>
													<Tooltip title="Errores">
														<Typography variant="caption" color="error.main" fontWeight={500}>
															{config.total_errors?.toLocaleString() || 0}
														</Typography>
													</Tooltip>
												</Stack>
											</Stack>
										</TableCell>
										{/* Columna Inválidos Consecutivos */}
										<TableCell align="center">
											<Stack alignItems="center" spacing={0.5}>
												<Typography
													variant="body2"
													fontWeight={500}
													color={
														!config.consecutive_not_found || config.consecutive_not_found === 0
															? "text.secondary"
															: config.consecutive_not_found >= 50
																? "error.main"
																: config.consecutive_not_found >= 25
																	? "warning.main"
																	: "success.main"
													}
												>
													{config.consecutive_not_found || 0}
												</Typography>
												{config.not_found_range?.start_number && config.not_found_range?.end_number && (
													<Typography variant="caption" color="text.secondary">
														{config.not_found_range.start_number.toLocaleString()} - {config.not_found_range.end_number.toLocaleString()}
													</Typography>
												)}
											</Stack>
										</TableCell>
										{/* Columna Errores Consecutivos */}
										<TableCell align="center">
											<Stack alignItems="center" spacing={0.5}>
												<Typography
													variant="body2"
													fontWeight={500}
													color={
														!config.consecutive_errors || config.consecutive_errors === 0
															? "text.secondary"
															: config.consecutive_errors >= 20
																? "error.main"
																: config.consecutive_errors >= 10
																	? "warning.main"
																	: "success.main"
													}
												>
													{config.consecutive_errors || 0}
												</Typography>
												{config.error_range?.start_number && config.error_range?.end_number && (
													<Typography variant="caption" color="text.secondary">
														{config.error_range.start_number.toLocaleString()} - {config.error_range.end_number.toLocaleString()}
													</Typography>
												)}
											</Stack>
										</TableCell>
										<TableCell align="center">
											<Box sx={{ width: 100 }}>
												<LinearProgress
													variant="determinate"
													value={Math.min(progress, 100)}
													color={progress >= 100 ? "success" : "primary"}
													sx={{ height: 8, borderRadius: 4 }}
												/>
												<Typography variant="caption" color="text.secondary">
													{progress.toFixed(1)}%
												</Typography>
											</Box>
										</TableCell>
										{showExtraColumns && (
											<TableCell align="center">
												<Stack alignItems="center" spacing={0.5}>
													<Typography
														variant="body2"
														fontWeight={500}
														color={config.balance?.current && config.balance.current > 1 ? "success.main" : "warning.main"}
													>
														${config.balance?.current?.toFixed(2) || "0.00"}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{config.balance?.provider || "N/A"}
													</Typography>
												</Stack>
											</TableCell>
										)}
										{showExtraColumns && (
											<TableCell align="center">
												<Stack alignItems="center" spacing={0.5}>
													<Typography variant="body2" fontWeight={500}>
														{config.capsolver?.totalCaptchas?.toLocaleString() || 0}
													</Typography>
													<Chip label={config.captcha?.defaultProvider || "2captcha"} size="small" color="secondary" variant="outlined" />
												</Stack>
											</TableCell>
										)}
										{showExtraColumns && (
											<TableCell align="center">
												<Chip
													label={config.proxy?.enabled ? "Activo" : "Inactivo"}
													size="small"
													color={config.proxy?.enabled ? "success" : "default"}
													variant="outlined"
												/>
											</TableCell>
										)}
										<TableCell align="center">
											<Switch
												checked={isEditing ? editValues.enabled : config.enabled}
												onChange={() => {
													if (isEditing) {
														setEditValues({ ...editValues, enabled: !editValues.enabled });
													} else {
														handleToggleEnabled(config);
													}
												}}
												size="small"
												color="primary"
											/>
										</TableCell>
										<TableCell align="center">
											<Tooltip title={formatDate(config.updatedAt || config.last_check)}>
												<Typography variant="caption">{getRelativeTime(config.updatedAt || config.last_check)}</Typography>
											</Tooltip>
										</TableCell>
										<TableCell align="center">
											{isEditing ? (
												<Stack direction="row" spacing={1} justifyContent="center">
													<Tooltip title="Guardar">
														<IconButton size="small" color="primary" onClick={handleSave}>
															<TickCircle size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Cancelar">
														<IconButton size="small" color="error" onClick={handleCancelEdit}>
															<CloseCircle size={18} />
														</IconButton>
													</Tooltip>
												</Stack>
											) : (
												<Stack direction="row" spacing={1} justifyContent="center">
													<Tooltip title="Editar">
														<IconButton size="small" color="primary" onClick={() => handleEdit(config)}>
															<Edit2 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Configuración avanzada">
														<IconButton size="small" color="secondary" onClick={() => handleAdvancedConfig(config)}>
															<Setting2 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Ver JSON">
														<IconButton size="small" color="info" onClick={() => handleOpenRawView(config)}>
															<Code1 size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title={config.enabled ? "Desactive el worker antes de eliminar" : "Eliminar"}>
														<span>
															<IconButton
																size="small"
																color="error"
																onClick={() => handleOpenDeleteDialog(config)}
																disabled={config.enabled}
															>
																<Trash size={18} />
															</IconButton>
														</span>
													</Tooltip>
												</Stack>
											)}
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Paginación */}
			<TablePagination
				component="div"
				count={configTotalSnapshot ?? configTotal}
				page={configPage}
				onPageChange={handleChangePage}
				rowsPerPage={configRowsPerPage}
				onRowsPerPageChange={handleChangeRowsPerPage}
				rowsPerPageOptions={[10, 20, 50, 100]}
				labelRowsPerPage="Filas por página:"
				labelDisplayedRows={({ from, to, count }) =>
					`${from}-${to} de ${count !== -1 ? count : `más de ${to}`}${
						configTotalSnapshot !== null && configTotal !== configTotalSnapshot ? " (snapshot)" : ""
					}`
				}
			/>

			{/* Estadísticas */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Workers
							</Typography>
							<Typography variant="h4">{configTotalSnapshot ?? configTotal}</Typography>
							<Typography variant="caption" color="text.secondary">
								{configTotalSnapshot !== null && configTotal !== configTotalSnapshot ? (
									<>
										Actual: {configTotal} • Mostrando {configs.length}
										<br />
										<Chip label="Paginación estable" size="small" color="info" sx={{ mt: 0.5, height: 18, fontSize: "0.65rem" }} />
									</>
								) : (
									`Mostrando ${configs.length} en esta página`
								)}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Workers Activos (página actual)
							</Typography>
							<Typography variant="h4" color="success.main">
								{configs.filter((c) => c.enabled).length}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Balance Total
							</Typography>
							<Typography variant="h4" color="info.main">
								${configs.reduce((acc, c) => acc + (c.balance?.current || 0), 0).toFixed(2)}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Captchas Resueltos
							</Typography>
							<Typography variant="h4">
								{configs.reduce((acc, c) => acc + (c.capsolver?.totalCaptchas || 0), 0).toLocaleString()}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Historial de rangos procesados */}
			<Box>
				<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
					<Typography variant="h6">Historial de Rangos Procesados</Typography>
					<Stack direction="row" spacing={1.5} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<Select value={historyFueroFilter} onChange={(e) => handleHistoryFueroFilterChange(e.target.value)}>
								<MenuItem value="TODOS">Todos los Fueros</MenuItem>
								{FUERO_OPTIONS.map((option) => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<Select value={historyYearFilter} onChange={(e) => handleHistoryYearFilterChange(e.target.value)}>
								<MenuItem value="TODOS">Todos los Años</MenuItem>
								{YEAR_OPTIONS.map((year) => (
									<MenuItem key={year} value={year}>
										{year}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<Button
							variant="text"
							size="small"
							startIcon={<Refresh size={16} />}
							onClick={() => fetchScrapingHistory(historyPage)}
							disabled={historyLoading}
						>
							Actualizar
						</Button>
					</Stack>
				</Box>

				<TableContainer component={Paper} variant="outlined">
					{historyLoading && scrapingHistory.length === 0 ? (
						<Box display="flex" justifyContent="center" alignItems="center" p={4}>
							<CircularProgress />
						</Box>
					) : (
						<>
							<Table>
								<TableHead>
									<TableRow>
										<TableCell>
											<TableSortLabel
												active={historySortBy === "worker_id"}
												direction={historySortBy === "worker_id" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("worker_id")}
											>
												Worker ID
											</TableSortLabel>
										</TableCell>
										<TableCell>
											<TableSortLabel
												active={historySortBy === "fuero"}
												direction={historySortBy === "fuero" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("fuero")}
											>
												Fuero
											</TableSortLabel>
										</TableCell>
										<TableCell align="center">
											<TableSortLabel
												active={historySortBy === "year"}
												direction={historySortBy === "year" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("year")}
											>
												Año
											</TableSortLabel>
										</TableCell>
										<TableCell align="center">
											<TableSortLabel
												active={historySortBy === "range_start"}
												direction={historySortBy === "range_start" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("range_start")}
											>
												Rango Procesado
											</TableSortLabel>
										</TableCell>
										<TableCell align="center">
											<TableSortLabel
												active={historySortBy === "documentsProcessed"}
												direction={historySortBy === "documentsProcessed" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("documentsProcessed")}
											>
												Documentos Procesados
											</TableSortLabel>
										</TableCell>
										<TableCell align="center">
											<TableSortLabel
												active={historySortBy === "documentsFound"}
												direction={historySortBy === "documentsFound" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("documentsFound")}
											>
												Documentos Encontrados
											</TableSortLabel>
										</TableCell>
										<TableCell align="center">
											<TableSortLabel
												active={historySortBy === "completedAt"}
												direction={historySortBy === "completedAt" ? historySortOrder : "asc"}
												onClick={() => handleHistorySort("completedAt")}
											>
												Fecha de Completado
											</TableSortLabel>
										</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{scrapingHistory.length > 0 ? (
										scrapingHistory.map((history) => {
											const historyId = typeof history._id === "string" ? history._id : history._id.$oid;
											return (
												<TableRow key={historyId}>
													<TableCell>
														<Typography variant="body2" fontWeight={500}>
															{history.worker_id}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip label={history.fuero} size="small" color="primary" variant="outlined" />
													</TableCell>
													<TableCell align="center">
														<Typography variant="body2">{history.year}</Typography>
													</TableCell>
													<TableCell align="center">
														<Typography variant="body2">
															{history.range_start?.toLocaleString()} - {history.range_end?.toLocaleString()}
														</Typography>
													</TableCell>
													<TableCell align="center">
														<Typography variant="body2">{history.documents_processed?.toLocaleString() || "0"}</Typography>
													</TableCell>
													<TableCell align="center">
														<Typography
															variant="body2"
															color={history.documents_found && history.documents_found > 0 ? "success.main" : "text.secondary"}
															fontWeight={history.documents_found && history.documents_found > 0 ? 500 : 400}
														>
															{history.documents_found?.toLocaleString() || "0"}
														</Typography>
													</TableCell>
													<TableCell align="center">
														<Tooltip title={formatDate(history.completedAt)}>
															<Typography variant="caption">{getRelativeTime(history.completedAt)}</Typography>
														</Tooltip>
													</TableCell>
												</TableRow>
											);
										})
									) : (
										<TableRow>
											<TableCell colSpan={7} align="center">
												<Typography variant="body2" color="text.secondary" py={3}>
													No hay historial de rangos procesados
												</Typography>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
							{historyTotal > 10 && (
								<TablePagination
									rowsPerPageOptions={[10]}
									component="div"
									count={historyTotal}
									rowsPerPage={10}
									page={historyPage - 1}
									onPageChange={(_event, newPage) => fetchScrapingHistory(newPage + 1)}
									labelRowsPerPage="Filas por página:"
									labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
								/>
							)}
						</>
					)}
				</TableContainer>
			</Box>

			{/* Modal de configuración avanzada */}
			{selectedConfig && (
				<AdvancedConfigModal
					open={advancedConfigOpen}
					onClose={handleCloseAdvancedConfig}
					config={selectedConfig}
					onUpdate={fetchConfigs}
					workerType="scraping"
				/>
			)}

			{/* Modal de crear nueva configuración */}
			<CreateConfigModal open={createConfigOpen} onClose={handleCloseCreateConfig} onSuccess={handleCreateSuccess} />

			{/* Modal de workers temporarios */}
			<TemporaryWorkersModal
				open={temporaryWorkersOpen}
				onClose={() => setTemporaryWorkersOpen(false)}
				onDeleteSuccess={handleRefresh}
			/>

			{/* Diálogo de confirmación de eliminación */}
			<Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
				<DialogTitle>Confirmar Eliminación</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Estás seguro de que deseas eliminar esta configuración de scraping?
						<Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
							<Typography variant="body2" fontWeight={500}>
								Worker ID: {configToDelete?.fuero} - {configToDelete?.year}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Rango: {configToDelete?.range_start?.toLocaleString()} - {configToDelete?.range_end?.toLocaleString()}
							</Typography>
						</Box>
						<Alert severity="warning" sx={{ mt: 2 }}>
							Esta acción no se puede deshacer. Los datos del historial se mantendrán.
						</Alert>
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleCloseDeleteDialog} disabled={deleting}>
						Cancelar
					</Button>
					<Button
						onClick={handleDeleteConfig}
						color="error"
						variant="contained"
						disabled={deleting}
						startIcon={deleting && <CircularProgress size={16} />}
					>
						{deleting ? "Eliminando..." : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Diálogo de vista raw JSON */}
			<Dialog open={rawViewOpen} onClose={handleCloseRawView} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" alignItems="center" spacing={1}>
						<Code1 size={20} />
						<Typography variant="h6">Vista Raw JSON</Typography>
					</Stack>
					{rawViewConfig && (
						<Typography variant="body2" color="text.secondary">
							{rawViewConfig.worker_id || `${rawViewConfig.fuero} ${rawViewConfig.year}`}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent>
					<Box
						sx={{
							bgcolor: "grey.900",
							color: "grey.100",
							p: 2,
							borderRadius: 1,
							overflow: "auto",
							maxHeight: "60vh",
							fontFamily: "monospace",
							fontSize: "0.75rem",
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
						}}
					>
						{rawViewConfig && JSON.stringify(rawViewConfig, null, 2)}
					</Box>
				</DialogContent>
				<DialogActions>
					<Button
						variant="outlined"
						size="small"
						onClick={() => {
							if (rawViewConfig) {
								navigator.clipboard.writeText(JSON.stringify(rawViewConfig, null, 2));
								enqueueSnackbar("JSON copiado al portapapeles", {
									variant: "success",
									anchorOrigin: { vertical: "bottom", horizontal: "right" },
								});
							}
						}}
					>
						Copiar JSON
					</Button>
					<Button onClick={handleCloseRawView} variant="contained">
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>
			</>}
		</Stack>
	);
};

export default ScrapingWorker;
