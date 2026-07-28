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
	revisarDatasetEjemplo,
	DatasetStats,
	DatasetCandidato,
	DatasetEjemplo,
} from "api/plazos";

// ── Sección Revisión: casos dispersos / cola de verificación humana ──────────

function DescartarDialog({
	ejemplo,
	onClose,
	onDone,
}: {
	ejemplo: DatasetEjemplo | null;
	onClose: () => void;
	onDone: (id: string) => void;
}) {
	const { enqueueSnackbar } = useSnackbar();
	const [notas, setNotas] = useState("");

	useEffect(() => setNotas(""), [ejemplo]);
	if (!ejemplo) return null;

	const descartar = async () => {
		try {
			await revisarDatasetEjemplo(ejemplo._id, "descartado", notas);
			enqueueSnackbar("Ejemplo descartado — excluido de stats y candidatos", { variant: "success" });
			onDone(ejemplo._id);
			onClose();
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.message || "Error", { variant: "error" });
		}
	};

	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Descartar ejemplo</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={1.5}>
					<Typography variant="body2">
						{ejemplo.number}/{ejemplo.year} [{ejemplo.fuero}] · {ejemplo.acto} · {ejemplo.plazoDias}d {ejemplo.tipoPlazo}
					</Typography>
					{ejemplo.snippet && (
						<Typography variant="caption" sx={{ fontFamily: "monospace", bgcolor: "action.hover", p: 1, borderRadius: 1 }}>
							«{ejemplo.snippet}»
						</Typography>
					)}
					<TextField
						size="small"
						label="Motivo (opcional — p.ej. 'no es el plazo del acto, es plazo de pago')"
						value={notas}
						onChange={(e) => setNotas(e.target.value)}
						multiline
						minRows={2}
					/>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancelar</Button>
				<Button color="error" variant="contained" onClick={descartar}>
					Descartar
				</Button>
			</DialogActions>
		</Dialog>
	);
}

function RevisionSection() {
	const { enqueueSnackbar } = useSnackbar();
	const [rows, setRows] = useState<DatasetEjemplo[]>([]);
	const [count, setCount] = useState(0);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);
	const [loading, setLoading] = useState(true);
	const [soloDispersos, setSoloDispersos] = useState(true);
	const [revision, setRevision] = useState("sin_revisar");
	const [descartando, setDescartando] = useState<DatasetEjemplo | null>(null);

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
									</TableCell>
									<TableCell>
										{e._disperso?.sospechoso && <Chip size="small" color="error" variant="outlined" label="≥60d" sx={{ mr: 0.5 }} />}
										{e._disperso?.apartado && (
											<Chip size="small" color="warning" variant="outlined" label={`grupo: ${e._disperso.dominanteGrupo}d (n=${e._disperso.nGrupo})`} />
										)}
										{e.revision?.estado === "descartado" && <Chip size="small" label="descartado" />}
									</TableCell>
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace", display: "block", maxHeight: 60, overflow: "auto" }}>
											«{e.snippet || "—"}»
										</Typography>
									</TableCell>
									<TableCell>
										<Stack direction="row" spacing={0.5}>
											<Tooltip title="Confirmar (el plazo extraído es correcto)">
												<Button size="small" color="success" onClick={() => confirmar(e)}>
													✓
												</Button>
											</Tooltip>
											<Tooltip title="Descartar (falso positivo del extractor)">
												<Button size="small" color="error" onClick={() => setDescartando(e)}>
													✗
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
			<DescartarDialog ejemplo={descartando} onClose={() => setDescartando(null)} onDone={(id) => setRows((prev) => prev.filter((x) => x._id !== id))} />
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
				Candidatos a regla empírica por (fuero, objeto, acto): combinaciones donde el plazo dominante alcanza la consistencia mínima.
				El dataset es evidencia, no autoridad — para aplicar un candidato, creá/ajustá la regla en la tab Normativa citando estos números.
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
							<TableCell>Variantes</TableCell>
							<TableCell>Regla vigente</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							Array.from({ length: 6 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={8}>
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
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{c.variantes.map((v) => `${v.plazoDias}d×${v.n}`).join(" · ")}
										</Typography>
									</TableCell>
									<TableCell>
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
											<Chip size="small" color="info" variant="outlined" label="SIN REGLA — candidato nuevo" />
										)}
									</TableCell>
								</TableRow>
							))
						)}
						{!loading && candidatos.length === 0 && (
							<TableRow>
								<TableCell colSpan={8}>
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
				<RevisionSection />
			</Box>
		</Stack>
	);
}
