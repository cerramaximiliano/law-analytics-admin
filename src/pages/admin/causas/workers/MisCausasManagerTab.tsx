import React, { useState } from "react";
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
	Chip,
	Alert,
	Divider,
	useTheme,
	alpha,
} from "@mui/material";
import { TickCircle, CloseCircle, Timer, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerConfig, ScrapingManagerService } from "api/scrapingManager";

interface Props {
	config: ScrapingManagerConfig;
	onConfigUpdate: () => void;
}

const MisCausasManagerTab: React.FC<Props> = ({ config, onConfigUpdate }) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);

	// Estado editable local
	const [globalEnabled, setGlobalEnabled] = useState(config.global.enabled);
	const [serviceAvailable, setServiceAvailable] = useState(config.global.serviceAvailable);
	const [maintenanceMessage, setMaintenanceMessage] = useState(config.global.maintenanceMessage || "");
	const [scheduledDowntime, setScheduledDowntime] = useState(config.global.scheduledDowntime || "");
	const [pollInterval, setPollInterval] = useState(config.manager.pollIntervalMs / 1000);
	const [healthCheckInterval, setHealthCheckInterval] = useState(config.manager.healthCheckIntervalMs / 1000);
	const [configWatch, setConfigWatch] = useState(config.manager.configWatchEnabled);

	const hasChanges =
		globalEnabled !== config.global.enabled ||
		serviceAvailable !== config.global.serviceAvailable ||
		maintenanceMessage !== (config.global.maintenanceMessage || "") ||
		scheduledDowntime !== (config.global.scheduledDowntime || "") ||
		pollInterval !== config.manager.pollIntervalMs / 1000 ||
		healthCheckInterval !== config.manager.healthCheckIntervalMs / 1000 ||
		configWatch !== config.manager.configWatchEnabled;

	const handleSave = async () => {
		try {
			setSaving(true);
			await ScrapingManagerService.updateGlobal({
				enabled: globalEnabled,
				serviceAvailable,
				maintenanceMessage: maintenanceMessage || null,
				scheduledDowntime: scheduledDowntime || null,
				manager: {
					pollIntervalMs: pollInterval * 1000,
					healthCheckIntervalMs: healthCheckInterval * 1000,
					configWatchEnabled: configWatch,
				},
			});
			enqueueSnackbar("Configuración global actualizada", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			onConfigUpdate();
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al guardar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Stack spacing={3}>
			{/* Estado Global */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Estado Global del Sistema
					</Typography>
					<Grid container spacing={3}>
						{/* Manager ON/OFF */}
						<Grid item xs={12} sm={6}>
							<Card
								variant="outlined"
								sx={{
									bgcolor: alpha(globalEnabled ? theme.palette.success.main : theme.palette.error.main, 0.05),
									borderColor: alpha(globalEnabled ? theme.palette.success.main : theme.palette.error.main, 0.3),
								}}
							>
								<CardContent sx={{ py: 2 }}>
									<Stack direction="row" justifyContent="space-between" alignItems="center">
										<Stack direction="row" spacing={1.5} alignItems="center">
											{globalEnabled ? <TickCircle size={24} color={theme.palette.success.main} /> : <CloseCircle size={24} color={theme.palette.error.main} />}
											<Box>
												<Typography variant="subtitle2" fontWeight="bold">
													Manager
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Encendido / Apagado global
												</Typography>
											</Box>
										</Stack>
										<Switch checked={globalEnabled} onChange={(e) => setGlobalEnabled(e.target.checked)} color="success" />
									</Stack>
								</CardContent>
							</Card>
						</Grid>

						{/* Service Available */}
						<Grid item xs={12} sm={6}>
							<Card
								variant="outlined"
								sx={{
									bgcolor: alpha(serviceAvailable ? theme.palette.info.main : theme.palette.warning.main, 0.05),
									borderColor: alpha(serviceAvailable ? theme.palette.info.main : theme.palette.warning.main, 0.3),
								}}
							>
								<CardContent sx={{ py: 2 }}>
									<Stack direction="row" justifyContent="space-between" alignItems="center">
										<Stack direction="row" spacing={1.5} alignItems="center">
											{serviceAvailable ? <TickCircle size={24} color={theme.palette.info.main} /> : <CloseCircle size={24} color={theme.palette.warning.main} />}
											<Box>
												<Typography variant="subtitle2" fontWeight="bold">
													Servicio a Usuarios
												</Typography>
												<Typography variant="caption" color="text.secondary">
													Disponibilidad del servicio
												</Typography>
											</Box>
										</Stack>
										<Switch checked={serviceAvailable} onChange={(e) => setServiceAvailable(e.target.checked)} color="info" />
									</Stack>
								</CardContent>
							</Card>
						</Grid>
					</Grid>

					{/* Alerta explicativa */}
					{!globalEnabled && (
						<Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
							<Typography variant="body2">
								<strong>Manager apagado:</strong> Todos los workers serán detenidos. Ningún proceso de scraping se ejecutará.
							</Typography>
						</Alert>
					)}
					{globalEnabled && !serviceAvailable && (
						<Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
							<Typography variant="body2">
								<strong>Servicio no disponible para usuarios:</strong> Los workers pueden seguir ejecutándose, pero la API indicará a los usuarios que el servicio no está disponible.
							</Typography>
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Mensaje de Mantenimiento */}
			<Card variant="outlined">
				<CardContent>
					<Typography variant="h6" gutterBottom>
						Mantenimiento
					</Typography>
					<Stack spacing={2}>
						<TextField
							label="Mensaje de mantenimiento"
							value={maintenanceMessage}
							onChange={(e) => setMaintenanceMessage(e.target.value)}
							fullWidth
							size="small"
							multiline
							rows={2}
							placeholder="Mensaje opcional para mostrar a usuarios cuando el servicio no está disponible"
						/>
						<TextField
							label="Tiempo de inactividad programado (ISO date)"
							value={scheduledDowntime}
							onChange={(e) => setScheduledDowntime(e.target.value)}
							fullWidth
							size="small"
							placeholder="2026-03-01T08:00:00.000Z"
							helperText="Fecha/hora ISO para mantenimiento programado (opcional)"
						/>
					</Stack>
				</CardContent>
			</Card>

			{/* Configuración del Manager */}
			<Card variant="outlined">
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<Setting2 size={20} />
						<Typography variant="h6">Configuración del Manager</Typography>
					</Stack>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={4}>
							<TextField
								label="Poll Interval (segundos)"
								type="number"
								value={pollInterval}
								onChange={(e) => setPollInterval(Number(e.target.value))}
								fullWidth
								size="small"
								helperText="Cada cuántos segundos el manager verifica los workers"
								inputProps={{ min: 5, max: 300 }}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<TextField
								label="Health Check Interval (segundos)"
								type="number"
								value={healthCheckInterval}
								onChange={(e) => setHealthCheckInterval(Number(e.target.value))}
								fullWidth
								size="small"
								helperText="Cada cuántos segundos se ejecutan health checks"
								inputProps={{ min: 10, max: 600 }}
							/>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ height: "100%" }}>
								<Box>
									<Typography variant="body2" fontWeight={500}>
										Config Watch
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Hot-reload del archivo JSON
									</Typography>
								</Box>
								<Switch checked={configWatch} onChange={(e) => setConfigWatch(e.target.checked)} size="small" />
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Metadatos */}
			<Card variant="outlined" sx={{ bgcolor: "background.default" }}>
				<CardContent sx={{ py: 1.5 }}>
					<Stack direction="row" spacing={3} flexWrap="wrap">
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary">Versión:</Typography>
							<Chip label={config._version} size="small" variant="outlined" />
						</Stack>
						<Stack direction="row" spacing={0.5} alignItems="center">
							<Typography variant="caption" color="text.secondary">Última modificación:</Typography>
							<Typography variant="caption">{new Date(config._lastModified).toLocaleString("es-AR")}</Typography>
						</Stack>
						{config._createdBy && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<Typography variant="caption" color="text.secondary">Creado por:</Typography>
								<Typography variant="caption">{config._createdBy}</Typography>
							</Stack>
						)}
					</Stack>
				</CardContent>
			</Card>

			{/* Botón Guardar */}
			{hasChanges && (
				<Box display="flex" justifyContent="flex-end">
					<Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<TickCircle size={18} />}>
						{saving ? "Guardando..." : "Guardar Cambios"}
					</Button>
				</Box>
			)}
		</Stack>
	);
};

export default MisCausasManagerTab;
