import React, { useEffect, useState, useCallback } from "react";
import {
	Box,
	Typography,
	Paper,
	Grid,
	Skeleton,
	Slider,
	Divider,
	Chip,
	useTheme,
	alpha,
	Tooltip,
	IconButton,
	Theme,
} from "@mui/material";
import { Calculator, Timer1, Refresh, Clock, Activity, Chart } from "iconsax-react";
import { CausasPjnService, CapacityStatsResponse, CapacityStatsTotals } from "api/causasPjn";

// Helper para obtener colores del tema
const getThemeColors = (theme: Theme) => ({
	primary: { main: theme.palette.primary.main, light: theme.palette.primary.light, lighter: alpha(theme.palette.primary.light, 0.15) },
	success: { main: theme.palette.success.main, light: theme.palette.success.light, lighter: alpha(theme.palette.success.light, 0.15) },
	warning: { main: theme.palette.warning.main, light: theme.palette.warning.light, lighter: alpha(theme.palette.warning.light, 0.15) },
	neutral: { main: theme.palette.grey[600], light: theme.palette.grey[400], lighter: theme.palette.grey[100], text: theme.palette.text.secondary },
});

interface CapacityStatsWidgetProps {
	onRefresh?: () => void;
}

const CapacityStatsWidget: React.FC<CapacityStatsWidgetProps> = ({ onRefresh }) => {
	const theme = useTheme();
	const COLORS = getThemeColors(theme);
	const [loading, setLoading] = useState(true);
	const [stats, setStats] = useState<CapacityStatsResponse["data"] | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Parámetros del simulador
	const [thresholdHours, setThresholdHours] = useState(2);
	const [workersPerFuero, setWorkersPerFuero] = useState(3);
	const [workHoursPerDay, setWorkHoursPerDay] = useState(14);
	const [simulating, setSimulating] = useState(false);

	const fetchStats = useCallback(async (threshold?: number, workers?: number, workHours?: number) => {
		try {
			setLoading(true);
			setError(null);
			const response = await CausasPjnService.getCapacityStats({
				thresholdHours: threshold ?? thresholdHours,
				workersPerFuero: workers ?? workersPerFuero,
				workHoursPerDay: workHours ?? workHoursPerDay,
			});
			if (response.success) {
				setStats(response.data);
				// Actualizar los sliders con los valores de la respuesta
				if (!simulating) {
					setThresholdHours(response.data.config.thresholdHours);
					setWorkersPerFuero(response.data.config.workersPerFuero);
					setWorkHoursPerDay(response.data.config.workHoursPerDay);
				}
			}
		} catch (err: any) {
			setError(err.message || "Error al cargar estadísticas");
		} finally {
			setLoading(false);
			setSimulating(false);
		}
	}, [thresholdHours, workersPerFuero, workHoursPerDay, simulating]);

	useEffect(() => {
		fetchStats();
	}, []);

	const handleSimulate = () => {
		setSimulating(true);
		fetchStats(thresholdHours, workersPerFuero, workHoursPerDay);
	};

	const formatTime = (minutes: number): string => {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	};

	if (loading && !stats) {
		return (
			<Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
					<Calculator size={20} style={{ color: COLORS.primary.main }} />
					<Typography variant="subtitle1" fontWeight="bold">
						Capacidad de Procesamiento
					</Typography>
				</Box>
				<Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 1 }} />
			</Paper>
		);
	}

	if (error) {
		return (
			<Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				<Typography color="error">{error}</Typography>
			</Paper>
		);
	}

	const totals = stats?.totals;

	return (
		<Paper
			elevation={0}
			sx={{
				p: { xs: 1.5, sm: 2.5 },
				borderRadius: 2,
				bgcolor: theme.palette.background.paper,
				border: `1px solid ${theme.palette.divider}`,
			}}
		>
			{/* Header */}
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Calculator size={20} style={{ color: COLORS.primary.main }} />
					<Typography variant="subtitle1" fontWeight="bold">
						Capacidad de Procesamiento
					</Typography>
				</Box>
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={() => fetchStats()} disabled={loading}>
						<Refresh size={18} style={{ color: COLORS.neutral.main }} />
					</IconButton>
				</Tooltip>
			</Box>

			{/* Métricas principales */}
			<Grid container spacing={2} sx={{ mb: 3 }}>
				<Grid item xs={6} sm={3}>
					<Box sx={{ textAlign: "center", p: 1.5, bgcolor: alpha(COLORS.primary.lighter, 0.5), borderRadius: 2 }}>
						<Typography variant="h5" fontWeight="bold" color={COLORS.primary.main}>
							{totals?.avgSeconds || 0}s
						</Typography>
						<Typography variant="caption" color="text.secondary">
							⏱️ Tiempo promedio
						</Typography>
					</Box>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Box sx={{ textAlign: "center", p: 1.5, bgcolor: alpha(COLORS.success.lighter, 0.5), borderRadius: 2 }}>
						<Typography variant="h5" fontWeight="bold" color={COLORS.success.main}>
							{totals?.successRate || 0}%
						</Typography>
						<Typography variant="caption" color="text.secondary">
							✅ Tasa de éxito
						</Typography>
					</Box>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Box sx={{ textAlign: "center", p: 1.5, bgcolor: alpha(COLORS.warning.lighter, 0.5), borderRadius: 2 }}>
						<Typography variant="h5" fontWeight="bold" color={COLORS.warning.main}>
							{totals?.docsPerHourPerWorker || 0}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							📄 Docs/hora/worker
						</Typography>
					</Box>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Box sx={{ textAlign: "center", p: 1.5, bgcolor: alpha(COLORS.neutral.lighter, 0.5), borderRadius: 2 }}>
						<Typography variant="h5" fontWeight="bold" color={COLORS.neutral.main}>
							{totals?.maxUpdatesPerDocPerDay || 0}x
						</Typography>
						<Typography variant="caption" color="text.secondary">
							🔄 Máx. updates/doc/día
						</Typography>
					</Box>
				</Grid>
			</Grid>

			{/* Proyecciones */}
			<Box sx={{ mb: 3, p: 2, bgcolor: alpha(COLORS.primary.lighter, 0.3), borderRadius: 2 }}>
				<Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
					📊 Proyecciones con configuración actual
				</Typography>
				<Grid container spacing={2}>
					<Grid item xs={6} md={3}>
						<Typography variant="body2" color="text.secondary">
							Capacidad diaria total
						</Typography>
						<Typography variant="h6" fontWeight="bold">
							{(totals?.docsPerDayAllFueros || 0).toLocaleString()} docs
						</Typography>
					</Grid>
					<Grid item xs={6} md={3}>
						<Typography variant="body2" color="text.secondary">
							Tiempo para procesar todos
						</Typography>
						<Typography variant="h6" fontWeight="bold">
							{formatTime(totals?.timeToProcessAllOnce || 0)}
						</Typography>
					</Grid>
					<Grid item xs={6} md={3}>
						<Typography variant="body2" color="text.secondary">
							Cobertura diaria
						</Typography>
						<Typography variant="h6" fontWeight="bold" color={
							(totals?.dailyCoveragePercent || 0) >= 100 ? COLORS.success.main : COLORS.warning.main
						}>
							{totals?.dailyCoveragePercent || 0}%
						</Typography>
					</Grid>
					<Grid item xs={6} md={3}>
						<Typography variant="body2" color="text.secondary">
							Total elegibles
						</Typography>
						<Typography variant="h6" fontWeight="bold">
							{(totals?.eligible || 0).toLocaleString()}
						</Typography>
					</Grid>
				</Grid>
			</Box>

			<Divider sx={{ my: 2 }} />

			{/* Simulador */}
			<Box>
				<Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
					<Chart size={18} style={{ color: COLORS.primary.main }} />
					Simulador de Escenarios
				</Typography>

				<Grid container spacing={3}>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Threshold (horas): <strong>{thresholdHours}h</strong>
						</Typography>
						<Slider
							value={thresholdHours}
							onChange={(_, value) => setThresholdHours(value as number)}
							min={1}
							max={12}
							step={1}
							marks={[
								{ value: 1, label: "1h" },
								{ value: 6, label: "6h" },
								{ value: 12, label: "12h" },
							]}
							sx={{ color: COLORS.primary.main }}
						/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Workers por fuero: <strong>{workersPerFuero}</strong>
						</Typography>
						<Slider
							value={workersPerFuero}
							onChange={(_, value) => setWorkersPerFuero(value as number)}
							min={1}
							max={10}
							step={1}
							marks={[
								{ value: 1, label: "1" },
								{ value: 5, label: "5" },
								{ value: 10, label: "10" },
							]}
							sx={{ color: COLORS.success.main }}
						/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Typography variant="body2" color="text.secondary" gutterBottom>
							Horas laborales/día: <strong>{workHoursPerDay}h</strong>
						</Typography>
						<Slider
							value={workHoursPerDay}
							onChange={(_, value) => setWorkHoursPerDay(value as number)}
							min={4}
							max={24}
							step={1}
							marks={[
								{ value: 8, label: "8h" },
								{ value: 14, label: "14h" },
								{ value: 24, label: "24h" },
							]}
							sx={{ color: COLORS.warning.main }}
						/>
					</Grid>
				</Grid>

				<Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
					<Chip
						label={loading ? "Calculando..." : "Simular escenario"}
						onClick={handleSimulate}
						disabled={loading}
						sx={{
							bgcolor: COLORS.primary.main,
							color: "white",
							fontWeight: "bold",
							"&:hover": { bgcolor: COLORS.primary.light },
							cursor: "pointer",
						}}
					/>
				</Box>

				{/* Resultados de simulación */}
				{stats && (
					<Box sx={{ mt: 2, p: 1.5, bgcolor: alpha(COLORS.neutral.lighter, 0.5), borderRadius: 1 }}>
						<Typography variant="caption" color="text.secondary">
							Con {workersPerFuero} workers × 4 fueros × {workHoursPerDay}h =
							<strong> {(totals?.docsPerDayAllFueros || 0).toLocaleString()} docs/día</strong>
							{" | "}
							Cada documento se actualiza hasta <strong>{totals?.maxUpdatesPerDocPerDay || 0}x/día</strong>
						</Typography>
					</Box>
				)}
			</Box>

			{/* Detalle por fuero */}
			{stats?.byFuero && (
				<Box sx={{ mt: 3 }}>
					<Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
						📋 Detalle por Fuero
					</Typography>
					<Grid container spacing={1}>
						{Object.entries(stats.byFuero).map(([key, fuero]) => (
							<Grid item xs={6} sm={3} key={key}>
								<Box
									sx={{
										p: 1.5,
										borderRadius: 1,
										border: `1px solid ${theme.palette.divider}`,
										textAlign: "center",
									}}
								>
									<Typography variant="subtitle2" fontWeight="bold">
										{fuero.fuero}
									</Typography>
									<Typography variant="caption" color="text.secondary" display="block">
										{fuero.eligible} elegibles
									</Typography>
									<Typography variant="caption" color="text.secondary" display="block">
										{fuero.processing.avgSeconds}s promedio
									</Typography>
									<Typography variant="caption" color={COLORS.success.main} display="block">
										{fuero.capacity.docsPerDayTotal}/día
									</Typography>
								</Box>
							</Grid>
						))}
					</Grid>
				</Box>
			)}
		</Paper>
	);
};

export default CapacityStatsWidget;
