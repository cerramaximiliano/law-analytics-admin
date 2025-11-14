import React, { useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Box,
	CircularProgress,
	Alert,
	useTheme,
} from "@mui/material";
import { Warning2 } from "iconsax-react";
import { MarketingContactService } from "store/reducers/marketing-contacts";

interface DeleteContactDialogProps {
	open: boolean;
	onClose: () => void;
	contactId: string | null;
	contactName: string;
	onDelete: () => void; // Callback para actualizar la lista después de eliminar
}

const DeleteContactDialog: React.FC<DeleteContactDialogProps> = ({ open, onClose, contactId, contactName, onDelete }) => {
	const theme = useTheme();
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const handleCancel = () => {
		if (!loading) {
			onClose();
		}
	};

	// Actualizar estado a "unsubscribed" (cancelado)
	const handleDelete = async () => {
		if (!contactId) return;

		try {
			setLoading(true);
			setError(null);

			// Actualizar estado a "unsubscribed" en lugar de eliminar completamente
			await MarketingContactService.updateContactStatus(contactId, "unsubscribed");

			onDelete(); // Notificar éxito para actualizar la lista
			onClose(); // Cerrar diálogo
		} catch (err: any) {
			setError(err?.message || "Ha ocurrido un error al cancelar el contacto");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={open}
			onClose={handleCancel}
			maxWidth="sm"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					borderRadius: 2,
				},
			}}
		>
			<DialogTitle>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Warning2 size={24} variant="Bold" color={theme.palette.error.main} />
					<Typography variant="h5">Cancelar Suscripción de Contacto</Typography>
				</Box>
			</DialogTitle>

			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Typography variant="body1" sx={{ mb: 2 }}>
					¿Estás seguro de que quieres cancelar la suscripción de <strong>{contactName || "este contacto"}</strong>?
				</Typography>

				<Typography variant="body2" color="textSecondary">
					El contacto no será eliminado de la base de datos, sino que su estado cambiará a "Cancelado". Esto impedirá que reciba futuras
					campañas de email marketing.
				</Typography>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={handleCancel} color="inherit" disabled={loading}>
					Volver
				</Button>
				<Button
					onClick={handleDelete}
					color="error"
					variant="contained"
					disabled={loading || !contactId}
					startIcon={loading && <CircularProgress size={20} color="inherit" />}
				>
					{loading ? "Procesando..." : "Cancelar Suscripción"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeleteContactDialog;
