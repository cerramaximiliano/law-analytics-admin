import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
	Alert,
	Autocomplete,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Link,
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
} from "@mui/material";
import { useSnackbar } from "notistack";
import { getNormativa, createNormativa, updateNormativa, getPlazosPendientes, referenciasEnAtlas, PlazoNormativaRegla, PendienteRegla, TipoProceso } from "api/plazos";
import { useQueryParam } from "hooks/useTabParam";

const EMPTY: Partial<PlazoNormativaRegla> & { _id: string } = {
	_id: "",
	label: "",
	acto: "",
	fuero: ["*"],
	objetos: ["*"] as any,
	matchers: [],
	matchersDetalle: [],
	plazoDias: 5,
	tipoPlazo: "habiles",
	norma: "",
	prioridad: 100,
	habilitado: true,
	verificado: false,
	notas: "",
	tipoProceso: null,
	excluye: [],
	proponeVencimiento: true,
	instancias: [],
};

// Fueros del PJN (siglas de pjn-models). "*" = todos.
const FUEROS: { sigla: string; nombre: string }[] = [
	{ sigla: "*", nombre: "Todos" },
	{ sigla: "CIV", nombre: "Civil" },
	{ sigla: "COM", nombre: "Comercial" },
	{ sigla: "CSS", nombre: "Seguridad Social" },
	{ sigla: "CNT", nombre: "Trabajo" },
	{ sigla: "CCF", nombre: "Civil y Comercial Federal" },
	{ sigla: "CAF", nombre: "Contencioso Administrativo Federal" },
	{ sigla: "FBB", nombre: "Federal de Bahía Blanca" },
	{ sigla: "FCB", nombre: "Federal de Córdoba" },
	{ sigla: "FCR", nombre: "Federal de Comodoro Rivadavia" },
	{ sigla: "FCT", nombre: "Federal de Corrientes" },
	{ sigla: "FGR", nombre: "Federal de General Roca" },
	{ sigla: "FLP", nombre: "Federal de La Plata" },
	{ sigla: "FMP", nombre: "Federal de Mar del Plata" },
	{ sigla: "FMZ", nombre: "Federal de Mendoza" },
	{ sigla: "FPA", nombre: "Federal de Paraná" },
	{ sigla: "FPO", nombre: "Federal de Posadas" },
	{ sigla: "FRE", nombre: "Federal de Resistencia" },
	{ sigla: "FRO", nombre: "Federal de Rosario" },
	{ sigla: "FSA", nombre: "Federal de Salta" },
	{ sigla: "FSM", nombre: "Federal de San Martín" },
	{ sigla: "FTU", nombre: "Federal de Tucumán" },
	{ sigla: "CNE", nombre: "Electoral" },
	{ sigla: "CPE", nombre: "Penal Económico" },
	{ sigla: "CFP", nombre: "Criminal y Correccional Federal" },
	{ sigla: "CCC", nombre: "Criminal y Correccional" },
	{ sigla: "CPF", nombre: "Casación Penal Federal" },
	{ sigla: "CPN", nombre: "Penal Nacional" },
	{ sigla: "CSJ", nombre: "Corte Suprema" },
];
// Fueros que se rigen por el CPCCN (civil, comercial, seguridad social y federales con competencia civil).
const FUEROS_CPCCN = ["CIV", "COM", "CSS", "CCF", "CAF", "FBB", "FCB", "FCR", "FCT", "FGR", "FLP", "FMP", "FMZ", "FPA", "FPO", "FRE", "FRO", "FSA", "FSM", "FTU"];
const nombreFuero = (sigla: string) => FUEROS.find((f) => f.sigla === sigla)?.nombre || sigla;

const lines = (arr?: string[]) => (arr || []).join("\n");
const fromLines = (s: string) =>
	s
		.split("\n")
		.map((x) => x.trim())
		.filter(Boolean);

