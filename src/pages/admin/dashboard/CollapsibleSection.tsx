import React, { useCallback, useEffect, useId, useState } from "react";
import { Box, Collapse, Typography, useMediaQuery, useTheme, alpha } from "@mui/material";
import { ArrowDown2 } from "iconsax-react";
import { BRAND_BLUE } from "themes/dashboardTokens";

// ----------------------------------------------------------------------
// Sección del dashboard que se puede plegar. En móvil arranca plegada salvo
// que se indique lo contrario (la página mide ~10 pantallas); el estado que
// elige el usuario se recuerda en localStorage por sección.
// ----------------------------------------------------------------------

const STORAGE_KEY = "la-admin-dashboard-sections";
export const OPEN_SECTION_EVENT = "la-dashboard-open-section";

const readStored = (): Record<string, boolean> => {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
	} catch {
		return {};
	}
};

const writeStored = (id: string, open: boolean) => {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readStored(), [id]: open }));
	} catch {
		// storage bloqueado: el estado queda solo en memoria
	}
};

interface CollapsibleSectionProps {
	/** Identificador estable: ancla de navegación y clave de persistencia. */
	id: string;
	title: string;
	subtitle?: string;
	icon: React.ReactNode;
	/** Abierta por defecto en móvil (por defecto: plegada). */
	defaultOpenMobile?: boolean;
	children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ id, title, subtitle, icon, defaultOpenMobile = false, children }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });
	const reactId = useId();
	const contentId = `${reactId}-content`;

	const [stored, setStored] = useState<boolean | undefined>(() => readStored()[id]);
	const open = stored ?? (isMobile ? defaultOpenMobile : true);

	const toggle = useCallback(() => {
		setStored(!open);
		writeStored(id, !open);
	}, [id, open]);

	// La barra de navegación abre la sección antes de hacer scroll hasta ella.
	useEffect(() => {
		const handler = (e: Event) => {
			if ((e as CustomEvent<string>).detail === id) setStored(true);
		};
		window.addEventListener(OPEN_SECTION_EVENT, handler);
		return () => window.removeEventListener(OPEN_SECTION_EVENT, handler);
	}, [id]);

	return (
		<Box id={`dash-${id}`} sx={{ scrollMarginTop: { xs: 72, sm: 88 } }}>
			<Box
				component="button"
				type="button"
				onClick={toggle}
				aria-expanded={open}
				aria-controls={contentId}
				sx={{
					all: "unset",
					boxSizing: "border-box",
					width: "100%",
					display: "flex",
					alignItems: "center",
					gap: { xs: 1, sm: 1.25 },
					minHeight: 44,
					mb: open ? { xs: 1, sm: 1.5 } : 0,
					cursor: "pointer",
					borderRadius: 1.5,
					px: 0.5,
					mx: -0.5,
					transition: "background-color 200ms ease",
					"&:hover": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.08 : 0.04) },
					"&:active": { bgcolor: alpha(BRAND_BLUE, isDark ? 0.14 : 0.08) },
					"&:focus-visible": { outline: `2px solid ${BRAND_BLUE}`, outlineOffset: 2 },
				}}
			>
				<Box
					sx={{
						width: 30,
						height: 30,
						borderRadius: 1,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						bgcolor: alpha(BRAND_BLUE, isDark ? 0.18 : 0.1),
						border: `1px solid ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
						color: BRAND_BLUE,
						"& > svg": { color: BRAND_BLUE },
					}}
				>
					{icon}
				</Box>
				<Box sx={{ minWidth: 0, flexGrow: 1 }}>
					<Typography
						variant="h4"
						fontWeight={600}
						sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem" }, letterSpacing: "-0.02em", textWrap: "balance" }}
					>
						{title}
					</Typography>
					{subtitle && (
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{
								fontSize: { xs: "0.75rem", sm: "0.875rem" },
								display: { xs: open ? "none" : "block", sm: "block" },
								textWrap: "pretty",
							}}
						>
							{subtitle}
						</Typography>
					)}
				</Box>
				<Box
					sx={{
						display: "flex",
						color: "text.secondary",
						transition: "transform 240ms ease",
						transform: open ? "rotate(180deg)" : "rotate(0deg)",
					}}
				>
					<ArrowDown2 size={18} />
				</Box>
			</Box>
			<Collapse in={open} timeout={240} id={contentId}>
				{children}
			</Collapse>
		</Box>
	);
};

export default CollapsibleSection;
