import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Stack,
	Alert,
	Typography,
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Chip,
	IconButton,
	Tooltip,
	CircularProgress,
	Checkbox,
	LinearProgress,
} from "@mui/material";
import { Trash, Refresh, Warning2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, WorkerConfig } from "api/workers";

interface TemporaryWorkersModalProps {
	open: boolean;
	onClose: () => void;
	onDeleteSuccess?: () => void;
}

const TemporaryWorkersModal: React.FC<TemporaryWorkersModalProps> = ({ open, onClose, onDeleteSuccess }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState<string | null>(null);
	const [deletingAll, setDeletingAll] = useState(false);
	const [temporaryWorkers, setTemporaryWorkers] = useState<WorkerConfig[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	// Obtener el ID real del documento
	const getConfigId = (config: WorkerConfig): string => {
		if (typeof config._id === "string") {
			return config._id;
		}
		return config._id.$oid;
	};

	// Formatear fecha
	const formatDate = (date: any): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleString("es-ES");
	};

	// Cargar workers temporarios
	const fetchTemporaryWorkers = async () => {
		try {
			setLoading(true);
			const response = await WorkersService.getScrapingConfigs({
				includeTemporary: true,
				limit: 1000,
			} as any);

			if (response.success && Array.isArray(response.data)) {
				// Filtrar solo los temporarios
				const temporaries = response.data.filter((w: any) => w.isTemporary === true);
				setTemporaryWorkers(temporaries);
				setSelectedIds([]);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar workers temporarios", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (open) {
			fetchTemporaryWorkers();
		}
	}, [open]);

	// Eliminar un worker temporario
	const handleDelete = async (config: WorkerConfig) => {
		const configId = getConfigId(config);
		try {
			setDeleting(configId);
			await WorkersService.deleteScrapingConfig(configId);

			enqueueSnackbar("Worker temporario eliminado", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});

			setTemporaryWorkers((prev) => prev.filter((w) => getConfigId(w) !== configId));
			setSelectedIds((prev) => prev.filter((id) => id !== configId));
			onDeleteSuccess?.();
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al eliminar el worker";
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setDeleting(null);
		}
	};

	// Eliminar workers seleccionados
	const handleDeleteSelected = async () => {
		if (selectedIds.length === 0) return;

		try {
			setDeletingAll(true);
			let deleted = 0;
			let errors = 0;

			for (const id of selectedIds) {
				try {
					await WorkersService.deleteScrapingConfig(id);
					deleted++;
				} catch {
					errors++;
				}
			}

			if (deleted > 0) {
				enqueueSnackbar(`${deleted} worker(s) temporario(s) eliminado(s)${errors > 0 ? `, ${errors} error(es)` : ""}`, {
					variant: errors > 0 ? "warning" : "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onDeleteSuccess?.();
			}

			// Recargar lista
			await fetchTemporaryWorkers();
		} catch (error) {
			enqueueSnackbar("Error al eliminar workers", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setDeletingAll(false);
		}
	};

	// Manejar selección
	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			setSelectedIds(temporaryWorkers.map((w) => getConfigId(w)));
		} else {
			setSelectedIds([]);
		}
	};

	const handleSelectOne = (configId: string, checked: boolean) => {
		if (checked) {
			setSelectedIds((prev) => [...prev, configId]);
		} else {
			setSelectedIds((prev) => prev.filter((id) => id !== configId));
		}
	};

	const handleClose = () => {
		if (!deleting && !deletingAll) {
			onClose();
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" spacing={1}>
					<Warning2 size={24} color="#f44336" />
					<Typography variant="h4">Workers Temporarios</Typography>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<Alert severity="warning" variant="outlined">
						<Typography variant="body2">
							Los workers temporarios son configuraciones que se crean automáticamente durante el proceso de scraping y pueden causar
							problemas en el servidor si se acumulan. Es recomendable eliminarlos periódicamente.
						</Typography>
					</Alert>

					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="body2" color="text.secondary">
							{loading ? "Cargando..." : `${temporaryWorkers.length} worker(s) temporario(s) encontrado(s)`}
						</Typography>
						<Stack direction="row" spacing={1}>
							{selectedIds.length > 0 && (
								<Button
									variant="contained"
									color="error"
									size="small"
									startIcon={deletingAll ? <CircularProgress size={16} /> : <Trash size={16} />}
									onClick={handleDeleteSelected}
									disabled={deletingAll}
								>
									Eliminar seleccionados ({selectedIds.length})
								</Button>
							)}
							<Button
								variant="outlined"
								size="small"
								startIcon={<Refresh size={16} />}
								onClick={fetchTemporaryWorkers}
								disabled={loading}
							>
								Actualizar
							</Button>
						</Stack>
					</Box>

					{loading ? (
						<Box display="flex" justifyContent="center" p={4}>
							<CircularProgress />
						</Box>
					) : temporaryWorkers.length === 0 ? (
						<Box display="flex" justifyContent="center" alignItems="center" p={4}>
							<Typography variant="body1" color="text.secondary">
								No hay workers temporarios
							</Typography>
						</Box>
					) : (
						<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
							<Table stickyHeader size="small">
								<TableHead>
									<TableRow>
										<TableCell padding="checkbox">
											<Checkbox
												indeterminate={selectedIds.length > 0 && selectedIds.length < temporaryWorkers.length}
												checked={temporaryWorkers.length > 0 && selectedIds.length === temporaryWorkers.length}
												onChange={(e) => handleSelectAll(e.target.checked)}
											/>
										</TableCell>
										<TableCell>Worker ID</TableCell>
										<TableCell>Fuero</TableCell>
										<TableCell align="center">Año</TableCell>
										<TableCell align="center">Rango</TableCell>
										<TableCell align="center">Progreso</TableCell>
										<TableCell align="center">Estado</TableCell>
										<TableCell align="center">Creado</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{temporaryWorkers.map((config) => {
										const configId = getConfigId(config);
										const progress =
											config.range_start && config.range_end && config.number
												? Math.min(100, ((config.number - config.range_start) / (config.range_end - config.range_start)) * 100)
												: 0;

										return (
											<TableRow key={configId} hover>
												<TableCell padding="checkbox">
													<Checkbox
														checked={selectedIds.includes(configId)}
														onChange={(e) => handleSelectOne(configId, e.target.checked)}
													/>
												</TableCell>
												<TableCell>
													<Stack spacing={0.5}>
														<Typography variant="body2" fontWeight={500}>
															{config.worker_id || "Sin nombre"}
														</Typography>
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}
														>
															{configId}
														</Typography>
													</Stack>
												</TableCell>
												<TableCell>
													<Chip label={config.fuero || "N/A"} size="small" color="primary" variant="outlined" />
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2">{config.year}</Typography>
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2">
														{config.range_start?.toLocaleString()} - {config.range_end?.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Box sx={{ width: 80 }}>
														<LinearProgress
															variant="determinate"
															value={progress}
															color={progress >= 100 ? "success" : "primary"}
															sx={{ height: 6, borderRadius: 3 }}
														/>
														<Typography variant="caption" color="text.secondary">
															{progress.toFixed(1)}%
														</Typography>
													</Box>
												</TableCell>
												<TableCell align="center">
													<Chip
														label={config.enabled ? "Activo" : "Inactivo"}
														size="small"
														color={config.enabled ? "success" : "default"}
														variant="outlined"
													/>
												</TableCell>
												<TableCell align="center">
													<Tooltip title={formatDate(config.createdAt)}>
														<Typography variant="caption">{formatDate(config.createdAt)}</Typography>
													</Tooltip>
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Eliminar">
														<IconButton
															size="small"
															color="error"
															onClick={() => handleDelete(config)}
															disabled={deleting === configId || deletingAll}
														>
															{deleting === configId ? <CircularProgress size={16} /> : <Trash size={16} />}
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={handleClose} disabled={!!deleting || deletingAll}>
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default TemporaryWorkersModal;
