import React, { useState, useEffect } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	IconButton,
	LinearProgress,
	Modal,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography,
	Grid,
	TextField,
	Skeleton,
} from "@mui/material";

// project imports
import { Add, SearchNormal1, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";

// types
import { Campaign } from "types/campaign";
import { MarketingContact } from "types/marketing-contact";
// import { MarketingContactService } from "store/reducers/marketing-contacts";
import { CampaignService } from "store/reducers/campaign";
import CampaignContactsModal from "./CampaignContactsModal";
import MainCard from "components/MainCard";
import ScrollX from "components/ScrollX";

interface RemoveCampaignContactsDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	contactIds: string[];
	contacts: MarketingContact[];
}

const RemoveCampaignContactsDialog = ({ open, onClose, onConfirm, contactIds, contacts }: RemoveCampaignContactsDialogProps) => {
	const selectedContacts = contacts.filter((contact) => contactIds.includes(contact._id || ""));

	return (
		<Modal
			open={open}
			onClose={onClose}
			aria-labelledby="delete-contacts-modal-title"
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Paper sx={{ width: 500, p: 3, borderRadius: 2 }}>
				<Typography variant="h5" id="delete-contacts-modal-title" gutterBottom>
					¿Eliminar contactos de la campaña?
				</Typography>
				<Typography variant="body2">
					¿Está seguro de que desea eliminar {contactIds.length} {contactIds.length === 1 ? "contacto" : "contactos"} de esta campaña? Esta
					acción no eliminará los contactos del sistema.
				</Typography>

				{selectedContacts.length > 0 && (
					<Box mt={2} mb={3} maxHeight={200} overflow="auto">
						{selectedContacts.map((contact) => (
							<Box key={contact._id} py={1} borderBottom={1} borderColor="divider">
								<Typography variant="subtitle2">
									{contact.firstName} {contact.lastName}
								</Typography>
								<Typography variant="body2" color="textSecondary">
									{contact.email}
								</Typography>
							</Box>
						))}
					</Box>
				)}

				<Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
					<Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
						Cancelar
					</Button>
					<Button onClick={onConfirm} variant="contained" color="error">
						Eliminar
					</Button>
				</Box>
			</Paper>
		</Modal>
	);
};

interface RemoveAllContactsDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	campaignName: string;
	totalContacts: number;
}

const RemoveAllContactsDialog = ({ open, onClose, onConfirm, campaignName, totalContacts }: RemoveAllContactsDialogProps) => {
	const isLargeOperation = totalContacts > 100; // Consideramos operación grande si hay más de 100 contactos
	return (
		<Modal
			open={open}
			onClose={onClose}
			aria-labelledby="delete-all-contacts-modal-title"
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<Paper sx={{ width: 500, p: 3, borderRadius: 2 }}>
				<Typography variant="h5" id="delete-all-contacts-modal-title" gutterBottom>
					¿Eliminar todos los contactos de la campaña?
				</Typography>
				<Typography variant="body2" paragraph>
					¿Está seguro de que desea eliminar <strong>todos los contactos</strong> de la campaña "{campaignName}"?
				</Typography>
				<Typography variant="body2" paragraph>
					Esta acción eliminará {totalContacts} {totalContacts === 1 ? "contacto" : "contactos"} de la campaña. Esta acción no eliminará los
					contactos del sistema, solo los desvinculará de esta campaña.
				</Typography>
				{isLargeOperation && (
					<Typography variant="body2" paragraph sx={{ fontStyle: "italic" }}>
						Debido al gran número de contactos, esta operación se procesará en segundo plano y podría tomar unos momentos en completarse.
					</Typography>
				)}
				<Typography variant="body2" color="error" sx={{ fontWeight: "bold" }}>
					¡Esta acción no se puede deshacer!
				</Typography>

				<Box sx={{ display: "flex", justifyContent: "flex-end", pt: 3 }}>
					<Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
						Cancelar
					</Button>
					<Button onClick={onConfirm} variant="contained" color="error">
						Eliminar todos los contactos
					</Button>
				</Box>
			</Paper>
		</Modal>
	);
};

interface CampaignContactsListProps {
	campaign: Campaign;
	open: boolean;
	onClose: () => void;
	onContactsChange?: () => void; // Callback para notificar cambios en los contactos
}

