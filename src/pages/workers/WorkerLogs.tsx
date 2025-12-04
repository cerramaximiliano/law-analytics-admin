import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Tab,
	Tabs,
	Typography,
	Paper,
	Stack,
	Chip,
	useTheme,
	alpha,
	IconButton,
	Tooltip,
	Card,
	CardContent,
	Grid,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	TextField,
	Button,
	CircularProgress,
	Skeleton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	LinearProgress,
	Alert,
	Collapse,
} from "@mui/material";
import {
	Chart,
	Activity,
	Warning2,
	DocumentText,
	Setting3,
	Refresh,
	SearchNormal1,
	CloseCircle,
	TickCircle,
	Clock,
	InfoCircle,
	ArrowRight2,
	Code1,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import WorkerLogsService, {
	WorkerLogCount,
	WorkerLogStats,
	WorkerListResponse,
	WorkerActivityResponse,
	FailedLogsResponse,
	WorkerLogsListResponse,
	WorkerLog,
	LogsListParams,
	LogsStatsResponse,
	SearchLogsParams,
	SearchLogsResponse,
	LogLevel,
	DetailedLogEntry,
} from "api/workerLogs";

// ======================== HELPER FUNCTIONS ========================

const formatDuration = (ms: number): string => {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
	return `${(ms / 3600000).toFixed(1)}h`;
};

const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	return date.toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
};

const getStatusColor = (status: string, theme: any) => {
	switch (status) {
		case "success":
			return theme.palette.success.main;
		case "partial":
			return theme.palette.warning.main;
		case "failed":
			return theme.palette.error.main;
		case "in_progress":
			return theme.palette.info.main;
		default:
			return theme.palette.grey[500];
	}
};

const getStatusLabel = (status: string): string => {
	switch (status) {
		case "success":
			return "Exitoso";
		case "partial":
			return "Parcial";
		case "failed":
			return "Fallido";
		case "in_progress":
			return "En progreso";
		default:
			return status;
	}
};

const getWorkerTypeLabel = (type: string): string => {
	switch (type) {
		case "update":
			return "Actualización";
		case "verify":
			return "Verificación";
		case "scraping":
			return "Scraping";
		case "recovery":
			return "Recuperación";
		case "stuck_documents":
			return "Docs Atascados";
		default:
			return type;
	}
};

const getLogLevelColor = (level: LogLevel, theme: any) => {
	switch (level) {
		case "debug":
			return theme.palette.grey[500];
		case "info":
			return theme.palette.info.main;
		case "warn":
			return theme.palette.warning.main;
		case "error":
			return theme.palette.error.main;
		default:
			return theme.palette.grey[500];
	}
};

const getLogLevelLabel = (level: LogLevel): string => {
	switch (level) {
		case "debug":
			return "DEBUG";
		case "info":
			return "INFO";
		case "warn":
			return "WARN";
		case "error":
			return "ERROR";
		default:
			return String(level).toUpperCase();
	}
};

// ======================== OVERVIEW TAB ========================

