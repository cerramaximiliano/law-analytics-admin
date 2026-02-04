/**
 * EJE Workers Configuration Page
 * Comprehensive dashboard for managing EJE workers with separate tabs for each worker type
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Switch,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import {
  Refresh,
  Play,
  Pause,
  Warning2,
  TickCircle,
  CloseCircle,
  Cpu,
  DocumentText1,
  Chart,
  Edit2,
  SearchNormal1,
  Briefcase,
} from "iconsax-react";
import MainCard from "components/MainCard";
import { useTheme, alpha } from "@mui/material/styles";
import configEje, {
  IAllWorkersResponse,
  IManagerWorkerConfig,
  IWorkerStatusDetail,
  IDailyWorkerStats,
  IAlert,
} from "api/configEje";

// ========== INTERFACES ==========

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface WorkerCardProps {
  workerType: "verification" | "update" | "stuck";
  config: IManagerWorkerConfig;
  status: IWorkerStatusDetail;
  onToggle: () => void;
  onEdit: () => void;
  loading?: boolean;
}

interface EditDialogProps {
  open: boolean;
  workerType: "verification" | "update" | "stuck" | null;
  config: IManagerWorkerConfig | null;
  onClose: () => void;
  onSave: (updates: Partial<IManagerWorkerConfig>) => void;
  loading?: boolean;
}

// ========== HELPER COMPONENTS ==========

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`eje-tabpanel-${index}`}
      aria-labelledby={`eje-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

// Worker Card Component
const WorkerCard: React.FC<WorkerCardProps> = ({
  workerType,
  config,
  status,
  onToggle,
  onEdit,
  loading,
}) => {
  const theme = useTheme();

  const workerLabels: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
    verification: {
      name: "Verificación",
      description: "Verifica que los expedientes existen en el sistema EJE",
      icon: <SearchNormal1 size={24} />,
    },
    update: {
      name: "Actualización",
      description: "Actualiza expedientes verificados con nuevos movimientos",
      icon: <Refresh size={24} />,
    },
    stuck: {
      name: "Recuperación",
      description: "Recupera expedientes que quedaron trabados",
      icon: <Briefcase size={24} />,
    },
  };

  const label = workerLabels[workerType];

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: config?.enabled ? theme.palette.success.main : theme.palette.grey[300],
        borderWidth: config?.enabled ? 2 : 1,
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: config?.enabled
                ? alpha(theme.palette.success.main, 0.1)
                : alpha(theme.palette.grey[500], 0.1),
              color: config?.enabled ? theme.palette.success.main : theme.palette.grey[500],
            }}
          >
            {label.icon}
          </Box>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6">{label.name}</Typography>
            <Chip
              size="small"
              label={config?.enabled ? "Activo" : "Inactivo"}
              color={config?.enabled ? "success" : "default"}
            />
          </Stack>
        }
        subheader={label.description}
        action={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Editar configuración">
              <IconButton onClick={onEdit} disabled={loading}>
                <Edit2 size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={config?.enabled ? "Desactivar" : "Activar"}>
              <Switch
                checked={config?.enabled || false}
                onChange={onToggle}
                disabled={loading}
                color="success"
              />
            </Tooltip>
          </Stack>
        }
      />
      <CardContent>
        <Grid container spacing={2}>
          {/* Status */}
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Estado Actual
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Instancias activas:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status?.activeInstances || 0}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Documentos pendientes:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status?.pendingDocuments || 0}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Instancias óptimas:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status?.optimalInstances || 0}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Config */}
          <Grid item xs={12} sm={6}>
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Configuración
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Workers:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {config?.minWorkers || 0} - {config?.maxWorkers || 0}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Batch size:</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {config?.batchSize || 0}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Cron:</Typography>
                <Typography variant="body2" fontWeight="bold" fontFamily="monospace">
                  {config?.cronExpression || "-"}
                </Typography>
              </Box>
            </Stack>
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Procesados este ciclo
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status?.processedThisCycle || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Errores este ciclo
                </Typography>
                <Typography variant="body2" fontWeight="bold" color="error.main">
                  {status?.errorsThisCycle || 0}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Último procesamiento
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {status?.lastProcessedAt
                    ? new Date(status.lastProcessedAt).toLocaleTimeString("es-AR")
                    : "-"}
                </Typography>
              </Box>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Edit Dialog Component
