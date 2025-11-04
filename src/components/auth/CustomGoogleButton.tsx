import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { Box, Button, CircularProgress } from "@mui/material";

interface CustomGoogleButtonProps {
	onSuccess?: (response: CredentialResponse) => void;
	onError?: () => void;
	onClick?: () => void;
	disabled?: boolean;
	text?: string;
	fullWidth?: boolean;
	showLoader?: boolean;
}

const CustomGoogleButton = ({ onSuccess, onError, onClick, disabled, text, fullWidth, showLoader }: CustomGoogleButtonProps) => {
	// Si tiene onClick, renderizar como botón personalizado
	if (onClick) {
		return (
			<Button
				variant="outlined"
				fullWidth={fullWidth}
				disabled={disabled}
				onClick={onClick}
				startIcon={showLoader ? <CircularProgress size={20} /> : null}
			>
				{text || "Iniciar sesión con Google"}
			</Button>
		);
	}

	// De lo contrario, renderizar el botón de Google estándar
	return (
		<Box sx={{ width: "100%" }}>
			<GoogleLogin
				onSuccess={onSuccess || (() => {})}
				onError={() => {
					console.error("Google Login Failed");
					if (onError) onError();
				}}
				useOneTap={false}
				size="large"
				width="100%"
			/>
		</Box>
	);
};

export default CustomGoogleButton;
