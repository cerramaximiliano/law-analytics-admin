import { useState } from "react";
import {
	Alert,
	Box,
	Button,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Collapse,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Slider,
	Stack,
	Tab,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ArrowDown2, ArrowUp2, DocumentText1, Refresh, SearchNormal1, Link21 } from "iconsax-react";
import MainCard from "components/MainCard";
import SentenciasSearchService, { SearchFilters, SearchOptions, SentenciaResult } from "api/sentenciasSearch";
import { Fuero, SentenciaTipo } from "api/sentenciasCapturadas";

// ── Helpers ────────────────────────────────────────────────────────────────────

const FUERO_COLOR: Record<Fuero, string> = {
	CIV: "#1565c0",
	CSS: "#6a1b9a",
	CNT: "#2e7d32",
	COM: "#e65100",
};

const TIPO_LABEL: Record<SentenciaTipo, string> = {
	primera_instancia: "1ª Instancia",
	camara: "Cámara",
	interlocutoria: "Interlocutoria",
	honorarios: "Honorarios",
	definitiva: "Definitiva",
	resolucion: "Resolución",
	otro: "Otro",
};

const SECTION_LABEL: Record<string, string> = {
	tribunal: "Tribunal",
	antecedentes: "Antecedentes",
	considerando: "Considerando",
	voto: "Voto",
	resolucion: "Resolución",
	body: "Cuerpo",
};

const SECTION_COLOR: Record<string, string> = {
	tribunal: "#0277bd",
	antecedentes: "#558b2f",
	considerando: "#6a1b9a",
	voto: "#e65100",
	resolucion: "#b71c1c",
	body: "#37474f",
};

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function scoreColor(score: number) {
	if (score >= 0.88) return "success";
	if (score >= 0.78) return "warning";
	return "default";
}

// ── Chunk expandable ──────────────────────────────────────────────────────────

