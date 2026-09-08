import React from "react";
import { ReactNode } from "react";

// material-ui
import { Box, Grid } from "@mui/material";

// project-imports
import AuthCard from "./AuthCard";

// assets
import AuthBackground from "assets/images/auth/AuthBackground";

interface Props {
	children: ReactNode;
}

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //

// El login es la única pantalla que todo el mundo ve en el teléfono, y con vh
// pegaba un salto cada vez que iOS cambia el alto de la barra del navegador al
// scrollear. dvh mide el viewport real; vh queda como respaldo donde no exista.
const ALTO_PANTALLA = {
	minHeight: "100vh",
	"@supports (min-height: 100dvh)": { minHeight: "100dvh" },
};

const AuthWrapper = ({ children }: Props) => (
	<Box sx={ALTO_PANTALLA}>
		<AuthBackground />
		<Grid container direction="column" justifyContent="center" sx={ALTO_PANTALLA}>
			<Grid item xs={12}>
				<Grid
					item
					xs={12}
					container
					justifyContent="center"
					alignItems="center"
					sx={{
						minHeight: {
							xs: "calc(100vh - 210px)",
							sm: "calc(100vh - 134px)",
							md: "calc(100vh - 112px)",
						},
						"@supports (min-height: 100dvh)": {
							minHeight: {
								xs: "calc(100dvh - 210px)",
								sm: "calc(100dvh - 134px)",
								md: "calc(100dvh - 112px)",
							},
						},
					}}
				>
					<Grid item>
						<AuthCard>{children}</AuthCard>
					</Grid>
				</Grid>
			</Grid>
		</Grid>
	</Box>
);

export default AuthWrapper;
