// material-ui
import { TypographyVariantsOptions } from "@mui/material/styles";

// types
import { FontFamily } from "types/config";

// ==============================|| DEFAULT THEME - TYPOGRAPHY  ||============================== //

// Font display usado en headings (Geist Variable). El body sigue usando `fontFamily`
// (Inter por defecto) — Geist solo aporta presencia en titulares.
const DISPLAY_FONT = `"Geist Variable", "Inter var", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

const Typography = (fontFamily: FontFamily): TypographyVariantsOptions => ({
	htmlFontSize: 16,
	fontFamily,
	fontWeightLight: 300,
	fontWeightRegular: 400,
	fontWeightMedium: 500,
	fontWeightBold: 600,
	h1: {
		fontFamily: DISPLAY_FONT,
		fontWeight: 600,
		fontSize: "2.375rem",
		lineHeight: 1.12,
		letterSpacing: "-0.025em",
	},
	h2: {
		fontFamily: DISPLAY_FONT,
		fontWeight: 600,
		fontSize: "1.875rem",
		lineHeight: 1.18,
		letterSpacing: "-0.02em",
	},
	h3: {
		fontFamily: DISPLAY_FONT,
		fontWeight: 600,
		fontSize: "1.5rem",
		lineHeight: 1.28,
		letterSpacing: "-0.015em",
	},
	h4: {
		fontFamily: DISPLAY_FONT,
		fontWeight: 600,
		fontSize: "1.25rem",
		lineHeight: 1.36,
		letterSpacing: "-0.01em",
	},
	h5: {
		fontWeight: 600,
		fontSize: "1rem",
		lineHeight: 1.5,
		letterSpacing: "-0.005em",
	},
	h6: {
		fontWeight: 400,
		fontSize: "0.875rem",
		lineHeight: 1.57,
	},
	caption: {
		fontWeight: 400,
		fontSize: "0.75rem",
		lineHeight: 1.66,
	},
	body1: {
		fontSize: "0.875rem",
		lineHeight: 1.57,
	},
	body2: {
		fontSize: "0.75rem",
		lineHeight: 1.66,
	},
	subtitle1: {
		fontSize: "0.875rem",
		fontWeight: 600,
		lineHeight: 1.57,
	},
	subtitle2: {
		fontSize: "0.75rem",
		fontWeight: 500,
		lineHeight: 1.66,
	},
	overline: {
		lineHeight: 1.66,
	},
	button: {
		textTransform: "capitalize",
	},
});

export default Typography;
