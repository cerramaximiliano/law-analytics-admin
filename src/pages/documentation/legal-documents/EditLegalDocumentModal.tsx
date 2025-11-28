import React, { useEffect, useState } from "react";
import { useDispatch } from "store/index";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Typography,
	useTheme,
} from "@mui/material";

// project imports
import { updateLegalDocument } from "store/reducers/legal-documents";
import { LegalDocument, LegalDocumentSection, CompanyDetails } from "types/legal-document";

// assets
import { CloseCircle, Add, Trash, ArrowUp2, ArrowDown2 } from "iconsax-react";

interface EditLegalDocumentModalProps {
	open: boolean;
	onClose: () => void;
	document: LegalDocument;
	onSuccess?: () => void;
}

const EditLegalDocumentModal: React.FC<EditLegalDocumentModalProps> = ({ open, onClose, document, onSuccess }) => {
	const theme = useTheme();
	const dispatch = useDispatch();

	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState<Partial<LegalDocument>>({});
	const [sections, setSections] = useState<LegalDocumentSection[]>([]);
	const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
		name: "",
		address: "",
		email: "",
		phone: "",
		registrationNumber: "",
	});

	// Inicializar formulario cuando se abre el modal
	useEffect(() => {
		if (open && document) {
			setFormData({
				title: document.title,
				documentType: document.documentType,
				version: document.version,
				language: document.language,
				region: document.region,
				effectiveDate: document.effectiveDate ? document.effectiveDate.split("T")[0] : "",
				isActive: document.isActive,
				introduction: document.introduction || "",
				conclusion: document.conclusion || "",
			});
			setSections(document.sections ? [...document.sections] : []);
			setCompanyDetails(
				document.companyDetails || {
					name: "",
					address: "",
					email: "",
					phone: "",
					registrationNumber: "",
				}
			);
		}
	}, [open, document]);

	const handleInputChange = (field: keyof LegalDocument, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleCompanyDetailChange = (field: keyof CompanyDetails, value: string) => {
		setCompanyDetails((prev) => ({ ...prev, [field]: value }));
	};

	// Manejo de secciones
	const handleAddSection = () => {
		const newSection: LegalDocumentSection = {
			title: "",
			content: "",
			order: sections.length + 1,
			visibleFor: ["free", "standard", "premium"],
		};
		setSections([...sections, newSection]);
	};

	const handleRemoveSection = (index: number) => {
		const newSections = sections.filter((_, i) => i !== index);
		// Reordenar
		const reorderedSections = newSections.map((section, i) => ({
			...section,
			order: i + 1,
		}));
		setSections(reorderedSections);
	};

	const handleSectionChange = (index: number, field: keyof LegalDocumentSection, value: any) => {
		const newSections = [...sections];
		newSections[index] = { ...newSections[index], [field]: value };
		setSections(newSections);
	};

	const handleMoveSection = (index: number, direction: "up" | "down") => {
		if ((direction === "up" && index === 0) || (direction === "down" && index === sections.length - 1)) {
			return;
		}

		const newSections = [...sections];
		const targetIndex = direction === "up" ? index - 1 : index + 1;

		// Intercambiar posiciones
		[newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];

		// Actualizar orden
		const reorderedSections = newSections.map((section, i) => ({
			...section,
			order: i + 1,
		}));
		setSections(reorderedSections);
	};

	const handleVisibleForChange = (index: number, plan: string) => {
		const newSections = [...sections];
		const currentVisibleFor = newSections[index].visibleFor || [];

		if (currentVisibleFor.includes(plan)) {
			newSections[index].visibleFor = currentVisibleFor.filter((p) => p !== plan);
		} else {
			newSections[index].visibleFor = [...currentVisibleFor, plan];
		}
		setSections(newSections);
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			const dataToUpdate: Partial<LegalDocument> = {
				...formData,
				sections: sections,
				companyDetails: companyDetails,
			};

			await dispatch(updateLegalDocument({ documentId: document._id, data: dataToUpdate }));
			onSuccess?.();
			onClose();
		} catch (error) {
			console.error("Error al actualizar documento:", error);
		} finally {
			setLoading(false);
		}
	};

	const planOptions = ["free", "standard", "premium"];

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="lg"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					maxHeight: "95vh",
				},
			}}
		>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Editar Documento Legal</Typography>
					<IconButton onClick={onClose} color="error">
						<CloseCircle size={24} />
					</IconButton>
				</Stack>
			</DialogTitle>
			<Divider />
			<DialogContent>
				<Stack spacing={3} sx={{ mt: 1 }}>
					{/* Informacion basica */}
					<Box>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Informacion Basica
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Titulo"
									value={formData.title || ""}
									onChange={(e) => handleInputChange("title", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={3}>
								<FormControl fullWidth>
									<InputLabel>Tipo de Documento</InputLabel>
									<Select
										value={formData.documentType || ""}
										label="Tipo de Documento"
										onChange={(e) => handleInputChange("documentType", e.target.value)}
									>
										<MenuItem value="subscription">Suscripcion</MenuItem>
										<MenuItem value="refund">Reembolsos</MenuItem>
										<MenuItem value="billing">Facturacion</MenuItem>
										<MenuItem value="privacy">Privacidad</MenuItem>
										<MenuItem value="terms">Terminos de Uso</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} md={3}>
								<TextField
									fullWidth
									label="Version"
									value={formData.version || ""}
									onChange={(e) => handleInputChange("version", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<FormControl fullWidth>
									<InputLabel>Idioma</InputLabel>
									<Select
										value={formData.language || ""}
										label="Idioma"
										onChange={(e) => handleInputChange("language", e.target.value)}
									>
										<MenuItem value="es">Espanol</MenuItem>
										<MenuItem value="en">Ingles</MenuItem>
										<MenuItem value="pt">Portugues</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									fullWidth
									label="Region"
									value={formData.region || ""}
									onChange={(e) => handleInputChange("region", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={4}>
								<TextField
									fullWidth
									type="date"
									label="Fecha Efectiva"
									value={formData.effectiveDate || ""}
									onChange={(e) => handleInputChange("effectiveDate", e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Grid>
							<Grid item xs={12}>
								<FormControlLabel
									control={
										<Switch
											checked={formData.isActive || false}
											onChange={(e) => handleInputChange("isActive", e.target.checked)}
											color="success"
										/>
									}
									label="Documento Activo"
								/>
							</Grid>
						</Grid>
					</Box>

					<Divider />

					{/* Introduccion */}
					<Box>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Introduccion
						</Typography>
						<TextField
							fullWidth
							multiline
							rows={3}
							placeholder="Texto introductorio del documento..."
							value={formData.introduction || ""}
							onChange={(e) => handleInputChange("introduction", e.target.value)}
						/>
					</Box>

					<Divider />

					{/* Secciones */}
					<Box>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
							<Typography variant="subtitle1" fontWeight={600}>
								Secciones ({sections.length})
							</Typography>
							<Button variant="outlined" startIcon={<Add size={18} />} onClick={handleAddSection} size="small">
								Agregar Seccion
							</Button>
						</Stack>

						<Stack spacing={2}>
							{sections.map((section, index) => (
								<Box
									key={index}
									sx={{
										p: 2,
										border: `1px solid ${theme.palette.divider}`,
										borderRadius: 1,
										backgroundColor: theme.palette.mode === "dark" ? "background.paper" : "grey.50",
									}}
								>
									<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
										<Typography variant="subtitle2" color="primary">
											Seccion {section.order}
										</Typography>
										<Stack direction="row" spacing={0.5}>
											<IconButton
												size="small"
												onClick={() => handleMoveSection(index, "up")}
												disabled={index === 0}
											>
												<ArrowUp2 size={16} />
											</IconButton>
											<IconButton
												size="small"
												onClick={() => handleMoveSection(index, "down")}
												disabled={index === sections.length - 1}
											>
												<ArrowDown2 size={16} />
											</IconButton>
											<IconButton size="small" color="error" onClick={() => handleRemoveSection(index)}>
												<Trash size={16} />
											</IconButton>
										</Stack>
									</Stack>

									<Grid container spacing={2}>
										<Grid item xs={12}>
											<TextField
												fullWidth
												label="Titulo de la Seccion"
												value={section.title}
												onChange={(e) => handleSectionChange(index, "title", e.target.value)}
												size="small"
											/>
										</Grid>
										<Grid item xs={12}>
											<TextField
												fullWidth
												multiline
												rows={3}
												label="Contenido"
												value={section.content}
												onChange={(e) => handleSectionChange(index, "content", e.target.value)}
												size="small"
											/>
										</Grid>
										<Grid item xs={12}>
											<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
												Visible para planes:
											</Typography>
											<Stack direction="row" spacing={1}>
												{planOptions.map((plan) => (
													<Chip
														key={plan}
														label={plan}
														size="small"
														variant={section.visibleFor?.includes(plan) ? "filled" : "outlined"}
														color={section.visibleFor?.includes(plan) ? "primary" : "default"}
														onClick={() => handleVisibleForChange(index, plan)}
														sx={{ cursor: "pointer" }}
													/>
												))}
											</Stack>
										</Grid>
									</Grid>
								</Box>
							))}

							{sections.length === 0 && (
								<Box
									sx={{
										p: 4,
										textAlign: "center",
										border: `1px dashed ${theme.palette.divider}`,
										borderRadius: 1,
									}}
								>
									<Typography variant="body2" color="text.secondary">
										No hay secciones. Haz clic en "Agregar Seccion" para crear una.
									</Typography>
								</Box>
							)}
						</Stack>
					</Box>

					<Divider />

					{/* Conclusion */}
					<Box>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Conclusion
						</Typography>
						<TextField
							fullWidth
							multiline
							rows={3}
							placeholder="Texto de conclusion del documento..."
							value={formData.conclusion || ""}
							onChange={(e) => handleInputChange("conclusion", e.target.value)}
						/>
					</Box>

					<Divider />

					{/* Detalles de la empresa */}
					<Box>
						<Typography variant="subtitle1" fontWeight={600} gutterBottom>
							Informacion de la Empresa
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Nombre de la Empresa"
									value={companyDetails.name}
									onChange={(e) => handleCompanyDetailChange("name", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Numero de Registro"
									value={companyDetails.registrationNumber}
									onChange={(e) => handleCompanyDetailChange("registrationNumber", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Direccion"
									value={companyDetails.address}
									onChange={(e) => handleCompanyDetailChange("address", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Email"
									type="email"
									value={companyDetails.email}
									onChange={(e) => handleCompanyDetailChange("email", e.target.value)}
								/>
							</Grid>
							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Telefono"
									value={companyDetails.phone}
									onChange={(e) => handleCompanyDetailChange("phone", e.target.value)}
								/>
							</Grid>
						</Grid>
					</Box>
				</Stack>
			</DialogContent>
			<Divider />
			<DialogActions sx={{ p: 2 }}>
				<Button onClick={onClose} color="inherit">
					Cancelar
				</Button>
				<Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
					{loading ? <CircularProgress size={20} /> : "Guardar Cambios"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default EditLegalDocumentModal;
