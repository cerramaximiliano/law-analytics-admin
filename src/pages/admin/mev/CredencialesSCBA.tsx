import { useState, useEffect } from "react";
import {
	Grid,
	Stack,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Chip,
	IconButton,
	Tooltip,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	TextField,
	Button,
	Box,
	Tabs,
	Tab,
	CircularProgress,
	Card,
	CardContent,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Divider,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { alpha, useTheme } from "@mui/material/styles";
import {
	Refresh,
	SearchNormal1,
	CloseCircle,
	TickCircle,
	Trash,
	ToggleOnCircle,
	ToggleOffCircle,
	RefreshCircle,
	Broom,
	Sms,
	Notification,
} from "iconsax-react";
import { enqueueSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { AddCircle } from "iconsax-react";
import scbaCredentialsService, { ScbaCredential, ScbaCredentialDetail, ScbaCredentialsFilters } from "api/scbaCredentials";
import EmailLogsService from "api/emailLogs";
import { EmailLog } from "types/email-log";

// Colores para estados
const getSyncStatusColor = (status: string) => {
	switch (status) {
		case "completed":
			return "success";
		case "in_progress":
			return "info";
		case "pending":
			return "warning";
		case "error":
			return "error";
		case "idle":
			return "secondary";
		case "never_synced":
		default:
			return "default";
	}
};

const getSyncStatusLabel = (status: string) => {
	switch (status) {
		case "completed":
			return "Completado";
		case "in_progress":
			return "En progreso";
		case "pending":
			return "Pendiente";
		case "error":
			return "Error";
		case "idle":
			return "Desvinculada";
		case "never_synced":
			return "Sin sincronizar";
		default:
			return status;
	}
};

// Texto de detalle de la desvinculación para tooltip / fila secundaria.
const formatUnlinkDetail = (cred: ScbaCredential): string | null => {
	if (cred.syncStatus !== "idle") return null;
	const parts: string[] = [];
	if (cred.unlinkedAt) parts.push(`el ${new Date(cred.unlinkedAt).toLocaleString("es-AR")}`);
	if (cred.unlinkedMode) parts.push(`modo ${cred.unlinkedMode === "delete" ? "eliminar" : "conservar"}`);
	const actor =
		cred.unlinkedSource === "team"
			? `equipo${cred.unlinkedByName ? ` (${cred.unlinkedByName})` : ""}`
			: cred.unlinkedSource === "user"
				? "el propio usuario"
				: null;
	if (actor) parts.push(`por ${actor}`);
	return parts.length ? `Desvinculada ${parts.join(", ")}` : "Desvinculada por el usuario";
};

// El tab de notificaciones se acota a este conjunto para trackear solo los
// avisos de credenciales SCBA (no los de sync completada, causas o listas).
const SCBA_CREDENTIAL_TEMPLATES = [
	"scbaCredentialError",
	"scbaCredentialDisabled",
	"scbaCredentialReminder",
	"scbaCredentialRestored",
] as const;

const CREDENTIAL_TEMPLATE_LABELS: Record<string, string> = {
	scbaCredentialError: "Contraseña incorrecta",
	scbaCredentialDisabled: "Cuenta desactivada",
	scbaCredentialReminder: "Recordatorio",
	scbaCredentialRestored: "Restaurada",
};

const CredencialesSCBA = () => {
	const theme = useTheme();

	// Estado de datos
	const [credentials, setCredentials] = useState<ScbaCredential[]>([]);
	const [loading, setLoading] = useState(false);
	const [stats, setStats] = useState<any>(null);

	// Paginación
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [totalCount, setTotalCount] = useState(0);

	// Filtros
	const [syncStatusFilter, setSyncStatusFilter] = useState<string>("todos");
	const [verifiedFilter, setVerifiedFilter] = useState<string>("todos");
	const [enabledFilter, setEnabledFilter] = useState<string>("todos");
	const [searchText, setSearchText] = useState("");

	// Ordenamiento
	const [sortBy] = useState<string>("createdAt");
	const [sortOrder] = useState<"asc" | "desc">("desc");

	// Tab activo (0 = credenciales, 1 = notificaciones)
	const [tabValue, setTabValue] = useState(0);

	// Estado notificaciones (logs de emails de credenciales)
	const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
	const [emailLogsLoading, setEmailLogsLoading] = useState(false);
	const [emailLogsTotal, setEmailLogsTotal] = useState(0);
	const [emailLogsPage, setEmailLogsPage] = useState(0);
	const [emailLogsRowsPerPage, setEmailLogsRowsPerPage] = useState(25);
	const [emailLogsFetched, setEmailLogsFetched] = useState(false);
	const [emailLogsStatusFilter, setEmailLogsStatusFilter] = useState<string>("todos");
	const [emailLogsTemplateFilter, setEmailLogsTemplateFilter] = useState<string>("todos");
	const [emailLogsUserFilter, setEmailLogsUserFilter] = useState<string>("");

	const fetchEmailLogs = async (page = emailLogsPage, rowsPerPage = emailLogsRowsPerPage) => {
		setEmailLogsLoading(true);
		try {
			const params: any = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy: "createdAt",
				sortOrder: "desc",
			};
			if (emailLogsStatusFilter !== "todos") params.status = emailLogsStatusFilter;
			// Acotar siempre a las notificaciones de credenciales SCBA. Si se elige
			// un tipo puntual, se filtra por ese; si no, por el set completo.
			params.templateName =
				emailLogsTemplateFilter !== "todos" ? emailLogsTemplateFilter : SCBA_CREDENTIAL_TEMPLATES.join(",");
			if (emailLogsUserFilter.trim()) params.to = emailLogsUserFilter.trim();

			const res = await EmailLogsService.getEmailLogs(params);
			if (res.success) {
				setEmailLogs(res.data);
				setEmailLogsTotal(res.pagination.totalItems);
				setEmailLogsFetched(true);
			}
		} catch (error) {
			console.error("Error fetching email logs:", error);
		} finally {
			setEmailLogsLoading(false);
		}
	};

	// Lazy load: cargar los logs de notificaciones solo al activar el tab 1
	useEffect(() => {
		if (tabValue === 1 && !emailLogsFetched) {
			fetchEmailLogs(0, emailLogsRowsPerPage);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tabValue]);

	// Dialogs
	const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; credential: ScbaCredential | null }>({
		open: false,
		credential: null,
	});
	const [cleanDialog, setCleanDialog] = useState<{ open: boolean; credential: ScbaCredential | null }>({
		open: false,
		credential: null,
	});
	const [createDialog, setCreateDialog] = useState(false);
	const [createForm, setCreateForm] = useState({ userId: "", username: "", password: "", description: "" });
	const [creating, setCreating] = useState(false);

	// Diálogo "Recorrido de recordatorios"
	const [reminderDialog, setReminderDialog] = useState<{
		open: boolean;
		credential: ScbaCredential | null;
		loading: boolean;
		data: ScbaCredentialDetail | null;
	}>({ open: false, credential: null, loading: false, data: null });

	const handleOpenReminders = async (cred: ScbaCredential) => {
		setReminderDialog({ open: true, credential: cred, loading: true, data: null });
		try {
			const res = await scbaCredentialsService.getCredentialById(cred._id);
			if (res.success) {
				setReminderDialog((prev) => ({ ...prev, loading: false, data: res.data }));
			} else {
				setReminderDialog((prev) => ({ ...prev, loading: false }));
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar recordatorios", { variant: "error" });
			setReminderDialog((prev) => ({ ...prev, loading: false }));
		}
	};

	// Cargar datos
	const fetchCredentials = async () => {
		try {
			setLoading(true);
			const params: ScbaCredentialsFilters = {
				page: page + 1,
				limit: rowsPerPage,
				sortBy,
				sortOrder,
			};

			if (syncStatusFilter !== "todos") params.syncStatus = syncStatusFilter;
			if (verifiedFilter !== "todos") params.verified = verifiedFilter;
			if (enabledFilter !== "todos") params.enabled = enabledFilter;
			if (searchText.trim()) params.search = searchText.trim();

			const response = await scbaCredentialsService.getCredentials(params);
			if (response.success) {
				setCredentials(response.data);
				setTotalCount(response.pagination.total);
			}
		} catch (error) {
			console.error("Error fetching credentials:", error);
			enqueueSnackbar("Error al cargar credenciales", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const fetchStats = async () => {
		try {
			const response = await scbaCredentialsService.getStats();
			if (response.success) {
				setStats(response.data);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		}
	};

	useEffect(() => {
		fetchCredentials();
	}, [page, rowsPerPage, sortBy, sortOrder]);

	useEffect(() => {
		fetchStats();
	}, []);

	// Handlers
	const handleSearch = () => {
		setPage(0);
		fetchCredentials();
	};

	const handleClearFilters = () => {
		setSyncStatusFilter("todos");
		setVerifiedFilter("todos");
		setEnabledFilter("todos");
		setSearchText("");
		setPage(0);
		setTimeout(() => fetchCredentials(), 100);
	};

	const handleToggleEnabled = async (credential: ScbaCredential) => {
		try {
			const response = await scbaCredentialsService.toggleCredential(credential._id, !credential.enabled);
			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				fetchCredentials();
				fetchStats();
			}
		} catch (error) {
			enqueueSnackbar("Error al actualizar credencial", { variant: "error" });
		}
	};

	const handleReset = async (credential: ScbaCredential) => {
		try {
			const response = await scbaCredentialsService.resetCredential(credential._id);
			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				fetchCredentials();
				fetchStats();
			}
		} catch (error) {
			enqueueSnackbar("Error al resetear credencial", { variant: "error" });
		}
	};

	const handleResetAndClean = async () => {
		if (!cleanDialog.credential) return;
		try {
			const response = await scbaCredentialsService.resetAndCleanCausas(cleanDialog.credential._id);
			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				setCleanDialog({ open: false, credential: null });
				fetchCredentials();
				fetchStats();
			}
		} catch (error) {
			enqueueSnackbar("Error al resetear y limpiar credencial", { variant: "error" });
		}
	};

	const handleDelete = async () => {
		if (!deleteDialog.credential) return;
		try {
			const response = await scbaCredentialsService.deleteCredential(deleteDialog.credential._id);
			if (response.success) {
				enqueueSnackbar(response.message, { variant: "success" });
				setDeleteDialog({ open: false, credential: null });
				fetchCredentials();
				fetchStats();
			}
		} catch (error) {
			enqueueSnackbar("Error al eliminar credencial", { variant: "error" });
		}
	};

	const handleCreate = async () => {
		if (!createForm.userId || !createForm.username || !createForm.password) {
			enqueueSnackbar("Todos los campos son requeridos", { variant: "warning" });
			return;
		}
		try {
			setCreating(true);
			const response = await scbaCredentialsService.createCredential(createForm);
			if (response.success) {
				enqueueSnackbar(response.message || "Credencial creada correctamente", { variant: "success" });
				setCreateDialog(false);
				setCreateForm({ userId: "", username: "", password: "", description: "" });
				fetchCredentials();
				fetchStats();
			}
		} catch (error: any) {
			const msg = error.response?.data?.message || "Error al crear credencial";
			enqueueSnackbar(msg, { variant: "error" });
		} finally {
			setCreating(false);
		}
	};

	const formatDate = (dateString: string | null) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Stat card tintada — reemplaza las 6 cards genéricas con un mismo lenguaje.
	const renderStatCard = (label: string, value: number, colorKey: "primary" | "success" | "warning" | "error" | "info" | "secondary") => {
		const baseColor =
			colorKey === "primary"
				? theme.palette.primary.main
				: colorKey === "success"
					? theme.palette.success.main
					: colorKey === "warning"
						? theme.palette.warning.main
						: colorKey === "error"
							? theme.palette.error.main
							: colorKey === "info"
								? theme.palette.info.main
								: theme.palette.secondary.main;
		return (
			<Card
				variant="outlined"
				sx={{
					borderColor: alpha(baseColor, 0.22),
					bgcolor: alpha(baseColor, 0.04),
					transition: "transform 220ms ease, border-color 220ms ease",
					"&:hover": { transform: "translateY(-1px)", borderColor: alpha(baseColor, 0.36) },
				}}
			>
				<CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
					<Typography variant="h4" sx={{ color: baseColor, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
						{value}
					</Typography>
					<Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.2 }}>
						{label}
					</Typography>
				</CardContent>
			</Card>
		);
	};

	return (
		<MainCard title="Credenciales SCBA">
			<Grid container spacing={3}>
				<Grid item xs={12}>
					<Tabs
						value={tabValue}
						onChange={(_, v) => setTabValue(v)}
						sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40 }}
					>
						<Tab label="Credenciales" sx={{ minHeight: 40 }} />
						<Tab label="Notif. credenciales" icon={<Sms size={16} />} iconPosition="start" sx={{ minHeight: 40 }} />
					</Tabs>
				</Grid>

				{tabValue === 0 && (
					<>
				{/* Estadísticas */}
				{stats && (
					<Grid item xs={12}>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Total", stats.total, "primary")}
							</Grid>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Verificadas", stats.verified, "success")}
							</Grid>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Pendientes", stats.syncStatus.pending, "warning")}
							</Grid>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Con errores", stats.syncStatus.error, "error")}
							</Grid>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Causas encontradas", stats.totals.causasFound, "info")}
							</Grid>
							<Grid item xs={6} sm={3} md={2}>
								{renderStatCard("Causas creadas", stats.totals.causasCreated, "secondary")}
							</Grid>
						</Grid>
					</Grid>
				)}

				{/* Filtros */}
				<Grid item xs={12}>
					<Grid container spacing={2} alignItems="flex-end">
						<Grid item xs={12} sm={6} md={3}>
							<TextField
								fullWidth
								size="small"
								label="Buscar usuario"
								placeholder="Nombre o email..."
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							/>
						</Grid>
						<Grid item xs={6} sm={3} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Estado Sync</InputLabel>
								<Select value={syncStatusFilter} label="Estado Sync" onChange={(e) => setSyncStatusFilter(e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="completed">Completado</MenuItem>
									<MenuItem value="in_progress">En progreso</MenuItem>
									<MenuItem value="pending">Pendiente</MenuItem>
									<MenuItem value="error">Error</MenuItem>
									<MenuItem value="never_synced">Sin sincronizar</MenuItem>
									<MenuItem value="idle">Desvinculada</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} sm={3} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Verificado</InputLabel>
								<Select value={verifiedFilter} label="Verificado" onChange={(e) => setVerifiedFilter(e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Sí</MenuItem>
									<MenuItem value="false">No</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} sm={3} md={2}>
							<FormControl fullWidth size="small">
								<InputLabel>Habilitado</InputLabel>
								<Select value={enabledFilter} label="Habilitado" onChange={(e) => setEnabledFilter(e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="true">Sí</MenuItem>
									<MenuItem value="false">No</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={6} sm={6} md={3}>
							<Stack direction="row" spacing={1}>
								<Button variant="contained" size="small" onClick={handleSearch} startIcon={<SearchNormal1 size={16} />}>
									Buscar
								</Button>
								<Button variant="outlined" size="small" onClick={handleClearFilters} startIcon={<CloseCircle size={16} />}>
									Limpiar
								</Button>
								<Tooltip title="Refrescar">
									<IconButton
										size="small"
										onClick={() => {
											fetchCredentials();
											fetchStats();
										}}
									>
										<Refresh size={18} />
									</IconButton>
								</Tooltip>
								<Button
									variant="contained"
									size="small"
									color="success"
									onClick={() => setCreateDialog(true)}
									startIcon={<AddCircle size={16} />}
								>
									Nueva
								</Button>
							</Stack>
						</Grid>
					</Grid>
				</Grid>

				{/* Tabla */}
				<Grid item xs={12}>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Usuario</TableCell>
									<TableCell>Dom. Electrónico</TableCell>
									<TableCell align="center">Estado</TableCell>
									<TableCell align="center">Verificado</TableCell>
									<TableCell align="center">Habilitado</TableCell>
									<TableCell align="right">Causas</TableCell>
									<TableCell align="right">Creadas</TableCell>
									<TableCell>Última Sync</TableCell>
									<TableCell align="center">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{loading ? (
									<TableRow>
										<TableCell colSpan={9} align="center" sx={{ py: 4 }}>
											<CircularProgress size={32} />
										</TableCell>
									</TableRow>
								) : credentials.length === 0 ? (
									<TableRow>
										<TableCell colSpan={9} align="center" sx={{ py: 4 }}>
											<Typography color="text.secondary">No se encontraron credenciales</Typography>
										</TableCell>
									</TableRow>
								) : (
									credentials.map((cred) => (
										<TableRow key={cred._id} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
											<TableCell>
												<Stack>
													<Typography variant="body2" fontWeight={500}>
														{cred.userName}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{cred.userEmail}
													</Typography>
												</Stack>
											</TableCell>
											<TableCell>
												<Typography
													variant="body2"
													sx={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums", fontSize: "0.78rem" }}
												>
													{cred.usernameMasked}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Tooltip title={formatUnlinkDetail(cred) || ""} arrow disableHoverListener={cred.syncStatus !== "idle"}>
													<Chip
														label={getSyncStatusLabel(cred.syncStatus)}
														color={getSyncStatusColor(cred.syncStatus) as any}
														size="small"
														sx={{ fontWeight: 600, letterSpacing: 0.3 }}
													/>
												</Tooltip>
											</TableCell>
											<TableCell align="center">
												{cred.verified ? (
													<TickCircle size={20} color={theme.palette.success.main} variant="Bold" />
												) : (
													<CloseCircle size={20} color={theme.palette.error.main} variant="Bold" />
												)}
											</TableCell>
											<TableCell align="center">
												{cred.enabled ? (
													<TickCircle size={20} color={theme.palette.success.main} variant="Bold" />
												) : (
													<CloseCircle size={20} color={theme.palette.warning.main} variant="Bold" />
												)}
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
													{cred.stats?.totalCausasFound || 0}
												</Typography>
											</TableCell>
											<TableCell align="right">
												<Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
													{cred.stats?.causasCreated || 0}
												</Typography>
											</TableCell>
											<TableCell>
												<Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
													{formatDate(cred.lastSync)}
												</Typography>
											</TableCell>
											<TableCell align="center">
												<Stack direction="row" spacing={0.5} justifyContent="center">
													<Tooltip title="Recorrido de recordatorios">
														<IconButton size="small" onClick={() => handleOpenReminders(cred)} color="default">
															<Notification size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title={cred.enabled ? "Deshabilitar" : "Habilitar"}>
														<IconButton size="small" onClick={() => handleToggleEnabled(cred)} color={cred.enabled ? "success" : "warning"}>
															{cred.enabled ? <ToggleOnCircle size={18} /> : <ToggleOffCircle size={18} />}
														</IconButton>
													</Tooltip>
													<Tooltip title="Resetear para re-sync">
														<IconButton size="small" onClick={() => handleReset(cred)} color="info">
															<RefreshCircle size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Resetear + limpiar causas">
														<IconButton
															size="small"
															onClick={() =>
																setCleanDialog({
																	open: true,
																	credential: cred,
																})
															}
															color="warning"
														>
															<Broom size={18} />
														</IconButton>
													</Tooltip>
													<Tooltip title="Eliminar">
														<IconButton
															size="small"
															onClick={() =>
																setDeleteDialog({
																	open: true,
																	credential: cred,
																})
															}
															color="error"
														>
															<Trash size={18} />
														</IconButton>
													</Tooltip>
												</Stack>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</TableContainer>
					<EnhancedTablePagination
						count={totalCount}
						page={page}
						onPageChange={(_, newPage) => setPage(newPage)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(0);
						}}
						rowsPerPageOptions={[10, 25, 50, 100]}
					/>
				</Grid>
					</>
				)}

				{tabValue === 1 && (
					<Grid item xs={12}>
						<Grid container spacing={2}>
							{/* Filtros */}
							<Grid item xs={12}>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-end" flexWrap="wrap" useFlexGap>
									<TextField
										size="small"
										label="Filtrar por email destinatario"
										placeholder="Ej: usuario@mail.com"
										value={emailLogsUserFilter}
										onChange={(e) => setEmailLogsUserFilter(e.target.value)}
										onKeyPress={(e) => {
											if (e.key === "Enter") {
												setEmailLogsPage(0);
												fetchEmailLogs(0, emailLogsRowsPerPage);
											}
										}}
										sx={{ minWidth: 220 }}
									/>
									<FormControl size="small" sx={{ minWidth: 160 }}>
										<InputLabel>Estado</InputLabel>
										<Select value={emailLogsStatusFilter} label="Estado" onChange={(e) => setEmailLogsStatusFilter(e.target.value)}>
											<MenuItem value="todos">Todos</MenuItem>
											<MenuItem value="sent">Enviado</MenuItem>
											<MenuItem value="delivered">Entregado</MenuItem>
											<MenuItem value="failed">Fallido</MenuItem>
											<MenuItem value="bounced">Rebotado</MenuItem>
											<MenuItem value="complained">Complaint</MenuItem>
										</Select>
									</FormControl>
									<FormControl size="small" sx={{ minWidth: 200 }}>
										<InputLabel>Tipo</InputLabel>
										<Select value={emailLogsTemplateFilter} label="Tipo" onChange={(e) => setEmailLogsTemplateFilter(e.target.value)}>
											<MenuItem value="todos">Todos los avisos</MenuItem>
											{SCBA_CREDENTIAL_TEMPLATES.map((tpl) => (
												<MenuItem key={tpl} value={tpl}>
													{CREDENTIAL_TEMPLATE_LABELS[tpl]}
												</MenuItem>
											))}
										</Select>
									</FormControl>
									<Button
										variant="contained"
										size="small"
										startIcon={<SearchNormal1 size={16} />}
										onClick={() => {
											setEmailLogsPage(0);
											fetchEmailLogs(0, emailLogsRowsPerPage);
										}}
									>
										Buscar
									</Button>
									<Button
										variant="outlined"
										size="small"
										startIcon={<CloseCircle size={16} />}
										onClick={() => {
											setEmailLogsStatusFilter("todos");
											setEmailLogsTemplateFilter("todos");
											setEmailLogsUserFilter("");
											setEmailLogsPage(0);
											setTimeout(() => fetchEmailLogs(0, emailLogsRowsPerPage), 100);
										}}
									>
										Limpiar
									</Button>
									<Tooltip title="Refrescar">
										<IconButton size="small" onClick={() => fetchEmailLogs(emailLogsPage, emailLogsRowsPerPage)}>
											<Refresh size={18} />
										</IconButton>
									</Tooltip>
								</Stack>
							</Grid>

							{/* Tabla de logs */}
							<Grid item xs={12}>
								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Destinatario</TableCell>
												<TableCell>Asunto</TableCell>
												<TableCell>Tipo</TableCell>
												<TableCell align="center">Estado</TableCell>
												<TableCell>Fuente</TableCell>
												<TableCell>Fecha</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{emailLogsLoading ? (
												<TableRow>
													<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
														<CircularProgress size={28} />
													</TableCell>
												</TableRow>
											) : emailLogs.length === 0 ? (
												<TableRow>
													<TableCell colSpan={6} align="center" sx={{ py: 4 }}>
														<Typography color="text.secondary">No se encontraron notificaciones</Typography>
													</TableCell>
												</TableRow>
											) : (
												emailLogs.map((log) => {
													const user = typeof log.userId === "object" && log.userId ? log.userId : null;
													const statusColorMap: Record<string, "success" | "error" | "warning" | "default" | "info"> = {
														sent: "info",
														delivered: "success",
														failed: "error",
														bounced: "warning",
														complained: "warning",
													};
													const statusLabelMap: Record<string, string> = {
														sent: "Enviado",
														delivered: "Entregado",
														failed: "Fallido",
														bounced: "Rebotado",
														complained: "Complaint",
													};
													return (
														<TableRow key={log._id} hover>
															<TableCell>
																<Stack>
																	{user ? (
																		<>
																			<Typography variant="body2" fontWeight={500}>
																				{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || user.email}
																			</Typography>
																			<Typography variant="caption" color="text.secondary">
																				{log.to}
																			</Typography>
																		</>
																	) : (
																		<Typography variant="body2">{log.to}</Typography>
																	)}
																</Stack>
															</TableCell>
															<TableCell>
																<Tooltip title={log.subject}>
																	<Typography
																		variant="body2"
																		sx={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
																	>
																		{log.subject}
																	</Typography>
																</Tooltip>
																{log.errorMessage && (
																	<Tooltip title={log.errorMessage}>
																		<Typography
																			variant="caption"
																			color="error.main"
																			sx={{ display: "block", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
																		>
																			{log.errorMessage}
																		</Typography>
																	</Tooltip>
																)}
															</TableCell>
															<TableCell>
																<Tooltip title={log.templateName || ""}>
																	<Chip
																		label={(log.templateName && CREDENTIAL_TEMPLATE_LABELS[log.templateName]) || log.templateName || "—"}
																		size="small"
																		variant="outlined"
																	/>
																</Tooltip>
															</TableCell>
															<TableCell align="center">
																<Chip
																	label={statusLabelMap[log.status] || log.status}
																	size="small"
																	color={statusColorMap[log.status] || "default"}
																/>
															</TableCell>
															<TableCell>
																<Typography variant="caption" color="text.secondary">
																	{log.source || "—"}
																</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="caption">{formatDate(log.createdAt)}</Typography>
															</TableCell>
														</TableRow>
													);
												})
											)}
										</TableBody>
									</Table>
								</TableContainer>
								<EnhancedTablePagination
									count={emailLogsTotal}
									page={emailLogsPage}
									onPageChange={(_, newPage) => {
										setEmailLogsPage(newPage);
										fetchEmailLogs(newPage, emailLogsRowsPerPage);
									}}
									rowsPerPage={emailLogsRowsPerPage}
									onRowsPerPageChange={(e) => {
										const rows = parseInt(e.target.value, 10);
										setEmailLogsRowsPerPage(rows);
										setEmailLogsPage(0);
										fetchEmailLogs(0, rows);
									}}
									rowsPerPageOptions={[25, 50, 100]}
								/>
							</Grid>
						</Grid>
					</Grid>
				)}
			</Grid>

			{/* Dialog de confirmación de eliminación */}
			<Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, credential: null })}>
				<DialogTitle>Confirmar eliminación</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Estás seguro de eliminar las credenciales de <strong>{deleteDialog.credential?.userName}</strong> (
						{deleteDialog.credential?.userEmail})?
						<br />
						<br />
						Esta acción no se puede deshacer. Las causas vinculadas no serán eliminadas.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialog({ open: false, credential: null })}>Cancelar</Button>
					<Button onClick={handleDelete} color="error" variant="contained">
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación de reset + limpieza */}
			<Dialog open={cleanDialog.open} onClose={() => setCleanDialog({ open: false, credential: null })}>
				<DialogTitle>Resetear y limpiar causas</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Estás seguro de resetear la sincronización de <strong>{cleanDialog.credential?.userName}</strong> (
						{cleanDialog.credential?.userEmail})?
						<br />
						<br />
						Esta acción:
					</DialogContentText>
					<Box component="ul" sx={{ mt: 1, pl: 2 }}>
						<li>
							<Typography variant="body2">Eliminará las causas creadas exclusivamente por esta sincronización</Typography>
						</li>
						<li>
							<Typography variant="body2">Desvinculará al usuario de causas compartidas con otros usuarios</Typography>
						</li>
						<li>
							<Typography variant="body2">Reseteará el estado de sincronización a &quot;Sin sincronizar&quot;</Typography>
						</li>
					</Box>
					{cleanDialog.credential?.linkedCausasCount ? (
						<Typography variant="body2" color="warning.main" sx={{ mt: 1.5, fontWeight: 500 }}>
							Causas vinculadas: {cleanDialog.credential.linkedCausasCount}
						</Typography>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCleanDialog({ open: false, credential: null })}>Cancelar</Button>
					<Button onClick={handleResetAndClean} color="warning" variant="contained">
						Resetear y limpiar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de creación de credencial */}
			<Dialog
				open={createDialog}
				onClose={() => {
					if (!creating) {
						setCreateDialog(false);
						setCreateForm({ userId: "", username: "", password: "", description: "" });
					}
				}}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Nueva credencial SCBA</DialogTitle>
				<DialogContent>
					<DialogContentText sx={{ mb: 2 }}>Ingresá los datos de la credencial SCBA para vincular a un usuario.</DialogContentText>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							fullWidth
							label="User ID"
							placeholder="ObjectId del usuario"
							value={createForm.userId}
							onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
							disabled={creating}
							required
						/>
						<TextField
							fullWidth
							label="Domicilio electrónico"
							placeholder="Usuario SCBA (ej: 20XXXXXXXX3)"
							value={createForm.username}
							onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
							disabled={creating}
							required
						/>
						<TextField
							fullWidth
							label="Contraseña"
							type="password"
							value={createForm.password}
							onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
							disabled={creating}
							required
						/>
						<TextField
							fullWidth
							label="Descripción (opcional)"
							placeholder="Nota o descripción"
							value={createForm.description}
							onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
							disabled={creating}
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setCreateDialog(false);
							setCreateForm({ userId: "", username: "", password: "", description: "" });
						}}
						disabled={creating}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleCreate}
						variant="contained"
						color="success"
						disabled={creating || !createForm.userId || !createForm.username || !createForm.password}
						startIcon={creating ? <CircularProgress size={16} /> : undefined}
					>
						{creating ? "Creando..." : "Crear"}
					</Button>
				</DialogActions>
			</Dialog>
			{/* Diálogo: Recorrido de recordatorios */}
			<Dialog
				open={reminderDialog.open}
				onClose={() => setReminderDialog({ open: false, credential: null, loading: false, data: null })}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>
					Recorrido de recordatorios
					{reminderDialog.credential && (
						<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
							{reminderDialog.credential.userName} — {reminderDialog.credential.userEmail}
						</Typography>
					)}
				</DialogTitle>
				<DialogContent dividers>
					{reminderDialog.loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress size={28} />
						</Box>
					) : !reminderDialog.data ? (
						<Typography color="text.secondary">No se pudo cargar la información.</Typography>
					) : (
						(() => {
							const d = reminderDialog.data;
							const rh = d.reminderHistory || [];
							// "Inválida / pendiente de re-ingreso" = errored, no desvinculada.
							const credentialInvalid = d.enabled === false && d.isExpired === true && !!d.errorNotifiedAt;
							if (!rh.length) {
								return (
									<Stack spacing={1}>
										<Chip label="Sin recordatorios enviados" size="small" sx={{ alignSelf: "flex-start" }} />
										<Typography variant="caption" color="text.secondary">
											{credentialInvalid
												? `Credencial inválida — el 1er recordatorio se programa ~3 días después de la notificación inicial${
														d.errorNotifiedAt ? ` (${formatDate(d.errorNotifiedAt)})` : ""
													}.`
												: "La credencial no está en estado de error; no hay recordatorios programados."}
										</Typography>
									</Stack>
								);
							}
							const rc = d.reminderCount ?? rh.length;
							let nextRem: Date | null = null;
							if (credentialInvalid && rc < 3) {
								const last = d.lastReminderAt;
								const errN = d.errorNotifiedAt;
								const baseMs = last
									? new Date(last).getTime() + 7 * 86400000
									: errN
										? new Date(errN).getTime() + 3 * 86400000
										: null;
								nextRem = baseMs ? new Date(baseMs) : null;
							}
							return (
								<Box>
									<Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
										<Chip label={`${rc}/3 enviados`} size="small" color={rc >= 3 ? "default" : "info"} />
										<Chip
											label={credentialInvalid ? "Credencial inválida" : "Credencial recuperada"}
											size="small"
											color={credentialInvalid ? "warning" : "success"}
										/>
									</Stack>
									<TableContainer component={Paper} variant="outlined">
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>Fecha</TableCell>
													<TableCell align="center">#</TableCell>
													<TableCell>Destinatario</TableCell>
													<TableCell>Template</TableCell>
													<TableCell align="center">Estado</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{rh
													.slice()
													.reverse()
													.map((r, i) => (
														<TableRow key={i}>
															<TableCell>{formatDate(r.date)}</TableCell>
															<TableCell align="center">{r.reminderNumber}</TableCell>
															<TableCell>{r.to}</TableCell>
															<TableCell>{r.templateName}</TableCell>
															<TableCell align="center">
																<Chip
																	label={r.status || "sent"}
																	size="small"
																	color={r.status === "sent" ? "success" : "default"}
																/>
															</TableCell>
														</TableRow>
													))}
											</TableBody>
										</Table>
									</TableContainer>
									<Divider sx={{ my: 1.5 }} />
									<Typography variant="caption" color="text.secondary">
										{nextRem
											? `Próximo recordatorio programado: ~${formatDate(nextRem.toISOString())}`
											: `Sin más recordatorios programados (${rc}/3 enviados${credentialInvalid ? "" : " — credencial recuperada"}).`}
									</Typography>
								</Box>
							);
						})()
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setReminderDialog({ open: false, credential: null, loading: false, data: null })}>
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>
		</MainCard>
	);
};

export default CredencialesSCBA;
