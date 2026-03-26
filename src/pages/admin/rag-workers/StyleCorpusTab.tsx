import React, { useState, useEffect, useCallback } from "react";
import {
	Box,
	Stack,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Chip,
	Skeleton,
	IconButton,
	Tooltip,
	LinearProgress,
	Paper,
	alpha,
	useTheme,
	TextField,
	MenuItem,
	Button,
	CircularProgress,
	Divider,
	Slider,
	Collapse,
	InputAdornment,
} from "@mui/material";
import { Refresh, SearchNormal1, ArrowDown2, ArrowUp2, DocumentText } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, {
	StyleCorpusStats,
	StyleCorpusByFuero,
	StyleCorpusExample,
	StyleCorpusSearchResult,
} from "api/ragWorkers";

// ── Constants ─────────────────────────────────────────────────────────────────

const formatNumber = (n: number): string => {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toString();
};

const pct = (part: number, total: number): string =>
	total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—";

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	CNT: "Laboral",
	CSS: "Seg. Social",
	COM: "Comercial",
	FSM: "Familia",
	CAF: "Administrativo",
	CPF: "Penal",
};

const FUERO_OPTIONS = [
	{ code: "", label: "Todos los fueros" },
	...Object.entries(FUERO_LABELS).map(([code, label]) => ({ code, label })),
];

const DOC_TYPE_OPTIONS = [
	"",
	"demanda",
	"contestacion_demanda",
	"alegatos",
	"expresion_agravios",
	"recurso_apelacion",
	"contestacion_agravios",
	"excepcion",
	"acuerdo",
	"ofrecimiento_prueba",
	"impugnacion",
	"nulidad",
	"medida_cautelar",
	"liquidacion",
	"incidente",
	"beneficio_litigar",
	"pide_autos_alegar",
];

const SCORE_COLOR = (score: number) => {
	if (score >= 0.65) return "success";
	if (score >= 0.50) return "warning";
	return "error";
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				flex: 1,
				minWidth: 130,
				p: 2,
				borderRadius: 2,
				bgcolor: alpha(theme.palette.primary.main, 0.06),
				border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
			}}
		>
			<Typography variant="h4" fontWeight={700}>{value}</Typography>
			<Typography variant="caption" color="text.secondary">{label}</Typography>
			{sub && (
				<Typography variant="caption" color="text.secondary" display="block">{sub}</Typography>
			)}
		</Box>
	);
};

const ScoreBar = ({ score }: { score: number }) => {
	const color = SCORE_COLOR(score);
	return (
		<Stack spacing={0.5} sx={{ minWidth: 80 }}>
			<LinearProgress
				variant="determinate"
				value={score * 100}
				color={color}
				sx={{ height: 5, borderRadius: 3 }}
			/>
			<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
				{score.toFixed(3)}
			</Typography>
		</Stack>
	);
};

const PreviewCard = ({ result, expanded, onToggle }: {
	result: StyleCorpusSearchResult;
	expanded: boolean;
	onToggle: () => void;
}) => {
	const theme = useTheme();
	return (
		<Box
			sx={{
				p: 2,
				borderRadius: 2,
				border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
				"&:hover": { borderColor: theme.palette.primary.light },
				transition: "border-color 0.15s",
			}}
		>
			<Stack direction="row" spacing={2} alignItems="flex-start">
				{/* Score */}
				<Box sx={{ minWidth: 90, pt: 0.5 }}>
					<ScoreBar score={result.score} />
				</Box>

				{/* Content */}
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.75 }}>
						{result.fuero && (
							<Chip label={result.fuero} size="small" color="primary" variant="outlined" />
						)}
						{result.docType && (
							<Chip label={result.docType} size="small" color="secondary" variant="outlined" />
						)}
						<Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 400 }}>
							{result.title || "(sin carátula)"}
						</Typography>
					</Stack>

					<Collapse in={expanded} collapsedSize={56}>
						<Typography
							variant="body2"
							sx={{
								fontFamily: "monospace",
								fontSize: "0.75rem",
								whiteSpace: "pre-wrap",
								color: "text.primary",
								lineHeight: 1.6,
							}}
						>
							{result.preview}
						</Typography>
					</Collapse>
				</Box>

				{/* Expand toggle */}
				<Tooltip title={expanded ? "Contraer" : "Expandir"}>
					<IconButton size="small" onClick={onToggle} sx={{ mt: 0.5, flexShrink: 0 }}>
						{expanded ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
					</IconButton>
				</Tooltip>
			</Stack>
		</Box>
	);
};

