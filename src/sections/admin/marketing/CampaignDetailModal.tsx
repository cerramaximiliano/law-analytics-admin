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
	IconButton,
	Alert,
	Table,
	TableBody,
	TableCell,
	TableRow,
	Skeleton,
} from "@mui/material";
import { CloseCircle } from "iconsax-react";
import { CampaignService } from "store/reducers/campaign";
import { Campaign as ImportedCampaign } from "types/campaign";

interface CampaignDetailModalProps {
	open: boolean;
	onClose: () => void;
	campaignId: string | null;
}

interface CampaignDetail extends ImportedCampaign {
	_id: string; // Override to make _id required
	segmentInfo?: {
		_id: string;
		name: string;
		type: string;
		estimatedCount: number;
	};
}

const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({ open, onClose, campaignId }) => {
	const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open && campaignId) {
			fetchCampaignDetails(campaignId);
		} else {
		}
	}, [open, campaignId]);

	const fetchCampaignDetails = async (id: string) => {
		try {
			setLoading(true);
			setError(null);

			const campaign = await CampaignService.getCampaignById(id);

			// Ensure campaign has an _id before setting it
			if (campaign && campaign._id) {
				setCampaign(campaign as CampaignDetail);
			} else {
				setError("La campaña no tiene un ID válido");
			}
		} catch (err: any) {
			if (err.response?.status === 401) {
				setError("Sesión expirada. Por favor, inicie sesión nuevamente.");
			} else if (err.response?.status === 404) {
				setError("Campaña no encontrada");
			} else {
				setError(err?.response?.data?.message || err?.message || "No se pudo cargar la información de la campaña");
			}
		} finally {
			setLoading(false);
		}
	};

	// Format date helper
	const formatDate = (dateString?: string | Date | null) => {
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
			case "paused":
				return "warning";
			case "completed":
				return "info";
			case "stopped":
				return "error";
			default:
				return "default";
		}
	};

	// Get status label
	const getStatusLabel = (status?: string) => {
		switch (status) {
			case "active":
				return "Activa";
			case "paused":
				return "Pausada";
			case "completed":
				return "Completada";
			case "stopped":
				return "Detenida";
			default:
				return status || "Desconocido";
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
						<Typography variant="h5">Detalles de la Campaña</Typography>
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
					<Grid container spacing={3}>
						{/* Información básica skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Grid container spacing={2}>
								{[1, 2, 3, 4, 5, 6].map((item) => (
									<Grid item xs={12} sm={6} key={item}>
										<Skeleton variant="text" width={100} height={24} />
										<Skeleton variant="text" width={150} height={32} />
									</Grid>
								))}
							</Grid>
						</Grid>

						{/* Descripción skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Skeleton variant="text" width="100%" height={60} />
						</Grid>

						{/* Audiencia skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Grid container spacing={2}>
								{[1, 2, 3].map((item) => (
									<Grid item xs={12} sm={6} key={item}>
										<Skeleton variant="text" width={100} height={24} />
										<Skeleton variant="text" width={150} height={32} />
									</Grid>
								))}
							</Grid>
						</Grid>

						{/* Métricas skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Grid container spacing={2}>
								{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
									<Grid item xs={6} sm={3} key={item}>
										<Skeleton variant="text" width={100} height={24} />
										<Skeleton variant="text" width={80} height={32} />
									</Grid>
								))}
							</Grid>
						</Grid>

						{/* Configuración skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Table size="small">
								<TableBody>
									{[1, 2, 3, 4, 5, 6, 7].map((item) => (
										<TableRow key={item}>
											<TableCell width="30%">
												<Skeleton variant="text" width={140} height={24} />
											</TableCell>
											<TableCell>
												<Skeleton variant="text" width={160} height={24} />
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Grid>

						{/* Fechas skeleton */}
						<Grid item xs={12}>
							<Skeleton variant="text" width={200} height={40} />
							<Divider sx={{ mb: 2, mt: 1 }} />
							<Grid container spacing={2}>
								{[1, 2].map((item) => (
									<Grid item xs={12} sm={6} key={item}>
										<Skeleton variant="text" width={100} height={24} />
										<Skeleton variant="text" width={150} height={32} />
									</Grid>
								))}
							</Grid>
						</Grid>
					</Grid>
				) : error ? (
					<Alert severity="error" sx={{ my: 2 }}>
						{"Error al cargar la campaña. Intente nuevamente más tarde.	"}
					</Alert>
				) : campaign ? (
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
										Nombre
									</Typography>
									<Typography variant="body1">{campaign.name}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Estado
									</Typography>
									<Chip label={getStatusLabel(campaign.status)} color={getStatusColor(campaign.status) as any} size="small" />
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										ID
									</Typography>
									<Typography variant="body1">{campaign._id}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Tipo
									</Typography>
									<Typography variant="body1">{campaign.type === "sequence" ? "Secuencia" : campaign.type}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Categoría
									</Typography>
									<Typography variant="body1">{campaign.category}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Permanente
									</Typography>
									<Typography variant="body1">{campaign.isPermanent ? "Sí" : "No"}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Fecha Inicio
									</Typography>
									<Typography variant="body1">{formatDate(campaign.startDate)}</Typography>
								</Grid>
								{!campaign.isPermanent && (
									<Grid item xs={12} sm={6}>
										<Typography variant="body2" color="textSecondary">
											Fecha Fin
										</Typography>
										<Typography variant="body1">{formatDate(campaign.endDate)}</Typography>
									</Grid>
								)}
							</Grid>
						</Grid>

						{/* Descripción */}
						{campaign.description && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Descripción
								</Typography>
								<Divider sx={{ mb: 2 }} />
								<Typography variant="body1">{campaign.description}</Typography>
							</Grid>
						)}

						{/* Etiquetas */}
						{campaign.tags && campaign.tags.length > 0 && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Etiquetas
								</Typography>
								<Divider sx={{ mb: 2 }} />

								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
									{campaign.tags.map((tag, index) => (
										<Chip key={index} label={tag} size="small" color="primary" variant="outlined" />
									))}
								</Box>
							</Grid>
						)}

						{/* Audiencia */}
						{campaign.segmentInfo && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Audiencia
								</Typography>
								<Divider sx={{ mb: 2 }} />

								<Grid container spacing={2}>
									<Grid item xs={12} sm={6}>
										<Typography variant="body2" color="textSecondary">
											Segmento
										</Typography>
										<Typography variant="body1">{campaign.segmentInfo.name}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="body2" color="textSecondary">
											Tipo de Segmento
										</Typography>
										<Typography variant="body1">{campaign.segmentInfo.type === "dynamic" ? "Dinámico" : "Estático"}</Typography>
									</Grid>
									<Grid item xs={12} sm={6}>
										<Typography variant="body2" color="textSecondary">
											Número estimado de contactos
										</Typography>
										<Typography variant="body1">{campaign.segmentInfo.estimatedCount.toLocaleString()}</Typography>
									</Grid>
								</Grid>
							</Grid>
						)}

						{/* Métricas */}
						{campaign.metrics && (
							<Grid item xs={12}>
								<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
									Métricas
								</Typography>
								<Divider sx={{ mb: 2 }} />

								<Grid container spacing={2}>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Total Contactos
										</Typography>
										<Typography variant="body1">{campaign.metrics.totalContacts}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Contactos Activos
										</Typography>
										<Typography variant="body1">{campaign.metrics.activeContacts}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Contactos Completados
										</Typography>
										<Typography variant="body1">{campaign.metrics.completedContacts}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Total Emails
										</Typography>
										<Typography variant="body1">{campaign.metrics.emailCount}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Emails Enviados
										</Typography>
										<Typography variant="body1">{campaign.metrics.totalEmailsSent}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Aperturas
										</Typography>
										<Typography variant="body1">{campaign.metrics.opens}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Clics
										</Typography>
										<Typography variant="body1">{campaign.metrics.clicks}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Rebotes
										</Typography>
										<Typography variant="body1">{campaign.metrics.bounces}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Quejas
										</Typography>
										<Typography variant="body1">{campaign.metrics.complaints}</Typography>
									</Grid>
									<Grid item xs={6} sm={3}>
										<Typography variant="body2" color="textSecondary">
											Cancelaciones
										</Typography>
										<Typography variant="body1">{campaign.metrics.unsubscribes}</Typography>
									</Grid>
								</Grid>
							</Grid>
						)}

						{/* Configuración */}
						<Grid item xs={12}>
							<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
								Configuración
							</Typography>
							<Divider sx={{ mb: 2 }} />

							<Table size="small">
								<TableBody>
									<TableRow>
										<TableCell width="30%">
											<Typography variant="body2" color="textSecondary">
												Zona Horaria
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.timezone}</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Tasa de envío
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.throttleRate} emails/hora</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Seguimiento de aperturas
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.tracking.opens ? "Activado" : "Desactivado"}</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Seguimiento de clics
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.tracking.clicks ? "Activado" : "Desactivado"}</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Google Analytics
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">
												{campaign.settings.tracking.googleAnalytics.enabled ? "Activado" : "Desactivado"}
											</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Máximo de reintentos
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.retryConfig.maxRetries}</Typography>
										</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>
											<Typography variant="body2" color="textSecondary">
												Intervalo de reintento
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="body1">{campaign.settings.retryConfig.retryInterval} minutos</Typography>
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
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
									<Typography variant="body1">{formatDate(campaign.createdAt)}</Typography>
								</Grid>
								<Grid item xs={12} sm={6}>
									<Typography variant="body2" color="textSecondary">
										Última actualización
									</Typography>
									<Typography variant="body1">{formatDate(campaign.updatedAt)}</Typography>
								</Grid>
							</Grid>
						</Grid>
					</Grid>
				) : (
					<Typography variant="body1" color="textSecondary" align="center" sx={{ py: 3 }}>
						No se ha seleccionado ninguna campaña
					</Typography>
				)}
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} color="primary" variant="outlined">
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CampaignDetailModal;
