import { Box, Tooltip, alpha, useTheme } from "@mui/material";
import { ArrowRight2 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * El par de vistas emparejadas, como control segmentado.
 *
 * Hay dos pares en el admin: datos↔worker (una vista de datos y el worker que
 * los extrae) y worker↔flujo (un worker y el diagrama del pipeline que
 * integra). El `target` dice cuál es el otro lado cuando no es el complemento
 * obvio.
 *
 * Casi toda vista de datos del admin tiene un worker detrás, y casi toda vista
 * de worker tiene datos que mirar. Antes cada una resolvía ese salto por su
 * cuenta, con tres etiquetas, tres íconos y tres ubicaciones distintas.
 *
 * La decisión de diseño de fondo: esto no es un link suelto, es orientación.
 * Un botón te ofrece ir a algún lado; este control además te dice que las dos
 * vistas *son* un par y en cuál de las dos mitades estás parado. Como el patrón
 * se repite en todo el admin, esa lección se enseña una vez y después se lee
 * sola.
 *
 * Detalles que lo hacen encajar en la franja de contexto, donde vive:
 *
 * - Toma el radio (6px) y el fondo tintado de los `monoChip` vecinos, en vez
 *   del radio 12px y el borde de un Button MUI. En esta interfaz el borde
 *   grueso significa "esto ejecuta algo", y navegar no ejecuta nada.
 * - El lado activo va sólido y no es clickeable; el otro es el único link.
 * - Sin engranaje ni documento: "Worker" y "Datos" ya nombran el destino, y el
 *   engranaje además nombraba mal (vas a un worker, no a un panel de ajustes).
 *
 * El control es el mismo en todos los breakpoints. Antes colapsaba a un chip
 * suelto en pantallas chicas, pero era una precaución innecesaria: los dos
 * segmentos miden ~136px y entran hasta en 320px. Colapsar sólo lograba que
 * el par se leyera distinto según el dispositivo, que es justo lo que este
 * componente viene a evitar. Cuando el encabezado se queda sin lugar, el
 * CardHeader del MainCard ya baja las acciones a su propia fila.
 *
 * Las etiquetas tampoco se pueden personalizar, por lo mismo: el par se lee
 * igual en todo el admin.
 */

export type CrossViewSide = "datos" | "worker" | "flujo";

export interface CrossViewPairProps {
	/** En qué mitad del par está la vista actual. */
	side: CrossViewSide;
	/** La otra mitad. Por defecto el complemento de datos↔worker; explícito
	 *  cuando el par no es ese (worker↔flujo, por ejemplo). */
	target?: CrossViewSide;
	/** Ruta de la otra mitad — la única que es link. */
	to: string;
	/** Qué vas a encontrar del otro lado. */
	tooltip?: string;
}

const DEFAULT_LABELS: Record<CrossViewSide, string> = { datos: "Datos", worker: "Worker", flujo: "Flujo" };
const DEFAULT_TOOLTIP: Record<CrossViewSide, string> = {
	datos: "Ir a la vista de datos que produce este worker",
	worker: "Ir a la configuración del worker",
	flujo: "Ir al diagrama del flujo que este worker integra",
};

const CrossViewPair = ({ side, target, to, tooltip }: CrossViewPairProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	const otro: CrossViewSide = target ?? (side === "datos" ? "worker" : "datos");
	const label = (s: CrossViewSide) => DEFAULT_LABELS[s];
	const title = tooltip ?? DEFAULT_TOOLTIP[otro];

	const activoBg = isDark ? "#3A6FE0" : BRAND_BLUE;
	const hoverBg = alpha(BRAND_BLUE, isDark ? 0.16 : 0.1);
	const azul = isDark ? "#5B90FF" : BRAND_BLUE;

	const base = {
		display: "inline-flex",
		alignItems: "center",
		gap: 0.6,
		px: 1.1,
		py: 0.7,
		fontSize: "0.71rem",
		letterSpacing: "0.01em",
		lineHeight: 1,
		border: 0,
		whiteSpace: "nowrap",
		textDecoration: "none",
		transition: theme.transitions.create(["background-color", "color", "transform"], { duration: 180 }),
		"@media (prefers-reduced-motion: reduce)": { transition: "none" },
	} as const;

	const linkSx = {
		...base,
		fontWeight: 500,
		color: theme.palette.text.secondary,
		cursor: "pointer",
		"&:hover": { bgcolor: hoverBg, color: azul },
		"&:hover .cvl-arrow": { transform: "translateX(2px)" },
		"&:active": { transform: "translateY(1px)" },
		"&:focus-visible": { outline: `2px solid ${azul}`, outlineOffset: 2, borderRadius: 0.75 },
	};

	const flecha = (
		<Box
			className="cvl-arrow"
			component="span"
			sx={{
				display: "inline-flex",
				transition: theme.transitions.create("transform", { duration: 180 }),
				"@media (prefers-reduced-motion: reduce)": { transition: "none" },
			}}
		>
			<ArrowRight2 size={11} />
		</Box>
	);

	return (
		<Box
			component="nav"
			aria-label="Vistas del par datos y worker"
			sx={{
				display: "inline-flex",
				alignItems: "stretch",
				borderRadius: 0.75,
				overflow: "hidden",
				flexShrink: 0,
				border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.16 : 0.1)}`,
				bgcolor: alpha(theme.palette.text.primary, isDark ? 0.16 : 0.07),
			}}
		>
			<Box component="span" aria-current="page" sx={{ ...base, fontWeight: 600, bgcolor: activoBg, color: "#fff" }}>
				{label(side)}
			</Box>
			<Tooltip title={title}>
				<Box component={RouterLink} to={to} sx={linkSx}>
					{label(otro)}
					{flecha}
				</Box>
			</Tooltip>
		</Box>
	);
};

export default CrossViewPair;
