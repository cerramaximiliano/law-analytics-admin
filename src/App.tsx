import { HelmetProvider } from "react-helmet-async";
import { SnackbarProvider } from "notistack";
import ThemeCustomization from "./themes";
import Routes from "./routes";
import { AuthProvider } from "./contexts/ServerContext";

const App = () => {
	return (
		<HelmetProvider>
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
		</HelmetProvider>
	);
};

export default App;