function ChunkCard({ chunk, matched }: { chunk: { index: number; sectionType: string; text: string; score?: number }; matched?: boolean }) {
	const theme = useTheme();
	const [open, setOpen] = useState(matched ?? false);
	const color = SECTION_COLOR[chunk.sectionType] || "#37474f";
	const label = SECTION_LABEL[chunk.sectionType] || chunk.sectionType;

	return (
		<Box
			sx={{
				border: `1px solid ${matched ? alpha(color, 0.4) : theme.palette.divider}`,
				borderRadius: 1.5,
				overflow: "hidden",
				bgcolor: matched ? alpha(color, 0.04) : "transparent",
			}}
		>
			<Stack
				direction="row"
				alignItems="center"
				spacing={1}
				sx={{ px: 1.5, py: 0.75, cursor: "pointer" }}
				onClick={() => setOpen((p) => !p)}
			>
				<Chip label={label} size="small" sx={{ bgcolor: alpha(color, 0.12), color, fontWeight: 600, fontSize: 11 }} />
				<Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1 }}>
					{chunk.text.slice(0, 100)}…
				</Typography>
				{chunk.score !== undefined && (
					<Chip label={chunk.score.toFixed(3)} size="small" color={scoreColor(chunk.score)} variant="outlined" sx={{ fontSize: 11 }} />
				)}
				{open ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
			</Stack>
			<Collapse in={open}>
				<Divider />
				<Box sx={{ px: 2, py: 1.5 }}>
					<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
						{chunk.text}
					</Typography>
				</Box>
			</Collapse>
		</Box>
	);
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, index }: { result: SentenciaResult; index: number }) {
	const theme = useTheme();
	const [showFull, setShowFull] = useState(false);
	const [loadedText, setLoadedText] = useState<string | null>(null);
	const [loadingFull, setLoadingFull] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const { sentencia, score, matchedChunks } = result;
	const fueroColor = FUERO_COLOR[sentencia.fuero] || theme.palette.primary.main;

	const handleLoadFull = async () => {
		if (loadedText !== null) {
			setShowFull((p) => !p);
			return;
		}
		setLoadingFull(true);
		setLoadError(null);
		try {
			const text = await SentenciasSearchService.getTexto(sentencia._id);
			setLoadedText(text);
			setShowFull(true);
		} catch {
			setLoadError("No se pudo cargar el texto completo");
		} finally {
			setLoadingFull(false);
		}
	};

	return (
		<Card variant="outlined" sx={{ borderLeft: `4px solid ${fueroColor}` }}>
			<CardContent sx={{ pb: "12px !important" }}>
				{/* Header */}
				<Stack direction="row" alignItems="flex-start" spacing={1} mb={1}>
					<Typography variant="caption" color="text.disabled" sx={{ pt: 0.3, minWidth: 20 }}>
						#{index + 1}
					</Typography>
					<Box flex={1}>
						<Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.3 }}>
							{sentencia.caratula || "Sin carátula"}
						</Typography>
						<Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
							<Chip
								label={sentencia.fuero}
								size="small"
								sx={{ bgcolor: alpha(fueroColor, 0.12), color: fueroColor, fontWeight: 700, fontSize: 11 }}
							/>
							<Chip
								label={TIPO_LABEL[sentencia.sentenciaTipo] || sentencia.sentenciaTipo}
								size="small"
								variant="outlined"
								sx={{ fontSize: 11 }}
							/>
							{sentencia.year && <Chip label={sentencia.year} size="small" variant="outlined" sx={{ fontSize: 11 }} />}
							{sentencia.category === "novelty" && <Chip label="Novelty" size="small" color="secondary" sx={{ fontSize: 11 }} />}
						</Stack>
					</Box>
					<Chip label={`Score ${score.toFixed(3)}`} size="small" color={scoreColor(score)} />
				</Stack>

				{/* Metadata */}
				<Stack direction="row" flexWrap="wrap" gap={2} mb={1.5}>
					{sentencia.juzgado && (
						<Typography variant="caption" color="text.secondary">
							Juzgado {sentencia.juzgado}
							{sentencia.sala ? ` · Sala ${sentencia.sala}` : ""}
						</Typography>
					)}
					{sentencia.movimientoFecha && (
						<Typography variant="caption" color="text.secondary">
							{fmtDate(sentencia.movimientoFecha)}
						</Typography>
					)}
					{sentencia.movimientoTipo && (
						<Typography variant="caption" color="text.secondary">
							{sentencia.movimientoTipo}
						</Typography>
					)}
				</Stack>

				{/* AI Summary */}
				{sentencia.aiSummary?.status === "approved" && (
					<Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
						<Typography variant="caption" sx={{ whiteSpace: "pre-wrap" }}>
							{sentencia.aiSummary.content.slice(0, 400)}
							{sentencia.aiSummary.content.length > 400 ? "…" : ""}
						</Typography>
					</Alert>
				)}

				{/* Secciones coincidentes */}
				{matchedChunks.length > 0 && (
					<Box mb={1}>
						<Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={0.5}>
							SECCIONES COINCIDENTES ({matchedChunks.length})
						</Typography>
						<Stack spacing={0.5}>
							{matchedChunks.map((chunk) => (
								<ChunkCard key={chunk.index} chunk={chunk} matched />
							))}
						</Stack>
					</Box>
				)}

				{/* Fallo completo — carga bajo demanda */}
				<Box>
					<Button
						size="small"
						variant="text"
						onClick={handleLoadFull}
						disabled={loadingFull}
						startIcon={
							loadingFull ? <CircularProgress size={12} color="inherit" /> : showFull ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />
						}
					>
						{loadingFull ? "Cargando fallo…" : showFull ? "Ocultar fallo completo" : "Ver fallo completo"}
					</Button>
					{loadError && (
						<Typography variant="caption" color="error" ml={1}>
							{loadError}
						</Typography>
					)}
					<Collapse in={showFull}>
						{loadedText !== null && (
							<Box
								sx={{
									mt: 1,
									p: 2,
									border: `1px solid ${theme.palette.divider}`,
									borderRadius: 1.5,
									bgcolor: theme.palette.mode === "dark" ? "grey.900" : "grey.50",
									maxHeight: 600,
									overflowY: "auto",
								}}
							>
								<Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontFamily: "monospace", fontSize: 12 }}>
									{loadedText}
								</Typography>
							</Box>
						)}
					</Collapse>
				</Box>
			</CardContent>
		</Card>
	);
}

