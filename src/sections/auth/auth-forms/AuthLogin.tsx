import React from "react";
import { useState, SyntheticEvent } from "react";
import { Link as RouterLink } from "react-router-dom";

// material-ui
import {
	Button,
	Checkbox,
	CircularProgress,
	FormControlLabel,
	FormHelperText,
	Grid,
	Link,
	InputAdornment,
	InputLabel,
	OutlinedInput,
	Stack,
	Typography,
	Box,
} from "@mui/material";

// third-party
import * as Yup from "yup";
import { Formik } from "formik";

// project-imports
import useAuth from "hooks/useAuth";
import useScriptRef from "hooks/useScriptRef";
import IconButton from "components/@extended/IconButton";
import AnimateButton from "components/@extended/AnimateButton";

// assets
import { Eye, EyeSlash } from "iconsax-react";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";

// ============================|| JWT - LOGIN ||============================ //

interface AuthLoginProps {
	forgot?: string;
	isGoogleLoading?: boolean;
	onLoadingChange?: (loading: boolean) => void;
}

const AuthLogin = ({ forgot, isGoogleLoading = false, onLoadingChange }: AuthLoginProps) => {
	const [checked, setChecked] = useState(false);

	const { isLoggedIn, login } = useAuth();
	const scriptedRef = useScriptRef();

	const [showPassword, setShowPassword] = useState(false);
	const handleClickShowPassword = () => {
		setShowPassword(!showPassword);
	};

	const handleMouseDownPassword = (event: SyntheticEvent) => {
		event.preventDefault();
	};

	return (
		<>
			<Formik
				initialValues={{
					email: import.meta.env.MODE === "development" ? import.meta.env.VITE_DEV_EMAIL || "" : "",
					password: import.meta.env.MODE === "development" ? import.meta.env.VITE_DEV_PASSWORD || "" : "",
					submit: null,
				}}
				validationSchema={Yup.object().shape({
					email: Yup.string().email("Debe ser un e-mail válido").max(255).required("El e-mail es requerido"),
					password: Yup.string().max(255).required("La contraseña es requerida"),
				})}
				onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
					try {
						if (onLoadingChange) {
							onLoadingChange(true);
						}
						await login(values.email, values.password);
						if (scriptedRef.current) {
							setStatus({ success: true });
							setSubmitting(false);
						}
					} catch (err: any) {
						if (scriptedRef.current) {
							setStatus({ success: false });

							// Safely extract error message with proper checks
							let errorMessage = "Error al iniciar sesión";
							let fullErrorMessage = errorMessage;

							// Handle specific error cases
							if (err && err.response) {
								// Handle 429 Too Many Requests
								if (err.response.status === 429) {
									const errorData = err.response.data;
									errorMessage = "Has realizado demasiados intentos fallidos de inicio de sesión.";

									// Calculate remaining time if retryAfter is provided
									let remainingTimeMessage = "";
									if (errorData.retryAfter) {
										const retryAfterDate = new Date(errorData.retryAfter);
										const now = new Date();
										const diffMs = retryAfterDate.getTime() - now.getTime();

										if (diffMs > 0) {
											const diffMinutes = Math.ceil(diffMs / 60000);

											if (diffMinutes >= 60) {
												const hours = Math.floor(diffMinutes / 60);
												const minutes = diffMinutes % 60;
												if (minutes === 0) {
													remainingTimeMessage = `Podrás intentar nuevamente en ${hours} ${hours === 1 ? "hora" : "horas"}.`;
												} else {
													remainingTimeMessage = `Podrás intentar nuevamente en ${hours} ${hours === 1 ? "hora" : "horas"} y ${minutes} ${
														minutes === 1 ? "minuto" : "minutos"
													}.`;
												}
											} else {
												remainingTimeMessage = `Podrás intentar nuevamente en ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}.`;
											}
										}
									}

									const description =
										errorData.error || remainingTimeMessage || "Por favor, intenta nuevamente más tarde o restablece tu contraseña.";
									fullErrorMessage = `${errorMessage} ${description}`;
								}
								// Handle new structured error responses
								else if (err.response.data && err.response.data.error) {
									const errorData = err.response.data.error;
									errorMessage = err.response.data.message || errorMessage;

									// Add additional details to the message if available
									if (errorData.description) {
										fullErrorMessage = `${errorMessage} ${errorData.description}`;
									} else {
										fullErrorMessage = errorMessage;
									}

									// Add attempts remaining if available
									if (errorData.attemptsRemaining !== undefined && errorData.attemptsRemaining > 0) {
										fullErrorMessage += ` Intentos restantes: ${errorData.attemptsRemaining}`;
									}

									// Add remaining time if account is locked
									if (errorData.remainingMinutes) {
										fullErrorMessage += ` Tiempo restante de bloqueo: ${errorData.remainingMinutes} minutos`;
									}
								} else if (err.response.status === 404) {
									fullErrorMessage = "El servicio de autenticación no está disponible. Por favor, intente más tarde.";
								} else if (err.response.status === 500) {
									fullErrorMessage = "Error del servidor. Por favor, intente más tarde.";
								} else if (err.response.status === 401) {
									fullErrorMessage = "Credenciales inválidas. Por favor, verifique su email y contraseña.";
								} else if (err.response.data && err.response.data.message) {
									fullErrorMessage = err.response.data.message;
								}
							} else if (err && err.message) {
								// Handle errors with message property
								if (err.message.includes("Network Error")) {
									fullErrorMessage = "Error de conexión. Por favor, verifique su conexión a internet.";
								} else if (err.message.includes("timeout")) {
									fullErrorMessage = "La solicitud ha tardado demasiado. Por favor, intente nuevamente.";
								} else {
									fullErrorMessage = err.message;
								}
							} else if (typeof err === "string") {
								fullErrorMessage = err;
							}

							// Show snackbar with error message
							dispatch(
								openSnackbar({
									open: true,
									message: fullErrorMessage,
									variant: "alert",
									alert: {
										color: "error",
									},
									close: true,
									autoHideDuration: err.response?.status === 429 ? 10000 : 6000, // Longer duration for 429 errors
								}),
							);

							setErrors({ submit: errorMessage });
							setSubmitting(false);
							if (onLoadingChange) {
								onLoadingChange(false);
							}
						}
					} finally {
						if (onLoadingChange) {
							onLoadingChange(false);
						}
					}
				}}
			>
				{({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => {
					// Check if either form is loading
					const isAnyFormLoading = isSubmitting || isGoogleLoading;

					// Create a custom submit handler to avoid the persist error
					const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
						e.preventDefault();
						e.stopPropagation();

						// TEMPORARY FIX: Disable Enter key submission due to Formik/InputBase conflict
						// Only allow submission via button click
						return false;
					};

					return (
						<form noValidate onSubmit={onFormSubmit}>
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
											placeholder="Ingrese su dirección de correo electrónico"
											fullWidth
											error={Boolean(touched.email && errors.email)}
											disabled={isAnyFormLoading}
											autoComplete="email"
											onKeyDown={(e) => {
												// Prevent form submission on Enter in input fields
												if (e.key === "Enter") {
													e.preventDefault();
													e.stopPropagation();
												}
											}}
										/>
										{touched.email && errors.email && (
											<FormHelperText error id="standard-weight-helper-text-email-login">
												{errors.email}
											</FormHelperText>
										)}
									</Stack>
								</Grid>
								<Grid item xs={12}>
									<Stack spacing={1}>
										<InputLabel htmlFor="password-login">Contraseña</InputLabel>
										<OutlinedInput
											fullWidth
											error={Boolean(touched.password && errors.password)}
											id="password-login"
											type={showPassword ? "text" : "password"}
											value={values.password}
											name="password"
											onBlur={handleBlur}
											onChange={handleChange}
											disabled={isAnyFormLoading}
											autoComplete="current-password"
											onKeyDown={(e) => {
												// Prevent form submission on Enter in input fields
												if (e.key === "Enter") {
													e.preventDefault();
													e.stopPropagation();
												}
											}}
											endAdornment={
												<InputAdornment position="end">
													<IconButton
														aria-label="toggle password visibility"
														onClick={handleClickShowPassword}
														onMouseDown={handleMouseDownPassword}
														edge="end"
														color="secondary"
														disabled={isAnyFormLoading}
													>
														{showPassword ? <Eye /> : <EyeSlash />}
													</IconButton>
												</InputAdornment>
											}
											placeholder="Ingrese una contraseña"
										/>
										{touched.password && errors.password && (
											<FormHelperText error id="standard-weight-helper-text-password-login">
												{errors.password}
											</FormHelperText>
										)}
									</Stack>
								</Grid>

								<Grid item xs={12} sx={{ mt: -1 }}>
									<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
										<FormControlLabel
											control={
												<Checkbox
													checked={checked}
													onChange={(event) => setChecked(event.target.checked)}
													name="checked"
													color="primary"
													size="small"
													disabled={isAnyFormLoading}
												/>
											}
											label={<Typography variant="h6">Mantener la sesión abierta</Typography>}
										/>

										<Link
											variant="h6"
											component={isAnyFormLoading ? Box : RouterLink}
											to={isAnyFormLoading ? undefined : isLoggedIn && forgot ? forgot : "/forgot-password"}
											color={isAnyFormLoading ? "text.disabled" : "text.primary"}
											sx={{
												cursor: isAnyFormLoading ? "not-allowed" : "pointer",
												pointerEvents: isAnyFormLoading ? "none" : "auto",
												textDecoration: isAnyFormLoading ? "none" : undefined,
											}}
										>
											Olvidé mi Password
										</Link>
									</Stack>
								</Grid>
								<Grid item xs={12}>
									<AnimateButton>
										<Button
											disableElevation
											disabled={isAnyFormLoading}
											fullWidth
											size="large"
											type="button"
											variant="contained"
											color="primary"
											startIcon={
												isAnyFormLoading ? (
													<CircularProgress
														size={20}
														sx={{
															color: (theme) => theme.palette.primary.contrastText,
															opacity: 0.9,
														}}
													/>
												) : null
											}
											onClick={(e) => {
												e.preventDefault();
												if (!isAnyFormLoading) {
													handleSubmit();
												}
											}}
											sx={{
												"&.Mui-disabled": {
													backgroundColor: (theme) => theme.palette.primary.main,
													color: (theme) => theme.palette.primary.contrastText,
													opacity: 0.7,
												},
											}}
										>
											{isSubmitting ? "Iniciando sesión..." : isGoogleLoading ? "Autenticando con Google..." : "Login"}
										</Button>
									</AnimateButton>
								</Grid>
							</Grid>
						</form>
					);
				}}
			</Formik>
		</>
	);
};

export default AuthLogin;
