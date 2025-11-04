import { useEffect, useState } from "react";

// material-ui
import { Box, Typography, Skeleton, Stack } from "@mui/material";

// project-imports
import NavGroup from "./NavGroup";
import menuItems from "menu-items";
import useAuth from "hooks/useAuth";

import { useSelector } from "store";

// types
import { NavItemType } from "types/menu";

// ==============================|| DRAWER CONTENT - NAVIGATION ||============================== //

const Navigation = () => {
	const { drawerOpen } = useSelector((state) => state.menu);

	const [selectedItems, setSelectedItems] = useState<string | undefined>("");
	const [selectedLevel, setSelectedLevel] = useState<number>(0);
	const [filteredMenuItems, setFilteredMenuItems] = useState<{ items: NavItemType[] }>({ items: [] });
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const { user } = useAuth();
	// TEMPORAL: Permitir acceso a todos los usuarios logueados durante desarrollo
	// TODO: Restaurar verificación cuando el backend asigne ADMIN_ROLE correctamente
	// const isAdmin = user?.role === "ADMIN_ROLE";
	const isAdmin = !!user; // Temporal: cualquier usuario logueado puede ver el menú

	useEffect(() => {
		handlerMenuItem();
		// eslint-disable-next-line
	}, [user]);

	const handlerMenuItem = () => {
		setIsLoading(true);
		// Only show menu items if user is admin
		const menuItemsClone = {
			items: isAdmin ? [...menuItems.items] : [],
		};

		setFilteredMenuItems(menuItemsClone);
		setIsLoading(false);
	};

	const navGroups = filteredMenuItems.items.map((item) => {
		switch (item.type) {
			case "group":
				return (
					<NavGroup
						key={item.id}
						setSelectedItems={setSelectedItems}
						setSelectedLevel={setSelectedLevel}
						selectedLevel={selectedLevel}
						selectedItems={selectedItems}
						lastItem={0}
						remItems={[]}
						lastItemId=""
						item={item}
					/>
				);
			default:
				return (
					<Typography key={item.id} variant="h6" color="error" align="center">
						Fix - Navigation Group
					</Typography>
				);
		}
	});

	// Mostrar skeleton mientras carga
	if (isLoading) {
		return (
			<Box
				sx={{
					pt: drawerOpen ? 2 : 0,
					px: 2,
				}}
			>
				<Stack spacing={1}>
					{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
						<Stack key={item} direction="row" alignItems="center" spacing={1.5} sx={{ py: 0.75 }}>
							<Skeleton variant="circular" width={20} height={20} animation="wave" />
							<Skeleton variant="rounded" height={20} sx={{ flex: 1 }} animation="wave" />
						</Stack>
					))}
				</Stack>
			</Box>
		);
	}

	return (
		<Box
			sx={{
				pt: drawerOpen ? 2 : 0,
				"& > ul:first-of-type": { mt: 0 },
			}}
		>
			{navGroups}
		</Box>
	);
};

export default Navigation;
