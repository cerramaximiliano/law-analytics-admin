import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	Box,
	Typography,
	Stack,
	Grid,
	Card,
	CardContent,
	Chip,
	Button,
	CircularProgress,
	Alert,
	IconButton,
	Tooltip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Checkbox,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	TablePagination,
	LinearProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	useTheme,
	alpha,
} from "@mui/material";
import {
	Refresh2,
	AddCircle,
	Play,
	Pause,
	RotateLeft,
	Trash,
	Link1,
	Copy,
	Timer1,
	Cpu,
	StatusUp,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import {
	ScrapingWorkerManagerService,
	ManagedWorker,
	ManagerStatusData,
} from "api/workers";
import CreateManagedWorkerModal from "./CreateManagedWorkerModal";
import BatchCreateWorkersModal from "./BatchCreateWorkersModal";
import LinkExistingConfigModal from "./LinkExistingConfigModal";

const getId = (id: string | { $oid: string }): string => (typeof id === "string" ? id : id.$oid);

const FUERO_OPTIONS = [
	{ value: "", label: "Todos" },
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

const FUEROS = ["CIV", "CSS", "CNT", "COM"];

const AUTO_REFRESH_INTERVAL = 30000; // 30s

function formatUptime(ms: number): string {
	if (!ms || ms <= 0) return "-";
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m`;
	return `${seconds}s`;
}

function formatTimeAgo(dateStr: string | null | undefined): string {
	if (!dateStr) return "Nunca";
	const diff = Date.now() - new Date(dateStr).getTime();
	if (diff < 60000) return "Hace segundos";
	if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`;
	if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
	return `Hace ${Math.floor(diff / 86400000)}d`;
}

const ScrapingManagerPanel: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Data state
	const [workers, setWorkers] = useState<ManagedWorker[]>([]);
	const [managerStatus, setManagerStatus] = useState<ManagerStatusData | null>(null);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);

	// Filters & pagination
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [enabledFilter, setEnabledFilter] = useState<string>("");
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);

	// Selection
	const [selected, setSelected] = useState<string[]>([]);

	// Modals
	const [createOpen, setCreateOpen] = useState(false);
	const [batchCreateOpen, setBatchCreateOpen] = useState(false);
	const [linkOpen, setLinkOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [workerToDelete, setWorkerToDelete] = useState<ManagedWorker | null>(null);
	const [deleteDoc, setDeleteDoc] = useState(false);

	// Action loading
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const fetchData = useCallback(async (showLoading = true) => {
		if (showLoading) setLoading(true);
		try {
			const params: { fuero?: string; enabled?: string; page?: number; limit?: number } = {
				page: page + 1,
				limit: rowsPerPage,
			};
			if (fueroFilter) params.fuero = fueroFilter;
			if (enabledFilter) params.enabled = enabledFilter;

			const [workersRes, statusRes] = await Promise.all([
				ScrapingWorkerManagerService.listWorkers(params),
				ScrapingWorkerManagerService.getStatus(),
			]);

			setWorkers(workersRes.data || []);
			setTotal(workersRes.total || 0);
			setManagerStatus(statusRes.data || null);
		} catch (error: any) {
			if (showLoading) {
				enqueueSnackbar("Error al cargar datos del manager", {
					variant: "error",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
			}
		} finally {
			if (showLoading) setLoading(false);
		}
	}, [page, rowsPerPage, fueroFilter, enabledFilter, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Auto-refresh
	useEffect(() => {
		refreshTimerRef.current = setInterval(() => fetchData(false), AUTO_REFRESH_INTERVAL);
		return () => {
			if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
		};
	}, [fetchData]);

	// Worker actions
	const handleAction = async (action: "start" | "stop" | "restart", worker: ManagedWorker) => {
		const wId = getId(worker._id);
		setActionLoading(wId);
		try {
			let response;
			if (action === "start") response = await ScrapingWorkerManagerService.startWorker(wId);
			else if (action === "stop") response = await ScrapingWorkerManagerService.stopWorker(wId);
			else response = await ScrapingWorkerManagerService.restartWorker(wId);

			enqueueSnackbar(response.message || `Worker ${action} exitoso`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchData(false);
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || `Error al ${action} worker`, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setActionLoading(null);
		}
	};

	const handleDelete = async () => {
		if (!workerToDelete) return;
		const wId = getId(workerToDelete._id);
		setActionLoading(wId);
		try {
			const response = await ScrapingWorkerManagerService.deleteWorker(wId, deleteDoc);
			enqueueSnackbar(response.message || "Worker eliminado", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setDeleteDialogOpen(false);
			setWorkerToDelete(null);
			setDeleteDoc(false);
			await fetchData(false);
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || "Error al eliminar worker", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setActionLoading(null);
		}
	};

	const handleBatchAction = async (action: "start" | "stop") => {
		if (selected.length === 0) return;
		setActionLoading("batch");
		try {
			const response =
				action === "start"
					? await ScrapingWorkerManagerService.batchStart(selected)
					: await ScrapingWorkerManagerService.batchStop(selected);

			enqueueSnackbar(`${response.data.modifiedCount} workers ${action === "start" ? "habilitados" : "deshabilitados"}`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setSelected([]);
			await fetchData(false);
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || `Error en operación batch`, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setActionLoading(null);
		}
	};

	const handleFueroAction = async (fuero: string, action: "start" | "stop") => {
		setActionLoading(`fuero-${fuero}`);
		try {
			const response =
				action === "start"
					? await ScrapingWorkerManagerService.startAllByFuero(fuero)
					: await ScrapingWorkerManagerService.stopAllByFuero(fuero);

			enqueueSnackbar(`${response.data.modifiedCount} workers de ${fuero} ${action === "start" ? "habilitados" : "deshabilitados"}`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			await fetchData(false);
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || `Error en operación de ${fuero}`, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setActionLoading(null);
		}
	};

	// Selection helpers
	const handleToggleSelect = (id: string) => {
		setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
	};

	const handleToggleSelectAll = () => {
		if (selected.length === workers.length) setSelected([]);
		else setSelected(workers.map((w) => getId(w._id)));
	};

	// PM2 Status chip
	const getPM2Chip = (worker: ManagedWorker) => {
		if (!worker.pm2Status) {
			return <Chip label="Sin PM2" size="small" sx={{ bgcolor: alpha(theme.palette.grey[500], 0.1), color: theme.palette.grey[500] }} />;
		}
		const status = worker.pm2Status.status;
		if (status === "online") {
			return <Chip label="Online" size="small" sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }} />;
		}
		if (status === "stopped") {
			return <Chip label="Stopped" size="small" sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }} />;
		}
		return <Chip label={status} size="small" sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }} />;
	};

	// Progress
	const getProgress = (w: ManagedWorker): number => {
		if (!w.range_start || !w.range_end || w.range_end <= w.range_start) return 0;
		const totalRange = w.range_end - w.range_start;
		const current = (w.number || w.range_start) - w.range_start;
		return Math.min(100, Math.round((current / totalRange) * 100));
	};

	const isManagerOnline = managerStatus?.manager?.lastReconcile
		? Date.now() - new Date(managerStatus.manager.lastReconcile).getTime() < 120000
		: false;

	return (
		<Box>
			{/* Status Cards */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
							<Typography variant="caption" color="text.secondary">
								Manager
							</Typography>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Chip
									label={isManagerOnline ? "Online" : "Offline"}
									size="small"
									color={isManagerOnline ? "success" : "error"}
								/>
								{managerStatus?.manager && (
									<Typography variant="caption" color="text.secondary">
										Ciclo #{managerStatus.manager.cycleCount}
									</Typography>
								)}
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
							<Typography variant="caption" color="text.secondary">
								Workers Habilitados
							</Typography>
							<Typography variant="h4">{managerStatus?.totalEnabled ?? "-"}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
							<Typography variant="caption" color="text.secondary">
								PM2 Online
							</Typography>
							<Typography variant="h4" color="success.main">
								{managerStatus?.pm2?.online ?? "-"}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
							<Typography variant="caption" color="text.secondary">
								Última Reconciliación
							</Typography>
							<Typography variant="body2">{formatTimeAgo(managerStatus?.manager?.lastReconcile)}</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Summary by Fuero */}
			{managerStatus?.configSummary && Object.keys(managerStatus.configSummary).length > 0 && (
				<Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						{Object.entries(managerStatus.configSummary).map(([fuero, stats]) => (
							<Chip
								key={fuero}
								label={`${fuero}: ${stats.enabled}/${stats.total}`}
								size="small"
								color={stats.enabled > 0 ? "primary" : "default"}
								variant={stats.enabled > 0 ? "filled" : "outlined"}
							/>
						))}
					</Stack>
				</Paper>
			)}

			{/* Action Bar */}
			<Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
				<Stack spacing={2}>
					{/* Row 1: Create buttons + refresh */}
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						<Button variant="contained" size="small" startIcon={<AddCircle size={16} />} onClick={() => setCreateOpen(true)}>
							Crear Worker
						</Button>
						<Button variant="outlined" size="small" startIcon={<Copy size={16} />} onClick={() => setBatchCreateOpen(true)}>
							Batch Create
						</Button>
						<Button variant="outlined" size="small" startIcon={<Link1 size={16} />} onClick={() => setLinkOpen(true)}>
							Vincular Existente
						</Button>
						<Box sx={{ flex: 1 }} />
						<Tooltip title="Actualizar">
							<IconButton size="small" onClick={() => fetchData()} disabled={loading}>
								<Refresh2 size={18} />
							</IconButton>
						</Tooltip>
					</Stack>

					{/* Row 2: Filters */}
					<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Fuero</InputLabel>
							<Select value={fueroFilter} onChange={(e) => { setFueroFilter(e.target.value); setPage(0); }} label="Fuero">
								{FUERO_OPTIONS.map((o) => (
									<MenuItem key={o.value} value={o.value}>
										{o.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<InputLabel>Estado</InputLabel>
							<Select value={enabledFilter} onChange={(e) => { setEnabledFilter(e.target.value); setPage(0); }} label="Estado">
								<MenuItem value="">Todos</MenuItem>
								<MenuItem value="true">Habilitado</MenuItem>
								<MenuItem value="false">Deshabilitado</MenuItem>
							</Select>
						</FormControl>

						{/* Batch actions for selected */}
						{selected.length > 0 && (
							<>
								<Button
									size="small"
									variant="outlined"
									color="success"
									startIcon={<Play size={14} />}
									onClick={() => handleBatchAction("start")}
									disabled={actionLoading === "batch"}
								>
									Iniciar ({selected.length})
								</Button>
								<Button
									size="small"
									variant="outlined"
									color="warning"
									startIcon={<Pause size={14} />}
									onClick={() => handleBatchAction("stop")}
									disabled={actionLoading === "batch"}
								>
									Detener ({selected.length})
								</Button>
							</>
						)}
					</Stack>

					{/* Row 3: Fuero quick actions */}
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						<Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 1 }}>
							Por fuero:
						</Typography>
						{FUEROS.map((f) => (
							<React.Fragment key={f}>
								<Button
									size="small"
									variant="text"
									color="success"
									sx={{ minWidth: 0, px: 1, fontSize: "0.7rem" }}
									onClick={() => handleFueroAction(f, "start")}
									disabled={!!actionLoading}
								>
									{f} Start
								</Button>
								<Button
									size="small"
									variant="text"
									color="warning"
									sx={{ minWidth: 0, px: 1, fontSize: "0.7rem" }}
									onClick={() => handleFueroAction(f, "stop")}
									disabled={!!actionLoading}
								>
									{f} Stop
								</Button>
							</React.Fragment>
						))}
					</Stack>
				</Stack>
			</Paper>

			{/* Workers Table */}
			{loading ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : workers.length === 0 ? (
				<Alert severity="info">No hay workers registrados. Crea uno nuevo o vincula una configuración existente.</Alert>
			) : (
				<>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell padding="checkbox">
										<Checkbox
											indeterminate={selected.length > 0 && selected.length < workers.length}
											checked={selected.length === workers.length && workers.length > 0}
											onChange={handleToggleSelectAll}
											size="small"
										/>
									</TableCell>
									<TableCell>Worker ID</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Rango</TableCell>
									<TableCell>Progreso</TableCell>
									<TableCell>PM2 Status</TableCell>
									<TableCell>CPU</TableCell>
									<TableCell>Memoria</TableCell>
									<TableCell>Uptime</TableCell>
									<TableCell>Restarts</TableCell>
									<TableCell>Habilitado</TableCell>
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{workers.map((worker) => {
									const progress = getProgress(worker);
									const isOnline = worker.pm2Status?.status === "online";
									const isStopped = !worker.pm2Status || worker.pm2Status.status !== "online";
									const wId = getId(worker._id);
									const isActionLoading = actionLoading === wId;

									return (
										<TableRow key={wId} hover>
											<TableCell padding="checkbox">
												<Checkbox
													size="small"
													checked={selected.includes(wId)}
													onChange={() => handleToggleSelect(wId)}
												/>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
													{worker.worker_id}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={worker.fuero} size="small" />
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.75rem">
													{worker.range_start?.toLocaleString()}-{worker.range_end?.toLocaleString()}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Año: {worker.year}
												</Typography>
											</TableCell>
											<TableCell sx={{ minWidth: 100 }}>
												<Stack spacing={0.25}>
													<LinearProgress
														variant="determinate"
														value={progress}
														sx={{ height: 4, borderRadius: 1 }}
													/>
													<Typography variant="caption" color="text.secondary">
														{progress}%
													</Typography>
												</Stack>
											</TableCell>
											<TableCell>{getPM2Chip(worker)}</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.75rem">
													{worker.pm2Status ? `${worker.pm2Status.cpu}%` : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.75rem">
													{worker.pm2Status ? `${worker.pm2Status.memoryMB} MB` : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.75rem">
													{worker.pm2Status ? formatUptime(worker.pm2Status.uptime) : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" fontSize="0.75rem">
													{worker.pm2Status ? worker.pm2Status.restarts : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={worker.enabled ? "Si" : "No"}
													size="small"
													color={worker.enabled ? "success" : "default"}
													variant="outlined"
												/>
											</TableCell>
											<TableCell align="right">
												<Stack direction="row" spacing={0.5} justifyContent="flex-end">
													{isStopped && (
														<Tooltip title="Iniciar">
															<IconButton
																size="small"
																color="success"
																onClick={() => handleAction("start", worker)}
																disabled={isActionLoading}
															>
																{isActionLoading ? <CircularProgress size={14} /> : <Play size={16} />}
															</IconButton>
														</Tooltip>
													)}
													{isOnline && (
														<Tooltip title="Detener">
															<IconButton
																size="small"
																color="warning"
																onClick={() => handleAction("stop", worker)}
																disabled={isActionLoading}
															>
																{isActionLoading ? <CircularProgress size={14} /> : <Pause size={16} />}
															</IconButton>
														</Tooltip>
													)}
													{isOnline && (
														<Tooltip title="Reiniciar">
															<IconButton
																size="small"
																color="info"
																onClick={() => handleAction("restart", worker)}
																disabled={isActionLoading}
															>
																{isActionLoading ? <CircularProgress size={14} /> : <RotateLeft size={16} />}
															</IconButton>
														</Tooltip>
													)}
													<Tooltip title="Eliminar">
														<IconButton
															size="small"
															color="error"
															onClick={() => {
																setWorkerToDelete(worker);
																setDeleteDialogOpen(true);
															}}
															disabled={isActionLoading}
														>
															<Trash size={16} />
														</IconButton>
													</Tooltip>
												</Stack>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</TableContainer>
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
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas por página"
					/>
				</>
			)}

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
				<DialogTitle>Confirmar Eliminación</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{workerToDelete && (
							<>
								¿Eliminar el worker <strong>{workerToDelete.worker_id}</strong> ({workerToDelete.fuero})?
								<br />
								El proceso PM2 será detenido en el próximo ciclo del manager.
							</>
						)}
					</DialogContentText>
					<Box sx={{ mt: 2 }}>
						<Checkbox
							checked={deleteDoc}
							onChange={(e) => setDeleteDoc(e.target.checked)}
							id="delete-doc-check"
						/>
						<label htmlFor="delete-doc-check">
							<Typography variant="body2" component="span" color="error">
								También eliminar el documento de configuración de la base de datos
							</Typography>
						</label>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
					<Button variant="contained" color="error" onClick={handleDelete} disabled={!!actionLoading}>
						{actionLoading ? <CircularProgress size={16} /> : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modals */}
			<CreateManagedWorkerModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => fetchData(false)} />
			<BatchCreateWorkersModal open={batchCreateOpen} onClose={() => setBatchCreateOpen(false)} onSuccess={() => fetchData(false)} />
			<LinkExistingConfigModal open={linkOpen} onClose={() => setLinkOpen(false)} onSuccess={() => fetchData(false)} />
		</Box>
	);
};

export default ScrapingManagerPanel;
