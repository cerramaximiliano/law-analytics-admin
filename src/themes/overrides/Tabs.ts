// ==============================|| OVERRIDES - TABS ||============================== //

/**
 * Las pestañas del panel.
 *
 * 57 de los 119 grupos de tabs eran `standard`: cuando no entran, MUI los
 * comprime y los últimos quedan fuera de alcance — en un teléfono eso significa
 * pestañas a las que no se puede llegar. Con `scrollable` por defecto, cuando
 * entran se ven igual y cuando no, se corren. Los grupos que declaran su propia
 * variante (`fullWidth`, `standard` explícito) no se tocan: las props ganan
 * sobre los defaults.
 */
export default function Tabs() {
	return {
		MuiTabs: {
			defaultProps: {
				variant: "scrollable" as const,
				scrollButtons: "auto" as const,
				allowScrollButtonsMobile: true,
			},
			styleOverrides: {
				vertical: {
					overflow: "visible",
				},
				// Las flechas de scroll ocupan lugar aun deshabilitadas: cuando no
				// hay nada que correr, se esconden en vez de comerse dos pestañas.
				scrollButtons: {
					"&.Mui-disabled": {
						display: "none",
					},
				},
			},
		},
	};
}
