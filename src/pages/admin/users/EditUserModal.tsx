import React, { useState } from "react";
import { useSelector } from "react-redux";
import { dispatch } from "store/index";

// material-ui
import {
	Box,
	Button,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	FormControlLabel,
	FormHelperText,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Switch,
	TextField,
} from "@mui/material";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";

// project imports
import { User } from "types/user";
import { DefaultRootStateProps } from "types/root";
import authAxios from "utils/authAxios";
import { SET_ERROR, UPDATE_USER } from "store/reducers/users";
import { openSnackbar } from "store/reducers/snackbar";

// third party
import * as Yup from "yup";
import { Formik, FormikHelpers } from "formik";

interface EditUserModalProps {
	user: User;
	open: boolean;
	onClose: () => void;
}

// Los roles disponibles en el sistema
const availableRoles = [
	{ value: "USER_ROLE", label: "Usuario" },
	{ value: "ADMIN_ROLE", label: "Administrador" },
];

// Los estados disponibles para un usuario
const availableStatuses = [
	{ value: "active", label: "Activo" },
	{ value: "inactive", label: "Inactivo" },
	{ value: "pending", label: "Pendiente" },
];

interface FormValues {
	name: string;
	email: string;
	role: string;
	status: string;
	phone: string;
	isVerified: boolean;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, open, onClose }) => {
	const { loading } = useSelector((state: DefaultRootStateProps) => state.users);
	const [error, setError] = useState<string | null>(null);

	// Valores iniciales para el formulario
	const initialValues: FormValues = {
		name: user?.name || "",
		email: user?.email || "",
		role: user?.role || "USER_ROLE",
		status: user?.status || "active",
		phone: user?.phone || "",
		isVerified: user?.isVerified || false,
	};

	// Esquema de validación
	const validationSchema = Yup.object().shape({
		name: Yup.string().required("El nombre es requerido"),
		email: Yup.string().email("Email inválido").required("El email es requerido"),
		role: Yup.string().required("El rol es requerido"),
		status: Yup.string().required("El estado es requerido"),
		phone: Yup.string(),
		isVerified: Yup.boolean(),
	});

	// Función para manejar el envío del formulario
	const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
		try {
			setError(null);

			// Usar _id o id según lo que esté disponible
			const userId = user._id || user.id;

			if (!userId) {
				throw new Error("No se pudo obtener el ID del usuario");
			}

			const payload = {
				...values,
				id: userId,
			};

			// Realizar la petición a la API
			const response = await authAxios.put(`/api/users/${userId}`, payload);

			// Verificar la respuesta del servidor
			if (response.data.success) {
				// Actualizar el estado global
				const updatedUser = response.data.user || response.data;
				dispatch({
					type: UPDATE_USER,
					payload: updatedUser,
				});

				// Mostrar notificación de éxito
				dispatch(
					openSnackbar({
						open: true,
						message: response.data.message || "Usuario actualizado correctamente",
						variant: "alert",
						alert: {
							color: "success",
						},
						close: true,
					}),
				);

				// Cerrar el modal
				onClose();
			} else {
				// Mostrar notificación de error
				dispatch(
					openSnackbar({
						open: true,
						message: response.data.message || "Error al actualizar usuario",
						variant: "alert",
						alert: {
							color: "error",
						},
						close: true,
					}),
				);
				setError(response.data.message || "Error al actualizar usuario");
			}
		} catch (err: any) {
			const errorMessage = err.response?.data?.message || err.message || "Error al actualizar el usuario";
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
			setSubmitting(false);
		}
	};

	return (
		<ResponsiveDialog open={open} onClose={onClose} maxWidth="sm">
			<DialogTitle>Editar Usuario</DialogTitle>
			<Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
				{({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
					<form noValidate onSubmit={handleSubmit}>
						<DialogContent>
							<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
								<Grid item xs={12}>
									<TextField
										fullWidth
										id="name"
										name="name"
										label="Nombre"
										value={values.name}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.name && errors.name)}
										helperText={touched.name && errors.name}
									/>
								</Grid>
								<Grid item xs={12}>
									<TextField
										fullWidth
										id="email"
										name="email"
										label="Email"
										value={values.email}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.email && errors.email)}
										helperText={touched.email && errors.email}
									/>
								</Grid>
								<Grid item xs={12} md={6}>
									<FormControl fullWidth error={Boolean(touched.role && errors.role)}>
										<InputLabel id="role-label">Rol</InputLabel>
										<Select
											labelId="role-label"
											id="role"
											name="role"
											value={values.role}
											label="Rol"
											onChange={handleChange}
											onBlur={handleBlur}
										>
											{availableRoles.map((role) => (
												<MenuItem key={role.value} value={role.value}>
													{role.label}
												</MenuItem>
											))}
										</Select>
										{touched.role && errors.role && <FormHelperText>{errors.role}</FormHelperText>}
									</FormControl>
								</Grid>
								<Grid item xs={12} md={6}>
									<FormControl fullWidth error={Boolean(touched.status && errors.status)}>
										<InputLabel id="status-label">Estado</InputLabel>
										<Select
											labelId="status-label"
											id="status"
											name="status"
											value={values.status}
											label="Estado"
											onChange={handleChange}
											onBlur={handleBlur}
										>
											{availableStatuses.map((status) => (
												<MenuItem key={status.value} value={status.value}>
													{status.label}
												</MenuItem>
											))}
										</Select>
										{touched.status && errors.status && <FormHelperText>{errors.status}</FormHelperText>}
									</FormControl>
								</Grid>
								<Grid item xs={12}>
									<TextField
										fullWidth
										id="phone"
										name="phone"
										label="Teléfono (opcional)"
										value={values.phone}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.phone && errors.phone)}
										helperText={touched.phone && errors.phone}
									/>
								</Grid>
								<Grid item xs={12}>
									<FormControlLabel
										control={
											<Switch
												checked={values.isVerified}
												onChange={(e) => setFieldValue("isVerified", e.target.checked)}
												name="isVerified"
											/>
										}
										label="Usuario Verificado"
									/>
								</Grid>
								{error && (
									<Grid item xs={12}>
										<Box sx={{ color: "error.main", mt: 2 }}>{error}</Box>
									</Grid>
								)}
							</Grid>
						</DialogContent>
						<DialogActions>
							<Button onClick={onClose} color="secondary">
								Cancelar
							</Button>
							<Button type="submit" variant="contained" color="primary" disabled={isSubmitting || loading}>
								Guardar Cambios
							</Button>
						</DialogActions>
					</form>
				)}
			</Formik>
		</ResponsiveDialog>
	);
};

export default EditUserModal;
