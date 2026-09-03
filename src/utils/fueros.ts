/**
 * Catálogo de las jurisdicciones del portal PJN.
 *
 * Existe porque la misma lista estaba copiada en ocho componentes, todos
 * congelados en los seis fueros que se minaban originalmente. Cuando en
 * septiembre de 2026 se cablearon las 28 jurisdicciones y se abrieron los 15
 * distritos de la justicia federal del interior, esas vistas siguieron
 * mostrando seis: los workers nuevos existían pero eran invisibles desde el
 * panel. Una sola fuente evita que vuelva a pasar.
 *
 * `num` es el valor del <select> del portal, el mismo que usa FUERO_CONFIG del
 * scraper (pjn-workers-scraping/src/utils/scraping-common.js). Mantener ambos
 * en el mismo orden facilita compararlos.
 */

export type GrupoFuero = "Cámaras nacionales" | "Cámaras federales" | "Casación penal" | "Justicia federal del interior";

export interface Fuero {
	value: string;
	label: string;
	/** Valor del selector de fuero en el portal PJN. */
	num: number;
	grupo: GrupoFuero;
	/** Si hoy hay workers de scraping barriéndolo. */
	conScraping: boolean;
	/** Etiqueta abreviada, para tablas y barras donde el nombre completo no entra. */
	corto?: string;
}

export const FUEROS: Fuero[] = [
	// Cámaras nacionales y federales con sede en CABA
	{ value: "CIV", label: "Civil", num: 1, grupo: "Cámaras nacionales", conScraping: true },
	{ value: "CNT", label: "Trabajo", num: 7, grupo: "Cámaras nacionales", conScraping: true },
	{ value: "CSS", label: "Seguridad Social", num: 5, grupo: "Cámaras nacionales", conScraping: true, corto: "Seg. Social" },
	{ value: "COM", label: "Comercial", num: 10, grupo: "Cámaras nacionales", conScraping: true },
	{ value: "CCC", label: "Criminal y Correccional", num: 9, grupo: "Cámaras nacionales", conScraping: false, corto: "Crim. y Correc." },
	{ value: "CPE", label: "Penal Económico", num: 6, grupo: "Cámaras nacionales", conScraping: false },
	{ value: "CNE", label: "Electoral", num: 4, grupo: "Cámaras nacionales", conScraping: false },
	{ value: "CSJ", label: "Corte Suprema", num: 0, grupo: "Cámaras nacionales", conScraping: false },

	{ value: "CCF", label: "Civil y Comercial Federal", num: 3, grupo: "Cámaras federales", conScraping: true, corto: "Civ. y Com. Fed." },
	{ value: "CAF", label: "Contencioso Adm. Federal", num: 2, grupo: "Cámaras federales", conScraping: true, corto: "Cont. Adm. Fed." },
	{
		value: "CFP",
		label: "Criminal y Correccional Federal",
		num: 8,
		grupo: "Cámaras federales",
		conScraping: false,
		corto: "Crim. y Correc. Fed.",
	},

	{ value: "CPF", label: "Casación Penal Federal", num: 11, grupo: "Casación penal", conScraping: false, corto: "Casación Fed." },
	{ value: "CPN", label: "Casación Penal Nacional", num: 12, grupo: "Casación penal", conScraping: false, corto: "Casación Nac." },

	// Los 15 distritos federales del interior, abiertos el 2026-09-02
	{ value: "FLP", label: "La Plata", num: 18, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FRO", label: "Rosario", num: 25, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FCB", label: "Córdoba", num: 15, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FSM", label: "San Martín", num: 26, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FMZ", label: "Mendoza", num: 20, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FMP", label: "Mar del Plata", num: 19, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FTU", label: "Tucumán", num: 27, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FBB", label: "Bahía Blanca", num: 13, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FSA", label: "Salta", num: 24, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FRE", label: "Resistencia", num: 23, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FPA", label: "Paraná", num: 22, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FCT", label: "Corrientes", num: 16, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FPO", label: "Posadas", num: 21, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FGR", label: "General Roca", num: 17, grupo: "Justicia federal del interior", conScraping: true },
	{ value: "FCR", label: "Comodoro Rivadavia", num: 14, grupo: "Justicia federal del interior", conScraping: true },
];

/** Para los <Select> de filtro y de alta de workers. */
export const FUERO_OPTIONS = FUEROS.map(({ value, label }) => ({ value, label }));

/** Solo los que hoy tienen workers. Útil para filtros donde el resto sería ruido. */
export const FUEROS_CON_SCRAPING = FUEROS.filter((f) => f.conScraping);

export const FUERO_CODES = FUEROS.map((f) => f.value);

export const GRUPOS: GrupoFuero[] = ["Cámaras nacionales", "Cámaras federales", "Casación penal", "Justicia federal del interior"];

const PORAF = new Map(FUEROS.map((f) => [f.value, f]));

export const labelDeFuero = (code: string): string => PORAF.get(code)?.label ?? code;

/** Nombre corto para tablas y barras; cae al largo si no hay abreviatura. */
export const labelCortoDeFuero = (code: string): string => {
	const f = PORAF.get(code);
	return f?.corto ?? f?.label ?? code;
};

/**
 * Clave de la paleta de MUI por fuero. Los componentes viejos usaban un mapa a
 * mano con cuatro entradas; se deriva del código para que las 28 jurisdicciones
 * tengan color estable sin mantener una lista.
 */
const PALETA = ["primary", "success", "warning", "error", "info", "secondary"] as const;
export type PaletaFuero = (typeof PALETA)[number];
export const paletaDeFuero = (code: string): PaletaFuero => {
	let h = 0;
	for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % PALETA.length;
	return PALETA[h];
};
export const grupoDeFuero = (code: string): GrupoFuero | undefined => PORAF.get(code)?.grupo;

/**
 * Color por fuero para gráficos y chips. Se deriva del código para no tener que
 * mantener 28 colores a mano ni quedarse corto cuando se agregue el 29.
 */
export const colorDeFuero = (code: string): string => {
	let h = 0;
	for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 360;
	return `hsl(${h}, 62%, 42%)`;
};
