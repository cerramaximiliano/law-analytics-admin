import React from "react";
import { Box, Tab, Tabs, useTheme, alpha } from "@mui/material";
import { BRAND_BLUE, headerBorder, navHoverBg } from "themes/dashboardTokens";

export interface SubTabDef {
	label: string;
	icon?: React.ReactNode;
	/** Texto del tooltip: lo que antes era el subtítulo bajo el label. */
	hint?: string;
}

interface WorkerSubTabsProps {
	value: number;
	onChange: (next: number) => void;
	tabs: SubTabDef[];
	"aria-label"?: string;
}

/**
 * Sub-navegación de un worker. Es horizontal a propósito: el nivel 1 (la lista
 * de workers) ya es un rail vertical, así que un segundo rail al lado leería
 * como dos navegaciones del mismo rango y se comería el ancho del contenido.
 *
 * El subtítulo de cada tab pasa a tooltip — apilado bajo el label engordaba la
 * barra sin agregar información que se lea de un vistazo.
 */
const WorkerSubTabs: React.FC<WorkerSubTabsProps> = ({ value, onChange, tabs, ...rest }) => {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";

	return (
		<Box sx={{ borderBottom: `1px solid ${headerBorder(isDark)}`, bgcolor: alpha(BRAND_BLUE, isDark ? 0.02 : 0.012) }}>
			<Tabs
				value={value}
				onChange={(_, v) => onChange(v)}
				variant="scrollable"
				scrollButtons="auto"
				allowScrollButtonsMobile
				aria-label={rest["aria-label"]}
				TabIndicatorProps={{ sx: { backgroundColor: BRAND_BLUE, height: 2.5 } }}
				sx={{
					px: { xs: 1, md: 2 },
					minHeight: 48,
					"& .MuiTab-root": {
						minHeight: 48,
						textTransform: "none",
						fontSize: "0.875rem",
						fontWeight: 500,
						px: 1.75,
						transition: "background-color 200ms ease, color 200ms ease",
						"&:hover": { bgcolor: navHoverBg(isDark) },
						"&:focus-visible": { outline: `2px solid ${alpha(BRAND_BLUE, 0.6)}`, outlineOffset: -2 },
					},
					"& .MuiTab-root.Mui-selected": { color: BRAND_BLUE, fontWeight: 600 },
				}}
			>
				{tabs.map((tab, i) => (
					<Tab key={i} icon={tab.icon as any} iconPosition="start" label={tab.label} title={tab.hint} />
				))}
			</Tabs>
		</Box>
	);
};

export default WorkerSubTabs;
