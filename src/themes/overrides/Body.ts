import { Theme } from "@mui/material/styles";

// ==============================|| OVERRIDES - BODY ||============================== //

export default function Body(theme: Theme) {
	return {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					fontFeatureSettings: '"salt"',
				},
				// Filas y tarjetas activables con teclado (utils/a11y clickableProps): sin
				// esto el foco existe pero no se ve.
				'[tabindex="0"]:not(button):not(a):not(input):not(textarea):focus-visible': {
					outline: `2px solid ${theme.palette.primary.main}`,
					outlineOffset: -2,
				},
				// Quien pidió menos movimiento en el sistema operativo no ve transiciones
				// ni animaciones: cubre los Collapse/Fade/Grow de MUI y el CSS propio de
				// cada vista sin tener que tocarlas una por una. Los spinners quedan
				// quietos pero visibles, que alcanza para indicar carga.
				"@media (prefers-reduced-motion: reduce)": {
					"*, *::before, *::after": {
						animationDuration: "0.01ms !important",
						animationIterationCount: "1 !important",
						transitionDuration: "0.01ms !important",
						scrollBehavior: "auto !important",
					},
				},
			},
		},
	};
}
