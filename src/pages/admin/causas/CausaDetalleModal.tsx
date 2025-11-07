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
	Chip,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TablePagination,
	Alert,
	Divider,
	Stack,
	Tabs,
	Tab,
	Link,
	IconButton,
	Tooltip,
	TextField,
	Dialog as ConfirmDialog,
	DialogTitle as ConfirmDialogTitle,
	DialogContent as ConfirmDialogContent,
	DialogActions as ConfirmDialogActions,
	Checkbox,
	FormControlLabel,
	CircularProgress,
	Switch,
} from "@mui/material";
import { Causa } from "api/causasPjn";
import { CausasPjnService } from "api/causasPjn";
import CausasService from "api/causas";
import { CausasMEVService, CausaMEV } from "api/causasMEV";
import { JudicialMovementsService, JudicialMovement } from "api/judicialMovements";
import {
	CloseCircle,
	Link as LinkIcon,
	Trash,
	Edit,
	Save2,
	CloseSquare,
	TickCircle,
	AddCircle,
	Send2,
	Eye,
	ArrowDown2,
	ArrowUp2,
} from "iconsax-react";
import { useSnackbar } from "notistack";

interface CausaDetalleModalProps {
	open: boolean;
	onClose: () => void;
	causa: Causa | CausaMEV | null;
	onCausaUpdated?: () => void;
	apiService?: "pjn" | "workers" | "mev"; // Especifica qué servicio usar
}

// Mapeo de fueros a nombres legibles
const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seguridad Social",
	CNT: "Trabajo",
};

// Mapeo de colores por fuero
const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
};

// Función helper para normalizar fuero a código
const normalizeFuero = (fuero: string | undefined): "CIV" | "COM" | "CSS" | "CNT" => {
	if (!fuero) return "CIV";

	// Si ya es un código válido, devolverlo
	if (["CIV", "COM", "CSS", "CNT"].includes(fuero)) {
		return fuero as "CIV" | "COM" | "CSS" | "CNT";
	}

	// Mapear nombres legibles a códigos
	const mapping: Record<string, "CIV" | "COM" | "CSS" | "CNT"> = {
		Civil: "CIV",
		Comercial: "COM",
		"Seguridad Social": "CSS",
		Trabajo: "CNT",
	};

	return mapping[fuero] || "CIV";
};

