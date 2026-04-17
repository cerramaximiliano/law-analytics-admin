import React from "react";
import { useState, useEffect } from "react";
import {
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Stack,
	Typography,
	TextField,
	Switch,
	FormControlLabel,
	Alert,
	Divider,
	Box,
	Chip,
	IconButton,
	InputAdornment,
	Tabs,
	Tab,
} from "@mui/material";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";
import { Eye, EyeSlash, Setting2, Shield, ChartCircle, Scanning } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, WorkerConfig, WorkerType } from "api/workers";

interface AdvancedConfigModalProps {
	open: boolean;
	onClose: () => void;
	config: WorkerConfig;
	onUpdate: () => void;
	workerType: WorkerType;
}

const AdvancedConfigModal = ({ open, onClose, config, onUpdate, workerType }: AdvancedConfigModalProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState(0);
	const [showApiKeys, setShowApiKeys] = useState({
		twocaptcha: false,
		capsolver: false,
	});

	// Estado del formulario
	const [formData, setFormData] = useState({
		defaultProvider: config.captcha?.defaultProvider || "2captcha",
		twocaptchaKey: config.captcha?.apiKeys?.twocaptcha?.key || "",
		twocaptchaEnabled: config.captcha?.apiKeys?.twocaptcha?.enabled ?? true,
		capsolverKey: config.captcha?.apiKeys?.capsolver?.key || "",
		capsolverEnabled: config.captcha?.apiKeys?.capsolver?.enabled ?? false,
	});

	// Estado para el rango
	const [rangeData, setRangeData] = useState({
		range_start: config.range_start || 0,
		range_end: config.range_end || 0,
		year: config.year || new Date().getFullYear(),
	});

	// Estado para probe config (strings para evitar que el campo quede en 0 al borrar)
	const [probeData, setProbeData] = useState({
		threshold_str: String(config.current_year_probe?.threshold ?? 50),
		check_interval_hours_str: String(config.current_year_probe?.check_interval_hours ?? 6),
		probe_offsets_str: (config.current_year_probe?.probe_offsets ?? [200, 1000, 5000]).join(", "),
	});

	// Actualizar estado cuando cambie la configuración
	useEffect(() => {
		setFormData({
			defaultProvider: config.captcha?.defaultProvider || "2captcha",
			twocaptchaKey: config.captcha?.apiKeys?.twocaptcha?.key || "",
			twocaptchaEnabled: config.captcha?.apiKeys?.twocaptcha?.enabled ?? true,
			capsolverKey: config.captcha?.apiKeys?.capsolver?.key || "",
			capsolverEnabled: config.captcha?.apiKeys?.capsolver?.enabled ?? false,
		});
		setRangeData({
			range_start: config.range_start || 0,
			range_end: config.range_end || 0,
			year: config.year || new Date().getFullYear(),
		});
		setProbeData({
			threshold_str: String(config.current_year_probe?.threshold ?? 50),
			check_interval_hours_str: String(config.current_year_probe?.check_interval_hours ?? 6),
			probe_offsets_str: (config.current_year_probe?.probe_offsets ?? [200, 1000, 5000]).join(", "),
		});
	}, [config]);

	// Obtener el ID real del documento
	const getConfigId = (): string => {
		if (typeof config._id === "string") {
			return config._id;
		}
		return config._id.$oid;
	};

	// Manejar cambios en el formulario
	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Guardar configuración
	const handleSave = async () => {
		try {
			setLoading(true);

			// Preparar datos para actualizar
			const updateData: Partial<WorkerConfig> = {
				captcha: {
					defaultProvider: formData.defaultProvider as "2captcha" | "capsolver",
					apiKeys: {
						twocaptcha: {
							key: formData.twocaptchaKey,
							enabled: formData.twocaptchaEnabled,
						},
						capsolver: {
							key: formData.capsolverKey,
							enabled: formData.capsolverEnabled,
						},
					},
				},
			};

			const configId = getConfigId();
			const response = await WorkersService.updateConfig(workerType, configId, updateData);

			if (response.success) {
				enqueueSnackbar("Configuración avanzada actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onUpdate();
				onClose();
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al actualizar la configuración";
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	// Toggle visibilidad de API key
	const toggleShowApiKey = (provider: "twocaptcha" | "capsolver") => {
		setShowApiKeys((prev) => ({
			...prev,
			[provider]: !prev[provider],
		}));
	};

	// Validar rango
	const isRangeValid = (): boolean => {
		// Ambos valores son requeridos
		if (!rangeData.range_start || !rangeData.range_end) {
			return false;
		}
		// Al menos uno de los valores debe ser diferente al actual
		const rangeChanged = rangeData.range_start !== config.range_start || rangeData.range_end !== config.range_end;
		const yearChanged = rangeData.year !== config.year;
		if (!rangeChanged && !yearChanged) {
			return false;
		}
		// El rango final debe ser mayor que el inicial
		if (rangeData.range_end <= rangeData.range_start) {
			return false;
		}
		// Validar año si fue modificado
		if (yearChanged && (!rangeData.year || rangeData.year < 2000 || rangeData.year > new Date().getFullYear() + 1)) {
			return false;
		}
		return true;
	};

	// Actualizar rango
	const handleUpdateRange = async () => {
		if (!isRangeValid()) {
			enqueueSnackbar("Por favor ingrese un rango válido", {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setLoading(true);
			const configId = getConfigId();
			const response = await WorkersService.updateScrapingRange(configId, rangeData);

			if (response.success) {
				enqueueSnackbar("Rango actualizado exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onUpdate();
				onClose();
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al actualizar el rango";
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	// Probe: parsear offsets y validar
	const parseProbeOffsets = (): number[] | null => {
		const parts = probeData.probe_offsets_str
			.split(",")
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n > 0);
		return parts.length > 0 ? parts : null;
	};

	const isProbeValid = (): boolean => {
		const threshold = Number(probeData.threshold_str);
		const hours = Number(probeData.check_interval_hours_str);
		if (!Number.isFinite(threshold) || threshold < 1) return false;
		if (!Number.isFinite(hours) || hours <= 0) return false;
		return parseProbeOffsets() !== null;
	};

	const isPaused = (): boolean => {
		const paused = config.current_year_probe?.paused_until;
		if (!paused) return false;
		const pausedDate = typeof paused === "string" ? new Date(paused) : new Date((paused as any).$date);
		return pausedDate > new Date();
	};

	const handleSaveProbe = async () => {
		const offsets = parseProbeOffsets();
		if (!isProbeValid() || !offsets) {
			enqueueSnackbar("Valores de probe inválidos", { variant: "warning", anchorOrigin: { vertical: "bottom", horizontal: "right" } });
			return;
		}
		try {
			setLoading(true);
			const configId = getConfigId();
			const response = await WorkersService.updateScrapingProbeConfig(configId, {
				threshold: Number(probeData.threshold_str),
				check_interval_hours: Number(probeData.check_interval_hours_str),
				probe_offsets: offsets,
			});
			if (response.success) {
				enqueueSnackbar("Configuración de probe actualizada", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onUpdate();
				onClose();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || error.message || "Error al actualizar", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	const handleResetPause = async () => {
		try {
			setLoading(true);
			const configId = getConfigId();
			const response = await WorkersService.updateScrapingProbeConfig(configId, { reset_pause: true });
			if (response.success) {
				enqueueSnackbar("Pausa de frontera eliminada — worker retomará en el próximo ciclo", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onUpdate();
				onClose();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || error.message || "Error al resetear pausa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	// Determinar si mostrar el tab de rangos
	const showRangeTab =
		workerType === "scraping" && config.enabled === false && config.number && config.range_end && config.number > config.range_end;

	const showProbeTab = workerType === "scraping";

	// Manejar cambio de tab
	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	return (
		<ResponsiveDialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			PaperProps={{
				sx: {
					display: "flex",
					flexDirection: "column",
					maxHeight: { xs: "90vh", sm: "85vh" },
				},
			}}
		>
			<DialogTitle
				sx={{
					flexShrink: 0,
				}}
			>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Setting2 size={24} />
					<Typography variant="h6">Configuración Avanzada</Typography>
				</Stack>
			</DialogTitle>

			<DialogContent
				dividers
				sx={{
					flex: 1,
					overflowY: "auto",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Stack spacing={2} sx={{ flex: 1 }}>
					{/* Información del worker */}
					<Alert severity="info" variant="outlined">
						<Typography variant="body2">
							Worker: <strong>{config.worker_id}</strong>
						</Typography>
						<Typography variant="body2">
							Fuero: <strong>{config.fuero}</strong>
						</Typography>
					</Alert>

					{/* Tabs */}
					<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
						<Tabs value={activeTab} onChange={handleTabChange} aria-label="configuración avanzada tabs">
							<Tab icon={<Shield size={20} />} label="Servicios de Captcha" iconPosition="start" />
							{showRangeTab && <Tab icon={<ChartCircle size={20} />} label="Rango de Búsqueda" iconPosition="start" />}
							{showProbeTab && <Tab icon={<Scanning size={20} />} label="Frontera" iconPosition="start" />}
						</Tabs>
					</Box>

					{/* Tab Panels Container */}
					<Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
						{/* Tab Panel: Servicios de Captcha */}
						<Box sx={{ display: activeTab === 0 ? "block" : "none", pt: 2 }}>
							<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								{/* Proveedor por defecto */}
								<Box>
									<Typography variant="subtitle2" gutterBottom>
										Proveedor de Captcha por Defecto
									</Typography>
									<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
										<Chip
											label="2Captcha"
											color={formData.defaultProvider === "2captcha" ? "primary" : "default"}
											onClick={() => handleChange("defaultProvider", "2captcha")}
											clickable
										/>
										<Chip
											label="Capsolver"
											color={formData.defaultProvider === "capsolver" ? "primary" : "default"}
											onClick={() => handleChange("defaultProvider", "capsolver")}
											clickable
										/>
									</Stack>
								</Box>

								<Divider />

								{/* Configuración 2Captcha */}
								<Box>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
										<Typography variant="subtitle1" fontWeight={500}>
											2Captcha
										</Typography>
										<FormControlLabel
											control={
												<Switch
													checked={formData.twocaptchaEnabled}
													onChange={(e) => handleChange("twocaptchaEnabled", e.target.checked)}
													size="small"
												/>
											}
											label="Habilitado"
										/>
									</Stack>

									<TextField
										fullWidth
										label="API Key"
										type={showApiKeys.twocaptcha ? "text" : "password"}
										value={formData.twocaptchaKey}
										onChange={(e) => handleChange("twocaptchaKey", e.target.value)}
										disabled={!formData.twocaptchaEnabled}
										placeholder="Ingrese su API key de 2Captcha"
										InputProps={{
											endAdornment: (
												<InputAdornment position="end">
													<IconButton onClick={() => toggleShowApiKey("twocaptcha")} edge="end" size="small">
														{showApiKeys.twocaptcha ? <EyeSlash size={20} /> : <Eye size={20} />}
													</IconButton>
												</InputAdornment>
											),
										}}
									/>
								</Box>

								<Divider />

								{/* Configuración Capsolver */}
								<Box>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
										<Typography variant="subtitle1" fontWeight={500}>
											Capsolver
										</Typography>
										<FormControlLabel
											control={
												<Switch
													checked={formData.capsolverEnabled}
													onChange={(e) => handleChange("capsolverEnabled", e.target.checked)}
													size="small"
												/>
											}
											label="Habilitado"
										/>
									</Stack>

									<TextField
										fullWidth
										label="API Key"
										type={showApiKeys.capsolver ? "text" : "password"}
										value={formData.capsolverKey}
										onChange={(e) => handleChange("capsolverKey", e.target.value)}
										disabled={!formData.capsolverEnabled}
										placeholder="Ingrese su API key de Capsolver"
										InputProps={{
											endAdornment: (
												<InputAdornment position="end">
													<IconButton onClick={() => toggleShowApiKey("capsolver")} edge="end" size="small">
														{showApiKeys.capsolver ? <EyeSlash size={20} /> : <Eye size={20} />}
													</IconButton>
												</InputAdornment>
											),
										}}
									/>
								</Box>

								{/* Advertencia */}
								<Alert severity="warning" variant="outlined">
									<Typography variant="body2">
										<strong>Importante:</strong> Las API keys se almacenan de forma segura. Asegúrese de que las keys sean válidas antes de
										guardar.
									</Typography>
								</Alert>
							</Stack>
						</Box>

						{/* Tab Panel: Rango de Búsqueda */}
						<Box sx={{ display: activeTab === 1 && showRangeTab ? "block" : "none", pt: 2 }}>
							<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Alert severity="info" variant="outlined">
									<Typography variant="body2">
										El número actual ({config.number?.toLocaleString()}) ha superado el rango final ({config.range_end?.toLocaleString()}).
										Puede actualizar el rango para continuar el scraping.
									</Typography>
								</Alert>

								<Stack direction="row" spacing={2}>
									<TextField
										fullWidth
										label="Rango Inicial"
										type="number"
										value={rangeData.range_start}
										onChange={(e) => setRangeData({ ...rangeData, range_start: Number(e.target.value) })}
										helperText={`Actual: ${config.range_start?.toLocaleString()}`}
									/>
									<TextField
										fullWidth
										label="Rango Final"
										type="number"
										value={rangeData.range_end}
										onChange={(e) => setRangeData({ ...rangeData, range_end: Number(e.target.value) })}
										helperText={`Actual: ${config.range_end?.toLocaleString()}`}
									/>
								</Stack>

								{/* Campo de año (opcional) */}
								<TextField
									label="Año"
									type="number"
									value={rangeData.year}
									onChange={(e) => setRangeData({ ...rangeData, year: Number(e.target.value) })}
									helperText={`Actual: ${config.year} (opcional modificar)`}
									sx={{ maxWidth: 150 }}
									inputProps={{ min: 2000, max: new Date().getFullYear() + 1 }}
								/>

								{/* Validación de rangos */}
								{rangeData.range_start && rangeData.range_end && rangeData.range_end <= rangeData.range_start && (
									<Alert severity="error" variant="outlined">
										<Typography variant="body2">El rango final debe ser mayor que el rango inicial.</Typography>
									</Alert>
								)}

								{rangeData.range_start === config.range_start &&
									rangeData.range_end === config.range_end &&
									rangeData.year === config.year && (
										<Alert severity="warning" variant="outlined">
											<Typography variant="body2">Debe modificar al menos un valor (rango o año).</Typography>
										</Alert>
									)}

								<Alert severity="info" variant="outlined">
									<Typography variant="body2">
										<strong>Nota:</strong> Al actualizar el rango, el worker continuará procesando desde el nuevo rango inicial cuando sea
										reactivado.
									</Typography>
								</Alert>
							</Stack>
						</Box>

						{/* Tab Panel: Frontera / Probe */}
						{showProbeTab &&
							(() => {
								const probeTabIndex = showRangeTab ? 2 : 1;
								const probe = config.current_year_probe;
								const pausedUntil = probe?.paused_until
									? typeof probe.paused_until === "string"
										? new Date(probe.paused_until)
										: new Date((probe.paused_until as any).$date)
									: null;
								const workerIsPaused = pausedUntil ? pausedUntil > new Date() : false;
								return (
									<Box sx={{ display: activeTab === probeTabIndex ? "block" : "none", pt: 2 }}>
										<Stack spacing={2}>
											{workerIsPaused && pausedUntil && (
												<Alert
													severity="warning"
													variant="outlined"
													action={
														<Button color="warning" size="small" onClick={handleResetPause} disabled={loading}>
															Reanudar ahora
														</Button>
													}
												>
													<Typography variant="body2">
														Worker pausado por frontera detectada hasta <strong>{pausedUntil.toLocaleString("es-AR")}</strong>.
														{probe?.estimated_frontier && (
															<>
																{" "}
																Frontera estimada en expediente <strong>{probe.estimated_frontier.toLocaleString()}</strong>.
															</>
														)}
													</Typography>
												</Alert>
											)}

											{probe?.last_probe_at && (
												<Alert severity="info" variant="outlined">
													<Typography variant="body2">
														Último sondeo:{" "}
														<strong>
															{new Date(
																typeof probe.last_probe_at === "string" ? probe.last_probe_at : (probe.last_probe_at as any).$date,
															).toLocaleString("es-AR")}
														</strong>
														{probe.last_probe_result && <> — {probe.last_probe_result}</>}
													</Typography>
												</Alert>
											)}

											<Divider />

											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Umbral de no-encontrados consecutivos para disparar sondeo
												</Typography>
												<TextField
													type="number"
													value={probeData.threshold_str}
													onChange={(e) => setProbeData((p) => ({ ...p, threshold_str: e.target.value }))}
													inputProps={{ min: 1 }}
													helperText="El worker sondea cuando acumula esta cantidad de not-founds seguidos (default: 50)"
													sx={{ maxWidth: 200 }}
												/>
											</Box>

											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Offsets de sondeo (separados por coma)
												</Typography>
												<TextField
													fullWidth
													value={probeData.probe_offsets_str}
													onChange={(e) => setProbeData((p) => ({ ...p, probe_offsets_str: e.target.value }))}
													helperText="Números a sondear por delante del actual (ej: 200, 1000, 5000)"
													error={parseProbeOffsets() === null && probeData.probe_offsets_str.trim() !== ""}
												/>
											</Box>

											<Box>
												<Typography variant="subtitle2" gutterBottom>
													Horas de pausa al detectar frontera real
												</Typography>
												<TextField
													type="number"
													value={probeData.check_interval_hours_str}
													onChange={(e) => setProbeData((p) => ({ ...p, check_interval_hours_str: e.target.value }))}
													inputProps={{ min: 0.5, step: 0.5 }}
													helperText="Tiempo que el worker espera antes de reintentar tras detectar la frontera (default: 6)"
													sx={{ maxWidth: 200 }}
												/>
											</Box>

											<Alert severity="info" variant="outlined">
												<Typography variant="body2">
													El sondeo aplica solo cuando el worker procesa el <strong>año en curso</strong>. Si encuentra expedientes en los
													offsets, asume privadas y avanza; si no encuentra nada, detecta la frontera real y pausa.
												</Typography>
											</Alert>
										</Stack>
									</Box>
								);
							})()}
					</Box>
				</Stack>
			</DialogContent>

			<DialogActions
				sx={{
					flexShrink: 0,
				}}
			>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				{activeTab === 0 && (
					<Button onClick={handleSave} variant="contained" disabled={loading}>
						{loading ? "Guardando..." : "Guardar Configuración"}
					</Button>
				)}
				{activeTab === 1 && showRangeTab && (
					<Button onClick={handleUpdateRange} variant="contained" disabled={loading || !isRangeValid()}>
						{loading ? "Actualizando..." : "Actualizar Rango"}
					</Button>
				)}
				{showProbeTab && activeTab === (showRangeTab ? 2 : 1) && (
					<Button onClick={handleSaveProbe} variant="contained" disabled={loading || !isProbeValid()}>
						{loading ? "Guardando..." : "Guardar Probe"}
					</Button>
				)}
			</DialogActions>
		</ResponsiveDialog>
	);
};

export default AdvancedConfigModal;
