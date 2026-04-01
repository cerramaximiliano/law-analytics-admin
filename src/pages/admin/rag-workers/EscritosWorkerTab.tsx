import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	Box,
	Stack,
	Typography,
	TextField,
	Switch,
	FormControlLabel,
	FormGroup,
	Checkbox,
	Button,
	Chip,
	Alert,
	Skeleton,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableRow,
	TableContainer,
	Paper,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	LinearProgress,
	Tooltip,
	Tab,
	Tabs,
	InputAdornment,
	IconButton,
	Card,
	CardContent,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, SearchNormal1, Setting2, DocumentText } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, {
	EscritosWorkerConfig,
	EscritosWorkerStats,
	GlobalDocumentEntry,
	EscritosSearchResult,
} from "api/ragWorkers";

// ── Constantes ───────────────────────────────────────────────────────────────

const ALL_FUEROS = ["CIV", "CNT", "CSS", "COM"];
const FUERO_LABELS: Record<string, string> = { CIV: "Civil", CNT: "Trabajo", CSS: "Seg. Social", COM: "Comercial" };

const ALL_DOC_TYPES = [
	"demanda", "contestacion_demanda", "reconvencion",
	"expresion_agravios", "contestacion_agravios",
	"recurso_extraordinario", "sentencia",
];

const SECTION_TYPES = ["apertura", "hechos", "fundamentos", "petitorio", "body"];

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
	pending: "info", downloading: "info", extracting: "info", extracted: "warning",
	chunking: "info", chunked: "info", embedding: "info", embedded: "success", error: "error",
};

const DOC_STATUS_OPTIONS = ["", "pending", "extracting", "extracted", "embedding", "embedded", "error"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
	const theme = useTheme();
	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.primary.main, 0.03), minWidth: 120 }}>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>
				{typeof value === "number" ? value.toLocaleString("es-AR") : value}
			</Typography>
			<Typography variant="caption" color="text.secondary">{label}</Typography>
		</Box>
	);
}

