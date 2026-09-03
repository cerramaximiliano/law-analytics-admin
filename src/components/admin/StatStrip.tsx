import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, ButtonBase, IconButton, Tooltip, Typography, alpha, useTheme } from "@mui/material";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import { BRAND_BLUE, navActiveBg, navActiveBorder, navHoverBg } from "themes/dashboardTokens";

/**
 * Contadores filtrables en una sola línea, con navegación horizontal.
 *
 * Nace de un problema concreto: el historial de rangos abría con una grilla de
 * 30 tarjetas (los 29 fueros más "Todos") a cinco por fila. Seis filas de
 * contadores antes de la tabla en desktop y quince en mobile: había que
 * scrollear toda la cabecera para llegar al dato que se venía a mirar, y la
 * mayoría de esas tarjetas marcaba cero.
 *
 * La respuesta no es achicar las tarjetas sino cambiar el eje. Los contadores
 * son un filtro, no un tablero: se leen de a uno y se usan de a uno. Puestos en
 * una tira horizontal ocupan una fila fija sin importar cuántos sean —diez o
 * cincuenta— y la tabla queda siempre a la misma altura.
 *
 * Tres decisiones que hacen que la tira funcione como filtro:
 *
 * - **"Todos" queda fijo a la izquierda.** Es el reset, y el reset no se busca
 *   scrolleando. Se pega con `position: sticky` sobre el propio scroller, así
 *   que sigue ahí con la tira corrida hasta el final.
 * - **Los que tienen datos van primero** (`sortByCount`). Con 29 fueros y un
 *   puñado activo, el orden del catálogo escondía lo único que importaba
 *   detrás de veinte ceros. Los ceros van al final y en gris: siguen estando
 *   —dicen "acá no hay nada", que es información— pero no compiten.
 * - **Las flechas sólo aparecen si hay desborde**, y se apagan en cada punta.
 *   Si entra todo, la tira se lee como una fila común y no anuncia un gesto
 *   que no hace falta.
 *
 * El scroll horizontal nativo sigue funcionando (trackpad, shift+rueda, touch);
 * las flechas están para el mouse sin gestos, que es el caso que el scroll
 * horizontal siempre deja afuera.
 */

export interface StatStripItem {
	/** Clave del filtro. */
	value: string;
	label: string;
	count: number;
	/** Qué significa este contador. Opcional. */
	hint?: string;
}

export interface StatStripProps {
	items: StatStripItem[];
	/** Valor activo; `""` es "Todos". */
	selected: string;
	/** Recibe `""` cuando se elige "Todos" o se deselecciona el activo. */
	onSelect: (value: string) => void;
	/** Etiqueta del reset. */
	allLabel?: string;
	/** Total del reset. Por defecto, la suma de los ítems. */
	allCount?: number;
	/** Ordena por conteo descendente y manda los ceros al final. */
	sortByCount?: boolean;
	/** Para el lector de pantalla: qué agrupa esta tira. */
	ariaLabel?: string;
}

/** Cuánto corre cada flecha: casi un ancho visible, dejando un ítem de solape. */
const SCROLL_RATIO = 0.8;

