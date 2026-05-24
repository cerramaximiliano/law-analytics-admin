import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Alert, Stack, Box } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Warning2 } from "iconsax-react";
import { Plan } from "types/plan";

interface DeletePlanDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => Promise<void>;
	plan: Plan | null;
	loading?: boolean;
}

const DeletePlanDialog = ({ open, onClose, onConfirm, plan, loading = false }: DeletePlanDialogProps) => {
	const theme = useTheme();
	if (!plan) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ pb: 1.5 }}>
				<Stack direction="row" spacing={1.25} alignItems="center">
					<Box
						sx={{
							width: 36,
							height: 36,
							borderRadius: 1.25,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: alpha(theme.palette.error.main, 0.1),
							color: "error.main",
						}}
					>
						<Warning2 size={20} variant="Bold" />
					</Box>
					<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
						Eliminar plan
					</Typography>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 3 }}>
					Esta acción no se puede deshacer. Asegúrate de que no hay usuarios suscritos a este plan.
				</Alert>
				<Typography variant="body1" gutterBottom>
					¿Estás seguro de que deseas eliminar el plan <strong>{plan.displayName}</strong>?
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
					ID del plan: {plan.planId}
				</Typography>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} color="secondary" disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onConfirm}
					color="error"
					variant="contained"
					disableElevation
					disabled={loading}
					sx={{
						transition: "transform 160ms ease",
						"&:hover": { transform: "translateY(-1px)" },
						"&:active": { transform: "scale(0.98)" },
					}}
				>
					{loading ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeletePlanDialog;
