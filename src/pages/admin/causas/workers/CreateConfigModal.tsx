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
import { WorkersService } from "api/workers";

interface CreateConfigModalProps {
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

const CreateConfigModal: React.FC<CreateConfigModalProps> = ({ open, onClose, onSuccess }) => {
	const { enqueueSnackbar } = useSnackbar();
	const [loading, setLoading] = useState(false);

	// Campos requeridos
	const [fuero, setFuero] = useState<string>("");
	const [year, setYear] = useState<number>(CURRENT_YEAR);
	const [rangeStart, setRangeStart] = useState<number>(1);
	const [rangeEnd, setRangeEnd] = useState<number>(1000);

	// Campos opcionales
	const [nombre, setNombre] = useState<string>("");
	const [enabled, setEnabled] = useState<boolean>(false);
	const [number, setNumber] = useState<number | null>(null);

	// Estado para errores de validación
	const [errors, setErrors] = useState<{
		fuero?: string;
		year?: string;
		rangeStart?: string;
		rangeEnd?: string;
	}>({});

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
		setNombre("");
		setEnabled(false);
		setNumber(null);
		setErrors({});
	};

	const validateForm = (): boolean => {
		const newErrors: typeof errors = {};

		if (!fuero) {
			newErrors.fuero = "El fuero es obligatorio";
		}

		if (!year || year < 2000 || year > CURRENT_YEAR + 1) {
			newErrors.year = "El año debe estar entre 2000 y " + (CURRENT_YEAR + 1);
		}

		if (!rangeStart || rangeStart < 1) {
			newErrors.rangeStart = "El inicio del rango debe ser mayor a 0";
		}

		if (!rangeEnd || rangeEnd < 1) {
			newErrors.rangeEnd = "El fin del rango debe ser mayor a 0";
		}

		if (rangeStart && rangeEnd && rangeStart >= rangeEnd) {
			newErrors.rangeEnd = "El fin del rango debe ser mayor al inicio";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			const payload: any = {
				fuero,
				year,
				range_start: rangeStart,
				range_end: rangeEnd,
			};

			// Agregar campos opcionales solo si tienen valor
			if (nombre.trim()) {
				payload.nombre = nombre.trim();
			}

			payload.enabled = enabled;

			// Si number no está definido, usar range_start como default
			payload.number = number !== null ? number : rangeStart;

			const response = await WorkersService.createScrapingConfig(payload);

			if (response.success) {
				enqueueSnackbar("Configuración de scraping creada exitosamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				handleClose();
				onSuccess();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.message || error.message || "Error al crear la configuración", {
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
				<Typography variant="h4">Crear Nueva Configuración de Scraping</Typography>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2.5} sx={{ mt: 2 }}>
					<Alert severity="info" variant="outlined">
						<Typography variant="body2">
							Completa los campos para crear una nueva configuración de worker de scraping. Los campos marcados con * son obligatorios.
						</Typography>
					</Alert>

					{/* Fuero - Obligatorio */}
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

					{/* Año - Obligatorio */}
					<FormControl fullWidth error={!!errors.year} required>
						<InputLabel>Año *</InputLabel>
						<Select value={year} onChange={(e) => setYear(Number(e.target.value))} label="Año *">
							{YEAR_OPTIONS.map((y) => (
								<MenuItem key={y} value={y}>
									{y}
								</MenuItem>
							))}
						</Select>
						{errors.year && (
							<Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
								{errors.year}
							</Typography>
						)}
					</FormControl>

					{/* Rango - Obligatorio */}
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
								required
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
								required
							/>
						</Stack>
					</Box>

					{/* Nombre - Opcional */}
					<TextField
						fullWidth
						label="Nombre del Worker"
						value={nombre}
						onChange={(e) => setNombre(e.target.value)}
						helperText="Opcional. Se generará automáticamente si no se especifica."
						placeholder="Ej: scraping-civ-2024-1-1000"
					/>

					{/* Número Actual - Opcional */}
					<TextField
						fullWidth
						type="number"
						label="Número Actual"
						value={number !== null ? number : ""}
						onChange={(e) => setNumber(e.target.value ? Number(e.target.value) : null)}
						helperText={`Opcional. Por defecto será ${rangeStart} (inicio del rango).`}
						placeholder={rangeStart.toString()}
						inputProps={{ min: rangeStart, max: rangeEnd }}
					/>

					{/* Estado - Opcional */}
					<FormControlLabel
						control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} color="primary" />}
						label={
							<Box>
								<Typography variant="body2">Worker Activo</Typography>
								<Typography variant="caption" color="text.secondary">
									Por defecto: desactivado. Actívalo solo si deseas que comience a procesar inmediatamente.
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

export default CreateConfigModal;
