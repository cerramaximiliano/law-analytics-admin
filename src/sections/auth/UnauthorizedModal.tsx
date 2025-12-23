import React from "react";
import { useState, useRef, FC, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	Button,
	Alert,
	AlertTitle,
	Box,
	Typography,
	Grid,
	Stack,
	InputLabel,
	OutlinedInput,
	FormHelperText,
	InputAdornment,
	Divider,
	CircularProgress,
} from "@mui/material";
import { Eye, EyeSlash } from "iconsax-react";
import * as Yup from "yup";
import { Formik, FormikHelpers } from "formik";
import IconButton from "components/@extended/IconButton";
import { useGoogleLogin, CredentialResponse } from "@react-oauth/google";
import CustomGoogleButton from "components/auth/CustomGoogleButton";
import { UnauthorizedModalProps, FormValues } from "types/auth";
import { useDispatch } from "react-redux";
import { openSnackbar } from "store/reducers/snackbar";
import { AppDispatch } from "store";
import { requestQueueService } from "services/requestQueueService";

const validationSchema = Yup.object().shape({
	email: Yup.string().email("Debe ser un e-mail válido").required("El e-mail es requerido").trim(),
	password: Yup.string().required("El password es requerido").min(6, "El password debe tener al menos 6 caracteres"),
});

const initialValues: FormValues = {
	email: "",
	password: "",
	submit: null,
};

