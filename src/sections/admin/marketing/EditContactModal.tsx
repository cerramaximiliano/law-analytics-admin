import React, { useEffect, useState } from "react";
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
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Divider,
} from "@mui/material";
import { Add, CloseCircle } from "iconsax-react";
import { ContactStatus } from "types/marketing-contact";
import { MarketingContactService } from "store/reducers/marketing-contacts";

interface EditContactModalProps {
	open: boolean;
	onClose: () => void;
	contactId: string | null;
	onSave: () => void; // Callback para actualizar la lista después de guardar
}

const EditContactModal: React.FC<EditContactModalProps> = ({ open, onClose, contactId, onSave }) => {
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
	const [tagInput, setTagInput] = useState<string>("");
	const [tags, setTags] = useState<string[]>([]);

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
		setTagInput("");
		setFormError({});
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

	// Guardar cambios
	const handleSave = async () => {
		if (!validateForm()) return;

		try {
			setSaving(true);
			setError(null);

			if (!contactId) {
				throw new Error("ID de contacto no disponible");
			}

			const contactData = {
				email,
				firstName: firstName.trim() || undefined,
				lastName: lastName.trim() || undefined,
				phone: phone.trim() || undefined,
				company: company.trim() || undefined,
				position: position.trim() || undefined,
				tags: tags.length > 0 ? tags : undefined,
				status,
			};

			await MarketingContactService.updateContact(contactId, contactData);

			// Éxito - cerrar modal y actualizar lista
			onSave();
			onClose();
		} catch (err: any) {
			setError(err?.message || "No se pudo guardar la información del contacto");
		} finally {
			setSaving(false);
		}
	};

	// Manejar etiquetas
	const handleAddTag = () => {
		if (tagInput.trim() && !tags.includes(tagInput.trim())) {
			setTags([...tags, tagInput.trim()]);
			setTagInput("");
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setTags(tags.filter((tag) => tag !== tagToRemove));
	};

	const handleTagKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTag();
		}
	};

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
						<Typography variant="h5">Editar Contacto</Typography>
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

						{/* Etiquetas */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
								Etiquetas
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Grid container spacing={2} alignItems="center">
								<Grid item xs>
									<TextField
										fullWidth
										label="Añadir etiqueta"
										value={tagInput}
										onChange={(e) => setTagInput(e.target.value)}
										onKeyPress={handleTagKeyPress}
										disabled={saving}
										InputProps={{
											endAdornment: (
												<IconButton size="small" onClick={handleAddTag} disabled={!tagInput.trim() || saving}>
													<Add />
												</IconButton>
											),
										}}
									/>
								</Grid>
							</Grid>

							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
								{tags.length > 0 ? (
									tags.map((tag, index) => (
										<Chip
											key={index}
											label={tag}
											onDelete={() => handleRemoveTag(tag)}
											disabled={saving}
											color="primary"
											variant="outlined"
										/>
									))
								) : (
									<Typography variant="body2" color="textSecondary">
										No hay etiquetas asignadas
									</Typography>
								)}
							</Box>
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
					{saving ? "Guardando..." : "Guardar Cambios"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default EditContactModal;
