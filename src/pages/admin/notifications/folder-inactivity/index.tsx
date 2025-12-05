import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Paper,
	Stack,
	Card,
	CardContent,
	Grid,
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	IconButton,
	Tooltip,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Skeleton,
	Alert,
	useTheme,
	alpha,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Badge,
	InputAdornment,
	Theme,
} from "@mui/material";
import {
	Refresh,
	Calendar,
	Clock,
	Warning2,
	TickCircle,
	CloseCircle,
	InfoCircle,
	SearchNormal1,
	Eye,
	User,
	Folder2,
	Timer,
	Notification,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import FolderInactivityService, {
	FolderInactivityItem,
	FolderInactivitySummaryResponse,
	FolderInactivityListParams,
	AlertStatus,
	AlertCounts,
	ProximaNotificacion,
} from "api/folderInactivity";

// ======================== HELPER FUNCTIONS ========================

const getStatusColor = (status: AlertStatus, theme: Theme) => {
	switch (status) {
		case "vencido":
			return theme.palette.error.main;
		case "hoy":
			return theme.palette.warning.main;
		case "alerta":
			return theme.palette.warning.light;
		case "ok":
			return theme.palette.success.main;
		case "sinDatos":
			return theme.palette.grey[500];
		default:
			return theme.palette.grey[500];
	}
};

const getStatusLabel = (status: AlertStatus): string => {
	switch (status) {
		case "vencido":
			return "Vencido";
		case "hoy":
			return "Hoy";
		case "alerta":
			return "Alerta";
		case "ok":
			return "OK";
		case "sinDatos":
			return "Sin datos";
		default:
			return status;
	}
};

const getStatusIcon = (status: AlertStatus) => {
	switch (status) {
		case "vencido":
			return <CloseCircle size={16} />;
		case "hoy":
			return <Warning2 size={16} />;
		case "alerta":
			return <Warning2 size={16} />;
		case "ok":
			return <TickCircle size={16} />;
		case "sinDatos":
			return <InfoCircle size={16} />;
		default:
			return <InfoCircle size={16} />;
	}
};

const formatDaysRemaining = (days: number): string => {
	if (days === 0) return "Hoy";
	if (days === 1) return "Mañana";
	if (days === -1) return "Ayer";
	if (days < 0) return `Hace ${Math.abs(days)} días`;
	return `En ${days} días`;
};

// ======================== SUMMARY CARD COMPONENT ========================

interface SummaryCardProps {
	title: string;
	icon: React.ReactNode;
	counts: AlertCounts;
	type: "caducity" | "prescription";
	onFilterClick: (type: "caducity" | "prescription", status: AlertStatus) => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, icon, counts, type, onFilterClick }) => {
	const theme = useTheme();

	const items = [
		{ status: "vencido" as AlertStatus, count: counts.vencido, color: theme.palette.error.main },
		{ status: "hoy" as AlertStatus, count: counts.hoy, color: theme.palette.warning.main },
		{ status: "alerta" as AlertStatus, count: counts.alerta, color: theme.palette.warning.light },
		{ status: "ok" as AlertStatus, count: counts.ok, color: theme.palette.success.main },
	];

	const totalProblems = counts.vencido + counts.hoy + counts.alerta;

	return (
		<Card sx={{ height: "100%" }}>
			<CardContent>
				<Stack spacing={2}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Stack direction="row" alignItems="center" spacing={1}>
							{icon}
							<Typography variant="h6">{title}</Typography>
						</Stack>
						{totalProblems > 0 && (
							<Badge badgeContent={totalProblems} color="error" max={999}>
								<Warning2 size={20} color={theme.palette.warning.main} />
							</Badge>
						)}
					</Stack>

					<Grid container spacing={1}>
						{items.map((item) => (
							<Grid item xs={6} key={item.status}>
								<Tooltip title={`Filtrar por ${getStatusLabel(item.status)}`}>
									<Box
										onClick={() => onFilterClick(type, item.status)}
										sx={{
											p: 1,
											borderRadius: 1,
											bgcolor: alpha(item.color, 0.1),
											cursor: "pointer",
											transition: "all 0.2s",
											"&:hover": {
												bgcolor: alpha(item.color, 0.2),
												transform: "scale(1.02)",
											},
										}}
									>
										<Typography variant="caption" color="text.secondary">
											{getStatusLabel(item.status)}
										</Typography>
										<Typography variant="h5" sx={{ color: item.color }}>
											{item.count}
										</Typography>
									</Box>
								</Tooltip>
							</Grid>
						))}
					</Grid>
				</Stack>
			</CardContent>
		</Card>
	);
};

