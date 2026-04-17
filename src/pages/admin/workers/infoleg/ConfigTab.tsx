import { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Divider, FormControlLabel,
  Grid, Skeleton, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import InfolegService from 'api/infolegService';
import type { InfolegConfig } from 'types/infoleg';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const ConfigTab = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [config,  setConfig]  = useState<InfolegConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Form state — scraping
  const [idMax,     setIdMax]     = useState('');
  const [idCurrent, setIdCurrent] = useState('');
  // Form state — scraper worker
  const [scrBatch,   setScrBatch]   = useState('');
  const [scrDelay,   setScrDelay]   = useState('');
  const [scrMin,     setScrMin]     = useState('');
  const [scrMax,     setScrMax]     = useState('');
  const [scrEnabled, setScrEnabled] = useState(true);
  // Form state — vinculaciones worker
  const [vinBatch,   setVinBatch]   = useState('');
  const [vinDelay,   setVinDelay]   = useState('');
  const [vinEnabled, setVinEnabled] = useState(true);
  // Form state — email
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTo,      setEmailTo]      = useState('');
  const [emailHour,    setEmailHour]    = useState('8');

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await InfolegService.getConfig();
      if (res.data) {
        const c = res.data;
        setConfig(c);
        setIdMax(    String(c.config?.scraping?.idMax     ?? 500000));
        setIdCurrent(String(c.config?.scraping?.idCurrent ?? 1));
        setScrBatch(  String(c.config?.workers?.scraper?.batchSize  ?? 20));
        setScrDelay(  String(c.config?.workers?.scraper?.delayMs    ?? 1500));
        setScrMin(    String(c.config?.workers?.scraper?.minWorkers  ?? 1));
        setScrMax(    String(c.config?.workers?.scraper?.maxWorkers  ?? 3));
        setScrEnabled(c.config?.workers?.scraper?.enabled ?? true);
        setVinBatch(  String(c.config?.workers?.vinculaciones?.batchSize ?? 30));
        setVinDelay(  String(c.config?.workers?.vinculaciones?.delayMs   ?? 500));
        setVinEnabled(c.config?.workers?.vinculaciones?.enabled ?? true);
        setEmailEnabled(c.config?.email?.sendDailyReport ?? false);
        setEmailTo(    c.config?.email?.reportTo ?? '');
        setEmailHour(  String(c.config?.email?.reportHour ?? 8));
      }
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Error al cargar configuración', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await InfolegService.updateConfig({
        scraping: {
          idMax:     parseInt(idMax),
          idCurrent: parseInt(idCurrent),
        },
        workers: {
          scraper: {
            enabled:   scrEnabled,
            batchSize: parseInt(scrBatch),
            delayMs:   parseInt(scrDelay),
            minWorkers: parseInt(scrMin),
            maxWorkers: parseInt(scrMax),
          },
          vinculaciones: {
            enabled:   vinEnabled,
            batchSize: parseInt(vinBatch),
            delayMs:   parseInt(vinDelay),
          },
        },
        email: {
          sendDailyReport: emailEnabled,
          reportTo:        emailTo,
          reportHour:      parseInt(emailHour),
        },
      });
      enqueueSnackbar('Configuración guardada', { variant: 'success' });
      fetchConfig();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Error al guardar', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
      </Stack>
    );
  }

  if (!config) {
    return (
      <Alert severity="info">
        No hay documento de configuración todavía. El manager debe haber iniciado al menos una vez.
      </Alert>
    );
  }

  return (
    <Stack spacing={3.5}>
      {/* Rango de IDs */}
      <Box>
        <Typography variant="h6" gutterBottom>Rango de IDs a scrapear</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="ID máximo" type="number" size="small"
              value={idMax} onChange={e => setIdMax(e.target.value)}
              helperText="Límite superior del rango. InfoLeg ronda los 300.000 IDs activos." />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="ID actual (cursor)" type="number" size="small"
              value={idCurrent} onChange={e => setIdCurrent(e.target.value)}
              helperText="El manager siembra IDs desde aquí hacia adelante." />
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Scraper worker */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">Worker Scraper</Typography>
          <FormControlLabel
            control={<Switch checked={scrEnabled} onChange={e => setScrEnabled(e.target.checked)} />}
            label={scrEnabled ? 'Habilitado' : 'Deshabilitado'}
          />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Batch size" type="number" size="small"
              value={scrBatch} onChange={e => setScrBatch(e.target.value)}
              helperText="Normas por ciclo" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Delay entre requests (ms)" type="number" size="small"
              value={scrDelay} onChange={e => setScrDelay(e.target.value)}
              helperText="Mínimo 1000ms recomendado" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Instancias mínimas" type="number" size="small"
              value={scrMin} onChange={e => setScrMin(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth label="Instancias máximas" type="number" size="small"
              value={scrMax} onChange={e => setScrMax(e.target.value)}
              helperText="InfoLeg tolera pocas conexiones" />
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Vinculaciones worker */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">Worker Vinculaciones</Typography>
          <FormControlLabel
            control={<Switch checked={vinEnabled} onChange={e => setVinEnabled(e.target.checked)} />}
            label={vinEnabled ? 'Habilitado' : 'Deshabilitado'}
          />
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Batch size" type="number" size="small"
              value={vinBatch} onChange={e => setVinBatch(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Delay entre operaciones (ms)" type="number" size="small"
              value={vinDelay} onChange={e => setVinDelay(e.target.value)} />
          </Grid>
        </Grid>
      </Box>

      <Divider />

      {/* Email */}
      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography variant="h6">Reporte diario por email</Typography>
          <FormControlLabel
            control={<Switch checked={emailEnabled} onChange={e => setEmailEnabled(e.target.checked)} />}
            label={emailEnabled ? 'Habilitado' : 'Deshabilitado'}
          />
        </Stack>
        {emailEnabled && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <TextField fullWidth label="Email destinatario" size="small"
                value={emailTo} onChange={e => setEmailTo(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Hora de envío (0–23)" type="number" size="small"
                value={emailHour} onChange={e => setEmailHour(e.target.value)}
                inputProps={{ min: 0, max: 23 }} />
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Estado del manager */}
      {config.state && (
        <>
          <Divider />
          <Box>
            <Typography variant="h6" gutterBottom>Estado del manager</Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Estado</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {config.state.managerRunning ? '🟢 Corriendo' : '🔴 Detenido'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Ciclos ejecutados</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {config.state.cycleCount?.toLocaleString('es-AR') ?? '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="caption" color="text.secondary">Último ciclo</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {config.state.lastCycle
                    ? new Date(config.state.lastCycle).toLocaleString('es-AR')
                    : '—'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </>
      )}

      <Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : undefined}
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </Box>
    </Stack>
  );
};

export default ConfigTab;
