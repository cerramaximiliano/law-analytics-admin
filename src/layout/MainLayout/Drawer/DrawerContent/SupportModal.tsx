import React from "react";
import { useState, SyntheticEvent, ChangeEvent } from "react";
import axios from "axios";

import {
	Button,
	Dialog,
	DialogContent,
	DialogTitle,
	DialogActions,
	FormControl,
	InputLabel,
	MenuItem,
	OutlinedInput,
	Select,
	Stack,
	TextField,
	Typography,
	useTheme,
	useMediaQuery,
	SelectChangeEvent,
	Divider,
	Box,
	Alert,
	CircularProgress,
} from "@mui/material";

// icons
import { MessageQuestion, TickCircle } from "iconsax-react";

// project imports
import { PopupTransition } from "components/@extended/Transitions";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";

// Tipos para el formulario de soporte
export interface SupportFormData {
	name: string;
	email: string;
	subject: string;
	priority: string;
	message: string;
}

interface SupportModalProps {
	open: boolean;
	onClose: () => void;
}

// Lista de asuntos predefinidos
const subjectOptions = [
	"Consulta general",
	"Problema técnico",
	"Facturación",
	"Actualización de datos",
	"Recuperación de cuenta",
	"Error en proceso de pago",
	"Otro",
];

// Lista de prioridades
const priorityOptions = [
	{ value: "low", label: "Baja" },
	{ value: "medium", label: "Media" },
	{ value: "high", label: "Alta" },
	{ value: "urgent", label: "Urgente" },
];