function fmtDate(d?: string) {
	if (!d) return "-";
	return new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

// ── Tab: Configuración ───────────────────────────────────────────────────────

function ConfigSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<EscritosWorkerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [local, setLocal] = useState<Partial<EscritosWorkerConfig>>({});
	const [dirty, setDirty] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerConfig();
			setConfig(data); setLocal(data); setDirty(false);
		} catch { enqueueSnackbar("Error al cargar configuración", { variant: "error" }); }
		finally { setLoading(false); }
	}, [enqueueSnackbar]);

	useEffect(() => { load(); }, [load]);

	function patch(key: keyof EscritosWorkerConfig, value: unknown) {
		setLocal(p => ({ ...p, [key]: value })); setDirty(true);
	}
	function toggleFuero(f: string) {
		const cur = local.activeFueros ?? config?.activeFueros ?? [];
		patch("activeFueros", cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f]);
	}
	function toggleDocType(dt: string) {
		const cur = local.relevantDocTypes ?? config?.relevantDocTypes ?? [];
		patch("relevantDocTypes", cur.includes(dt) ? cur.filter(x => x !== dt) : [...cur, dt]);
	}

	async function save() {
		setSaving(true);
		try {
			const saved = await RagWorkersService.updateEscritosWorkerConfig(local);
			setConfig(saved); setLocal(saved); setDirty(false);
			enqueueSnackbar("Configuración guardada", { variant: "success" });
		} catch { enqueueSnackbar("Error al guardar", { variant: "error" }); }
		finally { setSaving(false); }
	}

	if (loading) return <Stack spacing={2}>{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}</Stack>;

	const enabled = local.enabled ?? config?.enabled ?? false;

	return (
		<Stack spacing={3}>
			<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: enabled ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05) }}>
				<FormControlLabel
					control={<Switch checked={enabled} onChange={e => patch("enabled", e.target.checked)} />}
					label={
						<Box>
							<Typography fontWeight={600}>{enabled ? "Worker habilitado" : "Worker deshabilitado"}</Typography>
							<Typography variant="caption" color="text.secondary">Cuando está deshabilitado el cron no encola nuevos escritos</Typography>
						</Box>
					}
				/>
			</Box>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField label="Cron de escaneo" value={local.scanCron ?? config?.scanCron ?? ""} onChange={e => patch("scanCron", e.target.value)} helperText="Requiere reinicio del worker" size="small" sx={{ flex: 1 }} />
				<TextField label="Concurrencia" type="number" value={local.concurrency ?? config?.concurrency ?? 3} onChange={e => patch("concurrency", parseInt(e.target.value, 10))} helperText="Workers simultáneos (1-20)" size="small" inputProps={{ min: 1, max: 20 }} sx={{ flex: 1 }} />
				<TextField label="Tamaño máx. PDF (MB)" type="number" value={local.maxPdfSizeMb ?? config?.maxPdfSizeMb ?? 25} onChange={e => patch("maxPdfSizeMb", parseInt(e.target.value, 10))} helperText="PDFs más grandes se ignoran" size="small" inputProps={{ min: 1, max: 100 }} sx={{ flex: 1 }} />
				<TextField label="Año mínimo" type="number" value={local.minYear ?? config?.minYear ?? 2023} onChange={e => patch("minYear", parseInt(e.target.value, 10))} helperText="Solo causas desde este año (isValid=true)" size="small" inputProps={{ min: 2000, max: new Date().getFullYear() }} sx={{ flex: 1 }} />
			</Stack>

			<TextField label="Pausar hasta" type="datetime-local" value={local.pauseUntil ? new Date(local.pauseUntil).toISOString().slice(0, 16) : ""}
				onChange={e => patch("pauseUntil", e.target.value ? new Date(e.target.value).toISOString() : null)}
				helperText="Dejar vacío para no pausar" size="small" InputLabelProps={{ shrink: true }} sx={{ maxWidth: 300 }} />

			<Box>
				<Typography variant="body2" fontWeight={600} mb={1}>Fueros activos</Typography>
				<FormGroup row>
					{ALL_FUEROS.map(f => (
						<FormControlLabel key={f} control={<Checkbox checked={(local.activeFueros ?? config?.activeFueros ?? []).includes(f)} onChange={() => toggleFuero(f)} size="small" />} label={FUERO_LABELS[f] || f} />
					))}
				</FormGroup>
			</Box>

			<Box>
				<Typography variant="body2" fontWeight={600} mb={1}>Tipos de documento</Typography>
				<Stack direction="row" flexWrap="wrap" gap={1}>
					{ALL_DOC_TYPES.map(dt => {
						const active = (local.relevantDocTypes ?? config?.relevantDocTypes ?? []).includes(dt);
						return <Chip key={dt} label={dt} size="small" variant={active ? "filled" : "outlined"} color={active ? "primary" : "default"} onClick={() => toggleDocType(dt)} sx={{ cursor: "pointer" }} />;
					})}
				</Stack>
			</Box>

			<Divider />

			<Box>
				<Typography variant="body2" fontWeight={700} mb={0.5}>Novelty Detection</Typography>
				<Typography variant="caption" color="text.secondary">Configuración de la fase 2: detección de novedad jurídica</Typography>
			</Box>

			<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: (local.noveltyEnabled ?? config?.noveltyEnabled) ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.warning.main, 0.04) }}>
				<FormControlLabel
					control={<Switch checked={local.noveltyEnabled ?? config?.noveltyEnabled ?? false} onChange={e => patch("noveltyEnabled", e.target.checked)} />}
					label={
						<Box>
							<Typography fontWeight={600}>{(local.noveltyEnabled ?? config?.noveltyEnabled) ? "Novelty detection habilitado" : "Novelty detection deshabilitado"}</Typography>
							<Typography variant="caption" color="text.secondary">Cuando está deshabilitado, los docs se marcan como 'skipped'</Typography>
						</Box>
					}
				/>
			</Box>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<FormControl size="small" sx={{ flex: 1 }}>
					<InputLabel>Estrategia</InputLabel>
					<Select label="Estrategia" value={local.noveltyStrategy ?? config?.noveltyStrategy ?? "A"} onChange={e => patch("noveltyStrategy", e.target.value)}>
						<MenuItem value="A">A — Prioridad por sección (fundamentos › hechos › body)</MenuItem>
						<MenuItem value="B">B — Zona de argumentos (todo excepto apertura/petitorio)</MenuItem>
					</Select>
				</FormControl>
				<TextField label="TopK vecinos" type="number" value={local.noveltyTopK ?? config?.noveltyTopK ?? 5} onChange={e => patch("noveltyTopK", parseInt(e.target.value, 10))} helperText="Vecinos consultados en Pinecone (1-20)" size="small" inputProps={{ min: 1, max: 20 }} sx={{ flex: 1 }} />
				<TextField label="Máx. chunks" type="number" value={local.noveltyMaxChunks ?? config?.noveltyMaxChunks ?? 4} onChange={e => patch("noveltyMaxChunks", parseInt(e.target.value, 10))} helperText="Chunks a analizar por documento (1-10)" size="small" inputProps={{ min: 1, max: 10 }} sx={{ flex: 1 }} />
			</Stack>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField label="Umbral review (p75)" type="number" value={local.noveltyThresholdTrack ?? config?.noveltyThresholdTrack ?? 0.194} onChange={e => patch("noveltyThresholdTrack", parseFloat(e.target.value))} helperText="Score mínimo para label 'review'" size="small" inputProps={{ min: 0, max: 1, step: 0.001 }} sx={{ flex: 1 }} />
				<TextField label="Umbral alert (p90)" type="number" value={local.noveltyThresholdAlert ?? config?.noveltyThresholdAlert ?? 0.234} onChange={e => patch("noveltyThresholdAlert", parseFloat(e.target.value))} helperText="Score mínimo para label 'alert'" size="small" inputProps={{ min: 0, max: 1, step: 0.001 }} sx={{ flex: 1 }} />
				<FormControl size="small" sx={{ flex: 1 }}>
					<InputLabel>Auto-tracking</InputLabel>
					<Select label="Auto-tracking" value={local.noveltyAutoTrackLabel ?? config?.noveltyAutoTrackLabel ?? "alert"} onChange={e => patch("noveltyAutoTrackLabel", e.target.value)}>
						<MenuItem value="review">review — marcar causas con score ≥ p75</MenuItem>
						<MenuItem value="alert">alert — marcar causas con score ≥ p90 (default)</MenuItem>
					</Select>
				</FormControl>
			</Stack>

			<Box>
				<FormControlLabel
					control={<Checkbox checked={local.noveltySameDoctypeFilter ?? config?.noveltySameDoctypeFilter ?? true} onChange={e => patch("noveltySameDoctypeFilter", e.target.checked)} size="small" />}
					label={<Typography variant="body2">Comparar solo contra documentos del mismo tipo (noveltySameDoctypeFilter)</Typography>}
				/>
			</Box>

			<Box>
				<Typography variant="body2" fontWeight={600} mb={1}>DocTypes para novelty</Typography>
				<Stack direction="row" flexWrap="wrap" gap={1}>
					{ALL_DOC_TYPES.map(dt => {
						const active = (local.noveltyDocTypes ?? config?.noveltyDocTypes ?? []).includes(dt);
						return (
							<Chip key={dt} label={dt} size="small" variant={active ? "filled" : "outlined"} color={active ? "secondary" : "default"}
								onClick={() => {
									const cur = local.noveltyDocTypes ?? config?.noveltyDocTypes ?? [];
									patch("noveltyDocTypes", active ? cur.filter(x => x !== dt) : [...cur, dt]);
								}}
								sx={{ cursor: "pointer" }} />
						);
					})}
				</Stack>
			</Box>

			<Stack direction="row" spacing={2} alignItems="center">
				<Button variant="contained" onClick={save} disabled={!dirty || saving} startIcon={<TickCircle size={18} />}>
					{saving ? "Guardando..." : "Guardar cambios"}
				</Button>
				{dirty && (
					<Button variant="outlined" color="inherit" onClick={() => { setLocal(config || {}); setDirty(false); }} startIcon={<CloseCircle size={18} />}>
						Descartar
					</Button>
				)}
				{dirty && <Alert severity="warning" sx={{ py: 0.5, px: 1 }}>Cambios sin guardar</Alert>}
			</Stack>
		</Stack>
	);
}

