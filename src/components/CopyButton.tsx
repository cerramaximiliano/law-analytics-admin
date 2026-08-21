// Botón de copiado de un valor puntual (email, _id, cualquier texto corto).
//
// Pensado para ir AL LADO del texto dentro de una celda de tabla: por eso es
// diminuto, no ocupa alto de fila y solo se pinta cuando hay algo que copiar.
// El feedback es local (el ícono cambia a un tilde ~1.2s) en vez de un snackbar
// global: en una tabla se copia de a un valor por vez y un toast por cada click
// tapa la pantalla.

import React, { useEffect, useRef, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Copy, TickCircle } from "iconsax-react";
import { copyText } from "utils/imageActions";

interface CopyButtonProps {
	/** Valor a copiar. Si viene vacío o null, el botón no se renderiza. */
	value?: string | null;
	/** Qué es, para el tooltip: "email", "ID"… */
	label?: string;
	size?: number;
}

const CopyButton: React.FC<CopyButtonProps> = ({ value, label = "valor", size = 13 }) => {
	const [copiado, setCopiado] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	if (!value) return null;

	const handle = async (e: React.MouseEvent) => {
		// Muchas de estas celdas viven en filas clickeables (abren un modal o
		// expanden el detalle): sin esto, copiar dispararía además esa acción.
		e.stopPropagation();
		e.preventDefault();
		try {
			await copyText(value);
			setCopiado(true);
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopiado(false), 1200);
		} catch {
			// Silencioso a propósito: el copiado es una comodidad, no una acción
			// crítica, y un error acá no debe interrumpir lo que el usuario hacía.
		}
	};

	return (
		<Tooltip title={copiado ? "Copiado" : `Copiar ${label}`} placement="top">
			<IconButton
				size="small"
				onClick={handle}
				sx={{
					p: 0.25,
					ml: 0.25,
					verticalAlign: "middle",
					color: copiado ? "success.main" : "text.disabled",
					"&:hover": { color: copiado ? "success.main" : "primary.main" },
				}}
			>
				{copiado ? <TickCircle size={size} variant="Bold" /> : <Copy size={size} />}
			</IconButton>
		</Tooltip>
	);
};

export default CopyButton;
