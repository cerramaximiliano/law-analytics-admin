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
} from "@mui/material";
import { Refresh, SearchNormal1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { StyleCorpusStats, StyleCorpusByFuero, StyleCorpusExample } from "api/ragWorkers";

const formatNumber = (n: number): string => {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
	return n.toString();
};

const pct = (part: number, total: number): string => (total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—");

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	CNT: "Laboral",
	CSS: "Seg. Social",
	COM: "Comercial",
	FSM: "Familia",
	CAF: "Administrativo",
	CPF: "Penal",
};

const FUERO_OPTIONS = Object.entries(FUERO_LABELS).map(([code, label]) => ({ code, label }));

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
			<Typography variant="h4" fontWeight={700}>
				{value}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			{sub && (
				<Typography variant="caption" color="text.secondary" display="block">
					{sub}
				</Typography>
			)}
		</Box>
	);
};

const StyleCorpusTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [stats, setStats] = useState<StyleCorpusStats | null>(null);
	const [loading, setLoading] = useState(true);

	// Preview search state
	const [previewFuero, setPreviewFuero] = useState("CNT");
	const [previewQuery, setPreviewQuery] = useState("");
	const [previewResults, setPreviewResults] = useState<StyleCorpusExample[] | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true);
			const data = await RagWorkersService.getStyleCorpusStats();
			setStats(data);
		} catch (err) {
			enqueueSnackbar("Error al cargar stats del corpus de estilo", { variant: "error" });
		} finally {
			setLoading(false);
		}
	}, [enqueueSnackbar]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	const handlePreviewSearch = async () => {
		if (previewQuery.trim().length < 20) {
			enqueueSnackbar("Ingresá al menos 20 caracteres para buscar", { variant: "warning" });
			return;
		}
		try {
			setPreviewLoading(true);
			const results = await RagWorkersService.getStyleExamples(previewFuero, previewQuery.trim(), 3);
			setPreviewResults(results);
		} catch (err) {
			enqueueSnackbar("Error al buscar ejemplos en el corpus", { variant: "error" });
		} finally {
			setPreviewLoading(false);
		}
	};

	return (
		<Stack spacing={3} sx={{ p: 3 }}>
			{/* Header */}
			<Stack direction="row" justifyContent="space-between" alignItems="center">
				<Box>
					<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
						<Typography variant="h5" fontWeight={600}>
							Corpus de Estilo Jurídico
						</Typography>
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

			{/* Summary cards */}
			{loading ? (
				<Stack direction="row" flexWrap="wrap" gap={2}>
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} variant="rounded" width={140} height={72} />
					))}
				</Stack>
			) : stats ? (
				<Stack direction="row" flexWrap="wrap" gap={2}>
					<SummaryCard label="Total corpus" value={formatNumber(stats.total)} />
					<SummaryCard
						label="Alta calidad"
						value={formatNumber(stats.high)}
						sub={`${pct(stats.high, stats.total)} del total`}
					/>
					<SummaryCard
						label="Embebidos en Pinecone"
						value={formatNumber(stats.embedded)}
						sub={`${pct(stats.embedded, stats.high)} de los high`}
					/>
					<SummaryCard
						label="Normal / sin clasificar"
						value={formatNumber(stats.normal)}
						sub={pct(stats.normal, stats.total)}
					/>
					<SummaryCard
						label="Pendientes de embed"
						value={formatNumber(stats.high - stats.embedded)}
						sub="high sin vectorId"
					/>
				</Stack>
			) : null}

			{/* By fuero table */}
			<Box>
				<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
					Por fuero
				</Typography>
				{loading ? (
					<Skeleton variant="rounded" height={200} />
				) : (
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
									<TableCell>
										<Typography variant="caption" fontWeight={600}>
											Fuero
										</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography variant="caption" fontWeight={600}>
											Total
										</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography variant="caption" fontWeight={600}>
											Alta calidad
										</Typography>
									</TableCell>
									<TableCell align="right">
										<Typography variant="caption" fontWeight={600}>
											Embebidos
										</Typography>
									</TableCell>
									<TableCell>
										<Typography variant="caption" fontWeight={600}>
											Cobertura Pinecone
										</Typography>
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{(stats?.byFuero ?? []).map((row: StyleCorpusByFuero) => (
									<TableRow key={row._id} hover>
										<TableCell>
											<Stack direction="row" spacing={1} alignItems="center">
												<Chip label={row._id || "?"} size="small" variant="outlined" color="primary" />
												<Typography variant="body2" color="text.secondary">
													{FUERO_LABELS[row._id] || ""}
												</Typography>
											</Stack>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{formatNumber(row.total)}</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">
												{formatNumber(row.high)}{" "}
												<Typography component="span" variant="caption" color="text.secondary">
													({pct(row.high, row.total)})
												</Typography>
											</Typography>
										</TableCell>
										<TableCell align="right">
											<Typography variant="body2">{formatNumber(row.embedded)}</Typography>
										</TableCell>
										<TableCell sx={{ minWidth: 160 }}>
											<Stack spacing={0.5}>
												<LinearProgress
													variant="determinate"
													value={row.high > 0 ? (row.embedded / row.high) * 100 : 0}
													sx={{ height: 6, borderRadius: 3 }}
												/>
												<Typography variant="caption" color="text.secondary">
													{pct(row.embedded, row.high)} de high
												</Typography>
											</Stack>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Box>

			{/* Semantic preview search */}
			<Box>
				<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
					Preview semántico
				</Typography>
				<Paper variant="outlined" sx={{ p: 2 }}>
					<Stack spacing={2}>
						<Stack direction="row" spacing={2} alignItems="flex-start">
							<TextField
								select
								label="Fuero"
								value={previewFuero}
								onChange={(e) => setPreviewFuero(e.target.value)}
								size="small"
								sx={{ minWidth: 140 }}
							>
								{FUERO_OPTIONS.map((o) => (
									<MenuItem key={o.code} value={o.code}>
										{o.code} — {o.label}
									</MenuItem>
								))}
							</TextField>
							<TextField
								label="Texto a buscar"
								placeholder="Ej: quiero demandar a mi empleador por despido injustificado..."
								value={previewQuery}
								onChange={(e) => setPreviewQuery(e.target.value)}
								size="small"
								multiline
								minRows={2}
								fullWidth
								onKeyDown={(e) => {
									if (e.key === "Enter" && e.ctrlKey) handlePreviewSearch();
								}}
							/>
							<Button
								variant="contained"
								size="small"
								onClick={handlePreviewSearch}
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
									<Typography variant="body2" color="text.secondary">
										Sin resultados. Probá con otro fuero o texto más específico.
									</Typography>
								) : (
									<Stack spacing={2}>
										{previewResults.map((ex, i) => (
											<Box
												key={i}
												sx={{
													p: 1.5,
													borderRadius: 1.5,
													bgcolor: alpha(theme.palette.primary.main, 0.03),
													border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
												}}
											>
												<Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
													<Chip label={ex.docType || "?"} size="small" color="primary" variant="outlined" />
													<Typography variant="caption" color="text.secondary" noWrap>
														{ex.title}
													</Typography>
												</Stack>
												<Typography
													variant="body2"
													sx={{
														fontFamily: "monospace",
														fontSize: "0.75rem",
														whiteSpace: "pre-wrap",
														maxHeight: 140,
														overflow: "auto",
														color: "text.primary",
													}}
												>
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

			{/* Note */}
			<Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.04), border: `1px solid ${alpha(theme.palette.secondary.main, 0.12)}` }}>
				<Typography variant="body2" color="text.secondary">
					El corpus v2 vive íntegramente en Pinecone. Los conteos por fuero reflejan los valores al cierre del run de embedding (2026-03-25). Índice: <strong>{stats?.indexName || "pjn-style-corpus-v2"}</strong>.
				</Typography>
			</Box>
		</Stack>
	);
};

export default StyleCorpusTab;