interface OverviewTabProps {
	onRefresh: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ onRefresh }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [counts, setCounts] = useState<WorkerLogCount | null>(null);
	const [stats, setStats] = useState<WorkerLogStats | null>(null);
	const [logsStats, setLogsStats] = useState<LogsStatsResponse | null>(null);
	const [hoursFilter, setHoursFilter] = useState(24);
	const [cleanupLoading, setCleanupLoading] = useState(false);
	const [retentionDays, setRetentionDays] = useState(7);
	const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [countsRes, statsRes, logsStatsRes] = await Promise.all([
				WorkerLogsService.getCount(),
				WorkerLogsService.getStats(hoursFilter),
				WorkerLogsService.getLogsStats(),
			]);
			setCounts(countsRes);
			setStats(statsRes);
			setLogsStats(logsStatsRes);
		} catch (error) {
			enqueueSnackbar("Error al cargar estadísticas", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [hoursFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleCleanup = async () => {
		try {
			setCleanupLoading(true);
			const result = await WorkerLogsService.cleanupLogs({ retentionDays });
			enqueueSnackbar(`Limpieza completada: ${result.totalCleared} logs eliminados`, { variant: "success" });
			setCleanupDialogOpen(false);
			fetchData();
		} catch (error) {
			enqueueSnackbar("Error al ejecutar limpieza", { variant: "error" });
			console.error(error);
		} finally {
			setCleanupLoading(false);
		}
	};

	if (loading) {
		return (
			<Box sx={{ p: 3 }}>
				<Grid container spacing={3}>
					{[1, 2, 3, 4].map((i) => (
						<Grid item xs={12} sm={6} md={3} key={i}>
							<Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
						</Grid>
					))}
				</Grid>
			</Box>
		);
	}

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				{/* Header with refresh */}
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Resumen de Logs</Typography>
					<Stack direction="row" spacing={2} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Período</InputLabel>
							<Select
								value={hoursFilter}
								label="Período"
								onChange={(e) => setHoursFilter(Number(e.target.value))}
							>
								<MenuItem value={1}>1 hora</MenuItem>
								<MenuItem value={6}>6 horas</MenuItem>
								<MenuItem value={12}>12 horas</MenuItem>
								<MenuItem value={24}>24 horas</MenuItem>
								<MenuItem value={48}>48 horas</MenuItem>
								<MenuItem value={168}>7 días</MenuItem>
							</Select>
						</FormControl>
						<Tooltip title="Actualizar">
							<IconButton onClick={() => { fetchData(); onRefresh(); }}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{/* Total counts cards */}
				<Grid container spacing={3}>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="subtitle2" color="text.secondary">
										Total de Logs
									</Typography>
									<Typography variant="h3">{counts?.total?.toLocaleString() || 0}</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					{counts?.byType &&
						Object.entries(counts.byType).map(([type, count]) => (
							<Grid item xs={12} sm={6} md={3} key={type}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												{getWorkerTypeLabel(type)}
											</Typography>
											<Typography variant="h4">{count?.toLocaleString() || 0}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
				</Grid>

				{/* Stats summary */}
				{stats?.summary && (
					<>
						<Typography variant="h6">Estadísticas ({stats.period})</Typography>
						<Grid container spacing={3}>
							<Grid item xs={12} sm={6} md={2}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Operaciones
											</Typography>
											<Typography variant="h4">{stats.summary.totalOperations}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Exitosas
											</Typography>
											<Typography variant="h4" color="success.main">
												{stats.summary.successCount}
											</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card sx={{ bgcolor: alpha(theme.palette.error.main, 0.1) }}>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Fallidas
											</Typography>
											<Typography variant="h4" color="error.main">
												{stats.summary.failedCount}
											</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Tasa de Éxito
											</Typography>
											<Typography variant="h4">{stats.summary.successRate.toFixed(1)}%</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Movimientos
											</Typography>
											<Typography variant="h4">{stats.summary.totalMovimientosAdded}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={2}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Duración Prom.
											</Typography>
											<Typography variant="h4">{formatDuration(stats.summary.avgDuration)}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					</>
				)}

				{/* Stats by worker type */}
				{stats?.byWorkerType && stats.byWorkerType.length > 0 && (
					<>
						<Typography variant="h6">Estadísticas por Tipo de Worker</Typography>
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Tipo</TableCell>
										<TableCell align="right">Total</TableCell>
										<TableCell>Estados</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.byWorkerType.map((wt) => (
										<TableRow key={wt._id}>
											<TableCell>
												<Typography variant="body2" fontWeight={500}>
													{getWorkerTypeLabel(wt._id)}
												</Typography>
											</TableCell>
											<TableCell align="right">{wt.totalCount}</TableCell>
											<TableCell>
												<Stack direction="row" spacing={1} flexWrap="wrap">
													{wt.stats.map((s) => (
														<Chip
															key={s.status}
															label={`${getStatusLabel(s.status)}: ${s.count}`}
															size="small"
															sx={{
																bgcolor: alpha(getStatusColor(s.status, theme), 0.1),
																color: getStatusColor(s.status, theme),
															}}
														/>
													))}
												</Stack>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}

				{/* Detailed Logs Stats */}
				{logsStats?.statistics && (
					<>
						<Stack direction="row" justifyContent="space-between" alignItems="center">
							<Typography variant="h6">Estadísticas de Logs Detallados</Typography>
							<Button
								variant="outlined"
								color="warning"
								size="small"
								onClick={() => setCleanupDialogOpen(true)}
								disabled={logsStats.statistics.pendingCleanup === 0}
							>
								Limpiar Logs ({logsStats.statistics.pendingCleanup} pendientes)
							</Button>
						</Stack>
						<Grid container spacing={3}>
							<Grid item xs={12} sm={6} md={3}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Docs con Logs
											</Typography>
											<Typography variant="h4">
												{logsStats.statistics.documentsWithLogs.toLocaleString()}
											</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Docs sin Logs
											</Typography>
											<Typography variant="h4">
												{logsStats.statistics.documentsWithoutLogs.toLocaleString()}
											</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Total Entradas
											</Typography>
											<Typography variant="h4">
												{logsStats.statistics.totalLogEntries.toLocaleString()}
											</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Card>
									<CardContent>
										<Stack spacing={1}>
											<Typography variant="subtitle2" color="text.secondary">
												Prom. por Doc
											</Typography>
											<Typography variant="h4">{logsStats.statistics.avgLogsPerDocument}</Typography>
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>

						{logsStats.statistics.byWorkerType && logsStats.statistics.byWorkerType.length > 0 && (
							<TableContainer component={Paper}>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Tipo de Worker</TableCell>
											<TableCell align="right">Documentos</TableCell>
											<TableCell align="right">Total Entradas</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{logsStats.statistics.byWorkerType.map((wt) => (
											<TableRow key={wt._id}>
												<TableCell>{getWorkerTypeLabel(wt._id)}</TableCell>
												<TableCell align="right">{wt.count.toLocaleString()}</TableCell>
												<TableCell align="right">{wt.totalLogEntries.toLocaleString()}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</>
				)}
			</Stack>

			{/* Cleanup Dialog */}
			<Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)}>
				<DialogTitle>Limpiar Logs Detallados</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Esta acción eliminará los logs detallados expirados y antiguos. Los logs más recientes
							que el período de retención se mantendrán.
						</Typography>
						<TextField
							fullWidth
							type="number"
							label="Días de retención"
							value={retentionDays}
							onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 7)}
							inputProps={{ min: 1, max: 30 }}
							helperText="Logs más antiguos que este período serán eliminados"
						/>
						<Alert severity="warning">
							Esta acción no se puede deshacer. Los logs eliminados no podrán ser recuperados.
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCleanupDialogOpen(false)}>Cancelar</Button>
					<Button
						onClick={handleCleanup}
						color="warning"
						variant="contained"
						disabled={cleanupLoading}
					>
						{cleanupLoading ? <CircularProgress size={20} /> : "Ejecutar Limpieza"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

// ======================== WORKERS TAB ========================

const WorkersTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<WorkerListResponse | null>(null);
	const [hoursFilter, setHoursFilter] = useState(24);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await WorkerLogsService.getWorkers(hoursFilter);
			setData(response);
		} catch (error) {
			enqueueSnackbar("Error al cargar workers", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [hoursFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Workers Activos ({data?.total || 0})</Typography>
					<Stack direction="row" spacing={2} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Período</InputLabel>
							<Select
								value={hoursFilter}
								label="Período"
								onChange={(e) => setHoursFilter(Number(e.target.value))}
							>
								<MenuItem value={1}>1 hora</MenuItem>
								<MenuItem value={6}>6 horas</MenuItem>
								<MenuItem value={12}>12 horas</MenuItem>
								<MenuItem value={24}>24 horas</MenuItem>
								<MenuItem value={48}>48 horas</MenuItem>
								<MenuItem value={168}>7 días</MenuItem>
							</Select>
						</FormControl>
						<Tooltip title="Actualizar">
							<IconButton onClick={fetchData}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{loading ? (
					<Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
				) : (
					<TableContainer component={Paper}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Worker ID</TableCell>
									<TableCell>Tipo</TableCell>
									<TableCell>Última Actividad</TableCell>
									<TableCell>Último Estado</TableCell>
									<TableCell align="right">Operaciones</TableCell>
									<TableCell align="right">Exitosas</TableCell>
									<TableCell align="right">Tasa</TableCell>
									<TableCell align="right">Duración Prom.</TableCell>
									<TableCell align="right">Movimientos</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{data?.workers.map((worker) => (
									<TableRow key={worker.workerId} hover>
										<TableCell>
											<Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
												{worker.workerId}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={getWorkerTypeLabel(worker.workerType)}
												size="small"
												color="primary"
												variant="outlined"
											/>
										</TableCell>
										<TableCell>
											<Typography variant="body2" fontSize="0.8rem">
												{formatDate(worker.lastActivity)}
											</Typography>
										</TableCell>
										<TableCell>
											<Chip
												label={getStatusLabel(worker.lastStatus)}
												size="small"
												sx={{
													bgcolor: alpha(getStatusColor(worker.lastStatus, theme), 0.1),
													color: getStatusColor(worker.lastStatus, theme),
												}}
											/>
										</TableCell>
										<TableCell align="right">{worker.stats.totalOperations}</TableCell>
										<TableCell align="right">{worker.stats.successCount}</TableCell>
										<TableCell align="right">{worker.stats.successRate.toFixed(1)}%</TableCell>
										<TableCell align="right">{formatDuration(worker.stats.avgDuration)}</TableCell>
										<TableCell align="right">{worker.stats.totalMovimientos}</TableCell>
									</TableRow>
								))}
								{(!data?.workers || data.workers.length === 0) && (
									<TableRow>
										<TableCell colSpan={9} align="center">
											<Typography color="text.secondary" py={3}>
												No hay workers con actividad en el período seleccionado
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Stack>
		</Box>
	);
};

// ======================== ACTIVITY TAB ========================

const ActivityTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<WorkerActivityResponse | null>(null);
	const [minutesFilter, setMinutesFilter] = useState(5);
	const [autoRefresh, setAutoRefresh] = useState(false);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await WorkerLogsService.getActivity(minutesFilter);
			setData(response);
		} catch (error) {
			enqueueSnackbar("Error al cargar actividad", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [minutesFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		if (autoRefresh) {
			const interval = setInterval(fetchData, 10000);
			return () => clearInterval(interval);
		}
	}, [autoRefresh, fetchData]);

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={2} alignItems="center">
						<Typography variant="h5">Actividad en Tiempo Real</Typography>
						{data && (
							<Chip
								icon={<Activity size={16} />}
								label={`${data.currentlyProcessing} procesando`}
								color={data.currentlyProcessing > 0 ? "success" : "default"}
							/>
						)}
					</Stack>
					<Stack direction="row" spacing={2} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Período</InputLabel>
							<Select
								value={minutesFilter}
								label="Período"
								onChange={(e) => setMinutesFilter(Number(e.target.value))}
							>
								<MenuItem value={1}>1 min</MenuItem>
								<MenuItem value={5}>5 min</MenuItem>
								<MenuItem value={15}>15 min</MenuItem>
								<MenuItem value={30}>30 min</MenuItem>
								<MenuItem value={60}>1 hora</MenuItem>
							</Select>
						</FormControl>
						<Button
							variant={autoRefresh ? "contained" : "outlined"}
							size="small"
							onClick={() => setAutoRefresh(!autoRefresh)}
						>
							{autoRefresh ? "Auto ON" : "Auto OFF"}
						</Button>
						<Tooltip title="Actualizar">
							<IconButton onClick={fetchData}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{data?.timestamp && (
					<Typography variant="caption" color="text.secondary">
						Última actualización: {formatDate(data.timestamp)}
					</Typography>
				)}

				{loading && !data ? (
					<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
				) : (
					<>
						{/* In Progress Tasks */}
						{data?.inProgressTasks && data.inProgressTasks.length > 0 && (
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Tareas en Progreso ({data.inProgressTasks.length})
									</Typography>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Worker</TableCell>
													<TableCell>Tipo</TableCell>
													<TableCell>Documento</TableCell>
													<TableCell align="right">Tiempo Ejecutando</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{data.inProgressTasks.map((task) => (
													<TableRow key={task._id}>
														<TableCell>
															<Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
																{task.workerId}
															</Typography>
														</TableCell>
														<TableCell>{getWorkerTypeLabel(task.workerType)}</TableCell>
														<TableCell>
															{task.document.fuero} {task.document.number}/{task.document.year}
														</TableCell>
														<TableCell align="right">
															<Chip
																label={formatDuration(task.runningFor)}
																size="small"
																color={task.runningFor > 60000 ? "warning" : "default"}
															/>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</CardContent>
							</Card>
						)}

						{/* Recent Activity */}
						{data?.recentActivity && Object.keys(data.recentActivity).length > 0 && (
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Actividad Reciente ({data.period})
									</Typography>
									<Grid container spacing={2}>
										{Object.entries(data.recentActivity).map(([type, activity]) => (
											<Grid item xs={12} sm={6} md={4} key={type}>
												<Card variant="outlined">
													<CardContent>
														<Typography variant="subtitle2" gutterBottom>
															{getWorkerTypeLabel(type)}
														</Typography>
														<Stack direction="row" spacing={1}>
															<Chip
																label={`Total: ${activity.total}`}
																size="small"
																variant="outlined"
															/>
															{activity.success > 0 && (
																<Chip
																	label={`OK: ${activity.success}`}
																	size="small"
																	sx={{
																		bgcolor: alpha(theme.palette.success.main, 0.1),
																		color: theme.palette.success.main,
																	}}
																/>
															)}
															{activity.partial > 0 && (
																<Chip
																	label={`Parcial: ${activity.partial}`}
																	size="small"
																	sx={{
																		bgcolor: alpha(theme.palette.warning.main, 0.1),
																		color: theme.palette.warning.main,
																	}}
																/>
															)}
															{activity.failed && activity.failed > 0 && (
																<Chip
																	label={`Error: ${activity.failed}`}
																	size="small"
																	sx={{
																		bgcolor: alpha(theme.palette.error.main, 0.1),
																		color: theme.palette.error.main,
																	}}
																/>
															)}
														</Stack>
													</CardContent>
												</Card>
											</Grid>
										))}
									</Grid>
								</CardContent>
							</Card>
						)}

						{(!data?.inProgressTasks || data.inProgressTasks.length === 0) &&
							(!data?.recentActivity || Object.keys(data.recentActivity).length === 0) && (
								<Alert severity="info">No hay actividad en el período seleccionado</Alert>
							)}
					</>
				)}
			</Stack>
		</Box>
	);
};

// ======================== LOGS TAB ========================

interface LogDetailModalProps {
	open: boolean;
	onClose: () => void;
	log: WorkerLog | null;
}

const LogDetailModal: React.FC<LogDetailModalProps> = ({ open, onClose, log }) => {
	const theme = useTheme();

	if (!log) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Detalle del Log</Typography>
					<Chip
						label={getStatusLabel(log.status)}
						sx={{
							bgcolor: alpha(getStatusColor(log.status, theme), 0.1),
							color: getStatusColor(log.status, theme),
						}}
					/>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={3}>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<Typography variant="subtitle2" color="text.secondary">
								Worker ID
							</Typography>
							<Typography variant="body2" fontFamily="monospace">
								{log.workerId}
							</Typography>
						</Grid>
						<Grid item xs={6}>
							<Typography variant="subtitle2" color="text.secondary">
								Tipo
							</Typography>
							<Typography variant="body2">{getWorkerTypeLabel(log.workerType)}</Typography>
						</Grid>
						<Grid item xs={6}>
							<Typography variant="subtitle2" color="text.secondary">
								Documento
							</Typography>
							<Typography variant="body2">
								{log.document.fuero} {log.document.number}/{log.document.year}
							</Typography>
						</Grid>
						<Grid item xs={6}>
							<Typography variant="subtitle2" color="text.secondary">
								Duración
							</Typography>
							<Typography variant="body2">{log.duration ? formatDuration(log.duration) : "-"}</Typography>
						</Grid>
					</Grid>

					{log.document.stateBefore && log.document.stateAfter && (
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle2" gutterBottom>
									Estado del Documento
								</Typography>
								<Stack direction="row" alignItems="center" spacing={2}>
									<Box>
										<Typography variant="caption" color="text.secondary">
											Antes
										</Typography>
										<Typography>{log.document.stateBefore.movimientosCount} movimientos</Typography>
									</Box>
									<ArrowRight2 size={20} />
									<Box>
										<Typography variant="caption" color="text.secondary">
											Después
										</Typography>
										<Typography>{log.document.stateAfter.movimientosCount} movimientos</Typography>
									</Box>
								</Stack>
							</CardContent>
						</Card>
					)}

					{log.changes && (
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle2" gutterBottom>
									Cambios
								</Typography>
								<Stack spacing={1}>
									{log.changes.movimientosAdded !== undefined && (
										<Typography variant="body2">
											Movimientos agregados: {log.changes.movimientosAdded}
										</Typography>
									)}
									{log.changes.fieldsUpdated && (
										<Typography variant="body2">
											Campos actualizados: {log.changes.fieldsUpdated.join(", ")}
										</Typography>
									)}
								</Stack>
							</CardContent>
						</Card>
					)}

					{log.result && (
						<Card variant="outlined">
							<CardContent>
								<Typography variant="subtitle2" gutterBottom>
									Resultado
								</Typography>
								<Typography variant="body2">{log.result.message}</Typography>
							</CardContent>
						</Card>
					)}

					{log.error && (
						<Alert severity="error">
							<Typography variant="body2">{log.error}</Typography>
						</Alert>
					)}

					{/* Detailed Logs Timeline */}
					{log.detailedLogs && log.detailedLogs.length > 0 && (
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
									<Stack direction="row" alignItems="center" spacing={1}>
										<Clock size={16} />
										<Typography variant="subtitle2">
											Logs Detallados ({log.detailedLogs.length} entradas)
										</Typography>
									</Stack>
									{log.logsRetention?.detailedLogsExpireAt && (
										<Typography variant="caption" color="text.secondary">
											Expiran: {formatDate(log.logsRetention.detailedLogsExpireAt)}
										</Typography>
									)}
								</Stack>
								<Box
									sx={{
										maxHeight: 300,
										overflow: "auto",
										bgcolor: theme.palette.grey[50],
										borderRadius: 1,
										p: 1,
									}}
								>
									<Stack spacing={1}>
										{log.detailedLogs.map((entry, index) => (
											<Box
												key={index}
												sx={{
													display: "flex",
													gap: 1,
													alignItems: "flex-start",
													p: 1,
													borderRadius: 1,
													bgcolor: alpha(getLogLevelColor(entry.level, theme), 0.05),
													borderLeft: `3px solid ${getLogLevelColor(entry.level, theme)}`,
												}}
											>
												<Chip
													label={getLogLevelLabel(entry.level)}
													size="small"
													sx={{
														minWidth: 55,
														height: 20,
														fontSize: "0.65rem",
														fontWeight: 600,
														bgcolor: alpha(getLogLevelColor(entry.level, theme), 0.15),
														color: getLogLevelColor(entry.level, theme),
													}}
												/>
												<Box flex={1}>
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography variant="body2" fontWeight={500}>
															{entry.message}
														</Typography>
														<Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", ml: 1 }}>
															{new Date(entry.timestamp).toLocaleTimeString("es-AR")}
														</Typography>
													</Stack>
													{entry.data && Object.keys(entry.data).length > 0 && (
														<Box
															sx={{
																mt: 0.5,
																p: 0.5,
																bgcolor: theme.palette.grey[100],
																borderRadius: 0.5,
																fontFamily: "monospace",
																fontSize: "0.7rem",
																overflow: "auto",
															}}
														>
															<pre style={{ margin: 0 }}>{JSON.stringify(entry.data, null, 2)}</pre>
														</Box>
													)}
												</Box>
											</Box>
										))}
									</Stack>
								</Box>
							</CardContent>
						</Card>
					)}

					{/* Raw JSON */}
					<Card variant="outlined">
						<CardContent>
							<Stack direction="row" alignItems="center" spacing={1} mb={1}>
								<Code1 size={16} />
								<Typography variant="subtitle2">JSON Completo</Typography>
							</Stack>
							<Box
								sx={{
									bgcolor: theme.palette.grey[900],
									color: theme.palette.grey[100],
									p: 2,
									borderRadius: 1,
									overflow: "auto",
									maxHeight: 300,
									fontFamily: "monospace",
									fontSize: "0.75rem",
								}}
							>
								<pre style={{ margin: 0 }}>{JSON.stringify(log, null, 2)}</pre>
							</Box>
						</CardContent>
					</Card>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cerrar</Button>
			</DialogActions>
		</Dialog>
	);
};

const LogsTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<WorkerLogsListResponse | null>(null);
	const [selectedLog, setSelectedLog] = useState<WorkerLog | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	// Filters
	const [filters, setFilters] = useState<LogsListParams>({
		limit: 50,
		skip: 0,
		hours: 24,
	});

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await WorkerLogsService.getLogs(filters);
			setData(response);
		} catch (error) {
			enqueueSnackbar("Error al cargar logs", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [filters, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleFilterChange = (key: keyof LogsListParams, value: any) => {
		setFilters((prev) => ({
			...prev,
			[key]: value,
			skip: 0, // Reset pagination on filter change
		}));
	};

	const handlePageChange = (_event: unknown, newPage: number) => {
		setFilters((prev) => ({
			...prev,
			skip: newPage * (prev.limit || 50),
		}));
	};

	const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilters((prev) => ({
			...prev,
			limit: parseInt(event.target.value, 10),
			skip: 0,
		}));
	};

	const handleLogClick = (log: WorkerLog) => {
		setSelectedLog(log);
		setDetailOpen(true);
	};

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Historial de Logs</Typography>
					<Tooltip title="Actualizar">
						<IconButton onClick={fetchData}>
							<Refresh size={20} />
						</IconButton>
					</Tooltip>
				</Stack>

				{/* Filters */}
				<Paper sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Tipo</InputLabel>
								<Select
									value={filters.workerType || ""}
									label="Tipo"
									onChange={(e) => handleFilterChange("workerType", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="update">Actualización</MenuItem>
									<MenuItem value="verify">Verificación</MenuItem>
									<MenuItem value="scraping">Scraping</MenuItem>
									<MenuItem value="recovery">Recuperación</MenuItem>
									<MenuItem value="stuck_documents">Docs Atascados</MenuItem>
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
									<MenuItem value="success">Exitoso</MenuItem>
									<MenuItem value="partial">Parcial</MenuItem>
									<MenuItem value="failed">Fallido</MenuItem>
									<MenuItem value="in_progress">En progreso</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Fuero</InputLabel>
								<Select
									value={filters.fuero || ""}
									label="Fuero"
									onChange={(e) => handleFilterChange("fuero", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="CIV">Civil</MenuItem>
									<MenuItem value="CSS">Seg. Social</MenuItem>
									<MenuItem value="CNT">Trabajo</MenuItem>
									<MenuItem value="COM">Comercial</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Movimientos</InputLabel>
								<Select
									value={filters.hasMovimientos || ""}
									label="Movimientos"
									onChange={(e) => handleFilterChange("hasMovimientos", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="true">Con movimientos</MenuItem>
									<MenuItem value="false">Sin movimientos</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Período</InputLabel>
								<Select
									value={filters.hours || 24}
									label="Período"
									onChange={(e) => handleFilterChange("hours", e.target.value)}
								>
									<MenuItem value={1}>1 hora</MenuItem>
									<MenuItem value={6}>6 horas</MenuItem>
									<MenuItem value={12}>12 horas</MenuItem>
									<MenuItem value={24}>24 horas</MenuItem>
									<MenuItem value={48}>48 horas</MenuItem>
									<MenuItem value={168}>7 días</MenuItem>
									<MenuItem value="all">Todo</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} sm={6} md={2}>
							<TextField
								fullWidth
								size="small"
								label="Worker ID"
								value={filters.workerId || ""}
								onChange={(e) => handleFilterChange("workerId", e.target.value || undefined)}
								placeholder="ej: app_update_trabajo_192"
							/>
						</Grid>
					</Grid>
				</Paper>

				{/* Table */}
				{loading ? (
					<Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
				) : (
					<Paper>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Worker</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Documento</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="right">Duración</TableCell>
										<TableCell align="right">Mov. +</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data?.data.map((log) => (
										<TableRow
											key={log._id}
											hover
											sx={{ cursor: "pointer" }}
											onClick={() => handleLogClick(log)}
										>
											<TableCell>
												<Typography variant="body2" fontSize="0.8rem">
													{log.startTime ? formatDate(log.startTime) : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontFamily="monospace" fontSize="0.7rem">
													{log.workerId}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={getWorkerTypeLabel(log.workerType)}
													size="small"
													variant="outlined"
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.8rem">
													{log.document.fuero} {log.document.number}/{log.document.year}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={getStatusLabel(log.status)}
													size="small"
													sx={{
														bgcolor: alpha(getStatusColor(log.status, theme), 0.1),
														color: getStatusColor(log.status, theme),
													}}
												/>
											</TableCell>
											<TableCell align="right">
												{log.duration ? formatDuration(log.duration) : "-"}
											</TableCell>
											<TableCell align="right">{log.changes?.movimientosAdded || 0}</TableCell>
										</TableRow>
									))}
									{(!data?.data || data.data.length === 0) && (
										<TableRow>
											<TableCell colSpan={7} align="center">
												<Typography color="text.secondary" py={3}>
													No hay logs que coincidan con los filtros
												</Typography>
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>
						</TableContainer>
						{data?.pagination && (
							<TablePagination
								component="div"
								count={data.pagination.total}
								page={Math.floor((filters.skip || 0) / (filters.limit || 50))}
								onPageChange={handlePageChange}
								rowsPerPage={filters.limit || 50}
								onRowsPerPageChange={handleRowsPerPageChange}
								rowsPerPageOptions={[25, 50, 100, 200]}
								labelRowsPerPage="Filas por página"
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						)}
					</Paper>
				)}
			</Stack>

			<LogDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} log={selectedLog} />
		</Box>
	);
};

// ======================== ERRORS TAB ========================

const ErrorsTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<FailedLogsResponse | null>(null);
	const [hoursFilter, setHoursFilter] = useState(24);
	const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const response = await WorkerLogsService.getFailedLogs(hoursFilter);
			setData(response);
		} catch (error) {
			enqueueSnackbar("Error al cargar errores", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [hoursFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const errorPatterns = data?.errorPatterns ? Object.entries(data.errorPatterns) : [];

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={2} alignItems="center">
						<Typography variant="h5">Errores y Fallos</Typography>
						{data && (
							<Chip
								icon={<Warning2 size={16} />}
								label={`${data.total} en ${data.period}`}
								color={data.total > 0 ? "error" : "default"}
							/>
						)}
					</Stack>
					<Stack direction="row" spacing={2} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Período</InputLabel>
							<Select
								value={hoursFilter}
								label="Período"
								onChange={(e) => setHoursFilter(Number(e.target.value))}
							>
								<MenuItem value={1}>1 hora</MenuItem>
								<MenuItem value={6}>6 horas</MenuItem>
								<MenuItem value={12}>12 horas</MenuItem>
								<MenuItem value={24}>24 horas</MenuItem>
								<MenuItem value={48}>48 horas</MenuItem>
								<MenuItem value={168}>7 días</MenuItem>
							</Select>
						</FormControl>
						<Tooltip title="Actualizar">
							<IconButton onClick={fetchData}>
								<Refresh size={20} />
							</IconButton>
						</Tooltip>
					</Stack>
				</Stack>

				{loading ? (
					<Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
				) : (
					<>
						{/* Error Patterns */}
						{errorPatterns.length > 0 && (
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Patrones de Error ({errorPatterns.length})
									</Typography>
									<Stack spacing={2}>
										{errorPatterns.map(([pattern, info]) => (
											<Card
												key={pattern}
												variant="outlined"
												sx={{
													bgcolor: alpha(theme.palette.error.main, 0.02),
													borderColor: alpha(theme.palette.error.main, 0.2),
												}}
											>
												<CardContent>
													<Stack
														direction="row"
														justifyContent="space-between"
														alignItems="flex-start"
														sx={{ cursor: "pointer" }}
														onClick={() =>
															setExpandedPattern(expandedPattern === pattern ? null : pattern)
														}
													>
														<Box flex={1}>
															<Typography variant="subtitle1" fontWeight={500} color="error.main">
																{pattern}
															</Typography>
															<Stack direction="row" spacing={2} mt={1}>
																<Chip
																	label={`${info.count} ocurrencias`}
																	size="small"
																	color="error"
																	variant="outlined"
																/>
																<Typography variant="caption" color="text.secondary">
																	Última: {formatDate(info.lastOccurrence)}
																</Typography>
															</Stack>
														</Box>
														<IconButton size="small">
															<ArrowRight2
																size={20}
																style={{
																	transform: expandedPattern === pattern ? "rotate(90deg)" : "none",
																	transition: "transform 0.2s",
																}}
															/>
														</IconButton>
													</Stack>
													<Collapse in={expandedPattern === pattern}>
														<Box mt={2}>
															<Typography variant="subtitle2" gutterBottom>
																Workers afectados:
															</Typography>
															<Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
																{info.workers.map((w) => (
																	<Chip
																		key={w}
																		label={w}
																		size="small"
																		variant="outlined"
																		sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
																	/>
																))}
															</Stack>
															{info.examples.length > 0 && (
																<>
																	<Typography variant="subtitle2" gutterBottom>
																		Ejemplos:
																	</Typography>
																	<Stack spacing={1}>
																		{info.examples.map((ex) => (
																			<Typography
																				key={ex.logId}
																				variant="body2"
																				fontFamily="monospace"
																				fontSize="0.75rem"
																			>
																				Doc: {ex.number}/{ex.year} - Log: {ex.logId}
																			</Typography>
																		))}
																	</Stack>
																</>
															)}
														</Box>
													</Collapse>
												</CardContent>
											</Card>
										))}
									</Stack>
								</CardContent>
							</Card>
						)}

						{/* Failed Logs List */}
						{data?.logs && data.logs.length > 0 && (
							<Card>
								<CardContent>
									<Typography variant="h6" gutterBottom>
										Logs Fallidos
									</Typography>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Fecha</TableCell>
													<TableCell>Worker</TableCell>
													<TableCell>Documento</TableCell>
													<TableCell>Error</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{data.logs.map((log) => (
													<TableRow key={log._id}>
														<TableCell>
															{log.startTime ? formatDate(log.startTime) : "-"}
														</TableCell>
														<TableCell>
															<Typography variant="body2" fontFamily="monospace" fontSize="0.7rem">
																{log.workerId}
															</Typography>
														</TableCell>
														<TableCell>
															{log.document.fuero} {log.document.number}/{log.document.year}
														</TableCell>
														<TableCell>
															<Typography variant="body2" color="error" fontSize="0.8rem">
																{log.error || log.result?.message || "-"}
															</Typography>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</CardContent>
							</Card>
						)}

						{errorPatterns.length === 0 && (!data?.logs || data.logs.length === 0) && (
							<Alert severity="success" icon={<TickCircle size={20} />}>
								No hay errores en el período seleccionado
							</Alert>
						)}
					</>
				)}
			</Stack>
		</Box>
	);
};

// ======================== SEARCH TAB ========================

const SearchTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<SearchLogsResponse | null>(null);
	const [selectedLog, setSelectedLog] = useState<WorkerLog | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	// Search params
	const [searchParams, setSearchParams] = useState<SearchLogsParams>({
		q: "",
		hours: 24,
		limit: 50,
		skip: 0,
	});
	const [searchText, setSearchText] = useState("");

	const handleSearch = useCallback(async () => {
		if (!searchParams.q.trim()) {
			enqueueSnackbar("Ingresa un texto de búsqueda", { variant: "warning" });
			return;
		}
		try {
			setLoading(true);
			const response = await WorkerLogsService.searchLogs(searchParams);
			setData(response);
		} catch (error) {
			enqueueSnackbar("Error al buscar logs", { variant: "error" });
			console.error(error);
		} finally {
			setLoading(false);
		}
	}, [searchParams, enqueueSnackbar]);

	const handleParamChange = (key: keyof SearchLogsParams, value: any) => {
		setSearchParams((prev) => ({
			...prev,
			[key]: value,
			skip: key !== "skip" ? 0 : value,
		}));
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSearch();
		}
	};

	const handlePageChange = (_event: unknown, newPage: number) => {
		const newSkip = newPage * (searchParams.limit || 50);
		setSearchParams((prev) => ({ ...prev, skip: newSkip }));
		// Re-fetch with new skip
		WorkerLogsService.searchLogs({ ...searchParams, skip: newSkip })
			.then(setData)
			.catch(console.error);
	};

	const handleLogClick = async (log: WorkerLog) => {
		try {
			// Fetch full log detail to get detailedLogs
			const response = await WorkerLogsService.getLogDetail(log._id);
			setSelectedLog(response.data);
			setDetailOpen(true);
		} catch (error) {
			// Fallback to original log if detail fetch fails
			setSelectedLog(log);
			setDetailOpen(true);
		}
	};

	return (
		<Box sx={{ p: 3 }}>
			<Stack spacing={3}>
				<Typography variant="h5">Búsqueda en Logs Detallados</Typography>

				{/* Search Form */}
				<Paper sx={{ p: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={4}>
							<TextField
								fullWidth
								size="small"
								label="Texto a buscar"
								value={searchText}
								onChange={(e) => {
									setSearchText(e.target.value);
									handleParamChange("q", e.target.value);
								}}
								onKeyPress={handleKeyPress}
								placeholder="ej: captcha, error, timeout..."
							/>
						</Grid>
						<Grid item xs={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Tipo</InputLabel>
								<Select
									value={searchParams.workerType || ""}
									label="Tipo"
									onChange={(e) => handleParamChange("workerType", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="update">Actualización</MenuItem>
									<MenuItem value="verify">Verificación</MenuItem>
									<MenuItem value="scraping">Scraping</MenuItem>
									<MenuItem value="recovery">Recuperación</MenuItem>
									<MenuItem value="stuck_documents">Docs Atascados</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado</InputLabel>
								<Select
									value={searchParams.status || ""}
									label="Estado"
									onChange={(e) => handleParamChange("status", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="success">Exitoso</MenuItem>
									<MenuItem value="partial">Parcial</MenuItem>
									<MenuItem value="failed">Fallido</MenuItem>
									<MenuItem value="in_progress">En progreso</MenuItem>
									<MenuItem value="error">Error</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={1.5}>
							<FormControl fullWidth size="small">
								<InputLabel>Nivel</InputLabel>
								<Select
									value={searchParams.level || ""}
									label="Nivel"
									onChange={(e) => handleParamChange("level", e.target.value || undefined)}
								>
									<MenuItem value="">Todos</MenuItem>
									<MenuItem value="debug">Debug</MenuItem>
									<MenuItem value="info">Info</MenuItem>
									<MenuItem value="warn">Warn</MenuItem>
									<MenuItem value="error">Error</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} md={1.5}>
							<FormControl fullWidth size="small">
								<InputLabel>Período</InputLabel>
								<Select
									value={searchParams.hours || 24}
									label="Período"
									onChange={(e) => handleParamChange("hours", Number(e.target.value))}
								>
									<MenuItem value={1}>1 hora</MenuItem>
									<MenuItem value={6}>6 horas</MenuItem>
									<MenuItem value={12}>12 horas</MenuItem>
									<MenuItem value={24}>24 horas</MenuItem>
									<MenuItem value={48}>48 horas</MenuItem>
									<MenuItem value={168}>7 días</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={1}>
							<Button
								fullWidth
								variant="contained"
								onClick={handleSearch}
								disabled={loading || !searchText.trim()}
								startIcon={loading ? <CircularProgress size={16} /> : <SearchNormal1 size={16} />}
							>
								Buscar
							</Button>
						</Grid>
					</Grid>
				</Paper>

				{/* Results Info */}
				{data && (
					<Stack direction="row" spacing={2} alignItems="center">
						<Typography variant="body2" color="text.secondary">
							Búsqueda: <strong>"{data.searchText}"</strong> en {data.period}
						</Typography>
						<Chip label={`${data.pagination.total} resultados`} size="small" />
						{data.filters.workerType && (
							<Chip label={`Tipo: ${getWorkerTypeLabel(data.filters.workerType)}`} size="small" variant="outlined" />
						)}
						{data.filters.status && (
							<Chip label={`Estado: ${getStatusLabel(data.filters.status)}`} size="small" variant="outlined" />
						)}
						{data.filters.level && (
							<Chip label={`Nivel: ${getLogLevelLabel(data.filters.level as LogLevel)}`} size="small" variant="outlined" />
						)}
					</Stack>
				)}

				{/* Results Table */}
				{loading ? (
					<Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
				) : data?.results && data.results.length > 0 ? (
					<Paper>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Worker</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Documento</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="right">Coincidencias</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{data.results.map((log) => (
										<TableRow
											key={log._id}
											hover
											sx={{ cursor: "pointer" }}
											onClick={() => handleLogClick(log)}
										>
											<TableCell>
												<Typography variant="body2" fontSize="0.8rem">
													{log.startTime ? formatDate(log.startTime) : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontFamily="monospace" fontSize="0.7rem">
													{log.workerId}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={getWorkerTypeLabel(log.workerType)}
													size="small"
													variant="outlined"
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.8rem">
													{log.document.fuero} {log.document.number}/{log.document.year}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={getStatusLabel(log.status)}
													size="small"
													sx={{
														bgcolor: alpha(getStatusColor(log.status, theme), 0.1),
														color: getStatusColor(log.status, theme),
													}}
												/>
											</TableCell>
											<TableCell align="right">
												{log.matchCount && (
													<Chip
														label={log.matchCount}
														size="small"
														color="primary"
													/>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
						{data.pagination && (
							<TablePagination
								component="div"
								count={data.pagination.total}
								page={Math.floor((searchParams.skip || 0) / (searchParams.limit || 50))}
								onPageChange={handlePageChange}
								rowsPerPage={searchParams.limit || 50}
								rowsPerPageOptions={[50]}
								labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
							/>
						)}
					</Paper>
				) : data ? (
					<Alert severity="info">No se encontraron resultados para "{data.searchText}"</Alert>
				) : (
					<Alert severity="info">
						Ingresa un texto para buscar en los mensajes de los logs detallados.
						La búsqueda es case-insensitive.
					</Alert>
				)}
			</Stack>

			<LogDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} log={selectedLog} />
		</Box>
	);
};

// ======================== MAIN COMPONENT ========================

interface WorkerLogsTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
	description: string;
}

const WorkerLogs: React.FC = () => {
	const theme = useTheme();
	const [activeTab, setActiveTab] = useState("overview");
	const [refreshKey, setRefreshKey] = useState(0);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
	};

	const handleRefresh = () => {
		setRefreshKey((prev) => prev + 1);
	};

	const tabs: WorkerLogsTab[] = [
		{
			label: "Resumen",
			value: "overview",
			icon: <Chart size={20} />,
			component: <OverviewTab key={refreshKey} onRefresh={handleRefresh} />,
			description: "Estadísticas generales y conteos",
		},
		{
			label: "Workers",
			value: "workers",
			icon: <Setting3 size={20} />,
			component: <WorkersTab key={refreshKey} />,
			description: "Lista de workers activos",
		},
		{
			label: "Actividad",
			value: "activity",
			icon: <Activity size={20} />,
			component: <ActivityTab key={refreshKey} />,
			description: "Actividad en tiempo real",
		},
		{
			label: "Logs",
			value: "logs",
			icon: <DocumentText size={20} />,
			component: <LogsTab key={refreshKey} />,
			description: "Historial de logs",
		},
		{
			label: "Búsqueda",
			value: "search",
			icon: <SearchNormal1 size={20} />,
			component: <SearchTab key={refreshKey} />,
			description: "Buscar en logs detallados",
		},
		{
			label: "Errores",
			value: "errors",
			icon: <Warning2 size={20} />,
			component: <ErrorsTab key={refreshKey} />,
			description: "Errores y patrones de fallo",
		},
	];

	return (
		<MainCard>
			<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Header */}
				<Box>
					<Stack direction="row" alignItems="center" spacing={1}>
						<Typography variant="h3">Logs de Workers (APP)</Typography>
						<Chip
							label="VITE_API_PJN"
							size="small"
							sx={{
								fontFamily: "monospace",
								fontSize: "0.7rem",
								bgcolor: alpha(theme.palette.info.main, 0.1),
								color: theme.palette.info.main,
							}}
						/>
					</Stack>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
						Monitoreo y análisis de logs de workers de la aplicación principal
					</Typography>
				</Box>

				{/* Tabs */}
				<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
					<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
						<Tabs
							value={activeTab}
							onChange={handleTabChange}
							variant="scrollable"
							scrollButtons="auto"
							sx={{
								"& .MuiTab-root": {
									minHeight: 56,
									textTransform: "none",
									fontSize: "0.875rem",
									fontWeight: 500,
								},
							}}
						>
							{tabs.map((tab) => (
								<Tab
									key={tab.value}
									label={
										<Stack direction="row" spacing={1} alignItems="center">
											<Box sx={{ color: theme.palette.primary.main }}>{tab.icon}</Box>
											<Typography variant="body2" fontWeight={500}>
												{tab.label}
											</Typography>
										</Stack>
									}
									value={tab.value}
								/>
							))}
						</Tabs>
					</Box>

					{/* Tab Content */}
					<Box sx={{ bgcolor: theme.palette.background.paper }}>
						{tabs.map((tab) => (
							<TabPanel key={tab.value} value={activeTab} index={tab.value}>
								{tab.component}
							</TabPanel>
						))}
					</Box>
				</Paper>
			</Stack>
		</MainCard>
	);
};

export default WorkerLogs;
