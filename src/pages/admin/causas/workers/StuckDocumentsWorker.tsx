import React from "react";
import { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Alert,
	Stack,
	Chip,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Divider,
	useTheme,
	alpha,
	Switch,
	Button,
	Skeleton,
	TextField,
	FormControlLabel,
	Checkbox,
	IconButton,
	Tooltip,
	LinearProgress,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Pagination,
	CircularProgress,
} from "@mui/material";
import { Setting2, Chart, DocumentText, Refresh, Edit2, Timer, TickCircle, CloseCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import StuckDocumentsService, {
	StuckDocumentsConfig,
	StuckDocumentsStats,
	StuckDocumentsLog,
	StuckDocument,
	ChronicStuckDocument,
} from "api/stuckDocuments";

// Interfaz para tabs laterales
interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`stuck-tabpanel-${index}`}
			aria-labelledby={`stuck-tab-${index}`}
			style={{ width: "100%" }}
			{...other}
		>
			{value === index && <Box sx={{ pl: { xs: 0, md: 3 }, pt: { xs: 2, md: 0 } }}>{children}</Box>}
		</div>
	);
}

// Helper para formatear fecha
const formatDate = (dateStr?: string | null): string => {
	if (!dateStr) return "N/A";
	return new Date(dateStr).toLocaleString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Helper para nombres de días
const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

const StuckDocumentsWorker = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState(0);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Estados de datos
	const [config, setConfig] = useState<StuckDocumentsConfig | null>(null);
	const [stats, setStats] = useState<StuckDocumentsStats | null>(null);
	const [logs, setLogs] = useState<StuckDocumentsLog[]>([]);
	const [pendingDocs, setPendingDocs] = useState<StuckDocument[]>([]);
	const [pendingTotal, setPendingTotal] = useState(0);
	const [pendingPage, setPendingPage] = useState(1);

	// Estado de edicion
	const [editing, setEditing] = useState(false);
	const [editValues, setEditValues] = useState<Partial<StuckDocumentsConfig>>({});

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Cargar datos
	const fetchData = async (showRefreshing = false) => {
		try {
			if (showRefreshing) setRefreshing(true);
			else setLoading(true);

			const [configRes, statsRes] = await Promise.all([
				StuckDocumentsService.getConfig(),
				StuckDocumentsService.getStats(24),
			]);

			if (configRes.success) setConfig(configRes.data);
			if (statsRes.success) setStats(statsRes.data);
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar datos", { variant: "error" });
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	// Cargar logs
	const fetchLogs = async () => {
		try {
			const response = await StuckDocumentsService.getRecentLogs({ hours: 24, limit: 50 });
			if (response.success) {
				setLogs(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar logs", { variant: "error" });
		}
	};

	// Cargar documentos pendientes
	const fetchPending = async () => {
		try {
			const response = await StuckDocumentsService.getPendingDocuments({
				page: pendingPage,
				limit: 15,
			});
			if (response.success) {
				setPendingDocs(response.data);
				setPendingTotal(response.total);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cargar pendientes", { variant: "error" });
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	// Cargar logs cuando se selecciona el tab
	useEffect(() => {
		if (activeTab === 2 && logs.length === 0) {
			fetchLogs();
		}
	}, [activeTab]);

	// Cargar pendientes cuando se selecciona el tab
	useEffect(() => {
		if (activeTab === 3) {
			fetchPending();
		}
	}, [activeTab, pendingPage]);

	// Toggle enabled
	const handleToggleEnabled = async () => {
		try {
			const response = await StuckDocumentsService.toggleWorker(!config?.enabled);
			if (response.success) {
				enqueueSnackbar(`Worker ${!config?.enabled ? "habilitado" : "deshabilitado"}`, { variant: "success" });
				fetchData(true);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar estado", { variant: "error" });
		}
	};

	// Guardar configuracion
	const handleSaveConfig = async () => {
		try {
			// Preparar updates
			const updates: any = {};

			if (editValues.batch_size !== undefined) {
				updates.batch_size = editValues.batch_size;
			}
			if (editValues.lock_timeout_minutes !== undefined) {
				updates.lock_timeout_minutes = editValues.lock_timeout_minutes;
			}
			if (editValues.schedule) {
				updates.schedule = {};
				if (editValues.schedule.cronPattern !== undefined) {
					updates.schedule.cronPattern = editValues.schedule.cronPattern;
				}
				if (editValues.schedule.workingHoursStart !== undefined) {
					updates.schedule.workingHoursStart = editValues.schedule.workingHoursStart;
				}
				if (editValues.schedule.workingHoursEnd !== undefined) {
					updates.schedule.workingHoursEnd = editValues.schedule.workingHoursEnd;
				}
				if (editValues.schedule.workingDays !== undefined) {
					updates.schedule.workingDays = editValues.schedule.workingDays;
				}
			}

			const response = await StuckDocumentsService.updateConfig(updates);
			if (response.success) {
				enqueueSnackbar("Configuracion actualizada", { variant: "success" });
				setEditing(false);
				setEditValues({});
				fetchData(true);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar", { variant: "error" });
		}
	};

	// Resetear estadisticas
	const handleResetStats = async () => {
		try {
			const response = await StuckDocumentsService.resetStats();
			if (response.success) {
				enqueueSnackbar("Estadisticas reseteadas", { variant: "success" });
				fetchData(true);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear", { variant: "error" });
		}
	};

	// Helper para obtener color de salud
	const getHealthColor = (health?: string) => {
		switch (health) {
			case "healthy":
				return theme.palette.success.main;
			case "warning":
				return theme.palette.warning.main;
			case "critical":
				return theme.palette.error.main;
			case "disabled":
				return theme.palette.grey[500];
			default:
				return theme.palette.grey[400];
		}
	};

	// Contenido del tab de Configuracion
	const ConfigContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Estado actual */}
			<Card variant="outlined" sx={{ backgroundColor: alpha(config?.enabled ? theme.palette.success.main : theme.palette.grey[500], 0.05) }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Stack direction="row" spacing={2} alignItems="center">
							<Box
								sx={{
									width: 12,
									height: 12,
									borderRadius: "50%",
									backgroundColor: config?.enabled ? theme.palette.success.main : theme.palette.grey[400],
									animation: config?.enabled ? "pulse 2s infinite" : "none",
									"@keyframes pulse": {
										"0%": { opacity: 1 },
										"50%": { opacity: 0.5 },
										"100%": { opacity: 1 },
									},
								}}
							/>
							<Box>
								<Typography variant="subtitle1" fontWeight="bold">
									Estado del Worker
								</Typography>
								<Typography variant="body2" color="text.secondary">
									{config?.enabled ? "Habilitado" : "Deshabilitado"}
									{stats?.worker?.health && ` - ${stats.worker.healthMessage}`}
								</Typography>
							</Box>
						</Stack>
						<Stack direction="row" spacing={1} alignItems="center">
							<FormControlLabel
								control={<Switch checked={config?.enabled || false} onChange={handleToggleEnabled} color="primary" />}
								label={config?.enabled ? "Activo" : "Inactivo"}
							/>
							<Tooltip title="Actualizar">
								<IconButton size="small" onClick={() => fetchData(true)} disabled={refreshing}>
									<Refresh size={18} className={refreshing ? "spin" : ""} />
								</IconButton>
							</Tooltip>
						</Stack>
					</Stack>
					{config?.last_check && (
						<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
							Ultima ejecucion: {formatDate(config.last_check)}
						</Typography>
					)}
				</CardContent>
			</Card>

			{/* Configuracion del worker */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							Configuracion del Worker
						</Typography>
						{!editing ? (
							<Button size="small" startIcon={<Edit2 size={16} />} onClick={() => setEditing(true)}>
								Editar
							</Button>
						) : (
							<Stack direction="row" spacing={1}>
								<Button size="small" variant="contained" onClick={handleSaveConfig}>
									Guardar
								</Button>
								<Button
									size="small"
									onClick={() => {
										setEditing(false);
										setEditValues({});
									}}
								>
									Cancelar
								</Button>
							</Stack>
						)}
					</Stack>

					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Cron Schedule
								</Typography>
								{editing ? (
									<TextField
										size="small"
										value={editValues.schedule?.cronPattern ?? config?.schedule?.cronPattern ?? ""}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, cronPattern: e.target.value } as any,
											})
										}
									/>
								) : (
									<>
										<Chip label={config?.schedule?.cronPattern || "*/10 * * * *"} size="small" sx={{ fontFamily: "monospace" }} />
										<Typography variant="caption" color="text.secondary">
											Cada 10 minutos
										</Typography>
									</>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Batch Size
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.batch_size ?? config?.batch_size ?? 3}
										onChange={(e) => setEditValues({ ...editValues, batch_size: parseInt(e.target.value) })}
										inputProps={{ min: 1, max: 10 }}
									/>
								) : (
									<>
										<Chip label={config?.batch_size || 3} size="small" color="primary" />
										<Typography variant="caption" color="text.secondary">
											Documentos por ciclo
										</Typography>
									</>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Lock Timeout
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.lock_timeout_minutes ?? config?.lock_timeout_minutes ?? 20}
										onChange={(e) => setEditValues({ ...editValues, lock_timeout_minutes: parseInt(e.target.value) })}
										inputProps={{ min: 5, max: 60 }}
									/>
								) : (
									<>
										<Chip label={`${config?.lock_timeout_minutes || 20} min`} size="small" variant="outlined" />
										<Typography variant="caption" color="text.secondary">
											Tiempo de bloqueo
										</Typography>
									</>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Captcha Provider
								</Typography>
								<Chip label={config?.captcha_provider || "capsolver"} size="small" variant="outlined" />
							</Stack>
						</Grid>
					</Grid>

					<Divider sx={{ my: 2 }} />

					{/* Horario de trabajo */}
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Horario de Trabajo
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Hora inicio
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.schedule?.workingHoursStart ?? config?.schedule?.workingHoursStart ?? 8}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, workingHoursStart: parseInt(e.target.value) } as any,
											})
										}
										inputProps={{ min: 0, max: 23 }}
									/>
								) : (
									<Typography variant="body2">{config?.schedule?.workingHoursStart || 8}:00</Typography>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Hora fin
								</Typography>
								{editing ? (
									<TextField
										size="small"
										type="number"
										value={editValues.schedule?.workingHoursEnd ?? config?.schedule?.workingHoursEnd ?? 22}
										onChange={(e) =>
											setEditValues({
												...editValues,
												schedule: { ...editValues.schedule, workingHoursEnd: parseInt(e.target.value) } as any,
											})
										}
										inputProps={{ min: 0, max: 24 }}
									/>
								) : (
									<Typography variant="body2">{config?.schedule?.workingHoursEnd || 22}:00</Typography>
								)}
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Dias de trabajo
								</Typography>
								<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
									{(config?.schedule?.workingDays || [1, 2, 3, 4, 5]).map((day) => (
										<Chip key={day} label={dayNames[day]} size="small" variant="outlined" />
									))}
								</Stack>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack spacing={0.5}>
								<Typography variant="caption" color="text.secondary">
									Zona horaria
								</Typography>
								<Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
									{config?.schedule?.timezone || "America/Argentina/Buenos_Aires"}
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Descripcion del worker */}
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					<strong>Stuck Documents Worker:</strong> Este worker procesa documentos que fueron verificados exitosamente pero
					no tienen movimientos guardados, usualmente debido a errores durante la fase de scraping. Reintenta la extraccion
					de movimientos para recuperar estos documentos.
				</Typography>
			</Alert>
		</Stack>
	);

	// Contenido del tab de Estadisticas
	const StatsContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Estadisticas globales */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Docs Procesados
							</Typography>
							<Typography variant="h5">
								{config?.documents_processed?.toLocaleString() || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.success.main, 0.05) }}>
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Docs Reparados
							</Typography>
							<Typography variant="h5" color="success.main">
								{config?.documents_fixed?.toLocaleString() || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.error.main, 0.05) }}>
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Docs Fallidos
							</Typography>
							<Typography variant="h5" color="error.main">
								{config?.documents_failed?.toLocaleString() || 0}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">
								Tasa de Exito
							</Typography>
							<Typography variant="h5" color="primary.main">
								{stats?.totals?.successRate || "0%"}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Pendientes por fuero */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
						Documentos Pendientes por Fuero
					</Typography>
					{stats?.pending?.byFuero ? (
						<Grid container spacing={2}>
							<Grid item xs={12} sm={3}>
								<Card variant="outlined" sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
									<CardContent sx={{ py: 1.5 }}>
										<Typography variant="caption" color="text.secondary">
											Total Pendientes
										</Typography>
										<Typography variant="h4" color="primary.main">
											{stats.pending.total?.toLocaleString() || 0}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							{Object.entries(stats.pending.byFuero).map(([fuero, data]) => (
								<Grid item xs={6} sm={2.25} key={fuero}>
									<Card variant="outlined">
										<CardContent sx={{ py: 1.5 }}>
											<Typography variant="caption" color="text.secondary">
												{fuero}
											</Typography>
											<Typography variant="h6">{(data as any).total?.toLocaleString() || 0}</Typography>
											<Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
												<Chip label={`App: ${(data as any).app || 0}`} size="small" variant="outlined" sx={{ fontSize: "0.65rem" }} />
											</Stack>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					) : (
						<Skeleton variant="rectangular" height={80} />
					)}
				</CardContent>
			</Card>

			{/* Actividad reciente */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							Actividad Reciente (24h)
						</Typography>
						<Chip
							label={stats?.worker?.health || "unknown"}
							size="small"
							sx={{
								backgroundColor: alpha(getHealthColor(stats?.worker?.health), 0.1),
								color: getHealthColor(stats?.worker?.health)
							}}
						/>
					</Stack>
					<Grid container spacing={2}>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Logs totales
							</Typography>
							<Typography variant="h6">{stats?.recent?.totalLogs || 0}</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Docs unicos
							</Typography>
							<Typography variant="h6">{stats?.recent?.uniqueDocuments || 0}</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Movimientos agregados
							</Typography>
							<Typography variant="h6" color="success.main">{stats?.recent?.movimientosAdded || 0}</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Tasa exito
							</Typography>
							<Typography variant="h6">{stats?.recent?.successRate || "0%"}</Typography>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Fallos repetidos */}
			{stats?.repeatedFailures && stats.repeatedFailures.length > 0 && (
				<Card variant="outlined">
					<CardContent>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
							<Warning2 size={20} color={theme.palette.warning.main} />
							<Typography variant="subtitle1" fontWeight="bold">
								Documentos con Fallos Repetidos
							</Typography>
						</Stack>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Expediente</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell align="center">Intentos</TableCell>
										<TableCell>Ultimo intento</TableCell>
										<TableCell>Estado</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.repeatedFailures.slice(0, 10).map((doc) => (
										<TableRow key={doc.documentId}>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
													{doc.expediente}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={doc.fuero} size="small" variant="outlined" />
											</TableCell>
											<TableCell align="center">
												<Chip
													label={doc.attempts}
													size="small"
													color={doc.attempts >= 5 ? "error" : "warning"}
												/>
											</TableCell>
											<TableCell>{formatDate(doc.lastAttempt)}</TableCell>
											<TableCell>
												<Tooltip title={doc.lastMessage || ""}>
													<Chip label={doc.lastStatus} size="small" variant="outlined" />
												</Tooltip>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Documentos crónicamente atorados */}
			{stats?.chronicStuck && stats.chronicStuck.length > 0 && (
				<Card variant="outlined" sx={{ borderColor: theme.palette.error.main, borderWidth: 2 }}>
					<CardContent>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
							<CloseCircle size={20} color={theme.palette.error.main} />
							<Typography variant="subtitle1" fontWeight="bold" color="error.main">
								Documentos Crónicamente Atorados
							</Typography>
							<Chip
								label={`${stats.chronicStuck.length} docs`}
								size="small"
								color="error"
								variant="outlined"
							/>
						</Stack>
						<Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
							<Typography variant="body2">
								Estos documentos llevan mucho tiempo atorados con múltiples intentos fallidos.
								Pueden requerir intervención manual o tienen discordancia de datos.
							</Typography>
						</Alert>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Expediente</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell align="center">Intentos</TableCell>
										<TableCell align="center">Días atorado</TableCell>
										<TableCell>Primer intento</TableCell>
										<TableCell>Último intento</TableCell>
										<TableCell align="center">Alertas</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.chronicStuck.map((doc) => (
										<TableRow key={doc.documentId} hover>
											<TableCell>
												<Stack spacing={0.5}>
													<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
														{doc.expediente}
													</Typography>
													{doc.caratula && (
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{
																maxWidth: 180,
																overflow: "hidden",
																textOverflow: "ellipsis",
																whiteSpace: "nowrap",
																display: "block"
															}}
														>
															{doc.caratula}
														</Typography>
													)}
												</Stack>
											</TableCell>
											<TableCell>
												<Chip label={doc.fuero} size="small" variant="outlined" />
											</TableCell>
											<TableCell align="center">
												<Chip
													label={doc.attemptCount}
													size="small"
													color="error"
												/>
											</TableCell>
											<TableCell align="center">
												<Typography
													variant="body2"
													fontWeight="bold"
													color={doc.daysSinceFirst && doc.daysSinceFirst >= 7 ? "error.main" : "warning.main"}
												>
													{doc.daysSinceFirst !== null ? `${doc.daysSinceFirst}d` : "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{formatDate(doc.firstAttempt)}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{formatDate(doc.lastAttempt)}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													{doc.hasFolders && (
														<Tooltip title={`Tiene ${doc.foldersCount} carpetas asociadas`}>
															<Chip
																label="📁"
																size="small"
																variant="outlined"
																sx={{ minWidth: 'auto', px: 0.5 }}
															/>
														</Tooltip>
													)}
													{doc.hasDateDiscordance && (
														<Tooltip title="Discordancia: tiene fechaUltimoMovimiento pero movimientosCount=0">
															<Chip
																label="⚠️"
																size="small"
																color="warning"
																variant="outlined"
																sx={{ minWidth: 'auto', px: 0.5 }}
															/>
														</Tooltip>
													)}
												</Stack>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Boton reset stats */}
			<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
				<Button variant="outlined" color="warning" onClick={handleResetStats}>
					Resetear Estadisticas
				</Button>
			</Box>
		</Stack>
	);

	// Contenido del tab de Logs
	const LogsContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							Logs Recientes (24h)
						</Typography>
						<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchLogs}>
							Actualizar
						</Button>
					</Stack>

					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Estado</TableCell>
									<TableCell>Expediente</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell align="right">Movs. Antes</TableCell>
									<TableCell align="right">Movs. Despues</TableCell>
									<TableCell align="right">Agregados</TableCell>
									<TableCell>Hora</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{logs.length > 0 ? (
									logs.map((log) => (
										<TableRow key={log.id} hover>
											<TableCell>
												{log.status === "success" ? (
													<TickCircle size={18} color={theme.palette.success.main} />
												) : log.status === "partial" ? (
													<Warning2 size={18} color={theme.palette.warning.main} />
												) : (
													<CloseCircle size={18} color={theme.palette.error.main} />
												)}
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{log.document?.expediente || "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={log.document?.fuero || "-"} size="small" variant="outlined" />
											</TableCell>
											<TableCell align="right">{log.document?.movimientosBefore || 0}</TableCell>
											<TableCell align="right">{log.document?.movimientosAfter || 0}</TableCell>
											<TableCell align="right">
												<Typography
													variant="body2"
													color={log.movimientosAdded > 0 ? "success.main" : "text.secondary"}
													fontWeight={log.movimientosAdded > 0 ? "bold" : "normal"}
												>
													+{log.movimientosAdded}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{formatDate(log.startTime)}
												</Typography>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
											<Typography variant="body2" color="text.secondary">
												No hay logs recientes
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</CardContent>
			</Card>
		</Stack>
	);

	// Contenido del tab de Pendientes
	const PendingContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							Documentos Pendientes ({pendingTotal})
						</Typography>
						<Button size="small" startIcon={<Refresh size={16} />} onClick={fetchPending}>
							Actualizar
						</Button>
					</Stack>

					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Expediente</TableCell>
									<TableCell>Caratula</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Source</TableCell>
									<TableCell align="center">Reintentos</TableCell>
									<TableCell>Ultima actualizacion</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{pendingDocs.length > 0 ? (
									pendingDocs.map((doc) => (
										<TableRow key={typeof doc._id === 'string' ? doc._id : doc._id.$oid} hover>
											<TableCell>
												<Typography variant="body2" sx={{ fontFamily: "monospace" }}>
													{doc.number}/{doc.year}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="body2" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
													{doc.caratula || "-"}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip label={doc.fuero} size="small" variant="outlined" />
											</TableCell>
											<TableCell>
												<Chip label={doc.source} size="small" color={doc.source === "app" ? "primary" : "default"} variant="outlined" />
											</TableCell>
											<TableCell align="center">
												<Chip
													label={doc.retryCount || 0}
													size="small"
													color={doc.retryCount >= 3 ? "error" : doc.retryCount >= 1 ? "warning" : "default"}
												/>
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{formatDate(doc.lastUpdate)}
												</Typography>
											</TableCell>
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
											<Typography variant="body2" color="text.secondary">
												No hay documentos pendientes
											</Typography>
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>

					{/* Paginacion */}
					{pendingTotal > 15 && (
						<Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
							<Pagination
								count={Math.ceil(pendingTotal / 15)}
								page={pendingPage}
								onChange={(e, page) => setPendingPage(page)}
								color="primary"
								size="small"
							/>
						</Box>
					)}
				</CardContent>
			</Card>
		</Stack>
	);

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={60} />
				<Skeleton variant="rectangular" height={200} />
				<Skeleton variant="rectangular" height={150} />
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Worker de Documentos Atorados</Typography>
				<Stack direction="row" spacing={1}>
					<Chip
						label={stats?.worker?.health === "healthy" ? "Saludable" : stats?.worker?.health || "Desconocido"}
						size="small"
						sx={{
							backgroundColor: alpha(getHealthColor(stats?.worker?.health), 0.1),
							color: getHealthColor(stats?.worker?.health)
						}}
					/>
					<Chip label={config?.enabled ? "Habilitado" : "Deshabilitado"} size="small" color={config?.enabled ? "primary" : "default"} />
				</Stack>
			</Box>

			{/* Info alert */}
			<Alert severity="info" variant="outlined" sx={{ py: 1 }}>
				<Typography variant="body2">
					Este worker procesa documentos verificados que no tienen movimientos guardados, recuperandolos mediante scraping.
				</Typography>
			</Alert>

			{/* Layout con tabs */}
			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: { md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
						minWidth: { md: 180 },
						"& .MuiTab-root": { alignItems: "flex-start", textAlign: "left", minHeight: 56, px: 2 },
					}}
				>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Setting2 size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Configuracion
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Estado y ajustes
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Chart size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Estadisticas
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Metricas y fallos
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<DocumentText size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Logs
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Actividad reciente
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Timer size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Pendientes
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Cola de proceso
									</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
				</Tabs>

				<TabPanel value={activeTab} index={0}>
					<ConfigContent />
				</TabPanel>
				<TabPanel value={activeTab} index={1}>
					<StatsContent />
				</TabPanel>
				<TabPanel value={activeTab} index={2}>
					<LogsContent />
				</TabPanel>
				<TabPanel value={activeTab} index={3}>
					<PendingContent />
				</TabPanel>
			</Box>
		</Stack>
	);
};

export default StuckDocumentsWorker;
