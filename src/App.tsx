import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { SnackbarProvider } from "notistack";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ThemeCustomization from "./themes";
import Routes from "./routes";
import { AuthProvider } from "./contexts/ServerContext";

// Google OAuth Client ID
const googleClientId = import.meta.env.VITE_AUTH0_GOOGLE_ID;
if (!googleClientId) {
	throw new Error("VITE_AUTH0_GOOGLE_ID no está definida. Asegúrate de configurarla en tu archivo .env");
}

const App = () => {
	// Key para forzar remount del GoogleOAuthProvider cuando se hace logout
	const [googleProviderKey, setGoogleProviderKey] = useState(0);

	// Escuchar eventos de logout para reinicializar Google OAuth
	useEffect(() => {
		const handleStorageChange = (e: StorageEvent) => {
			// Si se limpia el token (logout), reinicializar Google OAuth
			if (e.key === "authToken" && !e.newValue) {
				setGoogleProviderKey((prev) => prev + 1);
			}
		};

		window.addEventListener("storage", handleStorageChange);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
		};
	}, []);

	// Función para reinicializar Google OAuth desde el contexto
	useEffect(() => {
		const handleReinitGoogle = () => {
			setGoogleProviderKey((prev) => prev + 1);
		};

		// Escuchar evento personalizado para reiniciar Google OAuth
		window.addEventListener("reinit-google-oauth", handleReinitGoogle);

		return () => {
			window.removeEventListener("reinit-google-oauth", handleReinitGoogle);
		};
	}, []);

	return (
		<HelmetProvider>
			<GoogleOAuthProvider key={googleProviderKey} clientId={googleClientId}>
				<ThemeCustomization>
					<SnackbarProvider
						maxSnack={3}
						anchorOrigin={{
							vertical: "top",
							horizontal: "right",
						}}
						autoHideDuration={3000}
					>
						<AuthProvider>
							<Routes />
						</AuthProvider>
					</SnackbarProvider>
				</ThemeCustomization>
			</GoogleOAuthProvider>
		</HelmetProvider>
	);
};

export default App;