// ======================== PROXIMAS NOTIFICACIONES COMPONENT ========================

interface ProximasNotificacionesProps {
	caducity: ProximaNotificacion[];
	prescription: ProximaNotificacion[];
}

const ProximasNotificaciones: React.FC<ProximasNotificacionesProps> = ({ caducity, prescription }) => {
	const theme = useTheme();

	const allNotifications = [
		...caducity.map((n) => ({ ...n, type: "caducity" as const })),
		...prescription.map((n) => ({ ...n, type: "prescription" as const })),
	].sort((a, b) => a.daysRemaining - b.daysRemaining);

	if (allNotifications.length === 0) {
		return (
			<Card sx={{ height: "100%" }}>
				<CardContent>
					<Stack direction="row" alignItems="center" spacing={1} mb={2}>
						<Notification size={20} />
						<Typography variant="h6">Próximas Notificaciones</Typography>
					</Stack>
					<Alert severity="info">No hay notificaciones programadas</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card sx={{ height: "100%" }}>
			<CardContent>
				<Stack direction="row" alignItems="center" spacing={1} mb={2}>
					<Notification size={20} />
					<Typography variant="h6">Próximas Notificaciones</Typography>
				</Stack>
				<Stack spacing={1} sx={{ maxHeight: 200, overflow: "auto" }}>
					{allNotifications.slice(0, 5).map((item, index) => (
						<Box
							key={index}
							sx={{
								p: 1,
								borderRadius: 1,
								bgcolor: alpha(
									item.type === "caducity" ? theme.palette.warning.main : theme.palette.info.main,
									0.08
								),
								borderLeft: `3px solid ${item.type === "caducity" ? theme.palette.warning.main : theme.palette.info.main}`,
							}}
						>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Box>
									<Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 200 }}>
										{item.folderName}
									</Typography>
									<Stack direction="row" spacing={1} alignItems="center">
										<Chip
											label={item.type === "caducity" ? "Caducidad" : "Prescripción"}
											size="small"
											sx={{
												height: 18,
												fontSize: "0.65rem",
												bgcolor: alpha(
													item.type === "caducity" ? theme.palette.warning.main : theme.palette.info.main,
													0.2
												),
											}}
										/>
									</Stack>
								</Box>
								<Box textAlign="right">
									<Typography variant="body2" color="text.secondary">
										{item.date}
									</Typography>
									<Typography
										variant="caption"
										sx={{
											color:
												item.daysRemaining <= 1
													? theme.palette.error.main
													: item.daysRemaining <= 3
														? theme.palette.warning.main
														: theme.palette.text.secondary,
										}}
									>
										{formatDaysRemaining(item.daysRemaining)}
									</Typography>
								</Box>
							</Stack>
						</Box>
					))}
				</Stack>
			</CardContent>
		</Card>
	);
};

// ======================== DETAIL MODAL COMPONENT ========================

interface DetailModalProps {
	open: boolean;
	onClose: () => void;
	folder: FolderInactivityItem | null;
}

