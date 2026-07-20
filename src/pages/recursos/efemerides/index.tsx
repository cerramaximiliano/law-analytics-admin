import { useCallback, useEffect, useState } from "react";

// material-ui
import {
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Grid,
	IconButton,
	MenuItem,
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
} from "@mui/material";

// project
import MainCard from "components/MainCard";
import { useSnackbar } from "notistack";

// icons
import { Add, Calendar, Edit2, Trash, Flag } from "iconsax-react";

// api
import {
	getEfemerides,
	crearEfemeride,
	actualizarEfemeride,
	toggleEfemeride,
	eliminarEfemeride,
	Efemeride,
	EfemerideInput,
	Emblema,
} from "api/efemeridesService";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const vacia: EfemerideInput = { mes: 1, dia: 1, titulo: "", contexto: "", mensajes: [], cierre: "", emblema: null, activo: true };

// ─── Modal de alta/edición ────────────────────────────────────────────────────

const EditorEfemeride = ({
	abierto,
	inicial,
	esNueva,
	onCerrar,
	onGuardado,
}: {
	abierto: boolean;
	inicial: EfemerideInput;
	esNueva: boolean;
	onCerrar: () => void;
	onGuardado: () => void;
}) => {
	const [form, setForm] = useState<EfemerideInput>(inicial);
	const [guardando, setGuardando] = useState(false);
	const { enqueueSnackbar } = useSnackbar();

	useEffect(() => setForm(inicial), [inicial]);

	const set = (campo: keyof EfemerideInput, valor: unknown) => setForm((f) => ({ ...f, [campo]: valor }));

	const guardar = async () => {
		if (!form.titulo.trim()) {
			enqueueSnackbar("El título es obligatorio", { variant: "warning" });
			return;
		}
		try {
			setGuardando(true);
			// Los mensajes se editan como líneas; se limpian los vacíos.
			const payload: EfemerideInput = {
				...form,
				mensajes: (form.mensajes || []).map((m) => m.trim()).filter(Boolean),
			};
			if (esNueva) await crearEfemeride(payload);
			else await actualizarEfemeride((inicial as Efemeride)._id, payload);
			enqueueSnackbar(esNueva ? "Efeméride creada" : "Efeméride actualizada", { variant: "success" });
			onGuardado();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "No se pudo guardar", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};

	return (
		<Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
			<DialogTitle>{esNueva ? "Nueva efeméride" : "Editar efeméride"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField
						label="Título"
						size="small"
						fullWidth
						value={form.titulo}
						onChange={(e) => set("titulo", e.target.value)}
						error={form.titulo.length > 40}
						helperText={`${form.titulo.length}/40 — aparece grande en la tarjeta`}
					/>
					<Grid container spacing={2}>
						<Grid item xs={6}>
							<TextField
								select
								label="Mes"
								size="small"
								fullWidth
								value={form.mes}
								onChange={(e) => set("mes", Number(e.target.value))}
							>
								{MESES.slice(1).map((m, i) => (
									<MenuItem key={i + 1} value={i + 1}>
										{m}
									</MenuItem>
								))}
							</TextField>
						</Grid>
						<Grid item xs={6}>
							<TextField
								label="Día"
								size="small"
								type="number"
								fullWidth
								inputProps={{ min: 1, max: 31 }}
								value={form.dia}
								onChange={(e) => set("dia", Number(e.target.value))}
							/>
						</Grid>
					</Grid>
					<TextField
						select
						label="Emblema"
						size="small"
						fullWidth
						value={form.emblema ?? ""}
						onChange={(e) => set("emblema", (e.target.value || null) as Emblema)}
						helperText="Escarapela o bandera para fechas patrias; ninguno para efemérides profesionales"
					>
						<MenuItem value="">Ninguno</MenuItem>
						<MenuItem value="escarapela">Escarapela</MenuItem>
						<MenuItem value="bandera">Bandera</MenuItem>
					</TextField>
					<TextField
						label="Contexto (para la IA)"
						size="small"
						fullWidth
						multiline
						minRows={2}
						value={form.contexto || ""}
						onChange={(e) => set("contexto", e.target.value)}
						helperText="Qué conmemora, para que la IA escriba el texto los años sin mensaje curado"
					/>
					<TextField
						label="Mensajes curados (uno por línea)"
						size="small"
						fullWidth
						multiline
						minRows={3}
						value={(form.mensajes || []).join("\n")}
						onChange={(e) => set("mensajes", e.target.value.split("\n"))}
						helperText="Se usan en orden, uno por año desde 2026. Agotados, el texto lo genera la IA. Máx. 150 caracteres cada uno."
					/>
					<TextField
						label="Cierre (opcional)"
						size="small"
						fullWidth
						value={form.cierre || ""}
						onChange={(e) => set("cierre", e.target.value)}
						error={(form.cierre || "").length > 44}
						helperText={`${(form.cierre || "").length}/44 — ej. "Feliz día, colegas."`}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onCerrar} disabled={guardando}>
					Cancelar
				</Button>
				<Button variant="contained" onClick={guardar} disabled={guardando}>
					{guardando ? "Guardando…" : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

// ─── Página ───────────────────────────────────────────────────────────────────

const Efemerides = () => {
	const [filas, setFilas] = useState<Efemeride[]>([]);
	const [cargando, setCargando] = useState(false);
	const [editor, setEditor] = useState<{ abierto: boolean; inicial: EfemerideInput; esNueva: boolean }>({
		abierto: false,
		inicial: vacia,
		esNueva: true,
	});
	const { enqueueSnackbar } = useSnackbar();

	const cargar = useCallback(async () => {
		try {
			setCargando(true);
			setFilas(await getEfemerides());
		} catch {
			enqueueSnackbar("No se pudo cargar el calendario de efemérides", { variant: "error" });
		} finally {
			setCargando(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const alternar = async (ef: Efemeride) => {
		try {
			await toggleEfemeride(ef._id);
			cargar();
		} catch {
			enqueueSnackbar("No se pudo cambiar el estado", { variant: "error" });
		}
	};

	const borrar = async (ef: Efemeride) => {
		if (!window.confirm(`¿Eliminar "${ef.titulo}"? Los posts ya creados no se borran.`)) return;
		try {
			await eliminarEfemeride(ef._id);
			enqueueSnackbar("Efeméride eliminada", { variant: "success" });
			cargar();
		} catch {
			enqueueSnackbar("No se pudo eliminar", { variant: "error" });
		}
	};

	return (
		<MainCard
			title={
				<Stack direction="row" spacing={1} alignItems="center">
					<Calendar size={22} />
					<Typography variant="h4">Calendario de efemérides</Typography>
				</Stack>
			}
			secondary={
				<Button variant="contained" startIcon={<Add size={18} />} onClick={() => setEditor({ abierto: true, inicial: vacia, esNueva: true })}>
					Nueva
				</Button>
			}
		>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Fechas conmemorativas para las que se crea un post en borrador de forma automática, 7 días antes. Los primeros años usan los
				mensajes curados; agotados, el texto lo genera la IA. Al crearse cada borrador se avisa por correo.
			</Typography>

			{cargando ? (
				<Stack alignItems="center" sx={{ py: 6 }}>
					<CircularProgress />
				</Stack>
			) : (
				<TableContainer sx={{ overflowX: "auto" }}>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Fecha</TableCell>
								<TableCell>Título</TableCell>
								<TableCell align="center">Emblema</TableCell>
								<TableCell align="center">Mensajes</TableCell>
								<TableCell align="center">Activa</TableCell>
								<TableCell align="right">Acciones</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{filas.map((ef) => (
								<TableRow key={ef._id} hover sx={{ opacity: ef.activo ? 1 : 0.5 }}>
									<TableCell>
										<Typography variant="subtitle2">
											{ef.dia} de {MESES[ef.mes]}
										</Typography>
									</TableCell>
									<TableCell>{ef.titulo}</TableCell>
									<TableCell align="center">
										{ef.emblema ? (
											<Chip
												size="small"
												icon={<Flag size={14} />}
												label={ef.emblema}
												variant="outlined"
												color="info"
											/>
										) : (
											<Typography variant="caption" color="text.secondary">
												—
											</Typography>
										)}
									</TableCell>
									<TableCell align="center">{ef.mensajes?.length ?? 0}</TableCell>
									<TableCell align="center">
										<Switch checked={ef.activo} onChange={() => alternar(ef)} size="small" />
									</TableCell>
									<TableCell align="right">
										<Tooltip title="Editar">
											<IconButton size="small" onClick={() => setEditor({ abierto: true, inicial: ef, esNueva: false })}>
												<Edit2 size={16} />
											</IconButton>
										</Tooltip>
										<Tooltip title="Eliminar">
											<IconButton size="small" color="error" onClick={() => borrar(ef)}>
												<Trash size={16} />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))}
							{filas.length === 0 && (
								<TableRow>
									<TableCell colSpan={6}>
										<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
											No hay efemérides cargadas.
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			)}

			<EditorEfemeride
				abierto={editor.abierto}
				inicial={editor.inicial}
				esNueva={editor.esNueva}
				onCerrar={() => setEditor((e) => ({ ...e, abierto: false }))}
				onGuardado={() => {
					setEditor((e) => ({ ...e, abierto: false }));
					cargar();
				}}
			/>
		</MainCard>
	);
};

export default Efemerides;
