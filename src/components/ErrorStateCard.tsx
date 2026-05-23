import React from "react";
import { ReactNode } from "react";
import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Refresh, Global, Warning2, InfoCircle } from "iconsax-react";
import MainCard from "./MainCard";

interface ErrorStateCardProps {
	title?: string;
	message?: string;
	type?: "connection" | "permission" | "notFound" | "general";
	onRetry?: () => void;
	actions?: ReactNode;
	showIcon?: boolean;
}

const ErrorStateCard = ({ title, message, type = "general", onRetry, actions, showIcon = true }: ErrorStateCardProps) => {
	const theme = useTheme();

	const getIcon = () => {
		switch (type) {
			case "connection":
				return <Global size={48} color={theme.palette.error.main} />;
			case "permission":
				return <Warning2 size={48} color={theme.palette.warning.main} />;
			case "notFound":
				return <InfoCircle size={48} color={theme.palette.info.main} />;
			default:
				return <Warning2 size={48} color={theme.palette.error.main} />;
		}
	};

	const getDefaultTitle = () => {
		switch (type) {
			case "connection":
				return "Error de conexión";
			case "permission":
				return "Sin permisos";
			case "notFound":
				return "No encontrado";
			default:
				return "Error";
		}
	};

	const getFriendlyMessage = () => {
		switch (type) {
			case "connection":
				return "No pudimos conectar con nuestros servidores. Por favor, verifica tu conexión a internet o intenta nuevamente en unos momentos.";
			case "permission":
				return "No tienes los permisos necesarios para acceder a esta información. Si crees que esto es un error, contacta con el administrador.";
			case "notFound":
				return "No pudimos encontrar la información solicitada. Es posible que haya sido movida o eliminada.";
			default:
				return "Algo salió mal mientras procesábamos tu solicitud. Por favor, intenta nuevamente.";
		}
	};

	const getSeverity = () => {
		switch (type) {
			case "connection":
				return "error";
			case "permission":
				return "warning";
			case "notFound":
				return "info";
			default:
				return "error";
		}
	};

	return (
		<MainCard>
			<Stack spacing={{ xs: 2, sm: 3, md: 4 }} alignItems="center" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, md: 3 } }}>
				{showIcon && <Box sx={{ opacity: 0.5 }}>{getIcon()}</Box>}

				<Alert severity={getSeverity()} sx={{ width: "100%", maxWidth: { xs: 600, md: 800 } }}>
					<AlertTitle sx={{ fontSize: { xs: "1.1rem", md: "1.25rem" } }}>{title || getDefaultTitle()}</AlertTitle>
					<Typography variant="body2" sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}>
						{getFriendlyMessage()}
					</Typography>
				</Alert>

				<Stack direction="row" spacing={2}>
					{onRetry && (
						<Button variant="contained" color="primary" startIcon={<Refresh />} onClick={onRetry} size="large">
							Reintentar
						</Button>
					)}
					{actions}
				</Stack>

				{type === "connection" && (
					<Box sx={{ mt: 3, textAlign: "center" }}>
						<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
							Mientras tanto, puedes:
						</Typography>
						<Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
							<Button variant="outlined" size="medium" href="/suscripciones/tables">
								Ver Planes
							</Button>
							<Button variant="outlined" size="medium" href="/help">
								Centro de Ayuda
							</Button>
						</Stack>
					</Box>
				)}
			</Stack>
		</MainCard>
	);
};

export default ErrorStateCard;