// ── Main component ────────────────────────────────────────────────────────────

const StyleCorpusTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	// Stats state
	const [stats, setStats] = useState<StyleCorpusStats | null>(null);
	const [loading, setLoading] = useState(true);

	// Preview search state (quick, 3 results)
	const [previewFuero, setPreviewFuero] = useState("CNT");
	const [previewQuery, setPreviewQuery] = useState("");
	const [previewResults, setPreviewResults] = useState<StyleCorpusExample[] | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	// Full search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchFuero, setSearchFuero] = useState("");
	const [searchDocType, setSearchDocType] = useState("");
	const [searchLimit, setSearchLimit] = useState(10);
	const [searchMinScore, setSearchMinScore] = useState(0.3);
	const [searchResults, setSearchResults] = useState<StyleCorpusSearchResult[] | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getStyleCorpusStats();
			setStats(data);
		} catch {
			enqueueSnackbar("Error al cargar stats del corpus de estilo", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => { fetchStats(); }, [fetchStats]);

	const handlePreviewSearch = async () => {
		if (previewQuery.trim().length < 20) {
			enqueueSnackbar("Ingresá al menos 20 caracteres para buscar", { variant: "warning" });
			return;
		}
		try {
			setPreviewLoading(true);
			const results = await RagWorkersService.getStyleExamples(previewFuero, previewQuery.trim(), 3);
			setPreviewResults(results);
		} catch {
			enqueueSnackbar("Error al buscar ejemplos en el corpus", { variant: "error" });
		} finally {
			setPreviewLoading(false);
		}
	};

	const handleSearch = async () => {
		if (searchQuery.trim().length < 3) {
			enqueueSnackbar("Ingresá al menos 3 caracteres para buscar", { variant: "warning" });
			return;
		}
		try {
			setSearchLoading(true);
			setExpandedIds(new Set());
			const { data } = await RagWorkersService.searchStyleCorpus(searchQuery.trim(), {
				fuero:    searchFuero   || undefined,
				docType:  searchDocType || undefined,
				limit:    searchLimit,
				minScore: searchMinScore,
			});
			setSearchResults(data);
		} catch {
			enqueueSnackbar("Error al buscar en el corpus", { variant: "error" });
		} finally {
			setSearchLoading(false);
		}
	};

	const toggleExpand = (id: string) => {
		setExpandedIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	return (
		<Stack spacing={3} sx={{ p: 3 }}>

			{/* ── Header ── */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Box>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
						<Typography variant="h5" fontWeight={600}>Corpus de Estilo Jurídico</Typography>
						{stats && (
							<Chip
								label={stats.enabled ? "activo" : "inactivo"}
								size="small"
								color={stats.enabled ? "success" : "warning"}
							/>
						)}
						{stats?.indexName && (
							<Chip label={stats.indexName} size="small" variant="outlined" color="secondary" />
						)}
					</Stack>
					<Typography variant="body2" color="text.secondary">
						Escritos judiciales reales (Pinecone v2) usados como ejemplos de estilo en el asistente de documentos
					</Typography>
				</Box>
				<Tooltip title="Refrescar">
					<IconButton onClick={fetchStats} disabled={loading} size="small">
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* ── Summary cards ── */}
			{loading ? (
				<Stack direction="row" flexWrap="wrap" gap={2}>
					{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rounded" width={140} height={72} />)}
				</Stack>
			) : stats ? (
				<Stack direction="row" flexWrap="wrap" gap={2}>
					<SummaryCard label="Total corpus" value={formatNumber(stats.total)} />
					<SummaryCard label="Alta calidad" value={formatNumber(stats.high)} sub={`${pct(stats.high, stats.total)} del total`} />
					<SummaryCard label="Embebidos en Pinecone" value={formatNumber(stats.embedded)} sub={`${pct(stats.embedded, stats.high)} de los high`} />
					<SummaryCard label="Normal / sin clasificar" value={formatNumber(stats.normal)} sub={pct(stats.normal, stats.total)} />
					<SummaryCard label="Pendientes de embed" value={formatNumber(stats.high - stats.embedded)} sub="high sin vectorId" />
				</Stack>
			) : null}

			{/* ── By fuero table ── */}
			<Box>
				<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Por fuero</Typography>
				{loading ? (
					<Skeleton variant="rounded" height={200} />
				) : (
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
									{["Fuero", "Total", "Alta calidad", "Embebidos", "Cobertura Pinecone"].map(h => (
										<TableCell key={h} align={h === "Fuero" ? "left" : "right"}>
											<Typography variant="caption" fontWeight={600}>{h}</Typography>
										</TableCell>
									))}
								</TableRow>
							</TableHead>
							<TableBody>
								{(stats?.byFuero ?? []).map((row: StyleCorpusByFuero) => (
									<TableRow key={row._id} hover>
										<TableCell>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip label={row._id || "?"} size="small" variant="outlined" color="primary" />
												<Typography variant="body2" color="text.secondary">{FUERO_LABELS[row._id] || ""}</Typography>
											</Stack>
										</TableCell>
										<TableCell align="right"><Typography variant="body2">{formatNumber(row.total)}</Typography></TableCell>
										<TableCell align="right">
											<Typography variant="body2">
												{formatNumber(row.high)}{" "}
												<Typography component="span" variant="caption" color="text.secondary">({pct(row.high, row.total)})</Typography>
											</Typography>
										</TableCell>
										<TableCell align="right"><Typography variant="body2">{formatNumber(row.embedded)}</Typography></TableCell>
										<TableCell sx={{ minWidth: 160 }}>
											<Stack spacing={0.5}>
												<LinearProgress
													variant="determinate"
													value={row.high > 0 ? (row.embedded / row.high) * 100 : 0}
													sx={{ height: 6, borderRadius: 3 }}
												/>
												<Typography variant="caption" color="text.secondary">{pct(row.embedded, row.high)} de high</Typography>
											</Stack>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Box>

			{/* ── Semantic preview (quick, 3 results) ── */}
			<Box>
				<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Preview semántico</Typography>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={2} alignItems="flex-start">
							<TextField
								select label="Fuero" value={previewFuero}
								onChange={(e) => setPreviewFuero(e.target.value)}
								size="small" sx={{ minWidth: 140 }}
							>
								{FUERO_OPTIONS.filter(o => o.code).map(o => (
									<MenuItem key={o.code} value={o.code}>{o.code} — {o.label}</MenuItem>
								))}
							</TextField>
							<TextField
								label="Texto a buscar"
								placeholder="Ej: quiero demandar a mi empleador por despido injustificado..."
								value={previewQuery} onChange={(e) => setPreviewQuery(e.target.value)}
								size="small" multiline minRows={2} fullWidth
								onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handlePreviewSearch(); }}
							/>
							<Button
								variant="contained" size="small" onClick={handlePreviewSearch}
								disabled={previewLoading || previewQuery.trim().length < 20}
								startIcon={previewLoading ? <CircularProgress size={14} color="inherit" /> : <SearchNormal1 size={16} />}
								sx={{ whiteSpace: "nowrap", alignSelf: "flex-end" }}
							>
								Buscar
							</Button>
						</Stack>
						{previewResults !== null && (
							<>
								<Divider />
								{previewResults.length === 0 ? (
									<Typography variant="body2" color="text.secondary">Sin resultados.</Typography>
								) : (
									<Stack spacing={2}>
										{previewResults.map((ex, i) => (
											<Box key={i} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.03), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
													<Chip label={ex.docType || "?"} size="small" color="primary" variant="outlined" />
													<Typography variant="caption" color="text.secondary" noWrap>{ex.title}</Typography>
												</Stack>
												<Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", whiteSpace: "pre-wrap", maxHeight: 140, overflow: "auto" }}>
													{ex.preview}
												</Typography>
											</Box>
										))}
									</Stack>
								)}
							</>
						)}
					</Stack>
				</Paper>
			</Box>

			{/* ── Full semantic search ── */}
			<Box>
				<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
					<DocumentText size={18} />
					<Typography variant="subtitle1" fontWeight={600}>Buscador de escritos</Typography>
					<Chip label="semántico" size="small" variant="outlined" color="secondary" />
				</Stack>

				<Paper variant="outlined" sx={{ p: 2.5 }}>
					<Stack spacing={2.5}>
						{/* Query */}
						<TextField
							label="Texto de búsqueda"
							placeholder="Ej: liquidación de haberes con intereses moratorios, impugnación de liquidación..."
							value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
							multiline minRows={2} fullWidth size="small"
							onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSearch(); }}
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<Typography variant="caption" color="text.secondary">{searchQuery.length}/2000</Typography>
									</InputAdornment>
								),
							}}
						/>

						{/* Filters row */}
						<Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end">
							<TextField
								select label="Fuero" value={searchFuero}
								onChange={(e) => setSearchFuero(e.target.value)}
								size="small" sx={{ minWidth: 160 }}
							>
								{FUERO_OPTIONS.map(o => (
									<MenuItem key={o.code} value={o.code}>
										{o.code ? `${o.code} — ${o.label}` : o.label}
									</MenuItem>
								))}
							</TextField>

							<TextField
								select label="Tipo de escrito" value={searchDocType}
								onChange={(e) => setSearchDocType(e.target.value)}
								size="small" sx={{ minWidth: 200 }}
							>
								{DOC_TYPE_OPTIONS.map(dt => (
									<MenuItem key={dt} value={dt}>{dt || "Todos los tipos"}</MenuItem>
								))}
							</TextField>

							<TextField
								select label="Resultados" value={searchLimit}
								onChange={(e) => setSearchLimit(Number(e.target.value))}
								size="small" sx={{ minWidth: 110 }}
							>
								{[5, 10, 20, 30].map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
							</TextField>

							<Box sx={{ minWidth: 180 }}>
								<Typography variant="caption" color="text.secondary" gutterBottom>
									Score mínimo: {searchMinScore.toFixed(2)}
								</Typography>
								<Slider
									value={searchMinScore} onChange={(_, v) => setSearchMinScore(v as number)}
									min={0} max={0.9} step={0.05} size="small"
									marks={[{ value: 0 }, { value: 0.5 }, { value: 0.7 }, { value: 0.9 }]}
									sx={{ mt: 0.5 }}
								/>
							</Box>

							<Button
								variant="contained" onClick={handleSearch}
								disabled={searchLoading || searchQuery.trim().length < 3}
								startIcon={searchLoading ? <CircularProgress size={16} color="inherit" /> : <SearchNormal1 size={18} />}
								sx={{ alignSelf: "flex-end", mb: 0.3 }}
							>
								Buscar
							</Button>
						</Stack>

						{/* Results */}
						{searchResults !== null && (
							<>
								<Divider />
								<Stack direction="row" justifyContent="space-between" alignItems="center">
									<Typography variant="caption" color="text.secondary">
										{searchResults.length === 0 ? "Sin resultados." : `${searchResults.length} resultado${searchResults.length > 1 ? "s" : ""} encontrados`}
									</Typography>
									{searchResults.length > 0 && (
										<Button size="small" variant="text" onClick={() => setExpandedIds(
											expandedIds.size < searchResults.length
												? new Set(searchResults.map(r => r.id))
												: new Set()
										)}>
											{expandedIds.size < searchResults.length ? "Expandir todos" : "Contraer todos"}
										</Button>
									)}
								</Stack>
								{searchResults.length > 0 && (
									<Stack spacing={1.5}>
										{searchResults.map(result => (
											<PreviewCard
												key={result.id}
												result={result}
												expanded={expandedIds.has(result.id)}
												onToggle={() => toggleExpand(result.id)}
											/>
										))}
									</Stack>
								)}
							</>
						)}
					</Stack>
				</Paper>
			</Box>

			{/* ── Note ── */}
			<Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.04), border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)}` }}>
				<Typography variant="body2" color="text.secondary">
					El corpus v2 vive íntegramente en Pinecone. Los conteos por fuero reflejan los valores al cierre del run de embedding (2026-03-25). Índice: <strong>{stats?.indexName || "pjn-style-corpus-v2"}</strong>.
				</Typography>
			</Box>
		</Stack>
	);
};

export default StyleCorpusTab;