const EditWorkerDialog: React.FC<EditDialogProps> = ({
  open,
  workerType,
  config,
  onClose,
  onSave,
  loading,
}) => {
  const [formData, setFormData] = useState<Partial<IManagerWorkerConfig>>({});

  useEffect(() => {
    if (config) {
      setFormData({
        minWorkers: config.minWorkers,
        maxWorkers: config.maxWorkers,
        scaleUpThreshold: config.scaleUpThreshold,
        scaleDownThreshold: config.scaleDownThreshold,
        batchSize: config.batchSize,
        delayBetweenRequests: config.delayBetweenRequests,
        maxRetries: config.maxRetries,
        cronExpression: config.cronExpression,
      });
    }
  }, [config]);

  const handleChange = (field: keyof IManagerWorkerConfig) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const workerLabels: Record<string, string> = {
    verification: "Verificación",
    update: "Actualización",
    stuck: "Recuperación",
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configurar Worker de {workerType ? workerLabels[workerType] : ""}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={6}>
            <TextField
              label="Workers mínimos"
              type="number"
              fullWidth
              size="small"
              value={formData.minWorkers || 0}
              onChange={handleChange("minWorkers")}
              InputProps={{ inputProps: { min: 0, max: 10 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Workers máximos"
              type="number"
              fullWidth
              size="small"
              value={formData.maxWorkers || 0}
              onChange={handleChange("maxWorkers")}
              InputProps={{ inputProps: { min: 1, max: 10 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Umbral escalar UP"
              type="number"
              fullWidth
              size="small"
              value={formData.scaleUpThreshold || 0}
              onChange={handleChange("scaleUpThreshold")}
              helperText="Docs pendientes para escalar"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Umbral escalar DOWN"
              type="number"
              fullWidth
              size="small"
              value={formData.scaleDownThreshold || 0}
              onChange={handleChange("scaleDownThreshold")}
              helperText="Docs pendientes para reducir"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Batch size"
              type="number"
              fullWidth
              size="small"
              value={formData.batchSize || 0}
              onChange={handleChange("batchSize")}
              helperText="Documentos por ciclo"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Delay entre requests"
              type="number"
              fullWidth
              size="small"
              value={formData.delayBetweenRequests || 0}
              onChange={handleChange("delayBetweenRequests")}
              InputProps={{
                endAdornment: <InputAdornment position="end">ms</InputAdornment>,
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Reintentos máximos"
              type="number"
              fullWidth
              size="small"
              value={formData.maxRetries || 0}
              onChange={handleChange("maxRetries")}
              InputProps={{ inputProps: { min: 0, max: 10 } }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Expresión Cron"
              fullWidth
              size="small"
              value={formData.cronExpression || ""}
              onChange={handleChange("cronExpression")}
              helperText="Ej: */2 * * * *"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => onSave(formData)}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : "Guardar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== MAIN COMPONENT ==========

const EjeWorkersConfig: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    workerType: "verification" | "update" | "stuck" | null;
    config: IManagerWorkerConfig | null;
  }>({
    open: false,
    workerType: null,
    config: null,
  });

  // Data states
  const [workersData, setWorkersData] = useState<IAllWorkersResponse | null>(null);
  const [todayStats, setTodayStats] = useState<IDailyWorkerStats[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [workersResponse, statsData, alertsData] = await Promise.all([
        configEje.getAllWorkersConfig(),
        configEje.getTodaySummary(),
        configEje.getAlerts(false),
      ]);
      setWorkersData(workersResponse);
      setTodayStats(statsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error fetching EJE config:", error);
      setSnackbar({
        open: true,
        message: "Error cargando configuración EJE",
        severity: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleWorker = async (workerType: "verification" | "update" | "stuck") => {
    setActionLoading(true);
    try {
      const result = await configEje.toggleWorker(workerType);
      setWorkersData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          workers: prev.workers.map((w) =>
            w.workerType === workerType
              ? { ...w, config: { ...w.config, enabled: result.enabled } }
              : w
          ),
        };
      });
      setSnackbar({
        open: true,
        message: `Worker de ${workerType} ${result.enabled ? "activado" : "desactivado"}`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error cambiando estado del worker",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleManager = async () => {
    setActionLoading(true);
    try {
      const result = await configEje.toggleManager();
      setWorkersData((prev) =>
        prev
          ? {
              ...prev,
              managerState: { ...prev.managerState, isRunning: result.isRunning },
            }
          : null
      );
      setSnackbar({
        open: true,
        message: `Manager ${result.isRunning ? "iniciado" : "detenido"}`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error cambiando estado del manager",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditWorker = (workerType: "verification" | "update" | "stuck") => {
    const worker = workersData?.workers.find((w) => w.workerType === workerType);
    setEditDialog({
      open: true,
      workerType,
      config: worker?.config || null,
    });
  };

  const handleSaveWorkerConfig = async (updates: Partial<IManagerWorkerConfig>) => {
    if (!editDialog.workerType) return;

    setActionLoading(true);
    try {
      await configEje.updateWorkerConfig(editDialog.workerType, updates);
      setSnackbar({
        open: true,
        message: "Configuración actualizada",
        severity: "success",
      });
      setEditDialog({ open: false, workerType: null, config: null });
      fetchData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error actualizando configuración",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (index: number) => {
    try {
      await configEje.acknowledgeAlert(index);
      setAlerts((prev) => prev.filter((_, i) => i !== index));
      setSnackbar({
        open: true,
        message: "Alerta confirmada",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error confirmando alerta",
        severity: "error",
      });
    }
  };

  // Get worker data by type
  const getWorkerData = (type: "verification" | "update" | "stuck") => {
    return workersData?.workers.find((w) => w.workerType === type);
  };

  // Calculate summary stats from today's data
  const summaryStats = todayStats.reduce(
    (acc, stat) => ({
      processed: acc.processed + stat.totalProcessed,
      success: acc.success + stat.totalSuccess,
      errors: acc.errors + stat.totalErrors,
      movimientos: acc.movimientos + stat.totalMovimientosFound,
      runs: acc.runs + stat.runsCompleted,
    }),
    { processed: 0, success: 0, errors: 0, movimientos: 0, runs: 0 }
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {/* Header Card */}
        <Grid item xs={12}>
          <MainCard
            title="Workers EJE"
            secondary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={workersData?.managerState.isRunning ? "Manager Activo" : "Manager Detenido"}
                  color={workersData?.managerState.isRunning ? "success" : "error"}
                  size="small"
                />
                <Tooltip title={workersData?.managerState.isRunning ? "Detener Manager" : "Iniciar Manager"}>
                  <IconButton onClick={handleToggleManager} disabled={actionLoading}>
                    {workersData?.managerState.isRunning ? <Pause size={20} /> : <Play size={20} />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Actualizar">
                  <IconButton
                    onClick={handleRefresh}
                    disabled={refreshing}
                    sx={{
                      animation: refreshing ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": {
                        "0%": { transform: "rotate(0deg)" },
                        "100%": { transform: "rotate(360deg)" },
                      },
                    }}
                  >
                    <Refresh size={20} />
                  </IconButton>
                </Tooltip>
              </Stack>
            }
          >
            <Typography variant="body2" color="text.secondary">
              Gestión de workers para el sistema EJE (Expediente Judicial Electrónico) - Verificación
              y Actualización de expedientes
            </Typography>
          </MainCard>
        </Grid>

        {/* Quick Stats Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4">{summaryStats.processed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Procesados Hoy
                  </Typography>
                </Box>
                <DocumentText1 size={32} color={theme.palette.primary.main} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {summaryStats.success}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Exitosos
                  </Typography>
                </Box>
                <TickCircle size={32} color={theme.palette.success.main} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {summaryStats.errors}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Errores
                  </Typography>
                </Box>
                <CloseCircle size={32} color={theme.palette.error.main} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4">
                    {(workersData?.managerState.systemResources?.cpuUsage || 0) * 100 < 1
                      ? "<1"
                      : ((workersData?.managerState.systemResources?.cpuUsage || 0) * 100).toFixed(0)}
                    %
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    CPU / Memoria:{" "}
                    {((workersData?.managerState.systemResources?.memoryUsage || 0) * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Cpu size={32} color={theme.palette.info.main} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined" sx={{ borderColor: theme.palette.warning.main }}>
              <CardHeader
                title="Alertas Activas"
                avatar={<Warning2 size={20} color={theme.palette.warning.main} />}
              />
              <CardContent>
                <Stack spacing={1}>
                  {alerts.map((alert, index) => (
                    <Alert
                      key={index}
                      severity={
                        alert.type.includes("high") || alert.type === "manager_stopped"
                          ? "warning"
                          : "info"
                      }
                      action={
                        <Button size="small" onClick={() => handleAcknowledgeAlert(index)}>
                          Confirmar
                        </Button>
                      }
                    >
                      {alert.message}
                    </Alert>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Main Content with Tabs */}
        <Grid item xs={12}>
          <MainCard>
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label="Verificación"
                icon={<SearchNormal1 size={18} />}
                iconPosition="start"
              />
              <Tab label="Actualización" icon={<Refresh size={18} />} iconPosition="start" />
              <Tab label="Sistema" icon={<Cpu size={18} />} iconPosition="start" />
              <Tab label="Estadísticas" icon={<Chart size={18} />} iconPosition="start" />
            </Tabs>

            {/* Tab 0: Verification Worker */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <WorkerCard
                    workerType="verification"
                    config={getWorkerData("verification")?.config || ({} as IManagerWorkerConfig)}
                    status={getWorkerData("verification")?.status || ({} as IWorkerStatusDetail)}
                    onToggle={() => handleToggleWorker("verification")}
                    onEdit={() => handleEditWorker("verification")}
                    loading={actionLoading}
                  />
                </Grid>

                {/* Verification Stats */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Estadísticas de Hoy - Verificación" />
                    <CardContent>
                      {todayStats.filter((s) => s.workerType === "verification").length > 0 ? (
                        <Stack spacing={1}>
                          {todayStats
                            .filter((s) => s.workerType === "verification")
                            .map((stat, i) => (
                              <Box key={i}>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Procesados:</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {stat.totalProcessed}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Exitosos:</Typography>
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {stat.totalSuccess}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Errores:</Typography>
                                  <Typography variant="body2" fontWeight="bold" color="error.main">
                                    {stat.totalErrors}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Runs completados:</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {stat.runsCompleted}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                        </Stack>
                      ) : (
                        <Typography color="text.secondary" textAlign="center">
                          Sin estadísticas disponibles
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Configuración Detallada" />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell>Proceso PM2</TableCell>
                              <TableCell align="right">
                                {getWorkerData("verification")?.config?.workerName || "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Límite de memoria</TableCell>
                              <TableCell align="right">
                                {getWorkerData("verification")?.config?.maxMemoryRestart || "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Delay entre requests</TableCell>
                              <TableCell align="right">
                                {getWorkerData("verification")?.config?.delayBetweenRequests || 0} ms
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Reintentos máximos</TableCell>
                              <TableCell align="right">
                                {getWorkerData("verification")?.config?.maxRetries || 0}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 1: Update Worker */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <WorkerCard
                    workerType="update"
                    config={getWorkerData("update")?.config || ({} as IManagerWorkerConfig)}
                    status={getWorkerData("update")?.status || ({} as IWorkerStatusDetail)}
                    onToggle={() => handleToggleWorker("update")}
                    onEdit={() => handleEditWorker("update")}
                    loading={actionLoading}
                  />
                </Grid>

                {/* Update Stats */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Estadísticas de Hoy - Actualización" />
                    <CardContent>
                      {todayStats.filter((s) => s.workerType === "update").length > 0 ? (
                        <Stack spacing={1}>
                          {todayStats
                            .filter((s) => s.workerType === "update")
                            .map((stat, i) => (
                              <Box key={i}>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Procesados:</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {stat.totalProcessed}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Exitosos:</Typography>
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {stat.totalSuccess}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Errores:</Typography>
                                  <Typography variant="body2" fontWeight="bold" color="error.main">
                                    {stat.totalErrors}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Movimientos encontrados:</Typography>
                                  <Typography variant="body2" fontWeight="bold" color="info.main">
                                    {stat.totalMovimientosFound}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                  <Typography variant="body2">Runs completados:</Typography>
                                  <Typography variant="body2" fontWeight="bold">
                                    {stat.runsCompleted}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                        </Stack>
                      ) : (
                        <Typography color="text.secondary" textAlign="center">
                          Sin estadísticas disponibles
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Configuración Detallada" />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell>Proceso PM2</TableCell>
                              <TableCell align="right">
                                {getWorkerData("update")?.config?.workerName || "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Límite de memoria</TableCell>
                              <TableCell align="right">
                                {getWorkerData("update")?.config?.maxMemoryRestart || "-"}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Delay entre requests</TableCell>
                              <TableCell align="right">
                                {getWorkerData("update")?.config?.delayBetweenRequests || 0} ms
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Reintentos máximos</TableCell>
                              <TableCell align="right">
                                {getWorkerData("update")?.config?.maxRetries || 0}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 2: System */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                {/* Manager Status */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title="Estado del Manager"
                      action={
                        <Chip
                          size="small"
                          label={workersData?.managerState.isRunning ? "Activo" : "Detenido"}
                          color={workersData?.managerState.isRunning ? "success" : "error"}
                        />
                      }
                    />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Ciclos ejecutados:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {workersData?.managerState.cycleCount || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Último ciclo:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {workersData?.managerState.lastCycleAt
                              ? new Date(workersData.managerState.lastCycleAt).toLocaleString("es-AR")
                              : "-"}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Intervalo de chequeo:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {(workersData?.globalSettings?.checkInterval || 60000) / 1000}s
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* System Resources */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Recursos del Sistema" />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2">CPU</Typography>
                            <Typography variant="body2">
                              {(
                                (workersData?.managerState.systemResources?.cpuUsage || 0) * 100
                              ).toFixed(1)}
                              %
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={(workersData?.managerState.systemResources?.cpuUsage || 0) * 100}
                            color={
                              (workersData?.managerState.systemResources?.cpuUsage || 0) >
                              (workersData?.globalSettings?.cpuThreshold || 0.75)
                                ? "error"
                                : "primary"
                            }
                          />
                        </Box>
                        <Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="body2">Memoria</Typography>
                            <Typography variant="body2">
                              {(
                                (workersData?.managerState.systemResources?.memoryUsage || 0) * 100
                              ).toFixed(1)}
                              %
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={
                              (workersData?.managerState.systemResources?.memoryUsage || 0) * 100
                            }
                            color={
                              (workersData?.managerState.systemResources?.memoryUsage || 0) >
                              (workersData?.globalSettings?.memoryThreshold || 0.8)
                                ? "error"
                                : "primary"
                            }
                          />
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Memoria libre:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {workersData?.managerState.systemResources?.memoryFree || 0} MB
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Global Settings */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Configuración Global" />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell>Umbral CPU</TableCell>
                              <TableCell align="right">
                                {((workersData?.globalSettings?.cpuThreshold || 0.75) * 100).toFixed(0)}%
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Umbral Memoria</TableCell>
                              <TableCell align="right">
                                {((workersData?.globalSettings?.memoryThreshold || 0.8) * 100).toFixed(0)}%
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Horario de trabajo</TableCell>
                              <TableCell align="right">
                                {workersData?.globalSettings?.workStartHour || 0}:00 -{" "}
                                {workersData?.globalSettings?.workEndHour || 23}:00
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Zona horaria</TableCell>
                              <TableCell align="right">
                                {workersData?.globalSettings?.timezone || "America/Argentina/Buenos_Aires"}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Working Days */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Días de Trabajo" />
                    <CardContent>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day, i) => (
                          <Chip
                            key={day}
                            label={day}
                            color={
                              workersData?.globalSettings?.workDays?.includes(i) ? "primary" : "default"
                            }
                            variant={
                              workersData?.globalSettings?.workDays?.includes(i) ? "filled" : "outlined"
                            }
                          />
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 3: Statistics */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardHeader title="Estadísticas de Hoy por Worker" />
                    <CardContent>
                      {todayStats.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Worker</TableCell>
                                <TableCell align="right">Procesados</TableCell>
                                <TableCell align="right">Exitosos</TableCell>
                                <TableCell align="right">Errores</TableCell>
                                <TableCell align="right">Movimientos</TableCell>
                                <TableCell align="right">Runs</TableCell>
                                <TableCell align="right">Tiempo Prom.</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {todayStats.map((stat, i) => (
                                <TableRow key={i}>
                                  <TableCell sx={{ textTransform: "capitalize" }}>
                                    {stat.workerType}
                                  </TableCell>
                                  <TableCell align="right">{stat.totalProcessed}</TableCell>
                                  <TableCell align="right">{stat.totalSuccess}</TableCell>
                                  <TableCell align="right">{stat.totalErrors}</TableCell>
                                  <TableCell align="right">{stat.totalMovimientosFound}</TableCell>
                                  <TableCell align="right">{stat.runsCompleted}</TableCell>
                                  <TableCell align="right">
                                    {stat.avgProcessingTime > 0
                                      ? `${(stat.avgProcessingTime / 1000).toFixed(1)}s`
                                      : "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                          No hay estadísticas disponibles para hoy
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Summary */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Resumen del Día" />
                    <CardContent>
                      <Stack spacing={1}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Total procesados:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {summaryStats.processed}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Total exitosos:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            {summaryStats.success}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Total errores:</Typography>
                          <Typography variant="body2" fontWeight="bold" color="error.main">
                            {summaryStats.errors}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Movimientos encontrados:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {summaryStats.movimientos}
                          </Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Tasa de éxito:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {summaryStats.processed > 0
                              ? ((summaryStats.success / summaryStats.processed) * 100).toFixed(1)
                              : 0}
                            %
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Workers Overview */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Estado de Workers" />
                    <CardContent>
                      <Stack spacing={2}>
                        {workersData?.workers.map((worker) => (
                          <Box
                            key={worker.workerType}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                label={worker.config?.enabled ? "ON" : "OFF"}
                                color={worker.config?.enabled ? "success" : "default"}
                              />
                              <Typography
                                variant="body2"
                                sx={{ textTransform: "capitalize" }}
                              >
                                {worker.workerType}
                              </Typography>
                            </Stack>
                            <Typography variant="body2">
                              {worker.status?.activeInstances || 0} activos /{" "}
                              {worker.status?.pendingDocuments || 0} pendientes
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </MainCard>
        </Grid>
      </Grid>

      {/* Edit Worker Dialog */}
      <EditWorkerDialog
        open={editDialog.open}
        workerType={editDialog.workerType}
        config={editDialog.config}
        onClose={() => setEditDialog({ open: false, workerType: null, config: null })}
        onSave={handleSaveWorkerConfig}
        loading={actionLoading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EjeWorkersConfig;
