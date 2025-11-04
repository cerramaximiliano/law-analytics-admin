import React from "react";
import { CSSProperties, ReactElement, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// material-ui
import { useTheme } from "@mui/material/styles";
import { Divider, Grid, Typography, useMediaQuery } from "@mui/material";
import MuiBreadcrumbs from "@mui/material/Breadcrumbs";

// project-imports
import MainCard from "components/MainCard";
import { useBreadcrumb } from "contexts/BreadcrumbContext";

// assets
import { ArrowRight2, Buildings2, Home3 } from "iconsax-react";

// types
import { OverrideIcon } from "types/root";
import { NavItemType } from "types/menu";

// ==============================|| BREADCRUMBS ||============================== //

export interface BreadCrumbSxProps extends CSSProperties {
	mb?: string;
	bgcolor?: string;
}

interface Props {
	card?: boolean;
	divider?: boolean;
	icon?: boolean;
	icons?: boolean;
	maxItems?: number;
	navigation?: { items: NavItemType[] };
	rightAlign?: boolean;
	separator?: OverrideIcon;
	title?: boolean;
	titleBottom?: boolean;
	sx?: BreadCrumbSxProps;
}

const Breadcrumbs = ({
	card,
	divider = true,
	icon,
	icons,
	maxItems,
	navigation,
	rightAlign,
	separator,
	title,
	titleBottom,
	sx,
	...others
}: Props) => {
	const theme = useTheme();
	const location = useLocation();
	const breadcrumbContext = useBreadcrumb() as any;
	const customLabels = breadcrumbContext?.customLabels || {};
	const [main, setMain] = useState<NavItemType | undefined>();
	const [item, setItem] = useState<NavItemType>();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const isTablet = useMediaQuery(theme.breakpoints.down("md"));

	const iconSX = {
		marginRight: theme.spacing(0.75),
		marginTop: `-${theme.spacing(0.25)}`,
		width: "1rem",
		height: "1rem",
		color: theme.palette.secondary.main,
	};

	useEffect(() => {
		// Reiniciar estados al cambiar de ruta
		setMain(undefined);
		setItem(undefined);

		navigation?.items?.map((menu: NavItemType, index: number) => {
			if (menu.type && menu.type === "group") {
				getCollapse(menu as { children: NavItemType[]; type?: string });
			}
			return false;
		});
	}, [location.pathname, navigation]);

	let customLocation = location.pathname;

	// only used for component demo breadcrumbs
	if (customLocation.includes("/components-overview/breadcrumbs")) {
		customLocation = "/apps/kanban/board";
	}

	if (customLocation.includes("/apps/kanban/backlogs")) {
		customLocation = "/apps/kanban/board";
	}

	useEffect(() => {
		// Casos especiales donde necesitamos ajustar manualmente el estado
		if (customLocation.includes("/apps/profiles/user/payment")) {
			setItem(undefined);
		}

		// Para la página principal del dashboard, asegurarnos de mostrar correctamente el breadcrumb
		if (customLocation === "/dashboard/default") {
			// Buscar el ítem correspondiente a dashboard/default
			navigation?.items?.forEach((menu: NavItemType) => {
				if (menu.type === "group" && menu.id === "group-dashboard") {
					menu.children?.forEach((submenu: NavItemType) => {
						if (submenu.id === "dashboard" && submenu.children) {
							submenu.children.forEach((childItem: NavItemType) => {
								if (childItem.url === "/dashboard/default") {
									setMain(submenu);
									setItem(childItem);
								}
							});
						}
					});
				}
			});
		}
	}, [item, customLocation, navigation]);

	// set active item state
	const getCollapse = (menu: NavItemType) => {
		if (menu.children) {
			menu.children.filter((collapse: NavItemType) => {
				if (collapse.type && collapse.type === "collapse") {
					getCollapse(collapse as { children: NavItemType[]; type?: string });
					if (collapse.url === customLocation) {
						setMain(collapse);
						setItem(collapse);
					}
				} else if (collapse.type && collapse.type === "item") {
					if (customLocation === collapse.url) {
						setMain(menu);
						setItem(collapse);
					}
				}
				return false;
			});
		}
	};

	// item separator
	const SeparatorIcon = separator!;
	const separatorIcon = separator ? <SeparatorIcon size={12} /> : <ArrowRight2 size={12} />;

	let mainContent;
	let itemContent;
	let breadcrumbContent: ReactElement = <Typography />;
	let itemTitle: NavItemType["title"] = "";
	let CollapseIcon;
	let ItemIcon;

	// collapse item
	if (main && main.type === "collapse" && main.breadcrumbs === true) {
		CollapseIcon = main.icon ? main.icon : Buildings2;
		mainContent = (
			<Typography
				component={Link}
				to={document.location.pathname}
				variant="h6"
				sx={{ textDecoration: "none", display: "flex", alignItems: "center" }}
				color="secondary"
			>
				{icons && <CollapseIcon style={iconSX} />}
				{main.title}
			</Typography>
		);
		breadcrumbContent = (
			<MainCard
				border={card}
				sx={card === false ? { mb: 3, bgcolor: "transparent", ...sx } : { mb: 3, ...sx }}
				{...others}
				content={card}
				boxShadow={false}
			>
				<Grid
					container
					direction={rightAlign ? "row" : "column"}
					justifyContent={rightAlign ? "space-between" : "flex-start"}
					alignItems={rightAlign ? "center" : "flex-start"}
					spacing={0.5}
				>
					<Grid item>
						<MuiBreadcrumbs aria-label="breadcrumb" maxItems={maxItems || 8} separator={separatorIcon}>
							<Typography
								component={Link}
								to="/"
								variant="h6"
								sx={{ textDecoration: "none", display: "flex", alignItems: "center" }}
								color="textPrimary"
							>
								{icons && <Home3 style={iconSX} />}
								{icon && !icons && <Home3 variant="Bold" style={{ ...iconSX, marginRight: 0 }} />}
								{(!icon || icons) && "Home"}
							</Typography>
							{mainContent}
						</MuiBreadcrumbs>
					</Grid>
					{title && titleBottom && (
						<Grid item sx={{ mt: card === false ? 0 : 1, width: "100%", overflow: "hidden" }}>
							<Typography
								variant={isMobile ? "h4" : isTablet ? "h3" : "h2"}
								sx={{
									fontWeight: 700,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									width: "100%",
									display: "block",
									fontSize: isMobile ? "1.125rem" : isTablet ? "1.5rem" : undefined,
								}}
								title={typeof itemTitle === "string" ? itemTitle : ""}
							>
								{itemTitle}
							</Typography>
						</Grid>
					)}
				</Grid>
				{card === false && divider !== false && <Divider sx={{ mt: 2 }} />}
			</MainCard>
		);
	}

	// items
	if (item && item.type === "item") {
		// Use custom label if available, otherwise use item title
		const pathWithoutPrefix = location.pathname.startsWith("/") ? location.pathname.substring(1) : location.pathname;
		itemTitle = customLabels[pathWithoutPrefix] || item.title;

		ItemIcon = item.icon ? item.icon : Buildings2;
		const itemTitleText = typeof itemTitle === "string" ? itemTitle : ""; // Convert to string for title prop
		itemContent = (
			<Typography
				variant="h6"
				component="div"
				sx={{
					display: "flex",
					alignItems: "center",
					color: theme.palette.secondary.main,
					fontSize: isMobile ? "0.75rem" : isTablet ? "0.8125rem" : "0.875rem",
					fontWeight: theme.typography.h6.fontWeight,
					maxWidth: { xs: "150px", sm: "250px", md: "350px", lg: "450px" },
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
				title={itemTitleText}
			>
				{icons && <ItemIcon style={{ ...iconSX, flexShrink: 0 }} />}
				{itemTitle}
			</Typography>
		);
	} else if (location.pathname.includes("/apps/folders/details/")) {
		// Special handling for folder details page when item is not found in menu
		const pathWithoutPrefix = location.pathname.startsWith("/") ? location.pathname.substring(1) : location.pathname;
		itemTitle = customLabels[pathWithoutPrefix] || "\u00A0"; // Use non-breaking space as fallback
		const titleText = typeof itemTitle === "string" ? itemTitle : ""; // Convert to string for title prop
		itemContent = (
			<Typography
				variant="h6"
				component="span"
				sx={{
					display: "inline-block",
					maxWidth: { xs: "150px", sm: "250px", md: "350px", lg: "450px" },
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					color: theme.palette.secondary.main,
					fontSize: isMobile ? "0.75rem" : isTablet ? "0.8125rem" : "0.875rem",
					fontFamily: theme.typography.fontFamily,
					fontWeight: theme.typography.h6.fontWeight,
					lineHeight: 1.5,
				}}
				title={titleText}
			>
				{itemTitle}
			</Typography>
		);
	}

	// main
	if ((item && item.type === "item" && item.breadcrumbs !== false) || location.pathname.includes("/apps/folders/details/")) {
		breadcrumbContent = (
			<MainCard
				border={card}
				sx={card === false ? { mb: 3, bgcolor: "transparent", ...sx } : { mb: 3, ...sx }}
				{...others}
				content={card}
				boxShadow={false}
			>
				<Grid
					container
					direction={rightAlign ? "row" : "column"}
					justifyContent={rightAlign ? "space-between" : "flex-start"}
					alignItems={rightAlign ? "center" : "flex-start"}
					spacing={0.5}
				>
					{title && !titleBottom && (
						<Grid item sx={{ maxWidth: "100%", overflow: "hidden" }}>
							<Typography
								variant={isMobile ? "h4" : isTablet ? "h3" : "h2"}
								sx={{
									fontWeight: 700,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									fontSize: isMobile ? "1.125rem" : isTablet ? "1.5rem" : undefined,
								}}
								title={typeof itemTitle === "string" ? itemTitle : ""}
							>
								{itemTitle}
							</Typography>
						</Grid>
					)}
					<Grid
						item
						sx={{
							flex: 1,
							minWidth: 0, // Importante para que funcione el text-overflow
							overflow: "hidden",
						}}
					>
						<MuiBreadcrumbs
							aria-label="breadcrumb"
							maxItems={maxItems || 8}
							separator={separatorIcon}
							sx={{
								"& .MuiBreadcrumbs-ol": {
									flexWrap: "nowrap",
									overflow: "hidden",
								},
								"& .MuiBreadcrumbs-li": {
									overflow: "hidden",
								},
							}}
						>
							<Typography
								component={Link}
								to="/dashboard/default"
								color="textPrimary"
								variant="h6"
								sx={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
							>
								{icons && <Home3 style={iconSX} />}
								{icon && !icons && <Home3 variant="Bold" style={{ ...iconSX, marginRight: 0 }} />}
								{(!icon || icons) && "Home"}
							</Typography>

							{/* Custom breadcrumb paths */}
							{location.pathname.includes("/apps/folders/details/") ? (
								<Typography
									component={Link}
									to="/apps/folders/list"
									variant="h6"
									sx={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
									color="secondary"
								>
									Causas
								</Typography>
							) : location.pathname.includes("/calculator/") || location.pathname.includes("/apps/calc") ? (
								<Typography
									component={location.pathname === "/apps/calc" ? "span" : Link}
									to={location.pathname === "/apps/calc" ? undefined : "/apps/calc"}
									variant="h6"
									sx={{ textDecoration: "none", display: "flex", alignItems: "center" }}
									color="secondary"
								>
									Cálculos
								</Typography>
							) : location.pathname.includes("/apps/calendar") ? (
								<Typography
									component={location.pathname === "/apps/calendar" ? "span" : Link}
									to="/apps/calendar"
									variant="h6"
									sx={{ textDecoration: "none", display: "flex", alignItems: "center" }}
									color="secondary"
								>
									Calendario
								</Typography>
							) : location.pathname === "/dashboard/default" ? (
								<Typography
									component="span"
									variant="h6"
									sx={{ textDecoration: "none", display: "flex", alignItems: "center" }}
									color="secondary"
								>
									Inicio
								</Typography>
							) : (
								mainContent
							)}

							{/* Solo mostrar itemContent si no estamos en la raíz de calculadoras o en la página principal */}
							{location.pathname === "/apps/calc" || location.pathname === "/dashboard/default" ? null : itemContent}
						</MuiBreadcrumbs>
					</Grid>
					{title && titleBottom && (
						<Grid item sx={{ mt: card === false ? 0 : 1, width: "100%", overflow: "hidden" }}>
							<Typography
								variant={isMobile ? "h4" : isTablet ? "h3" : "h2"}
								sx={{
									fontWeight: 700,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									width: "100%",
									display: "block",
									fontSize: isMobile ? "1.125rem" : isTablet ? "1.5rem" : undefined,
								}}
								title={typeof itemTitle === "string" ? itemTitle : ""}
							>
								{itemTitle}
							</Typography>
						</Grid>
					)}
				</Grid>
				{card === false && divider !== false && <Divider sx={{ mt: 2 }} />}
			</MainCard>
		);
	}

	return breadcrumbContent;
};

export default Breadcrumbs;
