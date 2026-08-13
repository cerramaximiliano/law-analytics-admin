import { useCallback, useEffect, useState } from "react";
import {
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
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getFeriados, createFeriados, updateFeriado, FeriadoJudicial } from "api/plazos";

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

function AltaDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
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
			<DialogTitle>Cargar día(s) inhábil(es)</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 0.5 }}>
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
						label="Descripción"
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

export default function FeriadosTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<FeriadoJudicial[]>([]);
	const [loading, setLoading] = useState(true);
	const [anio, setAnio] = useState(anioActual);
	const [soloSinVerificar, setSoloSinVerificar] = useState(false);
	const [alta, setAlta] = useState(false);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			setRows(await getFeriados({ anio, ...(soloSinVerificar ? { verificado: false } : {}) }));
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
				<Button size="small" variant="contained" onClick={() => setAlta(true)}>
					Cargar día/rango
				</Button>
			</Stack>

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
			<AltaDialog open={alta} onClose={() => setAlta(false)} onSaved={fetchList} />
		</Stack>
	);
}
