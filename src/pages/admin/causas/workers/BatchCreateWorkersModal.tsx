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
	FormControlLabel,
	Switch,
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
	IconButton,
	Tooltip,
} from "@mui/material";
import { Refresh2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { ScrapingWorkerManagerService } from "api/workers";

interface BatchCreateWorkersModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

interface RangeRow {
	start: number;
	end: number;
}

const FUERO_OPTIONS = [
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const BatchCreateWorkersModal: React.FC<BatchCreateWorkersModalProps> = ({ open, onClose, onSuccess }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);

	const [fuero, setFuero] = useState<string>("");
	const [year, setYear] = useState<number>(CURRENT_YEAR);
	const [workerCount, setWorkerCount] = useState<number>(3);
	const [totalRangeStart, setTotalRangeStart] = useState<number>(1);
	const [totalRangeEnd, setTotalRangeEnd] = useState<number>(30000);
	const [delayIncrement, setDelayIncrement] = useState<number>(30);
	const [enabled, setEnabled] = useState<boolean>(true);
	const [ranges, setRanges] = useState<RangeRow[]>([]);

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Auto-calculate ranges when inputs change
	useEffect(() => {
		if (workerCount > 0 && totalRangeStart < totalRangeEnd) {
			const totalRange = totalRangeEnd - totalRangeStart;
			const rangePerWorker = Math.ceil(totalRange / workerCount);
			const newRanges: RangeRow[] = [];

			for (let i = 0; i < workerCount; i++) {
				const start = totalRangeStart + i * rangePerWorker;
				const end = Math.min(totalRangeStart + (i + 1) * rangePerWorker, totalRangeEnd);
				if (start < totalRangeEnd) {
					newRanges.push({ start, end });
				}
			}
			setRanges(newRanges);
		}
	}, [workerCount, totalRangeStart, totalRangeEnd]);

	const handleClose = () => {
		if (!loading) {
			setFuero("");
			setYear(CURRENT_YEAR);
			setWorkerCount(3);
			setTotalRangeStart(1);
			setTotalRangeEnd(30000);
			setDelayIncrement(30);
			setEnabled(true);
			setRanges([]);
			setErrors({});
			onClose();
		}
	};

	const handleRangeChange = (index: number, field: "start" | "end", value: number) => {
		const newRanges = [...ranges];
		newRanges[index] = { ...newRanges[index], [field]: value };
		setRanges(newRanges);
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!fuero) newErrors.fuero = "El fuero es obligatorio";
		if (!year) newErrors.year = "El año es obligatorio";
		if (workerCount < 1 || workerCount > 20) newErrors.workerCount = "Entre 1 y 20 workers";
		if (ranges.length === 0) newErrors.ranges = "Debe haber al menos un rango";

		for (let i = 0; i < ranges.length; i++) {
			if (ranges[i].start >= ranges[i].end) {
				newErrors.ranges = `Rango ${i + 1}: inicio debe ser menor que fin`;
				break;
			}
		}
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;
		setLoading(true);

		try {
			const response = await ScrapingWorkerManagerService.batchCreate({
				fuero,
				workers: ranges.length,
				year,
				max_number: totalRangeEnd,
				ranges: ranges.map((r) => ({ start: r.start, end: r.end })),
				enabled,
				delay_increment: delayIncrement,
			});

			if (response.success) {
				enqueueSnackbar(`${response.data.created} workers creados exitosamente`, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				if (response.data.errors > 0) {
					enqueueSnackbar(`${response.data.errors} workers fallaron al crearse`, {
						variant: "warning",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});
				}
				handleClose();
				onSuccess();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || error.message || "Error al crear workers", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Typography variant="h4">Crear Workers en Lote</Typography>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2.5} sx={{ mt: 2 }}>
					<Alert severity="info" variant="outlined">
						<Typography variant="body2">
							Crea múltiples workers a la vez con distribución automática de rangos. Los rangos se calculan automáticamente
							pero pueden editarse manualmente.
						</Typography>
					</Alert>

					<Stack direction="row" spacing={2}>
						<FormControl fullWidth error={!!errors.fuero} required>
							<InputLabel>Fuero *</InputLabel>
							<Select value={fuero} onChange={(e) => setFuero(e.target.value)} label="Fuero *">
								{FUERO_OPTIONS.map((option) => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl fullWidth required>
							<InputLabel>Año *</InputLabel>
							<Select value={year} onChange={(e) => setYear(Number(e.target.value))} label="Año *">
								{YEAR_OPTIONS.map((y) => (
									<MenuItem key={y} value={y}>
										{y}
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<TextField
							fullWidth
							type="number"
							label="Cantidad de Workers *"
							value={workerCount}
							onChange={(e) => setWorkerCount(Math.max(1, Math.min(20, Number(e.target.value))))}
							error={!!errors.workerCount}
							helperText={errors.workerCount}
							inputProps={{ min: 1, max: 20 }}
						/>
					</Stack>

					<Box>
						<Stack direction="row" spacing={2} alignItems="center">
							<Typography variant="subtitle2">Rango Total</Typography>
							<Tooltip title="Recalcular distribución">
								<IconButton
									size="small"
									onClick={() => {
										setWorkerCount(workerCount); // triggers useEffect
									}}
								>
									<Refresh2 size={16} />
								</IconButton>
							</Tooltip>
						</Stack>
						<Stack direction="row" spacing={2} sx={{ mt: 1 }}>
							<TextField
								fullWidth
								type="number"
								label="Desde"
								value={totalRangeStart}
								onChange={(e) => setTotalRangeStart(Number(e.target.value))}
								inputProps={{ min: 1 }}
							/>
							<TextField
								fullWidth
								type="number"
								label="Hasta"
								value={totalRangeEnd}
								onChange={(e) => setTotalRangeEnd(Number(e.target.value))}
								inputProps={{ min: 1 }}
							/>
						</Stack>
					</Box>

					<TextField
						fullWidth
						type="number"
						label="Delay Incremental (segundos)"
						value={delayIncrement}
						onChange={(e) => setDelayIncrement(Number(e.target.value))}
						helperText="Cada worker tendrá N*incremento segundos de delay (0, 30, 60...)"
						inputProps={{ min: 0 }}
					/>

					{/* Ranges Table */}
					{ranges.length > 0 && (
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Distribución de Rangos ({ranges.length} workers)
							</Typography>
							{errors.ranges && (
								<Alert severity="error" sx={{ mb: 1 }}>
									{errors.ranges}
								</Alert>
							)}
							<TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell>Inicio</TableCell>
											<TableCell>Fin</TableCell>
											<TableCell>Registros</TableCell>
											<TableCell>Delay</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{ranges.map((range, index) => (
											<TableRow key={index}>
												<TableCell>{index + 1}</TableCell>
												<TableCell>
													<TextField
														type="number"
														size="small"
														value={range.start}
														onChange={(e) => handleRangeChange(index, "start", Number(e.target.value))}
														sx={{ width: 120 }}
													/>
												</TableCell>
												<TableCell>
													<TextField
														type="number"
														size="small"
														value={range.end}
														onChange={(e) => handleRangeChange(index, "end", Number(e.target.value))}
														sx={{ width: 120 }}
													/>
												</TableCell>
												<TableCell>{(range.end - range.start).toLocaleString()}</TableCell>
												<TableCell>{index * delayIncrement}s</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						</Box>
					)}

					<FormControlLabel
						control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="primary" />}
						label={
							<Box>
								<Typography variant="body2">Iniciar inmediatamente</Typography>
								<Typography variant="caption" color="text.secondary">
									Si está activo, el manager iniciará todos los workers en el próximo ciclo.
								</Typography>
							</Box>
						}
					/>
				</Stack>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={handleClose} disabled={loading}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={loading} startIcon={loading && <CircularProgress size={16} />}>
					{loading ? "Creando..." : `Crear ${ranges.length} Workers`}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default BatchCreateWorkersModal;
