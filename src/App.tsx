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
	const [googleProviderKey, setGoogleProviderKey] = useState(0);
	const [isAuthInitialized, setIsAuthInitialized] = useState(false);

	// Solo escuchar el evento después de que AuthProvider se haya inicializado
	useEffect(() => {
		if (!isAuthInitialized) return;

		const handleReinitGoogle = () => {
			setGoogleProviderKey((prev) => prev + 1);
		};

		window.addEventListener("reinit-google-oauth", handleReinitGoogle);

		return () => {
			window.removeEventListener("reinit-google-oauth", handleReinitGoogle);
		};
	}, [isAuthInitialized]);

	// Escuchar cuando AuthProvider termina de inicializarse
	useEffect(() => {
		const handleAuthInit = () => {
			setIsAuthInitialized(true);
		};

		window.addEventListener("auth-initialized", handleAuthInit);

		return () => {
			window.removeEventListener("auth-initialized", handleAuthInit);
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
