import React, { useState, useEffect, useCallback } from "react";
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
	Tabs,
	Tab,
	Divider,
	Switch,
	FormControlLabel,
} from "@mui/material";
import { Refresh, Trash, Setting3 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import ScraperService, { ScraperConfig, ScraperJob, ScraperRun, ScraperJobStats, ScraperRunStats } from "api/scraperService";
import dayjs from "dayjs";

interface TabPanelProps {
	children?: React.ReactNode;
	value: string;
	index: string;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
	<Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
		{value === index && children}
	</Box>
);

const JOB_STATUS_CONFIG: Record<string, { color: "default" | "warning" | "info" | "success" | "error"; label: string }> = {
	pending: { color: "warning", label: "Pendiente" },
	in_progress: { color: "info", label: "En Proceso" },
	completed: { color: "success", label: "Completado" },
	failed: { color: "error", label: "Fallido" },
	skipped: { color: "default", label: "Omitido" },
};

const RUN_STATUS_CONFIG: Record<string, { color: "default" | "warning" | "info" | "success" | "error"; label: string }> = {
	running: { color: "info", label: "Corriendo" },
	completed: { color: "success", label: "Completado" },
	failed: { color: "error", label: "Fallido" },
	stopped: { color: "default", label: "Detenido" },
};

const formatDate = (dateString?: string) => {
	if (!dateString) return "-";
	return dayjs(dateString).format("DD/MM/YYYY HH:mm:ss");
};

const formatDuration = (ms?: number) => {
	if (!ms) return "-";
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

// ─── Config Tab ───────────────────────────────────────────────────────────────

const ConfigTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<ScraperConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [resetDialogOpen, setResetDialogOpen] = useState(false);

	// Edit state (flat for easier binding)
	const [enabled, setEnabled] = useState(true);
	const [checkIntervalHours, setCheckIntervalHours] = useState(3);
	const [workingHoursStart, setWorkingHoursStart] = useState(8);
	const [workingHoursEnd, setWorkingHoursEnd] = useState(20);
	const [headlessDev, setHeadlessDev] = useState(false);
	const [headlessProd, setHeadlessProd] = useState(true);
	const [minWorkers, setMinWorkers] = useState(1);
	const [maxWorkers, setMaxWorkers] = useState(3);
	const [batchSize, setBatchSize] = useState(50);
	// Estados finales y patrones de notificación
	const [finalStatuses, setFinalStatuses] = useState<string[]>([]);
	const [finalStatusInput, setFinalStatusInput] = useState("");
	const [notifStatusMatches, setNotifStatusMatches] = useState<string[]>([]);
	const [notifStatusInput, setNotifStatusInput] = useState("");
	const [notifDescMatches, setNotifDescMatches] = useState<string[]>([]);
	const [notifDescInput, setNotifDescInput] = useState("");

	const fetchConfig = useCallback(async () => {
		try {
			setLoading(true);
			const response = await ScraperService.getConfig();
			const cfg = response.data;
			setConfig(cfg);
			setEnabled(cfg.global?.enabled ?? true);
			setCheckIntervalHours(cfg.scraping?.checkIntervalHours ?? 3);
			setWorkingHoursStart(cfg.scraping?.schedule?.workingHoursStart ?? 8);
			setWorkingHoursEnd(cfg.scraping?.schedule?.workingHoursEnd ?? 20);
			setHeadlessDev(cfg.scraping?.headless?.development ?? false);
			setHeadlessProd(cfg.scraping?.headless?.production ?? true);
			setMinWorkers(cfg.workers?.scraper?.scaling?.minWorkers ?? 1);
			setMaxWorkers(cfg.workers?.scraper?.scaling?.maxWorkers ?? 3);
			setBatchSize(cfg.workers?.scraper?.cron?.batchSize ?? 50);
			setFinalStatuses(cfg.scraping?.finalStatuses ?? []);
			setNotifStatusMatches(cfg.scraping?.notificationPatterns?.statusMatches ?? []);
			setNotifDescMatches(cfg.scraping?.notificationPatterns?.descriptionMatches ?? []);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar la configuracion", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchConfig();
	}, [fetchConfig]);

	const handleSave = async () => {
		try {
			setSaving(true);
			await ScraperService.updateConfig({
				scraping: {
					checkIntervalHours,
					schedule: { workingHoursStart, workingHoursEnd },
					headless: { development: headlessDev, production: headlessProd },
					finalStatuses,
					notificationPatterns: {
						statusMatches: notifStatusMatches,
						descriptionMatches: notifDescMatches,
					},
				},
				global: { enabled },
				workers: {
					scraper: {
						scaling: { minInstances: minWorkers, maxInstances: maxWorkers },
						cron: { batchSize },
					},
				},
			});
			enqueueSnackbar("Configuracion guardada exitosamente", { variant: "success" });
			fetchConfig();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al guardar la configuracion", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		try {
			setResetting(true);
			await ScraperService.resetConfig();
			enqueueSnackbar("Configuracion reseteada a valores por defecto", { variant: "success" });
			setResetDialogOpen(false);
			fetchConfig();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al resetear la configuracion", { variant: "error" });
		} finally {
			setResetting(false);
		}
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} variant="rectangular" height={56} />
				))}
			</Stack>
		);
	}

	if (!config) {
		return <Alert severity="error">No se pudo cargar la configuracion</Alert>;
	}

	return (
		<Stack spacing={3}>
			{/* Global */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					General
				</Typography>
				<Stack spacing={2}>
					<FormControlLabel
						control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
						label="Scraper habilitado"
					/>
					<Typography variant="caption" color="textSecondary">
						URL objetivo: {config.scraping?.targetUrl}
					</Typography>
					<Typography variant="caption" color="textSecondary">
						Ultima actualizacion: {formatDate(config.updatedAt)}
					</Typography>
				</Stack>
			</Paper>

			{/* Schedule */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					Horario de Procesamiento
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Intervalo entre checks (horas)"
							type="number"
							value={checkIntervalHours}
							onChange={(e) => setCheckIntervalHours(Number(e.target.value))}
							inputProps={{ min: 1, max: 24 }}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Hora de inicio (0-23)"
							type="number"
							value={workingHoursStart}
							onChange={(e) => setWorkingHoursStart(Number(e.target.value))}
							inputProps={{ min: 0, max: 23 }}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Hora de fin (0-23)"
							type="number"
							value={workingHoursEnd}
							onChange={(e) => setWorkingHoursEnd(Number(e.target.value))}
							inputProps={{ min: 1, max: 24 }}
						/>
					</Grid>
				</Grid>
			</Paper>

			{/* Headless */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					Modo Headless
				</Typography>
				<Stack spacing={1}>
					<FormControlLabel
						control={<Switch checked={headlessDev} onChange={(e) => setHeadlessDev(e.target.checked)} />}
						label="Headless en desarrollo"
					/>
					<FormControlLabel
						control={<Switch checked={headlessProd} onChange={(e) => setHeadlessProd(e.target.checked)} />}
						label="Headless en produccion"
					/>
				</Stack>
			</Paper>

			{/* Workers scaling */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					Escalado de Workers
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Workers minimos"
							type="number"
							value={minWorkers}
							onChange={(e) => setMinWorkers(Number(e.target.value))}
							inputProps={{ min: 0, max: 10 }}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Workers maximos"
							type="number"
							value={maxWorkers}
							onChange={(e) => setMaxWorkers(Number(e.target.value))}
							inputProps={{ min: 1, max: 20 }}
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							fullWidth
							size="small"
							label="Batch size (docs por ciclo)"
							type="number"
							value={batchSize}
							onChange={(e) => setBatchSize(Number(e.target.value))}
							inputProps={{ min: 1, max: 500 }}
						/>
					</Grid>
				</Grid>
			</Paper>

			{/* Estados finales */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					Estados Finales
				</Typography>
				<Typography variant="caption" color="textSecondary" display="block" mb={1}>
					Substrings del campo <code>status</code> que se consideran estados definitivos (entregado, devuelto, etc.). Case-insensitive.
				</Typography>
				<Stack direction="row" spacing={1} mb={1} flexWrap="wrap" gap={0.5}>
					{finalStatuses.map((s) => (
						<Chip key={s} label={s} size="small" onDelete={() => setFinalStatuses((prev) => prev.filter((x) => x !== s))} />
					))}
				</Stack>
				<Stack direction="row" spacing={1}>
					<TextField
						size="small"
						label="Agregar estado final"
						value={finalStatusInput}
						onChange={(e) => setFinalStatusInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && finalStatusInput.trim()) {
								setFinalStatuses((prev) => [...new Set([...prev, finalStatusInput.trim()])]);
								setFinalStatusInput("");
							}
						}}
						placeholder="ej: entregado, devuelto"
						sx={{ flex: 1 }}
					/>
					<Button
						variant="outlined"
						size="small"
						onClick={() => {
							if (finalStatusInput.trim()) {
								setFinalStatuses((prev) => [...new Set([...prev, finalStatusInput.trim()])]);
								setFinalStatusInput("");
							}
						}}
					>
						Agregar
					</Button>
				</Stack>
			</Paper>

			{/* Patrones de notificación */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" mb={2} color="textSecondary">
					Patrones de Fecha de Notificación
				</Typography>
				<Typography variant="caption" color="textSecondary" display="block" mb={2}>
					Si algún evento del historial coincide con alguno de estos patrones, se establece automáticamente la <code>notificationDate</code>. Case-insensitive.
				</Typography>
				<Stack spacing={2}>
					<Box>
						<Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
							Por status del evento
						</Typography>
						<Stack direction="row" spacing={1} mb={1} flexWrap="wrap" gap={0.5}>
							{notifStatusMatches.map((s) => (
								<Chip key={s} label={s} size="small" color="primary" variant="outlined" onDelete={() => setNotifStatusMatches((prev) => prev.filter((x) => x !== s))} />
							))}
						</Stack>
						<Stack direction="row" spacing={1}>
							<TextField
								size="small"
								label="Substring de status"
								value={notifStatusInput}
								onChange={(e) => setNotifStatusInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && notifStatusInput.trim()) {
										setNotifStatusMatches((prev) => [...new Set([...prev, notifStatusInput.trim()])]);
										setNotifStatusInput("");
									}
								}}
								placeholder="ej: notificado, avisado"
								sx={{ flex: 1 }}
							/>
							<Button
								variant="outlined"
								size="small"
								onClick={() => {
									if (notifStatusInput.trim()) {
										setNotifStatusMatches((prev) => [...new Set([...prev, notifStatusInput.trim()])]);
										setNotifStatusInput("");
									}
								}}
							>
								Agregar
							</Button>
						</Stack>
					</Box>
					<Box>
						<Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
							Por descripción del evento
						</Typography>
						<Stack direction="row" spacing={1} mb={1} flexWrap="wrap" gap={0.5}>
							{notifDescMatches.map((s) => (
								<Chip key={s} label={s} size="small" color="secondary" variant="outlined" onDelete={() => setNotifDescMatches((prev) => prev.filter((x) => x !== s))} />
							))}
						</Stack>
						<Stack direction="row" spacing={1}>
							<TextField
								size="small"
								label="Substring de descripción"
								value={notifDescInput}
								onChange={(e) => setNotifDescInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter" && notifDescInput.trim()) {
										setNotifDescMatches((prev) => [...new Set([...prev, notifDescInput.trim()])]);
										setNotifDescInput("");
									}
								}}
								placeholder="ej: aviso de llegada, carta documento"
								sx={{ flex: 1 }}
							/>
							<Button
								variant="outlined"
								size="small"
								onClick={() => {
									if (notifDescInput.trim()) {
										setNotifDescMatches((prev) => [...new Set([...prev, notifDescInput.trim()])]);
										setNotifDescInput("");
									}
								}}
							>
								Agregar
							</Button>
						</Stack>
					</Box>
				</Stack>
			</Paper>

			{/* Actions */}
			<Stack direction="row" spacing={2} justifyContent="flex-end">
				<Button variant="outlined" color="error" onClick={() => setResetDialogOpen(true)}>
					Resetear a valores por defecto
				</Button>
				<Button variant="contained" onClick={handleSave} disabled={saving}>
					{saving ? "Guardando..." : "Guardar cambios"}
				</Button>
			</Stack>

			<Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
				<DialogTitle>Confirmar Reset</DialogTitle>
				<DialogContent>
					<Typography>Estas seguro de que queres resetear la configuracion a los valores por defecto?</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>
						Esta accion sobreescribira todos los valores actuales.
					</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResetDialogOpen(false)} disabled={resetting}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={handleReset} disabled={resetting}>
						{resetting ? "Reseteando..." : "Resetear"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

const JobsTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [jobs, setJobs] = useState<ScraperJob[]>([]);
	const [stats, setStats] = useState<ScraperJobStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [total, setTotal] = useState(0);
	const [filterStatus, setFilterStatus] = useState("");
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [clearing, setClearing] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const fetchJobs = useCallback(async () => {
		try {
			setLoading(true);
			const response = await ScraperService.getJobs({
				page: page + 1,
				limit: rowsPerPage,
				...(filterStatus && { status: filterStatus }),
			});
			setJobs(response.data);
			setTotal(response.pagination?.total || 0);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar los jobs", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, enqueueSnackbar]);

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const response = await ScraperService.getJobStats();
			setStats(response.data);
		} catch (error: any) {
			console.error("Error fetching job stats:", error);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	useEffect(() => {
		fetchJobs();
	}, [fetchJobs]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const handleClear = async () => {
		try {
			setClearing(true);
			const response = await ScraperService.clearJobs({ status: "completed", olderThanHours: 24 });
			enqueueSnackbar(`${response.data.deleted} jobs eliminados`, { variant: "success" });
			setClearDialogOpen(false);
			fetchJobs();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al limpiar jobs", { variant: "error" });
		} finally {
			setClearing(false);
		}
	};

	const handleDelete = async (jobId: string) => {
		try {
			setDeletingId(jobId);
			await ScraperService.deleteJob(jobId);
			enqueueSnackbar("Job eliminado", { variant: "success" });
			fetchJobs();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al eliminar job", { variant: "error" });
		} finally {
			setDeletingId(null);
		}
	};

	const pendingCount = stats?.byStatus?.["pending"] || 0;
	const inProgressCount = stats?.byStatus?.["in_progress"] || 0;
	const completedCount = stats?.byStatus?.["completed"] || 0;
	const failedCount = stats?.byStatus?.["failed"] || 0;

	return (
		<Stack spacing={3}>
			{/* Stats */}
			<Grid container spacing={2}>
				{[
					{ label: "Pendientes", value: pendingCount, color: "warning.main" },
					{ label: "En Proceso", value: inProgressCount, color: "info.main" },
					{ label: "Completados", value: completedCount, color: "success.main" },
					{ label: "Fallidos", value: failedCount, color: "error.main" },
				].map(({ label, value, color }) => (
					<Grid item xs={6} sm={3} key={label}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									{label}
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={40} height={36} />
								) : (
									<Typography variant="h4" color={color}>
										{value}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Filters and actions */}
			<Stack direction="row" spacing={2} alignItems="center">
				<FormControl size="small" sx={{ minWidth: 160 }}>
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
						<MenuItem value="in_progress">En Proceso</MenuItem>
						<MenuItem value="completed">Completado</MenuItem>
						<MenuItem value="failed">Fallido</MenuItem>
						<MenuItem value="skipped">Omitido</MenuItem>
					</Select>
				</FormControl>
				<Box flex={1} />
				<Button
					variant="outlined"
					size="small"
					startIcon={<Refresh size={16} />}
					onClick={() => {
						fetchJobs();
						fetchStats();
					}}
				>
					Actualizar
				</Button>
				<Button variant="outlined" color="error" size="small" startIcon={<Trash size={16} />} onClick={() => setClearDialogOpen(true)}>
					Limpiar completados
				</Button>
			</Stack>

			{/* Table */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Tipo</TableCell>
							<TableCell>Entity ID</TableCell>
							<TableCell align="center">Estado</TableCell>
							<TableCell align="center">Prioridad</TableCell>
							<TableCell align="center">Intentos</TableCell>
							<TableCell>Programado</TableCell>
							<TableCell>Creado</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 8 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : jobs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} align="center">
									<Alert severity="info" sx={{ justifyContent: "center" }}>
										No hay jobs para mostrar
									</Alert>
								</TableCell>
							</TableRow>
						) : (
							jobs.map((job) => (
								<TableRow key={job._id} hover>
									<TableCell>
										<Typography variant="body2" fontWeight={500}>
											{job.jobType}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="textSecondary" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{job.entityId || "-"}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Chip
											label={JOB_STATUS_CONFIG[job.status]?.label || job.status}
											size="small"
											color={JOB_STATUS_CONFIG[job.status]?.color || "default"}
										/>
									</TableCell>
									<TableCell align="center">
										<Chip label={job.priority} size="small" variant="outlined" />
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2">
											{job.attempts}/{job.maxAttempts}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" fontSize="0.75rem">
											{formatDate(job.scheduledAt)}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" fontSize="0.75rem">
											{formatDate(job.createdAt)}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Eliminar job">
											<IconButton size="small" color="error" disabled={deletingId === job._id} onClick={() => handleDelete(job._id)}>
												<Trash size={16} />
											</IconButton>
										</Tooltip>
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
					onPageChange={(_, newPage) => setPage(newPage)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 20, 50, 100]}
					labelRowsPerPage="Filas:"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
				/>
			</TableContainer>

			<Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
				<DialogTitle>Limpiar Jobs Completados</DialogTitle>
				<DialogContent>
					<Typography>Eliminar todos los jobs con estado "completado" de mas de 24 horas?</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setClearDialogOpen(false)} disabled={clearing}>
						Cancelar
					</Button>
					<Button variant="contained" color="error" onClick={handleClear} disabled={clearing}>
						{clearing ? "Limpiando..." : "Limpiar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

// ─── Runs Tab ─────────────────────────────────────────────────────────────────

const RunsTab = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [runs, setRuns] = useState<ScraperRun[]>([]);
	const [stats, setStats] = useState<ScraperRunStats | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [total, setTotal] = useState(0);
	const [filterStatus, setFilterStatus] = useState("");
	const [detailRun, setDetailRun] = useState<ScraperRun | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [clearDialogOpen, setClearDialogOpen] = useState(false);
	const [clearing, setClearing] = useState(false);

	const fetchRuns = useCallback(async () => {
		try {
			setLoading(true);
			const response = await ScraperService.getRuns({
				page: page + 1,
				limit: rowsPerPage,
				...(filterStatus && { status: filterStatus }),
			});
			setRuns(response.data);
			setTotal((response as any).count || response.pagination?.total || 0);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar los runs", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, filterStatus, enqueueSnackbar]);

	const fetchStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			const response = await ScraperService.getRunStats();
			setStats(response.data);
		} catch (error: any) {
			console.error("Error fetching run stats:", error);
		} finally {
			setLoadingStats(false);
		}
	}, []);

	useEffect(() => {
		fetchRuns();
	}, [fetchRuns]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const handleClearRuns = async () => {
		try {
			setClearing(true);
			const response = await ScraperService.clearRuns(7);
			enqueueSnackbar(`${response.data.deleted} runs eliminados`, { variant: "success" });
			setClearDialogOpen(false);
			fetchRuns();
			fetchStats();
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al limpiar runs", { variant: "error" });
		} finally {
			setClearing(false);
		}
	};

	const handleViewDetail = async (run: ScraperRun) => {
		try {
			const response = await ScraperService.getRunDetail(run._id);
			setDetailRun(response.data);
			setDetailOpen(true);
		} catch (error: any) {
			enqueueSnackbar(error?.message || "Error al cargar el detalle del run", { variant: "error" });
		}
	};

	return (
		<Stack spacing={3}>
			{/* Stats */}
			<Grid container spacing={2}>
				{[
					{ label: "Hoy - Total", value: stats?.today?.total, color: "primary.main" },
					{ label: "Hoy - Completados", value: stats?.today?.completed, color: "success.main" },
					{ label: "Hoy - Fallidos", value: stats?.today?.failed, color: "error.main" },
					{ label: "Hoy - Jobs procesados", value: stats?.today?.jobsProcessed, color: "info.main" },
				].map(({ label, value, color }) => (
					<Grid item xs={6} sm={3} key={label}>
						<Card variant="outlined">
							<CardContent>
								<Typography variant="body2" color="textSecondary">
									{label}
								</Typography>
								{loadingStats ? (
									<Skeleton variant="text" width={40} height={36} />
								) : (
									<Typography variant="h4" color={color}>
										{value ?? 0}
									</Typography>
								)}
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Filters */}
			<Stack direction="row" spacing={2} alignItems="center">
				<FormControl size="small" sx={{ minWidth: 160 }}>
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
						<MenuItem value="running">Corriendo</MenuItem>
						<MenuItem value="completed">Completado</MenuItem>
						<MenuItem value="failed">Fallido</MenuItem>
						<MenuItem value="stopped">Detenido</MenuItem>
					</Select>
				</FormControl>
				<Box flex={1} />
				<Button
					variant="outlined"
					size="small"
					color="error"
					startIcon={<Trash size={16} />}
					onClick={() => setClearDialogOpen(true)}
				>
					Limpiar runs
				</Button>
				<Button
					variant="outlined"
					size="small"
					startIcon={<Refresh size={16} />}
					onClick={() => {
						fetchRuns();
						fetchStats();
					}}
				>
					Actualizar
				</Button>
			</Stack>

			{/* Table */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Worker ID</TableCell>
							<TableCell>PID</TableCell>
							<TableCell align="center">Estado</TableCell>
							<TableCell align="center">Jobs OK</TableCell>
							<TableCell align="center">Jobs Error</TableCell>
							<TableCell>Iniciado</TableCell>
							<TableCell>Duración</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									{Array.from({ length: 7 }).map((_, j) => (
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : runs.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} align="center">
									<Alert severity="info" sx={{ justifyContent: "center" }}>
										No hay runs para mostrar
									</Alert>
								</TableCell>
							</TableRow>
						) : (
							runs.map((run) => (
								<TableRow key={run._id} hover sx={{ cursor: "pointer" }} onClick={() => handleViewDetail(run)}>
									<TableCell>
										<Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{run.workerId}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" color="textSecondary">
											{run.workerPid || "-"}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Chip
											label={RUN_STATUS_CONFIG[run.status]?.label || run.status}
											size="small"
											color={RUN_STATUS_CONFIG[run.status]?.color || "default"}
										/>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color="success.main" fontWeight={500}>
											{run.jobsSucceeded}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color={run.jobsFailed > 0 ? "error.main" : "textSecondary"} fontWeight={500}>
											{run.jobsFailed}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2" fontSize="0.75rem">
											{formatDate(run.startedAt)}
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{formatDuration(run.durationMs)}</Typography>
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
					onPageChange={(_, newPage) => setPage(newPage)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => {
						setRowsPerPage(parseInt(e.target.value, 10));
						setPage(0);
					}}
					rowsPerPageOptions={[10, 20, 50]}
					labelRowsPerPage="Filas:"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
				/>
			</TableContainer>

			{/* Detail Dialog */}
			<Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Detalle del Run</DialogTitle>
				<DialogContent dividers>
					{detailRun && (
						<Stack spacing={2}>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Typography variant="caption" color="textSecondary">
										Worker ID
									</Typography>
									<Typography variant="body2" fontFamily="monospace">
										{detailRun.workerId}
									</Typography>
								</Grid>
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										Estado
									</Typography>
									<Box mt={0.5}>
										<Chip
											label={RUN_STATUS_CONFIG[detailRun.status]?.label || detailRun.status}
											size="small"
											color={RUN_STATUS_CONFIG[detailRun.status]?.color || "default"}
										/>
									</Box>
								</Grid>
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										PID
									</Typography>
									<Typography variant="body2">{detailRun.workerPid || "-"}</Typography>
								</Grid>
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										Iniciado
									</Typography>
									<Typography variant="body2">{formatDate(detailRun.startedAt)}</Typography>
								</Grid>
								<Grid item xs={6}>
									<Typography variant="caption" color="textSecondary">
										Finalizado
									</Typography>
									<Typography variant="body2">{formatDate(detailRun.finishedAt)}</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="textSecondary">
										Jobs procesados
									</Typography>
									<Typography variant="h5">{detailRun.jobsProcessed}</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="textSecondary">
										Exitosos
									</Typography>
									<Typography variant="h5" color="success.main">
										{detailRun.jobsSucceeded}
									</Typography>
								</Grid>
								<Grid item xs={4}>
									<Typography variant="caption" color="textSecondary">
										Fallidos
									</Typography>
									<Typography variant="h5" color="error.main">
										{detailRun.jobsFailed}
									</Typography>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="caption" color="textSecondary">
										Duracion
									</Typography>
									<Typography variant="body2">{formatDuration(detailRun.durationMs)}</Typography>
								</Grid>
								{detailRun.errorMessage && (
									<Grid item xs={12}>
										<Alert severity="error">{detailRun.errorMessage}</Alert>
									</Grid>
								)}
							</Grid>
						</Stack>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Clear Runs Dialog */}
			<Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
				<DialogTitle>Limpiar Runs</DialogTitle>
				<DialogContent>
					<Typography>Eliminar todos los runs completados, fallidos y detenidos con más de 7 días de antigüedad?</Typography>
					<Alert severity="warning" sx={{ mt: 2 }}>Esta acción no se puede deshacer.</Alert>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setClearDialogOpen(false)} disabled={clearing}>Cancelar</Button>
					<Button variant="contained" color="error" onClick={handleClearRuns} disabled={clearing}>
						{clearing ? "Limpiando..." : "Limpiar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Stack>
	);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ScraperWorkerPage = () => {
	const [tab, setTab] = useState("config");

	return (
		<MainCard
			title="Scraper Postal"
			secondary={
				<Stack direction="row" spacing={1} alignItems="center">
					<Setting3 size={20} />
					<Typography variant="body2" color="textSecondary">
						Worker de Seguimiento Postal (Correo Argentino)
					</Typography>
				</Stack>
			}
		>
			<Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
				<Tab label="Configuracion" value="config" />
				<Tab label="Jobs" value="jobs" />
				<Tab label="Runs" value="runs" />
			</Tabs>
			<Divider />

			<TabPanel value={tab} index="config">
				<ConfigTab />
			</TabPanel>
			<TabPanel value={tab} index="jobs">
				<JobsTab />
			</TabPanel>
			<TabPanel value={tab} index="runs">
				<RunsTab />
			</TabPanel>
		</MainCard>
	);
};

export default ScraperWorkerPage;
