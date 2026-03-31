import { useState, useEffect, useCallback } from "react";
import {
	Box,
	Chip,
	CircularProgress,
	Alert,
	Tooltip,
	IconButton,
	TextField,
	Stack,
	Tab,
	Tabs,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
} from "@mui/material";
import MainCard from "components/MainCard";
import EnhancedTablePagination from "components/EnhancedTablePagination";
import { useSnackbar } from "notistack";
import { Refresh, ArrowUp, ArrowDown, SearchNormal1, CloseCircle, Code } from "iconsax-react";
import { PendingCausasService, PendingCausa, FuenteCausa, FueroPJN } from "api/pendingCausas";

// ─── Constants ────────────────────────────────────────────────────────────────

const FUERO_LABELS: Record<string, string> = {
	CIV: "Civil",
	COM: "Comercial",
	CSS: "Seg. Social",
	CNT: "Trabajo",
	MEV: "MEV",
	EJE: "EJE",
};

const FUERO_COLORS: Record<string, "primary" | "success" | "warning" | "error" | "info" | "default"> = {
	CIV: "primary",
	COM: "success",
	CSS: "warning",
	CNT: "error",
	MEV: "info",
	EJE: "default",
};

const SOURCE_LABELS: Record<string, string> = {
	app: "App",
	scraping: "Scraping",
	import: "Import",
	"pjn-login": "PJN Login",
	cache: "Cache",
};

const TABS: { label: string; value: FuenteCausa }[] = [
	{ label: "PJN", value: "pjn" },
	{ label: "MEV", value: "mev" },
	{ label: "EJE", value: "eje" },
];

