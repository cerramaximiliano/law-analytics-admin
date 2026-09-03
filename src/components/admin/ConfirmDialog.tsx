import { Button, Dialog, DialogActions, DialogContentText, DialogContent, DialogTitle } from "@mui/material";

/**
 * Confirmación de una acción que no se deshace.
 *
 * Existe porque varias vistas usaban `confirm()` del navegador para cosas como
 * remover un miembro de un grupo o archivarlo. Ese diálogo bloquea la pestaña
 * entera, no se puede estilar, y aparece con la tipografía del sistema en
 * medio de una interfaz que usa Dialog de MUI en todo el resto — con lo cual
 * lo más parecido a un error del navegador es justamente el momento en que se
 * te pide confirmar algo destructivo.
 *
 * El botón que confirma dice qué hace ("Remover", "Archivar"), no "Aceptar":
 * quien lo lee tiene que poder decidir sin releer el título.
 */

export interface ConfirmDialogProps {
	open: boolean;
	/** La pregunta. Nombra el objeto concreto, no la categoría. */
	title: string;
	/** Qué consecuencia tiene, cuando no es evidente por el título. */
	description?: string;
	/** El verbo de la acción. Nunca "Aceptar". */
	confirmLabel: string;
	/** `error` para lo destructivo; `primary` para lo reversible. */
	confirmColor?: "error" | "primary" | "warning";
	/** Bloquea los botones mientras la acción está en curso. */
	loading?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}

const ConfirmDialog = ({
	open,
	title,
	description,
	confirmLabel,
	confirmColor = "error",
	loading = false,
	onConfirm,
	onClose,
}: ConfirmDialogProps) => (
	<Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth>
		<DialogTitle>{title}</DialogTitle>
		{description && (
			<DialogContent>
				<DialogContentText variant="body2">{description}</DialogContentText>
			</DialogContent>
		)}
		<DialogActions>
			<Button onClick={onClose} disabled={loading}>
				Cancelar
			</Button>
			<Button color={confirmColor} variant="contained" onClick={onConfirm} disabled={loading}>
				{confirmLabel}
			</Button>
		</DialogActions>
	</Dialog>
);

export default ConfirmDialog;
