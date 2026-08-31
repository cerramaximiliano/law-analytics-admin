import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface TabParamOptions {
	/** Params que se limpian al cambiar este valor (p. ej. el sub-tab al cambiar de worker). */
	resets?: readonly string[];
	/** `true` deja entrada en el historial del navegador. Por defecto reemplaza, para
	 *  que el botón "atrás" salga de la vista en vez de recorrer cada tab visitado. */
	push?: boolean;
}

/**
 * Estado de tab sincronizado con la query string: sobrevive al refresh y deja la
 * vista deep-linkeable (`?worker=scraping&tab=cobertura`).
 *
 * `values` es la lista de slugs válidos; un valor desconocido en la URL cae al
 * primero en vez de dejar el contenido en blanco.
 *
 * Pasar `values` y `resets` como constantes de módulo, no como literales inline:
 * un array nuevo por render cambia la identidad del setter en cada ciclo.
 */
export function useTabParam(param: string, values: readonly string[], options: TabParamOptions = {}): [string, (next: string) => void] {
	const { resets, push } = options;
	const [searchParams, setSearchParams] = useSearchParams();

	const raw = searchParams.get(param);
	const value = raw !== null && values.includes(raw) ? raw : values[0];

	const setValue = useCallback(
		(next: string) => {
			setSearchParams(
				(prev) => {
					const sp = new URLSearchParams(prev);
					sp.set(param, next);
					resets?.forEach((key) => sp.delete(key));
					return sp;
				},
				{ replace: !push },
			);
		},
		[param, push, resets, setSearchParams],
	);

	return [value, setValue];
}

/**
 * Igual que `useTabParam` pero para los tabs que ya trabajan con índice numérico
 * (`useState(0)` + `<TabPanel index={n}>`): mapea índice ↔ slug para que la URL
 * quede legible y el componente no tenga que cambiar su forma de indexar.
 */
export function useTabIndexParam(param: string, slugs: readonly string[], options: TabParamOptions = {}): [number, (next: number) => void] {
	const [value, setValue] = useTabParam(param, slugs, options);
	const index = slugs.indexOf(value);

	const setIndex = useCallback(
		(next: number) => {
			setValue(slugs[next] ?? slugs[0]);
		},
		[setValue, slugs],
	);

	return [index < 0 ? 0 : index, setIndex];
}
