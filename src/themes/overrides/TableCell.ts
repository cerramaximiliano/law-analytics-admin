// material-ui
import { Theme } from "@mui/material/styles";

// ==============================|| OVERRIDES - TABLE CELL ||============================== //

export default function TableCell(theme: Theme) {
	const commonCell = {
		"&:not(:last-of-type)": {
			position: "relative",
			"&:after": {
				position: "absolute",
				content: '""',
				backgroundColor: theme.palette.divider,
				width: 1,
				height: "calc(100% - 30px)",
				right: 0,
				top: 16,
			},
		},
	};

	return {
		MuiTableCell: {
			styleOverrides: {
				root: {
					fontSize: "0.875rem",
					padding: 12,
					borderColor: theme.palette.divider,
					// Las tablas del panel son casi todas de números: con cifras
					// tabulares las columnas quedan alineadas y comparables de un
					// vistazo, en vez de bailar según los dígitos de cada fila.
					fontVariantNumeric: "tabular-nums",
					// En un teléfono cada píxel de padding es una columna menos a la
					// vista. La densidad sube solo abajo de sm; en escritorio el aire
					// se mantiene.
					[theme.breakpoints.down("sm")]: {
						padding: 8,
					},
				},
				sizeSmall: {
					padding: 8,
					[theme.breakpoints.down("sm")]: {
						padding: 6,
					},
				},
				head: {
					fontSize: "0.75rem",
					fontWeight: 700,
					textTransform: "uppercase",
					...commonCell,
				},
				footer: {
					fontSize: "0.75rem",
					textTransform: "uppercase",
					...commonCell,
				},
			},
		},
	};
}
