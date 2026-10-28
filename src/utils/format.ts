import dayjs, { Dayjs } from "dayjs";

/**
 * Formato de fechas y números para mostrar en pantalla, siempre en es-AR.
 *
 * Por qué no `dayjs().format("DD/MM/YYYY")` ni `toLocaleString()` a secas:
 * el primero fija el patrón a mano y el segundo depende del idioma del
 * navegador (un admin con Chrome en inglés veía "1,234" y "10/28/2026").
 * Acá todo pasa por Intl con locale fijo.
 *
 * La entrada se parsea con dayjs a propósito: `new Date("2026-10-28")` es
 * medianoche UTC y en Argentina se muestra como el 27; dayjs la toma como
 * fecha local, que es lo que el panel venía mostrando.
 *
 * Estos helpers son solo para mostrar. Para valores de inputs, query params
 * o cuerpos de API (`YYYY-MM-DD`) se sigue usando dayjs.
 */

export const LOCALE = "es-AR";

type DateInput = string | number | Date | Dayjs | null | undefined;

const INVALID = "—";

const DATE_STYLES = {
	date: { day: "2-digit", month: "2-digit", year: "numeric" },
	dateShort: { day: "2-digit", month: "2-digit", year: "2-digit" },
	dayMonth: { day: "2-digit", month: "2-digit" },
	dateTime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
	dateTimeSeconds: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" },
	dateTimeShort: { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" },
	dayMonthTime: { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

const dateFormatters = new Map<DateStyle, Intl.DateTimeFormat>();

const getDateFormatter = (style: DateStyle) => {
	let formatter = dateFormatters.get(style);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(LOCALE, { ...DATE_STYLES[style], hour12: false });
		dateFormatters.set(style, formatter);
	}
	return formatter;
};

/** `undefined` es "ahora", igual que `dayjs()`. `null` o una fecha inválida devuelven "—". */
export const formatDate = (value: DateInput, style: DateStyle = "date"): string => {
	const parsed = dayjs(value === null ? NaN : value);
	if (!parsed.isValid()) return INVALID;
	// Intl separa fecha y hora con ", "; el panel siempre mostró "28/10/2026 09:05".
	return getDateFormatter(style).format(parsed.toDate()).replace(", ", " ");
};

export const formatDateTime = (value: DateInput): string => formatDate(value, "dateTime");

const numberFormatters = new Map<string, Intl.NumberFormat>();

const getNumberFormatter = (options: Intl.NumberFormatOptions) => {
	const key = JSON.stringify(options);
	let formatter = numberFormatters.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat(LOCALE, options);
		numberFormatters.set(key, formatter);
	}
	return formatter;
};

/** Separador de miles con punto y decimales con coma. `decimals` fija la cantidad exacta. */
export const formatNumber = (value: number | null | undefined, decimals?: number): string => {
	if (value === null || value === undefined || Number.isNaN(value)) return INVALID;
	const options: Intl.NumberFormatOptions =
		decimals === undefined ? {} : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
	return getNumberFormatter(options).format(value);
};

/** Recibe el porcentaje ya calculado (45.2 → "45,2 %"), no la fracción. */
export const formatPercent = (value: number | null | undefined, decimals = 1): string => {
	if (value === null || value === undefined || Number.isNaN(value)) return INVALID;
	return getNumberFormatter({ style: "percent", minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(value / 100);
};

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

export const formatBytes = (bytes: number | null | undefined, decimals = 1): string => {
	if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return INVALID;
	let value = bytes;
	let unit = 0;
	while (Math.abs(value) >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	// Espacio duro entre número y unidad: "10 MB" no se corta en dos líneas.
	return `${formatNumber(value, unit === 0 ? 0 : decimals)} ${BYTE_UNITS[unit]}`;
};
