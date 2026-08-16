import { lazy, ComponentType } from "react";

// Cada deploy reemplaza `build/` entero, así que los assets con hash viejo
// dejan de existir. Un usuario con la app abierta desde antes del deploy pide
// al navegar el chunk viejo, el import falla con 404 y —como Loadable solo
// tiene <Suspense> sin error boundary— la vista quedaba en pantalla blanca
// hasta recargar a mano.
//
// Ante un fallo de carga recargamos la página una sola vez (la recarga trae el
// index.html nuevo con los hashes actuales). El flag en sessionStorage evita el
// bucle si la falla no era por un chunk viejo: en ese caso se propaga el error.
const RELOAD_FLAG = "chunk_reload_attempted";

const lazyWithRetry = <T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) =>
	lazy(async () => {
		try {
			const component = await factory();
			window.sessionStorage.removeItem(RELOAD_FLAG);
			return component;
		} catch (error) {
			if (window.sessionStorage.getItem(RELOAD_FLAG) !== "true") {
				window.sessionStorage.setItem(RELOAD_FLAG, "true");
				window.location.reload();
				// La recarga ya está en curso: no resolvemos para no renderizar
				// nada intermedio mientras el navegador reemplaza el documento.
				return new Promise<{ default: T }>(() => {});
			}
			throw error;
		}
	});

export default lazyWithRetry;
