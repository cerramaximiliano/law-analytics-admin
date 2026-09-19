import axios from "axios";
import authTokenService from "services/authTokenService";
import secureStorage from "services/secureStorage";

/**
 * El refresh de sesión, uno solo para los 14 clientes axios del panel.
 *
 * Antes cada instancia tenía su propia copia de esta lógica y la disparaba por
 * su cuenta. En una carga de página donde varias peticiones fallan a la vez
 * —el dashboard consulta media docena de servicios— salían hasta 14 POST
 * simultáneos a /api/auth/refresh-token. El endpoint admite 30 por minuto: con
 * un par de recargas se llegaba al techo, el limiter devolvía 429 y cada
 * interceptor leía ese fallo como "la sesión venció", mostrando el cartel de
 * Sesión Expirada con la sesión perfectamente viva.
 *
 * Acá el refresh es uno: el primero que llega dispara la petición y los demás
 * esperan la misma promesa.
 */

/** Petición en curso, si la hay. Es lo que evita la estampida. */
let refrescoEnCurso: Promise<string | null> | null = null;

/**
 * Por qué falló un refresh. La distinción importa: solo una de estas
 * situaciones significa que el usuario tiene que volver a loguearse.
 */
export type MotivoFalloRefresh =
	/** No hay refresh token válido: la sesión terminó de verdad. */
	| "sesion-terminada"
	/** Rate limit, red caída, 5xx: la sesión puede estar perfecta. */
	| "temporal";

export class ErrorDeRefresco extends Error {
	constructor(public readonly motivo: MotivoFalloRefresh, public readonly status?: number) {
		super(`Refresh de sesión fallido (${motivo}${status ? `, HTTP ${status}` : ""})`);
		this.name = "ErrorDeRefresco";
	}
}

/**
 * Un 400 o 401 del endpoint de refresh es el único caso en que el backend dice
 * "no tengo un refresh token válido para vos". Todo lo demás —429 del limiter,
 * 502/503, timeout, DNS— es un fallo de infraestructura que no habilita a
 * afirmar que la sesión terminó.
 */
function clasificar(error: any): MotivoFalloRefresh {
	const status = error?.response?.status;
	if (status === 400 || status === 401) return "sesion-terminada";
	return "temporal";
}

/**
 * Refresca la sesión y devuelve el token nuevo si el backend lo mandó.
 *
 * Lanza `ErrorDeRefresco`, que el llamador debe mirar antes de decidir si
 * corresponde mandar al usuario a loguearse de nuevo.
 */
export async function refrescarSesion(): Promise<string | null> {
	if (refrescoEnCurso) return refrescoEnCurso;

	const authBaseURL = import.meta.env.VITE_AUTH_URL || "https://api.lawanalytics.app";

	refrescoEnCurso = (async () => {
		try {
			const respuesta = await axios.post(`${authBaseURL}/api/auth/refresh-token`, {}, { withCredentials: true });

			const token =
				respuesta.headers["authorization"]?.replace("Bearer ", "") || respuesta.headers["x-auth-token"] || respuesta.data?.token;

			if (token) {
				authTokenService.setToken(token);
				secureStorage.setAuthToken(token);
			}
			return token ?? null;
		} catch (error: any) {
			throw new ErrorDeRefresco(clasificar(error), error?.response?.status);
		} finally {
			// Se libera en el microtask siguiente: los interceptores que estaban
			// esperando ya engancharon esta promesa, y el próximo 401 genuino puede
			// pedir un refresh nuevo.
			setTimeout(() => {
				refrescoEnCurso = null;
			}, 0);
		}
	})();

	return refrescoEnCurso;
}

/**
 * Si un fallo de refresh amerita mandar al usuario al login.
 *
 * Los interceptores llamaban a `showUnauthorizedModal` ante cualquier fallo.
 * Con esto, un 429 del limiter o un corte de red dejan que la petición falle
 * con su propio error —la vista muestra lo suyo— en vez de anunciar un
 * deslogueo que no ocurrió.
 */
export function esSesionTerminada(error: unknown): boolean {
	return error instanceof ErrorDeRefresco && error.motivo === "sesion-terminada";
}
