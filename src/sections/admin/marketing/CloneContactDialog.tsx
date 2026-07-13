import React, { useEffect, useState } from "react";
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
	TextField,
	useTheme,
} from "@mui/material";
import { Copy } from "iconsax-react";
import { MarketingContactService } from "store/reducers/marketing-contacts";

interface CloneContactDialogProps {
	open: boolean;
	onClose: () => void;
	contactId: string | null;
	contactEmail: string;
	onCloned: () => void; // Callback para refrescar la lista después de clonar
}

const CloneContactDialog: React.FC<CloneContactDialogProps> = ({ open, onClose, contactId, contactEmail, onCloned }) => {
	const theme = useTheme();
	const [newEmail, setNewEmail] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	// Prellenar con el email original como base para corregirlo
	useEffect(() => {
		if (open) {
			setNewEmail(contactEmail || "");
			setError(null);
		}
	}, [open, contactEmail]);

	const handleCancel = () => {
		if (!loading) onClose();
	};

	const handleClone = async () => {
		if (!contactId) return;

		const email = newEmail.trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setError("El nuevo email no tiene un formato válido.");
			return;
		}
		if (email === (contactEmail || "").toLowerCase()) {
			setError("El nuevo email es igual al original. Corregilo antes de clonar.");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			await MarketingContactService.cloneContact(contactId, email);
			onCloned();
			onClose();
		} catch (err: any) {
			setError(err?.response?.data?.error || "Ha ocurrido un error al clonar el contacto.");
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
					<Copy size={24} variant="Bold" color={theme.palette.primary.main} />
					<Typography variant="h5">Clonar contacto con email corregido</Typography>
				</Box>
			</DialogTitle>

			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Typography variant="body1" sx={{ mb: 2 }}>
					Email original: <strong>{contactEmail || "-"}</strong>
				</Typography>

				<TextField
					fullWidth
					autoFocus
					label="Nuevo email (corregido)"
					value={newEmail}
					onChange={(e) => setNewEmail(e.target.value)}
					disabled={loading}
					onKeyPress={(e) => {
						if (e.key === "Enter") handleClone();
					}}
					sx={{ mb: 2 }}
				/>

				<Alert severity="info">
					<Typography variant="body2" component="div">
						El clon conserva los datos del contacto (nombre, tags, expedientes, fueros y su detalle) y queda:
						<ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
							<li>
								Con estado <strong>Activo</strong> y verificación de email reseteada (se re-verifica antes de enviarle).
							</li>
							<li>
								<strong>Sin campañas ni segmentos</strong>: el sync de segmentos lo vuelve a incluir automáticamente y de ahí re-entra a las
								campañas.
							</li>
						</ul>
						El contacto original se conserva rebotado (para métricas) con la etiqueta <strong>reemplazado</strong>.
					</Typography>
				</Alert>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={handleCancel} color="inherit" disabled={loading}>
					Volver
				</Button>
				<Button
					onClick={handleClone}
					color="primary"
					variant="contained"
					disabled={loading || !contactId || !newEmail.trim()}
					startIcon={loading && <CircularProgress size={20} color="inherit" />}
				>
					{loading ? "Clonando..." : "Clonar contacto"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default CloneContactDialog;
