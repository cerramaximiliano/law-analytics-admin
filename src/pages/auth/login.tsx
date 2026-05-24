import React from "react";
import { useState } from "react";
// material-ui
import { Grid, Alert, Typography, Box, LinearProgress, Stack, Chip } from "@mui/material";

// project-imports
import Logo from "components/logo";
import AuthWrapper from "sections/auth/AuthWrapper";
import AuthLogin from "sections/auth/auth-forms/AuthLogin";
import { BRAND_BLUE, LIVE_GREEN, LIVE_PULSE_KEYFRAMES } from "themes/dashboardTokens";

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
						<Alert severity="info" sx={{ mt: 3, borderRadius: 1.5 }}>
							<Typography variant="h5" sx={{ mb: 1 }}>
								Sitio en mantenimiento
							</Typography>
							<Typography variant="body1">
								Estamos realizando mejoras en nuestro sistema. Por favor, volvé a intentarlo más tarde.
							</Typography>
						</Alert>
					</Grid>
				</Grid>
			</AuthWrapper>
		);
	}

	return (
		<AuthWrapper>
			<Box sx={{ position: "relative", ...LIVE_PULSE_KEYFRAMES }}>
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
						<LinearProgress sx={{ borderRadius: 1, height: 3 }} />
					</Box>
				)}

				<Grid container spacing={3}>
					<Grid item xs={12} sx={{ textAlign: "center" }}>
						<Logo />
					</Grid>
					<Grid item xs={12}>
						<Stack spacing={1} alignItems="flex-start">
							<Chip
								size="small"
								label={
									<Stack direction="row" spacing={0.75} alignItems="center">
										<Box sx={{ position: "relative", display: "inline-flex" }}>
											<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: LIVE_GREEN }} />
											<Box
												sx={{
													position: "absolute",
													top: 0,
													left: 0,
													width: 6,
													height: 6,
													borderRadius: "50%",
													bgcolor: LIVE_GREEN,
													animation: "la-live-pulse 2.4s ease-out infinite",
												}}
											/>
										</Box>
										<Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 0.4 }}>
											Panel interno
										</Typography>
									</Stack>
								}
								sx={{
									height: 22,
									bgcolor: "transparent",
									border: "1px solid",
									borderColor: (t) => (t.palette.mode === "dark" ? "rgba(34,197,94,0.32)" : "rgba(34,197,94,0.28)"),
									"& .MuiChip-label": { px: 1 },
								}}
							/>
							<Typography
								variant="h2"
								sx={{
									fontWeight: 600,
									letterSpacing: "-0.025em",
									lineHeight: 1.1,
								}}
							>
								Iniciar sesión
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Acceso al panel de administración de Law Analytics.
							</Typography>
						</Stack>
					</Grid>
					<Grid item xs={12}>
						<AuthLogin forgot="/auth/forgot-password" isGoogleLoading={false} onLoadingChange={setIsEmailLoading} />
					</Grid>
					<Grid item xs={12}>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ display: "block", textAlign: "center", letterSpacing: 0.3 }}
						>
							Sólo personal autorizado. Las acciones quedan registradas.
						</Typography>
						<Box
							sx={{
								mt: 1,
								height: 2,
								borderRadius: 1,
								mx: "auto",
								width: 36,
								background: `linear-gradient(90deg, transparent 0%, ${BRAND_BLUE} 50%, transparent 100%)`,
								opacity: 0.4,
							}}
						/>
					</Grid>
				</Grid>
			</Box>
		</AuthWrapper>
	);
};

export default Login;
