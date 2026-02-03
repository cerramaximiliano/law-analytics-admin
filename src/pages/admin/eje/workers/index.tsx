/**
 * EJE Workers Configuration Page
 * Comprehensive dashboard for managing EJE workers
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
  FormControlLabel,
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
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
} from "@mui/material";
import {
  Refresh,
  Play,
  Pause,
  Setting2,
  Warning2,
  TickCircle,
  CloseCircle,
  Cpu,
  Activity,
  Timer1,
  DocumentText1,
  Chart,
  Information,
} from "iconsax-react";
import MainCard from "components/MainCard";
import { useTheme } from "@mui/material/styles";
import configEje, {
  IConfiguracionEje,
  IManagerConfig,
  IDailyWorkerStats,
  IAlert,
} from "api/configEje";

// ========== INTERFACES ==========

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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

// ========== MAIN COMPONENT ==========

const EjeWorkersConfig: React.FC = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  // Data states
  const [config, setConfig] = useState<IConfiguracionEje | null>(null);
  const [managerConfig, setManagerConfig] = useState<IManagerConfig | null>(null);
  const [todayStats, setTodayStats] = useState<IDailyWorkerStats[]>([]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [configData, managerData, statsData] = await Promise.all([
        configEje.getConfig(),
        configEje.getManagerConfig(),
        configEje.getTodaySummary(),
      ]);
      setConfig(configData);
      setManagerConfig(managerData);
      setTodayStats(statsData);
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
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleEnabled = async () => {
    try {
      const result = await configEje.toggleEnabled();
      setConfig((prev) => (prev ? { ...prev, enabled: result.enabled } : null));
      setSnackbar({
        open: true,
        message: `Workers ${result.enabled ? "habilitados" : "deshabilitados"}`,
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error cambiando estado",
        severity: "error",
      });
    }
  };

  const handleToggleManager = async () => {
    try {
      const result = await configEje.toggleManager();
      setManagerConfig((prev) =>
        prev
          ? {
              ...prev,
              currentState: { ...prev.currentState, isRunning: result.isRunning },
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
    }
  };

  const handleAcknowledgeAlert = async (index: number) => {
    try {
      await configEje.acknowledgeAlert(index);
      setManagerConfig((prev) =>
        prev
          ? {
              ...prev,
              alerts: prev.alerts.map((a, i) => (i === index ? { ...a, acknowledged: true } : a)),
            }
          : null
      );
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
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
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
                  label={config?.enabled ? "Habilitado" : "Deshabilitado"}
                  color={config?.enabled ? "success" : "default"}
                  size="small"
                />
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
              Configuración y estadísticas de workers para el sistema EJE (Expediente Judicial Electrónico)
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
                  <Typography variant="h4">{summaryStats.movimientos}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Movimientos
                  </Typography>
                </Box>
                <Activity size={32} color={theme.palette.info.main} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content with Tabs */}
        <Grid item xs={12}>
          <MainCard>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Estado General" icon={<Information size={18} />} iconPosition="start" />
              <Tab label="Configuración" icon={<Setting2 size={18} />} iconPosition="start" />
              <Tab label="Manager" icon={<Cpu size={18} />} iconPosition="start" />
              <Tab label="Estadísticas" icon={<Chart size={18} />} iconPosition="start" />
            </Tabs>

            {/* Tab 0: General Status */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                {/* Workers Status */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title="Estado de Workers"
                      action={
                        <FormControlLabel
                          control={<Switch checked={config?.enabled || false} onChange={handleToggleEnabled} />}
                          label=""
                        />
                      }
                    />
                    <CardContent>
                      <Stack spacing={2}>
                        {["verification", "update", "stuck"].map((type) => {
                          const workerConfig = config?.workers?.[type as keyof typeof config.workers];
                          return (
                            <Box key={type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  label={workerConfig?.enabled ? "ON" : "OFF"}
                                  color={workerConfig?.enabled ? "success" : "default"}
                                />
                                <Typography variant="body1" sx={{ textTransform: "capitalize" }}>
                                  {type}
                                </Typography>
                              </Stack>
                              <Typography variant="body2" color="text.secondary">
                                Batch: {workerConfig?.batchSize || 10}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Manager Status */}
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      title="Estado del Manager"
                      action={
                        <Stack direction="row" spacing={1}>
                          <Chip
                            size="small"
                            label={managerConfig?.currentState.isRunning ? "Activo" : "Detenido"}
                            color={managerConfig?.currentState.isRunning ? "success" : "error"}
                          />
                          <IconButton size="small" onClick={handleToggleManager}>
                            {managerConfig?.currentState.isRunning ? <Pause size={16} /> : <Play size={16} />}
                          </IconButton>
                        </Stack>
                      }
                    />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Workers Activos
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            <Typography>Verificación: {managerConfig?.currentState.workers.verification || 0}</Typography>
                            <Typography>Actualización: {managerConfig?.currentState.workers.update || 0}</Typography>
                          </Stack>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Pendientes
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            <Typography>Verificación: {managerConfig?.currentState.pending.verification || 0}</Typography>
                            <Typography>Actualización: {managerConfig?.currentState.pending.update || 0}</Typography>
                          </Stack>
                        </Box>
                        {managerConfig?.currentState.systemResources && (
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Recursos del Sistema
                            </Typography>
                            <Stack direction="row" spacing={2}>
                              <Typography>
                                CPU: {(managerConfig.currentState.systemResources.cpuUsage * 100).toFixed(1)}%
                              </Typography>
                              <Typography>
                                Memoria: {(managerConfig.currentState.systemResources.memoryUsage * 100).toFixed(1)}%
                              </Typography>
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Alerts */}
                {managerConfig?.alerts && managerConfig.alerts.filter((a) => !a.acknowledged).length > 0 && (
                  <Grid item xs={12}>
                    <Card variant="outlined">
                      <CardHeader
                        title="Alertas Activas"
                        avatar={<Warning2 size={20} color={theme.palette.warning.main} />}
                      />
                      <CardContent>
                        <Stack spacing={1}>
                          {managerConfig.alerts
                            .filter((a) => !a.acknowledged)
                            .map((alert, index) => (
                              <Alert
                                key={index}
                                severity={
                                  alert.type.includes("high") || alert.type === "manager_stopped" ? "warning" : "info"
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
              </Grid>
            </TabPanel>

            {/* Tab 1: Configuration */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Configuración de Workers" />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Worker</TableCell>
                              <TableCell align="right">Batch</TableCell>
                              <TableCell align="right">Delay (ms)</TableCell>
                              <TableCell align="right">Reintentos</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {config?.workers &&
                              Object.entries(config.workers).map(([type, cfg]) => (
                                <TableRow key={type}>
                                  <TableCell sx={{ textTransform: "capitalize" }}>{type}</TableCell>
                                  <TableCell align="right">{cfg.batchSize}</TableCell>
                                  <TableCell align="right">{cfg.delayBetweenRequests}</TableCell>
                                  <TableCell align="right">{cfg.maxRetries}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Horario de Trabajo" />
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Horario
                          </Typography>
                          <Typography>
                            {config?.schedule?.workStartHour}:00 - {config?.schedule?.workEndHour}:00
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Días de trabajo
                          </Typography>
                          <Stack direction="row" spacing={0.5}>
                            {["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"].map((day, i) => (
                              <Chip
                                key={day}
                                label={day}
                                size="small"
                                color={config?.schedule?.workDays?.includes(i) ? "primary" : "default"}
                                variant={config?.schedule?.workDays?.includes(i) ? "filled" : "outlined"}
                              />
                            ))}
                          </Stack>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Cron Expression
                          </Typography>
                          <Typography variant="body2" fontFamily="monospace">
                            {config?.schedule?.cronExpression}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Rate Limiting" />
                    <CardContent>
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={<Switch checked={config?.rateLimiting?.enabled || false} disabled />}
                          label="Rate Limiting Habilitado"
                        />
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Requests por minuto
                          </Typography>
                          <Typography>{config?.rateLimiting?.requestsPerMinute}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Requests por hora
                          </Typography>
                          <Typography>{config?.rateLimiting?.requestsPerHour}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Tab 2: Manager */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Configuración del Manager" />
                    <CardContent>
                      <TableContainer>
                        <Table size="small">
                          <TableBody>
                            <TableRow>
                              <TableCell>Intervalo de verificación</TableCell>
                              <TableCell align="right">
                                {(managerConfig?.config?.checkInterval || 60000) / 1000}s
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Workers mínimos</TableCell>
                              <TableCell align="right">{managerConfig?.config?.minWorkers || 0}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Workers máximos</TableCell>
                              <TableCell align="right">{managerConfig?.config?.maxWorkers || 2}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Umbral para escalar</TableCell>
                              <TableCell align="right">{managerConfig?.config?.scaleUpThreshold || 100}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Umbral para reducir</TableCell>
                              <TableCell align="right">{managerConfig?.config?.scaleDownThreshold || 10}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>CPU máximo</TableCell>
                              <TableCell align="right">
                                {((managerConfig?.config?.cpuThreshold || 0.75) * 100).toFixed(0)}%
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Memoria máxima</TableCell>
                              <TableCell align="right">
                                {((managerConfig?.config?.memoryThreshold || 0.8) * 100).toFixed(0)}%
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader title="Última Acción de Escalado" />
                    <CardContent>
                      {managerConfig?.currentState.lastScaleAction ? (
                        <Stack spacing={1}>
                          <Typography>
                            <strong>Tipo:</strong> {managerConfig.currentState.lastScaleAction.workerType}
                          </Typography>
                          <Typography>
                            <strong>Acción:</strong>{" "}
                            {managerConfig.currentState.lastScaleAction.action === "scale_up"
                              ? "Escalar arriba"
                              : "Escalar abajo"}
                          </Typography>
                          <Typography>
                            <strong>De/A:</strong> {managerConfig.currentState.lastScaleAction.from} {"→"}{" "}
                            {managerConfig.currentState.lastScaleAction.to}
                          </Typography>
                          <Typography>
                            <strong>Razón:</strong> {managerConfig.currentState.lastScaleAction.reason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(managerConfig.currentState.lastScaleAction.timestamp).toLocaleString("es-AR")}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography color="text.secondary">Sin acciones de escalado recientes</Typography>
                      )}
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
                                  <TableCell sx={{ textTransform: "capitalize" }}>{stat.workerType}</TableCell>
                                  <TableCell align="right">{stat.totalProcessed}</TableCell>
                                  <TableCell align="right">{stat.totalSuccess}</TableCell>
                                  <TableCell align="right">{stat.totalErrors}</TableCell>
                                  <TableCell align="right">{stat.totalMovimientosFound}</TableCell>
                                  <TableCell align="right">{stat.runsCompleted}</TableCell>
                                  <TableCell align="right">
                                    {stat.avgProcessingTime > 0 ? `${(stat.avgProcessingTime / 1000).toFixed(1)}s` : "-"}
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

                {/* Global Stats */}
                {config?.stats && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader title="Estadísticas Globales" />
                      <CardContent>
                        <Stack spacing={1}>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography color="text.secondary">Total procesados</Typography>
                            <Typography>{config.stats.documentsProcessed}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography color="text.secondary">Total exitosos</Typography>
                            <Typography color="success.main">{config.stats.documentsSuccess}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography color="text.secondary">Total errores</Typography>
                            <Typography color="error.main">{config.stats.documentsError}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography color="text.secondary">Movimientos extraídos</Typography>
                            <Typography>{config.stats.movimientosExtracted}</Typography>
                          </Box>
                          <Divider />
                          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                            <Typography color="text.secondary">Tasa de éxito</Typography>
                            <Typography>
                              {config.stats.documentsProcessed > 0
                                ? ((config.stats.documentsSuccess / config.stats.documentsProcessed) * 100).toFixed(1)
                                : 0}
                              %
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Daily Stats from Manager */}
                {managerConfig?.dailyStats && managerConfig.dailyStats.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardHeader title="Últimos 7 Días" />
                      <CardContent>
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Fecha</TableCell>
                                <TableCell align="right">Procesados</TableCell>
                                <TableCell align="right">Éxito</TableCell>
                                <TableCell align="right">Errores</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {managerConfig.dailyStats.slice(-7).reverse().map((day, i) => (
                                <TableRow key={i}>
                                  <TableCell>{day.date}</TableCell>
                                  <TableCell align="right">{day.processed}</TableCell>
                                  <TableCell align="right">{day.success}</TableCell>
                                  <TableCell align="right">{day.errors}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </TabPanel>
          </MainCard>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EjeWorkersConfig;
