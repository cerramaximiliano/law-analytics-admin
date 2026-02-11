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
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Timer1, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingManagerService, ManagerState, WorkerStateInfo } from "api/scrapingManager";

const WORKER_LABELS: Record<string, string> = {
	"credentials-processor": "Verificación Inicial",
	"mis-causas": "Sincronización Completa",
	"update-sync": "Actualización Incremental",
	"private-causas-update": "Causas Privadas",
};

const MisCausasStatsTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [state, setState] = useState<ManagerState | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchState = async () => {
		try {
			setLoading(true);
			const response = await ScrapingManagerService.getManagerState();
			if (response.success) {
				setState(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar("Error al obtener estado del manager", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchState();
	}, []);

	if (loading) {
		return (
			<Stack spacing={2}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
				))}
			</Stack>
		);
	}

	const managerStatus = state?.managerStatus;
	const serviceAvailability = state?.serviceAvailability;

	if (!managerStatus) {
		return (
			<Alert severity="info" variant="outlined">
				<Typography variant="body2">
					No hay datos de estado disponibles. El Scraping Manager puede no haber sido ejecutado aún.
				</Typography>
			</Alert>
		);
	}

	const lastPoll = managerStatus.lastPoll ? new Date(managerStatus.lastPoll) : null;
	const isStale = lastPoll ? Date.now() - lastPoll.getTime() > 120000 : true;

	return (
		<Stack spacing={3}>
			{/* Header con refresh */}
			<Box display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="h6">Estado en Tiempo Real</Typography>
				<Button variant="outlined" size="small" startIcon={<Refresh size={16} />} onClick={fetchState}>
					Actualizar
				</Button>
			</Box>

			{/* Estado general del manager */}
			<Grid container spacing={2}>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Manager</Typography>
							<Stack direction="row" spacing={1} alignItems="center">
								{managerStatus.isRunning ? (
									<TickCircle size={18} color={theme.palette.success.main} />
								) : (
									<CloseCircle size={18} color={theme.palette.error.main} />
								)}
								<Typography variant="h6" color={managerStatus.isRunning ? "success.main" : "error.main"}>
									{managerStatus.isRunning ? "Running" : "Stopped"}
								</Typography>
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Servicio</Typography>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="h6" color={managerStatus.serviceAvailable ? "info.main" : "warning.main"}>
									{managerStatus.serviceAvailable ? "Disponible" : "No disponible"}
								</Typography>
							</Stack>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Config Version</Typography>
							<Typography variant="h6">{managerStatus.configVersion || "N/A"}</Typography>
						</CardContent>
					</Card>
				</Grid>
				<Grid item xs={6} sm={3}>
					<Card variant="outlined">
						<CardContent sx={{ py: 1.5 }}>
							<Typography variant="caption" color="text.secondary">Último Poll</Typography>
							<Typography variant="body2">
								{lastPoll ? lastPoll.toLocaleString("es-AR") : "N/A"}
							</Typography>
							{isStale && (
								<Chip label="Desactualizado" size="small" color="warning" sx={{ mt: 0.5, fontSize: "0.6rem" }} />
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			{/* Estado por worker */}
			<Typography variant="h6">Estado de Workers</Typography>
			{managerStatus.workers ? (
				<Grid container spacing={2}>
					{Object.entries(managerStatus.workers).map(([workerName, workerState]) => {
						const ws = workerState as WorkerStateInfo;
						return (
							<Grid item xs={12} sm={6} key={workerName}>
								<Card
									variant="outlined"
									sx={{
										borderColor: ws.error
											? alpha(theme.palette.error.main, 0.5)
											: ws.currentInstances > 0
											? alpha(theme.palette.success.main, 0.3)
											: "divider",
									}}
								>
									<CardContent sx={{ py: 2 }}>
										<Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
											<Box>
												<Typography variant="subtitle2" fontWeight="bold">
													{WORKER_LABELS[workerName] || workerName}
												</Typography>
												<Typography variant="caption" color="text.secondary" fontFamily="monospace">
													{workerName}
												</Typography>
											</Box>
											<Chip
												label={ws.enabled ? "Habilitado" : "Deshabilitado"}
												size="small"
												color={ws.enabled ? "success" : "default"}
												variant="outlined"
												sx={{ fontSize: "0.65rem" }}
											/>
										</Stack>

										{ws.error ? (
											<Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
												<Typography variant="caption">{ws.error}</Typography>
											</Alert>
										) : (
											<Grid container spacing={1}>
												<Grid item xs={6}>
													<Typography variant="caption" color="text.secondary">Cola</Typography>
													<Typography variant="h6">{ws.queueDepth}</Typography>
												</Grid>
												<Grid item xs={6}>
													<Typography variant="caption" color="text.secondary">Instancias</Typography>
													<Typography variant="h6">
														{ws.currentInstances}
														<Typography component="span" variant="caption" color="text.secondary"> / {ws.desiredInstances}</Typography>
													</Typography>
												</Grid>
												<Grid item xs={6}>
													<Typography variant="caption" color="text.secondary">Horario</Typography>
													<Stack direction="row" spacing={0.5} alignItems="center">
														{ws.withinSchedule ? (
															<TickCircle size={14} color={theme.palette.success.main} />
														) : (
															<Timer1 size={14} color={theme.palette.warning.main} />
														)}
														<Typography variant="body2">
															{ws.withinSchedule ? "Dentro" : "Fuera"}
														</Typography>
													</Stack>
												</Grid>
												<Grid item xs={6}>
													<Typography variant="caption" color="text.secondary">Razón</Typography>
													<Typography variant="caption" display="block" sx={{ wordBreak: "break-word" }}>
														{ws.reason}
													</Typography>
												</Grid>
											</Grid>
										)}

										{/* Queue breakdown si existe */}
										{ws.queueBreakdown && (
											<Box sx={{ mt: 1.5, pt: 1, borderTop: 1, borderColor: "divider" }}>
												<Typography variant="caption" color="text.secondary" gutterBottom>
													Desglose de cola:
												</Typography>
												<Stack direction="row" spacing={1} flexWrap="wrap">
													{Object.entries(ws.queueBreakdown).map(([key, val]) => (
														<Chip
															key={key}
															label={`${key}: ${val}`}
															size="small"
															variant="outlined"
															sx={{ fontSize: "0.6rem" }}
														/>
													))}
												</Stack>
											</Box>
										)}
									</CardContent>
								</Card>
							</Grid>
						);
					})}
				</Grid>
			) : (
				<Alert severity="info" variant="outlined">
					<Typography variant="body2">Sin datos de workers disponibles.</Typography>
				</Alert>
			)}
		</Stack>
	);
};

export default MisCausasStatsTab;
