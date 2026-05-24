import React, { useState } from "react";
import { useSelector } from "react-redux";
import { dispatch } from "store/index";

// material-ui
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, Box, CircularProgress, Stack } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Warning2 } from "iconsax-react";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";

// project imports
import { User } from "types/user";
import { DefaultRootStateProps } from "types/root";
import authAxios from "utils/authAxios";
import { DELETE_USER, SET_ERROR } from "store/reducers/users";
import { openSnackbar } from "store/reducers/snackbar";

interface DeleteUserDialogProps {
	user: User;
	open: boolean;
	onClose: () => void;
}

const DeleteUserDialog: React.FC<DeleteUserDialogProps> = ({ user, open, onClose }) => {
	const theme = useTheme();
	const { loading } = useSelector((state: DefaultRootStateProps) => state.users);
	const [error, setError] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Función para eliminar el usuario
	const handleDelete = async () => {
		try {
			setError(null);
			setIsDeleting(true);

			// Usar _id o id según lo que esté disponible
			const userId = user._id || user.id;

			if (!userId) {
				throw new Error("No se pudo obtener el ID del usuario");
			}

			// Realizar la petición a la API
			const response = await authAxios.delete(`/api/users/${userId}`);

			// Verificar la respuesta del servidor
			if (response.data.success) {
				// Actualizar el estado global
				dispatch({
					type: DELETE_USER,
					payload: userId,
				});

				// Mostrar notificación de éxito
				dispatch(
					openSnackbar({
						open: true,
						message: response.data.message || "Usuario y todos sus datos relacionados eliminados correctamente",
						variant: "alert",
						alert: {
							color: "success",
						},
						close: true,
					}),
				);

				// Cerrar el diálogo
				onClose();
			} else {
				// Mostrar notificación de error
				dispatch(
					openSnackbar({
						open: true,
						message: response.data.message || "Error al eliminar usuario",
						variant: "alert",
						alert: {
							color: "error",
						},
						close: true,
					}),
				);
				setError(response.data.message || "Error al eliminar usuario");
			}
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || err.message || "Error al eliminar el usuario";
			setError(errorMessage);

			dispatch({
				type: SET_ERROR,
				payload: errorMessage,
			});

			// Mostrar notificación de error
			dispatch(
				openSnackbar({
					open: true,
					message: errorMessage,
					variant: "alert",
					alert: {
						color: "error",
					},
					close: true,
				}),
			);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<ResponsiveDialog open={open} onClose={isDeleting ? undefined : onClose} maxWidth="sm" disableEscapeKeyDown={isDeleting}>
			<DialogTitle sx={{ pb: 1.5 }}>
				<Stack direction="row" spacing={1.25} alignItems="center">
					<Box
						sx={{
							width: 36,
							height: 36,
							borderRadius: 1.25,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: alpha(theme.palette.error.main, 0.1),
							color: "error.main",
						}}
					>
						<Warning2 size={20} variant="Bold" />
					</Box>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Eliminar usuario
					</Typography>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					¿Estás seguro de que deseas eliminar al usuario <strong>{user.name}</strong>?
				</DialogContentText>
				<DialogContentText sx={{ mt: 2 }}>
					Email:{" "}
					<Typography component="span" fontWeight={600}>
						{user.email}
					</Typography>
				</DialogContentText>
				<DialogContentText sx={{ mt: 1 }}>
					Rol:{" "}
					<Typography component="span" fontWeight={600}>
						{user.role}
					</Typography>
				</DialogContentText>
				<DialogContentText sx={{ mt: 2, color: "error.main" }}>Esta acción no se puede deshacer.</DialogContentText>
				{error && <Box sx={{ color: "error.main", mt: 2 }}>{error}</Box>}
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} color="secondary" disabled={isDeleting}>
					Cancelar
				</Button>
				<Button
					onClick={handleDelete}
					color="error"
					variant="contained"
					disableElevation
					disabled={loading || isDeleting}
					startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
					sx={{
						transition: "transform 160ms ease",
						"&:hover": { transform: "translateY(-1px)" },
						"&:active": { transform: "scale(0.98)" },
					}}
				>
					{isDeleting ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</ResponsiveDialog>
	);
};

export default DeleteUserDialog;
