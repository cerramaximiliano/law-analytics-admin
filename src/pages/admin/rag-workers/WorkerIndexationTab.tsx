import React, { useState, useEffect, useCallback, useRef } from "react";
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
	TablePagination,
	Chip,
	Collapse,
	IconButton,
	Tooltip,
	ToggleButton,
	ToggleButtonGroup,
	Skeleton,
	LinearProgress,
	useTheme,
	useMediaQuery,
	alpha,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { IndexationSummary, IndexationCausa, IndexationActivity, ActiveCausa, StageBreakdown } from "api/ragWorkers";

type FilterType = "all" | "indexed" | "outdated" | "pending" | "error" | "never";

const FILTER_LABELS: Record<FilterType, string> = {
	all: "Todos",
	indexed: "Indexados",
	outdated: "Desactualizados",
	pending: "Pendientes",
	error: "Con error",
	never: "Sin indexar",
};

const STATUS_CONFIG: Record<string, { label: string; color: "success" | "warning" | "error" | "info" | "default" | "primary" }> = {
	indexed: { label: "Indexado", color: "success" },
	outdated: { label: "Desactualizado", color: "warning" },
	indexing: { label: "Indexando", color: "info" },
	pending: { label: "Pendiente", color: "default" },
	error: { label: "Error", color: "error" },
	never: { label: "Sin indexar", color: "default" },
};

// ── Processing Monitor constants ─────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
	pending: { label: "Pendiente", color: "grey.500" },
	downloading: { label: "Descargando", color: "info.light" },
	downloaded: { label: "Descargado", color: "info.main" },
	extracting: { label: "Extrayendo", color: "info.dark" },
	extracted: { label: "Extraido", color: "info.dark" },
	chunking: { label: "Fragmentando", color: "warning.light" },
	chunked: { label: "Fragmentado", color: "warning.main" },
	embedding: { label: "Embeddings", color: "primary.light" },
	embedded: { label: "Completo", color: "success.main" },
	error: { label: "Error", color: "error.main" },
};

const QUEUE_LABELS: Record<string, string> = {
	indexCausa: "Indexar causa",
	indexDocument: "Indexar doc",
	ocrDocument: "OCR",
};

const POLL_INTERVAL = 12_000;

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const secs = Math.floor(diff / 1000);
	if (secs < 60) return `hace ${secs}s`;
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `hace ${mins} min`;
	return `hace ${Math.floor(mins / 60)}h`;
}

function formatDuration(ms: number | null): string {
	if (ms == null) return "-";
	const secs = Math.floor(ms / 1000);
	if (secs < 60) return `${secs}s`;
	const mins = Math.floor(secs / 60);
	const remSecs = secs % 60;
	return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
}

