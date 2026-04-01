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
	Pagination,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh, TickCircle, CloseCircle, SearchNormal1, Setting2, DocumentText, Chart, Lock1 } from "iconsax-react";
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

const LIMIT = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, sub }: { label: string; value: number | string; color?: string; sub?: string }) {
	const theme = useTheme();
	return (
		<Paper variant="outlined" sx={{ p: 2, minWidth: 120, borderColor: color ? alpha(color, 0.35) : undefined, bgcolor: color ? alpha(color, 0.04) : undefined }}>
			<Typography variant="h4" fontWeight={700} color={color || "text.primary"}>
				{typeof value === "number" ? value.toLocaleString("es-AR") : value}
			</Typography>
			<Typography variant="caption" color="text.secondary">{label}</Typography>
			{sub && <Typography variant="caption" color="text.disabled" display="block">{sub}</Typography>}
		</Paper>
	);
}

function fmtDate(d?: string) {
	if (!d) return "-";
	return new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

function timeAgo(d?: string): string {
	if (!d) return "—";
	const diffMs = Date.now() - new Date(d).getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return "hace un momento";
	if (diffMin < 60) return `hace ${diffMin} min`;
	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `hace ${diffH}h`;
	const diffD = Math.floor(diffH / 24);
	return `hace ${diffD}d`;
}

// ── Tab: Config — sección General ────────────────────────────────────────────

function ConfigGeneral({ config, local, patch, toggleFuero, toggleDocType }: {
	config: EscritosWorkerConfig | null;
	local: Partial<EscritosWorkerConfig>;
	patch: (k: keyof EscritosWorkerConfig, v: unknown) => void;
	toggleFuero: (f: string) => void;
	toggleDocType: (dt: string) => void;
}) {
	const theme = useTheme();
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
				<TextField label="Año mínimo" type="number" value={local.minYear ?? config?.minYear ?? 2023} onChange={e => patch("minYear", parseInt(e.target.value, 10))} helperText="Solo causas desde este año" size="small" inputProps={{ min: 2000, max: new Date().getFullYear() }} sx={{ flex: 1 }} />
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
		</Stack>
	);
}

// ── Tab: Config — sección Novelty ────────────────────────────────────────────

function ConfigNovelty({ config, local, patch }: {
	config: EscritosWorkerConfig | null;
	local: Partial<EscritosWorkerConfig>;
	patch: (k: keyof EscritosWorkerConfig, v: unknown) => void;
}) {
	const theme = useTheme();
	const noveltyEnabled = local.noveltyEnabled ?? config?.noveltyEnabled ?? false;
	return (
		<Stack spacing={3}>
			<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: noveltyEnabled ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.warning.main, 0.04) }}>
				<FormControlLabel
					control={<Switch checked={noveltyEnabled} onChange={e => patch("noveltyEnabled", e.target.checked)} />}
					label={
						<Box>
							<Typography fontWeight={600}>{noveltyEnabled ? "Novelty detection habilitado" : "Novelty detection deshabilitado"}</Typography>
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
				<TextField label="TopK vecinos" type="number" value={local.noveltyTopK ?? config?.noveltyTopK ?? 5} onChange={e => patch("noveltyTopK", parseInt(e.target.value, 10))} helperText="Vecinos en Pinecone (1-20)" size="small" inputProps={{ min: 1, max: 20 }} sx={{ flex: 1 }} />
				<TextField label="Máx. chunks" type="number" value={local.noveltyMaxChunks ?? config?.noveltyMaxChunks ?? 4} onChange={e => patch("noveltyMaxChunks", parseInt(e.target.value, 10))} helperText="Chunks a analizar (1-10)" size="small" inputProps={{ min: 1, max: 10 }} sx={{ flex: 1 }} />
			</Stack>

			<Stack direction={{ xs: "column", md: "row" }} spacing={2}>
				<TextField label="Umbral review (p75)" type="number" value={local.noveltyThresholdTrack ?? config?.noveltyThresholdTrack ?? 0.194} onChange={e => patch("noveltyThresholdTrack", parseFloat(e.target.value))} helperText="Score mínimo para 'review'" size="small" inputProps={{ min: 0, max: 1, step: 0.001 }} sx={{ flex: 1 }} />
				<TextField label="Umbral alert (p90)" type="number" value={local.noveltyThresholdAlert ?? config?.noveltyThresholdAlert ?? 0.234} onChange={e => patch("noveltyThresholdAlert", parseFloat(e.target.value))} helperText="Score mínimo para 'alert'" size="small" inputProps={{ min: 0, max: 1, step: 0.001 }} sx={{ flex: 1 }} />
				<FormControl size="small" sx={{ flex: 1 }}>
					<InputLabel>Auto-tracking</InputLabel>
					<Select label="Auto-tracking" value={local.noveltyAutoTrackLabel ?? config?.noveltyAutoTrackLabel ?? "alert"} onChange={e => patch("noveltyAutoTrackLabel", e.target.value)}>
						<MenuItem value="review">review — score ≥ p75</MenuItem>
						<MenuItem value="alert">alert — score ≥ p90 (default)</MenuItem>
					</Select>
				</FormControl>
			</Stack>

			<FormControlLabel
				control={<Checkbox checked={local.noveltySameDoctypeFilter ?? config?.noveltySameDoctypeFilter ?? true} onChange={e => patch("noveltySameDoctypeFilter", e.target.checked)} size="small" />}
				label={<Typography variant="body2">Comparar solo contra documentos del mismo tipo</Typography>}
			/>

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
		</Stack>
	);
}

