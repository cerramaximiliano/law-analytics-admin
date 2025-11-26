import React, { useState, useEffect } from "react";
import { dispatch } from "store/index";

// material-ui
import {
	Box,
	Button,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	Grid,
	Stack,
	Switch,
	TextField,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Tabs,
	Tab,
} from "@mui/material";
import ResponsiveDialog from "components/@extended/ResponsiveDialog";

// project imports
import { User } from "types/user";
import authAxios from "utils/authAxios";
import { SET_ERROR } from "store/reducers/users";

// third party
import * as Yup from "yup";
import { Formik, FormikHelpers } from "formik";

interface GenerateDataModalProps {
	user: User;
	open: boolean;
	onClose: () => void;
}

interface FormValues {
	folders: number;
	calculators: number;
	contacts: number;
	ignoreLimits: boolean;
	folderId: string;
	movements: number;
	tasks: number;
	folderCalculators: number;
	events: number;
	folderContacts: number;
}

const GenerateDataModal: React.FC<GenerateDataModalProps> = ({ user, open, onClose }) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [tabValue, setTabValue] = useState(0);
	const [userFolders, setUserFolders] = useState<any[]>([]);
	const [loadingFolders, setLoadingFolders] = useState(false);

	// Valores iniciales para el formulario
	const initialValues: FormValues = {
		// Tab general
		folders: 0,
		calculators: 0,
		contacts: 0,
		ignoreLimits: false,
		// Tab folder específico
		folderId: "",
		movements: 10,
		tasks: 5,
		folderCalculators: 8,
		events: 12,
		folderContacts: 3,
	};

	// Esquema de validación
	const validationSchema = Yup.object().shape({
		folders: Yup.number().min(0, "Debe ser un número positivo").required("Requerido"),
		calculators: Yup.number().min(0, "Debe ser un número positivo").required("Requerido"),
		contacts: Yup.number().min(0, "Debe ser un número positivo").required("Requerido"),
		ignoreLimits: Yup.boolean(),
		folderId: Yup.string(),
		movements: Yup.number().min(0, "Debe ser un número positivo").max(50, "Máximo 50"),
		tasks: Yup.number().min(0, "Debe ser un número positivo").max(50, "Máximo 50"),
		folderCalculators: Yup.number().min(0, "Debe ser un número positivo").max(50, "Máximo 50"),
		events: Yup.number().min(0, "Debe ser un número positivo").max(50, "Máximo 50"),
		folderContacts: Yup.number().min(0, "Debe ser un número positivo").max(50, "Máximo 50"),
	});

	// Cargar causas del usuario
	useEffect(() => {
		if (open && user) {
			const userId = user._id || user.id;

			setLoadingFolders(true);

			// Primero intentar con el endpoint específico del usuario
			authAxios
				.get(`/api/folders/user/${userId}`)
				.then((response) => {
					// La respuesta puede venir en diferentes formatos
					let folders = [];
					if (Array.isArray(response.data)) {
						folders = response.data;
					} else if (response.data.folders && Array.isArray(response.data.folders)) {
						folders = response.data.folders;
					} else if (response.data.data && Array.isArray(response.data.data)) {
						folders = response.data.data;
					}

					setUserFolders(folders);
				})
				.catch(() => {
					// Si falla, intentar con el endpoint alternativo
					return authAxios.get(`/api/folders?userId=${userId}`);
				})
				.then((response) => {
					if (response) {
						let folders = [];
						if (Array.isArray(response.data)) {
							folders = response.data;
						} else if (response.data.folders && Array.isArray(response.data.folders)) {
							folders = response.data.folders;
						} else if (response.data.data && Array.isArray(response.data.data)) {
							folders = response.data.data;
						}

						setUserFolders(folders);
					}
				})
				.catch(() => {
					setUserFolders([]);
				})
				.finally(() => {
					setLoadingFolders(false);
				});
		}
	}, [open, user]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
	};

	// Función para manejar el envío del formulario
	const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
		try {
			setError(null);
			setSuccess(null);
			setLoading(true);

			if (tabValue === 0) {
				// Tab General - Generar datos generales
				// Verificar que al menos uno de los valores sea mayor que cero
				if (values.folders === 0 && values.calculators === 0 && values.contacts === 0) {
					setError("Debe especificar al menos un valor mayor que cero");
					setSubmitting(false);
					setLoading(false);
					return;
				}

				const payload = {
					folders: values.folders > 0 ? values.folders : undefined,
					calculators: values.calculators > 0 ? values.calculators : undefined,
					contacts: values.contacts > 0 ? values.contacts : undefined,
					ignoreLimits: values.ignoreLimits,
				};

				// Realizar la petición a la API
				const response = await authAxios.post(`/api/users/${user._id || user.id}/generate-data`, payload);

				// Mostrar mensaje de éxito
				setSuccess(response.data.message || "Datos generados exitosamente");
			} else {
				// Tab Causa - Generar datos para una causa específica
				if (!values.folderId) {
					setError("Debe seleccionar una causa");
					setSubmitting(false);
					setLoading(false);
					return;
				}

				const payload = {
					folderId: values.folderId,
					movements: values.movements > 0 ? values.movements : undefined,
					tasks: values.tasks > 0 ? values.tasks : undefined,
					calculators: values.folderCalculators > 0 ? values.folderCalculators : undefined,
					events: values.events > 0 ? values.events : undefined,
					contacts: values.folderContacts > 0 ? values.folderContacts : undefined,
				};

				// Realizar la petición a la API
				const response = await authAxios.post(`/api/users/${user._id || user.id}/generate-folder-data`, payload);

				// Mostrar mensaje de éxito
				setSuccess(response.data.message || "Datos de la causa generados exitosamente");
			}

			// Cerrar el modal después de 2 segundos
			setTimeout(() => {
				onClose();
			}, 2000);
		} catch (err: any) {
			setError(err.response?.data?.message || err.message || "Error al generar datos");
			dispatch({
				type: SET_ERROR,
				payload: err.message || "Error al generar datos",
			});
		} finally {
			setSubmitting(false);
			setLoading(false);
		}
	};

	return (
		<ResponsiveDialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			PaperProps={{
				sx: {
					height: { xs: "90vh", sm: "85vh", md: "80vh" },
					maxHeight: { xs: "90vh", sm: "700px" },
					display: "flex",
					flexDirection: "column",
				},
			}}
		>
			<DialogTitle sx={{ flexShrink: 0 }}>Generar Datos para {user.name}</DialogTitle>
			<Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
				{({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setFieldValue }) => (
					<form noValidate onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
						<DialogContent sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
							<Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3, flexShrink: 0 }}>
								<Tabs value={tabValue} onChange={handleTabChange}>
									<Tab label="Datos Generales" />
									<Tab label="Datos de Causa" />
								</Tabs>
							</Box>

							<Box
								sx={{
									flex: 1,
									overflowY: "auto",
									"&::-webkit-scrollbar": {
										width: "8px",
									},
									"&::-webkit-scrollbar-track": {
										background: "#f1f1f1",
										borderRadius: "4px",
									},
									"&::-webkit-scrollbar-thumb": {
										background: "#888",
										borderRadius: "4px",
									},
									"&::-webkit-scrollbar-thumb:hover": {
										background: "#555",
									},
								}}
							>
								{tabValue === 0 && (
									<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
										<Grid item xs={12}>
											<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
												Especifica la cantidad de cada tipo de dato a generar para este usuario.
											</Typography>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="folders"
												name="folders"
												label="Carpetas"
												type="number"
												value={values.folders}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.folders && errors.folders)}
												helperText={touched.folders && errors.folders}
												InputProps={{ inputProps: { min: 0 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="calculators"
												name="calculators"
												label="Calculadoras"
												type="number"
												value={values.calculators}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.calculators && errors.calculators)}
												helperText={touched.calculators && errors.calculators}
												InputProps={{ inputProps: { min: 0 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="contacts"
												name="contacts"
												label="Contactos"
												type="number"
												value={values.contacts}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.contacts && errors.contacts)}
												helperText={touched.contacts && errors.contacts}
												InputProps={{ inputProps: { min: 0 } }}
											/>
										</Grid>
										<Grid item xs={12}>
											<FormControlLabel
												control={
													<Switch
														checked={values.ignoreLimits}
														onChange={(e) => setFieldValue("ignoreLimits", e.target.checked)}
														name="ignoreLimits"
														color="primary"
													/>
												}
												label="Forzar límites de suscripción"
											/>
											<Typography variant="caption" color="textSecondary" display="block">
												Al activar esta opción, se ignorarán los límites de la suscripción del usuario.
											</Typography>
										</Grid>
									</Grid>
								)}

								{tabValue === 1 && (
									<Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
										<Grid item xs={12}>
											<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
												Selecciona una causa y especifica la cantidad de datos a generar para esa causa específica.
											</Typography>
											{!loadingFolders && userFolders.length > 0 && (
												<Typography variant="caption" color="textSecondary">
													Se encontraron {userFolders.length} causas del usuario.
												</Typography>
											)}
										</Grid>
										<Grid item xs={12}>
											<FormControl fullWidth>
												<InputLabel id="folder-select-label">{loadingFolders ? "Cargando causas..." : "Seleccionar Causa"}</InputLabel>
												<Select
													labelId="folder-select-label"
													id="folderId"
													name="folderId"
													value={values.folderId}
													label={loadingFolders ? "Cargando causas..." : "Seleccionar Causa"}
													onChange={handleChange}
													onBlur={handleBlur}
													error={Boolean(touched.folderId && errors.folderId)}
													disabled={loadingFolders}
												>
													<MenuItem value="">
														<em>Ninguno</em>
													</MenuItem>
													{loadingFolders ? (
														<MenuItem disabled>
															<em>Cargando causas...</em>
														</MenuItem>
													) : userFolders.length === 0 ? (
														<MenuItem disabled>
															<em>No hay causas disponibles</em>
														</MenuItem>
													) : (
														userFolders.map((folder) => (
															<MenuItem key={folder._id || folder.id} value={folder._id || folder.id}>
																{folder.folderName || folder.name} - {folder.materia || "Sin materia"}
															</MenuItem>
														))
													)}
												</Select>
											</FormControl>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="movements"
												name="movements"
												label="Movimientos"
												type="number"
												value={values.movements}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.movements && errors.movements)}
												helperText={(touched.movements && errors.movements) || "Máx: 50"}
												InputProps={{ inputProps: { min: 0, max: 50 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="tasks"
												name="tasks"
												label="Tareas"
												type="number"
												value={values.tasks}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.tasks && errors.tasks)}
												helperText={(touched.tasks && errors.tasks) || "Máx: 50"}
												InputProps={{ inputProps: { min: 0, max: 50 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="folderCalculators"
												name="folderCalculators"
												label="Calculadoras"
												type="number"
												value={values.folderCalculators}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.folderCalculators && errors.folderCalculators)}
												helperText={(touched.folderCalculators && errors.folderCalculators) || "Máx: 50"}
												InputProps={{ inputProps: { min: 0, max: 50 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="events"
												name="events"
												label="Eventos"
												type="number"
												value={values.events}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.events && errors.events)}
												helperText={(touched.events && errors.events) || "Máx: 50"}
												InputProps={{ inputProps: { min: 0, max: 50 } }}
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												fullWidth
												id="folderContacts"
												name="folderContacts"
												label="Contactos"
												type="number"
												value={values.folderContacts}
												onChange={handleChange}
												onBlur={handleBlur}
												error={Boolean(touched.folderContacts && errors.folderContacts)}
												helperText={(touched.folderContacts && errors.folderContacts) || "Máx: 50"}
												InputProps={{ inputProps: { min: 0, max: 50 } }}
											/>
										</Grid>
									</Grid>
								)}

								{error && <Box sx={{ color: "error.main", mt: 2 }}>{error}</Box>}
								{success && <Box sx={{ color: "success.main", mt: 2 }}>{success}</Box>}
							</Box>
						</DialogContent>
						<DialogActions sx={{ flexShrink: 0, px: 3, py: 2 }}>
							<Stack direction="row" spacing={1} justifyContent="flex-end">
								<Button onClick={onClose} color="secondary">
									Cancelar
								</Button>
								<Button type="submit" variant="contained" color="primary" disabled={isSubmitting || loading}>
									Generar Datos
								</Button>
							</Stack>
						</DialogActions>
					</form>
				)}
			</Formik>
		</ResponsiveDialog>
	);
};

export default GenerateDataModal;