const SupportModal = ({ open, onClose }: SupportModalProps) => {
	const theme = useTheme();
	const fullScreen = useMediaQuery(theme.breakpoints.down("md"));

	// Estado para los datos del formulario
	const [formData, setFormData] = useState<SupportFormData>({
		name: "",
		email: "",
		subject: "",
		priority: "medium",
		message: "",
	});

	// Estado para los errores de validación
	const [errors, setErrors] = useState({
		name: false,
		email: false,
		subject: false,
		message: false,
	});

	// Estado para envío
	const [submitting, setSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);

	// Resetear el formulario cuando se abre
	const resetForm = () => {
		setFormData({
			name: "",
			email: "",
			subject: "",
			priority: "medium",
			message: "",
		});
		setErrors({
			name: false,
			email: false,
			subject: false,
			message: false,
		});
		setSubmitted(false);
		setSubmitting(false);
	};

	// Manejar cambios en campos de texto
	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[event.target.name]: event.target.value,
		});

		// Limpiar error cuando el usuario empieza a escribir
		if (errors[event.target.name as keyof typeof errors]) {
			setErrors({
				...errors,
				[event.target.name]: false,
			});
		}
	};

	// Manejar cambios en campo select de prioridad
	const handlePriorityChange = (event: SelectChangeEvent<string>) => {
		setFormData({
			...formData,
			priority: event.target.value,
		});
	};

	// Validar el formulario
	const validateForm = (): boolean => {
		const newErrors = {
			name: !formData.name.trim(),
			email: !formData.email.trim() || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email),
			subject: !formData.subject.trim(),
			message: !formData.message.trim(),
		};

		setErrors(newErrors);

		return !Object.values(newErrors).some((error) => error);
	};

	// Manejar envío del formulario
	const handleSubmit = async (event: SyntheticEvent) => {
		event.preventDefault();

		if (validateForm()) {
			setSubmitting(true);
			try {
				const response = await axios.post(`${import.meta.env.VITE_AUTH_URL}/api/support-contacts`, formData, {
					headers: {
						"Content-Type": "application/json",
					},
					withCredentials: true,
				});

				// Si la solicitud es exitosa
				if (response.data.success) {
					// Mostrar mensaje de éxito
					dispatch(
						openSnackbar({
							open: true,
							message: "Tu consulta ha sido enviada correctamente. Te responderemos pronto.",
							variant: "alert",
							alert: {
								color: "success",
							},
							close: false,
						}),
					);

					setSubmitted(true);

					// Cerrar el modal después de 2 segundos
					setTimeout(() => {
						onClose();
						resetForm();
					}, 2000);
				}
			} catch (error) {
				// Manejar diferentes tipos de errores
				let errorMessage = "Error al enviar la consulta. Por favor, intenta más tarde.";

				if (axios.isAxiosError(error)) {
					if (error.response) {
						errorMessage = error.response.data.error || errorMessage;
					} else if (error.request) {
						errorMessage = "No se pudo conectar con el servidor. Verifica tu conexión.";
					}
				}

				// Mostrar mensaje de error
				dispatch(
					openSnackbar({
						open: true,
						message: errorMessage,
						variant: "alert",
						alert: {
							color: "error",
						},
						close: false,
					}),
				);
			} finally {
				setSubmitting(false);
			}
		}
	};

	// Manejar cierre del modal
	const handleClose = () => {
		if (!submitting) {
			onClose();
			// Resetear el formulario después de cerrar
			setTimeout(resetForm, 300);
		}
	};

	return (
		<Dialog
			open={open}
			onClose={handleClose}
			TransitionComponent={PopupTransition}
			keepMounted
			maxWidth="sm"
			fullWidth
			aria-labelledby="support-modal-title"
			PaperProps={{
				elevation: 5,
				sx: {
					borderRadius: 2,
					overflow: "hidden",
				},
			}}
		>
			<DialogTitle
				id="support-modal-title"
				sx={{
					bgcolor: theme.palette.primary.lighter,
					p: 3,
					borderBottom: `1px solid ${theme.palette.divider}`,
				}}
			>
				<Stack spacing={1}>
					<Stack direction="row" alignItems="center" spacing={1}>
						<MessageQuestion size={24} color={theme.palette.primary.main} variant="Bold" />
						<Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
							Contactar a Soporte
						</Typography>
					</Stack>
					<Typography variant="body2" color="textSecondary">
						Completa el formulario y te responderemos dentro de las próximas 24 horas
					</Typography>
				</Stack>
			</DialogTitle>
			<Divider />

			<DialogContent sx={{ p: 3 }}>
				{submitted ? (
					<Box sx={{ py: 4, textAlign: "center" }}>
						<TickCircle size={64} color={theme.palette.success.main} variant="Bulk" />
						<Typography variant="h4" color="success.main" sx={{ mt: 2, mb: 1 }}>
							¡Consulta enviada exitosamente!
						</Typography>
						<Typography color="text.secondary">Hemos recibido tu mensaje y te responderemos pronto.</Typography>
					</Box>
				) : (
					<Box component="form" onSubmit={handleSubmit}>
						<Stack spacing={2.5}>
							{/* Alert informativo */}
							<Alert severity="info" sx={{ mb: 1 }}>
								Si tu consulta es sobre un error de pago, incluye todos los detalles posibles para ayudarte mejor.
							</Alert>

							{/* Nombre */}
							<TextField
								fullWidth
								label="Nombre completo"
								name="name"
								value={formData.name}
								onChange={handleChange}
								error={errors.name}
								helperText={errors.name ? "El nombre es requerido" : ""}
								disabled={submitting}
								required
							/>

							{/* Email */}
							<TextField
								fullWidth
								label="Correo electrónico"
								name="email"
								type="email"
								value={formData.email}
								onChange={handleChange}
								error={errors.email}
								helperText={errors.email ? "Ingresa un correo válido" : ""}
								disabled={submitting}
								required
							/>

							{/* Asunto */}
							<TextField
								fullWidth
								label="Tipo de consulta"
								name="subject"
								select
								value={formData.subject}
								onChange={handleChange}
								error={errors.subject}
								helperText={errors.subject ? "Selecciona un tipo de consulta" : ""}
								disabled={submitting}
								required
							>
								{subjectOptions.map((option) => (
									<MenuItem key={option} value={option}>
										{option}
									</MenuItem>
								))}
							</TextField>

							{/* Prioridad */}
							<FormControl fullWidth>
								<InputLabel id="priority-label">Prioridad</InputLabel>
								<Select
									labelId="priority-label"
									value={formData.priority}
									onChange={handlePriorityChange}
									input={<OutlinedInput label="Prioridad" />}
									disabled={submitting}
								>
									{priorityOptions.map((option) => (
										<MenuItem key={option.value} value={option.value}>
											{option.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>

							{/* Mensaje */}
							<TextField
								fullWidth
								label="Describe tu consulta"
								name="message"
								multiline
								rows={5}
								value={formData.message}
								onChange={handleChange}
								error={errors.message}
								helperText={errors.message ? "El mensaje es requerido" : "Proporciona todos los detalles posibles"}
								disabled={submitting}
								required
								placeholder="Describe detalladamente tu consulta o problema..."
							/>
						</Stack>
					</Box>
				)}
			</DialogContent>

			{!submitted && (
				<>
					<Divider />
					<DialogActions sx={{ px: 3, py: 2 }}>
						<Button onClick={handleClose} color="error" disabled={submitting}>
							Cancelar
						</Button>
						<Button
							variant="contained"
							onClick={handleSubmit}
							disabled={submitting}
							startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
						>
							{submitting ? "Enviando..." : "Enviar consulta"}
						</Button>
					</DialogActions>
				</>
			)}
		</Dialog>
	);
};

export default SupportModal;
