import React from "react";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { Button, CircularProgress, Grid, Stack, Typography } from "@mui/material";
import OtpInput from "react18-input-otp";
import AnimateButton from "components/@extended/AnimateButton";
import axios from "axios";
import { ThemeMode } from "types/config";
import secureStorage from "services/secureStorage";
import { useSelector } from "react-redux";
import { dispatch, RootState } from "store";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import { openSnackbar } from "store/reducers/snackbar";

// Define el tipo para el modo
type VerificationMode = "register" | "reset";

// Props para el componente
interface AuthCodeVerificationProps {
	mode?: VerificationMode;
	email?: string;
	onVerificationSuccess?: () => void;
}

const AuthCodeVerification = ({ mode = "register", email: propEmail, onVerificationSuccess }: AuthCodeVerificationProps) => {
	// Obtener funciones y estado del contexto de autenticación

	const auth = useAuth();

	// Verificar que auth no sea null antes de desestructurarlo
	if (!auth) {
		throw new Error("Auth context is not available");
	}

	const { verifyCode } = auth;

	// Placeholder para funciones no implementadas en ServerContextType
	const verifyResetCode = async (_email: string, _code: string): Promise<boolean> => {
		console.warn("verifyResetCode not implemented");
		return false;
	};

	// Obtener el email desde Redux si no viene como prop
	const reduxEmail = useSelector((state: RootState) => state.auth.email);
	const emailToUse = propEmail || reduxEmail || "";

	const navigate = useNavigate();

	const theme = useTheme();

	const [otp, setOtp] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [isResending, setIsResending] = useState<boolean>(false);
	const [isVerifying, setIsVerifying] = useState<boolean>(false);

	const borderColor = theme.palette.mode === ThemeMode.DARK ? theme.palette.secondary[200] : theme.palette.secondary.light;

	// Manejador para reenviar el código
	const handleResendCode = async () => {
		if (isResending) return;

		setIsResending(true);
		try {
			if (!emailToUse) {
				throw new Error("No se encontró una dirección de correo electrónico válida");
			}

			let endpoint = mode === "register" ? "/api/auth/resend-code" : "/api/auth/reset-request";

			await axios.post(`${import.meta.env.VITE_AUTH_URL}${endpoint}`, {
				email: emailToUse,
			});

			setError(null);
			dispatch(
				openSnackbar({
					open: true,
					message: "El código ha sido reenviado a tu correo electrónico.",
					variant: "alert",
					alert: {
						color: "success",
					},
					close: false,
				}),
			);
		} catch (error) {
			setError("No se pudo reenviar el código. Inténtalo más tarde.");
		} finally {
			setIsResending(false);
		}
	};

	// Manejador de verificación de código según el modo
	const handleVerifyCode = async () => {
		if (isVerifying) return;
		// Determinar si estamos en un proceso de reseteo de contraseña
		const isResetProcess = mode === "reset" || secureStorage.getSessionData("reset_in_progress") === true;
		// Si estamos en proceso de reseteo, forzar modo "reset" independientemente del valor de prop
		const effectiveMode = isResetProcess ? "reset" : mode;

		if (!otp || otp.length !== 6) {
			setError("Por favor, ingresa el código completo de 6 dígitos.");
			return;
		}

		if (!emailToUse) {
			setError("No se encontró una dirección de correo electrónico válida.");
			return;
		}

		setIsVerifying(true);
		try {
			// IMPORTANTE: Verificar el modo y usar el endpoint correcto

			// Para reseteo de contraseña, SIEMPRE usamos el endpoint verify-reset-code
			if (effectiveMode === "reset") {
				if (!verifyResetCode) {
					throw new Error("La función verifyResetCode no está disponible");
				}

				const success = await verifyResetCode(emailToUse, otp);

				if (success) {
					setError(null);

					// Almacenar información temporal en sessionStorage (no sensible)
					secureStorage.setSessionData("reset_email", emailToUse);
					// NUNCA almacenar el código OTP - debe validarse directamente con el backend
					secureStorage.setSessionData("reset_verified", true);

					// Navegar a la página de reseteo de contraseña
					navigate("/auth/reset-password", { replace: true });

					if (onVerificationSuccess) onVerificationSuccess();
				} else {
				}
			}
			// Para registro normal, usamos el endpoint verify-code
			else if (effectiveMode === "register" && verifyCode) {
				await verifyCode?.(emailToUse, otp);

				// La verificación fue exitosa si no hubo errores
				setError(null);
				navigate("/dashboard/default");
				if (onVerificationSuccess) onVerificationSuccess();
			}
			// Caso de emergencia - si el modo no está definido correctamente
			else {
				// Si estamos en code-verification y no tenemos modo explícito, intentar con verifyResetCode
				if (window.location.pathname.includes("code-verification") && verifyResetCode) {
					const success = await verifyResetCode(emailToUse, otp);

					if (success) {
						setError(null);
						localStorage.setItem("reset_email", emailToUse);
						localStorage.setItem("reset_code", otp);
						localStorage.setItem("reset_verified", "true");
						navigate("/auth/reset-password", { replace: true });
						if (onVerificationSuccess) onVerificationSuccess();
					} else {
					}
				} else {
					setError("Las funciones de verificación no están disponibles.");
				}
			}
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.data?.message) {
				setError(error.response.data.message);
			} else {
				setError("Hubo un problema al verificar el código. Inténtalo de nuevo más tarde.");
			}
		} finally {
			setIsVerifying(false);
		}
	};

	return (
		<Grid container spacing={3}>
			<Grid item xs={12}>
				<Typography variant="h3" textAlign="center" gutterBottom>
					{mode === "register" ? "Verificación de cuenta" : "Verificación para reseteo de contraseña"}
				</Typography>
				<Typography variant="body1" textAlign="center" sx={{ mb: 3 }}>
					Hemos enviado un código a <strong>{emailToUse}</strong>
				</Typography>
			</Grid>

			<Grid item xs={12}>
				<OtpInput
					value={otp}
					onChange={(otp: string) => setOtp(otp)}
					numInputs={6}
					isDisabled={isVerifying}
					containerStyle={{ justifyContent: "space-between" }}
					inputStyle={{
						width: "100%",
						margin: "4px",
						padding: "10px",
						border: `1px solid ${borderColor}`,
						borderRadius: 4,
						opacity: isVerifying ? 0.6 : 1,
						cursor: isVerifying ? "not-allowed" : "text",
						":hover": {
							borderColor: isVerifying ? borderColor : theme.palette.primary.main,
						},
					}}
					focusStyle={{
						outline: "none",
						boxShadow: isVerifying ? "none" : theme.customShadows.primary,
						border: `1px solid ${isVerifying ? borderColor : theme.palette.primary.main}`,
					}}
				/>
			</Grid>

			{error && (
				<Grid item xs={12}>
					<Typography color="error">{error}</Typography>
				</Grid>
			)}

			<Grid item xs={12}>
				<AnimateButton>
					<Button
						disableElevation
						fullWidth
						size="large"
						type="submit"
						variant="contained"
						onClick={handleVerifyCode}
						disabled={isVerifying}
						startIcon={isVerifying ? <CircularProgress size={20} color="inherit" /> : null}
					>
						{isVerifying ? "Verificando..." : mode === "register" ? "Verificar y continuar" : "Verificar código"}
					</Button>
				</AnimateButton>
			</Grid>

			<Grid item xs={12}>
				<Stack direction="row" justifyContent="space-between" alignItems="baseline">
					<Typography>¿No recibiste el código?</Typography>
					<Typography
						variant="body1"
						sx={{
							minWidth: 85,
							ml: 2,
							textDecoration: "none",
							cursor: "pointer",
							opacity: isResending ? 0.6 : 1,
						}}
						color="primary"
						onClick={handleResendCode}
					>
						{isResending ? "Enviando..." : "Reenviar código"}
					</Typography>
				</Stack>
			</Grid>
		</Grid>
	);
};

export default AuthCodeVerification;
