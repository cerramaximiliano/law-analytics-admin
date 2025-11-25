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
} from "@mui/material";
import { useSnackbar } from "notistack";
import { Refresh, Setting2, Timer1, Activity, Warning2 } from "iconsax-react";
import legalAxios from "utils/legalAxios";

// Tipos
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

interface Estadisticas {
	totalCodigosRastreados: number;
	codigosValidosEncontrados: number;
	ultimaEjecucion: string | null;
	duracionUltimaEjecucion: number | null;
}

interface UltimoError {
	mensaje: string;
	fecha: string;
}

interface EstadoWorker {
	activo: boolean;
	enEjecucion: boolean;
	ultimoError: UltimoError | null;
}

interface Configuracion {
	estrategia: "secuencial" | "inteligente" | "manual";
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

const ConfiguracionTab = () => {
	const { enqueueSnackbar } = useSnackbar();

	// Estados
	const [config, setConfig] = useState<RastreoConfig | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	// Estados para edición
	const [rangoInicio, setRangoInicio] = useState("");
	const [estrategia, setEstrategia] = useState<"secuencial" | "inteligente" | "manual">("secuencial");
	const [batchSize, setBatchSize] = useState(100);
	const [pausaEntreBatches, setPausaEntreBatches] = useState(5000);
	const [codigosPorEjecucion, setCodigosPorEjecucion] = useState(1000);
	const [workerActivo, setWorkerActivo] = useState(false);

	// Cargar configuración
	const fetchConfig = async () => {
		try {
			setLoading(true);

			const response = await legalAxios.get<ConfigResponse>("/api/admin/rastreo/config");

			if (response.data.success) {
				const data = response.data.data;
				setConfig(data);

				// Establecer valores en los campos editables
				setRangoInicio(data.rangoInicio?.codigo || "");
				setEstrategia(data.configuracion?.estrategia || "secuencial");
				setBatchSize(data.configuracion?.batchSize || 100);
				setPausaEntreBatches(data.configuracion?.pausaEntreBatches || 5000);
				setCodigosPorEjecucion(data.configuracion?.codigosPorEjecucion || 1000);
				setWorkerActivo(data.estadoWorker?.activo || false);
			}
		} catch (error: any) {
			console.error("Error al cargar configuración:", error);
			enqueueSnackbar(error?.response?.data?.error || "Error al cargar la configuración", { variant: "error" });
		} finally {
			setLoading(false);
		}
	};

	// Guardar configuración
	const handleSave = async () => {
		try {
			setSaving(true);

			const payload: any = {
				rangoInicio: rangoInicio,
				configuracion: {
					estrategia,
					batchSize,
					pausaEntreBatches,
					codigosPorEjecucion,
				},
				estadoWorker: {
					activo: workerActivo,
				},
			};

			const response = await legalAxios.put<ConfigResponse>("/api/admin/rastreo/config", payload);

			if (response.data.success) {
				enqueueSnackbar(response.data.message || "Configuración guardada correctamente", { variant: "success" });
				setConfig(response.data.data);
			}
		} catch (error: any) {
			console.error("Error al guardar configuración:", error);
			enqueueSnackbar(error?.response?.data?.error || "Error al guardar la configuración", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	// Efectos
	useEffect(() => {
		fetchConfig();
	}, []);

	// Formatear fecha
	const formatDate = (dateString: string | null | undefined) => {
		if (!dateString) return "-";
		const date = new Date(dateString);
		return date.toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Formatear duración
	const formatDuration = (seconds: number | null | undefined) => {
		if (!seconds) return "-";
		if (seconds < 60) return `${seconds} seg`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60} seg`;
		return `${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min`;
	};

	if (loading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
				<CircularProgress />
			</Box>
		);
	}

	if (!config) {
		return (
			<Box p={4}>
				<Alert severity="warning">No se pudo cargar la configuración de rastreo.</Alert>
			</Box>
		);
	}

	return (
		<Stack spacing={3}>
			{/* Header con acciones */}
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
						<Typography variant="caption" color="text.secondary">
							En Ejecución
						</Typography>
						<Box>
							<Chip
								label={config.estadoWorker?.enEjecucion ? "Ejecutando" : "Detenido"}
								size="small"
								color={config.estadoWorker?.enEjecucion ? "success" : "default"}
							/>
						</Box>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">
							Estado Actual en BD
						</Typography>
						<Box>
							<Chip label={config.estadoWorker?.activo ? "Activo" : "Inactivo"} size="small" color={config.estadoWorker?.activo ? "success" : "error"} />
						</Box>
					</Grid>
				</Grid>

				{config.estadoWorker?.ultimoError && (
					<Alert severity="error" icon={<Warning2 />} sx={{ mt: 2 }}>
						<Typography variant="subtitle2">Último Error:</Typography>
						<Typography variant="body2">{config.estadoWorker.ultimoError.mensaje}</Typography>
						<Typography variant="caption" color="text.secondary">
							{formatDate(config.estadoWorker.ultimoError.fecha)}
						</Typography>
					</Alert>
				)}
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
							<Select
								value={estrategia}
								onChange={(e) => setEstrategia(e.target.value as "secuencial" | "inteligente" | "manual")}
								label="Estrategia"
							>
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
							helperText="Tiempo de espera entre lotes en milisegundos"
						/>
					</Grid>
					<Grid item xs={12} md={6}>
						<TextField
							fullWidth
							type="number"
							label="Códigos por Ejecución"
							value={codigosPorEjecucion}
							onChange={(e) => setCodigosPorEjecucion(parseInt(e.target.value, 10) || 0)}
							helperText="Límite de códigos a procesar por ejecución"
						/>
					</Grid>
				</Grid>
			</Card>

			{/* Rangos de Códigos */}
			<Card sx={{ p: 3 }}>
				<Stack direction="row" alignItems="center" gap={1} mb={2}>
					<Timer1 size={24} />
					<Typography variant="h6">Rangos de Códigos</Typography>
				</Stack>
				<Grid container spacing={3}>
					<Grid item xs={12} md={4}>
						<TextField
							fullWidth
							label="Rango de Inicio"
							value={rangoInicio}
							onChange={(e) => setRangoInicio(e.target.value.toUpperCase())}
							helperText="Formato: AAAA00 (4 letras + 2 números)"
							inputProps={{ maxLength: 6 }}
						/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">
							Último Código Rastreado
						</Typography>
						<Typography variant="h6">{config.ultimoCodigoRastreado?.codigo || "-"}</Typography>
						<Typography variant="caption" color="text.secondary">
							{formatDate(config.ultimoCodigoRastreado?.fechaRastreo)}
						</Typography>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="caption" color="text.secondary">
							Rango Límite
						</Typography>
						<Typography variant="h6">{config.rangoLimite?.codigo || "-"}</Typography>
						<Typography variant="caption" color="text.secondary">
							Actualizado: {formatDate(config.rangoLimite?.fechaActualizacion)}
						</Typography>
					</Grid>
				</Grid>
			</Card>

			{/* Estadísticas */}
			<Card sx={{ p: 3 }}>
				<Typography variant="h6" gutterBottom>
					Estadísticas
				</Typography>
				<Divider sx={{ mb: 2 }} />
				<Grid container spacing={3}>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "primary.lighter", textAlign: "center" }}>
							<Typography variant="h4" color="primary.main">
								{config.estadisticas?.totalCodigosRastreados?.toLocaleString() || 0}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Total Códigos Rastreados
							</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "success.lighter", textAlign: "center" }}>
							<Typography variant="h4" color="success.main">
								{config.estadisticas?.codigosValidosEncontrados?.toLocaleString() || 0}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Códigos Válidos Encontrados
							</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "info.lighter", textAlign: "center" }}>
							<Typography variant="body1" color="info.main" fontWeight={600}>
								{formatDate(config.estadisticas?.ultimaEjecucion)}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Última Ejecución
							</Typography>
						</Card>
					</Grid>
					<Grid item xs={6} md={3}>
						<Card sx={{ p: 2, bgcolor: "warning.lighter", textAlign: "center" }}>
							<Typography variant="body1" color="warning.main" fontWeight={600}>
								{formatDuration(config.estadisticas?.duracionUltimaEjecucion)}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Duración Última Ejecución
							</Typography>
						</Card>
					</Grid>
				</Grid>
			</Card>

			{/* Información del Sistema */}
			<Card sx={{ p: 3 }}>
				<Typography variant="h6" gutterBottom>
					Información del Sistema
				</Typography>
				<Divider sx={{ mb: 2 }} />
				<Grid container spacing={2}>
					<Grid item xs={12} md={6}>
						<Typography variant="caption" color="text.secondary">
							ID de Configuración
						</Typography>
						<Typography variant="body2" fontFamily="monospace">
							{config._id}
						</Typography>
					</Grid>
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">
							Creado
						</Typography>
						<Typography variant="body2">{formatDate(config.createdAt)}</Typography>
					</Grid>
					<Grid item xs={12} md={3}>
						<Typography variant="caption" color="text.secondary">
							Última Actualización
						</Typography>
						<Typography variant="body2">{formatDate(config.updatedAt)}</Typography>
					</Grid>
				</Grid>
			</Card>
		</Stack>
	);
};

export default ConfiguracionTab;
