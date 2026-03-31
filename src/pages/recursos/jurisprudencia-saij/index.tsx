import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogContent,
	DialogTitle,
	Divider,
	FormControl,
	Grid,
	IconButton,
	InputAdornment,
	InputLabel,
	MenuItem,
	Paper,
	Select,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentDownload, Eye, Refresh, SearchNormal1 } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import { getSaijSentencias, getSaijSentenciaStats, SaijSentencia, SentenciaListParams } from "api/saij";

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
	captured: "info",
	processing: "warning",
	processed: "success",
	error: "error",
	duplicate: "default",
};

const STATUS_LABEL: Record<string, string> = {
	captured: "Capturado",
	processing: "Procesando",
	processed: "Procesado",
	error: "Error",
	duplicate: "Duplicado",
};

const TYPE_COLOR: Record<string, string> = {
	jurisprudencia: "#1976d2",
	sumario: "#7b1fa2",
};

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Stat badge ─────────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color?: string }) {
	const theme = useTheme();
	return (
		<Box
			sx={{
				px: 2,
				py: 1,
				borderRadius: 2,
				bgcolor: color ? alpha(color, 0.08) : alpha(theme.palette.primary.main, 0.06),
				border: `1px solid ${color ? alpha(color, 0.2) : alpha(theme.palette.primary.main, 0.12)}`,
				textAlign: "center",
			}}
		>
			<Typography variant="h6" fontWeight={700} color={color || "primary.main"}>
				{value.toLocaleString("es-AR")}
			</Typography>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
		</Box>
	);
}

// ── Detail dialog ──────────────────────────────────────────────────────────────

