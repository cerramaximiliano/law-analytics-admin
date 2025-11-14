import React from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	Typography,
	Grid,
	CircularProgress,
} from "@mui/material";
import { CloseCircle } from "iconsax-react";

interface DeleteSegmentDialogProps {
	open: boolean;
	segmentName: string;
	onClose: () => void;
	onConfirm: () => void;
	loading: boolean;
}

const DeleteSegmentDialog: React.FC<DeleteSegmentDialogProps> = ({ open, segmentName, onClose, onConfirm, loading }) => {
	return (
		<Dialog
			open={open}
			onClose={loading ? undefined : onClose}
			maxWidth="sm"
			fullWidth
			sx={{
				"& .MuiDialog-paper": {
					borderRadius: 2,
				},
			}}
		>
			<DialogTitle>
				<Grid container alignItems="center" justifyContent="space-between">
					<Grid item>
						<Typography variant="h5">Eliminar Segmento</Typography>
					</Grid>
					<Grid item>
						<IconButton onClick={onClose} size="small" disabled={loading}>
							<CloseCircle variant="Bold" />
						</IconButton>
					</Grid>
				</Grid>
			</DialogTitle>

			<DialogContent>
				<DialogContentText>
					¿Está seguro de que desea eliminar el segmento <strong>"{segmentName}"</strong>? Esta acción no se puede deshacer.
				</DialogContentText>
			</DialogContent>

			<DialogActions sx={{ px: 3, py: 2 }}>
				<Button onClick={onClose} color="inherit" disabled={loading}>
					Cancelar
				</Button>
				<Button
					onClick={onConfirm}
					color="error"
					variant="contained"
					disabled={loading}
					startIcon={loading && <CircularProgress size={20} color="inherit" />}
				>
					{loading ? "Eliminando..." : "Eliminar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default DeleteSegmentDialog;