const CampaignContactsList = ({ campaign, open, onClose, onContactsChange }: CampaignContactsListProps) => {
	// const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State for contacts data
	const [contacts, setContacts] = useState<MarketingContact[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);

	// State for modals
	const [addModalOpen, setAddModalOpen] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
	const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState<boolean>(false);
	const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

	// Estados para proceso asíncrono de eliminación
	const [asyncDeletionProcessing, setAsyncDeletionProcessing] = useState<boolean>(false);
	const [deletionProcessStatus, setDeletionProcessStatus] = useState<{
		status: string;
		processedCount?: number;
		totalRemoved?: number;
		totalToAdd?: number;
		message?: string;
		completedAt?: string;
	} | null>(null);

	// State for pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	// State for search
	const [searchTerm, setSearchTerm] = useState("");

	// Fetch campaign contacts
	useEffect(() => {
		if (open && campaign._id) {
			fetchCampaignContacts();
		}
	}, [open, campaign._id, page, rowsPerPage, searchTerm]);

	const fetchCampaignContacts = async () => {
		if (!campaign._id) return;

		try {
			setLoading(true);
			setError(null);

			// Usamos el endpoint específico para obtener contactos de una campaña
			const response = await CampaignService.getCampaignContacts(campaign._id, page + 1, rowsPerPage, "email", "asc", {
				// Podemos agregar filtros adicionales como status si son necesarios
				// Si hay un término de búsqueda, se aplicará en el backend
				...(searchTerm ? { search: searchTerm } : {}),
			});

			setContacts(response.data);
			setTotalCount(response.pagination.total);
		} catch (err: any) {
			setError(err.message || "Error al cargar los contactos de la campaña");
		} finally {
			setLoading(false);
		}
	};

	// Pagination handlers
	const handleChangePage = (event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	// Modal handlers
	const handleOpenAddModal = () => {
		setAddModalOpen(true);
	};

	const handleCloseAddModal = () => {
		setAddModalOpen(false);
		fetchCampaignContacts(); // Refresh the list after adding contacts
		if (onContactsChange) {
			onContactsChange(); // Notificar al componente padre sobre el cambio
		}
	};

	const handleOpenDeleteDialog = (contactIds: string[]) => {
		setSelectedContactIds(contactIds);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setSelectedContactIds([]);
	};

	const handleRemoveContacts = async () => {
		try {
			await CampaignService.removeContactsFromCampaign(campaign._id!, selectedContactIds);
			enqueueSnackbar("Contactos eliminados de la campaña con éxito", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			handleCloseDeleteDialog();
			fetchCampaignContacts();
			if (onContactsChange) {
				onContactsChange(); // Notificar al componente padre sobre el cambio
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al eliminar contactos de la campaña", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	const handleOpenDeleteAllDialog = () => {
		setDeleteAllDialogOpen(true);
	};

	const handleCloseDeleteAllDialog = () => {
		setDeleteAllDialogOpen(false);
	};

	// Función para verificar el estado del proceso asíncrono de eliminación
	const checkDeletionProcessStatus = async (campaignId: string) => {
		try {
			const result = await CampaignService.getRemoveAllContactsStatus(campaignId);

			if (result.success) {
				// Actualizar el estado del proceso con los datos de la API
				setDeletionProcessStatus({
					status: result.data.status,
					processedCount: result.data.processedCount,
					totalRemoved: result.data.totalRemoved,
					message: result.data.message,
					completedAt: result.data.completedAt,
				});

				// Si el proceso ha completado
				if (result.data.status === "completed") {
					setAsyncDeletionProcessing(false);

					// Mostrar mensaje de éxito
					const successMessage = `Proceso completado: se eliminaron ${result.data.totalRemoved} contactos`;
					enqueueSnackbar(successMessage, {
						variant: "success",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});

					// Actualizar datos
					fetchCampaignContacts();

					// Notificar al componente padre
					if (onContactsChange) {
						onContactsChange();
					}

					return true;
				}
				// Si el proceso falló
				else if (result.data.status === "error") {
					setAsyncDeletionProcessing(false);

					enqueueSnackbar(`El proceso falló: ${result.data.message || "Error durante la eliminación de contactos"}`, {
						variant: "error",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});
					return true;
				}

				// Si todavía está en proceso, programar otra verificación
				return false;
			} else {
				throw new Error(result.message || "Error al verificar estado del proceso");
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al verificar estado del proceso";
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});

			setAsyncDeletionProcessing(false);
			return true; // Terminar verificaciones
		}
	};

	const handleRemoveAllContacts = async () => {
		try {
			const result = await CampaignService.removeAllContactsFromCampaign(campaign._id!);

			if (result.success) {
				handleCloseDeleteAllDialog();

				// Si obtenemos datos con status, iniciar proceso de seguimiento
				if (result.data && result.data.status) {
					setAsyncDeletionProcessing(true);
					setDeletionProcessStatus({
						status: result.data.status,
						processedCount: 0,
						totalRemoved: 0,
						message: result.message,
					});

					// Mostrar mensaje inicial
					enqueueSnackbar(result.message || "Procesando eliminación de contactos en segundo plano...", {
						variant: "info",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});

					// Configurar verificación de estado
					const checkStatus = async () => {
						const isComplete = await checkDeletionProcessStatus(campaign._id!);
						if (!isComplete) {
							// Si el proceso no está completo, verificar nuevamente en 2-3 segundos
							setTimeout(checkStatus, 2500);
						}
					};

					// Primera verificación después de 2 segundos
					setTimeout(checkStatus, 2000);
				}
				// Si es una respuesta inmediata/síncrona
				else {
					enqueueSnackbar("Todos los contactos han sido eliminados de la campaña", {
						variant: "success",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});
					fetchCampaignContacts();
					if (onContactsChange) {
						onContactsChange(); // Notificar al componente padre sobre el cambio
					}
				}
			} else {
				throw new Error(result.message || "Error desconocido");
			}
		} catch (error: any) {
			enqueueSnackbar(error.message || "Error al eliminar todos los contactos de la campaña", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setAsyncDeletionProcessing(false);
		}
	};

	const handleSearch = () => {
		setPage(0);
		// El efecto se encargará de llamar a fetchCampaignContacts gracias a la dependencia en searchTerm
	};

	return (
		<>
			{/* Modal de progreso para proceso asíncrono de eliminación */}
			{asyncDeletionProcessing && deletionProcessStatus && (
				<Modal
					open={asyncDeletionProcessing}
					aria-labelledby="async-deletion-process-modal-title"
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Paper
						sx={{
							width: "90%",
							maxWidth: 500,
							p: 3,
							borderRadius: 2,
							textAlign: "center",
						}}
					>
						<Typography variant="h4" id="async-deletion-process-modal-title" gutterBottom>
							Eliminando contactos de la campaña
						</Typography>
						<Box sx={{ my: 3 }}>
							<CircularProgress size={60} />
						</Box>
						<Typography variant="body1" gutterBottom>
							{deletionProcessStatus.status === "processing"
								? "Procesando eliminación..."
								: deletionProcessStatus.status === "esperando"
								? "En espera..."
								: deletionProcessStatus.status === "completed"
								? "Completado"
								: deletionProcessStatus.status}
						</Typography>
						{deletionProcessStatus.message && (
							<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
								{deletionProcessStatus.message}
							</Typography>
						)}

						<Box sx={{ mt: 2, mb: 3 }}>
							<LinearProgress
								variant="determinate"
								value={
									deletionProcessStatus.processedCount && totalCount > 0 ? (deletionProcessStatus.processedCount / totalCount) * 100 : 0
								}
								sx={{ height: 10, borderRadius: 5 }}
							/>
							<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
								{deletionProcessStatus.processedCount !== undefined ? deletionProcessStatus.processedCount : 0} de {totalCount} contactos
								procesados
								{deletionProcessStatus.totalRemoved !== undefined &&
									deletionProcessStatus.totalRemoved > 0 &&
									` (${deletionProcessStatus.totalRemoved} eliminados)`}
							</Typography>
						</Box>

						<Typography variant="caption" color="textSecondary">
							Este proceso se completará en segundo plano. Puede cerrar esta ventana y continuar trabajando.
						</Typography>

						<Box sx={{ mt: 2 }}>
							<Button
								onClick={() => {
									setAsyncDeletionProcessing(false);
								}}
								variant="outlined"
							>
								Cerrar y continuar en segundo plano
							</Button>
						</Box>
					</Paper>
				</Modal>
			)}

			<Modal
				open={open}
				onClose={onClose}
				aria-labelledby="campaign-contacts-modal-title"
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Paper
					sx={{
						width: "90%",
						maxWidth: 1200,
						maxHeight: "90vh",
						borderRadius: 2,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					}}
				>
					{/* Header - Siempre visible */}
					<Box sx={{ p: 3, pb: 0 }}>
						<Box sx={{ mb: 2 }}>
							<Grid container alignItems="center" justifyContent="space-between">
								<Grid item>
									<Typography variant="h4" id="campaign-contacts-modal-title">
										Contactos de la Campaña: {campaign.name}
									</Typography>
									<Typography variant="caption" color="textSecondary">
										{campaign.description || ""}
									</Typography>
								</Grid>
								<Grid item>
									<Box sx={{ display: "flex", gap: 2 }}>
										{totalCount > 0 && (
											<Button variant="outlined" color="error" onClick={handleOpenDeleteAllDialog} sx={{ textTransform: "none" }}>
												Eliminar todos los contactos
											</Button>
										)}
										<Button
											variant="contained"
											color="primary"
											startIcon={<Add />}
											onClick={handleOpenAddModal}
											sx={{ textTransform: "none" }}
										>
											Añadir Contactos
										</Button>
									</Box>
								</Grid>
							</Grid>
						</Box>

						<Box mb={2}>
							<Grid container spacing={2} alignItems="center">
								<Grid item xs>
									<TextField
										fullWidth
										variant="outlined"
										size="small"
										placeholder="Buscar contactos por nombre, email..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										onKeyPress={(e) => e.key === "Enter" && handleSearch()}
										InputProps={{
											endAdornment: (
												<IconButton onClick={handleSearch} edge="end" size="small">
													<SearchNormal1 size={18} />
												</IconButton>
											),
										}}
									/>
								</Grid>
							</Grid>
						</Box>

						<Divider />
					</Box>

					{/* Contenido scrollable */}
					<Box sx={{ flex: 1, overflow: "auto", px: 3, minHeight: 400, position: "relative" }}>
						{/* Overlay de carga */}
						{loading && page > 0 && (
							<Box
								sx={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									backgroundColor: "rgba(255, 255, 255, 0.7)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									zIndex: 10,
								}}
							>
								<CircularProgress />
							</Box>
						)}

						{error ? (
							<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
								<Typography color="error" sx={{ p: 2 }}>
									{error}
								</Typography>
							</Box>
						) : loading && page === 0 ? (
							<ScrollX>
								<MainCard content={false} sx={{ border: 1, borderColor: "divider" }}>
									<TableContainer>
										<Table sx={{ minWidth: 850 }} aria-label="contacts table">
											<TableHead>
												<TableRow>
													<TableCell>Contacto</TableCell>
													<TableCell>Email</TableCell>
													<TableCell>Segmentos</TableCell>
													<TableCell>Tasa de apertura</TableCell>
													<TableCell>Tasa de clics</TableCell>
													<TableCell align="center">Acciones</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{[...Array(rowsPerPage)].map((_, index) => (
													<TableRow key={index}>
														<TableCell>
															<Skeleton variant="text" width={120} height={24} />
															<Skeleton variant="text" width={80} height={20} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={180} height={24} />
														</TableCell>
														<TableCell>
															<Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={50} height={24} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={50} height={24} />
														</TableCell>
														<TableCell align="center">
															<Skeleton variant="circular" width={30} height={30} />
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</MainCard>
							</ScrollX>
						) : (
							<>
								<ScrollX>
									<MainCard content={false} sx={{ border: 1, borderColor: "divider" }}>
										<TableContainer>
											<Table sx={{ minWidth: 850 }} aria-label="contacts table">
												<TableHead>
													<TableRow>
														<TableCell>Contacto</TableCell>
														<TableCell>Email</TableCell>
														<TableCell>Segmentos</TableCell>
														<TableCell>Tasa de apertura</TableCell>
														<TableCell>Tasa de clics</TableCell>
														<TableCell align="center">Acciones</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{contacts.length === 0 && !loading ? (
														<TableRow>
															<TableCell colSpan={6} align="center" sx={{ py: 3 }}>
																<Typography variant="subtitle1">No hay contactos en esta campaña</Typography>
																<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
																	Añada contactos a esta campaña para empezar
																</Typography>
																<Button variant="outlined" color="primary" startIcon={<Add />} onClick={handleOpenAddModal} sx={{ mt: 2 }}>
																	Añadir Contactos
																</Button>
															</TableCell>
														</TableRow>
													) : (
														contacts.map((contact) => (
															<TableRow hover key={contact._id} tabIndex={-1}>
																<TableCell>
																	<Typography variant="subtitle2">
																		{contact.firstName} {contact.lastName}
																	</Typography>
																	{contact.company && (
																		<Typography variant="caption" color="textSecondary">
																			{contact.company}
																		</Typography>
																	)}
																</TableCell>
																<TableCell>{contact.email}</TableCell>
																<TableCell>
																	{contact.segments && contact.segments.length > 0 ? (
																		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
																			{contact.segments.slice(0, 2).map((segmentId, index) => (
																				<Chip key={index} label={`Segmento ${index + 1}`} size="small" />
																			))}
																			{contact.segments.length > 2 && <Chip label={`+${contact.segments.length - 2} más`} size="small" />}
																		</Box>
																	) : (
																		<Typography variant="caption" color="textSecondary">
																			Sin segmentos
																		</Typography>
																	)}
																</TableCell>
																<TableCell>
																	{contact.metrics?.openRate !== undefined ? `${(contact.metrics.openRate * 100).toFixed(1)}%` : "N/A"}
																</TableCell>
																<TableCell>
																	{contact.metrics?.clickRate !== undefined ? `${(contact.metrics.clickRate * 100).toFixed(1)}%` : "N/A"}
																</TableCell>
																<TableCell align="center">
																	<IconButton
																		aria-label="eliminar"
																		size="small"
																		color="error"
																		onClick={() => contact._id && handleOpenDeleteDialog([contact._id])}
																		title="Eliminar contacto de la campaña"
																	>
																		<Trash size={18} />
																	</IconButton>
																</TableCell>
															</TableRow>
														))
													)}
												</TableBody>
											</Table>
										</TableContainer>
									</MainCard>
								</ScrollX>

								<Box sx={{ mt: 2, mb: 1 }}>
									<TablePagination
										component="div"
										count={totalCount}
										rowsPerPage={rowsPerPage}
										page={page}
										onPageChange={handleChangePage}
										onRowsPerPageChange={handleChangeRowsPerPage}
										rowsPerPageOptions={[5, 10, 25, 50]}
										labelRowsPerPage="Filas por página:"
										labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
										sx={{
											borderTop: 1,
											borderColor: "divider",
											"& .MuiTablePagination-toolbar": {
												minHeight: 52,
											},
										}}
									/>
								</Box>
							</>
						)}
					</Box>

					{/* Footer - Siempre visible */}
					<Box sx={{ p: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
						<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
							<Button onClick={onClose} color="inherit">
								Cerrar
							</Button>
						</Box>
					</Box>

					{/* Add Contacts Modal */}
					<CampaignContactsModal
						open={addModalOpen}
						onClose={handleCloseAddModal}
						campaign={campaign}
						onContactsChange={onContactsChange}
					/>

					{/* Remove Contacts Dialog */}
					<RemoveCampaignContactsDialog
						open={deleteDialogOpen}
						onClose={handleCloseDeleteDialog}
						onConfirm={handleRemoveContacts}
						contactIds={selectedContactIds}
						contacts={contacts}
					/>

					{/* Remove All Contacts Dialog */}
					<RemoveAllContactsDialog
						open={deleteAllDialogOpen}
						onClose={handleCloseDeleteAllDialog}
						onConfirm={handleRemoveAllContacts}
						campaignName={campaign.name}
						totalContacts={totalCount}
					/>
				</Paper>
			</Modal>
		</>
	);
};

export default CampaignContactsList;
