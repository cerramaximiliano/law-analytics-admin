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
	FormHelperText,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";

// project imports
import { DefaultRootStateProps } from "types/root";
import authAxios from "utils/authAxios";
import { SET_ERROR, SET_USERS } from "store/reducers/users";

// third party
import * as Yup from "yup";
import { Formik, FormikHelpers } from "formik";

interface AddUserModalProps {
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
	password: string;
	confirmPassword: string;
	role: string;
	status: string;
	phone: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ open, onClose }) => {
	const { users, loading } = useSelector((state: DefaultRootStateProps) => state.users);
	const [error, setError] = useState<string | null>(null);

	// Valores iniciales para el formulario
	const initialValues: FormValues = {
		name: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "USER_ROLE",
		status: "active",
		phone: "",
	};

	// Esquema de validación
	const validationSchema = Yup.object().shape({
		name: Yup.string().required("El nombre es requerido"),
		email: Yup.string().email("Email inválido").required("El email es requerido"),
		password: Yup.string()
			.min(8, "La contraseña debe tener al menos 8 caracteres")
			.matches(
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
				"La contraseña debe contener al menos una letra mayúscula, una minúscula, un número y un carácter especial",
			)
			.required("La contraseña es requerida"),
		confirmPassword: Yup.string()
			.oneOf([Yup.ref("password")], "Las contraseñas deben coincidir")
			.required("La confirmación de contraseña es requerida"),
		role: Yup.string().required("El rol es requerido"),
		status: Yup.string().required("El estado es requerido"),
		phone: Yup.string(),
	});

	// Función para manejar el envío del formulario
	const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
		try {
			setError(null);
			// Eliminar confirmPassword antes de enviar
			const { confirmPassword: _confirmPassword, ...payload } = values;

			// Realizar la petición a la API
			const response = await authAxios.post("/api/users", payload);

			// Actualizar el estado global con el nuevo usuario
			const newUser = response.data.user || response.data;
			dispatch({
				type: SET_USERS,
				payload: [...users, newUser],
			});

			// Cerrar el modal
			onClose();
		} catch (err: any) {
			setError(err.message || "Error al crear el usuario");
			dispatch({
				type: SET_ERROR,
				payload: err.message || "Error al crear el usuario",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<ResponsiveDialog open={open} onClose={onClose} maxWidth="sm">
			<DialogTitle>Agregar Nuevo Usuario</DialogTitle>
			<Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
				{({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
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
									<TextField
										fullWidth
										id="password"
										name="password"
										label="Contraseña"
										type="password"
										value={values.password}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.password && errors.password)}
										helperText={touched.password && errors.password}
									/>
								</Grid>
								<Grid item xs={12} md={6}>
									<TextField
										fullWidth
										id="confirmPassword"
										name="confirmPassword"
										label="Confirmar Contraseña"
										type="password"
										value={values.confirmPassword}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.confirmPassword && errors.confirmPassword)}
										helperText={touched.confirmPassword && errors.confirmPassword}
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
								Crear Usuario
							</Button>
						</DialogActions>
					</form>
				)}
			</Formik>
		</ResponsiveDialog>
	);
};

export default AddUserModal;
