import React from "react";
import { useState, useEffect } from "react";
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
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Skeleton,
	Chip,
	Select,
	MenuItem,
	FormControl,
} from "@mui/material";
import { Edit2, TickCircle, CloseCircle, Refresh, Setting2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, WorkerConfig } from "api/workers";
import AdvancedConfigModal from "./AdvancedConfigModal";

// Enums según el modelo mongoose
const VERIFICATION_MODE_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "civil", label: "Civil" },
	{ value: "ss", label: "Seguridad Social" },
	{ value: "trabajo", label: "Trabajo" },
];

const CAPTCHA_PROVIDER_OPTIONS = [
	{ value: "2captcha", label: "2Captcha" },
	{ value: "capsolver", label: "CapSolver" },
];

const VerificationWorker = () => {
	const { enqueueSnackbar } = useSnackbar();
	const [configs, setConfigs] = useState<WorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Partial<WorkerConfig>>({});
	const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
	const [selectedConfig, setSelectedConfig] = useState<WorkerConfig | null>(null);

	// Helper para obtener labels
	const getVerificationModeLabel = (value: string) => {
		return VERIFICATION_MODE_OPTIONS.find((opt) => opt.value === value)?.label || value;
	};

	// Cargar configuraciones
	const fetchConfigs = async () => {
		try {
			setLoading(true);
			const response = await WorkersService.getVerificationConfigs({ page: 1, limit: 20 });
			if (response.success && Array.isArray(response.data)) {
				setConfigs(response.data);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las configuraciones", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchConfigs();
	}, []);

	// Obtener el ID real del documento
	const getConfigId = (config: WorkerConfig): string => {
		if (typeof config._id === "string") {
			return config._id;
		}
		return config._id.$oid;
	};

	// Formatear fecha
	const formatDate = (date: any): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleString("es-ES");
	};

	// Manejar edición
	const handleEdit = (config: WorkerConfig) => {
		const id = getConfigId(config);
		setEditingId(id);
		setEditValues({
			worker_id: config.worker_id,
			verification_mode: config.verification_mode,
			enabled: config.enabled,
			batch_size: config.batch_size,
			captcha: config.captcha,
		});
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditValues({});
	};

	const handleSave = async () => {
		if (!editingId) return;

		try {
			const response = await WorkersService.updateVerificationConfig(editingId, editValues);
			if (response.success) {
				enqueueSnackbar("Configuración actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfigs();
				handleCancelEdit();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar la configuración", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleToggleEnabled = async (config: WorkerConfig) => {
		const id = getConfigId(config);
		try {
			const response = await WorkersService.updateVerificationConfig(id, {
				enabled: !config.enabled,
			});
			if (response.success) {
				enqueueSnackbar(`Worker ${!config.enabled ? "activado" : "desactivado"}`, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfigs();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al cambiar el estado", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Manejar configuración avanzada
	const handleAdvancedConfig = (config: WorkerConfig) => {
		setSelectedConfig(config);
		setAdvancedConfigOpen(true);
	};

	const handleCloseAdvancedConfig = () => {
		setAdvancedConfigOpen(false);
		setSelectedConfig(null);
	};

	if (loading) {
		return (
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{[1, 2, 3, 4].map((item) => (
					<Grid item xs={12} key={item}>
						<Skeleton variant="rectangular" height={80} />
					</Grid>
				))}
			</Grid>
		);
	}

	return (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Header con acciones */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración del Worker de Verificación</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfigs}>
					Actualizar
				</Button>
			</Box>

			{/* Información del worker */}
			<Alert severity="info" variant="outlined">
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Verificación de Causas
				</Typography>
				<Typography variant="body2" sx={{ mt: 1 }}>
					Este worker se encarga de verificar automáticamente el estado de las causas judiciales, validando su existencia y actualizando la
					información en el sistema.
				</Typography>
			</Alert>

			{/* Información detallada del worker */}
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent sx={{ py: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Elegibilidad de Documentos - Worker de Verificación
					</Typography>
					<Grid container spacing={1.5}>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Source:
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									"app"
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Verified (req):
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									false
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									isValid (req):
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									null
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Update:
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									No importa
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Función:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="primary.main">
									Verificación inicial
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Modifica verified:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="success.main">
									SÍ
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Modifica isValid:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="success.main">
									SÍ
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Frecuencia:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="warning.main">
									Una sola vez
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Tabla de configuraciones */}
			<TableContainer component={Paper} variant="outlined">
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Worker ID</TableCell>
							<TableCell>Modo Verificación</TableCell>
							<TableCell align="center">Tamaño Lote</TableCell>
							<TableCell align="center">Proveedor Captcha</TableCell>
							<TableCell align="center">Verificados</TableCell>
							<TableCell align="center">Válidos</TableCell>
							<TableCell align="center">Inválidos</TableCell>
							<TableCell align="center">Estado</TableCell>
							<TableCell align="center">Última Verificación</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{configs.map((config) => {
							const configId = getConfigId(config);
							const isEditing = editingId === configId;

							return (
								<TableRow key={configId}>
									<TableCell>
										{isEditing ? (
											<TextField
												size="small"
												value={editValues.worker_id || ""}
												onChange={(e) => setEditValues({ ...editValues, worker_id: e.target.value })}
												fullWidth
											/>
										) : (
											<Typography variant="body2" fontWeight={500}>
												{config.worker_id}
											</Typography>
										)}
									</TableCell>
									<TableCell>
										{isEditing ? (
											<FormControl size="small" fullWidth>
												<Select
													value={editValues.verification_mode || ""}
													onChange={(e) => setEditValues({ ...editValues, verification_mode: e.target.value })}
												>
													{VERIFICATION_MODE_OPTIONS.map((option) => (
														<MenuItem key={option.value} value={option.value}>
															{option.label}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										) : (
											<Typography variant="body2">{getVerificationModeLabel(config.verification_mode || "")}</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										{isEditing ? (
											<TextField
												size="small"
												type="number"
												value={editValues.batch_size || ""}
												onChange={(e) => setEditValues({ ...editValues, batch_size: Number(e.target.value) })}
												sx={{ width: 80 }}
											/>
										) : (
											<Typography variant="body2">{config.batch_size}</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										{isEditing ? (
											<FormControl size="small" sx={{ minWidth: 120 }}>
												<Select
													value={editValues.captcha?.defaultProvider || config.captcha?.defaultProvider || "2captcha"}
													onChange={(e) =>
														setEditValues({
															...editValues,
															captcha: {
																...editValues.captcha,
																defaultProvider: e.target.value,
															},
														})
													}
												>
													{CAPTCHA_PROVIDER_OPTIONS.map((option) => (
														<MenuItem key={option.value} value={option.value}>
															{option.label}
														</MenuItem>
													))}
												</Select>
											</FormControl>
										) : (
											<Chip label={config.captcha?.defaultProvider || "2captcha"} size="small" color="secondary" variant="outlined" />
										)}
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" fontWeight={500}>
											{config.documents_verified?.toLocaleString() || 0}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color="success.main" fontWeight={500}>
											{config.documents_valid?.toLocaleString() || 0}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color="error.main" fontWeight={500}>
											{config.documents_invalid?.toLocaleString() || 0}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Switch
											checked={isEditing ? editValues.enabled : config.enabled}
											onChange={() => {
												if (isEditing) {
													setEditValues({ ...editValues, enabled: !editValues.enabled });
												} else {
													handleToggleEnabled(config);
												}
											}}
											size="small"
											color="primary"
										/>
									</TableCell>
									<TableCell align="center">
										<Typography variant="caption">{formatDate(config.last_check)}</Typography>
									</TableCell>
									<TableCell align="center">
										{isEditing ? (
											<Stack direction="row" spacing={1} justifyContent="center">
												<Tooltip title="Guardar">
													<IconButton size="small" color="primary" onClick={handleSave}>
														<TickCircle size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Cancelar">
													<IconButton size="small" color="error" onClick={handleCancelEdit}>
														<CloseCircle size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										) : (
											<Stack direction="row" spacing={1} justifyContent="center">
												<Tooltip title="Editar">
													<IconButton size="small" color="primary" onClick={() => handleEdit(config)}>
														<Edit2 size={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Configuración Avanzada">
													<IconButton size="small" color="secondary" onClick={() => handleAdvancedConfig(config)}>
														<Setting2 size={18} />
													</IconButton>
												</Tooltip>
											</Stack>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>

			{/* Estadísticas */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Workers
							</Typography>
							<Typography variant="h4">{configs.length}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Workers Activos
							</Typography>
							<Typography variant="h4" color="success.main">
								{configs.filter((c) => c.enabled).length}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Verificados
							</Typography>
							<Typography variant="h4">{configs.reduce((acc, c) => acc + (c.documents_verified || 0), 0).toLocaleString()}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Tasa de Éxito
							</Typography>
							<Typography variant="h4" color="info.main">
								{(() => {
									const total = configs.reduce((acc, c) => acc + (c.documents_verified || 0), 0);
									const valid = configs.reduce((acc, c) => acc + (c.documents_valid || 0), 0);
									return total > 0 ? `${((valid / total) * 100).toFixed(1)}%` : "0%";
								})()}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Información adicional */}
			{configs.length > 0 && configs[0].captcha && (
				<Alert severity="info" variant="outlined">
					<Typography variant="subtitle2">
						Proveedor de Captcha: <strong>{configs[0].captcha.defaultProvider}</strong>
					</Typography>
				</Alert>
			)}

			{/* Modal de configuración avanzada */}
			{selectedConfig && (
				<AdvancedConfigModal
					open={advancedConfigOpen}
					onClose={handleCloseAdvancedConfig}
					config={selectedConfig}
					onUpdate={fetchConfigs}
					workerType="verificacion"
				/>
			)}
		</Stack>
	);
};

export default VerificationWorker;
