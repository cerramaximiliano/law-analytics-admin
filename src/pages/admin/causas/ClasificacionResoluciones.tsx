import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Alert,
	Box,
	Button,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	FormControlLabel,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
	alpha,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { Add, ArrowDown2, ArrowRight2, Copy, Refresh, TickCircle, CloseCircle, Eye, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import ResolucionesClasificacionService, {
	Anotacion,
	FiltrosCola,
	ItemResolucion,
	MovimientoCausa,
	ORDENA_OPCIONES,
	Ordena,
	Stats,
	TIPOS,
	TipoResolucion,
} from "api/resolucionesClasificacion";

// Clasificación ligera de resoluciones para el clasificador de plazos.
// El operador ve el texto (encabezado + parte dispositiva resaltada), la
// predicción del modelo y elige: tipo (1–7), regula honorarios (H), ordena
// traslado/vista/intimación (T/V/I). Enter guarda y trae el siguiente.

const FUEROS = ["CNT", "CSS", "CIV", "COM", "CAF", "CCF"];
const FUENTES: { value: string; label: string }[] = [
	{ value: "oof", label: "Desacuerdo modelo/gold" },
	{ value: "baja_confianza", label: "Baja confianza" },
	{ value: "manual", label: "Manual" },
	{ value: "cedula", label: "Cédula" },
];
// Criterio aprobado 2026-10-14 (pjn-clasificador-resoluciones/docs/CRITERIO-TIPO.md y GUIA-OPERADOR.md).
// El contenido manda sobre la forma: ¿decide algo discutido o que exige fundamentos? → interlocutoria.
// Principios dictados por el usuario el 2026-10-15 (docs/CRITERIO-TIPO.md § Principios del operador).
const PRINCIPIOS: string[] = [
	"El contenido manda sobre el título y el encabezado: un «AUTOS Y VISTOS» puede ser providencia simple; un despacho corrido puede ser interlocutoria.",
	"Solo actos nuevos: T / V / H / I se marcan si esta resolución los dispone, no si menciona, reitera o da por cumplido uno anterior.",
	"Leer la resolución completa: si hay varias decisiones, el tipo es el de la predominante por su efecto jurídico.",
	"Obligación ≠ intimación: hay intimación cuando se exige a una parte una conducta en un plazo o bajo apercibimiento; una orden genérica no es I.",
	"Tipo y acciones son independientes: una providencia simple puede correr traslado, dar vista o intimar sin volverse interlocutoria.",
];
const CRITERIO: [string, string][] = [
	["Rechaza revocatoria (aunque conceda apelación en subsidio)", "2 Interlocutoria"],
	["Concede apelación / eleva, sin decidir nada más", "1 Providencia"],
	["Deniega apelación, declara desierto o mal concedido", "2 Interlocutoria"],
	["Declara incompetencia, rechaza conexidad", "2 Interlocutoria"],
	["Regula honorarios, en cualquier formato", "2 Interlocutoria + H"],
	["Aprueba liquidación sin impugnación", "1 Providencia"],
	["Resuelve impugnación de liquidación", "2 Interlocutoria"],
	["Decreta embargo o cautelar sin oír a la otra parte", "1 Providencia"],
	["Levanta / sustituye / rechaza cautelar tras traslado", "2 Interlocutoria"],
	["Apertura a prueba ordinaria", "1 Providencia"],
	["Apertura a prueba que resuelve oposiciones; negligencia", "2 Interlocutoria"],
	["Acepta desistimiento, concede aclaratoria, decreta rebeldía", "1 Providencia"],
	["Rechaza una aclaratoria o cualquier planteo", "2 Interlocutoria"],
	["Despacho mixto (trámite + una decisión)", "la clase de la decisión"],
	["Constancia, certificación, cédula, oficio, escrito de parte", "7 No es resolución"],
	["Acta de audiencia", "5 Acta"],
];
const ESTADO_COLOR: Record<string, "default" | "info" | "error"> = { pendiente: "default", anotada: "info", descartada: "error" };
const tipoLabel = (v?: string | null) => (v === "otra" ? "Otra / no resolución" : TIPOS.find((t) => t.value === v)?.label || v || "—");
const esTipoValido = (v?: string | null): v is TipoResolucion => TIPOS.some((t) => t.value === v);
const confColor = (c?: number | null): "success" | "warning" | "error" | "default" =>
	c == null ? "default" : c >= 0.8 ? "success" : c >= 0.6 ? "warning" : "error";
const pct = (x?: number | null) => (x == null ? "—" : `${Math.round(x * 100)} %`);
const fmtFecha = (d?: string | null) => {
	if (!d) return "—";
	const t = new Date(d);
	return isNaN(t.getTime()) ? d : t.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const esCampoDeTexto = (el: EventTarget | null) => {
	const t = el as HTMLElement | null;
	return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
};

// ── Panel de anotación ───────────────────────────────────────────────────────
function PanelAnotacion({
	item,
	onGuardado,
	onSiguiente,
	cargando,
	mobile = false,
}: {
	item: ItemResolucion | null;
	onGuardado: (actualizado: ItemResolucion, avanzar: boolean) => void;
	onSiguiente: () => void;
	cargando: boolean;
	mobile?: boolean;
}) {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [tipo, setTipo] = useState<TipoResolucion | null>(null);
	const [hon, setHon] = useState(false);
	const [ordena, setOrdena] = useState<Ordena[]>([]);
	const [notas, setNotas] = useState("");
	const [guardando, setGuardando] = useState(false);
	const [completo, setCompleto] = useState<string | null>(null);

	// Borrador: la anotación previa si existe; si no, la predicción del modelo como punto de partida.
	useEffect(() => {
		setCompleto(null);
		if (!item) return;
		const a = item.anotacion;
		const p = item.prediccion;
		setTipo(esTipoValido(a?.tipoResolucion) ? a!.tipoResolucion! : esTipoValido(p?.tipo) ? (p!.tipo as TipoResolucion) : null);
		setHon(a?.regulaHonorarios ?? p?.regulaHonorarios?.valor ?? false);
		setOrdena(
			a?.ordena ??
				(p?.ordena
					? (Object.entries(p.ordena)
							.filter(([, v]) => v >= 0.5)
							.map(([k]) => k) as Ordena[])
					: []),
		);
		setNotas(a?.notas || "");
	}, [item?._id]); // eslint-disable-line react-hooks/exhaustive-deps

	const guardar = useCallback(
		async (descartar = false) => {
			if (!item || guardando) return;
			if (!descartar && !tipo) {
				enqueueSnackbar("Elegí el tipo de resolución (teclas 1–7)", { variant: "warning" });
				return;
			}
			setGuardando(true);
			try {
				const payload: Anotacion & { descartar?: boolean } = descartar
					? { descartar: true, notas }
					: { tipoResolucion: tipo!, regulaHonorarios: hon, ordena, notas };
				const r = await ResolucionesClasificacionService.anotar(item._id, payload);
				onGuardado(r.item, true);
			} catch (e: any) {
				enqueueSnackbar(e?.response?.data?.message || e.message || "No se pudo guardar", { variant: "error" });
			} finally {
				setGuardando(false);
			}
		},
		[item, guardando, tipo, hon, ordena, notas, enqueueSnackbar, onGuardado],
	);

	const reabrir = async () => {
		if (!item) return;
		try {
			const r = await ResolucionesClasificacionService.anotar(item._id, { reabrir: true });
			onGuardado(r.item, false);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		}
	};

	const verCompleto = async () => {
		if (!item) return;
		try {
			const r = await ResolucionesClasificacionService.getUno(item._id, true);
			setCompleto(r.item.cuerpo?.completo || "");
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		}
	};

	// Atajos de teclado (fuera de inputs): 1–7 tipo, H honorarios, T/V/I ordena, Enter guardar, D descartar, N / → siguiente.
	useEffect(() => {
		const h = (ev: KeyboardEvent) => {
			if (!item || esCampoDeTexto(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
			const k = ev.key.toLowerCase();
			const t = TIPOS.find((x) => x.tecla === k);
			if (t) {
				setTipo(t.value);
				ev.preventDefault();
				return;
			}
			if (k === "h") {
				setHon((v) => !v);
				ev.preventDefault();
				return;
			}
			const o = ORDENA_OPCIONES.find((x) => x.tecla.toLowerCase() === k);
			if (o) {
				setOrdena((v) => (v.includes(o.value) ? v.filter((x) => x !== o.value) : [...v, o.value]));
				ev.preventDefault();
				return;
			}
			if (ev.key === "Enter") {
				ev.preventDefault();
				void guardar(false);
				return;
			}
			if (k === "d") {
				ev.preventDefault();
				void guardar(true);
				return;
			}
			if (k === "n" || ev.key === "ArrowRight") {
				ev.preventDefault();
				onSiguiente();
			}
		};
		window.addEventListener("keydown", h);
		return () => window.removeEventListener("keydown", h);
	}, [item, guardar, onSiguiente]);

	if (cargando)
		return (
			<Box sx={{ p: 6, textAlign: "center" }}>
				<CircularProgress size={28} />
			</Box>
		);
	if (!item) {
		return (
			<Box sx={{ p: 6, textAlign: "center" }}>
				<Typography color="text.secondary">Elegí una resolución de la lista o pulsá «Siguiente pendiente».</Typography>
			</Box>
		);
	}
	const c = item.cuerpo;
	const p = item.prediccion;
	// Copia lo que se está mostrando: el documento completo si se expandió; si no, encabezado + dispositiva (o el texto plano).
	const textoVisible =
		completo !== null
			? completo
			: c?.tieneDispositiva
			? [c.encabezado, c.dispositiva].filter(Boolean).join("\n\n")
			: [c?.completo || c?.encabezado, c?.colaTexto].filter(Boolean).join("\n\n");
	const copiar = async () => {
		try {
			await navigator.clipboard.writeText(textoVisible || "");
			enqueueSnackbar("Texto copiado", { variant: "success", autoHideDuration: 1500 });
		} catch {
			enqueueSnackbar("No se pudo copiar", { variant: "error" });
		}
	};
	const desacuerdoGold = item.gold?.tipoResolucion && p?.tipo && item.gold.tipoResolucion !== p.tipo;
	const monoSx = {
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
		fontSize: mobile ? 13 : 12.5,
		wordBreak: "break-word" as const,
		whiteSpace: "pre-wrap" as const,
		lineHeight: 1.45,
	};

	return (
		<Stack spacing={1.5}>
			{/* Meta */}
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Chip size="small" label={item.fuero} color="primary" variant="outlined" />
				<Typography variant="subtitle2">{item.number ? `${item.number}/${item.year}` : item.causaId}</Typography>
				<Typography variant="body2" color="text.secondary">
					{fmtFecha(item.fecha)} · mov. {item.idx}
				</Typography>
				<Chip size="small" label={FUENTES.find((f) => f.value === item.fuente)?.label || item.fuente} variant="outlined" />
				<Chip size="small" label={item.estado} color={ESTADO_COLOR[item.estado]} />
				{item.anotadoPor && (
					<Typography variant="caption" color="text.secondary">
						{item.anotadoPor} · {fmtFecha(item.anotadoAt)}
					</Typography>
				)}
			</Stack>
			<Typography variant="body2" sx={{ fontWeight: 600 }}>
				{item.titulo}
			</Typography>
			{(item.caratula || item.objeto) && (
				<Typography variant="caption" color="text.secondary">
					{item.caratula || ""}
					{item.caratula && item.objeto ? " · " : ""}
					{item.objeto || ""}
				</Typography>
			)}
			<Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 2 }}>
				<Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
					<b>Anterior:</b> {item.previo || "—"}
				</Typography>
				<Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
					<b>Siguiente:</b> {item.siguiente || "—"}
				</Typography>
			</Stack>

			{/* Predicción / gold */}
			{(p || item.gold) && (
				<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
					{p && (
						<>
							<Typography variant="caption" color="text.secondary">
								Modelo {p.version}:
							</Typography>
							<Chip size="small" label={`${tipoLabel(p.tipo)} · ${pct(p.confianza)}`} color={confColor(p.confianza)} />
							{p.regulaHonorarios && <Chip size="small" variant="outlined" label={`honorarios ${pct(p.regulaHonorarios.p)}`} />}
							{p.ordena &&
								Object.entries(p.ordena)
									.filter(([, v]) => v >= 0.3)
									.map(([k, v]) => <Chip key={k} size="small" variant="outlined" label={`${k} ${pct(v)}`} />)}
						</>
					)}
					{item.gold?.tipoResolucion && (
						<Tooltip title="Etiqueta previa del gold de etapas (puede estar mal: por eso está en la cola)">
							<Chip
								size="small"
								variant="outlined"
								color={desacuerdoGold ? "warning" : "default"}
								label={`gold: ${tipoLabel(item.gold.tipoResolucion)}`}
							/>
						</Tooltip>
					)}
				</Stack>
			)}

			{/* Texto */}
			<Box
				sx={{
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: 1,
					p: 1.5,
					maxHeight: mobile ? "40vh" : 420,
					overflow: "auto",
					bgcolor: alpha(theme.palette.background.default, 0.6),
				}}
			>
				{completo !== null ? (
					<Typography component="div" sx={monoSx}>
						{completo || "(sin texto)"}
					</Typography>
				) : c?.tieneDispositiva ? (
					<>
						{c.encabezado && (
							<Typography component="div" sx={{ ...monoSx, color: "text.secondary" }}>
								{c.encabezado}
							</Typography>
						)}
						<Box
							sx={{ mt: 1, p: 1, borderLeft: `3px solid ${theme.palette.primary.main}`, bgcolor: alpha(theme.palette.primary.main, 0.06) }}
						>
							<Typography component="div" sx={monoSx}>
								{c.dispositiva}
							</Typography>
						</Box>
					</>
				) : (
					<>
						<Typography component="div" sx={monoSx}>
							{c?.completo || c?.encabezado || "(sin texto)"}
						</Typography>
						{c?.colaTexto && (
							<Typography component="div" sx={{ ...monoSx, mt: 1 }}>
								{c.colaTexto}
							</Typography>
						)}
					</>
				)}
			</Box>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				<Typography variant="caption" color="text.secondary">
					{(c?.caracteres ?? item.chars ?? 0).toLocaleString("es-AR")} caracteres{item.textoFuente ? ` · ${item.textoFuente}` : ""}
				</Typography>
				<Button size="small" startIcon={<Copy size={14} />} onClick={copiar} disabled={!textoVisible}>
					Copiar texto
				</Button>
				{completo === null && (c?.tieneDispositiva || c?.colaTexto) && (
					<Button size="small" startIcon={<Eye size={14} />} onClick={verCompleto}>
						Ver documento completo
					</Button>
				)}
				{item.url && (
					<Button size="small" href={item.url} target="_blank" rel="noreferrer">
						Abrir PDF
					</Button>
				)}
			</Stack>

			<Divider />

			{/* Anotación */}
			<Typography variant="subtitle2">
				Tipo de resolución{" "}
				<Typography component="span" variant="caption" color="text.secondary">
					(teclas 1–7)
				</Typography>
			</Typography>
			{mobile ? (
				<Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
					{TIPOS.map((t) => (
						<Button
							key={t.value}
							variant={tipo === t.value ? "contained" : "outlined"}
							onClick={() => setTipo(t.value)}
							sx={{ minHeight: 48, textTransform: "none", justifyContent: "flex-start", textAlign: "left", lineHeight: 1.2 }}
						>
							<Box component="span" sx={{ mr: 1, fontWeight: 700 }}>
								{t.tecla}
							</Box>
							{t.label}
						</Button>
					))}
				</Box>
			) : (
				<ToggleButtonGroup
					size="small"
					exclusive
					value={tipo}
					onChange={(_, v) => v && setTipo(v)}
					sx={{ flexWrap: "wrap", gap: 0.5, "& .MuiToggleButton-root": { textTransform: "none", px: 1.25 } }}
				>
					{TIPOS.map((t) => (
						<Tooltip key={t.value} title={t.ayuda} placement="top">
							<ToggleButton value={t.value}>
								<Box
									component="span"
									sx={{ mr: 0.75, fontSize: 10, px: 0.5, borderRadius: 0.5, bgcolor: alpha(theme.palette.text.primary, 0.08) }}
								>
									{t.tecla}
								</Box>
								{t.label}
							</ToggleButton>
						</Tooltip>
					))}
				</ToggleButtonGroup>
			)}
			{mobile ? (
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					<Chip
						label="Regula honorarios"
						color={hon ? "primary" : "default"}
						variant={hon ? "filled" : "outlined"}
						onClick={() => setHon((v) => !v)}
						sx={{ height: 40, fontSize: 14 }}
					/>
					{ORDENA_OPCIONES.map((o) => {
						const on = ordena.includes(o.value);
						return (
							<Chip
								key={o.value}
								label={o.label}
								color={on ? "primary" : "default"}
								variant={on ? "filled" : "outlined"}
								onClick={() => setOrdena((v) => (on ? v.filter((x) => x !== o.value) : [...v, o.value]))}
								sx={{ height: 40, fontSize: 14 }}
							/>
						);
					})}
				</Stack>
			) : (
				<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
					<FormControlLabel
						control={<Checkbox size="small" checked={hon} onChange={(e) => setHon(e.target.checked)} />}
						label={
							<span>
								Regula honorarios{" "}
								<Typography component="span" variant="caption" color="text.secondary">
									(H)
								</Typography>
							</span>
						}
					/>
					{ORDENA_OPCIONES.map((o) => (
						<FormControlLabel
							key={o.value}
							control={
								<Checkbox
									size="small"
									checked={ordena.includes(o.value)}
									onChange={(e) => setOrdena((v) => (e.target.checked ? [...v, o.value] : v.filter((x) => x !== o.value)))}
								/>
							}
							label={
								<span>
									{o.label}{" "}
									<Typography component="span" variant="caption" color="text.secondary">
										({o.tecla})
									</Typography>
								</span>
							}
						/>
					))}
				</Stack>
			)}
			<TextField
				size="small"
				label="Notas (opcional)"
				value={notas}
				onChange={(e) => setNotas(e.target.value)}
				multiline
				minRows={1}
				maxRows={3}
				fullWidth
			/>
			{mobile ? (
				<Box
					sx={{
						position: "sticky",
						bottom: 0,
						zIndex: 2,
						mx: -2,
						px: 2,
						py: 1,
						bgcolor: "background.paper",
						borderTop: `1px solid ${theme.palette.divider}`,
						pb: "calc(8px + env(safe-area-inset-bottom))",
					}}
				>
					<Stack direction="row" spacing={1}>
						<Button
							fullWidth
							variant="contained"
							size="large"
							startIcon={<TickCircle size={18} />}
							disabled={guardando || !tipo}
							onClick={() => guardar(false)}
						>
							Guardar
						</Button>
						<Button color="error" variant="outlined" size="large" disabled={guardando} onClick={() => guardar(true)}>
							<CloseCircle size={18} />
						</Button>
						<Button variant="outlined" size="large" onClick={onSiguiente}>
							<ArrowRight2 size={18} />
						</Button>
					</Stack>
					{item.estado !== "pendiente" && (
						<Button fullWidth variant="text" size="small" onClick={reabrir} sx={{ mt: 0.5 }}>
							Reabrir
						</Button>
					)}
				</Box>
			) : (
				<Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
					<Stack direction="row" spacing={1}>
						<Button variant="contained" startIcon={<TickCircle size={16} />} disabled={guardando || !tipo} onClick={() => guardar(false)}>
							Guardar y siguiente{" "}
							<Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.8 }}>
								Enter
							</Typography>
						</Button>
						<Button
							color="error"
							variant="outlined"
							startIcon={<CloseCircle size={16} />}
							disabled={guardando}
							onClick={() => guardar(true)}
						>
							Descartar{" "}
							<Typography component="span" variant="caption" sx={{ ml: 0.75, opacity: 0.8 }}>
								D
							</Typography>
						</Button>
						{item.estado !== "pendiente" && (
							<Button variant="text" onClick={reabrir}>
								Reabrir
							</Button>
						)}
					</Stack>
					<Button variant="text" endIcon={<ArrowRight2 size={16} />} onClick={onSiguiente}>
						Saltar{" "}
						<Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
							N
						</Typography>
					</Button>
				</Stack>
			)}
		</Stack>
	);
}

