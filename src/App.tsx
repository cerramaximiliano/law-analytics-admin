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
	return (
		<HelmetProvider>
			<GoogleOAuthProvider clientId={googleClientId}>
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
