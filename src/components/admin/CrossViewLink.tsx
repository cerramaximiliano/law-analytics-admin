import { Box, Tooltip, alpha, useTheme } from "@mui/material";
import { ArrowRight2 } from "iconsax-react";
import { Link as RouterLink } from "react-router-dom";
import { BRAND_BLUE } from "themes/dashboardTokens";

/**
 * Las vistas emparejadas de un mismo asunto, como control segmentado.
 *
 * En el admin un mismo asunto se mira desde tres lados: los **datos** que se
 * capturaron, el **worker** que los captura y el **flujo** que explica el
 * pipeline entero. Casi toda vista es uno de esos tres y tiene al menos otro
 * del que depende, pero antes cada una resolvía el salto por su cuenta —tres
 * etiquetas distintas, tres íconos, tres ubicaciones— y ninguna decía de qué
 * lado estabas parado.
 *
 * Este control muestra los lados que existen para ese asunto y marca el
 * actual. Deja de ser un link suelto y pasa a ser orientación: en vez de
 * ofrecerte un salto, te dice que estas vistas son un conjunto y en cuál
 * estás. Como el patrón se repite en todo el admin, la lección se enseña una
 * vez y después se lee sola.
 *
 * El orden es siempre datos → worker → flujo, que es el del propio pipeline:
 * los datos salen de un worker, y el worker es una pieza de un flujo. Un orden
 * fijo hace que la posición del segmento activo ya te ubique.
 *
 * Detalles que lo hacen encajar en la franja de contexto, donde vive:
 *
 * - Toma el radio (6px) y el fondo tintado de los `monoChip` vecinos, en vez
 *   del radio 12px y el borde de un Button MUI. En esta interfaz el borde
 *   grueso significa "esto ejecuta algo", y navegar no ejecuta nada.
 * - El lado activo va sólido y no es clickeable; los otros son los links.
 * - Sin íconos: "Datos", "Worker" y "Flujo" ya nombran el destino.
 *
 * El control es el mismo en todos los breakpoints. Colapsarlo en pantallas
 * chicas sólo lograba que se leyera distinto según el dispositivo, que es
 * justo lo que viene a evitar; cuando el encabezado se queda sin lugar, el
 * CardHeader del MainCard ya baja las acciones a su propia fila.
 *
 * Las etiquetas no se pueden personalizar, por lo mismo: el conjunto se lee
 * igual en todo el admin.
 */

export type CrossViewSide = "datos" | "worker" | "flujo";

export interface CrossViewLinksProps {
	/** En cuál de las tres vistas estás parado. */
	current: CrossViewSide;
	/** Las otras que existen para este asunto, con su ruta. */
	to: Partial<Record<CrossViewSide, string>>;
	/** Qué vas a encontrar de cada lado. Opcional; hay uno por defecto. */
	tooltips?: Partial<Record<CrossViewSide, string>>;
}

/** datos → worker → flujo: el orden del pipeline, fijo en todo el admin. */
const ORDEN: readonly CrossViewSide[] = ["datos", "worker", "flujo"];

const LABELS: Record<CrossViewSide, string> = { datos: "Datos", worker: "Worker", flujo: "Flujo" };

const TOOLTIPS: Record<CrossViewSide, string> = {
	datos: "Ir a la vista de datos de este worker",
	worker: "Ir a la configuración del worker",
	flujo: "Ir al diagrama del flujo que explica este pipeline",
};

const CrossViewLinks = ({ current, to, tooltips }: CrossViewLinksProps) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

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

	// Los lados que existen para este asunto, en el orden del pipeline.
	const lados = ORDEN.filter((s) => s === current || to[s]);
	if (lados.length < 2) return null;

	return (
		<Box
			component="nav"
			aria-label="Vistas relacionadas: datos, worker y flujo"
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
			{lados.map((lado) =>
				lado === current ? (
					<Box key={lado} component="span" aria-current="page" sx={{ ...base, fontWeight: 600, bgcolor: activoBg, color: "#fff" }}>
						{LABELS[lado]}
					</Box>
				) : (
					<Tooltip key={lado} title={tooltips?.[lado] ?? TOOLTIPS[lado]}>
						<Box
							component={RouterLink}
							to={to[lado]!}
							sx={{
								...base,
								fontWeight: 500,
								color: theme.palette.text.secondary,
								cursor: "pointer",
								"&:hover": { bgcolor: hoverBg, color: azul },
								"&:hover .cvl-arrow": { transform: "translateX(2px)" },
								"&:active": { transform: "translateY(1px)" },
								"&:focus-visible": { outline: `2px solid ${azul}`, outlineOffset: 2, borderRadius: 0.75 },
							}}
						>
							{LABELS[lado]}
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
						</Box>
					</Tooltip>
				),
			)}
		</Box>
	);
};

export default CrossViewLinks;
