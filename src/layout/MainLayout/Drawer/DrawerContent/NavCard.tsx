import React from "react";
// material-ui
import { useState } from "react";
import { Button, CardMedia, Stack, Typography } from "@mui/material";

// project-imports
import MainCard from "components/MainCard";
import AnimateButton from "components/@extended/AnimateButton";
import SupportModal from "./SupportModal";

// assets
import avatar from "assets/images/users/customer-support-1.png";

// ==============================|| DRAWER CONTENT - NAV CARD ||============================== //

const NavCard = () => {
	// Estado para controlar la apertura/cierre del modal
	const [openModal, setOpenModal] = useState(false);

	// Funciones para abrir y cerrar el modal
	const handleOpenModal = () => {
		setOpenModal(true);
	};

	const handleCloseModal = () => {
		setOpenModal(false);
	};

	return (
		<>
			<MainCard sx={{ bgcolor: "secondary.lighter", m: 3 }}>
				<Stack alignItems="center" spacing={2.5}>
					<CardMedia component="img" image={avatar} />
					<Stack alignItems="center">
						<Typography variant="h5">¿Necesita ayuda?</Typography>
						<Typography variant="h6" color="secondary">
							Respuesta en 24 horas
						</Typography>
					</Stack>
					<AnimateButton>
						{/* Cambiamos el href por onClick para abrir el modal */}
						<Button variant="shadow" size="small" onClick={handleOpenModal}>
							Soporte
						</Button>
					</AnimateButton>
				</Stack>
			</MainCard>

			{/* Modal de Soporte */}
			<SupportModal open={openModal} onClose={handleCloseModal} />
		</>
	);
};

export default NavCard;
