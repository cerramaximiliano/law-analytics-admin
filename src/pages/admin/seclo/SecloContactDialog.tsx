import { useEffect, useState } from "react";
import {
	Alert,
	Autocomplete,
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
	useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";

import adminAxios from "utils/adminAxios";
import { dispatch } from "store";
import { openSnackbar } from "store/reducers/snackbar";

import type { SecloContact, SecloFolder } from "types/seclo";
import { CONTACT_ROLE_OPTIONS, TIPO_SOCIEDAD_OPTIONS } from "types/seclo";
import { BRAND_BLUE, headerBorder } from "themes/dashboardTokens";

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
	role: string;
	type: string;
	tipoSociedad: string;
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
	name: "",
	lastName: "",
	role: "",
	type: "Persona Física",
	tipoSociedad: "",
	cuit: "",
	document: "",
	phoneCodArea: "",
	phoneCelular: "",
	phone: "",
	email: "",
	street: "",
	streetNumber: "",
	floor: "",
	apartment: "",
	city: "",
	state: "",
	zipCode: "",
	company: "",
};

/**
 * Parsea el legacy `address` ("Av. Corrientes 1234") al shape estructurado.
 * Sólo se usa al cargar contactos antiguos que todavía no tienen los campos
 * separados poblados. La heurística es la misma que usa el worker SECLO.
 */
/**
 * Rol sugerido según el contexto SECLO: el trabajador (requirente) suele ser
 * el cliente del estudio y el empleador (requerido) la contraparte. Es sólo
 * un default — el admin puede elegir cualquier categoría.
 */
