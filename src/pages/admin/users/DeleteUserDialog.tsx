import React, { useState } from "react";
import { useSelector } from "react-redux";
import { dispatch } from "store/index";

// material-ui
import { Button, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, Box, CircularProgress } from "@mui/material";
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
			<DialogTitle>Eliminar Usuario</DialogTitle>
			<DialogContent>
				<DialogContentText>
					¿Está seguro que desea eliminar al usuario <strong>{user.name}</strong>?
				</DialogContentText>
				<DialogContentText sx={{ mt: 2 }}>
					Email:{" "}
					<Typography component="span" fontWeight="bold">
						{user.email}
					</Typography>
				</DialogContentText>
				<DialogContentText sx={{ mt: 1 }}>
					Rol:{" "}
					<Typography component="span" fontWeight="bold">
						{user.role}
					</Typography>
				</DialogContentText>
				<DialogContentText sx={{ mt: 1, color: "error.main" }}>Esta acción no se puede deshacer.</DialogContentText>
				{error && <Box sx={{ color: "error.main", mt: 2 }}>{error}</Box>}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} color="primary" disabled={isDeleting}>
					Cancelar
				</Button>
				<Button
					onClick={handleDelete}
					color="error"
					variant="contained"
					disabled={loading || isDeleting}
					startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
				>
					{isDeleting ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</ResponsiveDialog>
	);
};

export default DeleteUserDialog;
