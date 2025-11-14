import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Grid,
	Divider,
	Box,
	Chip,
	CircularProgress,
	Alert,
	AlertTitle,
	Table,
	TableContainer,
	TableHead,
	TableBody,
	TableRow,
	TableCell,
	IconButton,
	Collapse,
	LinearProgress,
	Stack,
	Tooltip,
	Skeleton,
	Tabs,
	Tab,
	Badge,
} from "@mui/material";
import { MarketingContact } from "types/marketing-contact";
import { MarketingContactService } from "store/reducers/marketing-contacts";
import { CampaignService } from "store/reducers/campaign";
import CampaignDetailModal from "./CampaignDetailModal";
import { Refresh, ArrowDown2, ArrowUp2, Pause, Trash, Play, PauseCircle, PlayCircle } from "iconsax-react";

interface ContactDetailModalProps {
	open: boolean;
	onClose: () => void;
	contactId: string | null;
}

const ContactDetailModal: React.FC<ContactDetailModalProps> = ({ open, onClose, contactId }) => {
	const [contact, setContact] = useState<MarketingContact | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [campaignModalOpen, setCampaignModalOpen] = useState<boolean>(false);
	const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
	const [resetCampaignId, setResetCampaignId] = useState<string | null>(null);
	const [resetLoading, setResetLoading] = useState<boolean>(false);
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [campaignProgress, setCampaignProgress] = useState<Record<string, any>>({});
	const [progressLoading, setProgressLoading] = useState<Record<string, boolean>>({});
	const [actionCampaignId, setActionCampaignId] = useState<string | null>(null);
	const [actionType, setActionType] = useState<"pause" | "remove" | "resume" | null>(null);
	const [actionLoading, setActionLoading] = useState<boolean>(false);
	const [globalActionType, setGlobalActionType] = useState<"pause" | "resume" | null>(null);
	const [globalActionLoading, setGlobalActionLoading] = useState<boolean>(false);
	const [showAllActivities, setShowAllActivities] = useState<boolean>(false);
	const [activeTab, setActiveTab] = useState<number>(0);

	// Helper function to get user-friendly error messages
	const getErrorMessage = (error: any): string => {
		if (error?.message) {
			if (error.message.toLowerCase().includes("network error")) {
				return "Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.";
			}
			if (error.message.toLowerCase().includes("404")) {
				return "El contacto no fue encontrado. Es posible que haya sido eliminado.";
			}
			if (error.message.toLowerCase().includes("401") || error.message.toLowerCase().includes("403")) {
				return "No tienes permisos para ver esta información.";
			}
			if (error.message.toLowerCase().includes("500")) {
				return "Error en el servidor. Por favor, intenta más tarde.";
			}
			return error.message;
		}
		return "Ha ocurrido un error inesperado. Por favor, intenta nuevamente.";
	};

	useEffect(() => {
		if (open && contactId) {
			// Limpiar estados cuando cambia el contacto
			setCampaignProgress({});
			setExpandedRows(new Set());
			setProgressLoading({});
			setShowAllActivities(false);
			setActiveTab(0); // Reset to first tab
			fetchContactDetails(contactId);
		}
	}, [open, contactId]);

	const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Tab Panel Component
	interface TabPanelProps {
		children?: React.ReactNode;
		index: number;
		value: number;
	}

	const TabPanel = (props: TabPanelProps) => {
		const { children, value, index, ...other } = props;

		return (
			<div role="tabpanel" hidden={value !== index} id={`contact-tabpanel-${index}`} aria-labelledby={`contact-tab-${index}`} {...other}>
				{value === index && <Box>{children}</Box>}
			</div>
		);
	};

	const fetchContactDetails = async (id: string) => {
		try {
			setLoading(true);
			setError(null);
			const contactData = await MarketingContactService.getContactById(id);

			setContact(contactData);
		} catch (err: any) {
			setError(getErrorMessage(err));
		} finally {
			setLoading(false);
		}
	};

	// Format date helper
	const formatDate = (dateString?: string | Date) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("es-ES", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get status color
	const getStatusColor = (status?: string) => {
		switch (status) {
			case "active":
				return "success";
			case "unsubscribed":
				return "error";
			case "bounced":
				return "warning";
			case "complained":
				return "error";
			default:
				return "default";
		}
	};

	// Get status label
	const getStatusLabel = (status?: string) => {
		switch (status) {
			case "active":
				return "Activo";
			case "unsubscribed":
				return "Cancelado";
			case "bounced":
				return "Rebotado";
			case "complained":
				return "Se ha quejado";
			default:
				return status || "Desconocido";
		}
	};

	// Handle reset campaign
	const handleResetCampaign = (campaignId: string) => {
		setResetCampaignId(campaignId);
	};

	// Confirm reset campaign
	const confirmResetCampaign = async () => {
		if (!resetCampaignId || !contactId) return;

		try {
			setResetLoading(true);
			await CampaignService.resetContactCampaign(resetCampaignId, contactId, {
				step: 0,
				reason: "Reset manual desde panel de administración",
			});
			// Refresh contact data
			await fetchContactDetails(contactId);
			setResetCampaignId(null);
		} catch (error: any) {
			setError(getErrorMessage(error));
		} finally {
			setResetLoading(false);
		}
	};

	// Toggle row expansion
	const handleToggleExpand = async (campaignId: string) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(campaignId)) {
			newExpanded.delete(campaignId);
		} else {
			newExpanded.add(campaignId);
			// Load progress if not already loaded
			if (!campaignProgress[campaignId] && contactId) {
				await fetchCampaignProgress(campaignId);
			}
		}
		setExpandedRows(newExpanded);
	};

	// Fetch campaign progress
	const fetchCampaignProgress = async (campaignId: string) => {
		if (!contactId) return;

		try {
			setProgressLoading((prev) => ({ ...prev, [campaignId]: true }));
			console.log(`Fetching campaign progress: /api/campaigns/${campaignId}/contacts/${contactId}/progress`);
			const response = await CampaignService.getContactCampaignProgress(campaignId, contactId);
			console.log("Campaign progress response:", response);

			setCampaignProgress((prev) => ({ ...prev, [campaignId]: response.data }));
		} catch (error: any) {
			console.error(`Error fetching campaign progress for campaign ${campaignId} and contact ${contactId}:`, error);
			// Error fetching campaign progress
		} finally {
			setProgressLoading((prev) => ({ ...prev, [campaignId]: false }));
		}
	};

	// Handle action click
	const handleActionClick = (campaignId: string, type: "pause" | "remove" | "resume") => {
		setActionCampaignId(campaignId);
		setActionType(type);
	};

	// Confirm action
	const confirmAction = async () => {
		if (!actionCampaignId || !actionType || !contactId) return;

		try {
			setActionLoading(true);

			switch (actionType) {
				case "pause":
					await CampaignService.pauseContactInCampaign(actionCampaignId, contactId, {
						reason: "Pausado manualmente desde panel de administración",
						preventResync: true,
					});
					break;
				case "remove":
					await CampaignService.removeContactFromCampaign(actionCampaignId, contactId, {
						reason: "Eliminado manualmente desde panel de administración",
						preventResync: true,
					});
					break;
				case "resume":
					await CampaignService.resumeContactInCampaign(actionCampaignId, contactId, {
						reason: "Reactivado manualmente desde panel de administración",
					});
					break;
			}

			// Refresh contact data
			await fetchContactDetails(contactId);
			setActionCampaignId(null);
			setActionType(null);
		} catch (error: any) {
			setError(getErrorMessage(error));
		} finally {
			setActionLoading(false);
		}
	};

	// Handle global action
	const handleGlobalAction = (type: "pause" | "resume") => {
		setGlobalActionType(type);
	};

	// Confirm global action
	const confirmGlobalAction = async () => {
		if (!globalActionType || !contactId) return;

		try {
			setGlobalActionLoading(true);

			if (globalActionType === "pause") {
				await MarketingContactService.pauseAllCampaigns(contactId, {
					reason: "Pausa global desde panel de administración",
				});
			} else {
				await MarketingContactService.resumeAllCampaigns(contactId, {
					reason: "Reactivación global desde panel de administración",
					onlyGloballyPaused: true,
				});
			}

			// Refresh contact data
			await fetchContactDetails(contactId);
			setGlobalActionType(null);
		} catch (error: any) {
			setError(getErrorMessage(error));
		} finally {
			setGlobalActionLoading(false);
		}
	};

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="md"
				fullWidth
				sx={{
					"& .MuiDialog-paper": {
						borderRadius: 2,
						height: "85vh",
						maxHeight: "85vh",
						display: "flex",
						flexDirection: "column",
					},
				}}
			>
				<DialogTitle
					sx={{
						flexShrink: 0,
					}}
				>
					<Grid container alignItems="center" justifyContent="space-between">
						<Grid item>
							<Typography variant="h5">Detalles del Contacto</Typography>
						</Grid>
					</Grid>
				</DialogTitle>

				<DialogContent
					dividers
					sx={{
						flex: 1,
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						p: 0,
					}}
				>
					{loading ? (
						<Box sx={{ p: 3 }}>
							<Grid container spacing={3}>
								{/* Skeleton para Información Básica */}
								<Grid item xs={12}>
									<Skeleton variant="text" width={150} height={24} sx={{ mb: 1 }} />
									<Divider sx={{ mb: 2 }} />
									<Grid container spacing={2}>
										{[...Array(8)].map((_, index) => (
											<Grid item xs={12} sm={6} key={index}>
												<Skeleton variant="text" width={80} height={20} />
												<Skeleton variant="text" width={120} height={24} />
											</Grid>
										))}
									</Grid>
								</Grid>

								{/* Skeleton para Campañas */}
								<Grid item xs={12}>
									<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
										<Skeleton variant="text" width={100} height={24} />
										<Stack direction="row" spacing={1}>
											<Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: 1 }} />
											<Skeleton variant="rectangular" width={140} height={32} sx={{ borderRadius: 1 }} />
										</Stack>
									</Box>
									<Divider sx={{ mb: 2 }} />
									<Box sx={{ mb: 3 }}>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width={40} />
													<TableCell>ID Campaña</TableCell>
													<TableCell>Estado</TableCell>
													<TableCell>Paso Actual</TableCell>
													<TableCell>Fecha de Ingreso</TableCell>
													<TableCell align="center">Acciones</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{[...Array(2)].map((_, index) => (
													<TableRow key={index}>
														<TableCell>
															<Skeleton variant="circular" width={24} height={24} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={100} />
														</TableCell>
														<TableCell>
															<Skeleton variant="rectangular" width={60} height={22} sx={{ borderRadius: 10 }} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={20} />
														</TableCell>
														<TableCell>
															<Skeleton variant="text" width={120} />
														</TableCell>
														<TableCell align="center">
															<Stack direction="row" spacing={0.5} justifyContent="center">
																<Skeleton variant="circular" width={32} height={32} />
																<Skeleton variant="circular" width={32} height={32} />
																<Skeleton variant="circular" width={32} height={32} />
															</Stack>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</Box>
								</Grid>

								{/* Skeleton para Etiquetas */}
								<Grid item xs={12}>
									<Skeleton variant="text" width={100} height={24} sx={{ mb: 1 }} />
									<Divider sx={{ mb: 2 }} />
									<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
										{[...Array(3)].map((_, index) => (
											<Skeleton key={index} variant="rectangular" width={80} height={24} sx={{ borderRadius: 10 }} />
										))}
									</Box>
								</Grid>

								{/* Skeleton para Fechas */}
								<Grid item xs={12}>
									<Skeleton variant="text" width={60} height={24} sx={{ mb: 1 }} />
									<Divider sx={{ mb: 2 }} />
									<Grid container spacing={2}>
										{[...Array(2)].map((_, index) => (
											<Grid item xs={12} sm={6} key={index}>
												<Skeleton variant="text" width={80} height={20} />
												<Skeleton variant="text" width={150} height={24} />
											</Grid>
										))}
									</Grid>
								</Grid>
							</Grid>
						</Box>
					) : error ? (
						<Box sx={{ p: 3 }}>
							<Alert
								severity="error"
								sx={{ my: 2 }}
								action={
									<Button color="inherit" size="small" onClick={() => contactId && fetchContactDetails(contactId)}>
										Reintentar
									</Button>
								}
							>
								<AlertTitle>Error al cargar el contacto</AlertTitle>
								{error}
							</Alert>
						</Box>
					) : contact ? (
						<Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
							{/* Tabs */}
							<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 2 }}>
								<Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
									<Tab label="Información Básica" />
									<Tab label="Datos Adicionales" />
									<Tab
										label={
											<Badge badgeContent={contact.campaigns ? contact.campaigns.length : 0} color="primary">
												Campañas
											</Badge>
										}
									/>
									<Tab
										label={
											<Badge
												badgeContent={contact.segments ? contact.segments.filter((s: any) => s.status === "active").length : 0}
												color="primary"
											>
												Segmentos
											</Badge>
										}
									/>
									<Tab
										label={
											<Badge badgeContent={contact.activities ? contact.activities.length : 0} color="primary">
												Actividad
											</Badge>
										}
									/>
									<Tab label="Métricas" />
								</Tabs>
							</Box>

							{/* Tab Content Container */}
							<Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
								{/* Tab Panel 0 - Información Básica */}
								<TabPanel value={activeTab} index={0}>
									<Grid container spacing={3}>
										{/* Información básica */}
										<Grid item xs={12}>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												Información Básica
											</Typography>
											<Divider sx={{ mb: 2 }} />

											<Grid container spacing={2}>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Email
													</Typography>
													<Typography variant="body1">{contact.email}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Estado
													</Typography>
													<Chip label={getStatusLabel(contact.status)} color={getStatusColor(contact.status) as any} size="small" />
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Nombre
													</Typography>
													<Typography variant="body1">{contact.firstName || "-"}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Apellido
													</Typography>
													<Typography variant="body1">{contact.lastName || "-"}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Teléfono
													</Typography>
													<Typography variant="body1">{contact.phone || "-"}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Empresa
													</Typography>
													<Typography variant="body1">{contact.company || "-"}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Cargo
													</Typography>
													<Typography variant="body1">{contact.position || "-"}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Fuente
													</Typography>
													<Typography variant="body1">{contact.source || "-"}</Typography>
												</Grid>
											</Grid>
										</Grid>
									</Grid>
								</TabPanel>

								{/* Tab Panel 1 - Datos Adicionales */}
								<TabPanel value={activeTab} index={1}>
									<Grid container spacing={3}>
										{/* Campos personalizados */}
										{contact.customFields && Object.keys(contact.customFields).length > 0 && (
											<Grid item xs={12}>
												<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
													Campos Personalizados
												</Typography>
												<Divider sx={{ mb: 2 }} />

												<Grid container spacing={2}>
													{Object.entries(contact.customFields).map(([key, value]) => (
														<Grid item xs={12} sm={6} key={key}>
															<Typography variant="body2" color="textSecondary">
																{key}
															</Typography>
															<Typography variant="body1">{value?.toString() || "-"}</Typography>
														</Grid>
													))}
												</Grid>
											</Grid>
										)}

										{/* Etiquetas */}
										<Grid item xs={12}>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												Etiquetas
											</Typography>
											<Divider sx={{ mb: 2 }} />

											<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
												{contact.tags && contact.tags.length > 0 ? (
													contact.tags.map((tag: any, index: number) => (
														<Chip
															key={index}
															label={typeof tag === "string" ? tag : tag.name}
															size="small"
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

										{/* Fechas */}
										<Grid item xs={12}>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												Fechas
											</Typography>
											<Divider sx={{ mb: 2 }} />

											<Grid container spacing={2}>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Creado
													</Typography>
													<Typography variant="body1">{formatDate(contact.createdAt)}</Typography>
												</Grid>
												<Grid item xs={12} sm={6}>
													<Typography variant="body2" color="textSecondary">
														Última actualización
													</Typography>
													<Typography variant="body1">{formatDate(contact.updatedAt)}</Typography>
												</Grid>
												{contact.lastActivity && (
													<Grid item xs={12} sm={6}>
														<Typography variant="body2" color="textSecondary">
															Última actividad
														</Typography>
														<Typography variant="body1">{formatDate(contact.lastActivity)}</Typography>
													</Grid>
												)}
											</Grid>
										</Grid>
									</Grid>
								</TabPanel>

								{/* Tab Panel 2 - Campañas */}
								<TabPanel value={activeTab} index={2}>
									<Grid container spacing={3}>
										<Grid item xs={12}>
											<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
												<Typography variant="subtitle1" fontWeight="bold">
													Campañas
												</Typography>
												{contact.campaigns && contact.campaigns.length > 0 && (
													<Stack direction="row" spacing={1}>
														<Tooltip
															title={
																contact.campaigns.some((c: any) => c.status === "active")
																	? "Pausar contacto en todas las campañas activas"
																	: "No hay campañas activas para pausar"
															}
														>
															<span>
																<Button
																	size="small"
																	variant="outlined"
																	color="warning"
																	startIcon={<PauseCircle size={16} />}
																	onClick={() => handleGlobalAction("pause")}
																	disabled={!contact.campaigns.some((c: any) => c.status === "active")}
																>
																	Pausar Todas
																</Button>
															</span>
														</Tooltip>
														<Tooltip
															title={
																contact.campaigns.some((c: any) => c.status === "paused")
																	? "Reactivar contacto en todas las campañas pausadas"
																	: "No hay campañas pausadas para reactivar"
															}
														>
															<span>
																<Button
																	size="small"
																	variant="outlined"
																	color="success"
																	startIcon={<PlayCircle size={16} />}
																	onClick={() => handleGlobalAction("resume")}
																	disabled={!contact.campaigns.some((c: any) => c.status === "paused")}
																>
																	Reactivar Todas
																</Button>
															</span>
														</Tooltip>
													</Stack>
												)}
											</Box>
											<Divider sx={{ mb: 2 }} />

											{/* Tabla de campañas */}
											{contact.campaigns &&
											Array.isArray(contact.campaigns) &&
											contact.campaigns.length > 0 &&
											typeof contact.campaigns[0] === "object" ? (
												<Box sx={{ mb: 3 }}>
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell width={40} />
																<TableCell>ID Campaña</TableCell>
																<TableCell>Estado</TableCell>
																<TableCell>Paso Actual</TableCell>
																<TableCell>Fecha de Ingreso</TableCell>
																<TableCell align="center">Acciones</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{contact.campaigns.map((campaign: any, index: number) => (
																<React.Fragment key={index}>
																	<TableRow>
																		<TableCell>
																			<Tooltip title={expandedRows.has(campaign.campaignId) ? "Ocultar progreso" : "Ver progreso"}>
																				<IconButton size="small" onClick={() => handleToggleExpand(campaign.campaignId)}>
																					{expandedRows.has(campaign.campaignId) ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
																				</IconButton>
																			</Tooltip>
																		</TableCell>
																		<TableCell>
																			<Button
																				color="primary"
																				size="small"
																				onClick={() => {
																					setSelectedCampaignId(campaign.campaignId);
																					setCampaignModalOpen(true);
																				}}
																			>
																				{campaign.campaignId.substring(0, 8)}...
																			</Button>
																		</TableCell>
																		<TableCell>
																			<Chip
																				label={campaign.status}
																				color={
																					campaign.status === "active"
																						? "success"
																						: campaign.status === "completed"
																						? "info"
																						: campaign.status === "paused"
																						? "warning"
																						: "default"
																				}
																				size="small"
																				variant="outlined"
																			/>
																		</TableCell>
																		<TableCell>{campaign.currentStep !== undefined ? campaign.currentStep : "-"}</TableCell>
																		<TableCell>{formatDate(campaign.joinedAt)}</TableCell>
																		<TableCell align="center">
																			<Stack direction="row" spacing={0.5} justifyContent="center">
																				{campaign.status === "active" ? (
																					<>
																						<Tooltip title="Resetear campaña al paso inicial">
																							<IconButton size="small" onClick={() => handleResetCampaign(campaign.campaignId)}>
																								<Refresh size={18} />
																							</IconButton>
																						</Tooltip>
																						<Tooltip title="Pausar contacto en la campaña">
																							<IconButton
																								size="small"
																								onClick={() => handleActionClick(campaign.campaignId, "pause")}
																								color="warning"
																							>
																								<Pause size={18} />
																							</IconButton>
																						</Tooltip>
																						<Tooltip title="Eliminar contacto de la campaña">
																							<IconButton
																								size="small"
																								onClick={() => handleActionClick(campaign.campaignId, "remove")}
																								color="error"
																							>
																								<Trash size={18} />
																							</IconButton>
																						</Tooltip>
																					</>
																				) : campaign.status === "paused" ? (
																					<Tooltip title="Reactivar contacto en la campaña">
																						<IconButton
																							size="small"
																							onClick={() => handleActionClick(campaign.campaignId, "resume")}
																							color="success"
																						>
																							<Play size={18} />
																						</IconButton>
																					</Tooltip>
																				) : null}
																			</Stack>
																		</TableCell>
																	</TableRow>
																	<TableRow>
																		<TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
																			<Collapse in={expandedRows.has(campaign.campaignId)} timeout="auto" unmountOnExit>
																				<Box sx={{ margin: 2 }}>
																					{progressLoading[campaign.campaignId] ? (
																						<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 2 }}>
																							<CircularProgress size={24} />
																						</Box>
																					) : campaignProgress[campaign.campaignId] ? (
																						<Grid container spacing={2}>
																							{/* Header with Campaign Name and Type */}
																							<Grid item xs={12}>
																								<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
																									<Typography variant="subtitle2" fontWeight="bold">
																										{campaignProgress[campaign.campaignId].campaign.name}
																									</Typography>
																									<Chip
																										label={
																											campaignProgress[campaign.campaignId].campaign.type === "automated"
																												? "Automatizada"
																												: "Manual"
																										}
																										size="small"
																										color={
																											campaignProgress[campaign.campaignId].campaign.type === "automated"
																												? "primary"
																												: "default"
																										}
																									/>
																								</Box>
																								<Divider />
																							</Grid>

																							{/* Progress Bar */}
																							<Grid item xs={12}>
																								<Box sx={{ mb: 1 }}>
																									<Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
																										<Typography variant="body2" color="textSecondary">
																											Progreso
																										</Typography>
																										<Typography variant="body2" fontWeight="medium">
																											{campaignProgress[campaign.campaignId].progress.currentStep} de{" "}
																											{campaignProgress[campaign.campaignId].campaign.totalEmails} emails
																											{campaignProgress[campaign.campaignId].campaign.activeEmails <
																												campaignProgress[campaign.campaignId].campaign.totalEmails && (
																												<Typography component="span" variant="caption" color="textSecondary">
																													{" "}
																													({campaignProgress[campaign.campaignId].campaign.activeEmails} activos)
																												</Typography>
																											)}
																										</Typography>
																									</Box>

																									{/* Enhanced Progress Bar with Sequence Map */}
																									{campaignProgress[campaign.campaignId].campaign.sequenceMap ? (
																										<Box sx={{ position: "relative", mb: 2 }}>
																											<LinearProgress
																												variant="determinate"
																												value={
																													(campaignProgress[campaign.campaignId].progress.currentStep /
																														campaignProgress[campaign.campaignId].campaign.totalEmails) *
																													100
																												}
																												sx={{ height: 8, borderRadius: 1 }}
																											/>

																											{/* Sequence indicators */}
																											<Box
																												sx={{
																													position: "absolute",
																													top: 0,
																													left: 0,
																													right: 0,
																													height: "100%",
																													display: "flex",
																													alignItems: "center",
																												}}
																											>
																												{campaignProgress[campaign.campaignId].campaign.sequenceMap.map(
																													(email: any, index: number) => {
																														const position =
																															((index + 1) / campaignProgress[campaign.campaignId].campaign.totalEmails) *
																															100;
																														return (
																															<Tooltip
																																key={index}
																																title={
																																	<Box>
																																		<Typography variant="caption" display="block">
																																			{email.name}
																																		</Typography>
																																		<Typography variant="caption" display="block">
																																			Estado:{" "}
																																			{email.status === "active"
																																				? "Activo"
																																				: email.status === "paused"
																																				? "Pausado"
																																				: email.status === "draft"
																																				? "Borrador"
																																				: email.status}
																																		</Typography>
																																		{email.willBlock && (
																																			<Typography variant="caption" color="warning.light" display="block">
																																				⚠️ Bloqueará el progreso
																																			</Typography>
																																		)}
																																	</Box>
																																}
																															>
																																<Box
																																	sx={{
																																		position: "absolute",
																																		left: `${position}%`,
																																		transform: "translateX(-50%)",
																																		width: 2,
																																		height: 12,
																																		bgcolor: email.isActive ? "success.main" : "error.main",
																																		borderRadius: 1,
																																		opacity: 0.8,
																																		cursor: "pointer",
																																		"&:hover": { opacity: 1, height: 16 },
																																	}}
																																/>
																															</Tooltip>
																														);
																													},
																												)}
																											</Box>

																											{/* Blocked indicator */}
																											{campaignProgress[campaign.campaignId].progress.blockedAt !== null && (
																												<Tooltip
																													title={`La campaña se detendrá aquí porque el email #${
																														campaignProgress[campaign.campaignId].progress.blockedAt + 1
																													} no está activo`}
																													placement="top"
																												>
																													<Box
																														sx={{
																															position: "absolute",
																															left: `${
																																((campaignProgress[campaign.campaignId].progress.blockedAt + 0.5) /
																																	campaignProgress[campaign.campaignId].campaign.totalEmails) *
																																100
																															}%`,
																															transform: "translateX(-50%)",
																															top: -4,
																															bottom: -4,
																															width: 2,
																															bgcolor: "warning.main",
																															boxShadow: "0 0 4px rgba(255, 152, 0, 0.5)",
																															cursor: "help",
																														}}
																													/>
																												</Tooltip>
																											)}
																										</Box>
																									) : (
																										<LinearProgress
																											variant="determinate"
																											value={
																												(campaignProgress[campaign.campaignId].progress.currentStep /
																													campaignProgress[campaign.campaignId].campaign.totalEmails) *
																												100
																											}
																											sx={{ height: 6, borderRadius: 1 }}
																										/>
																									)}

																									{/* Legend */}
																									{campaignProgress[campaign.campaignId].campaign.sequenceMap && (
																										<Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
																											<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
																												<Box sx={{ width: 12, height: 4, bgcolor: "success.main", borderRadius: 0.5 }} />
																												<Typography variant="caption" color="textSecondary">
																													Activo
																												</Typography>
																											</Box>
																											<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
																												<Box sx={{ width: 12, height: 4, bgcolor: "error.main", borderRadius: 0.5 }} />
																												<Typography variant="caption" color="textSecondary">
																													Inactivo
																												</Typography>
																											</Box>
																											{campaignProgress[campaign.campaignId].progress.blockedAt !== null && (
																												<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
																													<Box sx={{ width: 2, height: 12, bgcolor: "warning.main", borderRadius: 0.5 }} />
																													<Typography variant="caption" color="textSecondary">
																														Se detendrá aquí (email #
																														{campaignProgress[campaign.campaignId].progress.blockedAt + 1} no activo)
																													</Typography>
																												</Box>
																											)}
																										</Box>
																									)}
																								</Box>
																							</Grid>

																							{/* Compact Info Grid */}
																							<Grid item xs={12}>
																								<Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 1.5, sm: 2, md: 3 } }}>
																									<Box>
																										<Typography variant="caption" color="textSecondary">
																											Última actividad
																										</Typography>
																										<Typography variant="body2">
																											{campaignProgress[campaign.campaignId].progress.lastStepTime
																												? formatDate(campaignProgress[campaign.campaignId].progress.lastStepTime)
																												: "N/A"}
																										</Typography>
																									</Box>
																								</Box>
																							</Grid>

																							{/* Next Email Info */}
																							{campaignProgress[campaign.campaignId].progress.nextEmail &&
																								campaignProgress[campaign.campaignId].progress.status === "active" && (
																									<Grid item xs={12}>
																										<Alert
																											severity={
																												campaignProgress[campaign.campaignId].progress.nextEmail.isBlocked
																													? "warning"
																													: "info"
																											}
																											sx={{
																												mt: 1,
																												"& .MuiAlert-message": { width: "100%" },
																											}}
																										>
																											<Box>
																												<Typography variant="body2" fontWeight="medium" gutterBottom>
																													{campaignProgress[campaign.campaignId].progress.nextEmail.isBlocked ? "⚠️ " : ""}
																													Próximo Email: {campaignProgress[campaign.campaignId].progress.nextEmail.subject}
																												</Typography>

																												{campaignProgress[campaign.campaignId].progress.nextEmail.isBlocked && (
																													<Typography variant="caption" color="warning.dark" display="block" sx={{ mb: 1 }}>
																														Este email está en estado "
																														{campaignProgress[campaign.campaignId].progress.nextEmail.status}" y bloqueará
																														el progreso de la campaña.
																													</Typography>
																												)}

																												<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1 }}>
																													<Typography variant="caption" color="textSecondary">
																														Email #
																														{campaignProgress[campaign.campaignId].progress.nextEmail.sequenceIndex + 1}
																													</Typography>
																													{!campaignProgress[campaign.campaignId].progress.nextEmail.isBlocked &&
																														campaignProgress[campaign.campaignId].progress.nextSendTime && (
																															<Typography variant="caption">
																																• Se enviará el{" "}
																																<strong>
																																	{formatDate(campaignProgress[campaign.campaignId].progress.nextSendTime)}
																																</strong>
																															</Typography>
																														)}
																													{campaignProgress[campaign.campaignId].progress.nextEmail.conditions &&
																														campaignProgress[campaign.campaignId].progress.nextEmail.conditions.type ===
																															"time" &&
																														campaignProgress[campaign.campaignId].progress.nextEmail.conditions
																															.timeDelay && (
																															<Typography variant="caption" color="textSecondary">
																																•{" "}
																																{
																																	campaignProgress[campaign.campaignId].progress.nextEmail.conditions
																																		.timeDelay.value
																																}{" "}
																																{campaignProgress[campaign.campaignId].progress.nextEmail.conditions
																																	.timeDelay.unit === "days"
																																	? "días"
																																	: campaignProgress[campaign.campaignId].progress.nextEmail.conditions
																																			.timeDelay.unit === "hours"
																																	? "horas"
																																	: campaignProgress[campaign.campaignId].progress.nextEmail.conditions
																																			.timeDelay.unit}{" "}
																																después
																															</Typography>
																														)}
																												</Box>
																											</Box>
																										</Alert>
																									</Grid>
																								)}

																							{/* Completion Info */}
																							{campaignProgress[campaign.campaignId].progress.completedAt && (
																								<Grid item xs={12}>
																									<Alert severity="success" sx={{ mt: 1 }}>
																										Campaña completada el{" "}
																										{formatDate(campaignProgress[campaign.campaignId].progress.completedAt)}
																									</Alert>
																								</Grid>
																							)}
																						</Grid>
																					) : (
																						<Typography variant="body2" color="textSecondary">
																							No se pudo cargar el progreso
																						</Typography>
																					)}
																				</Box>
																			</Collapse>
																		</TableCell>
																	</TableRow>
																</React.Fragment>
															))}
														</TableBody>
													</Table>
												</Box>
											) : (
												<Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
													No hay campañas disponibles
												</Typography>
											)}
										</Grid>
									</Grid>
								</TabPanel>

								{/* Tab Panel 3 - Segmentos */}
								<TabPanel value={activeTab} index={3}>
									<Grid container spacing={3}>
										<Grid item xs={12}>
											<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
												Segmentos
											</Typography>
											<Divider sx={{ mb: 2 }} />

											{contact.segments && contact.segments.length > 0 ? (
												<TableContainer>
													<Table size="small">
														<TableHead>
															<TableRow>
																<TableCell>Nombre</TableCell>
																<TableCell>Estado</TableCell>
																<TableCell>Agregado</TableCell>
																<TableCell>Removido</TableCell>
																<TableCell>Última verificación</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{contact.segments.map((segment: any, index: number) => (
																<TableRow key={segment.segmentId || index}>
																	<TableCell>
																		<Typography variant="body2">{segment.name}</Typography>
																	</TableCell>
																	<TableCell>
																		<Chip
																			label={segment.status === "active" ? "Activo" : "Inactivo"}
																			color={segment.status === "active" ? "success" : "default"}
																			size="small"
																			variant="outlined"
																		/>
																	</TableCell>
																	<TableCell>
																		<Typography variant="caption" color="textSecondary">
																			{formatDate(segment.addedAt)}
																		</Typography>
																	</TableCell>
																	<TableCell>
																		{segment.removedAt ? (
																			<Box>
																				<Typography variant="caption" color="textSecondary">
																					{formatDate(segment.removedAt)}
																				</Typography>
																				{segment.removalReason && (
																					<Typography variant="caption" display="block" color="error">
																						{segment.removalReason}
																					</Typography>
																				)}
																			</Box>
																		) : (
																			<Typography variant="caption" color="textSecondary">
																				-
																			</Typography>
																		)}
																	</TableCell>
																	<TableCell>
																		<Typography variant="caption" color="textSecondary">
																			{segment.lastVerified ? formatDate(segment.lastVerified) : "-"}
																		</Typography>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>
											) : (
												<Typography variant="body2" color="textSecondary">
													No pertenece a ningún segmento
												</Typography>
											)}
										</Grid>
									</Grid>
								</TabPanel>

								{/* Tab Panel 4 - Actividad */}
								<TabPanel value={activeTab} index={4}>
									<Grid container spacing={3}>
										{contact.activities && contact.activities.length > 0 && (
											<Grid item xs={12}>
												<Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
													<Typography variant="subtitle1" fontWeight="bold">
														Actividad Reciente
													</Typography>
													{contact.activities.length > 5 && (
														<Typography variant="body2" color="textSecondary">
															{contact.activities.length} actividades totales
														</Typography>
													)}
												</Box>
												<Divider sx={{ mb: 2 }} />

												<TableContainer
													sx={{ maxHeight: showAllActivities ? 400 : "auto", overflow: showAllActivities ? "auto" : "visible" }}
												>
													<Table size="small" stickyHeader={showAllActivities}>
														<TableHead>
															<TableRow>
																<TableCell>Actividad</TableCell>
																<TableCell>Fecha</TableCell>
															</TableRow>
														</TableHead>
														<TableBody>
															{contact.activities.slice(0, showAllActivities ? undefined : 5).map((activity: any, index: number) => (
																<TableRow key={index}>
																	<TableCell>
																		<Typography variant="body2">
																			{activity.type === "created"
																				? "Contacto creado"
																				: activity.type === "status_change"
																				? `Cambio de estado: ${activity.metadata?.oldStatus || "-"} → ${
																						activity.metadata?.newStatus || "-"
																				  }`
																				: activity.type === "email_sent"
																				? "Email enviado"
																				: activity.type === "email_opened"
																				? "Email abierto"
																				: activity.type === "email_clicked"
																				? "Clic en email"
																				: activity.type === "campaign_joined"
																				? "Agregado a campaña"
																				: activity.type === "campaign_paused"
																				? "Pausado en campaña"
																				: activity.type === "campaign_resumed"
																				? "Reactivado en campaña"
																				: activity.type === "campaign_completed"
																				? "Campaña completada"
																				: activity.type}
																		</Typography>
																	</TableCell>
																	<TableCell>
																		<Typography variant="body2" color="textSecondary">
																			{formatDate(activity.timestamp)}
																		</Typography>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TableContainer>

												{contact.activities.length > 5 && (
													<Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
														<Button
															size="small"
															onClick={() => setShowAllActivities(!showAllActivities)}
															startIcon={showAllActivities ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
														>
															{showAllActivities ? "Ver menos" : `Ver ${contact.activities.length - 5} más`}
														</Button>
													</Box>
												)}
											</Grid>
										)}
									</Grid>
								</TabPanel>

								{/* Tab Panel 5 - Métricas */}
								<TabPanel value={activeTab} index={5}>
									<Grid container spacing={3}>
										<Grid item xs={12}>
											{contact.metrics && (
												<>
													<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
														Métricas de Engagement
													</Typography>
													<Divider sx={{ mb: 2 }} />
													<Grid container spacing={2}>
														<Grid item xs={6} sm={3}>
															<Typography variant="body2" color="textSecondary">
																Enviados
															</Typography>
															<Typography variant="body1">{contact.metrics.sent || 0}</Typography>
														</Grid>
														<Grid item xs={6} sm={3}>
															<Typography variant="body2" color="textSecondary">
																Aperturas
															</Typography>
															<Typography variant="body1">{contact.metrics.opens || 0}</Typography>
														</Grid>
														<Grid item xs={6} sm={3}>
															<Typography variant="body2" color="textSecondary">
																Clics
															</Typography>
															<Typography variant="body1">{contact.metrics.clicks || 0}</Typography>
														</Grid>
														<Grid item xs={6} sm={3}>
															<Typography variant="body2" color="textSecondary">
																Tasa de apertura
															</Typography>
															<Typography variant="body1">{(contact.metrics.openRate || 0) * 100}%</Typography>
														</Grid>
													</Grid>
												</>
											)}
										</Grid>
									</Grid>
								</TabPanel>
							</Box>
						</Box>
					) : (
						<Box sx={{ p: 3, display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
							<Typography variant="body1" color="textSecondary" align="center">
								No se ha seleccionado ningún contacto
							</Typography>
						</Box>
					)}
				</DialogContent>

				<DialogActions
					sx={{
						px: 3,
						py: 2,
						flexShrink: 0,
					}}
				>
					<Button
						onClick={() => {
							// Limpiar todos los estados al cerrar
							setShowAllActivities(false);
							setCampaignProgress({});
							setExpandedRows(new Set());
							setProgressLoading({});
							setContact(null);
							setError(null);
							onClose();
						}}
						color="primary"
						variant="outlined"
					>
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modal de detalles de campaña */}
			<CampaignDetailModal open={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} campaignId={selectedCampaignId} />

			{/* Dialog de confirmación para reset */}
			<Dialog open={!!resetCampaignId} onClose={() => !resetLoading && setResetCampaignId(null)} maxWidth="xs" fullWidth>
				<DialogTitle>Confirmar Reset de Campaña</DialogTitle>
				<DialogContent>
					<Typography>¿Está seguro que desea resetear al contacto en esta campaña al paso inicial?</Typography>
					<Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
						Esta acción no se puede deshacer.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setResetCampaignId(null)} disabled={resetLoading}>
						Cancelar
					</Button>
					<Button
						onClick={confirmResetCampaign}
						color="primary"
						variant="contained"
						disabled={resetLoading}
						startIcon={resetLoading ? <CircularProgress size={20} /> : null}
					>
						{resetLoading ? "Reseteando..." : "Confirmar Reset"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación para acciones */}
			<Dialog open={!!actionType && !!actionCampaignId} onClose={() => !actionLoading && setActionType(null)} maxWidth="xs" fullWidth>
				<DialogTitle>
					{actionType === "pause" && "Confirmar Pausa de Contacto"}
					{actionType === "remove" && "Confirmar Eliminación de Contacto"}
					{actionType === "resume" && "Confirmar Reactivación de Contacto"}
				</DialogTitle>
				<DialogContent>
					<Typography>
						{actionType === "pause" &&
							"¿Está seguro que desea pausar este contacto en la campaña? El contacto no recibirá más emails hasta que sea reactivado."}
						{actionType === "remove" &&
							"¿Está seguro que desea eliminar este contacto de la campaña? Esta acción es permanente y el contacto no volverá a ser agregado automáticamente."}
						{actionType === "resume" &&
							"¿Está seguro que desea reactivar este contacto en la campaña? El contacto continuará desde donde se pausó."}
					</Typography>
					{actionType === "remove" && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							<Typography variant="body2">
								El contacto será agregado a las exclusiones de la campaña para evitar sincronización automática.
							</Typography>
						</Alert>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setActionType(null)} disabled={actionLoading}>
						Cancelar
					</Button>
					<Button
						onClick={confirmAction}
						color={actionType === "remove" ? "error" : "primary"}
						variant="contained"
						disabled={actionLoading}
						startIcon={actionLoading ? <CircularProgress size={20} /> : null}
						sx={
							actionType === "pause"
								? {
										bgcolor: "warning.main",
										"&:hover": { bgcolor: "warning.dark" },
								  }
								: actionType === "resume"
								? {
										bgcolor: "success.main",
										"&:hover": { bgcolor: "success.dark" },
								  }
								: {}
						}
					>
						{actionLoading
							? "Procesando..."
							: actionType === "pause"
							? "Pausar Contacto"
							: actionType === "remove"
							? "Eliminar Contacto"
							: "Reactivar Contacto"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación para acciones globales */}
			<Dialog open={!!globalActionType} onClose={() => !globalActionLoading && setGlobalActionType(null)} maxWidth="sm" fullWidth>
				<DialogTitle>{globalActionType === "pause" ? "Pausar Todas las Campañas" : "Reactivar Todas las Campañas"}</DialogTitle>
				<DialogContent>
					<Typography gutterBottom>
						{globalActionType === "pause"
							? "¿Está seguro que desea pausar este contacto en TODAS las campañas activas?"
							: "¿Está seguro que desea reactivar este contacto en TODAS las campañas pausadas?"}
					</Typography>

					{globalActionType === "pause" && (
						<Alert severity="warning" sx={{ mt: 2 }}>
							<Typography variant="body2">
								Esta acción pausará el contacto en todas las campañas activas. Las campañas serán marcadas como pausadas por acción global.
							</Typography>
						</Alert>
					)}

					{globalActionType === "resume" && (
						<Alert severity="info" sx={{ mt: 2 }}>
							<Typography variant="body2">
								Solo se reactivarán las campañas que fueron pausadas mediante una acción global. Las campañas pausadas individualmente no se
								verán afectadas.
							</Typography>
						</Alert>
					)}

					{contact && contact.campaigns && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="body2" color="textSecondary">
								Campañas que serán afectadas:{" "}
								{globalActionType === "pause"
									? contact.campaigns.filter((c: any) => c.status === "active").length
									: contact.campaigns.filter((c: any) => c.status === "paused").length}
							</Typography>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setGlobalActionType(null)} disabled={globalActionLoading}>
						Cancelar
					</Button>
					<Button
						onClick={confirmGlobalAction}
						color="primary"
						variant="contained"
						disabled={globalActionLoading}
						startIcon={globalActionLoading ? <CircularProgress size={20} /> : null}
						sx={
							globalActionType === "pause"
								? {
										bgcolor: "warning.main",
										"&:hover": { bgcolor: "warning.dark" },
								  }
								: {
										bgcolor: "success.main",
										"&:hover": { bgcolor: "success.dark" },
								  }
						}
					>
						{globalActionLoading ? "Procesando..." : globalActionType === "pause" ? "Pausar Todas" : "Reactivar Todas"}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default ContactDetailModal;