export function ReglaDialog({
	regla,
	esNueva,
	onClose,
	onSaved,
}: {
	regla: (Partial<PlazoNormativaRegla> & { _id: string }) | null;
	esNueva?: boolean;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const isNew = esNueva ?? (!!regla && !regla.label && regla._id === "");
	const [form, setForm] = useState<any>(null);

	useEffect(() => {
		if (regla) {
			setForm({
				...regla,
				fueros: regla.fuero?.length ? regla.fuero : ["*"],
				objetosStr: ((regla as any).objetos || ["*"]).join(","),
				matchersStr: lines(regla.matchers),
				matchersDetalleStr: lines(regla.matchersDetalle),
				excluyeStr: lines(regla.excluye),
				instanciasStr: (regla.instancias || []).join(","),
				proponeVencimiento: regla.proponeVencimiento !== false,
			});
		}
	}, [regla]);

	if (!regla || !form) return null;

	const save = async () => {
		const payload: any = {
			label: form.label,
			acto: form.acto,
			fuero: form.fueros?.length ? form.fueros : ["*"],
			objetos: form.objetosStr
				.split(",")
				.map((x: string) => x.trim())
				.filter(Boolean),
			matchers: fromLines(form.matchersStr),
			matchersDetalle: fromLines(form.matchersDetalleStr),
			excluye: fromLines(form.excluyeStr),
			instancias: (form.instanciasStr || "")
				.split(",")
				.map((x: string) => x.trim().toLowerCase())
				.filter(Boolean),
			proponeVencimiento: form.proponeVencimiento,
			plazoDias: Number(form.plazoDias),
			tipoPlazo: form.tipoPlazo,
			norma: form.norma,
			prioridad: Number(form.prioridad),
			habilitado: form.habilitado,
			// Al editar, la verificación se cambia desde la tabla (pide confirmación y nota).
			...(isNew ? { verificado: form.verificado } : {}),
			notas: form.notas,
			tipoProceso: form.tipoProceso || null,
		};
		try {
			if (isNew) await createNormativa({ _id: form._id, ...payload });
			else await updateNormativa(regla._id, payload);
			enqueueSnackbar("Regla guardada (el worker la toma en ≤10 min o al reprocesar)", { variant: "success" });
			onSaved();
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error guardando regla", { variant: "error" });
		}
	};

	const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });

	return (
		<Dialog open onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>{isNew ? "Nueva regla" : `Editar regla: ${regla._id}`}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} sx={{ pt: 0.5 }}>
					{isNew && <TextField size="small" label="_id (slug snake_case)" value={form._id} onChange={set("_id")} />}
					<TextField size="small" label="Label" value={form.label} onChange={set("label")} />
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<TextField size="small" label="Acto (slug)" value={form.acto} onChange={set("acto")} sx={{ flex: 1 }} />
						<TextField
							size="small"
							label="Instancias (primera, camara, corte; vacío = todas)"
							value={form.instanciasStr}
							onChange={set("instanciasStr")}
							sx={{ flex: 1 }}
						/>
						<TextField
							size="small"
							label="Objetos (regex, coma, * = todos)"
							value={form.objetosStr}
							onChange={set("objetosStr")}
							sx={{ flex: 1 }}
						/>
					</Stack>
					<Stack direction="row" spacing={1} alignItems="flex-start">
						<Autocomplete
							multiple
							size="small"
							sx={{ flex: 1 }}
							options={FUEROS.map((f) => f.sigla)}
							value={form.fueros || []}
							onChange={(_, v) => setForm({ ...form, fueros: v[v.length - 1] === "*" ? ["*"] : v.filter((x) => x !== "*") })}
							getOptionLabel={(sigla) => (sigla === "*" ? "* (todos)" : `${sigla} — ${nombreFuero(sigla)}`)}
							renderTags={(v, getTagProps) => v.map((sigla, i) => <Chip size="small" label={sigla} {...getTagProps({ index: i })} key={sigla} />)}
							renderInput={(params) => <TextField {...params} label="Fueros" helperText="Elegí de la lista (siglas de pjn-models)" />}
						/>
						<Button size="small" variant="outlined" sx={{ mt: 0.5, whiteSpace: "nowrap" }} onClick={() => setForm({ ...form, fueros: FUEROS_CPCCN })}>
							Fueros CPCCN
						</Button>
					</Stack>
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<TextField size="small" type="number" label="Plazo (días)" value={form.plazoDias} onChange={set("plazoDias")} />
						<TextField size="small" select SelectProps={{ native: true }} label="Tipo" value={form.tipoPlazo} onChange={set("tipoPlazo")}>
							<option value="habiles">hábiles</option>
							<option value="corridos">corridos</option>
						</TextField>
						<TextField size="small" type="number" label="Prioridad (menor = antes)" value={form.prioridad} onChange={set("prioridad")} />
						<TextField
							size="small"
							select
							SelectProps={{ native: true }}
							label="Tipo de proceso"
							value={form.tipoProceso || ""}
							onChange={set("tipoProceso")}
							helperText="Solo para actos cuyo plazo depende del trámite"
						>
							<option value="">cualquiera</option>
							<option value="ordinario">ordinario</option>
							<option value="sumario">sumario / sumarísimo</option>
						</TextField>
					</Stack>
					<TextField size="small" label="Norma (cita legal — obligatoria)" value={form.norma} onChange={set("norma")} />
					<TextField
						size="small"
						label="Matchers sobre TEXTO (una regex por línea, texto normalizado sin tildes en MAYÚSCULAS)"
						value={form.matchersStr}
						onChange={set("matchersStr")}
						multiline
						minRows={3}
					/>
					<TextField
						size="small"
						label="Matchers sobre DETALLE del movimiento (para cédulas sin PDF)"
						value={form.matchersDetalleStr}
						onChange={set("matchersDetalleStr")}
						multiline
						minRows={2}
					/>
					<TextField
						size="small"
						label="Excluye (una regex por línea): si la oración donde matcheó contiene alguna, se busca la siguiente aparición"
						value={form.excluyeStr}
						onChange={set("excluyeStr")}
						multiline
						minRows={2}
					/>
					<TextField size="small" label="Notas" value={form.notas} onChange={set("notas")} multiline minRows={2} />
					<Stack direction="row" spacing={3}>
						<Stack direction="row" alignItems="center">
							<Switch checked={form.habilitado} onChange={(e) => setForm({ ...form, habilitado: e.target.checked })} />
							<Typography variant="body2">Habilitada</Typography>
						</Stack>
						<Stack direction="row" alignItems="center">
							<Switch checked={form.proponeVencimiento} onChange={(e) => setForm({ ...form, proponeVencimiento: e.target.checked })} />
							<Typography variant="body2">Propone vencimiento (apagado: la cédula va a revisión manual)</Typography>
						</Stack>
						<Stack direction="row" alignItems="center">
							<Switch
								checked={form.verificado}
								disabled={!isNew}
								onChange={(e) => setForm({ ...form, verificado: e.target.checked })}
							/>
							<Typography variant="body2">
								Verificada jurídicamente{!isNew ? " (se cambia desde la tabla, con nota)" : ""}
							</Typography>
						</Stack>
					</Stack>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={save}>
					Guardar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

