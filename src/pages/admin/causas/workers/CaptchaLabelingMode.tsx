import { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	IconButton,
	LinearProgress,
	Stack,
	TextField,
	Typography,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { CloseCircle, ArrowRight, Trash, EyeSlash as Eye, SearchZoomIn, SearchZoomOut } from "iconsax-react";
import workersAxios from "utils/workersAxios";
import { CaptchaDatasetService, CaptchaDatasetEntry } from "api/captchaDataset";

/**
 * Modo de etiquetado rápido, pensado para el móvil.
 *
 * La idea es no tocar más que el teclado numérico: se escriben los 4 dígitos y
 * al cuarto se guarda y avanza solo al siguiente. Nada de abrir, guardar y
 * cerrar de a uno, que con ~2.900 pendientes sería inviable.
 *
 * Se precarga la imagen siguiente para que el avance sea instantáneo.
 */

const LOTE = 25;

async function cargarImagen(file: string): Promise<string> {
	const r = await workersAxios.get(`/api/captcha-dataset/image/${file}`, { responseType: "blob" });
	return URL.createObjectURL(r.data as Blob);
}

interface Props {
	open: boolean;
	onClose: (etiquetadas: number) => void;
}

const CaptchaLabelingMode = ({ open, onClose }: Props) => {
	const theme = useTheme();
	const esMovil = useMediaQuery(theme.breakpoints.down("sm"));

	const [cola, setCola] = useState<CaptchaDatasetEntry[]>([]);
	const [idx, setIdx] = useState(0);
	const [blob, setBlob] = useState<string | null>(null);
	const [siguienteBlob, setSiguienteBlob] = useState<string | null>(null);
	const [valor, setValor] = useState("");
	const [cargando, setCargando] = useState(false);
	const [guardando, setGuardando] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hechas, setHechas] = useState(0);
	const [pendientesTotal, setPendientesTotal] = useState(0);
	// Nivel de lupa. Se mantiene entre imágenes a propósito: si necesitás
	// ampliar para leer una, vas a necesitarlo para las que siguen, y volver a
	// activarlo en cada una rompería el ritmo.
	const [zoom, setZoom] = useState(1);
	const inputRef = useRef<HTMLInputElement>(null);
	const visorRef = useRef<HTMLDivElement>(null);

	const actual = cola[idx];

	const traerLote = useCallback(async () => {
		setCargando(true);
		setError(null);
		try {
			const r = await CaptchaDatasetService.list({ verified: false, limit: LOTE, skip: 0 });
			setCola(r.data);
			setPendientesTotal(r.total);
			setIdx(0);
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo cargar la cola");
		} finally {
			setCargando(false);
		}
	}, []);

	useEffect(() => {
		if (open) {
			setHechas(0);
			setValor("");
			traerLote();
		}
	}, [open, traerLote]);

	// Imagen actual + precarga de la siguiente, para que avanzar sea instantáneo.
	useEffect(() => {
		let vivo = true;
		if (!actual) return;
		(async () => {
			try {
				const url = siguienteBlob ?? (await cargarImagen(actual.file));
				if (vivo) setBlob(url);
			} catch {
				if (vivo) setBlob(null);
			}
			const prox = cola[idx + 1];
			if (prox) {
				try {
					const u = await cargarImagen(prox.file);
					if (vivo) setSiguienteBlob(u);
				} catch {
					if (vivo) setSiguienteBlob(null);
				}
			} else if (vivo) {
				setSiguienteBlob(null);
			}
		})();
		return () => {
			vivo = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [idx, cola]);

	useEffect(() => {
		if (blob && inputRef.current) inputRef.current.focus();
	}, [blob]);

	// Al cambiar de imagen se vuelve al principio del visor. Los dígitos están
	// pegados al borde izquierdo, así que heredar el scroll de la anterior
	// dejaría mirando el vacío de la derecha.
	useEffect(() => {
		if (visorRef.current) visorRef.current.scrollLeft = 0;
	}, [idx, blob]);

	// 1x → 2x → 3x → 1x. Un solo control que cicla es más rápido que botones
	// de + y - separados, y en el móvil ocupa la mitad de lugar.
	const ciclarZoom = useCallback(() => {
		setZoom((z) => (z >= 3 ? 1 : z + 1));
		// Tocar el visor saca el foco del campo; sin esto habría que volver a
		// tocarlo para seguir tipeando.
		inputRef.current?.focus();
	}, []);

	const avanzar = useCallback(async () => {
		setValor("");
		if (idx + 1 < cola.length) {
			setIdx((i) => i + 1);
		} else {
			// Se terminó el lote: se pide el siguiente. Los ya etiquetados dejan
			// de aparecer porque el filtro es verified=false.
			await traerLote();
			setSiguienteBlob(null);
		}
	}, [idx, cola.length, traerLote]);

	const guardar = useCallback(
		async (etiqueta: string) => {
			if (!actual || etiqueta.length !== 4) return;
			setGuardando(true);
			setError(null);
			try {
				await CaptchaDatasetService.label(actual.file, etiqueta);
				setHechas((n) => n + 1);
				setPendientesTotal((n) => Math.max(0, n - 1));
				await avanzar();
			} catch (e: any) {
				setError(e?.response?.data?.message || e?.message || "No se pudo guardar");
			} finally {
				setGuardando(false);
			}
		},
		[actual, avanzar],
	);

	// Captcha válido pero ilegible: alguna raya tapa un dígito y no hay forma de
	// leerlo. Saltearlo no servía —el lote siguiente se pide desde el principio
	// con verified=false, así que volvía a salir—; hay que apartarlo. No se
	// descarta: es un captcha real y puede servir con un modelo mejor.
	const marcarIlegible = useCallback(async () => {
		if (!actual) return;
		setGuardando(true);
		setError(null);
		try {
			await CaptchaDatasetService.illegible(actual.file, "no se lee");
			setPendientesTotal((n) => Math.max(0, n - 1));
			await avanzar();
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo marcar como ilegible");
		} finally {
			setGuardando(false);
		}
	}, [actual, avanzar]);

	// Algunas capturas no son captchas: el desafío venció entre que se abrió y
	// se tomó la imagen, y muestran "desafío expirado". Saltear no alcanza,
	// porque vuelven a salir en el próximo lote: hay que sacarlas del dataset.
	const descartar = useCallback(async () => {
		if (!actual) return;
		setGuardando(true);
		setError(null);
		try {
			await CaptchaDatasetService.discard(actual.file, "no es un captcha");
			setPendientesTotal((n) => Math.max(0, n - 1));
			await avanzar();
		} catch (e: any) {
			setError(e?.response?.data?.message || e?.message || "No se pudo descartar");
		} finally {
			setGuardando(false);
		}
	}, [actual, avanzar]);

	// Al cuarto dígito guarda y avanza solo: es lo que hace que el flujo sea rápido.
	const onChange = (v: string) => {
		const limpio = v.replace(/\D/g, "").slice(0, 4);
		setValor(limpio);
		if (limpio.length === 4) guardar(limpio);
	};

	// Espacio = saltear. Se captura a nivel del diálogo y no solo del input
	// porque el foco puede estar en un botón; ahí el espacio lo activaría, que
	// no es lo que uno espera cuando viene etiquetando a ritmo.
	const onKeyDown = (e: React.KeyboardEvent) => {
		if (guardando) return;
		if (e.key === " ") {
			e.preventDefault();
			avanzar();
			return;
		}
		// "i" de ilegible. El campo filtra todo lo que no sea dígito, así que las
		// letras están libres. Se ata solo ésta y no también el descarte: errarle
		// a la "i" apenas aparta una imagen que igual no se podía etiquetar, pero
		// un descarte accidental la saca del dataset. Yendo rápido, la asimetría
		// importa.
		if (e.key.toLowerCase() === "i") {
			e.preventDefault();
			marcarIlegible();
			return;
		}
		if (e.key.toLowerCase() === "z") {
			e.preventDefault();
			ciclarZoom();
		}
	};

	return (
		<Dialog open={open} onClose={() => onClose(hechas)} fullScreen={esMovil} maxWidth="sm" fullWidth onKeyDown={onKeyDown}>
			<Box sx={{ p: 2.5 }}>
				<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
					<Box>
						<Typography variant="h5">Etiquetado rápido</Typography>
						<Typography variant="caption" color="text.secondary">
							{hechas} etiquetadas · {pendientesTotal} pendientes
						</Typography>
					</Box>
					<IconButton onClick={() => onClose(hechas)} size="large">
						<CloseCircle size={24} />
					</IconButton>
				</Stack>

				{guardando && <LinearProgress sx={{ mb: 1 }} />}
				{error && (
					<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{cargando && !actual ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
						<CircularProgress />
					</Box>
				) : !actual ? (
					<Alert severity="success" sx={{ my: 3 }}>
						No quedan captchas pendientes de etiquetar.
					</Alert>
				) : (
					<Stack spacing={2.5} alignItems="center">
						<Box sx={{ position: "relative", width: "100%" }}>
							<Box
								ref={visorRef}
								onClick={ciclarZoom}
								sx={{
									width: "100%",
									bgcolor: "grey.100",
									borderRadius: 2,
									p: 1,
									display: "flex",
									alignItems: "center",
									// Ampliada la imagen no entra: se ancla a la izquierda, que es
									// donde están los dígitos, y el resto se recorre con scroll.
									justifyContent: zoom === 1 ? "center" : "flex-start",
									overflowX: zoom === 1 ? "hidden" : "auto",
									minHeight: 120,
									cursor: zoom >= 3 ? "zoom-out" : "zoom-in",
									WebkitOverflowScrolling: "touch",
								}}
							>
								{blob ? (
									// Ampliada: los dígitos son chicos y vienen tachados.
									<img
										src={blob}
										alt="captcha"
										style={{
											width: zoom === 1 ? "100%" : `${420 * zoom}px`,
											maxWidth: zoom === 1 ? 420 : "none",
											flexShrink: 0,
											// Sin interpolación, a propósito: se ven los píxeles tal
											// cual son. Suavizar al ampliar inventa trazos donde no
											// los hay, que es justo lo que no querés cuando estás
											// decidiendo si eso es un 3 o un 8.
											imageRendering: "pixelated",
										}}
									/>
								) : (
									<CircularProgress size={28} />
								)}
							</Box>
							{blob && (
								<IconButton
									onClick={(e) => {
										e.stopPropagation();
										ciclarZoom();
									}}
									size="small"
									title={`Lupa ${zoom}x (Z)`}
									sx={{
										position: "absolute",
										top: 4,
										right: 4,
										bgcolor: "background.paper",
										boxShadow: 1,
										"&:hover": { bgcolor: "background.paper" },
									}}
								>
									{zoom >= 3 ? <SearchZoomOut size={18} /> : <SearchZoomIn size={18} />}
								</IconButton>
							)}
							{zoom > 1 && (
								<Typography
									variant="caption"
									sx={{
										position: "absolute",
										bottom: 6,
										right: 8,
										bgcolor: "background.paper",
										px: 0.75,
										borderRadius: 1,
										boxShadow: 1,
									}}
								>
									{zoom}x
								</Typography>
							)}
						</Box>

						<TextField
							inputRef={inputRef}
							value={valor}
							onChange={(e) => onChange(e.target.value)}
							placeholder="0000"
							disabled={guardando}
							// El teclado numérico del móvil aparece con esto.
							inputProps={{
								inputMode: "numeric",
								pattern: "[0-9]*",
								maxLength: 4,
								style: { fontSize: 40, textAlign: "center", letterSpacing: 12, fontFamily: "monospace" },
							}}
							sx={{ width: 220 }}
							autoFocus
						/>

						<Typography variant="caption" color="text.secondary" align="center">
							Escribí los 4 dígitos: guarda y pasa al siguiente automáticamente.
							{" "}Espacio para saltear · <b>I</b> si no se lee · <b>Z</b> o tocar la imagen para la lupa.
							{actual.label ? ` El proveedor había leído "${actual.label}" y el PJN lo rechazó.` : ""}
						</Typography>

						<Stack direction={esMovil ? "column" : "row"} spacing={1.5} sx={{ width: "100%" }}>
							<Button
								variant="outlined"
								fullWidth
								endIcon={<ArrowRight size={18} />}
								onClick={avanzar}
								disabled={guardando}
								size="large"
							>
								Saltear
							</Button>
							<Button
								variant="outlined"
								color="warning"
								fullWidth
								startIcon={<Eye size={18} />}
								onClick={marcarIlegible}
								disabled={guardando}
								size="large"
							>
								No se lee (I)
							</Button>
							<Button
								variant="outlined"
								color="error"
								fullWidth
								startIcon={<Trash size={18} />}
								onClick={descartar}
								disabled={guardando}
								size="large"
							>
								No es un captcha
							</Button>
						</Stack>
					</Stack>
				)}
			</Box>
		</Dialog>
	);
};

export default CaptchaLabelingMode;
