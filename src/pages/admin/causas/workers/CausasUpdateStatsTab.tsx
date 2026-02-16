import React, { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
	Grid,
	Typography,
	Stack,
	Chip,
	Alert,
	Skeleton,
	Button,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateService, RunsStats } from "api/causasUpdate";

const CausasUpdateStatsTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<RunsStats | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchStats = async () => {
		try {
			setLoading(true);
			const response = await CausasUpdateService.getStats();
			if (response.success) {
				setStats(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar("Error cargando estadísticas", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStats();
	}, []);

	if (loading) {
		return (
			<Stack spacing={2}>
				<Stack direction="row" spacing={2}>
					{[1, 2, 3, 4].map((i) => (
						<Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1, flex: 1 }} />
					))}
				</Stack>
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	if (!stats) {
		return (
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">No hay estadísticas disponibles</Typography>
			</Alert>
		);
	}

	const today = stats.today;

	return (
		<Stack spacing={3}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Estadísticas del Worker</Typography>
				<Button startIcon={<Refresh size={18} />} onClick={fetchStats} size="small" variant="outlined">
					Actualizar
				</Button>
			</Stack>

			{/* KPIs del día */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 2 }}>
							<Typography variant="h4" color="primary.main">{today.totalRuns}</Typography>
							<Typography variant="caption" color="text.secondary">Runs hoy</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 2 }}>
							<Typography variant="h4" color="success.main">{today.causasUpdated}</Typography>
							<Typography variant="caption" color="text.secondary">Causas actualizadas</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 2 }}>
							<Typography variant="h4" color="info.main">{today.newMovimientos}</Typography>
							<Typography variant="caption" color="text.secondary">Movimientos nuevos</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ textAlign: "center", py: 2 }}>
							<Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
								<Typography variant="h4" color={stats.incompleteRuns > 0 ? "warning.main" : "text.secondary"}>
									{stats.incompleteRuns}
								</Typography>
								{stats.incompleteRuns > 0 && <Warning2 size={20} color={theme.palette.warning.main} />}
							</Stack>
							<Typography variant="caption" color="text.secondary">Runs incompletos</Typography>
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Status breakdown */}
			{(today.completed !== undefined || today.partial !== undefined || today.errors !== undefined) && (
				<Stack direction="row" spacing={1}>
					{today.completed !== undefined && today.completed > 0 && (
						<Chip icon={<TickCircle size={14} />} label={`${today.completed} completados`} size="small" color="success" variant="outlined" />
					)}
					{today.partial !== undefined && today.partial > 0 && (
						<Chip icon={<Warning2 size={14} />} label={`${today.partial} parciales`} size="small" color="warning" variant="outlined" />
					)}
					{today.errors !== undefined && today.errors > 0 && (
						<Chip icon={<CloseCircle size={14} />} label={`${today.errors} con error`} size="small" color="error" variant="outlined" />
					)}
					{today.avgDuration !== undefined && (
						<Chip label={`Promedio: ${Math.round(today.avgDuration)}s`} size="small" variant="outlined" />
					)}
				</Stack>
			)}

			{/* Semana por día */}
			{stats.weekByDay.length > 0 && (
				<Card variant="outlined">
					<CardContent>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Últimos 7 días
						</Typography>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell align="right">Runs</TableCell>
										<TableCell align="right">Causas actualizadas</TableCell>
										<TableCell align="right">Movimientos nuevos</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.weekByDay.map((day) => (
										<TableRow key={day._id}>
											<TableCell>{day._id}</TableCell>
											<TableCell align="right">{day.runs}</TableCell>
											<TableCell align="right">{day.causasUpdated}</TableCell>
											<TableCell align="right">{day.newMovimientos}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Por credencial */}
			{stats.byCredential.length > 0 && (
				<Card variant="outlined">
					<CardContent>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Por credencial (última semana)
						</Typography>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Credencial</TableCell>
										<TableCell align="right">Runs</TableCell>
										<TableCell align="right">Actualizadas</TableCell>
										<TableCell align="right">Movimientos</TableCell>
										<TableCell align="right">Errores</TableCell>
										<TableCell>Último run</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.byCredential.map((cred) => (
										<TableRow key={cred._id}>
											<TableCell>
												<Typography variant="caption" fontFamily="monospace">
													{cred._id?.toString().slice(-8)}
												</Typography>
											</TableCell>
											<TableCell align="right">{cred.totalRuns}</TableCell>
											<TableCell align="right">{cred.causasUpdated}</TableCell>
											<TableCell align="right">{cred.newMovimientos}</TableCell>
											<TableCell align="right">
												{cred.errors > 0 ? (
													<Typography variant="body2" color="error.main">{cred.errors}</Typography>
												) : (
													0
												)}
											</TableCell>
											<TableCell>
												<Typography variant="caption">
													{new Date(cred.lastRun).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
												</Typography>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}

			{/* Últimos runs */}
			{stats.recentRuns.length > 0 && (
				<Card variant="outlined">
					<CardContent>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Últimos 10 runs
						</Typography>
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell align="right">Procesadas</TableCell>
										<TableCell align="right">Movimientos</TableCell>
										<TableCell align="right">Duración</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{stats.recentRuns.map((run) => (
										<TableRow key={run._id}>
											<TableCell>
												<Typography variant="caption">
													{new Date(run.startedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
												</Typography>
											</TableCell>
											<TableCell>
												<Chip
													label={run.status}
													size="small"
													color={
														run.status === "completed" ? "success" :
														run.status === "error" ? "error" :
														run.status === "partial" || run.status === "interrupted" ? "warning" : "info"
													}
													variant="outlined"
													sx={{ height: 20, fontSize: "0.7rem" }}
												/>
											</TableCell>
											<TableCell align="right">{run.results?.causasProcessed ?? 0}</TableCell>
											<TableCell align="right">{run.results?.newMovimientos ?? 0}</TableCell>
											<TableCell align="right">
												{run.durationSeconds ? (run.durationSeconds < 60 ? `${run.durationSeconds}s` : `${Math.floor(run.durationSeconds / 60)}m`) : "-"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</CardContent>
				</Card>
			)}
		</Stack>
	);
};

export default CausasUpdateStatsTab;
