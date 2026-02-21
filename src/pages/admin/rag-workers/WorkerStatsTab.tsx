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
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { StatsResponse, WorkerStats, DailyStatsEntry } from "api/ragWorkers";

const WORKER_LABELS: Record<string, string> = {
	indexCausa: "Index Causa",
	indexDocument: "Index Document",
	generateSummary: "Generate Summary",
	ocrDocument: "OCR Document",
	autoIndex: "Auto Index",
};

const formatNumber = (n: number): string => {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toString();
};

const formatUsd = (n: number): string => `$${n.toFixed(6)}`;

const formatMs = (ms: number): string => {
	if (ms >= 60000) return `${(ms / 60000).toFixed(1)} min`;
	if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
	return `${ms}ms`;
};

const WorkerStatsTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [period, setPeriod] = useState("month");
	const [stats, setStats] = useState<StatsResponse | null>(null);
	const [dailyStats, setDailyStats] = useState<DailyStatsEntry[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			const [statsData, dailyData] = await Promise.all([RagWorkersService.getStats(period), RagWorkersService.getDailyStats(period === "today" ? 1 : period === "week" ? 7 : 30)]);
			setStats(statsData);
			setDailyStats(dailyData.stats);
		} catch (err: any) {
			enqueueSnackbar(err?.response?.data?.error || "Error al cargar estadisticas", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [period, enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const handlePeriodChange = (_event: React.MouseEvent<HTMLElement>, newPeriod: string | null) => {
		if (newPeriod) setPeriod(newPeriod);
	};

	if (loading) {
		return (
			<Stack spacing={2}>
				<Skeleton variant="rectangular" height={40} width={300} sx={{ borderRadius: 1 }} />
				<Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
			</Stack>
		);
	}

	return (
		<Stack spacing={3}>
			{/* Period selector + total cost */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
				<ToggleButtonGroup value={period} exclusive onChange={handlePeriodChange} size="small">
					<ToggleButton value="today">Hoy</ToggleButton>
					<ToggleButton value="week">7 dias</ToggleButton>
					<ToggleButton value="month">Mes</ToggleButton>
				</ToggleButtonGroup>

				<Stack direction="row" spacing={2} alignItems="center">
					{stats && (
						<Chip
							label={`Costo total: ${formatUsd(stats.totalCosts.usd)}`}
							color="primary"
							variant="outlined"
							sx={{ fontWeight: 600, fontFamily: "monospace" }}
						/>
					)}
					<Tooltip title="Refrescar">
						<IconButton onClick={fetchStats} size="small">
							<Refresh size={18} />
						</IconButton>
					</Tooltip>
				</Stack>
			</Stack>

			{stats && stats.period && (
				<Typography variant="caption" color="text.secondary">
					Periodo: {stats.period.from} al {stats.period.to}
				</Typography>
			)}

			{/* Summary cards per worker */}
			{stats?.workers.map((w) => (
				<WorkerStatsCard key={w.workerName} worker={w} theme={theme} />
			))}

			{stats?.workers.length === 0 && (
				<Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
					No hay estadisticas para el periodo seleccionado
				</Typography>
			)}

			{/* Daily breakdown table */}
			{dailyStats.length > 0 && (
				<>
					<Divider />
					<Typography variant="h6">Desglose diario</Typography>
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell>Worker</TableCell>
									<TableCell align="right">Completados</TableCell>
									<TableCell align="right">Fallidos</TableCell>
									<TableCell align="right">Tiempo total</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{dailyStats.slice(-50).map((entry) => (
									<TableRow key={entry._id} hover>
										<TableCell>
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{entry.date}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="caption">{WORKER_LABELS[entry.workerName] || entry.workerName}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption" fontWeight={600} color="success.main">
												{entry.jobsCompleted}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption" fontWeight={600} color={entry.jobsFailed > 0 ? "error.main" : "text.secondary"}>
												{entry.jobsFailed}
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{formatMs(entry.totalProcessingMs)}
											</Typography>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</>
			)}
		</Stack>
	);
};

// ── Worker stats card ────────────────────────────────────────────────────────

interface WorkerStatsCardProps {
	worker: WorkerStats;
	theme: any;
}

const WorkerStatsCard: React.FC<WorkerStatsCardProps> = ({ worker, theme }) => {
	const w = worker;
	const label = WORKER_LABELS[w.workerName] || w.workerName;
	const totalJobs = w.jobsCompleted + w.jobsFailed;
	const successRate = totalJobs > 0 ? ((w.jobsCompleted / totalJobs) * 100).toFixed(1) : "0";

	return (
		<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6) }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
				<Typography variant="subtitle1" fontWeight={600}>
					{label}
				</Typography>
				<Stack direction="row" spacing={1}>
					<Chip label={`${w.jobsCompleted} completados`} size="small" color="success" variant="outlined" />
					{w.jobsFailed > 0 && <Chip label={`${w.jobsFailed} fallidos`} size="small" color="error" variant="outlined" />}
					<Chip label={`${successRate}% exito`} size="small" variant="outlined" />
				</Stack>
			</Stack>

			<Stack direction="row" spacing={3} flexWrap="wrap" sx={{ "& > *": { minWidth: 120 } }}>
				<StatItem label="Promedio" value={formatMs(w.avgProcessingMs)} />

				{/* indexDocument specific */}
				{w.documentsProcessed !== undefined && w.documentsProcessed > 0 && (
					<>
						<StatItem label="Documentos" value={formatNumber(w.documentsProcessed)} />
						<StatItem label="Chunks" value={formatNumber(w.chunksCreated || 0)} />
						<StatItem label="Vectores" value={formatNumber(w.vectorsUpserted || 0)} />
						<StatItem label="Tokens embed." value={formatNumber(w.embeddingTokens || 0)} />
					</>
				)}

				{/* generateSummary specific */}
				{w.llmTokensPrompt !== undefined && w.llmTokensPrompt > 0 && (
					<>
						<StatItem label="Tokens prompt" value={formatNumber(w.llmTokensPrompt)} />
						<StatItem label="Tokens completion" value={formatNumber(w.llmTokensCompletion || 0)} />
					</>
				)}

				{/* ocrDocument specific */}
				{w.ocrPagesProcessed !== undefined && w.ocrPagesProcessed > 0 && <StatItem label="Paginas OCR" value={formatNumber(w.ocrPagesProcessed)} />}

				{/* indexCausa specific */}
				{w.causasIndexed !== undefined && w.causasIndexed > 0 && (
					<>
						<StatItem label="Causas indexadas" value={formatNumber(w.causasIndexed)} />
						<StatItem label="Docs RAG creados" value={formatNumber(w.ragDocumentsCreated || 0)} />
					</>
				)}

				{/* autoIndex specific */}
				{w.scansCompleted !== undefined && w.scansCompleted > 0 && (
					<>
						<StatItem label="Escaneos" value={formatNumber(w.scansCompleted)} />
						<StatItem label="Causas encoladas" value={formatNumber(w.causasEnqueued || 0)} />
					</>
				)}
			</Stack>

			{/* Cost breakdown */}
			{w.costs && (
				<Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${theme.palette.divider}` }}>
					<Stack direction="row" spacing={3} flexWrap="wrap">
						{w.costs.embedding && <StatItem label="Costo embedding" value={formatUsd(w.costs.embedding.usd)} highlight />}
						{w.costs.llm && (
							<>
								<StatItem label="Costo prompt" value={formatUsd(w.costs.llm.prompt.usd)} highlight />
								<StatItem label="Costo completion" value={formatUsd(w.costs.llm.completion.usd)} highlight />
								<StatItem label="Costo LLM total" value={formatUsd(w.costs.llm.total)} highlight />
							</>
						)}
					</Stack>
				</Box>
			)}
		</Box>
	);
};

// ── Stat item component ──────────────────────────────────────────────────────

const StatItem: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
	<Box>
		<Typography variant="caption" color="text.secondary" display="block">
			{label}
		</Typography>
		<Typography variant="body2" fontWeight={600} sx={{ fontFamily: "monospace" }} color={highlight ? "primary.main" : "text.primary"}>
			{value}
		</Typography>
	</Box>
);

export default WorkerStatsTab;
