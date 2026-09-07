// material-ui
import { Theme } from "@mui/material/styles";

// ==============================|| OVERRIDES - TABLE CONTAINER ||==============================

/**
 * El contenedor de las tablas del panel.
 *
 * Una tabla de doce columnas no entra en un teléfono, y eso está bien: lo que
 * no está bien es que arrastre a toda la página con ella. Sin un ancho máximo,
 * el `<table>` empuja el layout y el usuario termina scrolleando el menú, el
 * encabezado y las tarjetas de costado para leer una celda.
 *
 * Acá el scroll horizontal queda encerrado en el contenedor de cada tabla.
 * Había 86 lugares resolviéndolo a mano con `overflowX` suelto; esto lo vuelve
 * el comportamiento por defecto de las 403 tablas.
 *
 * Dos detalles que hacen que se note que la tabla se puede correr:
 *
 * - La barra queda visible en vez de la barra fantasma de macOS/iOS: si el
 *   único indicio de que hay más columnas es que se ven cortadas, mucha gente
 *   no lo intenta.
 * - `overscrollBehaviorX: contain` evita que al llegar al final de la tabla el
 *   gesto siga de largo y dispare el "atrás" del navegador. Perder la página
 *   por scrollear una tabla es de las cosas más molestas en mobile.
 */
export default function TableContainer(theme: Theme) {
	return {
		MuiTableContainer: {
			styleOverrides: {
				root: {
					maxWidth: "100%",
					overflowX: "auto" as const,
					overscrollBehaviorX: "contain" as const,
					WebkitOverflowScrolling: "touch" as const,
					"&::-webkit-scrollbar": {
						height: 8,
					},
					"&::-webkit-scrollbar-track": {
						backgroundColor: "transparent",
					},
					"&::-webkit-scrollbar-thumb": {
						borderRadius: 4,
						backgroundColor: theme.palette.divider,
					},
					"&:hover::-webkit-scrollbar-thumb": {
						backgroundColor: theme.palette.secondary.light,
					},
				},
			},
		},
	};
}
