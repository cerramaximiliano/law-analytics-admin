// Primero: deja el reloj de 24 h como default de las fechas (ver utils/hora24).
import "utils/hora24";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./App";
import { store, persister } from "./store";

// Estilos base
import "simplebar-react/dist/simplebar.min.css";
import "assets/fonts/inter/inter.css";
import "@fontsource-variable/geist";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
	<React.StrictMode>
		<Provider store={store}>
			<PersistGate loading={null} persistor={persister}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</PersistGate>
		</Provider>
	</React.StrictMode>,
);