function formatElapsed(startIso: string): string {
	const ms = Date.now() - new Date(startIso).getTime();
	if (ms < 0) return "0:00";
	const totalSecs = Math.floor(ms / 1000);
	const h = Math.floor(totalSecs / 3600);
	const m = Math.floor((totalSecs % 3600) / 60);
	const s = totalSecs % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function getNestedColor(theme: any, path: string): string {
	const parts = path.split(".");
	let val: any = theme.palette;
	for (const p of parts) val = val?.[p];
	return typeof val === "string" ? val : theme.palette.grey[500];
}

// ── ProcessingMonitor ────────────────────────────────────────────────────────

const ProcessingMonitor: React.FC = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const [activity, setActivity] = useState<IndexationActivity | null>(null);
	const [initialLoading, setInitialLoading] = useState(true);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [tick, setTick] = useState(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const fetchActivity = useCallback(async (silent = false) => {
		try {
			const data = await RagWorkersService.getIndexationActivity();
			setActivity(data);
			setLastRefresh(new Date());
		} catch {
			// Silent fail on polling — don't spam snackbar
		} finally {
			if (!silent) setInitialLoading(false);
		}
	}, []);

	// Initial fetch + polling
	useEffect(() => {
		fetchActivity(false);

		intervalRef.current = setInterval(() => fetchActivity(true), POLL_INTERVAL);

		const handleVisibility = () => {
			if (document.visibilityState === "visible") {
				fetchActivity(true);
				if (!intervalRef.current) {
					intervalRef.current = setInterval(() => fetchActivity(true), POLL_INTERVAL);
				}
			} else {
				if (intervalRef.current) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibility);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
			document.removeEventListener("visibilitychange", handleVisibility);
		};
	}, [fetchActivity]);

	// 1-second ticker for live elapsed timers (only when causas are active)
	const hasActiveCausas = (activity?.activeCausas?.length ?? 0) > 0;
	useEffect(() => {
		if (hasActiveCausas) {
			tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
		} else {
			if (tickRef.current) clearInterval(tickRef.current);
			tickRef.current = null;
		}
		return () => {
			if (tickRef.current) clearInterval(tickRef.current);
		};
	}, [hasActiveCausas]);

	if (initialLoading) {
		return (
			<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
				<Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1 }} />
			</Box>
		);
	}

	if (!activity) return null;

	const { activeCausas, recentlyCompleted, queues, processingStats, currentConfig } = activity;
	const hasActivity = activeCausas.length > 0 || recentlyCompleted.length > 0;
	const hasQueueJobs = Object.values(queues).some((q) => q && (q.active > 0 || q.waiting > 0 || q.delayed > 0));

	// Queue summary line
	const renderQueues = () => (
		<Stack spacing={0.5}>
			{Object.entries(queues).map(([name, counts]) => {
				const label = QUEUE_LABELS[name] || name;
				if (!counts) return null;
				const parts: string[] = [];
				if (counts.active > 0) parts.push(`${counts.active} activo${counts.active > 1 ? "s" : ""}`);
				if (counts.waiting > 0) parts.push(`${counts.waiting} esperando`);
				if (counts.delayed > 0) parts.push(`${counts.delayed} retrasado${counts.delayed > 1 ? "s" : ""}`);
				if (counts.failed > 0) parts.push(`${counts.failed} fallido${counts.failed > 1 ? "s" : ""}`);
				const summary = parts.length > 0 ? parts.join(" \u00b7 ") : "Sin jobs";
				const isIdle = parts.length === 0;
				return (
					<Stack key={name} direction="row" spacing={1} alignItems="center">
						<Typography variant="caption" sx={{ fontWeight: 600, minWidth: isMobile ? 70 : 90 }}>{label}</Typography>
						<Typography variant="caption" color={isIdle ? "text.disabled" : "text.secondary"}>[{summary}]</Typography>
					</Stack>
				);
			})}
		</Stack>
	);

	// Stage breakdown chips
	const renderStageChips = (breakdown: StageBreakdown) => {
		const entries = Object.entries(breakdown).filter(([, v]) => v && v > 0);
		if (entries.length === 0) return null;
		return (
			<Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
				{entries.map(([stage, count]) => {
					const cfg = STAGE_CONFIG[stage] || { label: stage, color: "grey.500" };
					const chipColor = getNestedColor(theme, cfg.color);
					return (
						<Chip
							key={stage}
							label={`${cfg.label}: ${count}`}
							size="small"
							sx={{
								fontSize: "0.65rem",
								height: 20,
								bgcolor: alpha(chipColor, 0.1),
								color: chipColor,
								border: `1px solid ${alpha(chipColor, 0.3)}`,
								fontWeight: 600,
							}}
						/>
					);
				})}
			</Stack>
		);
	};

	// Single active causa row
	const renderActiveCausa = (causa: ActiveCausa, detailed: boolean) => {
		const pct = causa.documentsTotal > 0 ? Math.round((causa.documentsProcessed / causa.documentsTotal) * 100) : 0;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _tick = tick; // Subscribe to tick for re-renders
		const elapsedStr = causa.indexStartedAt ? formatElapsed(causa.indexStartedAt) : "";
		const isExpanded = expandedId === causa.ragIndexId;

		const timerDetail = (
			<Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
				{renderStageChips(causa.stageBreakdown)}
				{causa.documentsWithError > 0 && (
					<Typography variant="caption" color="error.main">
						{causa.documentsWithError} doc(s) con error
					</Typography>
				)}
			</Stack>
		);

		return (
			<Box key={causa.ragIndexId}>
				<Box
					sx={{
						px: 1.5,
						py: 1,
						borderRadius: 1,
						bgcolor: alpha(theme.palette.info.main, 0.04),
						cursor: !detailed ? "pointer" : undefined,
					}}
					onClick={!detailed ? () => setExpandedId(isExpanded ? null : causa.ragIndexId) : undefined}
				>
					<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
						<Typography variant="caption" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }} title={causa.caratula}>
							{causa.caratula} ({causa.fuero})
						</Typography>
						<Stack direction="row" spacing={1} alignItems="center">
							{elapsedStr && (
								<Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "nowrap", color: theme.palette.info.main, fontWeight: 700 }}>
									{elapsedStr}
								</Typography>
							)}
							<Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
								{causa.documentsProcessed}/{causa.documentsTotal} ({pct}%)
							</Typography>
						</Stack>
					</Stack>
					<LinearProgress
						variant="determinate"
						value={Math.min(pct, 100)}
						color="info"
						sx={{
							height: 6,
							borderRadius: 3,
							mt: 0.5,
							bgcolor: alpha(theme.palette.info.main, 0.1),
							"& .MuiLinearProgress-bar": { borderRadius: 3 },
						}}
					/>
					{detailed ? (
						<Box sx={{ mt: 1 }}>{timerDetail}</Box>
					) : (
						<Collapse in={isExpanded}>
							<Box sx={{ mt: 1 }}>{timerDetail}</Box>
						</Collapse>
					)}
				</Box>
			</Box>
		);
	};

	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="subtitle1" fontWeight={700}>Monitor en vivo</Typography>
					{hasActivity && (
						<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main", animation: "pulse 2s infinite", "@keyframes pulse": { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.4 } } }} />
					)}
				</Stack>
				<Stack direction="row" spacing={0.5} alignItems="center">
					{lastRefresh && (
						<Typography variant="caption" color="text.disabled">
							{timeAgo(lastRefresh.toISOString())}
						</Typography>
					)}
					<Tooltip title="Refrescar">
						<IconButton size="small" onClick={() => fetchActivity(true)}>
							<Refresh size={14} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			{/* Queues */}
			{(hasQueueJobs || hasActivity) && (
				<Box sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
					{renderQueues()}
				</Box>
			)}

			{/* Processing stats + worker config */}
			{(processingStats.sampleSize > 0 || Object.keys(currentConfig).length > 0) && (
				<Box sx={{ mb: 1.5, pb: 1.5, borderBottom: activeCausas.length > 0 || recentlyCompleted.length > 0 ? `1px solid ${theme.palette.divider}` : undefined }}>
					{processingStats.sampleSize > 0 && (
						<>
							<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", display: "block", mb: 0.5 }}>
								Ultimas {processingStats.sampleSize} causas completadas
							</Typography>
							<Stack direction="row" spacing={isMobile ? 1 : 2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
								<Stack>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>Tiempo prom.</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{formatDuration(processingStats.avgMs)}</Typography>
								</Stack>
								<Stack>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>Min / Max</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
										<Typography component="span" variant="caption" sx={{ fontFamily: "monospace", color: "success.main" }}>{formatDuration(processingStats.minMs)}</Typography>
										{" / "}
										<Typography component="span" variant="caption" sx={{ fontFamily: "monospace", color: "warning.main" }}>{formatDuration(processingStats.maxMs)}</Typography>
									</Typography>
								</Stack>
								<Stack>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>Movs. prom.</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{processingStats.avgDocs ?? "-"} docs</Typography>
								</Stack>
								<Stack>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>Min / Max docs</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace" }}>{processingStats.minDocs ?? "-"} / {processingStats.maxDocs ?? "-"}</Typography>
								</Stack>
								<Stack>
									<Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem", lineHeight: 1 }}>Prom. por doc</Typography>
									<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>{formatDuration(processingStats.avgMsPerDoc)}</Typography>
								</Stack>
							</Stack>
						</>
					)}
					{Object.keys(currentConfig).length > 0 && (
						<Stack direction="row" spacing={isMobile ? 1 : 2} flexWrap="wrap" useFlexGap>
							{Object.entries(currentConfig).map(([name, cfg]) => {
								const label = QUEUE_LABELS[name] || name;
								const rl = cfg.rateLimiter;
								const statusColor = !cfg.enabled ? "text.disabled" : cfg.paused ? "warning.main" : "success.main";
								return (
									<Stack key={name} direction="row" spacing={0.5} alignItems="center" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: alpha(theme.palette.divider, 0.3) }}>
										<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: statusColor, flexShrink: 0 }} />
										<Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.65rem" }}>{label}</Typography>
										<Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.65rem" }}>c={cfg.concurrency}</Typography>
										{rl && <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.6rem" }}>{rl.max}/{Math.round(rl.duration / 1000)}s</Typography>}
									</Stack>
								);
							})}
						</Stack>
					)}
				</Box>
			)}

			{/* Active causas */}
			{activeCausas.length > 0 && (
				<Box sx={{ mb: recentlyCompleted.length > 0 ? 1.5 : 0 }}>
					<Stack spacing={1}>
						{activeCausas.length === 1
							? renderActiveCausa(activeCausas[0], true)
							: activeCausas.map((c) => renderActiveCausa(c, false))}
					</Stack>
				</Box>
			)}

			{/* Recently completed */}
			{recentlyCompleted.length > 0 && (
				<Box>
					<Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
						Completadas recientemente
					</Typography>
					<Stack spacing={0.5}>
						{recentlyCompleted.map((c) => (
							<Stack key={c.ragIndexId} direction="row" spacing={1} alignItems="center" sx={{ pl: 0.5 }}>
								<Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>&#10003;</Typography>
								<Typography variant="caption" noWrap sx={{ flex: 1, minWidth: 0 }} title={c.caratula}>
									{c.caratula} ({c.fuero})
								</Typography>
								<Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", whiteSpace: "nowrap" }}>
									{c.documentsTotal} docs
								</Typography>
								<Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
									{c.durationMs ? formatDuration(c.durationMs) : ""} {c.lastIndexedAt ? `\u00b7 ${timeAgo(c.lastIndexedAt)}` : ""}
								</Typography>
							</Stack>
						))}
					</Stack>
				</Box>
			)}

			{/* Idle state */}
			{!hasActivity && !hasQueueJobs && (
				<Typography variant="body2" color="text.disabled" sx={{ textAlign: "center", py: 1 }}>
					Sin actividad de indexacion
				</Typography>
			)}
		</Box>
	);
};