function SentenciaDetail({ sentencia, onClose }: { sentencia: SaijSentencia; onClose: () => void }) {
	const rows = [
		{ label: "ID SAIJ", value: sentencia.saijId },
		{ label: "Tipo", value: sentencia.saijType },
		{ label: "Número de fallo", value: sentencia.numeroFallo || "—" },
		{ label: "Tipo de fallo", value: sentencia.tipoFallo || "—" },
		{ label: "Actor", value: sentencia.actor || "—" },
		{ label: "Demandado", value: sentencia.demandado || "—" },
		{ label: "Sobre", value: sentencia.sobre || "—" },
		{ label: "Tribunal", value: sentencia.tribunal || "—" },
		{ label: "Jurisdicción", value: sentencia.jurisdiccion?.descripcion || "—" },
		{ label: "Fecha", value: fmtDate(sentencia.fecha) },
		{ label: "Estado", value: STATUS_LABEL[sentencia.status] || sentencia.status },
		{ label: "Worker", value: sentencia.workerId || "—" },
		{ label: "Capturado", value: fmtDate(sentencia.scrapedAt) },
	];

	return (
		<Dialog open onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h6" sx={{ pr: 4 }}>
						{sentencia.titulo || sentencia.saijId}
					</Typography>
					<IconButton size="small" onClick={onClose}>
						<CloseCircle size={18} />
					</IconButton>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Grid container spacing={1.5}>
					{rows.map((r) => (
						<Grid item xs={12} sm={6} key={r.label}>
							<Typography variant="caption" color="text.secondary">
								{r.label}
							</Typography>
							<Typography variant="body2">{r.value}</Typography>
						</Grid>
					))}

					{sentencia.descriptores?.length > 0 && (
						<Grid item xs={12}>
							<Typography variant="caption" color="text.secondary">
								Descriptores
							</Typography>
							<Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
								{sentencia.descriptores.map((d) => (
									<Chip key={d} label={d} size="small" variant="outlined" />
								))}
							</Stack>
						</Grid>
					)}

					{sentencia.texto && (
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Typography variant="caption" color="text.secondary">
								Texto / Sumario
							</Typography>
							<Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, maxHeight: 200, overflow: "auto" }}>
								<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
									{sentencia.texto}
								</Typography>
							</Paper>
						</Grid>
					)}

					{sentencia.pdfUrl && (
						<Grid item xs={12}>
							<Divider sx={{ my: 1 }} />
							<Button
								variant="outlined"
								size="small"
								startIcon={<DocumentDownload size={16} />}
								component="a"
								href={sentencia.pdfUrl}
								target="_blank"
								rel="noopener noreferrer"
							>
								Ver PDF
							</Button>
						</Grid>
					)}
				</Grid>
			</DialogContent>
		</Dialog>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JurisprudenciaSaijPage() {
	const theme = useTheme();
	const { enqueueSnackbar } = useSnackbar();

	const [data, setData] = useState<SaijSentencia[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [total, setTotal] = useState(0);
	const LIMIT = 10;

	const [stats, setStats] = useState<{ total: number; byType: { _id: string; count: number }[]; byStatus: { _id: string; count: number }[] } | null>(null);
	const [statsLoading, setStatsLoading] = useState(true);

	// Filters
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [filterType, setFilterType] = useState("");
	const [filterStatus, setFilterStatus] = useState("");
	const [filterYearFrom, setFilterYearFrom] = useState("");
	const [filterYearTo, setFilterYearTo] = useState("");

	// Detail dialog
	const [selected, setSelected] = useState<SaijSentencia | null>(null);

	const buildParams = useCallback(
		(pg: number): SentenciaListParams => ({
			page: pg + 1,
			limit: LIMIT,
			...(filterType && { saijType: filterType }),
			...(filterStatus && { status: filterStatus }),
			...(search && { q: search }),
			...(filterYearFrom && { yearFrom: parseInt(filterYearFrom) }),
			...(filterYearTo && { yearTo: parseInt(filterYearTo) }),
		}),
		[filterType, filterStatus, search, filterYearFrom, filterYearTo],
	);

	const fetchData = useCallback(
		async (pg: number) => {
			setLoading(true);
			try {
				const res = await getSaijSentencias(buildParams(pg));
				setData(res.data);
				setTotal(res.pagination.total);
			} catch {
				enqueueSnackbar("Error cargando sentencias SAIJ", { variant: "error" });
			} finally {
				setLoading(false);
			}
		},
		[buildParams],
	);

	const fetchStats = async () => {
		setStatsLoading(true);
		try {
			const res = await getSaijSentenciaStats();
			setStats(res.data);
		} catch {
			// stats are optional
		} finally {
			setStatsLoading(false);
		}
	};

	useEffect(() => {
		fetchData(0);
		fetchStats();
	}, []);

	// Refresh when filters change (reset to page 0)
	useEffect(() => {
		setPage(0);
		fetchData(0);
	}, [filterType, filterStatus, search, filterYearFrom, filterYearTo]);

	const handlePageChange = (_: unknown, newPage: number) => {
		setPage(newPage);
		fetchData(newPage);
	};

	const handleSearch = () => {
		setSearch(searchInput.trim());
	};

	const handleClearFilters = () => {
		setSearchInput("");
		setSearch("");
		setFilterType("");
		setFilterStatus("");
		setFilterYearFrom("");
		setFilterYearTo("");
	};

	const hasFilters = search || filterType || filterStatus || filterYearFrom || filterYearTo;

	return (
		<MainCard
			title="Jurisprudencia SAIJ"
			secondary={
				<Tooltip title="Recargar">
					<IconButton size="small" onClick={() => { fetchData(page); fetchStats(); }} disabled={loading}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			}
		>
			{/* Stats strip */}
			{!statsLoading && stats && (
				<Stack direction="row" spacing={1.5} flexWrap="wrap" mb={2}>
					<StatBadge label="Total" value={stats.total} />
					{stats.byType.map((t) => (
						<StatBadge key={t._id} label={t._id === "jurisprudencia" ? "Fallos" : "Sumarios"} value={t.count} color={TYPE_COLOR[t._id]} />
					))}
					{stats.byStatus
						.filter((s) => s._id === "error")
						.map((s) => (
							<StatBadge key={s._id} label="Con error" value={s.count} color={theme.palette.error.main} />
						))}
				</Stack>
			)}

			{/* Filters */}
			<Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
				<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} flexWrap="wrap">
					<TextField
						size="small"
						placeholder="Buscar título, texto..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						sx={{ minWidth: 220 }}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchNormal1 size={16} />
								</InputAdornment>
							),
							endAdornment: searchInput && (
								<InputAdornment position="end">
									<IconButton size="small" onClick={() => { setSearchInput(""); setSearch(""); }}>
										<CloseCircle size={14} />
									</IconButton>
								</InputAdornment>
							),
						}}
					/>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Tipo</InputLabel>
						<Select value={filterType} label="Tipo" onChange={(e) => setFilterType(e.target.value)}>
							<MenuItem value="">Todos</MenuItem>
							<MenuItem value="jurisprudencia">Jurisprudencia</MenuItem>
							<MenuItem value="sumario">Sumario</MenuItem>
						</Select>
					</FormControl>
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Estado</InputLabel>
						<Select value={filterStatus} label="Estado" onChange={(e) => setFilterStatus(e.target.value)}>
							<MenuItem value="">Todos</MenuItem>
							<MenuItem value="captured">Capturado</MenuItem>
							<MenuItem value="processing">Procesando</MenuItem>
							<MenuItem value="processed">Procesado</MenuItem>
							<MenuItem value="error">Error</MenuItem>
						</Select>
					</FormControl>
					<TextField size="small" label="Año desde" type="number" value={filterYearFrom} onChange={(e) => setFilterYearFrom(e.target.value)} sx={{ width: 110 }} />
					<TextField size="small" label="Año hasta" type="number" value={filterYearTo} onChange={(e) => setFilterYearTo(e.target.value)} sx={{ width: 110 }} />
					<Button size="small" variant="contained" onClick={handleSearch} disabled={loading}>
						Buscar
					</Button>
					{hasFilters && (
						<Button size="small" onClick={handleClearFilters}>
							Limpiar
						</Button>
					)}
				</Stack>
			</Paper>

			{/* Table */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell>Título / Carátula</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Tribunal</TableCell>
							<TableCell>Fecha</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell align="center">PDF</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<CircularProgress size={28} />
								</TableCell>
							</TableRow>
						)}
						{!loading && data.length === 0 && (
							<TableRow>
								<TableCell colSpan={7} align="center" sx={{ py: 4 }}>
									<Typography color="text.secondary">Sin resultados</Typography>
								</TableCell>
							</TableRow>
						)}
						{!loading &&
							data.map((row) => (
								<TableRow key={row._id} hover>
									<TableCell sx={{ maxWidth: 280 }}>
										<Tooltip title={row.titulo || row.saijId}>
											<Typography variant="body2" noWrap>
												{row.titulo || row.saijId}
											</Typography>
										</Tooltip>
									</TableCell>
									<TableCell>
										<Chip
											label={row.saijType === "jurisprudencia" ? "Fallo" : "Sumario"}
											size="small"
											sx={{
												bgcolor: alpha(TYPE_COLOR[row.saijType] || "#888", 0.1),
												color: TYPE_COLOR[row.saijType] || "#888",
												fontWeight: 600,
												fontSize: 11,
											}}
										/>
									</TableCell>
									<TableCell sx={{ maxWidth: 160 }}>
										<Tooltip title={row.tribunal || ""}>
											<Typography variant="body2" noWrap color="text.secondary">
												{row.tribunal || "—"}
											</Typography>
										</Tooltip>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{fmtDate(row.fecha)}</Typography>
									</TableCell>
									<TableCell>
										<Chip label={STATUS_LABEL[row.status] || row.status} size="small" color={STATUS_COLOR[row.status] || "default"} />
									</TableCell>
									<TableCell align="center">
										{row.pdfUrl ? (
											<Tooltip title="Ver PDF">
												<IconButton size="small" component="a" href={row.pdfUrl} target="_blank" rel="noopener noreferrer">
													<DocumentDownload size={16} color={theme.palette.primary.main} />
												</IconButton>
											</Tooltip>
										) : (
											<Typography variant="caption" color="text.disabled">
												—
											</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										<Tooltip title="Ver detalle">
											<IconButton size="small" onClick={() => setSelected(row)}>
												<Eye size={16} />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							))}
					</TableBody>
				</Table>
			</TableContainer>

			<TablePagination
				component="div"
				count={total}
				page={page}
				onPageChange={handlePageChange}
				rowsPerPage={LIMIT}
				rowsPerPageOptions={[LIMIT]}
				labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count.toLocaleString("es-AR")}`}
			/>

			{selected && <SentenciaDetail sentencia={selected} onClose={() => setSelected(null)} />}
		</MainCard>
	);
}