export default function StatStrip({
	items,
	selected,
	onSelect,
	allLabel = "Todos",
	allCount,
	sortByCount = true,
	ariaLabel = "Filtrar por categoría",
}: StatStripProps) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const scroller = useRef<HTMLDivElement | null>(null);
	const [overflow, setOverflow] = useState(false);
	const [atStart, setAtStart] = useState(true);
	const [atEnd, setAtEnd] = useState(false);

	const total = allCount ?? items.reduce((a, i) => a + i.count, 0);

	// El orden se recalcula sólo cuando cambian los conteos: reordenar bajo el
	// cursor mientras alguien elige un fuero sería desconcertante.
	const ordered = useMemo(() => {
		if (!sortByCount) return items;
		return [...items].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"));
	}, [items, sortByCount]);

	const measure = useCallback(() => {
		const el = scroller.current;
		if (!el) return;
		// 2px de tolerancia: los anchos fraccionarios del layout hacen que
		// scrollLeft nunca llegue exacto al máximo.
		const max = el.scrollWidth - el.clientWidth;
		setOverflow(max > 2);
		setAtStart(el.scrollLeft <= 2);
		setAtEnd(el.scrollLeft >= max - 2);
	}, []);

	useEffect(() => {
		measure();
		const el = scroller.current;
		if (!el) return;
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [measure, ordered]);

	const scrollBy = (dir: 1 | -1) => {
		const el = scroller.current;
		if (!el) return;
		el.scrollBy({ left: dir * el.clientWidth * SCROLL_RATIO, behavior: "smooth" });
	};

	const arrow = (dir: 1 | -1, disabled: boolean) => (
		<IconButton
			size="small"
			aria-label={dir === -1 ? "Ver anteriores" : "Ver siguientes"}
			onClick={() => scrollBy(dir)}
			disabled={disabled}
			sx={{ flexShrink: 0, width: 28, height: 28, color: "text.secondary" }}
		>
			{dir === -1 ? <ArrowLeft2 size={16} /> : <ArrowRight2 size={16} />}
		</IconButton>
	);

	const card = (value: string, label: string, count: number, hint?: string, sticky?: boolean) => {
		const active = selected === value;
		const empty = count === 0 && !active;
		const button = (
			<ButtonBase
				focusRipple
				aria-pressed={active}
				onClick={() => onSelect(active && value !== "" ? "" : value)}
				sx={{
					flexShrink: 0,
					minWidth: 96,
					px: 1.25,
					py: 0.75,
					borderRadius: 1,
					border: "1px solid",
					borderColor: active ? navActiveBorder(isDark) : "divider",
					bgcolor: active ? navActiveBg(isDark) : "background.paper",
					flexDirection: "column",
					alignItems: "flex-start",
					justifyContent: "center",
					scrollSnapAlign: "start",
					transition: theme.transitions.create(["background-color", "border-color"], { duration: 150 }),
					"&:hover": { bgcolor: active ? navActiveBg(isDark) : navHoverBg(isDark) },
					// El reset viaja con el scroller: se busca a ciegas, no scrolleando.
					...(sticky && {
						position: "sticky",
						left: 0,
						zIndex: 1,
						// Sin fondo opaco propio las tarjetas pasarían por debajo.
						bgcolor: active ? theme.palette.background.paper : "background.paper",
						boxShadow: `6px 0 6px -6px ${alpha(theme.palette.common.black, isDark ? 0.5 : 0.12)}`,
						...(active && { bgcolor: navActiveBg(isDark) }),
					}),
				}}
			>
				<Typography variant="caption" noWrap sx={{ color: empty ? "text.disabled" : "text.secondary", lineHeight: 1.3, maxWidth: 140 }}>
					{label}
				</Typography>
				<Typography
					sx={{
						fontSize: "1.05rem",
						fontWeight: 600,
						lineHeight: 1.2,
						fontVariantNumeric: "tabular-nums",
						letterSpacing: "-0.02em",
						color: active ? BRAND_BLUE : empty ? "text.disabled" : "text.primary",
					}}
				>
					{count}
				</Typography>
			</ButtonBase>
		);
		return hint ? (
			<Tooltip key={value} title={hint} arrow>
				{button}
			</Tooltip>
		) : (
			<Box key={value} sx={{ display: "contents" }}>
				{button}
			</Box>
		);
	};

	return (
		<Box role="group" aria-label={ariaLabel} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
			{overflow && arrow(-1, atStart)}
			<Box
				ref={scroller}
				onScroll={measure}
				sx={{
					display: "flex",
					gap: 1,
					flex: 1,
					minWidth: 0,
					overflowX: "auto",
					scrollSnapType: "x proximity",
					// Sin padding vertical el focus ring y el borde quedan cortados.
					py: 0.25,
					// La barra nativa duplicaría la señal que ya dan las flechas y
					// el degradado, y en Windows se come 15px de alto.
					scrollbarWidth: "none",
					"&::-webkit-scrollbar": { display: "none" },
					// Degradado en la punta con más contenido: dice "sigue" sin ocupar lugar.
					maskImage: overflow && !atEnd ? "linear-gradient(to right, #000 calc(100% - 32px), transparent 100%)" : undefined,
				}}
			>
				{card("", allLabel, total, undefined, true)}
				{ordered.map((i) => card(i.value, i.label, i.count, i.hint))}
			</Box>
			{overflow && arrow(1, atEnd)}
		</Box>
	);
}
