import { useState, useEffect } from "react";
import {
	Box,
	Grid,
	Card,
	CardContent,
	Typography,
	Alert,
	Stack,
	CircularProgress,
	Button,
	TextField,
	Switch,
	FormControlLabel,
	Chip,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Clock, Edit, Save2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import CronConfigService, { CronConfig, UpdateCronConfigParams } from "api/cronConfig";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const CronConfigPage = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [config, setConfig] = useState<CronConfig | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [editMode, setEditMode] = useState(false);

	// Estados editables
	const [cronExpression, setCronExpression] = useState("");
	const [enabled, setEnabled] = useState(false);
	const [defaultDays, setDefaultDays] = useState(30);
	const [reminderDays, setReminderDays] = useState("7,3,1");
	const [enableAutoArchive, setEnableAutoArchive] = useState(true);
	const [adminEmail, setAdminEmail] = useState("");
	const [notes, setNotes] = useState("");

	const fetchConfig = async () => {
		try {
			setLoading(true);
			setError(null);

			console.log("🔍 [CronConfig] Fetching config for: grace-period-processor");
			const response = await CronConfigService.getCronConfig("grace-period-processor", true);
			console.log("📥 [CronConfig] Response received:", response);
			console.log("📥 [CronConfig] Response.data:", response.data);
			console.log("📥 [CronConfig] Is array?", Array.isArray(response.data));

			// Manejar respuesta cuando data es un array con un solo elemento
			let configData: CronConfig | null = null;

			if (response.success) {
				if (Array.isArray(response.data)) {
					// Si es un array, tomar el primer elemento
					if (response.data.length > 0) {
						configData = response.data[0];
						console.log("✅ [CronConfig] Config data from array:", configData);
					} else {
						throw new Error("No se encontró configuración para grace-period-processor");
					}
				} else {
					// Si no es array, usar directamente
					configData = response.data;
					console.log("✅ [CronConfig] Config data direct:", configData);
				}

				if (configData) {
					setConfig(configData);
					// Cargar valores en los estados editables
					setCronExpression(configData.cronExpression);
					setEnabled(configData.enabled);
					setDefaultDays(configData.config?.gracePeriod?.defaultDays || 30);
					setReminderDays(configData.config?.gracePeriod?.reminderDays?.join(",") || "7,3,1");
					setEnableAutoArchive(configData.config?.gracePeriod?.enableAutoArchive ?? true);
					console.log("✅ [CronConfig] State updated successfully");
				}
			} else {
				throw new Error(response.message || "La respuesta no fue exitosa");
			}
		} catch (error: any) {
			console.error("❌ [CronConfig] Error fetching config:", error);
			const errorMessage = error.message || "Error al cargar la configuración";
			setError(errorMessage);
			enqueueSnackbar(errorMessage, {
				variant: "error",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfig();
	}, []);

	const handleSave = async () => {
		if (!adminEmail || !adminEmail.trim()) {
			enqueueSnackbar("Por favor, ingresa tu email de admin", { variant: "warning" });
			return;
		}

		try {
			setSaving(true);

			// Parsear reminderDays de string a array de números
			const reminderDaysArray = reminderDays.split(",").map((d) => parseInt(d.trim())).filter((d) => !isNaN(d));

			const updates: UpdateCronConfigParams = {
				cronExpression,
				enabled,
				config: {
					...config?.config,
					gracePeriod: {
						defaultDays,
						reminderDays: reminderDaysArray,
						enableAutoArchive,
					},
				},
				updatedBy: adminEmail,
				notes: notes.trim() || undefined,
			};

			const response = await CronConfigService.updateCronConfig("grace-period-processor", updates);

			if (response.success) {
				enqueueSnackbar("Configuración actualizada exitosamente", { variant: "success" });
				setEditMode(false);
				setAdminEmail("");
				setNotes("");
				await fetchConfig(); // Recargar para ver cambios
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleToggle = async () => {
		if (!adminEmail || !adminEmail.trim()) {
			enqueueSnackbar("Por favor, ingresa tu email de admin", { variant: "warning" });
			return;
		}

		try {
			setSaving(true);

			const response = await CronConfigService.toggleCronTask("grace-period-processor", {
				updatedBy: adminEmail,
			});

			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				setAdminEmail("");
				await fetchConfig(); // Recargar para ver cambios
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar estado", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		if (config) {
			// Restaurar valores originales
			setCronExpression(config.cronExpression);
			setEnabled(config.enabled);
			setDefaultDays(config.config?.gracePeriod?.defaultDays || 30);
			setReminderDays(config.config?.gracePeriod?.reminderDays?.join(",") || "7,3,1");
			setEnableAutoArchive(config.config?.gracePeriod?.enableAutoArchive ?? true);
		}
		setEditMode(false);
		setAdminEmail("");
		setNotes("");
	};

	if (loading) {
		return (
			<MainCard>
				<Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
					<CircularProgress />
				</Box>
			</MainCard>
		);
	}

	if (error && !config) {
		return (
			<MainCard
				title="Configuración de Cron - Período de Gracia"
				secondary={
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig}>
						Reintentar
					</Button>
				}
			>
				<Alert severity="error" sx={{ mb: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error al cargar configuración
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						{error}
					</Typography>
				</Alert>
			</MainCard>
		);
	}

	return (
		<MainCard
			title="Configuración de Cron - Período de Gracia"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfig} disabled={saving}>
						Actualizar
					</Button>
					{!editMode && (
						<Button variant="contained" size="small" startIcon={<Edit size={16} />} onClick={() => setEditMode(true)}>
							Editar
						</Button>
					)}
				</Stack>
			}
		>
			<Stack spacing={3}>
				{/* Estado del Cron */}
				<Card variant="outlined">
					<CardContent>
						<Grid container spacing={2} alignItems="center">
							<Grid item xs={12} sm={6} md={3}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Estado
									</Typography>
									<Chip
										label={config?.enabled ? "Habilitado" : "Deshabilitado"}
										color={config?.enabled ? "success" : "error"}
										size="small"
										icon={config?.enabled ? <TickCircle size={16} /> : <CloseCircle size={16} />}
									/>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Expresión Cron
									</Typography>
									<Typography variant="body2" fontWeight="bold" sx={{ fontFamily: "monospace" }}>
										{config?.cronExpression}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Zona Horaria
									</Typography>
									<Typography variant="body2">{config?.timezone}</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack spacing={0.5}>
									<Typography variant="caption" color="text.secondary">
										Próxima Ejecución
									</Typography>
									<Stack direction="row" spacing={0.5} alignItems="center">
										<Clock size={14} />
										<Typography variant="body2">
											{config?.nextRun ? dayjs(config.nextRun).format("DD/MM/YYYY HH:mm") : "-"}
										</Typography>
									</Stack>
									{config?.nextRun && (
										<Typography variant="caption" color="text.secondary">
											{dayjs(config.nextRun).fromNow()}
										</Typography>
									)}
								</Stack>
							</Grid>
						</Grid>
					</CardContent>
				</Card>

				{/* Estadísticas */}
				<Grid container spacing={3}>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "primary.lighter", border: 1, borderColor: "primary.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Ejecuciones Totales
									</Typography>
									<Typography variant="h3" color="primary.main">
										{config?.runCount || 0}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "error.lighter", border: 1, borderColor: "error.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Fallos
									</Typography>
									<Typography variant="h3" color="error.main">
										{config?.failureCount || 0}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "success.lighter", border: 1, borderColor: "success.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Días por Defecto
									</Typography>
									<Typography variant="h3" color="success.main">
										{config?.config?.gracePeriod?.defaultDays || 30}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ backgroundColor: "warning.lighter", border: 1, borderColor: "warning.main" }}>
							<CardContent>
								<Stack spacing={1}>
									<Typography variant="caption" color="text.secondary">
										Recordatorios
									</Typography>
									<Typography variant="h3" color="warning.main" sx={{ color: "rgba(0, 0, 0, 0.87)" }}>
										{config?.config?.gracePeriod?.reminderDays?.length || 0}
									</Typography>
								</Stack>
							</CardContent>
						</Card>
					</Grid>
				</Grid>

				{/* Formulario de Edición */}
				{editMode && (
					<Card variant="outlined" sx={{ backgroundColor: "info.lighter" }}>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Editar Configuración
							</Typography>
							<Divider sx={{ mb: 3 }} />
							<Grid container spacing={3}>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Expresión Cron"
										value={cronExpression}
										onChange={(e) => setCronExpression(e.target.value)}
										helperText="Ej: 0 0 * * * (cada día a medianoche)"
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<FormControlLabel
										control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />}
										label={enabled ? "Habilitado" : "Deshabilitado"}
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<TextField
										fullWidth
										label="Días por Defecto"
										type="number"
										value={defaultDays}
										onChange={(e) => setDefaultDays(parseInt(e.target.value))}
										helperText="Días de período de gracia"
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<TextField
										fullWidth
										label="Días de Recordatorios"
										value={reminderDays}
										onChange={(e) => setReminderDays(e.target.value)}
										helperText="Separados por coma (ej: 7,3,1)"
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<FormControlLabel
										control={
											<Switch checked={enableAutoArchive} onChange={(e) => setEnableAutoArchive(e.target.checked)} />
										}
										label="Auto-archivo Habilitado"
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Tu Email (Admin)"
										type="email"
										value={adminEmail}
										onChange={(e) => setAdminEmail(e.target.value)}
										placeholder="admin@lawanalytics.app"
										helperText="Requerido para guardar cambios"
										size="small"
										required
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Notas (Opcional)"
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										placeholder="Motivo del cambio..."
										size="small"
									/>
								</Grid>
								<Grid item xs={12}>
									<Stack direction="row" spacing={2} justifyContent="flex-end">
										<Button variant="outlined" onClick={handleCancel} disabled={saving}>
											Cancelar
										</Button>
										<Button
											variant="contained"
											color="primary"
											onClick={handleSave}
											disabled={saving || !adminEmail}
											startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save2 size={16} />}
										>
											{saving ? "Guardando..." : "Guardar Cambios"}
										</Button>
									</Stack>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				)}

				{/* Toggle rápido */}
				{!editMode && (
					<Card variant="outlined">
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Control Rápido
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<Grid container spacing={2} alignItems="flex-end">
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										label="Tu Email (Admin)"
										type="email"
										value={adminEmail}
										onChange={(e) => setAdminEmail(e.target.value)}
										placeholder="admin@lawanalytics.app"
										helperText="Requerido para cambiar el estado"
										size="small"
										required
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Button
										fullWidth
										variant="contained"
										color={config?.enabled ? "error" : "success"}
										onClick={handleToggle}
										disabled={saving || !adminEmail}
										startIcon={config?.enabled ? <CloseCircle size={16} /> : <TickCircle size={16} />}
									>
										{config?.enabled ? "Deshabilitar Cron" : "Habilitar Cron"}
									</Button>
								</Grid>
							</Grid>
						</CardContent>
					</Card>
				)}

				{/* Historial */}
				{config?.history && config.history.length > 0 && (
					<Card variant="outlined">
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Historial de Cambios
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fecha</TableCell>
											<TableCell>Modificado Por</TableCell>
											<TableCell>Cambios</TableCell>
											<TableCell>Notas</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{config.history.slice(0, 10).map((entry, index) => (
											<TableRow key={index}>
												<TableCell>
													<Typography variant="caption">
														{dayjs(entry.updatedAt).format("DD/MM/YYYY HH:mm")}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="caption">{entry.updatedBy}</Typography>
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5} flexWrap="wrap">
														{entry.changes.map((change, i) => (
															<Chip key={i} label={change} size="small" sx={{ mb: 0.5 }} />
														))}
													</Stack>
												</TableCell>
												<TableCell>
													<Typography variant="caption">{entry.notes || "-"}</Typography>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						</CardContent>
					</Card>
				)}
			</Stack>
		</MainCard>
	);
};

export default CronConfigPage;