const CausaDetalleModal = ({ open, onClose, causa, onCausaUpdated, apiService = "pjn" }: CausaDetalleModalProps) => {
	const { enqueueSnackbar } = useSnackbar();

	// Seleccionar el servicio apropiado
	const ServiceAPI = apiService === "pjn" ? CausasPjnService : apiService === "mev" ? CausasMEVService : CausasService;

	// Estado para el tab activo
	const [activeTab, setActiveTab] = useState(0);

	// Estados para movimientos paginados
	const [movimientosPage, setMovimientosPage] = useState(0);
	const [movimientosRowsPerPage, setMovimientosRowsPerPage] = useState(10);

	// Estados para edición
	const [isEditing, setIsEditing] = useState(false);
	const [editedCausa, setEditedCausa] = useState<Partial<Causa>>({});
	const [isSaving, setIsSaving] = useState(false);

	// Estados para confirmación de eliminación de movimiento
	const [deleteMovConfirm, setDeleteMovConfirm] = useState<{ open: boolean; index: number | null }>({
		open: false,
		index: null,
	});
	const [isDeleting, setIsDeleting] = useState(false);

	// Estados para la lista de movimientos (para actualizar después de eliminar)
	const [currentMovimientos, setCurrentMovimientos] = useState<any[]>([]);

	// Estados para agregar movimiento
	const [addMovDialogOpen, setAddMovDialogOpen] = useState(false);
	const [newMovimiento, setNewMovimiento] = useState({
		fecha: "",
		tipo: "",
		detalle: "",
		url: "",
	});
	const [sendNotification, setSendNotification] = useState(false);
	const [isAddingMovimiento, setIsAddingMovimiento] = useState(false);

	// Estado para envío de notificación de movimiento específico
	const [notifyingMovIndex, setNotifyingMovIndex] = useState<number | null>(null);

	// Estados para notificaciones judiciales
	const [judicialMovements, setJudicialMovements] = useState<JudicialMovement[]>([]);
	const [loadingJudicialMovements, setLoadingJudicialMovements] = useState(false);
	const [selectedMovNotifications, setSelectedMovNotifications] = useState<JudicialMovement[]>([]);
	const [notificationsDialogOpen, setNotificationsDialogOpen] = useState(false);

	// Estados para modal de confirmación de envío de notificaciones
	const [sendNotifDialogOpen, setSendNotifDialogOpen] = useState(false);
	const [notificationUsers, setNotificationUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(false);
	const [pendingMovimientoIndex, setPendingMovimientoIndex] = useState<number | null>(null);

	// Estados para historial de actualizaciones
	const [updateHistory, setUpdateHistory] = useState<any[]>([]);
	const [clearingHistory, setClearingHistory] = useState(false);
	const [deletingHistoryEntry, setDeletingHistoryEntry] = useState<number | null>(null);
	const [historyPage, setHistoryPage] = useState(0);
	const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);
	const [historyOrderBy, setHistoryOrderBy] = useState<"asc" | "desc">("desc");

	// Resetear estados cuando se abre el modal
	useEffect(() => {
		if (open && causa) {
			setActiveTab(0);
			setMovimientosPage(0);
			setHistoryPage(0);
			setIsEditing(false);
			setEditedCausa({});
			// MEV usa 'movimiento' (singular), otros servicios usan 'movimientos' (plural)
			const movements = apiService === "mev"
				? (causa as any).movimiento || []
				: (causa as any).movimientos || [];
			setCurrentMovimientos(movements);
			const history = (causa as any).updateHistory || [];
			console.log("UpdateHistory loaded:", history);
			setUpdateHistory(history);
			// Cargar notificaciones judiciales
			loadJudicialMovements();
		}
	}, [open, causa, apiService]);

	// Función para cargar notificaciones judiciales
	const loadJudicialMovements = async () => {
		if (!causa) return;

		try {
			setLoadingJudicialMovements(true);
			const expedienteId = getId(causa._id);
			const response = await JudicialMovementsService.getMovementsByExpedienteId(expedienteId);

			if (response.success) {
				setJudicialMovements(response.data);
			}
		} catch (error) {
			console.error("Error al cargar notificaciones judiciales:", error);
		} finally {
			setLoadingJudicialMovements(false);
		}
	};

	if (!causa) return null;

	// Obtener ID como string
	const getId = (id: string | { $oid: string }): string => {
		return typeof id === "string" ? id : id.$oid;
	};

	// Formatear fecha completa (con hora)
	const formatDate = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		return new Date(dateStr).toLocaleDateString("es-AR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Formatear solo fecha (sin hora) - para tabla de movimientos
	// Sin conversión de zona horaria - muestra exactamente la fecha guardada
	const formatDateOnly = (date: { $date: string } | string | undefined): string => {
		if (!date) return "N/A";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);

		// Usar métodos UTC para evitar conversión de zona horaria
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const year = dateObj.getUTCFullYear();

		return `${day}/${month}/${year}`;
	};

	// Convertir fecha para input datetime-local
	const toDateTimeLocal = (date: { $date: string } | string | undefined): string => {
		if (!date) return "";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		const offset = dateObj.getTimezoneOffset();
		const localDate = new Date(dateObj.getTime() - offset * 60 * 1000);
		return localDate.toISOString().slice(0, 16);
	};

	// Convertir fecha para input date (solo fecha, sin hora)
	const toDateLocal = (date: { $date: string } | string | undefined): string => {
		if (!date) return "";
		const dateStr = typeof date === "string" ? date : date.$date;
		const dateObj = new Date(dateStr);
		const year = dateObj.getUTCFullYear();
		const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
		const day = String(dateObj.getUTCDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	// Función para comparar fechas UTC (solo fecha, sin hora)
	const compareDatesUTC = (date1: { $date: string } | string | undefined, date2: { $date: string } | string | undefined): boolean => {
		if (!date1 || !date2) return false;
		const dateStr1 = typeof date1 === "string" ? date1 : date1.$date;
		const dateStr2 = typeof date2 === "string" ? date2 : date2.$date;
		const dateObj1 = new Date(dateStr1);
		const dateObj2 = new Date(dateStr2);

		return (
			dateObj1.getUTCDate() === dateObj2.getUTCDate() &&
			dateObj1.getUTCMonth() === dateObj2.getUTCMonth() &&
			dateObj1.getUTCFullYear() === dateObj2.getUTCFullYear()
		);
	};

	// Encontrar notificaciones relacionadas a un movimiento
	const getNotificationsForMovement = (mov: any): JudicialMovement[] => {
		return judicialMovements.filter((jm) => {
			// Comparar fecha (solo fecha, sin hora)
			const datesMatch = compareDatesUTC(mov.fecha || mov.createdAt, jm.movimiento.fecha);

			// Comparar tipo
			const tipoMatch = mov.tipo?.toLowerCase().trim() === jm.movimiento.tipo?.toLowerCase().trim();

			// Comparar detalle (parcialmente, por si hay pequeñas diferencias)
			const detalleMatch = (mov.detalle || mov.descripcion || mov.texto || "")
				.toLowerCase()
				.includes(jm.movimiento.detalle?.toLowerCase().substring(0, 50) || "");

			return datesMatch && tipoMatch && detalleMatch;
		});
	};

	// Abrir dialog de notificaciones para un movimiento
	const handleViewNotifications = (mov: any) => {
		const notifications = getNotificationsForMovement(mov);
		setSelectedMovNotifications(notifications);
		setNotificationsDialogOpen(true);
	};

	// Obtener movimientos paginados
	const movimientos = currentMovimientos;
	const paginatedMovimientos = movimientos.slice(
		movimientosPage * movimientosRowsPerPage,
		movimientosPage * movimientosRowsPerPage + movimientosRowsPerPage,
	);

	const handleChangeMovimientosPage = (_event: unknown, newPage: number) => {
		setMovimientosPage(newPage);
	};

	const handleChangeMovimientosRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setMovimientosRowsPerPage(parseInt(event.target.value, 10));
		setMovimientosPage(0);
	};

	// Paginación y ordenamiento para historial de actualizaciones
	const sortedHistory = [...updateHistory].sort((a, b) => {
		const dateA = new Date(a.timestamp || a.date || a.createdAt || 0).getTime();
		const dateB = new Date(b.timestamp || b.date || b.createdAt || 0).getTime();
		return historyOrderBy === "desc" ? dateB - dateA : dateA - dateB;
	});

	const paginatedHistory = sortedHistory.slice(historyPage * historyRowsPerPage, historyPage * historyRowsPerPage + historyRowsPerPage);

	const handleChangeHistoryPage = (_event: unknown, newPage: number) => {
		setHistoryPage(newPage);
	};

	const handleChangeHistoryRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
		setHistoryRowsPerPage(parseInt(event.target.value, 10));
		setHistoryPage(0);
	};

	const handleToggleHistoryOrder = () => {
		setHistoryOrderBy((prev) => (prev === "desc" ? "asc" : "desc"));
		setHistoryPage(0);
	};

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Activar modo edición
	const handleEditClick = () => {
		setEditedCausa({
			caratula: causa.caratula,
			juzgado: causa.juzgado,
			objeto: causa.objeto,
			lastUpdate: causa.lastUpdate,
			fechaUltimoMovimiento: causa.fechaUltimoMovimiento,
			update: causa.update,
		});
		setIsEditing(true);
	};

	// Cancelar edición
	const handleCancelEdit = () => {
		setIsEditing(false);
		setEditedCausa({});
	};

	// Guardar cambios
	const handleSaveEdit = async () => {
		try {
			setIsSaving(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			// Preparar datos para enviar, convirtiendo fechas al formato ISO UTC
			const dataToUpdate = { ...editedCausa };

			// Convertir lastUpdate si fue editado
			if (dataToUpdate.lastUpdate) {
				const dateStr = typeof dataToUpdate.lastUpdate === "string" ? dataToUpdate.lastUpdate : dataToUpdate.lastUpdate.$date;
				dataToUpdate.lastUpdate = new Date(dateStr).toISOString();
			}

			// Convertir fechaUltimoMovimiento si fue editado (formato YYYY-MM-DD a ISO UTC con hora 00:00:00)
			if (dataToUpdate.fechaUltimoMovimiento) {
				// Si viene en formato YYYY-MM-DD (del input date), agregar la hora UTC
				const dateValue = dataToUpdate.fechaUltimoMovimiento;
				const dateStr = typeof dateValue === "string" ? dateValue : dateValue.$date;
				if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
					// Formato YYYY-MM-DD: agregar hora 00:00:00 UTC
					dataToUpdate.fechaUltimoMovimiento = `${dateStr}T00:00:00.000Z`;
				} else {
					// Ya viene con hora, convertir a ISO
					dataToUpdate.fechaUltimoMovimiento = new Date(dateStr).toISOString();
				}
			}

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).updateCausa(causaId, dataToUpdate as Partial<CausaMEV>)
				: await (ServiceAPI as typeof CausasPjnService).updateCausa(fuero, causaId, dataToUpdate as Partial<Causa>);

			if (response.success) {
				enqueueSnackbar("Causa actualizada correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				setIsEditing(false);
				setEditedCausa({});
				if (onCausaUpdated) {
					onCausaUpdated();
				}
				onClose();
			}
		} catch (error) {
			enqueueSnackbar("Error al actualizar la causa", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsSaving(false);
		}
	};

	// Confirmar eliminación de movimiento
	const handleDeleteMovClick = (index: number) => {
		setDeleteMovConfirm({ open: true, index });
	};

	// Cancelar eliminación
	const handleCancelDelete = () => {
		setDeleteMovConfirm({ open: false, index: null });
	};

	// Eliminar movimiento
	const handleConfirmDelete = async () => {
		if (deleteMovConfirm.index === null) return;

		try {
			setIsDeleting(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).deleteMovimiento(causaId, deleteMovConfirm.index)
				: await (ServiceAPI as typeof CausasPjnService).deleteMovimiento(fuero, causaId, deleteMovConfirm.index);

			if (response.success) {
				enqueueSnackbar("Movimiento eliminado correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});

				// Actualizar la lista de movimientos localmente
				const newMovimientos = [...currentMovimientos];
				newMovimientos.splice(deleteMovConfirm.index, 1);
				setCurrentMovimientos(newMovimientos);

				// Actualizar updateHistory si viene en la respuesta
				if (response.data?.updateHistory) {
					setUpdateHistory(response.data.updateHistory);
				}

				// Resetear página si es necesario
				if (movimientosPage > 0 && newMovimientos.length <= movimientosPage * movimientosRowsPerPage) {
					setMovimientosPage(movimientosPage - 1);
				}

				setDeleteMovConfirm({ open: false, index: null });
				if (onCausaUpdated) {
					onCausaUpdated();
				}
			}
		} catch (error) {
			enqueueSnackbar("Error al eliminar el movimiento", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsDeleting(false);
		}
	};

	// Abrir diálogo para agregar movimiento
	const handleOpenAddMovDialog = () => {
		setNewMovimiento({
			fecha: "",
			tipo: "",
			detalle: "",
			url: "",
		});
		setSendNotification(false);
		setAddMovDialogOpen(true);
	};

	// Cerrar diálogo de agregar movimiento
	const handleCloseAddMovDialog = () => {
		setAddMovDialogOpen(false);
		setNewMovimiento({
			fecha: "",
			tipo: "",
			detalle: "",
			url: "",
		});
		setSendNotification(false);
	};

	// Agregar movimiento
	const handleAddMovimiento = async () => {
		if (!newMovimiento.fecha || !newMovimiento.tipo || !newMovimiento.detalle) {
			enqueueSnackbar("Fecha, tipo y detalle son campos obligatorios", {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setIsAddingMovimiento(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			// Convertir fecha a formato ISO UTC
			const fechaISO = new Date(newMovimiento.fecha).toISOString();

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).addMovimiento(causaId, {
					fecha: fechaISO,
					tipo: newMovimiento.tipo,
					detalle: newMovimiento.detalle,
					url: newMovimiento.url || null,
					sendNotification,
				})
				: await (ServiceAPI as typeof CausasPjnService).addMovimiento(fuero, causaId, {
					fecha: fechaISO,
					tipo: newMovimiento.tipo,
					detalle: newMovimiento.detalle,
					url: newMovimiento.url || null,
					sendNotification,
				});

			if (response.success) {
				let mensaje = "Movimiento agregado correctamente";
				if (sendNotification) {
					const usersNotified = response.data.usersNotified || 0;
					if (response.data.notificationSent && usersNotified > 0) {
						mensaje += ` y notificación enviada a ${usersNotified} usuario${usersNotified > 1 ? "s" : ""}`;
					} else {
						mensaje += " (la notificación falló o no hay usuarios habilitados)";
					}
				}

				enqueueSnackbar(mensaje, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});

				// Actualizar la lista de movimientos localmente
				const movimientoAgregado = response.data.nuevoMovimiento;

				// Insertar el movimiento en la posición correcta (orden descendente por fecha)
				const fechaNuevo = new Date(movimientoAgregado.fecha);
				let insertIndex = currentMovimientos.length; // Por defecto, al final

				for (let i = 0; i < currentMovimientos.length; i++) {
					const fechaActual = new Date(currentMovimientos[i].fecha);
					if (fechaNuevo > fechaActual) {
						insertIndex = i;
						break;
					}
				}

				const newMovimientos = [...currentMovimientos];
				newMovimientos.splice(insertIndex, 0, movimientoAgregado);
				setCurrentMovimientos(newMovimientos);

				// Actualizar updateHistory si viene en la respuesta
				if (response.data?.updateHistory) {
					setUpdateHistory(response.data.updateHistory);
				}

				handleCloseAddMovDialog();
				if (onCausaUpdated) {
					onCausaUpdated();
				}
			}
		} catch (error) {
			enqueueSnackbar("Error al agregar el movimiento", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setIsAddingMovimiento(false);
		}
	};

	// Enviar notificación de movimiento específico
	// Abrir modal de confirmación de notificación
	const handleNotifyMovimiento = async (movimientoIndex: number) => {
		try {
			setLoadingUsers(true);
			setPendingMovimientoIndex(movimientoIndex);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			// Obtener usuarios habilitados para notificación
			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).getNotificationUsers(causaId)
				: await (ServiceAPI as typeof CausasPjnService).getNotificationUsers(fuero, causaId);

			if (response.success && response.data.length > 0) {
				setNotificationUsers(response.data);
				// Seleccionar todos los usuarios por defecto
				setSelectedUsers(response.data.map((u: any) => u.id));
				setSendNotifDialogOpen(true);
			} else {
				enqueueSnackbar("No hay usuarios habilitados para notificar", {
					variant: "warning",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
			}
		} catch (error) {
			enqueueSnackbar("Error al obtener usuarios para notificación", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setLoadingUsers(false);
		}
	};

	// Confirmar y enviar notificación
	const handleConfirmSendNotification = async () => {
		if (pendingMovimientoIndex === null) return;
		if (selectedUsers.length === 0) {
			enqueueSnackbar("Debe seleccionar al menos un usuario", {
				variant: "warning",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			return;
		}

		try {
			setNotifyingMovIndex(pendingMovimientoIndex);
			setSendNotifDialogOpen(false);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).notifyMovimiento(causaId, pendingMovimientoIndex)
				: await (ServiceAPI as typeof CausasPjnService).notifyMovimiento(fuero, causaId, pendingMovimientoIndex);

			if (response.success) {
				const usersNotified = response.data?.usersNotified || 0;
				enqueueSnackbar(
					usersNotified > 0
						? `Notificación enviada a ${usersNotified} usuario${usersNotified > 1 ? "s" : ""}`
						: "No hay usuarios habilitados para notificar",
					{
						variant: usersNotified > 0 ? "success" : "warning",
						anchorOrigin: { vertical: "bottom", horizontal: "right" },
					},
				);
			}
		} catch (error) {
			enqueueSnackbar("Error al enviar la notificación", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setNotifyingMovIndex(null);
			setPendingMovimientoIndex(null);
			setSelectedUsers([]);
			setNotificationUsers([]);
		}
	};

	// Cancelar envío de notificación
	const handleCancelSendNotification = () => {
		setSendNotifDialogOpen(false);
		setPendingMovimientoIndex(null);
		setSelectedUsers([]);
		setNotificationUsers([]);
	};

	// Toggle selección de usuario
	const handleToggleUser = (userId: string) => {
		setSelectedUsers((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
	};

	// Limpiar todo el historial de actualizaciones
	const handleClearUpdateHistory = async () => {
		if (!window.confirm("¿Está seguro de que desea eliminar todo el historial de actualizaciones?")) {
			return;
		}

		try {
			setClearingHistory(true);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).clearUpdateHistory(causaId)
				: await (ServiceAPI as typeof CausasPjnService).clearUpdateHistory(fuero, causaId);

			if (response.success) {
				setUpdateHistory([]);
				setHistoryPage(0);
				enqueueSnackbar(response.message, {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				// Recargar la causa para actualizar los datos
				if (onCausaUpdated) onCausaUpdated();
			}
		} catch (error) {
			enqueueSnackbar("Error al limpiar el historial", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setClearingHistory(false);
		}
	};

	// Eliminar una entrada específica del historial
	const handleDeleteHistoryEntry = async (entryIndex: number) => {
		try {
			setDeletingHistoryEntry(entryIndex);
			const causaId = getId(causa._id);
			const fuero = normalizeFuero(causa.fuero);

			const response = apiService === "mev"
				? await (ServiceAPI as typeof CausasMEVService).deleteUpdateHistoryEntry(causaId, entryIndex)
				: await (ServiceAPI as typeof CausasPjnService).deleteUpdateHistoryEntry(fuero, causaId, entryIndex);

			if (response.success) {
				// Actualizar el estado local eliminando la entrada
				const newHistory = updateHistory.filter((_, index) => index !== entryIndex);
				setUpdateHistory(newHistory);

				// Ajustar la página si es necesario
				if (historyPage > 0 && newHistory.length <= historyPage * historyRowsPerPage) {
					setHistoryPage(historyPage - 1);
				}

				enqueueSnackbar("Entrada eliminada correctamente", {
					variant: "success",
					anchorOrigin: { vertical: "bottom", horizontal: "right" },
				});
				// Recargar la causa para actualizar los datos
				if (onCausaUpdated) onCausaUpdated();
			}
		} catch (error) {
			enqueueSnackbar("Error al eliminar la entrada", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
			console.error(error);
		} finally {
			setDeletingHistoryEntry(null);
		}
	};

	return (
		<>
			<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
				<DialogTitle>
					<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
						<Box sx={{ flex: 1 }}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
								<Typography variant="h5">
									Expediente: {causa.number}/{causa.year}
								</Typography>
								<Chip
									label={FUERO_LABELS[normalizeFuero(causa.fuero)]}
									color={FUERO_COLORS[normalizeFuero(causa.fuero)]}
									size="small"
									sx={{
										...(normalizeFuero(causa.fuero) === "CSS" && {
											color: "rgba(0, 0, 0, 0.87)",
										}),
									}}
								/>
							</Stack>
							<Typography variant="body2" color="textSecondary">
								{causa.caratula || "Sin carátula"}
							</Typography>
						</Box>
						{!isEditing && activeTab === 0 && (
							<Tooltip title="Editar causa">
								<IconButton onClick={handleEditClick} color="primary" size="small">
									<Edit size={20} />
								</IconButton>
							</Tooltip>
						)}
					</Stack>
				</DialogTitle>

				<Box sx={{ borderBottom: 1, borderColor: "divider" }}>
					<Tabs value={activeTab} onChange={handleTabChange} aria-label="causa detail tabs">
						<Tab label="Información General" />
						<Tab label={`Movimientos (${currentMovimientos.length})`} />
						<Tab label={`Historial (${updateHistory.length})`} />
					</Tabs>
				</Box>

				<DialogContent dividers sx={{ height: "500px", overflowY: "auto" }}>
					{/* Tab Panel 0: Información General */}
					{activeTab === 0 && (
						<Grid container spacing={2}>
							{/* Información principal - Vista compacta */}
							<Grid item xs={12}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Información Principal
								</Typography>
								<Divider sx={{ mb: 1.5 }} />
							</Grid>

							<Grid item xs={12} sm={6} md={3}>
								<Typography variant="caption" color="textSecondary">
									ID
								</Typography>
								<Typography variant="body2" sx={{ wordBreak: "break-all" }}>
									{getId(causa._id)}
								</Typography>
							</Grid>

							<Grid item xs={6} sm={3} md={2}>
								<Typography variant="caption" color="textSecondary">
									Número
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{causa.number}
								</Typography>
							</Grid>

							<Grid item xs={6} sm={3} md={2}>
								<Typography variant="caption" color="textSecondary">
									Año
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{causa.year}
								</Typography>
							</Grid>

							<Grid item xs={12} sm={6} md={5}>
								<Typography variant="caption" color="textSecondary">
									Estado
								</Typography>
								<Box>
									{causa.verified && <Chip label="Verificada" color="success" size="small" sx={{ mr: 0.5, mb: 0.5 }} />}
									{causa.isValid && <Chip label="Válida" color="primary" size="small" sx={{ mr: 0.5, mb: 0.5 }} />}
									{isEditing ? (
										<FormControlLabel
											control={
												<Switch
													checked={editedCausa.update || false}
													onChange={(e) => setEditedCausa({ ...editedCausa, update: e.target.checked })}
													color="warning"
													size="small"
												/>
											}
											label="Con actualización"
										/>
									) : (
										causa.update && (
											<Chip
												label="Con actualización"
												color="warning"
												size="small"
												sx={{ mb: 0.5, color: "rgba(0, 0, 0, 0.87)" }}
											/>
										)
									)}
								</Box>
							</Grid>

							<Grid item xs={12}>
								<Typography variant="caption" color="textSecondary">
									Carátula
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.caratula || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, caratula: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.caratula || "Sin carátula"}</Typography>
								)}
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Juzgado
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.juzgado || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, juzgado: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.juzgado || "N/A"}</Typography>
								)}
							</Grid>

							<Grid item xs={12} md={6}>
								<Typography variant="caption" color="textSecondary">
									Objeto
								</Typography>
								{isEditing ? (
									<TextField
										fullWidth
										size="small"
										value={editedCausa.objeto || ""}
										onChange={(e) => setEditedCausa({ ...editedCausa, objeto: e.target.value })}
										sx={{ mt: 0.5 }}
									/>
								) : (
									<Typography variant="body2">{causa.objeto || "Sin objeto"}</Typography>
								)}
							</Grid>

							{/* Fechas y Vínculos - Lado a lado */}
							<Grid item xs={12} md={6} sx={{ mt: 1 }}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Fechas
								</Typography>
								<Divider sx={{ mb: 1.5 }} />

								<Grid container spacing={2}>
									<Grid item xs={12}>
										<Typography variant="caption" color="textSecondary">
											Última Actualización
										</Typography>
										{isEditing ? (
											<TextField
												fullWidth
												type="datetime-local"
												size="small"
												value={toDateTimeLocal(editedCausa.lastUpdate || causa.lastUpdate)}
												onChange={(e) => setEditedCausa({ ...editedCausa, lastUpdate: e.target.value })}
												sx={{ mt: 0.5 }}
											/>
										) : (
											<Typography variant="body2">{formatDate(causa.lastUpdate)}</Typography>
										)}
									</Grid>

									<Grid item xs={12}>
										<Typography variant="caption" color="textSecondary">
											Fecha Último Movimiento
										</Typography>
										{isEditing ? (
											<TextField
												fullWidth
												type="date"
												size="small"
												value={toDateLocal(editedCausa.fechaUltimoMovimiento || causa.fechaUltimoMovimiento)}
												onChange={(e) => setEditedCausa({ ...editedCausa, fechaUltimoMovimiento: e.target.value })}
												sx={{ mt: 0.5 }}
												InputLabelProps={{ shrink: true }}
											/>
										) : (
											<Typography variant="body2">{formatDateOnly(causa.fechaUltimoMovimiento)}</Typography>
										)}
									</Grid>

									<Grid item xs={6}>
										<Typography variant="caption" color="textSecondary">
											Creado
										</Typography>
										<Typography variant="body2">{formatDate(causa.createdAt)}</Typography>
									</Grid>

									<Grid item xs={6}>
										<Typography variant="caption" color="textSecondary">
											Modificado
										</Typography>
										<Typography variant="body2">{formatDate(causa.updatedAt)}</Typography>
									</Grid>
								</Grid>
							</Grid>

							{/* Vínculos */}
							<Grid item xs={12} md={6} sx={{ mt: 1 }}>
								<Typography variant="subtitle2" color="primary" gutterBottom>
									Vínculos
								</Typography>
								<Divider sx={{ mb: 1.5 }} />

								<Grid container spacing={2}>
									{causa.folderIds && causa.folderIds.length > 0 ? (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Carpetas Vinculadas
											</Typography>
											<Box>
												<Chip label={`${causa.folderIds.length}`} size="small" />
											</Box>
										</Grid>
									) : null}

									{causa.userCausaIds && causa.userCausaIds.length > 0 ? (
										<Grid item xs={12}>
											<Typography variant="caption" color="textSecondary">
												Usuarios Vinculados
											</Typography>
											<Box>
												<Chip label={`${causa.userCausaIds.length}`} size="small" />
											</Box>
										</Grid>
									) : null}

									{(!causa.folderIds || causa.folderIds.length === 0) &&
									(!causa.userCausaIds || causa.userCausaIds.length === 0) ? (
										<Grid item xs={12}>
											<Typography variant="body2" color="textSecondary">
												Sin vínculos
											</Typography>
										</Grid>
									) : null}
								</Grid>
							</Grid>
						</Grid>
					)}

					{/* Tab Panel 1: Movimientos */}
					{activeTab === 1 && (
						<Box>
							<Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
								<Button variant="contained" startIcon={<AddCircle size={18} />} onClick={handleOpenAddMovDialog} size="small">
									Agregar Movimiento
								</Button>
							</Box>
							{movimientos.length > 0 ? (
								<>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width="12%">Fecha</TableCell>
													<TableCell>Descripción</TableCell>
													<TableCell width="12%">Tipo</TableCell>
													<TableCell width="10%" align="center">
														Enlace
													</TableCell>
													<TableCell width="8%" align="center">
														Acciones
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{paginatedMovimientos.map((mov: any, index: number) => {
													const actualIndex = movimientosPage * movimientosRowsPerPage + index;
													return (
														<TableRow key={actualIndex} hover>
															<TableCell>
																<Typography variant="caption">{formatDateOnly(mov.fecha || mov.createdAt)}</Typography>
															</TableCell>
															<TableCell>
																<Typography variant="body2" sx={{ wordWrap: "break-word", whiteSpace: "normal" }}>
																	{mov.detalle || mov.descripcion || mov.texto || "Sin descripción"}
																</Typography>
															</TableCell>
															<TableCell>{mov.tipo && <Chip label={mov.tipo} size="small" variant="outlined" />}</TableCell>
															<TableCell align="center">
																{mov.url ? (
																	<Link href={mov.url} target="_blank" rel="noopener noreferrer" underline="none">
																		<Tooltip title="Ver documento">
																			<IconButton size="small" color="primary">
																				<LinkIcon size={16} />
																			</IconButton>
																		</Tooltip>
																	</Link>
																) : (
																	<Typography variant="caption" color="textSecondary">
																		N/A
																	</Typography>
																)}
															</TableCell>
															<TableCell align="center">
																<Stack direction="row" spacing={0.5} justifyContent="center">
																	<Tooltip title="Ver notificaciones">
																		<span>
																			<IconButton
																				size="small"
																				color="info"
																				onClick={() => handleViewNotifications(mov)}
																				disabled={loadingJudicialMovements}
																			>
																				<Eye size={16} />
																			</IconButton>
																		</span>
																	</Tooltip>
																	<Tooltip title="Enviar notificación">
																		<span>
																			<IconButton
																				size="small"
																				color="primary"
																				onClick={() => handleNotifyMovimiento(actualIndex)}
																				disabled={notifyingMovIndex === actualIndex}
																			>
																				<Send2 size={16} />
																			</IconButton>
																		</span>
																	</Tooltip>
																	<Tooltip title="Eliminar movimiento">
																		<IconButton size="small" color="error" onClick={() => handleDeleteMovClick(actualIndex)}>
																			<Trash size={16} />
																		</IconButton>
																	</Tooltip>
																</Stack>
															</TableCell>
														</TableRow>
													);
												})}
											</TableBody>
										</Table>
									</TableContainer>
									<TablePagination
										rowsPerPageOptions={[5, 10, 25, 50]}
										component="div"
										count={movimientos.length}
										rowsPerPage={movimientosRowsPerPage}
										page={movimientosPage}
										onPageChange={handleChangeMovimientosPage}
										onRowsPerPageChange={handleChangeMovimientosRowsPerPage}
										labelRowsPerPage="Filas por página:"
										labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
									/>
								</>
							) : (
								<Alert severity="info">Esta causa no tiene movimientos registrados</Alert>
							)}
						</Box>
					)}

					{/* Tab Panel 2: Historial de Actualizaciones */}
					{activeTab === 2 && (
						<Box>
							<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
								<Typography variant="h6">Historial de Actualizaciones</Typography>
								{updateHistory.length > 0 && (
									<Stack direction="row" spacing={1}>
										<Button
											variant="outlined"
											color="primary"
											size="small"
											startIcon={historyOrderBy === "desc" ? <ArrowDown2 size={18} /> : <ArrowUp2 size={18} />}
											onClick={handleToggleHistoryOrder}
										>
											{historyOrderBy === "desc" ? "Más recientes" : "Más antiguos"}
										</Button>
										<Button
											variant="outlined"
											color="error"
											size="small"
											startIcon={<Trash size={18} />}
											onClick={handleClearUpdateHistory}
											disabled={clearingHistory}
										>
											{clearingHistory ? "Limpiando..." : "Limpiar Todo"}
										</Button>
									</Stack>
								)}
							</Box>

							{updateHistory.length > 0 ? (
								<>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell width="20%">Fecha/Hora</TableCell>
													<TableCell width="15%">Tipo</TableCell>
													<TableCell width="10%" align="center">
														Estado
													</TableCell>
													<TableCell width="12%" align="center">
														Mov. Added
													</TableCell>
													<TableCell width="12%" align="center">
														Mov. Total
													</TableCell>
													<TableCell width="15%">Origen</TableCell>
													<TableCell width="10%" align="center">
														Acciones
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{paginatedHistory.map((entry, index) => {
													const actualIndex = historyPage * historyRowsPerPage + index;
													return (
													<TableRow key={index} hover>
														<TableCell>
															<Typography variant="caption">
																{formatDate(entry.timestamp || entry.date || entry.createdAt)}
															</Typography>
														</TableCell>
														<TableCell>
															{entry.updateType && (
																<Chip label={String(entry.updateType)} size="small" variant="outlined" color="primary" />
															)}
														</TableCell>
														<TableCell align="center">
															{entry.success !== undefined && (
																<Tooltip title={entry.success ? "Exitoso" : "Fallido"}>
																	{entry.success ? (
																		<TickCircle size={20} color="#52c41a" variant="Bold" />
																	) : (
																		<CloseCircle size={20} color="#ff4d4f" variant="Bold" />
																	)}
																</Tooltip>
															)}
														</TableCell>
														<TableCell align="center">
															{entry.movimientosAdded !== undefined && (
																<Chip
																	label={entry.movimientosAdded > 0 ? `+${entry.movimientosAdded}` : entry.movimientosAdded}
																	size="small"
																	color={entry.movimientosAdded > 0 ? "success" : entry.movimientosAdded < 0 ? "error" : "default"}
																	variant="filled"
																/>
															)}
														</TableCell>
														<TableCell align="center">
															{entry.movimientosTotal !== undefined && (
																<Typography variant="body2" fontWeight={600}>
																	{entry.movimientosTotal}
																</Typography>
															)}
														</TableCell>
														<TableCell>
															<Typography variant="body2">{entry.source || "N/A"}</Typography>
														</TableCell>
														<TableCell align="center">
															<Tooltip title="Eliminar entrada">
																<IconButton
																	size="small"
																	color="error"
																	onClick={() => handleDeleteHistoryEntry(actualIndex)}
																	disabled={deletingHistoryEntry === actualIndex}
																>
																	<Trash size={16} />
																</IconButton>
															</Tooltip>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</TableContainer>
								<TablePagination
									rowsPerPageOptions={[5, 10, 25, 50]}
									component="div"
									count={updateHistory.length}
									rowsPerPage={historyRowsPerPage}
									page={historyPage}
									onPageChange={handleChangeHistoryPage}
									onRowsPerPageChange={handleChangeHistoryRowsPerPage}
									labelRowsPerPage="Filas por página:"
									labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
								/>
								</>
							) : (
								<Alert severity="info">No hay entradas en el historial de actualizaciones</Alert>
							)}
						</Box>
					)}
				</DialogContent>

				<DialogActions>
					{isEditing ? (
						<>
							<Button onClick={handleCancelEdit} startIcon={<CloseSquare size={18} />} variant="outlined" disabled={isSaving}>
								Cancelar
							</Button>
							<Button onClick={handleSaveEdit} startIcon={<Save2 size={18} />} variant="contained" disabled={isSaving}>
								{isSaving ? "Guardando..." : "Guardar"}
							</Button>
						</>
					) : (
						<Button onClick={onClose} startIcon={<CloseCircle size={18} />} variant="outlined">
							Cerrar
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* Dialog de confirmación para eliminar movimiento */}
			<ConfirmDialog open={deleteMovConfirm.open} onClose={handleCancelDelete}>
				<ConfirmDialogTitle>Confirmar Eliminación</ConfirmDialogTitle>
				<ConfirmDialogContent>
					<Typography>¿Está seguro que desea eliminar este movimiento? Esta acción no se puede deshacer.</Typography>
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={handleCancelDelete} variant="outlined" disabled={isDeleting}>
						Cancelar
					</Button>
					<Button onClick={handleConfirmDelete} variant="contained" color="error" disabled={isDeleting} startIcon={<Trash size={18} />}>
						{isDeleting ? "Eliminando..." : "Eliminar"}
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>

			{/* Dialog para agregar movimiento */}
			<ConfirmDialog open={addMovDialogOpen} onClose={handleCloseAddMovDialog} maxWidth="sm" fullWidth>
				<ConfirmDialogTitle>Agregar Movimiento</ConfirmDialogTitle>
				<ConfirmDialogContent>
					<Grid container spacing={2} sx={{ mt: 1 }}>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Fecha"
								type="date"
								value={newMovimiento.fecha}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, fecha: e.target.value })}
								InputLabelProps={{
									shrink: true,
								}}
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Tipo"
								value={newMovimiento.tipo}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, tipo: e.target.value })}
								placeholder="Ej: MOVIMIENTO, CEDULA ELECTRONICA TRIBUNAL"
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Detalle"
								value={newMovimiento.detalle}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, detalle: e.target.value })}
								placeholder="Descripción del movimiento"
								multiline
								rows={3}
								required
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="URL (opcional)"
								value={newMovimiento.url}
								onChange={(e) => setNewMovimiento({ ...newMovimiento, url: e.target.value })}
								placeholder="https://..."
								size="small"
							/>
						</Grid>
						<Grid item xs={12}>
							<FormControlLabel
								control={<Checkbox checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} color="primary" />}
								label="Enviar notificación a usuarios habilitados"
							/>
						</Grid>
					</Grid>
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={handleCloseAddMovDialog} variant="outlined" disabled={isAddingMovimiento}>
						Cancelar
					</Button>
					<Button onClick={handleAddMovimiento} variant="contained" disabled={isAddingMovimiento} startIcon={<AddCircle size={18} />}>
						{isAddingMovimiento ? "Agregando..." : "Agregar"}
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>

			{/* Dialog para mostrar notificaciones de un movimiento específico */}
			<ConfirmDialog open={notificationsDialogOpen} onClose={() => setNotificationsDialogOpen(false)} maxWidth="md" fullWidth>
				<ConfirmDialogTitle>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h6">Notificaciones del Movimiento</Typography>
						<IconButton onClick={() => setNotificationsDialogOpen(false)} size="small">
							<CloseCircle />
						</IconButton>
					</Box>
				</ConfirmDialogTitle>
				<ConfirmDialogContent>
					{selectedMovNotifications.length === 0 ? (
						<Alert severity="info">No se encontraron notificaciones para este movimiento</Alert>
					) : (
						<>
							<Box mb={2}>
								<Typography variant="body2" color="text.secondary">
									Total de notificaciones: <strong>{selectedMovNotifications.length}</strong>
								</Typography>
							</Box>
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Estado</TableCell>
											<TableCell>Fecha Programada</TableCell>
											<TableCell>Canales</TableCell>
											<TableCell>Destinatarios</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{selectedMovNotifications.map((jm) => {
											const jmId = typeof jm._id === "string" ? jm._id : jm._id.$oid;

											// Extraer destinatarios
											const recipients: string[] = [];
											if (jm.notifications && jm.notifications.length > 0) {
												jm.notifications.forEach((notification) => {
													const match = notification.details.match(/enviada a (.+)$/);
													if (match && match[1]) {
														recipients.push(match[1]);
													}
												});
											}

											// Color del chip según estado
											const getStatusColor = (status: string): "success" | "warning" | "error" | "default" => {
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

											const getStatusLabel = (status: string): string => {
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
												<TableRow key={jmId} hover>
													<TableCell>
														<Chip label={getStatusLabel(jm.notificationStatus)} color={getStatusColor(jm.notificationStatus)} size="small" />
													</TableCell>
													<TableCell>
														<Typography variant="caption">
															{jm.notificationSettings?.notifyAt ? formatDate(jm.notificationSettings.notifyAt) : "N/A"}
														</Typography>
													</TableCell>
													<TableCell>
														<Stack direction="row" spacing={0.5}>
															{jm.notificationSettings?.channels?.map((channel, idx) => (
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
														) : jm.notificationStatus === "pending" ? (
															<Typography variant="caption" color="text.secondary" fontStyle="italic">
																Pendiente de envío
															</Typography>
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
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={() => setNotificationsDialogOpen(false)} variant="outlined">
						Cerrar
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>

			{/* Dialog para confirmar envío de notificaciones */}
			<ConfirmDialog open={sendNotifDialogOpen} onClose={handleCancelSendNotification} maxWidth="sm" fullWidth>
				<ConfirmDialogTitle>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Typography variant="h6">Enviar Notificación</Typography>
						<IconButton onClick={handleCancelSendNotification} size="small">
							<CloseCircle />
						</IconButton>
					</Box>
				</ConfirmDialogTitle>
				<ConfirmDialogContent>
					{loadingUsers ? (
						<Box display="flex" justifyContent="center" p={3}>
							<CircularProgress />
						</Box>
					) : (
						<>
							<Alert severity="info" sx={{ mb: 2 }}>
								Las notificaciones se enviarán de forma <strong>inmediata</strong> a los usuarios seleccionados.
							</Alert>
							<Typography variant="body2" color="text.secondary" mb={2}>
								Seleccione los destinatarios de la notificación:
							</Typography>
							<Box>
								{notificationUsers.map((user) => (
									<Box key={user.id} mb={1}>
										<FormControlLabel
											control={
												<Checkbox checked={selectedUsers.includes(user.id)} onChange={() => handleToggleUser(user.id)} />
											}
											label={
												<Box>
													<Typography variant="body2" fontWeight="medium">
														{user.name}
													</Typography>
													<Typography variant="caption" color="text.secondary">
														{user.email}
													</Typography>
												</Box>
											}
										/>
									</Box>
								))}
							</Box>
							{selectedUsers.length === 0 && (
								<Alert severity="warning" sx={{ mt: 2 }}>
									Debe seleccionar al menos un destinatario
								</Alert>
							)}
						</>
					)}
				</ConfirmDialogContent>
				<ConfirmDialogActions>
					<Button onClick={handleCancelSendNotification} variant="outlined">
						Cancelar
					</Button>
					<Button
						onClick={handleConfirmSendNotification}
						variant="contained"
						disabled={selectedUsers.length === 0 || loadingUsers}
						startIcon={<Send2 size={18} />}
					>
						Enviar
					</Button>
				</ConfirmDialogActions>
			</ConfirmDialog>
		</>
	);
};

export default CausaDetalleModal;
