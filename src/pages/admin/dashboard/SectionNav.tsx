import React, { useEffect, useState } from "react";
import { Box, ButtonBase, useTheme, alpha } from "@mui/material";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";
import { OPEN_SECTION_EVENT } from "./CollapsibleSection";

// ----------------------------------------------------------------------
// Barra de anclas pegada bajo el header: salta a una sección (abriéndola si
// está plegada) y resalta la que se está viendo. En móvil hace scroll
// horizontal sin barra visible.
// ----------------------------------------------------------------------

export interface SectionNavItem {
	id: string;
	label: string;
}

interface SectionNavProps {
	items: SectionNavItem[];
}

const SectionNav: React.FC<SectionNavProps> = ({ items }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [active, setActive] = useState<string>(items[0]?.id ?? "");

	// Sección activa = la última cuyo borde superior ya pasó la línea de lectura.
	useEffect(() => {
		let frame = 0;
		const update = () => {
			frame = 0;
			let current = items[0]?.id ?? "";
			for (const { id } of items) {
				const el = document.getElementById(`dash-${id}`);
				if (el && el.getBoundingClientRect().top <= 140) current = id;
			}
			setActive(current);
		};
		const onScroll = () => {
			if (!frame) frame = window.requestAnimationFrame(update);
		};
		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (frame) window.cancelAnimationFrame(frame);
		};
	}, [items]);

	const goTo = (id: string) => {
		window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: id }));
		// Esperar un frame a que la sección se abra antes de medir el destino.
		window.requestAnimationFrame(() => {
			document.getElementById(`dash-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
	};

	return (
		<Box
			component="nav"
			aria-label="Secciones del dashboard"
			sx={{
				position: "sticky",
				top: { xs: 56, sm: 64 },
				zIndex: 5,
				display: "flex",
				gap: 0.75,
				overflowX: "auto",
				py: 1,
				mb: { xs: 1.5, sm: 2.5 },
				mx: { xs: -2, sm: -1 },
				px: { xs: 2, sm: 1 },
				bgcolor: alpha(theme.palette.background.paper, isDark ? 0.92 : 0.9),
				backdropFilter: "blur(8px)",
				borderBottom: `1px solid ${headerBorder(isDark)}`,
				// indicio visual de que hay más chips a la derecha
				maskImage: { xs: "linear-gradient(to right, #000 calc(100% - 28px), transparent)", sm: "none" },
				scrollbarWidth: "none",
				"&::-webkit-scrollbar": { display: "none" },
			}}
		>
			{items.map((it) => {
				const isActive = it.id === active;
				return (
					<ButtonBase
						key={it.id}
						onClick={() => goTo(it.id)}
						aria-current={isActive ? "true" : undefined}
						sx={{
							flexShrink: 0,
							minHeight: { xs: 36, sm: 32 },
							px: 1.5,
							borderRadius: 1.5,
							fontSize: "0.8125rem",
							fontWeight: isActive ? 600 : 500,
							letterSpacing: "-0.005em",
							color: isActive ? BRAND_BLUE : theme.palette.text.secondary,
							bgcolor: isActive ? alpha(BRAND_BLUE, isDark ? 0.16 : 0.09) : "transparent",
							transition: "background-color 200ms ease, color 200ms ease, transform 120ms ease",
							"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.12 : 0.06) },
							"&:active": { transform: "scale(0.97)" },
							"&:focus-visible": { outline: `2px solid ${BRAND_BLUE}`, outlineOffset: 1 },
						}}
					>
						{it.label}
					</ButtonBase>
				);
			})}
		</Box>
	);
};

export default SectionNav;
