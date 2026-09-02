// Logo de cada organismo, en un solo lugar. Lo consumen la vista de
// integraciones (que además le pone fondo y borde propios) y el menú lateral,
// donde el mismo escudo aparece en Carpetas, Credenciales y Workers de una
// jurisdicción: es lo que hace evidente que las tres hablan del mismo portal.
import logoPJNacion from "./logo_pj_nacion.png";
import logoPJBuenosAires from "./logo_pj_buenos_aires.svg";
import logoPJCatamarca from "./logo_pj_catamarca.png";
import logoPJMendoza from "./logo_pj_mendoza.png";

// Los que viven en Cloudinary todavía no tienen asset local.
const CLOUDINARY = "https://res.cloudinary.com/dqyoeolib/image/upload";

export const JURISDICTION_LOGOS = {
	pjn: logoPJNacion,
	/** MEV y SCBA comparten organismo: los dos son Buenos Aires. */
	mev: logoPJBuenosAires,
	scba: logoPJBuenosAires,
	eje: `${CLOUDINARY}/v1770081495/ChatGPT_Image_2_feb_2026_09_44_56_p.m._ymi66g.png`,
	seclo: `${CLOUDINARY}/q_auto/f_auto/v1776203385/seclo-removebg-preview_rxcvzm.png`,
	pjsalta: `${CLOUDINARY}/v1779137783/ChatGPT_Image_18_may_2026__05_52_35_p.m.-removebg-preview_bngpqd.png`,
	pjcatamarca: logoPJCatamarca,
	pjmendoza: logoPJMendoza,
} as const;

export type JurisdictionKey = keyof typeof JURISDICTION_LOGOS;
