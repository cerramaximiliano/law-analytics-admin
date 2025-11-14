import React, { useState, useEffect } from "react";

// material-ui
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Divider,
	FormControlLabel,
	Grid,
	IconButton,
	LinearProgress,
	Modal,
	Paper,
	Radio,
	RadioGroup,
	Tab,
	Tabs,
	TablePagination,
	TextField,
	Typography,
	useTheme,
	Tooltip,
} from "@mui/material";
import { Add, SearchNormal1, TickCircle, UserAdd } from "iconsax-react";
import { useSnackbar } from "notistack";

// project imports
import MainCard from "components/MainCard";
import { Campaign } from "types/campaign";
import { MarketingContact } from "types/marketing-contact";
import { Segment } from "types/segment";
import { ContactsProcessStatus } from "types/campaign-contacts-status";
import { CampaignService } from "store/reducers/campaign";
// import { MarketingContactService } from "store/reducers/marketing-contacts";
import { SegmentService } from "store/reducers/segments";

interface TabPanelProps {
	children?: React.ReactNode;
	index: number;
	value: number;
}

function TabPanel(props: TabPanelProps) {
	const { children, value, index, ...other } = props;

	return (
		<div role="tabpanel" hidden={value !== index} id={`contacts-tabpanel-${index}`} aria-labelledby={`contacts-tab-${index}`} {...other}>
			{value === index && <Box>{children}</Box>}
		</div>
	);
}

interface CampaignContactsModalProps {
	campaign: Campaign;
	open: boolean;
	onClose: () => void;
	onContactsChange?: () => void; // Callback para notificar cambios en los contactos
}

