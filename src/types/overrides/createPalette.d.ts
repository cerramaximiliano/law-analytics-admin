// eslint-disable-next-line
import * as createPalette from "@mui/material/styles";

declare module "@mui/material/styles" {
	interface PaletteOptions {
		dark?: {
			main: string;
			light?: string;
			dark?: string;
		};
	}
	interface SimplePaletteColorOptions {
		lighter?: string;
		dark?: string;
		darker?: string;
		0?: string;
		50?: string;
		100?: string;
		200?: string;
		300?: string;
		400?: string;
		500?: string;
		600?: string;
		700?: string;
		800?: string;
		900?: string;
	}

	interface PaletteColor {
		lighter: string;
		dark?: string;
		darker: string;
		0?: string;
		50?: string;
		100?: string;
		200?: string;
		300?: string;
		400?: string;
		500?: string;
		600?: string;
		700?: string;
		800?: string;
		900?: string;
	}

	interface Palette {
		dark: {
			main: string;
			light: string;
			dark: string;
		};
	}
}
