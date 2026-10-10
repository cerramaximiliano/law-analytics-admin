import { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	FormControlLabel,
	Grid,
	Link,
	MenuItem,
	Paper,
	Radio,
	RadioGroup,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import {
	crearRevisionMuestra,
	getPlazosBase,
	getRevisionItem,
	getRevisionItems,
	getRevisionMuestras,
	getRevisionStats,
	guardarRevisionVeredicto,
	RevisionItem,
	RevisionMuestra,
	RevisionStats,
	RevisionVeredicto,
} from "api/plazos";
import BetaPanel from "./BetaPanel";

// Revisión legal de los plazos calculados (fase F0 de "plazos automáticos para usuarios").
// Un abogado revisa una muestra estratificada y deja su veredicto; la precisión por estrato
// decide qué se les propone a los usuarios. Guía: la-ads/docs/producto/plazos-revision-legal.md

const day = (v?: string | null) => (v ? String(v).slice(0, 10) : "—");
const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)} %`);
const VACIO: RevisionVeredicto = {
	destinatario: null,
	actoNotificado: null,
	plazoCorrecto: null,
	plazoQueCorresponde: null,
	vencimientoCorrecto: null,
	vencimientoQueCorresponde: null,
	comentario: null,
};
const siNo = (v: boolean | null) => (v === true ? "si" : v === false ? "no" : "");

function Dato({ label, value }: { label: string; value?: React.ReactNode }) {
	return (
		<Stack direction="row" spacing={1} sx={{ py: 0.25 }}>
			<Typography variant="caption" color="text.secondary" sx={{ minWidth: 150 }}>
				{label}
			</Typography>
			<Typography variant="body2" sx={{ wordBreak: "break-word" }}>
				{value ?? "—"}
			</Typography>
		</Stack>
	);
}

function RevisarDialog({ id, onClose, onSaved }: { id: string | null; onClose: () => void; onSaved: (siguiente: boolean) => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [item, setItem] = useState<RevisionItem | null>(null);
	const [v, setV] = useState<RevisionVeredicto>(VACIO);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!id) return;
		setItem(null);
		getRevisionItem(id)
			.then((d) => {
				setItem(d);
				setV(d.veredicto || VACIO);
			})
			.catch(() => enqueueSnackbar("Error cargando la cédula", { variant: "error" }));
	}, [id, enqueueSnackbar]);

	const set = (k: keyof RevisionVeredicto, val: unknown) => setV((prev) => ({ ...prev, [k]: val === "" ? null : val }));

	const guardar = async (siguiente: boolean) => {
		if (!id) return;
		setSaving(true);
		try {
			await guardarRevisionVeredicto(id, v);
			enqueueSnackbar(
				v.plazoCorrecto !== null && v.vencimientoCorrecto !== null
					? "Veredicto guardado"
					: "Guardado como pendiente (faltan plazo o vencimiento)",
				{
					variant: "success",
				},
			);
			onSaved(siguiente);
		} catch {
			enqueueSnackbar("Error guardando el veredicto", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	const p = item?.plazo;
	return (
		<Dialog open={!!id} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>{item ? `${item.fuero} ${item.number}/${item.year} · ${item.estrato}` : "Cargando…"}</DialogTitle>
			<DialogContent dividers>
				{!item ? (
					<Skeleton variant="rounded" height={320} />
				) : (
					<Grid container spacing={2}>
						<Grid item xs={12} md={7}>
							<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
								Lo que calculó el sistema
							</Typography>
							<Dato label="Carátula" value={item.caratula} />
							<Dato
								label="Movimiento"
								value={`${day(item.movimiento.fecha)} · ${item.movimiento.tipo || ""} — ${item.movimiento.detalle || ""}`}
							/>
							<Dato
								label="PDF"
								value={
									item.movimiento.url ? (
										<Link href={item.movimiento.url} target="_blank" rel="noopener">
											Abrir cédula
										</Link>
									) : (
										"sin enlace (buscar en el portal por fuero y número)"
									)
								}
							/>
							<Divider sx={{ my: 1 }} />
							<Dato label="Fuente del plazo" value={p?.fuente ? `${p.fuente} (confianza ${p.confianza || "s/d"})` : "sin plazo"} />
							{p?.regla && <Dato label="Regla aplicada" value={`${p.regla}${p.reglaVerificada ? " · verificada" : " · NO verificada"}`} />}
							{p?.cita && <Dato label="Norma citada" value={p.cita} />}
							<Dato label="Fragmento que la activó" value={p?.fragmento} />
							<Dato label="Plazo" value={p?.plazoDias != null ? `${p.plazoDias} días ${p.tipoPlazo || ""}` : "—"} />
							<Dato
								label="Fecha de notificación"
								value={`${day(p?.fechaNotificacion)}${p?.fechaNotificacionFuente ? ` (tomada del ${p.fechaNotificacionFuente})` : ""}`}
							/>
							<Dato label="Perfeccionamiento" value={day(p?.perfeccionamiento)} />
							<Dato label="Inicio del plazo" value={day(p?.inicioPlazo)} />
							<Dato label="Vencimiento" value={<b>{day(p?.vencimiento)}</b>} />
							<Dato label="Con plazo de gracia" value={day(p?.vencimientoConGracia)} />
							<Dato label="Feriados aplicados" value={p?.feriadosAplicados?.length ? p.feriadosAplicados.join(", ") : "ninguno"} />
							<Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5 }}>
								Texto de la cédula
							</Typography>
							<Paper
								variant="outlined"
								sx={{ p: 1.5, maxHeight: 320, overflow: "auto", whiteSpace: "pre-wrap", fontSize: "0.8rem", fontFamily: "monospace" }}
							>
								{item.textoCedula || "Sin texto extraído: abrir el PDF."}
							</Paper>
						</Grid>
						<Grid item xs={12} md={5}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Veredicto
							</Typography>
							<Stack spacing={1.5}>
								<TextField
									select
									size="small"
									label="¿A quién va dirigida la cédula?"
									value={v.destinatario || ""}
									onChange={(e) => set("destinatario", e.target.value)}
								>
									<MenuItem value="">—</MenuItem>
									<MenuItem value="actor">Actor</MenuItem>
									<MenuItem value="demandado">Demandado</MenuItem>
									<MenuItem value="perito">Perito</MenuItem>
									<MenuItem value="tercero">Tercero</MenuItem>
									<MenuItem value="otro">Otro</MenuItem>
								</TextField>
								<TextField
									size="small"
									label="Acto notificado"
									placeholder="ej. traslado de la liquidación"
									value={v.actoNotificado || ""}
									onChange={(e) => set("actoNotificado", e.target.value)}
								/>
								<Box>
									<Typography variant="body2">¿El plazo es correcto?</Typography>
									<RadioGroup row value={siNo(v.plazoCorrecto)} onChange={(e) => set("plazoCorrecto", e.target.value === "si")}>
										<FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
										<FormControlLabel value="no" control={<Radio size="small" />} label="No" />
									</RadioGroup>
									{v.plazoCorrecto === false && (
										<TextField
											size="small"
											fullWidth
											label="Plazo que corresponde (y norma)"
											value={v.plazoQueCorresponde || ""}
											onChange={(e) => set("plazoQueCorresponde", e.target.value)}
										/>
									)}
								</Box>
								<Box>
									<Typography variant="body2">¿El vencimiento es correcto?</Typography>
									<RadioGroup row value={siNo(v.vencimientoCorrecto)} onChange={(e) => set("vencimientoCorrecto", e.target.value === "si")}>
										<FormControlLabel value="si" control={<Radio size="small" />} label="Sí" />
										<FormControlLabel value="no" control={<Radio size="small" />} label="No" />
									</RadioGroup>
									{v.vencimientoCorrecto === false && (
										<TextField
											size="small"
											type="date"
											fullWidth
											label="Vencimiento que corresponde"
											InputLabelProps={{ shrink: true }}
											value={v.vencimientoQueCorresponde || ""}
											onChange={(e) => set("vencimientoQueCorresponde", e.target.value)}
										/>
									)}
								</Box>
								<TextField
									size="small"
									multiline
									minRows={3}
									label="Comentario"
									value={v.comentario || ""}
									onChange={(e) => set("comentario", e.target.value)}
								/>
							</Stack>
						</Grid>
					</Grid>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cerrar</Button>
				<Button variant="outlined" disabled={!item || saving} onClick={() => guardar(false)}>
					Guardar
				</Button>
				<Button variant="contained" disabled={!item || saving} onClick={() => guardar(true)}>
					Guardar y siguiente
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function CrearMuestraDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (m: string) => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [nombre, setNombre] = useState("");
	const [desde, setDesde] = useState(new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10));
	const [saving, setSaving] = useState(false);
	const crear = async () => {
		setSaving(true);
		try {
			const r = await crearRevisionMuestra({ nombre: nombre || undefined, desde });
			enqueueSnackbar(`Muestra "${r.muestra}" creada con ${r.total} cédulas`, { variant: "success" });
			onCreated(r.muestra);
		} catch (e: any) {
			enqueueSnackbar(e?.response?.data?.message || "Error creando la muestra", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};
	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Nueva muestra</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2}>
					<Typography variant="body2" color="text.secondary">
						Unas 100 cédulas: 22 con plazo del texto (confianza alta), 8 (media), 6 por cada regla no verificada, 2 por cada regla
						verificada y 12 sin plazo. Se toma una foto del cálculo, así el veredicto no cambia si la cédula se reprocesa.
					</Typography>
					<TextField size="small" label="Nombre (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
					<TextField
						size="small"
						type="date"
						label="Cédulas detectadas desde"
						InputLabelProps={{ shrink: true }}
						value={desde}
						onChange={(e) => setDesde(e.target.value)}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" disabled={saving} onClick={crear}>
					{saving ? "Creando… (puede tardar un minuto)" : "Crear"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function TablaPrecision({ titulo, filas }: { titulo: string; filas: RevisionStats["porEstrato"] }) {
	return (
		<Box>
			<Typography variant="subtitle2" sx={{ mb: 0.5 }}>
				{titulo}
			</Typography>
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell />
							<TableCell align="right">Revisadas</TableCell>
							<TableCell align="right">Plazo OK</TableCell>
							<TableCell align="right">Venc. OK</TableCell>
							<TableCell align="right">Precisión</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{filas.map((f) => (
							<TableRow key={String(f.clave)}>
								<TableCell sx={{ maxWidth: 320 }}>{f.clave || "—"}</TableCell>
								<TableCell align="right">
									{f.revisadas}/{f.total}
								</TableCell>
								<TableCell align="right">{f.plazoOk}</TableCell>
								<TableCell align="right">{f.vencOk}</TableCell>
								<TableCell align="right">
									<Chip
										size="small"
										label={pct(f.precision)}
										color={f.precision == null ? "default" : f.precision >= 0.95 ? "success" : f.precision >= 0.8 ? "warning" : "error"}
										variant="outlined"
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	);
}

export default function RevisionLegalTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [muestras, setMuestras] = useState<RevisionMuestra[] | null>(null);
	const [muestra, setMuestra] = useState("");
	const [estado, setEstado] = useState("pendiente");
	const [items, setItems] = useState<RevisionItem[] | null>(null);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(0);
	const [stats, setStats] = useState<RevisionStats | null>(null);
	const [abierto, setAbierto] = useState<string | null>(null);
	const [crear, setCrear] = useState(false);
	const limit = 25;

	const cargarMuestras = useCallback(
		(elegir?: string) =>
			getRevisionMuestras()
				.then((ms) => {
					setMuestras(ms);
					setMuestra((prev) => elegir || prev || ms[0]?.muestra || "");
				})
				.catch(() => {
					setMuestras([]);
					enqueueSnackbar("Error cargando las muestras", { variant: "error" });
				}),
		[enqueueSnackbar],
	);

	const cargar = useCallback(() => {
		if (!muestra) return;
		setItems(null);
		getRevisionItems({ muestra, estado: estado || undefined, page: page + 1, limit })
			.then((r) => {
				setItems(r.data);
				setTotal(r.count);
			})
			.catch(() => enqueueSnackbar("Error cargando la muestra", { variant: "error" }));
		getRevisionStats(muestra)
			.then(setStats)
			.catch(() => setStats(null));
	}, [muestra, estado, page, enqueueSnackbar]);

	useEffect(() => {
		cargarMuestras();
	}, [cargarMuestras]);
	useEffect(() => {
		cargar();
	}, [cargar]);

	const alGuardar = (siguiente: boolean) => {
		const idx = items?.findIndex((i) => i._id === abierto) ?? -1;
		const prox = siguiente && items && idx >= 0 ? items[idx + 1]?._id : null;
		setAbierto(prox || null);
		cargar();
		cargarMuestras();
	};

	const actual = muestras?.find((m) => m.muestra === muestra);

	return (
		<Stack spacing={2}>
			<Typography variant="body2" color="text.secondary">
				Base: <b>{getPlazosBase() === "usuarios" ? "usuarios (Atlas)" : "caché (desarrollo, rs0)"}</b>. Un abogado revisa cada cédula de la
				muestra y marca si el plazo y el vencimiento son correctos. Solo los estratos con precisión ≥ 95 % se les van a proponer a los
				usuarios.
			</Typography>
			{getPlazosBase() === "usuarios" && <BetaPanel />}
			<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
				<TextField
					select
					size="small"
					label="Muestra"
					sx={{ minWidth: 260 }}
					value={muestra}
					onChange={(e) => {
						setMuestra(e.target.value);
						setPage(0);
					}}
					disabled={!muestras?.length}
				>
					{(muestras || []).map((m) => (
						<MenuItem key={m.muestra} value={m.muestra}>
							{m.muestra} ({m.revisadas}/{m.total})
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					size="small"
					label="Estado"
					sx={{ minWidth: 150 }}
					value={estado}
					onChange={(e) => {
						setEstado(e.target.value);
						setPage(0);
					}}
				>
					<MenuItem value="pendiente">Pendientes</MenuItem>
					<MenuItem value="revisada">Revisadas</MenuItem>
					<MenuItem value="">Todas</MenuItem>
				</TextField>
				<Button variant="outlined" onClick={() => setCrear(true)}>
					Nueva muestra
				</Button>
				{actual && (
					<Chip
						size="small"
						label={`${actual.revisadas} de ${actual.total} revisadas`}
						color={actual.revisadas === actual.total ? "success" : "default"}
					/>
				)}
				{stats?.global && <Chip size="small" variant="outlined" label={`Precisión global ${pct(stats.global.precision)}`} />}
			</Stack>

			{muestras && !muestras.length && (
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Typography variant="body2">Todavía no hay muestras en esta base. Creá una con "Nueva muestra".</Typography>
				</Paper>
			)}

			{muestra && (
				<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 460px)" }}>
					<Table size="small" stickyHeader>
						<TableHead>
							<TableRow>
								<TableCell>Estrato</TableCell>
								<TableCell>Expediente</TableCell>
								<TableCell>Cédula</TableCell>
								<TableCell>Plazo / regla</TableCell>
								<TableCell>Vence</TableCell>
								<TableCell>Veredicto</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{!items
								? [...Array(6)].map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={6}>
												<Skeleton />
											</TableCell>
										</TableRow>
								  ))
								: items.map((it) => (
										<TableRow key={it._id} hover sx={{ cursor: "pointer" }} onClick={() => setAbierto(it._id)}>
											<TableCell sx={{ maxWidth: 260 }}>
												<Typography variant="caption">{it.estrato}</Typography>
											</TableCell>
											<TableCell>
												{it.fuero} {it.number}/{it.year}
											</TableCell>
											<TableCell>
												{day(it.movimiento.fecha)} · {it.tipoNotificacion || "—"}
											</TableCell>
											<TableCell>
												{it.plazo.plazoDias != null ? `${it.plazo.plazoDias} d ${it.plazo.tipoPlazo || ""}` : "sin plazo"}
												<Typography variant="caption" display="block" color="text.secondary">
													{it.plazo.regla || (it.plazo.fuente ? `texto (${it.plazo.confianza})` : "")}
												</Typography>
											</TableCell>
											<TableCell>{day(it.plazo.vencimiento)}</TableCell>
											<TableCell>
												{it.estado === "revisada" ? (
													<Chip
														size="small"
														label={it.veredicto?.plazoCorrecto && it.veredicto?.vencimientoCorrecto ? "correcto" : "con error"}
														color={it.veredicto?.plazoCorrecto && it.veredicto?.vencimientoCorrecto ? "success" : "error"}
														variant="outlined"
													/>
												) : (
													<Chip size="small" label="pendiente" variant="outlined" />
												)}
											</TableCell>
										</TableRow>
								  ))}
						</TableBody>
					</Table>
					<TablePagination
						component="div"
						count={total}
						page={page}
						rowsPerPage={limit}
						rowsPerPageOptions={[limit]}
						onPageChange={(_, p) => setPage(p)}
						labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
					/>
				</TableContainer>
			)}

			{stats && (stats.porEstrato.length > 0 || stats.porRegla.length > 0) && (
				<Grid container spacing={2}>
					<Grid item xs={12} lg={6}>
						<TablaPrecision titulo="Precisión por estrato" filas={stats.porEstrato} />
					</Grid>
					<Grid item xs={12} lg={6}>
						<TablaPrecision titulo="Precisión por regla" filas={stats.porRegla} />
						{stats.destinatarios.length > 0 && (
							<Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
								<Typography variant="caption" color="text.secondary">
									Destinatarios:
								</Typography>
								{stats.destinatarios.map((d) => (
									<Chip key={String(d.destinatario)} size="small" variant="outlined" label={`${d.destinatario || "sin marcar"}: ${d.n}`} />
								))}
							</Stack>
						)}
					</Grid>
				</Grid>
			)}

			<RevisarDialog id={abierto} onClose={() => setAbierto(null)} onSaved={alGuardar} />
			<CrearMuestraDialog
				open={crear}
				onClose={() => setCrear(false)}
				onCreated={(m) => {
					setCrear(false);
					setPage(0);
					cargarMuestras(m);
				}}
			/>
		</Stack>
	);
}
