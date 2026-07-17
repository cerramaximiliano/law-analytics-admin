import { useEffect, useState } from "react";
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
	InputLabel,
	MenuItem,
	Select,
	Slider,
	Stack,
	Switch,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { ArrowDown2, ArrowUp2, MessageQuestion, Refresh } from "iconsax-react";
import MainCard from "components/MainCard";
import SentenciasAskService, { AskFilters, AskOptions, AskResponse } from "api/sentenciasAsk";
import { SentenciaResult, FullChunk } from "api/sentenciasSearch";
import SemanticWorkerService from "api/semanticWorker";
import { Fuero, SentenciaTipo } from "api/sentenciasCapturadas";

// ── Helpers (mismos códigos de color/labels que la vista de búsqueda semántica) ─

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

// ── Chunk expandible ────────────────────────────────────────────────────────────

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
			<Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.75, cursor: "pointer" }} onClick={() => setOpen((p) => !p)}>
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

// ── Tarjeta de resultado ────────────────────────────────────────────────────────

function ResultCard({ result, index }: { result: SentenciaResult; index: number }) {
	const theme = useTheme();
	const [showFull, setShowFull] = useState(false);
	const [fullChunks, setFullChunks] = useState<FullChunk[] | null>(result.fullChunks ?? null);
	const [loadingFull, setLoadingFull] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const { sentencia, score, matchedChunks } = result;
	const fueroColor = FUERO_COLOR[sentencia.fuero] || theme.palette.primary.main;

	const handleLoadFull = async () => {
		if (fullChunks !== null) {
			setShowFull((p) => !p);
			return;
		}
		setLoadingFull(true);
		setLoadError(null);
		try {
			const chunks = await SentenciasAskService.getChunks(sentencia._id);
			setFullChunks(chunks);
			setShowFull(true);
		} catch {
			setLoadError("No se pudo cargar el fallo completo");
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
							<Chip label={TIPO_LABEL[sentencia.sentenciaTipo] || sentencia.sentenciaTipo} size="small" variant="outlined" sx={{ fontSize: 11 }} />
							{sentencia.year && <Chip label={sentencia.year} size="small" variant="outlined" sx={{ fontSize: 11 }} />}
							{sentencia.category === "novelty" && <Chip label="Novelty" size="small" color="secondary" sx={{ fontSize: 11 }} />}
						</Stack>
					</Box>
					<Chip label={`Score ${score.toFixed(3)}`} size="small" color={scoreColor(score)} />
				</Stack>

				{/* Metadata */}
				<Stack direction="row" flexWrap="wrap" gap={2} mb={1.5}>
					{sentencia.juzgado != null && (
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

				{/* Resumen IA aprobado */}
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

				{/* Fallo completo — carga bajo demanda (chunks desde pjn-api) */}
				<Box>
					<Button
						size="small"
						variant="text"
						onClick={handleLoadFull}
						disabled={loadingFull}
						startIcon={loadingFull ? <CircularProgress size={12} color="inherit" /> : showFull ? <ArrowUp2 size={14} /> : <ArrowDown2 size={14} />}
					>
						{loadingFull ? "Cargando fallo…" : showFull ? "Ocultar fallo completo" : "Ver fallo completo"}
					</Button>
					{loadError && (
						<Typography variant="caption" color="error" ml={1}>
							{loadError}
						</Typography>
					)}
					<Collapse in={showFull}>
						{fullChunks !== null && (
							<Stack spacing={0.5} mt={1}>
								{fullChunks.map((chunk) => (
									<ChunkCard key={chunk.index} chunk={chunk} matched={chunk.matched} />
								))}
							</Stack>
						)}
					</Collapse>
				</Box>
			</CardContent>
		</Card>
	);
}

// ── Badge de latencia ─────────────────────────────────────────────────────────

function LatencyBadge({ label, ms }: { label: string; ms: number }) {
	return (
		<Stack direction="row" spacing={0.5} alignItems="center">
			<Typography variant="caption" color="text.disabled">
				{label}
			</Typography>
			<Chip
				label={`${ms}ms`}
				size="small"
				variant="outlined"
				sx={{ fontSize: 10, height: 18, fontVariantNumeric: "tabular-nums", fontFeatureSettings: '"tnum"' }}
			/>
		</Stack>
	);
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function JurisprudenciaPjnAskPage() {
	const [prompt, setPrompt] = useState("");
	const [filters, setFilters] = useState<AskFilters>({});
	const [options, setOptions] = useState<AskOptions>({ topK: 5, minScore: 0.55, includeFullText: false });

	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState<AskResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [lastPrompt, setLastPrompt] = useState<string>("");

	// Estado del query planner (config global del semantic worker, en Atlas).
	// Se lee/escribe vía SemanticWorkerService (pjnAxios → hub → Atlas). El flag
	// afecta a TODAS las llamadas /ask, no solo a esta sesión.
	const [plannerEnabled, setPlannerEnabled] = useState<boolean | null>(null);
	const [plannerModel, setPlannerModel] = useState<string>("gpt-4o-mini");
	const [togglingPlanner, setTogglingPlanner] = useState(false);
	const [plannerError, setPlannerError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		SemanticWorkerService.getConfig()
			.then((cfg) => {
				if (!alive) return;
				setPlannerEnabled(cfg.searchQueryPlanner?.enabled ?? false);
				setPlannerModel(cfg.searchQueryPlanner?.model ?? "gpt-4o-mini");
			})
			.catch(() => {
				if (alive) setPlannerEnabled(null);
			});
		return () => {
			alive = false;
		};
	}, []);

	const handleTogglePlanner = async (next: boolean) => {
		setTogglingPlanner(true);
		setPlannerError(null);
		try {
			const updated = await SemanticWorkerService.updateConfig({
				searchQueryPlanner: { enabled: next, model: plannerModel },
			});
			setPlannerEnabled(updated.searchQueryPlanner?.enabled ?? next);
			setPlannerModel(updated.searchQueryPlanner?.model ?? plannerModel);
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setPlannerError(err.response?.data?.message || err.message || "No se pudo cambiar el planner");
		} finally {
			setTogglingPlanner(false);
		}
	};

	const handleAsk = async () => {
		if (!prompt.trim()) return;
		setLoading(true);
		setError(null);
		setResponse(null);
		try {
			const res = await SentenciasAskService.ask(prompt.trim(), filters, options);
			setResponse(res);
			setLastPrompt(prompt.trim());
		} catch (e: unknown) {
			const err = e as { response?: { data?: { message?: string } }; message?: string };
			setError(err.response?.data?.message || err.message || "Error al ejecutar la búsqueda");
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setResponse(null);
		setError(null);
		setLastPrompt("");
	};

	const results = response?.results ?? null;

	return (
		<MainCard title="Jurisprudencia PJN — búsqueda por prompt (/ask · pjn-api)">
			<Stack spacing={3}>
				<Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
					Esta vista consume <strong>POST /api/sentencias/ask</strong> de <strong>pjn-api</strong> (worker_01, vía VITE_WORKERS_URL). A diferencia de la
					búsqueda semántica clásica, acepta <strong>filtro por juzgado / sala</strong> y un prompt en lenguaje natural.
				</Alert>

				{/* Toggle global del query planner (config del semantic worker en Atlas) */}
				<Card variant="outlined">
					<CardContent sx={{ py: "12px !important" }}>
						<Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
							<Tooltip title="Cuando está activo, el prompt se interpreta con un LLM que deriva filtros (juzgado/sala/fecha) y estrategia antes de buscar. Es una configuración GLOBAL: afecta todas las llamadas a /ask.">
								<Switch
									checked={plannerEnabled ?? false}
									onChange={(e) => handleTogglePlanner(e.target.checked)}
									disabled={togglingPlanner || plannerEnabled === null}
									color="warning"
									size="small"
								/>
							</Tooltip>
							<Box flex={1} minWidth={220}>
								<Typography variant="body2" fontWeight={600}>
									Query planner {plannerEnabled === null ? "(estado no disponible)" : plannerEnabled ? "· activo" : "· inactivo"}
									{togglingPlanner && (
										<CircularProgress size={12} sx={{ ml: 1 }} />
									)}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Interpreta el prompt con LLM ({plannerModel}) para derivar filtros y estrategia. Configuración global del semantic worker (Atlas) —
									también editable en Workers → Sentencias.
								</Typography>
								{plannerError && (
									<Typography variant="caption" color="error" display="block">
										{plannerError}
									</Typography>
								)}
							</Box>
						</Stack>
					</CardContent>
				</Card>

				<Stack spacing={2}>
					<TextField
						label="Prompt"
						placeholder="Ej: despido indirecto por falta de registración con reclamo de daño moral, juzgado 52"
						fullWidth
						multiline
						minRows={2}
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && e.ctrlKey) handleAsk();
						}}
						helperText="Ctrl+Enter para buscar"
					/>

					{/* Filtros */}
					<Box>
						<Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
							FILTROS (opcionales — se aplican como filtro exacto sobre el payload)
						</Typography>
						<Grid container spacing={2}>
							<Grid item xs={6} sm={3}>
								<FormControl fullWidth size="small">
									<InputLabel>Fuero</InputLabel>
									<Select label="Fuero" value={filters.fuero || ""} onChange={(e) => setFilters((f) => ({ ...f, fuero: (e.target.value as Fuero) || undefined }))}>
										<MenuItem value="">Todos</MenuItem>
										<MenuItem value="CIV">Civil</MenuItem>
										<MenuItem value="CSS">Seg. Social</MenuItem>
										<MenuItem value="CNT">Trabajo</MenuItem>
										<MenuItem value="COM">Comercial</MenuItem>
									</Select>
								</FormControl>
							</Grid>
							<Grid item xs={6} sm={3}>
								<TextField
									label="Juzgado"
									type="number"
									size="small"
									fullWidth
									value={filters.juzgado ?? ""}
									onChange={(e) => setFilters((f) => ({ ...f, juzgado: e.target.value ? Number(e.target.value) : undefined }))}
									inputProps={{ min: 1, max: 120 }}
								/>
							</Grid>
							<Grid item xs={6} sm={3}>
								<TextField
									label="Sala"
									type="number"
									size="small"
									fullWidth
									value={filters.sala ?? ""}
									onChange={(e) => setFilters((f) => ({ ...f, sala: e.target.value ? Number(e.target.value) : undefined }))}
									inputProps={{ min: 1, max: 20 }}
								/>
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
									value={options.minScore ?? 0.55}
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
										id="includeFullTextAsk"
										checked={options.includeFullText ?? false}
										onChange={(e) => setOptions((o) => ({ ...o, includeFullText: e.target.checked }))}
									/>
									<label htmlFor="includeFullTextAsk">
										<Typography variant="body2">Incluir fallo completo</Typography>
									</label>
								</Stack>
							</Grid>
						</Grid>
					</Box>

					<Stack direction="row" spacing={1}>
						<Button
							variant="contained"
							startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <MessageQuestion size={16} />}
							onClick={handleAsk}
							disabled={loading || !prompt.trim()}
							sx={{
								transition: "transform 200ms ease, box-shadow 200ms ease",
								"&:hover:not(.Mui-disabled)": { transform: "translateY(-1px)" },
								"&:active": { transform: "translateY(0)" },
							}}
						>
							Buscar
						</Button>
						{response !== null && (
							<Button variant="outlined" startIcon={<Refresh size={16} />} onClick={handleReset}>
								Limpiar
							</Button>
						)}
					</Stack>
				</Stack>

				{/* Resultados */}
				{error && (
					<Alert severity="error" onClose={() => setError(null)}>
						{error}
					</Alert>
				)}

				{response !== null && results !== null && (
					<Box>
						<Divider sx={{ mb: 2 }} />

						{/* Metadata del planner */}
						<Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
							<Chip
								size="small"
								variant="outlined"
								color={response.plannerUsed ? "success" : "default"}
								label={`Planner ${response.plannerEnabled ? "habilitado" : "deshabilitado"}${response.plannerUsed ? " · usado" : ""}`}
							/>
							{response.lexicalTerms && response.lexicalTerms.length > 0 && (
								<Chip size="small" variant="outlined" color="warning" label={`Citas: ${response.lexicalTerms.join(", ")}`} />
							)}
							{response.filters &&
								Object.entries(response.filters).map(([k, v]) => (
									<Chip key={k} size="small" variant="outlined" label={`${k}: ${String(v)}`} />
								))}
						</Stack>

						{/* Header de resultados */}
						<Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
							<Stack spacing={0.5}>
								<Typography variant="subtitle1" fontWeight={700}>
									{results.length === 0 ? "Sin resultados" : `${results.length} resultado${results.length !== 1 ? "s" : ""}`}
									{lastPrompt && (
										<Typography component="span" variant="body2" color="text.secondary" ml={1}>
											para "{lastPrompt}"
										</Typography>
									)}
								</Typography>
								{results.length === 0 && (
									<Typography variant="body2" color="text.secondary">
										Intentá bajar el score mínimo o aflojar los filtros (juzgado/sala son exactos).
									</Typography>
								)}
							</Stack>
							{response.latencyMs && (
								<Stack direction="row" spacing={1.5} flexWrap="wrap">
									<LatencyBadge label="Embedding" ms={response.latencyMs.embedding} />
									<LatencyBadge label="Vector" ms={response.latencyMs.pinecone} />
									<LatencyBadge label="Enriquecimiento" ms={response.latencyMs.enrichment} />
									<LatencyBadge label="Total" ms={response.latencyMs.total} />
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
