import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert } from "@mui/material";
import { Plan } from "types/plan";

interface DeletePlanDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	plan: Plan | null;
	loading?: boolean;
}

const DeletePlanDialog = ({ open, onClose, onConfirm, plan, loading = false }: DeletePlanDialogProps) => {
	if (!plan) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Eliminar Plan</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 3 }}>
					Esta acción no se puede deshacer. Asegúrate de que no hay usuarios suscritos a este plan.
				</Alert>
				<Typography variant="body1" gutterBottom>
					¿Estás seguro de que deseas eliminar el plan <strong>{plan.displayName}</strong>?
				</Typography>
				<Typography variant="body2" color="text.secondary">
					ID del plan: {plan.planId}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={loading}>
					Cancelar
				</Button>
				<Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
					{loading ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeletePlanDialog;
