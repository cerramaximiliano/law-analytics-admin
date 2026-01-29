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
	TextField,
	Switch,
	FormControlLabel,
	Divider,
	Stack,
	Alert,
	IconButton,
	Tooltip,
	Chip,
	CircularProgress,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import { useSnackbar } from "notistack";
import { CloseCircle, Save2, Copy, Warning2, Refresh2 } from "iconsax-react";
import FoldersService, { Causa } from "api/folders";

interface CausaEditModalProps {
	open: boolean;
	onClose: () => void;
	causa: Causa | null;
	causaType: string;
	folderId: string;
	onCausaUpdated?: () => void;
}

// Campos que se sincronizarán
const SYNC_FIELDS = [
	{ causa: "caratula", folder: "folderName", label: "Carátula → Nombre Carpeta" },
	{ causa: "objeto", folder: "materia", label: "Objeto → Materia" },
	{ causa: "juzgado", folder: "judFolder.courtNumber", label: "Juzgado → Número de Juzgado" },
	{ causa: "secretaria", folder: "judFolder.secretaryNumber", label: "Secretaría → Número de Secretaría" },
	{ causa: "fechaInicio", folder: "judFolder.initialDateJudFolder", label: "Fecha Inicio → Fecha Inicio Judicial" },
	{ causa: "fechaUltimoMovimiento", folder: "lastMovementDate", label: "Últ. Movimiento → Fecha Últ. Movimiento" },
	{ causa: "verified", folder: "causaVerified", label: "Verificada → Causa Verificada" },
	{ causa: "isValid", folder: "causaIsValid", label: "Válida → Causa Válida" },
];

