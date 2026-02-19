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
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  AlertTitle,
} from "@mui/material";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useTheme } from "@mui/material/styles";
import {
  Eye,
  Refresh,
  SearchNormal1,
  CloseCircle,
  TickCircle,
  Trash,
  ToggleOnCircle,
  ToggleOffCircle,
  RefreshCircle,
  AddCircle,
  Broom,
  Copy,
} from "iconsax-react";
import { enqueueSnackbar } from "notistack";
import MainCard from "components/MainCard";
import pjnCredentialsService, {
  PjnCredential,
  PjnCredentialsFilters,
  SyncActivityResponse,
  PortalStatusResponse,
} from "api/pjnCredentials";

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
    case "never_synced":
      return "Sin sincronizar";
    default:
      return status;
  }
};

// Stat card helper
const StatCard = ({ value, label, color, sx }: { value: string | number; label: string; color: string; sx?: any }) => (
  <Card variant="outlined">
    <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
      <Typography variant="h4" color={color} sx={sx}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </CardContent>
  </Card>
);

// Helper: formato de duración (ms → "Xs" o "Xm Ys")
const formatDuration = (ms: number | null | undefined) => {
  if (!ms || ms <= 0) return "-";
  const totalSecs = Math.round(ms / 1000);
  if (totalSecs < 60) return `${totalSecs}s`;
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}m ${secs}s`;
};

// Helper: formato de duración en segundos
const formatDurationSecs = (secs: number | null | undefined) => {
  if (!secs || secs <= 0) return "-";
  const rounded = Math.round(secs);
  if (rounded < 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${mins}m ${s}s`;
};

// Colores para status de actividad
const getActivityStatusColor = (status: string): "success" | "warning" | "error" | "default" | "info" => {
  switch (status) {
    case "completed": return "success";
    case "partial": return "warning";
    case "error": return "error";
    case "interrupted": return "default";
    case "running": return "info";
    default: return "default";
  }
};