function defaultRoleFor(roleHint?: "trabajador" | "empleador"): string {
	if (roleHint === "trabajador") return "Cliente";
	if (roleHint === "empleador") return "Contrario";
	return "";
}

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
export default function SecloContactDialog({ open, mode, userId, contact, folderId, roleHint, onClose, onSaved }: Props) {
	const theme = useTheme();
	const isDark = theme.palette.mode === "dark";
	const [form, setForm] = useState<FormState>(empty);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Rol con el que se prefilleó el form. En edit, sólo enviamos `role` si el
	// admin lo cambió — así un rol array (contactos importados de PJN) no se
	// pisa con un string al guardar otros campos.
	const [initialRole, setInitialRole] = useState<string>("");
	// Carpeta a vincular (sólo en modo add — el PATCH de edición no toca folderIds)
	const [folders, setFolders] = useState<SecloFolder[]>([]);
	const [selectedFolder, setSelectedFolder] = useState<SecloFolder | null>(null);
	const [loadingFolders, setLoadingFolders] = useState(false);

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
			// role puede venir como array (importados de PJN) — mostramos el primero.
			// En edit NO defaulteamos: el contact puede venir de un populate proyectado
			// sin role, y un default enviado pisaría el valor real en Mongo.
			const roleValue = Array.isArray(contact.role) ? contact.role[0] || "" : contact.role || "";
			setInitialRole(roleValue);
			setForm({
				name: contact.name || "",
				lastName: contact.lastName || "",
				role: roleValue || (mode === "add" ? defaultRoleFor(roleHint) : ""),
				type: (contact as any).type || "Persona Física",
				tipoSociedad: contact.tipoSociedad || "",
				cuit: contact.cuit || "",
				document: contact.document || "",
				phoneCodArea: contact.phoneCodArea || "",
				phoneCelular: contact.phoneCelular || "",
				phone: contact.phone || "",
				email: contact.email || "",
				street: parsed.street,
				streetNumber: parsed.streetNumber,
				floor: contact.floor || "",
				apartment: contact.apartment || "",
				city: contact.city || "",
				state: contact.state || "",
				zipCode: contact.zipCode || "",
				company: contact.company || "",
			});
		} else {
			setInitialRole("");
			setForm({ ...empty, role: defaultRoleFor(roleHint) });
		}
	}, [open, contact, mode, roleHint]);

	// Cargar las carpetas del usuario para el selector de vinculación (sólo alta).
	// Preselecciona la carpeta del wizard si vino por prop.
	useEffect(() => {
		if (!open || mode !== "add" || !userId) return;
		let cancelled = false;
		setLoadingFolders(true);
		adminAxios
			.get(`/api/seclo/users/${userId}/folders`, { params: { limit: 200 } })
			.then((res) => {
				if (cancelled || !res.data?.success) return;
				const list: SecloFolder[] = res.data.folders || [];
				setFolders(list);
				setSelectedFolder(folderId ? list.find((f) => f._id === folderId) || null : null);
			})
			.catch(() => {
				// Si falla la carga, el selector queda vacío — el contacto se puede
				// crear igual sin carpeta vinculada.
				if (!cancelled) setFolders([]);
			})
			.finally(() => {
				if (!cancelled) setLoadingFolders(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open, mode, userId, folderId]);

	const setField = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

	// SECLO carga al portal calle y número como campos separados — sin
	// ellos el form no se puede submitear y la solicitud falla. Los
	// exigimos al guardar para que ningún contacto que pase por SECLO
	// quede con domicilio incompleto.
	// Si type === "Persona Jurídica", el portal SECLO exige un subtipo concreto
	// (cmbTipoSociedad). Para personas físicas se asume "Persona Física" y el
	// campo queda implícito.
	// role, city y state son required en el schema Contact del server para
	// contactos manuales — sin ellos el create devuelve ValidationError.
	const isJuridica = form.type === "Persona Jurídica";
	const errors = {
		name: !form.name.trim() ? "Requerido" : "",
		lastName: !form.lastName.trim() ? "Requerido" : "",
		role: mode === "add" && !form.role.trim() ? "Requerido" : "",
		street: !form.street.trim() ? "Requerido por SECLO" : "",
		streetNumber: !form.streetNumber.trim() ? "Requerido por SECLO" : "",
		city: mode === "add" && !form.city.trim() ? "Requerido" : "",
		state: mode === "add" && !form.state.trim() ? "Requerido" : "",
		tipoSociedad: isJuridica && !form.tipoSociedad.trim() ? "Requerido por SECLO" : "",
	};
	const canSubmit = Object.values(errors).every((e) => !e);

	const handleSubmit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			// Reconstruimos el legacy `address` desde calle+número para que
			// los flujos no migrados (facturas, exports PDF) sigan viendo un
			// domicilio coherente. Piso/depto van sólo a sus campos.
			const composedAddress = [form.street.trim(), form.streetNumber.trim()].filter(Boolean).join(" ");
			// Para personas físicas siempre persistimos tipoSociedad="Persona Física"
			// (el portal SECLO usa ese valor). Para jurídicas guardamos lo que
			// eligió el admin. Nunca dejamos el campo vacío en escritura — así los
			// contactos creados desde acá nunca arrastran la inconsistencia legacy.
			const tipoSociedadNorm = form.type === "Persona Jurídica" ? form.tipoSociedad : "Persona Física";
			const payload: Record<string, unknown> = {
				...form,
				tipoSociedad: tipoSociedadNorm,
				cuit: form.cuit.replace(/\D/g, "") || undefined,
				address: composedAddress,
				...(mode === "add" && selectedFolder ? { folderIds: [selectedFolder._id] } : {}),
			};
			// En edit, sólo mandamos role si el admin lo cambió — evita convertir
			// un role array (contactos PJN) en string al editar otros campos.
			if (mode === "edit" && form.role === initialRole) {
				delete payload.role;
			}

			let response;
			if (mode === "add") {
				response = await adminAxios.post(`/api/seclo/users/${userId}/contacts`, payload);
			} else {
				if (!contact?._id) throw new Error("Falta ID del contacto a editar");
				response = await adminAxios.patch(`/api/seclo/contacts/${contact._id}`, payload);
			}

			if (response.data?.success && response.data?.contact) {
				dispatch(
					openSnackbar({
						open: true,
						message: mode === "add" ? "Contacto creado" : "Contacto actualizado",
						variant: "alert",
						alert: { color: "success" },
					}),
				);
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
		<Dialog
			open={open}
			onClose={() => !submitting && onClose()}
			maxWidth="md"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 2.5,
					boxShadow: `0 16px 40px ${alpha(BRAND_BLUE, isDark ? 0.32 : 0.18)}`,
				},
			}}
		>
			<DialogTitle sx={{ borderBottom: `1px solid ${headerBorder(isDark)}` }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between">
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
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
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				{mode === "edit" && (
					<Alert severity="info" sx={{ mb: 2 }}>
						Completá los campos que falten. Para SECLO suele ser crítico el celular del trabajador (código de área + número).
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

					<Grid item xs={12}>
						<FormControl fullWidth error={!!errors.role}>
							<InputLabel id="role-label">{mode === "add" ? "Categoría *" : "Categoría"}</InputLabel>
							<Select
								labelId="role-label"
								value={form.role}
								label={mode === "add" ? "Categoría *" : "Categoría"}
								onChange={(e) => setField("role")(e.target.value)}
							>
								{/* En edit el rol puede venir vacío (contactos legacy) o con un valor
								    fuera del catálogo (campo Mixed) — los incluimos para que el Select
								    no quede out-of-range. */}
								{mode === "edit" && !form.role && (
									<MenuItem value="">
										<em>Sin categoría</em>
									</MenuItem>
								)}
								{form.role && !CONTACT_ROLE_OPTIONS.includes(form.role as (typeof CONTACT_ROLE_OPTIONS)[number]) && (
									<MenuItem value={form.role}>{form.role}</MenuItem>
								)}
								{CONTACT_ROLE_OPTIONS.map((opt) => (
									<MenuItem key={opt} value={opt}>
										{opt}
									</MenuItem>
								))}
							</Select>
							<Typography variant="caption" color={errors.role ? "error" : "text.secondary"} sx={{ mt: 0.5 }}>
								{errors.role || "Rol del contacto en el sistema (ej. Cliente para el trabajador, Contrario para el empleador)."}
							</Typography>
						</FormControl>
					</Grid>

					<Grid item xs={12} sm={6}>
						<FormControl fullWidth>
							<InputLabel>Tipo</InputLabel>
							<Select value={form.type} label="Tipo" onChange={(e) => setField("type")(e.target.value)}>
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

					{isJuridica && (
						<Grid item xs={12}>
							<FormControl fullWidth error={!!errors.tipoSociedad}>
								<InputLabel id="tipoSociedad-label">Tipo de persona jurídica *</InputLabel>
								<Select
									labelId="tipoSociedad-label"
									value={form.tipoSociedad}
									label="Tipo de persona jurídica *"
									onChange={(e) => setField("tipoSociedad")(e.target.value)}
								>
									{TIPO_SOCIEDAD_OPTIONS.filter((o) => o !== "Persona Física").map((opt) => (
										<MenuItem key={opt} value={opt}>
											{opt}
										</MenuItem>
									))}
								</Select>
								<Typography variant="caption" color={errors.tipoSociedad ? "error" : "text.secondary"} sx={{ mt: 0.5 }}>
									{errors.tipoSociedad || "El portal SECLO lo exige para personas jurídicas (cmbTipoSociedad)."}
								</Typography>
							</FormControl>
						</Grid>
					)}

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
						<TextField label="DNI" value={form.document} onChange={(e) => setField("document")(e.target.value)} fullWidth />
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
						<TextField label="Tel. fijo" value={form.phone} onChange={(e) => setField("phone")(e.target.value)} fullWidth />
					</Grid>

					<Grid item xs={12} sm={12}>
						<TextField label="Email" type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} fullWidth />
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
							helperText="Opcional"
							fullWidth
						/>
					</Grid>
					<Grid item xs={6} sm={3}>
						<TextField
							label="Depto"
							placeholder="B"
							value={form.apartment}
							onChange={(e) => setField("apartment")(e.target.value)}
							helperText="Opcional"
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField label="Código postal" value={form.zipCode} onChange={(e) => setField("zipCode")(e.target.value)} fullWidth />
					</Grid>

					<Grid item xs={12} sm={6}>
						<TextField
							label={mode === "add" ? "Ciudad/Localidad *" : "Ciudad/Localidad"}
							value={form.city}
							onChange={(e) => setField("city")(e.target.value)}
							error={!!errors.city}
							helperText={errors.city || " "}
							fullWidth
						/>
					</Grid>
					<Grid item xs={12} sm={6}>
						<TextField
							label={mode === "add" ? "Provincia *" : "Provincia"}
							value={form.state}
							onChange={(e) => setField("state")(e.target.value)}
							error={!!errors.state}
							helperText={errors.state || " "}
							fullWidth
						/>
					</Grid>

					{/* Vinculación con carpeta — sólo en alta. El contacto queda
					    siempre vinculado al usuario del wizard (userId va en la URL);
					    la carpeta es opcional y agrega el contactId a folderIds. */}
					{mode === "add" && (
						<>
							<Grid item xs={12}>
								<Typography variant="caption" color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
									Vinculación
								</Typography>
							</Grid>
							<Grid item xs={12}>
								<Autocomplete
									options={folders}
									value={selectedFolder}
									onChange={(_e, value) => setSelectedFolder(value)}
									getOptionLabel={(f) => f.folderName || f._id}
									isOptionEqualToValue={(a, b) => a._id === b._id}
									loading={loadingFolders}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Carpeta (opcional)"
											helperText="Vincula el contacto a una carpeta del usuario. Podés dejarlo vacío."
											InputProps={{
												...params.InputProps,
												endAdornment: (
													<>
														{loadingFolders ? <CircularProgress size={16} /> : null}
														{params.InputProps.endAdornment}
													</>
												),
											}}
										/>
									)}
								/>
							</Grid>
						</>
					)}
				</Grid>
			</DialogContent>

			<DialogActions sx={{ borderTop: `1px solid ${headerBorder(isDark)}`, px: 3, py: 2 }}>
				<Button onClick={onClose} disabled={submitting}>
					Cancelar
				</Button>
				<Button
					variant="contained"
					onClick={handleSubmit}
					disabled={!canSubmit || submitting}
					startIcon={submitting ? <CircularProgress size={14} /> : null}
					sx={{
						transition: "transform 200ms ease, box-shadow 200ms ease",
						"&:hover:not(:disabled)": { transform: "translateY(-1px)" },
						"&:active:not(:disabled)": { transform: "scale(0.98)" },
					}}
				>
					{submitting ? "Guardando…" : mode === "add" ? "Crear contacto" : "Guardar cambios"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
