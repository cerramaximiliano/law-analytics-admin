import React, { useEffect, useMemo, useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	TextField,
	Box,
	IconButton,
	CircularProgress,
	Alert,
	Chip,
	Autocomplete,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Divider,
	FormControlLabel,
	Switch,
} from "@mui/material";
import { CloseCircle } from "iconsax-react";
import { ContactStatus } from "types/marketing-contact";
import { MarketingContactService } from "store/reducers/marketing-contacts";

const isFueroTag = (tag: string) => tag === "judicial" || tag.startsWith("judicial_");

interface EditContactModalProps {
	open: boolean;
	onClose: () => void;
	contactId: string | null;
	onSave: () => void; // Callback para actualizar la lista después de guardar
}

const EditContactModal: React.FC<EditContactModalProps> = ({ open, onClose, contactId, onSave }) => {
	// Determinar si es modo creación o edición
	const isEditMode = Boolean(contactId);

	// Controlamos solo el estado de la carga
	const [loading, setLoading] = useState<boolean>(false);
	const [saving, setSaving] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [formError, setFormError] = useState<Record<string, string>>({});

	// Form fields
	const [email, setEmail] = useState<string>("");
	const [firstName, setFirstName] = useState<string>("");
	const [lastName, setLastName] = useState<string>("");
	const [phone, setPhone] = useState<string>("");
	const [company, setCompany] = useState<string>("");
	const [position, setPosition] = useState<string>("");
	const [status, setStatus] = useState<ContactStatus>("active");
	const [tags, setTags] = useState<string[]>([]);
	const [availableTags, setAvailableTags] = useState<string[]>([]);
	const [isAppUser, setIsAppUser] = useState<boolean>(false);
	const [isVerified, setIsVerified] = useState<boolean>(false);

	// Etiquetas existentes, para elegirlas en lugar de escribirlas
	useEffect(() => {
		if (!open) return;
		MarketingContactService.getTags(500)
			.then((list) => setAvailableTags(list))
			.catch((err) => console.error("Error cargando etiquetas:", err));
	}, [open]);

	// Fuero primero (agrupadas), después el resto; incluye las ya asignadas al contacto
	const tagOptions = useMemo(
		() =>
			Array.from(new Set([...availableTags, ...tags])).sort((a, b) => Number(isFueroTag(b)) - Number(isFueroTag(a)) || a.localeCompare(b)),
		[availableTags, tags],
	);

	// Cargar datos del contacto cuando cambie el ID
	useEffect(() => {
		if (open && contactId) {
			fetchContactDetails(contactId);
		} else {
			resetForm();
		}
	}, [open, contactId]);

	// Obtener detalles del contacto
	const fetchContactDetails = async (id: string) => {
		try {
			setLoading(true);
			setError(null);
			const data = await MarketingContactService.getContactById(id);

			// Llenar formulario con datos del contacto
			setEmail(data.email || "");
			setFirstName(data.firstName || "");
			setLastName(data.lastName || "");
			setPhone(data.phone || "");
			setCompany(data.company || "");
			setPosition(data.position || "");
			setStatus(data.status || ("active" as ContactStatus));

			// Procesar etiquetas
			const contactTags = data.tags || [];
			setTags(contactTags.map((tag: any) => (typeof tag === "string" ? tag : tag.name)));

			// Cargar campos booleanos
			setIsAppUser(data.isAppUser || false);
			setIsVerified(data.isVerified || false);
		} catch (err: any) {
			setError(err?.message || "No se pudo cargar la información del contacto");
		} finally {
			setLoading(false);
		}
	};

	// Resetear formulario
	const resetForm = () => {
		setEmail("");
		setFirstName("");
		setLastName("");
		setPhone("");
		setCompany("");
		setPosition("");
		setStatus("active" as ContactStatus);
		setTags([]);
		setFormError({});
		setIsAppUser(false);
		setIsVerified(false);
	};

	// Validar formulario
	const validateForm = (): boolean => {
		const errors: Record<string, string> = {};

		// Validar email (requerido y formato)
		if (!email.trim()) {
			errors.email = "El email es obligatorio";
		} else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
			errors.email = "Email inválido";
		}

		setFormError(errors);
		return Object.keys(errors).length === 0;
	};

	// Guardar cambios (crear o actualizar)
	const handleSave = async () => {
		if (!validateForm()) return;

		try {
			setSaving(true);
			setError(null);

			const contactData = {
				email,
				firstName: firstName.trim() || undefined,
				lastName: lastName.trim() || undefined,
				phone: phone.trim() || undefined,
				company: company.trim() || undefined,
				position: position.trim() || undefined,
				tags: tags.length > 0 ? tags : undefined,
				status,
				isAppUser,
				isVerified,
			};

			if (isEditMode && contactId) {
				// Modo edición: actualizar contacto existente
				await MarketingContactService.updateContact(contactId, contactData);
			} else {
				// Modo creación: crear nuevo contacto
				await MarketingContactService.createContact(contactData);
			}

			// Éxito - cerrar modal y actualizar lista
			onSave();
			onClose();
		} catch (err: any) {
			const errorMessage = isEditMode ? "No se pudo guardar la información del contacto" : "No se pudo crear el contacto";
			setError(err?.message || errorMessage);
		} finally {
			setSaving(false);
		}
	};

	// Manejar etiquetas
	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="md"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					borderRadius: 2,
				},
			}}
		>
			<DialogTitle>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h5">{isEditMode ? "Editar Contacto" : "Nuevo Contacto"}</Typography>
					</Grid>
					<Grid item>
						<IconButton onClick={onClose} size="small">
							<CloseCircle variant="Bold" />
						</IconButton>
					</Grid>
				</Grid>
			</DialogTitle>

			<DialogContent dividers>
				{loading ? (
					<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 3 }}>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error" sx={{ my: 2 }}>
						{error}
					</Alert>
				) : (
					<Grid container spacing={2}>
						{/* Información básica */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Información Básica
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								required
								label="Email"
								name="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								error={!!formError.email}
								helperText={formError.email}
								disabled={saving}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Nombre"
								name="firstName"
								value={firstName}
								onChange={(e) => setFirstName(e.target.value)}
								disabled={saving}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Apellido"
								name="lastName"
								value={lastName}
								onChange={(e) => setLastName(e.target.value)}
								disabled={saving}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Teléfono"
								name="phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								disabled={saving}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<FormControl fullWidth>
								<InputLabel id="status-label">Estado</InputLabel>
								<Select
									labelId="status-label"
									value={status}
									label="Estado"
									onChange={(e) => setStatus(e.target.value as ContactStatus)}
									disabled={saving}
								>
									<MenuItem value="active">Activo</MenuItem>
									<MenuItem value="unsubscribed">Cancelado</MenuItem>
									<MenuItem value="bounced">Rebotado</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Empresa"
								name="company"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
								disabled={saving}
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<TextField
								fullWidth
								label="Cargo"
								name="position"
								value={position}
								onChange={(e) => setPosition(e.target.value)}
								disabled={saving}
							/>
						</Grid>

						{/* Opciones de usuario */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
								Opciones de Usuario
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={12} sm={6}>
							<FormControlLabel
								control={<Switch checked={isAppUser} onChange={(e) => setIsAppUser(e.target.checked)} disabled={saving} />}
								label="Usuario de la App"
							/>
						</Grid>

						<Grid item xs={12} sm={6}>
							<FormControlLabel
								control={<Switch checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} disabled={saving} />}
								label="Verificado"
							/>
						</Grid>

						{/* Etiquetas */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
								Etiquetas
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Autocomplete
								multiple
								freeSolo
								disableCloseOnSelect
								options={tagOptions}
								groupBy={(option) => (isFueroTag(option) ? "Fuero PJN (email marketing)" : "Otras etiquetas")}
								value={tags}
								onChange={(_e, value) => setTags(Array.from(new Set(value.map((v) => v.trim()).filter(Boolean))))}
								disabled={saving}
								renderTags={(value, getTagProps) =>
									value.map((option, index) => {
										const { key, ...chipProps } = getTagProps({ index });
										return <Chip key={key} label={option} color="primary" variant="outlined" {...chipProps} />;
									})
								}
								renderInput={(params) => (
									<TextField
										{...params}
										label="Etiquetas"
										placeholder="Elegí una existente o escribí una nueva y Enter"
										helperText="Las campañas de captación PJN no segmentan por etiqueta (usan el fuero, la antigüedad del último documento y el correo validado). Una etiqueta sola no inscribe al contacto en una campaña: para eso usá la inscripción directa a la campaña."
									/>
								)}
							/>
						</Grid>
					</Grid>
				)}
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} color="inherit" disabled={saving}>
					Cancelar
				</Button>
				<Button
					onClick={handleSave}
					color="primary"
					variant="contained"
					disabled={loading || saving || !email}
					startIcon={saving && <CircularProgress size={20} color="inherit" />}
				>
					{saving ? "Guardando…" : isEditMode ? "Guardar Cambios" : "Crear Contacto"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default EditContactModal;