const CampaignContactsModal = ({ campaign, open, onClose, onContactsChange }: CampaignContactsModalProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Tab state
	const [tabValue, setTabValue] = useState<number>(0);

	// Loading states
	const [loadingContacts, setLoadingContacts] = useState<boolean>(false);
	const [loadingSegments, setLoadingSegments] = useState<boolean>(false);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [addingAllContacts, setAddingAllContacts] = useState<boolean>(false);

	// Verificar si se pueden agregar contactos según el estado de la campaña
	const canAddContacts = campaign.status === "draft" || campaign.status === "active" || campaign.status === "paused";

	// Data states
	const [contacts, setContacts] = useState<MarketingContact[]>([]);
	const [segments, setSegments] = useState<Segment[]>([]);
	const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
	const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

	// Estados para proceso asíncrono
	const [asyncProcessing, setAsyncProcessing] = useState<boolean>(false);
	const [processStatus, setProcessStatus] = useState<ContactsProcessStatus | null>(null);

	// Search and filter states
	const [contactSearch, setContactSearch] = useState("");
	const [segmentSearch, setSegmentSearch] = useState("");
	const [contactPage, setContactPage] = useState(1);
	const [segmentPage, setSegmentPage] = useState(1);
	// Variables para paginación
	const [totalContacts, setTotalContacts] = useState(0);
	const [totalSegments, setTotalSegments] = useState(0);

	// Load contacts and segments
	useEffect(() => {
		if (open) {
			fetchContacts();
			fetchSegments();
		}
	}, [open, contactPage, segmentPage, contactSearch, segmentSearch]);

	const fetchContacts = async () => {
		try {
			setLoadingContacts(true);
			// Filtros para obtener contactos que no están en la campaña actual
			const filters: { search?: string; status?: string; notInAnyCampaign?: boolean } = {};

			if (contactSearch) {
				filters.search = contactSearch;
			}

			filters.status = "active"; // Solo mostrar contactos activos

			// Utilizamos el endpoint específico para obtener contactos que no están en esta campaña
			const response = await CampaignService.getContactsNotInCampaign(campaign._id!, contactPage, 10, "email", "asc", filters);

			setContacts(response.data);
			setTotalContacts(response.pagination.total);
		} catch (error) {
			enqueueSnackbar("Error al cargar la lista de contactos", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoadingContacts(false);
		}
	};

	const fetchSegments = async () => {
		try {
			setLoadingSegments(true);
			const filters: { isActive?: boolean } = { isActive: true };
			const response = await SegmentService.getSegments(segmentPage, 10, "name", "asc", filters);
			setSegments(response.data);
			setTotalSegments(response.pagination.total);
		} catch (error) {
			enqueueSnackbar("Error al cargar la lista de segmentos", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoadingSegments(false);
		}
	};

	const handleContactSearch = () => {
		setContactPage(1);
		// No es necesario llamar a fetchContacts aquí, ya que el efecto lo hará automáticamente
	};

	const handleSegmentSearch = () => {
		setSegmentPage(1);
		// No es necesario llamar a fetchSegments aquí, ya que el efecto lo hará automáticamente
	};

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setTabValue(newValue);
		// Reset selections when changing tabs
		if (newValue === 0) {
			setSelectedSegment(null);
		} else {
			setSelectedContacts([]);
		}
	};

	const toggleContactSelection = (contactId: string) => {
		if (selectedContacts.includes(contactId)) {
			setSelectedContacts(selectedContacts.filter((id) => id !== contactId));
		} else {
			setSelectedContacts([...selectedContacts, contactId]);
		}
	};

	const handleSegmentSelection = (segmentId: string) => {
		setSelectedSegment(segmentId === selectedSegment ? null : segmentId);
	};

	const handleAddToCampaign = async () => {
		let requestData: { contacts?: string[]; segmentId?: string } = {};

		try {
			setSubmitting(true);

			let successMessage = "";

			if (tabValue === 0 && selectedContacts.length > 0) {
				// Agregar contactos individuales
				requestData.contacts = selectedContacts;
				successMessage = `${selectedContacts.length} contactos añadidos a la campaña`;
			} else if (tabValue === 1 && selectedSegment) {
				// Agregar segmento
				requestData.segmentId = selectedSegment;
				successMessage = "Segmento añadido a la campaña exitosamente";
			} else {
				enqueueSnackbar("Seleccione al menos un contacto o un segmento", {
					variant: "warning",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				setSubmitting(false);
				return;
			}

			const result = await CampaignService.addContactsToCampaign(campaign._id!, requestData);

			if (result.success) {
				enqueueSnackbar(successMessage, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				if (onContactsChange) {
					onContactsChange(); // Notificar al componente padre sobre el cambio
				}
				onClose();
			} else {
				throw new Error(result.message || "Error desconocido");
			}
		} catch (error: any) {
			// Log detallado del error para depuración
			console.error("Error al añadir contactos/segmentos a la campaña:", {
				error,
				response: error.response,
				data: error.response?.data,
				status: error.response?.status,
				requestData,
			});

			// Obtener mensaje de error más específico
			let errorMessage = "Error al añadir a la campaña";

			if (error.response?.status === 400) {
				// Error de validación del servidor
				if (error.response.data?.errors) {
					// Si hay errores específicos de validación
					const validationErrors = Object.values(error.response.data.errors).flat().join(", ");
					errorMessage = `Error de validación: ${validationErrors}`;
				} else if (error.response.data?.message) {
					errorMessage = error.response.data.message;
				} else {
					errorMessage = "Solicitud inválida. Por favor, verifica los datos enviados.";
				}
			} else if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}

			// Mostrar mensaje de error mejorado
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setSubmitting(false);
		}
	};

	// Función para verificar el estado del proceso asíncrono
	const checkProcessStatus = async (campaignId: string) => {
		try {
			const result = await CampaignService.getAddAllActiveContactsStatus(campaignId);

			if (result.success) {
				// Adaptar los datos al formato del estado local
				setProcessStatus({
					status: result.data.status,
					processedCount: result.data.processedCount,
					totalAdded: result.data.addedCount, // Usar addedCount según el formato actual
					totalToAdd: result.data.totalToAdd,
					message: result.data.message,
					completedAt: result.data.completedAt,
					// Compatibilidad con campos antiguos
					processed: result.data.processedCount,
					total: result.data.totalToAdd,
					added: result.data.addedCount, // Usar addedCount según el formato actual
					failed: result.data.failed,
				});

				// Si el proceso ha completado
				if (result.data.status === "completed") {
					setAsyncProcessing(false);
					setAddingAllContacts(false);

					// Mostrar mensaje de éxito
					const successMessage = `Proceso completado: se añadieron ${result.data.addedCount || 0} contactos`;
					enqueueSnackbar(successMessage, {
						variant: "success",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});

					// Notificar al componente padre
					if (onContactsChange) {
						onContactsChange();
					}
					onClose();
					return true;
				}
				// Si el proceso falló
				else if (result.data.status === "error") {
					setAsyncProcessing(false);
					setAddingAllContacts(false);

					enqueueSnackbar(`El proceso falló: ${result.data.message || result.message}`, {
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

			setAsyncProcessing(false);
			setAddingAllContacts(false);
			return true; // Terminar verificaciones
		}
	};

	const handleAddAllActiveContacts = async () => {
		try {
			setAddingAllContacts(true);

			const result = await CampaignService.addAllActiveContactsToCampaign(campaign._id!);

			if (result.success) {
				// Si es una operación asíncrona, iniciar proceso de seguimiento
				if (result.data && (result.data.status === "processing" || result.data.status === "esperando")) {
					setAsyncProcessing(true);
					setProcessStatus({
						status: result.data.status,
						processedCount: result.data.processedCount || 0,
						totalToAdd: result.data.totalToAdd || 0,
						totalAdded: result.data.addedCount || 0,
						message: result.message,
						// Compatibilidad con la implementación anterior
						processed: result.data.processedCount || 0,
						total: result.data.totalToAdd || 0,
						added: result.data.addedCount || 0,
					});

					// Mostrar mensaje inicial
					enqueueSnackbar(result.message || "Procesando contactos en segundo plano...", {
						variant: "info",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});

					// Configurar intervalo para verificar estado
					const checkStatus = async () => {
						const isComplete = await checkProcessStatus(campaign._id!);
						if (!isComplete) {
							// Si el proceso no está completo, verificar nuevamente en 2-3 segundos
							setTimeout(checkStatus, 2500);
						}
					};

					// Primera verificación después de 2 segundos
					setTimeout(checkStatus, 2000);
				}
				// Si es una respuesta inmediata/síncrona
				else if (result.data && result.data.status === "completed") {
					if (result.data.addedCount && result.data.addedCount > 0) {
						enqueueSnackbar(`Se añadieron ${result.data.addedCount} contactos activos`, {
							variant: "success",
						});
						if (onContactsChange) {
							onContactsChange(); // Notificar al componente padre sobre el cambio
						}
						onClose();
					} else {
						enqueueSnackbar(result.message || "No hay contactos activos para añadir", {
							variant: "info",
							anchorOrigin: { vertical: "bottom", horizontal: "right" },
						});
						setAddingAllContacts(false);
					}
				} else {
					enqueueSnackbar(result.message || "Operación iniciada", {
						variant: "info",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					});
					setAddingAllContacts(false);
				}
			} else {
				throw new Error(result.message || "Error desconocido");
			}
		} catch (error: any) {
			const errorMessage = error.response?.data?.message || error.message || "Error al añadir todos los contactos activos";
			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			setAddingAllContacts(false);
			setAsyncProcessing(false);
		}
	};

	// Handlers para paginación
	const handleContactPageChange = (event: unknown, newPage: number) => {
		setContactPage(newPage + 1); // API usa paginación basada en 1
	};

	const handleSegmentPageChange = (event: unknown, newPage: number) => {
		setSegmentPage(newPage + 1); // API usa paginación basada en 1
	};

	return (
		<>
			{/* Modal de progreso para proceso asíncrono */}
			{asyncProcessing && processStatus && (
				<Modal
					open={asyncProcessing}
					aria-labelledby="async-process-modal-title"
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
						<Typography variant="h4" id="async-process-modal-title" gutterBottom>
							Añadiendo contactos a la campaña
						</Typography>
						<Box sx={{ my: 3 }}>
							<CircularProgress size={60} />
						</Box>
						<Typography variant="body1" gutterBottom>
							{processStatus.status === "processing"
								? "Procesando contactos..."
								: processStatus.status === "esperando"
								? "En espera..."
								: processStatus.status === "completed"
								? "Completado"
								: processStatus.status}
						</Typography>
						{processStatus.message && (
							<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
								{processStatus.message}
							</Typography>
						)}

						<Box sx={{ mt: 2, mb: 3 }}>
							<LinearProgress
								variant="determinate"
								value={
									(processStatus.totalToAdd || processStatus.total || 0) > 0
										? ((processStatus.processedCount || processStatus.processed || 0) /
												(processStatus.totalToAdd || processStatus.total || 0)) *
										  100
										: 0
								}
								sx={{ height: 10, borderRadius: 5 }}
							/>
							<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
								{processStatus.processedCount !== undefined ? processStatus.processedCount : processStatus.processed} de{" "}
								{processStatus.totalToAdd || processStatus.total || 0} contactos procesados
								{(processStatus.totalAdded !== undefined || processStatus.added !== undefined) &&
									` (${processStatus.totalAdded !== undefined ? processStatus.totalAdded : processStatus.added} añadidos)`}
								{processStatus.failed && processStatus.failed > 0 && `, ${processStatus.failed} fallidos`}
							</Typography>
						</Box>

						<Typography variant="caption" color="textSecondary">
							Este proceso se completará en segundo plano. Puede cerrar esta ventana y continuar trabajando.
						</Typography>

						<Box sx={{ mt: 2 }}>
							<Button
								onClick={() => {
									setAsyncProcessing(false);
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
				aria-describedby="campaign-contacts-modal-description"
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Paper
					sx={{
						width: "90%",
						maxWidth: 900,
						height: "90vh",
						display: "flex",
						flexDirection: "column",
						borderRadius: 2,
						overflow: "hidden",
					}}
				>
					{/* Header fijo */}
					<Box sx={{ p: 3, pb: 2 }}>
						<Box display="flex" alignItems="center" gap={2} mb={1}>
							<Typography variant="h4" id="campaign-contacts-modal-title">
								Añadir a la Campaña: {campaign.name}
							</Typography>
							<Chip
								label={
									campaign.status === "draft"
										? "Borrador"
										: campaign.status === "active"
										? "Activa"
										: campaign.status === "paused"
										? "Pausada"
										: campaign.status === "completed"
										? "Completada"
										: "Archivada"
								}
								color={
									campaign.status === "draft"
										? "default"
										: campaign.status === "active"
										? "success"
										: campaign.status === "paused"
										? "warning"
										: campaign.status === "completed"
										? "info"
										: "secondary"
								}
								size="small"
							/>
						</Box>
						<Typography variant="body2" color="textSecondary" gutterBottom>
							Seleccione contactos o un segmento para añadir a esta campaña
						</Typography>

						{!canAddContacts && (
							<Alert severity="warning" sx={{ mt: 2 }}>
								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
									No se pueden agregar contactos a esta campaña
								</Typography>
								<Typography variant="body2">
									Las campañas en estado "{campaign.status === "completed" ? "completada" : "archivada"}" no permiten agregar nuevos
									contactos.
								</Typography>
								<Typography variant="caption" display="block" sx={{ mt: 1 }}>
									Los contactos solo pueden agregarse a campañas en estado: borrador, activa o pausada.
								</Typography>
							</Alert>
						)}
					</Box>

					<Divider />

					{/* Tabs fijos */}
					<Tabs
						value={tabValue}
						onChange={handleTabChange}
						indicatorColor="primary"
						textColor="primary"
						variant="fullWidth"
						aria-label="campaign contacts tabs"
						sx={{ px: 3, pt: 2 }}
					>
						<Tab label="Contactos Individuales" />
						<Tab label="Segmentos" />
					</Tabs>

					{/* Contenido con scroll */}
					<Box sx={{ flexGrow: 1, overflow: "auto", px: 3 }}>
						<TabPanel value={tabValue} index={0}>
							<Box mt={3} mb={2}>
								<Grid container spacing={2} alignItems="center">
									<Grid item xs>
										<TextField
											fullWidth
											variant="outlined"
											size="small"
											placeholder="Buscar contactos por nombre, email..."
											value={contactSearch}
											onChange={(e) => setContactSearch(e.target.value)}
											onKeyPress={(e) => e.key === "Enter" && handleContactSearch()}
											InputProps={{
												endAdornment: (
													<IconButton onClick={handleContactSearch} edge="end" size="small">
														<SearchNormal1 size={18} />
													</IconButton>
												),
											}}
										/>
									</Grid>
									<Grid item>
										<Box sx={{ display: "flex", alignItems: "center" }}>
											<Chip
												label={`${selectedContacts.length} seleccionados`}
												color={selectedContacts.length > 0 ? "primary" : "default"}
												sx={{ mr: 1 }}
											/>
											{contacts.length > 0 && (
												<Button
													size="small"
													variant="outlined"
													color="secondary"
													disabled={!canAddContacts}
													onClick={() => {
														// Solo trabajar con los contactos de la página actual
														const currentPageContactIds = contacts.filter((contact) => contact._id).map((contact) => contact._id as string);

														// Verificar si todos los contactos de la página actual están seleccionados
														const allCurrentSelected = currentPageContactIds.every((id) => selectedContacts.includes(id));

														if (allCurrentSelected) {
															// Deseleccionar solo los contactos de la página actual
															const newSelection = selectedContacts.filter((id) => !currentPageContactIds.includes(id));
															setSelectedContacts(newSelection);
														} else {
															// Mantener las selecciones anteriores y agregar las nuevas
															const newSelection = [...selectedContacts];
															currentPageContactIds.forEach((id) => {
																if (!newSelection.includes(id)) {
																	newSelection.push(id);
																}
															});
															setSelectedContacts(newSelection);
														}
													}}
												>
													{contacts.filter((contact) => contact._id).every((contact) => selectedContacts.includes(contact._id as string))
														? "Deseleccionar página"
														: "Seleccionar página"}
												</Button>
											)}
										</Box>
									</Grid>
								</Grid>
							</Box>

							<Box sx={{ display: "flex", flexDirection: "column", height: 400 }}>
								<Box sx={{ flexGrow: 1, overflow: "auto" }}>
									<MainCard
										content={false}
										sx={{
											border: "none",
											boxShadow: "none",
										}}
									>
										{loadingContacts ? (
											<Box display="flex" justifyContent="center" alignItems="center" py={4}>
												<CircularProgress />
											</Box>
										) : contacts.length === 0 ? (
											<Box textAlign="center" p={3}>
												<Typography variant="body1">No se encontraron contactos</Typography>
												{contactSearch && (
													<Button
														variant="text"
														color="primary"
														onClick={() => {
															setContactSearch("");
															setContactPage(1);
															// No es necesario llamar a fetchContacts aquí, el efecto lo hará
														}}
														sx={{ mt: 1 }}
													>
														Limpiar búsqueda
													</Button>
												)}
											</Box>
										) : (
											<>
												{contacts.map((contact) => (
													<Box
														key={contact._id}
														p={2}
														onClick={() => canAddContacts && contact._id && toggleContactSelection(contact._id)}
														sx={{
															cursor: canAddContacts ? "pointer" : "not-allowed",
															opacity: canAddContacts ? 1 : 0.6,
															display: "flex",
															alignItems: "center",
															justifyContent: "space-between",
															borderBottom: `1px solid ${theme.palette.divider}`,
															bgcolor: contact._id && selectedContacts.includes(contact._id) ? theme.palette.primary.light : "transparent",
															"&:hover": {
																bgcolor: canAddContacts ? theme.palette.grey[100] : "transparent",
															},
														}}
													>
														<Box display="flex" alignItems="center">
															<Box ml={1}>
																<Typography variant="subtitle1">
																	{contact.firstName} {contact.lastName}
																</Typography>
																<Typography variant="body2" color="textSecondary">
																	{contact.email}
																</Typography>
															</Box>
														</Box>

														{contact._id && selectedContacts.includes(contact._id) ? (
															<TickCircle size={20} color={theme.palette.primary.main} />
														) : (
															<Add size={20} color={theme.palette.text.secondary} />
														)}
													</Box>
												))}
											</>
										)}
									</MainCard>
								</Box>
								<Box sx={{ mt: 2, borderTop: `1px solid ${theme.palette.divider}`, pt: 1 }}>
									<TablePagination
										component="div"
										count={totalContacts}
										page={contactPage - 1} // La API usa paginación basada en 1, pero MUI usa 0
										onPageChange={handleContactPageChange}
										rowsPerPage={10}
										rowsPerPageOptions={[10]}
										labelRowsPerPage="Por página:"
										labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => {
											const validFrom = isNaN(from) ? 0 : from;
											const validTo = isNaN(to) ? 0 : to;
											const validCount = isNaN(count) || count === undefined ? 0 : count;
											return `${validFrom}-${validTo} de ${validCount}`;
										}}
									/>
								</Box>
							</Box>
						</TabPanel>

						<TabPanel value={tabValue} index={1}>
							<Box mt={3} mb={2}>
								<Grid container spacing={2} alignItems="center">
									<Grid item xs>
										<TextField
											fullWidth
											variant="outlined"
											size="small"
											placeholder="Buscar segmentos por nombre..."
											value={segmentSearch}
											onChange={(e) => setSegmentSearch(e.target.value)}
											onKeyPress={(e) => e.key === "Enter" && handleSegmentSearch()}
											InputProps={{
												endAdornment: (
													<IconButton onClick={handleSegmentSearch} edge="end" size="small">
														<SearchNormal1 size={18} />
													</IconButton>
												),
											}}
										/>
									</Grid>
								</Grid>
							</Box>

							<Box sx={{ display: "flex", flexDirection: "column", height: 400 }}>
								<RadioGroup
									aria-label="segments"
									name="segments"
									value={selectedSegment}
									onChange={(e) => handleSegmentSelection(e.target.value)}
									sx={{ flexGrow: 1, overflow: "auto" }}
								>
									{loadingSegments ? (
										<Box display="flex" justifyContent="center" alignItems="center" py={4}>
											<CircularProgress />
										</Box>
									) : segments.length === 0 ? (
										<Box textAlign="center" p={3}>
											<Typography variant="body1">No se encontraron segmentos</Typography>
											{segmentSearch && (
												<Button
													variant="text"
													color="primary"
													onClick={() => {
														setSegmentSearch("");
														setSegmentPage(1);
														// No es necesario llamar a fetchSegments aquí, el efecto lo hará
													}}
													sx={{ mt: 1 }}
												>
													Limpiar búsqueda
												</Button>
											)}
										</Box>
									) : (
										<MainCard content={false} sx={{ border: "none", boxShadow: "none" }}>
											{segments.map((segment) => (
												<Box
													key={segment._id}
													p={2}
													sx={{
														cursor: canAddContacts ? "pointer" : "not-allowed",
														opacity: canAddContacts ? 1 : 0.6,
														borderBottom: `1px solid ${theme.palette.divider}`,
														bgcolor: segment._id === selectedSegment ? theme.palette.primary.light : "transparent",
														"&:hover": {
															bgcolor: canAddContacts ? theme.palette.grey[100] : "transparent",
														},
													}}
												>
													<FormControlLabel
														value={segment._id}
														control={<Radio disabled={!canAddContacts} />}
														label={
															<Box>
																<Typography variant="subtitle1">{segment.name}</Typography>
																<Box display="flex" alignItems="center" mt={0.5}>
																	<Typography variant="body2" color="textSecondary">
																		{segment.description || "Sin descripción"}
																	</Typography>
																	<Chip
																		size="small"
																		label={`${segment.estimatedCount || 0} contactos`}
																		sx={{ ml: 1, fontSize: "0.75rem" }}
																		variant="outlined"
																	/>
																	<Chip
																		size="small"
																		label={segment.type}
																		color="secondary"
																		sx={{ ml: 1, fontSize: "0.75rem" }}
																		variant="outlined"
																	/>
																</Box>
															</Box>
														}
														sx={{ width: "100%", m: 0 }}
													/>
												</Box>
											))}
										</MainCard>
									)}
								</RadioGroup>
								<Box sx={{ mt: 2, borderTop: `1px solid ${theme.palette.divider}`, pt: 1 }}>
									<TablePagination
										component="div"
										count={totalSegments}
										page={segmentPage - 1} // La API usa paginación basada en 1, pero MUI usa 0
										onPageChange={handleSegmentPageChange}
										rowsPerPage={10}
										rowsPerPageOptions={[10]}
										labelRowsPerPage="Por página:"
										labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => {
											const validFrom = isNaN(from) ? 0 : from;
											const validTo = isNaN(to) ? 0 : to;
											const validCount = isNaN(count) || count === undefined ? 0 : count;
											return `${validFrom}-${validTo} de ${validCount}`;
										}}
									/>
								</Box>
							</Box>
						</TabPanel>
					</Box>

					{/* Footer fijo */}
					<Divider />
					<Box sx={{ p: 3, display: "flex", justifyContent: "space-between" }}>
						<Box>
							<Tooltip
								title={
									canAddContacts
										? "Añadir todos los contactos activos a la campaña"
										: "No se pueden agregar contactos a campañas completadas o archivadas"
								}
							>
								<span>
									<Button
										onClick={handleAddAllActiveContacts}
										variant="outlined"
										color="secondary"
										disabled={addingAllContacts || !canAddContacts}
										startIcon={addingAllContacts ? <CircularProgress size={20} color="inherit" /> : <UserAdd />}
									>
										{addingAllContacts ? "Añadiendo todos..." : "Añadir todos los activos"}
									</Button>
								</span>
							</Tooltip>
						</Box>
						<Box>
							<Button onClick={onClose} color="inherit" sx={{ mr: 1 }}>
								Cancelar
							</Button>
							<Button
								onClick={handleAddToCampaign}
								variant="contained"
								color="primary"
								disabled={
									submitting || !canAddContacts || (tabValue === 0 && selectedContacts.length === 0) || (tabValue === 1 && !selectedSegment)
								}
								startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Add />}
							>
								{submitting ? "Añadiendo..." : "Añadir a la Campaña"}
							</Button>
						</Box>
					</Box>
				</Paper>
			</Modal>
		</>
	);
};

export default CampaignContactsModal;