export const UnauthorizedModal: FC<UnauthorizedModalProps> = ({ open, onClose, onLogin, onGoogleLogin, onLogout }) => {
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [internalOpen, setInternalOpen] = useState(false);
	const [queuedRequests, setQueuedRequests] = useState(0);
	const submitAttempts = useRef(0);
	const maxRetries = 3;
	const reduxDispatch = useDispatch<AppDispatch>();

	// Controlar cuando se muestra el modal para prevenir interacciones no deseadas
	useEffect(() => {
		// Usamos un pequeño retraso para evitar conflictos con otros modales
		const timer = setTimeout(() => {
			setInternalOpen(open);
			// Reiniciar el contador de intentos cuando se abre el modal
			if (open) {
				submitAttempts.current = 0;
				// Actualizar el número de peticiones en cola
				setQueuedRequests(requestQueueService.getQueueLength());
			}
		}, 100);

		return () => clearTimeout(timer);
	}, [open]);

	// Monitorear cambios en la cola de peticiones
	useEffect(() => {
		const unsubscribe = requestQueueService.subscribe(() => {
			setQueuedRequests(requestQueueService.getQueueLength());
		});

		return unsubscribe;
	}, []);

	// Función para mostrar snackbar
	const showSnackbar = (message: string, color: "success" | "error" | "info") => {
		reduxDispatch(
			openSnackbar({
				open: true,
				message,
				variant: "alert",
				alert: { color },
				close: false,
			}),
		);
	};

	const handleFormSubmit = async (values: FormValues, { setStatus }: FormikHelpers<FormValues>) => {
		if (isSubmitting) return;

		try {
			setIsSubmitting(true);

			// Validar el formulario
			await validationSchema.validate(values, { abortEarly: false });

			// Manejo defensivo para evitar errores de eventos perdidos
			try {
				await onLogin(values.email.trim(), values.password);

				setStatus({ success: true });
				// Primero cerramos nuestro estado interno
				setInternalOpen(false);
				// Luego informamos al padre
				setTimeout(() => onClose(), 50);
			} catch (loginErr) {
				throw loginErr;
			}
		} catch (err: unknown) {
			// Incrementar contador de intentos solo cuando hay un error de login
			submitAttempts.current += 1;

			setStatus({ success: false });

			// Manejar errores con tipado seguro y traducirlos a mensajes amigables en español
			let errorMessage = "Error al iniciar sesión";

			if (err instanceof Error) {
				// Traducir mensajes de error técnicos a español amigable
				const errorMsg = err.message;
				if (errorMsg.includes("Invalid credentials") || errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
					errorMessage = "Credenciales inválidas. Por favor verifica tu email y contraseña";
				} else if (errorMsg.includes("Network Error") || errorMsg.includes("timeout")) {
					errorMessage = "Error de conexión. Por favor verifica tu internet y vuelve a intentarlo";
				} else if (errorMsg.includes("404")) {
					errorMessage = "El servicio no está disponible en este momento";
				} else if (errorMsg.includes("500")) {
					errorMessage = "Error en el servidor. Por favor intenta más tarde";
				} else if (errorMsg.includes("Request failed with status code")) {
					errorMessage = "Error de comunicación con el servidor. Por favor intenta más tarde";
				} else {
					// Mantener el mensaje original solo si no pudimos traducirlo
					errorMessage = errorMsg;
				}
			} else if (typeof err === "object" && err !== null) {
				const errorObj = err as { response?: { data?: { message?: string; status?: number } } };
				if (errorObj.response?.data?.message) {
					const serverMessage = errorObj.response.data.message;
					// Traducir mensajes comunes del servidor
					if (serverMessage.includes("Invalid credentials") || serverMessage.includes("invalid")) {
						errorMessage = "Credenciales inválidas. Por favor verifica tu email y contraseña";
					} else if (serverMessage.includes("expired")) {
						errorMessage = "Tu sesión ha expirado. Por favor inicia sesión nuevamente";
					} else {
						errorMessage = serverMessage;
					}
				} else if (errorObj.response?.data?.status === 401) {
					errorMessage = "No autorizado. Por favor verifica tus credenciales";
				}
			}

			// Mostrar error mediante snackbar en lugar de dentro del modal
			showSnackbar(`${errorMessage}. Intento ${submitAttempts.current} de ${maxRetries}.`, "error");

			if (submitAttempts.current >= maxRetries) {
				showSnackbar("Demasiados intentos fallidos. Serás redirigido al inicio en unos segundos", "error");
				// Usar el mismo patrón de cierre seguro pero con más tiempo para leer
				setInternalOpen(false);
				setTimeout(onLogout, 3000);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// Método de inicio de sesión con Google - mejorado para evitar errores de eventos
	const handleGoogleSuccess = async (tokenResponse: any) => {
		try {
			setIsSubmitting(true);

			// Crear un objeto de credencial para mantener la compatibilidad con el sistema existente
			const credentialResponse: CredentialResponse = {
				clientId: tokenResponse.clientId || "",
				credential: tokenResponse.access_token,
				select_by: "user",
			};

			// Manejo defensivo del login para evitar errores de eventos
			try {
				await onGoogleLogin(credentialResponse);

				// Primero cerramos nuestro estado interno
				setInternalOpen(false);
				// Luego informamos al padre con un pequeño retraso para evitar conflictos
				setTimeout(() => onClose(), 50);
			} catch (loginError) {
				// Simplemente redirigir el error al catch externo sin incrementar submitAttempts
				throw loginError;
			}
		} catch (error) {
			// Incrementar contador de intentos solo cuando hay un error de login
			submitAttempts.current += 1;

			// Formatear el mensaje de error
			let errorMessage = "Error al iniciar sesión con Google";

			if (error instanceof Error) {
				// Traducir mensajes de error técnicos a español amigable
				const errorMsg = error.message;
				if (errorMsg.includes("Invalid credentials") || errorMsg.includes("Unauthorized") || errorMsg.includes("401")) {
					errorMessage = "Credenciales de Google inválidas. Por favor intenta nuevamente";
				} else if (errorMsg.includes("Network Error") || errorMsg.includes("timeout")) {
					errorMessage = "Error de conexión con Google. Por favor verifica tu internet";
				} else if (errorMsg.includes("404")) {
					errorMessage = "El servicio de autenticación no está disponible en este momento";
				} else if (errorMsg.includes("500")) {
					errorMessage = "Error en el servidor de autenticación. Por favor intenta más tarde";
				} else if (errorMsg.includes("Request failed with status code")) {
					errorMessage = "Error de comunicación con el servidor de autenticación";
				} else if (errorMsg.includes("popup")) {
					errorMessage = "La ventana de Google fue cerrada. Por favor intenta nuevamente";
				} else {
					// Mantener un mensaje genérico si no pudimos traducirlo
					errorMessage = "Error al iniciar sesión con Google. Por favor intenta nuevamente";
				}
			} else if (typeof error === "object" && error !== null) {
				const errorObj = error as { response?: { data?: { message?: string } } };
				if (errorObj.response?.data?.message) {
					const serverMessage = errorObj.response.data.message;
					// Traducir mensajes comunes del servidor
					if (serverMessage.includes("Invalid") || serverMessage.includes("invalid")) {
						errorMessage = "Credenciales de Google inválidas. Por favor intenta nuevamente";
					} else if (serverMessage.includes("expired")) {
						errorMessage = "Tu sesión con Google ha expirado. Por favor inicia sesión nuevamente";
					} else {
						errorMessage = "Error al iniciar sesión con Google. Por favor intenta nuevamente";
					}
				}
			}

			showSnackbar(`${errorMessage}. Intento ${submitAttempts.current} de ${maxRetries}.`, "error");

			// Verificar si ha excedido el máximo de intentos
			if (submitAttempts.current >= maxRetries) {
				showSnackbar("Demasiados intentos fallidos. Serás redirigido al inicio en unos segundos", "error");
				setInternalOpen(false);
				setTimeout(onLogout, 3000);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// Hook para iniciar sesión con Google - Actualizado para evitar incrementos múltiples
	const googleLogin = useGoogleLogin({
		onSuccess: handleGoogleSuccess,
		onError: () => {
			// Incrementar contador de intentos solo si no está en proceso de envío
			// Esto evita duplicados con handleGoogleSuccess
			if (!isSubmitting) {
				submitAttempts.current += 1;

				showSnackbar(`Error al iniciar sesión con Google. Intento ${submitAttempts.current} de ${maxRetries}.`, "error");

				// Verificar si ha excedido el máximo de intentos
				if (submitAttempts.current >= maxRetries) {
					showSnackbar("Demasiados intentos fallidos. Serás redirigido al inicio en unos segundos", "error");
					setInternalOpen(false);
					setTimeout(onLogout, 3000);
				}
			}

			setIsSubmitting(false);
		},
		flow: "implicit",
		scope: "email profile",
	});

	return (
		<Dialog
			open={internalOpen}
			maxWidth="xs"
			fullWidth
			disableEscapeKeyDown={isSubmitting}
			onClose={() => {
				// Manejo seguro al cerrar el modal
				setInternalOpen(false);
				setTimeout(() => onClose(), 50);
			}}
		>
			<DialogTitle>
				<Box display="flex" alignItems="center">
					<Typography variant="h5">Sesión Expirada</Typography>
				</Box>
			</DialogTitle>
			<DialogContent>
				<Alert severity="error" sx={{ mb: 2 }}>
					<AlertTitle>No Autorizado</AlertTitle>
					Tu sesión ha expirado o no tienes autorización para acceder a este recurso. Por favor, inicia sesión nuevamente.
					{queuedRequests > 0 && (
						<Typography variant="body2" sx={{ mt: 1 }}>
							<strong>Nota:</strong> Tienes {queuedRequests} {queuedRequests === 1 ? "petición pendiente" : "peticiones pendientes"} que se
							procesarán automáticamente después de iniciar sesión.
						</Typography>
					)}
				</Alert>

				<Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleFormSubmit}>
					{({ errors, handleBlur, handleChange, handleSubmit, touched, values }) => (
						<form noValidate onSubmit={handleSubmit}>
							<Grid container spacing={3}>
								<Grid item xs={12}>
									<Stack spacing={1}>
										<InputLabel htmlFor="email-login">Email</InputLabel>
										<OutlinedInput
											id="email-login"
											type="email"
											value={values.email}
											name="email"
											onBlur={handleBlur}
											onChange={handleChange}
											placeholder="Ingresa tu email"
											fullWidth
											error={Boolean(touched.email && errors.email)}
											disabled={isSubmitting}
										/>
										{touched.email && errors.email && <FormHelperText error>{errors.email}</FormHelperText>}
									</Stack>
								</Grid>

								<Grid item xs={12}>
									<Stack spacing={1}>
										<InputLabel htmlFor="password-login">Password</InputLabel>
										<OutlinedInput
											fullWidth
											error={Boolean(touched.password && errors.password)}
											id="password-login"
											type={showPassword ? "text" : "password"}
											value={values.password}
											name="password"
											onBlur={handleBlur}
											onChange={handleChange}
											disabled={isSubmitting}
											endAdornment={
												<InputAdornment position="end">
													<IconButton onClick={() => setShowPassword(!showPassword)} edge="end" color="secondary" disabled={isSubmitting}>
														{showPassword ? <Eye /> : <EyeSlash />}
													</IconButton>
												</InputAdornment>
											}
											placeholder="Ingresa tu password"
										/>
										{touched.password && errors.password && <FormHelperText error>{errors.password}</FormHelperText>}
									</Stack>
								</Grid>

								<Grid item xs={12}>
									<Stack spacing={2}>
										<Button variant="contained" type="submit" fullWidth disabled={isSubmitting}>
											{isSubmitting ? (
												<Stack direction="row" spacing={1} alignItems="center">
													<CircularProgress size={20} color="inherit" />
													<Typography>Iniciando sesión...</Typography>
												</Stack>
											) : (
												"Iniciar Sesión"
											)}
										</Button>

										{/* Google Login deshabilitado temporalmente - mantener lógica para futuro uso
										<Divider>
											<Typography variant="caption" color="textSecondary">
												O
											</Typography>
										</Divider>

										<Box sx={{ width: "100%", position: "relative" }}>
											<CustomGoogleButton
												onClick={() => googleLogin()}
												disabled={isSubmitting}
												text={isSubmitting ? "Iniciando sesión..." : "Iniciar sesión con Google"}
												fullWidth
												showLoader={isSubmitting}
											/>
										</Box>
										*/}

										<Button
											variant="outlined"
											color="secondary"
											onClick={() => {
												// Manejo seguro para el botón de cancelar
												setInternalOpen(false);
												setTimeout(() => onLogout(), 50);
											}}
											fullWidth
											disabled={isSubmitting}
										>
											Cancelar
										</Button>
									</Stack>
								</Grid>
							</Grid>
						</form>
					)}
				</Formik>
			</DialogContent>
		</Dialog>
	);
};

export default UnauthorizedModal;
