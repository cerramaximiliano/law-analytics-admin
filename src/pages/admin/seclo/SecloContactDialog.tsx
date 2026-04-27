import { useEffect, useState } from "react";
import {
	Alert,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from "@mui/material";

import adminAxios from "utils/adminAxios";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";

import type { SecloContact } from "types/seclo";

interface Props {
	open: boolean;
	mode: "add" | "edit";
	userId: string;
	/** Contacto existente cuando mode='edit'. En 'add' puede pasarse parcial para pre-llenar. */
	contact?: Partial<SecloContact> | null;
	folderId?: string;
	/** Si se setea, fuerza una preseleción del rol (visualizado en el header) */
	roleHint?: "trabajador" | "empleador";
	onClose: () => void;
	onSaved: (contact: SecloContact) => void;
}

interface FormState {
	name: string;
	lastName: string;
	type: string;
	cuit: string;
	document: string;
	phoneCodArea: string;
	phoneCelular: string;
	phone: string;
	email: string;
	street: string;
	streetNumber: string;
	floor: string;
	apartment: string;
	city: string;
	state: string;
	zipCode: string;
	company: string;
}

const empty: FormState = {
	name: "", lastName: "", type: "Persona Física", cuit: "", document: "",
	phoneCodArea: "", phoneCelular: "", phone: "", email: "",
	street: "", streetNumber: "", floor: "", apartment: "",
	city: "", state: "", zipCode: "", company: "",
};

/**
 * Parsea el legacy `address` ("Av. Corrientes 1234") al shape estructurado.
 * Sólo se usa al cargar contactos antiguos que todavía no tienen los campos
 * separados poblados. La heurística es la misma que usa el worker SECLO.
 */
function parseLegacyAddress(address: string | undefined): { street: string; streetNumber: string } {
	if (!address) return { street: "", streetNumber: "" };
	const cleaned = address.replace(/\s+[Nn][ºª°]\s*/g, " ");
	const m = cleaned.match(/^(.+?)\s+(\d+)\s*$/);
	if (m) return { street: m[1].trim(), streetNumber: m[2].trim() };
	return { street: address.trim(), streetNumber: "" };
}

/**
 * Dialog admin para crear o editar un contacto en nombre del usuario seleccionado.
 *
 * Se abre desde el wizard de creación de solicitud SECLO cuando el admin necesita:
 *   - Agregar un nuevo contacto (trabajador o empleador) sin salir del wizard.
 *   - Completar campos faltantes de un contacto existente (típicamente
 *     phoneCelular que es REQUERIDO por el portal SECLO).
 *
 * Al guardar, llama a `onSaved(contact)` con el documento creado/actualizado.
 * El padre se encarga de actualizar la lista local y auto-seleccionar.
 */
export default function SecloContactDialog({
	open, mode, userId, contact, folderId, roleHint, onClose, onSaved,
}: Props) {
	const [form, setForm] = useState<FormState>(empty);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Cargar datos del contacto al abrir
	useEffect(() => {
		if (!open) return;
		setError(null);
		if (contact) {
			// Si el contacto ya tiene los campos estructurados, los usamos.
			// Si no (legacy), parseamos el `address` para prefillear calle+número.
			const hasStructured = !!(contact.street || contact.streetNumber);
			const parsed = hasStructured
				? { street: contact.street || "", streetNumber: contact.streetNumber || "" }
				: parseLegacyAddress(contact.address);
			setForm({
				name:         contact.name         || "",
				lastName:     contact.lastName     || "",
				type:         (contact as any).type || "Persona Física",
				cuit:         contact.cuit         || "",
				document:     contact.document     || "",
				phoneCodArea: contact.phoneCodArea || "",
				phoneCelular: contact.phoneCelular || "",
				phone:        contact.phone        || "",
				email:        contact.email        || "",
				street:       parsed.street,
				streetNumber: parsed.streetNumber,
				floor:        contact.floor        || "",
				apartment:    contact.apartment    || "",
				city:         contact.city         || "",
				state:        contact.state        || "",
				zipCode:      contact.zipCode      || "",
				company:      contact.company      || "",
			});
		} else {
			setForm(empty);
		}
	}, [open, contact]);

	const setField = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

	// SECLO carga al portal calle y número como campos separados — sin
	// ellos el form no se puede submitear y la solicitud falla. Los
	// exigimos al guardar para que ningún contacto que pase por SECLO
	// quede con domicilio incompleto.
	const errors = {
		name:         !form.name.trim() ? "Requerido" : "",
		lastName:     !form.lastName.trim() ? "Requerido" : "",
		street:       !form.street.trim() ? "Requerido por SECLO" : "",
		streetNumber: !form.streetNumber.trim() ? "Requerido por SECLO" : "",
	};
	const canSubmit = !errors.name && !errors.lastName && !errors.street && !errors.streetNumber;

	const handleSubmit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			// Reconstruimos el legacy `address` desde calle+número para que
			// los flujos no migrados (facturas, exports PDF) sigan viendo un
			// domicilio coherente. Piso/depto van sólo a sus campos.
			const composedAddress = [form.street.trim(), form.streetNumber.trim()]
				.filter(Boolean)
				.join(" ");
			const payload = {
				...form,
				cuit: form.cuit.replace(/\D/g, "") || undefined,
				address: composedAddress,
				...(folderId && mode === "add" ? { folderIds: [folderId] } : {}),
			};

			let response;
			if (mode === "add") {
				response = await adminAxios.post(`/api/seclo/users/${userId}/contacts`, payload);
			} else {
				if (!contact?._id) throw new Error("Falta ID del contacto a editar");
				response = await adminAxios.patch(`/api/seclo/contacts/${contact._id}`, payload);
			}

			if (response.data?.success && response.data?.contact) {
				dispatch(openSnackbar({
					open: true,
					message: mode === "add" ? "Contacto creado" : "Contacto actualizado",
					variant: "alert",
					alert: { color: "success" },
				}));
				onSaved(response.data.contact);
				onClose();
			} else {
				setError(response.data?.message || "Respuesta inválida del servidor");
			}
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "Error al guardar el contacto");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Typography variant="h5">
						{mode === "add" ? "Nuevo contacto" : "Editar contacto"}
					</Typography>
					{roleHint && (
						<Typography variant="body2" color="text.secondary">
							Rol: {roleHint === "trabajador" ? "Trabajador (requirente)" : "Empleador (requerido)"}
						</Typography>
					)}
				</Stack>
			</DialogTitle>

			<DialogContent dividers>
				{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

				{mode === "edit" && (
					<Alert severity="info" sx={{ mb: 2 }}>
						Completá los campos que falten. Para SECLO suele ser crítico el celular
						del trabajador (código de área + número).
					</Alert>
				)}

				<Grid container spacing={2}>
					<Grid item xs={12} sm={6}>
						<TextField
							label="Nombre *"
							value={form.name}
							onChange={(e) => setField("name")(e.target.value)}
							error={!!errors.name}
							helperText={errors.name || " "}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label="Apellido *"
							value={form.lastName}
							onChange={(e) => setField("lastName")(e.target.value)}
							error={!!errors.lastName}
							helperText={errors.lastName || " "}
							fullWidth
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<FormControl fullWidth>
							<InputLabel>Tipo</InputLabel>
							<Select
								value={form.type}
								label="Tipo"
								onChange={(e) => setField("type")(e.target.value)}
							>
								<MenuItem value="Persona Física">Persona Física</MenuItem>
								<MenuItem value="Persona Jurídica">Persona Jurídica</MenuItem>
							</Select>
						</FormControl>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label="Empresa (si jurídica)"
							value={form.company}
							onChange={(e) => setField("company")(e.target.value)}
							fullWidth
							disabled={form.type !== "Persona Jurídica"}
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							label="CUIT/CUIL"
							placeholder="20123456789"
							value={form.cuit}
							onChange={(e) => setField("cuit")(e.target.value)}
							inputProps={{ inputMode: "numeric", maxLength: 13 }}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label="DNI"
							value={form.document}
							onChange={(e) => setField("document")(e.target.value)}
							fullWidth
						/>
					</Grid>

					<Grid item xs={12} sm={3}>
						<TextField
							label="Cód. área"
							placeholder="11"
							value={form.phoneCodArea}
							onChange={(e) => setField("phoneCodArea")(e.target.value)}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={5}>
						<TextField
							label="Celular"
							placeholder="56781234"
							value={form.phoneCelular}
							onChange={(e) => setField("phoneCelular")(e.target.value)}
							fullWidth
							helperText="Requerido por el portal SECLO para el trabajador"
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							label="Tel. fijo"
							value={form.phone}
							onChange={(e) => setField("phone")(e.target.value)}
							fullWidth
						/>
					</Grid>

					<Grid item xs={12} sm={12}>
						<TextField
							label="Email"
							type="email"
							value={form.email}
							onChange={(e) => setField("email")(e.target.value)}
							fullWidth
						/>
					</Grid>

					{/* Domicilio estructurado — el portal SECLO exige calle/número
					    como campos separados. Piso/depto opcionales. */}
					<Grid item xs={12}>
						<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
							Domicilio
						</Typography>
					</Grid>
					<Grid item xs={12} sm={8}>
						<TextField
							label="Calle *"
							placeholder="Av. Corrientes"
							value={form.street}
							onChange={(e) => setField("street")(e.target.value)}
							error={!!errors.street}
							helperText={errors.street || " "}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={4}>
						<TextField
							label="Número *"
							placeholder="1234"
							value={form.streetNumber}
							onChange={(e) => setField("streetNumber")(e.target.value)}
							error={!!errors.streetNumber}
							helperText={errors.streetNumber || " "}
							fullWidth
						/>
					</Grid>
					<Grid item xs={6} sm={3}>
						<TextField
							label="Piso"
							placeholder="4"
							value={form.floor}
							onChange={(e) => setField("floor")(e.target.value)}
							fullWidth
						/>
					</Grid>
					<Grid item xs={6} sm={3}>
						<TextField
							label="Depto"
							placeholder="B"
							value={form.apartment}
							onChange={(e) => setField("apartment")(e.target.value)}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label="Código postal"
							value={form.zipCode}
							onChange={(e) => setField("zipCode")(e.target.value)}
							fullWidth
						/>
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							label="Ciudad/Localidad"
							value={form.city}
							onChange={(e) => setField("city")(e.target.value)}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label="Provincia"
							value={form.state}
							onChange={(e) => setField("state")(e.target.value)}
							fullWidth
						/>
					</Grid>
				</Grid>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} disabled={submitting}>Cancelar</Button>
				<Button
					variant="contained"
					onClick={handleSubmit}
					disabled={!canSubmit || submitting}
					startIcon={submitting ? <CircularProgress size={14} /> : null}
				>
					{submitting ? "Guardando…" : (mode === "add" ? "Crear contacto" : "Guardar cambios")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
