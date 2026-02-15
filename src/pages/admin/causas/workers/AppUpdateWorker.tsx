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
	LinearProgress,
	Tabs,
	Tab,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Edit2, TickCircle, CloseCircle, Refresh, Setting2, InfoCircle, Chart, People, MessageQuestion } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkerConfig } from "api/workers";
import WorkersPjnService from "api/workersPjn";
import AdvancedConfigModal from "./AdvancedConfigModal";
import ManagerConfigPanel from "./ManagerConfigPanel";
import WorkerStatistics from "./WorkerStatistics";

// Enums para el worker de actualización
const UPDATE_MODE_OPTIONS = [
	{ value: "all", label: "Todos los documentos" },
	{ value: "single", label: "Documento único" },
];

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
			id={`vertical-tabpanel-${index}`}
			aria-labelledby={`vertical-tab-${index}`}
			style={{ width: "100%" }}
			{...other}
		>
			{value === index && <Box sx={{ pl: { xs: 0, md: 3 }, pt: { xs: 2, md: 0 } }}>{children}</Box>}
		</div>
	);
}

const AppUpdateWorker = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [configs, setConfigs] = useState<WorkerConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Partial<WorkerConfig>>({});
	const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
	const [selectedConfig, setSelectedConfig] = useState<WorkerConfig | null>(null);
	const [activeTab, setActiveTab] = useState(0);

	// Helper para obtener label del modo de actualización
	const getUpdateModeLabel = (value: string) => {
		return UPDATE_MODE_OPTIONS.find((opt) => opt.value === value)?.label || value;
	};

	// Cargar configuraciones
	const fetchConfigs = async () => {
		try {
			setLoading(true);
			const response = await WorkersPjnService.getAppUpdateConfigs({ page: 1, limit: 20 });
			if (response.success && Array.isArray(response.data)) {
				setConfigs(response.data);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar las configuraciones de actualización", {
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

	// Calcular tasa de éxito
	const calculateSuccessRate = (config: WorkerConfig): number => {
		const checked = config.documents_checked || 0;
		const updated = config.documents_updated || 0;
		if (checked === 0) return 0;
		return (updated / checked) * 100;
	};

	// Manejar edición
	const handleEdit = (config: WorkerConfig) => {
		const id = getConfigId(config);
		setEditingId(id);
		setEditValues({
			worker_id: config.worker_id,
			enabled: config.enabled,
			batch_size: config.batch_size,
			last_update_threshold_hours: config.last_update_threshold_hours,
		});
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditValues({});
	};

	const handleSave = async () => {
		if (!editingId) return;

		try {
			const response = await WorkersPjnService.updateAppUpdateConfig(editingId, editValues);
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
			const response = await WorkersPjnService.updateAppUpdateConfig(id, {
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

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Contenido del tab de Manager
	const ManagerContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			<ManagerConfigPanel />
		</Stack>
	);

	// Contenido del tab de Workers
	const WorkersContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Información detallada del worker */}
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent sx={{ py: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Elegibilidad de Documentos - Worker de Actualización
					</Typography>
					<Grid container spacing={1.5}>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">Source:</Typography>
								<Typography variant="caption" fontWeight={500}>"app"</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">Verified (req):</Typography>
								<Typography variant="caption" fontWeight={500}>true</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">isValid (req):</Typography>
								<Typography variant="caption" fontWeight={500}>true</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">Update:</Typography>
								<Typography variant="caption" fontWeight={500}>true</Typography>
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Tabla de configuraciones */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Worker ID</TableCell>
							<TableCell>Modo</TableCell>
							<TableCell align="center">Lote</TableCell>
							<TableCell align="center">Umbral (h)</TableCell>
							<TableCell align="center">Verificados</TableCell>
							<TableCell align="center">Actualizados</TableCell>
							<TableCell align="center">Fallidos</TableCell>
							<TableCell align="center">Tasa</TableCell>
							<TableCell align="center">Estado</TableCell>
							<TableCell align="center">Última Verif.</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{configs.map((config) => {
							const configId = getConfigId(config);
							const isEditing = editingId === configId;
							const successRate = calculateSuccessRate(config);

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
											<Typography variant="body2" fontWeight={500}>{config.worker_id}</Typography>
										)}
									</TableCell>
									<TableCell>
										<Chip
											label={getUpdateModeLabel(config.update_mode || "")}
											size="small"
											color={config.update_mode === "all" ? "secondary" : "default"}
											variant="outlined"
										/>
									</TableCell>
									<TableCell align="center">
										{isEditing ? (
											<TextField
												size="small"
												type="number"
												value={editValues.batch_size || ""}
												onChange={(e) => setEditValues({ ...editValues, batch_size: Number(e.target.value) })}
												sx={{ width: 60 }}
											/>
										) : (
											<Typography variant="body2">{config.batch_size}</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										{isEditing ? (
											<TextField
												size="small"
												type="number"
												value={editValues.last_update_threshold_hours || ""}
												onChange={(e) => setEditValues({ ...editValues, last_update_threshold_hours: Number(e.target.value) })}
												sx={{ width: 60 }}
											/>
										) : (
											<Typography variant="body2">{config.last_update_threshold_hours || 0}</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" fontWeight={500}>{config.documents_checked?.toLocaleString() || 0}</Typography>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color="success.main" fontWeight={500}>{config.documents_updated?.toLocaleString() || 0}</Typography>
									</TableCell>
									<TableCell align="center">
										<Typography variant="body2" color="error.main" fontWeight={500}>{config.documents_failed?.toLocaleString() || 0}</Typography>
									</TableCell>
									<TableCell align="center">
										<Box sx={{ width: 80 }}>
											<LinearProgress
												variant="determinate"
												value={successRate}
												color={successRate > 50 ? "success" : successRate > 25 ? "warning" : "error"}
												sx={{ height: 6, borderRadius: 3 }}
											/>
											<Typography variant="caption" color="text.secondary">{successRate.toFixed(1)}%</Typography>
										</Box>
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
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Guardar">
													<IconButton size="small" color="primary" onClick={handleSave}>
														<TickCircle size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Cancelar">
													<IconButton size="small" color="error" onClick={handleCancelEdit}>
														<CloseCircle size={16} />
													</IconButton>
												</Tooltip>
											</Stack>
										) : (
											<Stack direction="row" spacing={0.5} justifyContent="center">
												<Tooltip title="Editar">
													<IconButton size="small" color="primary" onClick={() => handleEdit(config)}>
														<Edit2 size={16} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Config. Avanzada">
													<IconButton size="small" color="secondary" onClick={() => handleAdvancedConfig(config)}>
														<Setting2 size={16} />
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

			{/* Estadísticas rápidas */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Total Workers</Typography>
							<Typography variant="h5">{configs.length}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Activos</Typography>
							<Typography variant="h5" color="success.main">{configs.filter((c) => c.enabled).length}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Actualizados</Typography>
							<Typography variant="h5" color="info.main">{configs.reduce((acc, c) => acc + (c.documents_updated || 0), 0).toLocaleString()}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Tasa Global</Typography>
							<Typography variant="h5" color="warning.main">
								{(() => {
									const totalChecked = configs.reduce((acc, c) => acc + (c.documents_checked || 0), 0);
									const totalUpdated = configs.reduce((acc, c) => acc + (c.documents_updated || 0), 0);
									return totalChecked > 0 ? `${((totalUpdated / totalChecked) * 100).toFixed(1)}%` : "0%";
								})()}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Nota */}
			<Alert severity="warning" variant="outlined">
				<Typography variant="body2">
					<strong>Umbral de actualización:</strong> Define cuántas horas deben pasar desde la última actualización antes de verificar nuevamente. Un valor más bajo = verificaciones más frecuentes pero mayor consumo de recursos.
				</Typography>
			</Alert>
		</Stack>
	);

	// Contenido del tab de Ayuda
	const HelpContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Guía de Funcionamiento */}
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
						<InfoCircle size={20} color={theme.palette.info.main} />
						<Typography variant="h6">Guía de Funcionamiento del Worker</Typography>
					</Stack>

					{/* Descripción General */}
					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Descripción General
						</Typography>
						<Typography variant="body2" paragraph>
							El Worker de Actualización es un proceso automatizado que mantiene actualizados los expedientes judiciales verificando
							periódicamente si existen nuevos movimientos o cambios en el sistema del Poder Judicial de la Nación.
						</Typography>
					</Box>

					{/* Horario de Operación */}
					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Horario de Operación
						</Typography>
						<Box sx={{ pl: 2 }}>
							<Typography variant="body2">• Días laborables: Lunes a Viernes</Typography>
							<Typography variant="body2">• Horario: 10:00 a 20:00 (hora Argentina)</Typography>
							<Typography variant="body2">• Frecuencia de ejecución: Cada 2 minutos durante el horario activo</Typography>
						</Box>
					</Box>

					{/* Ciclo de Actualización */}
					<Box sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Ciclo de Actualización
						</Typography>
						<Box sx={{ mt: 2 }}>
							<Typography variant="subtitle2" fontWeight="bold" color="success.main" gutterBottom>
								Actualización Exitosa
							</Typography>
							<Box sx={{ pl: 2 }}>
								<Typography variant="body2">• Período de espera: Según threshold configurado</Typography>
								<Typography variant="body2">• Aplica tanto si se encontraron nuevos movimientos como si no hubo cambios</Typography>
							</Box>
						</Box>
						<Box sx={{ mt: 2 }}>
							<Typography variant="subtitle2" fontWeight="bold" color="error.main" gutterBottom>
								Errores y Reintentos
							</Typography>
							<Box sx={{ pl: 2 }}>
								<Typography variant="body2">• Error de Captcha, expediente no encontrado, balance insuficiente: Reintento automático cada 2 minutos</Typography>
							</Box>
						</Box>
					</Box>

					<Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
						<Typography variant="body2" color="text.secondary">
							Esta configuración asegura un balance óptimo entre mantener la información actualizada y el uso eficiente de recursos.
						</Typography>
					</Box>
				</CardContent>
			</Card>
		</Stack>
	);

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
		<Stack spacing={2}>
			{/* Header */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Worker de Actualización (App)</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfigs}>
					Actualizar
				</Button>
			</Box>

			{/* Información del worker */}
			<Alert severity="info" variant="outlined" sx={{ py: 1 }}>
				<Typography variant="body2">
					Este worker mantiene actualizados los documentos de causas judiciales, verificando periódicamente cambios en los expedientes.
				</Typography>
			</Alert>

			{/* Layout con tabs laterales */}
			<Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" } }}>
				{/* Tabs laterales */}
				<Tabs
					orientation="vertical"
					variant="scrollable"
					value={activeTab}
					onChange={handleTabChange}
					sx={{
						borderRight: { md: 1 },
						borderBottom: { xs: 1, md: 0 },
						borderColor: "divider",
						minWidth: { md: 200 },
						"& .MuiTab-root": {
							alignItems: "flex-start",
							textAlign: "left",
							minHeight: 60,
							px: 2,
						},
					}}
				>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<Setting2 size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Manager</Typography>
									<Typography variant="caption" color="text.secondary">Config. general</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<People size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Workers</Typography>
									<Typography variant="caption" color="text.secondary">Config. workers</Typography>
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
									<Typography variant="body2" fontWeight={500}>Estadísticas</Typography>
									<Typography variant="caption" color="text.secondary">Por fuero y día</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
					<Tab
						label={
							<Stack direction="row" spacing={1.5} alignItems="center">
								<MessageQuestion size={20} />
								<Box>
									<Typography variant="body2" fontWeight={500}>Ayuda</Typography>
									<Typography variant="caption" color="text.secondary">Guía de uso</Typography>
								</Box>
							</Stack>
						}
						sx={{ textTransform: "none" }}
					/>
				</Tabs>

				{/* Contenido de los tabs */}
				<TabPanel value={activeTab} index={0}>
					<ManagerContent />
				</TabPanel>
				<TabPanel value={activeTab} index={1}>
					<WorkersContent />
				</TabPanel>
				<TabPanel value={activeTab} index={2}>
					<WorkerStatistics />
				</TabPanel>
				<TabPanel value={activeTab} index={3}>
					<HelpContent />
				</TabPanel>
			</Box>

			{/* Modal de configuración avanzada */}
			{selectedConfig && (
				<AdvancedConfigModal
					open={advancedConfigOpen}
					onClose={handleCloseAdvancedConfig}
					config={selectedConfig}
					onUpdate={fetchConfigs}
					workerType="app-update"
				/>
			)}
		</Stack>
	);
};

export default AppUpdateWorker;