// ── WorkerIndexationTab ──────────────────────────────────────────────────────

const WorkerIndexationTab = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));
	const { enqueueSnackbar } = useSnackbar();
	const [summary, setSummary] = useState<IndexationSummary | null>(null);
	const [causas, setCausas] = useState<IndexationCausa[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<FilterType>("all");
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	const fetchSummary = useCallback(async () => {
		try {
			const data = await RagWorkersService.getIndexationSummary();
			setSummary(data);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar resumen", { variant: "error" });
		}
	}, [enqueueSnackbar]);

	const fetchCausas = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getIndexationCausas(filter, page + 1, rowsPerPage);
			setCausas(data.causas);
			setTotal(data.pagination.total);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar causas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [filter, page, rowsPerPage, enqueueSnackbar]);

	useEffect(() => {
		fetchSummary();
	}, [fetchSummary]);

	useEffect(() => {
		fetchCausas();
	}, [fetchCausas]);

	const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newFilter: string | null) => {
		if (newFilter) {
			setFilter(newFilter as FilterType);
			setPage(0);
		}
	};

	const handleRefresh = () => {
		fetchSummary();
		fetchCausas();
	};

	const coveragePercent = summary ? Math.round((summary.totalWithRagIndex / Math.max(summary.totalVerifiedCausas, 1)) * 100) : 0;
	const indexedCount = summary ? (summary.byStatus.indexed || 0) : 0;
	const indexedPercent = summary ? Math.round((indexedCount / Math.max(summary.totalVerifiedCausas, 1)) * 100) : 0;

	return (
		<Stack spacing={3}>
			{/* Live processing monitor */}
			<ProcessingMonitor />

			{/* Summary cards */}
			{summary ? (
				<>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Stack>
							<Typography variant="h5">Estado de Indexacion</Typography>
							<Typography variant="body2" color="text.secondary">
								Cobertura del sistema RAG sobre las causas verificadas
							</Typography>
						</Stack>
						<Tooltip title="Refrescar">
							<IconButton onClick={handleRefresh} size="small">
								<Refresh size={18} />
							</IconButton>
						</Tooltip>
					</Stack>

					{/* Progress bars */}
					<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
						<Stack spacing={2.5}>
							<Box>
								<Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={isMobile ? 0 : undefined} sx={{ mb: 0.5 }}>
									<Stack direction="row" spacing={1} alignItems="baseline">
										<Typography variant="subtitle2">Cobertura de indexacion</Typography>
										{!isMobile && <Typography variant="caption" color="text.secondary">autoIndex → indexCausa</Typography>}
									</Stack>
									<Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
										{summary.totalWithRagIndex} / {summary.totalVerifiedCausas} ({coveragePercent}%)
									</Typography>
								</Stack>
								<LinearProgress
									variant="determinate"
									value={Math.min(coveragePercent, 100)}
									sx={{
										height: 10,
										borderRadius: 5,
										bgcolor: alpha(theme.palette.primary.main, 0.1),
										"& .MuiLinearProgress-bar": { borderRadius: 5 },
									}}
								/>
							</Box>
							<Box>
								<Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "flex-start" : "center"} spacing={isMobile ? 0 : undefined} sx={{ mb: 0.5 }}>
									<Stack direction="row" spacing={1} alignItems="baseline">
										<Typography variant="subtitle2">Causas completadas</Typography>
										{!isMobile && <Typography variant="caption" color="text.secondary">indexDocument (pipeline completo)</Typography>}
									</Stack>
									<Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700, color: theme.palette.success.main }}>
										{indexedCount} / {summary.totalVerifiedCausas} ({indexedPercent}%)
									</Typography>
								</Stack>
								<LinearProgress
									variant="determinate"
									value={Math.min(indexedPercent, 100)}
									color="success"
									sx={{
										height: 10,
										borderRadius: 5,
										bgcolor: alpha(theme.palette.success.main, 0.1),
										"& .MuiLinearProgress-bar": { borderRadius: 5 },
									}}
								/>
							</Box>
						</Stack>
					</Box>

					{/* Stat chips */}
					<Stack direction="row" spacing={isMobile ? 0.75 : 1.5} flexWrap="wrap" useFlexGap>
						<StatChip label="Indexados al dia" value={summary.upToDate} color="success" theme={theme} compact={isMobile} />
						<StatChip label="Desactualizados" value={summary.outdated} color="warning" theme={theme} compact={isMobile} />
						<StatChip label="Pendientes" value={(summary.byStatus.pending || 0) + (summary.byStatus.indexing || 0)} color="info" theme={theme} compact={isMobile} />
						<StatChip label="Con error" value={summary.byStatus.error || 0} color="error" theme={theme} compact={isMobile} />
						<StatChip label="Sin indexar" value={summary.neverIndexed} color="default" theme={theme} compact={isMobile} />
					</Stack>
				</>
			) : (
				<Stack spacing={2}>
					<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
					<Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
				</Stack>
			)}

			{/* Filter */}
			<Box sx={{ overflowX: "auto", pb: 0.5 }}>
				<ToggleButtonGroup value={filter} exclusive onChange={handleFilterChange} size="small" sx={{ flexWrap: isMobile ? "nowrap" : undefined }}>
					{(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
						<ToggleButton key={f} value={f} sx={{ whiteSpace: "nowrap", fontSize: isMobile ? "0.7rem" : undefined }}>
							{FILTER_LABELS[f]}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</Box>

			{/* Table */}
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ tableLayout: "fixed", minWidth: isMobile ? 360 : undefined }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: isMobile ? "50%" : "45%" }}>Caratula</TableCell>
							<TableCell sx={{ width: "7%", display: { xs: "none", md: "table-cell" } }}>Fuero</TableCell>
							<TableCell sx={{ width: isMobile ? "25%" : "12%" }} align="center">Estado</TableCell>
							<TableCell sx={{ width: isMobile ? "25%" : "12%" }} align="right">Movimientos</TableCell>
							<TableCell sx={{ width: "10%", display: { xs: "none", md: "table-cell" } }} align="right">Docs</TableCell>
							<TableCell sx={{ width: "14%", display: { xs: "none", md: "table-cell" } }}>Ultima indexacion</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							[...Array(5)].map((_, i) => (
								<TableRow key={i}>
									{[...Array(isMobile ? 3 : 6)].map((__, j) => (
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : causas.length === 0 ? (
							<TableRow>
								<TableCell colSpan={isMobile ? 3 : 6} align="center" sx={{ py: 4 }}>
									<Typography variant="body2" color="text.secondary">
										No hay causas para el filtro seleccionado
									</Typography>
								</TableCell>
							</TableRow>
						) : (
							causas.map((c) => {
								const statusCfg = STATUS_CONFIG[c.ragStatus] || STATUS_CONFIG.never;
								const movLabel = c.ragStatus === "never" ? `${c.movimientosCount}` : `${c.movimientosIndexed} / ${c.movimientosCount}`;
								const isOutdated = c.ragStatus === "outdated";
								return (
									<TableRow key={`${c.causaType}-${c.causaId}`} hover>
										<TableCell sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.caratula}>
											<Typography variant="caption" noWrap>
												{c.caratula || "-"}
											</Typography>
										</TableCell>
										<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
											<Typography variant="caption" color="text.secondary">
												{c.fuero || "-"}
											</Typography>
										</TableCell>
										<TableCell align="center">
											<Chip label={statusCfg.label} size="small" color={statusCfg.color} variant="outlined" />
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: isOutdated ? 700 : 400, color: isOutdated ? theme.palette.warning.main : "inherit" }}>
												{movLabel}
											</Typography>
										</TableCell>
										<TableCell align="right" sx={{ display: { xs: "none", md: "table-cell" } }}>
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{c.documentsProcessed !== undefined ? `${c.documentsProcessed}/${c.documentsTotal || 0}` : "-"}
											</Typography>
										</TableCell>
										<TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{c.lastIndexedAt ? new Date(c.lastIndexedAt).toLocaleDateString("es-AR") : "-"}
											</Typography>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</TableContainer>

			<TablePagination
				component="div"
				count={total}
				page={page}
				rowsPerPage={rowsPerPage}
				onPageChange={(_, newPage) => setPage(newPage)}
				onRowsPerPageChange={(e) => {
					setRowsPerPage(parseInt(e.target.value, 10));
					setPage(0);
				}}
				rowsPerPageOptions={[10, 25, 50]}
				labelRowsPerPage="Filas por pagina:"
				labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
			/>
		</Stack>
	);
};

// ── Stat chip component ──────────────────────────────────────────────────────

const StatChip: React.FC<{ label: string; value: number; color: string; theme: any; compact?: boolean }> = ({ label, value, color, theme, compact }) => {
	const paletteColor = (theme.palette as any)[color]?.main || theme.palette.text.secondary;
	return (
		<Box
			sx={{
				px: compact ? 1 : 2,
				py: compact ? 0.5 : 1,
				borderRadius: compact ? 1 : 1.5,
				border: `1px solid ${alpha(paletteColor, 0.3)}`,
				bgcolor: alpha(paletteColor, 0.04),
				minWidth: compact ? 56 : 100,
			}}
		>
			<Typography variant={compact ? "h6" : "h4"} fontWeight={700} sx={{ fontFamily: "monospace", color: paletteColor, lineHeight: compact ? 1.3 : undefined }}>
				{value}
			</Typography>
			<Typography variant="caption" color="text.secondary" sx={compact ? { fontSize: "0.6rem", lineHeight: 1.2 } : undefined}>
				{label}
			</Typography>
		</Box>
	);
};

export default WorkerIndexationTab;
