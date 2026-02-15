import { useState, useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Box,
	Chip,
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Switch,
	FormControlLabel,
	Divider,
	Stack,
	Tabs,
	Tab,
	Alert,
	IconButton,
	Tooltip,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import { CloseCircle, Save2, Copy } from "iconsax-react";
import FoldersService, { Folder } from "api/folders";

interface FolderEditModalProps {
	open: boolean;
	onClose: () => void;
	folder: Folder | null;
	onFolderUpdated?: () => void;
}

// Status options
const STATUS_OPTIONS = ["Nueva", "En Proceso", "Cerrada", "Pendiente"];

// Causa types
const CAUSA_TYPES = ["CausasCivil", "CausasTrabajo", "CausasSegSocial", "CausasComercial", "MEV"];

// Association status options
const ASSOCIATION_STATUS_OPTIONS = ["pending", "success", "failed", "not_attempted"];

// Current phase options
const PHASE_OPTIONS = ["prejudicial", "judicial", null];

const FolderEditModal = ({ open, onClose, folder, onFolderUpdated }: FolderEditModalProps) => {
	const { enqueueSnackbar } = useSnackbar();

	// Tab state
	const [activeTab, setActiveTab] = useState(0);

	// Form state
	const [formData, setFormData] = useState<Partial<Folder>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Initialize form data when folder changes
	useEffect(() => {
		if (open && folder) {
			setFormData({
				folderName: folder.folderName || "",
				materia: folder.materia || "",
				status: folder.status || "Nueva",
				archived: folder.archived || false,
				pjn: folder.pjn || false,
				mev: folder.mev || false,
				folderFuero: folder.folderFuero || "",
				folderJuris: folder.folderJuris || { label: "", item: null },
				initialDateFolder: folder.initialDateFolder || undefined,
				finalDateFolder: folder.finalDateFolder || undefined,
				amount: folder.amount || 0,
				causaId: folder.causaId || undefined,
				causaType: folder.causaType || undefined,
				causaVerified: folder.causaVerified || false,
				causaIsValid: folder.causaIsValid || false,
				causaUpdateEnabled: folder.causaUpdateEnabled || false,
				causaAssociationStatus: (folder as any).causaAssociationStatus || "not_attempted",
				causaAssociationError: (folder as any).causaAssociationError || "",
				judFolder: folder.judFolder || {
					initialDateJudFolder: undefined,
					finalDateJudFolder: undefined,
					numberJudFolder: "",
					statusJudFolder: "",
					amountJudFolder: "",
					descriptionJudFolder: "",
					courtNumber: "",
					secretaryNumber: "",
				},
				scrapingProgress: folder.scrapingProgress || {
					isComplete: false,
					totalExpected: 0,
					totalProcessed: 0,
					status: "",
				},
			});
			setActiveTab(0);
		}
	}, [open, folder]);

	if (!folder) return null;

	// Handle field changes
	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	// Handle nested field changes (judFolder, folderJuris, scrapingProgress)
	const handleNestedChange = (parent: string, field: string, value: any) => {
		setFormData((prev) => ({
			...prev,
			[parent]: {
				...(prev as any)[parent],
				[field]: value,
			},
		}));
	};

	// Handle save
	const handleSave = async () => {
		try {
			setIsSaving(true);

			const response = await FoldersService.updateFolder(folder._id, formData);

			if (response.success) {
				enqueueSnackbar("Carpeta actualizada correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				if (onFolderUpdated) {
					onFolderUpdated();
				}
				onClose();
			}
		} catch (error) {
			enqueueSnackbar("Error al actualizar la carpeta", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	// Format date for display
	const formatDate = (date: string | undefined): string => {
		if (!date) return "N/A";
		return new Date(date).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Convert date string to Dayjs
	const toDayjs = (date: string | undefined): Dayjs | null => {
		if (!date) return null;
		return dayjs(date);
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h5">Editar Carpeta</Typography>
						<Typography variant="body2" color="textSecondary">
							ID: {folder._id}
						</Typography>
					</Box>
					<Tooltip title="Copiar ID">
						<IconButton
							size="small"
							onClick={() => {
								navigator.clipboard.writeText(folder._id);
								enqueueSnackbar("ID copiado al portapapeles", { variant: "success" });
							}}
						>
							<Copy size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</DialogTitle>

			<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
				<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
					<Tab label="General" />
					<Tab label="Judicial" />
					<Tab label="Causa Vinculada" />
					<Tab label="JSON" />
				</Tabs>
			</Box>

			<DialogContent dividers sx={{ height: "500px", overflowY: "auto" }}>
				<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
					{/* Tab 0: General */}
					{activeTab === 0 && (
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Información General
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>

							<Grid item xs={12} md={8}>
								<TextField
									fullWidth
									label="Nombre de la Carpeta"
									value={formData.folderName || ""}
									onChange={(e) => handleChange("folderName", e.target.value)}
									size="small"
								/>
							</Grid>

							<Grid item xs={12} md={4}>
								<FormControl fullWidth size="small">
									<InputLabel>Estado</InputLabel>
									<Select value={formData.status || "Nueva"} onChange={(e) => handleChange("status", e.target.value)} label="Estado">
										{STATUS_OPTIONS.map((opt) => (
											<MenuItem key={opt} value={opt}>
												{opt}
											</MenuItem>
										))}
									</Select>
								</FormControl>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField fullWidth label="Materia" value={formData.materia || ""} onChange={(e) => handleChange("materia", e.target.value)} size="small" />
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Fuero"
									value={formData.folderFuero || ""}
									onChange={(e) => handleChange("folderFuero", e.target.value)}
									size="small"
									placeholder="Civil, Comercial, Trabajo, etc."
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Jurisdicción (Label)"
									value={formData.folderJuris?.label || ""}
									onChange={(e) => handleNestedChange("folderJuris", "label", e.target.value)}
									size="small"
									placeholder="Nacional, Provincial, etc."
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Monto"
									type="number"
									value={formData.amount || 0}
									onChange={(e) => handleChange("amount", parseFloat(e.target.value) || 0)}
									size="small"
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<DatePicker
									label="Fecha Inicio"
									value={toDayjs(formData.initialDateFolder)}
									onChange={(date) => handleChange("initialDateFolder", date?.toISOString())}
									format="DD/MM/YYYY"
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<DatePicker
									label="Fecha Fin"
									value={toDayjs(formData.finalDateFolder)}
									onChange={(date) => handleChange("finalDateFolder", date?.toISOString())}
									format="DD/MM/YYYY"
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>

							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
									Opciones
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>

							<Grid item xs={6} md={3}>
								<FormControlLabel
									control={<Switch checked={formData.archived || false} onChange={(e) => handleChange("archived", e.target.checked)} />}
									label="Archivada"
								/>
							</Grid>

							<Grid item xs={6} md={3}>
								<FormControlLabel control={<Switch checked={formData.pjn || false} onChange={(e) => handleChange("pjn", e.target.checked)} />} label="PJN" />
							</Grid>

							<Grid item xs={6} md={3}>
								<FormControlLabel control={<Switch checked={formData.mev || false} onChange={(e) => handleChange("mev", e.target.checked)} />} label="MEV" />
							</Grid>

							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
									Información del Sistema
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Usuario
								</Typography>
								<Typography variant="body2">{folder.user?.email || folder.userId || "N/A"}</Typography>
							</Grid>

							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									Creado
								</Typography>
								<Typography variant="body2">{formatDate(folder.createdAt)}</Typography>
							</Grid>

							<Grid item xs={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									Actualizado
								</Typography>
								<Typography variant="body2">{formatDate(folder.updatedAt)}</Typography>
							</Grid>
						</Grid>
					)}

					{/* Tab 1: Judicial */}
					{activeTab === 1 && (
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Información Judicial
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Número de Expediente"
									value={formData.judFolder?.numberJudFolder || ""}
									onChange={(e) => handleNestedChange("judFolder", "numberJudFolder", e.target.value)}
									size="small"
									placeholder="123456/2024"
								/>
							</Grid>

							<Grid item xs={6} md={3}>
								<TextField
									fullWidth
									label="Juzgado"
									value={formData.judFolder?.courtNumber || ""}
									onChange={(e) => handleNestedChange("judFolder", "courtNumber", e.target.value)}
									size="small"
								/>
							</Grid>

							<Grid item xs={6} md={3}>
								<TextField
									fullWidth
									label="Secretaría"
									value={formData.judFolder?.secretaryNumber || ""}
									onChange={(e) => handleNestedChange("judFolder", "secretaryNumber", e.target.value)}
									size="small"
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Estado Judicial"
									value={formData.judFolder?.statusJudFolder || ""}
									onChange={(e) => handleNestedChange("judFolder", "statusJudFolder", e.target.value)}
									size="small"
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<TextField
									fullWidth
									label="Monto Judicial"
									value={formData.judFolder?.amountJudFolder || ""}
									onChange={(e) => handleNestedChange("judFolder", "amountJudFolder", e.target.value)}
									size="small"
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<DatePicker
									label="Fecha Inicio Judicial"
									value={toDayjs(formData.judFolder?.initialDateJudFolder)}
									onChange={(date) => handleNestedChange("judFolder", "initialDateJudFolder", date?.toISOString())}
									format="DD/MM/YYYY"
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>

							<Grid item xs={12} md={6}>
								<DatePicker
									label="Fecha Fin Judicial"
									value={toDayjs(formData.judFolder?.finalDateJudFolder)}
									onChange={(date) => handleNestedChange("judFolder", "finalDateJudFolder", date?.toISOString())}
									format="DD/MM/YYYY"
									slotProps={{ textField: { size: "small", fullWidth: true } }}
								/>
							</Grid>

							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Descripción Judicial"
									value={formData.judFolder?.descriptionJudFolder || ""}
									onChange={(e) => handleNestedChange("judFolder", "descriptionJudFolder", e.target.value)}
									size="small"
									multiline
									rows={3}
								/>
							</Grid>
						</Grid>
					)}

					{/* Tab 2: Causa Vinculada */}
					{activeTab === 2 && (
						<Grid container spacing={2}>
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Vinculación con Causa
								</Typography>
								<Divider sx={{ mb: 2 }} />
							</Grid>

							{folder.causaId ? (
								<>
									<Grid item xs={12} md={8}>
										<TextField
											fullWidth
											label="ID de Causa"
											value={formData.causaId || ""}
											onChange={(e) => handleChange("causaId", e.target.value)}
											size="small"
										/>
									</Grid>

									<Grid item xs={12} md={4}>
										<FormControl fullWidth size="small">
											<InputLabel>Tipo de Causa</InputLabel>
											<Select value={formData.causaType || ""} onChange={(e) => handleChange("causaType", e.target.value)} label="Tipo de Causa">
												{CAUSA_TYPES.map((type) => (
													<MenuItem key={type} value={type}>
														{type}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
											Estado de Verificación
										</Typography>
										<Divider sx={{ mb: 2 }} />
									</Grid>

									<Grid item xs={6} md={3}>
										<FormControlLabel
											control={<Switch checked={formData.causaVerified || false} onChange={(e) => handleChange("causaVerified", e.target.checked)} />}
											label="Verificada"
										/>
									</Grid>

									<Grid item xs={6} md={3}>
										<FormControlLabel
											control={<Switch checked={formData.causaIsValid || false} onChange={(e) => handleChange("causaIsValid", e.target.checked)} />}
											label="Válida"
										/>
									</Grid>

									<Grid item xs={6} md={3}>
										<FormControlLabel
											control={
												<Switch checked={formData.causaUpdateEnabled || false} onChange={(e) => handleChange("causaUpdateEnabled", e.target.checked)} />
											}
											label="Updates Habilitados"
										/>
									</Grid>

									<Grid item xs={12} md={6}>
										<FormControl fullWidth size="small">
											<InputLabel>Estado de Asociación</InputLabel>
											<Select
												value={formData.causaAssociationStatus || "not_attempted"}
												onChange={(e) => handleChange("causaAssociationStatus", e.target.value)}
												label="Estado de Asociación"
											>
												{ASSOCIATION_STATUS_OPTIONS.map((opt) => (
													<MenuItem key={opt} value={opt}>
														{opt}
													</MenuItem>
												))}
											</Select>
										</FormControl>
									</Grid>

									<Grid item xs={12} md={6}>
										<TextField
											fullWidth
											label="Error de Asociación"
											value={formData.causaAssociationError || ""}
											onChange={(e) => handleChange("causaAssociationError", e.target.value)}
											size="small"
										/>
									</Grid>

									<Grid item xs={12}>
										<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
											Progreso de Scraping
										</Typography>
										<Divider sx={{ mb: 2 }} />
									</Grid>

									<Grid item xs={6} md={3}>
										<FormControlLabel
											control={
												<Switch
													checked={formData.scrapingProgress?.isComplete || false}
													onChange={(e) => handleNestedChange("scrapingProgress", "isComplete", e.target.checked)}
												/>
											}
											label="Completo"
										/>
									</Grid>

									<Grid item xs={6} md={3}>
										<TextField
											fullWidth
											label="Total Esperado"
											type="number"
											value={formData.scrapingProgress?.totalExpected || 0}
											onChange={(e) => handleNestedChange("scrapingProgress", "totalExpected", parseInt(e.target.value) || 0)}
											size="small"
										/>
									</Grid>

									<Grid item xs={6} md={3}>
										<TextField
											fullWidth
											label="Total Procesado"
											type="number"
											value={formData.scrapingProgress?.totalProcessed || 0}
											onChange={(e) => handleNestedChange("scrapingProgress", "totalProcessed", parseInt(e.target.value) || 0)}
											size="small"
										/>
									</Grid>

									<Grid item xs={6} md={3}>
										<TextField
											fullWidth
											label="Estado Scraping"
											value={formData.scrapingProgress?.status || ""}
											onChange={(e) => handleNestedChange("scrapingProgress", "status", e.target.value)}
											size="small"
										/>
									</Grid>
								</>
							) : (
								<Grid item xs={12}>
									<Alert severity="info">Esta carpeta no tiene una causa vinculada.</Alert>
								</Grid>
							)}
						</Grid>
					)}

					{/* Tab 3: JSON */}
					{activeTab === 3 && (
						<Box sx={{ position: "relative", height: "100%" }}>
							<Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
								<Tooltip title="Copiar JSON">
									<IconButton
										onClick={() => {
											navigator.clipboard.writeText(JSON.stringify(folder, null, 2));
											enqueueSnackbar("JSON copiado al portapapeles", { variant: "success" });
										}}
									>
										<Copy size={20} />
									</IconButton>
								</Tooltip>
							</Box>
							<Box
								component="pre"
								sx={{
									backgroundColor: "background.default",
									p: 2,
									borderRadius: 1,
									overflow: "auto",
									fontSize: "0.75rem",
									fontFamily: "monospace",
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									maxHeight: "100%",
								}}
							>
								{JSON.stringify(folder, null, 2)}
							</Box>
						</Box>
					)}
				</LocalizationProvider>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined" disabled={isSaving}>
					Cancelar
				</Button>
				<Button onClick={handleSave} startIcon={<Save2 size={18} />} variant="contained" disabled={isSaving}>
					{isSaving ? "Guardando..." : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default FolderEditModal;
