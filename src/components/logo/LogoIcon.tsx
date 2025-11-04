import React from "react";
// material-ui
//import { useTheme } from "@mui/material/styles";
import { Stack } from "@mui/material";
import logoIcon from "assets/images/logo.png";
/**
 * if you want to use image instead of <svg> uncomment following.
 *
 * import logoIconDark from 'assets/images/logo-icon-dark.svg';
 * import logoIcon from 'assets/images/logo-icon.svg';
 *
 */

// ==============================|| LOGO ICON SVG ||============================== //

const LogoIcon = () => {
	//const theme = useTheme();

	return (
		/**
		 * if you want to use image instead of svg uncomment following, and comment out <svg> element.
		 *
		 * <img src={theme.palette.mode === ThemeMode.DARK ? logoIconDark : logoIcon} alt="icon logo" width="100" />
		 *
		 */
		<>
			<Stack>
				<img src={logoIcon} width={45} alt="" />
			</Stack>
		</>
	);
};

export default LogoIcon;
