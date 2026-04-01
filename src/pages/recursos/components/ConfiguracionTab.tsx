import { useState, useEffect } from "react";
import {
	Box,
	Card,
	Typography,
	Stack,
	Grid,
	CircularProgress,
	Alert,
	TextField,
	Button,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Switch,
	FormControlLabel,
	Divider,
	Chip,
	Tooltip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Refresh, Setting2, Activity, Warning2, ArrowRight, RotateLeft } from "iconsax-react";
import legalAxios from "utils/legalAxios";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Patron {
	letras: string;
	numeros: string;
}

interface RangoCodigo {
	codigo: string;
	patron: Patron;
	fechaRastreo?: string;
	fechaActualizacion?: string;
	actualizadoPor?: string;
}

interface Frontier {
	ultimoPrefijoConResultados?: string;
	bufferPrefijos: number;
}

interface Rescan {
	habilitado: boolean;
	intervaloDias: number;
	ultimaEjecucion?: string | null;
	batchSize: number;
}

interface Estadisticas {
	totalCodigosRastreados: number;
	codigosValidosEncontrados: number;
	ultimaEjecucion: string | null;
	duracionUltimaEjecucion: number | null;
}

interface EstadoWorker {
	activo: boolean;
	enEjecucion: boolean;
	ultimoError: { mensaje: string; fecha: string } | null;
}

interface Configuracion {
	estrategia: "frontier" | "secuencial" | "inteligente" | "manual";
	batchSize: number;
	pausaEntreBatches: number;
	codigosPorEjecucion: number;
}

interface RastreoConfig {
	_id: string;
	clave: string;
	rangoInicio: RangoCodigo;
	ultimoCodigoRastreado: RangoCodigo;
	rangoLimite: RangoCodigo;
	frontier: Frontier;
	rescan: Rescan;
	estadisticas: Estadisticas;
	estadoWorker: EstadoWorker;
	configuracion: Configuracion;
	createdAt: string;
	updatedAt: string;
}

interface ConfigResponse {
	success: boolean;
	data: RastreoConfig;
	message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const siguientePrefijo = (prefijo: string): string => {
	let codigo = 0;
	for (let i = 0; i < prefijo.length; i++) {
		codigo = codigo * 26 + (prefijo.charCodeAt(i) - 65);
	}
	codigo++;
	let resultado = "";
	for (let i = 0; i < prefijo.length; i++) {
		resultado = String.fromCharCode(65 + (codigo % 26)) + resultado;
		codigo = Math.floor(codigo / 26);
	}
	return resultado;
};

const calcularCeiling = (base: string, buffer: number): string => {
	let prefijo = base;
	for (let i = 0; i < buffer; i++) {
		prefijo = siguientePrefijo(prefijo);
	}
	return prefijo;
};

// ─── Componente ───────────────────────────────────────────────────────────────

const ConfiguracionTab = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [config, setConfig] = useState<RastreoConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Campos editables — Ejecución
	const [estrategia, setEstrategia] = useState<Configuracion["estrategia"]>("frontier");
	const [batchSize, setBatchSize] = useState(100);
	const [pausaEntreBatches, setPausaEntreBatches] = useState(5000);
	const [codigosPorEjecucion, setCodigosPorEjecucion] = useState(2500);
	const [workerActivo, setWorkerActivo] = useState(false);

	// Campos editables — Rango inicio
	const [rangoInicio, setRangoInicio] = useState("");

	// Campos editables — Frontier
	const [bufferPrefijos, setBufferPrefijos] = useState(5);

	// Campos editables — Rescan
	const [rescanHabilitado, setRescanHabilitado] = useState(true);
	const [rescanIntervaloDias, setRescanIntervaloDias] = useState(30);
	const [rescanBatchSize, setRescanBatchSize] = useState(200);

