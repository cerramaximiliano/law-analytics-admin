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
	FormControlLabel,
	Checkbox,
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
	const [permanentDelete, setPermanentDelete] = useState<boolean>(false);

	const handleCancel = () => {
		if (!loading) {
			setPermanentDelete(false);
			onClose();
		}
	};

	// Actualizar estado a "unsubscribed" (cancelado) o eliminar permanentemente
	const handleDelete = async () => {
		if (!contactId) return;

		try {
			setLoading(true);
			setError(null);

			if (permanentDelete) {
				// Eliminar permanentemente el contacto
				await MarketingContactService.deleteContact(contactId, true);
			} else {
				// Actualizar estado a "unsubscribed" en lugar de eliminar completamente
				await MarketingContactService.updateContactStatus(contactId, "unsubscribed");
			}

			setPermanentDelete(false);
			onDelete(); // Notificar éxito para actualizar la lista
			onClose(); // Cerrar diálogo
		} catch (err: any) {
			setError(err?.message || (permanentDelete ? "Ha ocurrido un error al eliminar el contacto" : "Ha ocurrido un error al cancelar el contacto"));
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
					<Typography variant="h5">{permanentDelete ? "Eliminar Contacto" : "Cancelar Suscripción de Contacto"}</Typography>
				</Box>
			</DialogTitle>

			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Typography variant="body1" sx={{ mb: 2 }}>
					¿Estás seguro de que quieres {permanentDelete ? "eliminar permanentemente" : "cancelar la suscripción de"}{" "}
					<strong>{contactName || "este contacto"}</strong>?
				</Typography>

				<Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
					{permanentDelete
						? "El contacto será eliminado permanentemente de la base de datos. Esta acción no se puede deshacer."
						: 'El contacto no será eliminado de la base de datos, sino que su estado cambiará a "Cancelado". Esto impedirá que reciba futuras campañas de email marketing.'}
				</Typography>

				<FormControlLabel
					control={
						<Checkbox
							checked={permanentDelete}
							onChange={(e) => setPermanentDelete(e.target.checked)}
							color="error"
							disabled={loading}
						/>
					}
					label={
						<Typography variant="body2" color={permanentDelete ? "error" : "textSecondary"}>
							También eliminar el registro permanentemente
						</Typography>
					}
				/>

				{permanentDelete && (
					<Alert severity="warning" sx={{ mt: 2 }}>
						Esta acción eliminará el contacto de forma permanente. No podrá ser recuperado.
					</Alert>
				)}
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
					{loading ? "Procesando..." : permanentDelete ? "Eliminar Permanentemente" : "Cancelar Suscripción"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeleteContactDialog;
