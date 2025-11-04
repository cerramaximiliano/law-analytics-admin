import { useEffect } from "react";
import { Outlet } from "react-router-dom";

// material-ui
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Toolbar } from "@mui/material";

// project-imports
import Drawer from "./Drawer";
import Header from "./Header";
import Footer from "./Footer";
import Breadcrumbs from "components/@extended/Breadcrumbs";

import { DRAWER_WIDTH } from "config";
import navigation from "menu-items";
import useConfig from "hooks/useConfig";
import { dispatch } from "store";
import { openDrawer } from "store/reducers/menu";

// ==============================|| MAIN LAYOUT ||============================== //

const MainLayout = () => {
	const theme = useTheme();
	const downXL = useMediaQuery(theme.breakpoints.down("xl"));

	const { container, miniDrawer } = useConfig();

	// set media wise responsive drawer
	useEffect(() => {
		if (!miniDrawer) {
			dispatch(openDrawer(!downXL));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [downXL]);

	return (
		<Box sx={{ display: "flex", width: "100%" }}>
			<Header />
			<Drawer />

			<Box component="main" sx={{ width: `calc(100% - ${DRAWER_WIDTH}px)`, flexGrow: 1, p: { xs: 2, md: 3 } }}>
				<Toolbar />
				<Container
					maxWidth={container ? "xl" : false}
					sx={{
						xs: 0,
						...(container && { px: { xs: 0, md: 2 } }),
						position: "relative",
						minHeight: "calc(100vh - 110px)",
						display: "flex",
						flexDirection: "column",
					}}
				>
					<Breadcrumbs navigation={navigation} title titleBottom card={false} divider={false} />
					<Outlet />
					<Footer />
				</Container>
			</Box>
		</Box>
	);
};

export default MainLayout;
