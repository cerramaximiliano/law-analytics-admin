import React from "react";
import { Link } from "react-router-dom";
import { useGoogleLogin, CredentialResponse, GoogleOAuthProvider } from "@react-oauth/google";
import { useState, useEffect } from "react";
// material-ui
import { Grid, Stack, Alert, Typography, Box, LinearProgress } from "@mui/material";

// project-imports
import Logo from "components/logo";
import useAuth from "hooks/useAuth";
import AuthDivider from "sections/auth/AuthDivider";
import AuthWrapper from "sections/auth/AuthWrapper";
import AuthLogin from "sections/auth/auth-forms/AuthLogin";
import CustomGoogleButton from "components/auth/CustomGoogleButton";

// Google OAuth Client ID
const googleClientId = import.meta.env.VITE_AUTH0_GOOGLE_ID;
if (!googleClientId) {
	throw new Error("VITE_AUTH0_GOOGLE_ID no está definida. Asegúrate de configurarla en tu archivo .env");
}

// ================================|| LOGIN ||================================ //

const LoginContent = () => {
	const { loginWithGoogle } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);

	// Estado combinado de loading
	const isAnyLoading = isLoading || isEmailLoading;

	// Verificar si el sitio está en modo mantenimiento
	const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === "true";

	const handleGoogleSuccess = async (tokenResponse: any) => {
		setIsLoading(true);
		setIsEmailLoading(true); // Bloquear también el formulario de email
		try {
			// Crear un objeto de credencial para mantener la compatibilidad con el sistema existente
			const credentialResponse: CredentialResponse = {
				clientId: tokenResponse.clientId || "",
				credential: tokenResponse.access_token,
				select_by: "user",
			};

			// Llamar a la función de login existente
			await loginWithGoogle?.(credentialResponse);
		} catch (error) {
			setError("Error al autenticar con Google. Por favor, intenta nuevamente.");
		} finally {
			setIsLoading(false);
			setIsEmailLoading(false);
		}
	};

	// Hook para iniciar sesión con Google
	const googleLogin = useGoogleLogin({
		onSuccess: handleGoogleSuccess,
		onError: () => {
			setError("Error al iniciar sesión con Google. Intenta nuevamente.");
			setIsLoading(false);
		},
		flow: "implicit",
		scope: "email profile",
	});

	// Mostrar mensaje de mantenimiento si está activo
	if (isMaintenanceMode) {
		return (
			<AuthWrapper>
				<Grid container spacing={3}>
					<Grid item xs={12} sx={{ textAlign: "center" }}>
						<Logo />
					</Grid>
					<Grid item xs={12}>
						<Alert severity="info" sx={{ mt: 3 }}>
							<Typography variant="h5" sx={{ mb: 1 }}>
								Sitio en Mantenimiento
							</Typography>
							<Typography variant="body1">
								Estamos realizando mejoras en nuestro sistema. Por favor, vuelve a intentarlo más tarde.
							</Typography>
						</Alert>
					</Grid>
				</Grid>
			</AuthWrapper>
		);
	}

	return (
		<AuthWrapper>
			<Box sx={{ position: "relative" }}>
				{/* Barra de progreso global */}
				{isAnyLoading && (
					<Box
						sx={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							zIndex: 1000,
						}}
					>
						<LinearProgress />
					</Box>
				)}

				<Grid container spacing={3}>
					<Grid item xs={12} sx={{ textAlign: "center" }}>
						<Logo />
					</Grid>
					<Grid item xs={12}>
						<Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: { xs: -0.5, sm: 0.5 } }}>
							<Typography variant="h3">Inicio</Typography>
							<Typography
								component={isAnyLoading ? Box : Link}
								to={isAnyLoading ? undefined : "/register"}
								variant="body1"
								sx={{
									textDecoration: "none",
									color: isAnyLoading ? "text.disabled" : "primary.main",
									cursor: isAnyLoading ? "not-allowed" : "pointer",
									pointerEvents: isAnyLoading ? "none" : "auto",
								}}
							>
								¿No tienes una cuenta?
							</Typography>
						</Stack>
					</Grid>
					<Grid item xs={12}>
						{error && (
							<Alert severity="error" sx={{ mb: 2 }}>
								{error}
							</Alert>
						)}
						<AuthLogin forgot="/auth/forgot-password" isGoogleLoading={isLoading} onLoadingChange={setIsEmailLoading} />
					</Grid>
					<Grid item xs={12}>
						<AuthDivider>
							<Typography variant="body1">O</Typography>
						</AuthDivider>
					</Grid>
					<Grid item xs={12}>
						{/* Botón personalizado que llama a googleLogin.login() */}
						<CustomGoogleButton
							onClick={() => googleLogin()}
							disabled={isLoading || isEmailLoading}
							text={isLoading ? "Iniciando sesión..." : "Iniciar sesión con Google"}
							fullWidth
							showLoader={isLoading}
						/>
					</Grid>
				</Grid>
			</Box>
		</AuthWrapper>
	);
};

// Wrapper con GoogleOAuthProvider y lógica de reinicialización
const Login = () => {
	const [googleProviderKey, setGoogleProviderKey] = useState(0);

	// Reinicializar Google OAuth cuando se detecte logout
	useEffect(() => {
		const handleReinitGoogle = () => {
			setGoogleProviderKey((prev) => prev + 1);
		};

		window.addEventListener("reinit-google-oauth", handleReinitGoogle);

		return () => {
			window.removeEventListener("reinit-google-oauth", handleReinitGoogle);
		};
	}, []);

	return (
		<GoogleOAuthProvider key={googleProviderKey} clientId={googleClientId}>
			<LoginContent />
		</GoogleOAuthProvider>
	);
};

export default Login;