const DetailModal: React.FC<DetailModalProps> = ({ open, onClose, folder }) => {
	const theme = useTheme();

	if (!folder) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" spacing={2}>
					<Folder2 size={24} />
					<Box>
						<Typography variant="h5">{folder.folderName}</Typography>
						<Typography variant="caption" color="text.secondary">
							{folder.materia} - {folder.status}
						</Typography>
					</Box>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={3}>
					{/* Usuario */}
					<Card variant="outlined">
						<CardContent>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<User size={16} />
								<Typography variant="subtitle2">Usuario</Typography>
							</Stack>
							<Typography variant="body2">{folder.user.name}</Typography>
							<Typography variant="caption" color="text.secondary">
								{folder.user.email}
							</Typography>
						</CardContent>
					</Card>

					{/* Alertas */}
					<Grid container spacing={2}>
						{/* Caducidad */}
						<Grid item xs={12} md={6}>
							{folder.alerts?.caducity ? (
								<Card
									variant="outlined"
									sx={{
										borderColor: alpha(getStatusColor(folder.alerts.caducity.status, theme), 0.5),
										bgcolor: alpha(getStatusColor(folder.alerts.caducity.status, theme), 0.02),
									}}
								>
									<CardContent>
										<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
											<Typography variant="subtitle2">Caducidad</Typography>
											<Chip
												icon={getStatusIcon(folder.alerts.caducity.status)}
												label={getStatusLabel(folder.alerts.caducity.status)}
												size="small"
												sx={{
													bgcolor: alpha(getStatusColor(folder.alerts.caducity.status, theme), 0.1),
													color: getStatusColor(folder.alerts.caducity.status, theme),
												}}
											/>
										</Stack>
										<Grid container spacing={1}>
											<Grid item xs={6}>
												<Typography variant="caption" color="text.secondary">
													Fecha
												</Typography>
												<Typography variant="body2">{folder.alerts.caducity.dateFormatted}</Typography>
											</Grid>
											<Grid item xs={6}>
												<Typography variant="caption" color="text.secondary">
													Días restantes
												</Typography>
												<Typography
													variant="body2"
													color={folder.alerts.caducity.daysRemaining < 0 ? "error" : "inherit"}
												>
													{formatDaysRemaining(folder.alerts.caducity.daysRemaining)}
												</Typography>
											</Grid>
										</Grid>
									</CardContent>
								</Card>
							) : (
								<Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
									<CardContent>
										<Typography variant="subtitle2" mb={1}>
											Caducidad
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Sin datos de alerta
										</Typography>
									</CardContent>
								</Card>
							)}
						</Grid>

						{/* Prescripción */}
						<Grid item xs={12} md={6}>
							{folder.alerts?.prescription ? (
								<Card
									variant="outlined"
									sx={{
										borderColor: alpha(getStatusColor(folder.alerts.prescription.status, theme), 0.5),
										bgcolor: alpha(getStatusColor(folder.alerts.prescription.status, theme), 0.02),
									}}
								>
									<CardContent>
										<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
											<Typography variant="subtitle2">Prescripción</Typography>
											<Chip
												icon={getStatusIcon(folder.alerts.prescription.status)}
												label={getStatusLabel(folder.alerts.prescription.status)}
												size="small"
												sx={{
													bgcolor: alpha(getStatusColor(folder.alerts.prescription.status, theme), 0.1),
													color: getStatusColor(folder.alerts.prescription.status, theme),
												}}
											/>
										</Stack>
										<Grid container spacing={1}>
											<Grid item xs={6}>
												<Typography variant="caption" color="text.secondary">
													Fecha
												</Typography>
												<Typography variant="body2">{folder.alerts.prescription.dateFormatted}</Typography>
											</Grid>
											<Grid item xs={6}>
												<Typography variant="caption" color="text.secondary">
													Días restantes
												</Typography>
												<Typography
													variant="body2"
													color={folder.alerts.prescription.daysRemaining < 0 ? "error" : "inherit"}
												>
													{formatDaysRemaining(folder.alerts.prescription.daysRemaining)}
												</Typography>
											</Grid>
										</Grid>
									</CardContent>
								</Card>
							) : (
								<Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
									<CardContent>
										<Typography variant="subtitle2" mb={1}>
											Prescripción
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Sin datos de alerta
										</Typography>
									</CardContent>
								</Card>
							)}
						</Grid>
					</Grid>

					{/* Última actividad */}
					{folder.alerts?.hasData && (
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" alignItems="center" spacing={1} mb={1}>
									<Clock size={16} />
									<Typography variant="subtitle2">Última Actividad</Typography>
								</Stack>
								<Grid container spacing={2}>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Fecha
										</Typography>
										<Typography variant="body2">{folder.alerts?.lastActivityFormatted || "-"}</Typography>
									</Grid>
									<Grid item xs={6}>
										<Typography variant="caption" color="text.secondary">
											Días de inactividad
										</Typography>
										<Typography variant="body2">{folder.alerts?.daysSinceLastActivity ?? "-"} días</Typography>
									</Grid>
								</Grid>
							</CardContent>
						</Card>
					)}

					{/* Configuración */}
					<Card variant="outlined" sx={{ bgcolor: alpha(theme.palette.grey[500], 0.05) }}>
						<CardContent>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<Timer size={16} />
								<Typography variant="subtitle2">Configuración de Plazos</Typography>
							</Stack>
							<Grid container spacing={2}>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Días caducidad
									</Typography>
									<Typography variant="body2">{folder.settings.caducityDays}</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Días prescripción
									</Typography>
									<Typography variant="body2">{folder.settings.prescriptionDays}</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="text.secondary">
										Días de anticipación
									</Typography>
									<Typography variant="body2">{folder.settings.daysInAdvance}</Typography>
								</Grid>
							</Grid>
						</CardContent>
					</Card>

					{/* Notificaciones enviadas */}
					{folder.notifications && folder.notifications.length > 0 && (
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" alignItems="center" spacing={1} mb={1}>
									<Notification size={16} />
									<Typography variant="subtitle2">
										Notificaciones Enviadas ({folder.notifications.length})
									</Typography>
								</Stack>
								<Stack spacing={1} sx={{ maxHeight: 150, overflow: "auto" }}>
									{folder.notifications.map((notif, index) => (
										<Box
											key={index}
											sx={{
												p: 1,
												borderRadius: 1,
												bgcolor: notif.success
													? alpha(theme.palette.success.main, 0.08)
													: alpha(theme.palette.error.main, 0.08),
											}}
										>
											<Stack direction="row" justifyContent="space-between" alignItems="center">
												<Stack direction="row" spacing={1} alignItems="center">
													{notif.success ? (
														<TickCircle size={14} color={theme.palette.success.main} />
													) : (
														<CloseCircle size={14} color={theme.palette.error.main} />
													)}
													<Chip
														label={notif.alertType === "caducity" ? "Caducidad" : "Prescripción"}
														size="small"
														sx={{ height: 18, fontSize: "0.65rem" }}
													/>
													<Typography variant="caption">{notif.type}</Typography>
												</Stack>
												<Typography variant="caption" color="text.secondary">
													{new Date(notif.date).toLocaleDateString("es-AR")}
												</Typography>
											</Stack>
										</Box>
									))}
								</Stack>
							</CardContent>
						</Card>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
};

// ======================== MAIN COMPONENT ========================

const FolderInactivity: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State
	const [loading, setLoading] = useState(true);
	const [summaryLoading, setSummaryLoading] = useState(true);
	const [summary, setSummary] = useState<FolderInactivitySummaryResponse["data"] | null>(null);
	const [folders, setFolders] = useState<FolderInactivityItem[]>([]);
	const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0 });
	const [filters, setFilters] = useState<FolderInactivityListParams>({
		page: 1,
		limit: 25,
		type: "any",
		archived: "false",
	});
	const [search, setSearch] = useState("");
	const [selectedFolder, setSelectedFolder] = useState<FolderInactivityItem | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	// Fetch summary
	const fetchSummary = useCallback(async () => {
		try {
			setSummaryLoading(true);
			const response = await FolderInactivityService.getSummary();
			setSummary(response.data);
		} catch (error) {
			console.error("Error fetching summary:", error);
			enqueueSnackbar("Error al cargar resumen", { variant: "error" });
		} finally {
			setSummaryLoading(false);
		}
	}, [enqueueSnackbar]);

	// Fetch folders list
	const fetchFolders = useCallback(async () => {
		try {
			setLoading(true);
			const response = await FolderInactivityService.getList({
				...filters,
				search: search || undefined,
			});
			setFolders(response.data);
			setPagination({
				page: response.pagination.page - 1,
				limit: response.pagination.limit,
				total: response.pagination.total,
			});
		} catch (error) {
			console.error("Error fetching folders:", error);
			enqueueSnackbar("Error al cargar carpetas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [filters, search, enqueueSnackbar]);

	useEffect(() => {
		fetchSummary();
	}, [fetchSummary]);

	useEffect(() => {
		fetchFolders();
	}, [fetchFolders]);

	// Handlers
	const handlePageChange = (_event: unknown, newPage: number) => {
		setFilters((prev) => ({ ...prev, page: newPage + 1 }));
	};

	const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilters((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), page: 1 }));
	};

	const handleFilterChange = (key: keyof FolderInactivityListParams, value: unknown) => {
		setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
	};

	const handleSummaryCardClick = (type: "caducity" | "prescription", status: AlertStatus) => {
		setFilters((prev) => ({ ...prev, type, status, page: 1 }));
	};

	const handleViewDetail = (folder: FolderInactivityItem) => {
		setSelectedFolder(folder);
		setDetailOpen(true);
	};

	const handleRefresh = () => {
		fetchSummary();
		fetchFolders();
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			setFilters((prev) => ({ ...prev, page: 1 }));
		}
	};

	return (
		<MainCard>
			<Stack spacing={3}>
				{/* Header */}
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h3">Caducidades y Prescripciones</Typography>
						<Typography variant="body2" color="text.secondary">
							Monitoreo de alertas de inactividad de carpetas
						</Typography>
					</Box>
					<Tooltip title="Actualizar">
						<IconButton onClick={handleRefresh}>
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
				</Stack>

				{/* Summary Cards */}
				{summaryLoading ? (
					<Grid container spacing={3}>
						{[1, 2, 3].map((i) => (
							<Grid item xs={12} md={4} key={i}>
								<Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
							</Grid>
						))}
					</Grid>
				) : summary ? (
					<Grid container spacing={3}>
						<Grid item xs={12} md={4}>
							<SummaryCard
								title="Caducidad"
								icon={<Calendar size={20} color={theme.palette.warning.main} />}
								counts={summary.caducity}
								type="caducity"
								onFilterClick={handleSummaryCardClick}
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<SummaryCard
								title="Prescripción"
								icon={<Timer size={20} color={theme.palette.info.main} />}
								counts={summary.prescription}
								type="prescription"
								onFilterClick={handleSummaryCardClick}
							/>
						</Grid>
						<Grid item xs={12} md={4}>
							<ProximasNotificaciones
								caducity={summary.proximasNotificaciones.caducity}
								prescription={summary.proximasNotificaciones.prescription}
							/>
						</Grid>
					</Grid>
				) : null}

				{/* Filters */}
				<Paper sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={3}>
							<TextField
								fullWidth
								size="small"
								placeholder="Buscar carpeta..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onKeyDown={handleSearchKeyDown}
								InputProps={{
									startAdornment: (
										<InputAdornment position="start">
											<SearchNormal1 size={18} />
										</InputAdornment>
									),
								}}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Tipo</InputLabel>
								<Select
									value={filters.type || "any"}
									label="Tipo"
									onChange={(e) => handleFilterChange("type", e.target.value)}
								>
									<MenuItem value="any">Todos</MenuItem>
									<MenuItem value="caducity">Caducidad</MenuItem>
									<MenuItem value="prescription">Prescripción</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={filters.status || ""}
									label="Estado"
									onChange={(e) => handleFilterChange("status", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="vencido">Vencido</MenuItem>
									<MenuItem value="hoy">Hoy</MenuItem>
									<MenuItem value="alerta">Alerta</MenuItem>
									<MenuItem value="ok">OK</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Archivados</InputLabel>
								<Select
									value={filters.archived || "false"}
									label="Archivados"
									onChange={(e) => handleFilterChange("archived", e.target.value)}
								>
									<MenuItem value="false">No archivados</MenuItem>
									<MenuItem value="true">Archivados</MenuItem>
									<MenuItem value="all">Todos</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						{(filters.status || filters.type !== "any") && (
							<Grid item xs={12} sm={6} md={3}>
								<Button
									size="small"
									onClick={() => setFilters((prev) => ({ ...prev, status: undefined, type: "any", page: 1 }))}
								>
									Limpiar filtros
								</Button>
							</Grid>
						)}
					</Grid>
				</Paper>

				{/* Table */}
				<Paper>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Carpeta</TableCell>
									<TableCell>Usuario</TableCell>
									<TableCell align="center">Caducidad</TableCell>
									<TableCell align="center">Prescripción</TableCell>
									<TableCell>Última Actividad</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											{Array.from({ length: 6 }).map((_, j) => (
												<TableCell key={j}>
													<Skeleton />
												</TableCell>
											))}
										</TableRow>
									))
								) : folders.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} align="center">
											<Typography color="text.secondary" py={4}>
												No se encontraron carpetas
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									folders.map((folder) => (
										<TableRow
											key={folder._id}
											hover
											sx={{ cursor: "pointer" }}
											onClick={() => handleViewDetail(folder)}
										>
											<TableCell>
												<Box>
													<Typography variant="body2" fontWeight={500}>
														{folder.folderName}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{folder.materia}
													</Typography>
												</Box>
											</TableCell>
											<TableCell>
												<Typography variant="body2">{folder.user.name}</Typography>
											</TableCell>
											<TableCell align="center">
												{folder.alerts?.caducity ? (
													<Chip
														icon={getStatusIcon(folder.alerts.caducity.status)}
														label={folder.alerts.caducity.dateFormatted}
														size="small"
														sx={{
															bgcolor: alpha(getStatusColor(folder.alerts.caducity.status, theme), 0.1),
															color: getStatusColor(folder.alerts.caducity.status, theme),
															"& .MuiChip-icon": {
																color: getStatusColor(folder.alerts.caducity.status, theme),
															},
														}}
													/>
												) : (
													<Typography variant="body2" color="text.secondary">
														-
													</Typography>
												)}
											</TableCell>
											<TableCell align="center">
												{folder.alerts?.prescription ? (
													<Chip
														icon={getStatusIcon(folder.alerts.prescription.status)}
														label={folder.alerts.prescription.dateFormatted}
														size="small"
														sx={{
															bgcolor: alpha(getStatusColor(folder.alerts.prescription.status, theme), 0.1),
															color: getStatusColor(folder.alerts.prescription.status, theme),
															"& .MuiChip-icon": {
																color: getStatusColor(folder.alerts.prescription.status, theme),
															},
														}}
													/>
												) : (
													<Typography variant="body2" color="text.secondary">
														-
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Typography variant="body2">
													{folder.alerts?.lastActivityFormatted || "-"}
												</Typography>
												{folder.alerts?.daysSinceLastActivity !== null && folder.alerts?.daysSinceLastActivity !== undefined && (
													<Typography variant="caption" color="text.secondary">
														{folder.alerts?.daysSinceLastActivity} días
													</Typography>
												)}
											</TableCell>
											<TableCell align="center">
												<Tooltip title="Ver detalle">
													<IconButton
														size="small"
														onClick={(e) => {
															e.stopPropagation();
															handleViewDetail(folder);
														}}
													>
														<Eye size={18} />
													</IconButton>
												</Tooltip>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
					<TablePagination
						component="div"
						count={pagination.total}
						page={pagination.page}
						rowsPerPage={pagination.limit}
						onPageChange={handlePageChange}
						onRowsPerPageChange={handleRowsPerPageChange}
						rowsPerPageOptions={[10, 25, 50, 100]}
						labelRowsPerPage="Filas por página"
						labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
					/>
				</Paper>
			</Stack>

			{/* Detail Modal */}
			<DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} folder={selectedFolder} />
		</MainCard>
	);
};

export default FolderInactivity;
