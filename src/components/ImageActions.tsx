// Botones "Copiar" y "Descargar" para una imagen (screenshots, snapshots).
//
// Recibe `getBlob` y no una URL porque cada bucket se lee distinto: el de PJN
// tiene CORS para el dashboard y se puede hacer fetch directo, mientras que el
// de SCBA no lo tiene y hay que pedirle los bytes a mev-api. Ver utils/imageActions.

import React, { useState } from "react";
import { Button, CircularProgress, IconButton, Stack, Tooltip } from "@mui/material";
import { Copy, DocumentDownload } from "iconsax-react";
import { enqueueSnackbar } from "notistack";
import { copyBlobToClipboard, downloadBlob, safeFileName } from "utils/imageActions";

interface ImageActionsProps {
	/** De dónde salen los bytes. Se invoca en cada acción (las presigned URLs vencen). */
	getBlob: () => Promise<Blob>;
	/** Nombre legible; se usa para el archivo descargado. */
	label: string;
	/** `icon` para celdas de tabla, `button` para barras de acciones. */
	variant?: "icon" | "button";
	/** Ocultar el copiado cuando solo interesa bajar el archivo. */
	showCopy?: boolean;
}

const ImageActions: React.FC<ImageActionsProps> = ({ getBlob, label, variant = "button", showCopy = true }) => {
	const [busy, setBusy] = useState<"copy" | "download" | null>(null);

	const run = async (accion: "copy" | "download", e?: React.MouseEvent) => {
		// Estos botones suelen vivir sobre una miniatura clickeable que abre el
		// lightbox; sin esto, descargar abriría además la imagen ampliada.
		e?.stopPropagation();
		setBusy(accion);
		try {
			const blob = await getBlob();
			if (accion === "download") {
				downloadBlob(blob, safeFileName(label));
			} else {
				await copyBlobToClipboard(blob);
				enqueueSnackbar("Imagen copiada al portapapeles", { variant: "success" });
			}
		} catch (error: any) {
			enqueueSnackbar(error?.message || (accion === "copy" ? "No se pudo copiar la imagen" : "No se pudo descargar la imagen"), {
				variant: "error",
			});
		} finally {
			setBusy(null);
		}
	};

	if (variant === "icon") {
		return (
			<Stack direction="row" spacing={0} alignItems="center">
				{showCopy && (
					<Tooltip title="Copiar imagen" placement="top">
						<span>
							<IconButton size="small" sx={{ p: 0.25 }} disabled={busy !== null} onClick={(e) => run("copy", e)}>
								{busy === "copy" ? <CircularProgress size={12} /> : <Copy size={13} />}
							</IconButton>
						</span>
					</Tooltip>
				)}
				<Tooltip title="Descargar imagen" placement="top">
					<span>
						<IconButton size="small" sx={{ p: 0.25 }} disabled={busy !== null} onClick={(e) => run("download", e)}>
							{busy === "download" ? <CircularProgress size={12} /> : <DocumentDownload size={13} />}
						</IconButton>
					</span>
				</Tooltip>
			</Stack>
		);
	}

	return (
		<Stack direction="row" spacing={1} alignItems="center">
			{showCopy && (
				<Button
					size="small"
					startIcon={busy === "copy" ? <CircularProgress size={13} /> : <Copy size={15} />}
					disabled={busy !== null}
					onClick={(e) => run("copy", e)}
				>
					Copiar
				</Button>
			)}
			<Button
				size="small"
				startIcon={busy === "download" ? <CircularProgress size={13} /> : <DocumentDownload size={15} />}
				disabled={busy !== null}
				onClick={(e) => run("download", e)}
			>
				Descargar
			</Button>
		</Stack>
	);
};

export default ImageActions;
