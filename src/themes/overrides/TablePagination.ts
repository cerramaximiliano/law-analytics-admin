// material-ui
import { Theme } from "@mui/material/styles";

// ==============================|| OVERRIDES - TABLE PAGINATION ||==============================

/**
 * El paginador de las tablas del panel.
 *
 * Los textos y los botones de primera/última página se fijan acá como
 * defaultProps y no instancia por instancia. Había 83 paginadores sueltos: 12
 * mostraban "Rows per page", 20 mostraban "1–10 of 100" y 82 no tenían los
 * saltos al principio y al final que sí tenían los que usan
 * EnhancedTablePagination. Cualquier instancia que pase su propia etiqueta la
 * conserva —las props ganan sobre defaultProps—, así que esto empareja lo que
 * quedó librado a quién escribió cada tabla sin pisar decisiones deliberadas.
 *
 * En pantallas chicas el paginador es la parte que primero se rompe: los cuatro
 * bloques (etiqueta, selector, rango, flechas) no entran en 360 px y se salen
 * de la tarjeta. Abajo de sm envuelve, se centra y esconde la etiqueta "Filas
 * por página" —el selector solo ya se entiende— para que las flechas, que son
 * lo único accionable, no queden fuera de la pantalla.
 */
export default function TablePagination(theme: Theme) {
	return {
		MuiTablePagination: {
			defaultProps: {
				labelRowsPerPage: "Filas por página:",
				labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
					`${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`,
				showFirstButton: true,
				showLastButton: true,
			},
			styleOverrides: {
				root: {
					// El paginador nunca debe ser el que fuerza el scroll horizontal
					// de la página: si algo no entra, envuelve.
					overflow: "visible",
				},
				toolbar: {
					flexWrap: "wrap" as const,
					rowGap: 4,
					[theme.breakpoints.down("sm")]: {
						justifyContent: "center",
						paddingLeft: 8,
						paddingRight: 0,
					},
				},
				selectLabel: {
					fontSize: "0.875rem",
					[theme.breakpoints.down("sm")]: {
						display: "none",
					},
				},
				displayedRows: {
					fontSize: "0.875rem",
					// Los rangos cambian en cada página: con cifras tabulares no
					// bailan de ancho al pasar de "1-10" a "91-100".
					fontVariantNumeric: "tabular-nums" as const,
				},
				actions: {
					[theme.breakpoints.down("sm")]: {
						marginLeft: 8,
					},
				},
			},
		},
	};
}
