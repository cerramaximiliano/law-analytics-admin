import { alpha } from "@mui/material/styles";

// Tokens compartidos con el landing — centralizan el brand-blue y el verde
// "live" que hoy están duplicados en cada sección (Hero, Faq, Technologies…).
// Este archivo no se importa todavía en ningún lado; sirve como base para los
// cambios visuales que vienen.

export const BRAND_BLUE = "#3A7BFF";
export const LIVE_GREEN = "#22C55E";
export const STALE_AMBER = "#F59E0B";
// Acento dorado para diferenciar tier Premium del Estándar — más cálido y
// más saturado que el amber neutro de "stale".
export const PREMIUM_GOLD = "#D97706";

// Nav active row — alineado con el SectionEyebrow del landing.
// Los alphas están calibrados para ser perceptibles sobre el fondo `#F8F9FA`
// que usa el dashboard en light mode (alpha < 0.10 se camufla).
export const navActiveBg = (isDark: boolean) => alpha(BRAND_BLUE, isDark ? 0.15 : 0.09);
export const navActiveBorder = (isDark: boolean) => alpha(BRAND_BLUE, isDark ? 0.36 : 0.24);
export const navHoverBg = (isDark: boolean) => alpha(BRAND_BLUE, isDark ? 0.1 : 0.06);

// Borde sutil tintado brand para headers / footers (líneas finas que no son
// divisores estructurales).
export const headerBorder = (isDark: boolean) => alpha(BRAND_BLUE, isDark ? 0.16 : 0.1);

// Sombra del header al hacer scroll — tintada brand en vez del black-based
// `customShadows.z1`. Más coherente con el lenguaje del landing (sombras que
// llevan el hue del fondo, no negro puro).
export const headerShadow = (isDark: boolean) =>
	isDark
		? `0 4px 18px ${alpha(BRAND_BLUE, 0.16)}, 0 1px 4px rgba(0, 0, 0, 0.3)`
		: `0 4px 18px ${alpha(BRAND_BLUE, 0.08)}, 0 1px 4px rgba(28, 40, 80, 0.04)`;

// Borde más marcado para el rail del drawer — es un divisor estructural y
// necesita leer como tal (más alpha que `headerBorder`).
export const railBorder = (isDark: boolean) => alpha(BRAND_BLUE, isDark ? 0.34 : 0.22);

// Animación de pulso reutilizable — misma curva que el landing/Header.tsx
// usa para los live dots de las integraciones (PJN ●, MEV ●…). Se aplica como
// `@keyframes la-live-pulse` y se referencia con `animation: "la-live-pulse 2.4s ease-out infinite"`.
export const LIVE_PULSE_KEYFRAMES = {
	"@keyframes la-live-pulse": {
		"0%": { transform: "scale(0.9)", opacity: 0.55 },
		"80%, 100%": { transform: "scale(2.4)", opacity: 0 },
	},
} as const;
