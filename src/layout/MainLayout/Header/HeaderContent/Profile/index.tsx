import React from "react";
import { useRef, useState, ReactNode, SyntheticEvent } from "react";
import { useNavigate } from "react-router";

// material-ui
import { useTheme } from "@mui/material/styles";
import { Box, ButtonBase, CardContent, ClickAwayListener, Grid, Paper, Popper, Stack, Tab, Tabs, Tooltip, Typography } from "@mui/material";

// project-imports
import ProfileTab from "./ProfileTab";
import SettingTab from "./SettingTab";
import Avatar from "components/@extended/Avatar";
import MainCard from "components/MainCard";
import Transitions from "components/@extended/Transitions";
import IconButton from "components/@extended/IconButton";
import useAuth from "hooks/useAuth";

// assets
import { Profile, Logout } from "iconsax-react";

// types
import { ThemeMode } from "types/config";
import { useSelector } from "store";
import { AuthProps } from "types/auth";

// types
interface TabPanelProps {
	children?: ReactNode;
	dir?: string;
	index: number;
	value: number;
}

// tab panel wrapper
function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<Box
			role="tabpanel"
			hidden={value !== index}
			id={`profile-tabpanel-${index}`}
			aria-labelledby={`profile-tab-${index}`}
			{...other}
			sx={{ p: 1 }}
		>
			{value === index && children}
		</Box>
	);
}

function a11yProps(index: number) {
	return {
		id: `profile-tab-${index}`,
		"aria-controls": `profile-tabpanel-${index}`,
	};
}

// ==============================|| HEADER CONTENT - PROFILE ||============================== //

const ProfilePage = () => {
	const theme = useTheme();
	const navigate = useNavigate();

	const { logout } = useAuth();

	const authState = useSelector((state: { auth: AuthProps }) => state.auth);

	const handleLogout = async () => {
		try {
			await logout();
			navigate(`/login`, {
				state: {
					from: "",
				},
			});
		} catch (err) {}
	};

	const anchorRef = useRef<any>(null);
	const [open, setOpen] = useState(false);
	const handleToggle = () => {
		setOpen((prevOpen) => !prevOpen);
	};

	const handleClose = (event: MouseEvent | TouchEvent) => {
		if (anchorRef.current && anchorRef.current.contains(event.target)) {
			return;
		}
		setOpen(false);
	};

	const [value, setValue] = useState(0);

	const handleChange = (event: SyntheticEvent, newValue: number) => {
		setValue(newValue);
	};

	return (
		<Box sx={{ flexShrink: 0, ml: 0.75 }}>
			<ButtonBase
				sx={{
					p: 0.25,
					borderRadius: 1,
					"&:hover": {
						bgcolor: theme.palette.mode === ThemeMode.DARK ? "secondary.light" : "secondary.lighter",
					},
					"&:focus-visible": {
						outline: `2px solid ${theme.palette.secondary.dark}`,
						outlineOffset: 2,
					},
				}}
				aria-label="open profile"
				ref={anchorRef}
				aria-controls={open ? "profile-grow" : undefined}
				aria-haspopup="true"
				onClick={handleToggle}
			>
				{authState.user?.picture ? (
					// Si hay una imagen de perfil, úsala
					<Avatar alt="profile user" src={authState.user.picture} />
				) : authState.user?.name ? (
					// Si no hay imagen de perfil pero existe el nombre, usa la primera letra del nombre
					<Avatar color="error" type="filled" alt="profile user" size="sm">
						{authState.user.name.charAt(0).toUpperCase()}
					</Avatar>
				) : (
					// Si no hay imagen ni nombre, renderiza el componente <Profile />
					<Avatar alt="profile user" size="sm" type="filled">
						<Profile />
					</Avatar>
				)}
			</ButtonBase>
			<Popper
				placement="bottom-end"
				open={open}
				anchorEl={anchorRef.current}
				role={undefined}
				transition
				disablePortal
				popperOptions={{
					modifiers: [
						{
							name: "offset",
							options: {
								offset: [0, 9],
							},
						},
					],
				}}
			>
				{({ TransitionProps }) => (
					<Transitions type="grow" position="top-right" in={open} {...TransitionProps}>
						<Paper
							sx={{
								boxShadow: theme.customShadows.z1,
								width: 290,
								minWidth: 240,
								maxWidth: 290,
								[theme.breakpoints.down("md")]: {
									maxWidth: 250,
								},
								borderRadius: 1.5,
							}}
						>
							<ClickAwayListener onClickAway={handleClose}>
								<MainCard border={false} content={false}>
									<CardContent sx={{ px: 2.5, pt: 3 }}>
										<Grid container justifyContent="space-between" alignItems="center">
											<Grid item>
												<Stack direction="row" spacing={1.25} alignItems="center">
													{authState.user?.picture ? (
														// Si hay una imagen de perfil, úsala
														<Avatar alt="profile user" src={authState.user.picture} />
													) : authState.user?.name ? (
														// Si no hay imagen de perfil pero existe el nombre, usa la primera letra del nombre
														<Avatar color="error" type="filled" alt="profile user" size="sm">
															{authState.user.name.charAt(0).toUpperCase()}
														</Avatar>
													) : (
														// Si no hay imagen ni nombre, renderiza el componente <Profile />
														<Avatar alt="profile user" size="sm" type="filled">
															<Profile />
														</Avatar>
													)}

													<Stack>
														<Typography variant="subtitle1">{authState.user?.name || ""}</Typography>
														<Typography variant="body2" color="secondary">
															Usuario
														</Typography>
													</Stack>
												</Stack>
											</Grid>
											<Grid item>
												<Tooltip title="Logout">
													<IconButton size="large" color="error" sx={{ p: 1 }} onClick={handleLogout}>
														<Logout variant="Bulk" />
													</IconButton>
												</Tooltip>
											</Grid>
										</Grid>
									</CardContent>

									<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
										<Tabs variant="fullWidth" value={value} onChange={handleChange} aria-label="profile tabs">
											<Tab
												sx={{
													display: "flex",
													flexDirection: "row",
													justifyContent: "center",
													alignItems: "center",
													textTransform: "capitalize",
												}}
												icon={<Profile size={18} style={{ marginBottom: 0, marginRight: "10px" }} />}
												label="Perfil"
												{...a11yProps(0)}
											/>
											{/* 										<Tab
												sx={{
													display: "flex",
													flexDirection: "row",
													justifyContent: "center",
													alignItems: "center",
													textTransform: "capitalize",
												}}
												icon={<Setting2 size={18} style={{ marginBottom: 0, marginRight: "10px" }} />}
												label="Configuración"
												{...a11yProps(1)}
											/>
										 */}
										</Tabs>
									</Box>
									<TabPanel value={value} index={0} dir={theme.direction}>
										<ProfileTab handleLogout={handleLogout} handleClose={() => setOpen(false)} />
									</TabPanel>
									<TabPanel value={value} index={1} dir={theme.direction}>
										<SettingTab />
									</TabPanel>
								</MainCard>
							</ClickAwayListener>
						</Paper>
					</Transitions>
				)}
			</Popper>
		</Box>
	);
};

export default ProfilePage;
