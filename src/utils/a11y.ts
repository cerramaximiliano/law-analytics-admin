import { KeyboardEvent } from "react";

/**
 * Props para que un elemento que no es <button> (una fila, una tarjeta) se
 * pueda activar con teclado igual que con el mouse: entra en el orden de Tab
 * y responde a Enter y Espacio.
 *
 * Preferir siempre <Button>, <ButtonBase> o <RouterLink>. Esto es para los
 * casos donde cambiar el elemento rompería la estructura, típicamente un
 * <TableRow> clickeable: cambiarle el role a "button" lo saca de la tabla
 * para un lector de pantalla, así que en filas se usa `asRow: true` y se
 * conserva el role nativo.
 *
 * El foco visible lo pone el tema (overrides/Body.ts) para todo
 * `[tabindex="0"]`, así que no hace falta agregar estilos en cada vista.
 */
export const clickableProps = (onActivate: () => void, options: { asRow?: boolean; label?: string } = {}) => ({
	...(options.asRow ? {} : { role: "button" as const }),
	...(options.label ? { "aria-label": options.label } : {}),
	tabIndex: 0,
	onClick: onActivate,
	onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
		// Solo si la tecla vino del elemento mismo: un input o botón adentro maneja la suya.
		if (event.target !== event.currentTarget) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onActivate();
		}
	},
});
