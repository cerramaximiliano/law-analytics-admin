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
	TablePagination,
	Chip,
	IconButton,
	Tooltip,
	ToggleButton,
	ToggleButtonGroup,
	Skeleton,
	LinearProgress,
	useTheme,
	alpha,
} from "@mui/material";
import { Refresh } from "iconsax-react";
import { useSnackbar } from "notistack";
import RagWorkersService, { IndexationSummary, IndexationCausa } from "api/ragWorkers";

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

const WorkerIndexationTab = () => {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();
	const [summary, setSummary] = useState<IndexationSummary | null>(null);
	const [causas, setCausas] = useState<IndexationCausa[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<FilterType>("all");
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(25);

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

	return (
		<Stack spacing={3}>
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

					{/* Progress bar */}
					<Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
						<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
							<Typography variant="subtitle2">Cobertura de indexacion</Typography>
							<Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
								{summary.totalWithRagIndex} / {summary.totalVerifiedCausas} ({coveragePercent}%)
							</Typography>
						</Stack>
						<LinearProgress
							variant="determinate"
							value={coveragePercent}
							sx={{
								height: 10,
								borderRadius: 5,
								bgcolor: alpha(theme.palette.primary.main, 0.1),
								"& .MuiLinearProgress-bar": { borderRadius: 5 },
							}}
						/>
					</Box>

					{/* Stat chips */}
					<Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
						<StatChip label="Indexados al dia" value={summary.upToDate} color="success" theme={theme} />
						<StatChip label="Desactualizados" value={summary.outdated} color="warning" theme={theme} />
						<StatChip label="Pendientes" value={(summary.byStatus.pending || 0) + (summary.byStatus.indexing || 0)} color="info" theme={theme} />
						<StatChip label="Con error" value={summary.byStatus.error || 0} color="error" theme={theme} />
						<StatChip label="Sin indexar" value={summary.neverIndexed} color="default" theme={theme} />
					</Stack>
				</>
			) : (
				<Stack spacing={2}>
					<Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
					<Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
				</Stack>
			)}

			{/* Filter */}
			<ToggleButtonGroup value={filter} exclusive onChange={handleFilterChange} size="small">
				{(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
					<ToggleButton key={f} value={f}>
						{FILTER_LABELS[f]}
					</ToggleButton>
				))}
			</ToggleButtonGroup>

			{/* Table */}
			<TableContainer>
				<Table size="small" sx={{ tableLayout: "fixed" }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: "40%" }}>Caratula</TableCell>
							<TableCell sx={{ width: "7%" }}>Fuero</TableCell>
							<TableCell sx={{ width: "10%" }}>Tipo</TableCell>
							<TableCell sx={{ width: "12%" }} align="center">Estado</TableCell>
							<TableCell sx={{ width: "11%" }} align="right">Movimientos</TableCell>
							<TableCell sx={{ width: "8%" }} align="right">Docs</TableCell>
							<TableCell sx={{ width: "12%" }}>Ultima indexacion</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading ? (
							[...Array(5)].map((_, i) => (
								<TableRow key={i}>
									{[...Array(7)].map((__, j) => (
										<TableCell key={j}>
											<Skeleton variant="text" />
										</TableCell>
									))}
								</TableRow>
							))
						) : causas.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
										<TableCell>
											<Typography variant="caption" color="text.secondary">
												{c.fuero || "-"}
											</Typography>
										</TableCell>
										<TableCell>
											<Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
												{c.causaType.replace("Causas", "")}
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
										<TableCell align="right">
											<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
												{c.documentsProcessed !== undefined ? `${c.documentsProcessed}/${c.documentsTotal || 0}` : "-"}
											</Typography>
										</TableCell>
										<TableCell>
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

const StatChip: React.FC<{ label: string; value: number; color: string; theme: any }> = ({ label, value, color, theme }) => {
	const paletteColor = (theme.palette as any)[color]?.main || theme.palette.text.secondary;
	return (
		<Box
			sx={{
				px: 2,
				py: 1,
				borderRadius: 1.5,
				border: `1px solid ${alpha(paletteColor, 0.3)}`,
				bgcolor: alpha(paletteColor, 0.04),
				minWidth: 100,
			}}
		>
			<Typography variant="h4" fontWeight={700} sx={{ fontFamily: "monospace", color: paletteColor }}>
				{value}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Box>
	);
};

export default WorkerIndexationTab;
