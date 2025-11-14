import React from "react";
import { Box, Button, ButtonGroup } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { People, Sms, DocumentText1 } from "iconsax-react";

const MarketingQuickNav: React.FC = () => {
	const navigate = useNavigate();
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
			path: "/admin/marketing/templates",
			label: "Plantillas",
			icon: <DocumentText1 size={18} />,
		},
	];

	return (
		<Box sx={{ mb: 2 }}>
			<ButtonGroup variant="outlined" size="small" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
				{routes.map((route) => (
					<Button
						key={route.path}
						onClick={() => navigate(route.path)}
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