const CredencialesPJN = () => {
  const theme = useTheme();

  // Tab activo
  const [tabValue, setTabValue] = useState(0);

  // Estado de datos
  const [credentials, setCredentials] = useState<PjnCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [syncActivity, setSyncActivity] = useState<SyncActivityResponse["data"] | null>(null);
  const [syncActivityLoading, setSyncActivityLoading] = useState(false);
  const [portalStatus, setPortalStatus] = useState<PortalStatusResponse["data"] | null>(null);

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
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal de confirmación
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    credential: PjnCredential | null;
  }>({ open: false, credential: null });
  const [createDialog, setCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ userId: "", cuil: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [resetSyncDialog, setResetSyncDialog] = useState<{
    open: boolean;
    credential: PjnCredential | null;
    preview: any | null;
    loading: boolean;
    executing: boolean;
  }>({ open: false, credential: null, preview: null, loading: false, executing: false });
  const [rawDialog, setRawDialog] = useState<{
    open: boolean;
    data: any;
    loading: boolean;
    userName: string;
  }>({ open: false, data: null, loading: false, userName: "" });

  // Cargar datos
  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const params: PjnCredentialsFilters = {
        page: page + 1,
        limit: rowsPerPage,
        sortBy,
        sortOrder,
      };

      if (syncStatusFilter !== "todos") params.syncStatus = syncStatusFilter;
      if (verifiedFilter !== "todos") params.verified = verifiedFilter;
      if (enabledFilter !== "todos") params.enabled = enabledFilter;
      if (searchText.trim()) params.search = searchText.trim();

      const response = await pjnCredentialsService.getCredentials(params);
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
      setStatsLoading(true);
      setStatsError(null);
      const response = await pjnCredentialsService.getStats();
      if (response.success) {
        setStats(response.data);
      } else {
        setStatsError("El servidor respondió sin éxito");
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      const msg = error?.response?.data?.message || error?.message || "Error desconocido";
      setStatsError(msg);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPortalStatus = async () => {
    try {
      const response = await pjnCredentialsService.getPortalStatus();
      if (response.success) {
        setPortalStatus(response.data);
      }
    } catch (error) {
      console.error("Error fetching portal status:", error);
    }
  };

  const fetchSyncActivity = async () => {
    try {
      setSyncActivityLoading(true);
      const response = await pjnCredentialsService.getSyncActivity();
      if (response.success) {
        setSyncActivity(response.data);
      }
    } catch (error) {
      console.error("Error fetching sync activity:", error);
      enqueueSnackbar("Error al cargar actividad de sync", { variant: "error" });
    } finally {
      setSyncActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, [page, rowsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
    fetchPortalStatus();
  }, []);

  // Lazy load: cargar sync activity y portal status solo cuando se activa el tab 1
  useEffect(() => {
    if (tabValue === 1 && !syncActivity && !syncActivityLoading) {
      fetchSyncActivity();
      fetchPortalStatus();
    }
  }, [tabValue]);

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

  const handleToggleEnabled = async (credential: PjnCredential) => {
    try {
      const response = await pjnCredentialsService.toggleCredential(
        credential._id,
        !credential.enabled
      );
      if (response.success) {
        enqueueSnackbar(response.message, { variant: "success" });
        fetchCredentials();
        fetchStats();
      }
    } catch (error) {
      enqueueSnackbar("Error al actualizar credencial", { variant: "error" });
    }
  };

  const handleReset = async (credential: PjnCredential) => {
    try {
      const response = await pjnCredentialsService.resetCredential(credential._id);
      if (response.success) {
        enqueueSnackbar(response.message, { variant: "success" });
        fetchCredentials();
        fetchStats();
      }
    } catch (error) {
      enqueueSnackbar("Error al resetear credencial", { variant: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.credential) return;
    try {
      const response = await pjnCredentialsService.deleteCredential(
        deleteDialog.credential._id
      );
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
    if (!createForm.userId || !createForm.cuil || !createForm.password) {
      enqueueSnackbar("Todos los campos son requeridos", { variant: "warning" });
      return;
    }
    try {
      setCreating(true);
      const response = await pjnCredentialsService.createCredential(createForm);
      if (response.success) {
        enqueueSnackbar(response.message || "Credencial creada correctamente", { variant: "success" });
        setCreateDialog(false);
        setCreateForm({ userId: "", cuil: "", password: "" });
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

  const handleOpenResetSync = async (credential: PjnCredential) => {
    setResetSyncDialog({ open: true, credential, preview: null, loading: true, executing: false });
    try {
      const response = await pjnCredentialsService.resetSyncData(credential._id, true);
      if (response.success) {
        setResetSyncDialog((prev) => ({ ...prev, preview: response.data, loading: false }));
      }
    } catch (error) {
      enqueueSnackbar("Error al obtener preview del reset", { variant: "error" });
      setResetSyncDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmResetSync = async () => {
    if (!resetSyncDialog.credential) return;
    setResetSyncDialog((prev) => ({ ...prev, executing: true }));
    try {
      const response = await pjnCredentialsService.resetSyncData(resetSyncDialog.credential._id, false);
      if (response.success) {
        enqueueSnackbar(response.message || "Sincronización reseteada correctamente", { variant: "success" });
        setResetSyncDialog({ open: false, credential: null, preview: null, loading: false, executing: false });
        fetchCredentials();
        fetchStats();
      }
    } catch (error) {
      enqueueSnackbar("Error al resetear sincronización", { variant: "error" });
      setResetSyncDialog((prev) => ({ ...prev, executing: false }));
    }
  };

  const handleViewRaw = async (cred: PjnCredential) => {
    setRawDialog({ open: true, data: null, loading: true, userName: cred.userName });
    try {
      const response = await pjnCredentialsService.getRawCredential(cred._id);
      if (response.success) {
        setRawDialog((prev) => ({ ...prev, data: response.data, loading: false }));
      }
    } catch (error) {
      enqueueSnackbar("Error al obtener datos raw", { variant: "error" });
      setRawDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCopyRaw = () => {
    if (rawDialog.data) {
      navigator.clipboard.writeText(JSON.stringify(rawDialog.data, null, 2));
      enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
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

  return (
    <MainCard title="Credenciales PJN">
      {/* Stats loading/error */}
      {statsLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            Cargando estadísticas...
          </Typography>
        </Box>
      )}
      {statsError && !statsLoading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, px: 2, mb: 2, border: "1px solid", borderColor: "error.main", borderRadius: 1 }}>
          <Typography variant="body2" color="error.main">
            Error al cargar estadísticas: {statsError}
          </Typography>
          <Button size="small" variant="outlined" color="error" onClick={fetchStats} startIcon={<Refresh size={16} />}>
            Reintentar
          </Button>
        </Box>
      )}

      {/* Banner de incidente de portal */}
      {portalStatus?.activeIncident && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>
            Portal PJN -{" "}
            {portalStatus.activeIncident.type === "portal_down"
              ? "Caido"
              : portalStatus.activeIncident.type === "portal_degraded"
              ? "Degradado"
              : "Error de Login"}
          </AlertTitle>
          <Typography variant="body2">
            Detectado por: <strong>{portalStatus.activeIncident.detectedBy}</strong>
            {" | "}
            Desde: <strong>{formatDate(portalStatus.activeIncident.startedAt)}</strong>
            {" | "}
            Credenciales afectadas: <strong>{portalStatus.activeIncident.affectedCredentialsCount}</strong>
            {" | "}
            Errores totales: <strong>{portalStatus.activeIncident.totalErrors}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Las credenciales no son penalizadas durante incidentes del portal.
          </Typography>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Credenciales" />
          <Tab label="Actividad Sync" />
          <Tab label="Movimientos" />
        </Tabs>
      </Box>

      {/* Tab 0: Credenciales */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Stat cards de credenciales */}
          {stats && (
            <>
              {[
                { value: stats.total, label: "Total", color: "primary.main" },
                { value: stats.enabled, label: "Habilitadas", color: "success.main" },
                { value: stats.verified, label: "Verificadas", color: "info.main" },
                { value: stats.isValid, label: "Válidas", color: "success.dark" },
                { value: stats.syncStatus.pending, label: "Pendientes", color: "warning.main" },
                { value: stats.syncStatus.error, label: "Errores", color: "error.main" },
                { value: stats.syncStatus.inProgress, label: "En progreso", color: "info.dark" },
                { value: stats.syncStatus.neverSynced, label: "Sin sincronizar", color: "text.disabled" },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={3} md={1.5} key={idx}>
                  <StatCard {...stat} />
                </Grid>
              ))}
              {[
                { value: stats.totals.causas, label: "Total Causas", color: "info.main" },
                { value: stats.totals.folders, label: "Total Carpetas", color: "secondary.main" },
                { value: stats.totals.avgCausasPerUser, label: "Prom. Causas/Usuario", color: "text.primary" },
              ].map((stat, idx) => (
                <Grid item xs={4} key={`total-${idx}`}>
                  <StatCard {...stat} />
                </Grid>
              ))}
            </>
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
                  <Select
                    value={syncStatusFilter}
                    label="Estado Sync"
                    onChange={(e) => setSyncStatusFilter(e.target.value)}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="completed">Completado</MenuItem>
                    <MenuItem value="in_progress">En progreso</MenuItem>
                    <MenuItem value="pending">Pendiente</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                    <MenuItem value="never_synced">Sin sincronizar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Verificado</InputLabel>
                  <Select
                    value={verifiedFilter}
                    label="Verificado"
                    onChange={(e) => setVerifiedFilter(e.target.value)}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="true">Sí</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Habilitado</InputLabel>
                  <Select
                    value={enabledFilter}
                    label="Habilitado"
                    onChange={(e) => setEnabledFilter(e.target.value)}
                  >
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
                    <IconButton size="small" onClick={() => { fetchCredentials(); fetchStats(); }}>
                      <Refresh size={18} />
                    </IconButton>
                  </Tooltip>
                  <Button variant="contained" size="small" color="success" onClick={() => setCreateDialog(true)} startIcon={<AddCircle size={16} />}>
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
                    <TableCell>CUIL</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Verificado</TableCell>
                    <TableCell align="center">Válido</TableCell>
                    <TableCell align="center">Habilitado</TableCell>
                    <TableCell align="right">Causas</TableCell>
                    <TableCell align="right">Carpetas</TableCell>
                    <TableCell align="right">Movimientos</TableCell>
                    <TableCell>Último Mov.</TableCell>
                    <TableCell align="right">Dur. Sync</TableCell>
                    <TableCell align="right">Syncs</TableCell>
                    <TableCell align="center">Errores</TableCell>
                    <TableCell>Última Sync</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} />
                      </TableCell>
                    </TableRow>
                  ) : credentials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          No se encontraron credenciales
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    credentials.map((cred) => (
                      <TableRow key={cred._id} hover sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                        <TableCell>
                          <Stack>
                            <Typography variant="body2" fontWeight={500}>{cred.userName}</Typography>
                            <Typography variant="caption" color="text.secondary">{cred.userEmail}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">{cred.cuilMasked}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={getSyncStatusLabel(cred.syncStatus)} color={getSyncStatusColor(cred.syncStatus) as any} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          {cred.verified ? <TickCircle size={20} color={theme.palette.success.main} variant="Bold" /> : <CloseCircle size={20} color={theme.palette.error.main} variant="Bold" />}
                        </TableCell>
                        <TableCell align="center">
                          {cred.isValid ? <TickCircle size={20} color={theme.palette.success.main} variant="Bold" /> : <CloseCircle size={20} color={theme.palette.error.main} variant="Bold" />}
                        </TableCell>
                        <TableCell align="center">
                          {cred.enabled ? <TickCircle size={20} color={theme.palette.success.main} variant="Bold" /> : <CloseCircle size={20} color={theme.palette.warning.main} variant="Bold" />}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{cred.processedCausasCount || 0}/{cred.expectedCausasCount || 0}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{cred.foldersCreatedCount || 0}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip
                            title={
                              cred.byFuero && Object.keys(cred.byFuero).length > 0
                                ? Object.entries(cred.byFuero).map(([fuero, count]) => `${fuero}: ${count}`).join(", ")
                                : "Sin datos de fuero"
                            }
                          >
                            <Typography variant="body2" sx={{ cursor: "help" }}>{cred.totalMovements || 0}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(cred.lastMovementDate)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{cred.lastSyncDuration != null ? `${cred.lastSyncDuration}s` : "-"}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{cred.successfulSyncs || 0}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          {cred.consecutiveErrors > 0 || cred.lastError ? (
                            <Tooltip
                              title={
                                cred.lastError
                                  ? `${cred.lastError.message}${cred.lastError.code ? ` [${cred.lastError.code}]` : ""} - ${formatDate(cred.lastError.timestamp)}`
                                  : "Sin detalle"
                              }
                            >
                              <Chip
                                label={cred.consecutiveErrors}
                                color={
                                  cred.lastError?.code &&
                                  ["PORTAL_TIMEOUT", "NETWORK_ERROR", "PORTAL_ERROR", "LOGIN_SERVICE_ERROR"].includes(cred.lastError.code)
                                    ? "warning"
                                    : "error"
                                }
                                size="small"
                                sx={{ minWidth: 32, cursor: "help" }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.disabled">0</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(cred.lastSync)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Ver JSON">
                              <IconButton size="small" onClick={() => handleViewRaw(cred)} color="default"><Eye size={18} /></IconButton>
                            </Tooltip>
                            <Tooltip title={cred.enabled ? "Deshabilitar" : "Habilitar"}>
                              <IconButton size="small" onClick={() => handleToggleEnabled(cred)} color={cred.enabled ? "success" : "warning"}>
                                {cred.enabled ? <ToggleOnCircle size={18} /> : <ToggleOffCircle size={18} />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Resetear para re-sync">
                              <IconButton size="small" onClick={() => handleReset(cred)} color="info"><RefreshCircle size={18} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Resetear sincronización">
                              <IconButton size="small" onClick={() => handleOpenResetSync(cred)} color="warning"><Broom size={18} /></IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar">
                              <IconButton size="small" onClick={() => setDeleteDialog({ open: true, credential: cred })} color="error"><Trash size={18} /></IconButton>
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
        </Grid>
      )}

      {/* Tab 1: Actividad Sync */}
      {tabValue === 1 && (
        <Grid container spacing={2}>
          {/* Botón refrescar */}
          <Grid item xs={12} sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Tooltip title="Refrescar actividad">
              <IconButton size="small" onClick={() => { fetchStats(); fetchSyncActivity(); }}>
                <Refresh size={18} />
              </IconButton>
            </Tooltip>
          </Grid>

          {/* Fila 1: Sync cards (existentes + nuevas) */}
          {stats?.syncActivity && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Sincronización de Causas
                </Typography>
              </Grid>
              {[
                { value: stats.syncActivity.syncsLast24h, label: "Syncs (24h)", color: "info.main" },
                { value: stats.syncActivity.syncsLast7d, label: "Syncs (7d)", color: "info.dark" },
                { value: `${stats.syncActivity.successRate}%`, label: "Tasa de Éxito (7d)", color: stats.syncActivity.successRate >= 90 ? "success.main" : "warning.main" },
                { value: stats.syncActivity.avgDurationMs > 0 ? `${Math.round(stats.syncActivity.avgDurationMs / 1000)}s` : "-", label: "Duración Promedio", color: "text.primary" },
                { value: syncActivity?.additionalMetrics?.avgCausasPerSync ?? "-", label: "Prom Causas/Sync", color: "primary.main" },
                { value: syncActivity?.additionalMetrics?.cacheVsScraping ? `${syncActivity.additionalMetrics.cacheVsScraping.cache}/${syncActivity.additionalMetrics.cacheVsScraping.scraping}` : "-", label: "Cache/Scraping", color: "secondary.main" },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={3} md={2} key={`sync-${idx}`}>
                  <StatCard {...stat} />
                </Grid>
              ))}
            </>
          )}

          {/* Fila 2: Update cards (existentes) */}
          {stats?.updateActivity && (
            <>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Actualización de Movimientos
                </Typography>
              </Grid>
              {[
                { value: stats.updateActivity.runsLast24h, label: "Updates (24h)", color: "secondary.main" },
                { value: stats.updateActivity.runsLast7d, label: "Updates (7d)", color: "secondary.dark" },
                { value: stats.updateActivity.newMovements24h, label: "Mov. Nuevos (24h)", color: "success.main" },
                { value: stats.updateActivity.newMovements7d, label: "Mov. Nuevos (7d)", color: "success.dark" },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={3} key={`update-${idx}`}>
                  <StatCard {...stat} />
                </Grid>
              ))}
            </>
          )}

          {/* Fila 3: Status breakdown (chips) */}
          {syncActivity?.additionalMetrics && (
            <>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>Status Sync (7d)</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {Object.entries(syncActivity.additionalMetrics.syncStatusBreakdown7d).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small" color={getActivityStatusColor(status)} variant="outlined" />
                      ))}
                      {Object.keys(syncActivity.additionalMetrics.syncStatusBreakdown7d).length === 0 && (
                        <Typography variant="caption" color="text.disabled">Sin datos</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>Status Updates (7d)</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                      {Object.entries(syncActivity.additionalMetrics.updateStatusBreakdown7d).map(([status, count]) => (
                        <Chip key={status} label={`${status}: ${count}`} size="small" color={getActivityStatusColor(status)} variant="outlined" />
                      ))}
                      {Object.keys(syncActivity.additionalMetrics.updateStatusBreakdown7d).length === 0 && (
                        <Typography variant="caption" color="text.disabled">Sin datos</Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}

          {/* Loading para syncActivity */}
          {syncActivityLoading && (
            <Grid item xs={12}>
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Cargando actividad detallada...
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Tabla: Últimas Sincronizaciones */}
          {syncActivity?.recentSyncs && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Últimas Sincronizaciones ({syncActivity.recentSyncs.length})
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Usuario</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="right">Causas PJN</TableCell>
                        <TableCell align="right">Nuevas</TableCell>
                        <TableCell align="right">Folders</TableCell>
                        <TableCell align="right">Errores</TableCell>
                        <TableCell align="right">Duración</TableCell>
                        <TableCell>Trigger</TableCell>
                        <TableCell>Fecha</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncActivity.recentSyncs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography variant="body2" color="text.secondary">Sin sincronizaciones recientes</Typography>
                          </TableCell>
                        </TableRow>
                      ) : syncActivity.recentSyncs.map((sync: any, idx: number) => (
                        <TableRow key={sync._id || idx} hover>
                          <TableCell>
                            <Stack>
                              <Typography variant="body2" fontWeight={500}>{sync.userName}</Typography>
                              <Typography variant="caption" color="text.secondary">{sync.userEmail}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={sync.status} size="small" color={getActivityStatusColor(sync.status)} />
                          </TableCell>
                          <TableCell align="right">{sync.results?.totalCausasInPJN ?? "-"}</TableCell>
                          <TableCell align="right">{sync.results?.causasNuevas ?? "-"}</TableCell>
                          <TableCell align="right">{sync.results?.foldersCreados ?? "-"}</TableCell>
                          <TableCell align="right">
                            {(sync.results?.errores || 0) > 0 ? (
                              <Chip label={sync.results.errores} color="error" size="small" sx={{ minWidth: 28 }} />
                            ) : "0"}
                          </TableCell>
                          <TableCell align="right">{formatDuration(sync.metadata?.tiempoEjecucionMs)}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{sync.metadata?.triggeredBy || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(sync.createdAt)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}

          {/* Tabla: Últimos Updates de Movimientos */}
          {syncActivity?.recentUpdateRuns && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Últimos Updates de Movimientos ({syncActivity.recentUpdateRuns.length})
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Usuario</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="right">Causas</TableCell>
                        <TableCell align="right">Procesadas</TableCell>
                        <TableCell align="right">Actualizadas</TableCell>
                        <TableCell align="right">Mov. Nuevos</TableCell>
                        <TableCell align="right">Errores</TableCell>
                        <TableCell align="right">Duración</TableCell>
                        <TableCell>Trigger</TableCell>
                        <TableCell>Fecha</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncActivity.recentUpdateRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} align="center">
                            <Typography variant="body2" color="text.secondary">Sin updates recientes</Typography>
                          </TableCell>
                        </TableRow>
                      ) : syncActivity.recentUpdateRuns.map((run: any, idx: number) => (
                        <TableRow key={run._id || idx} hover>
                          <TableCell>
                            <Stack>
                              <Typography variant="body2" fontWeight={500}>{run.userName}</Typography>
                              <Typography variant="caption" color="text.secondary">{run.userEmail}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={run.status} size="small" color={getActivityStatusColor(run.status)} />
                          </TableCell>
                          <TableCell align="right">{run.results?.totalCausas ?? "-"}</TableCell>
                          <TableCell align="right">{run.results?.causasProcessed ?? "-"}</TableCell>
                          <TableCell align="right">{run.results?.causasUpdated ?? "-"}</TableCell>
                          <TableCell align="right">
                            {(run.results?.newMovimientos || 0) > 0 ? (
                              <Chip label={run.results.newMovimientos} color="success" size="small" sx={{ minWidth: 28 }} />
                            ) : "0"}
                          </TableCell>
                          <TableCell align="right">
                            {(run.results?.causasError || 0) > 0 ? (
                              <Chip label={run.results.causasError} color="error" size="small" sx={{ minWidth: 28 }} />
                            ) : "0"}
                          </TableCell>
                          <TableCell align="right">{formatDurationSecs(run.durationSeconds)}</TableCell>
                          <TableCell>
                            <Stack>
                              <Typography variant="caption">{run.metadata?.triggeredBy || "-"}</Typography>
                              {run.metadata?.isResumedRun && (
                                <Chip label="Resumed" size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: "0.65rem" }} />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(run.createdAt)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}

          {/* Tabla: Errores Recientes */}
          {syncActivity?.recentErrors && syncActivity.recentErrors.length > 0 && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ mb: 0.5 }}>
                  Errores Recientes ({syncActivity.recentErrors.length})
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Fase</TableCell>
                        <TableCell align="right">Cant.</TableCell>
                        <TableCell>Fecha</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {syncActivity.recentErrors.map((err: any, idx: number) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Chip
                              label={err.type === "sync" ? "Sync" : "Update"}
                              size="small"
                              color={err.type === "sync" ? "info" : "secondary"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack>
                              <Typography variant="body2" fontWeight={500}>{err.userName}</Typography>
                              <Typography variant="caption" color="text.secondary">{err.userEmail}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={err.status} size="small" color={getActivityStatusColor(err.status)} />
                          </TableCell>
                          <TableCell>
                            <Tooltip title={err.error?.message || "Sin mensaje"}>
                              <Typography variant="caption" sx={{ maxWidth: 250, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {err.error?.message || "Sin detalle"}
                              </Typography>
                            </Tooltip>
                            {err.error?.code && (
                              <Typography variant="caption" color="text.disabled">[{err.error.code}]</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{err.error?.phase || "-"}</Typography>
                          </TableCell>
                          <TableCell align="right">{err.errorCount || 0}</TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(err.createdAt)}</Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}

          {/* Historial de Incidentes del Portal */}
          {portalStatus?.recentIncidents && portalStatus.recentIncidents.length > 0 && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="warning.main" sx={{ mb: 0.5 }}>
                  Historial de Incidentes del Portal ({portalStatus.recentIncidents.length})
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Inicio</TableCell>
                        <TableCell align="right">Duracion</TableCell>
                        <TableCell align="right">Errores</TableCell>
                        <TableCell align="right">Credenciales</TableCell>
                        <TableCell>Detectado por</TableCell>
                        <TableCell>Workers</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {portalStatus.recentIncidents.map((incident: any) => (
                        <TableRow key={incident._id} hover>
                          <TableCell>
                            <Chip
                              label={
                                incident.type === "portal_down"
                                  ? "Caida"
                                  : incident.type === "portal_degraded"
                                  ? "Degradado"
                                  : "Login"
                              }
                              size="small"
                              color={incident.type === "portal_down" ? "error" : "warning"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(incident.startedAt)}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {incident.durationMinutes != null ? `${incident.durationMinutes} min` : "-"}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{incident.totalErrors || 0}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">{incident.affectedCredentialsCount || 0}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{incident.detectedBy || "-"}</Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {(incident.affectedWorkers || []).map((w: string) => (
                                <Chip key={w} label={w.replace("pjn-", "")} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                              ))}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* Tab 2: Movimientos */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {stats?.movementTotals ? (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Totales de Movimientos
                </Typography>
              </Grid>
              {[
                { value: stats.movementTotals.totalMovements.toLocaleString(), label: "Total Movimientos", color: "primary.main" },
                { value: stats.movementTotals.avgPerFolder, label: "Prom. Mov/Carpeta", color: "text.primary" },
                { value: stats.movementTotals.foldersWithMovements, label: "Carpetas con Movimientos", color: "info.main" },
                { value: stats.movementTotals.lastGlobalMovement ? formatDate(stats.movementTotals.lastGlobalMovement) : "-", label: "Último Movimiento Global", color: "text.primary" },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={3} key={`mov-${idx}`}>
                  <StatCard {...stat} sx={idx === 3 ? { fontSize: "0.9rem" } : undefined} />
                </Grid>
              ))}
            </>
          ) : (
            <Grid item xs={12}>
              <Typography color="text.secondary">Sin datos de movimientos</Typography>
            </Grid>
          )}

          {stats?.byFuero && stats.byFuero.length > 0 && (
            <>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Distribución por Fuero
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {stats.byFuero.map((f: { fuero: string; total: number }) => (
                        <Chip key={f.fuero} label={`${f.fuero}: ${f.total}`} size="small" variant="outlined" color="primary" />
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* Dialog de confirmación de eliminación */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, credential: null })}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de eliminar las credenciales de{" "}
            <strong>{deleteDialog.credential?.userName}</strong> (
            {deleteDialog.credential?.userEmail})?
            <br />
            <br />
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, credential: null })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmación de reset de sincronización */}
      <Dialog
        open={resetSyncDialog.open}
        onClose={() => {
          if (!resetSyncDialog.executing) {
            setResetSyncDialog({ open: false, credential: null, preview: null, loading: false, executing: false });
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resetear sincronización</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de resetear la sincronización de{" "}
            <strong>{resetSyncDialog.credential?.userName}</strong> (
            {resetSyncDialog.credential?.userEmail})?
          </DialogContentText>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <li><Typography variant="body2">Eliminará los folders creados por la sincronización PJN</Typography></li>
            <li><Typography variant="body2">Eliminará las causas creadas exclusivamente por esta sincronización</Typography></li>
            <li><Typography variant="body2">Desvinculará al usuario de causas compartidas</Typography></li>
            <li><Typography variant="body2">Reseteará el estado de sincronización</Typography></li>
          </Box>
          {resetSyncDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : resetSyncDialog.preview ? (
            <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Datos afectados:</Typography>
              <Typography variant="body2">
                Folders a eliminar: <strong>{resetSyncDialog.preview.folders?.total || 0}</strong>
                {" "}({resetSyncDialog.preview.folders?.active || 0} activos, {resetSyncDialog.preview.folders?.archived || 0} archivados)
              </Typography>
              <Typography variant="body2">Causas a eliminar: <strong>{resetSyncDialog.preview.causas?.toDelete || 0}</strong></Typography>
              <Typography variant="body2">Causas a desvincular: <strong>{resetSyncDialog.preview.causas?.toUnlink || 0}</strong></Typography>
              <Typography variant="body2">Registros de sync: <strong>{resetSyncDialog.preview.syncsToDelete || 0}</strong></Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetSyncDialog({ open: false, credential: null, preview: null, loading: false, executing: false })}
            disabled={resetSyncDialog.executing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmResetSync}
            color="warning"
            variant="contained"
            disabled={resetSyncDialog.loading || resetSyncDialog.executing}
            startIcon={resetSyncDialog.executing ? <CircularProgress size={16} /> : undefined}
          >
            {resetSyncDialog.executing ? "Reseteando..." : "Resetear sincronización"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de creación de credencial */}
      <Dialog
        open={createDialog}
        onClose={() => {
          if (!creating) {
            setCreateDialog(false);
            setCreateForm({ userId: "", cuil: "", password: "" });
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva credencial PJN</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Ingresá los datos de la credencial PJN para vincular a un usuario.
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth label="User ID" placeholder="ObjectId del usuario" value={createForm.userId} onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })} disabled={creating} required />
            <TextField fullWidth label="CUIL" placeholder="Ej: 20123456789" value={createForm.cuil} onChange={(e) => setCreateForm({ ...createForm, cuil: e.target.value })} disabled={creating} required />
            <TextField fullWidth label="Contraseña" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} disabled={creating} required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialog(false); setCreateForm({ userId: "", cuil: "", password: "" }); }} disabled={creating}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            color="success"
            disabled={creating || !createForm.userId || !createForm.cuil || !createForm.password}
            startIcon={creating ? <CircularProgress size={16} /> : undefined}
          >
            {creating ? "Creando..." : "Crear"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de raw JSON */}
      <Dialog
        open={rawDialog.open}
        onClose={() => setRawDialog({ open: false, data: null, loading: false, userName: "" })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">Raw JSON - {rawDialog.userName}</Typography>
            {rawDialog.data && (
              <Tooltip title="Copiar JSON">
                <IconButton size="small" onClick={handleCopyRaw}><Copy size={18} /></IconButton>
              </Tooltip>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {rawDialog.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : rawDialog.data ? (
            <Box
              component="pre"
              sx={{
                bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.100",
                color: theme.palette.mode === "dark" ? "grey.300" : "grey.800",
                p: 2,
                borderRadius: 1,
                fontSize: "0.75rem",
                fontFamily: "monospace",
                overflow: "auto",
                maxHeight: "70vh",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                m: 0,
              }}
            >
              {JSON.stringify(rawDialog.data, null, 2)}
            </Box>
          ) : (
            <Typography color="text.secondary">No se pudieron cargar los datos</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRawDialog({ open: false, data: null, loading: false, userName: "" })}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default CredencialesPJN;
