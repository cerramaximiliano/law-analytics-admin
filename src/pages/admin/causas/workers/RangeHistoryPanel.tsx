import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Stack,
	Chip,
	Button,
	CircularProgress,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	TablePagination,
	TableSortLabel,
	Tooltip,
	Grid,
	Card,
	CardContent,
} from "@mui/material";
import { Refresh2 } from "iconsax-react";
import { useSnackbar } from "notistack";
import { WorkersService, ScrapingHistory } from "api/workers";

const FUERO_OPTIONS = [
	{ value: "CIV", label: "Civil" },
	{ value: "CSS", label: "Seguridad Social" },
	{ value: "CNT", label: "Trabajo" },
	{ value: "COM", label: "Comercial" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => String(CURRENT_YEAR - i));

function formatDate(date: any): string {
	if (!date) return "-";
	const dateStr = typeof date === "string" ? date : date.$date;
	return new Date(dateStr).toLocaleDateString("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

function formatDateFull(date: any): string {
	if (!date) return "-";
	const dateStr = typeof date === "string" ? date : date.$date;
	return new Date(dateStr).toLocaleString("es-ES");
}

function getRelativeTime(date: any): string {
	if (!date) return "-";
	const dateStr = typeof date === "string" ? date : date.$date;
	const diff = Date.now() - new Date(dateStr).getTime();
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return `hace ${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `hace ${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `hace ${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `hace ${days}d`;
	const months = Math.floor(days / 30);
	return `hace ${months} mes${months !== 1 ? "es" : ""}`;
}

const RangeHistoryPanel: React.FC = () => {
	const { enqueueSnackbar } = useSnackbar();

	const [history, setHistory] = useState<ScrapingHistory[]>([]);
	const [loading, setLoading] = useState(true);
	const [total, setTotal] = useState(0);

	// Filters
	const [fueroFilter, setFueroFilter] = useState<string>("");
	const [yearFilter, setYearFilter] = useState<string>("");

	// Pagination
	const [page, setPage] = useState(1);
	const [rowsPerPage, setRowsPerPage] = useState(10);

	// Sorting
	const [sortBy, setSortBy] = useState<string>("completedAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// Summary counts per fuero
	const [fueroCounts, setFueroCounts] = useState<Record<string, number>>({});

	const fetchHistory = async (
		p = page,
		fuero = fueroFilter,
		year = yearFilter,
		orderBy = sortBy,
		order = sortOrder,
	) => {
		try {
			setLoading(true);
			const params: any = {
				page: p,
				limit: rowsPerPage,
				sortBy: orderBy,
				sortOrder: order,
			};
			if (fuero) params.fuero = fuero;
			if (year) params.year = year;

			const response = await WorkersService.getScrapingHistory(params);
			if (response.success) {
				setHistory(response.data || []);
				setTotal(response.total || 0);
			}
		} catch (error) {
			enqueueSnackbar("Error al cargar el historial de rangos", {
				variant: "error",
				anchorOrigin: { vertical: "bottom", horizontal: "right" },
			});
		} finally {
			setLoading(false);
		}
	};

	// Fetch summary counts (all fueros, no pagination)
	const fetchFueroCounts = async () => {
		try {
			const counts: Record<string, number> = {};
			const promises = FUERO_OPTIONS.map(async (f) => {
				const res = await WorkersService.getScrapingHistory({ fuero: f.value, limit: 1 });
				counts[f.value] = res.total || 0;
			});
			await Promise.all(promises);
			setFueroCounts(counts);
		} catch {
			// silent
		}
	};

	useEffect(() => {
		fetchHistory();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, rowsPerPage, fueroFilter, yearFilter, sortBy, sortOrder]);

	useEffect(() => {
		fetchFueroCounts();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSort = (field: string) => {
		if (sortBy === field) {
			setSortOrder(sortOrder === "asc" ? "desc" : "asc");
		} else {
			setSortBy(field);
			setSortOrder("asc");
		}
		setPage(1);
	};

	const handleFueroFilter = (fuero: string) => {
		setFueroFilter((prev) => (prev === fuero ? "" : fuero));
		setPage(1);
	};

	const totalCount = Object.values(fueroCounts).reduce((a, b) => a + b, 0);

	return (
		<Box>
			{/* Summary cards */}
			<Grid container spacing={1.5} sx={{ mb: 2 }}>
				<Grid item xs={6} sm={2.4}>
					<Card
						variant="outlined"
						sx={{
							cursor: "pointer",
							borderColor: !fueroFilter ? "primary.main" : "divider",
							bgcolor: !fueroFilter ? "primary.50" : "transparent",
						}}
						onClick={() => { setFueroFilter(""); setPage(1); }}
					>
						<CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
							<Typography variant="caption" color="text.secondary">Todos</Typography>
							<Typography variant="h5">{totalCount}</Typography>
						</CardContent>
					</Card>
				</Grid>
				{FUERO_OPTIONS.map((f) => (
					<Grid item xs={6} sm={2.4} key={f.value}>
						<Card
							variant="outlined"
							sx={{
								cursor: "pointer",
								borderColor: fueroFilter === f.value ? "primary.main" : "divider",
								bgcolor: fueroFilter === f.value ? "primary.50" : "transparent",
							}}
							onClick={() => handleFueroFilter(f.value)}
						>
							<CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
								<Typography variant="caption" color="text.secondary">{f.label}</Typography>
								<Typography variant="h5">{fueroCounts[f.value] || 0}</Typography>
							</CardContent>
						</Card>
					</Grid>
				))}
			</Grid>

			{/* Filters */}
			<Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
				<Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Fuero</InputLabel>
						<Select
							value={fueroFilter}
							onChange={(e) => { setFueroFilter(e.target.value); setPage(1); }}
							label="Fuero"
						>
							<MenuItem value="">Todos</MenuItem>
							{FUERO_OPTIONS.map((o) => (
								<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
							))}
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 120 }}>
						<InputLabel>Año</InputLabel>
						<Select
							value={yearFilter}
							onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
							label="Año"
						>
							<MenuItem value="">Todos</MenuItem>
							{YEAR_OPTIONS.map((y) => (
								<MenuItem key={y} value={y}>{y}</MenuItem>
							))}
						</Select>
					</FormControl>
					<Box sx={{ flex: 1 }} />
					<Typography variant="caption" color="text.secondary">
						{total} registro{total !== 1 ? "s" : ""}
					</Typography>
					<Tooltip title="Actualizar">
						<Button
							size="small"
							variant="text"
							startIcon={<Refresh2 size={16} />}
							onClick={() => { fetchHistory(); fetchFueroCounts(); }}
							disabled={loading}
						>
							Actualizar
						</Button>
					</Tooltip>
				</Stack>
			</Paper>

			{/* Table */}
			{loading && history.length === 0 ? (
				<Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
					<CircularProgress />
				</Box>
			) : (
				<>
					<TableContainer component={Paper} variant="outlined">
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>
										<TableSortLabel
											active={sortBy === "worker_id"}
											direction={sortBy === "worker_id" ? sortOrder : "asc"}
											onClick={() => handleSort("worker_id")}
										>
											Worker ID
										</TableSortLabel>
									</TableCell>
									<TableCell>
										<TableSortLabel
											active={sortBy === "fuero"}
											direction={sortBy === "fuero" ? sortOrder : "asc"}
											onClick={() => handleSort("fuero")}
										>
											Fuero
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "year"}
											direction={sortBy === "year" ? sortOrder : "asc"}
											onClick={() => handleSort("year")}
										>
											Año
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "range_start"}
											direction={sortBy === "range_start" ? sortOrder : "asc"}
											onClick={() => handleSort("range_start")}
										>
											Rango
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "documentsProcessed"}
											direction={sortBy === "documentsProcessed" ? sortOrder : "asc"}
											onClick={() => handleSort("documentsProcessed")}
										>
											Procesados
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "documentsFound"}
											direction={sortBy === "documentsFound" ? sortOrder : "asc"}
											onClick={() => handleSort("documentsFound")}
										>
											Encontrados
										</TableSortLabel>
									</TableCell>
									<TableCell align="center">Tasa</TableCell>
									<TableCell align="center">
										<TableSortLabel
											active={sortBy === "completedAt"}
											direction={sortBy === "completedAt" ? sortOrder : "asc"}
											onClick={() => handleSort("completedAt")}
										>
											Completado
										</TableSortLabel>
									</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{history.length === 0 ? (
									<TableRow>
										<TableCell colSpan={8} align="center">
											<Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
												No hay historial de rangos procesados
											</Typography>
										</TableCell>
									</TableRow>
								) : (
									history.map((h) => {
										const hId = typeof h._id === "string" ? h._id : h._id.$oid;
										const processed = h.documents_processed || 0;
										const found = h.documents_found || 0;
										const rate = processed > 0 ? ((found / processed) * 100).toFixed(1) : "-";

										return (
											<TableRow key={hId} hover>
												<TableCell>
													<Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
														{h.worker_id}
													</Typography>
												</TableCell>
												<TableCell>
													<Chip label={h.fuero} size="small" color="primary" variant="outlined" />
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2">{h.year}</Typography>
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2" fontSize="0.8rem">
														{h.range_start?.toLocaleString()} - {h.range_end?.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2">
														{processed.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Typography
														variant="body2"
														fontWeight={found > 0 ? 600 : 400}
														color={found > 0 ? "success.main" : "text.secondary"}
													>
														{found.toLocaleString()}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Typography variant="body2" fontSize="0.75rem" color="text.secondary">
														{rate !== "-" ? `${rate}%` : "-"}
													</Typography>
												</TableCell>
												<TableCell align="center">
													<Tooltip title={formatDateFull(h.completedAt)}>
														<Typography variant="caption">
															{getRelativeTime(h.completedAt)}
														</Typography>
													</Tooltip>
													<Typography variant="caption" display="block" color="text.secondary" fontSize="0.65rem">
														{formatDate(h.completedAt)}
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
						page={page - 1}
						onPageChange={(_, newPage) => setPage(newPage + 1)}
						rowsPerPage={rowsPerPage}
						onRowsPerPageChange={(e) => {
							setRowsPerPage(parseInt(e.target.value, 10));
							setPage(1);
						}}
						rowsPerPageOptions={[10, 20, 50]}
						labelRowsPerPage="Filas por página"
					/>
				</>
			)}
		</Box>
	);
};

export default RangeHistoryPanel;
