import React, { useState, useEffect } from "react";
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
	Paper,
	Skeleton,
	Chip,
	LinearProgress,
	Collapse,
	Divider,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	CircularProgress,
} from "@mui/material";
import {
	Edit2,
	TickCircle,
	CloseCircle,
	Refresh,
	InfoCircle,
	ArrowDown2,
	ArrowUp2,
	Timer1,
	Sms,
	TickSquare,
	CloseSquare,
	Danger,
	Clock,
} from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { WorkersService, EmailVerificationConfig } from "api/workers";

const EmailVerificationWorker = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<EmailVerificationConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [editValues, setEditValues] = useState<Partial<EmailVerificationConfig>>({});
	const [guideExpanded, setGuideExpanded] = useState(false);
	const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string }>({ open: false, action: "" });
	const [refreshingCredits, setRefreshingCredits] = useState(false);

	// Cargar configuración
	const fetchConfig = async () => {
		try {
			setLoading(true);
			const response = await WorkersService.getEmailVerificationConfig();
			if (response.success && response.data) {
				setConfig(response.data);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar la configuración de verificación de emails", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	// Obtener el ID real del documento
	const getConfigId = (config: EmailVerificationConfig): string => {
		if (typeof config._id === "string") {
			return config._id;
		}
		return config._id.$oid;
	};

	// Formatear fecha
	const formatDate = (date: any): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleString("es-AR");
	};

	// Calcular progreso diario
	const calculateDailyProgress = (): number => {
		if (!config || !config.dailyLimit) return 0;
		return (config.todayVerified / config.dailyLimit) * 100;
	};

	// Calcular tasa de éxito
	const calculateSuccessRate = (): number => {
		if (!config) return 0;
		const total = config.totalVerified + config.totalFailed;
		if (total === 0) return 0;
		return (config.totalVerified / total) * 100;
	};

	// Manejar edición
	const handleEdit = () => {
		if (!config) return;
		setEditing(true);
		setEditValues({
			enabled: config.enabled,
			dailyLimit: config.dailyLimit,
			batchSize: config.batchSize,
			schedule: config.schedule,
			dailyJobsLimit: config.dailyJobsLimit,
			retryAttempts: config.retryAttempts,
			retryDelay: config.retryDelay,
			neverBouncePollingInterval: config.neverBouncePollingInterval,
			neverBounceMaxPollingAttempts: config.neverBounceMaxPollingAttempts,
		});
	};

	const handleCancelEdit = () => {
		setEditing(false);
		setEditValues({});
	};

	const handleSave = async () => {
		if (!config) return;
		const id = getConfigId(config);

		try {
			const response = await WorkersService.updateEmailVerificationConfig(id, editValues);
			if (response.success) {
				enqueueSnackbar("Configuración actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfig();
				handleCancelEdit();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar la configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleToggleEnabled = async () => {
		if (!config) return;
		const id = getConfigId(config);

		try {
			const response = await WorkersService.updateEmailVerificationConfig(id, {
				enabled: !config.enabled,
			});
			if (response.success) {
				enqueueSnackbar(`Worker ${!config.enabled ? "activado" : "desactivado"}`, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfig();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar el estado", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleResetDailyCounters = async () => {
		if (!config) return;
		const id = getConfigId(config);

		try {
			const response = await WorkersService.resetEmailVerificationDailyCounters(id);
			if (response.success) {
				enqueueSnackbar("Contadores diarios reseteados", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfig();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al resetear contadores", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
		setConfirmDialog({ open: false, action: "" });
	};

	const handleClearProcessing = async () => {
		if (!config) return;
		const id = getConfigId(config);

		try {
			const response = await WorkersService.clearEmailVerificationProcessing(id);
			if (response.success) {
				enqueueSnackbar("Estado de procesamiento limpiado", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfig();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al limpiar estado de procesamiento", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
		setConfirmDialog({ open: false, action: "" });
	};

	const handleRefreshCredits = async () => {
		if (!config) return;
		const id = getConfigId(config);

		try {
			setRefreshingCredits(true);
			const response = await WorkersService.refreshEmailVerificationCredits(id);
			if (response.success) {
				enqueueSnackbar("Créditos actualizados desde NeverBounce", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfig();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar créditos", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setRefreshingCredits(false);
		}
	};

	if (loading) {
		return (
			<MainCard title="Worker de Verificación de Emails">
				<Grid container spacing={3}>
					{[1, 2, 3, 4].map((item) => (
						<Grid item xs={12} key={item}>
							<Skeleton variant="rectangular" height={100} />
						</Grid>
					))}
				</Grid>
			</MainCard>
		);
	}

	if (!config) {
		return (
			<MainCard title="Worker de Verificación de Emails">
				<Alert severity="warning">
					No se encontró configuración para el worker de verificación de emails. Asegurate de que el documento de configuración
					exista en la base de datos.
				</Alert>
			</MainCard>
		);
	}

	const dailyProgress = calculateDailyProgress();
	const successRate = calculateSuccessRate();

	return (
		<MainCard
			title="Worker de Verificación de Emails (NeverBounce)"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
						Actualizar
					</Button>
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Información del worker */}
				<Alert severity="info" variant="outlined">
					<Typography variant="subtitle2" fontWeight="bold">
						Worker de Verificación de Emails con NeverBounce
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						Este worker verifica la validez de direcciones de email utilizando la API de NeverBounce. Procesa emails de la
						colección EmailContact y actualiza su estado según los resultados de verificación.
					</Typography>
				</Alert>

				{/* Guía de Funcionamiento */}
				<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
					<CardContent sx={{ pb: guideExpanded ? 2 : 1 }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: guideExpanded ? 2 : 0 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<InfoCircle size={20} color="#1890ff" />
								<Typography variant="h6">Guía de Funcionamiento</Typography>
							</Stack>
							<Button
								size="small"
								onClick={() => setGuideExpanded(!guideExpanded)}
								endIcon={guideExpanded ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
							>
								{guideExpanded ? "Ocultar" : "Ver guía"}
							</Button>
						</Stack>

						<Collapse in={guideExpanded} timeout="auto" unmountOnExit>
							<Box sx={{ mt: 2 }}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Resultados de Verificación
								</Typography>
								<Grid container spacing={2} sx={{ pl: 2 }}>
									<Grid item xs={12} sm={6}>
										<Typography variant="body2">
											<strong>valid:</strong> Email válido, mantiene status active
										</Typography>
										<Typography variant="body2">
											<strong>invalid:</strong> Email inválido, cambia a status bounced
										</Typography>
										<Typography variant="body2">
											<strong>disposable:</strong> Email desechable, cambia a status bounced
										</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="body2">
											<strong>catchall:</strong> Servidor acepta todo, mantiene status active
										</Typography>
										<Typography variant="body2">
											<strong>unknown:</strong> No se pudo determinar, mantiene status active
										</Typography>
									</Grid>
								</Grid>
							</Box>

							<Box sx={{ mt: 3 }}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Límites de NeverBounce API
								</Typography>
								<Box sx={{ pl: 2 }}>
									<Typography variant="body2">- Máximo 10 jobs concurrentes por cuenta</Typography>
									<Typography variant="body2">- Máximo 50 jobs por día recomendado</Typography>
									<Typography variant="body2">- No crear más de 10 jobs por cada 100k items por hora</Typography>
								</Box>
							</Box>

							<Box sx={{ mt: 3 }}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Configuración del Schedule (Cron)
								</Typography>
								<Box sx={{ pl: 2 }}>
									<Typography variant="body2">Formato: minuto hora día-del-mes mes día-de-semana</Typography>
									<Typography variant="body2">Ejemplo "0 9 * * *": Ejecutar todos los días a las 9:00 AM</Typography>
									<Typography variant="body2">Ejemplo "0 8,14 * * *": Ejecutar a las 8:00 AM y 2:00 PM</Typography>
								</Box>
							</Box>
						</Collapse>
					</CardContent>
				</Card>

				{/* Estado del Worker */}
				<Grid container spacing={2}>
					<Grid item xs={12} md={6}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="h6">Estado del Worker</Typography>
									<Switch
										checked={editing ? editValues.enabled : config.enabled}
										onChange={() => {
											if (editing) {
												setEditValues({ ...editValues, enabled: !editValues.enabled });
											} else {
												handleToggleEnabled();
											}
										}}
										color="primary"
									/>
								</Stack>
								<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
									<Chip
										label={config.enabled ? "Activo" : "Inactivo"}
										color={config.enabled ? "success" : "default"}
										size="small"
									/>
									{config.processing?.isRunning && (
										<Chip label="Procesando..." color="warning" size="small" icon={<Timer1 size={14} />} />
									)}
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} md={6}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="h6">Créditos NeverBounce</Typography>
									<Tooltip title="Actualizar créditos desde NeverBounce">
										<IconButton
											size="small"
											onClick={handleRefreshCredits}
											disabled={refreshingCredits}
											color="primary"
										>
											{refreshingCredits ? <CircularProgress size={18} /> : <Refresh size={18} />}
										</IconButton>
									</Tooltip>
								</Stack>
								<Typography variant="h3" color="primary.main" sx={{ mt: 1 }}>
									{config.neverBounceCredits?.toLocaleString() || "N/A"}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Progreso Diario */}
				<Card variant="outlined">
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Progreso Diario
						</Typography>
						<Grid container spacing={3}>
							<Grid item xs={12} md={6}>
								<Stack spacing={1}>
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="text.secondary">
											Verificados Hoy
										</Typography>
										<Typography variant="body2" fontWeight={500}>
											{config.todayVerified} / {config.dailyLimit}
										</Typography>
									</Stack>
									<LinearProgress
										variant="determinate"
										value={Math.min(dailyProgress, 100)}
										color={dailyProgress >= 100 ? "error" : dailyProgress >= 75 ? "warning" : "primary"}
										sx={{ height: 10, borderRadius: 5 }}
									/>
								</Stack>
							</Grid>
							<Grid item xs={12} md={6}>
								<Stack spacing={1}>
									<Stack direction="row" justifyContent="space-between">
										<Typography variant="body2" color="text.secondary">
											Jobs Hoy
										</Typography>
										<Typography variant="body2" fontWeight={500}>
											{config.todayJobs} / {config.dailyJobsLimit}
										</Typography>
									</Stack>
									<LinearProgress
										variant="determinate"
										value={Math.min((config.todayJobs / config.dailyJobsLimit) * 100, 100)}
										color={
											config.todayJobs >= config.dailyJobsLimit
												? "error"
												: config.todayJobs >= config.dailyJobsLimit * 0.75
													? "warning"
													: "secondary"
										}
										sx={{ height: 10, borderRadius: 5 }}
									/>
								</Stack>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Estadísticas de Resultados */}
				<Card variant="outlined">
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Estadísticas de Resultados
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<TickSquare size={24} color="#52c41a" />
									<Typography variant="h4" color="success.main">
										{config.stats?.valid?.toLocaleString() || 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Válidos
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<CloseSquare size={24} color="#ff4d4f" />
									<Typography variant="h4" color="error.main">
										{config.stats?.invalid?.toLocaleString() || 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Inválidos
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Danger size={24} color="#faad14" />
									<Typography variant="h4" color="warning.main">
										{config.stats?.disposable?.toLocaleString() || 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Desechables
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Sms size={24} color="#1890ff" />
									<Typography variant="h4" color="info.main">
										{config.stats?.catchall?.toLocaleString() || 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Catchall
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<InfoCircle size={24} color="#8c8c8c" />
									<Typography variant="h4" color="text.secondary">
										{config.stats?.unknown?.toLocaleString() || 0}
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Desconocidos
									</Typography>
								</Paper>
							</Grid>
							<Grid item xs={6} sm={4} md={2}>
								<Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
									<Typography variant="body2" color="text.secondary" gutterBottom>
										Tasa de Éxito
									</Typography>
									<Typography variant="h4" color={successRate >= 80 ? "success.main" : successRate >= 50 ? "warning.main" : "error.main"}>
										{successRate.toFixed(1)}%
									</Typography>
								</Paper>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Configuración */}
				<Card variant="outlined">
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Typography variant="h6">Configuración</Typography>
							{!editing ? (
								<Button variant="outlined" size="small" startIcon={<Edit2 size={16} />} onClick={handleEdit}>
									Editar
								</Button>
							) : (
								<Stack direction="row" spacing={1}>
									<Button variant="contained" size="small" startIcon={<TickCircle size={16} />} onClick={handleSave}>
										Guardar
									</Button>
									<Button variant="outlined" size="small" color="error" startIcon={<CloseCircle size={16} />} onClick={handleCancelEdit}>
										Cancelar
									</Button>
								</Stack>
							)}
						</Stack>

						<Grid container spacing={3}>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Límite Diario de Emails"
									type="number"
									value={editing ? editValues.dailyLimit : config.dailyLimit}
									onChange={(e) => setEditValues({ ...editValues, dailyLimit: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Máximo de emails a verificar por día"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Tamaño de Lote"
									type="number"
									value={editing ? editValues.batchSize : config.batchSize}
									onChange={(e) => setEditValues({ ...editValues, batchSize: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Emails por lote de verificación"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Límite Diario de Jobs"
									type="number"
									value={editing ? editValues.dailyJobsLimit : config.dailyJobsLimit}
									onChange={(e) => setEditValues({ ...editValues, dailyJobsLimit: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Máximo de jobs por día"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Schedule (Cron)"
									value={editing ? editValues.schedule : config.schedule}
									onChange={(e) => setEditValues({ ...editValues, schedule: e.target.value })}
									disabled={!editing}
									size="small"
									helperText="Expresión cron para programación"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Reintentos"
									type="number"
									value={editing ? editValues.retryAttempts : config.retryAttempts}
									onChange={(e) => setEditValues({ ...editValues, retryAttempts: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Intentos por email"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Delay entre Reintentos (ms)"
									type="number"
									value={editing ? editValues.retryDelay : config.retryDelay}
									onChange={(e) => setEditValues({ ...editValues, retryDelay: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Milisegundos entre reintentos"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Intervalo de Polling (ms)"
									type="number"
									value={editing ? editValues.neverBouncePollingInterval : config.neverBouncePollingInterval}
									onChange={(e) => setEditValues({ ...editValues, neverBouncePollingInterval: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Intervalo para verificar estado de jobs"
								/>
							</Grid>
							<Grid item xs={12} sm={6} md={4}>
								<TextField
									fullWidth
									label="Máx. Intentos de Polling"
									type="number"
									value={editing ? editValues.neverBounceMaxPollingAttempts : config.neverBounceMaxPollingAttempts}
									onChange={(e) => setEditValues({ ...editValues, neverBounceMaxPollingAttempts: Number(e.target.value) })}
									disabled={!editing}
									size="small"
									helperText="Máximo intentos de polling"
								/>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Información de Tiempo */}
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center">
									<Clock size={20} />
									<Typography variant="body2" color="text.secondary">
										Última Ejecución
									</Typography>
								</Stack>
								<Typography variant="body1" fontWeight={500} sx={{ mt: 1 }}>
									{formatDate(config.lastRun)}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center">
									<TickCircle size={20} color="#52c41a" />
									<Typography variant="body2" color="text.secondary">
										Total Verificados
									</Typography>
								</Stack>
								<Typography variant="h5" color="success.main" sx={{ mt: 1 }}>
									{config.totalVerified?.toLocaleString() || 0}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center">
									<CloseCircle size={20} color="#ff4d4f" />
									<Typography variant="body2" color="text.secondary">
										Total Fallidos
									</Typography>
								</Stack>
								<Typography variant="h5" color="error.main" sx={{ mt: 1 }}>
									{config.totalFailed?.toLocaleString() || 0}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card variant="outlined">
							<CardContent>
								<Stack direction="row" spacing={1} alignItems="center">
									<InfoCircle size={20} />
									<Typography variant="body2" color="text.secondary">
										Última Actualización
									</Typography>
								</Stack>
								<Typography variant="body1" fontWeight={500} sx={{ mt: 1 }}>
									{formatDate(config.updatedAt)}
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Acciones de Mantenimiento */}
				<Card variant="outlined">
					<CardContent>
						<Typography variant="h6" gutterBottom>
							Acciones de Mantenimiento
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<Button
								variant="outlined"
								color="warning"
								onClick={() => setConfirmDialog({ open: true, action: "reset" })}
								startIcon={<Refresh size={16} />}
							>
								Resetear Contadores Diarios
							</Button>
							<Button
								variant="outlined"
								color="error"
								onClick={() => setConfirmDialog({ open: true, action: "clear" })}
								startIcon={<CloseCircle size={16} />}
								disabled={!config.processing?.isRunning}
							>
								Limpiar Estado de Procesamiento
							</Button>
						</Stack>
					</CardContent>
				</Card>

				{/* Dialog de Confirmación */}
				<Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: "" })}>
					<DialogTitle>Confirmar Acción</DialogTitle>
					<DialogContent>
						<Typography>
							{confirmDialog.action === "reset"
								? "¿Estás seguro de que querés resetear los contadores diarios? Esto pondrá en 0 los contadores de emails y jobs verificados hoy."
								: "¿Estás seguro de que querés limpiar el estado de procesamiento? Esto marcará el worker como no-procesando."}
						</Typography>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setConfirmDialog({ open: false, action: "" })}>Cancelar</Button>
						<Button
							variant="contained"
							color={confirmDialog.action === "reset" ? "warning" : "error"}
							onClick={confirmDialog.action === "reset" ? handleResetDailyCounters : handleClearProcessing}
						>
							Confirmar
						</Button>
					</DialogActions>
				</Dialog>
			</Stack>
		</MainCard>
	);
};

export default EmailVerificationWorker;
