import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
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
	Chip,
	Divider,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { WorkersService, ManagedWorker } from "api/workers";

const getId = (id: string | { $oid: string }): string => (typeof id === "string" ? id : id.$oid);

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i);

interface UpdateRangeModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
	worker: ManagedWorker | null;
}

const UpdateRangeModal: React.FC<UpdateRangeModalProps> = ({ open, onClose, onSuccess, worker }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);

	const [rangeStart, setRangeStart] = useState<number>(1);
	const [rangeEnd, setRangeEnd] = useState<number>(50000);
	const [year, setYear] = useState<number>(CURRENT_YEAR);
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (open && worker) {
			// Pre-fill with current values
			setRangeStart(worker.range_start || 1);
			setRangeEnd(worker.range_end || 50000);
			setYear(worker.year || CURRENT_YEAR);
			setErrors({});
		}
	}, [open, worker]);

	const isCompleted = worker
		? !worker.enabled && (worker.number || 0) >= (worker.range_end || 0)
		: false;

	const getProgress = (): number => {
		if (!worker?.range_start || !worker?.range_end || worker.range_end <= worker.range_start) return 0;
		const totalRange = worker.range_end - worker.range_start;
		const current = (worker.number || worker.range_start) - worker.range_start;
		return Math.min(100, Math.round((current / totalRange) * 100));
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!rangeStart || rangeStart < 1) newErrors.rangeStart = "Debe ser mayor a 0";
		if (!rangeEnd || rangeEnd < 1) newErrors.rangeEnd = "Debe ser mayor a 0";
		if (rangeStart >= rangeEnd) newErrors.rangeEnd = "Debe ser mayor al inicio";

		// Check if same as current
		if (worker && rangeStart === worker.range_start && rangeEnd === worker.range_end && year === worker.year) {
			newErrors.rangeStart = "El rango y año son iguales a los actuales";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!worker || !validateForm()) return;
		setLoading(true);

		try {
			const wId = getId(worker._id);
			const response = await WorkersService.updateScrapingRange(wId, {
				range_start: rangeStart,
				range_end: rangeEnd,
				year,
			});

			if (response.success) {
				enqueueSnackbar("Rango actualizado. El worker se reiniciará en el próximo ciclo.", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				onClose();
				onSuccess();
			}
		} catch (error: any) {
			const msg = error.response?.data?.message || error.message || "Error al actualizar el rango";
			enqueueSnackbar(msg, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	if (!worker) return null;

	const history = worker.rangeHistory || [];
	const sortedHistory = [...history].sort((a, b) => (b.version || 0) - (a.version || 0));

	return (
		<Dialog open={open} onClose={() => !loading && onClose()} maxWidth="md" fullWidth>
			<DialogTitle>
				<Typography variant="h4">Actualizar Rango - {worker.worker_id}</Typography>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2.5} sx={{ mt: 1 }}>
					{/* Current status */}
					<Alert severity={isCompleted ? "success" : "warning"} variant="outlined">
						<Typography variant="body2">
							{isCompleted
								? "Este worker completó su rango. Se guardará el historial y se reiniciará con el nuevo rango."
								: "Este worker no ha completado su rango. El endpoint requiere que el worker esté completado (enabled=false, completionEmailSent=true, number >= range_end)."}
						</Typography>
					</Alert>

					{/* Current state card */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" gutterBottom>
							Estado Actual
						</Typography>
						<Stack direction="row" spacing={3} flexWrap="wrap">
							<Box>
								<Typography variant="caption" color="text.secondary">Rango</Typography>
								<Typography variant="body2" fontWeight={600}>
									{worker.range_start?.toLocaleString()} - {worker.range_end?.toLocaleString()}
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">Número Actual</Typography>
								<Typography variant="body2" fontWeight={600}>
									{worker.number?.toLocaleString()}
								</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">Año</Typography>
								<Typography variant="body2" fontWeight={600}>{worker.year}</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">Progreso</Typography>
								<Typography variant="body2" fontWeight={600}>{getProgress()}%</Typography>
							</Box>
							<Box>
								<Typography variant="caption" color="text.secondary">Estado</Typography>
								<Chip
									label={worker.enabled ? "Activo" : "Detenido"}
									size="small"
									color={worker.enabled ? "success" : "default"}
									sx={{ mt: 0.25 }}
								/>
							</Box>
						</Stack>
					</Paper>

					<Divider />

					{/* New range form */}
					<Typography variant="subtitle2">Nuevo Rango</Typography>
					<Stack direction="row" spacing={2}>
						<TextField
							fullWidth
							type="number"
							label="Inicio *"
							value={rangeStart}
							onChange={(e) => setRangeStart(Number(e.target.value))}
							error={!!errors.rangeStart}
							helperText={errors.rangeStart}
							inputProps={{ min: 1 }}
						/>
						<TextField
							fullWidth
							type="number"
							label="Fin *"
							value={rangeEnd}
							onChange={(e) => setRangeEnd(Number(e.target.value))}
							error={!!errors.rangeEnd}
							helperText={errors.rangeEnd}
							inputProps={{ min: 1 }}
						/>
						<FormControl fullWidth>
							<InputLabel>Año</InputLabel>
							<Select value={year} onChange={(e) => setYear(Number(e.target.value))} label="Año">
								{YEAR_OPTIONS.map((y) => (
									<MenuItem key={y} value={y}>{y}</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>

					{rangeStart > 0 && rangeEnd > rangeStart && (
						<Typography variant="caption" color="text.secondary">
							Total expedientes en nuevo rango: {(rangeEnd - rangeStart).toLocaleString()}
						</Typography>
					)}

					{/* Range History */}
					{sortedHistory.length > 0 && (
						<>
							<Divider />
							<Typography variant="subtitle2">
								Historial de Rangos ({sortedHistory.length})
							</Typography>
							<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell>Rango</TableCell>
											<TableCell>Año</TableCell>
											<TableCell>Procesados</TableCell>
											<TableCell>Encontrados</TableCell>
											<TableCell>Completado</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{sortedHistory.map((entry, idx) => (
											<TableRow key={idx}>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">
														v{entry.version}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">
														{entry.range_start?.toLocaleString()} - {entry.range_end?.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">{entry.year}</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">
														{entry.documentsProcessed?.toLocaleString() || "-"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">
														{entry.documentsFound?.toLocaleString() || "-"}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" fontSize="0.75rem">
														{entry.completedAt
															? new Date(typeof entry.completedAt === "string" ? entry.completedAt : (entry.completedAt as any).$date).toLocaleDateString()
															: "-"}
													</Typography>
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
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={() => !loading && onClose()} disabled={loading}>
					Cancelar
				</Button>
				<Button
					variant="contained"
					onClick={handleSubmit}
					disabled={loading || !isCompleted}
					startIcon={loading && <CircularProgress size={16} />}
				>
					{loading ? "Actualizando..." : "Actualizar Rango e Iniciar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default UpdateRangeModal;