const BASE_TXT = referenciasEnAtlas ? "Atlas (pjn/api)" : "rs0 (pjn/cache-api) — la base que leen los workers hoy";
const fechaCorta = (d?: string | null) => (d ? new Date(d).toLocaleDateString("es-AR") : "—");

/** Confirmación para verificar o quitar la verificación: deja quién, cuándo y por qué. */
function VerificarDialog({
	regla,
	retiene,
	onClose,
	onDone,
}: {
	regla: PlazoNormativaRegla | null;
	retiene?: PendienteRegla;
	onClose: () => void;
	onDone: (r: PlazoNormativaRegla) => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [nota, setNota] = useState("");
	const [guardando, setGuardando] = useState(false);
	useEffect(() => setNota(""), [regla?._id]);
	if (!regla) return null;
	const verificar = !regla.verificado;
	const guardar = async () => {
		setGuardando(true);
		try {
			const r = await updateNormativa(regla._id, { verificado: verificar, nota: nota.trim() });
			onDone(r);
			enqueueSnackbar(verificar ? "Regla verificada" : "Verificación quitada", { variant: "success" });
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		} finally {
			setGuardando(false);
		}
	};
	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>{verificar ? "Verificar regla" : "Quitar verificación"}</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2}>
					<Typography variant="body2">
						<b>{regla.label}</b> — {regla.plazoDias}d {regla.tipoPlazo} · {regla.norma}
					</Typography>
					<Alert severity={verificar ? "warning" : "info"} variant="outlined">
						{verificar
							? "Verificada significa que un abogado confirmó la regla en la revisión legal. A partir de ahora sus plazos llegan a los usuarios."
							: "Sin verificar, los plazos de esta regla dejan de llegar a los usuarios (los del texto de la cédula siguen pasando)."}
						{retiene ? ` Hoy retiene ${retiene.retenidos} plazo(s), ${retiene.ultimos7d} de los últimos 7 días.` : ""}
					</Alert>
					<Typography variant="caption" color="text.secondary">
						Escribe en: <b>{BASE_TXT}</b>. El worker la toma en ≤10 minutos.
					</Typography>
					<TextField
						size="small"
						label={verificar ? "Nota (obligatoria): qué revisaste y con qué criterio" : "Nota (opcional)"}
						value={nota}
						onChange={(e) => setNota(e.target.value)}
						multiline
						minRows={3}
						autoFocus
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button variant="contained" color={verificar ? "warning" : "primary"} disabled={guardando || (verificar && nota.trim().length < 5)} onClick={guardar}>
					{verificar ? "Verificar" : "Quitar verificación"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

export default function NormativaTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<PlazoNormativaRegla[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<(Partial<PlazoNormativaRegla> & { _id: string }) | null>(null);
	const [esVariante, setEsVariante] = useState(false);
	const [verificando, setVerificando] = useState<PlazoNormativaRegla | null>(null);
	const [retenidos, setRetenidos] = useState<Map<string, PendienteRegla> | null>(null);
	const [regla, setReglaParam] = useQueryParam("regla");

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			setRows(await getNormativa());
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando normativa", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchList();
		// Plazos que cada regla retiene hoy: sale de las cédulas de usuarios (Atlas), no de la base de las reglas.
		getPlazosPendientes()
			.then((p) => setRetenidos(new Map(p.reglasSinVerificar.map((r) => [r.normaId, r]))))
			.catch(() => setRetenidos(null));
	}, [fetchList]);

	// Agrupadas por acto: las variantes por tipo de proceso (mismo acto) quedan juntas; cada una se verifica por separado.
	const visibles = useMemo(() => {
		const base = regla ? rows.filter((r) => r._id === regla) : rows;
		const grupos = new Map<string, PlazoNormativaRegla[]>();
		for (const r of base) grupos.set(r.acto, [...(grupos.get(r.acto) || []), r]);
		return [...grupos.values()]
			.map((g) => g.sort((a, b) => a.prioridad - b.prioridad || (a.tipoProceso || "").localeCompare(b.tipoProceso || "")))
			.sort((a, b) => a[0].prioridad - b[0].prioridad)
			.flat();
	}, [rows, regla]);
	const variantesDe = useMemo(() => {
		const m = new Map<string, number>();
		for (const r of rows) m.set(r.acto, (m.get(r.acto) || 0) + 1);
		return m;
	}, [rows]);

	// Copia la regla con otro tipo de proceso (sin verificar) para completar una variante.
	const nuevaVariante = (r: PlazoNormativaRegla) => {
		setEsVariante(true);
		const tipo: TipoProceso = r.tipoProceso === "sumario" ? "ordinario" : "sumario";
		setEditing({ ...r, _id: `${r._id.replace(/_(ordinario|sumario)$/, "")}_${tipo}`, tipoProceso: tipo, verificado: false, verificadoPor: null, verificadoAt: null, verificadoNota: null, notas: "" });
	};

	const toggle = async (r: PlazoNormativaRegla, value: boolean) => {
		try {
			await updateNormativa(r._id, { habilitado: value });
			setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, habilitado: value } : x)));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Stack spacing={2}>
			<Alert severity={referenciasEnAtlas ? "info" : "warning"} variant="outlined">
				Las reglas se leen y se escriben en <b>{BASE_TXT}</b>. Solo las reglas <b>verificadas</b> (un abogado las confirmó en la revisión
				legal) y los plazos que salen del texto de la cédula llegan al usuario. {referenciasEnAtlas ? "Los workers leen de esta misma base (desde P8)." : "Cuando termine la revisión, las reglas pasan a Atlas (P8)."}
			</Alert>
			<Alert severity="info" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
				<Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
					¿Quién crea esta tabla?
				</Typography>
				<Typography variant="body2" component="div">
					<b>1) El seed inicial</b> sembró las reglas base (insert-only: re-ejecutarlo nunca pisa tus ediciones).{" "}
					<b>2) El admin — dueño de la tabla —</b> crea, edita, verifica y deshabilita reglas desde esta vista; cada regla exige cita legal
					y el worker toma los cambios en ≤10 minutos, sin deploy. <b>3) El dataset propone</b>: la tab Dataset muestra candidatos con
					evidencia (n, consistencia, normas citadas) y el botón «Crear regla» pre-carga este formulario — pero nunca crea reglas solo.
					Recordá: el plazo expreso del documento siempre manda; estas reglas aplican <i>en subsidio</i>, y el clasificador que se entrene
					con el dataset solo identificará el acto — el plazo lo pone siempre esta tabla.
				</Typography>
			</Alert>
			<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
				<Typography variant="body2" color="text.secondary">
					First-match-wins por prioridad ascendente. Las reglas específicas (fuero/objeto) deben tener prioridad menor que las genéricas.
				</Typography>
				{regla && <Chip size="small" color="warning" label={`solo ${regla}`} onDelete={() => setReglaParam("")} />}
				<Button size="small" variant="contained" onClick={() => {
						setEsVariante(false);
						setEditing({ ...EMPTY });
					}}>
					Nueva regla
				</Button>
			</Stack>
			<TableContainer component={Paper} elevation={0}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Prior.</TableCell>
							<TableCell>Regla</TableCell>
							<TableCell>Fuero</TableCell>
							<TableCell>Tipo de proceso</TableCell>
							<TableCell>Objetos</TableCell>
							<TableCell>Plazo</TableCell>
							<TableCell>Norma</TableCell>
							<TableCell>Verif.</TableCell>
							<TableCell>Retiene (hoy / 7 d)</TableCell>
							<TableCell>Habil.</TableCell>
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{loading
							? Array.from({ length: 6 }).map((_, i) => (
									<TableRow key={i}>
										<TableCell colSpan={11}>
											<Skeleton />
										</TableCell>
									</TableRow>
							  ))
							: visibles.map((r) => {
									const ret = retenidos?.get(r._id);
									const conVariantes = (variantesDe.get(r.acto) || 0) > 1;
									return (
										<TableRow key={r._id} hover sx={conVariantes ? { bgcolor: "action.hover" } : undefined}>
											<TableCell>{r.prioridad}</TableCell>
											<TableCell sx={{ cursor: "pointer" }} onClick={() => {
													setEsVariante(false);
													setEditing(r);
												}}>
												<Typography variant="body2" sx={{ fontWeight: 600 }}>
													{r.label}{" "}
													{r.tipoProceso && (
														<Chip
															size="small"
															color={r.tipoProceso === "ordinario" ? "primary" : "secondary"}
															variant="outlined"
															label={r.tipoProceso === "ordinario" ? "ordinario" : "sumario"}
														/>
													)}
												</Typography>
												<Typography variant="caption" sx={{ fontFamily: "monospace" }} color="text.secondary">
													{r._id}
												</Typography>
											</TableCell>
											<TableCell>
												<Tooltip title={(r.fuero?.length ? r.fuero : ["*"]).map(nombreFuero).join(", ")}>
													<span>{(r.fuero || []).length > 6 ? `${r.fuero.slice(0, 5).join(",")} +${r.fuero.length - 5}` : (r.fuero || []).join(",")}</span>
												</Tooltip>
												{!!r.instancias?.length && (
													<Typography variant="caption" display="block" color="text.secondary">
														{r.instancias.join(", ")}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												{r.tipoProceso ? (
													<Chip size="small" variant="outlined" color={r.tipoProceso === "ordinario" ? "primary" : "secondary"} label={r.tipoProceso === "ordinario" ? "ordinario" : "sumario / sumarísimo"} />
												) : (
													<Typography variant="caption" color="text.secondary">
														cualquiera
													</Typography>
												)}
											</TableCell>
											<TableCell>{(((r as any).objetos as string[]) || ["*"]).join(",")}</TableCell>
											<TableCell>
												{r.proponeVencimiento === false ? (
													<Tooltip title="Reconoce el acto pero no propone vencimiento: la cédula va a revisión manual">
														<Chip size="small" color="warning" variant="outlined" label="revisar" />
													</Tooltip>
												) : (
													<>
														{r.plazoDias}d {r.tipoPlazo}
													</>
												)}
												{!!r.excluye?.length && (
													<Tooltip title={`Excluye: ${r.excluye.join(" · ")}`}>
														<Typography variant="caption" display="block" color="text.secondary">
															{r.excluye.length} exclusión(es)
														</Typography>
													</Tooltip>
												)}
											</TableCell>
											<TableCell>
												<Chip size="small" variant="outlined" label={r.norma} />
											</TableCell>
											<TableCell>
												<Tooltip
													title={
														r.verificadoAt
															? `${r.verificado ? "Verificada" : "Verificación quitada"} el ${fechaCorta(r.verificadoAt)} por ${r.verificadoPor || "—"}${
																	r.verificadoNota ? `: ${r.verificadoNota}` : ""
															  }`
															: "Sin constancia de quién la verificó"
													}
												>
													<span>
														<Switch size="small" checked={r.verificado} onChange={() => setVerificando(r)} />
													</span>
												</Tooltip>
											</TableCell>
											<TableCell>
												{retenidos === null ? (
													"—"
												) : ret ? (
													<Stack spacing={0.25}>
														<Link
															component={RouterLink}
															variant="body2"
															to={`/admin/causas/plazos?tab=notificaciones&base=usuarios&status=computed&norma=${encodeURIComponent(r._id)}`}
														>
															{ret.retenidos.toLocaleString("es-AR")} / {ret.ultimos7d.toLocaleString("es-AR")}
														</Link>
														<Link
															component={RouterLink}
															variant="caption"
															to={`/admin/causas/plazos?tab=revision-legal&base=usuarios&regla=${encodeURIComponent(r._id)}`}
														>
															revisar con muestra
														</Link>
													</Stack>
												) : (
													<Typography variant="caption" color="text.secondary">
														{r.verificado ? "—" : "0"}
													</Typography>
												)}
											</TableCell>
											<TableCell>
												<Switch size="small" checked={r.habilitado} onChange={(e) => toggle(r, e.target.checked)} />
											</TableCell>
											<TableCell>
												<Tooltip title="Crea una copia de esta regla para el otro tipo de proceso (sin verificar)">
													<Link component="button" variant="caption" onClick={() => nuevaVariante(r)}>
														+ variante por tipo de proceso
													</Link>
												</Tooltip>
											</TableCell>
										</TableRow>
									);
							  })}
					</TableBody>
				</Table>
			</TableContainer>
			{editing && <ReglaDialog regla={editing} esNueva={esVariante ? true : undefined} onClose={() => setEditing(null)} onSaved={fetchList} />}
			<VerificarDialog
				regla={verificando}
				retiene={verificando ? retenidos?.get(verificando._id) : undefined}
				onClose={() => setVerificando(null)}
				onDone={(r) => setRows((prev) => prev.map((x) => (x._id === r._id ? { ...x, ...r } : x)))}
			/>
		</Stack>
	);
}