// ── Latency badge ─────────────────────────────────────────────────────────────

function LatencyBadge({ label, ms }: { label: string; ms: number }) {
	return (
		<Stack direction="row" spacing={0.5} alignItems="center">
			<Typography variant="caption" color="text.disabled">
				{label}
			</Typography>
			<Chip label={`${ms}ms`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
		</Stack>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JurisprudenciaPjnPage() {
	const theme = useTheme();
	const [tab, setTab] = useState(0);

	// Búsqueda semántica
	const [query, setQuery] = useState("");
	const [filters, setFilters] = useState<SearchFilters>({});
	const [options, setOptions] = useState<SearchOptions>({ topK: 5, minScore: 0.6, includeFullText: false });

	// Búsqueda por similitud
	const [sentenciaId, setSentenciaId] = useState("");

	// Estado compartido
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<SentenciaResult[] | null>(null);
	const [latency, setLatency] = useState<SearchResponse["latencyMs"] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lastQuery, setLastQuery] = useState<string>("");

	type SearchResponse = Awaited<ReturnType<typeof SentenciasSearchService.buscar>>;

	const handleBuscar = async () => {
		if (!query.trim()) return;
		setLoading(true);
		setError(null);
		setResults(null);
		try {
			const res = await SentenciasSearchService.buscar(query.trim(), filters, options);
			setResults(res.results);
			setLatency(res.latencyMs);
			setLastQuery(query.trim());
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setError(err.response?.data?.message || err.message || "Error al ejecutar la búsqueda");
		} finally {
			setLoading(false);
		}
	};

	const handleBuscarSimilar = async () => {
		if (!sentenciaId.trim()) return;
		setLoading(true);
		setError(null);
		setResults(null);
		try {
			const res = await SentenciasSearchService.buscarSimilares(sentenciaId.trim(), options);
			setResults(res.results);
			setLatency(res.latencyMs);
			setLastQuery(`Similares a: ${sentenciaId.trim()}`);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setError(err.response?.data?.message || err.message || "Error al ejecutar la búsqueda");
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setResults(null);
		setLatency(null);
		setError(null);
		setLastQuery("");
	};

	return (
		<MainCard title="Jurisprudencia PJN — Búsqueda Semántica">
			<Stack spacing={3}>
				{/* Tabs de modo */}
				<Tabs
					value={tab}
					onChange={(_, v) => {
						setTab(v);
						handleReset();
					}}
					sx={{ borderBottom: 1, borderColor: "divider" }}
				>
					<Tab icon={<SearchNormal1 size={16} />} iconPosition="start" label="Por texto" />
					<Tab icon={<DocumentText1 size={16} />} iconPosition="start" label="Por similitud" />
				</Tabs>

				{/* ── Formulario: búsqueda semántica ── */}
				{tab === 0 && (
					<Stack spacing={2}>
						<TextField
							label="Consulta"
							placeholder="Ej: daño moral accidente de tránsito responsabilidad civil"
							fullWidth
							multiline
							minRows={2}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && e.ctrlKey) handleBuscar();
							}}
							helperText="Ctrl+Enter para buscar"
						/>

						{/* Filtros */}
						<Box>
							<Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
								FILTROS (opcionales)
							</Typography>
							<Grid container spacing={2}>
								<Grid item xs={6} sm={3}>
									<FormControl fullWidth size="small">
										<InputLabel>Fuero</InputLabel>
										<Select
											label="Fuero"
											value={filters.fuero || ""}
											onChange={(e) => setFilters((f) => ({ ...f, fuero: (e.target.value as Fuero) || undefined }))}
										>
											<MenuItem value="">Todos</MenuItem>
											<MenuItem value="CIV">Civil</MenuItem>
											<MenuItem value="CSS">Seg. Social</MenuItem>
											<MenuItem value="CNT">Trabajo</MenuItem>
											<MenuItem value="COM">Comercial</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={6} sm={3}>
									<FormControl fullWidth size="small">
										<InputLabel>Tipo</InputLabel>
										<Select
											label="Tipo"
											value={filters.sentenciaTipo || ""}
											onChange={(e) => setFilters((f) => ({ ...f, sentenciaTipo: (e.target.value as SentenciaTipo) || undefined }))}
										>
											<MenuItem value="">Todos</MenuItem>
											<MenuItem value="primera_instancia">1ª Instancia</MenuItem>
											<MenuItem value="camara">Cámara</MenuItem>
											<MenuItem value="interlocutoria">Interlocutoria</MenuItem>
											<MenuItem value="definitiva">Definitiva</MenuItem>
											<MenuItem value="honorarios">Honorarios</MenuItem>
											<MenuItem value="resolucion">Resolución</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={6} sm={3}>
									<TextField
										label="Año"
										type="number"
										size="small"
										fullWidth
										value={filters.year || ""}
										onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value ? Number(e.target.value) : undefined }))}
										inputProps={{ min: 2000, max: 2030 }}
									/>
								</Grid>
								<Grid item xs={6} sm={3}>
									<FormControl fullWidth size="small">
										<InputLabel>Categoría</InputLabel>
										<Select
											label="Categoría"
											value={filters.category || ""}
											onChange={(e) => setFilters((f) => ({ ...f, category: (e.target.value as "novelty" | "rutina") || undefined }))}
										>
											<MenuItem value="">Todas</MenuItem>
											<MenuItem value="novelty">Novelty</MenuItem>
											<MenuItem value="rutina">Rutina</MenuItem>
										</Select>
									</FormControl>
								</Grid>
								<Grid item xs={6} sm={3}>
									<TextField
										label="Desde"
										type="date"
										size="small"
										fullWidth
										InputLabelProps={{ shrink: true }}
										value={filters.dateFrom || ""}
										onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
									/>
								</Grid>
								<Grid item xs={6} sm={3}>
									<TextField
										label="Hasta"
										type="date"
										size="small"
										fullWidth
										InputLabelProps={{ shrink: true }}
										value={filters.dateTo || ""}
										onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
									/>
								</Grid>
							</Grid>
						</Box>

						{/* Opciones */}
						<Box>
							<Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
								OPCIONES
							</Typography>
							<Grid container spacing={3} alignItems="center">
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Resultados: <strong>{options.topK}</strong>
									</Typography>
									<Slider
										value={options.topK ?? 5}
										min={1}
										max={20}
										step={1}
										onChange={(_, v) => setOptions((o) => ({ ...o, topK: v as number }))}
										marks={[
											{ value: 1, label: "1" },
											{ value: 10, label: "10" },
											{ value: 20, label: "20" },
										]}
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Score mínimo: <strong>{options.minScore?.toFixed(2)}</strong>
									</Typography>
									<Slider
										value={options.minScore ?? 0.6}
										min={0.5}
										max={0.99}
										step={0.01}
										onChange={(_, v) => setOptions((o) => ({ ...o, minScore: v as number }))}
										marks={[
											{ value: 0.5, label: "0.5" },
											{ value: 0.75, label: "0.75" },
											{ value: 0.99, label: "0.99" },
										]}
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Stack direction="row" alignItems="center" spacing={1}>
										<input
											type="checkbox"
											id="includeFullText"
											checked={options.includeFullText ?? false}
											onChange={(e) => setOptions((o) => ({ ...o, includeFullText: e.target.checked }))}
										/>
										<label htmlFor="includeFullText">
											<Typography variant="body2">Incluir fallo completo</Typography>
										</label>
									</Stack>
								</Grid>
							</Grid>
						</Box>

						<Stack direction="row" spacing={1}>
							<Button
								variant="contained"
								startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchNormal1 size={16} />}
								onClick={handleBuscar}
								disabled={loading || !query.trim()}
							>
								Buscar
							</Button>
							{results !== null && (
								<Button variant="outlined" startIcon={<Refresh size={16} />} onClick={handleReset}>
									Limpiar
								</Button>
							)}
						</Stack>
					</Stack>
				)}

				{/* ── Formulario: similitud ── */}
				{tab === 1 && (
					<Stack spacing={2}>
						<TextField
							label="ID de sentencia"
							placeholder="Ej: 6643abc123def456..."
							fullWidth
							value={sentenciaId}
							onChange={(e) => setSentenciaId(e.target.value)}
							helperText="Ingresá el _id de una sentencia ya indexada para encontrar fallos similares"
							InputProps={{
								endAdornment: (
									<Tooltip title="El ID se encuentra en el listado de sentencias capturadas">
										<IconButton size="small">
											<Link21 size={16} />
										</IconButton>
									</Tooltip>
								),
							}}
						/>

						{/* Opciones compartidas */}
						<Box>
							<Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
								OPCIONES
							</Typography>
							<Grid container spacing={3} alignItems="center">
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Resultados: <strong>{options.topK}</strong>
									</Typography>
									<Slider
										value={options.topK ?? 5}
										min={1}
										max={20}
										step={1}
										onChange={(_, v) => setOptions((o) => ({ ...o, topK: v as number }))}
										marks={[
											{ value: 1, label: "1" },
											{ value: 10, label: "10" },
											{ value: 20, label: "20" },
										]}
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Typography variant="caption" color="text.secondary">
										Score mínimo: <strong>{options.minScore?.toFixed(2)}</strong>
									</Typography>
									<Slider
										value={options.minScore ?? 0.6}
										min={0.5}
										max={0.99}
										step={0.01}
										onChange={(_, v) => setOptions((o) => ({ ...o, minScore: v as number }))}
										marks={[
											{ value: 0.5, label: "0.5" },
											{ value: 0.75, label: "0.75" },
											{ value: 0.99, label: "0.99" },
										]}
										size="small"
									/>
								</Grid>
								<Grid item xs={12} sm={4}>
									<Stack direction="row" alignItems="center" spacing={1}>
										<input
											type="checkbox"
											id="includeFullText2"
											checked={options.includeFullText ?? false}
											onChange={(e) => setOptions((o) => ({ ...o, includeFullText: e.target.checked }))}
										/>
										<label htmlFor="includeFullText2">
											<Typography variant="body2">Incluir fallo completo</Typography>
										</label>
									</Stack>
								</Grid>
							</Grid>
						</Box>

						<Stack direction="row" spacing={1}>
							<Button
								variant="contained"
								startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DocumentText1 size={16} />}
								onClick={handleBuscarSimilar}
								disabled={loading || !sentenciaId.trim()}
							>
								Buscar similares
							</Button>
							{results !== null && (
								<Button variant="outlined" startIcon={<Refresh size={16} />} onClick={handleReset}>
									Limpiar
								</Button>
							)}
						</Stack>
					</Stack>
				)}

				{/* ── Resultados ── */}
				{error && (
					<Alert severity="error" onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{results !== null && (
					<Box>
						<Divider sx={{ mb: 2 }} />

						{/* Header de resultados */}
						<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
							<Stack spacing={0.5}>
								<Typography variant="subtitle1" fontWeight={700}>
									{results.length === 0 ? "Sin resultados" : `${results.length} resultado${results.length !== 1 ? "s" : ""}`}
									{lastQuery && (
										<Typography component="span" variant="body2" color="text.secondary" ml={1}>
											para "{lastQuery}"
										</Typography>
									)}
								</Typography>
								{results.length === 0 && (
									<Typography variant="body2" color="text.secondary">
										Intentá bajar el score mínimo o ampliar los filtros.
									</Typography>
								)}
							</Stack>
							{latency && (
								<Stack direction="row" spacing={1.5} flexWrap="wrap">
									<LatencyBadge label="Embedding" ms={latency.embedding} />
									<LatencyBadge label="Pinecone" ms={latency.pinecone} />
									<LatencyBadge label="Enriquecimiento" ms={latency.enrichment} />
									<LatencyBadge label="Total" ms={latency.total} />
								</Stack>
							)}
						</Stack>

						{/* Cards de resultados */}
						<Stack spacing={2}>
							{results.map((result, i) => (
								<ResultCard key={result.sentencia._id} result={result} index={i} />
							))}
						</Stack>
					</Box>
				)}
			</Stack>
		</MainCard>
	);
}
