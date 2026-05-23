import React from "react";
import { Stack, Typography, Paper, Box } from "@mui/material";
import Avatar from "components/@extended/Avatar";
import { ReactElement } from "react";

interface EmptyStateCardProps {
	icon: ReactElement;
	title: string;
	subtitle?: string;
	iconColor?: "error" | "default" | "primary" | "secondary" | "info" | "success" | "warning";
}

const EmptyStateCard = ({
	icon,
	title,
	subtitle = "Comienza agregando un nuevo elemento usando el botón +",
	iconColor = "error",
}: EmptyStateCardProps) => (
	<Paper elevation={0} sx={{ p: 4, textAlign: "center", bgcolor: "transparent" }}>
		<Stack spacing={{ xs: 1.5, sm: 2, md: 3 }} alignItems="center">
			<Avatar
				color={iconColor}
				variant="rounded"
				sx={{
					width: 64,
					height: 64,
					bgcolor: `${iconColor}.lighter`,
					transition: "transform 0.3s ease-in-out",
					"&:hover": {
						transform: "scale(1.1)",
					},
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", "& > svg": { width: 32, height: 32 } }}>{icon}</Box>
			</Avatar>
			<Box>
				<Typography variant="h5" gutterBottom color="textPrimary" sx={{ fontWeight: 500 }}>
					{title}
				</Typography>
				<Typography variant="body2" color="textSecondary" sx={{ fontSize: "0.875rem" }}>
					{subtitle}
				</Typography>
			</Box>
		</Stack>
	</Paper>
);

export default EmptyStateCard;
