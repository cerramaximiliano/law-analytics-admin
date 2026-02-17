import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Stack,
	Alert,
	CircularProgress,
	Typography,
	Box,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Checkbox,
	Chip,
	LinearProgress,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { WorkersService, WorkerConfig, ScrapingWorkerManagerService } from "api/workers";

const getId = (id: string | { $oid: string }): string => (typeof id === "string" ? id : id.$oid);

interface LinkExistingConfigModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const LinkExistingConfigModal: React.FC<LinkExistingConfigModalProps> = ({ open, onClose, onSuccess }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);
	const [linking, setLinking] = useState(false);
	const [configs, setConfigs] = useState<WorkerConfig[]>([]);
	const [selected, setSelected] = useState<string[]>([]);

	useEffect(() => {
		if (open) {
			fetchConfigs();
		} else {
			setConfigs([]);
			setSelected([]);
		}
	}, [open]);

	const fetchConfigs = async () => {
		setLoading(true);
		try {
			const response = await WorkersService.getScrapingConfigs({
				enabled: false,
				limit: 200,
				page: 1,
			});
			// Filter out temporary and retry workers
			const data = Array.isArray(response.data) ? response.data : [response.data];
			const available = data.filter(
				(c: WorkerConfig) => !c.isRetryWorker && !c.isTemporary
			);
			setConfigs(available);
		} catch (error: any) {
			enqueueSnackbar("Error al cargar configuraciones", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	const handleToggle = (id: string) => {
		setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
	};

	const handleToggleAll = () => {
		if (selected.length === configs.length) {
			setSelected([]);
		} else {
			setSelected(configs.map((c) => getId(c._id)));
		}
	};

	const getProgress = (config: WorkerConfig): number => {
		if (!config.range_start || !config.range_end || config.range_end <= config.range_start) return 0;
		const total = config.range_end - config.range_start;
		const current = (config.number || config.range_start) - config.range_start;
		return Math.min(100, Math.round((current / total) * 100));
	};

	const handleLink = async () => {
		if (selected.length === 0) return;
		setLinking(true);

		let successCount = 0;
		let errorCount = 0;

		for (const id of selected) {
			try {
				await ScrapingWorkerManagerService.startFromExisting(id);
				successCount++;
			} catch {
				errorCount++;
			}
		}

		if (successCount > 0) {
			enqueueSnackbar(`${successCount} worker(s) vinculado(s) exitosamente`, {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
		if (errorCount > 0) {
			enqueueSnackbar(`${errorCount} worker(s) fallaron al vincularse`, {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}

		setLinking(false);
		onClose();
		onSuccess();
	};

	return (
		<Dialog open={open} onClose={() => !linking && onClose()} maxWidth="md" fullWidth>
			<DialogTitle>
				<Typography variant="h4">Vincular Configuraciones Existentes</Typography>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<Alert severity="info" variant="outlined">
						<Typography variant="body2">
							Selecciona configuraciones deshabilitadas para vincularlas como workers administrados. El manager las
							habilitará e iniciará el proceso PM2 correspondiente.
						</Typography>
					</Alert>

					{loading ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : configs.length === 0 ? (
						<Alert severity="warning">No hay configuraciones deshabilitadas disponibles para vincular.</Alert>
					) : (
						<>
							<Typography variant="body2" color="text.secondary">
								{configs.length} configuración(es) disponible(s) - {selected.length} seleccionada(s)
							</Typography>
							<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell padding="checkbox">
												<Checkbox
													indeterminate={selected.length > 0 && selected.length < configs.length}
													checked={selected.length === configs.length && configs.length > 0}
													onChange={handleToggleAll}
												/>
											</TableCell>
											<TableCell>Worker ID</TableCell>
											<TableCell>Fuero</TableCell>
											<TableCell>Año</TableCell>
											<TableCell>Rango</TableCell>
											<TableCell>Progreso</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{configs.map((config) => {
											const progress = getProgress(config);
											return (
												<TableRow
													key={getId(config._id)}
													hover
													onClick={() => handleToggle(getId(config._id))}
													sx={{ cursor: "pointer" }}
												>
													<TableCell padding="checkbox">
														<Checkbox checked={selected.includes(getId(config._id))} />
													</TableCell>
													<TableCell>
														<Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
															{config.worker_id}
														</Typography>
													</TableCell>
													<TableCell>
														<Chip label={config.fuero} size="small" />
													</TableCell>
													<TableCell>{config.year}</TableCell>
													<TableCell>
														<Typography variant="body2" fontSize="0.75rem">
															{config.range_start?.toLocaleString()} - {config.range_end?.toLocaleString()}
														</Typography>
													</TableCell>
													<TableCell sx={{ minWidth: 120 }}>
														<Stack spacing={0.5}>
															<LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 1 }} />
															<Typography variant="caption" color="text.secondary">
																{progress}% ({config.number?.toLocaleString()}/{config.range_end?.toLocaleString()})
															</Typography>
														</Stack>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</TableContainer>
						</>
					)}
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={() => !linking && onClose()} disabled={linking}>
					Cancelar
				</Button>
				<Button
					variant="contained"
					onClick={handleLink}
					disabled={linking || selected.length === 0}
					startIcon={linking && <CircularProgress size={16} />}
				>
					{linking ? "Vinculando..." : `Vincular ${selected.length} Worker(s)`}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default LinkExistingConfigModal;
