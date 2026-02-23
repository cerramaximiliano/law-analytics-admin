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
	ToggleButton,
	ToggleButtonGroup,
	Chip,
	Skeleton,
	IconButton,
	Tooltip,
	Divider,
	Grid,
	useTheme,
	alpha,
} from "@mui/material";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	AreaChart,
	Area,
	Cell,
} from "recharts";
import { Refresh, Copy, DocumentDownload } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, {
	PipelineAnalytics,
	DocumentAnalytics,
	PipelineDailyEntry,
	StageAvgMs,
	S3Averages,
	ErrorRates,
} from "api/ragWorkers";

// ── Formatting helpers ──────────────────────────────────────────────────────

const formatNumber = (n: number): string => {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toLocaleString("es-AR");
};

const formatMs = (ms: number): string => {
	if (ms >= 60000) return `${(ms / 60000).toFixed(1)} min`;
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.round(ms)}ms`;
};

const formatBytes = (bytes: number): string => {
	if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
	if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
	if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${bytes} B`;
};

// ── Stage colors ────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
	download: "#2196F3",
	extract: "#FF9800",
	chunking: "#9C27B0",
	embedding: "#4CAF50",
	upsert: "#F44336",
	overhead: "#795548",
	queueWait: "#607D8B",
};

const STAGE_LABELS: Record<string, string> = {
	totalMs: "Pipeline Total",
	downloadMs: "Download",
	extractMs: "Extraccion",
	chunkingMs: "Chunking",
	embeddingMs: "Embedding",
	upsertMs: "Upsert",
	overheadMs: "Overhead (DB/S3/IO)",
};

// ── Stat item ───────────────────────────────────────────────────────────────

const StatItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
	<Box sx={{ minWidth: 100 }}>
		<Typography variant="caption" color="text.secondary" display="block" noWrap>
			{label}
		</Typography>
		<Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace" }} color={color || "text.primary"}>
			{value}
		</Typography>
	</Box>
);

// ── Custom tooltip for recharts ─────────────────────────────────────────────

const ChartTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
	if (!active || !payload?.length) return null;
	return (
		<Box sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: 1, p: 1, boxShadow: 2 }}>
			<Typography variant="caption" fontWeight={600}>
				{label}
			</Typography>
			{payload.map((p: any, i: number) => (
				<Typography key={i} variant="caption" display="block" sx={{ color: p.color, fontFamily: "monospace" }}>
					{p.name}: {formatter ? formatter(p.value) : p.value}
				</Typography>
			))}
		</Box>
	);
};

// ── Main component ──────────────────────────────────────────────────────────

const WorkerAnalyticsTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [period, setPeriod] = useState("week");
	const [pipelineData, setPipelineData] = useState<PipelineAnalytics | null>(null);
	const [documentData, setDocumentData] = useState<DocumentAnalytics | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [pipeline, documents] = await Promise.all([
				RagWorkersService.getPipelineAnalytics(period),
				RagWorkersService.getDocumentAnalytics(period, 10),
			]);
			setPipelineData(pipeline);
			setDocumentData(documents);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar analytics", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [period, enqueueSnackbar]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: string | null) => {
		if (newPeriod) setPeriod(newPeriod);
	};

	const buildReport = useCallback((): string => {
		if (!pipelineData?.hasData) return "Sin datos para el periodo seleccionado.";

		const lines: string[] = [];
		const p = pipelineData;
		const d = documentData;
		const sep = "─".repeat(60);

		lines.push(`PIPELINE ANALYTICS REPORT`);
		lines.push(`Periodo: ${p.period.from} al ${p.period.to}`);
		lines.push(`Generado: ${new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}`);
		lines.push(sep);

		// Throughput
		if (p.throughput) {
			const t = p.throughput;
			lines.push(`\nTHROUGHPUT (${t.days} dias)`);
			lines.push(`  Jobs completados: ${formatNumber(t.jobsCompleted)}`);
			lines.push(`  Jobs fallidos:    ${formatNumber(t.jobsFailed)}`);
			lines.push(`  Docs/dia:         ${formatNumber(t.docsPerDay)}`);
			lines.push(`  Chunks/dia:       ${formatNumber(t.chunksPerDay)}`);
			lines.push(`  Vectores/dia:     ${formatNumber(t.vectorsPerDay)}`);
			lines.push(`  Tokens/dia:       ${formatNumber(t.tokensPerDay)}`);
			lines.push(`  Paginas/dia:      ${formatNumber(t.pagesPerDay)}`);
		}

		// Stage averages (real per-doc from documents endpoint)
		if (d?.stageAvgMs) {
			const s = d.stageAvgMs;
			lines.push(`\nTIEMPO PROMEDIO POR ETAPA (ms/doc)`);
			lines.push(`  Download:       ${formatMs(s.download)}`);
			lines.push(`  Extraccion:     ${formatMs(s.extract)}`);
			lines.push(`  Chunking:       ${formatMs(s.chunking)}`);
			lines.push(`  Embedding:      ${formatMs(s.embedding)}`);
			lines.push(`  Upsert:         ${formatMs(s.upsert)}`);
			lines.push(`  Overhead:       ${formatMs(s.overhead)}`);
			lines.push(`  Queue wait:     ${formatMs(s.queueWait)}`);
			lines.push(`  Pipeline total: ${formatMs(s.pipelineTotal)}`);
		}

		// S3 (real per-doc from documents endpoint)
		if (d?.s3Averages) {
			const s = d.s3Averages;
			lines.push(`\nS3 I/O`);
			lines.push(`  Avg PUT ms:     ${formatMs(s.avgPutMs)}`);
			lines.push(`  Avg GET ms:     ${formatMs(s.avgGetMs)}`);
			lines.push(`  Avg PUT bytes:  ${formatBytes(s.avgPutBytes)}`);
			lines.push(`  Avg GET bytes:  ${formatBytes(s.avgGetBytes)}`);
		}

		// Error rates
		if (p.errorRates) {
			const e = p.errorRates;
			lines.push(`\nERROR RATES`);
			lines.push(`  Job failure rate:    ${e.jobFailureRate}%`);
			lines.push(`  Download errors:     ${e.downloadErrors}`);
			lines.push(`  Download retries:    ${e.downloadRetries}`);
			lines.push(`  Embedding retries:   ${e.embeddingRetries}`);
			lines.push(`  Embedding HTTP err:  ${e.embeddingHttpErrors}`);
			lines.push(`  Embedding backoff:   ${formatMs(e.embeddingBackoffMs)}`);
			lines.push(`  Upsert retries:      ${e.upsertRetries}`);
			lines.push(`  Scanned PDFs:        ${e.scannedPdfsDetected}`);
		}

		// Queue
		if (p.queueStats) {
			lines.push(`\nQUEUE`);
			lines.push(`  Avg wait:     ${formatMs(p.queueStats.avgWaitMs)}`);
			lines.push(`  Avg intentos: ${p.queueStats.avgAttempts.toFixed(2)}`);
		}

		// Percentiles
		if (d?.percentiles) {
			lines.push(`\nPERCENTILES (${d.total} docs)`);
			lines.push(`  ${"Etapa".padEnd(18)} ${"p50".padStart(10)} ${"p90".padStart(10)} ${"p95".padStart(10)} ${"p99".padStart(10)}`);
			lines.push(`  ${"─".repeat(58)}`);
			for (const [key, label] of Object.entries(STAGE_LABELS)) {
				const pSet = (d.percentiles as any)[key];
				if (pSet) {
					lines.push(`  ${label.padEnd(18)} ${formatMs(pSet.p50).padStart(10)} ${formatMs(pSet.p90).padStart(10)} ${formatMs(pSet.p95).padStart(10)} ${formatMs(pSet.p99).padStart(10)}`);
				}
			}
		}

		// Slowest docs
		if (d?.slowest && d.slowest.length > 0) {
			lines.push(`\nDOCUMENTOS MAS LENTOS (top ${d.slowest.length})`);
			for (const doc of d.slowest) {
				const m = doc.metrics;
				lines.push(`  ${doc._id.slice(-8)} | ${formatMs(m?.totalMs || 0)} total | DL:${formatMs(m?.download?.ms || 0)} EX:${formatMs(m?.extract?.ms || 0)} EM:${formatMs(m?.embedding?.ms || 0)} UP:${formatMs(m?.upsert?.ms || 0)} | ${doc.pagesCount || 0}p ${doc.chunksCount || 0}ch`);
			}
		}

		// Config
		if (d?.avgConfig) {
			const c = d.avgConfig;
			lines.push(`\nCONFIG PROMEDIO`);
			lines.push(`  Chunk size:    ${c.chunkSizeTokens} tokens`);
			lines.push(`  Overlap:       ${c.chunkOverlapTokens} tokens`);
			lines.push(`  Batch size:    ${c.maxBatchSize}`);
			lines.push(`  Concurrency:   ${c.concurrency}`);
			lines.push(`  Modelo:        ${c.embeddingModels.join(", ")}`);
		}

		// Daily
		if (p.daily && p.daily.length > 0) {
			lines.push(`\nDESGLOSE DIARIO`);
			lines.push(`  ${"Fecha".padEnd(12)} ${"Jobs".padStart(7)} ${"Fail".padStart(6)} ${"Avg ms".padStart(8)} ${"Docs".padStart(7)} ${"Tokens".padStart(10)}`);
			lines.push(`  ${"─".repeat(54)}`);
			for (const day of p.daily) {
				lines.push(`  ${day.date.padEnd(12)} ${day.jobsCompleted.toString().padStart(7)} ${day.jobsFailed.toString().padStart(6)} ${formatMs(day.avgPipelineTotalMs).padStart(8)} ${day.documentsProcessed.toString().padStart(7)} ${formatNumber(day.embeddingTokens).padStart(10)}`);
			}
		}

		return lines.join("\n");
	}, [pipelineData, documentData]);

	const handleCopyReport = useCallback(async () => {
		const text = buildReport();
		try {
			await navigator.clipboard.writeText(text);
			enqueueSnackbar("Reporte copiado al portapapeles", { variant: "success" });
		} catch {
			enqueueSnackbar("Error al copiar", { variant: "error" });
		}
	}, [buildReport, enqueueSnackbar]);

	const handleDownloadReport = useCallback(() => {
		const text = buildReport();
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `pipeline-analytics-${period}-${new Date().toISOString().slice(0, 10)}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		enqueueSnackbar("Reporte descargado", { variant: "success" });
	}, [buildReport, period, enqueueSnackbar]);

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={40} width={300} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	const hasData = pipelineData?.hasData || false;

	return (
		<Stack spacing={3}>
			{/* Period selector */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<Stack direction="row" spacing={2} alignItems="center">
					<ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
						<ToggleButton value="today">Hoy</ToggleButton>
						<ToggleButton value="week">7 dias</ToggleButton>
						<ToggleButton value="month">Mes</ToggleButton>
					</ToggleButtonGroup>
					{pipelineData?.period && (
						<Typography variant="caption" color="text.secondary">
							{pipelineData.period.from} al {pipelineData.period.to}
						</Typography>
					)}
				</Stack>
				<Stack direction="row" spacing={0.5}>
					{hasData && (
						<>
							<Tooltip title="Copiar reporte">
								<IconButton onClick={handleCopyReport} size="small">
									<Copy size={18} />
								</IconButton>
							</Tooltip>
							<Tooltip title="Descargar reporte (.txt)">
								<IconButton onClick={handleDownloadReport} size="small">
									<DocumentDownload size={18} />
								</IconButton>
							</Tooltip>
						</>
					)}
					<Tooltip title="Refrescar">
						<IconButton onClick={fetchData} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			{!hasData && (
				<Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
					No hay datos de analytics para el periodo seleccionado
				</Typography>
			)}

			{hasData && pipelineData && (
				<>
					{/* ── Section 1: Pipeline Overview Bar Chart (real per-doc avgs) ── */}
					{documentData?.stageAvgMs && (
						<PipelineBarChart stageAvgMs={documentData.stageAvgMs} docCount={documentData.total} theme={theme} />
					)}

					{/* ── Section 2: Throughput cards ────────────────────────── */}
					<ThroughputSection throughput={pipelineData.throughput!} queueStats={pipelineData.queueStats!} theme={theme} />

					{/* ── Section 3: Stage detail cards (real per-doc avgs) ──── */}
					<StageDetailCards stageAvgMs={documentData?.stageAvgMs} s3Averages={documentData?.s3Averages} errorRates={pipelineData.errorRates} theme={theme} />

					{/* ── Section 4: Trends ──────────────────────────────────── */}
					{pipelineData.daily.length > 1 && <TrendCharts daily={pipelineData.daily} theme={theme} />}

					{/* ── Section 5: Percentiles table ───────────────────────── */}
					{documentData?.hasData && documentData.percentiles && (
						<>
							<Divider />
							<Typography variant="h6">Percentiles por etapa ({documentData.total} docs)</Typography>
							<PercentilesTable percentiles={documentData.percentiles} />
						</>
					)}

					{/* ── Section 6: Slowest documents table ─────────────────── */}
					{documentData?.slowest && documentData.slowest.length > 0 && (
						<>
							<Typography variant="h6">Documentos mas lentos</Typography>
							<SlowestDocsTable documents={documentData.slowest} />
						</>
					)}

					{/* ── Section 7: Config snapshot ─────────────────────────── */}
					{documentData?.avgConfig && <ConfigSnapshot config={documentData.avgConfig} theme={theme} />}
				</>
			)}
		</Stack>
	);
};

// ── Section 1: Pipeline bar chart ───────────────────────────────────────────

const PipelineBarChart: React.FC<{ stageAvgMs: StageAvgMs; docCount: number; theme: any }> = ({ stageAvgMs, docCount, theme }) => {
	if (!stageAvgMs) return null;

	const data = [
		{ name: "Download", ms: stageAvgMs.download, fill: STAGE_COLORS.download },
		{ name: "Extraccion", ms: stageAvgMs.extract, fill: STAGE_COLORS.extract },
		{ name: "Chunking", ms: stageAvgMs.chunking, fill: STAGE_COLORS.chunking },
		{ name: "Embedding", ms: stageAvgMs.embedding, fill: STAGE_COLORS.embedding },
		{ name: "Upsert", ms: stageAvgMs.upsert, fill: STAGE_COLORS.upsert },
		{ name: "Overhead", ms: stageAvgMs.overhead, fill: STAGE_COLORS.overhead },
	];

	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
				<Typography variant="subtitle1" fontWeight={600}>
					Tiempo promedio por etapa ({docCount} docs)
				</Typography>
				<Stack direction="row" spacing={1}>
					<Chip
						label={`Avg: ${formatMs(stageAvgMs.pipelineTotal)}`}
						size="small"
						color="primary"
						variant="outlined"
						sx={{ fontFamily: "monospace", fontWeight: 600 }}
					/>
					{stageAvgMs.minTotalMs !== undefined && (
						<Chip
							label={`Min: ${formatMs(stageAvgMs.minTotalMs)} / Max: ${formatMs(stageAvgMs.maxTotalMs || 0)}`}
							size="small"
							variant="outlined"
							sx={{ fontFamily: "monospace" }}
						/>
					)}
				</Stack>
			</Stack>
			<ResponsiveContainer width="100%" height={280}>
				<BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
					<XAxis dataKey="name" tick={{ fontSize: 12 }} />
					<YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatMs(v)} />
					<RechartsTooltip content={<ChartTooltip formatter={formatMs} />} />
					<Bar dataKey="ms" radius={[4, 4, 0, 0]} maxBarSize={60}>
						{data.map((entry, index) => (
							<Cell key={index} fill={entry.fill} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Box>
	);
};

// ── Section 2: Throughput + queue stats ─────────────────────────────────────

const ThroughputSection: React.FC<{
	throughput: NonNullable<PipelineAnalytics["throughput"]>;
	queueStats: NonNullable<PipelineAnalytics["queueStats"]>;
	theme: any;
}> = ({ throughput, queueStats, theme }) => {
	const failRate = throughput.jobsCompleted + throughput.jobsFailed > 0
		? ((throughput.jobsFailed / (throughput.jobsCompleted + throughput.jobsFailed)) * 100).toFixed(1)
		: "0";

	const items = [
		{ label: "Docs/dia", value: formatNumber(throughput.docsPerDay) },
		{ label: "Chunks/dia", value: formatNumber(throughput.chunksPerDay) },
		{ label: "Vectores/dia", value: formatNumber(throughput.vectorsPerDay) },
		{ label: "Tokens/dia", value: formatNumber(throughput.tokensPerDay) },
		{ label: "Jobs OK", value: formatNumber(throughput.jobsCompleted), color: "success.main" },
		{ label: "Jobs fallidos", value: formatNumber(throughput.jobsFailed), color: throughput.jobsFailed > 0 ? "error.main" : "text.secondary" },
		{ label: "Tasa de fallo", value: `${failRate}%`, color: parseFloat(failRate) > 5 ? "error.main" : "text.secondary" },
		{ label: "Queue wait avg", value: formatMs(queueStats.avgWaitMs) },
		{ label: "Intentos avg", value: queueStats.avgAttempts.toFixed(2) },
		{ label: "Dias con datos", value: throughput.days.toString() },
	];

	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
			<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
				Throughput y cola
			</Typography>
			<Stack direction="row" spacing={3} flexWrap="wrap" sx={{ "& > *": { minWidth: 100 } }}>
				{items.map((item) => (
					<StatItem key={item.label} label={item.label} value={item.value} color={item.color} />
				))}
			</Stack>
		</Box>
	);
};

// ── Section 3: Stage detail cards ───────────────────────────────────────────

const StageDetailCards: React.FC<{
	stageAvgMs: StageAvgMs | null | undefined;
	s3Averages: S3Averages | null | undefined;
	errorRates: ErrorRates | null | undefined;
	theme: any;
}> = ({ stageAvgMs, s3Averages, errorRates, theme }) => {
	if (!stageAvgMs) return null;

	const cardSx = {
		p: 1.5,
		borderRadius: 2,
		border: `1px solid ${theme.palette.divider}`,
		bgcolor: alpha(theme.palette.background.paper, 0.6),
	};

	return (
		<>
			<Typography variant="h6">Detalle por etapa</Typography>
			<Grid container spacing={2}>
				{/* Download */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.download}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Download
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.download)} />
							{errorRates && (
								<>
									<StatItem label="Errores" value={errorRates.downloadErrors.toString()} color={errorRates.downloadErrors > 0 ? "error.main" : undefined} />
									<StatItem label="Reintentos" value={errorRates.downloadRetries.toString()} />
									<StatItem label="Error rate" value={`${errorRates.downloadErrorRate}%`} />
								</>
							)}
						</Stack>
					</Box>
				</Grid>

				{/* S3 */}
				{s3Averages && (
					<Grid item xs={12} sm={6} md={4}>
						<Box sx={{ ...cardSx, borderLeft: `3px solid #78909C` }}>
							<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
								S3 I/O
							</Typography>
							<Stack direction="row" spacing={2} flexWrap="wrap">
								<StatItem label="Avg PUT ms" value={formatMs(s3Averages.avgPutMs)} />
								<StatItem label="Avg GET ms" value={formatMs(s3Averages.avgGetMs)} />
								<StatItem label="Avg PUT bytes" value={formatBytes(s3Averages.avgPutBytes)} />
								<StatItem label="Avg GET bytes" value={formatBytes(s3Averages.avgGetBytes)} />
							</Stack>
						</Box>
					</Grid>
				)}

				{/* Extract */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.extract}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Extraccion
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.extract)} />
							{errorRates && (
								<>
									<StatItem label="Scanned PDFs" value={errorRates.scannedPdfsDetected.toString()} />
									<StatItem label="Empty pages" value={errorRates.emptyTextPagesTotal.toString()} />
								</>
							)}
						</Stack>
					</Box>
				</Grid>

				{/* Chunking */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.chunking}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Chunking
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.chunking)} />
						</Stack>
					</Box>
				</Grid>

				{/* Embedding */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.embedding}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Embedding
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.embedding)} />
							{errorRates && (
								<>
									<StatItem label="Reintentos" value={errorRates.embeddingRetries.toString()} />
									<StatItem label="HTTP errors" value={errorRates.embeddingHttpErrors.toString()} color={errorRates.embeddingHttpErrors > 0 ? "error.main" : undefined} />
									<StatItem label="Backoff total" value={formatMs(errorRates.embeddingBackoffMs)} />
								</>
							)}
						</Stack>
					</Box>
				</Grid>

				{/* Upsert */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.upsert}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Upsert
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.upsert)} />
							{errorRates && <StatItem label="Reintentos" value={errorRates.upsertRetries.toString()} />}
						</Stack>
					</Box>
				</Grid>

				{/* Overhead */}
				<Grid item xs={12} sm={6} md={4}>
					<Box sx={{ ...cardSx, borderLeft: `3px solid ${STAGE_COLORS.overhead}` }}>
						<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
							Overhead (DB/S3/IO)
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							<StatItem label="Avg ms" value={formatMs(stageAvgMs.overhead)} />
						</Stack>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
							Tiempo inter-etapa: escrituras MongoDB, uploads S3, actualizaciones de estado
						</Typography>
					</Box>
				</Grid>
			</Grid>
		</>
	);
};