const SORT_OPTIONS = [
	{ value: "createdAt", label: "Fecha creación" },
	{ value: "lastUpdate", label: "Última actualización" },
	{ value: "anio", label: "Año" },
	{ value: "numero", label: "Número" },
	{ value: "caratula", label: "Carátula" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string) => {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
};

// ─── Component ────────────────────────────────────────────────────────────────

const CausasPendientes = () => {
	const { enqueueSnackbar } = useSnackbar();

	// JSON modal
	const [jsonCausa, setJsonCausa] = useState<PendingCausa | null>(null);

	// Tab state
	const [activeTab, setActiveTab] = useState<FuenteCausa>("pjn");

	// Stats
	const [stats, setStats] = useState<{ pjn: number; mev: number; eje: number }>({ pjn: 0, mev: 0, eje: 0 });

	// Table data
	const [causas, setCausas] = useState<PendingCausa[]>([]);
	const [loading, setLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [rowsPerPage, setRowsPerPage] = useState(20);
	const [totalCount, setTotalCount] = useState(0);

	// Filters
	const [fueroFilter, setFueroFilter] = useState<string>("todos");
	const [searchCaratula, setSearchCaratula] = useState("");
	const [searchNumero, setSearchNumero] = useState("");
	const [searchAnio, setSearchAnio] = useState("");
	const [sortBy, setSortBy] = useState("createdAt");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	// ── Fetch stats ──────────────────────────────────────────────────────────

	const fetchStats = useCallback(async () => {
		try {
			const response = await PendingCausasService.getStats();
			if (response.success) {
				setStats({
					pjn: response.data.pjn.total,
					mev: response.data.mev,
					eje: response.data.eje,
				});
			}
		} catch {
			// silently fail on stats
		}
	}, []);

	// ── Fetch list ───────────────────────────────────────────────────────────

	const fetchCausas = useCallback(
		async (
			tab: FuenteCausa,
			currentPage: number,
			limit: number,
			fuero: string,
			caratula: string,
			numero: string,
			anio: string,
			sortByParam: string,
			sortOrderParam: "asc" | "desc",
		) => {
			try {
				setLoading(true);
				const params: Record<string, unknown> = {
					fuente: tab,
					page: currentPage + 1,
					limit,
					sortBy: sortByParam,
					sortOrder: sortOrderParam,
				};

				if (tab === "pjn" && fuero !== "todos") {
					params.fuero = fuero as FueroPJN;
				}
				if (caratula.trim()) params.caratula = caratula.trim();
				if (numero.trim()) params.numero = numero.trim();
				if (anio.trim()) params.anio = anio.trim();

				const response = await PendingCausasService.getPendingCausas(params);
				if (response.success) {
					setCausas(response.data);
					setTotalCount(response.pagination.total);
				}
			} catch {
				enqueueSnackbar("Error al cargar causas pendientes", { variant: "error" });
				setCausas([]);
			} finally {
				setLoading(false);
			}
		},
		[enqueueSnackbar],
	);

	// ── Effects ──────────────────────────────────────────────────────────────

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	useEffect(() => {
		fetchCausas(activeTab, page, rowsPerPage, fueroFilter, searchCaratula, searchNumero, searchAnio, sortBy, sortOrder);
	}, [activeTab, page, rowsPerPage, fueroFilter, sortBy, sortOrder, fetchCausas]);

	// ── Handlers ─────────────────────────────────────────────────────────────

	const handleTabChange = (_: React.SyntheticEvent, newValue: FuenteCausa) => {
		setActiveTab(newValue);
		setPage(0);
		setFueroFilter("todos");
		setSearchCaratula("");
		setSearchNumero("");
		setSearchAnio("");
	};

	const handleSearch = () => {
		setPage(0);
		fetchCausas(activeTab, 0, rowsPerPage, fueroFilter, searchCaratula, searchNumero, searchAnio, sortBy, sortOrder);
	};

	const handleClearFilters = () => {
		setSearchCaratula("");
		setSearchNumero("");
		setSearchAnio("");
		setFueroFilter("todos");
		setPage(0);
		fetchCausas(activeTab, 0, rowsPerPage, "todos", "", "", "", sortBy, sortOrder);
	};

	const handleSort = (field: string) => {
		const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
		setSortBy(field);
		setSortOrder(newOrder);
		setPage(0);
	};

	const handlePageChange = (_: unknown, newPage: number) => {
		setPage(newPage);
	};

	const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setRowsPerPage(parseInt(event.target.value, 10));
		setPage(0);
	};

	const handleRefresh = () => {
		fetchStats();
		fetchCausas(activeTab, page, rowsPerPage, fueroFilter, searchCaratula, searchNumero, searchAnio, sortBy, sortOrder);
	};

	// ── Sort header ──────────────────────────────────────────────────────────

	const SortableHeader = ({ field, label }: { field: string; label: string }) => (
		<TableCell onClick={() => handleSort(field)} sx={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
			<Stack direction="row" alignItems="center" spacing={0.5}>
				<span>{label}</span>
				{sortBy === field ? sortOrder === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} /> : null}
			</Stack>
		</TableCell>
	);

	// ── Tab label with badge ──────────────────────────────────────────────────

	const tabLabel = (label: string, count: number) => (
		<Stack direction="row" alignItems="center" spacing={1}>
			<span>{label}</span>
			<Chip label={count} size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />
		</Stack>
	);

	// ── Render table ─────────────────────────────────────────────────────────

	const renderTable = () => {
		if (loading) {
			return (
				<Box display="flex" justifyContent="center" py={4}>
					<CircularProgress />
				</Box>
			);
		}

		if (!causas.length) {
			return (
				<Alert severity="info" sx={{ m: 2 }}>
					No se encontraron causas pendientes con los filtros seleccionados.
				</Alert>
			);
		}

		return (
			<TableContainer>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Fuero</TableCell>
							{activeTab === "eje" ? (
								<TableCell>CUIJ</TableCell>
							) : (
								<>
									<SortableHeader field="numero" label="Número" />
									<SortableHeader field="anio" label="Año" />
								</>
							)}
							<SortableHeader field="caratula" label="Carátula" />
							{activeTab !== "eje" && <TableCell>Juzgado</TableCell>}
							{activeTab !== "eje" && <TableCell>Objeto</TableCell>}
							{activeTab === "eje" && <TableCell>Pivot</TableCell>}
							<TableCell>Fuente</TableCell>
							<SortableHeader field="lastUpdate" label="Últ. Act." />
							<SortableHeader field="createdAt" label="Creación" />
							<TableCell />
						</TableRow>
					</TableHead>
					<TableBody>
						{causas.map((causa) => (
							<TableRow key={causa._id} hover>
								<TableCell>
									<Chip label={FUERO_LABELS[causa.fuero] || causa.fuero} size="small" color={FUERO_COLORS[causa.fuero] || "default"} />
								</TableCell>
								{activeTab === "eje" ? (
									<TableCell>
										<Typography variant="caption" sx={{ fontFamily: "monospace" }}>
											{causa.cuij || "—"}
										</Typography>
									</TableCell>
								) : (
									<>
										<TableCell>{causa.numero ?? "—"}</TableCell>
										<TableCell>{causa.anio ?? "—"}</TableCell>
									</>
								)}
								<TableCell sx={{ maxWidth: 280 }}>
									<Tooltip title={causa.caratula}>
										<Typography
											variant="body2"
											sx={{
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												maxWidth: 280,
											}}
										>
											{causa.caratula || "—"}
										</Typography>
									</Tooltip>
								</TableCell>
								{activeTab !== "eje" && <TableCell>{causa.juzgado ?? "—"}</TableCell>}
								{activeTab !== "eje" && (
									<TableCell sx={{ maxWidth: 200 }}>
										<Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
											{causa.objeto || "—"}
										</Typography>
									</TableCell>
								)}
								{activeTab === "eje" && (
									<TableCell>
										{causa.isPivot ? (
											<Chip label="Pivot" size="small" color="warning" />
										) : (
											<Typography variant="caption" color="text.secondary">
												No
											</Typography>
										)}
									</TableCell>
								)}
								<TableCell>
									<Chip label={SOURCE_LABELS[causa.source || ""] || causa.source || "—"} size="small" variant="outlined" />
								</TableCell>
								<TableCell>{formatDate(causa.lastUpdate)}</TableCell>
								<TableCell>{formatDate(causa.createdAt)}</TableCell>
							<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
								<Tooltip title="Ver JSON">
									<IconButton size="small" onClick={() => setJsonCausa(causa)}>
										<Code size={16} />
									</IconButton>
								</Tooltip>
							</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		);
	};

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<MainCard
			title="Causas Pendientes de Verificación"
			secondary={
				<Tooltip title="Actualizar">
					<IconButton size="small" onClick={handleRefresh}>
						<Refresh size={18} />
					</IconButton>
				</Tooltip>
			}
		>
			{/* Tabs */}
			<Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
				{TABS.map((tab) => (
					<Tab key={tab.value} value={tab.value} label={tabLabel(tab.label, stats[tab.value])} />
				))}
			</Tabs>

			{/* Filters */}
			<Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
				{activeTab === "pjn" && (
					<FormControl size="small" sx={{ minWidth: 140 }}>
						<InputLabel>Fuero</InputLabel>
						<Select
							value={fueroFilter}
							label="Fuero"
							onChange={(e) => {
								setFueroFilter(e.target.value);
								setPage(0);
							}}
						>
							<MenuItem value="todos">Todos</MenuItem>
							<MenuItem value="CIV">Civil</MenuItem>
							<MenuItem value="COM">Comercial</MenuItem>
							<MenuItem value="CSS">Seg. Social</MenuItem>
							<MenuItem value="CNT">Trabajo</MenuItem>
						</Select>
					</FormControl>
				)}

				<TextField
					size="small"
					label="Carátula"
					value={searchCaratula}
					onChange={(e) => setSearchCaratula(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					sx={{ minWidth: 200 }}
				/>

				{activeTab !== "eje" && (
					<TextField
						size="small"
						label="Número"
						type="number"
						value={searchNumero}
						onChange={(e) => setSearchNumero(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						sx={{ width: 110 }}
					/>
				)}

				<TextField
					size="small"
					label="Año"
					type="number"
					value={searchAnio}
					onChange={(e) => setSearchAnio(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSearch()}
					sx={{ width: 90 }}
				/>

				<FormControl size="small" sx={{ minWidth: 160 }}>
					<InputLabel>Ordenar por</InputLabel>
					<Select
						value={sortBy}
						label="Ordenar por"
						onChange={(e) => {
							setSortBy(e.target.value);
							setPage(0);
						}}
					>
						{SORT_OPTIONS.map((opt) => (
							<MenuItem key={opt.value} value={opt.value}>
								{opt.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<Tooltip title="Buscar">
					<IconButton size="small" onClick={handleSearch} color="primary">
						<SearchNormal1 size={18} />
					</IconButton>
				</Tooltip>

				<Tooltip title="Limpiar filtros">
					<IconButton size="small" onClick={handleClearFilters}>
						<CloseCircle size={18} />
					</IconButton>
				</Tooltip>
			</Stack>

			{/* Table */}
			{renderTable()}

			{/* Pagination */}
			{!loading && totalCount > 0 && (
				<EnhancedTablePagination
					count={totalCount}
					page={page}
					rowsPerPage={rowsPerPage}
					onPageChange={handlePageChange}
					onRowsPerPageChange={handleRowsPerPageChange}
					rowsPerPageOptions={[10, 20, 50, 100]}
				/>
			)}
		{/* JSON Modal */}
		<Dialog open={!!jsonCausa} onClose={() => setJsonCausa(null)} maxWidth="md" fullWidth>
			<DialogTitle>
				JSON del documento
				{jsonCausa && (
					<Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
						{jsonCausa._id}
					</Typography>
				)}
			</DialogTitle>
			<DialogContent dividers>
				<Box
					component="pre"
					sx={{
						fontFamily: "monospace",
						fontSize: 12,
						whiteSpace: "pre-wrap",
						wordBreak: "break-all",
						m: 0,
						p: 1,
						bgcolor: "action.hover",
						borderRadius: 1,
						maxHeight: 520,
						overflowY: "auto",
					}}
				>
					{jsonCausa ? JSON.stringify(jsonCausa, null, 2) : ""}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setJsonCausa(null)}>Cerrar</Button>
			</DialogActions>
		</Dialog>
		</MainCard>
	);
};

export default CausasPendientes;
