/**
 * DocumentationTabs - Componente de documentación con tabs verticales
 * Organiza toda la documentación de EJE Workers
 */
import { useState, SyntheticEvent } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Stack,
  Alert,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Card,
  CardContent,
  CardHeader,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Book1,
  SearchNormal1,
  Refresh,
  Briefcase,
  HierarchySquare,
  DocumentText1,
  TickCircle,
  CloseCircle,
  ArrowRight,
  Chart,
  Warning2,
  CommandSquare,
  Clock,
} from 'iconsax-react';

// Tab Panel Component
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
      id={`doc-tabpanel-${index}`}
      aria-labelledby={`doc-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `doc-tab-${index}`,
    'aria-controls': `doc-tabpanel-${index}`,
  };
}

// Sub-tabs para scripts
interface ScriptTabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function ScriptTabPanel(props: ScriptTabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`script-tabpanel-${index}`}
      aria-labelledby={`script-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function scriptA11yProps(index: number) {
  return {
    id: `script-tab-${index}`,
    'aria-controls': `script-tabpanel-${index}`,
  };
}

// Componente de documentación de scripts con tabs verticales
const ScriptsDocumentation = () => {
  const theme = useTheme();
  const [scriptTab, setScriptTab] = useState(0);

  const handleScriptTabChange = (_event: SyntheticEvent, newValue: number) => {
    setScriptTab(newValue);
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight="bold">Scripts de Prueba</Typography>
      <Alert severity="info" sx={{ mb: 1 }}>
        Scripts disponibles para probar y mantener los workers de EJE.
      </Alert>

      <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
        {/* Vertical Tabs para Scripts */}
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={scriptTab}
          onChange={handleScriptTabChange}
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            minWidth: 200,
            '& .MuiTab-root': {
              alignItems: 'flex-start',
              textAlign: 'left',
              minHeight: 48,
              fontSize: '0.8rem',
            },
          }}
        >
          <Tab label="Test Flujo Completo" icon={<HierarchySquare size={16} />} iconPosition="start" {...scriptA11yProps(0)} />
          <Tab label="Test Verificación" icon={<SearchNormal1 size={16} />} iconPosition="start" {...scriptA11yProps(1)} />
          <Tab label="Limpiar CUIJ" icon={<CloseCircle size={16} />} iconPosition="start" {...scriptA11yProps(2)} />
          <Tab label="Fix Historial" icon={<Refresh size={16} />} iconPosition="start" {...scriptA11yProps(3)} />
        </Tabs>

        {/* Script 0: test-full-flow.ts (END-TO-END) */}
        <ScriptTabPanel value={scriptTab} index={0}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">test-full-flow.ts</Typography>
              <Typography variant="body2" color="text.secondary">
                Script END-TO-END que simula el flujo completo desde la creación del Folder.
              </Typography>
            </Box>

            <Alert severity="success" sx={{ py: 0.5 }}>
              <strong>Recomendado:</strong> Este script prueba el flujo real de producción.
            </Alert>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Ubicación</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <code>eje-workers/scripts/test-full-flow.ts</code>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Configuración (.env)</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[900], 0.9), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: "common.white" }}>
                <pre style={{ margin: 0 }}>
{`MONGODB_URI=mongodb://...
API_KEY=tu-api-key
EJE_API_URL=https://eje.lawanalytics.app
TEST_USER_ID=<ObjectId de usuario para pruebas>`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Uso</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[900], 0.9), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: "common.white" }}>
                <pre style={{ margin: 0 }}>
{`# Modo interactivo
npx ts-node scripts/test-full-flow.ts

# Con argumentos
npx ts-node scripts/test-full-flow.ts 162321/2020`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Flujo del Script</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0 }}>
{`1. Crea Folder de prueba en MongoDB
2. Llama a eje-api /associate-folder (con API key)
3. Espera que el verification worker procese
4. Muestra resultado (causa + folder actualizados)
5. Opción de limpiar documentos de prueba`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Diferencia con test-verification-flow.ts</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Script</TableCell>
                      <TableCell>Folder</TableCell>
                      <TableCell>eje-api</TableCell>
                      <TableCell>Worker</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                      <TableCell><strong>test-full-flow</strong></TableCell>
                      <TableCell><TickCircle size={16} color={theme.palette.success.main} /></TableCell>
                      <TableCell><TickCircle size={16} color={theme.palette.success.main} /></TableCell>
                      <TableCell><TickCircle size={16} color={theme.palette.success.main} /></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>test-verification-flow</TableCell>
                      <TableCell><CloseCircle size={16} color={theme.palette.error.main} /></TableCell>
                      <TableCell><CloseCircle size={16} color={theme.palette.error.main} /></TableCell>
                      <TableCell><TickCircle size={16} color={theme.palette.success.main} /></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </ScriptTabPanel>

        {/* Script 1: test-verification-flow.ts */}
        <ScriptTabPanel value={scriptTab} index={1}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">test-verification-flow.ts</Typography>
              <Typography variant="body2" color="text.secondary">
                Script interactivo para probar los 3 escenarios del worker de verificación.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Ubicación</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <code>eje-workers/scripts/test-verification-flow.ts</code>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Uso</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[900], 0.9), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: "common.white" }}>
                <pre style={{ margin: 0 }}>
{`# Modo interactivo
npx ts-node scripts/test-verification-flow.ts

# Con argumentos (uno o más)
npx ts-node scripts/test-verification-flow.ts J-01-00053687-9/2020-0
npx ts-node scripts/test-verification-flow.ts 162321/2020 162512/2020`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Formatos de Entrada</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Formato</TableCell>
                      <TableCell>Ejemplo</TableCell>
                      <TableCell>Descripción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><Chip label="CUIJ" size="small" color="primary" /></TableCell>
                      <TableCell><code>J-01-00053687-9/2020-0</code></TableCell>
                      <TableCell>Identificador único</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="número/año" size="small" color="info" /></TableCell>
                      <TableCell><code>162321/2020</code></TableCell>
                      <TableCell>Número y año</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Chip label="número" size="small" color="warning" /></TableCell>
                      <TableCell><code>15050</code></TableCell>
                      <TableCell>Solo número</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Expedientes de Prueba</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.1), border: `1px solid ${theme.palette.success.main}` }}>
                    <Typography variant="caption" color="success.main" fontWeight="bold">1 Resultado</Typography>
                    <Typography variant="caption" display="block"><code>J-01-00053687-9/2020-0</code></Typography>
                    <Typography variant="caption" display="block"><code>J-01-00070705-4/2019-0</code></Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${theme.palette.warning.main}` }}>
                    <Typography variant="caption" color="warning.main" fontWeight="bold">Múltiples (Pivot)</Typography>
                    <Typography variant="caption" display="block"><code>162321/2020</code></Typography>
                    <Typography variant="caption" display="block"><code>162512/2020</code></Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.1), border: `1px solid ${theme.palette.error.main}` }}>
                    <Typography variant="caption" color="error.main" fontWeight="bold">Sin Resultados</Typography>
                    <Typography variant="caption" display="block"><code>533505632/2011</code></Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Flujo del Script</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0 }}>
{`1. Conecta a MongoDB
2. Crea documento CausasEje temporal (TEMP-xxx)
3. Llama al verification worker
4. Muestra resultado según escenario
5. Limpieza opcional de documentos`}
                </pre>
              </Box>
            </Box>

            <Alert severity="warning" sx={{ mt: 1 }}>
              <strong>Nota:</strong> El script crea documentos reales en la base de datos.
            </Alert>
          </Stack>
        </ScriptTabPanel>

        {/* Script 2: clean-cuij-prefixes.ts */}
        <ScriptTabPanel value={scriptTab} index={2}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">clean-cuij-prefixes.ts</Typography>
              <Typography variant="body2" color="text.secondary">
                Limpia prefijos (EXP, IPP, EJF, etc.) de los CUIJ que interfieren con búsquedas.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Ubicación</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <code>eje-workers/scripts/clean-cuij-prefixes.ts</code>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Uso</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[900], 0.9), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: "common.white" }}>
                <pre style={{ margin: 0 }}>
{`npx ts-node scripts/clean-cuij-prefixes.ts`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Patrón Detectado</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
                <Typography variant="body2" fontFamily="monospace">
                  <code>/^[A-Z]+\s+J-/i</code>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Detecta cualquier prefijo de letras antes de "J-" (inicio del CUIJ real)
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Ejemplos de Limpieza</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Original</TableCell>
                      <TableCell>Limpio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell><code>EXP J-01-00015050-5/2021-0</code></TableCell>
                      <TableCell><code>J-01-00015050-5/2021-0</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>IPP J-02-00123456-7/2020-0</code></TableCell>
                      <TableCell><code>J-02-00123456-7/2020-0</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><code>EJF J-01-00054321-9/2019-0</code></TableCell>
                      <TableCell><code>J-01-00054321-9/2019-0</code></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Alert severity="info">
              Este script también se ejecuta automáticamente durante el scraping para prevenir futuros problemas.
            </Alert>
          </Stack>
        </ScriptTabPanel>

        {/* Script 3: fix-linked-causas-history.ts */}
        <ScriptTabPanel value={scriptTab} index={3}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" color="primary.main">fix-linked-causas-history.ts</Typography>
              <Typography variant="body2" color="text.secondary">
                Agrega entradas de <code>updateHistory</code> a causas creadas desde pivots sin historial.
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Ubicación</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <code>eje-workers/scripts/fix-linked-causas-history.ts</code>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Uso</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[900], 0.9), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: "common.white" }}>
                <pre style={{ margin: 0 }}>
{`npx ts-node scripts/fix-linked-causas-history.ts`}
                </pre>
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>¿Qué hace?</Typography>
              <Stack spacing={1}>
                <Typography variant="body2">1. Busca todos los documentos PIVOT en la base de datos</Typography>
                <Typography variant="body2">2. Para cada pivot, obtiene sus <code>pivotCausaIds</code></Typography>
                <Typography variant="body2">3. Identifica causas vinculadas sin <code>updateHistory</code></Typography>
                <Typography variant="body2">4. Agrega entrada de historial con información del pivot de origen</Typography>
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Entrada Agregada</Typography>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <pre style={{ margin: 0 }}>
{`{
  timestamp: <fecha del pivot>,
  source: "verification-worker",
  updateType: "verify",
  success: true,
  movimientosAdded: 0,
  movimientosTotal: 0,
  details: {
    message: "Creado desde búsqueda con múltiples resultados.
              Término: \"162321/2020\". Pivot: <pivotId>"
  }
}`}
                </pre>
              </Box>
            </Box>

            <Alert severity="success">
              Las nuevas causas creadas desde pivots ya incluyen automáticamente esta entrada de historial.
            </Alert>
          </Stack>
        </ScriptTabPanel>
      </Box>
    </Stack>
  );
};

const DocumentationTabs = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
      {/* Vertical Tabs */}
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={tabValue}
        onChange={handleTabChange}
        sx={{
          borderRight: 1,
          borderColor: 'divider',
          minWidth: 220,
          '& .MuiTab-root': {
            alignItems: 'flex-start',
            textAlign: 'left',
            minHeight: 56,
          },
        }}
      >
        <Tab label="Control de Workers" icon={<HierarchySquare size={18} />} iconPosition="start" {...a11yProps(0)} />
        <Tab label="Flujo de Verificación" icon={<SearchNormal1 size={18} />} iconPosition="start" {...a11yProps(1)} />
        <Tab label="Flujo de Actualización" icon={<Refresh size={18} />} iconPosition="start" {...a11yProps(2)} />
        <Tab label="Arquitectura" icon={<Briefcase size={18} />} iconPosition="start" {...a11yProps(3)} />
        <Tab label="Campos y Estados" icon={<DocumentText1 size={18} />} iconPosition="start" {...a11yProps(4)} />
        <Tab label="Historial Asociación" icon={<Clock size={18} />} iconPosition="start" {...a11yProps(5)} />
        <Tab label="Métricas" icon={<Chart size={18} />} iconPosition="start" {...a11yProps(6)} />
        <Tab label="Scripts de Prueba" icon={<CommandSquare size={18} />} iconPosition="start" {...a11yProps(7)} />
      </Tabs>

      {/* Tab 0: Control de Workers */}
      <TabPanel value={tabValue} index={0}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Jerarquía de Control</Typography>
          <Alert severity="info">
            El sistema implementa una jerarquía de control de dos niveles que permite
            detener todos los workers con un solo interruptor o controlarlos individualmente.
          </Alert>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Niveles de Control</Typography>
            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label="MAESTRO" color="primary" size="small" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Manager isRunning</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Interruptor maestro que controla TODOS los workers simultáneamente.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label="INDIVIDUAL" color="success" size="small" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">Worker enabled</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Interruptor individual para cada worker específico.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Matriz de Estados</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Manager</TableCell>
                    <TableCell>Worker</TableCell>
                    <TableCell align="center">Resultado</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="ON" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="ON" color="success" size="small" /></TableCell>
                    <TableCell align="center"><TickCircle size={20} color={theme.palette.success.main} /></TableCell>
                    <TableCell><Typography variant="body2" color="success.main">Worker ejecuta normalmente</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="ON" color="success" size="small" /></TableCell>
                    <TableCell><Chip label="OFF" color="default" size="small" /></TableCell>
                    <TableCell align="center"><CloseCircle size={20} color={theme.palette.error.main} /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">Worker individual deshabilitado</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="OFF" color="error" size="small" /></TableCell>
                    <TableCell><Chip label="ON" color="success" size="small" /></TableCell>
                    <TableCell align="center"><CloseCircle size={20} color={theme.palette.error.main} /></TableCell>
                    <TableCell><Typography variant="body2" color="error.main">Manager detenido - Worker NO ejecuta</Typography></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Workers Disponibles</Typography>
            <Stack spacing={2}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <SearchNormal1 size={18} color={theme.palette.primary.main} />
                  <Typography variant="subtitle2">Worker de Verificación</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Verifica que los expedientes existan en EJE. Maneja 3 escenarios: no encontrado, único resultado, múltiples resultados.
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Refresh size={18} color={theme.palette.info.main} />
                  <Typography variant="subtitle2">Worker de Actualización</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Actualiza expedientes verificados con movimientos y detalles completos.
                </Typography>
              </Box>
              <Divider />
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Briefcase size={18} color={theme.palette.warning.main} />
                  <Typography variant="subtitle2">Worker de Recuperación</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Detecta y recupera expedientes trabados o con errores. Limpia locks huérfanos.
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 1: Flujo de Verificación - CON LOS 3 ESCENARIOS Y PIVOTES */}
      <TabPanel value={tabValue} index={1}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Flujo del Worker de Verificación</Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Valores de isValid:</strong> <code>null</code> = pendiente, <code>true</code> = existe en EJE, <code>false</code> = no existe
          </Alert>

          {/* Diagrama Principal de los 3 Escenarios */}
          <Card variant="outlined" sx={{ borderColor: theme.palette.primary.main, borderWidth: 2 }}>
            <CardHeader
              title="Diagrama: 3 Escenarios de Verificación"
              subheader="Flujo completo desde búsqueda hasta actualización de Folder"
              avatar={<SearchNormal1 size={24} color={theme.palette.primary.main} />}
            />
            <CardContent>
              <Box sx={{
                p: 2,
                bgcolor: alpha(theme.palette.grey[500], 0.1),
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                overflowX: 'auto'
              }}>
                <pre style={{ margin: 0 }}>
{`┌─────────────────────────────────────────────────────────────────────────────┐
│                      VERIFICATION WORKER - FLUJO COMPLETO                    │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │  DOCUMENTO ORIGEN │
                              │  (CausasEje)      │
                              │  - searchTerm     │
                              │  - verified=false │
                              │  - isValid=null   │
                              │  - folderIds=[X]  │
                              └────────┬─────────┘
                                       │
                                       ▼
                         ┌─────────────────────────────┐
                         │  BUSCAR EN EJE              │
                         │  searchAndGetBasicData()    │
                         └─────────────┬───────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌────────────────────┐
   │  SIN RESULTADOS│          │  UN RESULTADO │          │ MÚLTIPLES RESULTADOS│
   │  found=false   │          │  docs.length=1│          │  docs.length > 1    │
   └───────┬───────┘          └───────┬───────┘          └─────────┬──────────┘
           │                           │                           │
           ▼                           ▼                           ▼
   ┌───────────────┐          ┌───────────────┐          ┌────────────────────┐
   │ Doc Origen:   │          │ Buscar CUIJ   │          │ Para CADA resultado:│
   │ - verified=T  │          │ en DB         │          │ - Buscar CUIJ en DB │
   │ - isValid=F   │          │ (excl pivotes)│          │ - Si existe: usar   │
   │ - isPivot=F   │          └───────┬───────┘          │ - Si no: CREAR nuevo│
   └───────┬───────┘                  │                  └─────────┬──────────┘
           │                  ┌───────┴───────┐                    │
           │            ┌─────▼─────┐   ┌─────▼─────┐              │
           │            │  EXISTE   │   │ NO EXISTE │              ▼
           │            │  en DB    │   │  en DB    │     ┌────────────────────┐
           │            └─────┬─────┘   └─────┬─────┘     │ Doc Origen → PIVOTE│
           │                  │               │          │ - cuij="PIVOT-xxx" │
           │                  ▼               ▼          │ - isPivot=true     │
           │            ┌───────────┐   ┌───────────┐   │ - pivotCausaIds=[..]│
           │            │ Usar causa│   │ Actualizar│   │ - verified=true    │
           │            │ existente │   │ doc origen│   │ - isValid=null     │
           │            │ (add      │   │ con datos │   └─────────┬──────────┘
           │            │ folderId) │   │ del result│             │
           │            └─────┬─────┘   └─────┬─────┘             │
           │                  │               │                    │
           │                  └───────┬───────┘                    │
           │                          │                            │
           ▼                          ▼                            ▼
   ┌───────────────┐          ┌───────────────┐          ┌────────────────────┐
   │ FOLDER:       │          │ FOLDER:       │          │ FOLDER:            │
   │ - status=     │          │ - causaId=X   │          │ - causaId=PIVOTE   │
   │   'failed'    │          │ - status=     │          │ - pendingCausaIds= │
   │ - causaId=null│          │   'success'   │          │   [id1, id2, ...]  │
   │ - error msg   │          │ - (overwrite  │          │ - status=          │
   └───────────────┘          │   folder data)│          │   'pending_selection'
                              └───────────────┘          └────────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌────────────────────┐
                                                         │ USUARIO ELIGE      │
                                                         │ causa correcta     │
                                                         │ desde el admin     │
                                                         └─────────┬──────────┘
                                                                   │
                                                                   ▼
                                                         ┌────────────────────┐
                                                         │ PIVOTE:            │
                                                         │ - resolved=true    │
                                                         │ - selectedCausaId  │
                                                         │                    │
                                                         │ FOLDER:            │
                                                         │ - causaId=elegido  │
                                                         │ - status='success' │
                                                         └────────────────────┘`}
                </pre>
              </Box>
            </CardContent>
          </Card>

          <Divider />

          {/* Detalle de cada escenario */}
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Detalle de Escenarios</Typography>
          <Grid container spacing={2}>
            {/* Escenario 0 resultados */}
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.error.main, 0.1), border: `1px solid ${theme.palette.error.main}`, height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CloseCircle size={20} color={theme.palette.error.main} />
                  <Typography variant="subtitle2" color="error.main">Sin Resultados</Typography>
                </Stack>
                <Typography variant="body2" gutterBottom>El expediente no existe en EJE:</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption">• <code>verified: true</code></Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 'bold' }}>• <code>isValid: false</code></Typography>
                  <Typography variant="caption">• <code>isPivot: false</code></Typography>
                  <Typography variant="caption">• <code>errorCount: +1</code></Typography>
                </Stack>
                <Chip label="Folder: status='failed'" size="small" color="error" sx={{ mt: 1 }} />
              </Box>
            </Grid>

            {/* Escenario 1 resultado */}
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.1), border: `1px solid ${theme.palette.success.main}`, height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <TickCircle size={20} color={theme.palette.success.main} />
                  <Typography variant="subtitle2" color="success.main">Un Resultado</Typography>
                </Stack>
                <Typography variant="body2" gutterBottom>Expediente único encontrado:</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption">• <code>verified: true</code></Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.success.main, fontWeight: 'bold' }}>• <code>isValid: true</code></Typography>
                  <Typography variant="caption">• <code>isPivot: false</code></Typography>
                  <Typography variant="caption">• <code>update: true</code></Typography>
                  <Typography variant="caption">• Se actualiza CUIJ real, carátula, etc.</Typography>
                </Stack>
                <Chip label="Folder: status='success'" size="small" color="success" sx={{ mt: 1 }} />
              </Box>
            </Grid>

            {/* Escenario N resultados */}
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${theme.palette.warning.main}`, height: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Warning2 size={20} color={theme.palette.warning.main} />
                  <Typography variant="subtitle2" color="warning.main">Múltiples Resultados</Typography>
                </Stack>
                <Typography variant="body2" gutterBottom>Varios expedientes coinciden:</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption">• Doc original → <strong>PIVOTE</strong></Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.warning.main, fontWeight: 'bold' }}>• <code>cuij: "PIVOT-xxx"</code></Typography>
                  <Typography variant="caption">• <code>isPivot: true</code></Typography>
                  <Typography variant="caption">• <code>pivotCausaIds: [...]</code></Typography>
                  <Typography variant="caption">• Se crean N causas reales</Typography>
                </Stack>
                <Chip label="Folder: status='pending_selection'" size="small" color="warning" sx={{ mt: 1 }} />
              </Box>
            </Grid>
          </Grid>

          <Divider />

          {/* Sistema de Pivotes */}
          <Card variant="outlined" sx={{ borderColor: theme.palette.warning.main }}>
            <CardHeader title="Sistema de Pivotes" subheader="Documento de búsqueda para múltiples resultados" />
            <CardContent>
              <Stack spacing={2}>
                <Alert severity="warning">
                  Cuando hay múltiples resultados, el documento original se convierte en un <strong>PIVOTE</strong> que:
                </Alert>
                <Stack spacing={1}>
                  <Typography variant="body2">• <strong>No tiene CUIJ válido</strong> - usa prefijo "PIVOT-{'{timestamp}'}-{'{id}'}"</Typography>
                  <Typography variant="body2">• <strong>Sirve como ancla</strong> - el Folder apunta al pivote via <code>causaId</code></Typography>
                  <Typography variant="body2">• <strong>Contiene opciones</strong> - <code>pivotCausaIds</code> lista las causas posibles</Typography>
                  <Typography variant="body2">• <strong>Se marca al resolver</strong> - <code>resolved: true</code> cuando usuario elige</Typography>
                  <Typography variant="body2">• <strong>No se reutiliza</strong> - filtrado en búsquedas con <code>isPivot: {'{'} $ne: true {'}'}</code></Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Divider />

          {/* Criterios de Selección */}
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Criterios de Selección (Query)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Condición</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><code>verified</code></TableCell>
                    <TableCell><Chip label="false" size="small" color="warning" /></TableCell>
                    <TableCell>Aún no verificado</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>isValid</code></TableCell>
                    <TableCell><Chip label="null" size="small" color="warning" /></TableCell>
                    <TableCell>Pendiente de verificación</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>isPivot</code></TableCell>
                    <TableCell><Chip label="!= true" size="small" color="info" /></TableCell>
                    <TableCell>Excluir pivotes procesados</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>errorCount</code></TableCell>
                    <TableCell><Chip label="< 3" size="small" color="info" /></TableCell>
                    <TableCell>Menos de 3 errores</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 2: Flujo de Actualización */}
      <TabPanel value={tabValue} index={2}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Flujo del Worker de Actualización</Typography>

          <Alert severity="success">
            El worker de actualización procesa expedientes ya verificados para cargar movimientos y detalles completos.
          </Alert>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Criterios de Elegibilidad</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Condición</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><code>verified</code></TableCell>
                    <TableCell><Chip label="true" size="small" color="success" /></TableCell>
                    <TableCell>Ya fue verificado</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>isValid</code></TableCell>
                    <TableCell><Chip label="true" size="small" color="success" /></TableCell>
                    <TableCell>Existe en EJE</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>isPrivate</code></TableCell>
                    <TableCell><Chip label="false" size="small" color="info" /></TableCell>
                    <TableCell>No es expediente privado</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>update</code></TableCell>
                    <TableCell><Chip label="true" size="small" color="primary" /></TableCell>
                    <TableCell>Tiene actualizaciones habilitadas</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>isPivot</code></TableCell>
                    <TableCell><Chip label="false" size="small" color="default" /></TableCell>
                    <TableCell>No es documento pivote</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Diagrama de Actualización</Typography>
            <Box sx={{
              p: 2,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0 }}>
{`CausaEje verificada (isValid=true)
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│             UPDATE WORKER (según configuración)               │
│  Query: verified=true, isValid=true, update=true, isPivot!=T │
└───────────────────────────────────────────────────────────────┘
        │
        ├─── Primera carga (detailsLoaded=false)
        │    └── Carga: movimientos, intervinientes, relacionadas
        │    └── Marca: detailsLoaded=true
        │
        └─── Re-actualización periódica
             └── Según umbral configurado (ej: cada 24hs)
             └── Añade nuevos movimientos
             └── Actualiza estadísticas en updateStats`}
              </pre>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Datos Extraídos</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <Typography variant="subtitle2" color="primary.main">Movimientos</Typography>
                  <Typography variant="caption" color="text.secondary">Historial completo de actuaciones con fecha, tipo, descripción y firmante.</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                  <Typography variant="subtitle2" color="info.main">Intervinientes</Typography>
                  <Typography variant="caption" color="text.secondary">Partes del proceso: actores, demandados, letrados, terceros.</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                  <Typography variant="subtitle2" color="success.main">Causas Relacionadas</Typography>
                  <Typography variant="caption" color="text.secondary">Expedientes acumulados, conexos o relacionados.</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 3: Arquitectura */}
      <TabPanel value={tabValue} index={3}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Arquitectura del Sistema</Typography>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Diagrama de Servicios</Typography>
            <Box sx={{
              p: 2,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0 }}>
{`┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   law-analytics-    │     │                     │     │                     │
│       admin         │────▶│  law-analytics-     │────▶│      eje-api        │
│     (Frontend)      │     │      server         │     │   (Microservicio)   │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                                   │
                                                                   ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│    eje-workers      │◀────│     MongoDB         │◀────│    eje-models       │
│  (Verificación +    │     │   (causas-eje)      │     │    (Schemas)        │
│   Actualización)    │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘`}
              </pre>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Flujo de Creación</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Paso</TableCell>
                    <TableCell>Servicio</TableCell>
                    <TableCell>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell><Chip label="Frontend" size="small" color="primary" /></TableCell>
                    <TableCell>Usuario ingresa número/CUIJ del expediente en Folder</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2</TableCell>
                    <TableCell><Chip label="Server" size="small" color="secondary" /></TableCell>
                    <TableCell><code>PUT /api/folders/link-causa/:folderId</code></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3</TableCell>
                    <TableCell><Chip label="eje-api" size="small" color="info" /></TableCell>
                    <TableCell><code>POST /causas-eje-service/associate-folder</code></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>4</TableCell>
                    <TableCell><Chip label="MongoDB" size="small" /></TableCell>
                    <TableCell>CausasEje creada con <code>verified: false</code></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>5</TableCell>
                    <TableCell><Chip label="Worker" size="small" color="warning" /></TableCell>
                    <TableCell>Verification Worker procesa → 3 escenarios posibles</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Endpoints API</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Servicio</TableCell>
                    <TableCell>Método</TableCell>
                    <TableCell>Endpoint</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="server" size="small" color="secondary" /></TableCell>
                    <TableCell>PUT</TableCell>
                    <TableCell><code>/api/folders/link-causa/:folderId</code></TableCell>
                    <TableCell>Vincular expediente EJE a folder</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="server" size="small" color="secondary" /></TableCell>
                    <TableCell>PUT</TableCell>
                    <TableCell><code>/api/folders/select-causa/:folderId</code></TableCell>
                    <TableCell>Seleccionar causa de opciones múltiples</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="eje-api" size="small" color="info" /></TableCell>
                    <TableCell>POST</TableCell>
                    <TableCell><code>/causas-eje-service/associate-folder</code></TableCell>
                    <TableCell>Crear/vincular CausasEje</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 4: Campos y Estados */}
      <TabPanel value={tabValue} index={4}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Campos y Estados</Typography>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Estados de Asociación del Folder</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Estado</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="not_attempted" size="small" /></TableCell>
                    <TableCell>No se ha intentado vincular</TableCell>
                    <TableCell>Usuario inicia vinculación</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="pending" size="small" color="warning" /></TableCell>
                    <TableCell>Vinculación en progreso</TableCell>
                    <TableCell>Esperar verificación</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                    <TableCell><Chip label="pending_selection" size="small" color="warning" /></TableCell>
                    <TableCell>Múltiples resultados encontrados</TableCell>
                    <TableCell><strong>Usuario selecciona</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="success" size="small" color="success" /></TableCell>
                    <TableCell>Vinculación exitosa</TableCell>
                    <TableCell>Completado</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="failed" size="small" color="error" /></TableCell>
                    <TableCell>No encontrado en EJE</TableCell>
                    <TableCell>Revisar datos</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Campos del Folder (EJE)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><code>eje</code></TableCell><TableCell>Boolean</TableCell><TableCell>Flag expediente EJE</TableCell></TableRow>
                  <TableRow><TableCell><code>causaId</code></TableCell><TableCell>ObjectId</TableCell><TableCell>Referencia a CausasEje (o pivote)</TableCell></TableRow>
                  <TableRow><TableCell><code>causaType</code></TableCell><TableCell>String</TableCell><TableCell>'CausasEje'</TableCell></TableRow>
                  <TableRow><TableCell><code>causaAssociationStatus</code></TableCell><TableCell>String</TableCell><TableCell>Estado de vinculación</TableCell></TableRow>
                  <TableRow><TableCell><code>pendingCausaIds</code></TableCell><TableCell>[ObjectId]</TableCell><TableCell>Opciones múltiples</TableCell></TableRow>
                  <TableRow><TableCell><code>searchTerm</code></TableCell><TableCell>String</TableCell><TableCell>Término de búsqueda</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Campos de CausasEje (Pivote)</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><code>isPivot</code></TableCell><TableCell>Boolean</TableCell><TableCell>true = documento pivote</TableCell></TableRow>
                  <TableRow><TableCell><code>pivotCausaIds</code></TableCell><TableCell>[ObjectId]</TableCell><TableCell>Causas vinculadas al pivote</TableCell></TableRow>
                  <TableRow><TableCell><code>resolved</code></TableCell><TableCell>Boolean</TableCell><TableCell>Usuario eligió opción</TableCell></TableRow>
                  <TableRow><TableCell><code>selectedCausaId</code></TableCell><TableCell>ObjectId</TableCell><TableCell>Causa elegida</TableCell></TableRow>
                  <TableRow><TableCell><code>searchTerm</code></TableCell><TableCell>String</TableCell><TableCell>Término de búsqueda original</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 5: Historial de Asociación */}
      <TabPanel value={tabValue} index={5}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Historial de Asociación (causaAssociationHistory)</Typography>

          <Alert severity="info">
            El sistema trackea todos los cambios de estado en la vinculación de causas EJE,
            permitiendo auditar el ciclo de vida completo de cada asociación.
          </Alert>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Estructura del Historial</Typography>
            <Box sx={{
              p: 2,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0 }}>
{`causaAssociationHistory: [{
  status: String,      // 'pending', 'pending_selection', 'success', 'failed', 'not_attempted'
  timestamp: Date,     // Momento del cambio
  source: String,      // 'user', 'worker', 'api', 'system'
  details: String,     // Descripción del cambio
  causaId: ObjectId,   // ID de la causa (si aplica)
  searchTerm: String   // Término de búsqueda usado
}]`}
              </pre>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Campos del Historial</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><code>status</code></TableCell>
                    <TableCell>String (enum)</TableCell>
                    <TableCell>Estado de asociación en ese momento</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>timestamp</code></TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Fecha y hora del cambio</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>source</code></TableCell>
                    <TableCell>String (enum)</TableCell>
                    <TableCell>Origen del cambio: user, worker, api, system</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>details</code></TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Descripción legible del cambio</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>causaId</code></TableCell>
                    <TableCell>ObjectId</TableCell>
                    <TableCell>ID de la causa asociada (opcional)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code>searchTerm</code></TableCell>
                    <TableCell>String</TableCell>
                    <TableCell>Término de búsqueda usado (CUIJ o número/año)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Valores de Source</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), border: `1px solid ${theme.palette.primary.main}` }}>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">user</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Acción iniciada por el usuario (vinculación manual, selección de causa)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${theme.palette.warning.main}` }}>
                  <Typography variant="subtitle2" color="warning.main" fontWeight="bold">worker</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cambio realizado por verification-worker (verificación automática)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.info.main, 0.1), border: `1px solid ${theme.palette.info.main}` }}>
                  <Typography variant="subtitle2" color="info.main" fontWeight="bold">api</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Cambio desde eje-api o causaService (múltiples resultados)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: alpha(theme.palette.grey[500], 0.1), border: `1px solid ${theme.palette.grey[500]}` }}>
                  <Typography variant="subtitle2" fontWeight="bold">system</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Error o proceso automático del sistema
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Flujo de Estados Trackeados</Typography>
            <Box sx={{
              p: 2,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              overflowX: 'auto'
            }}>
              <pre style={{ margin: 0 }}>
{`┌──────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE ESTADOS TRACKEADOS                                │
└──────────────────────────────────────────────────────────────────────────────┘

Usuario inicia vinculación
        │
        ▼
┌───────────────────┐
│  pending          │ ◄─── source: 'user'
│  "Causa EJE       │      details: "Causa EJE pendiente de verificación"
│   pendiente..."   │
└─────────┬─────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  VERIFICATION WORKER                      │
    └─────────────────────────────────────────────────────────┘
          │
    ┌─────┼─────────────────────────────────────┐
    │     │                                     │
    ▼     ▼                                     ▼
┌─────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│   failed    │  │  pending_selection  │  │     success     │
│             │  │                     │  │                 │
│ source:     │  │ source: 'worker'    │  │ source: 'worker'│
│  'worker'   │  │ details: "Múltiples │  │ details: "Causa │
│ details:    │  │  resultados: N      │  │  verificada:    │
│  "No        │  │  causas"            │  │  [carátula]"    │
│  encontrado"│  └──────────┬──────────┘  └─────────────────┘
└─────────────┘              │
                             ▼
                   ┌─────────────────────┐
                   │  Usuario selecciona │
                   │                     │
                   │ source: 'user'      │
                   │ details: "Causa     │
                   │  seleccionada: X"   │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │      success        │
                   └─────────────────────┘`}
              </pre>
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Ejemplos de Entradas de Historial</Typography>
            <Stack spacing={2}>
              <Card variant="outlined">
                <CardHeader
                  title="Verificación Exitosa (1 resultado)"
                  subheader="Worker encuentra expediente único"
                  avatar={<TickCircle size={20} color={theme.palette.success.main} />}
                />
                <CardContent>
                  <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <pre style={{ margin: 0 }}>
{`{
  status: "success",
  timestamp: "2024-02-06T15:30:00Z",
  source: "worker",
  details: "Causa verificada: PEREZ JUAN C/ GARCIA MARIA S/ DAÑOS",
  causaId: ObjectId("..."),
  searchTerm: "J-01-00053687-9/2020-0"
}`}
                    </pre>
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardHeader
                  title="Múltiples Resultados (Pivot)"
                  subheader="Worker encuentra varios expedientes"
                  avatar={<Warning2 size={20} color={theme.palette.warning.main} />}
                />
                <CardContent>
                  <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <pre style={{ margin: 0 }}>
{`{
  status: "pending_selection",
  timestamp: "2024-02-06T15:30:00Z",
  source: "worker",
  details: "Múltiples resultados encontrados: 3 causas",
  causaId: ObjectId("..."),  // ID del PIVOTE
  searchTerm: "162321/2020"
}`}
                    </pre>
                  </Box>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardHeader
                  title="Selección de Usuario"
                  subheader="Usuario elige causa correcta"
                  avatar={<TickCircle size={20} color={theme.palette.primary.main} />}
                />
                <CardContent>
                  <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    <pre style={{ margin: 0 }}>
{`{
  status: "success",
  timestamp: "2024-02-06T16:45:00Z",
  source: "user",
  details: "Causa seleccionada: LOPEZ MARIA C/ BANCO X S/ COBRO",
  causaId: ObjectId("..."),  // ID de la causa elegida
  searchTerm: "162321/2020"
}`}
                    </pre>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Repositorios Actualizados</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Repositorio</TableCell>
                    <TableCell>Archivo</TableCell>
                    <TableCell>Cambios</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="law-analytics-server" size="small" color="secondary" /></TableCell>
                    <TableCell><code>models/Folder.js</code></TableCell>
                    <TableCell>Nuevo campo causaAssociationHistory</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="law-analytics-server" size="small" color="secondary" /></TableCell>
                    <TableCell><code>controllers/folderController.js</code></TableCell>
                    <TableCell>Tracking en vinculación EJE</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="law-analytics-server" size="small" color="secondary" /></TableCell>
                    <TableCell><code>services/causaService.js</code></TableCell>
                    <TableCell>Tracking en selección múltiple</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="eje-workers" size="small" color="warning" /></TableCell>
                    <TableCell><code>verification-worker.ts</code></TableCell>
                    <TableCell>Tracking en 4 escenarios de verificación</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 6: Métricas */}
      <TabPanel value={tabValue} index={6}>
        <Stack spacing={3}>
          <Typography variant="h6" fontWeight="bold">Métricas y Filtros</Typography>

          <Alert severity="info">
            El sistema rastrea métricas detalladas de actualización para cada documento elegible.
          </Alert>

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Métricas del Widget</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Métrica</TableCell>
                    <TableCell>Cálculo</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell><Chip label="X elegibles" size="small" variant="outlined" /></TableCell>
                    <TableCell><code>verified=true AND isValid=true AND update=true AND isPivot=false</code></TableCell>
                    <TableCell>Documentos que pueden actualizarse</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="X actualizados" size="small" color="success" variant="outlined" /></TableCell>
                    <TableCell><code>elegibles WHERE updateStats.today.date = hoy</code></TableCell>
                    <TableCell>Actualizados hoy</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Chip label="X pendientes" size="small" color="warning" variant="outlined" /></TableCell>
                    <TableCell><code>elegibles - actualizadosHoy</code></TableCell>
                    <TableCell>Faltan actualizar</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Filtros Disponibles</Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Solo Elegibles:</strong> Muestra documentos que cumplen criterios de actualización
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label="verified = true" size="small" color="success" />
                <Chip label="isValid = true" size="small" color="success" />
                <Chip label="isPrivate = false" size="small" color="info" />
                <Chip label="update = true" size="small" color="primary" />
                <Chip label="isPivot = false" size="small" color="default" />
              </Stack>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Estadísticas por Documento</Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Cada documento elegible mantiene estadísticas en <code>updateStats</code>:
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Descripción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow><TableCell><code>avgMs</code></TableCell><TableCell>Promedio de duración en ms</TableCell></TableRow>
                  <TableRow><TableCell><code>count</code></TableCell><TableCell>Total de actualizaciones</TableCell></TableRow>
                  <TableRow><TableCell><code>errors</code></TableCell><TableCell>Total de errores</TableCell></TableRow>
                  <TableRow><TableCell><code>newMovs</code></TableCell><TableCell>Movimientos nuevos encontrados</TableCell></TableRow>
                  <TableRow><TableCell><code>today.count</code></TableCell><TableCell>Actualizaciones hoy</TableCell></TableRow>
                  <TableRow><TableCell><code>today.hours</code></TableCell><TableCell>Horas de actualización hoy</TableCell></TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </TabPanel>

      {/* Tab 7: Scripts de Prueba - Con sub-tabs verticales */}
      <TabPanel value={tabValue} index={7}>
        <ScriptsDocumentation />
      </TabPanel>
    </Box>
  );
};

export default DocumentationTabs;
