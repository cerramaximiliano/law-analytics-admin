import React from "react";
import { useState } from "react";

// material-ui
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Chip,
	Typography,
	Stack,
	Alert,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";

// project imports
import { Campaign } from "types/campaign";
import { CampaignService } from "store/reducers/campaign";

// types
interface DeleteCampaignDialogProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
	campaign: Campaign | null;
}

const DeleteCampaignDialog = ({ open, onClose, onSuccess, campaign }: DeleteCampaignDialogProps) => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Delete campaign handler
	const handleDeleteCampaign = async () => {
		if (!campaign || !campaign._id) {
			setError("Datos de campaña no válidos");
			return;
		}

		try {
			setLoading(true);
			setError(null);

			// Delete campaign
			await CampaignService.deleteCampaign(campaign._id);

			// Close modal and refresh list
			onSuccess();
		} catch (err: any) {
			setError(err.message || "Error al eliminar la campaña");
		} finally {
			setLoading(false);
		}
	};

	// Status chip color mapping
	const getStatusColor = (status: string) => {
		switch (status) {
			case "draft":
				return { color: "default", label: "Borrador" };
			case "active":
				return { color: "success", label: "Activa" };
			case "paused":
				return { color: "warning", label: "Pausada" };
			case "completed":
				return { color: "info", label: "Completada" };
			case "archived":
				return { color: "secondary", label: "Archivada" };
			default:
				return { color: "default", label: status };
		}
	};

	// Format campaign type
	const getTypeLabel = (type: string) => {
		switch (type) {
			case "onetime":
				return "Una vez";
			case "automated":
				return "Automatizada";
			case "sequence":
				return "Secuencia";
			case "recurring":
				return "Recurrente";
			default:
				return type;
		}
	};

	return (
		<Dialog open={open} onClose={onClose}>
			<DialogTitle>Eliminar campaña</DialogTitle>
			<DialogContent>
				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<DialogContentText>¿Estás seguro de que deseas eliminar esta campaña? Esta acción no se puede deshacer.</DialogContentText>

				{campaign && (
					<Stack spacing={2} sx={{ mt: 3 }}>
						<Typography variant="subtitle1" fontWeight="bold">
							{campaign.name}
						</Typography>

						{campaign.description && (
							<Typography variant="body2" color="textSecondary">
								{campaign.description}
							</Typography>
						)}

						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="body2" color="textSecondary">
								Tipo:
							</Typography>
							<Typography variant="body2">{getTypeLabel(campaign.type)}</Typography>
						</Stack>

						<Stack direction="row" spacing={1} alignItems="center">
							<Typography variant="body2" color="textSecondary">
								Estado:
							</Typography>
							<Chip label={getStatusColor(campaign.status).label} color={getStatusColor(campaign.status).color as any} size="small" />
						</Stack>

						{campaign.category && (
							<Stack direction="row" spacing={1} alignItems="center">
								<Typography variant="body2" color="textSecondary">
									Categoría:
								</Typography>
								<Typography variant="body2">{campaign.category}</Typography>
							</Stack>
						)}

						{campaign.metrics?.totalContacts > 0 && (
							<Alert severity="warning">
								Esta campaña tiene {campaign.metrics.totalContacts} contactos asociados. Al eliminarla, estos contactos ya no recibirán
								correos electrónicos de esta campaña.
							</Alert>
						)}
					</Stack>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} color="inherit">
					Cancelar
				</Button>
				<LoadingButton onClick={handleDeleteCampaign} color="error" loading={loading} variant="contained">
					Eliminar
				</LoadingButton>
			</DialogActions>
		</Dialog>
	);
};

export default DeleteCampaignDialog;
