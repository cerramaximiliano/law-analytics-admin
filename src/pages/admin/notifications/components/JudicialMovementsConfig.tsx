import React, { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	TextField,
	Switch,
	FormControlLabel,
	Button,
	Alert,
	Chip,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	CircularProgress,
	IconButton,
	Collapse,
	Stack,
	SelectChangeEvent,
	Autocomplete,
} from "@mui/material";
import {
	Setting2,
	Clock,
	NotificationBing,
	Filter,
	Link21,
	ChartSquare,
	ArrowDown2,
	ArrowUp2,
	Save2,
	RefreshCircle,
	Archive,
} from "iconsax-react";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";
import judicialNotificationConfigService from "services/judicialNotificationConfigService";

interface JudicialNotificationConfig {
	_id?: string;
	configKey: string;
	notificationSchedule: {
		dailyNotificationHour: number;
		dailyNotificationMinute: number;
		timezone: string;
		activeDays: number[];
	};
	limits: {
		maxMovementsPerBatch: number;
		maxNotificationsPerUserPerDay: number;
		minHoursBetweenSameExpediente: number;
	};
	retryConfig: {
		maxRetries: number;
		initialRetryDelay: number;
		backoffMultiplier: number;
		webhookTimeout: number;
	};
	contentConfig: {
		includeFullCaratula: boolean;
		maxDetalleLength: number;
		includeExpedienteLink: boolean;
		groupMovementsByExpediente: boolean;
	};
	filters: {
		excludedMovementTypes: string[];
		excludedKeywords: string[];
		includedMovementTypes: string[];
	};
	dataRetention: {
		judicialMovementRetentionDays: number;
		notificationLogRetentionDays: number;
		alertRetentionDays: number;
		autoCleanupEnabled: boolean;
		cleanupHour: number;
	};
	endpoints: {
		notificationServiceUrl: string;
		judicialMovementsEndpoint: string;
		fallbackServiceUrl: string | null;
	};
	status: {
		enabled: boolean;
		mode: string;
		maintenanceMessage: string;
	};
	stats?: {
		lastNotificationSentAt: string | null;
		totalNotificationsSent: number;
		totalMovementsProcessed: number;
		lastError?: {
			message: string;
			timestamp: string;
			count: number;
		} | null;
	};
	metadata?: {
		createdBy: string;
		lastModifiedBy: string;
		version: string;
		notes: string;
	};
	createdAt?: string;
	updatedAt?: string;
}

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const JudicialMovementsConfig: React.FC = () => {
	const [config, setConfig] = useState<JudicialNotificationConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		schedule: true,
		limits: false,
		retry: false,
		content: false,
		filters: false,
		dataRetention: false,
		endpoints: false,
		status: true,
	});
	const [hasChanges, setHasChanges] = useState(false);
	const [originalConfig, setOriginalConfig] = useState<JudicialNotificationConfig | null>(null);

	useEffect(() => {
		loadConfig();
	}, []);

	const loadConfig = async () => {
		setLoading(true);
		try {
			const data = await judicialNotificationConfigService.getConfig();
			setConfig(data);
			setOriginalConfig(data);
			setHasChanges(false);
		} catch (error: any) {
			console.error("Error loading configuration:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: error.message || "Error al cargar la configuración",
					variant: "alert",
					alert: {
						color: "error",
					},
					close: true,
				}),
			);
		} finally {
			setLoading(false);
		}
	};

	const handleToggleSection = (section: string) => {
		setExpandedSections((prev) => ({
			...prev,
			[section]: !prev[section],
		}));
	};

	const handleFieldChange = (path: string, value: any) => {
		if (!config) return;

		// Deep clone the config to ensure React detects changes
		const newConfig = JSON.parse(JSON.stringify(config));
		const keys = path.split(".");
		let current: any = newConfig;

		for (let i = 0; i < keys.length - 1; i++) {
			if (!current[keys[i]]) {
				current[keys[i]] = {};
			}
			current = current[keys[i]];
		}

		current[keys[keys.length - 1]] = value;
		setConfig(newConfig);
		setHasChanges(true);
	};

	const handleSave = async () => {
		if (!config || !hasChanges) {
			return;
		}

		setSaving(true);
		try {
			const updates: any = {};

			// Compare main sections and only include changed ones
			const sections = [
				"notificationSchedule",
				"limits",
				"retryConfig",
				"contentConfig",
				"filters",
				"dataRetention",
				"endpoints",
				"status",
			];

			for (const section of sections) {
				if (config[section as keyof typeof config] && originalConfig) {
					const currentSection = config[section as keyof typeof config];
					const originalSection = originalConfig[section as keyof typeof originalConfig];

					// Compare sections
					if (JSON.stringify(currentSection) !== JSON.stringify(originalSection)) {
						updates[section] = currentSection;
					}
				}
			}

			// If no changes were detected, return
			if (Object.keys(updates).length === 0) {
				setHasChanges(false);
				return;
			}

			const updatedConfig = await judicialNotificationConfigService.updateConfig(updates);

			setOriginalConfig(updatedConfig);
			setConfig(updatedConfig);
			setHasChanges(false);

			// Create specific success messages based on what was updated
			let successMessage = "Configuración actualizada exitosamente";
			if (updates.notificationSchedule) {
				const hour = updatedConfig.notificationSchedule.dailyNotificationHour;
				const minute = updatedConfig.notificationSchedule.dailyNotificationMinute;
				successMessage = `Horario actualizado: ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
			} else if (updates.limits) {
				successMessage = "Límites de notificaciones actualizados correctamente";
			} else if (updates.filters) {
				successMessage = "Filtros de notificaciones actualizados correctamente";
			} else if (updates.contentConfig) {
				successMessage = "Configuración de contenido actualizada correctamente";
			} else if (updates.endpoints) {
				successMessage = "URLs y endpoints actualizados correctamente";
			} else if (updates.retryConfig) {
				successMessage = "Configuración de reintentos actualizada correctamente";
			}

			// Dispatch the snackbar notification
			dispatch(
				openSnackbar({
					open: true,
					message: successMessage,
					variant: "alert",
					alert: {
						color: "success",
					},
					close: true,
				}),
			);
		} catch (error: any) {
			console.error("Error saving configuration:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: error.message || "Error al guardar la configuración",
					variant: "alert",
					alert: {
						color: "error",
					},
					close: true,
				}),
			);
		} finally {
			setSaving(false);
		}
	};

	const handleToggleNotifications = async () => {
		try {
			const result = await judicialNotificationConfigService.toggleNotifications();
			setConfig((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					status: {
						...prev.status,
						enabled: result.enabled,
					},
				};
			});

			dispatch(
				openSnackbar({
					open: true,
					message: result.enabled
						? "Notificaciones de movimientos judiciales habilitadas correctamente"
						: "Notificaciones de movimientos judiciales deshabilitadas",
					variant: "alert",
					alert: {
						color: result.enabled ? "success" : "warning",
					},
					close: true,
				}),
			);
		} catch (error: any) {
			console.error("Error toggling notifications:", error);
			dispatch(
				openSnackbar({
					open: true,
					message: error.message || "Error al cambiar el estado de las notificaciones",
					variant: "alert",
					alert: {
						color: "error",
					},
					close: true,
				}),
			);
		}
	};

	const handleReset = () => {
		setConfig(originalConfig);
		setHasChanges(false);
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
				<CircularProgress />
			</Box>
		);
	}

	if (!config) {
		return (
			<Alert severity="error">
				<Typography>Error al cargar la configuración</Typography>
			</Alert>
		);
	}

	return (
		<Box>
			{/* Header with main status */}
			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={6}>
							<Stack direction="row" spacing={2} alignItems="center">
								<NotificationBing size={32} color="#1890ff" />
								<Box>
									<Typography variant="h5">Configuración de Notificaciones de Movimientos Judiciales</Typography>
									<Typography variant="body2" color="text.secondary">
										Gestiona cómo y cuándo se envían las notificaciones de movimientos
									</Typography>
								</Box>
							</Stack>
						</Grid>
						<Grid item xs={12} md={6}>
							<Stack direction="row" spacing={2} justifyContent="flex-end">
								<FormControlLabel
									control={
										<Switch checked={config.status.enabled} onChange={() => handleToggleNotifications()} color="primary" size="medium" />
									}
									label={
										<Stack direction="row" spacing={1} alignItems="center">
											<Typography variant="body1" fontWeight="medium">
												{config.status.enabled ? "Habilitado" : "Deshabilitado"}
											</Typography>
											<Chip label={config.status.mode} size="small" color={config.status.mode === "production" ? "success" : "warning"} />
										</Stack>
									}
								/>
							</Stack>
						</Grid>
					</Grid>

					{/* Statistics */}
					{config.stats && (
						<Box sx={{ mt: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Última notificación
									</Typography>
									<Typography variant="body2">
										{config.stats.lastNotificationSentAt ? new Date(config.stats.lastNotificationSentAt).toLocaleString("es-AR") : "Nunca"}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Total notificaciones enviadas
									</Typography>
									<Typography variant="body2">{config.stats.totalNotificationsSent.toLocaleString()}</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Total movimientos procesados
									</Typography>
									<Typography variant="body2">{config.stats.totalMovementsProcessed.toLocaleString()}</Typography>
								</Grid>
							</Grid>
							{config.stats.lastError && (
								<Alert severity="error" sx={{ mt: 2 }}>
									<Typography variant="body2">
										<strong>Último error ({config.stats.lastError.count} veces):</strong> {config.stats.lastError.message}
									</Typography>
									<Typography variant="caption">{new Date(config.stats.lastError.timestamp).toLocaleString("es-AR")}</Typography>
								</Alert>
							)}
						</Box>
					)}
				</CardContent>
			</Card>

			{/* Schedule Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Clock size={20} />
							<Typography variant="h6">Programación de Horarios</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("schedule")}>
							{expandedSections.schedule ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.schedule}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={4}>
								<Stack direction="row" spacing={2}>
									<TextField
										label="Hora"
										type="number"
										value={config.notificationSchedule.dailyNotificationHour}
										onChange={(e) => handleFieldChange("notificationSchedule.dailyNotificationHour", parseInt(e.target.value))}
										inputProps={{ min: 0, max: 23 }}
										fullWidth
									/>
									<TextField
										label="Minutos"
										type="number"
										value={config.notificationSchedule.dailyNotificationMinute}
										onChange={(e) => handleFieldChange("notificationSchedule.dailyNotificationMinute", parseInt(e.target.value))}
										inputProps={{ min: 0, max: 59 }}
										fullWidth
									/>
								</Stack>
							</Grid>
							<Grid item xs={12} md={4}>
								<FormControl fullWidth>
									<InputLabel>Zona Horaria</InputLabel>
									<Select
										value={config.notificationSchedule.timezone}
										onChange={(e: SelectChangeEvent) => handleFieldChange("notificationSchedule.timezone", e.target.value)}
										label="Zona Horaria"
									>
										<MenuItem value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} md={4}>
								<FormControl fullWidth>
									<InputLabel>Días Activos</InputLabel>
									<Select
										multiple
										value={config.notificationSchedule.activeDays}
										onChange={(e: SelectChangeEvent<number[]>) => handleFieldChange("notificationSchedule.activeDays", e.target.value)}
										renderValue={(selected) => (
											<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
												{(selected as number[]).map((value) => (
													<Chip key={value} label={dayNames[value]} size="small" />
												))}
											</Box>
										)}
									>
										{dayNames.map((day, index) => (
											<MenuItem key={index} value={index}>
												{day}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Limits Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<ChartSquare size={20} />
							<Typography variant="h6">Límites y Restricciones</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("limits")}>
							{expandedSections.limits ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.limits}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={4}>
								<TextField
									label="Máx. movimientos por lote"
									type="number"
									value={config.limits.maxMovementsPerBatch}
									onChange={(e) => handleFieldChange("limits.maxMovementsPerBatch", parseInt(e.target.value))}
									inputProps={{ min: 1, max: 1000 }}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="Máx. notificaciones por usuario/día"
									type="number"
									value={config.limits.maxNotificationsPerUserPerDay}
									onChange={(e) => handleFieldChange("limits.maxNotificationsPerUserPerDay", parseInt(e.target.value))}
									inputProps={{ min: 1, max: 200 }}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="Horas mínimas entre mismo expediente"
									type="number"
									value={config.limits.minHoursBetweenSameExpediente}
									onChange={(e) => handleFieldChange("limits.minHoursBetweenSameExpediente", parseInt(e.target.value))}
									inputProps={{ min: 1, max: 168 }}
									fullWidth
								/>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Retry Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<RefreshCircle size={20} />
							<Typography variant="h6">Configuración de Reintentos</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("retry")}>
							{expandedSections.retry ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.retry}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={3}>
								<TextField
									label="Máx. reintentos"
									type="number"
									value={config.retryConfig.maxRetries}
									onChange={(e) => handleFieldChange("retryConfig.maxRetries", parseInt(e.target.value))}
									inputProps={{ min: 1, max: 10 }}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Delay inicial (ms)"
									type="number"
									value={config.retryConfig.initialRetryDelay}
									onChange={(e) => handleFieldChange("retryConfig.initialRetryDelay", parseInt(e.target.value))}
									inputProps={{ min: 100, max: 60000 }}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Multiplicador backoff"
									type="number"
									value={config.retryConfig.backoffMultiplier}
									onChange={(e) => handleFieldChange("retryConfig.backoffMultiplier", parseFloat(e.target.value))}
									inputProps={{ min: 1, max: 5, step: 0.5 }}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Timeout webhook (ms)"
									type="number"
									value={config.retryConfig.webhookTimeout}
									onChange={(e) => handleFieldChange("retryConfig.webhookTimeout", parseInt(e.target.value))}
									inputProps={{ min: 5000, max: 120000 }}
									fullWidth
								/>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Content Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Setting2 size={20} />
							<Typography variant="h6">Configuración de Contenido</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("content")}>
							{expandedSections.content ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.content}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={6}>
								<FormControlLabel
									control={
										<Switch
											checked={config.contentConfig.includeFullCaratula}
											onChange={(e) => handleFieldChange("contentConfig.includeFullCaratula", e.target.checked)}
										/>
									}
									label="Incluir carátula completa"
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<FormControlLabel
									control={
										<Switch
											checked={config.contentConfig.includeExpedienteLink}
											onChange={(e) => handleFieldChange("contentConfig.includeExpedienteLink", e.target.checked)}
										/>
									}
									label="Incluir link al expediente"
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<FormControlLabel
									control={
										<Switch
											checked={config.contentConfig.groupMovementsByExpediente}
											onChange={(e) => handleFieldChange("contentConfig.groupMovementsByExpediente", e.target.checked)}
										/>
									}
									label="Agrupar movimientos por expediente"
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									label="Máx. caracteres en detalle"
									type="number"
									value={config.contentConfig.maxDetalleLength}
									onChange={(e) => handleFieldChange("contentConfig.maxDetalleLength", parseInt(e.target.value))}
									inputProps={{ min: 50, max: 2000 }}
									fullWidth
								/>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Filters Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Filter size={20} />
							<Typography variant="h6">Filtros</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("filters")}>
							{expandedSections.filters ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.filters}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={4}>
								<Autocomplete
									multiple
									freeSolo
									options={[]}
									value={config.filters.excludedMovementTypes}
									onChange={(_event, newValue) => handleFieldChange("filters.excludedMovementTypes", newValue)}
									renderTags={(value: string[], getTagProps) =>
										value.map((option: string, index: number) => <Chip variant="outlined" label={option} {...getTagProps({ index })} />)
									}
									renderInput={(params) => <TextField {...params} label="Tipos de movimiento excluidos" placeholder="Agregar tipo" />}
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<Autocomplete
									multiple
									freeSolo
									options={[]}
									value={config.filters.excludedKeywords}
									onChange={(_event, newValue) => handleFieldChange("filters.excludedKeywords", newValue)}
									renderTags={(value: string[], getTagProps) =>
										value.map((option: string, index: number) => <Chip variant="outlined" label={option} {...getTagProps({ index })} />)
									}
									renderInput={(params) => <TextField {...params} label="Palabras clave excluidas" placeholder="Agregar palabra" />}
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<Autocomplete
									multiple
									freeSolo
									options={[]}
									value={config.filters.includedMovementTypes}
									onChange={(_event, newValue) => handleFieldChange("filters.includedMovementTypes", newValue)}
									renderTags={(value: string[], getTagProps) =>
										value.map((option: string, index: number) => <Chip variant="outlined" label={option} {...getTagProps({ index })} />)
									}
									renderInput={(params) => (
										<TextField {...params} label="Tipos de movimiento incluidos (solo estos)" placeholder="Agregar tipo" />
									)}
								/>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Data Retention Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Archive size={20} />
							<Typography variant="h6">Retención de Datos</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("dataRetention")}>
							{expandedSections.dataRetention ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.dataRetention}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={3}>
								<TextField
									label="Retención de movimientos (días)"
									type="number"
									value={config.dataRetention?.judicialMovementRetentionDays || 60}
									onChange={(e) => handleFieldChange("dataRetention.judicialMovementRetentionDays", Number(e.target.value))}
									fullWidth
									InputProps={{
										inputProps: { min: 7, max: 365 },
									}}
									helperText="Días para retener movimientos notificados (7-365)"
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Retención de logs (días)"
									type="number"
									value={config.dataRetention?.notificationLogRetentionDays || 30}
									onChange={(e) => handleFieldChange("dataRetention.notificationLogRetentionDays", Number(e.target.value))}
									fullWidth
									InputProps={{
										inputProps: { min: 7, max: 180 },
									}}
									helperText="Días para retener logs (7-180)"
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Retención de alertas (días)"
									type="number"
									value={config.dataRetention?.alertRetentionDays || 30}
									onChange={(e) => handleFieldChange("dataRetention.alertRetentionDays", Number(e.target.value))}
									fullWidth
									InputProps={{
										inputProps: { min: 7, max: 180 },
									}}
									helperText="Días para retener alertas (7-180)"
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									label="Hora de limpieza"
									type="number"
									value={config.dataRetention?.cleanupHour || 3}
									onChange={(e) => handleFieldChange("dataRetention.cleanupHour", Number(e.target.value))}
									fullWidth
									InputProps={{
										inputProps: { min: 0, max: 23 },
									}}
									helperText="Hora del día para ejecutar limpieza (0-23)"
								/>
							</Grid>
							<Grid item xs={12}>
								<FormControlLabel
									control={
										<Switch
											checked={config.dataRetention?.autoCleanupEnabled ?? true}
											onChange={(e) => handleFieldChange("dataRetention.autoCleanupEnabled", e.target.checked)}
										/>
									}
									label="Habilitar limpieza automática de datos antiguos"
								/>
							</Grid>
							<Grid item xs={12}>
								<Alert severity="info">
									<Typography variant="body2" paragraph>
										<strong>Política de Retención:</strong>
									</Typography>
									<Typography variant="body2" component="div">
										• Los movimientos con estado <strong>"enviado"</strong> se eliminarán después del período configurado.
										<br />• Los movimientos con estado <strong>"pendiente"</strong> o <strong>"fallido"</strong> se conservan
										indefinidamente.
										<br />
										• La limpieza se ejecuta diariamente a la hora configurada.
										<br />• Los cambios en la configuración de retención se aplicarán en la próxima ejecución de limpieza.
									</Typography>
								</Alert>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Endpoints Configuration */}
			<Card sx={{ mb: 2 }}>
				<CardContent>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Link21 size={20} />
							<Typography variant="h6">Endpoints y URLs</Typography>
						</Stack>
						<IconButton size="small" onClick={() => handleToggleSection("endpoints")}>
							{expandedSections.endpoints ? <ArrowUp2 /> : <ArrowDown2 />}
						</IconButton>
					</Stack>
					<Collapse in={expandedSections.endpoints}>
						<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
							<Grid item xs={12} md={4}>
								<TextField
									label="URL del servicio de notificaciones"
									value={config.endpoints.notificationServiceUrl}
									onChange={(e) => handleFieldChange("endpoints.notificationServiceUrl", e.target.value)}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="Endpoint de movimientos judiciales"
									value={config.endpoints.judicialMovementsEndpoint}
									onChange={(e) => handleFieldChange("endpoints.judicialMovementsEndpoint", e.target.value)}
									fullWidth
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									label="URL de servicio alternativo (fallback)"
									value={config.endpoints.fallbackServiceUrl || ""}
									onChange={(e) => handleFieldChange("endpoints.fallbackServiceUrl", e.target.value || null)}
									fullWidth
								/>
							</Grid>
						</Grid>
					</Collapse>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Typography variant="caption" color="text.secondary">
					{hasChanges ? "Hay cambios sin guardar" : "No hay cambios pendientes"}
				</Typography>
				<Box sx={{ display: "flex", gap: 2 }}>
					<Button variant="outlined" onClick={handleReset} disabled={!hasChanges || saving}>
						Descartar cambios
					</Button>
					<Button variant="contained" startIcon={<Save2 size={20} />} onClick={handleSave} disabled={!hasChanges || saving}>
						{saving ? <CircularProgress size={20} /> : "Guardar cambios"}
					</Button>
				</Box>
			</Box>
		</Box>
	);
};

export default JudicialMovementsConfig;