// ── Section 4: Trend charts ─────────────────────────────────────────────────

const TrendCharts: React.FC<{ daily: PipelineDailyEntry[]; theme: any }> = ({ daily, theme }) => {
	const formatDate = (d: string) => {
		const parts = d.split("-");
		return `${parts[2]}/${parts[1]}`;
	};
	const chartData = daily.map((d) => ({ ...d, dateLabel: formatDate(d.date) }));

	const chartContainerSx = {
		p: 2,
		borderRadius: 2,
		border: `1px solid ${theme.palette.divider}`,
		bgcolor: alpha(theme.palette.background.paper, 0.6),
	};

	return (
		<>
			<Divider />
			<Typography variant="h6">Tendencias</Typography>

			{/* Pipeline total avg ms */}
			<Box sx={chartContainerSx}>
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Tiempo promedio pipeline (ms/doc)
				</Typography>
				<ResponsiveContainer width="100%" height={250}>
					<LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
						<XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatMs(v)} />
						<RechartsTooltip content={<ChartTooltip formatter={formatMs} />} />
						<Line type="monotone" dataKey="avgPipelineTotalMs" name="Pipeline Total" stroke={theme.palette.primary.main} strokeWidth={2} dot={{ r: 3 }} />
					</LineChart>
				</ResponsiveContainer>
			</Box>

			{/* Stage breakdown over time */}
			<Box sx={chartContainerSx}>
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Desglose por etapa (ms/doc)
				</Typography>
				<ResponsiveContainer width="100%" height={250}>
					<AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
						<XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatMs(v)} />
						<RechartsTooltip content={<ChartTooltip formatter={formatMs} />} />
						<Area type="monotone" dataKey="avgDownloadMs" name="Download" stackId="1" fill={STAGE_COLORS.download} stroke={STAGE_COLORS.download} fillOpacity={0.6} />
						<Area type="monotone" dataKey="avgExtractMs" name="Extraccion" stackId="1" fill={STAGE_COLORS.extract} stroke={STAGE_COLORS.extract} fillOpacity={0.6} />
						<Area type="monotone" dataKey="avgChunkingMs" name="Chunking" stackId="1" fill={STAGE_COLORS.chunking} stroke={STAGE_COLORS.chunking} fillOpacity={0.6} />
						<Area type="monotone" dataKey="avgEmbeddingMs" name="Embedding" stackId="1" fill={STAGE_COLORS.embedding} stroke={STAGE_COLORS.embedding} fillOpacity={0.6} />
						<Area type="monotone" dataKey="avgUpsertMs" name="Upsert" stackId="1" fill={STAGE_COLORS.upsert} stroke={STAGE_COLORS.upsert} fillOpacity={0.6} />
					</AreaChart>
				</ResponsiveContainer>
			</Box>

			{/* Docs + tokens per day */}
			<Box sx={chartContainerSx}>
				<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
					Documentos y tokens por dia
				</Typography>
				<ResponsiveContainer width="100%" height={250}>
					<LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
						<CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
						<XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
						<YAxis yAxisId="left" tick={{ fontSize: 11 }} />
						<YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v: number) => formatNumber(v)} />
						<RechartsTooltip content={<ChartTooltip />} />
						<Line yAxisId="left" type="monotone" dataKey="documentsProcessed" name="Documentos" stroke={theme.palette.primary.main} strokeWidth={2} dot={{ r: 2 }} />
						<Line yAxisId="right" type="monotone" dataKey="embeddingTokens" name="Tokens" stroke={STAGE_COLORS.embedding} strokeWidth={2} dot={{ r: 2 }} />
					</LineChart>
				</ResponsiveContainer>
			</Box>
		</>
	);
};