// ── Tab: Configuración (con tabs verticales) ──────────────────────────────────

function ConfigSection() {
	const { enqueueSnackbar } = useSnackbar();
	const [config, setConfig] = useState<EscritosWorkerConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [local, setLocal] = useState<Partial<EscritosWorkerConfig>>({});
	const [dirty, setDirty] = useState(false);
	const [subTab, setSubTab] = useState("general");

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

	return (
		<Stack spacing={3}>
			<Box sx={{ display: "flex", gap: 3 }}>
				{/* Tabs verticales */}
				<Tabs
					orientation="vertical"
					value={subTab}
					onChange={(_, v) => setSubTab(v)}
					sx={{
						borderRight: 1, borderColor: "divider", minWidth: 140,
						"& .MuiTab-root": { alignItems: "flex-start", textTransform: "none", minHeight: 44, px: 2 },
					}}
				>
					<Tab value="general" label="General" icon={<Setting2 size={16} />} iconPosition="start" />
					<Tab value="novelty" label="Novelty" icon={<Lock1 size={16} />} iconPosition="start" />
				</Tabs>

				{/* Contenido */}
				<Box sx={{ flex: 1 }}>
					{subTab === "general" && <ConfigGeneral config={config} local={local} patch={patch} toggleFuero={toggleFuero} toggleDocType={toggleDocType} />}
					{subTab === "novelty" && <ConfigNovelty config={config} local={local} patch={patch} />}
				</Box>
			</Box>

			<Divider />

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

// ── Tab: Resumen ──────────────────────────────────────────────────────────────

function ResumenSection() {
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

	const loadStats = useCallback(async () => {
		setStatsLoading(true);
		try { setStats(await RagWorkersService.getEscritosWorkerStats()); }
		catch { enqueueSnackbar("Error al cargar estadísticas", { variant: "error" }); }
		finally { setStatsLoading(false); }
	}, [enqueueSnackbar]);

	const loadDocs = useCallback(async () => {
		setDocsLoading(true);
		try {
			const data = await RagWorkersService.getEscritosWorkerDocuments({ status: filterStatus || undefined, fuero: filterFuero || undefined, page, limit: LIMIT });
			setDocs(data.docs); setHasMore(data.pagination.hasMore);
		} catch { enqueueSnackbar("Error al cargar documentos", { variant: "error" }); }
		finally { setDocsLoading(false); }
	}, [filterStatus, filterFuero, page, enqueueSnackbar]);

	useEffect(() => { loadStats(); }, [loadStats]);
	useEffect(() => { loadDocs(); }, [loadDocs]);

	return (
		<Stack spacing={3}>
			{/* Stat cards */}
			{statsLoading ? (
				<Stack direction="row" spacing={2}>{[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" width={130} height={72} />)}</Stack>
			) : stats ? (
				<>
					<Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
						<StatCard label="Total" value={stats.total} />
						<StatCard label="Embeddings OK" value={stats.embedded ?? 0} color={theme.palette.success.main} />
						<StatCard label="Con error" value={stats.error ?? 0} color={stats.error ? theme.palette.error.main : undefined} />
						{stats.lastEmbeddedAt && (
							<StatCard label="Último embed" value={timeAgo(stats.lastEmbeddedAt)} sub={fmtDate(stats.lastEmbeddedAt)} />
						)}
					</Stack>

					{/* Por fuero */}
					{stats.byFuero && Object.keys(stats.byFuero).length > 0 && (
						<Box>
							<Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
								Por fuero
							</Typography>
							<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
								{Object.entries(stats.byFuero).map(([fuero, counts]) => {
									const total = counts.embedded + counts.error;
									const pct = total > 0 ? Math.round((counts.embedded / total) * 100) : 0;
									return (
										<Paper key={fuero} variant="outlined" sx={{ p: 1.5, minWidth: 130, flex: "1 1 130px" }}>
											<Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
												<Typography variant="body2" fontWeight={700}>{FUERO_LABELS[fuero] || fuero}</Typography>
												<Typography variant="caption" color="text.secondary">{pct}%</Typography>
											</Stack>
											<LinearProgress variant="determinate" value={pct} sx={{ height: 4, borderRadius: 2, mb: 0.75 }} color="success" />
											<Stack direction="row" spacing={1}>
												<Typography variant="caption" color="success.main">{counts.embedded.toLocaleString("es-AR")} ok</Typography>
												{counts.error > 0 && <Typography variant="caption" color="error.main">{counts.error} err</Typography>}
											</Stack>
										</Paper>
									);
								})}
							</Stack>
						</Box>
					)}
				</>
			) : null}

			{/* Filtros */}
			<Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
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
				</Stack>
				<Button size="small" startIcon={<Refresh size={16} />} onClick={loadDocs} variant="outlined">Actualizar</Button>
			</Stack>

			{/* Tabla */}
			{docsLoading ? <Skeleton variant="rounded" height={200} /> : (
				<>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow sx={{ "& th": { fontWeight: 600, bgcolor: alpha(theme.palette.primary.main, 0.04) } }}>
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

					{/* Paginación con números */}
					<Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
						<Button size="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)} variant="outlined" sx={{ minWidth: 36 }}>‹</Button>
						{Array.from({ length: Math.min(page + (hasMore ? 1 : 0), page + 1) }, (_, i) => {
							const p = Math.max(1, page - 1) + i;
							return (
								<Button key={p} size="small" onClick={() => setPage(p)}
									variant={p === page ? "contained" : "outlined"}
									sx={{ minWidth: 36, px: 0 }}
								>{p}</Button>
							);
						})}
						<Button size="small" disabled={!hasMore} onClick={() => setPage(p => p + 1)} variant="outlined" sx={{ minWidth: 36 }}>›</Button>
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
			{/* Filtros + buscador */}
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

			{!loading && searched && (
				results.length === 0 ? (
					<Alert severity="info">No se encontraron resultados. Probá con un query más amplio o bajá el score mínimo.</Alert>
				) : (
					<Stack spacing={2}>
						<Typography variant="caption" color="text.secondary">{results.length} resultado{results.length !== 1 ? "s" : ""}</Typography>
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
	const [tab, setTab] = useState("resumen");

	const TABS = [
		{ value: "resumen",  label: "Resumen",  icon: <Chart size={16} /> },
		{ value: "busqueda", label: "Búsqueda", icon: <SearchNormal1 size={16} /> },
		{ value: "config",   label: "Config",   icon: <Setting2 size={16} /> },
	];

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<Stack spacing={3}>
				<Stack direction="row" alignItems="baseline" spacing={2}>
					<Typography variant="h5" fontWeight={600}>Escritos Worker</Typography>
					<Typography variant="body2" color="text.secondary">Pipeline de extracción global de PDFs judiciales</Typography>
				</Stack>

				<Paper variant="outlined" sx={{ borderRadius: 2 }}>
					<Tabs
						value={tab}
						onChange={(_, v) => setTab(v)}
						sx={{ borderBottom: 1, borderColor: "divider", px: 2, "& .MuiTab-root": { minHeight: 44, textTransform: "none", gap: 0.75 } }}
					>
						{TABS.map(t => (
							<Tab key={t.value} value={t.value} icon={t.icon} iconPosition="start" label={t.label} />
						))}
					</Tabs>

					<Box sx={{ p: { xs: 2, md: 3 } }}>
						{tab === "resumen"  && <ResumenSection />}
						{tab === "busqueda" && <BusquedaSection />}
						{tab === "config"   && <ConfigSection />}
					</Box>
				</Paper>
			</Stack>
		</Box>
	);
};

export default EscritosWorkerTab;
