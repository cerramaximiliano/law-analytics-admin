import { useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	IconButton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Chip,
	Box,
	Link,
	Stack,
	Alert,
	CircularProgress,
	Tooltip,
	Button,
} from "@mui/material";
import { CloseCircle, Link as LinkIcon, Trash } from "iconsax-react";
import { JudicialMovement, JudicialMovementsService } from "api/judicialMovements";

interface JudicialMovementsModalProps {
	open: boolean;
	onClose: () => void;
	movements: JudicialMovement[];
	loading: boolean;
	error?: string;
	onMovementDeleted?: () => void;
}

const JudicialMovementsModal = ({ open, onClose, movements, loading, error, onMovementDeleted }: JudicialMovementsModalProps) => {
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [movementToDelete, setMovementToDelete] = useState<JudicialMovement | null>(null);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	// Manejar click en eliminar
	const handleDeleteClick = (movement: JudicialMovement) => {
		setMovementToDelete(movement);
		setDeleteConfirmOpen(true);
		setDeleteError(null);
	};

	// Confirmar eliminación
	const handleDeleteConfirm = async () => {
		if (!movementToDelete) return;

		const movementId = typeof movementToDelete._id === "string" ? movementToDelete._id : movementToDelete._id.$oid;

		setDeleting(true);
		setDeleteError(null);

		try {
			await JudicialMovementsService.deleteMovement(movementId);
			setDeleteConfirmOpen(false);
			setMovementToDelete(null);
			if (onMovementDeleted) {
				onMovementDeleted();
			}
		} catch (err: any) {
			setDeleteError(err.response?.data?.message || "Error al eliminar el movimiento");
		} finally {
			setDeleting(false);
		}
	};

	// Cancelar eliminación
	const handleDeleteCancel = () => {
		setDeleteConfirmOpen(false);
		setMovementToDelete(null);
		setDeleteError(null);
	};

	// Formatear fecha UTC sin conversión a hora local
	const formatDateUTC = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		const day = dateObj.getUTCDate();
		const month = dateObj.getUTCMonth() + 1;
		const year = dateObj.getUTCFullYear();
		return `${day}/${month}/${year}`;
	};

	// Formatear fecha y hora
	const formatDateTime = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleString("es-AR");
	};

	// Obtener color para el estado de notificación
	const getNotificationStatusColor = (status: string): "success" | "warning" | "error" | "default" => {
		switch (status) {
			case "sent":
				return "success";
			case "pending":
				return "warning";
			case "failed":
				return "error";
			default:
				return "default";
		}
	};

	// Obtener etiqueta para el estado de notificación
	const getNotificationStatusLabel = (status: string): string => {
		switch (status) {
			case "sent":
				return "Enviado";
			case "pending":
				return "Pendiente";
			case "failed":
				return "Fallido";
			default:
				return status;
		}
	};

	// Extraer destinatarios de las notificaciones enviadas
	const getRecipients = (movement: JudicialMovement): string[] => {
		if (!movement.notifications || movement.notifications.length === 0) {
			return [];
		}

		const recipients: string[] = [];
		movement.notifications.forEach((notification) => {
			// Extraer email del campo details: "Notificación enviada a email@domain.com"
			const match = notification.details.match(/enviada a (.+)$/);
			if (match && match[1]) {
				recipients.push(match[1]);
			}
		});

		return recipients;
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				<Box display="flex" justifyContent="space-between" alignItems="center">
					<Typography variant="h5">Notificaciones de Movimientos Judiciales</Typography>
					<IconButton onClick={onClose} size="small">
						<CloseCircle />
					</IconButton>
				</Box>
			</DialogTitle>
			<DialogContent>
				{loading ? (
					<Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : movements.length === 0 ? (
					<Alert severity="info">No se encontraron notificaciones de movimientos judiciales para esta causa</Alert>
				) : (
					<>
						<Box mb={2}>
							<Typography variant="body2" color="text.secondary">
								Total de notificaciones: <strong>{movements.length}</strong>
							</Typography>
						</Box>
						<TableContainer component={Paper}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Fecha Mov.</TableCell>
										<TableCell>Tipo</TableCell>
										<TableCell>Detalle</TableCell>
										<TableCell>Estado</TableCell>
										<TableCell>Notificado</TableCell>
										<TableCell>Canales</TableCell>
										<TableCell>Destinatarios</TableCell>
										<TableCell align="center">Enlace</TableCell>
										<TableCell align="center">Acciones</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{movements.map((movement) => {
										const movementId = typeof movement._id === "string" ? movement._id : movement._id.$oid;
										const recipients = getRecipients(movement);
										return (
											<TableRow key={movementId} hover>
												<TableCell>
													<Typography variant="body2" fontWeight="medium">
														{formatDateUTC(movement.movimiento.fecha)}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" sx={{ maxWidth: 200 }}>
														{movement.movimiento.tipo}
													</Typography>
												</TableCell>
												<TableCell>
													<Typography variant="body2" sx={{ maxWidth: 300, wordWrap: "break-word", whiteSpace: "normal" }}>
														{movement.movimiento.detalle}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip
														label={getNotificationStatusLabel(movement.notificationStatus)}
														color={getNotificationStatusColor(movement.notificationStatus)}
														size="small"
													/>
												</TableCell>
												<TableCell>
													<Typography variant="caption">
														{movement.notificationSettings?.notifyAt ? formatDateTime(movement.notificationSettings.notifyAt) : "N/A"}
													</Typography>
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5}>
														{movement.notificationSettings?.channels?.map((channel, idx) => (
															<Chip key={idx} label={channel} size="small" variant="outlined" />
														))}
													</Stack>
												</TableCell>
												<TableCell>
													{recipients.length > 0 ? (
														<Stack spacing={0.5}>
															{recipients.map((recipient, idx) => (
																<Typography key={idx} variant="caption" sx={{ wordBreak: "break-all" }}>
																	{recipient}
																</Typography>
															))}
														</Stack>
													) : movement.notificationStatus === "pending" ? (
														<Typography variant="caption" color="text.secondary" fontStyle="italic">
															Pendiente de envío
														</Typography>
													) : (
														<Typography variant="caption" color="text.secondary">
															N/A
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													{movement.movimiento.url ? (
														<Link href={movement.movimiento.url} target="_blank" rel="noopener noreferrer">
															<IconButton size="small" color="primary">
																<LinkIcon size={18} />
															</IconButton>
														</Link>
													) : (
														<Typography variant="caption" color="text.secondary">
															N/A
														</Typography>
													)}
												</TableCell>
												<TableCell align="center">
													<Tooltip title="Eliminar movimiento">
														<IconButton size="small" color="error" onClick={() => handleDeleteClick(movement)}>
															<Trash size={18} />
														</IconButton>
													</Tooltip>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}
			</DialogContent>

			{/* Diálogo de confirmación de eliminación */}
			<Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} maxWidth="xs" fullWidth>
				<DialogTitle>Confirmar eliminación</DialogTitle>
				<DialogContent>
					<Typography>¿Está seguro que desea eliminar este movimiento judicial?</Typography>
					{movementToDelete && (
						<Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
							<Typography variant="body2">
								<strong>Tipo:</strong> {movementToDelete.movimiento.tipo}
							</Typography>
							<Typography variant="body2">
								<strong>Fecha:</strong> {formatDateUTC(movementToDelete.movimiento.fecha)}
							</Typography>
							<Typography variant="body2" sx={{ mt: 1 }}>
								<strong>Detalle:</strong> {movementToDelete.movimiento.detalle.substring(0, 100)}
								{movementToDelete.movimiento.detalle.length > 100 && "..."}
							</Typography>
						</Box>
					)}
					{deleteError && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{deleteError}
						</Alert>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleDeleteCancel} disabled={deleting}>
						Cancelar
					</Button>
					<Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
						{deleting ? <CircularProgress size={20} /> : "Eliminar"}
					</Button>
				</DialogActions>
			</Dialog>
		</Dialog>
	);
};

export default JudicialMovementsModal;
