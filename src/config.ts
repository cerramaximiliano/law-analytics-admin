// types
import { DefaultConfigProps, MenuOrientation, ThemeDirection, ThemeMode } from "types/config";

// ==============================|| THEME CONSTANT ||============================== //

export const twitterColor = "#1DA1F2";
export const facebookColor = "#3b5998";
export const linkedInColor = "#0e76a8";

export const APP_DEFAULT_PATH = "/dashboard";
export const HORIZONTAL_MAX_ITEM = 6;
export const DRAWER_WIDTH = 280;
export const MINI_DRAWER_WIDTH = 90;
export const HEADER_HEIGHT = 74;

// ==============================|| API ENDPOINTS ||============================== //

// API Base URLs
export const API_BASE_URL = import.meta.env.VITE_BASE_URL || "https://api.example.com";
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || "wss://api.example.com/ws";

// Environment
export const IS_DEVELOPMENT = import.meta.env.MODE === "development";

// ==============================|| THEME CONFIG ||============================== //

const config: DefaultConfigProps = {
	fontFamily: `Inter var`,
	i18n: "en",
	menuOrientation: MenuOrientation.VERTICAL,
	menuCaption: true,
	miniDrawer: false,
	container: false,
	mode: ThemeMode.LIGHT,
	presetColor: "theme4",
	themeDirection: ThemeDirection.LTR,
	themeContrast: false,
};

export default config;
