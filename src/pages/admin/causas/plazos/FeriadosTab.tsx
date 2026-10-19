import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	MenuItem,
	Paper,
	Skeleton,
	Stack,
	Switch,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ArrowLeft2, ArrowRight2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { getFeriados, createFeriados, updateFeriado, referenciasEnAtlas, FeriadoJudicial } from "api/plazos";

const TIPOS = [
	"feriado_nacional",
	"feriado_trasladable",
	"dia_no_laborable",
	"puente_turistico",
	"feria_enero",
	"feria_julio",
	"asueto",
	"otro",
];

const anioActual = new Date().getFullYear();

const BASE_TXT = referenciasEnAtlas ? "Atlas (pjn/api)" : "rs0 (pjn/cache-api) — la base que leen los workers hoy";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

function AltaDialog({
	open,
	fecha,
	existente,
	onClose,
	onSaved,
}: {
	open: boolean;
	fecha?: string;
	existente?: FeriadoJudicial | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [form, setForm] = useState({
		modo: "dia",
		fecha: "",
		desde: "",
		hasta: "",
		tipo: "asueto",
		descripcion: "",
		fuente: "",
		verificado: true,
	});

	// Al abrir desde el calendario, el día viene elegido (y, si ya era inhábil, con sus datos).
	useEffect(() => {
		if (!open) return;
		setForm({
			modo: "dia",
			fecha: fecha || "",
			desde: "",
			hasta: "",
			tipo: existente?.tipo || "asueto",
			descripcion: existente?.descripcion || "",
			fuente: existente?.fuente || "",
			verificado: existente ? existente.verificado : true,
		});
	}, [open, fecha, existente]);

	const save = async () => {
		try {
			const payload: any = { tipo: form.tipo, descripcion: form.descripcion, fuente: form.fuente, verificado: form.verificado };
			if (form.modo === "dia") payload.fecha = form.fecha;
			else {
				payload.desde = form.desde;
				payload.hasta = form.hasta;
			}
			const r = await createFeriados(payload);
			enqueueSnackbar(`${r.dias} día(s) cargado(s)`, { variant: "success" });
			onSaved();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando feriado", { variant: "error" });
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{existente ? `Editar día inhábil · ${existente.fecha}` : "Cargar día(s) inhábil(es)"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 0.5 }}>
					<Alert severity={referenciasEnAtlas ? "info" : "warning"} variant="outlined">
						Escribe en <b>{BASE_TXT}</b>. El worker lo toma en ≤15 minutos.
					</Alert>
					<TextField select size="small" label="Modo" value={form.modo} onChange={(e) => setForm({ ...form, modo: e.target.value })}>
						<MenuItem value="dia">Un día</MenuItem>
						<MenuItem value="rango">Rango (feria/asueto extendido)</MenuItem>
					</TextField>
					{form.modo === "dia" ? (
						<TextField
							size="small"
							type="date"
							label="Fecha"
							value={form.fecha}
							onChange={(e) => setForm({ ...form, fecha: e.target.value })}
							InputLabelProps={{ shrink: true }}
						/>
					) : (
						<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
							<TextField
								size="small"
								type="date"
								label="Desde"
								value={form.desde}
								onChange={(e) => setForm({ ...form, desde: e.target.value })}
								InputLabelProps={{ shrink: true }}
							/>
							<TextField
								size="small"
								type="date"
								label="Hasta"
								value={form.hasta}
								onChange={(e) => setForm({ ...form, hasta: e.target.value })}
								InputLabelProps={{ shrink: true }}
							/>
						</Stack>
					)}
					<TextField select size="small" label="Tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
						{TIPOS.map((t) => (
							<MenuItem key={t} value={t}>
								{t}
							</MenuItem>
						))}
					</TextField>
					<TextField
						size="small"
						label="Motivo / descripción"
						value={form.descripcion}
						onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
					/>
					<TextField
						size="small"
						label="Fuente (ley/decreto/acordada)"
						value={form.fuente}
						onChange={(e) => setForm({ ...form, fuente: e.target.value })}
					/>
					<Stack direction="row" alignItems="center">
						<Switch checked={form.verificado} onChange={(e) => setForm({ ...form, verificado: e.target.checked })} />
						<Typography variant="body2">Verificado (confirmado contra la norma)</Typography>
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={save}>
					Cargar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

const TIPO_COLOR = (tipo: string): "error" | "info" | "warning" | "secondary" =>
	tipo.startsWith("feria_") ? "info" : tipo.startsWith("feriado") ? "error" : tipo === "dia_no_laborable" || tipo === "puente_turistico" ? "warning" : "secondary";

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Calendario mensual con los días inhábiles marcados; clic en un día → alta o edición. */
function CalendarioMes({ anio, rows, onElegir }: { anio: number; rows: FeriadoJudicial[]; onElegir: (fecha: string, existente: FeriadoJudicial | null) => void }) {
	const theme = useTheme();
	const [mes, setMes] = useState(anio === anioActual ? new Date().getMonth() : 0);
	useEffect(() => setMes(anio === anioActual ? new Date().getMonth() : 0), [anio]);
	const porFecha = useMemo(() => {
		const m = new Map<string, FeriadoJudicial[]>();
		for (const r of rows) m.set(r.fecha, [...(m.get(r.fecha) || []), r]);
		return m;
	}, [rows]);
	const hoy = new Date().toISOString().slice(0, 10);
	const primero = new Date(Date.UTC(anio, mes, 1));
	const offset = (primero.getUTCDay() + 6) % 7; // lunes primero
	const diasMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
	const celdas: Array<number | null> = [...Array(offset).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
	while (celdas.length % 7) celdas.push(null);
	const delMes = rows.filter((r) => r.fecha.startsWith(`${anio}-${String(mes + 1).padStart(2, "0")}`));

	return (
		<Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
			<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
				<Button size="small" onClick={() => setMes((m) => (m + 11) % 12)} aria-label="Mes anterior">
					<ArrowLeft2 size={16} />
				</Button>
				<Typography variant="subtitle1" sx={{ minWidth: 150, textAlign: "center", textTransform: "capitalize" }}>
					{MESES[mes]} {anio}
				</Typography>
				<Button size="small" onClick={() => setMes((m) => (m + 1) % 12)} aria-label="Mes siguiente">
					<ArrowRight2 size={16} />
				</Button>
				<Box sx={{ flex: 1 }} />
				<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
					<Chip size="small" color="error" variant="outlined" label="feriado" />
					<Chip size="small" color="info" variant="outlined" label="feria" />
					<Chip size="small" color="warning" variant="outlined" label="no laborable / puente" />
					<Chip size="small" color="secondary" variant="outlined" label="asueto / otro" />
				</Stack>
			</Stack>
			<Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.5 }}>
				{DIAS.map((d) => (
					<Typography key={d} variant="caption" color="text.secondary" align="center">
						{d}
					</Typography>
				))}
				{celdas.map((d, i) => {
					if (!d) return <Box key={i} />;
					const f = iso(anio, mes, d);
					const lista = porFecha.get(f) || [];
					const principal = lista[0];
					const color = principal ? theme.palette[TIPO_COLOR(principal.tipo)].main : undefined;
					const finde = i % 7 >= 5;
					return (
						<Tooltip
							key={i}
							title={lista.length ? lista.map((x) => `${x.tipo}${x.descripcion ? ` · ${x.descripcion}` : ""}${x.verificado ? "" : " (sin verificar)"}${x.habilitado ? "" : " (deshabilitado)"}`).join(" | ") : "Clic para cargar como inhábil"}
						>
							<Box
								onClick={() => onElegir(f, principal || null)}
								sx={{
									cursor: "pointer",
									minHeight: 54,
									p: 0.5,
									borderRadius: 0.75,
									border: 1,
									borderColor: f === hoy ? "primary.main" : color ? alpha(color, 0.5) : "divider",
									bgcolor: color ? alpha(color, principal?.habilitado === false ? 0.05 : 0.16) : finde ? "action.hover" : "transparent",
									opacity: principal?.habilitado === false ? 0.6 : 1,
									"&:hover": { borderColor: "primary.main" },
								}}
							>
								<Stack direction="row" justifyContent="space-between" alignItems="flex-start">
									<Typography variant="caption" sx={{ fontWeight: f === hoy ? 700 : 400 }}>
										{d}
									</Typography>
									{principal && !principal.verificado && <Typography variant="caption" color="warning.main">●</Typography>}
								</Stack>
								{principal && (
									<Typography variant="caption" sx={{ display: "block", lineHeight: 1.15, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{principal.descripcion || principal.tipo}
									</Typography>
								)}
							</Box>
						</Tooltip>
					);
				})}
			</Box>
			<Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
				● = sin verificar. {delMes.length ? `${delMes.length} día(s) inhábil(es) en ${MESES[mes]}.` : `Sin días inhábiles cargados en ${MESES[mes]}.`}
			</Typography>
		</Box>
	);
}

export default function FeriadosTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<FeriadoJudicial[]>([]);
	const [loading, setLoading] = useState(true);
	const [anio, setAnio] = useState(anioActual);
	const [soloSinVerificar, setSoloSinVerificar] = useState(false);
	const [alta, setAlta] = useState(false);
	const [altaFecha, setAltaFecha] = useState<string | undefined>(undefined);
	const [altaExistente, setAltaExistente] = useState<FeriadoJudicial | null>(null);
	const [todos, setTodos] = useState<FeriadoJudicial[]>([]);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const del = await getFeriados({ anio });
			setTodos(del);
			setRows(soloSinVerificar ? del.filter((r) => !r.verificado) : del);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando feriados", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [anio, soloSinVerificar, enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const toggle = async (r: FeriadoJudicial, field: "verificado" | "habilitado", value: boolean) => {
		try {
			await updateFeriado(r._id, { [field]: value });
			setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, [field]: value } : x)));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	const sinVerificar = rows.filter((r) => !r.verificado && r.habilitado).length;

	return (
		<Stack spacing={2}>
			<Alert severity={referenciasEnAtlas ? "info" : "warning"} variant="outlined">
				El calendario se lee y se escribe en <b>{BASE_TXT}</b>. Cuando termine la revisión, pasa a Atlas (P8).
			</Alert>
			<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
				<TextField select size="small" label="Año" value={anio} onChange={(e) => setAnio(Number(e.target.value))} sx={{ minWidth: 110 }}>
					{[anioActual - 2, anioActual - 1, anioActual, anioActual + 1].map((y) => (
						<MenuItem key={y} value={y}>
							{y}
						</MenuItem>
					))}
				</TextField>
				<Stack direction="row" alignItems="center">
					<Switch size="small" checked={soloSinVerificar} onChange={(e) => setSoloSinVerificar(e.target.checked)} />
					<Typography variant="body2">Solo sin verificar</Typography>
				</Stack>
				{sinVerificar > 0 && <Chip size="small" color="warning" label={`${sinVerificar} sin verificar en la vista`} />}
				<Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
					Los días sin verificar (feria de julio estimada, traslados, puentes) son estimaciones — confirmarlos contra el decreto/acordada.
					El worker toma los cambios en ≤15 min.
				</Typography>
				<Button
					size="small"
					variant="contained"
					onClick={() => {
						setAltaFecha(undefined);
						setAltaExistente(null);
						setAlta(true);
					}}
				>
					Cargar día/rango
				</Button>
			</Stack>

			<CalendarioMes
				anio={anio}
				rows={todos}
				onElegir={(f, ex) => {
					setAltaFecha(f);
					setAltaExistente(ex);
					setAlta(true);
				}}
			/>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 420px)" }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Fecha</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Descripción</TableCell>
							<TableCell>Fuente</TableCell>
							<TableCell>Verificado</TableCell>
							<TableCell>Habilitado</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 8 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={6}>
											<Skeleton />
										</TableCell>
									</TableRow>
							  ))
							: rows.map((r) => (
									<TableRow key={r._id} hover sx={{ opacity: r.habilitado ? 1 : 0.5 }}>
										<TableCell sx={{ fontFamily: "monospace" }}>{r.fecha}</TableCell>
										<TableCell>
											<Chip size="small" variant="outlined" label={r.tipo} />
										</TableCell>
										<TableCell>{r.descripcion}</TableCell>
										<TableCell>
											<Typography variant="caption">{r.fuente}</Typography>
										</TableCell>
										<TableCell>
											<Switch size="small" checked={r.verificado} onChange={(e) => toggle(r, "verificado", e.target.checked)} />
										</TableCell>
										<TableCell>
											<Switch size="small" checked={r.habilitado} onChange={(e) => toggle(r, "habilitado", e.target.checked)} />
										</TableCell>
									</TableRow>
							  ))}
					</TableBody>
				</Table>
			</TableContainer>
			<AltaDialog open={alta} fecha={altaFecha} existente={altaExistente} onClose={() => setAlta(false)} onSaved={fetchList} />
		</Stack>
	);
}
