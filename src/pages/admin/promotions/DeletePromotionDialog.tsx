import {
	Box,
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
import { alpha, useTheme } from "@mui/material/styles";
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
	const theme = useTheme();

	if (!discount) return null;

	const hasBeenUsed = discount.stats.timesRedeemed > 0;

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
						Eliminar promoción
					</Typography>
				</Stack>
			</DialogTitle>
			<DialogContent>
				<DialogContentText>
					¿Estás seguro de que deseas eliminar la promoción{" "}
					<strong style={{ fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>{discount.code}</strong>?
				</DialogContentText>
				{hasBeenUsed && (
					<DialogContentText sx={{ mt: 2, color: "warning.main" }}>
						Esta promoción ha sido utilizada {discount.stats.timesRedeemed} veces. El historial de uso se conservará pero el código ya no
						podrá ser utilizado.
					</DialogContentText>
				)}
				<DialogContentText sx={{ mt: 2 }}>Esta acción no se puede deshacer.</DialogContentText>
			</DialogContent>
			<DialogActions sx={{ px: 3, pb: 2 }}>
				<Button onClick={onClose} color="secondary" disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onConfirm}
					variant="contained"
					color="error"
					disableElevation
					disabled={loading}
					startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
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

export default DeletePromotionDialog;
