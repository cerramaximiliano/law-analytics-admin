import React from "react";
import { useState } from "react";
// material-ui
import { Grid, Alert, Typography, Box, LinearProgress } from "@mui/material";

// project-imports
import Logo from "components/logo";
import AuthWrapper from "sections/auth/AuthWrapper";
import AuthLogin from "sections/auth/auth-forms/AuthLogin";

// ================================|| LOGIN ||================================ //

const Login = () => {
	const [isEmailLoading, setIsEmailLoading] = useState<boolean>(false);

	// Verificar si el sitio está en modo mantenimiento
	const isMaintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === "true";

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
				{isEmailLoading && (
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
						<Typography variant="h3">Inicio</Typography>
					</Grid>
					<Grid item xs={12}>
						<AuthLogin forgot="/auth/forgot-password" isGoogleLoading={false} onLoadingChange={setIsEmailLoading} />
					</Grid>
				</Grid>
			</Box>
		</AuthWrapper>
	);
};

export default Login;
