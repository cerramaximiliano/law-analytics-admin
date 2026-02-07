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
	Divider,
	Stack,
	Tabs,
	Tab,
	Alert,
	IconButton,
	Tooltip,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { CloseCircle, Copy, TickCircle, CloseSquare } from "iconsax-react";
import { Folder } from "api/folders";

interface FolderDetalleModalProps {
	open: boolean;
	onClose: () => void;
	folder: Folder | null;
}

// Mapeo de fueros
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
	Civil: "Civil",
	Comercial: "Comercial",
	"Seguridad Social": "Seguridad Social",
	Trabajo: "Trabajo",
};

const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
	Civil: "primary",
	Comercial: "success",
	"Seguridad Social": "warning",
	Trabajo: "error",
};

const STATUS_COLORS: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
	Nueva: "primary",
	"En Proceso": "warning",
	Cerrada: "success",
	Pendiente: "error",
};

import { useState } from "react";

const FolderDetalleModal = ({ open, onClose, folder }: FolderDetalleModalProps) => {
	const { enqueueSnackbar } = useSnackbar();
	const [activeTab, setActiveTab] = useState(0);

	if (!folder) return null;

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

	const getSystemType = (): { label: string; color: "primary" | "secondary" | "default" } => {
		if (folder.pjn) return { label: "PJN", color: "primary" };
		if (folder.mev) return { label: "MEV", color: "secondary" };
		return { label: "Manual", color: "default" };
	};

	const systemType = getSystemType();

	const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2">{value || "N/A"}</Typography>
		</Box>
	);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Box>
						<Typography variant="h5">Detalle de Carpeta</Typography>
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
					<Tab label="Detalles" />
					<Tab label="JSON" />
				</Tabs>
			</Box>

			<DialogContent dividers sx={{ height: "500px", overflowY: "auto" }}>
				{/* Tab 0: Detalles */}
				{activeTab === 0 && (
					<Stack spacing={3}>
						{/* Seccion General */}
						<Box>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Informacion General
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<Grid container spacing={2}>
								<Grid item xs={12} md={6}>
									<Field label="Nombre" value={folder.folderName} />
								</Grid>
								<Grid item xs={6} md={3}>
									<Typography variant="caption" color="text.secondary">
										Estado
									</Typography>
									<Box>
										<Chip
											label={folder.status}
											color={STATUS_COLORS[folder.status] || "default"}
											size="small"
											variant="outlined"
										/>
									</Box>
								</Grid>
								<Grid item xs={6} md={3}>
									<Typography variant="caption" color="text.secondary">
										Sistema
									</Typography>
									<Box>
										<Chip label={systemType.label} color={systemType.color} size="small" />
									</Box>
								</Grid>
								<Grid item xs={12} md={4}>
									<Field label="Materia" value={folder.materia} />
								</Grid>
								<Grid item xs={6} md={4}>
									<Typography variant="caption" color="text.secondary">
										Fuero
									</Typography>
									<Box>
										{folder.folderFuero ? (
											<Chip
												label={FUERO_LABELS[folder.folderFuero] || folder.folderFuero}
												color={FUERO_COLORS[folder.folderFuero] || "default"}
												size="small"
												variant="outlined"
											/>
										) : (
											<Typography variant="body2">N/A</Typography>
										)}
									</Box>
								</Grid>
								<Grid item xs={6} md={4}>
									<Field label="Jurisdiccion" value={folder.folderJuris?.label} />
								</Grid>
								<Grid item xs={6} md={3}>
									<Typography variant="caption" color="text.secondary">
										Archivada
									</Typography>
									<Box>
										<Chip
											label={folder.archived ? "Si" : "No"}
											color={folder.archived ? "default" : "success"}
											size="small"
											variant="outlined"
										/>
									</Box>
								</Grid>
								<Grid item xs={6} md={3}>
									<Field label="Monto" value={folder.amount ? `$${folder.amount.toLocaleString("es-AR")}` : undefined} />
								</Grid>
								<Grid item xs={6} md={3}>
									<Field label="Fecha Inicio" value={formatDate(folder.initialDateFolder)} />
								</Grid>
								<Grid item xs={6} md={3}>
									<Field label="Fecha Fin" value={formatDate(folder.finalDateFolder)} />
								</Grid>
							</Grid>
						</Box>

						{/* Seccion Judicial */}
						<Box>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Informacion Judicial
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<Grid container spacing={2}>
								<Grid item xs={12} md={4}>
									<Field label="Expediente" value={folder.judFolder?.numberJudFolder} />
								</Grid>
								<Grid item xs={6} md={2}>
									<Field label="Juzgado" value={folder.judFolder?.courtNumber} />
								</Grid>
								<Grid item xs={6} md={2}>
									<Field label="Secretaria" value={folder.judFolder?.secretaryNumber} />
								</Grid>
								<Grid item xs={6} md={4}>
									<Field label="Estado Judicial" value={folder.judFolder?.statusJudFolder} />
								</Grid>
								{folder.judFolder?.descriptionJudFolder && (
									<Grid item xs={12}>
										<Field label="Descripcion" value={folder.judFolder.descriptionJudFolder} />
									</Grid>
								)}
							</Grid>
						</Box>

						{/* Seccion Causa Vinculada */}
						<Box>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Causa Vinculada
							</Typography>
							<Divider sx={{ mb: 2 }} />
							{folder.causaId ? (
								<Grid container spacing={2}>
									<Grid item xs={12} md={8}>
										<Field label="ID de Causa" value={folder.causaId} />
									</Grid>
									<Grid item xs={12} md={4}>
										<Field label="Tipo" value={folder.causaType} />
									</Grid>
									<Grid item xs={4} md={2}>
										<Typography variant="caption" color="text.secondary">
											Verificada
										</Typography>
										<Box>
											{folder.causaVerified ? (
												<TickCircle size={20} color="#2e7d32" variant="Bold" />
											) : (
												<CloseSquare size={20} color="#d32f2f" variant="Bold" />
											)}
										</Box>
									</Grid>
									<Grid item xs={4} md={2}>
										<Typography variant="caption" color="text.secondary">
											Valida
										</Typography>
										<Box>
											{folder.causaIsValid ? (
												<TickCircle size={20} color="#2e7d32" variant="Bold" />
											) : (
												<CloseSquare size={20} color="#d32f2f" variant="Bold" />
											)}
										</Box>
									</Grid>
									<Grid item xs={4} md={2}>
										<Typography variant="caption" color="text.secondary">
											Update
										</Typography>
										<Box>
											{folder.causaUpdateEnabled ? (
												<TickCircle size={20} color="#2e7d32" variant="Bold" />
											) : (
												<CloseSquare size={20} color="#d32f2f" variant="Bold" />
											)}
										</Box>
									</Grid>
									<Grid item xs={6} md={3}>
										<Typography variant="caption" color="text.secondary">
											Asociacion
										</Typography>
										<Box>
											<Chip
												label={(folder as any).causaAssociationStatus || "N/A"}
												size="small"
												color={
													(folder as any).causaAssociationStatus === "success"
														? "success"
														: (folder as any).causaAssociationStatus === "failed"
															? "error"
															: "default"
												}
												variant="outlined"
											/>
										</Box>
									</Grid>
									<Grid item xs={6} md={3}>
										<Field label="Ultimo Sync" value={formatDate(folder.causaLastSyncDate)} />
									</Grid>
									{folder.scrapingProgress && (
										<>
											<Grid item xs={6} md={3}>
												<Field
													label="Scraping"
													value={`${folder.scrapingProgress.totalProcessed || 0} / ${folder.scrapingProgress.totalExpected || 0}`}
												/>
											</Grid>
											<Grid item xs={6} md={3}>
												<Typography variant="caption" color="text.secondary">
													Completo
												</Typography>
												<Box>
													<Chip
														label={folder.scrapingProgress.isComplete ? "Si" : "No"}
														size="small"
														color={folder.scrapingProgress.isComplete ? "success" : "warning"}
														variant="outlined"
													/>
												</Box>
											</Grid>
										</>
									)}
								</Grid>
							) : (
								<Alert severity="info">Esta carpeta no tiene una causa vinculada.</Alert>
							)}
						</Box>

						{/* Seccion Sistema */}
						<Box>
							<Typography variant="subtitle2" color="primary" gutterBottom>
								Informacion del Sistema
							</Typography>
							<Divider sx={{ mb: 2 }} />
							<Grid container spacing={2}>
								<Grid item xs={12} md={4}>
									<Field label="Usuario" value={folder.user?.email || folder.userId} />
								</Grid>
								<Grid item xs={6} md={4}>
									<Field label="Creado" value={formatDate(folder.createdAt)} />
								</Grid>
								<Grid item xs={6} md={4}>
									<Field label="Actualizado" value={formatDate(folder.updatedAt)} />
								</Grid>
							</Grid>
						</Box>
					</Stack>
				)}

				{/* Tab 1: JSON */}
				{activeTab === 1 && (
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
								backgroundColor: "grey.100",
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
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default FolderDetalleModal;
