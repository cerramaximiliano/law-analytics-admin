import { useState } from "react";
import {
	Dialog, DialogTitle, DialogContent, DialogActions,
	Button, Grid, TextField, Typography, Alert,
	Autocomplete,
} from "@mui/material";
import * as Yup from "yup";
import { Formik } from "formik";
import { useDispatch, useSelector } from "store";
import { fetchUsers, createCredential } from "store/reducers/seclo";
import type { SecloUser } from "types/seclo";

interface Props {
	open: boolean;
	onClose: () => void;
}

const schema = Yup.object({
	userId:   Yup.string().required("Seleccioná un usuario"),
	cuil:     Yup.string().min(11, "El CUIL debe tener al menos 11 dígitos").required("El CUIL es requerido"),
	password: Yup.string().min(6, "Mínimo 6 caracteres").required("La contraseña es requerida"),
});

export default function CreateCredencialModal({ open, onClose }: Props) {
	const dispatch = useDispatch();
	const { users } = useSelector((s) => s.seclo);
	const [userSearch, setUserSearch] = useState("");

	const handleUserSearch = (value: string) => {
		setUserSearch(value);
		if (value.length >= 2) dispatch(fetchUsers(value));
	};

	const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
		try {
			await dispatch(createCredential({ userId: values.userId, cuil: values.cuil.replace(/\D/g, ""), password: values.password }));
			resetForm();
			onClose();
		} catch (_) {
			// error shown via snackbar
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Nueva credencial SECLO</DialogTitle>
			<Formik initialValues={{ userId: "", cuil: "", password: "" }} validationSchema={schema} onSubmit={handleSubmit}>
				{({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
					<form onSubmit={handleSubmit}>
						<DialogContent>
							<Grid container spacing={2}>
								<Grid item xs={12}>
									<Typography variant="body2" color="text.secondary" mb={1}>
										Seleccioná el usuario al que pertenece la credencial del portal Trabajo.
									</Typography>
								</Grid>
								<Grid item xs={12}>
									<Autocomplete
										options={users}
										getOptionLabel={(u: SecloUser) => `${u.name} — ${u.email}`}
										onInputChange={(_, v) => handleUserSearch(v)}
										onChange={(_, v: SecloUser | null) => setFieldValue("userId", v?._id || "")}
										noOptionsText={userSearch.length < 2 ? "Escribí para buscar..." : "Sin resultados"}
										renderInput={(params) => (
											<TextField
												{...params}
												label="Usuario *"
												error={Boolean(touched.userId && errors.userId)}
												helperText={(touched.userId && errors.userId) as string}
											/>
										)}
									/>
								</Grid>
								<Grid item xs={12}>
									<TextField
										fullWidth
										name="cuil"
										label="CUIL (sin guiones) *"
										placeholder="20123456780"
										value={values.cuil}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.cuil && errors.cuil)}
										helperText={(touched.cuil && errors.cuil) as string}
									/>
								</Grid>
								<Grid item xs={12}>
									<TextField
										fullWidth
										type="password"
										name="password"
										label="Contraseña del portal *"
										value={values.password}
										onChange={handleChange}
										onBlur={handleBlur}
										error={Boolean(touched.password && errors.password)}
										helperText={(touched.password && errors.password) as string}
									/>
								</Grid>
								<Grid item xs={12}>
									<Alert severity="info" sx={{ mt: 1 }}>
										Las credenciales se encriptan con AES-256 antes de guardarse.
									</Alert>
								</Grid>
							</Grid>
						</DialogContent>
						<DialogActions>
							<Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
							<Button type="submit" variant="contained" disabled={isSubmitting}>
								{isSubmitting ? "Guardando..." : "Crear credencial"}
							</Button>
						</DialogActions>
					</form>
				)}
			</Formik>
		</Dialog>
	);
}