// ── Tab: Documentos ──────────────────────────────────────────────────────────

function DocumentosSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<EscritosWorkerStats | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);
	const [docs, setDocs] = useState<GlobalDocumentEntry[]>([]);
	const [hasMore, setHasMore] = useState(false);
	const [docsLoading, setDocsLoading] = useState(true);
	const [filterStatus, setFilterStatus] = useState("");
	const [filterFuero, setFilterFuero] = useState("");
	const [page, setPage] = useState(1);
	const limit = 20;

	const loadStats = useCallback(async () => {
		setStatsLoading(true);
		try { setStats(await RagWorkersService.getEscritosWorkerStats()); }
		catch { enqueueSnackbar("Error al cargar estadísticas", { variant: "error" }); }
		finally { setStatsLoading(false); }
	}, [enqueueSnackbar]);

	const loadDocs = useCallback(async () => {
		setDocsLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerDocuments({ status: filterStatus || undefined, fuero: filterFuero || undefined, page, limit });
			setDocs(data.docs); setHasMore(data.pagination.hasMore);
		} catch { enqueueSnackbar("Error al cargar documentos", { variant: "error" }); }
		finally { setDocsLoading(false); }
	}, [filterStatus, filterFuero, page, enqueueSnackbar]);

	useEffect(() => { loadStats(); }, [loadStats]);
	useEffect(() => { loadDocs(); }, [loadDocs]);

	return (
		<Stack spacing={3}>
			{/* Stats */}
			{statsLoading ? (
				<Stack direction="row" spacing={2}>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" width={130} height={70} />)}</Stack>
			) : stats ? (
				<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
					<StatCard label="Total documentos" value={stats.total} />
				</Stack>
			) : null}

			<Divider />

			{/* Filtros + tabla */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Typography variant="subtitle2" fontWeight={600}>Documentos procesados</Typography>
				<Stack direction="row" spacing={1}>
					<FormControl size="small" sx={{ minWidth: 130 }}>
						<InputLabel>Estado</InputLabel>
						<Select value={filterStatus} label="Estado" onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
							{DOC_STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s || "Todos"}</MenuItem>)}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 110 }}>
						<InputLabel>Fuero</InputLabel>
						<Select value={filterFuero} label="Fuero" onChange={e => { setFilterFuero(e.target.value); setPage(1); }}>
							<MenuItem value="">Todos</MenuItem>
							{ALL_FUEROS.map(f => <MenuItem key={f} value={f}>{FUERO_LABELS[f]}</MenuItem>)}
						</Select>
					</FormControl>
					<Button size="small" startIcon={<Refresh size={16} />} onClick={loadDocs} variant="outlined">Actualizar</Button>
				</Stack>
			</Stack>

			{docsLoading ? <Skeleton variant="rounded" height={200} /> : (
				<>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Tipo doc.</TableCell>
									<TableCell>Fuero</TableCell>
									<TableCell>Estado</TableCell>
									<TableCell align="right">Chars</TableCell>
									<TableCell align="right">Chunks</TableCell>
									<TableCell>Actualizado</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{docs.length === 0 ? (
									<TableRow><TableCell colSpan={6} align="center"><Typography variant="body2" color="text.secondary" py={2}>No hay documentos</Typography></TableCell></TableRow>
								) : docs.map(doc => (
									<TableRow key={doc._id} hover>
										<TableCell><Typography variant="caption">{doc.docType || doc.movimientoTipo || "-"}</Typography></TableCell>
										<TableCell><Chip label={doc.fuero || "-"} size="small" variant="outlined" /></TableCell>
										<TableCell><Chip label={doc.status} size="small" color={STATUS_COLORS[doc.status] || "default"} /></TableCell>
										<TableCell align="right"><Typography variant="caption">{doc.charCount?.toLocaleString("es-AR") || "-"}</Typography></TableCell>
										<TableCell align="right"><Typography variant="caption">{doc.chunksCount || "-"}</Typography></TableCell>
										<TableCell><Typography variant="caption">{fmtDate(doc.updatedAt)}</Typography></TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
					<Stack direction="row" justifyContent="flex-end" alignItems="center">
						<Stack direction="row" spacing={1} alignItems="center">
							<Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
							<Typography variant="caption">Pág. {page}</Typography>
							<Button size="small" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
						</Stack>
					</Stack>
				</>
			)}
		</Stack>
	);
}

// ── Tab: Búsqueda ────────────────────────────────────────────────────────────

function BusquedaSection() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [query, setQuery] = useState("");
	const [filterFuero, setFilterFuero] = useState("");
	const [filterDocType, setFilterDocType] = useState("");
	const [filterSection, setFilterSection] = useState("");
	const [minScore, setMinScore] = useState(0.3);
	const [results, setResults] = useState<EscritosSearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function search() {
		if (!query.trim() || query.trim().length < 3) {
			enqueueSnackbar("Ingresá al menos 3 caracteres", { variant: "warning" }); return;
		}
		setLoading(true); setSearched(true);
		try {
			const { data } = await RagWorkersService.searchEscritosWorker(query, {
				fuero: filterFuero || undefined,
				docType: filterDocType || undefined,
				sectionType: filterSection || undefined,
				limit: 10,
				minScore,
			});
			setResults(data);
		} catch { enqueueSnackbar("Error en la búsqueda", { variant: "error" }); }
		finally { setLoading(false); }
	}

	function scoreColor(score: number) {
		if (score >= 0.8) return theme.palette.success.main;
		if (score >= 0.6) return theme.palette.warning.main;
		return theme.palette.error.main;
	}

	return (
		<Stack spacing={3}>
			<Box>
				<Typography variant="subtitle2" fontWeight={600} mb={0.5}>Búsqueda semántica en escritos</Typography>
				<Typography variant="body2" color="text.secondary">Buscá planteos jurídicos, argumentos o texto en todos los escritos procesados (namespace global-chunks).</Typography>
			</Box>

			{/* Filtros */}
			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Fuero</InputLabel>
					<Select value={filterFuero} label="Fuero" onChange={e => setFilterFuero(e.target.value)}>
						<MenuItem value="">Todos</MenuItem>
						{ALL_FUEROS.map(f => <MenuItem key={f} value={f}>{FUERO_LABELS[f]}</MenuItem>)}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 180 }}>
					<InputLabel>Tipo de documento</InputLabel>
					<Select value={filterDocType} label="Tipo de documento" onChange={e => setFilterDocType(e.target.value)}>
						<MenuItem value="">Todos</MenuItem>
						{ALL_DOC_TYPES.map(dt => <MenuItem key={dt} value={dt}>{dt}</MenuItem>)}
					</Select>
				</FormControl>
				<FormControl size="small" sx={{ minWidth: 150 }}>
					<InputLabel>Sección</InputLabel>
					<Select value={filterSection} label="Sección" onChange={e => setFilterSection(e.target.value)}>
						<MenuItem value="">Todas</MenuItem>
						{SECTION_TYPES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
					</Select>
				</FormControl>
				<TextField label="Score mínimo" type="number" size="small" value={minScore} onChange={e => setMinScore(parseFloat(e.target.value))} inputProps={{ min: 0, max: 1, step: 0.05 }} sx={{ width: 130 }} />
			</Stack>

			{/* Buscador */}
			<TextField
				inputRef={inputRef}
				fullWidth
				multiline
				minRows={2}
				maxRows={5}
				placeholder="Ej: responsabilidad objetiva del empleador por accidente de trabajo..."
				value={query}
				onChange={e => setQuery(e.target.value)}
				onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) search(); }}
				InputProps={{
					endAdornment: (
						<InputAdornment position="end" sx={{ alignSelf: "flex-end", mb: 1 }}>
							<IconButton onClick={search} disabled={loading || query.trim().length < 3} color="primary">
								<SearchNormal1 size={20} />
							</IconButton>
						</InputAdornment>
					),
				}}
				helperText="Ctrl+Enter para buscar"
			/>

			<Button variant="contained" onClick={search} disabled={loading || query.trim().length < 3} startIcon={<SearchNormal1 size={18} />} sx={{ alignSelf: "flex-start" }}>
				{loading ? "Buscando..." : "Buscar en escritos"}
			</Button>

			{loading && <LinearProgress />}

			{/* Resultados */}
			{!loading && searched && (
				results.length === 0 ? (
					<Alert severity="info">No se encontraron resultados. Probá con un query más amplio o bajá el score mínimo.</Alert>
				) : (
					<Stack spacing={2}>
						<Typography variant="body2" color="text.secondary">{results.length} resultado{results.length !== 1 ? "s" : ""}</Typography>
						{results.map((r, i) => (
							<Card key={r.id} variant="outlined">
								<CardContent sx={{ pb: "12px !important" }}>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
										<Stack direction="row" spacing={1} flexWrap="wrap">
											{r.fuero && <Chip label={r.fuero} size="small" variant="outlined" />}
											{r.docType && <Chip label={r.docType} size="small" color="primary" variant="outlined" />}
											{r.sectionType && <Chip label={r.sectionType} size="small" />}
											{r.chunkIndex !== null && <Chip label={`chunk #${r.chunkIndex}`} size="small" variant="outlined" />}
										</Stack>
										<Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
											<Typography variant="caption" color="text.secondary">#{i + 1}</Typography>
											<Chip
												label={r.score.toFixed(3)}
												size="small"
												sx={{ bgcolor: alpha(scoreColor(r.score), 0.12), color: scoreColor(r.score), fontWeight: 700 }}
											/>
										</Stack>
									</Stack>
									{r.causeId && (
										<Typography variant="caption" color="text.secondary" display="block" mb={1}>
											Causa: <code>{r.causeId}</code>
										</Typography>
									)}
									<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", color: "text.secondary", maxHeight: 200, overflow: "auto" }}>
										{r.preview || "(sin preview)"}
									</Typography>
								</CardContent>
							</Card>
						))}
					</Stack>
				)
			)}
		</Stack>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

