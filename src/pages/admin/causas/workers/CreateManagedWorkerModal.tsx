import React, { useState } from "react";
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
} from "@mui/material";
import { useSnackbar } from "notistack";
import { ScrapingWorkerManagerService } from "api/workers";

interface CreateManagedWorkerModalProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

const FUERO_OPTIONS = [
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

const CreateManagedWorkerModal: React.FC<CreateManagedWorkerModalProps> = ({ open, onClose, onSuccess }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);

	const [fuero, setFuero] = useState<string>("");
	const [year, setYear] = useState<number>(CURRENT_YEAR);
	const [rangeStart, setRangeStart] = useState<number>(1);
	const [rangeEnd, setRangeEnd] = useState<number>(1000);
	const [workerId, setWorkerId] = useState<string>("");
	const [enabled, setEnabled] = useState<boolean>(true);
	const [delaySeconds, setDelaySeconds] = useState<number>(0);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleClose = () => {
		if (!loading) {
			resetForm();
			onClose();
		}
	};

	const resetForm = () => {
		setFuero("");
		setYear(CURRENT_YEAR);
		setRangeStart(1);
		setRangeEnd(1000);
		setWorkerId("");
		setEnabled(true);
		setDelaySeconds(0);
		setErrors({});
	};

	const validateForm = (): boolean => {
		const newErrors: Record<string, string> = {};
		if (!fuero) newErrors.fuero = "El fuero es obligatorio";
		if (!year || year < 2000) newErrors.year = "Ingrese un año válido";
		if (!rangeStart || rangeStart < 1) newErrors.rangeStart = "Debe ser mayor a 0";
		if (!rangeEnd || rangeEnd < 1) newErrors.rangeEnd = "Debe ser mayor a 0";
		if (rangeStart >= rangeEnd) newErrors.rangeEnd = "Debe ser mayor al inicio";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) return;
		setLoading(true);

		try {
			const payload: Parameters<typeof ScrapingWorkerManagerService.createWorker>[0] = {
				fuero,
				year,
				max_number: rangeEnd,
				range_start: rangeStart,
				range_end: rangeEnd,
				enabled,
			};

			if (workerId.trim()) payload.worker_id = workerId.trim();
			if (delaySeconds > 0) payload.delay_seconds = delaySeconds;

			const response = await ScrapingWorkerManagerService.createWorker(payload);

			if (response.success) {
				enqueueSnackbar(response.message || "Worker creado exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				handleClose();
				onSuccess();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || error.message || "Error al crear el worker", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Typography variant="h4">Crear Worker Administrado</Typography>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2.5} sx={{ mt: 2 }}>
					<Alert severity="info" variant="outlined">
						<Typography variant="body2">
							Este worker será gestionado por el Scraping Manager. Se iniciará automáticamente en el próximo ciclo de
							reconciliación (~30s).
						</Typography>
					</Alert>

					<FormControl fullWidth error={!!errors.fuero} required>
						<InputLabel>Fuero *</InputLabel>
						<Select value={fuero} onChange={(e) => setFuero(e.target.value)} label="Fuero *">
							{FUERO_OPTIONS.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
						{errors.fuero && (
							<Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
								{errors.fuero}
							</Typography>
						)}
					</FormControl>

					<FormControl fullWidth error={!!errors.year} required>
						<InputLabel>Año *</InputLabel>
						<Select value={year} onChange={(e) => setYear(Number(e.target.value))} label="Año *">
							{YEAR_OPTIONS.map((y) => (
								<MenuItem key={y} value={y}>
									{y}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<Box>
						<Typography variant="subtitle2" gutterBottom>
							Rango de Expedientes *
						</Typography>
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
						</Stack>
					</Box>

					<TextField
						fullWidth
						label="Worker ID"
						value={workerId}
						onChange={(e) => setWorkerId(e.target.value)}
						helperText="Opcional. Se generará automáticamente (worker_FUERO_N)."
						placeholder="Ej: worker_CIV_1"
					/>

					<TextField
						fullWidth
						type="number"
						label="Delay (segundos)"
						value={delaySeconds}
						onChange={(e) => setDelaySeconds(Number(e.target.value))}
						helperText="Retraso antes de iniciar el cron (para escalonar workers)."
						inputProps={{ min: 0 }}
					/>

					<FormControlLabel
						control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="primary" />}
						label={
							<Box>
								<Typography variant="body2">Iniciar inmediatamente</Typography>
								<Typography variant="caption" color="text.secondary">
									Si está activo, el manager iniciará el proceso PM2 en el próximo ciclo.
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
					{loading ? "Creando..." : "Crear Worker"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CreateManagedWorkerModal;
