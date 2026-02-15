// material-ui
import { useTheme } from "@mui/material/styles";
import { Box } from "@mui/material";

// project-imports
import IconButton from "components/@extended/IconButton";
import useConfig from "hooks/useConfig";

// types
import { ThemeMode } from "types/config";

// assets
import { Moon, Sun1 } from "iconsax-react";

// ==============================|| HEADER CONTENT - THEME MODE TOGGLE ||============================== //

const ThemeModeToggle = () => {
	const theme = useTheme();
	const { mode, onChangeMode } = useConfig();

	const isDark = mode === ThemeMode.DARK;

	const handleToggle = () => {
		onChangeMode(isDark ? ThemeMode.LIGHT : ThemeMode.DARK);
	};

	const iconBackColor = theme.palette.mode === ThemeMode.DARK ? "background.default" : "secondary.100";

	return (
		<Box sx={{ flexShrink: 0, ml: 0.5 }}>
			<IconButton
				aria-label="toggle dark mode"
				onClick={handleToggle}
				color="secondary"
				variant="light"
				size="large"
				sx={{ color: "secondary.main", bgcolor: iconBackColor, p: 1 }}
			>
				{isDark ? <Sun1 variant="Bold" size={22} /> : <Moon variant="Bold" size={22} />}
			</IconButton>
		</Box>
	);
};

export default ThemeModeToggle;