const EscritosWorkerTab: React.FC = () => {
	const [tab, setTab] = useState("documentos");

	const TABS = [
		{ value: "documentos", label: "Documentos", icon: <DocumentText size={18} /> },
		{ value: "busqueda",   label: "Búsqueda",   icon: <SearchNormal1 size={18} /> },
		{ value: "config",     label: "Config",     icon: <Setting2 size={18} /> },
	];

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Stack spacing={3}>
				<Box>
					<Typography variant="h5" fontWeight={600}>Escritos Worker</Typography>
					<Typography variant="body2" color="text.secondary">Pipeline de extracción global de PDFs judiciales</Typography>
				</Box>

				<Paper variant="outlined" sx={{ borderRadius: 2 }}>
					<Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", px: 1, "& .MuiTab-root": { minHeight: 48, textTransform: "none" } }}>
						{TABS.map(t => (
							<Tab key={t.value} value={t.value} label={
								<Stack direction="row" spacing={0.75} alignItems="center">
									{t.icon}
									<span>{t.label}</span>
								</Stack>
							} />
						))}
					</Tabs>

					<Box sx={{ p: { xs: 2, md: 3 } }}>
						{tab === "documentos" && <DocumentosSection />}
						{tab === "busqueda"   && <BusquedaSection />}
						{tab === "config"     && <ConfigSection />}
					</Box>
				</Paper>
			</Stack>
		</Box>
	);
};

export default EscritosWorkerTab;
