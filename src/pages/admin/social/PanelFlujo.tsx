/**
 * Panel de flujo de una publicación
 * =================================
 * El camino de un informe en un solo lugar: contenido → PDF → post →
 * automatización. Cada paso muestra en qué estado está y deja dispararlo.
 *
 * Nada se encadena solo, a propósito: un informe se publica cuando alguien
 * decide publicarlo, no cuando termina de escribirse. Lo que el panel sí hace
 * es que no haga falta recordar el orden ni pasar por la consola.
 */

import { useCallback, useEffect, useState } from "react";

// material-ui
import { Alert, Box, Button, Chip, CircularProgress, Divider, Stack, Tooltip, Typography, alpha, useTheme } from "@mui/material";

// third-party
import { useSnackbar } from "notistack";
import { DocumentText1, Instagram, Messages2, Refresh, TickCircle } from "iconsax-react";

// project imports
import {
	FlujoEstado,
	Publicacion,
	crearPostDesdePublicacion,
	crearTriggerDesdePublicacion,
	generarPdf,
	getFlujo,
	vincularMedia,
} from "api/publicaciones";

interface Props {
	publicacion: Publicacion;
	onCambio?: () => void;
}

const PanelFlujo = ({ publicacion, onCambio }: Props) => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [estado, setEstado] = useState<FlujoEstado | null>(null);
	const [cargando, setCargando] = useState(true);
	// Qué paso está corriendo, para deshabilitar sólo ese botón.
	const [corriendo, setCorriendo] = useState<string | null>(null);

	const cargar = useCallback(async () => {
		setCargando(true);
		try {
			setEstado(await getFlujo(publicacion._id));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo leer el flujo", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [publicacion._id, enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const correr = async (nombre: string, fn: () => Promise<any>, exito: string) => {
		setCorriendo(nombre);
		try {
			await fn();
			enqueueSnackbar(exito, { variant: "success" });
			await cargar();
			onCambio?.();
		} catch (err: any) {
			const d = err?.response?.data;
			enqueueSnackbar(d?.error || "No se pudo completar el paso", { variant: "error" });
		} finally {
			setCorriendo(null);
		}
	};

	if (cargando && !estado) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
				<CircularProgress size={22} />
			</Box>
		);
	}
	if (!estado) return null;

	const Paso = ({
		icono,
		titulo,
		ok,
		detalle,
		accion,
		aviso,
	}: {
		icono: React.ReactNode;
		titulo: string;
		ok: boolean;
		detalle: string;
		accion?: { label: string; nombre: string; fn: () => Promise<any>; exito: string; disabled?: boolean };
		aviso?: string;
	}) => (
		<Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1.25 }}>
			<Box
				sx={{
					width: 30,
					height: 30,
					borderRadius: "50%",
					flex: "none",
					display: "grid",
					placeItems: "center",
					bgcolor: ok ? alpha(theme.palette.success.main, 0.12) : alpha(theme.palette.text.disabled, 0.08),
					color: ok ? theme.palette.success.main : theme.palette.text.disabled,
				}}
			>
				{ok ? <TickCircle size={17} variant="Bold" /> : icono}
			</Box>
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography variant="subtitle2">{titulo}</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
					{detalle}
				</Typography>
				{aviso && (
					<Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.25 }}>
						{aviso}
					</Typography>
				)}
			</Box>
			{accion && (
				<Button
					size="small"
					variant={ok ? "text" : "outlined"}
					disabled={!!corriendo || accion.disabled}
					onClick={() => correr(accion.nombre, accion.fn, accion.exito)}
					sx={{ textTransform: "none", whiteSpace: "nowrap" }}
				>
					{corriendo === accion.nombre ? "…" : accion.label}
				</Button>
			)}
		</Stack>
	);

	const kb = (b: number | null) => (b ? `${Math.round(b / 1024)} kB` : "");

	return (
		<Box sx={{ mt: 1 }}>
			<Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
				<Typography variant="overline" color="text.secondary">
					Flujo
				</Typography>
				<Tooltip title="Actualizar">
					<Button size="small" onClick={cargar} sx={{ ml: "auto", minWidth: 0, px: 1 }}>
						<Refresh size={14} />
					</Button>
				</Tooltip>
			</Stack>

			{!estado.contenido.ok && estado.contenido.errores.length > 0 && (
				<Alert severity="warning" sx={{ mb: 1, py: 0.25 }}>
					{estado.contenido.errores[0]}
				</Alert>
			)}

			<Divider />

			<Paso
				icono={<DocumentText1 size={16} />}
				titulo="Contenido"
				ok={estado.contenido.ok}
				detalle={
					estado.contenido.ok
						? `${estado.contenido.secciones} secciones · ${estado.contenido.placas} placas para el carrusel`
						: "Todavía no hay contenido estructurado"
				}
			/>

			<Paso
				icono={<DocumentText1 size={16} />}
				titulo="PDF"
				ok={estado.pdf.ok}
				detalle={estado.pdf.ok ? `${estado.pdf.paginas ?? "?"} páginas · ${kb(estado.pdf.bytes)}` : "Sin generar"}
				accion={{
					label: estado.pdf.ok ? "Regenerar" : "Generar",
					nombre: "pdf",
					fn: () => generarPdf(publicacion._id),
					exito: "PDF generado",
					disabled: !estado.contenido.ok,
				}}
			/>

			<Paso
				icono={<Instagram size={16} />}
				titulo="Post"
				ok={estado.post.ok}
				detalle={
					estado.post.ok
						? `${estado.post.estado}${estado.post.instagramMediaId ? " · publicado en Instagram" : " · sin publicar"}`
						: "Sin crear. Se arma con las placas del contenido"
				}
				accion={
					estado.post.ok
						? undefined
						: {
								label: "Crear",
								nombre: "post",
								fn: () => crearPostDesdePublicacion(publicacion._id),
								exito: "Post creado como borrador",
								disabled: estado.contenido.placas < 3,
							}
				}
				aviso={!estado.post.ok && estado.contenido.placas < 3 ? "Hacen falta al menos 3 placas en el contenido" : undefined}
			/>

			<Paso
				icono={<Messages2 size={16} />}
				titulo="Automatización"
				ok={estado.trigger.ok}
				detalle={
					estado.trigger.ok
						? `${estado.trigger.palabras?.join(", ")} · ${estado.trigger.activo ? "activa" : "inactiva"}${
								estado.trigger.metricas?.comentarios ? ` · ${estado.trigger.metricas.comentarios} comentarios` : ""
							}`
						: "Sin crear"
				}
				accion={
					estado.trigger.ok
						? estado.trigger.vinculado
							? undefined
							: {
									label: "Vincular al post",
									nombre: "vincular",
									fn: () => vincularMedia(publicacion._id),
									exito: "Automatización vinculada al post publicado",
									disabled: !estado.post.instagramMediaId,
								}
						: {
								label: "Crear",
								nombre: "trigger",
								fn: () => crearTriggerDesdePublicacion(publicacion._id),
								exito: "Automatización creada, inactiva",
							}
				}
				aviso={
					estado.trigger.ok && !estado.trigger.vinculado
						? estado.post.instagramMediaId
							? "Falta vincularla al post: sin eso no recibe comentarios"
							: "Se vincula cuando el post se publique en Instagram"
						: undefined
				}
			/>

			{estado.trigger.ok && estado.trigger.vinculado && !estado.trigger.activo && (
				<Chip size="small" color="warning" variant="outlined" label="La automatización está inactiva" sx={{ mt: 0.5, height: 20, fontSize: 11 }} />
			)}
		</Box>
	);
};

export default PanelFlujo;
