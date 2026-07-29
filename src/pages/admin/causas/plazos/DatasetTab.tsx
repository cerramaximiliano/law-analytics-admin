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
	IconButton,
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
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import {
	getDatasetStats,
	getDatasetCandidatos,
	getDataset,
	getNormativa,
	revisarDatasetEjemplo,
	DatasetStats,
	DatasetCandidato,
	DatasetEjemplo,
	PlazoNormativaRegla,
} from "api/plazos";
import { ReglaDialog } from "./NormativaTab";

// Slug seguro desde texto libre (objeto de causa → parte de un _id de regla).
const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 24);

// Regex literal segura para el campo objetos (matchea el objeto normalizado).
const objetoARegex = (s: string) =>
	s
		.toUpperCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── Sección Revisión: casos dispersos / cola de verificación humana ──────────

const NATURALEZAS = ["procesal", "pago", "cumplimiento", "otro"];

// Actos base (los de las reglas de normativa) — el select de corrección los
// combina con los observados en el dataset.
const ACTOS_BASE = [
	"sentencia_definitiva",
	"sentencia_interlocutoria",
	"traslado_demanda",
	"traslado",
	"traslado_rex",
	"traslado_agravios",
	"vista",
	"liquidacion",
	"honorarios",
	"intimacion",
	"resolucion",
	"aceptacion_cargo_perito",
	"desconocido",
];

/**
 * Diálogo de revisión completo: además de confirmar/descartar, permite
 * CORREGIR los labels (acto, naturaleza) — cada corrección queda marcada
 * como etiqueta de oro (revision.corregido) que las re-cosechas nunca pisan.
 */
