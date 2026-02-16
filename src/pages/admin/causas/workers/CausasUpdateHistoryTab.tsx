import React, { useState, useEffect } from "react";
import {
	Box,
	Card,
	CardContent,
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
	TablePagination,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	MenuItem,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, Warning2, Clock, Timer1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { CausasUpdateService, CausasUpdateRun, CausaDetail } from "api/causasUpdate";

const statusColors: Record<string, string> = {
	completed: "success",
	partial: "warning",
	error: "error",
	interrupted: "warning",
	in_progress: "info",
};

const statusLabels: Record<string, string> = {
	completed: "Completado",
	partial: "Parcial",
	error: "Error",
	interrupted: "Interrumpido",
	in_progress: "En progreso",
};

const CausasUpdateHistoryTab: React.FC = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [runs, setRuns] = useState<CausasUpdateRun[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [selectedRun, setSelectedRun] = useState<CausasUpdateRun | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);

	const fetchRuns = async () => {
		try {
			setLoading(true);
			const params: any = { page, limit: rowsPerPage };
			if (statusFilter) params.status = statusFilter;
			const response = await CausasUpdateService.getRuns(params);
			if (response.success) {
				setRuns(response.data);
				setTotal(response.count || 0);
			}
		} catch (error: any) {
			enqueueSnackbar("Error cargando historial de runs", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRuns();
	}, [page, rowsPerPage, statusFilter]);

	const handleViewDetail = async (runId: string) => {
		try {
			setDetailLoading(true);
			const response = await CausasUpdateService.getRunDetail(runId);
			if (response.success) {
				setSelectedRun(response.data);
			}
		} catch (error: any) {
			enqueueSnackbar("Error cargando detalle del run", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setDetailLoading(false);
		}
	};

	const formatDuration = (seconds?: number) => {
		if (!seconds) return "-";
		if (seconds < 60) return `${seconds}s`;
		const min = Math.floor(seconds / 60);
		const sec = seconds % 60;
		return `${min}m ${sec}s`;
	};

	if (loading && runs.length === 0) {
		return (
			<Stack spacing={2}>
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
				))}
			</Stack>
		);
	}

	return (
		<Stack spacing={2}>
			{/* Filters */}
			<Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
				<Stack direction="row" spacing={2} alignItems="center">
					<TextField
						select
						size="small"
						label="Estado"
						value={statusFilter}
						onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
						sx={{ minWidth: 150 }}
					>
						<MenuItem value="">Todos</MenuItem>
						<MenuItem value="completed">Completado</MenuItem>
						<MenuItem value="partial">Parcial</MenuItem>
						<MenuItem value="error">Error</MenuItem>
						<MenuItem value="interrupted">Interrumpido</MenuItem>
						<MenuItem value="in_progress">En progreso</MenuItem>
					</TextField>
				</Stack>
				<Button startIcon={<Refresh size={18} />} onClick={fetchRuns} size="small" variant="outlined">
					Actualizar
				</Button>
			</Stack>

			{/* Table */}
			<Card variant="outlined">
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Credencial</TableCell>
								<TableCell>Estado</TableCell>
								<TableCell align="right">Causas</TableCell>
								<TableCell align="right">Actualizadas</TableCell>
								<TableCell align="right">Movimientos</TableCell>
								<TableCell align="right">Duración</TableCell>
								<TableCell align="center">Completo</TableCell>
								<TableCell></TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{runs.length === 0 ? (
								<TableRow>
									<TableCell colSpan={9} align="center">
										<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
											No hay runs registrados
										</Typography>
									</TableCell>
								</TableRow>
							) : (
								runs.map((run) => (
									<TableRow key={run._id} hover sx={{ cursor: "pointer" }} onClick={() => handleViewDetail(run._id)}>
										<TableCell>
											<Typography variant="caption">
												{new Date(run.startedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="caption" fontFamily="monospace">
												{run.credentialsId?.toString().slice(-6)}
											</Typography>
											{run.metadata?.isResumedRun && (
												<Chip label="Resume" size="small" sx={{ ml: 0.5, height: 16, fontSize: "0.6rem" }} />
											)}
										</TableCell>
										<TableCell>
											<Chip
												label={statusLabels[run.status] || run.status}
												size="small"
												color={statusColors[run.status] as any || "default"}
												variant="outlined"
												sx={{ height: 22, fontSize: "0.75rem" }}
											/>
										</TableCell>
										<TableCell align="right">{run.results?.causasProcessed ?? 0}/{run.results?.totalCausas ?? 0}</TableCell>
										<TableCell align="right">{run.results?.causasUpdated ?? 0}</TableCell>
										<TableCell align="right">{run.results?.newMovimientos ?? 0}</TableCell>
										<TableCell align="right">{formatDuration(run.durationSeconds)}</TableCell>
										<TableCell align="center">
											{run.results?.isComplete ? (
												<TickCircle size={16} color={theme.palette.success.main} />
											) : (
												<CloseCircle size={16} color={theme.palette.warning.main} />
											)}
										</TableCell>
										<TableCell>
											<Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); handleViewDetail(run._id); }}>
												Ver
											</Button>
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
					onPageChange={(_, p) => setPage(p)}
					rowsPerPage={rowsPerPage}
					onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
					rowsPerPageOptions={[10, 25, 50]}
					labelRowsPerPage="Filas"
				/>
			</Card>

			{/* Detail Dialog */}
			<Dialog open={!!selectedRun} onClose={() => setSelectedRun(null)} maxWidth="md" fullWidth>
				{selectedRun && (
					<>
						<DialogTitle>
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="h6">Detalle del Run</Typography>
								<Chip
									label={statusLabels[selectedRun.status] || selectedRun.status}
									size="small"
									color={statusColors[selectedRun.status] as any || "default"}
								/>
							</Stack>
						</DialogTitle>
						<DialogContent dividers>
							<Stack spacing={2}>
								{/* Summary */}
								<Stack direction="row" spacing={3} flexWrap="wrap">
									<Box>
										<Typography variant="caption" color="text.secondary">Credencial</Typography>
										<Typography variant="body2" fontFamily="monospace">{selectedRun.credentialsId}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">Inicio</Typography>
										<Typography variant="body2">{new Date(selectedRun.startedAt).toLocaleString("es-AR")}</Typography>
									</Box>
									<Box>
										<Typography variant="caption" color="text.secondary">Duración</Typography>
										<Typography variant="body2">{formatDuration(selectedRun.durationSeconds)}</Typography>
									</Box>
									{selectedRun.metadata?.isFirstRun && (
										<Chip label="Primera ejecución" size="small" color="info" />
									)}
								</Stack>

								{/* Error */}
								{selectedRun.error && (
									<Alert severity="error" variant="outlined">
										<Typography variant="body2">{selectedRun.error.message}</Typography>
										<Typography variant="caption" color="text.secondary">Fase: {selectedRun.error.phase}</Typography>
									</Alert>
								)}

								{/* Causas detail */}
								{selectedRun.causasDetail && selectedRun.causasDetail.length > 0 && (
									<>
										<Typography variant="subtitle1" fontWeight={600}>Detalle por causa ({selectedRun.causasDetail.length})</Typography>
										<TableContainer>
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Fuero</TableCell>
														<TableCell>Expediente</TableCell>
														<TableCell>Estado</TableCell>
														<TableCell align="right">Movs. nuevos</TableCell>
														<TableCell align="right">Total movs.</TableCell>
														<TableCell>Error</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{selectedRun.causasDetail.map((d: CausaDetail, i: number) => (
														<TableRow key={i}>
															<TableCell>{d.fuero}</TableCell>
															<TableCell>{d.number}/{d.year}</TableCell>
															<TableCell>
																<Chip
																	label={d.status}
																	size="small"
																	color={d.status === "success" ? "success" : d.status === "error" ? "error" : "default"}
																	variant="outlined"
																	sx={{ height: 20, fontSize: "0.7rem" }}
																/>
															</TableCell>
															<TableCell align="right">{d.movimientosAdded || 0}</TableCell>
															<TableCell align="right">{d.movimientosTotal || "-"}</TableCell>
															<TableCell>
																{d.error && (
																	<Typography variant="caption" color="error.main" sx={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
																		{d.error}
																	</Typography>
																)}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</>
								)}
							</Stack>
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setSelectedRun(null)}>Cerrar</Button>
						</DialogActions>
					</>
				)}
			</Dialog>
		</Stack>
	);
};

export default CausasUpdateHistoryTab;
