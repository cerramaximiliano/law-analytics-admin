// ==============================|| OVERRIDES - BODY ||============================== //

export default function Body() {
	return {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					fontFeatureSettings: '"salt"',
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
