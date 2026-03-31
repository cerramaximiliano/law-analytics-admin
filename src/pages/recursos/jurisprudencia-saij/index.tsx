import { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
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
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TablePagination,
	TableRow,
	Tabs,
	TextField,
	Tooltip,
	Typography,
	alpha,
	useTheme,
} from "@mui/material";
import { CloseCircle, DocumentDownload, Edit, Eye, Link21, Refresh, SearchNormal1, Trash } from "iconsax-react";
import { useSnackbar } from "notistack";
import MainCard from "components/MainCard";
import {
	CausaRef,
	SaijSentencia,
	SentenciaListParams,
	deleteSaijSentencia,
	getSaijSentenciaById,
	getSaijSentencias,
	getSaijSentenciaStats,
	updateSaijSentencia,
} from "api/saij";

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

const FUERO_COLOR: Record<string, string> = {
	CNT: "#2e7d32",
	CIV: "#1565c0",
	CSS: "#6a1b9a",
	COM: "#e65100",
	CAF: "#00695c",
	CCC: "#b71c1c",
	CCF: "#880e4f",
	CFP: "#4a148c",
	CPE: "#827717",
	CNE: "#004d40",
	CSJ: "#bf360c",
};

function fmtDate(d?: string) {
	if (!d) return "—";
	return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtExpediente(exp?: SaijSentencia["expediente"]) {
	if (!exp?.numero) return "—";
	return `${exp.numero}/${exp.año}`;
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

// ── CausaRefs chips ────────────────────────────────────────────────────────────

function CausaRefsCell({ refs }: { refs: CausaRef[] }) {
	if (!refs?.length) return <Typography variant="caption" color="text.disabled">—</Typography>;
	return (
		<Stack direction="row" spacing={0.5} flexWrap="wrap">
			{refs.map((r, i) => (
				<Tooltip key={i} title={`${r.caratula || "Sin carátula"} · ${r.coleccion}`}>
					<Chip
						icon={<Link21 size={11} />}
						label={r.source}
						size="small"
						sx={{
							fontSize: 10,
							height: 20,
							bgcolor: alpha(r.source === "app" ? "#1976d2" : "#7b1fa2", 0.1),
							color: r.source === "app" ? "#1976d2" : "#7b1fa2",
							"& .MuiChip-icon": { color: "inherit" },
						}}
					/>
				</Tooltip>
			))}
		</Stack>
	);
}

// ── Edit dialog ────────────────────────────────────────────────────────────────

function EditDialog({ sentencia, onClose, onSaved }: { sentencia: SaijSentencia; onClose: () => void; onSaved: (updated: SaijSentencia) => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({
		status: sentencia.status,
		titulo: sentencia.titulo || "",
		tribunal: sentencia.tribunal || "",
		pdfUrl: sentencia.pdfUrl || "",
		errorMessage: sentencia.errorMessage || "",
	});

	const handleSave = async () => {
		setSaving(true);
		try {
			const res = await updateSaijSentencia(sentencia._id, form);
			enqueueSnackbar("Sentencia actualizada", { variant: "success" });
			onSaved(res.data);
		} catch {
			enqueueSnackbar("Error al guardar", { variant: "error" });
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>
				<Stack direction="row" justifyContent="space-between" alignItems="center">
					<Typography variant="h6">Editar sentencia</Typography>
					<IconButton size="small" onClick={onClose}><CloseCircle size={18} /></IconButton>
				</Stack>
			</DialogTitle>
			<DialogContent dividers>
				<Stack spacing={2} mt={0.5}>
					<FormControl size="small" fullWidth>
						<InputLabel>Estado</InputLabel>
						<Select value={form.status} label="Estado" onChange={(e) => setForm(f => ({ ...f, status: e.target.value as SaijSentencia["status"] }))}>
							{Object.entries(STATUS_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
						</Select>
					</FormControl>
					<TextField size="small" label="Título" value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} fullWidth />
					<TextField size="small" label="Tribunal" value={form.tribunal} onChange={(e) => setForm(f => ({ ...f, tribunal: e.target.value }))} fullWidth />
					<TextField size="small" label="URL del PDF" value={form.pdfUrl} onChange={(e) => setForm(f => ({ ...f, pdfUrl: e.target.value }))} fullWidth />
					<TextField size="small" label="Mensaje de error" value={form.errorMessage} onChange={(e) => setForm(f => ({ ...f, errorMessage: e.target.value }))} fullWidth multiline rows={2} />
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={saving}>Cancelar</Button>
				<Button variant="contained" onClick={handleSave} disabled={saving}>
					{saving ? <CircularProgress size={16} /> : "Guardar"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}

// ── Detail dialog ──────────────────────────────────────────────────────────────

function SentenciaDetail({
	sentencia,
	onClose,
	onEdit,
	onDelete,
}: {
	sentencia: SaijSentencia;
	onClose: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const theme = useTheme();
	const [tab, setTab] = useState(0);

	const rows = [
		{ label: "ID SAIJ", value: sentencia.saijId },
		{ label: "Tipo", value: sentencia.saijType },
		{ label: "Número de fallo", value: sentencia.numeroFallo || "—" },
		{ label: "Tipo de fallo", value: sentencia.tipoFallo || "—" },
		{ label: "Fuero", value: sentencia.fuero || "—" },
		{ label: "Expediente", value: fmtExpediente(sentencia.expediente) },
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
					<IconButton size="small" onClick={onClose}><CloseCircle size={18} /></IconButton>
				</Stack>
			</DialogTitle>

			<Box sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}>
				<Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="primary" indicatorColor="primary">
					<Tab label="Detalle" />
					<Tab label="JSON" />
					<Tab label="Acciones" />
				</Tabs>
			</Box>

			<DialogContent dividers sx={{ p: tab === 1 ? 0 : undefined }}>
				{/* ── Tab 0: Detalle ── */}
				{tab === 0 && (
					<Grid container spacing={1.5}>
						{rows.map((r) => (
							<Grid item xs={12} sm={6} key={r.label}>
								<Typography variant="caption" color="text.secondary">{r.label}</Typography>
								<Typography variant="body2">{r.value}</Typography>
							</Grid>
						))}

						{/* CausaRefs */}
						<Grid item xs={12}>
							<Typography variant="caption" color="text.secondary">Causas vinculadas</Typography>
							{sentencia.causaRefs?.length ? (
								<Stack spacing={0.5} mt={0.5}>
									{sentencia.causaRefs.map((r, i) => (
										<Paper key={i} variant="outlined" sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}>
											<Chip
												label={r.source}
												size="small"
												sx={{
													fontSize: 10,
													height: 20,
													bgcolor: alpha(r.source === "app" ? "#1976d2" : "#7b1fa2", 0.1),
													color: r.source === "app" ? "#1976d2" : "#7b1fa2",
												}}
											/>
											<Chip label={r.fuero} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(FUERO_COLOR[r.fuero] || "#888", 0.1), color: FUERO_COLOR[r.fuero] || "#888" }} />
											<Typography variant="body2" sx={{ flex: 1 }}>{r.caratula || "Sin carátula"}</Typography>
											<Typography variant="caption" color="text.secondary">{r.coleccion}</Typography>
										</Paper>
									))}
								</Stack>
							) : (
								<Typography variant="body2" color="text.disabled" mt={0.5}>Sin causas vinculadas</Typography>
							)}
						</Grid>

						{sentencia.descriptores?.length > 0 && (
							<Grid item xs={12}>
								<Typography variant="caption" color="text.secondary">Descriptores</Typography>
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
								<Typography variant="caption" color="text.secondary">Texto / Sumario</Typography>
								<Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, maxHeight: 200, overflow: "auto" }}>
									<Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{sentencia.texto}</Typography>
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
				)}

				{/* ── Tab 1: JSON ── */}
				{tab === 1 && (
					<Box
						component="pre"
						sx={{
							m: 0,
							p: 2,
							fontSize: 12,
							fontFamily: "monospace",
							bgcolor: alpha(theme.palette.grey[900], 0.04),
							overflow: "auto",
							maxHeight: 520,
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
						}}
					>
						{JSON.stringify(sentencia, null, 2)}
					</Box>
				)}

				{/* ── Tab 2: Acciones ── */}
				{tab === 2 && (
					<Stack spacing={2} sx={{ py: 1 }}>
						<Alert severity="info" variant="outlined">
							Las acciones de edición y eliminación son permanentes y afectan la base de datos de producción.
						</Alert>
						<Paper variant="outlined" sx={{ p: 2 }}>
							<Stack direction="row" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography variant="subtitle2">Editar sentencia</Typography>
									<Typography variant="caption" color="text.secondary">
										Modifica campos como estado, título, tribunal, URL del PDF o mensaje de error.
									</Typography>
								</Box>
								<Button
									variant="outlined"
									startIcon={<Edit size={16} />}
									onClick={onEdit}
									sx={{ whiteSpace: "nowrap" }}
								>
									Editar
								</Button>
							</Stack>
						</Paper>
						<Paper variant="outlined" sx={{ p: 2, borderColor: "error.light" }}>
							<Stack direction="row" alignItems="center" justifyContent="space-between">
								<Box>
									<Typography variant="subtitle2" color="error.main">Eliminar sentencia</Typography>
									<Typography variant="caption" color="text.secondary">
										Elimina permanentemente este documento de la colección. Esta acción no se puede deshacer.
									</Typography>
								</Box>
								<Button
									variant="outlined"
									color="error"
									startIcon={<Trash size={16} />}
									onClick={onDelete}
									sx={{ whiteSpace: "nowrap" }}
								>
									Eliminar
								</Button>
							</Stack>
						</Paper>
					</Stack>
				)}
			</DialogContent>
		</Dialog>
	);
}

// ── Delete confirm dialog ──────────────────────────────────────────────────────

function DeleteConfirmDialog({ sentencia, onClose, onDeleted }: { sentencia: SaijSentencia; onClose: () => void; onDeleted: () => void }) {
	const { enqueueSnackbar } = useSnackbar();
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteSaijSentencia(sentencia._id);
			enqueueSnackbar("Sentencia eliminada", { variant: "success" });
			onDeleted();
		} catch {
			enqueueSnackbar("Error al eliminar", { variant: "error" });
			setDeleting(false);
		}
	};

	return (
		<Dialog open onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Confirmar eliminación</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					¿Eliminar permanentemente <strong>{sentencia.titulo || sentencia.saijId}</strong>?
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={deleting}>Cancelar</Button>
				<Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
					{deleting ? <CircularProgress size={16} /> : "Eliminar"}
				</Button>
			</DialogActions>
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

	// Dialogs
	const [selected, setSelected] = useState<SaijSentencia | null>(null);
	const [editing, setEditing] = useState<SaijSentencia | null>(null);
	const [deleting, setDeleting] = useState<SaijSentencia | null>(null);

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

	useEffect(() => {
		setPage(0);
		fetchData(0);
	}, [filterType, filterStatus, search, filterYearFrom, filterYearTo]);

	const handlePageChange = (_: unknown, newPage: number) => {
		setPage(newPage);
		fetchData(newPage);
	};

	const handleSearch = () => setSearch(searchInput.trim());

	const handleClearFilters = () => {
		setSearchInput("");
		setSearch("");
		setFilterType("");
		setFilterStatus("");
		setFilterYearFrom("");
		setFilterYearTo("");
	};

	const handleSaved = (updated: SaijSentencia) => {
		setData((prev) => prev.map((d) => (d._id === updated._id ? updated : d)));
		if (selected?._id === updated._id) setSelected(updated);
		setEditing(null);
	};

	const handleDeleted = () => {
		setData((prev) => prev.filter((d) => d._id !== deleting?._id));
		setDeleting(null);
		setSelected(null);
		setTotal((t) => t - 1);
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
							startAdornment: <InputAdornment position="start"><SearchNormal1 size={16} /></InputAdornment>,
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
					<Button size="small" variant="contained" onClick={handleSearch} disabled={loading}>Buscar</Button>
					{hasFilters && <Button size="small" onClick={handleClearFilters}>Limpiar</Button>}
				</Stack>
			</Paper>

			{/* Table */}
			<TableContainer component={Paper} variant="outlined">
				<Table size="small">
					<TableHead>
						<TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
							<TableCell>Título / Carátula</TableCell>
							<TableCell>Tipo</TableCell>
							<TableCell>Fuero</TableCell>
							<TableCell>Expediente</TableCell>
							<TableCell>Tribunal</TableCell>
							<TableCell>Fecha</TableCell>
							<TableCell>Estado</TableCell>
							<TableCell>Causa</TableCell>
							<TableCell align="center">PDF</TableCell>
							<TableCell align="center">Acciones</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{loading && (
							<TableRow>
								<TableCell colSpan={10} align="center" sx={{ py: 4 }}>
									<CircularProgress size={28} />
								</TableCell>
							</TableRow>
						)}
						{!loading && data.length === 0 && (
							<TableRow>
								<TableCell colSpan={10} align="center" sx={{ py: 4 }}>
									<Typography color="text.secondary">Sin resultados</Typography>
								</TableCell>
							</TableRow>
						)}
						{!loading &&
							data.map((row) => (
								<TableRow key={row._id} hover>
									<TableCell sx={{ maxWidth: 220 }}>
										<Tooltip title={row.titulo || row.saijId}>
											<Typography variant="body2" noWrap>{row.titulo || row.saijId}</Typography>
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
									<TableCell>
										{row.fuero ? (
											<Chip
												label={row.fuero}
												size="small"
												sx={{
													bgcolor: alpha(FUERO_COLOR[row.fuero] || "#888", 0.1),
													color: FUERO_COLOR[row.fuero] || "#888",
													fontWeight: 700,
													fontSize: 11,
												}}
											/>
										) : (
											<Typography variant="caption" color="text.disabled">—</Typography>
										)}
									</TableCell>
									<TableCell>
										<Typography variant="body2" fontFamily="monospace" fontSize={12}>
											{fmtExpediente(row.expediente)}
										</Typography>
									</TableCell>
									<TableCell sx={{ maxWidth: 160 }}>
										<Tooltip title={row.tribunal || ""}>
											<Typography variant="body2" noWrap color="text.secondary">{row.tribunal || "—"}</Typography>
										</Tooltip>
									</TableCell>
									<TableCell>
										<Typography variant="body2">{fmtDate(row.fecha)}</Typography>
									</TableCell>
									<TableCell>
										<Chip label={STATUS_LABEL[row.status] || row.status} size="small" color={STATUS_COLOR[row.status] || "default"} />
									</TableCell>
									<TableCell>
										<CausaRefsCell refs={row.causaRefs} />
									</TableCell>
									<TableCell align="center">
										{row.pdfUrl ? (
											<Tooltip title="Ver PDF">
												<IconButton size="small" component="a" href={row.pdfUrl} target="_blank" rel="noopener noreferrer">
													<DocumentDownload size={16} color={theme.palette.primary.main} />
												</IconButton>
											</Tooltip>
										) : (
											<Typography variant="caption" color="text.disabled">—</Typography>
										)}
									</TableCell>
									<TableCell align="center">
										<Stack direction="row" spacing={0.5} justifyContent="center">
											<Tooltip title="Ver detalle">
												<IconButton size="small" onClick={() => setSelected(row)}>
													<Eye size={16} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Editar">
												<IconButton size="small" onClick={() => setEditing(row)}>
													<Edit size={16} />
												</IconButton>
											</Tooltip>
											<Tooltip title="Eliminar">
												<IconButton size="small" color="error" onClick={() => setDeleting(row)}>
													<Trash size={16} />
												</IconButton>
											</Tooltip>
										</Stack>
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

			{selected && (
				<SentenciaDetail
					sentencia={selected}
					onClose={() => setSelected(null)}
					onEdit={() => { setEditing(selected); setSelected(null); }}
					onDelete={() => { setDeleting(selected); setSelected(null); }}
				/>
			)}
			{editing && <EditDialog sentencia={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
			{deleting && <DeleteConfirmDialog sentencia={deleting} onClose={() => setDeleting(null)} onDeleted={handleDeleted} />}
		</MainCard>
	);
}
