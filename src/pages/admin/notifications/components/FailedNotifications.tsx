import React from "react";
import { useState, useEffect } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	TablePagination,
	IconButton,
	Tooltip,
	Chip,
	Box,
	Typography,
	Alert,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
} from "@mui/material";
import { Refresh, Eye } from "iconsax-react";
import dayjs from "utils/dayjs-config";
import notificationMonitoringService from "services/notificationMonitoringService";

const FailedNotifications = () => {
	const [failedNotifications, setFailedNotifications] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [total, setTotal] = useState(0);
	const [selectedNotification, setSelectedNotification] = useState<any>(null);
	const [detailsDialog, setDetailsDialog] = useState(false);
	const [retryingId, setRetryingId] = useState<string | null>(null);
	const [failureReasons, setFailureReasons] = useState<any>({});

	useEffect(() => {
		loadFailedNotifications();
	}, [page, rowsPerPage]);

	const loadFailedNotifications = async () => {
		try {
			setLoading(true);
			setError(null);
			const response = await notificationMonitoringService.getFailedNotifications({
				page: page + 1,
				limit: rowsPerPage,
			});

			if (response.success) {
				setFailedNotifications(response.data);
				setTotal(response.pagination?.total || 0);
				setFailureReasons(response.failureReasons || {});
			}
		} catch (err: any) {
			setError("Error al cargar notificaciones fallidas");
			console.error("Error:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleRetry = async (notificationId: string) => {
		try {
			setRetryingId(notificationId);
			const response = await notificationMonitoringService.retryNotification(notificationId);

			if (response.success) {
				// Recargar la lista
				await loadFailedNotifications();
			}
		} catch (err: any) {
			console.error("Error al reintentar:", err);
		} finally {
			setRetryingId(null);
		}
	};

	const handleViewDetails = async (notification: any) => {
		try {
			const response = await notificationMonitoringService.getNotificationDetails(notification._id);
			if (response.success) {
				setSelectedNotification(response.data);
				setDetailsDialog(true);
			}
		} catch (err: any) {
			console.error("Error al obtener detalles:", err);
		}
	};

	const formatDate = (date: string) => {
		try {
			const dateObj = new Date(date);
			if (isNaN(dateObj.getTime())) {
				return "Fecha no disponible";
			}
			return dayjs(dateObj).format("DD/MM/YYYY HH:mm");
		} catch {
			return "Fecha no disponible";
		}
	};

	const getTypeLabel = (type: string) => {
		const normalizedType = type?.trim().toLowerCase() || "";
		switch (normalizedType) {
			case "event":
				return "Evento";
			case "task":
				return "Tarea";
			case "movement":
				return "Movimiento";
			case "alert":
				return "Alerta";
			default:
				return "Otro";
		}
	};

	const getTypeColor = (type: string) => {
		const normalizedType = type?.trim().toLowerCase() || "";
		switch (normalizedType) {
			case "event":
				return "primary";
			case "task":
				return "warning";
			case "movement":
				return "success";
			case "alert":
				return "error";
			default:
				return "default";
		}
	};

	const handleChangePage = (_event: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return <Alert severity="error">{error}</Alert>;
	}

	return (
		<>
			{failureReasons && Object.keys(failureReasons).length > 0 && (
				<Alert severity="info" sx={{ mb: 2 }}>
					<Typography variant="subtitle2" gutterBottom>
						Resumen de razones de fallo:
					</Typography>
					{Object.entries(failureReasons).map(([reason, count]: [string, any]) => (
						<Typography key={reason} variant="body2">
							• {reason}: {count} notificaciones
						</Typography>
					))}
				</Alert>
			)}

			<TableContainer component={Paper}>
				<Table>
					<TableHead>
						<TableRow>
							<TableCell>Tipo</TableCell>
							<TableCell>Usuario</TableCell>
							<TableCell>Método</TableCell>
							<TableCell>Intentos</TableCell>
							<TableCell>Último intento</TableCell>
							<TableCell>Razón de fallo</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{failedNotifications.map((notification: any) => {
							const itemType = notification.entity?.type || notification.type || "unknown";

							return (
								<TableRow key={notification._id}>
									<TableCell>
										<Chip label={getTypeLabel(itemType)} size="small" color={getTypeColor(itemType) as any} />
									</TableCell>
									<TableCell>
										<Box>
											<Typography variant="body2">{notification.user?.name || "N/A"}</Typography>
											<Typography variant="caption" color="text.secondary">
												{notification.user?.email || "N/A"}
											</Typography>
										</Box>
									</TableCell>
									<TableCell>{notification.notification?.method || "N/A"}</TableCell>
									<TableCell>
										<Chip
											label={notification.notification?.delivery?.attempts || 0}
											size="small"
											color={notification.notification?.delivery?.attempts > 3 ? "error" : "default"}
										/>
									</TableCell>
									<TableCell>{formatDate(notification.notification?.sentAt)}</TableCell>
									<TableCell>
										<Typography variant="caption" color="error">
											{notification.notification?.delivery?.error || "Error desconocido"}
										</Typography>
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Ver detalles">
											<IconButton size="small" onClick={() => handleViewDetails(notification)}>
												<Eye size={18} />
											</IconButton>
										</Tooltip>
										<Tooltip title="Reintentar">
											<IconButton size="small" onClick={() => handleRetry(notification._id)} disabled={retryingId === notification._id}>
												{retryingId === notification._id ? <CircularProgress size={18} /> : <Refresh size={18} />}
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<TablePagination
					rowsPerPageOptions={[10, 25, 50, 100]}
					component="div"
					count={total}
					rowsPerPage={rowsPerPage}
					page={page}
					onPageChange={handleChangePage}
					onRowsPerPageChange={handleChangeRowsPerPage}
					labelRowsPerPage="Filas por página"
					labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
				/>
			</TableContainer>

			<Dialog open={detailsDialog} onClose={() => setDetailsDialog(false)} maxWidth="md" fullWidth>
				<DialogTitle>Detalles de la Notificación</DialogTitle>
				<DialogContent>
					{selectedNotification && (
						<Box sx={{ pt: 2 }}>
							<Typography variant="body2" gutterBottom>
								<strong>ID:</strong> {selectedNotification._id}
							</Typography>
							<Typography variant="body2" gutterBottom>
								<strong>Tipo:</strong> {getTypeLabel(selectedNotification.entity?.type || selectedNotification.type)}
							</Typography>
							<Typography variant="body2" gutterBottom>
								<strong>Usuario:</strong> {selectedNotification.user?.name} ({selectedNotification.user?.email})
							</Typography>
							<Typography variant="body2" gutterBottom>
								<strong>Método:</strong> {selectedNotification.notification?.method}
							</Typography>
							<Typography variant="body2" gutterBottom>
								<strong>Intentos:</strong> {selectedNotification.notification?.delivery?.attempts || 0}
							</Typography>
							<Typography variant="body2" gutterBottom>
								<strong>Error:</strong> <span style={{ color: "red" }}>{selectedNotification.notification?.delivery?.error}</span>
							</Typography>
							{selectedNotification.notification?.delivery?.errorDetails && (
								<Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
									<Typography variant="caption" component="pre" sx={{ fontFamily: "monospace" }}>
										{JSON.stringify(selectedNotification.notification.delivery.errorDetails, null, 2)}
									</Typography>
								</Box>
							)}
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailsDialog(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</>
	);
};

export default FailedNotifications;