// ── Diálogo de alta manual ──────────────────────────────────────────────────
function DialogoAgregar({ abierto, onCerrar, onAgregado }: { abierto: boolean; onCerrar: () => void; onAgregado: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [fuero, setFuero] = useState("CNT");
	const [causaId, setCausaId] = useState("");
	const [movs, setMovs] = useState<MovimientoCausa[] | null>(null);
	const [causa, setCausa] = useState<{ caratula?: string; objeto?: string; number?: number; year?: number } | null>(null);
	const [sel, setSel] = useState<number[]>([]);
	const [cargando, setCargando] = useState(false);
	const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));

	const cargar = async () => {
		if (!/^[0-9a-f]{24}$/i.test(causaId.trim())) {
			enqueueSnackbar("Pegá el _id de la causa (24 hex)", { variant: "warning" });
			return;
		}
		setCargando(true);
		try {
			const r = await ResolucionesClasificacionService.getMovimientos(fuero, causaId.trim());
			setMovs(r.movimientos);
			setCausa(r.causa);
			setSel([]);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setCargando(false);
		}
	};
	const agregar = async (todos = false) => {
		setCargando(true);
		try {
			const r = await ResolucionesClasificacionService.agregar({
				fuero,
				causaId: causaId.trim(),
				...(todos ? { todos: true } : { idxs: sel }),
			});
			const fallas = r.resultados.filter((x) => !x.ok);
			enqueueSnackbar(
				`${r.agregados} agregados${
					fallas.length
						? ` · ${fallas.length} no: ${fallas
								.slice(0, 3)
								.map((f) => `#${f.idx} ${f.motivo}`)
								.join("; ")}`
						: ""
				}`,
				{ variant: r.agregados ? "success" : "warning" },
			);
			if (r.agregados) {
				onAgregado();
				await cargar();
			}
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setCargando(false);
		}
	};
	return (
		<Dialog open={abierto} onClose={onCerrar} maxWidth="md" fullWidth fullScreen={fullScreen}>
			<DialogTitle>Agregar resoluciones a la cola</DialogTitle>
			<DialogContent>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
					<FormControl size="small" sx={{ minWidth: 110 }}>
						<InputLabel>Fuero</InputLabel>
						<Select label="Fuero" value={fuero} onChange={(e) => setFuero(e.target.value)}>
							{FUEROS.map((f) => (
								<MenuItem key={f} value={f}>
									{f}
								</MenuItem>
							))}
						</Select>
					</FormControl>
					<TextField
						size="small"
						label="_id de la causa"
						value={causaId}
						onChange={(e) => setCausaId(e.target.value)}
						fullWidth
						onKeyDown={(e) => e.key === "Enter" && cargar()}
					/>
					<Button variant="outlined" onClick={cargar} disabled={cargando}>
						Cargar
					</Button>
				</Stack>
				{causa && (
					<Typography variant="body2" sx={{ mt: 1.5 }}>
						<b>
							{causa.number}/{causa.year}
						</b>{" "}
						· {causa.caratula} · {causa.objeto}
					</Typography>
				)}
				{movs && (
					<TableContainer sx={{ mt: 1, maxHeight: fullScreen ? "60vh" : 380 }}>
						<Table size="small" stickyHeader>
							<TableHead>
								<TableRow>
									<TableCell padding="checkbox" />
									<TableCell>#</TableCell>
									<TableCell>Fecha</TableCell>
									<TableCell>Movimiento</TableCell>
									<TableCell>Estado</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{movs.map((m) => (
									<TableRow key={m.idx} hover sx={{ opacity: m.tieneDoc ? 1 : 0.5 }}>
										<TableCell padding="checkbox">
											<Checkbox
												size="small"
												disabled={!m.tieneDoc || !!m.enCola}
												checked={sel.includes(m.idx)}
												onChange={(e) => setSel((v) => (e.target.checked ? [...v, m.idx] : v.filter((x) => x !== m.idx)))}
											/>
										</TableCell>
										<TableCell>{m.idx}</TableCell>
										<TableCell>{fmtFecha(m.fecha)}</TableCell>
										<TableCell>
											<Typography variant="caption">
												{m.tipo} | {m.detalle}
											</Typography>
										</TableCell>
										<TableCell>
											{m.enCola ? (
												<Chip size="small" label={m.enCola} color={ESTADO_COLOR[m.enCola]} />
											) : !m.tieneDoc ? (
												<Typography variant="caption" color="text.secondary">
													sin doc
												</Typography>
											) : !m.judicial ? (
												<Typography variant="caption" color="text.secondary">
													escrito/cédula
												</Typography>
											) : null}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onCerrar}>Cerrar</Button>
				{movs && (
					<Button onClick={() => agregar(true)} disabled={cargando}>
						Agregar todos los judiciales
					</Button>
				)}
				<Button variant="contained" onClick={() => agregar(false)} disabled={cargando || !sel.length}>
					Agregar {sel.length ? `(${sel.length})` : ""}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ── Página ──────────────────────────────────────────────────────────────────
const ClasificacionResoluciones = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [items, setItems] = useState<ItemResolucion[]>([]);
	const [total, setTotal] = useState(0);
	const [porEstado, setPorEstado] = useState<Record<string, number>>({});
	const [stats, setStats] = useState<Stats | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);
	const [filtros, setFiltros] = useState<FiltrosCola>({ estado: "pendiente", orden: "confianza" });
	const [q, setQ] = useState("");
	const [sel, setSel] = useState<ItemResolucion | null>(null);
	const [cargandoSel, setCargandoSel] = useState(false);
	const [dialogo, setDialogo] = useState(false);
	const mobile = useMediaQuery(theme.breakpoints.down("md"));
	const [vista, setVista] = useState<"etiquetar" | "cola">("etiquetar");
	const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

	const params = useMemo(() => ({ ...filtros, q: q || undefined }), [filtros, q]);

	const cargar = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const d = await ResolucionesClasificacionService.getCola({ ...params, page, limit: rowsPerPage });
			setItems(d.items);
			setTotal(d.total);
			setPorEstado(d.porEstado || {});
		} catch (e: any) {
			setError(e?.response?.data?.message || e.message || "Error al cargar");
		} finally {
			setLoading(false);
		}
	}, [params, page, rowsPerPage]);
	const cargarStats = useCallback(async () => {
		try {
			setStats(await ResolucionesClasificacionService.getStats());
		} catch {
			/* informativo */
		}
	}, []);
	useEffect(() => {
		void cargar();
	}, [cargar]);
	useEffect(() => {
		void cargarStats();
	}, [cargarStats]);

	const abrir = async (id: string) => {
		setCargandoSel(true);
		try {
			setSel((await ResolucionesClasificacionService.getUno(id)).item);
			setVista("etiquetar");
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setCargandoSel(false);
		}
	};
	const siguiente = useCallback(async () => {
		setCargandoSel(true);
		try {
			const r = await ResolucionesClasificacionService.getSiguiente({ ...params, excluir: sel?._id });
			if (!r.item) enqueueSnackbar("No quedan pendientes con estos filtros", { variant: "info" });
			setSel(r.item);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || e.message, { variant: "error" });
		} finally {
			setCargandoSel(false);
		}
	}, [params, sel?._id, enqueueSnackbar]);
	// En mobile se entra directo a etiquetar: trae el primer pendiente al abrir la vista.
	useEffect(() => {
		if (mobile && !sel) void siguiente();
	}, [mobile]); // eslint-disable-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (mobile) window.scrollTo({ top: 0 });
	}, [mobile, sel?._id]);
	const onGuardado = useCallback(
		(actualizado: ItemResolucion, avanzar: boolean) => {
			setItems((xs) => xs.map((x) => (x._id === actualizado._id ? { ...x, ...actualizado } : x)));
			setPorEstado((pe) => {
				const prev = sel?.estado,
					next = actualizado.estado;
				if (!prev || prev === next) return pe;
				return { ...pe, [prev]: Math.max(0, (pe[prev] || 0) - 1), [next]: (pe[next] || 0) + 1 };
			});
			if (avanzar) void siguiente();
			else setSel((s) => (s ? { ...s, ...actualizado, cuerpo: s.cuerpo } : s));
		},
		[sel?.estado, siguiente],
	);

	const setF = (k: keyof FiltrosCola, v: string) => {
		setPage(0);
		setFiltros((f) => ({ ...f, [k]: v === "todos" ? undefined : v }));
	};
	const acuerdo = stats?.acuerdo;

	return (
		<MainCard
			title="Clasificación de resoluciones"
			secondary={
				<Stack direction="row" spacing={1}>
					<Button size="small" variant="outlined" startIcon={<Add size={16} />} onClick={() => setDialogo(true)}>
						Agregar
					</Button>
					{!mobile && (
						<Button size="small" variant="contained" endIcon={<ArrowRight2 size={16} />} onClick={siguiente}>
							Siguiente pendiente
						</Button>
					)}
					<IconButton
						size="small"
						onClick={() => {
							void cargar();
							void cargarStats();
						}}
					>
						<Refresh size={18} />
					</IconButton>
				</Stack>
			}
		>
			<Stack spacing={2}>
				<Typography variant="body2" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
					Cola de revisión para el clasificador de plazos: el modelo marca el tipo de cada resolución y acá se confirma o corrige. Entran
					los casos de baja confianza, los desacuerdos con el gold anterior y las altas manuales. Cada confirmación es un ejemplo de
					entrenamiento.
				</Typography>
				<Accordion
					disableGutters
					elevation={0}
					sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 1, "&:before": { display: "none" } }}
				>
					<AccordionSummary expandIcon={<ArrowDown2 size={16} />}>
						<Typography variant="subtitle2">Criterio de anotación (aprobado 14/10/2026, principios 15/10) y atajos de teclado</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							<Grid item xs={12} md={7}>
								<Typography variant="body2" sx={{ mb: 1 }}>
									<b>El contenido manda sobre la forma.</b> ¿Decide algo que fue discutido o que la ley exige resolver con fundamentos? →
									interlocutoria, aunque esté redactada como despacho corrido. ¿Solo mueve el trámite o concede lo pedido sin contradictor?
									→ providencia simple, aunque diga «RESUELVO». Leé la parte dispositiva (recuadro resaltado) y los movimientos
									anterior/siguiente; no copies por inercia ni al modelo ni a la etiqueta previa.
								</Typography>
								<Typography variant="body2" sx={{ mb: 0.5 }}>
									<b>Principios</b> (15/10/2026)
								</Typography>
								<Typography variant="caption" component="div" sx={{ mb: 1 }}>
									{PRINCIPIOS.map((p, i) => (
										<div key={i}>
											{i + 1}. {p}
										</div>
									))}
								</Typography>
								<Table size="small">
									<TableBody>
										{CRITERIO.map(([caso, clase]) => (
											<TableRow key={caso}>
												<TableCell sx={{ py: 0.25 }}>
													<Typography variant="caption">{caso}</Typography>
												</TableCell>
												<TableCell sx={{ py: 0.25, whiteSpace: "nowrap" }}>
													<Typography variant="caption" sx={{ fontWeight: 600 }}>
														{clase}
													</Typography>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</Grid>
							<Grid item xs={12} md={5}>
								<Typography variant="body2" sx={{ mb: 1 }}>
									<b>Atajos</b> (con el panel abierto, fuera de los campos de texto)
								</Typography>
								<Typography variant="caption" component="div">
									1–7 tipo de resolución · H regula honorarios · T corre traslado · V da vista · I intima
								</Typography>
								<Typography variant="caption" component="div">
									Enter guarda y trae el siguiente · D descarta (texto roto, repetido) · N salta sin guardar
								</Typography>
								<Typography variant="body2" sx={{ mt: 1.5, mb: 0.5 }}>
									<b>Ordena</b>
								</Typography>
								<Typography variant="caption" component="div">
									Marcar solo lo que esta resolución ordena a una parte. No las fórmulas de rutina («notifíquese», «líbrese oficio»). Una
									interlocutoria también puede ordenar: marcar ambas cosas. Y una providencia simple que intima o corre traslado sigue siendo
									providencia simple.
								</Typography>
								<Typography variant="body2" sx={{ mt: 1.5, mb: 0.5 }}>
									<b>Dudas</b>
								</Typography>
								<Typography variant="caption" component="div">
									Anotar igual y dejar una nota corta: se revisan juntas antes de reentrenar.
								</Typography>
							</Grid>
						</Grid>
					</AccordionDetails>
				</Accordion>
				<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
					<Chip label={`Pendientes ${porEstado.pendiente || 0}`} color="default" />
					<Chip label={`Anotadas ${porEstado.anotada || 0}`} color="info" variant="outlined" />
					<Chip label={`Descartadas ${porEstado.descartada || 0}`} color="error" variant="outlined" />
					{acuerdo && acuerdo.anotadas > 0 && (
						<Tooltip
							title={`Sobre ${acuerdo.anotadas} anotadas con predicción. Prov. simple tomada como interlocutoria: ${acuerdo.parCaro.ps_como_interlocutoria} · interlocutoria tomada como prov. simple: ${acuerdo.parCaro.interlocutoria_como_ps}`}
						>
							<Chip
								label={`Acuerdo modelo/operador ${acuerdo.pct} %`}
								color={acuerdo.pct != null && acuerdo.pct >= 90 ? "success" : "warning"}
								variant="outlined"
							/>
						</Tooltip>
					)}
					{stats?.versiones?.length ? <Chip label={`Modelo: ${stats.versiones.join(", ")}`} variant="outlined" /> : null}
				</Stack>

				{mobile && (
					<ToggleButtonGroup
						exclusive
						fullWidth
						value={vista}
						onChange={(_, v) => v && setVista(v)}
						sx={{ "& .MuiToggleButton-root": { textTransform: "none", minHeight: 44 } }}
					>
						<ToggleButton value="etiquetar">Etiquetar</ToggleButton>
						<ToggleButton value="cola">Cola ({total})</ToggleButton>
					</ToggleButtonGroup>
				)}

				<Grid container spacing={2}>
					<Grid item xs={12} md={5} sx={{ display: mobile && vista !== "cola" ? "none" : "block" }}>
						{mobile && (
							<Button fullWidth variant="outlined" size="small" onClick={() => setFiltrosAbiertos((v) => !v)} sx={{ mb: 1 }}>
								{filtrosAbiertos ? "Ocultar filtros" : "Filtros y búsqueda"}
							</Button>
						)}
						<Stack
							direction="row"
							spacing={1}
							flexWrap="wrap"
							useFlexGap
							sx={{
								mb: 1,
								display: mobile && !filtrosAbiertos ? "none" : "flex",
								"& .MuiFormControl-root, & .MuiTextField-root": { minWidth: { xs: "calc(50% - 4px)", md: undefined } },
							}}
						>
							<FormControl size="small" sx={{ minWidth: 120 }}>
								<InputLabel>Estado</InputLabel>
								<Select label="Estado" value={filtros.estado || "todos"} onChange={(e) => setF("estado", e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									<MenuItem value="pendiente">Pendientes</MenuItem>
									<MenuItem value="anotada">Anotadas</MenuItem>
									<MenuItem value="descartada">Descartadas</MenuItem>
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 90 }}>
								<InputLabel>Fuero</InputLabel>
								<Select label="Fuero" value={filtros.fuero || "todos"} onChange={(e) => setF("fuero", e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									{FUEROS.map((f) => (
										<MenuItem key={f} value={f}>
											{f}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 150 }}>
								<InputLabel>Origen</InputLabel>
								<Select label="Origen" value={filtros.fuente || "todos"} onChange={(e) => setF("fuente", e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									{FUENTES.map((f) => (
										<MenuItem key={f.value} value={f.value}>
											{f.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 160 }}>
								<InputLabel>Tipo predicho</InputLabel>
								<Select label="Tipo predicho" value={filtros.tipoPred || "todos"} onChange={(e) => setF("tipoPred", e.target.value)}>
									<MenuItem value="todos">Todos</MenuItem>
									{TIPOS.map((t) => (
										<MenuItem key={t.value} value={t.value}>
											{t.label}
										</MenuItem>
									))}
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 130 }}>
								<InputLabel>Confianza</InputLabel>
								<Select
									label="Confianza"
									value={filtros.confMax ? String(filtros.confMax) : "todos"}
									onChange={(e) => setF("confMax", e.target.value)}
								>
									<MenuItem value="todos">Cualquiera</MenuItem>
									<MenuItem value="0.6">&lt; 60 %</MenuItem>
									<MenuItem value="0.8">&lt; 80 %</MenuItem>
									<MenuItem value="0.95">&lt; 95 %</MenuItem>
								</Select>
							</FormControl>
							<FormControl size="small" sx={{ minWidth: 130 }}>
								<InputLabel>Orden</InputLabel>
								<Select label="Orden" value={filtros.orden || "confianza"} onChange={(e) => setF("orden", e.target.value)}>
									<MenuItem value="confianza">Menor confianza</MenuItem>
									<MenuItem value="reciente">Más recientes</MenuItem>
									<MenuItem value="anotacion">Última anotación</MenuItem>
								</Select>
							</FormControl>
							<TextField
								size="small"
								label="Buscar en título"
								value={q}
								onChange={(e) => {
									setPage(0);
									setQ(e.target.value);
								}}
								sx={{ minWidth: 180 }}
							/>
						</Stack>
						{error && (
							<Alert severity="error" sx={{ mb: 1 }}>
								{error}
							</Alert>
						)}
						{mobile ? (
							<Stack spacing={1}>
								{loading && !items.length ? (
									<Box sx={{ textAlign: "center", p: 2 }}>
										<CircularProgress size={22} />
									</Box>
								) : !items.length ? (
									<Typography variant="body2" color="text.secondary" align="center" sx={{ p: 2 }}>
										Sin resultados
									</Typography>
								) : (
									items.map((it) => (
										<Box
											key={it._id}
											onClick={() => abrir(it._id)}
											sx={{
												p: 1.25,
												borderRadius: 1,
												cursor: "pointer",
												border: `1px solid ${sel?._id === it._id ? theme.palette.primary.main : theme.palette.divider}`,
											}}
										>
											<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
												<Chip size="small" label={it.fuero} variant="outlined" />
												<Typography variant="caption">{fmtFecha(it.fecha)}</Typography>
												<Chip size="small" label={it.estado} color={ESTADO_COLOR[it.estado]} />
												{it.prediccion && (
													<Chip
														size="small"
														label={`${tipoLabel(it.prediccion.tipo)} ${pct(it.prediccion.confianza)}`}
														color={confColor(it.prediccion.confianza)}
													/>
												)}
											</Stack>
											<Typography variant="body2" sx={{ mt: 0.5 }} noWrap>
												{it.titulo}
											</Typography>
											{it.anotacion?.tipoResolucion && (
												<Typography variant="caption" color="info.main">
													→ {tipoLabel(it.anotacion.tipoResolucion)}
												</Typography>
											)}
										</Box>
									))
								)}
							</Stack>
						) : (
							<TableContainer sx={{ maxHeight: 640 }}>
								<Table size="small" stickyHeader>
									<TableHead>
										<TableRow>
											<TableCell>Fuero</TableCell>
											<TableCell>Fecha</TableCell>
											<TableCell>Movimiento</TableCell>
											<TableCell>Modelo</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell />
										</TableRow>
									</TableHead>
									<TableBody>
										{loading && !items.length ? (
											<TableRow>
												<TableCell colSpan={6} align="center">
													<CircularProgress size={22} />
												</TableCell>
											</TableRow>
										) : !items.length ? (
											<TableRow>
												<TableCell colSpan={6} align="center">
													<Typography variant="body2" color="text.secondary">
														Sin resultados
													</Typography>
												</TableCell>
											</TableRow>
										) : (
											items.map((it) => {
												const desac = it.gold?.tipoResolucion && it.prediccion?.tipo && it.gold.tipoResolucion !== it.prediccion.tipo;
												return (
													<TableRow
														key={it._id}
														hover
														selected={sel?._id === it._id}
														sx={{ cursor: "pointer" }}
														onClick={() => abrir(it._id)}
													>
														<TableCell>
															<Chip size="small" label={it.fuero} variant="outlined" />
														</TableCell>
														<TableCell>
															<Typography variant="caption">{fmtFecha(it.fecha)}</Typography>
														</TableCell>
														<TableCell sx={{ maxWidth: 260 }}>
															<Tooltip title={it.titulo}>
																<Typography variant="caption" noWrap component="div" sx={{ maxWidth: 260 }}>
																	{it.titulo}
																</Typography>
															</Tooltip>
															{it.anotacion?.tipoResolucion && (
																<Typography variant="caption" color="info.main">
																	→ {tipoLabel(it.anotacion.tipoResolucion)}
																</Typography>
															)}
														</TableCell>
														<TableCell>
															{it.prediccion ? (
																<Stack direction="row" spacing={0.5} alignItems="center">
																	<Chip
																		size="small"
																		label={`${tipoLabel(it.prediccion.tipo)} ${pct(it.prediccion.confianza)}`}
																		color={confColor(it.prediccion.confianza)}
																		sx={{ fontSize: 11 }}
																	/>
																	{desac && (
																		<Tooltip title={`gold: ${tipoLabel(it.gold?.tipoResolucion)}`}>
																			<Box component="span" sx={{ color: theme.palette.warning.main, fontWeight: 700 }}>
																				≠
																			</Box>
																		</Tooltip>
																	)}
																</Stack>
															) : (
																<Typography variant="caption" color="text.secondary">
																	—
																</Typography>
															)}
														</TableCell>
														<TableCell>
															<Chip size="small" label={it.estado} color={ESTADO_COLOR[it.estado]} />
														</TableCell>
														<TableCell padding="checkbox">
															<Tooltip title="Quitar de la cola">
																<IconButton
																	size="small"
																	onClick={async (e) => {
																		e.stopPropagation();
																		if (!window.confirm("¿Quitar esta resolución de la cola?")) return;
																		await ResolucionesClasificacionService.quitar(it._id);
																		if (sel?._id === it._id) setSel(null);
																		void cargar();
																	}}
																>
																	<Trash size={14} />
																</IconButton>
															</Tooltip>
														</TableCell>
													</TableRow>
												);
											})
										)}
									</TableBody>
								</Table>
							</TableContainer>
						)}
						<EnhancedTablePagination
							rowsPerPageOptions={[10, 25, 50, 100]}
							count={total}
							rowsPerPage={rowsPerPage}
							page={page}
							onPageChange={(_e, p) => setPage(p)}
							onRowsPerPageChange={(e) => {
								setRowsPerPage(parseInt(e.target.value, 10));
								setPage(0);
							}}
						/>
					</Grid>
					<Grid item xs={12} md={7} sx={{ display: mobile && vista !== "etiquetar" ? "none" : "block" }}>
						<Box
							sx={{
								border: mobile ? "none" : `1px solid ${theme.palette.divider}`,
								borderRadius: 1.5,
								p: mobile ? 0 : 2,
								minHeight: mobile ? 0 : 400,
							}}
						>
							<PanelAnotacion item={sel} onGuardado={onGuardado} onSiguiente={siguiente} cargando={cargandoSel} mobile={mobile} />
						</Box>
					</Grid>
				</Grid>
			</Stack>
			<DialogoAgregar
				abierto={dialogo}
				onCerrar={() => setDialogo(false)}
				onAgregado={() => {
					void cargar();
					void cargarStats();
				}}
			/>
		</MainCard>
	);
};

export default ClasificacionResoluciones;
