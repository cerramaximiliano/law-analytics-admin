import {
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	Stack,
	Typography,
} from "@mui/material";
import { Warning2 } from "iconsax-react";
import { DiscountCode } from "api/discounts";

interface DeletePromotionDialogProps {
	open: boolean;
	onClose: () => void;
	onConfirm: () => void;
	discount: DiscountCode | null;
	loading: boolean;
}

const DeletePromotionDialog = ({ open, onClose, onConfirm, discount, loading }: DeletePromotionDialogProps) => {
	if (!discount) return null;

	const hasBeenUsed = discount.stats.timesRedeemed > 0;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Stack direction="row" spacing={1} alignItems="center">
					<Warning2 color="#ff4d4f" />
					<Typography variant="h5">Eliminar Promoción</Typography>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					¿Estás seguro de que deseas eliminar la promoción{" "}
					<strong style={{ fontFamily: "monospace" }}>{discount.code}</strong>?
				</DialogContentText>
				{hasBeenUsed && (
					<DialogContentText sx={{ mt: 2, color: "warning.main" }}>
						Esta promoción ha sido utilizada {discount.stats.timesRedeemed} veces. El historial de uso se conservará
						pero el código ya no podrá ser utilizado.
					</DialogContentText>
				)}
				<DialogContentText sx={{ mt: 2 }}>Esta acción no se puede deshacer.</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} variant="outlined" color="secondary" disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onConfirm}
					variant="contained"
					color="error"
					disabled={loading}
					startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
				>
					{loading ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeletePromotionDialog;
