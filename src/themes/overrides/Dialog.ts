// material-ui
import { alpha, Theme } from "@mui/material/styles";

// ==============================|| OVERRIDES - DIALOG ||============================== //

/**
 * Los modales del panel.
 *
 * En un teléfono el modal es donde peor se sentía la interfaz: MUI le pone 32px
 * de margen por lado y un tope de alto que, sobre 360px, deja el contenido en
 * una columna de 296px con formularios y tablas adentro. Abajo de sm el margen
 * baja a 8px y el paper usa el alto disponible, que es la diferencia entre
 * poder cargar una credencial desde el celular o no.
 *
 * No se van a pantalla completa a propósito: 137 de los 144 modales del panel
 * son confirmaciones o detalles cortos, y volverlos pantalla completa haría que
 * un "¿Confirmás?" tape toda la app.
 */
export default function Dialog(theme: Theme) {
	return {
		MuiDialog: {
			styleOverrides: {
				root: {
					"& .MuiBackdrop-root": {
						backgroundColor: alpha("#000", 0.5),
					},
				},
				paper: {
					backgroundImage: "none",
					[theme.breakpoints.down("sm")]: {
						margin: 8,
						width: "calc(100% - 16px)",
						maxWidth: "calc(100% - 16px)",
						maxHeight: "calc(100% - 16px)",
					},
				},
			},
		},
	};
}