	const fetchConfig = async () => {
		try {
			setLoading(true);
			const response = await legalAxios.get<ConfigResponse>("/api/admin/rastreo/config");
			if (response.data.success) {
				const data = response.data.data;
				setConfig(data);
				setRangoInicio(data.rangoInicio?.codigo || "");
				setEstrategia(data.configuracion?.estrategia || "frontier");
				setBatchSize(data.configuracion?.batchSize || 100);
				setPausaEntreBatches(data.configuracion?.pausaEntreBatches || 5000);
				setCodigosPorEjecucion(data.configuracion?.codigosPorEjecucion || 2500);
				setWorkerActivo(data.estadoWorker?.activo || false);
				setBufferPrefijos(data.frontier?.bufferPrefijos ?? 5);
				setRescanHabilitado(data.rescan?.habilitado ?? true);
				setRescanIntervaloDias(data.rescan?.intervaloDias ?? 30);
				setRescanBatchSize(data.rescan?.batchSize ?? 200);
			}
		} catch (error: any) {
			enqueueSnackbar(error?.response?.data?.error || "Error al cargar la configuración", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		try {
			setSaving(true);
			const payload = {
				rangoInicio,
				configuracion: { estrategia, batchSize, pausaEntreBatches, codigosPorEjecucion },
				estadoWorker: { activo: workerActivo },
				frontier: { bufferPrefijos },
				rescan: { habilitado: rescanHabilitado, intervaloDias: rescanIntervaloDias, batchSize: rescanBatchSize },
			};
			const response = await legalAxios.put<ConfigResponse>("/api/admin/rastreo/config", payload);
			if (response.data.success) {
				enqueueSnackbar(response.data.message || "Configuración guardada", { variant: "success" });
				setConfig(response.data.data);
			}
		} catch (error: any) {
			enqueueSnackbar(error?.response?.data?.error || "Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	useEffect(() => { fetchConfig(); }, []);

	const formatDate = (d?: string | null) => {
		if (!d) return "-";
		return new Date(d).toLocaleDateString("es-AR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
	};

	const formatDuration = (s?: number | null) => {
		if (!s) return "-";
		if (s < 60) return `${s} seg`;
		if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} seg`;
		return `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`;
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
				<CircularProgress />
			</Box>
		);
	}

	if (!config) {
		return <Box p={4}><Alert severity="warning">No se pudo cargar la configuración de rastreo.</Alert></Box>;
	}

	const frontierBase = config.frontier?.ultimoPrefijoConResultados || config.rangoInicio?.patron?.letras || "AAAA";
	const frontierCeiling = calcularCeiling(frontierBase, bufferPrefijos);
	const prefijoActual = config.ultimoCodigoRastreado?.patron?.letras;
	const hayMas = prefijoActual ? prefijoActual <= frontierCeiling : true;

	return (
		<Stack spacing={3}>

			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h5">Configuración de Rastreo de Códigos</Typography>
				<Stack direction="row" spacing={2}>
					<Button variant="outlined" startIcon={<Refresh />} onClick={fetchConfig} disabled={loading}>
						Refrescar
					</Button>
					<Button variant="contained" startIcon={<Setting2 />} onClick={handleSave} disabled={saving}>
						{saving ? "Guardando..." : "Guardar Cambios"}
					</Button>
				</Stack>
			</Stack>

			{/* Estado del Worker */}
			<Card sx={{ p: 3 }}>
				<Stack direction="row" alignItems="center" gap={1} mb={2}>
					<Activity size={24} />
					<Typography variant="h6">Estado del Worker</Typography>
				</Stack>
				<Grid container spacing={3}>
					<Grid item xs={12} md={4}>
						<FormControlLabel
							control={<Switch checked={workerActivo} onChange={(e) => setWorkerActivo(e.target.checked)} color="primary" />}
							label="Worker Activo"
						/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">En Ejecución</Typography>
						<Box>
							<Chip
								label={config.estadoWorker?.enEjecucion ? "Ejecutando" : "Detenido"}
								size="small"
								color={config.estadoWorker?.enEjecucion ? "success" : "default"}
							/>
						</Box>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">Estado en BD</Typography>
						<Box>
							<Chip
								label={config.estadoWorker?.activo ? "Activo" : "Inactivo"}
								size="small"
								color={config.estadoWorker?.activo ? "success" : "error"}
							/>
						</Box>
					</Grid>
				</Grid>
				{config.estadoWorker?.ultimoError && (
					<Alert severity="error" icon={<Warning2 />} sx={{ mt: 2 }}>
						<Typography variant="subtitle2">Último Error:</Typography>
						<Typography variant="body2">{config.estadoWorker.ultimoError.mensaje}</Typography>
						<Typography variant="caption" color="text.secondary">{formatDate(config.estadoWorker.ultimoError.fecha)}</Typography>
					</Alert>
				)}
			</Card>

			{/* Frontier Dinámico */}
			<Card sx={{ p: 3 }}>
				<Stack direction="row" alignItems="center" gap={1} mb={1}>
					<ArrowRight size={24} />
					<Typography variant="h6">Frontier Dinámico</Typography>
					<Tooltip title="El discovery avanza de forma autónoma. El techo se expande automáticamente cuando encuentra PDFs válidos en prefijos nuevos.">
						<Chip label="Opción C" size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />
					</Tooltip>
				</Stack>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					El techo de exploración = último prefijo con resultados + buffer. No depende del scraping worker.
				</Typography>
				<Grid container spacing={3} alignItems="center">
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">Último prefijo con resultados</Typography>
						<Typography variant="h5" fontFamily="monospace" color="success.main">
							{config.frontier?.ultimoPrefijoConResultados || "-"}
						</Typography>
					</Grid>
					<Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
						<Typography variant="h5" color="text.disabled">+</Typography>
					</Grid>
					<Grid item xs={12} md={3}>
						<TextField
							fullWidth
							type="number"
							label="Buffer de prefijos"
							value={bufferPrefijos}
							onChange={(e) => setBufferPrefijos(Math.max(1, parseInt(e.target.value, 10) || 1))}
							helperText="Prefijos a explorar más allá del último exitoso"
							inputProps={{ min: 1, max: 20 }}
						/>
					</Grid>
					<Grid item xs={12} md={1} sx={{ textAlign: "center" }}>
						<Typography variant="h5" color="text.disabled">=</Typography>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">Ceiling actual</Typography>
						<Typography variant="h5" fontFamily="monospace" color={hayMas ? "warning.main" : "text.disabled"}>
							{frontierCeiling}
						</Typography>
						<Chip
							label={hayMas ? "Hay prefijos por explorar" : "Frontier alcanzado"}
							size="small"
							color={hayMas ? "warning" : "default"}
							sx={{ mt: 0.5 }}
						/>
					</Grid>
				</Grid>
				<Divider sx={{ my: 2 }} />
				<Grid container spacing={3}>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">Desde (último rastreado)</Typography>
						<Typography variant="h6" fontFamily="monospace">
							{config.ultimoCodigoRastreado?.codigo || "-"}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							{formatDate(config.ultimoCodigoRastreado?.fechaRastreo)}
						</Typography>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">Rango inicio (manual)</Typography>
						<Box mt={0.5}>
							<TextField
								size="small"
								label="Inicio"
								value={rangoInicio}
								onChange={(e) => setRangoInicio(e.target.value.toUpperCase())}
								helperText="Formato: AAAA00"
								inputProps={{ maxLength: 6 }}
							/>
						</Box>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">Rango límite (scraping worker)</Typography>
						<Typography variant="h6" fontFamily="monospace" color="text.secondary">
							{config.rangoLimite?.codigo || "-"}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Referencia — ya no controla el discovery
						</Typography>
					</Grid>
				</Grid>
			</Card>

			{/* Configuración de Ejecución */}
			<Card sx={{ p: 3 }}>
				<Stack direction="row" alignItems="center" gap={1} mb={2}>
					<Setting2 size={24} />
					<Typography variant="h6">Configuración de Ejecución</Typography>
				</Stack>
				<Grid container spacing={3}>
					<Grid item xs={12} md={6}>
						<FormControl fullWidth>
							<InputLabel>Estrategia</InputLabel>
							<Select value={estrategia} onChange={(e) => setEstrategia(e.target.value as Configuracion["estrategia"])} label="Estrategia">
								<MenuItem value="frontier">Frontier Dinámico (recomendado)</MenuItem>
								<MenuItem value="secuencial">Secuencial</MenuItem>
								<MenuItem value="inteligente">Inteligente</MenuItem>
								<MenuItem value="manual">Manual</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} md={6}>
						<TextField
							fullWidth
							type="number"
							label="Códigos por Ejecución"
							value={codigosPorEjecucion}
							onChange={(e) => setCodigosPorEjecucion(parseInt(e.target.value, 10) || 0)}
							helperText="Límite de códigos a verificar por run"
						/>
					</Grid>
					<Grid item xs={12} md={6}>
						<TextField
							fullWidth
							type="number"
							label="Batch Size"
							value={batchSize}
							onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 0)}
							helperText="Cantidad de códigos por lote"
						/>
					</Grid>
					<Grid item xs={12} md={6}>
						<TextField
							fullWidth
							type="number"
							label="Pausa entre Batches (ms)"
							value={pausaEntreBatches}
							onChange={(e) => setPausaEntreBatches(parseInt(e.target.value, 10) || 0)}
							helperText="Tiempo de espera entre lotes"
						/>
					</Grid>
				</Grid>
			</Card>

			{/* Re-scan Periódico */}
			<Card sx={{ p: 3 }}>
				<Stack direction="row" alignItems="center" gap={1} mb={1}>
					<RotateLeft size={24} />
					<Typography variant="h6">Re-scan Periódico de Inválidos</Typography>
				</Stack>
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Re-verifica códigos marcados como inválidos. Útil porque eldial puede asignar nuevos PDFs a códigos que antes devolvían 404.
				</Typography>
				<Grid container spacing={3}>
					<Grid item xs={12} md={3}>
						<FormControlLabel
							control={<Switch checked={rescanHabilitado} onChange={(e) => setRescanHabilitado(e.target.checked)} color="primary" />}
							label="Habilitado"
						/>
					</Grid>
					<Grid item xs={12} md={3}>
						<TextField
							fullWidth
							type="number"
							label="Intervalo (días)"
							value={rescanIntervaloDias}
							onChange={(e) => setRescanIntervaloDias(Math.max(1, parseInt(e.target.value, 10) || 1))}
							helperText="Re-verificar inválidos de más de N días"
							disabled={!rescanHabilitado}
						/>
					</Grid>
					<Grid item xs={12} md={3}>
						<TextField
							fullWidth
							type="number"
							label="Batch Size"
							value={rescanBatchSize}
							onChange={(e) => setRescanBatchSize(parseInt(e.target.value, 10) || 0)}
							helperText="Inválidos a re-verificar por run"
							disabled={!rescanHabilitado}
						/>
					</Grid>
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">Última Ejecución</Typography>
						<Typography variant="body2">{formatDate(config.rescan?.ultimaEjecucion)}</Typography>
					</Grid>
				</Grid>
			</Card>

			{/* Estadísticas */}
			<Card sx={{ p: 3 }}>
				<Typography variant="h6" gutterBottom>Estadísticas</Typography>
				<Divider sx={{ mb: 2 }} />
				<Grid container spacing={3}>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "primary.lighter", textAlign: "center" }}>
							<Typography variant="h4" color="primary.main">
								{config.estadisticas?.totalCodigosRastreados?.toLocaleString() || 0}
							</Typography>
							<Typography variant="caption" color="text.secondary">Total Rastreados</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "success.lighter", textAlign: "center" }}>
							<Typography variant="h4" color="success.main">
								{config.estadisticas?.codigosValidosEncontrados?.toLocaleString() || 0}
							</Typography>
							<Typography variant="caption" color="text.secondary">PDFs Válidos Encontrados</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "info.lighter", textAlign: "center" }}>
							<Typography variant="body1" color="info.main" fontWeight={600}>
								{formatDate(config.estadisticas?.ultimaEjecucion)}
							</Typography>
							<Typography variant="caption" color="text.secondary">Última Ejecución</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "warning.lighter", textAlign: "center" }}>
							<Typography variant="body1" color="warning.main" fontWeight={600}>
								{formatDuration(config.estadisticas?.duracionUltimaEjecucion)}
							</Typography>
							<Typography variant="caption" color="text.secondary">Duración Última Ejecución</Typography>
						</Card>
					</Grid>
				</Grid>
			</Card>

			{/* Info del Sistema */}
			<Card sx={{ p: 3 }}>
				<Typography variant="h6" gutterBottom>Información del Sistema</Typography>
				<Divider sx={{ mb: 2 }} />
				<Grid container spacing={2}>
					<Grid item xs={12} md={6}>
						<Typography variant="caption" color="text.secondary">ID de Configuración</Typography>
						<Typography variant="body2" fontFamily="monospace">{config._id}</Typography>
					</Grid>
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">Creado</Typography>
						<Typography variant="body2">{formatDate(config.createdAt)}</Typography>
					</Grid>
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">Última Actualización</Typography>
						<Typography variant="body2">{formatDate(config.updatedAt)}</Typography>
					</Grid>
				</Grid>
			</Card>

		</Stack>
	);
};

export default ConfiguracionTab;