function RevisarDialog({
	ejemplo,
	actosConocidos,
	onClose,
	onDone,
}: {
	ejemplo: DatasetEjemplo | null;
	actosConocidos: string[];
	onClose: () => void;
	onDone: (id: string) => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [acto, setActo] = useState("");
	const [naturaleza, setNaturaleza] = useState("procesal");
	const [notas, setNotas] = useState("");

	useEffect(() => {
		if (ejemplo) {
			setActo(ejemplo.acto || "desconocido");
			setNaturaleza(ejemplo.naturaleza || "procesal");
			setNotas(ejemplo.revision?.notas || "");
		}
	}, [ejemplo]);

	if (!ejemplo) return null;

	const guardar = async (estado: "confirmado" | "descartado") => {
		try {
			const cambios: { notas?: string; acto?: string; naturaleza?: string } = { notas };
			// Solo mandar labels si difieren del original (para no marcar
			// corregido sin necesidad).
			if (acto && acto !== ejemplo.acto) cambios.acto = acto.trim().toLowerCase().replace(/\s+/g, "_");
			if (naturaleza && naturaleza !== (ejemplo.naturaleza || "procesal")) cambios.naturaleza = naturaleza;
			await revisarDatasetEjemplo(ejemplo._id, estado, cambios);
			enqueueSnackbar(
				estado === "confirmado"
					? cambios.acto || cambios.naturaleza
						? "Confirmado con labels corregidos (etiqueta de oro)"
						: "Confirmado"
					: "Descartado — excluido de la minería",
				{ variant: "success" },
			);
			onDone(ejemplo._id);
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Dialog open onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				Revisar ejemplo — {ejemplo.number}/{ejemplo.year} [{ejemplo.fuero}]
				{ejemplo.objeto ? ` · ${ejemplo.objeto}` : ""}
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2}>
					<Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
						<Chip size="small" color="primary" variant="outlined" label={`${ejemplo.plazoDias}d ${ejemplo.tipoPlazo || ""}`} />
						{ejemplo.normaCitada && <Chip size="small" variant="outlined" label={ejemplo.normaCitada} sx={{ fontFamily: "monospace" }} />}
						{ejemplo.juzgado != null && <Chip size="small" variant="outlined" label={`Juzg. ${ejemplo.juzgado}`} />}
						{ejemplo.sala != null && <Chip size="small" variant="outlined" label={`Sala ${ejemplo.sala}`} />}
						{ejemplo._disperso?.apartado && (
							<Chip size="small" color="warning" variant="outlined" label={`su grupo dice ${ejemplo._disperso.dominanteGrupo}d (n=${ejemplo._disperso.nGrupo})`} />
						)}
					</Stack>

					<Stack direction="row" spacing={2}>
						<TextField
							select
							size="small"
							label="Acto notificado (corregible)"
							value={actosConocidos.includes(acto) ? acto : "__otro__"}
							onChange={(e) => setActo(e.target.value === "__otro__" ? "" : e.target.value)}
							sx={{ minWidth: 240 }}
						>
							{actosConocidos.map((a) => (
								<MenuItem key={a} value={a}>
									{a}
								</MenuItem>
							))}
							<MenuItem value="__otro__">otro (escribir)…</MenuItem>
						</TextField>
						{!actosConocidos.includes(acto) && (
							<TextField size="small" label="Acto nuevo (slug snake_case)" value={acto} onChange={(e) => setActo(e.target.value)} sx={{ minWidth: 220 }} />
						)}
						<TextField select size="small" label="Naturaleza del plazo" value={naturaleza} onChange={(e) => setNaturaleza(e.target.value)} sx={{ minWidth: 160 }}>
							{NATURALEZAS.map((n) => (
								<MenuItem key={n} value={n}>
									{n}
								</MenuItem>
							))}
						</TextField>
					</Stack>

					<TextField size="small" label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} multiline minRows={2} />

					{ejemplo.snippet && (
						<Box>
							<Typography variant="caption" color="text.secondary">
								Mención del plazo:
							</Typography>
							<Typography variant="caption" component="div" sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
								«{ejemplo.snippet}»
							</Typography>
						</Box>
					)}
					{ejemplo.textoExtracto && (
						<Box>
							<Typography variant="caption" color="text.secondary">
								Texto de la cédula (extracto):
							</Typography>
							<Box sx={{ maxHeight: 240, overflow: "auto", p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
								<Typography variant="caption" sx={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
									{ejemplo.textoExtracto}
								</Typography>
							</Box>
						</Box>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				{ejemplo.movimiento?.url && (
					<Button component="a" href={ejemplo.movimiento.url} target="_blank" rel="noopener">
						Ver PDF
					</Button>
				)}
				<Box sx={{ flex: 1 }} />
				<Button onClick={onClose}>Cancelar</Button>
				<Button color="error" onClick={() => guardar("descartado")}>
					Descartar
				</Button>
				<Button color="success" variant="contained" onClick={() => guardar("confirmado")}>
					Confirmar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function RevisionSection({ actosConocidos }: { actosConocidos: string[] }) {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<DatasetEjemplo[]>([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [loading, setLoading] = useState(true);
	const [soloDispersos, setSoloDispersos] = useState(true);
	const [revision, setRevision] = useState("sin_revisar");
	const [revisando, setRevisando] = useState<DatasetEjemplo | null>(null);

	const fetchList = useCallback(async () => {
		try {
			setLoading(true);
			const resp = await getDataset({
				page: page + 1,
				limit: rowsPerPage,
				dispersos: soloDispersos || undefined,
				revision: revision || undefined,
				...(soloDispersos ? {} : { conPlazo: true }),
			});
			setRows(resp.data);
			setCount(resp.count);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando ejemplos", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [page, rowsPerPage, soloDispersos, revision, enqueueSnackbar]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const confirmar = async (e: DatasetEjemplo) => {
		try {
			await revisarDatasetEjemplo(e._id, "confirmado");
			enqueueSnackbar("Confirmado", { variant: "success" });
			setRows((prev) => prev.filter((x) => x._id !== e._id));
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Stack spacing={1.5}>
			<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
				<Typography variant="subtitle1">Revisión de ejemplos</Typography>
				<Stack direction="row" alignItems="center">
					<Switch size="small" checked={soloDispersos} onChange={(e) => { setSoloDispersos(e.target.checked); setPage(0); }} />
					<Typography variant="body2">Solo dispersos (apartados del dominante o ≥60 días)</Typography>
				</Stack>
				<TextField select size="small" label="Revisión" value={revision} onChange={(e) => { setRevision(e.target.value); setPage(0); }} sx={{ minWidth: 150 }}>
					<MenuItem value="sin_revisar">Sin revisar</MenuItem>
					<MenuItem value="confirmado">Confirmados</MenuItem>
					<MenuItem value="descartado">Descartados</MenuItem>
					<MenuItem value="">Todos</MenuItem>
				</TextField>
			</Stack>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: 420 }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Causa</TableCell>
							<TableCell>Fuero / Objeto</TableCell>
							<TableCell>Acto</TableCell>
							<TableCell>Plazo</TableCell>
							<TableCell>Motivo</TableCell>
							<TableCell sx={{ minWidth: 320 }}>Evidencia (snippet)</TableCell>
							<TableCell>Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={7}>
										<Skeleton />
									</TableCell>
								</TableRow>
							))
						) : (
							rows.map((e) => (
								<TableRow key={e._id} hover>
									<TableCell>
										{e.number}/{e.year}
									</TableCell>
									<TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{e.fuero}
										{e.objeto ? ` · ${e.objeto}` : ""}
									</TableCell>
									<TableCell>{e.acto}</TableCell>
									<TableCell>
										<Chip size="small" color="primary" variant="outlined" label={`${e.plazoDias}d ${e.tipoPlazo || ""}`} />
										{e.naturaleza && e.naturaleza !== "procesal" && (
											<Chip size="small" color="secondary" variant="outlined" label={e.naturaleza} sx={{ ml: 0.5 }} />
										)}
									</TableCell>
									<TableCell>
										{e._disperso?.sospechoso && <Chip size="small" color="error" variant="outlined" label="≥60d" sx={{ mr: 0.5 }} />}
										{e._disperso?.apartado && (
											<Chip size="small" color="warning" variant="outlined" label={`grupo: ${e._disperso.dominanteGrupo}d (n=${e._disperso.nGrupo})`} />
										)}
										{e.revision?.estado === "descartado" && <Chip size="small" label="descartado" />}
										{e.revision?.corregido && <Chip size="small" color="info" variant="outlined" label="corregido" sx={{ ml: 0.5 }} />}
									</TableCell>
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", maxHeight: 60, overflow: "auto" }}>
											«{e.snippet || "—"}»
										</Typography>
										{e.normaCitada && (
											<Chip size="small" variant="outlined" label={e.normaCitada} sx={{ mt: 0.5, fontFamily: "monospace", fontSize: "0.65rem" }} />
										)}
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5}>
											<Tooltip title="Confirmar tal cual (plazo y labels correctos)">
												<Button size="small" color="success" onClick={() => confirmar(e)}>
													✓
												</Button>
											</Tooltip>
											<Tooltip title="Revisar: corregir acto/naturaleza, ver texto completo, descartar">
												<Button size="small" onClick={() => setRevisando(e)}>
													✎
												</Button>
											</Tooltip>
											{e.movimiento?.url && (
												<Tooltip title="Ver PDF de la cédula">
													<IconButton size="small" component="a" href={e.movimiento.url} target="_blank" rel="noopener">
														📄
													</IconButton>
												</Tooltip>
											)}
										</Stack>
									</TableCell>
								</TableRow>
							))
						)}
						{!loading && rows.length === 0 && (
							<TableRow>
								<TableCell colSpan={7}>
									<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
										Sin casos para revisar con estos filtros 🎉
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
			<TablePagination
				component="div"
				count={count}
				page={page}
				onPageChange={(_, p) => setPage(p)}
				rowsPerPage={rowsPerPage}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50]}
				labelRowsPerPage="Por página:"
			/>
			<RevisarDialog
				ejemplo={revisando}
				actosConocidos={actosConocidos}
				onClose={() => setRevisando(null)}
				onDone={(id) => setRows((prev) => prev.filter((x) => x._id !== id))}
			/>
		</Stack>
	);
}

/**
 * Dataset de plazos expresos: cada cédula cuyo texto fija el plazo es un
 * ejemplo etiquetado por el propio tribunal. Acá se ven los CANDIDATOS a
 * regla empírica por (fuero, objeto, acto) — para crear la regla, usar la
 * tab Normativa con los datos del candidato — y la cola de REVISIÓN de los
 * casos dispersos (los descartados quedan fuera de la minería).
 */
export default function DatasetTab() {
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<DatasetStats | null>(null);
	const [candidatos, setCandidatos] = useState<DatasetCandidato[]>([]);
	const [loading, setLoading] = useState(true);
	const [minN, setMinN] = useState(5);
	const [minShare, setMinShare] = useState(0.8);
	const [nuevaRegla, setNuevaRegla] = useState<(Partial<PlazoNormativaRegla> & { _id: string }) | null>(null);

	// Pre-carga el formulario de regla con los datos del candidato: fuero,
	// objeto (regex literal), acto, plazo dominante, cita observada, matchers
	// heredados de la regla base del mismo acto, y la evidencia en las notas.
	const crearReglaDesde = async (c: DatasetCandidato) => {
		let matchers: string[] = [];
		let matchersDetalle: string[] = [];
		let prioridad = 50;
		try {
			const reglas = await getNormativa();
			const base = reglas.find((r) => r.acto === c.acto);
			if (base) {
				matchers = base.matchers || [];
				matchersDetalle = base.matchersDetalle || [];
				prioridad = Math.max(1, (base.prioridad || 50) - 5); // gana a la base
			}
		} catch (_) {
			/* sin reglas base — el admin escribe los matchers */
		}
		setNuevaRegla({
			_id: `${c.acto}_${c.fuero.toLowerCase()}${c.objeto ? `_${slugify(c.objeto)}` : ""}`,
			label: `${c.acto.replace(/_/g, " ")} (${c.fuero}${c.objeto ? ` · ${c.objeto}` : ""})`,
			acto: c.acto,
			fuero: [c.fuero],
			objetos: c.objeto ? [objetoARegex(c.objeto)] : ["*"],
			matchers,
			matchersDetalle,
			plazoDias: c.plazoDias,
			tipoPlazo: (c.tipoPlazo || "habiles") as "habiles" | "corridos",
			norma: c.normasCitadas?.[0] || "",
			prioridad,
			habilitado: true,
			verificado: false,
			notas: `Creada desde candidato del dataset: n=${c.n}, consistencia ${Math.round(c.share * 100)}%${
				c.normasCitadas?.length ? `, normas citadas en los textos: ${c.normasCitadas.join(" · ")}` : ""
			}. Revisar la cita legal antes de verificar.`,
		});
	};

	const fetchAll = useCallback(async () => {
		try {
			setLoading(true);
			const [s, c] = await Promise.all([getDatasetStats(), getDatasetCandidatos({ minN, minShare })]);
			setStats(s);
			setCandidatos(c);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error cargando dataset", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [minN, minShare, enqueueSnackbar]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return (
		<Stack spacing={2}>
			<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
				{stats && (
					<>
						<Chip size="small" label={`${stats.total} ejemplos`} />
						<Chip size="small" color="success" variant="outlined" label={`${stats.conPlazo} con plazo expreso`} />
						<Chip size="small" variant="outlined" label={`${stats.sinPlazo} sin plazo`} />
						{stats.porFuero.map((f) => (
							<Chip key={f.fuero} size="small" variant="outlined" label={`${f.fuero}: ${f.conPlazo}/${f.total}`} />
						))}
					</>
				)}
				<TextField
					size="small"
					type="number"
					label="n mínimo"
					value={minN}
					onChange={(e) => setMinN(Math.max(2, Number(e.target.value)))}
					sx={{ width: 110, ml: "auto" }}
				/>
				<TextField
					size="small"
					type="number"
					label="Consistencia mín."
					inputProps={{ step: 0.05, min: 0.5, max: 1 }}
					value={minShare}
					onChange={(e) => setMinShare(Number(e.target.value))}
					sx={{ width: 140 }}
				/>
			</Stack>

			<Typography variant="body2" color="text.secondary">
				Candidatos a regla empírica por (fuero, objeto, acto): combinaciones donde el plazo dominante alcanza la consistencia mínima
				(solo plazos de naturaleza procesal). El dataset es evidencia, no autoridad: el botón «Crear regla» pre-carga el formulario de
				Normativa con estos datos — la regla nace sin verificar y la aprobás vos, que sos el dueño de la tabla.
			</Typography>

			<TableContainer component={Paper} elevation={0} sx={{ maxHeight: "calc(100dvh - 460px)" }}>
				<Table size="small" stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell>Fuero</TableCell>
							<TableCell>Objeto</TableCell>
							<TableCell>Acto</TableCell>
							<TableCell>Plazo dominante</TableCell>
							<TableCell>n</TableCell>
							<TableCell>Consist.</TableCell>
							<TableCell>Norma citada</TableCell>
							<TableCell>Variantes</TableCell>
							<TableCell>Regla vigente</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 6 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={9}>
										<Skeleton />
									</TableCell>
								</TableRow>
							))
						) : (
							candidatos.map((c, i) => (
								<TableRow key={i} hover>
									<TableCell>{c.fuero}</TableCell>
									<TableCell sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
										{c.objeto || "—"}
									</TableCell>
									<TableCell>{c.acto}</TableCell>
									<TableCell>
										<Tooltip
											title={
												c.ejemplos.length ? (
													<Stack spacing={1}>
														{c.ejemplos.map((e, j) => (
															<Typography key={j} variant="caption" sx={{ fontFamily: "monospace" }}>
																«{e}»
															</Typography>
														))}
													</Stack>
												) : (
													""
												)
											}
										>
											<Chip size="small" color="primary" variant="outlined" label={`${c.plazoDias}d ${c.tipoPlazo || "habiles"}`} />
										</Tooltip>
									</TableCell>
									<TableCell>{c.n}</TableCell>
									<TableCell>{Math.round(c.share * 100)}%</TableCell>
									<TableCell sx={{ maxWidth: 180 }}>
										{(c.normasCitadas || []).length ? (
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{(c.normasCitadas || []).join(" · ")}
											</Typography>
										) : (
											<Typography variant="caption" color="text.secondary">
												—
											</Typography>
										)}
									</TableCell>
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{c.variantes.map((v) => `${v.plazoDias}d×${v.n}`).join(" · ")}
										</Typography>
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
											{c.reglaExistente ? (
												<Chip
													size="small"
													color={c.reglaExistente.coincide ? "success" : "warning"}
													variant="outlined"
													label={
														c.reglaExistente.coincide
															? `✓ ${c.reglaExistente.clave}`
															: `⚠ ${c.reglaExistente.clave}: ${c.reglaExistente.plazoDias}d ≠ ${c.plazoDias}d`
													}
												/>
											) : (
												<Chip size="small" color="info" variant="outlined" label="SIN REGLA" />
											)}
											{(!c.reglaExistente || !c.reglaExistente.coincide) && (
												<Tooltip title="Pre-carga el formulario de Normativa con los datos y la evidencia de este candidato — vos revisás la cita legal y confirmás">
													<Button size="small" variant="outlined" onClick={() => crearReglaDesde(c)}>
														Crear regla
													</Button>
												</Tooltip>
											)}
										</Stack>
									</TableCell>
								</TableRow>
							))
						)}
						{!loading && candidatos.length === 0 && (
							<TableRow>
								<TableCell colSpan={9}>
									<Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
										Aún no hay combinaciones que superen los umbrales — el dataset se está cosechando (worker plazos-dataset).
									</Typography>
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<Divider />
			<Box>
				<RevisionSection
					actosConocidos={Array.from(
						new Set([
							...ACTOS_BASE,
							...(stats?.porActo || []).map((a) => a.acto),
						]),
					).sort()}
				/>
			</Box>

			{nuevaRegla && (
				<ReglaDialog
					regla={nuevaRegla}
					esNueva
					onClose={() => setNuevaRegla(null)}
					onSaved={() => {
						setNuevaRegla(null);
						fetchAll();
					}}
				/>
			)}
		</Stack>
	);
}
