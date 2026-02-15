// material-ui
import { Theme } from "@mui/material/styles";
import { Box, useMediaQuery } from "@mui/material";

// project-imports
import Profile from "./Profile";
import MobileSection from "./MobileSection";
import ThemeModeToggle from "./ThemeModeToggle";

// ==============================|| HEADER - CONTENT ||============================== //

const HeaderContent = () => {
	const downLG = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

	return (
		<>
			<Box sx={{ width: "100%", ml: 1 }} />
			<ThemeModeToggle />
			{!downLG && <Profile />}
			{downLG && <MobileSection />}
		</>
	);
};

export default HeaderContent;
