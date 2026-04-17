import { useCallback, useEffect, useState } from 'react';
import {
  Box, Button, Chip, FormControl, Grid, IconButton,
  InputAdornment, InputLabel, MenuItem, Select,
  Skeleton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow,
  TextField, Tooltip, Typography, alpha, useTheme,
} from '@mui/material';
import { Eye, Refresh, SearchNormal1 } from 'iconsax-react';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import MainCard from 'components/MainCard';
import InfolegService from 'api/infolegService';
import NormaDetailModal from './NormaDetailModal';
import type { InfolegNorma, InfolegNormaFilters, InfolegStatus, InfolegTipo, InfolegVigencia } from 'types/infoleg';

// ── Constants ─────────────────────────────────────────────────

const TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: '',                        label: 'Todos los tipos' },
  { value: 'ley',                     label: 'Ley' },
  { value: 'decreto',                 label: 'Decreto' },
  { value: 'decreto_ley',             label: 'Decreto-Ley' },
  { value: 'decreto_dnu',             label: 'DNU' },
  { value: 'decreto_reglamentario',   label: 'D. Reglamentario' },
  { value: 'resolucion',              label: 'Resolución' },
  { value: 'resolucion_general',      label: 'Res. General' },
  { value: 'resolucion_administrativa', label: 'Res. Administrativa' },
  { value: 'decision_administrativa', label: 'Dec. Administrativa' },
  { value: 'disposicion',             label: 'Disposición' },
  { value: 'disposicion_conjunta',    label: 'Disp. Conjunta' },
  { value: 'otro',                    label: 'Otro' },
];

const STATUS_OPTIONS = [
  { value: '',          label: 'Todos' },
  { value: 'scraped',   label: 'Scrapeado' },
  { value: 'pending',   label: 'Pendiente' },
  { value: 'error',     label: 'Error' },
  { value: 'not_found', label: 'No encontrado' },
];

const VIGENCIA_OPTIONS = [
  { value: '',                    label: 'Todas' },
  { value: 'vigente',             label: 'Vigente' },
  { value: 'derogada',            label: 'Derogada' },
  { value: 'parcialmente_vigente', label: 'Parcialmente vigente' },
  { value: 'desconocida',         label: 'Desconocida' },
];

const TIPO_LABELS: Record<string, string> = {
  ley: 'Ley', decreto: 'Decreto', decreto_ley: 'D/L',
  decreto_reglamentario: 'D.Regl.', decreto_dnu: 'DNU',
  resolucion: 'Res.', resolucion_general: 'R.G.',
  resolucion_administrativa: 'R.A.', decision_administrativa: 'D.A.',
  disposicion: 'Disp.', disposicion_conjunta: 'D.C.',
  acuerdo: 'Acuerdo', convenio: 'Convenio', otro: 'Otro',
};

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  scraped: 'success', pending: 'warning', error: 'error', not_found: 'default',
};

const VIGENCIA_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  vigente: 'success', derogada: 'error',
  parcialmente_vigente: 'warning', desconocida: 'default',
};

// ── Main Page ─────────────────────────────────────────────────

const InfolegNormasPage = () => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [normas,   setNormas]   = useState<InfolegNorma[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [search,   setSearch]   = useState('');
  const [tipo,     setTipo]     = useState('');
  const [status,   setStatus]   = useState('');
  const [vigencia, setVigencia] = useState('');
  const [stale,    setStale]    = useState(false);

  // Detail modal
  const [detailId, setDetailId] = useState<number | null>(null);

  const fetchNormas = useCallback(async () => {
    setLoading(true);
    try {
      const filters: InfolegNormaFilters = {
        page:  page + 1,
        limit: rowsPerPage,
      };
      if (search)  filters.search  = search;
      if (tipo)    filters.tipo    = tipo as InfolegTipo;
      if (status)  filters.status  = status as InfolegStatus;
      if (vigencia) filters.vigencia = vigencia as InfolegVigencia;
      if (stale)   filters.stale   = 'true';

      const res = await InfolegService.listNormas(filters);
      setNormas(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.message || 'Error al cargar normas', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, tipo, status, vigencia, stale, enqueueSnackbar]);

  useEffect(() => { fetchNormas(); }, [fetchNormas]);

  // Reset page when filters change
  const applyFilter = (fn: () => void) => {
    fn();
    setPage(0);
  };

  return (
    <MainCard
      title="Normas InfoLeg"
      secondary={
        <IconButton size="small" onClick={fetchNormas} disabled={loading}>
          <Refresh size={18} />
        </IconButton>
      }
    >
      <Stack spacing={2.5}>
        {/* Filtros */}
        <Grid container spacing={1.5} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth size="small" placeholder="Buscar por ID, número o título…"
              value={search}
              onChange={e => applyFilter(() => setSearch(e.target.value))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchNormal1 size={16} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo</InputLabel>
              <Select value={tipo} label="Tipo" onChange={e => applyFilter(() => setTipo(e.target.value))}>
                {TIPO_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select value={status} label="Estado" onChange={e => applyFilter(() => setStatus(e.target.value))}>
                {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Vigencia</InputLabel>
              <Select value={vigencia} label="Vigencia" onChange={e => applyFilter(() => setVigencia(e.target.value))}>
                {VIGENCIA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} sm={2}>
            <Button
              fullWidth
              variant={stale ? 'contained' : 'outlined'}
              color="warning"
              size="medium"
              onClick={() => applyFilter(() => setStale(s => !s))}
            >
              {stale ? '⚠ Stale activo' : 'Solo stale'}
            </Button>
          </Grid>
        </Grid>

        {/* Tabla */}
        <Box>
          <TableContainer sx={{ borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ fontWeight: 600, width: 70 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }}>Tipo / N°</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Título</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 90 }}>Año</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }}>Vigencia</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 110 }}>Estado</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Scrapeado</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 60 }} align="center">Ver</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: rowsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : normas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Sin resultados</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  normas.map(n => (
                    <TableRow key={n._id} hover
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                      onClick={() => setDetailId(n.infolegId)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">{n.infolegId}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.3}>
                          <Chip label={TIPO_LABELS[n.tipo || ''] || n.tipo || '?'} size="small"
                            variant="outlined" color="primary" sx={{ maxWidth: 90, fontSize: '0.68rem' }} />
                          <Typography variant="caption" fontFamily="monospace">{n.numero || '—'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 340 }}
                          title={n.titulo}>{n.titulo || '—'}</Typography>
                        {n.tasks?.textoActualizadoStale && (
                          <Chip label="stale" size="small" color="warning" sx={{ ml: 0.5, fontSize: '0.6rem' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{n.anio || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={n.vigencia} size="small"
                          color={VIGENCIA_COLOR[n.vigencia] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Chip label={n.status} size="small"
                          color={STATUS_COLOR[n.status] || 'default'} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {n.scrapedAt ? dayjs(n.scrapedAt).format('DD/MM/YY') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); setDetailId(n.infolegId); }}>
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count.toLocaleString('es-AR') : `más de ${to}`}`}
          />
        </Box>
      </Stack>

      <NormaDetailModal
        infolegId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />
    </MainCard>
  );
};

export default InfolegNormasPage;
