import {
	Dialog,
	DialogTitle,
	DialogContent,
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
} from "@mui/material";
import { CloseCircle, Link as LinkIcon } from "iconsax-react";
import { JudicialMovement } from "api/judicialMovements";

interface JudicialMovementsModalProps {
	open: boolean;
	onClose: () => void;
	movements: JudicialMovement[];
	loading: boolean;
	error?: string;
}

const JudicialMovementsModal = ({ open, onClose, movements, loading, error }: JudicialMovementsModalProps) => {
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
										<TableCell align="center">Enlace</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{movements.map((movement) => {
										const movementId = typeof movement._id === "string" ? movement._id : movement._id.$oid;
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
														{movement.notificationSettings?.notifyAt
															? formatDateTime(movement.notificationSettings.notifyAt)
															: "N/A"}
													</Typography>
												</TableCell>
												<TableCell>
													<Stack direction="row" spacing={0.5}>
														{movement.notificationSettings?.channels?.map((channel, idx) => (
															<Chip key={idx} label={channel} size="small" variant="outlined" />
														))}
													</Stack>
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
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};

export default JudicialMovementsModal;
