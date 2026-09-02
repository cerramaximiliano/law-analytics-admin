import { ReactNode } from "react";

// material-ui
import { ChipProps } from "@mui/material";

import { GenericCardProps } from "./root";

// ==============================|| TYPES - MENU  ||============================== //

export type NavItemType = {
	breadcrumbs?: boolean;
	caption?: ReactNode | string;
	children?: NavItemType[];
	elements?: NavItemType[];
	chip?: ChipProps;
	color?: "primary" | "secondary" | "default" | undefined;
	disabled?: boolean;
	external?: boolean;
	icon?: GenericCardProps["iconPrimary"] | string;
	/** Color del ícono del item (token del theme, p. ej. "success.main").
	 *  Para tríos de estado donde el color ES el significado. */
	iconColor?: string;
	/** Logo del organismo en vez de un ícono vectorial, para los ítems que
	 *  identifican una jurisdicción. Va sobre una pastilla clara porque casi
	 *  todos los escudos están pensados para fondo blanco. */
	iconImage?: string;
	id?: string;
	search?: string;
	target?: boolean;
	title?: ReactNode | string;
	type?: string;
	url?: string | undefined;
};

export type LinkTarget = "_blank" | "_self" | "_parent" | "_top";

export type MenuProps = {
	openItem: string[];
	openComponent: string;
	selectedID: string | null;
	drawerOpen: boolean;
	componentDrawerOpen: boolean;
	menu: NavItemType;
	error: null;
};
