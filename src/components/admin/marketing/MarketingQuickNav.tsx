import React from "react";
import { Box, Button, ButtonGroup } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { People, Sms, DocumentText1, Component, Hierarchy, Chart } from "iconsax-react";

const MarketingQuickNav: React.FC = () => {
	const location = useLocation();

	const routes = [
		{
			path: "/admin/marketing/contacts",
			label: "Contactos",
			icon: <People size={18} />,
		},
		{
			path: "/admin/marketing/mailing",
			label: "Campañas",
			icon: <Sms size={18} />,
		},
		{
			path: "/admin/marketing/recorrido",
			label: "Recorrido",
			icon: <Hierarchy size={18} />,
		},
		{
			path: "/admin/marketing/resumen",
			label: "Resumen",
			icon: <Chart size={18} />,
		},
		{
			path: "/admin/marketing/coordinacion",
			label: "Coordinación",
			icon: <Hierarchy size={18} />,
		},
		{
			path: "/admin/marketing/templates",
			label: "Plantillas",
			icon: <DocumentText1 size={18} />,
		},
		{
			path: "/admin/marketing/modules",
			label: "Módulos",
			icon: <Component size={18} />,
		},
	];

	return (
		<Box sx={{ mb: 2 }}>
			<ButtonGroup variant="outlined" size="small" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
				{routes.map((route) => (
					<Button
						key={route.path}
						component={RouterLink}
						to={route.path}
						disabled={location.pathname === route.path}
						startIcon={route.icon}
						sx={{
							...(location.pathname === route.path && {
								bgcolor: "primary.main",
								color: "primary.contrastText",
								"&:hover": {
									bgcolor: "primary.dark",
								},
								"&.Mui-disabled": {
									bgcolor: "primary.main",
									color: "primary.contrastText",
								},
							}),
						}}
					>
						{route.label}
					</Button>
				))}
			</ButtonGroup>
		</Box>
	);
};

export default MarketingQuickNav;