const CausaEditModal = ({ open, onClose, causa, causaType, folderId, onCausaUpdated }: CausaEditModalProps) => {
	const { enqueueSnackbar } = useSnackbar();

	// Form state
	const [formData, setFormData] = useState<Partial<Causa>>({});
	const [isSaving, setIsSaving] = useState(false);
	const [changedFields, setChangedFields] = useState<string[]>([]);

	// Initialize form data when causa changes
	useEffect(() => {
		if (open && causa) {
			setFormData({
				caratula: causa.caratula || "",
				objeto: causa.objeto || "",
				juzgado: causa.juzgado || undefined,
				secretaria: causa.secretaria || undefined,
				fechaInicio: causa.fechaInicio || undefined,
				fechaUltimoMovimiento: causa.fechaUltimoMovimiento || undefined,
				verified: causa.verified || false,
				isValid: causa.isValid || false,
			});
			setChangedFields([]);
		}
	}, [open, causa]);

	if (!causa) return null;

	// Handle field changes
	const handleChange = (field: string, value: any) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));

		// Track changed fields
		const originalValue = (causa as any)[field];
		if (value !== originalValue && !changedFields.includes(field)) {
			setChangedFields((prev) => [...prev, field]);
		} else if (value === originalValue && changedFields.includes(field)) {
			setChangedFields((prev) => prev.filter((f) => f !== field));
		}
	};

	// Handle save
	const handleSave = async () => {
		try {
			setIsSaving(true);

			const response = await FoldersService.updateCausaAndSync(causa._id, causaType, formData);

			if (response.success) {
				const syncInfo = response.data.sync;
				enqueueSnackbar(
					`Causa actualizada. ${syncInfo.foldersUpdated} carpeta(s) sincronizada(s). Campos: ${syncInfo.syncedFields.join(", ")}`,
					{
						variant: "success",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
						autoHideDuration: 5000,
					}
				);
				if (onCausaUpdated) {
					onCausaUpdated();
				}
				onClose();
			}
		} catch (error: any) {
			enqueueSnackbar(error.response?.data?.error || "Error al actualizar la causa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	// Convert date string to Dayjs
	const toDayjs = (date: string | undefined): Dayjs | null => {
		if (!date) return null;
		return dayjs(date);
	};

	// Get fields that will be synced based on changes
	const getSyncedFieldsPreview = () => {
		return SYNC_FIELDS.filter((sf) => changedFields.includes(sf.causa));
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h5">Editar Causa</Typography>
						<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
							<Typography variant="body2" color="textSecondary">
								{causa.number}/{causa.year}
							</Typography>
							<Chip label={causaType} size="small" color="primary" variant="outlined" />
						</Stack>
					</Box>
					<Tooltip title="Copiar ID">
						<IconButton
							size="small"
							onClick={() => {
								navigator.clipboard.writeText(causa._id);
								enqueueSnackbar("ID copiado al portapapeles", { variant: "success" });
							}}
						>
							<Copy size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</DialogTitle>

			<DialogContent dividers>
				<LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
					{/* Sync Warning */}
					<Alert
						severity="info"
						icon={<Refresh2 size={20} />}
						sx={{ mb: 2 }}
					>
						<Typography variant="subtitle2" fontWeight="bold">
							Sincronización manual Causa → Carpeta
						</Typography>
						<Typography variant="body2">
							Los cambios en esta causa se sincronizarán inmediatamente con todas las carpetas vinculadas.
						</Typography>
						<Box sx={{ mt: 1 }}>
							<Typography variant="caption" color="text.secondary">
								Campos que se sincronizarán:
							</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
								{SYNC_FIELDS.map((sf) => (
									<Chip
										key={sf.causa}
										label={sf.label}
										size="small"
										variant={changedFields.includes(sf.causa) ? "filled" : "outlined"}
										color={changedFields.includes(sf.causa) ? "info" : "default"}
										sx={{ fontSize: "0.7rem" }}
									/>
								))}
							</Box>
						</Box>
					</Alert>

					{/* Worker update notice */}
					<Alert
						severity="warning"
						icon={<Warning2 size={20} />}
						sx={{ mb: 3 }}
					>
						<Typography variant="subtitle2" fontWeight="bold">
							Actualización automática por Worker
						</Typography>
						<Typography variant="body2" sx={{ mb: 1 }}>
							Estos datos se actualizarán automáticamente en el próximo ciclo del worker de actualización (PJN).
							Los cambios manuales sirven para correcciones inmediatas hasta que el worker sincronice nuevamente con el sistema judicial.
						</Typography>
						<Typography variant="caption" color="text.secondary">
							El worker mantiene los datos sincronizados con PJN. Usa esta función para corregir datos temporalmente o forzar una sincronización inmediata con las carpetas.
						</Typography>
					</Alert>

					{/* Preview of changes */}
					{changedFields.length > 0 && (
						<Alert severity="info" sx={{ mb: 3 }}>
							<Typography variant="subtitle2">
								{changedFields.length} campo(s) modificado(s):
							</Typography>
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
								{getSyncedFieldsPreview().map((sf) => (
									<Chip key={sf.causa} label={sf.label} size="small" color="info" />
								))}
							</Box>
						</Alert>
					)}

					<Grid container spacing={2}>
						<Grid item xs={12}>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Información de la Causa
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Carátula"
								value={formData.caratula || ""}
								onChange={(e) => handleChange("caratula", e.target.value)}
								size="small"
								multiline
								rows={2}
								helperText="Se sincronizará con el nombre de la carpeta (folderName)"
							/>
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Objeto"
								value={formData.objeto || ""}
								onChange={(e) => handleChange("objeto", e.target.value)}
								size="small"
								multiline
								rows={2}
								helperText="Se sincronizará con la materia de la carpeta"
							/>
						</Grid>

						<Grid item xs={6} md={3}>
							<TextField
								fullWidth
								label="Juzgado"
								type="number"
								value={formData.juzgado || ""}
								onChange={(e) => handleChange("juzgado", parseInt(e.target.value) || undefined)}
								size="small"
								helperText="→ courtNumber"
							/>
						</Grid>

						<Grid item xs={6} md={3}>
							<TextField
								fullWidth
								label="Secretaría"
								type="number"
								value={formData.secretaria || ""}
								onChange={(e) => handleChange("secretaria", parseInt(e.target.value) || undefined)}
								size="small"
								helperText="→ secretaryNumber"
							/>
						</Grid>

						<Grid item xs={6} md={3}>
							<DatePicker
								label="Fecha Inicio"
								value={toDayjs(formData.fechaInicio)}
								onChange={(date) => handleChange("fechaInicio", date?.toISOString())}
								format="DD/MM/YYYY"
								slotProps={{
									textField: {
										size: "small",
										fullWidth: true,
										helperText: "→ initialDateJudFolder",
									},
								}}
							/>
						</Grid>

						<Grid item xs={6} md={3}>
							<DatePicker
								label="Último Movimiento"
								value={toDayjs(formData.fechaUltimoMovimiento)}
								onChange={(date) => handleChange("fechaUltimoMovimiento", date?.toISOString())}
								format="DD/MM/YYYY"
								slotProps={{
									textField: {
										size: "small",
										fullWidth: true,
										helperText: "→ lastMovementDate",
									},
								}}
							/>
						</Grid>

						<Grid item xs={12}>
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Estado de Verificación
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={6}>
							<FormControlLabel
								control={
									<Switch
										checked={formData.verified || false}
										onChange={(e) => handleChange("verified", e.target.checked)}
									/>
								}
								label={
									<Box>
										<Typography variant="body2">Verificada</Typography>
										<Typography variant="caption" color="text.secondary">
											→ causaVerified en carpeta
										</Typography>
									</Box>
								}
							/>
						</Grid>

						<Grid item xs={6}>
							<FormControlLabel
								control={
									<Switch
										checked={formData.isValid || false}
										onChange={(e) => handleChange("isValid", e.target.checked)}
									/>
								}
								label={
									<Box>
										<Typography variant="body2">Válida (Pública)</Typography>
										<Typography variant="caption" color="text.secondary">
											→ causaIsValid en carpeta
										</Typography>
									</Box>
								}
							/>
						</Grid>

						<Grid item xs={12}>
							<Typography variant="subtitle2" color="primary" gutterBottom sx={{ mt: 2 }}>
								Información Adicional (Solo lectura)
							</Typography>
							<Divider sx={{ mb: 2 }} />
						</Grid>

						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Número
							</Typography>
							<Typography variant="body2">{causa.number}</Typography>
						</Grid>

						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Año
							</Typography>
							<Typography variant="body2">{causa.year}</Typography>
						</Grid>

						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Fuero
							</Typography>
							<Typography variant="body2">{causa.fuero || "N/A"}</Typography>
						</Grid>

						<Grid item xs={6} md={3}>
							<Typography variant="caption" color="textSecondary">
								Movimientos
							</Typography>
							<Typography variant="body2">{causa.movimientosCount || 0}</Typography>
						</Grid>
					</Grid>
				</LocalizationProvider>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined" disabled={isSaving}>
					Cancelar
				</Button>
				<Button
					onClick={handleSave}
					startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <Save2 size={18} />}
					variant="contained"
					color="warning"
					disabled={isSaving || changedFields.length === 0}
				>
					{isSaving ? "Sincronizando..." : "Aplicar Cambios"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CausaEditModal;
