// material-ui
import { Theme } from "@mui/material/styles";
import { Box, useMediaQuery } from "@mui/material";

// project-imports
import Profile from "./Profile";
import MobileSection from "./MobileSection";

// ==============================|| HEADER - CONTENT ||============================== //

const HeaderContent = () => {
	const downLG = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

	return (
		<>
			<Box sx={{ width: "100%", ml: 1 }} />
			{!downLG && <Profile />}
			{downLG && <MobileSection />}
		</>
	);
};

export default HeaderContent;
