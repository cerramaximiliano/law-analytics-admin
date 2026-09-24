/**
 * Configuración del flujo de informes
 * ===================================
 * Lo que se repite entre un informe y otro: cómo se anuncia, qué palabra
 * dispara, qué dice el privado, cuánto vale el enlace. Se configura una vez y
 * cada informe nuevo arranca con estos valores.
 *
 * Lo único que debería cambiar de un informe a otro es el contenido. Si algo
 * de acá hay que retocarlo en cada publicación, es señal de que el default
 * está mal elegido.
 */

import { useEffect, useState } from "react";

// material-ui
import {
	Alert,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";

// third-party
import { useSnackbar } from "notistack";

// project imports
import { ConfiguracionFlujo, getConfigFlujo, updateConfigFlujo } from "api/publicaciones";

interface Props {
	open: boolean;
	onClose: () => void;
}

const ConfigFlujoDialog = ({ open, onClose }: Props) => {
	const { enqueueSnackbar } = useSnackbar();
	const [cfg, setCfg] = useState<ConfiguracionFlujo | null>(null);
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!open) return;
		getConfigFlujo()
			.then(setCfg)
			.catch((err: any) => enqueueSnackbar(err?.response?.data?.error || "No se pudo leer la configuración", { variant: "error" }));
	}, [open, enqueueSnackbar]);

	const set = (rama: keyof ConfiguracionFlujo, campo: string, valor: any) =>
		setCfg((c) => (c ? { ...c, [rama]: { ...(c[rama] as any), [campo]: valor } } : c));

	const setMensaje = (clave: "mensajeInicial" | "mensajeMaterial" | "mensajeEmail", campo: string, valor: string) =>
		setCfg((c) => (c ? { ...c, trigger: { ...c.trigger, [clave]: { ...(c.trigger as any)[clave], [campo]: valor } } } : c));

	const guardar = async () => {
		if (!cfg) return;
		setGuardando(true);
		try {
			await updateConfigFlujo(cfg);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "No se pudo guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>Configuración del flujo</DialogTitle>
			<DialogContent dividers>
				{!cfg ? (
					<Typography variant="body2" color="text.secondary">
						Cargando…
					</Typography>
				) : (
					<Grid container spacing={2} sx={{ mt: 0 }}>
						<Grid item xs={12}>
							<Typography variant="body2" color="text.secondary">
								Lo que se repite entre un informe y otro. Cada publicación nueva arranca con estos valores; lo único que debería cambiar
								de un informe al siguiente es el contenido.
							</Typography>
						</Grid>

						{/* ---------- el post ---------- */}
						<Grid item xs={12}>
							<Divider textAlign="left">
								<Typography variant="caption" color="text.secondary">
									El post que anuncia el informe
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="Cierre del carrusel"
								fullWidth
								size="small"
								inputProps={{ maxLength: 60 }}
								value={cfg.post.cierre}
								onChange={(e) => set("post", "cierre", e.target.value)}
								helperText="{palabra} se reemplaza por la que dispara. Máx. 60"
							/>
						</Grid>
						<Grid item xs={12} md={6}>
							<TextField
								label="Llamado al final del caption"
								fullWidth
								size="small"
								value={cfg.post.llamado}
								onChange={(e) => set("post", "llamado", e.target.value)}
								helperText="Acá también vale {palabra}"
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Hashtags"
								fullWidth
								size="small"
								value={cfg.post.hashtags.join(" ")}
								onChange={(e) => set("post", "hashtags", e.target.value.split(/\s+/).filter(Boolean))}
								helperText="Separados por espacio"
							/>
						</Grid>

						{/* ---------- la palabra ---------- */}
						<Grid item xs={12}>
							<Divider textAlign="left">
								<Typography variant="caption" color="text.secondary">
									La palabra que dispara
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={5}>
							<FormControl fullWidth size="small">
								<InputLabel>Cómo se elige</InputLabel>
								<Select
									label="Cómo se elige"
									value={cfg.trigger.estrategiaPalabra}
									onChange={(e) => set("trigger", "estrategiaPalabra", e.target.value)}
								>
									<MenuItem value="titulo">Derivada del título</MenuItem>
									<MenuItem value="fija">Siempre la misma</MenuItem>
								</Select>
							</FormControl>
						</Grid>
						<Grid item xs={12} md={4}>
							<TextField
								label={cfg.trigger.estrategiaPalabra === "fija" ? "Palabra" : "Palabra de reserva"}
								fullWidth
								size="small"
								value={cfg.trigger.palabraFija}
								onChange={(e) => set("trigger", "palabraFija", e.target.value.toUpperCase())}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={cfg.trigger.exacta} onChange={(e) => set("trigger", "exacta", e.target.checked)} />
								<Tooltip title="Si está activo, la palabra tiene que ser el comentario entero.">
									<Typography variant="body2">Exacta</Typography>
								</Tooltip>
							</Stack>
						</Grid>
						{cfg.trigger.estrategiaPalabra === "fija" && (
							<Grid item xs={12}>
								<Alert severity="warning" sx={{ py: 0.25 }}>
									Con una palabra fija, dos informes activos a la vez comparten disparador y un comentario podría entregar el material
									equivocado. Derivarla del título lo evita.
								</Alert>
							</Grid>
						)}

						{/* ---------- los mensajes ---------- */}
						<Grid item xs={12}>
							<Divider textAlign="left">
								<Typography variant="caption" color="text.secondary">
									Mensajes por defecto
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Paso 1 · respuesta al comentario"
								fullWidth
								size="small"
								multiline
								minRows={3}
								value={cfg.trigger.mensajeInicial.texto}
								onChange={(e) => setMensaje("mensajeInicial", "texto", e.target.value)}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField
								label="Botón"
								fullWidth
								size="small"
								inputProps={{ maxLength: 20 }}
								value={cfg.trigger.mensajeInicial.boton}
								onChange={(e) => setMensaje("mensajeInicial", "boton", e.target.value)}
								helperText="Máx. 20"
							/>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Paso 2 · al tocar el botón"
								fullWidth
								size="small"
								multiline
								minRows={2}
								value={cfg.trigger.mensajeMaterial.texto}
								onChange={(e) => setMensaje("mensajeMaterial", "texto", e.target.value)}
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField
								label="Botón"
								fullWidth
								size="small"
								inputProps={{ maxLength: 20 }}
								value={cfg.trigger.mensajeMaterial.boton}
								onChange={(e) => setMensaje("mensajeMaterial", "boton", e.target.value)}
								helperText="Máx. 20"
							/>
						</Grid>
						<Grid item xs={12} md={3}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch checked={cfg.trigger.pedirEmail} onChange={(e) => set("trigger", "pedirEmail", e.target.checked)} />
								<Typography variant="body2">Pedir mail</Typography>
							</Stack>
						</Grid>
						<Grid item xs={12} md={9}>
							<TextField
								label="Paso 3 · cómo se pide el mail"
								fullWidth
								size="small"
								disabled={!cfg.trigger.pedirEmail}
								value={cfg.trigger.mensajeEmail.texto}
								onChange={(e) => setMensaje("mensajeEmail", "texto", e.target.value)}
							/>
						</Grid>
						<Grid item xs={12}>
							<TextField
								label="Confirmación al recibirlo"
								fullWidth
								size="small"
								disabled={!cfg.trigger.pedirEmail}
								value={cfg.trigger.mensajeEmail.confirmacion}
								onChange={(e) => setMensaje("mensajeEmail", "confirmacion", e.target.value)}
								helperText="Prometer sólo lo que el sistema cumple: hoy el mail se guarda como contacto, no se envía nada automáticamente."
							/>
						</Grid>

						{/* ---------- la publicación ---------- */}
						<Grid item xs={12}>
							<Divider textAlign="left">
								<Typography variant="caption" color="text.secondary">
									La publicación y su enlace
								</Typography>
							</Divider>
						</Grid>
						<Grid item xs={12} md={5}>
							<Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%" }}>
								<Switch
									checked={cfg.publicacion.listadaPorDefecto}
									onChange={(e) => set("publicacion", "listadaPorDefecto", e.target.checked)}
								/>
								<Tooltip title="Apagado: la publicación se abre con su enlace pero no figura en /informes ni la indexan los buscadores.">
									<Typography variant="body2">Listar en público por defecto</Typography>
								</Tooltip>
							</Stack>
						</Grid>
						<Grid item xs={6} md={3}>
							<TextField
								label="Vigencia del enlace"
								type="number"
								fullWidth
								size="small"
								value={cfg.publicacion.diasValidezEnlace ?? 90}
								onChange={(e) => set("publicacion", "diasValidezEnlace", Number(e.target.value))}
								helperText="Días. 0 = no vence"
							/>
						</Grid>
						<Grid item xs={6} md={4}>
							<TextField
								label="Pieza principal"
								fullWidth
								size="small"
								value={cfg.publicacion.piezaPrincipal}
								onChange={(e) => set("publicacion", "piezaPrincipal", e.target.value)}
								helperText="La que se imprime y se ofrece primero"
							/>
						</Grid>
						<Grid item xs={12}>
							<Stack direction="row" spacing={1} alignItems="center">
								<Switch checked={cfg.trigger.activarAlCrear} onChange={(e) => set("trigger", "activarAlCrear", e.target.checked)} />
								<Tooltip title="Dejarlo apagado permite revisar los textos antes de que el sistema le hable a alguien.">
									<Typography variant="body2">Activar la automatización al crearla</Typography>
								</Tooltip>
							</Stack>
						</Grid>
					</Grid>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={guardar} disabled={guardando || !cfg}>
					{guardando ? "Guardando…" : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ConfigFlujoDialog;
