import React, { useState, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
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
	Notification1,
	Save2,
	RefreshCircle,
	Archive,
} from "iconsax-react";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";
import judicialNotificationConfigService, { JudicialNotificationConfig, EMAIL_TYPES } from "api/judicialNotificationConfig";
import MovementPoliciesSection from "./MovementPoliciesSection";

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type ConfigSection = "general" | "judicial" | "postal" | "banners";

interface JudicialMovementsConfigProps {
	/** Qué grupo de cards mostrar. Sin valor, muestra todas (compatibilidad). */
	section?: ConfigSection;
}

const JudicialMovementsConfig: React.FC<JudicialMovementsConfigProps> = ({ section }) => {
	const show = (s: ConfigSection) => !section || section === s;
	const theme = useTheme();
	const [config, setConfig] = useState<JudicialNotificationConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		schedule: true,
		limits: false,
		retry: false,
		content: false,
		filters: false,
		policies: false,
		planBanner: false,
		featureBanner: false,
		googleCalendarBanner: false,
		optionsBanner: false,
		bannerPolicy: false,
		postal: false,
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

	/** Chips multi-select de tipos de email para un banner (path del config) */
	const renderEmailTypeChips = (path: string, current: string[] | undefined) => {
		const selected = Array.isArray(current) && current.length > 0 ? current : EMAIL_TYPES.map((e) => e.key);
		return (
			<Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
				{EMAIL_TYPES.map((et) => {
					const on = selected.includes(et.key);
					return (
						<Chip
							key={et.key}
							label={et.label}
							size="small"
							color={on ? "primary" : "default"}
							variant={on ? "filled" : "outlined"}
							onClick={() => handleFieldChange(path, on ? selected.filter((k) => k !== et.key) : [...selected, et.key])}
						/>
					);
				})}
			</Stack>
		);
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
				"planBanner",
				"featureBanner",
				"googleCalendarBanner",
				"notificationOptionsBanner",
				"bannerPolicy",
				"postalNotifications",
				"movementPolicies",
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
			} else if (updates.movementPolicies) {
				successMessage = "Políticas de movimientos actualizadas correctamente";
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
								<NotificationBing size={32} color={theme.palette.info.main} />
								<Box>
									<Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
										Configuración de notificaciones de movimientos judiciales
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Gestiona cómo y cuándo se envían las notificaciones de movimientos.
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

					{/* Toggles de los productores internos de la-notification */}
					<Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
						<FormControlLabel
							control={
								<Switch
									size="small"
									checked={config.status.coordinatorEnabled !== false}
									onChange={(e) => handleFieldChange("status.coordinatorEnabled", e.target.checked)}
								/>
							}
							label={
								<Typography variant="body2">
									Coordinador interno PJN{" "}
									<Typography component="span" variant="caption" color="text.secondary">
										(safety-net que escanea causas con movimientos del día)
									</Typography>
								</Typography>
							}
						/>
						<FormControlLabel
							control={
								<Switch
									size="small"
									checked={config.status.cedulasEnabled !== false}
									onChange={(e) => handleFieldChange("status.cedulasEnabled", e.target.checked)}
								/>
							}
							label={
								<Typography variant="body2">
									Cédulas (bandeja PJN){" "}
									<Typography component="span" variant="caption" color="text.secondary">
										(coordinación de notificaciones electrónicas)
									</Typography>
								</Typography>
							}
						/>
					</Stack>

					{/* Statistics */}
					{config.stats && (
						<Box
							sx={(theme) => ({
								mt: 3,
								p: 2,
								bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
								borderRadius: 1,
								border: `1px solid ${theme.palette.divider}`,
							})}
						>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Última notificación
									</Typography>
									<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
										{config.stats.lastNotificationSentAt ? new Date(config.stats.lastNotificationSentAt).toLocaleString("es-AR") : "Nunca"}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Total notificaciones enviadas
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
										{config.stats.totalNotificationsSent.toLocaleString()}
									</Typography>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Total movimientos procesados
									</Typography>
									<Typography variant="body2" sx={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
										{config.stats.totalMovementsProcessed.toLocaleString()}
									</Typography>
								</Grid>
							</Grid>
							{/* `updateStats` del modelo pone count=0 al primer envío exitoso pero
							    CONSERVA el objeto lastError (mensaje + fecha) como historial. Si
							    la alerta roja se muestra mirando solo si el objeto existe, un
							    error ya resuelto queda gritando para siempre: pasó con un 404 del
							    22/07 que se seguía viendo un mes después, en las 4 tabs que
							    comparten este config. count > 0 es lo que separa "está fallando"
							    de "falló alguna vez". */}
							{config.stats.lastError &&
								(config.stats.lastError.count > 0 ? (
									<Alert severity="error" sx={{ mt: 2 }}>
										<Typography variant="body2">
											<strong>Último error ({config.stats.lastError.count} veces):</strong> {config.stats.lastError.message}
										</Typography>
										<Typography variant="caption">{new Date(config.stats.lastError.timestamp).toLocaleString("es-AR")}</Typography>
									</Alert>
								) : (
									<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
										Sin errores desde el último envío exitoso. El anterior fue el{" "}
										{new Date(config.stats.lastError.timestamp).toLocaleString("es-AR")}: {config.stats.lastError.message}
									</Typography>
								))}
						</Box>
					)}
				</CardContent>
			</Card>

			{/* Schedule Configuration */}
			{show("general") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Clock size={20} />
								<Typography variant="h6">Programación de horarios</Typography>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("schedule")}>
								{expandedSections.schedule ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.schedule}>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={4}>
									<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
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
										<InputLabel>Zona horaria</InputLabel>
										<Select
											value={config.notificationSchedule.timezone}
											onChange={(e: SelectChangeEvent) => handleFieldChange("notificationSchedule.timezone", e.target.value)}
											label="Zona horaria"
										>
											<MenuItem value="America/Argentina/Buenos_Aires">America/Argentina/Buenos_Aires</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={12} md={4}>
									<FormControl fullWidth>
										<InputLabel>Días activos</InputLabel>
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
								<Grid item xs={12} md={6}>
									<TextField
										label="Horas de reporte al admin"
										value={(config.notificationSchedule.reportHours ?? []).join(", ")}
										onChange={(e) =>
											handleFieldChange(
												"notificationSchedule.reportHours",
												e.target.value
													.split(",")
													.map((h) => h.trim())
													.filter(Boolean),
											)
										}
										helperText="Formato H:mm separado por comas (ej. 15:00, 17:00, 19:30). Horas en que el cron judicial envía el reporte de monitoreo."
										fullWidth
									/>
								</Grid>
								<Grid item xs={12}>
									<Alert severity="info">
										La hora configurada define cuándo el coordinador programa la entrega (notifyAt) y los días activos se aplican también en
										la entrega central de la-notification — un movimiento capturado en día no activo queda diferido hasta el próximo día
										activo.
									</Alert>
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Limits Configuration */}
			{show("general") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<ChartSquare size={20} />
								<Typography variant="h6">Límites y restricciones</Typography>
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
								<Grid item xs={12}>
									<FormControlLabel
										control={
											<Switch
												checked={config.limits.requireFolderForDelivery === true}
												onChange={(e) => handleFieldChange("limits.requireFolderForDelivery", e.target.checked)}
											/>
										}
										label={
											<Typography variant="body2">
												Exigir carpeta del usuario para notificar{" "}
												<Typography component="span" variant="caption" color="text.secondary">
													— solo se notifica un movimiento si el usuario tiene esa causa en su cuenta. Cubre el fallback de los workers, que
													notifica a todos los vinculados cuando la causa no tiene preferencias por usuario.
												</Typography>
											</Typography>
										}
									/>
								</Grid>
								<Grid item xs={12}>
									<FormControlLabel
										control={
											<Switch
												checked={config.limits.enforcePerUserLimits === true}
												onChange={(e) => handleFieldChange("limits.enforcePerUserLimits", e.target.checked)}
											/>
										}
										label={
											<Typography variant="body2">
												Aplicar límites por usuario en la entrega{" "}
												<Typography component="span" variant="caption" color="text.secondary">
													— con esto apagado, los dos límites anteriores son solo declarativos. Al encenderlo, la-notification difiere lo
													que exceda el límite (queda pendiente, no se pierde).
												</Typography>
											</Typography>
										}
									/>
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Plan upgrade banner */}
			{show("banners") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<ChartSquare size={20} />
								<Typography variant="h6">Banner de upgrade de plan</Typography>
								<Chip
									size="small"
									label={config.planBanner?.enabled !== false ? "activo" : "apagado"}
									color={config.planBanner?.enabled !== false ? "success" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("planBanner")}>
								{expandedSections.planBanner ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.planBanner}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Bloque al final del email de movimientos para usuarios con carpetas archivadas: sugiere el plan más barato que cubra todas
								sus causas. El contenido lo genera la-notification (no se edita en el template) y si el slot del template se borra, se
								inyecta igual por fallback.
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.planBanner?.enabled !== false}
												onChange={(e) => handleFieldChange("planBanner.enabled", e.target.checked)}
											/>
										}
										label="Habilitado"
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Cooldown (días)"
										type="number"
										value={config.planBanner?.cooldownDays ?? 7}
										onChange={(e) => handleFieldChange("planBanner.cooldownDays", parseInt(e.target.value))}
										inputProps={{ min: 0, max: 90 }}
										helperText="Máx. 1 banner por usuario cada N días (0 = en cada email)"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Mín. carpetas archivadas"
										type="number"
										value={config.planBanner?.minArchivedFolders ?? 1}
										onChange={(e) => handleFieldChange("planBanner.minArchivedFolders", parseInt(e.target.value))}
										inputProps={{ min: 1, max: 1000 }}
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Excluir planes"
										value={(config.planBanner?.excludePlans ?? []).join(", ")}
										onChange={(e) =>
											handleFieldChange(
												"planBanner.excludePlans",
												e.target.value
													.split(",")
													.map((v) => v.trim())
													.filter(Boolean),
											)
										}
										helperText="planIds separados por coma (ej. pro)"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
										Tipos de email donde puede aparecer
									</Typography>
									{renderEmailTypeChips("planBanner.emailTypes", config.planBanner?.emailTypes)}
								</Grid>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.planBanner?.promo?.enabled === true}
												onChange={(e) => handleFieldChange("planBanner.promo.enabled", e.target.checked)}
											/>
										}
										label="Promoción activa"
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Código de promoción"
										value={config.planBanner?.promo?.code ?? ""}
										onChange={(e) => handleFieldChange("planBanner.promo.code", e.target.value.trim() || null)}
										helperText="Código de /admin/promotions (DiscountCode)"
										disabled={config.planBanner?.promo?.enabled !== true}
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={6}>
									<TextField
										label="Texto de la promoción"
										value={config.planBanner?.promo?.text ?? ""}
										onChange={(e) => handleFieldChange("planBanner.promo.text", e.target.value || null)}
										helperText='Ej. "20% de descuento los primeros 3 meses."'
										disabled={config.planBanner?.promo?.enabled !== true}
										fullWidth
									/>
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Feature banner */}
			{show("banners") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Notification1 size={20} />
								<Typography variant="h6">Banner de anuncios / features</Typography>
								<Chip
									size="small"
									label={config.featureBanner?.enabled === true ? "activo" : "apagado"}
									color={config.featureBanner?.enabled === true ? "success" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("featureBanner")}>
								{expandedSections.featureBanner ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.featureBanner}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Anuncio publicitario (features nuevos, promociones generales) que aparece al final de TODOS los emails de notificación
								(movimientos, calendario, tareas, vencimientos, caducidad/prescripción). Por default no se muestra si el email ya lleva el
								banner de upgrade de plan.
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.featureBanner?.enabled === true}
												onChange={(e) => handleFieldChange("featureBanner.enabled", e.target.checked)}
											/>
										}
										label="Habilitado"
									/>
								</Grid>
								<Grid item xs={12} md={4}>
									<TextField
										label="Título"
										value={config.featureBanner?.title ?? ""}
										onChange={(e) => handleFieldChange("featureBanner.title", e.target.value || null)}
										helperText="Requerido para que el banner aparezca"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={5}>
									<TextField
										label="Texto"
										value={config.featureBanner?.text ?? ""}
										onChange={(e) => handleFieldChange("featureBanner.text", e.target.value || null)}
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Etiqueta del CTA"
										value={config.featureBanner?.ctaLabel ?? ""}
										onChange={(e) => handleFieldChange("featureBanner.ctaLabel", e.target.value || null)}
										helperText='Default: "Conocer más"'
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={5}>
									<TextField
										label="URL del CTA"
										value={config.featureBanner?.ctaUrl ?? ""}
										onChange={(e) => handleFieldChange("featureBanner.ctaUrl", e.target.value || null)}
										helperText="Se le agrega ?source=email_<tipo>_feature para tracking"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={4}>
									<FormControlLabel
										control={
											<Switch
												checked={config.featureBanner?.showWithPlanBanner === true}
												onChange={(e) => handleFieldChange("featureBanner.showWithPlanBanner", e.target.checked)}
											/>
										}
										label={<Typography variant="body2">Mostrar junto al banner de plan</Typography>}
									/>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
										Tipos de email donde puede aparecer
									</Typography>
									{renderEmailTypeChips("featureBanner.emailTypes", config.featureBanner?.emailTypes)}
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Banner de Google Calendar */}
			{show("banners") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Notification1 size={20} />
								<Typography variant="h6">Banner de Google Calendar</Typography>
								<Chip
									size="small"
									label={config.googleCalendarBanner?.enabled !== false ? "activo" : "apagado"}
									color={config.googleCalendarBanner?.enabled !== false ? "success" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("googleCalendarBanner")}>
								{expandedSections.googleCalendarBanner ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.googleCalendarBanner}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Invitación a sincronizar Google Calendar, con el logo oficial de Calendar. Solo se muestra a usuarios que NO conectaron su
								cuenta de Google. Activo por default con textos del sistema; los campos vacíos usan esos defaults. Nunca se apila con el
								banner de plan ni con el de anuncios (salvo override).
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.googleCalendarBanner?.enabled !== false}
												onChange={(e) => handleFieldChange("googleCalendarBanner.enabled", e.target.checked)}
											/>
										}
										label="Habilitado"
									/>
								</Grid>
								<Grid item xs={12} md={4}>
									<TextField
										label="Título"
										value={config.googleCalendarBanner?.title ?? ""}
										onChange={(e) => handleFieldChange("googleCalendarBanner.title", e.target.value || null)}
										helperText='Default: "Conectá tu Google Calendar"'
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={5}>
									<TextField
										label="Texto"
										value={config.googleCalendarBanner?.text ?? ""}
										onChange={(e) => handleFieldChange("googleCalendarBanner.text", e.target.value || null)}
										helperText="Vacío = copy por defecto del sistema"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Etiqueta del CTA"
										value={config.googleCalendarBanner?.ctaLabel ?? ""}
										onChange={(e) => handleFieldChange("googleCalendarBanner.ctaLabel", e.target.value || null)}
										helperText='Default: "Conectar mi calendario"'
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={4}>
									<TextField
										label="URL del CTA"
										value={config.googleCalendarBanner?.ctaUrl ?? ""}
										onChange={(e) => handleFieldChange("googleCalendarBanner.ctaUrl", e.target.value || null)}
										helperText="Default: /apps/calendar — se agrega ?source=email_<tipo>_gcal"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={2}>
									<TextField
										label="Cooldown (días)"
										type="number"
										value={config.googleCalendarBanner?.cooldownDays ?? 14}
										onChange={(e) => handleFieldChange("googleCalendarBanner.cooldownDays", parseInt(e.target.value))}
										helperText="0 = en cada email"
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.googleCalendarBanner?.showWithOtherBanners === true}
												onChange={(e) => handleFieldChange("googleCalendarBanner.showWithOtherBanners", e.target.checked)}
											/>
										}
										label={<Typography variant="body2">Apilar con otros banners</Typography>}
									/>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
										Tipos de email donde puede aparecer
									</Typography>
									{renderEmailTypeChips("googleCalendarBanner.emailTypes", config.googleCalendarBanner?.emailTypes)}
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Aviso de opciones de notificación */}
			{show("banners") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Notification1 size={20} />
								<Typography variant="h6">Aviso de opciones de notificación</Typography>
								<Chip
									size="small"
									label={config.notificationOptionsBanner?.enabled !== false ? "activo" : "apagado"}
									color={config.notificationOptionsBanner?.enabled !== false ? "success" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("optionsBanner")}>
								{expandedSections.optionsBanner ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.optionsBanner}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Strip compacto al final del email de movimientos que avisa al usuario que puede elegir cómo recibir los avisos (inmediatas /
								resumen diario / desactivarlas), con link a su página de configuración (medible vía ?source=email_movimiento_opciones).
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={3}>
									<FormControlLabel
										control={
											<Switch
												checked={config.notificationOptionsBanner?.enabled !== false}
												onChange={(e) => handleFieldChange("notificationOptionsBanner.enabled", e.target.checked)}
											/>
										}
										label="Habilitado"
									/>
								</Grid>
								<Grid item xs={12} md={9}>
									<TextField
										label="Texto (vacío = copy por defecto)"
										value={config.notificationOptionsBanner?.text ?? ""}
										onChange={(e) => handleFieldChange("notificationOptionsBanner.text", e.target.value || null)}
										helperText='Default: "Elegí cómo recibir estos avisos: al instante, en un resumen diario, o desactivalos cuando quieras."'
										fullWidth
									/>
								</Grid>
								<Grid item xs={12}>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
										Tipos de email donde puede aparecer (cada tipo usa un texto adaptado por default)
									</Typography>
									{renderEmailTypeChips("notificationOptionsBanner.emailTypes", config.notificationOptionsBanner?.emailTypes)}
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Política de banners */}
			{show("banners") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<ChartSquare size={20} />
								<Typography variant="h6">Política de banners</Typography>
								<Chip
									size="small"
									label={
										config.bannerPolicy?.sharedCooldown?.enabled !== false
											? `cooldown compartido ${config.bannerPolicy?.sharedCooldown?.days ?? 7} d`
											: "cooldown por banner"
									}
									color={config.bannerPolicy?.sharedCooldown?.enabled !== false ? "primary" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("bannerPolicy")}>
								{expandedSections.bannerPolicy ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.bannerPolicy}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Con el cooldown compartido activo, el usuario ve como máximo UN banner promocional cada N días sin importar cuál sea (plan o
								anuncios) ni qué email lo dispare. El strip de opciones es informativo y por default no participa.
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={4}>
									<FormControlLabel
										control={
											<Switch
												checked={config.bannerPolicy?.sharedCooldown?.enabled !== false}
												onChange={(e) => handleFieldChange("bannerPolicy.sharedCooldown.enabled", e.target.checked)}
											/>
										}
										label="Cooldown compartido entre banners"
									/>
								</Grid>
								<Grid item xs={12} md={3}>
									<TextField
										label="Días"
										type="number"
										value={config.bannerPolicy?.sharedCooldown?.days ?? 7}
										onChange={(e) => handleFieldChange("bannerPolicy.sharedCooldown.days", parseInt(e.target.value))}
										inputProps={{ min: 0, max: 90 }}
										disabled={config.bannerPolicy?.sharedCooldown?.enabled === false}
										fullWidth
									/>
								</Grid>
								<Grid item xs={12} md={5}>
									<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
										Banners que participan del cooldown compartido
									</Typography>
									<Stack direction="row" spacing={0.75}>
										{[
											{ key: "plan", label: "Upgrade de plan" },
											{ key: "feature", label: "Anuncios" },
											{ key: "options", label: "Opciones" },
										].map((b) => {
											const participants = config.bannerPolicy?.sharedCooldown?.participants ?? ["plan", "feature"];
											const on = participants.includes(b.key);
											return (
												<Chip
													key={b.key}
													label={b.label}
													size="small"
													color={on ? "primary" : "default"}
													variant={on ? "filled" : "outlined"}
													disabled={config.bannerPolicy?.sharedCooldown?.enabled === false}
													onClick={() =>
														handleFieldChange(
															"bannerPolicy.sharedCooldown.participants",
															on ? participants.filter((k: string) => k !== b.key) : [...participants, b.key],
														)
													}
												/>
											);
										})}
									</Stack>
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Seguimiento postal */}
			{show("postal") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Notification1 size={20} />
								<Typography variant="h6">Seguimiento postal</Typography>
								<Chip
									size="small"
									label={config.postalNotifications?.enabled !== false ? "activo" : "apagado"}
									color={config.postalNotifications?.enabled !== false ? "success" : "default"}
									variant="outlined"
								/>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("postal")}>
								{expandedSections.postal ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.postal}>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Avisos de novedades del Correo Argentino. El worker publica cada evento en el webhook de la-notification y el email sale al
								instante. El safe guard diario (8:00 ART) reintenta los envíos fallidos y barre los seguimientos con eventos que nunca
								llegaron al webhook.
							</Typography>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12} md={4}>
									<FormControlLabel
										control={
											<Switch
												checked={config.postalNotifications?.enabled !== false}
												onChange={(e) => handleFieldChange("postalNotifications.enabled", e.target.checked)}
											/>
										}
										label="Notificaciones postales habilitadas"
									/>
								</Grid>
								<Grid item xs={12} md={4}>
									<FormControlLabel
										control={
											<Switch
												checked={config.postalNotifications?.safeGuardEnabled !== false}
												onChange={(e) => handleFieldChange("postalNotifications.safeGuardEnabled", e.target.checked)}
												disabled={config.postalNotifications?.enabled === false}
											/>
										}
										label="Safe guard diario (8:00 ART)"
									/>
								</Grid>
							</Grid>
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Retry Configuration */}
			{show("general") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<RefreshCircle size={20} />
								<Typography variant="h6">Configuración de reintentos</Typography>
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
			)}

			{/* Content Configuration */}
			{show("judicial") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Setting2 size={20} />
								<Typography variant="h6">Configuración de contenido</Typography>
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
			)}

			{/* Filters Configuration */}
			{show("judicial") && (
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
			)}

			{/* Movement Policies (por worker-source) */}
			{show("judicial") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Setting2 size={20} />
								<Typography variant="h6">Políticas de movimientos por worker</Typography>
							</Stack>
							<IconButton size="small" onClick={() => handleToggleSection("policies")}>
								{expandedSections.policies ? <ArrowUp2 /> : <ArrowDown2 />}
							</IconButton>
						</Stack>
						<Collapse in={expandedSections.policies}>
							<MovementPoliciesSection value={config.movementPolicies} onChange={(next) => handleFieldChange("movementPolicies", next)} />
						</Collapse>
					</CardContent>
				</Card>
			)}

			{/* Data Retention Configuration */}
			{show("general") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Archive size={20} />
								<Typography variant="h6">Retención de datos</Typography>
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
											<strong>Política de retención:</strong>
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
			)}

			{/* Endpoints Configuration */}
			{show("general") && (
				<Card sx={{ mb: 2 }}>
					<CardContent>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Link21 size={20} />
								<Typography variant="h6">Endpoints y URL</Typography>
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
			)}

			{/* Action Buttons */}
			<Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Typography variant="caption" color="text.secondary">
					{hasChanges ? "Hay cambios sin guardar" : "No hay cambios pendientes"}
				</Typography>
				<Box sx={{ display: "flex", gap: 2 }}>
					<Button
						variant="outlined"
						onClick={handleReset}
						disabled={!hasChanges || saving}
						sx={{
							textTransform: "none",
							transition: "transform 200ms ease, box-shadow 200ms ease",
							"&:active": { transform: "scale(0.98)" },
						}}
					>
						Descartar cambios
					</Button>
					<Button
						variant="contained"
						startIcon={<Save2 size={20} />}
						onClick={handleSave}
						disabled={!hasChanges || saving}
						sx={{
							textTransform: "none",
							transition: "transform 200ms ease, box-shadow 200ms ease",
							"&:active": { transform: "scale(0.98)" },
						}}
					>
						{saving ? <CircularProgress size={20} /> : "Guardar cambios"}
					</Button>
				</Box>
			</Box>
		</Box>
	);
};

export default JudicialMovementsConfig;