// ── Section 5: Percentiles table ────────────────────────────────────────────

const PercentilesTable: React.FC<{ percentiles: NonNullable<DocumentAnalytics["percentiles"]> }> = ({ percentiles }) => {
	const rows = (["totalMs", "downloadMs", "extractMs", "chunkingMs", "embeddingMs", "upsertMs"] as const).map((key) => ({
		label: STAGE_LABELS[key] || key,
		...percentiles[key],
	}));

	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Etapa</TableCell>
						<TableCell align="right">p50</TableCell>
						<TableCell align="right">p90</TableCell>
						<TableCell align="right">p95</TableCell>
						<TableCell align="right">p99</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.label} hover>
							<TableCell>
								<Typography variant="caption" fontWeight={600}>
									{row.label}
								</Typography>
							</TableCell>
							{(["p50", "p90", "p95", "p99"] as const).map((p) => (
								<TableCell key={p} align="right">
									<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
										{formatMs(row[p])}
									</Typography>
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

// ── Section 6: Slowest documents table ──────────────────────────────────────

const SlowestDocsTable: React.FC<{ documents: DocumentAnalytics["slowest"] }> = ({ documents }) => {
	return (
		<TableContainer>
			<Table size="small">
				<TableHead>
					<TableRow>
						<TableCell>Doc ID</TableCell>
						<TableCell>Tipo</TableCell>
						<TableCell align="right">Pags</TableCell>
						<TableCell align="right">Chunks</TableCell>
						<TableCell align="right">Total</TableCell>
						<TableCell align="right">Download</TableCell>
						<TableCell align="right">Extract</TableCell>
						<TableCell align="right">Chunk</TableCell>
						<TableCell align="right">Embed</TableCell>
						<TableCell align="right">Upsert</TableCell>
						<TableCell align="center">Scanned</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{documents.map((doc) => (
						<TableRow key={doc._id} hover>
							<TableCell>
								<Tooltip title={doc._id}>
									<Typography variant="caption" sx={{ fontFamily: "monospace", cursor: "help" }}>
										{doc._id.slice(-8)}
									</Typography>
								</Tooltip>
							</TableCell>
							<TableCell>
								<Typography variant="caption">{doc.sourceType || doc.causaType}</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption">{doc.pagesCount || "-"}</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption">{doc.chunksCount || "-"}</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" fontWeight={600} sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.totalMs || 0)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.download?.ms || 0)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.extract?.ms || 0)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.chunking?.ms || 0)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.embedding?.ms || 0)}
								</Typography>
							</TableCell>
							<TableCell align="right">
								<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
									{formatMs(doc.metrics?.upsert?.ms || 0)}
								</Typography>
							</TableCell>
							<TableCell align="center">
								<Typography variant="caption">{doc.metrics?.extract?.isScannedLikely ? "Si" : "No"}</Typography>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

// ── Section 7: Config snapshot ──────────────────────────────────────────────

const ConfigSnapshot: React.FC<{ config: NonNullable<DocumentAnalytics["avgConfig"]>; theme: any }> = ({ config, theme }) => (
	<Box sx={{ p: 2, borderRadius: 2, border: `1px dashed ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
		<Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
			Config promedio (docs procesados en el periodo)
		</Typography>
		<Stack direction="row" spacing={3} flexWrap="wrap">
			<StatItem label="Chunk size" value={`${config.chunkSizeTokens} tokens`} />
			<StatItem label="Overlap" value={`${config.chunkOverlapTokens} tokens`} />
			<StatItem label="Batch size" value={config.maxBatchSize.toString()} />
			<StatItem label="Concurrency" value={config.concurrency.toString()} />
			<StatItem label="Modelo" value={config.embeddingModels.join(", ")} />
		</Stack>
	</Box>
);

export default WorkerAnalyticsTab;
