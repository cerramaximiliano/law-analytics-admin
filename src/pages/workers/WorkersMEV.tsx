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
	Tabs,
	Tab,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Collapse,
	useTheme,
	alpha,
} from "@mui/material";
import { Edit2, TickCircle, CloseCircle, Refresh, Calendar, ArrowDown2, ArrowUp2, InfoCircle, Eye, EyeSlash, Setting2, TickSquare, DocumentUpload, Refresh2, Setting, People, Warning2 } from "iconsax-react";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { TabPanel } from "components/ui-component/TabPanel";
import MEVWorkersService, { MEVWorkerConfig, SystemConfig } from "api/workersMEV";
import SyncCheckTab from "./SyncCheckTab";
import WorkerManagerTab from "./WorkerManagerTab";
import ScbaManagerTab from "./ScbaManagerTab";
import JurisdictionStatusTab from "./JurisdictionStatusTab";

interface WorkerTab {
	label: string;
	value: string;
	icon: React.ReactNode;
	component: React.ReactNode;
	description: string;
	status?: "active" | "inactive" | "error";
	badge?: string;
	ip?: string;
}

const MEVWorkers = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState("manager");
	const [configs, setConfigs] = useState<MEVWorkerConfig[]>([]);
	const [systemConfigs, setSystemConfigs] = useState<SystemConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingSystem, setLoadingSystem] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
	const [editValues, setEditValues] = useState<Partial<MEVWorkerConfig>>({});
	const [editSystemValues, setEditSystemValues] = useState<Partial<SystemConfig>>({});
	const [hasError, setHasError] = useState(false);
	const [authError, setAuthError] = useState(false);
	const [systemAuthError, setSystemAuthError] = useState(false);
	const [passwordModalOpen, setPasswordModalOpen] = useState(false);
	const [passwordModalUserId, setPasswordModalUserId] = useState<string>("");
	const [passwordChangeDate, setPasswordChangeDate] = useState<Dayjs | null>(dayjs());
	const [instructionsOpen, setInstructionsOpen] = useState(false);
	const [workerGuideOpen, setWorkerGuideOpen] = useState(false);
	const [workerInfoModalOpen, setWorkerInfoModalOpen] = useState(false);
	const [guideModalOpen, setGuideModalOpen] = useState(false);
	const [eligibilityModalOpen, setEligibilityModalOpen] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [editingCredentials, setEditingCredentials] = useState(false);
	const [credentialForm, setCredentialForm] = useState({ username: "", password: "" });

	// Cargar configuraciones del sistema
	const fetchSystemConfigs = async () => {
		try {
			setLoadingSystem(true);
			setSystemAuthError(false);
			const response = await MEVWorkersService.getSystemConfigs();
			console.log("System Configs Response:", response);
			if (response.success && Array.isArray(response.data)) {
				setSystemConfigs(response.data);
			} else if (Array.isArray(response)) {
				setSystemConfigs(response);
			} else {
				setSystemConfigs([]);
			}
		} catch (error: any) {
			// Detectar si es un error de autenticación
			if (error.message?.includes("autenticación") || error.message?.includes("401")) {
				setSystemAuthError(true);
			}
			enqueueSnackbar(error.message || "Error al cargar las configuraciones del sistema", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setSystemConfigs([]);
		} finally {
			setLoadingSystem(false);
		}
	};

	// Cargar configuraciones
	const fetchConfigs = async () => {
		// Si ya hay un error, no intentar de nuevo
		if (hasError) {
			return;
		}

		try {
			setLoading(true);
			setAuthError(false);
			const response = await MEVWorkersService.getVerificationConfigs();

			if (response.success && Array.isArray(response.data)) {
				setConfigs(response.data);
				setHasError(false);
			} else if (Array.isArray(response)) {
				// Si la respuesta es directamente un array
				setConfigs(response);
				setHasError(false);
			} else {
				setConfigs([]);
			}
		} catch (error: any) {
			setHasError(true); // Marcar que hubo error para no reintentar
			// Detectar si es un error de autenticación
			if (error.message?.includes("autenticación") || error.message?.includes("401")) {
				setAuthError(true);
			}
			enqueueSnackbar(error.message || "Error al cargar las configuraciones", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			// No lanzar el error para evitar que la página falle
			setConfigs([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// Solo cargar una vez al montar el componente
		let mounted = true;

		if (mounted) {
			fetchConfigs();
		}

		return () => {
			mounted = false;
		};
	}, []); // Dependencias vacías para ejecutar solo una vez

	// Cargar configuraciones del sistema cuando se cambie a esa tab
	useEffect(() => {
		if (activeTab === "system-config" && systemConfigs.length === 0) {
			fetchSystemConfigs();
		}
	}, [activeTab]);

	// Formatear fecha
	const formatDate = (date: string | undefined): string => {
		if (!date) return "N/A";
		return new Date(date).toLocaleString("es-ES");
	};

	// Formatear fecha con tiempo transcurrido
	const formatDateWithElapsed = (date: string | undefined): { formatted: string; elapsed: string } => {
		if (!date) return { formatted: "N/A", elapsed: "" };

		const dateObj = new Date(date);
		const now = new Date();
		const diffMs = now.getTime() - dateObj.getTime();

		// Calcular diferencias
		const diffSeconds = Math.floor(diffMs / 1000);
		const diffMinutes = Math.floor(diffSeconds / 60);
		const diffHours = Math.floor(diffMinutes / 60);
		const diffDays = Math.floor(diffHours / 24);

		let elapsed = "";
		if (diffDays > 0) {
			elapsed = `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
		} else if (diffHours > 0) {
			elapsed = `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
		} else if (diffMinutes > 0) {
			elapsed = `hace ${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
		} else {
			elapsed = `hace ${diffSeconds} segundo${diffSeconds > 1 ? "s" : ""}`;
		}

		return {
			formatted: dateObj.toLocaleString("es-ES"),
			elapsed,
		};
	};

	// Manejar edición
	const handleEdit = (config: MEVWorkerConfig) => {
		setEditingId(config._id);
		setEditValues({
			worker_id: config.worker_id,
			jurisdiccion: config.jurisdiccion,
			tipo_organismo: config.tipo_organismo,
			verification_mode: config.verification_mode,
			enabled: config.enabled,
			batch_size: config.batch_size,
			delay_between_searches: config.delay_between_searches,
			max_retries: config.max_retries,
			settings: {
				...config.settings,
				max_movimientos: config.settings?.max_movimientos,
				update_frequency_hours: config.settings?.update_frequency_hours,
			},
		});
	};

	const handleCancelEdit = () => {
		setEditingId(null);
		setEditValues({});
	};

	const handleSave = async () => {
		if (!editingId) return;

		try {
			const response = await MEVWorkersService.updateVerificationConfig(editingId, editValues);
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

	const handleToggleEnabled = async (config: MEVWorkerConfig) => {
		try {
			const response = await MEVWorkersService.toggleVerificationConfig(config._id);
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

	// Manejar edición de configuración del sistema
	const handleEditSystem = (config: SystemConfig) => {
		setEditingSystemId(config._id);
		setEditSystemValues({
			value: config.value,
		});
	};

	const handleCancelEditSystem = () => {
		setEditingSystemId(null);
		setEditSystemValues({});
	};

	const handleSaveSystem = async () => {
		if (!editingSystemId) return;

		// Buscar la configuración actual para obtener userId y key
		const currentConfig = systemConfigs.find((c) => c._id === editingSystemId);
		if (!currentConfig) return;

		try {
			const response = await MEVWorkersService.updateSystemConfig(currentConfig.userId, currentConfig.key, editSystemValues.value);
			if (response.success) {
				enqueueSnackbar("Configuración del sistema actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchSystemConfigs();
				handleCancelEditSystem();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar la configuración del sistema", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Manejar actualización de fecha de contraseña
	const handleOpenPasswordModal = (userId: string) => {
		setPasswordModalUserId(userId);
		setPasswordChangeDate(dayjs());
		setPasswordModalOpen(true);
	};

	const handleClosePasswordModal = () => {
		setPasswordModalOpen(false);
		setPasswordModalUserId("");
		setPasswordChangeDate(dayjs());
	};

	const handleUpdatePasswordDate = async () => {
		if (!passwordChangeDate || !passwordModalUserId) return;

		try {
			const response = await MEVWorkersService.updatePasswordDate(passwordModalUserId, passwordChangeDate.toISOString());
			if (response.success) {
				enqueueSnackbar("Fecha de contraseña actualizada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchSystemConfigs();
				handleClosePasswordModal();
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar fecha de contraseña", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Verificar si un campo es de contraseña
	const isPasswordField = (key: string): boolean => {
		return key === "password_last_change" || key === "password_expires_at";
	};

	// Formatear valor según tipo de dato
	const formatSystemValue = (value: any, dataType: string): string => {
		switch (dataType) {
			case "date":
				return value ? new Date(value).toLocaleString("es-ES") : "N/A";
			case "boolean":
				return value ? "Sí" : "No";
			case "number":
				return value?.toLocaleString() || "0";
			case "json":
				return typeof value === "object" ? JSON.stringify(value, null, 2) : value;
			default:
				return value?.toString() || "";
		}
	};

	const handleStartEditCredentials = () => {
		const sharedWorker = configs.find((c) => c.worker_id === "shared");
		if (sharedWorker) {
			setCredentialForm({
				username: sharedWorker.login?.username ?? "",
				password: sharedWorker.login?.password ?? "",
			});
			setEditingCredentials(true);
		}
	};

	const handleSaveCredentials = async () => {
		const sharedWorker = configs.find((c) => c.worker_id === "shared");
		if (!sharedWorker) return;
		try {
			const response = await MEVWorkersService.updateVerificationConfig(sharedWorker._id, {
				login: {
					...sharedWorker.login,
					username: credentialForm.username,
					password: credentialForm.password,
				},
			} as any);
			if (response.success) {
				enqueueSnackbar("Credenciales actualizadas exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				await fetchConfigs();
				setEditingCredentials(false);
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al actualizar credenciales", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
		setActiveTab(newValue);
	};

	const getStatusColor = (status?: string) => {
		switch (status) {
			case "active":
				return theme.palette.success.main;
			case "inactive":
				return theme.palette.warning.main;
			case "error":
				return theme.palette.error.main;
			default:
				return theme.palette.grey[500];
		}
	};

	if (loading) {
		return (
			<MainCard title="Workers MEV">
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					{[1, 2, 3, 4].map((item) => (
						<Grid item xs={12} key={item}>
							<Skeleton variant="rectangular" height={80} />
						</Grid>
					))}
				</Grid>
			</MainCard>
		);
	}

	// Filtrar workers de verificación (excluir los de actualización)
	const verificationConfigs = configs.filter((c) => c.verification_mode !== "update");
	// Filtrar workers de actualización
	const updateConfigs = configs.filter((c) => c.verification_mode === "update");

	// Componente de Worker de Verificación
	const VerificationWorkerContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Header con acciones */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración del Worker de Verificación MEV</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfigs}>
					Actualizar
				</Button>
			</Box>

			{/* Cards de información en una sola línea */}
			<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
				{/* Información del worker */}
				<Grid item xs={12} md={4}>
					<Card
						variant="outlined"
						sx={{
							backgroundColor: "background.paper",
							height: "100%",
							cursor: "pointer",
							transition: "all 0.2s",
							"&:hover": {
								boxShadow: 2,
								transform: "translateY(-2px)",
							},
						}}
						onClick={() => setWorkerInfoModalOpen(true)}
					>
						<CardContent>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								<InfoCircle size={24} color={theme.palette.info.main} />
								<Typography variant="subtitle2" fontWeight="bold" color="info.main">
									Worker de Verificación
								</Typography>
							</Stack>
							<Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
								Click para ver detalles
							</Typography>
						</CardContent>
					</Card>
				</Grid>

				{/* Guía de Uso del Worker */}
				<Grid item xs={12} md={4}>
					<Card
						variant="outlined"
						sx={{
							backgroundColor: "background.paper",
							height: "100%",
							cursor: "pointer",
							transition: "all 0.2s",
							"&:hover": {
								boxShadow: 2,
								transform: "translateY(-2px)",
							},
						}}
						onClick={() => setGuideModalOpen(true)}
					>
						<CardContent>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								<InfoCircle size={24} color={theme.palette.info.main} />
								<Typography variant="subtitle2" fontWeight="bold" color="primary">
									Guía de Funcionamiento
								</Typography>
							</Stack>
							<Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
								Click para ver guía completa
							</Typography>
						</CardContent>
					</Card>
				</Grid>

				{/* Información detallada del worker */}
				<Grid item xs={12} md={4}>
					<Card
						variant="outlined"
						sx={{
							backgroundColor: "background.default",
							height: "100%",
							cursor: "pointer",
							transition: "all 0.2s",
							"&:hover": {
								boxShadow: 2,
								transform: "translateY(-2px)",
							},
						}}
						onClick={() => setEligibilityModalOpen(true)}
					>
						<CardContent>
							<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
								<InfoCircle size={24} color={theme.palette.text.secondary} />
								<Typography variant="subtitle2" fontWeight="bold">
									Elegibilidad de Documentos
								</Typography>
							</Stack>
							<Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
								Click para ver criterios
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Contenido guardado para modales - oculto */}
			<Box sx={{ display: "none" }}>
				<Grid container spacing={1.5} sx={{ mt: 1 }}>
					<Grid item xs={6} sm={3}>
						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="caption" color="text.secondary">
								Source:
							</Typography>
							<Typography variant="caption" fontWeight={500}>
								"mev"
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
			</Box>

			{/* Tabla de configuraciones */}
			{authError ? (
				<Alert severity="error" icon={<InfoCircle size={24} />}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error de Autenticación
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						No se pudo cargar la configuración del Worker de Verificación debido a un problema de autenticación. Por favor, verifique sus
						credenciales e intente nuevamente.
					</Typography>
					<Button
						size="small"
						variant="outlined"
						sx={{ mt: 2 }}
						onClick={() => {
							setAuthError(false);
							setHasError(false);
							fetchConfigs();
						}}
					>
						Reintentar
					</Button>
				</Alert>
			) : (
				<>
					{/* Tabla del Worker Principal (shared) */}
					{(() => {
						const sharedWorker = verificationConfigs.find((c) => c.worker_id === "shared");
						if (sharedWorker) {
							return (
								<>
									<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
										Worker Principal - Configuración Completa
									</Typography>
									<TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
										<Table>
											<TableHead>
												<TableRow>
													<TableCell>Worker ID</TableCell>
													<TableCell align="center">Tamaño Lote</TableCell>
													<TableCell align="center">Delay (ms)</TableCell>
													<TableCell align="center">Reintentos</TableCell>
													<TableCell align="center">Max Movimientos</TableCell>
													<TableCell align="center">Verificados</TableCell>
													<TableCell align="center">Válidos</TableCell>
													<TableCell align="center">No Encontrados</TableCell>
													<TableCell align="center">Estado</TableCell>
													<TableCell align="center">Última Verificación</TableCell>
													<TableCell align="center">Acciones</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{(() => {
													const config = sharedWorker;
													const isEditing = editingId === config._id;

													return (
														<TableRow key={config._id}>
															<TableCell>
																{isEditing ? (
																	<TextField
																		size="small"
																		value={editValues.worker_id || ""}
																		onChange={(e) => setEditValues({ ...editValues, worker_id: e.target.value })}
																		fullWidth
																	/>
																) : (
																	<Chip label={config.worker_id} color="primary" variant="filled" size="small" />
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
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.delay_between_searches || ""}
																		onChange={(e) => setEditValues({ ...editValues, delay_between_searches: Number(e.target.value) })}
																		sx={{ width: 100 }}
																	/>
																) : (
																	<Typography variant="body2">{config.delay_between_searches}</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																{isEditing ? (
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.max_retries || ""}
																		onChange={(e) => setEditValues({ ...editValues, max_retries: Number(e.target.value) })}
																		sx={{ width: 80 }}
																	/>
																) : (
																	<Typography variant="body2">{config.max_retries}</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																{isEditing ? (
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.settings?.max_movimientos ?? ""}
																		onChange={(e) =>
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					max_movimientos: Number(e.target.value),
																				},
																			})
																		}
																		sx={{ width: 90 }}
																		placeholder="0 = Todos"
																	/>
																) : (
																	<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
																		<Typography variant="body2">{config.settings?.max_movimientos ?? 0}</Typography>
																		{(config.settings?.max_movimientos === 0 || !config.settings?.max_movimientos) && (
																			<Chip label="Todos" size="small" color="info" variant="outlined" />
																		)}
																	</Stack>
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
																<Typography variant="body2" color="warning.main" fontWeight={500}>
																	{config.documents_not_found?.toLocaleString() || 0}
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
																{(() => {
																	const dateInfo = formatDateWithElapsed(config.last_check);
																	return (
																		<Stack spacing={0.5}>
																			<Typography variant="caption">{dateInfo.formatted}</Typography>
																			{dateInfo.elapsed && (
																				<Typography variant="caption" color="text.secondary">
																					({dateInfo.elapsed})
																				</Typography>
																			)}
																		</Stack>
																	);
																})()}
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
																	<Tooltip title="Editar">
																		<IconButton size="small" color="primary" onClick={() => handleEdit(config)}>
																			<Edit2 size={18} />
																		</IconButton>
																	</Tooltip>
																)}
															</TableCell>
														</TableRow>
													);
												})()}
											</TableBody>
										</Table>
									</TableContainer>

									{/* Configuración de Headless por Ambiente */}
									<Card variant="outlined" sx={{ mt: 3, backgroundColor: "background.default" }}>
										<CardContent>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												🌍 Configuración de Headless por Ambiente
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
												Controla si el navegador se ejecuta en modo headless (sin interfaz gráfica) según el ambiente.
												En producción debería estar activado para mejor rendimiento.
											</Typography>
											<Grid container spacing={3}>
												<Grid item xs={12} sm={6}>
													<Card variant="outlined" sx={{ backgroundColor: "warning.lighter" }}>
														<CardContent>
															<Stack direction="row" justifyContent="space-between" alignItems="center">
																<Box>
																	<Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
																		🛠️ DEVELOPMENT
																	</Typography>
																	<Typography variant="caption" color="text.secondary">
																		Modo desarrollo - Browser visible para debug
																	</Typography>
																</Box>
																<Switch
																	checked={
																		editingId === sharedWorker._id
																			? editValues.settings?.environments?.development?.headless ?? false
																			: sharedWorker.settings?.environments?.development?.headless ?? false
																	}
																	onChange={() => {
																		if (editingId === sharedWorker._id) {
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					environments: {
																						...editValues.settings?.environments,
																						development: {
																							...editValues.settings?.environments?.development,
																							headless: !editValues.settings?.environments?.development?.headless,
																						},
																					},
																				},
																			});
																		} else {
																			handleEdit(sharedWorker);
																			setTimeout(() => {
																				setEditValues((prev) => ({
																					...prev,
																					settings: {
																						...prev.settings,
																						environments: {
																							...prev.settings?.environments,
																							development: {
																								...prev.settings?.environments?.development,
																								headless: !sharedWorker.settings?.environments?.development?.headless,
																							},
																						},
																					},
																				}));
																			}, 0);
																		}
																	}}
																	color="warning"
																/>
															</Stack>
															<Chip
																label={
																	(editingId === sharedWorker._id
																		? editValues.settings?.environments?.development?.headless
																		: sharedWorker.settings?.environments?.development?.headless) ?? false
																		? "Headless: ON"
																		: "Headless: OFF"
																}
																size="small"
																color={
																	(editingId === sharedWorker._id
																		? editValues.settings?.environments?.development?.headless
																		: sharedWorker.settings?.environments?.development?.headless) ?? false
																		? "success"
																		: "warning"
																}
																sx={{ mt: 1 }}
															/>
														</CardContent>
													</Card>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Card variant="outlined" sx={{ backgroundColor: "success.lighter" }}>
														<CardContent>
															<Stack direction="row" justifyContent="space-between" alignItems="center">
																<Box>
																	<Typography variant="subtitle2" fontWeight="bold" color="success.dark">
																		🚀 PRODUCTION
																	</Typography>
																	<Typography variant="caption" color="text.secondary">
																		Modo producción - Sin interfaz gráfica
																	</Typography>
																</Box>
																<Switch
																	checked={
																		editingId === sharedWorker._id
																			? editValues.settings?.environments?.production?.headless ?? true
																			: sharedWorker.settings?.environments?.production?.headless ?? true
																	}
																	onChange={() => {
																		if (editingId === sharedWorker._id) {
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					environments: {
																						...editValues.settings?.environments,
																						production: {
																							...editValues.settings?.environments?.production,
																							headless: !editValues.settings?.environments?.production?.headless,
																						},
																					},
																				},
																			});
																		} else {
																			handleEdit(sharedWorker);
																			setTimeout(() => {
																				setEditValues((prev) => ({
																					...prev,
																					settings: {
																						...prev.settings,
																						environments: {
																							...prev.settings?.environments,
																							production: {
																								...prev.settings?.environments?.production,
																								headless: !(sharedWorker.settings?.environments?.production?.headless ?? true),
																							},
																						},
																					},
																				}));
																			}, 0);
																		}
																	}}
																	color="success"
																/>
															</Stack>
															<Chip
																label={
																	(editingId === sharedWorker._id
																		? editValues.settings?.environments?.production?.headless
																		: sharedWorker.settings?.environments?.production?.headless) ?? true
																		? "Headless: ON"
																		: "Headless: OFF"
																}
																size="small"
																color={
																	(editingId === sharedWorker._id
																		? editValues.settings?.environments?.production?.headless
																		: sharedWorker.settings?.environments?.production?.headless) ?? true
																		? "success"
																		: "error"
																}
																sx={{ mt: 1 }}
															/>
														</CardContent>
													</Card>
												</Grid>
											</Grid>
											{editingId === sharedWorker._id && (
												<Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
													<Button size="small" variant="outlined" color="error" onClick={handleCancelEdit}>
														Cancelar
													</Button>
													<Button size="small" variant="contained" color="primary" onClick={handleSave}>
														Guardar Cambios
													</Button>
												</Box>
											)}
										</CardContent>
									</Card>
								</>
							);
						}
						return null;
					})()}

					{/* Tabla de Workers Estadísticos */}
					{(() => {
						const statsWorkers = verificationConfigs.filter((c) => c.worker_id !== "shared");
						if (statsWorkers.length > 0) {
							return (
								<>
									<Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
										Workers Estadísticos - Solo Lectura
									</Typography>
									<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
										<Typography variant="body2">
											Estos workers son utilizados únicamente con fines estadísticos. Solo se muestran métricas de verificación.
										</Typography>
									</Alert>
									<TableContainer component={Paper} variant="outlined">
										<Table>
											<TableHead>
												<TableRow>
													<TableCell>Worker ID</TableCell>
													<TableCell align="center">Verificados</TableCell>
													<TableCell align="center">Válidos</TableCell>
													<TableCell align="center">No Encontrados</TableCell>
													<TableCell align="center">Estado</TableCell>
													<TableCell align="center">Total Búsquedas</TableCell>
													<TableCell align="center">Búsquedas Exitosas</TableCell>
													<TableCell align="center">Última Verificación</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{statsWorkers.map((config) => (
													<TableRow key={config._id}>
														<TableCell>
															<Typography variant="body2" fontWeight={500}>
																{config.worker_id}
															</Typography>
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
															<Typography variant="body2" color="warning.main" fontWeight={500}>
																{config.documents_not_found?.toLocaleString() || 0}
															</Typography>
														</TableCell>
														<TableCell align="center">
															<Chip
																label={config.enabled ? "Activo" : "Inactivo"}
																color={config.enabled ? "success" : "default"}
																size="small"
															/>
														</TableCell>
														<TableCell align="center">
															<Typography variant="body2">{config.statistics?.total_searches?.toLocaleString() || 0}</Typography>
														</TableCell>
														<TableCell align="center">
															<Typography variant="body2" color="success.main">
																{config.statistics?.successful_searches?.toLocaleString() || 0}
															</Typography>
														</TableCell>
														<TableCell align="center">
															{(() => {
																const dateInfo = formatDateWithElapsed(config.last_check);
																return (
																	<Stack spacing={0.5}>
																		<Typography variant="caption">{dateInfo.formatted}</Typography>
																		{dateInfo.elapsed && (
																			<Typography variant="caption" color="text.secondary">
																				({dateInfo.elapsed})
																			</Typography>
																		)}
																	</Stack>
																);
															})()}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</>
							);
						}
						return null;
					})()}
				</>
			)}

			{/* Estadísticas */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Workers
							</Typography>
							<Typography variant="h4">{verificationConfigs.length}</Typography>
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
								{verificationConfigs.filter((c) => c.enabled).length}
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
							<Typography variant="h4">
								{verificationConfigs.reduce((acc, c) => acc + (c.documents_verified || 0), 0).toLocaleString()}
							</Typography>
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
									const total = verificationConfigs.reduce((acc, c) => acc + (c.documents_verified || 0), 0);
									const valid = verificationConfigs.reduce((acc, c) => acc + (c.documents_valid || 0), 0);
									return total > 0 ? `${((valid / total) * 100).toFixed(1)}%` : "0%";
								})()}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Información de estadísticas del worker */}
			{verificationConfigs.length > 0 && verificationConfigs[0].statistics && (
				<Card variant="outlined">
					<CardContent>
						<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
							Estadísticas del Worker
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} sm={6} md={3}>
								<Stack>
									<Typography variant="caption" color="text.secondary">
										Total Búsquedas
									</Typography>
									<Typography variant="body2" fontWeight={500}>
										{verificationConfigs[0].statistics.total_searches?.toLocaleString() || 0}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack>
									<Typography variant="caption" color="text.secondary">
										Búsquedas Exitosas
									</Typography>
									<Typography variant="body2" fontWeight={500} color="success.main">
										{verificationConfigs[0].statistics.successful_searches?.toLocaleString() || 0}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack>
									<Typography variant="caption" color="text.secondary">
										Búsquedas Fallidas
									</Typography>
									<Typography variant="body2" fontWeight={500} color="error.main">
										{verificationConfigs[0].statistics.failed_searches?.toLocaleString() || 0}
									</Typography>
								</Stack>
							</Grid>
							<Grid item xs={12} sm={6} md={3}>
								<Stack>
									<Typography variant="caption" color="text.secondary">
										Uptime (horas)
									</Typography>
									<Typography variant="body2" fontWeight={500}>
										{verificationConfigs[0].statistics.uptime_hours?.toLocaleString() || 0}
									</Typography>
								</Stack>
							</Grid>
							{verificationConfigs[0].statistics.last_error && (
								<>
									<Grid item xs={12} sm={6}>
										<Stack>
											<Typography variant="caption" color="text.secondary">
												Último Error
											</Typography>
											<Typography variant="body2" color="error.main">
												{verificationConfigs[0].statistics.last_error}
											</Typography>
										</Stack>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Stack>
											<Typography variant="caption" color="text.secondary">
												Fecha Último Error
											</Typography>
											<Typography variant="body2">{formatDate(verificationConfigs[0].statistics.last_error_date)}</Typography>
										</Stack>
									</Grid>
								</>
							)}
						</Grid>
					</CardContent>
				</Card>
			)}

			</Stack>
	);

	// Componente de Worker de Actualización
	const UpdateWorkerContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Header con acciones */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración del Worker de Actualización MEV</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchConfigs}>
					Actualizar
				</Button>
			</Box>

			{/* Información del worker */}
			<Alert severity="info" variant="outlined">
				<Typography variant="subtitle2" fontWeight="bold">
					Worker de Actualización de Causas MEV
				</Typography>
				<Typography variant="body2" sx={{ mt: 1 }}>
					Este worker se encarga de actualizar periódicamente el estado de las causas judiciales MEV que ya han sido verificadas,
					manteniendo la información actualizada en el sistema.
				</Typography>
			</Alert>

			{/* Información detallada del worker */}
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent sx={{ py: 2 }}>
					<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
						Elegibilidad de Documentos - Worker de Actualización MEV
					</Typography>
					<Grid container spacing={1.5}>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Source:
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									"mev"
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Verified (req):
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									true
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									isValid (req):
								</Typography>
								<Typography variant="caption" fontWeight={500}>
									true
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Función:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="primary.main">
									Actualización periódica
								</Typography>
							</Stack>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="caption" color="text.secondary">
									Frecuencia:
								</Typography>
								<Typography variant="caption" fontWeight={500} color="warning.main">
									Periódica
								</Typography>
							</Stack>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Cooldown por Jurisdicción No Disponible */}
			<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
				<CardContent sx={{ py: 2 }}>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
						<Warning2 size={20} />
						<Typography variant="subtitle2" fontWeight="bold">
							Cooldown por Jurisdicción No Disponible
						</Typography>
						<Chip label="1 hora" size="small" color="warning" variant="outlined" />
					</Stack>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
						Cuando el worker detecta que una jurisdicción no está disponible en el MEV, aplica un cooldown de <strong>1 hora</strong> al
						expediente para evitar reintentos inútiles mientras la jurisdicción permanece caída.
					</Typography>
					<Grid container spacing={2}>
						<Grid item xs={12} sm={4}>
							<Card variant="outlined" sx={{ height: '100%' }}>
								<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
									<Typography variant="caption" color="error.main" fontWeight="bold" gutterBottom display="block">
										Detección
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Un solo <code>JurisdictionUnavailableError</code> confirma que la jurisdicción entera está caída. No se
										acumulan errores como en PJN.
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Card variant="outlined" sx={{ height: '100%' }}>
								<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
									<Typography variant="caption" color="warning.main" fontWeight="bold" gutterBottom display="block">
										Cooldown
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Se setea <code>jurisdictionCooldown.skipUntil</code> con fecha futura (1h). La query excluye expedientes con
										cooldown activo.
									</Typography>
								</CardContent>
							</Card>
						</Grid>
						<Grid item xs={12} sm={4}>
							<Card variant="outlined" sx={{ height: '100%' }}>
								<CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
									<Typography variant="caption" color="success.main" fontWeight="bold" gutterBottom display="block">
										Auto-limpieza
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Al procesar exitosamente, el campo <code>jurisdictionCooldown</code> se elimina automáticamente.
										También aplica en el worker de verificación.
									</Typography>
								</CardContent>
							</Card>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Tabla de configuraciones */}
			{authError ? (
				<Alert severity="error" icon={<InfoCircle size={24} />}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error de Autenticación
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						No se pudo cargar la configuración del Worker de Actualización debido a un problema de autenticación. Por favor, verifique sus
						credenciales e intente nuevamente.
					</Typography>
					<Button
						size="small"
						variant="outlined"
						sx={{ mt: 2 }}
						onClick={() => {
							setAuthError(false);
							setHasError(false);
							fetchConfigs();
						}}
					>
						Reintentar
					</Button>
				</Alert>
			) : (
				<>
					{/* Tabla del Worker Principal (shared_update) */}
					{(() => {
						const sharedUpdateWorker = updateConfigs.find((c) => c.worker_id === "shared_update");
						if (sharedUpdateWorker) {
							return (
								<>
									<Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
										Worker Principal - Configuración Completa
									</Typography>
									<TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
										<Table>
											<TableHead>
												<TableRow>
													<TableCell>Worker ID</TableCell>
													<TableCell align="center">Tamaño Lote</TableCell>
													<TableCell align="center">Delay (ms)</TableCell>
													<TableCell align="center">Reintentos</TableCell>
													<TableCell align="center">Max Movimientos</TableCell>
													<TableCell align="center">Frecuencia (horas)</TableCell>
													<TableCell align="center">Actualizados</TableCell>
													<TableCell align="center">Válidos</TableCell>
													<TableCell align="center">No Encontrados</TableCell>
													<TableCell align="center">Estado</TableCell>
													<TableCell align="center">Última Actualización</TableCell>
													<TableCell align="center">Acciones</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{(() => {
													const config = sharedUpdateWorker;
													const isEditing = editingId === config._id;

													return (
														<TableRow key={config._id}>
															<TableCell>
																{isEditing ? (
																	<TextField
																		size="small"
																		value={editValues.worker_id || ""}
																		onChange={(e) => setEditValues({ ...editValues, worker_id: e.target.value })}
																		fullWidth
																	/>
																) : (
																	<Chip label={config.worker_id} color="secondary" variant="filled" size="small" />
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
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.delay_between_searches || ""}
																		onChange={(e) => setEditValues({ ...editValues, delay_between_searches: Number(e.target.value) })}
																		sx={{ width: 100 }}
																	/>
																) : (
																	<Typography variant="body2">{config.delay_between_searches}</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																{isEditing ? (
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.max_retries || ""}
																		onChange={(e) => setEditValues({ ...editValues, max_retries: Number(e.target.value) })}
																		sx={{ width: 80 }}
																	/>
																) : (
																	<Typography variant="body2">{config.max_retries}</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																{isEditing ? (
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.settings?.max_movimientos ?? ""}
																		onChange={(e) =>
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					max_movimientos: Number(e.target.value),
																				},
																			})
																		}
																		sx={{ width: 90 }}
																		placeholder="0 = Todos"
																	/>
																) : (
																	<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
																		<Typography variant="body2">{config.settings?.max_movimientos ?? 0}</Typography>
																		{(config.settings?.max_movimientos === 0 || !config.settings?.max_movimientos) && (
																			<Chip label="Todos" size="small" color="info" variant="outlined" />
																		)}
																	</Stack>
																)}
															</TableCell>
															<TableCell align="center">
																{isEditing ? (
																	<TextField
																		size="small"
																		type="number"
																		value={editValues.settings?.update_frequency_hours ?? ""}
																		onChange={(e) =>
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					update_frequency_hours: Number(e.target.value),
																				},
																			})
																		}
																		sx={{ width: 100 }}
																		placeholder="Horas"
																	/>
																) : (
																	<Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
																		<Typography variant="body2">{config.settings?.update_frequency_hours ?? 24}</Typography>
																		<Chip label="horas" size="small" color="warning" variant="outlined" />
																	</Stack>
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
																<Typography variant="body2" color="warning.main" fontWeight={500}>
																	{config.documents_not_found?.toLocaleString() || 0}
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
																{(() => {
																	const dateInfo = formatDateWithElapsed(config.last_check);
																	return (
																		<Stack spacing={0.5}>
																			<Typography variant="caption">{dateInfo.formatted}</Typography>
																			{dateInfo.elapsed && (
																				<Typography variant="caption" color="text.secondary">
																					({dateInfo.elapsed})
																				</Typography>
																			)}
																		</Stack>
																	);
																})()}
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
																	<Tooltip title="Editar">
																		<IconButton size="small" color="primary" onClick={() => handleEdit(config)}>
																			<Edit2 size={18} />
																		</IconButton>
																	</Tooltip>
																)}
															</TableCell>
														</TableRow>
													);
												})()}
											</TableBody>
										</Table>
									</TableContainer>

									{/* Configuración de Headless por Ambiente */}
									<Card variant="outlined" sx={{ mt: 3, backgroundColor: "background.default" }}>
										<CardContent>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												🌍 Configuración de Headless por Ambiente
											</Typography>
											<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
												Controla si el navegador se ejecuta en modo headless (sin interfaz gráfica) según el ambiente.
												En producción debería estar activado para mejor rendimiento.
											</Typography>
											<Grid container spacing={3}>
												<Grid item xs={12} sm={6}>
													<Card variant="outlined" sx={{ backgroundColor: "warning.lighter" }}>
														<CardContent>
															<Stack direction="row" justifyContent="space-between" alignItems="center">
																<Box>
																	<Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
																		🛠️ DEVELOPMENT
																	</Typography>
																	<Typography variant="caption" color="text.secondary">
																		Modo desarrollo - Browser visible para debug
																	</Typography>
																</Box>
																<Switch
																	checked={
																		editingId === sharedUpdateWorker._id
																			? editValues.settings?.environments?.development?.headless ?? false
																			: sharedUpdateWorker.settings?.environments?.development?.headless ?? false
																	}
																	onChange={() => {
																		if (editingId === sharedUpdateWorker._id) {
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					environments: {
																						...editValues.settings?.environments,
																						development: {
																							...editValues.settings?.environments?.development,
																							headless: !editValues.settings?.environments?.development?.headless,
																						},
																					},
																				},
																			});
																		} else {
																			handleEdit(sharedUpdateWorker);
																			setTimeout(() => {
																				setEditValues((prev) => ({
																					...prev,
																					settings: {
																						...prev.settings,
																						environments: {
																							...prev.settings?.environments,
																							development: {
																								...prev.settings?.environments?.development,
																								headless: !sharedUpdateWorker.settings?.environments?.development?.headless,
																							},
																						},
																					},
																				}));
																			}, 0);
																		}
																	}}
																	color="warning"
																/>
															</Stack>
															<Chip
																label={
																	(editingId === sharedUpdateWorker._id
																		? editValues.settings?.environments?.development?.headless
																		: sharedUpdateWorker.settings?.environments?.development?.headless) ?? false
																		? "Headless: ON"
																		: "Headless: OFF"
																}
																size="small"
																color={
																	(editingId === sharedUpdateWorker._id
																		? editValues.settings?.environments?.development?.headless
																		: sharedUpdateWorker.settings?.environments?.development?.headless) ?? false
																		? "success"
																		: "warning"
																}
																sx={{ mt: 1 }}
															/>
														</CardContent>
													</Card>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Card variant="outlined" sx={{ backgroundColor: "success.lighter" }}>
														<CardContent>
															<Stack direction="row" justifyContent="space-between" alignItems="center">
																<Box>
																	<Typography variant="subtitle2" fontWeight="bold" color="success.dark">
																		🚀 PRODUCTION
																	</Typography>
																	<Typography variant="caption" color="text.secondary">
																		Modo producción - Sin interfaz gráfica
																	</Typography>
																</Box>
																<Switch
																	checked={
																		editingId === sharedUpdateWorker._id
																			? editValues.settings?.environments?.production?.headless ?? true
																			: sharedUpdateWorker.settings?.environments?.production?.headless ?? true
																	}
																	onChange={() => {
																		if (editingId === sharedUpdateWorker._id) {
																			setEditValues({
																				...editValues,
																				settings: {
																					...editValues.settings,
																					environments: {
																						...editValues.settings?.environments,
																						production: {
																							...editValues.settings?.environments?.production,
																							headless: !editValues.settings?.environments?.production?.headless,
																						},
																					},
																				},
																			});
																		} else {
																			handleEdit(sharedUpdateWorker);
																			setTimeout(() => {
																				setEditValues((prev) => ({
																					...prev,
																					settings: {
																						...prev.settings,
																						environments: {
																							...prev.settings?.environments,
																							production: {
																								...prev.settings?.environments?.production,
																								headless: !(sharedUpdateWorker.settings?.environments?.production?.headless ?? true),
																							},
																						},
																					},
																				}));
																			}, 0);
																		}
																	}}
																	color="success"
																/>
															</Stack>
															<Chip
																label={
																	(editingId === sharedUpdateWorker._id
																		? editValues.settings?.environments?.production?.headless
																		: sharedUpdateWorker.settings?.environments?.production?.headless) ?? true
																		? "Headless: ON"
																		: "Headless: OFF"
																}
																size="small"
																color={
																	(editingId === sharedUpdateWorker._id
																		? editValues.settings?.environments?.production?.headless
																		: sharedUpdateWorker.settings?.environments?.production?.headless) ?? true
																		? "success"
																		: "error"
																}
																sx={{ mt: 1 }}
															/>
														</CardContent>
													</Card>
												</Grid>
											</Grid>
											{editingId === sharedUpdateWorker._id && (
												<Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
													<Button size="small" variant="outlined" color="error" onClick={handleCancelEdit}>
														Cancelar
													</Button>
													<Button size="small" variant="contained" color="primary" onClick={handleSave}>
														Guardar Cambios
													</Button>
												</Box>
											)}
										</CardContent>
									</Card>
								</>
							);
						}
						return null;
					})()}

					{/* Tabla de Workers Estadísticos */}
					{(() => {
						const statsWorkers = updateConfigs.filter((c) => c.worker_id !== "shared_update");
						if (statsWorkers.length > 0) {
							return (
								<>
									<Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
										Workers Estadísticos - Solo Lectura
									</Typography>
									<Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
										<Typography variant="body2">
											Estos workers son utilizados únicamente con fines estadísticos. Solo se muestran métricas de actualización.
										</Typography>
									</Alert>
									<TableContainer component={Paper} variant="outlined">
										<Table>
											<TableHead>
												<TableRow>
													<TableCell>Worker ID</TableCell>
													<TableCell align="center">Actualizados</TableCell>
													<TableCell align="center">Válidos</TableCell>
													<TableCell align="center">No Encontrados</TableCell>
													<TableCell align="center">Estado</TableCell>
													<TableCell align="center">Total Búsquedas</TableCell>
													<TableCell align="center">Búsquedas Exitosas</TableCell>
													<TableCell align="center">Última Actualización</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{statsWorkers.map((config) => (
													<TableRow key={config._id}>
														<TableCell>
															<Typography variant="body2" fontWeight={500}>
																{config.worker_id}
															</Typography>
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
															<Typography variant="body2" color="warning.main" fontWeight={500}>
																{config.documents_not_found?.toLocaleString() || 0}
															</Typography>
														</TableCell>
														<TableCell align="center">
															<Chip
																label={config.enabled ? "Activo" : "Inactivo"}
																color={config.enabled ? "success" : "default"}
																size="small"
															/>
														</TableCell>
														<TableCell align="center">
															<Typography variant="body2">{config.statistics?.total_searches?.toLocaleString() || 0}</Typography>
														</TableCell>
														<TableCell align="center">
															<Typography variant="body2" color="success.main">
																{config.statistics?.successful_searches?.toLocaleString() || 0}
															</Typography>
														</TableCell>
														<TableCell align="center">
															{(() => {
																const dateInfo = formatDateWithElapsed(config.last_check);
																return (
																	<Stack spacing={0.5}>
																		<Typography variant="caption">{dateInfo.formatted}</Typography>
																		{dateInfo.elapsed && (
																			<Typography variant="caption" color="text.secondary">
																				({dateInfo.elapsed})
																			</Typography>
																		)}
																	</Stack>
																);
															})()}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</>
							);
						}
						return null;
					})()}
				</>
			)}

			{/* Estadísticas */}
			<Grid container spacing={2}>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Workers
							</Typography>
							<Typography variant="h4">{updateConfigs.length}</Typography>
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
								{updateConfigs.filter((c) => c.enabled).length}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={12} sm={6} md={3}>
					<Card variant="outlined">
						<CardContent>
							<Typography variant="subtitle2" color="text.secondary" gutterBottom>
								Total Actualizados
							</Typography>
							<Typography variant="h4">
								{updateConfigs.reduce((acc, c) => acc + (c.documents_verified || 0), 0).toLocaleString()}
							</Typography>
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
									const total = updateConfigs.reduce((acc, c) => acc + (c.documents_verified || 0), 0);
									const valid = updateConfigs.reduce((acc, c) => acc + (c.documents_valid || 0), 0);
									return total > 0 ? `${((valid / total) * 100).toFixed(1)}%` : "0%";
								})()}
							</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Stack>
	);

	// Componente de Configuración del Sistema
	const SystemConfigContent = () => (
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
			{/* Header con acciones */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración del Sistema MEV</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchSystemConfigs}>
					Actualizar
				</Button>
			</Box>

			{/* Información del sistema */}
			<Alert severity="info" variant="outlined">
				<Typography variant="subtitle2" fontWeight="bold">
					Configuración del Sistema MEV
				</Typography>
				<Typography variant="body2" sx={{ mt: 1 }}>
					Gestiona las configuraciones del sistema MEV incluyendo parámetros de seguridad, scraping y notificaciones.
				</Typography>
			</Alert>

			{/* Credenciales de Acceso MEV */}
			{(() => {
				const sharedWorker = configs.find((c) => c.worker_id === "shared");
				if (!sharedWorker) return null;
				return (
					<Card variant="outlined" sx={{ backgroundColor: "background.default" }}>
						<CardContent>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Credenciales de Acceso MEV
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
								Credenciales compartidas por todos los workers (verificación y actualización).
							</Typography>
							<Grid container spacing={2}>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										size="small"
										label="Usuario MEV"
										value={editingCredentials ? credentialForm.username : sharedWorker.login?.username ?? ""}
										onChange={(e) => {
											if (editingCredentials) {
												setCredentialForm({ ...credentialForm, username: e.target.value });
											}
										}}
										disabled={!editingCredentials}
										InputProps={{ readOnly: !editingCredentials }}
									/>
								</Grid>
								<Grid item xs={12} sm={6}>
									<TextField
										fullWidth
										size="small"
										label="Contraseña MEV"
										type={showPassword ? "text" : "password"}
										value={editingCredentials ? credentialForm.password : sharedWorker.login?.password ?? ""}
										onChange={(e) => {
											if (editingCredentials) {
												setCredentialForm({ ...credentialForm, password: e.target.value });
											}
										}}
										disabled={!editingCredentials}
										InputProps={{
											readOnly: !editingCredentials,
											endAdornment: (
												<IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
													{showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
												</IconButton>
											),
										}}
									/>
								</Grid>
							</Grid>
							{sharedWorker.login?.lastPasswordChange && (
								<Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
									Último cambio de contraseña: {new Date(sharedWorker.login.lastPasswordChange).toLocaleDateString("es-AR")}
								</Typography>
							)}
							<Box sx={{ mt: 2, display: "flex", gap: 1 }}>
								{editingCredentials ? (
									<>
										<Button variant="contained" size="small" onClick={handleSaveCredentials}>
											Guardar
										</Button>
										<Button
											variant="outlined"
											size="small"
											onClick={() => setEditingCredentials(false)}
										>
											Cancelar
										</Button>
									</>
								) : (
									<Button variant="outlined" size="small" startIcon={<Edit2 size={16} />} onClick={handleStartEditCredentials}>
										Editar Credenciales
									</Button>
								)}
							</Box>
						</CardContent>
					</Card>
				);
			})()}

			{/* Instructivo de Uso */}
			<Card variant="outlined" sx={{ backgroundColor: "background.paper" }}>
				<CardContent sx={{ pb: instructionsOpen ? 2 : 1 }}>
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						sx={{ cursor: "pointer" }}
						onClick={() => setInstructionsOpen(!instructionsOpen)}
					>
						<Stack direction="row" spacing={1} alignItems="center">
							<InfoCircle size={20} color={theme.palette.info.main} />
							<Typography variant="h6" color="primary">
								Instructivo de Uso - Configuración del Sistema MEV
							</Typography>
						</Stack>
						<IconButton size="small">{instructionsOpen ? <ArrowUp2 size={20} /> : <ArrowDown2 size={20} />}</IconButton>
					</Box>

					<Collapse in={instructionsOpen}>
						<Stack spacing={2} sx={{ mt: 3 }}>
							{/* Información General */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
									🌐 Información General
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									Las configuraciones del sistema se aplican a <strong>cada usuario MEV</strong> que ha sido gestionado y creado a través
									del portal MEV. Estos usuarios se configuran y actualizan mediante las
									<strong> variables de entorno</strong> del sistema.
								</Typography>
							</Box>

							{/* Cómo editar configuraciones */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
									✏️ Cómo Editar Configuraciones
								</Typography>
								<Stack spacing={1} sx={{ pl: 2 }}>
									<Typography variant="body2" color="text.secondary">
										1. Haga clic en el ícono <Chip icon={<Edit2 size={14} />} label="Editar" size="small" /> junto a la configuración que
										desea modificar
									</Typography>
									<Typography variant="body2" color="text.secondary">
										2. Modifique el valor según el tipo de dato (texto, número, booleano)
									</Typography>
									<Typography variant="body2" color="text.secondary">
										3. Haga clic en <Chip icon={<TickCircle size={14} />} label="Guardar" size="small" color="primary" /> para confirmar
									</Typography>
									<Typography variant="body2" color="text.secondary">
										4. O haga clic en <Chip icon={<CloseCircle size={14} />} label="Cancelar" size="small" color="error" /> para descartar
										cambios
									</Typography>
								</Stack>
							</Box>

							{/* Gestión de Contraseñas */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
									🔐 Gestión de Contraseñas
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									Los campos <strong>password_last_change</strong> y <strong>password_expires_at</strong> tienen un tratamiento especial:
								</Typography>
								<Stack spacing={1} sx={{ pl: 2 }}>
									<Typography variant="body2" color="text.secondary">
										• <strong>NO se pueden editar directamente</strong> para mantener la integridad del sistema
									</Typography>
									<Typography variant="body2" color="text.secondary">
										• Use el botón <Chip icon={<Calendar size={14} />} label="Calendario" size="small" color="secondary" /> para actualizar
										la fecha de cambio
									</Typography>
									<Typography variant="body2" color="text.secondary">
										• Al actualizar la fecha de cambio, el sistema <strong>recalcula automáticamente</strong> la fecha de expiración
									</Typography>
									<Typography variant="body2" color="text.secondary">
										• La expiración se calcula sumando los días configurados en <strong>password_expiry_days</strong>
									</Typography>
								</Stack>
							</Box>

							{/* Cómo funciona el cambio de contraseña */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
									🔄 ¿Cómo funciona el cambio de contraseña?
								</Typography>
								<Stack spacing={1} sx={{ pl: 2 }}>
									<Typography variant="body2" color="text.secondary">
										<strong>1. Detección automática:</strong> El sistema MEV detecta cuando una contraseña está próxima a expirar
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>2. Notificación:</strong> Se envía una alerta cuando quedan pocos días para la expiración
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>3. Actualización manual:</strong> El administrador actualiza la contraseña en el sistema MEV
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>4. Registro en sistema:</strong> Use el botón de calendario para registrar la fecha del cambio
									</Typography>
									<Typography variant="body2" color="text.secondary">
										<strong>5. Reinicio del ciclo:</strong> El contador de expiración se reinicia automáticamente
									</Typography>
								</Stack>
							</Box>

							{/* Categorías de Configuración */}
							<Box>
								<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
									🏷️ Categorías de Configuración
								</Typography>
								<Stack spacing={1} sx={{ pl: 2 }}>
									<Typography variant="body2" color="text.secondary">
										• <Chip label="security" size="small" color="error" /> - Parámetros de seguridad y autenticación
									</Typography>
									<Typography variant="body2" color="text.secondary">
										• <Chip label="scraping" size="small" color="primary" /> - Configuración de extracción de datos
									</Typography>
									<Typography variant="body2" color="text.secondary">
										• <Chip label="notification" size="small" color="warning" /> - Alertas y notificaciones del sistema
									</Typography>
								</Stack>
							</Box>

							{/* Nota importante */}
							<Alert severity="warning" variant="filled">
								<Typography variant="subtitle2" fontWeight="bold">
									⚠️ Importante
								</Typography>
								<Typography variant="body2">
									Los cambios realizados en esta sección afectan directamente el comportamiento del sistema MEV. Asegúrese de comprender el
									impacto de cada modificación antes de guardar los cambios.
								</Typography>
							</Alert>
						</Stack>
					</Collapse>
				</CardContent>
			</Card>

			{loadingSystem ? (
				<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					{[1, 2, 3].map((item) => (
						<Grid item xs={12} key={item}>
							<Skeleton variant="rectangular" height={60} />
						</Grid>
					))}
				</Grid>
			) : systemAuthError ? (
				<Alert severity="error" icon={<InfoCircle size={24} />}>
					<Typography variant="subtitle2" fontWeight="bold">
						Error de Autenticación
					</Typography>
					<Typography variant="body2" sx={{ mt: 1 }}>
						No se pudo cargar la configuración del sistema debido a un problema de autenticación. Por favor, verifique sus credenciales e
						intente nuevamente.
					</Typography>
					<Button
						size="small"
						variant="outlined"
						sx={{ mt: 2 }}
						onClick={() => {
							setSystemAuthError(false);
							fetchSystemConfigs();
						}}
					>
						Reintentar
					</Button>
				</Alert>
			) : (
				<TableContainer component={Paper} variant="outlined">
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Usuario</TableCell>
								<TableCell>Clave</TableCell>
								<TableCell>Valor</TableCell>
								<TableCell>Tipo</TableCell>
								<TableCell>Categoría</TableCell>
								<TableCell>Descripción</TableCell>
								<TableCell align="center">Encriptado</TableCell>
								<TableCell>Última Actualización</TableCell>
								<TableCell align="center">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{systemConfigs.map((config) => {
								const isEditing = editingSystemId === config._id;
								const dateInfo = formatDateWithElapsed(config.updatedAt);

								return (
									<TableRow key={config._id}>
										<TableCell>
											<Typography variant="body2" fontWeight={500}>
												{config.userId}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body2" fontWeight={500} sx={{ fontFamily: "monospace" }}>
												{config.key}
											</Typography>
										</TableCell>
										<TableCell>
											{isEditing ? (
												config.dataType === "boolean" ? (
													<Switch
														checked={editSystemValues.value === true}
														onChange={(e) => setEditSystemValues({ ...editSystemValues, value: e.target.checked })}
														size="small"
													/>
												) : config.dataType === "number" ? (
													<TextField
														size="small"
														type="number"
														value={editSystemValues.value || ""}
														onChange={(e) => setEditSystemValues({ ...editSystemValues, value: Number(e.target.value) })}
														fullWidth
													/>
												) : (
													<TextField
														size="small"
														value={editSystemValues.value || ""}
														onChange={(e) => setEditSystemValues({ ...editSystemValues, value: e.target.value })}
														fullWidth
														multiline={config.dataType === "json"}
														rows={config.dataType === "json" ? 3 : 1}
													/>
												)
											) : (
												<Typography
													variant="body2"
													sx={{
														maxWidth: 200,
														overflow: "hidden",
														textOverflow: "ellipsis",
														whiteSpace: config.dataType === "json" ? "pre-wrap" : "nowrap",
														fontFamily: config.dataType === "json" ? "monospace" : "inherit",
														fontSize: config.dataType === "json" ? "0.75rem" : "inherit",
													}}
													title={formatSystemValue(config.value, config.dataType)}
												>
													{formatSystemValue(config.value, config.dataType)}
												</Typography>
											)}
										</TableCell>
										<TableCell>
											<Chip
												label={config.dataType}
												size="small"
												variant="outlined"
												color={
													config.dataType === "boolean"
														? "success"
														: config.dataType === "number"
														? "info"
														: config.dataType === "date"
														? "warning"
														: "default"
												}
											/>
										</TableCell>
										<TableCell>
											<Chip
												label={config.category}
												size="small"
												color={
													config.category === "security"
														? "error"
														: config.category === "scraping"
														? "primary"
														: config.category === "notification"
														? "warning"
														: "default"
												}
											/>
										</TableCell>
										<TableCell>
											<Typography variant="caption" sx={{ display: "block", maxWidth: 250 }}>
												{config.description}
											</Typography>
										</TableCell>
										<TableCell align="center">
											{config.isEncrypted ? (
												<Chip label="Sí" size="small" color="error" variant="filled" />
											) : (
												<Chip label="No" size="small" variant="outlined" />
											)}
										</TableCell>
										<TableCell>
											<Stack spacing={0.5}>
												<Typography variant="caption">{dateInfo.formatted}</Typography>
												{dateInfo.elapsed && (
													<Typography variant="caption" color="text.secondary">
														({dateInfo.elapsed})
													</Typography>
												)}
												{config.metadata?.updatedBy && (
													<Typography variant="caption" color="text.secondary">
														Por: {config.metadata.updatedBy}
													</Typography>
												)}
											</Stack>
										</TableCell>
										<TableCell align="center">
											{isPasswordField(config.key) ? (
												<Tooltip title="Actualizar fecha de cambio de contraseña">
													<IconButton size="small" color="secondary" onClick={() => handleOpenPasswordModal(config.userId)}>
														<Calendar size={18} />
													</IconButton>
												</Tooltip>
											) : isEditing ? (
												<Stack direction="row" spacing={1} justifyContent="center">
													<Tooltip title="Guardar">
														<IconButton size="small" color="primary" onClick={handleSaveSystem}>
															<TickCircle size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Cancelar">
														<IconButton size="small" color="error" onClick={handleCancelEditSystem}>
															<CloseCircle size={18} />
														</IconButton>
													</Tooltip>
												</Stack>
											) : (
												<Tooltip title="Editar">
													<IconButton size="small" color="primary" onClick={() => handleEditSystem(config)}>
														<Edit2 size={18} />
													</IconButton>
												</Tooltip>
											)}
										</TableCell>
									</TableRow>
								);
							})}
							{systemConfigs.length === 0 && (
								<TableRow>
									<TableCell colSpan={9} align="center">
										<Typography variant="body2" color="text.secondary">
											No hay configuraciones disponibles
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Stack>
	);

	const workerTabs: WorkerTab[] = [
		{
			label: "Manager",
			value: "manager",
			icon: <Setting2 size={20} />,
			component: <WorkerManagerTab />,
			description: "Gestiona y escala los workers automaticamente",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Verificacion",
			value: "verification",
			icon: <TickSquare size={20} />,
			component: <VerificationWorkerContent />,
			description: "Verifica existencia de causas MEV",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Actualizacion",
			value: "update",
			icon: <DocumentUpload size={20} />,
			component: <UpdateWorkerContent />,
			description: "Actualiza causas MEV verificadas",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Sync Check",
			value: "sync-check",
			icon: <Refresh2 size={20} />,
			component: <SyncCheckTab />,
			description: "Verifica sincronizacion de jurisdicciones y organismos",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Jurisdicciones",
			value: "jurisdiction-status",
			icon: <Warning2 size={20} />,
			component: <JurisdictionStatusTab />,
			description: "Estado de disponibilidad de jurisdicciones MEV",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Config Sistema",
			value: "system-config",
			icon: <Setting size={20} />,
			component: <SystemConfigContent />,
			description: "Configuracion general del sistema MEV",
			status: "active",
			badge: "app",
			ip: "56.125.115.51",
		},
		{
			label: "Mis Causas SCBA",
			value: "scba",
			icon: <People size={20} />,
			component: <ScbaManagerTab />,
			description: "Configuracion del scraper SCBA (notificaciones)",
			status: "active",
			badge: "worker_02",
			ip: "100.98.180.101",
		},
	];

	return (
		<>
			<MainCard>
				<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }}>
					<Box>
						<Typography variant="h3">Workers MEV</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
							Gestiona y configura los workers del sistema MEV
						</Typography>
					</Box>

					<Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
						<Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
							<Tabs
								value={activeTab}
								onChange={handleTabChange}
								variant="scrollable"
								scrollButtons="auto"
								sx={{
									"& .MuiTab-root": {
										minHeight: 64,
										textTransform: "none",
										fontSize: "0.875rem",
										fontWeight: 500,
									},
								}}
							>
								{workerTabs.map((tab) => (
									<Tab
										key={tab.value}
										label={
											<Stack direction="row" spacing={1.5} alignItems="center">
												<Box sx={{ color: getStatusColor(tab.status) }}>{tab.icon}</Box>
												<Box>
													<Stack direction="row" spacing={0.75} alignItems="center">
														<Typography variant="body2" fontWeight={500}>
															{tab.label}
														</Typography>
														{tab.badge && (
															<Box
																component="span"
																sx={{
																	display: "inline-flex",
																	alignItems: "center",
																	px: 1,
																	py: 0.25,
																	borderRadius: 1,
																	bgcolor: theme.palette.grey[800],
																	color: theme.palette.common.white,
																	fontSize: "0.65rem",
																	fontWeight: 500,
																	fontFamily: "monospace",
																	letterSpacing: "0.5px",
																}}
															>
																{tab.badge}
															</Box>
														)}
														{tab.ip && (
															<Box
																component="span"
																sx={{
																	display: "inline-flex",
																	alignItems: "center",
																	px: 0.75,
																	py: 0.25,
																	borderRadius: 1,
																	bgcolor: alpha(theme.palette.info.main, 0.1),
																	color: theme.palette.info.main,
																	fontSize: "0.6rem",
																	fontWeight: 500,
																	fontFamily: "monospace",
																}}
															>
																{tab.ip}
															</Box>
														)}
													</Stack>
													{tab.status && (
														<Chip
															label={tab.status === "active" ? "Activo" : tab.status === "inactive" ? "Inactivo" : "Error"}
															size="small"
															sx={{
																height: 16,
																fontSize: "0.7rem",
																mt: 0.5,
																bgcolor: alpha(getStatusColor(tab.status), 0.1),
																color: getStatusColor(tab.status),
															}}
														/>
													)}
												</Box>
											</Stack>
										}
										value={tab.value}
									/>
								))}
							</Tabs>
						</Box>

						<Box sx={{ bgcolor: theme.palette.background.paper }}>
							{workerTabs.map((tab) => (
								<TabPanel key={tab.value} value={activeTab} index={tab.value}>
									{tab.component}
								</TabPanel>
							))}
						</Box>
					</Paper>
				</Stack>
			</MainCard>

			{/* Modal de información del Worker */}
			<Dialog open={workerInfoModalOpen} onClose={() => setWorkerInfoModalOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					<Stack direction="row" spacing={1} alignItems="center">
						<InfoCircle size={24} color={theme.palette.info.main} />
						<Typography variant="h6">Worker de Verificación de Causas MEV</Typography>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						Este worker se encarga de verificar automáticamente el estado de las causas judiciales MEV, validando su existencia y
						actualizando la información en el sistema.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setWorkerInfoModalOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de Guía de Funcionamiento */}
			<Dialog open={guideModalOpen} onClose={() => setGuideModalOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>
					<Stack direction="row" spacing={1} alignItems="center">
						<InfoCircle size={24} color={theme.palette.info.main} />
						<Typography variant="h6">Guía de Funcionamiento del Worker de Verificación</Typography>
					</Stack>
				</DialogTitle>
				<DialogContent>
					<Stack spacing={2} sx={{ mt: 2 }}>
						{/* Propósito del Worker */}
						<Box>
							<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
								🎯 Propósito del Worker
							</Typography>
							<Typography variant="body2" color="text.secondary">
								El Worker de Verificación MEV es un proceso automatizado que se ejecuta periódicamente para validar la existencia y el
								estado actual de las causas judiciales en el sistema MEV (Mesa de Entradas Virtual). Su función principal es mantener
								actualizada la base de datos con información verificada directamente desde la fuente oficial.
							</Typography>
						</Box>

						{/* Parámetros Técnicos */}
						<Box>
							<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
								🔧 Parámetros Técnicos
							</Typography>
							<Stack spacing={1} sx={{ pl: 2 }}>
								<Typography variant="body2" color="text.secondary">
									• <strong>Tamaño de Lote:</strong> Cantidad de documentos procesados simultáneamente (recomendado: 10-50)
								</Typography>
								<Typography variant="body2" color="text.secondary">
									• <strong>Delay entre búsquedas:</strong> Tiempo de espera en milisegundos entre verificaciones (evita sobrecarga)
								</Typography>
								<Typography variant="body2" color="text.secondary">
									• <strong>Reintentos máximos:</strong> Número de intentos ante fallos de verificación (recomendado: 3)
								</Typography>
							</Stack>
						</Box>

						{/* Mejores Prácticas */}
						<Box>
							<Typography variant="subtitle2" fontWeight="bold" color="text.primary" gutterBottom>
								✅ Mejores Prácticas
							</Typography>
							<Stack spacing={1} sx={{ pl: 2 }}>
								<Typography variant="body2" color="text.secondary">
									• Configure el <strong>delay entre búsquedas</strong> de al menos 1000ms para evitar bloqueos
								</Typography>
								<Typography variant="body2" color="text.secondary">
									• Use <strong>tamaños de lote pequeños</strong> (10-20) para mejor control y debugging
								</Typography>
								<Typography variant="body2" color="text.secondary">
									• Monitoree las <strong>estadísticas de errores</strong> regularmente
								</Typography>
							</Stack>
						</Box>

						{/* Nota importante */}
						<Alert severity="warning">
							<Typography variant="subtitle2" fontWeight="bold">
								⚠️ Importante
							</Typography>
							<Typography variant="body2">
								El Worker de Verificación realiza consultas directas al sistema MEV. Un mal uso o configuración incorrecta puede resultar en
								bloqueos temporales. Siempre pruebe con configuraciones conservadoras antes de aumentar la velocidad o volumen de
								procesamiento.
							</Typography>
						</Alert>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setGuideModalOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de Elegibilidad de Documentos */}
			<Dialog open={eligibilityModalOpen} onClose={() => setEligibilityModalOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>Elegibilidad de Documentos - Worker de Verificación MEV</DialogTitle>
				<DialogContent>
					<Grid container spacing={2} sx={{ mt: 1 }}>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Source:
							</Typography>
							<Typography variant="body2" fontWeight={500}>
								"mev"
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Verified (req):
							</Typography>
							<Typography variant="body2" fontWeight={500}>
								false
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								isValid (req):
							</Typography>
							<Typography variant="body2" fontWeight={500}>
								null
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Update:
							</Typography>
							<Typography variant="body2" fontWeight={500}>
								No importa
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Función:
							</Typography>
							<Typography variant="body2" fontWeight={500} color="primary.main">
								Verificación inicial
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Modifica verified:
							</Typography>
							<Typography variant="body2" fontWeight={500} color="success.main">
								SÍ
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Modifica isValid:
							</Typography>
							<Typography variant="body2" fontWeight={500} color="success.main">
								SÍ
							</Typography>
						</Grid>
						<Grid item xs={6} sm={3}>
							<Typography variant="caption" color="text.secondary">
								Frecuencia:
							</Typography>
							<Typography variant="body2" fontWeight={500} color="warning.main">
								Una sola vez
							</Typography>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEligibilityModalOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Modal para actualizar fecha de contraseña */}
			<Dialog open={passwordModalOpen} onClose={handleClosePasswordModal} maxWidth="sm" fullWidth>
				<DialogTitle>Actualizar Fecha de Cambio de Contraseña</DialogTitle>
				<DialogContent>
					<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mt: 2 }}>
						<Alert severity="info">
							Al actualizar la fecha de cambio de contraseña, el sistema recalculará automáticamente la fecha de expiración basándose en los
							días configurados para expiración.
						</Alert>
						<Typography variant="body2">
							Usuario: <strong>{passwordModalUserId}</strong>
						</Typography>
						<LocalizationProvider dateAdapter={AdapterDayjs}>
							<DateTimePicker
								label="Fecha de cambio de contraseña"
								value={passwordChangeDate}
								onChange={(newValue) => setPasswordChangeDate(newValue)}
								format="DD/MM/YYYY HH:mm"
								slotProps={{
									textField: {
										fullWidth: true,
										variant: "outlined",
									},
								}}
							/>
						</LocalizationProvider>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClosePasswordModal} color="secondary">
						Cancelar
					</Button>
					<Button onClick={handleUpdatePasswordDate} variant="contained" color="primary" disabled={!passwordChangeDate}>
						Actualizar
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default MEVWorkers;
