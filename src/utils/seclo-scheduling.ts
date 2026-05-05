// Utilidades de programación de solicitudes SECLO.
//
// El contrato con el backend es: `scheduledAt` es un instante absoluto (ISO
// UTC). La conversión wall-clock + timezone IANA → UTC se hace en el cliente
// para que el server no tenga que conocer las zonas — ya recibe un instante
// inequívoco. `scheduledTimezone` se persiste sólo para que la UI pueda
// re-mostrar la hora original al usuario.

// Lista corta de zonas IANA. Se permite tipear cualquier string IANA en el
// Autocomplete (freeSolo) si el usuario necesita una que no figura acá.
export const TIMEZONE_OPTIONS = [
	"America/Argentina/Buenos_Aires",
	"America/Argentina/Cordoba",
	"America/Argentina/Mendoza",
	"America/Argentina/Salta",
	"America/Argentina/Tucuman",
	"America/Argentina/Ushuaia",
	"America/Montevideo",
	"America/Santiago",
	"America/Sao_Paulo",
	"Europe/Madrid",
	"UTC",
] as const;

export function detectBrowserTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Argentina/Buenos_Aires";
	} catch {
		return "America/Argentina/Buenos_Aires";
	}
}

/**
 * Convierte un wall-clock "YYYY-MM-DDTHH:MM" en una zona IANA dada al
 * instante UTC absoluto correspondiente. La idea: pretender que el wall-clock
 * es UTC, calcular qué offset tiene la zona en ese instante y restarlo para
 * obtener el UTC real. Funciona uniformemente con DST.
 */
export function wallClockToUtc(wallClock: string, timezone: string): Date {
	const asUtcGuess = new Date(`${wallClock}:00Z`);
	const dtf = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});
	const parts = dtf.formatToParts(asUtcGuess).reduce((acc: Record<string, string>, p) => {
		acc[p.type] = p.value;
		return acc;
	}, {});
	const tzAsIfUtc = Date.UTC(
		Number(parts.year),
		Number(parts.month) - 1,
		Number(parts.day),
		parts.hour === "24" ? 0 : Number(parts.hour),
		Number(parts.minute),
		Number(parts.second),
	);
	const offsetMs = tzAsIfUtc - asUtcGuess.getTime();
	return new Date(asUtcGuess.getTime() - offsetMs);
}

/**
 * Inversa de `wallClockToUtc`: dado un instante UTC y una zona IANA, devuelve
 * el wall-clock "YYYY-MM-DDTHH:MM" que corresponde en esa zona. Útil para
 * pre-cargar el datetime-local input al editar una solicitud ya programada.
 */
export function utcToWallClock(utc: Date | string, timezone: string): string {
	const d = typeof utc === "string" ? new Date(utc) : utc;
	if (isNaN(d.getTime())) return "";
	const dtf = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const parts = dtf.formatToParts(d).reduce((acc: Record<string, string>, p) => {
		acc[p.type] = p.value;
		return acc;
	}, {});
	const hh = parts.hour === "24" ? "00" : parts.hour;
	return `${parts.year}-${parts.month}-${parts.day}T${hh}:${parts.minute}`;
}
