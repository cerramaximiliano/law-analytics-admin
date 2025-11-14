import React, { useState, useEffect } from "react";

// material-ui
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	Collapse,
	Divider,
	IconButton,
	Modal,
	Paper,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Typography,
	useTheme,
	Grid,
	List,
	ListItem,
	ListItemText,
} from "@mui/material";

// project imports
import { Add, Edit2, Eye, Trash, ArrowDown2, ArrowUp2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import TableSkeleton from "components/UI/TableSkeleton";

// types
import { Campaign } from "types/campaign";
import { CampaignEmail, EmailStatus } from "types/campaign-email";
import { CampaignEmailService } from "store/reducers/campaign";
import CampaignEmailModal from "./CampaignEmailModal";

interface CampaignEmailListProps {
	campaign: Campaign;
	open: boolean;
	onClose: () => void;
}

const CampaignEmailList = ({ campaign, open, onClose }: CampaignEmailListProps) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// State for emails data
	const [emails, setEmails] = useState<CampaignEmail[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);

	// State for modals
	const [selectedEmail, setSelectedEmail] = useState<CampaignEmail | null>(null);
	const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
	const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

	// State for pagination
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(5);

	// State for help card collapse
	const [helpExpanded, setHelpExpanded] = useState(false);

	// State for expanded email details
	const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

	// Fetch campaign emails
	useEffect(() => {
		if (open && campaign._id) {
			fetchCampaignEmails();
		}
	}, [open, campaign._id, page, rowsPerPage]);

	// Function to fetch campaign emails
	const fetchCampaignEmails = async () => {
		if (!campaign._id) return;

		try {
			setLoading(true);
			setError(null);

			const response = await CampaignEmailService.getEmailsByCampaignId(campaign._id);
			setEmails(response.data || []);
			setTotalCount(response.total || response.data.length || 0);
		} catch (err: any) {
			// Mejorar el manejo de errores para proporcionar mensajes más específicos
			let errorMessage = "Error al cargar los emails de la campaña";

			if (err.code === "ERR_NETWORK") {
				errorMessage = "Error de conexión. Por favor verifica tu conexión a internet y vuelve a intentarlo.";
			} else if (err.response?.data?.error) {
				errorMessage = err.response.data.error;
			} else if (err.response?.data?.message) {
				errorMessage = err.response.data.message;
			} else if (err.response?.status === 404) {
				errorMessage = "No se encontraron emails para esta campaña.";
			} else if (err.response?.status === 403) {
				errorMessage = "No tienes permisos para ver los emails de esta campaña.";
			} else if (err.response?.status === 500) {
				errorMessage = "Error en el servidor. Por favor intenta nuevamente más tarde.";
			} else if (err.message && err.message !== "Network Error") {
				errorMessage = err.message;
			}

			setError(errorMessage);
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
	const handleOpenCreateModal = () => {
		setCreateModalOpen(true);
	};

	const handleCloseCreateModal = () => {
		setCreateModalOpen(false);
	};

	const handleOpenEditModal = (email: CampaignEmail) => {
		setSelectedEmail(email);
		setEditModalOpen(true);
	};

	const handleCloseEditModal = () => {
		setEditModalOpen(false);
		setSelectedEmail(null);
	};

	const handleOpenDeleteDialog = (email: CampaignEmail) => {
		setSelectedEmail(email);
		setDeleteDialogOpen(true);
	};

	const handleCloseDeleteDialog = () => {
		setDeleteDialogOpen(false);
		setSelectedEmail(null);
	};

	// Success handlers
	const handleEmailCreated = () => {
		setCreateModalOpen(false);
		fetchCampaignEmails();
		enqueueSnackbar("Email creado con éxito", {
			variant: "success",
			anchorOrigin: { vertical: "bottom", horizontal: "right" },
		});
	};

	const handleEmailUpdated = () => {
		setEditModalOpen(false);
		setSelectedEmail(null);
		fetchCampaignEmails();
		enqueueSnackbar("Email actualizado con éxito", {
			variant: "success",
			anchorOrigin: { vertical: "bottom", horizontal: "right" },
		});
	};

	const handleEmailDeleted = async () => {
		if (!selectedEmail || !selectedEmail._id) return;

		try {
			await CampaignEmailService.deleteEmail(selectedEmail._id);
			setDeleteDialogOpen(false);
			setSelectedEmail(null);
			fetchCampaignEmails();
			enqueueSnackbar("Email eliminado con éxito", {
				variant: "success",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} catch (err: any) {
			// Mejorar el manejo de errores para el delete
			let errorMessage = "Error al eliminar el email";

			if (err.code === "ERR_NETWORK") {
				errorMessage = "Error de conexión. Por favor verifica tu conexión a internet.";
			} else if (err.response?.data?.error) {
				errorMessage = err.response.data.error;
			} else if (err.response?.data?.message) {
				errorMessage = err.response.data.message;
			} else if (err.response?.status === 403) {
				errorMessage = "No tienes permisos para eliminar este email.";
			} else if (err.response?.status === 404) {
				errorMessage = "El email no fue encontrado.";
			} else if (err.message) {
				errorMessage = err.message;
			}

			enqueueSnackbar(errorMessage, {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		}
	};

	// Status chip color mapping
	const getStatusColor = (status: EmailStatus) => {
		switch (status) {
			case "draft":
				return { color: "default", label: "Borrador" };
			case "active":
				return { color: "success", label: "Activo" };
			case "paused":
				return { color: "warning", label: "Pausado" };
			case "completed":
				return { color: "info", label: "Completado" };
			default:
				return { color: "default", label: status };
		}
	};

	return (
		<>
			<Modal
				open={open}
				onClose={onClose}
				aria-labelledby="emails-modal-title"
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
						height: "90vh",
						display: "flex",
						flexDirection: "column",
						borderRadius: 2,
						overflow: "hidden",
					}}
				>
					{/* Header - Fixed */}
					<Box sx={{ p: 3, pb: 2 }}>
						<Grid container alignItems="center" justifyContent="space-between">
							<Grid item>
								<Typography variant="h4" id="emails-modal-title">
									Emails de la Campaña: {campaign.name}
								</Typography>
								<Typography variant="caption" color="textSecondary">
									{campaign.description || ""}
								</Typography>
							</Grid>
							<Grid item>
								<Button
									variant="contained"
									color="primary"
									startIcon={<Add />}
									onClick={handleOpenCreateModal}
									sx={{ textTransform: "none" }}
								>
									Nuevo Email
								</Button>
							</Grid>
						</Grid>
					</Box>

					<Divider />

					{/* Body - Scrollable */}
					<Box sx={{ flex: 1, overflow: "auto", px: 3, py: 2 }}>
						{/* Help card about email delays */}
						<Card variant="outlined" sx={{ mb: 2, backgroundColor: "action.hover" }}>
							<Box sx={{ p: 2 }}>
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="body2" color="text.secondary">
										<strong>¿Cómo funcionan los retrasos de emails en las campañas?</strong>
									</Typography>
									<IconButton size="small" onClick={() => setHelpExpanded(!helpExpanded)} sx={{ ml: 1 }}>
										{helpExpanded ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
									</IconButton>
								</Stack>

								<Collapse in={!helpExpanded} timeout="auto">
									<Grid container spacing={2} sx={{ mt: 1 }}>
										<Grid item xs={12} md={6}>
											<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
												• <strong>Primer email:</strong> Se envía X tiempo después de que el contacto se une a la campaña
											</Typography>
											<Typography variant="body2" color="text.secondary">
												• <strong>Emails siguientes:</strong> Cada retraso se calcula desde el email anterior
											</Typography>
										</Grid>
										<Grid item xs={12} md={6}>
											<Typography variant="caption" color="text.secondary" display="block">
												<strong>Ejemplo rápido:</strong> Email 1 (1 día) → Email 2 (3 días después) → Email 3 (2 días después)
											</Typography>
										</Grid>
									</Grid>
								</Collapse>

								<Collapse in={helpExpanded} timeout="auto">
									<Box sx={{ mt: 2 }}>
										<Divider sx={{ mb: 2 }} />

										<Typography variant="subtitle2" color="text.secondary" gutterBottom>
											Información detallada sobre los retrasos:
										</Typography>

										<Grid container spacing={3}>
											<Grid item xs={12} md={6}>
												<Typography variant="body2" color="text.secondary" paragraph>
													<strong>1. Campañas sin fecha de inicio:</strong>
												</Typography>
												<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
													• El delay del primer email comienza inmediatamente cuando el contacto se une a la campaña
												</Typography>
												<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
													• Cada email posterior espera su tiempo configurado después del envío del email anterior
												</Typography>

												<Typography variant="body2" color="text.secondary" paragraph>
													<strong>2. Campañas con fecha de inicio:</strong>
												</Typography>
												<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
													• La campaña debe estar activa (después de la fecha de inicio) para procesar emails
												</Typography>
												<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
													• Una vez activa, el delay del primer email se cuenta desde cuando el contacto se une, NO desde la fecha de inicio
												</Typography>
												<Typography variant="body2" color="text.secondary">
													• Si un contacto se une antes de la fecha de inicio, esperará hasta que la campaña esté activa
												</Typography>
											</Grid>

											<Grid item xs={12} md={6}>
												<Card variant="outlined" sx={{ p: 2, backgroundColor: "background.paper" }}>
													<Typography variant="caption" color="text.secondary" gutterBottom display="block">
														<strong>Ejemplo completo:</strong>
													</Typography>
													<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
														Campaña con fecha de inicio: 1 de febrero
													</Typography>
													<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
														• Contacto se une: 29 de enero
														<br />
														• 1 de febrero: Campaña activa
														<br />• Email 1 (delay 1 día): 30 de enero + 1 día = <strong>2 de febrero</strong>
														<br />
														• Email 2 (delay 3 días): 2 de febrero + 3 días = 5 de febrero
														<br />• Email 3 (delay 2 días): 5 de febrero + 2 días = 7 de febrero
													</Typography>
												</Card>

												<Box sx={{ mt: 2, p: 2, backgroundColor: "warning.lighter", borderRadius: 1 }}>
													<Typography variant="caption" color="text.secondary">
														<strong>Importante:</strong> Los delays siempre se calculan en cadena. El sistema guarda el momento del último
														envío (lastStepTime) para calcular cuándo enviar el siguiente email.
													</Typography>
												</Box>
											</Grid>
										</Grid>
									</Box>
								</Collapse>
							</Box>
						</Card>

						{error ? (
							<Alert
								severity="error"
								sx={{ mb: 2 }}
								onClose={() => {
									setError(null);
									// Intentar recargar los datos
									fetchCampaignEmails();
								}}
							>
								<Typography variant="subtitle2" gutterBottom>
									Error al cargar los emails
								</Typography>
								<Typography variant="body2">{error}</Typography>
							</Alert>
						) : (
							<>
								<TableContainer component={Paper} sx={{ boxShadow: "none" }}>
									<Table sx={{ minWidth: 650 }} aria-label="emails table">
										<TableHead>
											<TableRow>
												<TableCell>Nombre</TableCell>
												<TableCell>Asunto</TableCell>
												<TableCell>Secuencia</TableCell>
												<TableCell>Retraso</TableCell>
												<TableCell>Estado</TableCell>
												<TableCell>Tasa de apertura</TableCell>
												<TableCell align="center">Acciones</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{loading ? (
												<TableSkeleton columns={7} rows={5} />
											) : emails.length === 0 ? (
												<TableRow>
													<TableCell colSpan={7} align="center" sx={{ py: 3 }}>
														<Typography variant="subtitle1">No hay emails en esta campaña</Typography>
														<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
															Crea un nuevo email para esta campaña
														</Typography>
														<Button variant="outlined" color="primary" startIcon={<Add />} onClick={handleOpenCreateModal} sx={{ mt: 2 }}>
															Nuevo Email
														</Button>
													</TableCell>
												</TableRow>
											) : (
												emails.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((email) => {
													const statusInfo = getStatusColor(email.status || "draft");
													const openRate =
														email.metrics?.opens && email.metrics?.sent
															? ((email.metrics.opens / email.metrics.sent) * 100).toFixed(1)
															: "0";

													return (
														<>
															<TableRow hover key={email._id} tabIndex={-1}>
																<TableCell>
																	<Typography variant="subtitle2">{email.name}</Typography>
																	{email.templateId && (
																		<Typography variant="caption" color="primary">
																			Usa plantilla
																		</Typography>
																	)}
																</TableCell>
																<TableCell>{email.subject}</TableCell>
																<TableCell>{email.sequenceIndex}</TableCell>
																<TableCell>
																	{email.conditions?.timeDelay
																		? `${email.conditions.timeDelay.value} ${email.conditions.timeDelay.unit}`
																		: "Inmediato"}
																</TableCell>
																<TableCell>
																	<Chip label={statusInfo.label} color={statusInfo.color as any} size="small" />
																	{email.isFinal && <Chip label="Final" color="secondary" size="small" sx={{ ml: 1 }} />}
																</TableCell>
																<TableCell>{`${openRate}%`}</TableCell>
																<TableCell align="center">
																	<Stack direction="row" spacing={1} justifyContent="center">
																		<IconButton
																			aria-label="ver"
																			size="small"
																			color="info"
																			onClick={() => setExpandedEmailId(expandedEmailId === email._id ? null : email._id || null)}
																			title={expandedEmailId === email._id ? "Ocultar detalles" : "Ver detalles del email"}
																		>
																			{expandedEmailId === email._id ? <ArrowUp2 size={18} /> : <Eye size={18} />}
																		</IconButton>
																		<IconButton
																			aria-label="editar"
																			size="small"
																			color="primary"
																			onClick={() => handleOpenEditModal(email)}
																			title="Editar email"
																		>
																			<Edit2 size={18} />
																		</IconButton>
																		<IconButton
																			aria-label="eliminar"
																			size="small"
																			color="error"
																			onClick={() => handleOpenDeleteDialog(email)}
																			title="Eliminar email"
																		>
																			<Trash size={18} />
																		</IconButton>
																	</Stack>
																</TableCell>
															</TableRow>
															<TableRow>
																<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
																	<Collapse in={expandedEmailId === email._id} timeout="auto" unmountOnExit>
																		<Box sx={{ margin: 2 }}>
																			<Card variant="outlined">
																				<CardContent>
																					<Grid container spacing={3}>
																						{/* Header */}
																						<Grid item xs={12}>
																							<Typography variant="h6" gutterBottom>
																								Detalles del Email
																							</Typography>
																							<Divider />
																						</Grid>

																						{/* Basic Info */}
																						<Grid item xs={12} md={6}>
																							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																								Información General
																							</Typography>
																							<List dense>
																								<ListItem>
																									<ListItemText primary="Nombre" secondary={email.name} />
																								</ListItem>
																								<ListItem>
																									<ListItemText primary="Asunto" secondary={email.subject} />
																								</ListItem>
																								<ListItem>
																									<ListItemText
																										primary="Posición en secuencia"
																										secondary={`Email #${email.sequenceIndex}${email.isFinal ? " (Final)" : ""}`}
																									/>
																								</ListItem>
																								{email.templateId && (
																									<ListItem>
																										<ListItemText primary="ID de Plantilla" secondary={email.templateId} />
																									</ListItem>
																								)}
																							</List>
																						</Grid>

																						{/* Sending Configuration */}
																						<Grid item xs={12} md={6}>
																							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																								Configuración de Envío
																							</Typography>
																							<List dense>
																								{email.sender && (
																									<ListItem>
																										<ListItemText
																											primary="Remitente"
																											secondary={`${email.sender.name} <${email.sender.email}>`}
																										/>
																									</ListItem>
																								)}
																								{email.replyTo && (
																									<ListItem>
																										<ListItemText primary="Responder a" secondary={email.replyTo} />
																									</ListItem>
																								)}
																								<ListItem>
																									<ListItemText
																										primary="Condición de activación"
																										secondary={
																											email.conditions?.type === "time" && email.conditions.timeDelay
																												? `Tiempo: ${email.conditions.timeDelay.value} ${email.conditions.timeDelay.unit} después`
																												: email.conditions?.type === "event"
																												? `Evento: ${email.conditions.eventTrigger?.eventName || "No especificado"}`
																												: "Inmediato"
																										}
																									/>
																								</ListItem>
																							</List>
																						</Grid>

																						{/* Sending Restrictions */}
																						{email.sendingRestrictions && (
																							<Grid item xs={12} md={6}>
																								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																									Restricciones de Envío
																								</Typography>
																								<List dense>
																									{email.sendingRestrictions.allowedDays && (
																										<ListItem>
																											<ListItemText
																												primary="Días permitidos"
																												secondary={email.sendingRestrictions.allowedDays
																													.map((day) => {
																														const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
																														return days[day];
																													})
																													.join(", ")}
																											/>
																										</ListItem>
																									)}
																									{email.sendingRestrictions.timeWindow && (
																										<ListItem>
																											<ListItemText
																												primary="Ventana horaria"
																												secondary={`${email.sendingRestrictions.timeWindow.start} - ${email.sendingRestrictions.timeWindow.end}`}
																											/>
																										</ListItem>
																									)}
																								</List>
																							</Grid>
																						)}

																						{/* Metrics */}
																						{email.metrics && (
																							<Grid item xs={12} md={6}>
																								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																									Métricas
																								</Typography>
																								<List dense>
																									<ListItem>
																										<ListItemText primary="Enviados" secondary={email.metrics.sent || 0} />
																									</ListItem>
																									<ListItem>
																										<ListItemText
																											primary="Aperturas"
																											secondary={`${email.metrics.opens || 0} (${openRate}%)`}
																										/>
																									</ListItem>
																									<ListItem>
																										<ListItemText primary="Clics" secondary={email.metrics.clicks || 0} />
																									</ListItem>
																									{(email.metrics.bounces || email.metrics.unsubscribes || email.metrics.complaints) && (
																										<>
																											<ListItem>
																												<ListItemText primary="Rebotes" secondary={email.metrics.bounces || 0} />
																											</ListItem>
																											<ListItem>
																												<ListItemText
																													primary="Desuscripciones"
																													secondary={email.metrics.unsubscribes || 0}
																												/>
																											</ListItem>
																											<ListItem>
																												<ListItemText primary="Quejas" secondary={email.metrics.complaints || 0} />
																											</ListItem>
																										</>
																									)}
																								</List>
																							</Grid>
																						)}

																						{/* Tracking */}
																						{email.tracking && (
																							<Grid item xs={12} md={6}>
																								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																									Configuración de Tracking
																								</Typography>
																								<List dense>
																									<ListItem>
																										<ListItemText
																											primary="Tracking de aperturas"
																											secondary={email.tracking.opens ? "Activado" : "Desactivado"}
																										/>
																									</ListItem>
																									<ListItem>
																										<ListItemText
																											primary="Tracking de clics"
																											secondary={email.tracking.clicks ? "Activado" : "Desactivado"}
																										/>
																									</ListItem>
																								</List>
																							</Grid>
																						)}

																						{/* A/B Testing */}
																						{email.abTesting?.enabled && (
																							<Grid item xs={12} md={6}>
																								<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
																									A/B Testing
																								</Typography>
																								<List dense>
																									<ListItem>
																										<ListItemText primary="Estado" secondary="Activado" />
																									</ListItem>
																									{email.abTesting.variants && (
																										<ListItem>
																											<ListItemText
																												primary="Número de variantes"
																												secondary={email.abTesting.variants.length}
																											/>
																										</ListItem>
																									)}
																									{email.abTesting.testDuration && (
																										<ListItem>
																											<ListItemText
																												primary="Duración del test"
																												secondary={`${email.abTesting.testDuration.value} ${email.abTesting.testDuration.unit}`}
																											/>
																										</ListItem>
																									)}
																									{email.abTesting.winnerCriteria && (
																										<ListItem>
																											<ListItemText primary="Criterio ganador" secondary={email.abTesting.winnerCriteria} />
																										</ListItem>
																									)}
																								</List>
																							</Grid>
																						)}

																						{/* Timestamps */}
																						<Grid item xs={12}>
																							<Divider sx={{ my: 1 }} />
																							<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
																								<Typography variant="caption" color="textSecondary">
																									Creado: {email.createdAt ? new Date(email.createdAt).toLocaleString("es-ES") : "N/A"}
																								</Typography>
																								<Typography variant="caption" color="textSecondary">
																									Actualizado: {email.updatedAt ? new Date(email.updatedAt).toLocaleString("es-ES") : "N/A"}
																								</Typography>
																							</Box>
																						</Grid>
																					</Grid>
																				</CardContent>
																			</Card>
																		</Box>
																	</Collapse>
																</TableCell>
															</TableRow>
														</>
													);
												})
											)}
										</TableBody>
									</Table>
								</TableContainer>

								<TablePagination
									component="div"
									count={totalCount}
									rowsPerPage={rowsPerPage}
									page={page}
									onPageChange={handleChangePage}
									onRowsPerPageChange={handleChangeRowsPerPage}
									rowsPerPageOptions={[5, 10, 25]}
									labelRowsPerPage="Filas por página:"
									labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
								/>
							</>
						)}

						{/* Stats */}
						{emails.length > 0 && (
							<Box sx={{ mt: 3 }}>
								<Grid container spacing={2}>
									<Grid item xs={12} sm={4}>
										<Paper sx={{ p: 2, bgcolor: theme.palette.grey[100] }}>
											<Typography variant="subtitle2">Total de emails</Typography>
											<Typography variant="h4">{emails.length}</Typography>
										</Paper>
									</Grid>
									<Grid item xs={12} sm={4}>
										<Paper sx={{ p: 2, bgcolor: theme.palette.grey[100] }}>
											<Typography variant="subtitle2">Tasa de apertura promedio</Typography>
											<Typography variant="h4">
												{emails.some((e) => e.metrics?.opens && e.metrics?.sent)
													? (
															emails.reduce((acc, email) => {
																const rate =
																	email.metrics?.opens && email.metrics?.sent ? (email.metrics.opens / email.metrics.sent) * 100 : 0;
																return acc + rate;
															}, 0) / emails.length
													  ).toFixed(1) + "%"
													: "0%"}
											</Typography>
										</Paper>
									</Grid>
									<Grid item xs={12} sm={4}>
										<Paper sx={{ p: 2, bgcolor: theme.palette.grey[100] }}>
											<Typography variant="subtitle2">Emails enviados</Typography>
											<Typography variant="h4">{emails.reduce((acc, email) => acc + (email.metrics?.sent || 0), 0)}</Typography>
										</Paper>
									</Grid>
								</Grid>
							</Box>
						)}
					</Box>

					{/* Footer - Fixed */}
					<Divider />
					<Box sx={{ p: 3, pt: 2, display: "flex", justifyContent: "flex-end" }}>
						<Button onClick={onClose} color="inherit">
							Cerrar
						</Button>
					</Box>
				</Paper>
			</Modal>

			{/* Create/Edit Email Modal */}
			<CampaignEmailModal
				open={createModalOpen}
				onClose={handleCloseCreateModal}
				onSuccess={handleEmailCreated}
				campaign={campaign}
				mode="create"
			/>

			{selectedEmail && (
				<CampaignEmailModal
					open={editModalOpen}
					onClose={handleCloseEditModal}
					onSuccess={handleEmailUpdated}
					campaign={campaign}
					email={selectedEmail}
					mode="edit"
				/>
			)}

			{/* Delete Confirmation Modal */}
			<Modal
				open={deleteDialogOpen}
				onClose={handleCloseDeleteDialog}
				aria-labelledby="delete-modal-title"
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Paper sx={{ width: 400, p: 3, borderRadius: 2 }}>
					<Typography variant="h6" id="delete-modal-title" gutterBottom>
						¿Eliminar email?
					</Typography>
					<Typography variant="body2">
						¿Estás seguro de que deseas eliminar este email de la campaña? Esta acción no se puede deshacer.
					</Typography>
					{selectedEmail && (
						<Box sx={{ mt: 2, mb: 3 }}>
							<Typography variant="subtitle2">{selectedEmail.name}</Typography>
							<Typography variant="body2">Asunto: {selectedEmail.subject}</Typography>
						</Box>
					)}
					<Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
						<Button onClick={handleCloseDeleteDialog} color="inherit" sx={{ mr: 1 }}>
							Cancelar
						</Button>
						<Button onClick={handleEmailDeleted} variant="contained" color="error">
							Eliminar
						</Button>
					</Box>
				</Paper>
			</Modal>
		</>
	);
};

export default CampaignEmailList;
