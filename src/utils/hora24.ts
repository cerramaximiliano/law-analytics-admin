// Reloj de 24 h por defecto en todo el admin.
//
// `fecha.toLocaleString("es-AR")` sin opciones usa el reloj de 12 h, y según la
// versión de ICU del navegador omite el "p. m.": las 14:23 se leían "02:23:20".
// En vez de tocar cada llamada (más de 150), las fechas se formatean con
// hourCycle "h23" salvo que la llamada elija su propio reloj (hour12 / hourCycle).
// Los números no pasan por acá: Number.prototype.toLocaleString es otro método.

type Opciones = Intl.DateTimeFormatOptions | undefined;

const con24h = (opciones: Opciones): Intl.DateTimeFormatOptions =>
	opciones && (opciones.hour12 !== undefined || opciones.hourCycle !== undefined) ? opciones : { ...opciones, hourCycle: "h23" };

const original = {
	toLocaleString: Date.prototype.toLocaleString,
	toLocaleTimeString: Date.prototype.toLocaleTimeString,
};

Date.prototype.toLocaleString = function (this: Date, locales?: Intl.LocalesArgument, opciones?: Opciones) {
	return original.toLocaleString.call(this, locales, con24h(opciones));
};

Date.prototype.toLocaleTimeString = function (this: Date, locales?: Intl.LocalesArgument, opciones?: Opciones) {
	return original.toLocaleTimeString.call(this, locales, con24h(opciones));
};

export {};
