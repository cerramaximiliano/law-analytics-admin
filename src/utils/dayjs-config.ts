import dayjs from "dayjs";
import "dayjs/locale/es";
import relativeTime from "dayjs/plugin/relativeTime";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import customParseFormat from "dayjs/plugin/customParseFormat";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Extender dayjs con plugins necesarios
dayjs.extend(relativeTime);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);
dayjs.extend(isBetween);
dayjs.extend(isToday);
dayjs.extend(utc);
dayjs.extend(timezone);

// Configurar idioma español por defecto
dayjs.locale("es");

// Zona horaria de Argentina
export const TIMEZONE = "America/Buenos_Aires";

// Helper para obtener fecha actual en zona horaria de Argentina
export const nowInTimezone = () => dayjs().tz(TIMEZONE);

// Helper para obtener fecha formateada en zona horaria de Argentina
export const formatInTimezone = (date: string | Date, format: string = "YYYY-MM-DD") =>
	dayjs(date).tz(TIMEZONE).format(format);

// Helper para obtener la hora actual en zona horaria de Argentina
export const currentHourInTimezone = () => dayjs().tz(TIMEZONE).hour();

// Helper para obtener fecha de hoy en formato YYYY-MM-DD en zona horaria de Argentina
export const todayInTimezone = () => dayjs().tz(TIMEZONE).format("YYYY-MM-DD");

export default dayjs;
