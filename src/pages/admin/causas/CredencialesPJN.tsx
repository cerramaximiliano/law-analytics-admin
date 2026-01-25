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
  TablePagination,
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
} from "@mui/material";
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
} from "iconsax-react";
import { enqueueSnackbar } from "notistack";
import MainCard from "components/MainCard";
import pjnCredentialsService, {
  PjnCredential,
  PjnCredentialsFilters,
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

const CredencialesPJN = () => {
  const theme = useTheme();

  // Estado de datos
  const [credentials, setCredentials] = useState<PjnCredential[]>([]);
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
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal de confirmación
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    credential: PjnCredential | null;
  }>({ open: false, credential: null });

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
      const response = await pjnCredentialsService.getStats();
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
      <Grid container spacing={3}>
        {/* Estadísticas */}
        {stats && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="primary">
                      {stats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="success.main">
                      {stats.isValid}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Válidas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="warning.main">
                      {stats.syncStatus.pending}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Pendientes
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="error.main">
                      {stats.syncStatus.error}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Con errores
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="info.main">
                      {stats.totals.causas}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Causas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="h4" color="secondary.main">
                      {stats.totals.folders}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Carpetas
                    </Typography>
                  </CardContent>
                </Card>
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
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSearch}
                  startIcon={<SearchNormal1 size={16} />}
                >
                  Buscar
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleClearFilters}
                  startIcon={<CloseCircle size={16} />}
                >
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
                  <TableCell>Última Sync</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        No se encontraron credenciales
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  credentials.map((cred) => (
                    <TableRow
                      key={cred._id}
                      hover
                      sx={{ "&:hover": { bgcolor: "action.hover" } }}
                    >
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
                        <Typography variant="body2" fontFamily="monospace">
                          {cred.cuilMasked}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getSyncStatusLabel(cred.syncStatus)}
                          color={getSyncStatusColor(cred.syncStatus) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {cred.verified ? (
                          <TickCircle
                            size={20}
                            color={theme.palette.success.main}
                            variant="Bold"
                          />
                        ) : (
                          <CloseCircle
                            size={20}
                            color={theme.palette.error.main}
                            variant="Bold"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {cred.isValid ? (
                          <TickCircle
                            size={20}
                            color={theme.palette.success.main}
                            variant="Bold"
                          />
                        ) : (
                          <CloseCircle
                            size={20}
                            color={theme.palette.error.main}
                            variant="Bold"
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {cred.enabled ? (
                          <TickCircle
                            size={20}
                            color={theme.palette.success.main}
                            variant="Bold"
                          />
                        ) : (
                          <CloseCircle
                            size={20}
                            color={theme.palette.warning.main}
                            variant="Bold"
                          />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {cred.expectedCausasCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {cred.foldersCreatedCount || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(cred.lastSync)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip
                            title={cred.enabled ? "Deshabilitar" : "Habilitar"}
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleToggleEnabled(cred)}
                              color={cred.enabled ? "success" : "warning"}
                            >
                              {cred.enabled ? (
                                <ToggleOnCircle size={18} />
                              ) : (
                                <ToggleOffCircle size={18} />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Resetear para re-sync">
                            <IconButton
                              size="small"
                              onClick={() => handleReset(cred)}
                              color="info"
                            >
                              <RefreshCircle size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              onClick={() =>
                                setDeleteDialog({ open: true, credential: cred })
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
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count}`
            }
          />
        </Grid>
      </Grid>

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
          <Button
            onClick={() => setDeleteDialog({ open: false, credential: null })}
          >
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
};

export default CredencialesPJN;
